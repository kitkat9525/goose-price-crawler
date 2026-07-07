'use client';

import { useState, useEffect } from 'react';
import { KEY } from './constants';
import { SectionLabel } from './SectionLabel';

interface YoutubeItem {
  videoId:     string;
  title:       string;
  channel:     string;
  publishedAt: string;
  thumbnail:   string;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return ''; }
}

export function YoutubeSection() {
  const [items, setItems]     = useState<YoutubeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    fetch('/api/youtube')
      .then(r => r.json())
      .then(d => {
        if (d.source === 'live') setItems(d.items ?? []);
        else setError(true);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  return (
    <section id="sec-sns">
      <SectionLabel title="SNS 인사이트" sub="구스이불 · 유튜브 인기 영상" />

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-black/5 animate-pulse aspect-video" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="border border-black/6 rounded-2xl px-5 py-10 text-center">
          <p className="text-sm text-black/40">영상을 불러오지 못했습니다</p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map(item => (
            <a
              key={item.videoId}
              href={`https://www.youtube.com/watch?v=${item.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-2"
            >
              <div className="relative rounded-xl overflow-hidden aspect-video bg-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <circle cx="20" cy="20" r="20" fill="rgba(255,255,255,0.9)" />
                    <path d="M16 13L29 20L16 27V13Z" fill="#111" />
                  </svg>
                </div>
              </div>
              <div className="flex flex-col gap-0.5 px-0.5">
                <p className="text-xs font-medium text-black/80 leading-snug line-clamp-2 group-hover:text-black transition-colors">
                  {item.title}
                </p>
                <p className="text-[10px] text-black/35">{item.channel}</p>
                <p className="text-[10px]" style={{ color: KEY }}>{fmtDate(item.publishedAt)}</p>
              </div>
            </a>
          ))}
        </div>
      )}

      <p className="text-xs text-black/25 mt-4">출처: YouTube Data API v3</p>
    </section>
  );
}
