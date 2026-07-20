'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

import type { AggregatedData, FxRates, CategoryPrices, PriceEntry, CustomsMonthData } from '@/app/lib/aggregate';
import type { NewsItem } from '@/app/lib/types';
import { CUSTOMS_HS_NOTE } from '@/app/lib/sources/customs';
import { FeedbackModal } from './dashboard/FeedbackModal';
import { HelpModal }     from './dashboard/HelpModal';
import { NoticePopup }   from './dashboard/NoticePopup';

// ── 상수 ──────────────────────────────────────────────────────
const KEY = '#AA8E5C';
const SETTINGS_KEY = 'goose-settings';
const PAGE_SIZE = 10;

type Currency = 'CNY' | 'USD' | 'KRW' | 'EUR';
const CURRENCIES: Currency[]            = ['CNY', 'USD', 'KRW', 'EUR'];
const CUR_SYM: Record<Currency, string> = { CNY: '¥', USD: '$', KRW: '₩', EUR: '€' };
const CUR_LBL: Record<Currency, string> = { CNY: '위안', USD: '달러', KRW: '원', EUR: '유로' };

const CFD_STANDARDS = [
  { key: '服标', label: '중국의류표준' },
  { key: '寝标', label: '중국침구표준' },
  { key: '国标', label: '중국국가표준' },
  { key: '欧标', label: '유럽표준' },
  { key: '美标', label: '미국표준' },
  { key: '日标', label: '일본표준' },
] as const;

const SHOPPING_KWS = [
  { query: '구스이불', label: '구스이불' },
  { query: '구스베개', label: '구스베개' },
  { query: '구스토퍼', label: '구스토퍼' },
];

const INSIGHT_KWS = ['구스이불', '구스베개', '구스토퍼', '이불', '베개', '토퍼'];

const M_NAV: { id: string; label: string; sep?: boolean }[] = [
  { id: 'm-fx',       label: '환율' },
  { id: 'm-goose',    label: '구스·덕다운' },
  { id: 'm-cert',     label: '인증현황' },
  { id: 'm-customs',  label: '수입통계' },
  { id: 'm-news',     label: '뉴스' },
  { id: 'm-shopping', label: '쇼핑트렌드', sep: true },
  { id: 'm-pricedist',label: '가격분포' },
  { id: 'm-insight',  label: '쇼핑인사이트' },
  { id: 'm-sns',      label: 'SNS인사이트' },
];
const DEVICE_LBL: Record<string, string> = { pc: 'PC', mo: '모바일' };
const GENDER_LBL: Record<string, string> = { f: '여성', m: '남성' };
const AGE_LBL: Record<string, string>    = { '10':'10대','20':'20대','30':'30대','40':'40대','50':'50대','60':'60대+' };

const CERTS = [
  { id: 'oekotex',  name: 'OEKO-TEX®',  desc: '유해물질 안전성',     src: '/certs/oeko-tex.webp',  href: 'https://www.oeko-tex.com/en/news/' },
  { id: 'rds',      name: 'RDS',         desc: '책임있는 다운 표준',  src: '/certs/rds.png',         href: 'https://textileexchange.org/conference-2026/' },
  { id: 'idfl',     name: 'IDFL',        desc: '국제 다운·깃털 시험', src: '/certs/idfl.jpeg',       href: 'https://idfl.com/ko/news/' },
  { id: 'ultra',    name: 'Ultra-Fresh', desc: '항균·항곰팡이',       src: '/certs/ultra-fresh.png', href: 'https://www.ultra-fresh.com/antimicrobial-blog' },
  { id: 'sgs',      name: 'SGS',         desc: '글로벌 검사·인증',    src: '/certs/sgs.webp',        href: 'https://www.sgs.com/en/news-and-resources' },
  { id: 'downpass', name: 'DOWNPASS',    desc: '다운·깃털 추적성',    src: '/certs/downpass.png',    href: 'https://www.downpass.com/de/startseite/' },
] as const;

