'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { KEY, KEY_BORDER } from './constants';
import { SectionLabel } from './SectionLabel';

interface YoutubeItem {
  videoId:     string;
  title:       string;
  channel:     string;
  publishedAt: string;
  thumbnail:   string;
}

const PAGE_SIZE = 20; // YouTube API max per request

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return ''; }
}

// ─── 스켈레톤 ─────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="shrink-0 flex flex-col gap-2" style={{ width: 200 }}>
      <div className="rounded-xl bg-black/5 animate-pulse" style={{ width: 200, height: 112 }} />
      <div className="flex flex-col gap-1.5 px-0.5">
        <div className="h-2.5 bg-black/5 rounded animate-pulse w-full" />
        <div className="h-2.5 bg-black/5 rounded animate-pulse w-3/4" />
        <div className="h-2 bg-black/5 rounded animate-pulse w-1/2 mt-0.5" />
      </div>
    </div>
  );
}

// ─── 영상 카드 ────────────────────────────────────
function VideoCard({ item }: { item: YoutubeItem }) {
  return (
    <a
      href={`https://www.youtube.com/watch?v=${item.videoId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0 flex flex-col gap-2 group"
      style={{ width: 200, scrollSnapAlign: 'start' }}
    >
      <div className="relative rounded-xl overflow-hidden bg-black/5" style={{ width: 200, height: 112 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.thumbnail}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
        >
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="18" fill="rgba(255,255,255,0.9)" />
            <path d="M14 11L26 18L14 25V11Z" fill="#111" />
          </svg>
        </div>
      </div>
      <div className="flex flex-col gap-0.5 px-0.5">
        <p className="text-xs font-medium text-black/80 leading-snug line-clamp-2 group-hover:text-black transition-colors">
          {item.title}
        </p>
        <p className="text-[10px] text-black/35 mt-0.5">{item.channel}</p>
        <p className="text-[10px]" style={{ color: KEY }}>{fmtDate(item.publishedAt)}</p>
      </div>
    </a>
  );
}

// ─── 캐러셀 ──────────────────────────────────────
function YoutubeCarousel() {
  const [items, setItems]           = useState<YoutubeItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]       = useState(true);
  const [error, setError]           = useState(false);
  const pageTokenRef                = useRef<string | null>(null);
  const scrollRef                   = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft]   = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    fetch('/api/youtube')
      .then(r => r.json())
      .then(d => {
        if (d.source === 'live') {
          setItems(d.items ?? []);
          pageTokenRef.current = d.nextPageToken ?? null;
          if (!d.nextPageToken) setHasMore(false);
        } else {
          setError(true);
        }
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || !pageTokenRef.current) return;
    setLoadingMore(true);
    fetch(`/api/youtube?pageToken=${encodeURIComponent(pageTokenRef.current)}`)
      .then(r => r.json())
      .then(d => {
        if (d.source === 'live') {
          setItems(prev => [...prev, ...(d.items ?? [])]);
          pageTokenRef.current = d.nextPageToken ?? null;
          if (!d.nextPageToken) setHasMore(false);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [loadingMore, hasMore]);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 160) loadMore();
  }, [loadMore]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    updateScrollState();
    return () => el.removeEventListener('scroll', updateScrollState);
  }, [updateScrollState, items]);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'right' ? 420 : -420, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (error || items.length === 0) {
    return <p className="text-xs text-black/30 py-4">영상을 불러오지 못했습니다.</p>;
  }

  // 3열 그리드: 아이템을 3개 행으로 분배
  const row1 = items.filter((_, i) => i % 3 === 0);
  const row2 = items.filter((_, i) => i % 3 === 1);
  const row3 = items.filter((_, i) => i % 3 === 2);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => scroll('left')}
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all hover:scale-110 active:scale-95"
        style={{ background: KEY, color: '#fff', border: `1.5px solid ${KEY_BORDER}`, opacity: canScrollLeft ? 1 : 0.35 }}
        aria-label="이전"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto pb-2 flex flex-col gap-3"
        style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* 1열 */}
        <div className="flex gap-3">
          {row1.map((item) => <VideoCard key={item.videoId + '-r1'} item={item} />)}
          {loadingMore && Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={`skel-r1-${i}`} />)}
          {!hasMore && !loadingMore && (
            <div className="w-12 shrink-0 flex items-center justify-center text-black/20 text-xs">끝</div>
          )}
        </div>
        {/* 2열 */}
        <div className="flex gap-3">
          {row2.map((item) => <VideoCard key={item.videoId + '-r2'} item={item} />)}
          {loadingMore && Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={`skel-r2-${i}`} />)}
        </div>
        {/* 3열 */}
        <div className="flex gap-3">
          {row3.map((item) => <VideoCard key={item.videoId + '-r3'} item={item} />)}
          {loadingMore && Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={`skel-r3-${i}`} />)}
        </div>
      </div>

      <button
        onClick={() => scroll('right')}
        disabled={!canScrollRight}
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all hover:scale-110 active:scale-95 disabled:opacity-0 disabled:pointer-events-none"
        style={{ background: KEY, color: '#fff', border: `1.5px solid ${KEY_BORDER}` }}
        aria-label="다음"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}

// ─── 네이버 쇼핑라이브 ──────────────────────────
function NaverLiveSection() {
  return (
    <div className="mt-10">
      <SectionLabel title="네이버 쇼핑라이브" sub="이불 · 최신 라이브 검색" />
      <div className="rounded-2xl overflow-hidden border border-black/8" style={{ height: 560 }}>
        <iframe
          src="https://shoppinglive.naver.com/search/lives?query=%EC%9D%B4%EB%B6%88"
          width="100%"
          height="100%"
          style={{ border: 'none', display: 'block' }}
          title="네이버 쇼핑라이브 이불 검색"
        />
      </div>
    </div>
  );
}

// ─── 메인 섹션 ───────────────────────────────────
export function YoutubeSection() {
  return (
    <section id="sec-sns">
      <SectionLabel title="SNS 인사이트" sub="구스이불 · 유튜브 최신 영상" />
      <YoutubeCarousel />
      <p className="text-xs text-black/25 mt-4">출처: YouTube Data API v3</p>
      <NaverLiveSection />
    </section>
  );
}
