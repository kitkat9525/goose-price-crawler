'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { SectionLabel } from './SectionLabel';

interface ShoppingItem { title: string; link: string; image: string; lprice: number; mallName: string; }
interface DistPoint    { priceLabel: string; count: number; avgPrice: number; }

const DISPLAY = 20;

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s infinite',
};
const SHIMMER_KEYFRAMES = `@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`;

function SkeletonCard({ snapAlign }: { snapAlign?: boolean }) {
  return (
    <>
      <style>{SHIMMER_KEYFRAMES}</style>
      <div
        className="w-40 shrink-0 flex flex-col border border-black/6 overflow-hidden"
        style={{ scrollSnapAlign: snapAlign ? 'start' : undefined }}
      >
        <div className="w-full h-36" style={shimmerStyle} />
        <div className="px-3 py-2.5 flex flex-col gap-2 flex-1">
          <div className="h-2.5 w-full" style={shimmerStyle} />
          <div className="h-2.5 w-3/4" style={shimmerStyle} />
          <div className="h-2 w-1/2 mt-auto" style={shimmerStyle} />
          <div className="h-3.5 w-2/3" style={shimmerStyle} />
        </div>
      </div>
    </>
  );
}

function ShoppingPriceChart({ query }: { query: string }) {
  const [chartData, setChartData] = useState<DistPoint[]>([]);
  const [tiers, setTiers]         = useState<{ label: string; avg: number; boundary: number }[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    fetch(`/api/shopping?query=${encodeURIComponent(query)}&display=100&start=1`)
      .then(r => r.json())
      .then(d => {
        const raw: { lprice: number }[] = (d.items ?? []).filter((i: { lprice: number }) => i.lprice > 0);
        if (raw.length === 0) { setLoading(false); return; }

        const prices = raw.map(i => i.lprice).sort((a, b) => a - b);
        const n = prices.length;
        const minP = prices[0];
        const maxP = prices[n - 1];
        const BUCKETS = 10;
        const step = (maxP - minP) / BUCKETS || 1;

        const points: DistPoint[] = Array.from({ length: BUCKETS }, (_, i) => {
          const lo = minP + i * step;
          const hi = lo + step;
          const bucket = prices.filter(p => i === BUCKETS - 1 ? p >= lo : p >= lo && p < hi);
          const avg = bucket.length ? Math.round(bucket.reduce((s, p) => s + p, 0) / bucket.length) : 0;
          return { priceLabel: `₩${Math.round(lo / 10000)}만`, count: bucket.length, avgPrice: avg };
        });
        setChartData(points);

        const t1 = prices[Math.floor(n / 3)];
        const t2 = prices[Math.floor((n * 2) / 3)];
        const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((s, p) => s + p, 0) / arr.length) : 0;
        setTiers([
          { label: '저가', avg: avg(prices.filter(p => p < t1)), boundary: t1 },
          { label: '중가', avg: avg(prices.filter(p => p >= t1 && p < t2)), boundary: t2 },
          { label: '고가', avg: avg(prices.filter(p => p >= t2)), boundary: maxP },
        ]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [query]);

  if (loading) return <div className="h-40 border border-black/6 mb-4" style={shimmerStyle} />;
  if (chartData.length === 0) return null;

  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-black/30">가격 분포 · 100개 기준</p>
        <div className="flex gap-3">
          {tiers.map(t => (
            <span key={t.label} className="text-xs text-black/40">
              <span className="font-bold text-black/60">{t.label}</span>{' '}
              평균 ₩{t.avg.toLocaleString('ko-KR')}
            </span>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={130}>
        <LineChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis dataKey="priceLabel" tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.3)' }} tickLine={false} axisLine={false} />
          <YAxis hide />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 0, border: '1px solid rgba(0,0,0,0.1)', color: 'rgba(0,0,0,0.7)' }}
            labelStyle={{ color: 'rgba(0,0,0,0.75)', fontWeight: 700 }}
            itemStyle={{ fontWeight: 700 }}
            formatter={(v) => [`${v ?? 0}개`, '상품 수']}
            labelFormatter={(l) => `가격대 ${l}`}
          />
          <Line type="monotone" dataKey="count" stroke="#111" strokeWidth={2}
            dot={{ r: 3, fill: '#111', strokeWidth: 0 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ScrollArrowBtn({ dir, disabled, onClick }: { dir: 'left' | 'right'; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="shrink-0 w-8 h-8 flex items-center justify-center border border-black/10 text-black/40 hover:text-black hover:border-black/30 transition-all disabled:opacity-0 disabled:pointer-events-none"
      style={{ borderRadius: 0 }}
      aria-label={dir === 'left' ? '이전' : '다음'}
    >
      {dir === 'left'
        ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      }
    </button>
  );
}

function ShoppingCarousel({ query }: { query: string }) {
  const [items, setItems]             = useState<ShoppingItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [noKey, setNoKey]             = useState(false);
  const [hasMore, setHasMore]         = useState(true);
  const startRef                      = useRef(1);
  const scrollRef                     = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft]   = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    startRef.current = 1;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setHasMore(true);
    fetch(`/api/shopping?query=${encodeURIComponent(query)}&start=1`)
      .then(r => r.json())
      .then(d => {
        if (d.error === 'naver_key_missing') { setNoKey(true); }
        else {
          const newItems: ShoppingItem[] = d.items ?? [];
          setItems(newItems);
          if (newItems.length < DISPLAY) setHasMore(false);
          else { startRef.current = 1 + DISPLAY; }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [query]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || noKey) return;
    setLoadingMore(true);
    fetch(`/api/shopping?query=${encodeURIComponent(query)}&start=${startRef.current}`)
      .then(r => r.json())
      .then(d => {
        const newItems: ShoppingItem[] = d.items ?? [];
        setItems(prev => [...prev, ...newItems]);
        if (newItems.length < DISPLAY) setHasMore(false);
        else { startRef.current += DISPLAY; }
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [query, loadingMore, hasMore, noKey]);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 80) loadMore();
  }, [loadMore]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    updateScrollState();
    return () => el.removeEventListener('scroll', updateScrollState);
  }, [updateScrollState, items]);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'right' ? 320 : -320, behavior: 'smooth' });
  };

  return (
    <div className="mb-6">
      {loading && (
        <div className="flex gap-3 overflow-hidden">
          {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}
      {!loading && noKey && <p className="text-xs text-black/30 py-4">네이버 API 키가 설정되지 않았습니다.</p>}
      {!loading && !noKey && items.length === 0 && <p className="text-xs text-black/30 py-4">상품을 가져오지 못했습니다.</p>}
      {!loading && !noKey && items.length > 0 && (
        <div className="flex items-center gap-2">
          <ScrollArrowBtn dir="left" disabled={!canScrollLeft} onClick={() => scroll('left')} />
          <div
            ref={scrollRef}
            className="flex-1 flex gap-3 overflow-x-auto pb-2"
            style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {items.map((item, i) => (
              <a key={`${item.link}-${i}`} href={item.link} target="_blank" rel="noopener noreferrer"
                className="w-40 shrink-0 flex flex-col border border-black/8 overflow-hidden hover:border-black/20 transition-all group"
                style={{ scrollSnapAlign: 'start' }}
              >
                <div className="w-full h-36 bg-black/[0.03] overflow-hidden">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-black/15 text-xs">이미지 없음</div>
                  )}
                </div>
                <div className="px-3 py-2.5 flex flex-col gap-1 flex-1">
                  <p className="text-xs font-medium text-black/75 leading-snug line-clamp-2">{item.title}</p>
                  <p className="text-xs text-black/30 mt-auto">{item.mallName}</p>
                  <p className="text-sm font-bold text-black">
                    {item.lprice > 0 ? `₩${item.lprice.toLocaleString('ko-KR')}` : '가격 미정'}
                  </p>
                </div>
              </a>
            ))}
            {loadingMore && [...Array(3)].map((_, i) => <SkeletonCard key={`skel-${i}`} snapAlign />)}
            {!hasMore && !loadingMore && (
              <div className="w-16 shrink-0 flex flex-col items-center justify-center text-black/20 text-xs gap-1">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M6 9h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                끝
              </div>
            )}
          </div>
          <ScrollArrowBtn dir="right" disabled={!canScrollRight} onClick={() => scroll('right')} />
        </div>
      )}
    </div>
  );
}