// ── 유틸 함수 ─────────────────────────────────────────────────
function convert(cny: number, cur: Currency, fx: FxRates) {
  if (cur === 'USD') return cny * fx.USD;
  if (cur === 'KRW') return cny * fx.KRW;
  if (cur === 'EUR') return cny * fx.EUR;
  return cny;
}
function fmtPrice(n: number, cur: Currency) {
  const s = CUR_SYM[cur];
  if (cur === 'KRW') return `${s}${Math.round(n).toLocaleString('ko-KR')}`;
  return `${s}${n.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtNum(n: number, d = 2) {
  return n.toLocaleString('ko-KR', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtPubDate(s: string) {
  try { return new Date(s).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }); }
  catch { return s; }
}

// ── 섹션 헤더 ─────────────────────────────────────────────────
function MSecHdr({ tag, title, sub }: { tag: string; title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'rgba(17,17,17,0.28)', marginBottom: 4, textTransform: 'uppercase' }}>{tag}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5, color: '#111' }}>{title}</h2>
        {sub && <span style={{ fontSize: 10, color: 'rgba(17,17,17,0.35)' }}>{sub}</span>}
      </div>
    </div>
  );
}

// ── CFD 카드 ──────────────────────────────────────────────────
function MagCard({ cat, cur, fx }: { cat: CategoryPrices; cur: Currency; fx: FxRates }) {
  const isGoose = cat.type === 'goose';
  const isWhite = cat.color === 'white';
  const top90   = cat.prices.find(p => p.grade === '90%');
  const price   = top90 ? convert(top90.current, cur, fx) : null;
  const diff    = top90 ? convert(Math.abs(top90.diff), cur, fx) : null;
  const isDown  = top90 ? top90.diff <= 0 : true;

  return (
    <div style={{ border: '1px solid #ebebeb', padding: '18px 16px' }}>
      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: 'rgba(17,17,17,0.28)', marginBottom: 4, textTransform: 'uppercase' }}>{cat.nameKr}</p>
      <p style={{ fontSize: 18, fontWeight: 900, letterSpacing: -0.5, marginBottom: 8, color: '#111' }}>
        {isWhite ? '화이트' : '그레이'} {isGoose ? '구스다운' : '덕다운'}
      </p>
      {price != null ? (
        <>
          <p style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1.5, lineHeight: 1, color: '#111' }}>
            {fmtPrice(price, cur)}<span style={{ fontSize: 12, color: 'rgba(17,17,17,0.3)', fontWeight: 400, marginLeft: 6 }}>/kg</span>
          </p>
          {diff != null && (
            <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '2px 8px', background: '#f0f0f0', marginTop: 6 }}>
              {isDown ? '▼' : '▲'} {fmtPrice(diff, cur)} ({top90?.yoy ?? ''})
            </span>
          )}
        </>
      ) : <p style={{ fontSize: 13, color: 'rgba(17,17,17,0.25)' }}>데이터 없음</p>}
      <div style={{ height: 1, background: '#ebebeb', margin: '12px 0' }} />
      {cat.prices.map(entry => {
        const p   = convert(entry.current, cur, fx);
        const d   = convert(Math.abs(entry.diff), cur, fx);
        const is90 = entry.grade === '90%';
        return (
          <div key={entry.grade} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f2f2f2', fontSize: 12 }}>
            <span style={{ color: is90 ? '#111' : 'rgba(17,17,17,0.4)', fontWeight: 700 }}>{entry.grade}</span>
            <span style={{ fontWeight: 900, fontSize: is90 ? 14 : 12, color: '#111' }}>{fmtPrice(p, cur)}</span>
            <span style={{ fontSize: 10, color: 'rgba(17,17,17,0.35)' }}>{entry.diff <= 0 ? '▼' : '▲'} {fmtPrice(d, cur)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── 헤로 패널 ─────────────────────────────────────────────────
function MHeroPanel({ tag, title, entry, currency, fx }: { tag: string; title: string; entry?: PriceEntry; currency: Currency; fx: FxRates }) {
  const price = entry ? convert(entry.current, currency, fx) : null;
  const diff  = entry ? convert(Math.abs(entry.diff), currency, fx) : null;
  const down  = entry ? entry.diff <= 0 : true;
  return (
    <div style={{ flex: 1, padding: '14px 16px', background: '#f8f8f8' }}>
      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.2, color: 'rgba(17,17,17,0.3)', marginBottom: 3, textTransform: 'uppercase' }}>{tag}</p>
      <p style={{ fontSize: 14, fontWeight: 900, letterSpacing: -0.3, color: '#111', marginBottom: 6 }}>{title}</p>
      {price != null ? (
        <>
          <p style={{ fontSize: 24, fontWeight: 900, letterSpacing: -1, lineHeight: 1, color: '#111' }}>{fmtPrice(price, currency)}</p>
          <p style={{ fontSize: 9, color: 'rgba(17,17,17,0.3)', marginTop: 2 }}>90% 기준 /kg</p>
          {diff != null && <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, padding: '2px 7px', background: '#ebebeb', marginTop: 5, color: '#111' }}>{down ? '▼' : '▲'} {fmtPrice(diff, currency)}</span>}
        </>
      ) : <p style={{ fontSize: 11, color: 'rgba(17,17,17,0.25)' }}>데이터 없음</p>}
    </div>
  );
}

// ── 관세청 차트 ───────────────────────────────────────────────
function MCustomsCharts({ months, cur, fx }: { months: CustomsMonthData[]; cur: Currency; fx: FxRates }) {
  const sym = CUR_SYM[cur];
  const toDisp = (usd: number) => {
    if (cur === 'KRW') return parseFloat((usd * (fx.KRW / fx.USD)).toFixed(0));
    if (cur === 'EUR') return parseFloat((usd * (fx.EUR / fx.USD)).toFixed(2));
    if (cur === 'CNY') return parseFloat((usd / fx.USD).toFixed(2));
    return parseFloat(usd.toFixed(2));
  };
  const chartData = [...months]
    .sort((a, b) => a.period.localeCompare(b.period))
    .map(m => ({
      label: m.periodLabel.replace('년 ', '.').replace('월', ''),
      단가: toDisp(m.unitPrice),
      수입량: parseFloat((m.importVolume / 1000).toFixed(1)),
    }));
  const tt: React.CSSProperties = { background: '#fff', border: '1px solid #111', borderRadius: 0, fontSize: 11, padding: '6px 10px', boxShadow: 'none' };
  return (
    <div style={{ border: '1px solid #ebebeb', overflow: 'hidden' }}>
      <div style={{ height: 180, padding: '16px 0 0' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="m-customs-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#111" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#111" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'rgba(17,17,17,0.35)' }} axisLine={{ stroke: '#ebebeb' }} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: 'rgba(17,17,17,0.3)' }} axisLine={false} tickLine={false}
              tickFormatter={v => `${sym}${cur === 'KRW' ? Math.round(v / 1000) + 'k' : v}`} width={36} />
            <Tooltip contentStyle={tt} labelStyle={{ fontWeight: 700, marginBottom: 4, color: '#111' }}
              formatter={(v) => [`${sym}${fmtNum(Number(v), cur === 'KRW' ? 0 : 2)}/kg`, '수입단가']}
              cursor={{ stroke: 'rgba(0,0,0,0.12)', strokeWidth: 1 }} />
            <Area type="monotone" dataKey="단가" stroke="#111" strokeWidth={2} fill="url(#m-customs-grad)"
              dot={false} activeDot={{ r: 3, fill: '#111', strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div style={{ height: 1, background: '#ebebeb', margin: '0 16px' }} />
      <div style={{ height: 80, padding: '6px 0 0' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 16, left: 8, bottom: 0 }} barCategoryGap="40%">
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'rgba(17,17,17,0.35)' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={tt} labelStyle={{ fontWeight: 700, marginBottom: 4, color: '#111' }}
              formatter={(v) => [`${Number(v)}톤`, '수입량']} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
            <Bar dataKey="수입량" fill="#e8e8e8" radius={[2, 2, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── 뉴스 컬럼 ─────────────────────────────────────────────────
function MNewsCol({ title, keywords, apiPath, sourceNote }: {
  title: string; keywords: string[]; apiPath: string; sourceNote: string;
}) {
  const [news, setNews]       = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(0);
  const [kw, setKw]           = useState(0);

  useEffect(() => {
    fetch(apiPath).then(r => r.json()).then(d => { setNews(d.news ?? []); setLoading(false); }).catch(() => setLoading(false));
  }, [apiPath]);

  const totalPages = Math.ceil(news.length / PAGE_SIZE);
  const paged = news.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div>
      <MSecHdr tag="NEWS" title={title} />
      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {keywords.map((k, i) => (
          <button key={k} onClick={() => { setKw(i); setPage(0); }}
            style={{ fontSize: 11, fontWeight: 700, padding: '5px 10px 5px 0', background: 'none', border: 'none',
              borderBottom: kw === i ? '2px solid #111' : '2px solid transparent',
              color: kw === i ? '#111' : 'rgba(17,17,17,0.32)', cursor: 'pointer', fontFamily: 'inherit' }}>
            {k}
          </button>
        ))}
      </div>
      {loading && <p style={{ fontSize: 12, color: 'rgba(17,17,17,0.3)', padding: '20px 0', textAlign: 'center' }}>불러오는 중...</p>}
      {!loading && paged.map((item, i) => (
        <div key={i} style={{ padding: '11px 0', borderBottom: '1px solid #f2f2f2' }}>
          <a href={item.link} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.5, color: '#111', display: 'block', textDecoration: 'none' }}>
            {item.title}
          </a>
          <p style={{ fontSize: 10, color: 'rgba(17,17,17,0.28)', marginTop: 3 }}>
            {item.source}{item.source && item.pubDate ? ' · ' : ''}{item.pubDate ? fmtPubDate(item.pubDate) : ''}
          </p>
        </div>
      ))}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <span style={{ fontSize: 11, color: 'rgba(17,17,17,0.4)' }}>{page + 1} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
            style={{ fontSize: 12, fontWeight: 700, padding: '5px 14px', border: '1px solid #ddd', borderRadius: 2, background: '#fff', cursor: 'pointer', fontFamily: 'inherit', opacity: page === totalPages - 1 ? 0.3 : 1 }}>
            다음 →
          </button>
        </div>
      )}
      <p style={{ fontSize: 10, color: 'rgba(17,17,17,0.28)', marginTop: 10, lineHeight: 1.7 }}>{sourceNote}</p>
    </div>
  );
}

// ── 쇼핑 캐러셀 ──────────────────────────────────────────────
interface ShoppingItem { title: string; link: string; image: string; lprice: number; mallName: string; }
const SHIMMER: React.CSSProperties = { background: 'linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' };
const SHIMMER_KF = `@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`;

function MSkelCard() {
  return (
    <div style={{ flexShrink: 0, width: 140 }}>
      <style>{SHIMMER_KF}</style>
      <div style={{ width: 140, height: 140, ...SHIMMER, marginBottom: 8 }} />
      <div style={{ height: 9, width: '70%', ...SHIMMER, marginBottom: 5 }} />
      <div style={{ height: 9, width: '90%', ...SHIMMER, marginBottom: 5 }} />
      <div style={{ height: 12, width: '50%', ...SHIMMER }} />
    </div>
  );
}

function MShoppingCarousel({ query }: { query: string }) {
  const [items, setItems]     = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadMore, setLoadMore] = useState(false);
  const [noKey, setNoKey]     = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const startRef              = useRef(1);
  const scrollRef             = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startRef.current = 1;
    void (async () => {
      setLoading(true); setHasMore(true);
      try {
        const r = await fetch(`/api/shopping?query=${encodeURIComponent(query)}&start=1`);
        const d = await r.json();
        if (d.error === 'naver_key_missing') { setNoKey(true); }
        else { const it: ShoppingItem[] = d.items ?? []; setItems(it); if (it.length < 20) setHasMore(false); else startRef.current = 21; }
      } catch {} finally { setLoading(false); }
    })();
  }, [query]);

  const fetchMore = useCallback(() => {
    if (loadMore || !hasMore || noKey) return;
    setLoadMore(true);
    fetch(`/api/shopping?query=${encodeURIComponent(query)}&start=${startRef.current}`)
      .then(r => r.json()).then(d => {
        const it: ShoppingItem[] = d.items ?? [];
        setItems(prev => [...prev, ...it]);
        if (it.length < 20) setHasMore(false); else startRef.current += 20;
      }).catch(() => {}).finally(() => setLoadMore(false));
  }, [query, loadMore, hasMore, noKey]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current; if (!el) return;
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 8) fetchMore();
  }, [fetchMore]);

  useEffect(() => {
    const el = scrollRef.current; if (!el) return;
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [onScroll, items]);

  if (loading) return <div style={{ display: 'flex', gap: 12, overflow: 'hidden' }}>{[...Array(4)].map((_, i) => <MSkelCard key={i} />)}</div>;
  if (noKey)   return <p style={{ fontSize: 11, color: 'rgba(17,17,17,0.3)', padding: '12px 0' }}>네이버 API 키가 설정되지 않았습니다.</p>;
  if (!items.length) return <p style={{ fontSize: 11, color: 'rgba(17,17,17,0.3)', padding: '12px 0' }}>상품을 가져오지 못했습니다.</p>;

  return (
    <div ref={scrollRef} style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
      {items.map((item, i) => (
        <a key={`${item.link}-${i}`} href={item.link} target="_blank" rel="noopener noreferrer"
          style={{ flexShrink: 0, width: 140, textDecoration: 'none', color: 'inherit' }}>
          <div style={{ width: 140, height: 140, background: '#f2f2f2', overflow: 'hidden', marginBottom: 8 }}>
            {item.image
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={item.image} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'rgba(17,17,17,0.25)' }}>이미지 없음</div>
            }
          </div>
          <p style={{ fontSize: 9, color: 'rgba(17,17,17,0.4)', marginBottom: 3 }}>{item.mallName}</p>
          <p style={{ fontSize: 11, lineHeight: 1.4, color: '#111', marginBottom: 4,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
            {item.title}
          </p>
          <p style={{ fontSize: 13, fontWeight: 900, color: '#111' }}>{item.lprice > 0 ? `₩${item.lprice.toLocaleString('ko-KR')}` : '가격 미정'}</p>
        </a>
      ))}
      {loadMore && [...Array(2)].map((_, i) => <MSkelCard key={`s-${i}`} />)}
    </div>
  );
}

// ── 가격분포 ──────────────────────────────────────────────────
function MPriceChart({ query }: { query: string }) {
  const [chartData, setChartData] = useState<{ priceLabel: string; count: number }[]>([]);
  const [tiers, setTiers]         = useState<{ label: string; avg: number }[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    fetch(`/api/shopping?query=${encodeURIComponent(query)}&display=100&start=1`)
      .then(r => r.json()).then(d => {
        const raw: { lprice: number }[] = (d.items ?? []).filter((i: { lprice: number }) => i.lprice > 0);
        if (!raw.length) { setLoading(false); return; }
        const prices = raw.map(i => i.lprice).sort((a, b) => a - b);
        const n = prices.length, minP = prices[0], maxP = prices[n - 1];
        const step = (maxP - minP) / 10 || 1;
        const pts = Array.from({ length: 10 }, (_, i) => {
          const lo = minP + i * step, hi = lo + step;
          return { priceLabel: `₩${Math.round(lo / 10000)}만`, count: prices.filter(p => i === 9 ? p >= lo : p >= lo && p < hi).length };
        });
        setChartData(pts);
        const t1 = prices[Math.floor(n / 3)], t2 = prices[Math.floor(n * 2 / 3)];
        const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((s, p) => s + p, 0) / arr.length) : 0;
        setTiers([
          { label: '저가', avg: avg(prices.filter(p => p < t1)) },
          { label: '평균', avg: avg(prices) },
          { label: '고가', avg: avg(prices.filter(p => p >= t2)) },
        ]);
        setLoading(false);
      }).catch(() => setLoading(false));
  }, [query]);

  if (loading) return <div style={{ height: 80, background: '#fafafa', border: '1px solid #ebebeb', ...SHIMMER }} />;
  if (!chartData.length) return null;
  return (
    <>
      <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
        {tiers.map(t => (
          <div key={t.label} style={{ fontSize: 11, color: 'rgba(17,17,17,0.35)' }}>
            {t.label} <strong style={{ color: '#111', fontWeight: 700, fontSize: 12 }}>₩{t.avg.toLocaleString('ko-KR')}</strong>
          </div>
        ))}
      </div>
      <div style={{ border: '1px solid #ebebeb', height: 140, overflow: 'hidden' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="m-pd-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#111" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#111" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="priceLabel" tick={{ fontSize: 8, fill: 'rgba(17,17,17,0.35)' }} tickLine={false} axisLine={{ stroke: '#ebebeb' }} />
            <YAxis hide />
            <Tooltip contentStyle={{ background: '#fff', border: '1px solid #111', borderRadius: 0, fontSize: 11, padding: '6px 10px', boxShadow: 'none' }}
              labelStyle={{ fontWeight: 700, marginBottom: 4 }} formatter={(v) => [`${v}개`, '상품 수']}
              cursor={{ stroke: 'rgba(0,0,0,0.12)', strokeWidth: 1 }} />
            <Area type="monotone" dataKey="count" stroke="#111" strokeWidth={2} fill="url(#m-pd-grad)" dot={false} activeDot={{ r: 3, fill: '#111', strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

// ── 쇼핑인사이트 ──────────────────────────────────────────────
interface InsightBreakdown { group: string; ratio: number; }
function aggGroup(data: InsightBreakdown[]) {
  const m: Record<string, { total: number; cnt: number }> = {};
  for (const d of data) {
    if (!m[d.group]) m[d.group] = { total: 0, cnt: 0 };
    m[d.group].total += d.ratio; m[d.group].cnt++;
  }
  return Object.entries(m).map(([group, { total, cnt }]) => ({ group, ratio: parseFloat((total / cnt).toFixed(1)) }));
}

function MBarRow({ label, ratio, light }: { label: string; ratio: number; light?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
      <span style={{ fontSize: 11, color: 'rgba(17,17,17,0.5)', width: 38, textAlign: 'right', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 18, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${ratio}%`, height: '100%', background: light ? '#d0d0d0' : '#111', borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(17,17,17,0.5)', width: 28 }}>{ratio}%</span>
    </div>
  );
}

