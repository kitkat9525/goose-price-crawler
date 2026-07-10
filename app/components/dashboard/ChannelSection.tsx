'use client';

import { useState, useEffect } from 'react';
import { KEY } from './constants';
import { SectionLabel } from './SectionLabel';

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

interface ChannelData {
  channel: {
    title: string;
    thumbnail: string;
    publishedAt: string;
    subscribers: number;
    totalViews: number;
    videoCount: number;
  };
  topVideos: VideoItem[];
  latestVideos: VideoItem[];
  avgUploadInterval: number | null;
}

function fmt(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '만';
  if (n >= 1000)  return (n / 1000).toFixed(1) + '천';
  return n.toLocaleString('ko-KR');
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-5 bg-black/6 rounded w-1/3" />
      <div className="h-4 bg-black/6 rounded w-2/3" />
      <div className="h-4 bg-black/6 rounded w-1/2" />
    </div>
  );
}

function VideoCard({ v, rank }: { v: VideoItem; rank?: number }) {
  return (
    <a
      href={`https://www.youtube.com/watch?v=${v.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 items-start p-2 rounded-xl hover:bg-black/[0.03] transition-colors group"
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      {rank !== undefined && (
        <span className="text-lg font-black shrink-0 w-6 text-center leading-none mt-4" style={{ color: 'rgba(0,0,0,0.12)' }}>
          {rank + 1}
        </span>
      )}
      <div className="relative shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={v.thumbnail} alt={v.title} className="w-28 h-16 object-cover rounded-lg" />
        <span className="absolute bottom-1 right-1 text-[9px] font-bold text-white bg-black/70 px-1 rounded">
          {v.duration}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold leading-snug line-clamp-2 text-black/80 group-hover:text-black transition-colors">
          {v.title}
        </p>
        <div className="flex gap-3 mt-1.5 flex-wrap">
          <span className="text-[10px] text-black/35">👁 {fmt(v.views)}</span>
          <span className="text-[10px] text-black/35">❤️ {fmt(v.likes)}</span>
          <span className="text-[10px] text-black/35">💬 {fmt(v.comments)}</span>
          <span className="text-[10px] text-black/35">📅 {fmtDate(v.publishedAt)}</span>
        </div>
      </div>
    </a>
  );
}

export function ChannelSection() {
  const [data, setData] = useState<ChannelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'top' | 'latest'>('top');

  useEffect(() => {
    fetch('/api/youtube-channel')
      .then(r => r.json())
      .then(d => { if (!d.error) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="sec-channel">
      <SectionLabel title="구스초이 채널 인사이트" sub="YouTube Data API · 공개 데이터 기준" />

      {loading && <Skeleton />}

      {!loading && data && (
        <div className="space-y-5">
          {/* 채널 스탯 */}
          <div className="flex items-center gap-4 p-4 rounded-2xl border border-black/6 bg-black/[0.01]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.channel.thumbnail} alt={data.channel.title}
              className="w-12 h-12 rounded-full object-cover shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-black/85">{data.channel.title}</p>
              <p className="text-[10px] text-black/30 mt-0.5">개설 {fmtDate(data.channel.publishedAt)}</p>
            </div>
            <div className="flex gap-5 shrink-0">
              {[
                { val: fmt(data.channel.subscribers), lbl: '구독자' },
                { val: fmt(data.channel.totalViews),  lbl: '총 조회수' },
                { val: fmt(data.channel.videoCount),  lbl: '영상 수' },
                ...(data.avgUploadInterval ? [{ val: `${data.avgUploadInterval}일`, lbl: '업로드 주기' }] : []),
              ].map(s => (
                <div key={s.lbl} className="text-center">
                  <p className="text-sm font-bold" style={{ color: KEY }}>{s.val}</p>
                  <p className="text-[9px] text-black/30 mt-0.5">{s.lbl}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 탭 */}
          <div className="flex gap-1">
            {(['top', 'latest'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
                style={tab === t
                  ? { backgroundColor: KEY, color: '#fff' }
                  : { color: 'rgba(0,0,0,0.35)' }
                }
              >
                {t === 'top' ? '인기 TOP 5' : '최신 5편'}
              </button>
            ))}
          </div>

          {/* 영상 목록 */}
          <div className="space-y-1">
            {(tab === 'top' ? data.topVideos : data.latestVideos).map((v, i) => (
              <VideoCard key={v.id} v={v} rank={tab === 'top' ? i : undefined} />
            ))}
          </div>
        </div>
      )}

      {!loading && !data && (
        <p className="text-xs text-black/30 py-4">채널 데이터를 불러오지 못했습니다.</p>
      )}
    </section>
  );
}
