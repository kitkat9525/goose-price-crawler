import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 0;

const QUERY = '구스이불';
const MAX_RESULTS = 20;

export async function GET(req: NextRequest) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ source: 'unavailable', error: 'youtube_key_missing' });
  }

  const pageToken = req.nextUrl.searchParams.get('pageToken');

  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('q', QUERY);
    url.searchParams.set('type', 'video');
    url.searchParams.set('maxResults', String(MAX_RESULTS));
    url.searchParams.set('order', 'relevance');
    url.searchParams.set('relevanceLanguage', 'ko');
    url.searchParams.set('key', apiKey);
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) {
      console.error('[youtube] API error', res.status, await res.text());
      return NextResponse.json({ source: 'unavailable', error: 'api_error' });
    }

    const json = await res.json();
    const items = (json.items ?? []).map((item: {
      id: { videoId: string };
      snippet: {
        title: string;
        channelTitle: string;
        publishedAt: string;
        thumbnails: { medium?: { url: string }; high?: { url: string } };
      };
    }) => ({
      videoId:     item.id.videoId,
      title:       item.snippet.title,
      channel:     item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      thumbnail:   item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.high?.url ?? '',
    }));

    return NextResponse.json({
      source:        'live',
      items,
      nextPageToken: json.nextPageToken ?? null,
    });
  } catch (e) {
    console.error('[youtube]', e);
    return NextResponse.json({ source: 'unavailable', error: 'fetch_error' });
  }
}