function MInsightSection() {
  const [data, setData]       = useState<{ source: string; trends: { title: string; data: { period: string; ratio: number }[] }[]; device?: Record<string, InsightBreakdown[]>; gender?: Record<string, InsightBreakdown[]>; age?: Record<string, InsightBreakdown[]>; error?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive]   = useState(INSIGHT_KWS[0]);

  useEffect(() => {
    fetch('/api/shopping-insight').then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const trend     = data?.trends.find(t => t.title === active);
  const chartData = (trend?.data ?? []).map(d => ({
    label: d.period.slice(5, 7) + '월', fullLabel: d.period.slice(0, 7).replace('-', '.'), ratio: parseFloat(Number(d.ratio).toFixed(1)),
  }));
  const deviceData = aggGroup(data?.device?.[active] ?? []);
  const genderData = aggGroup(data?.gender?.[active] ?? []);
  const ageData    = aggGroup(data?.age?.[active]    ?? []);
  const maxAge     = Math.max(...ageData.map(d => d.ratio), 0);

  return (
    <div>
      <MSecHdr tag="SHOPPING INSIGHT" title="쇼핑 인사이트" sub="클릭 지수 기준" />
      {loading && <p style={{ fontSize: 12, color: 'rgba(17,17,17,0.3)', padding: '32px 0', textAlign: 'center' }}>불러오는 중...</p>}
      {!loading && (!data || data.source === 'unavailable') && (
        <p style={{ fontSize: 13, color: 'rgba(17,17,17,0.4)' }}>{data?.error === 'naver_key_missing' ? '네이버 API 키가 설정되지 않았습니다' : '데이터를 불러오지 못했습니다'}</p>
      )}
      {!loading && data?.source === 'live' && (
        <>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 14 }}>
            {INSIGHT_KWS.map(k => (
              <button key={k} onClick={() => setActive(k)}
                style={{ fontSize: 11, fontWeight: 700, padding: '5px 10px 5px 0', background: 'none', border: 'none',
                  borderBottom: active === k ? '2px solid #111' : '2px solid transparent',
                  color: active === k ? '#111' : 'rgba(17,17,17,0.32)', cursor: 'pointer', fontFamily: 'inherit' }}>
                {k}
              </button>
            ))}
          </div>
          <div style={{ border: '1px solid #ebebeb', height: 200, marginBottom: 16, overflow: 'hidden' }}>
            {chartData.length === 0
              ? <p style={{ fontSize: 12, color: 'rgba(17,17,17,0.3)', textAlign: 'center', paddingTop: 64 }}>데이터 없음</p>
              : <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="m-insight-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#111" stopOpacity={0.1} />
                        <stop offset="100%" stopColor="#111" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'rgba(17,17,17,0.35)' }} axisLine={{ stroke: '#ebebeb' }} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'rgba(17,17,17,0.3)' }} axisLine={false} tickLine={false} width={24} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #111', borderRadius: 0, fontSize: 11, padding: '6px 10px', boxShadow: 'none' }}
                      labelStyle={{ fontWeight: 700, marginBottom: 4 }}
                      labelFormatter={(_, p) => p?.[0]?.payload?.fullLabel ?? ''}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: any) => [v, '클릭 지수']}
                      cursor={{ stroke: 'rgba(0,0,0,0.12)', strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="ratio" stroke="#111" strokeWidth={2} fill="url(#m-insight-grad)" dot={false} activeDot={{ r: 3, fill: '#111', strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
            }
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: 'rgba(17,17,17,0.3)', marginBottom: 10, textTransform: 'uppercase' }}>기기별</p>
              {deviceData.map((d, i) => <MBarRow key={d.group} label={DEVICE_LBL[d.group] ?? d.group} ratio={d.ratio} light={i > 0} />)}
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: 'rgba(17,17,17,0.3)', margin: '14px 0 10px', textTransform: 'uppercase' }}>성별</p>
              {genderData.map((d, i) => <MBarRow key={d.group} label={GENDER_LBL[d.group] ?? d.group} ratio={d.ratio} light={i > 0} />)}
            </div>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: 'rgba(17,17,17,0.3)', marginBottom: 10, textTransform: 'uppercase' }}>연령별</p>
              {ageData.map(d => <MBarRow key={d.group} label={AGE_LBL[d.group] ?? d.group} ratio={d.ratio} light={d.ratio < maxAge} />)}
            </div>
          </div>
          <p style={{ fontSize: 9, color: 'rgba(17,17,17,0.28)', marginTop: 14, lineHeight: 1.7 }}>출처: 네이버 쇼핑인사이트 · 클릭 지수 기준</p>
        </>
      )}
    </div>
  );
}

