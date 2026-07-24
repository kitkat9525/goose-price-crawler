import { NextResponse } from 'next/server';
import { upsertSubscriberSnapshot, getSubscriberSnapshots } from '@/app/lib/db';

export const revalidate = 21600; // 6시간 캐시

const CHANNEL_QUERY = '구스초이';
const BASE = 'https://www.googleapis.com/youtube/v3';

interface VideoItem {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  duration: string;
}

function parseDuration(d: string): string {
  const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return '0:00';
  const h = parseInt(m[1] ?? '0'), min = parseInt(m[2] ?? '0'), s = parseInt(m[3] ?? '0');
  return h
    ? `${h}:${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${min}:${String(s).padStart(2, '0')}`;
}

async function ytFetch(endpoint: string, params: Record<string, string>, apiKey: string) {
  const url = new URL(`${BASE}/${endpoint}`);
  Object.entries({ ...params, key: apiKey }).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { next: { revalidate: 21600 } });
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
  return res.json();
}

export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'youtube_key_missing' }, { status: 503 });

  try {
    // 1. 채널 검색
    const search = await ytFetch('search', { q: CHANNEL_QUERY, type: 'channel', maxResults: '1', part: 'snippet' }, apiKey);
    if (!search.items?.length) return NextResponse.json({ error: 'channel_not_found' }, { status: 404 });
    const channelId: string = search.items[0].snippet.channelId;

    // 2. 채널 상세
    const chData = await ytFetch('channels', { id: channelId, part: 'snippet,statistics,contentDetails' }, apiKey);
    const ch = chData.items[0];
    const uploadsId: string = ch.contentDetails.relatedPlaylists.uploads;

    // 3. 최신 50개 영상 ID 수집
    const plData = await ytFetch('playlistItems', { playlistId: uploadsId, part: 'contentDetails', maxResults: '50' }, apiKey);
    const videoIds: string[] = plData.items.map((it: { contentDetails: { videoId: string } }) => it.contentDetails.videoId);

    // 4. 통계 일괄 조회
    const vData = await ytFetch('videos', { id: videoIds.join(','), part: 'snippet,statistics,contentDetails', maxResults: '50' }, apiKey);
    const videos: VideoItem[] = vData.items.map((v: {
      id: string;
      snippet: { title: string; publishedAt: string; thumbnails: { medium?: { url: string }; default?: { url: string } } };
      statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
      contentDetails: { duration: string };
    }) => ({
      id:          v.id,
      title:       v.snippet.title,
      thumbnail:   v.snippet.thumbnails.medium?.url ?? v.snippet.thumbnails.default?.url ?? '',
      publishedAt: v.snippet.publishedAt,
      views:       parseInt(v.statistics.viewCount   ?? '0'),
      likes:       parseInt(v.statistics.likeCount   ?? '0'),
      comments:    parseInt(v.statistics.commentCount ?? '0'),
      duration:    parseDuration(v.contentDetails.duration),
    }));

    const byDate  = [...videos].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    const byViews = [...videos].sort((a, b) => b.views - a.views);

    // 업로드 주기 (최근 20편 간격 평균)
    const recent = byDate.slice(0, 20);
    const intervals = recent.slice(0, -1).map((v, i) =>
      Math.round((new Date(v.publishedAt).getTime() - new Date(recent[i + 1].publishedAt).getTime()) / 86400000)
    );
    const avgInterval = intervals.length
      ? Math.round(intervals.reduce((s, v) => s + v, 0) / intervals.length)
      : null;

    const subscribers = parseInt(ch.statistics.subscriberCount ?? '0');

    // 오늘 스냅샷 저장 (upsert)
    await upsertSubscriberSnapshot(channelId, subscribers);

    // 최근 90일 스냅샷 조회
    const snapshots = await getSubscriberSnapshots(channelId, 90);

    return NextResponse.json({
      channel: {
        id:          channelId,
        title:       ch.snippet.title,
        thumbnail:   ch.snippet.thumbnails.medium?.url ?? '',
        publishedAt: ch.snippet.publishedAt,
        subscribers,
        totalViews:  parseInt(ch.statistics.viewCount ?? '0'),
        videoCount:  parseInt(ch.statistics.videoCount ?? '0'),
      },
      topVideos:    byViews.slice(0, 5),
      latestVideos: byDate.slice(0, 5),
      avgUploadInterval: avgInterval,
      snapshots,
    });
  } catch (e) {
    console.error('[youtube-channel]', e);
    return NextResponse.json({ error: 'fetch_error' }, { status: 500 });
  }
}
