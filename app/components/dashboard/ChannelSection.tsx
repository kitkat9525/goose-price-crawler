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

interface Snapshot {
  date: string;
  subscribers: number;
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
  snapshots: Snapshot[];
}

function fmt(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '만';
  if (n >= 1000)  return (n / 1000).toFixed(1) + '천';
  return n.toLocaleString('ko-KR');
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function SubscriberChart({ snapshots }: { snapshots: Snapshot[] }) {
  if (snapshots.length < 2) {
    return (
      <p className="text-[10px] text-black/25 py-3 text-center">
        데이터 수집 중입니다. 매일 방문 시 그래프가 쌓입니다.
      </p>
    );
  }

  const W = 480, H = 80, PAD = { top: 8, right: 8, bottom: 20, left: 44 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const vals = snapshots.map(s => s.subscribers);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const range = maxV - minV || 1;

  const xScale = (i: number) => PAD.left + (i / (snapshots.length - 1)) * innerW;
  const yScale = (v: number) => PAD.top + innerH - ((v - minV) / range) * innerH;

  const pts = snapshots.map((s, i) => `${xScale(i)},${yScale(s.subscribers)}`).join(' ');
  const area = [
    `M${xScale(0)},${PAD.top + innerH}`,
    ...snapshots.map((s, i) => `L${xScale(i)},${yScale(s.subscribers)}`),
    `L${xScale(snapshots.length - 1)},${PAD.top + innerH}`,
    'Z',
  ].join(' ');

  // 구독자 증감 (첫날 → 오늘)
  const delta = vals[vals.length - 1] - vals[0];
  const deltaLabel = delta >= 0 ? `+${delta.toLocaleString('ko-KR')}` : delta.toLocaleString('ko-KR');
  const deltaColor = delta > 0 ? '#34c759' : delta < 0 ? '#ff3b30' : '#999';

  // Y축 눈금 2개 (min, max)
  function fmtSub(n: number) {
    if (n >= 10000) return (n / 10000).toFixed(1) + '만';
    if (n >= 1000)  return (n / 1000).toFixed(1) + '천';
    return n.toString();
  }

  // X축 시작·끝 날짜
  const dateFirst = snapshots[0].date.slice(5);           // MM-DD
  const dateLast  = snapshots[snapshots.length - 1].date.slice(5);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] text-black/35">구독자 추이 ({snapshots.length}일)</p>
        <span className="text-[10px] font-bold" style={{ color: deltaColor }}>
          {deltaLabel}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }}>
        <defs>
          <linearGradient id="sub-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={KEY} stopOpacity="0.18" />
            <stop offset="100%" stopColor={KEY} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* 영역 */}
        <path d={area} fill="url(#sub-grad)" />
        {/* 선 */}
        <polyline points={pts} fill="none" stroke={KEY} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        {/* Y축 눈금 */}
        <text x={PAD.left - 4} y={PAD.top + 4} fontSize="8" fill="rgba(0,0,0,0.3)" textAnchor="end">{fmtSub(maxV)}</text>
        <text x={PAD.left - 4} y={PAD.top + innerH} fontSize="8" fill="rgba(0,0,0,0.3)" textAnchor="end">{fmtSub(minV)}</text>
        {/* X축 날짜 */}
        <text x={PAD.left} y={H - 4} fontSize="8" fill="rgba(0,0,0,0.25)" textAnchor="start">{dateFirst}</text>
        <text x={W - PAD.right} y={H - 4} fontSize="8" fill="rgba(0,0,0,0.25)" textAnchor="end">{dateLast}</text>
        {/* 마지막 점 */}
        <circle cx={xScale(snapshots.length - 1)} cy={yScale(vals[vals.length - 1])} r="3" fill={KEY} />
      </svg>
    </div>
  );
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
    window.open('https://playboard.co/channel/UChuq17DrAiJwkpxNajkEDYw', '_blank', 'noopener,noreferrer');
  }, []);

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

          {/* 구독자 트렌드 */}
          {data.snapshots?.length > 0 && (
            <div className="px-4 py-3 rounded-2xl border border-black/6 bg-black/[0.01]">
              <SubscriberChart snapshots={data.snapshots} />
            </div>
          )}

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