// ── 유튜브 그리드 ─────────────────────────────────────────────
interface YtItem { videoId: string; title: string; channel: string; publishedAt: string; thumbnail: string; }

function MYoutubeGrid() {
  const [items, setItems]       = useState<YtItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [hasMore, setHasMore]   = useState(true);
  const [loadMore, setLoadMore] = useState(false);
  const [error, setError]       = useState(false);
  const tokenRef = useRef<string | null>(null);
  const sentRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/youtube').then(r => r.json()).then(d => {
      if (d.source === 'live') { setItems(d.items ?? []); tokenRef.current = d.nextPageToken ?? null; if (!d.nextPageToken) setHasMore(false); }
      else setError(true);
      setLoading(false);
    }).catch(() => { setError(true); setLoading(false); });
  }, []);

  const fetchMore = useCallback(() => {
    if (loadMore || !hasMore || !tokenRef.current) return;
    setLoadMore(true);
    fetch(`/api/youtube?pageToken=${encodeURIComponent(tokenRef.current)}`).then(r => r.json()).then(d => {
      if (d.source === 'live') { setItems(p => [...p, ...(d.items ?? [])]); tokenRef.current = d.nextPageToken ?? null; if (!d.nextPageToken) setHasMore(false); }
    }).catch(() => {}).finally(() => setLoadMore(false));
  }, [loadMore, hasMore]);

  useEffect(() => {
    const el = sentRef.current; if (!el) return;
    const obs = new IntersectionObserver(entries => { if (entries[0].isIntersecting) fetchMore(); }, { rootMargin: '200px' });
    obs.observe(el); return () => obs.disconnect();
  }, [fetchMore]);

  if (loading) return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i}><div style={{ width: '100%', aspectRatio: '16/9', background: '#f2f2f2', marginBottom: 8 }} /></div>
      ))}
    </div>
  );
  if (error || !items.length) return <p style={{ fontSize: 12, color: 'rgba(17,17,17,0.3)', padding: '12px 0' }}>영상을 불러오지 못했습니다.</p>;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {items.map(item => (
          <a key={item.videoId} href={`https://www.youtube.com/watch?v=${item.videoId}`} target="_blank" rel="noopener noreferrer"
            style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ width: '100%', aspectRatio: '16/9', background: '#f2f2f2', overflow: 'hidden', marginBottom: 7 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.thumbnail} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
            <p style={{ fontSize: 9, color: 'rgba(17,17,17,0.4)', marginBottom: 2 }}>{item.channel}</p>
            <p style={{ fontSize: 11, lineHeight: 1.45, color: '#111',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
              {item.title}
            </p>
          </a>
        ))}
        {loadMore && Array.from({ length: 2 }).map((_, i) => (
          <div key={`s-${i}`}><div style={{ width: '100%', aspectRatio: '16/9', background: '#f2f2f2', marginBottom: 8 }} /></div>
        ))}
      </div>
      {hasMore && <div ref={sentRef} style={{ height: 16 }} />}
    </>
  );
}