const SHOPPING_ITEMS = [
  { query: '구스이불', label: '구스이불' },
  { query: '구스베개', label: '구스베개' },
  { query: '구스토퍼', label: '구스토퍼' },
];

export function ShoppingSection() {
  return (
    <section className="space-y-10">
      <div id="sec-shopping">
        <SectionLabel title="쇼핑 트렌드" sub="인기 · 판매량순 · 네이버 쇼핑 기준" />
        {SHOPPING_ITEMS.map(({ query, label }) => (
          <div key={query} className="mb-8">
            <p className="text-xs font-bold tracking-widest uppercase mb-3 text-black/40">{label}</p>
            <ShoppingCarousel query={query} />
          </div>
        ))}
        <p className="text-xs text-black/25 mt-1">출처: 네이버 쇼핑 검색 API</p>
      </div>
      <PriceDistSection />
    </section>
  );
}

function PriceDistSection() {
  const [active, setActive] = useState(SHOPPING_ITEMS[0].query);
  return (
    <div id="sec-price-dist">
      <SectionLabel title="가격 분포" sub="상위 100개 기준 · 네이버 쇼핑" />
      <div className="border border-black/8 overflow-hidden">
        <div className="px-5 flex items-center border-b border-black/5">
          {SHOPPING_ITEMS.map(({ query, label }) => (
            <button
              key={query}
              onClick={() => setActive(query)}
              className="text-xs font-bold px-3 whitespace-nowrap transition-colors bg-transparent cursor-pointer"
              style={{
                paddingTop: 8,
                paddingBottom: 8,
                marginBottom: -1,
                border: 'none',
                borderBottom: active === query ? '2px solid #111' : '2px solid transparent',
                color: active === query ? '#111' : 'rgba(0,0,0,0.35)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="px-5 pt-4 pb-5">
          <ShoppingPriceChart query={active} />
        </div>
      </div>
    </div>
  );
}