// ── 메인 모바일 대시보드 ──────────────────────────────────────
export default function MobileDashboard({ data }: { data: AggregatedData }) {
  const router = useRouter();

  const [currency, setCurrency] = useState<Currency>(() => {
    try { return (JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}').currency as Currency) ?? 'KRW'; }
    catch { return 'KRW'; }
  });
  const [showFeedback, setShowFeedback] = useState(false);
  const [showHelp, setShowHelp]         = useState(false);
  const [active, setActive]             = useState('m-fx');
  const [cfdStd, setCfdStd]             = useState('服标');
  const [cfdData, setCfdData]           = useState(data.cfd);
  const [cfdLoading, setCfdLoading]     = useState(false);
  const [pdActive, setPdActive]         = useState(SHOPPING_KWS[0].query);
  const [menuOpen, setMenuOpen]         = useState(false);
  const [naverSrc, setNaverSrc]         = useState('https://shoppinglive.naver.com/search/lives?query=%EC%9D%B4%EB%B6%88&sort=RECENT');

  const { fx, customs } = data;
  const eurKrw = fx.KRW / fx.EUR;
  const usdKrw = fx.KRW / fx.USD;
  const cnyKrw = fx.KRW;
  const goose  = cfdData.categories.filter(c => c.type === 'goose');
  const duck   = cfdData.categories.filter(c => c.type === 'duck');
  const allCats = [
    goose.find(c => c.color === 'white'),
    duck.find(c => c.color === 'white'),
    goose.find(c => c.color === 'grey'),
    duck.find(c => c.color === 'grey'),
  ].filter(Boolean) as CategoryPrices[];
  const wg90 = goose.find(c => c.color === 'white')?.prices.find(p => p.grade === '90%');
  const gg90 = goose.find(c => c.color === 'grey')?.prices.find(p => p.grade === '90%');

  const lastUpdated = fx.lastUpdatedUtc ? (() => {
    try { return new Date(fx.lastUpdatedUtc).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) + ' KST'; }
    catch { return fx.lastUpdatedUtc; }
  })() : null;

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => {
        const vis = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis.length) setActive(vis[0].target.id);
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );
    M_NAV.forEach(({ id }) => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  function scrollTo(id: string) {
    const el = document.getElementById(id); if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' });
  }
  function saveCurrency(c: Currency) {
    setCurrency(c);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ currency: c })); } catch {}
  }
  async function logout() { await fetch('/api/logout', { method: 'POST' }); router.push('/'); }
  async function switchStd(key: string) {
    if (key === cfdStd || cfdLoading) return;
    setCfdStd(key); setCfdLoading(true);
    try { const r = await fetch(`/api/cfd?standard=${encodeURIComponent(key)}`); setCfdData(await r.json()); }
    catch {} finally { setCfdLoading(false); }
  }

  const SEC: React.CSSProperties = { padding: '20px 16px', borderBottom: '1px solid #ebebeb' };

  return (
    <div style={{ background: '#fff', color: '#111', minHeight: '100vh' }}>
      <NoticePopup />
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
      {showHelp     && <HelpModal    onClose={() => setShowHelp(false)} />}

      {/* 드롭다운 메뉴 */}
      {menuOpen && (
        <div style={{ position: 'fixed', top: 52, right: 12, background: '#fff', border: '1px solid #ebebeb', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', zIndex: 100, minWidth: 140 }}>
          <button onClick={() => { setShowFeedback(true); setMenuOpen(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', fontSize: 13, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', borderBottom: '1px solid #f0f0f0' }}>의견보내기</button>
          <button onClick={() => { setShowHelp(true); setMenuOpen(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', fontSize: 13, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', borderBottom: '1px solid #f0f0f0' }}>도움말</button>
          <button onClick={() => { logout(); setMenuOpen(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', fontSize: 13, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', color: '#c0392b' }}>로그아웃</button>
        </div>
      )}
      {menuOpen && <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setMenuOpen(false)} />}

      {/* 헤더 */}
      <header style={{ position: 'sticky', top: 0, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(8px)', zIndex: 50, borderBottom: '1px solid #ebebeb' }}>
        <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
          <h1 style={{ fontSize: 15, fontWeight: 400, letterSpacing: '0.1em', color: '#111' }}>GOOCHO MAGAZINE</h1>
          <button onClick={() => setMenuOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            <span style={{ display: 'block', width: 18, height: 1.5, background: '#111' }} />
            <span style={{ display: 'block', width: 18, height: 1.5, background: '#111' }} />
            <span style={{ display: 'block', width: 18, height: 1.5, background: '#111' }} />
          </button>
        </div>
        {/* 탭 네비 */}
        <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', scrollbarWidth: 'none' } as React.CSSProperties}>
          {M_NAV.map(({ id, label, sep }) => {
            const on = active === id;
            return (
              <span key={id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                {sep && <span style={{ width: 1, height: 12, background: '#ddd', margin: '0 2px', flexShrink: 0 }} />}
                <button onClick={() => scrollTo(id)} style={{
                  fontSize: 13, fontWeight: 700, padding: '10px 12px', whiteSpace: 'nowrap',
                  background: 'none', border: 'none', borderBottom: on ? `2px solid ${KEY}` : '2px solid transparent',
                  marginBottom: -1, cursor: 'pointer', color: on ? KEY : '#111', fontFamily: 'inherit',
                }}>
                  {label}
                </button>
              </span>
            );
          })}
          <a href="https://playboard.co/channel/UChuq17DrAiJwkpxNajkEDYw" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 13, fontWeight: 700, padding: '10px 12px', borderBottom: '2px solid transparent', marginBottom: -1, whiteSpace: 'nowrap', color: '#111', textDecoration: 'none', flexShrink: 0 }}>
            플레이보드 바로가기 ↗
          </a>
        </div>
      </header>

      {/* 환율 */}
      <div id="m-fx" style={SEC}>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'rgba(17,17,17,0.28)', marginBottom: 6, textTransform: 'uppercase' }}>EXCHANGE RATE · €1 EUR</p>
        <div style={{ fontSize: 52, fontWeight: 900, letterSpacing: -3, lineHeight: 1, color: '#111' }}>
          ₩{fmtNum(eurKrw, 0)}
        </div>
        <p style={{ fontSize: 11, color: 'rgba(17,17,17,0.35)', marginTop: 6 }}>{lastUpdated ? `${lastUpdated} · open.er-api.com` : 'open.er-api.com'}</p>
        <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
          {CURRENCIES.map(c => (
            <button key={c} onClick={() => saveCurrency(c)} style={{
              fontSize: 12, fontWeight: 700, padding: '7px 12px 7px 0', background: 'none', border: 'none',
              borderBottom: currency === c ? '2px solid #111' : '2px solid transparent',
              color: currency === c ? '#111' : 'rgba(17,17,17,0.32)', cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {CUR_SYM[c]} {CUR_LBL[c]}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
          <div style={{ fontSize: 12, color: 'rgba(17,17,17,0.35)' }}>
            <strong style={{ display: 'block', fontSize: 16, fontWeight: 900, color: '#111', letterSpacing: -0.5, marginBottom: 2 }}>₩{fmtNum(usdKrw, 0)}</strong>
            $1 USD
          </div>
          <div style={{ fontSize: 12, color: 'rgba(17,17,17,0.35)' }}>
            <strong style={{ display: 'block', fontSize: 16, fontWeight: 900, color: '#111', letterSpacing: -0.5, marginBottom: 2 }}>₩{fmtNum(cnyKrw, 2)}</strong>
            ¥1 CNY
          </div>
        </div>
      </div>

      {/* 구스다운 요약 */}
      <div style={{ borderBottom: '1px solid #ebebeb', display: 'flex', gap: 8, padding: '14px 16px' }}>
        <MHeroPanel tag="백거위털" title="화이트 구스" entry={wg90} currency={currency} fx={fx} />
        <MHeroPanel tag="회거위털" title="그레이 구스" entry={gg90} currency={currency} fx={fx} />
      </div>

      {/* CFD 시세 */}
      <div id="m-goose" style={SEC}>
        <MSecHdr tag="CFD · 중국우융공업협회" title="표준 규격" sub="90% 기준" />
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #ebebeb', marginBottom: 16, overflowX: 'auto', scrollbarWidth: 'none' } as React.CSSProperties}>
          {CFD_STANDARDS.map(({ key, label }) => (
            <button key={key} onClick={() => switchStd(key)} disabled={cfdLoading} style={{
              fontSize: 11, fontWeight: 700, padding: '8px 12px', background: 'none', border: 'none',
              borderBottom: cfdStd === key ? '2px solid #111' : '2px solid transparent', marginBottom: -1,
              cursor: 'pointer', whiteSpace: 'nowrap', color: cfdStd === key ? '#111' : 'rgba(17,17,17,0.32)', fontFamily: 'inherit',
            }}>
              {label}
            </button>
          ))}
          {cfdLoading && <span style={{ fontSize: 11, marginLeft: 8, color: 'rgba(17,17,17,0.3)', alignSelf: 'center', flexShrink: 0 }}>로딩 중…</span>}
        </div>
        <p style={{ fontSize: 9, color: 'rgba(17,17,17,0.28)', marginBottom: 10 }}>마지막 업데이트 {cfdData.updatedAt} · 해당 규격 기준 중국산 원자재 가격</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, opacity: cfdLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
          {allCats.map(cat => <MagCard key={cat.name} cat={cat} cur={currency} fx={fx} />)}
        </div>
      </div>

      {/* 인증 현황 */}
      <div id="m-cert" style={SEC}>
        <MSecHdr tag="CERT" title="인증 현황" sub="구스다운 · 덕다운 관련" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {CERTS.map(cert => (
            <a key={cert.id} href={cert.href} target="_blank" rel="noopener noreferrer"
              style={{ position: 'relative', border: '1px solid #ebebeb', textDecoration: 'none', overflow: 'hidden', aspectRatio: '1' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cert.src} alt={cert.name}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { e.currentTarget.style.display = 'none'; }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px' }}>
                <p style={{ fontSize: 11, fontWeight: 900, color: '#fff' }}>{cert.name}</p>
                <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.65)', marginTop: 1, lineHeight: 1.4 }}>{cert.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* 수입통계 */}
      <div id="m-customs" style={SEC}>
        <MSecHdr tag="CUSTOMS · 관세청" title="수입 통계" sub="월별 집계" />
        {!customs && (
          <div style={{ border: '1px solid #ebebeb', padding: '28px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'rgba(17,17,17,0.5)' }}>관세청 API 키가 설정되지 않았습니다</p>
          </div>
        )}
        {customs?.source === 'live' && customs.months.length > 0 && (
          <>
            <MCustomsCharts months={customs.months} cur={currency} fx={fx} />
            <p style={{ fontSize: 9, color: 'rgba(17,17,17,0.35)', marginTop: 10, lineHeight: 1.7 }}>※ HS 0505100000 — 충전용 깃털·솜털 &nbsp; {CUSTOMS_HS_NOTE}</p>
            <p style={{ fontSize: 9, color: 'rgba(17,17,17,0.28)', marginTop: 6 }}>출처: 관세청 수출입통계 (data.go.kr)</p>
          </>
        )}
      </div>

      {/* 국내 뉴스 */}
      <div id="m-news" style={SEC}>
        <MNewsCol title="국내 뉴스" keywords={['거위털', '오리털', '구스이불']} apiPath="/api/news-kr" sourceNote="출처: 네이버 뉴스 검색 API · 국내 언론사 기준" />
      </div>

      {/* 해외 뉴스 */}
      <div style={SEC}>
        <MNewsCol title="해외 뉴스" keywords={['거위털', '오리털', '침구류']} apiPath="/api/news" sourceNote="출처: Google News RSS · 해외 영문 뉴스 기준" />
      </div>

      {/* 쇼핑 트렌드 */}
      <div id="m-shopping" style={SEC}>
        <MSecHdr tag="SHOPPING TREND" title="쇼핑 트렌드" sub="인기 · 판매량순 · 네이버 쇼핑" />
        {SHOPPING_KWS.map(({ query, label }) => (
          <div key={query} style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: '#111' }}>{label}</p>
            <MShoppingCarousel query={query} />
          </div>
        ))}
        <p style={{ fontSize: 9, color: 'rgba(17,17,17,0.28)', marginTop: 8 }}>출처: 네이버 쇼핑 검색 API</p>
      </div>

      {/* 가격 분포 */}
      <div id="m-pricedist" style={SEC}>
        <MSecHdr tag="PRICE DIST" title="가격 분포" sub="상위 100개 · 네이버 쇼핑" />
        <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
          {SHOPPING_KWS.map(({ query, label }) => (
            <button key={query} onClick={() => setPdActive(query)} style={{
              fontSize: 12, fontWeight: 700, padding: '7px 12px 7px 0', background: 'none', border: 'none',
              borderBottom: pdActive === query ? '2px solid #111' : '2px solid transparent',
              color: pdActive === query ? '#111' : 'rgba(17,17,17,0.32)', cursor: 'pointer', fontFamily: 'inherit',
            }}>{label}</button>
          ))}
        </div>
        <MPriceChart query={pdActive} />
      </div>

      {/* 쇼핑인사이트 */}
      <div id="m-insight" style={SEC}>
        <MInsightSection />
      </div>

      {/* 유튜브 */}
      <div id="m-sns" style={SEC}>
        <MSecHdr tag="SNS INSIGHT · YouTube Data API v3" title="유튜브 컨텐츠" sub="구스이불 · 최신 영상" />
        <MYoutubeGrid />
        <p style={{ fontSize: 9, color: 'rgba(17,17,17,0.28)', marginTop: 10 }}>출처: YouTube Data API v3</p>
      </div>

      {/* 네이버 쇼핑라이브 */}
      <div style={SEC}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'rgba(17,17,17,0.28)', marginBottom: 4, textTransform: 'uppercase' }}>NAVER SHOPPING LIVE</p>
            <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5, color: '#111' }}>네이버 쇼핑라이브</h2>
          </div>
          <span style={{ fontSize: 10, color: 'rgba(17,17,17,0.35)' }}>이불 · 최신 라이브</span>
        </div>
        <div style={{ border: '1px solid #ebebeb', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid #ebebeb', background: '#fafafa' }}>
            <button onClick={() => { setNaverSrc(''); setTimeout(() => setNaverSrc('https://shoppinglive.naver.com/search/lives?query=%EC%9D%B4%EB%B6%88&sort=RECENT'), 50); }}
              style={{ fontSize: 13, cursor: 'pointer', background: 'none', border: 'none', color: 'rgba(17,17,17,0.4)', fontFamily: 'inherit' }}>⌂</button>
            <div style={{ flex: 1, fontSize: 10, color: 'rgba(17,17,17,0.35)', background: '#f0f0f0', borderRadius: 2, padding: '4px 8px' }}>
              shoppinglive.naver.com
            </div>
            <a href="https://shoppinglive.naver.com/search/lives?query=%EC%9D%B4%EB%B6%88&sort=RECENT" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 13, color: 'rgba(17,17,17,0.4)', textDecoration: 'none' }}>↗</a>
          </div>
          <div style={{ height: 600 }}>
            {naverSrc && <iframe src={naverSrc} width="100%" height="100%" style={{ border: 'none', display: 'block' }} title="네이버 쇼핑라이브" />}
          </div>
        </div>
      </div>

      {/* 면책 + 푸터 */}
      <div style={{ padding: '16px', borderTop: '1px solid #ebebeb' }}>
        <p style={{ fontSize: 9, color: 'rgba(17,17,17,0.28)', lineHeight: 2 }}>
          · CFD 시세는 중국 내수 도매가 기준입니다. 실제 수입가는 물류비·관세·마진을 포함하여 다를 수 있습니다.<br />
          · 환율은 open.er-api.com 기준이며, 실제 거래 환율과 차이가 있을 수 있습니다.<br />
          · 이 정보는 참고용이며, 투자·구매 결정의 직접 근거로 사용하지 마세요.
        </p>
      </div>
      <footer style={{ borderTop: '1px solid #ebebeb', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 14 }}>
          <a href="https://www.cfd.com.cn" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#111' }}>CFD 원문</a>
          <a href="https://www.data.go.kr/data/15101609/openapi.do" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#111' }}>관세청</a>
          <a href="https://open.er-api.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#111' }}>환율 API</a>
        </div>
        <div style={{ fontSize: 10, color: '#111', lineHeight: 1.7, textAlign: 'right' }}>
          <div>영이만을 위한 공간 © 2026</div>
          <div>Distributed by Kim Minsik</div>
        </div>
      </footer>
    </div>
  );
}
