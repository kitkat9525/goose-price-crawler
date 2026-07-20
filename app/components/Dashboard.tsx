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
import { ClockBar }      from './dashboard/ClockBar';
import { FeedbackModal } from './dashboard/FeedbackModal';
import { HelpModal }     from './dashboard/HelpModal';
import { NoticePopup }   from './dashboard/NoticePopup';

// ── 상수 ──────────────────────────────────────────────────────
const KEY = '#AA8E5C';
const SETTINGS_KEY = 'goose-settings';
const PAGE_SIZE = 10;
const PLAYBOARD_URL = 'https://playboard.co/channel/UChuq17DrAiJwkpxNajkEDYw';

type Currency = 'CNY' | 'USD' | 'KRW' | 'EUR';
const CURRENCIES: Currency[]                  = ['CNY', 'USD', 'KRW', 'EUR'];
const CUR_SYM: Record<Currency, string>       = { CNY: '¥', USD: '$', KRW: '₩', EUR: '€' };
const CUR_LBL: Record<Currency, string>       = { CNY: '위안', USD: '달러', KRW: '원', EUR: '유로' };

const CFD_STANDARDS = [
  { key: '服标', label: '중국의류표준' },
  { key: '寝标', label: '중국침구표준' },
  { key: '国标', label: '중국국가표준' },
  { key: '欧标', label: '유럽표준' },
  { key: '美标', label: '미국표준' },
  { key: '日标', label: '일본표준' },
] as const;

const NAV_ITEMS: { id: string; label: string; sep?: boolean }[] = [
  { id: 'sec-fx',         label: '환율' },
  { id: 'sec-goose',      label: '구스·덕다운' },
  { id: 'sec-cert',       label: '인증현황' },
  { id: 'sec-customs',    label: '수입통계' },
  { id: 'sec-news-kr',    label: '뉴스' },
  { id: 'sec-shopping',   label: '쇼핑트렌드', sep: true },
  { id: 'sec-price-dist', label: '가격분포' },
  { id: 'sec-insight',    label: '쇼핑인사이트' },
  { id: 'sec-sns',        label: 'SNS인사이트' },
];

const CERTS = [
  { id: 'oekotex',  abbr: 'OT',   name: 'OEKO-TEX®',  desc: '유해물질 검출 안전성 인증',  src: '/certs/oeko-tex.webp', href: 'https://www.oeko-tex.com/en/news/' },
  { id: 'rds',      abbr: 'RDS',  name: 'RDS',         desc: '책임있는 다운 표준 인증',    src: '/certs/rds.png',        href: 'https://textileexchange.org/conference-2026/' },
  { id: 'idfl',     abbr: 'IDFL', name: 'IDFL',        desc: '국제 다운·깃털 시험 기관',   src: '/certs/idfl.jpeg',      href: 'https://idfl.com/ko/news/' },
  { id: 'ultra',    abbr: 'UF',   name: 'Ultra-Fresh', desc: '항균·항곰팡이 처리 인증',    src: '/certs/ultra-fresh.png',href: 'https://www.ultra-fresh.com/antimicrobial-blog' },
  { id: 'sgs',      abbr: 'SGS',  name: 'SGS',         desc: '글로벌 검사·시험·인증 기관', src: '/certs/sgs.webp',       href: 'https://www.sgs.com/en/news-and-resources' },
  { id: 'downpass', abbr: 'DP',   name: 'DOWNPASS',    desc: '다운·깃털 추적성·품질 인증', src: '/certs/downpass.png',   href: 'https://www.downpass.com/de/startseite/' },
] as const;

const SHOPPING_KWS = [
  { query: '구스이불', label: '구스이불' },
  { query: '구스베개', label: '구스베개' },
  { query: '구스토퍼', label: '구스토퍼' },
];

const INSIGHT_KWS = ['구스이불', '구스베개', '구스토퍼', '이불', '베개', '토퍼'];
const DEVICE_LBL: Record<string, string> = { pc: 'PC', mo: '모바일' };
const GENDER_LBL: Record<string, string> = { f: '여성', m: '남성' };
const AGE_LBL: Record<string, string>    = { '10':'10대','20':'20대','30':'30대','40':'40대','50':'50대','60':'60대+' };

// ── 유틸 함수 ────────────────────────────────────────────────
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
  try { return new Date(s).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return s; }
}
function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return ''; }
}

// ── HeroPanel ─────────────────────────────────────────────────
function HeroPanel({ tag, title, entry, currency, fx, noBorder }: { tag: string; title: string; entry?: PriceEntry; currency: Currency; fx: FxRates; noBorder?: boolean }) {
  const price = entry ? convert(entry.current, currency, fx) : null;
  const diff  = entry ? convert(Math.abs(entry.diff), currency, fx) : null;
  const down  = entry ? entry.diff <= 0 : true;
  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderBottom: noBorder ? 'none' : '1px solid #ebebeb' }}>
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: 'rgba(17,17,17,0.28)', textTransform: 'uppercase' }}>{tag}</p>
        <p style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1.2, marginTop: 6, color: '#111' }}>{title}</p>
      </div>
      <div>
        {price != null ? (
          <>
            <p style={{ fontSize: 40, fontWeight: 900, letterSpacing: -2, lineHeight: 1, color: '#111' }}>{fmtPrice(price, currency)}</p>
            <p style={{ fontSize: 12, color: 'rgba(17,17,17,0.3)', marginTop: 3 }}>90% 기준 /kg</p>
            {diff != null && <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 2, background: '#f0f0f0', marginTop: 6, color: '#111' }}>{down ? '▼' : '▲'} {fmtPrice(diff, currency)}</span>}
          </>
        ) : <p style={{ fontSize: 12, color: 'rgba(17,17,17,0.25)' }}>데이터 없음</p>}
      </div>
    </div>
  );
}

// ── 공통 섹션 헤더 ────────────────────────────────────────────
function SecHdr({ tag, title, sub, subRed }: { tag: string; title: string; sub?: string; subRed?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'rgba(17,17,17,0.28)', marginBottom: 5, textTransform: 'uppercase' }}>{tag}</p>
        <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.6, color: '#111' }}>{title}</h2>
      </div>
      {sub && <span style={{ fontSize: sub && subRed ? 10 : 11, fontWeight: subRed ? 600 : 400, color: subRed ? '#c0392b' : 'rgba(17,17,17,0.35)' }}>{sub}</span>}
    </div>
  );
}

// ── CFD 매거진 셀 ─────────────────────────────────────────────
function MagCell({ cat, cur, fx, pos }: { cat: CategoryPrices; cur: Currency; fx: FxRates; pos: number }) {
  const isGoose = cat.type === 'goose';
  const isWhite = cat.color === 'white';
  const top90 = cat.prices.find(p => p.grade === '90%');
  const price = top90 ? convert(top90.current, cur, fx) : null;
  const diff  = top90 ? convert(Math.abs(top90.diff), cur, fx) : null;
  const isDown = top90 ? top90.diff <= 0 : true;
  const locName = cat.name?.split(' ').slice(2).join(' ') ?? '';

  return (
    <div style={{
      padding: '28px 32px',
      borderRight:  pos % 2 === 0 ? '1px solid #ebebeb' : 'none',
      borderBottom: pos < 2       ? '1px solid #ebebeb' : 'none',
    }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'rgba(17,17,17,0.28)', marginBottom: 4, textTransform: 'uppercase' }}>
        {cat.nameKr}{locName ? ` · ${locName}` : ''}
      </p>
      <p style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1, lineHeight: 1, marginBottom: 8, color: '#111' }}>
        {isWhite ? '화이트' : '그레이'} {isGoose ? '구스다운' : '덕다운'}
      </p>
      {price != null ? (
        <>
          <p style={{ fontSize: 46, fontWeight: 900, letterSpacing: -2.5, lineHeight: 1, color: '#111' }}>
            {fmtPrice(price, cur)}
            <span style={{ fontSize: 14, color: 'rgba(17,17,17,0.3)', fontWeight: 400, marginLeft: 8, letterSpacing: 0 }}>/kg</span>
          </p>
          {diff != null && (
            <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '3px 10px', background: '#f0f0f0', marginTop: 6 }}>
              {isDown ? '▼' : '▲'} {fmtPrice(diff, cur)} ({top90?.yoy ?? ''})
            </span>
          )}
        </>
      ) : (
        <p style={{ fontSize: 14, color: 'rgba(17,17,17,0.25)' }}>데이터 없음</p>
      )}
      <div style={{ height: 1, background: '#ebebeb', margin: '16px 0' }} />
      <div>
        {cat.prices.map(entry => {
          const p = convert(entry.current, cur, fx);
          const d = convert(Math.abs(entry.diff), cur, fx);
          const is90 = entry.grade === '90%';
          return (
            <div key={entry.grade} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0', borderBottom: '1px solid #f2f2f2', fontSize: 12,
            }}>
              <span style={{ color: is90 ? '#111' : 'rgba(17,17,17,0.4)', fontWeight: 700 }}>{entry.grade}</span>
              <span style={{ fontWeight: 900, fontSize: is90 ? 15 : 12, letterSpacing: is90 ? -0.4 : 0, color: '#111' }}>{fmtPrice(p, cur)}</span>
              <span style={{ fontSize: 11, color: 'rgba(17,17,17,0.35)' }}>{entry.diff <= 0 ? '▼' : '▲'} {fmtPrice(d, cur)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 관세청 차트 ────────────────────────────────────────────────
function CustomsCharts({ months, cur, fx }: { months: CustomsMonthData[]; cur: Currency; fx: FxRates }) {
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
  const tt: React.CSSProperties = {
    background: '#fff', border: '1px solid #111', borderRadius: 0,
    fontSize: 12, padding: '8px 12px', boxShadow: 'none',
  };
  const gradId = 'customs-grad';
  return (
    <div style={{ border: '1px solid #ebebeb', overflow: 'hidden' }}>
      <div style={{ height: 220, padding: '20px 0 0' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 24, left: 16, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#111" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#111" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'rgba(17,17,17,0.35)', fontWeight: 500 }}
              axisLine={{ stroke: '#ebebeb' }} tickLine={false}
              padding={{ left: 12, right: 12 }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'rgba(17,17,17,0.3)' }}
              axisLine={false} tickLine={false}
              tickFormatter={v => `${sym}${cur === 'KRW' ? Math.round(v / 1000) + 'k' : v}`}
              width={44}
            />
            <Tooltip
              contentStyle={tt}
              labelStyle={{ fontWeight: 700, marginBottom: 4, color: '#111' }}
              formatter={(v) => [`${sym}${fmtNum(Number(v), cur === 'KRW' ? 0 : 2)}/kg`, '수입단가']}
              cursor={{ stroke: 'rgba(0,0,0,0.12)', strokeWidth: 1 }}
            />
            <Area
              type="monotone" dataKey="단가"
              stroke="#111" strokeWidth={2}
              fill={`url(#${gradId})`}
              dot={false}
              activeDot={{ r: 4, fill: '#111', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ height: 1, background: '#ebebeb', margin: '0 24px' }} />
      <div style={{ height: 100, padding: '8px 0 0' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 24, left: 16, bottom: 0 }} barCategoryGap="40%">
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'rgba(17,17,17,0.35)', fontWeight: 500 }}
              axisLine={false} tickLine={false}
              padding={{ left: 12, right: 12 }}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={tt}
              labelStyle={{ fontWeight: 700, marginBottom: 4, color: '#111' }}
              formatter={(v) => [`${Number(v)}톤`, '수입량']}
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
            />
            <Bar dataKey="수입량" fill="#e8e8e8" radius={[2, 2, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CustomsTable({ months, fx }: { months: CustomsMonthData[]; fx: FxRates }) {
  const th: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: 'rgba(17,17,17,0.4)', padding: '7px 0 10px', textAlign: 'left' };
  const thR: React.CSSProperties = { ...th, textAlign: 'right' };
  const td: React.CSSProperties  = { padding: '10px 0', color: 'rgba(17,17,17,0.7)', fontSize: 12 };
  const tdR: React.CSSProperties = { ...td, textAlign: 'right' };
  const tdB: React.CSSProperties = { ...tdR, fontWeight: 900, fontSize: 15, color: '#111' };
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ borderBottom: '1.5px solid #111' }}>
          <th style={th}>기간</th><th style={thR}>수입량</th><th style={thR}>수입금액</th>
          <th style={thR}>평균 수입단가</th><th style={thR}>원화 환산</th>
        </tr>
      </thead>
      <tbody>
        {months.map(m => (
          <tr key={m.period} style={{ borderBottom: '1px solid #f2f2f2' }}>
            <td style={{ ...td, fontWeight: 700 }}>{m.periodLabel}</td>
            <td style={tdR}>{m.importVolume >= 1000 ? `${fmtNum(m.importVolume / 1000, 1)}톤` : `${fmtNum(m.importVolume, 0)}kg`}</td>
            <td style={tdR}>${fmtNum(m.importValue, 0)}</td>
            <td style={tdB}>${fmtNum(m.unitPrice, 2)}/kg</td>
            <td style={tdR}>₩{Math.round(m.unitPrice * (fx.KRW / fx.USD)).toLocaleString('ko-KR')}/kg</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── 뉴스 컬럼 ─────────────────────────────────────────────────
function NewsCol({ title, keywords, apiPath, sourceNote, last }: {
  title: string; keywords: string[]; apiPath: string; sourceNote: string; last?: boolean;
}) {
  const [news, setNews]       = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(0);

  useEffect(() => {
    fetch(apiPath)
      .then(r => r.json())
      .then(d => { setNews(d.news ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [apiPath]);

  const totalPages = Math.ceil(news.length / PAGE_SIZE);
  const paged = news.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div style={{ padding: '32px 40px', borderRight: last ? 'none' : '1px solid #ebebeb' }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'rgba(17,17,17,0.28)', marginBottom: 5, textTransform: 'uppercase' }}>NEWS</p>
      <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.6, color: '#111', marginBottom: 18 }}>{title}</h2>
      <div style={{ display: 'none' }}>
        {keywords.map((k) => (
          <button key={k}
            style={{}}>
            {k}
          </button>
        ))}
      </div>
      <div>
        {loading && <p style={{ fontSize: 12, color: 'rgba(17,17,17,0.3)', padding: '24px 0', textAlign: 'center' }}>불러오는 중...</p>}
        {!loading && paged.map((item, i) => (
          <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid #f2f2f2' }}>
            <a href={item.link} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.55, color: '#111', display: 'block', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.45')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
              {item.title}
            </a>
            <p style={{ fontSize: 10, color: 'rgba(17,17,17,0.28)', marginTop: 3 }}>
              {item.source}{item.source && item.pubDate ? ' · ' : ''}{item.pubDate ? fmtPubDate(item.pubDate) : ''}
            </p>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
          <span style={{ fontSize: 12, color: 'rgba(17,17,17,0.4)' }}>{page + 1} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            style={{ fontSize: 12, fontWeight: 700, padding: '5px 14px', border: '1px solid #ddd', borderRadius: 2, background: '#fff', cursor: 'pointer', fontFamily: 'inherit', opacity: page === totalPages - 1 ? 0.3 : 1 }}>
            다음 →
          </button>
        </div>
      )}
      <p style={{ fontSize: 10, color: 'rgba(17,17,17,0.28)', marginTop: 12, lineHeight: 1.7 }}>{sourceNote}</p>
    </div>
  );
}

// ── 쇼핑 캐러셀 ───────────────────────────────────────────────
interface ShoppingItem { title: string; link: string; image: string; lprice: number; mallName: string; }
const SHIMMER: React.CSSProperties = { background: 'linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' };
const SHIMMER_KF = `@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`;

function SkelCard() {
  return (
    <div style={{ flexShrink: 0, width: 172 }}>
      <style>{SHIMMER_KF}</style>
      <div style={{ width: 172, height: 172, ...SHIMMER, marginBottom: 10 }} />
      <div style={{ height: 10, width: '70%', ...SHIMMER, marginBottom: 6 }} />
      <div style={{ height: 10, width: '90%', ...SHIMMER, marginBottom: 6 }} />
      <div style={{ height: 14, width: '50%', ...SHIMMER }} />
    </div>
  );
}

function ShoppingCarousel({ query }: { query: string }) {
  const [items, setItems]         = useState<ShoppingItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loadMore, setLoadMore]   = useState(false);
  const [noKey, setNoKey]         = useState(false);
  const [hasMore, setHasMore]     = useState(true);
  const [canL, setCanL]           = useState(false);
  const [canR, setCanR]           = useState(true);
  const startRef                  = useRef(1);
  const scrollRef                 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startRef.current = 1;
    void (async () => {
      setLoading(true);
      setHasMore(true);
      try {
        const r = await fetch(`/api/shopping?query=${encodeURIComponent(query)}&start=1`);
        const d = await r.json();
        if (d.error === 'naver_key_missing') { setNoKey(true); }
        else {
          const it: ShoppingItem[] = d.items ?? [];
          setItems(it);
          if (it.length < 20) setHasMore(false); else startRef.current = 21;
        }
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
    setCanL(el.scrollLeft > 8);
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
    setCanR(!atEnd);
    if (atEnd) fetchMore();
  }, [fetchMore]);

  useEffect(() => {
    const el = scrollRef.current; if (!el) return;
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [onScroll, items]);

  const scroll = (d: 'l' | 'r') => scrollRef.current?.scrollBy({ left: d === 'r' ? 186 : -186, behavior: 'smooth' });

  if (loading) return <div style={{ display: 'flex', gap: 14, overflow: 'hidden' }}>{[...Array(5)].map((_, i) => <SkelCard key={i} />)}</div>;
  if (noKey)   return <p style={{ fontSize: 11, color: 'rgba(17,17,17,0.3)', padding: '16px 0' }}>네이버 API 키가 설정되지 않았습니다.</p>;
  if (!items.length) return <p style={{ fontSize: 11, color: 'rgba(17,17,17,0.3)', padding: '16px 0' }}>상품을 가져오지 못했습니다.</p>;

  const btnStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 11, fontWeight: 700, padding: '4px 10px 4px 0', background: 'none', border: 'none',
    color: active ? 'rgba(17,17,17,0.35)' : 'rgba(17,17,17,0.15)', cursor: active ? 'pointer' : 'default', letterSpacing: 0.3, fontFamily: 'inherit',
  });

  return (
    <>
      <div ref={scrollRef} style={{ display: 'flex', gap: 14, overflowX: 'auto', scrollbarWidth: 'none' } as React.CSSProperties}>
        {items.map((item, i) => (
          <a key={`${item.link}-${i}`} href={item.link} target="_blank" rel="noopener noreferrer"
            style={{ flexShrink: 0, width: 172, textDecoration: 'none', color: 'inherit' }}>
            <div style={{ width: 172, height: 172, background: '#f2f2f2', overflow: 'hidden', marginBottom: 10 }}>
              {item.image
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={item.image} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'rgba(17,17,17,0.25)' }}>이미지 없음</div>
              }
            </div>
            <p style={{ fontSize: 10, color: 'rgba(17,17,17,0.4)', marginBottom: 3 }}>{item.mallName}</p>
            <p style={{ fontSize: 12, fontWeight: 400, lineHeight: 1.45, color: '#111', marginBottom: 5,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
              {item.title}
            </p>
            <p style={{ fontSize: 15, fontWeight: 900, color: '#111' }}>{item.lprice > 0 ? `₩${item.lprice.toLocaleString('ko-KR')}` : '가격 미정'}</p>
          </a>
        ))}
        {loadMore && [...Array(3)].map((_, i) => <SkelCard key={`s-${i}`} />)}
      </div>
      <div style={{ display: 'flex', gap: 0, marginTop: 14, borderTop: '1px solid #ebebeb', paddingTop: 10 }}>
        <button onClick={() => scroll('l')} style={btnStyle(canL)}
          onMouseEnter={e => { if (canL) (e.currentTarget as HTMLElement).style.color = '#111'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = canL ? 'rgba(17,17,17,0.35)' : 'rgba(17,17,17,0.15)'; }}>← 이전</button>
        <button onClick={() => scroll('r')} style={btnStyle(canR)}
          onMouseEnter={e => { if (canR) (e.currentTarget as HTMLElement).style.color = '#111'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = canR ? 'rgba(17,17,17,0.35)' : 'rgba(17,17,17,0.15)'; }}>다음 →</button>
      </div>
    </>
  );
}

// ── 가격분포 차트 ─────────────────────────────────────────────
function PriceChart({ query }: { query: string }) {
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
          const bucket = prices.filter(p => i === 9 ? p >= lo : p >= lo && p < hi);
          return { priceLabel: `₩${Math.round(lo / 10000)}만`, count: bucket.length };
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

  if (loading) return <div style={{ height: 90, background: '#fafafa', border: '1px solid #ebebeb', ...SHIMMER }} />;
  if (!chartData.length) return null;
  return (
    <>
      <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
        {tiers.map(t => (
          <div key={t.label} style={{ fontSize: 11, color: 'rgba(17,17,17,0.35)' }}>
            {t.label} <strong style={{ color: '#111', fontWeight: 700, fontSize: 13 }}>₩{t.avg.toLocaleString('ko-KR')}</strong>
          </div>
        ))}
      </div>
      <div style={{ border: '1px solid #ebebeb', height: 160, overflow: 'hidden' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="pd-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#111" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#111" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="priceLabel" tick={{ fontSize: 10, fill: 'rgba(17,17,17,0.35)', fontWeight: 500 }} tickLine={false} axisLine={{ stroke: '#ebebeb' }} />
            <YAxis hide />
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid #111', borderRadius: 0, fontSize: 12, padding: '8px 12px', boxShadow: 'none' }}
              labelStyle={{ fontWeight: 700, marginBottom: 4 }}
              formatter={(v) => [`${v}개`, '상품 수']}
              cursor={{ stroke: 'rgba(0,0,0,0.12)', strokeWidth: 1 }}
            />
            <Area type="monotone" dataKey="count" stroke="#111" strokeWidth={2} fill="url(#pd-grad)" dot={false} activeDot={{ r: 4, fill: '#111', strokeWidth: 0 }} />
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

function BarRow({ label, ratio, light }: { label: string; ratio: number; light?: boolean }) {
  const inside = ratio >= 12;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ fontSize: 12, color: 'rgba(17,17,17,0.5)', width: 42, textAlign: 'right', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 20, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${ratio}%`, height: '100%', background: light ? '#d0d0d0' : '#111', borderRadius: 4, display: 'flex', alignItems: 'center', paddingLeft: inside ? 8 : 0 }}>
          {inside && <span style={{ fontSize: 10, fontWeight: 700, color: light ? '#111' : '#fff' }}>{ratio}%</span>}
        </div>
      </div>
      {!inside && <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(17,17,17,0.5)' }}>{ratio}%</span>}
    </div>
  );
}

function InsightSection() {
  const [data, setData]   = useState<{ source: string; trends: { title: string; data: { period: string; ratio: number }[] }[]; device?: Record<string, InsightBreakdown[]>; gender?: Record<string, InsightBreakdown[]>; age?: Record<string, InsightBreakdown[]>; error?: string } | null>(null);
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
  const bdTitle = { fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: 'rgba(17,17,17,0.3)', marginBottom: 12, textTransform: 'uppercase' } as React.CSSProperties;

  return (
    <div id="sec-insight">
      <SecHdr tag="SHOPPING INSIGHT" title="쇼핑 인사이트" sub="네이버 쇼핑인사이트 · 클릭 지수 기준" />
      {loading && <p style={{ fontSize: 12, color: 'rgba(17,17,17,0.3)', padding: '48px 0', textAlign: 'center' }}>불러오는 중...</p>}
      {!loading && (!data || data.source === 'unavailable') && (
        <div style={{ border: '1px solid #ebebeb', padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'rgba(17,17,17,0.4)' }}>{data?.error === 'naver_key_missing' ? '네이버 API 키가 설정되지 않았습니다' : '데이터를 불러오지 못했습니다'}</p>
        </div>
      )}
      {!loading && data?.source === 'live' && (
        <>
          <div style={{ display: 'flex', gap: 6, margin: '12px 0 18px' }}>
            {INSIGHT_KWS.map(k => (
              <button key={k} onClick={() => setActive(k)}
                style={{ fontSize: 11, fontWeight: 700, padding: '5px 10px 5px 0', background: 'none', border: 'none',
                  borderBottom: active === k ? '2px solid #111' : '2px solid transparent',
                  color: active === k ? '#111' : 'rgba(17,17,17,0.32)', cursor: 'pointer', fontFamily: 'inherit' }}>
                {k}
              </button>
            ))}
          </div>
          <div style={{ border: '1px solid #ebebeb', height: 240, marginBottom: 20, overflow: 'hidden' }}>
            {chartData.length === 0
              ? <p style={{ fontSize: 12, color: 'rgba(17,17,17,0.3)', textAlign: 'center', paddingTop: 80 }}>데이터 없음</p>
              : <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 20, right: 24, left: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="insight-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#111" stopOpacity={0.1} />
                        <stop offset="100%" stopColor="#111" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgba(17,17,17,0.35)', fontWeight: 500 }} axisLine={{ stroke: '#ebebeb' }} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'rgba(17,17,17,0.3)' }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip
                      contentStyle={{ background: '#fff', border: '1px solid #111', borderRadius: 0, fontSize: 12, padding: '8px 12px', boxShadow: 'none' }}
                      labelStyle={{ fontWeight: 700, marginBottom: 4 }}
                      labelFormatter={(_, p) => p?.[0]?.payload?.fullLabel ?? ''}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: any) => [v, '클릭 지수']}
                      cursor={{ stroke: 'rgba(0,0,0,0.12)', strokeWidth: 1 }}
                    />
                    <Area type="monotone" dataKey="ratio" stroke="#111" strokeWidth={2} fill="url(#insight-grad)" dot={false} activeDot={{ r: 4, fill: '#111', strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
            }
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <div style={bdTitle}>기기별</div>
              {deviceData.map((d, i) => <BarRow key={d.group} label={DEVICE_LBL[d.group] ?? d.group} ratio={d.ratio} light={i > 0} />)}
              <div style={{ marginTop: 14 }}>
                <div style={bdTitle}>성별</div>
                {genderData.map((d, i) => <BarRow key={d.group} label={GENDER_LBL[d.group] ?? d.group} ratio={d.ratio} light={i > 0} />)}
              </div>
            </div>
            <div>
              <div style={bdTitle}>연령별</div>
              {ageData.map(d => <BarRow key={d.group} label={AGE_LBL[d.group] ?? d.group} ratio={d.ratio} light={d.ratio < maxAge} />)}
            </div>
          </div>
          <p style={{ fontSize: 10, color: 'rgba(17,17,17,0.28)', marginTop: 14, lineHeight: 1.7 }}>출처: 네이버 쇼핑인사이트 · 기간 내 최대값=100 기준 상대값 · 실제 판매량과 다를 수 있음</p>
        </>
      )}
    </div>
  );
}

// ── 유튜브 그리드 ─────────────────────────────────────────────
interface YtItem { videoId: string; title: string; channel: string; publishedAt: string; thumbnail: string; }

function YoutubeGrid() {
  const [items, setItems]     = useState<YtItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadMore, setLoadMore] = useState(false);
  const [error, setError]     = useState(false);
  const tokenRef              = useRef<string | null>(null);
  const sentRef               = useRef<HTMLDivElement>(null);

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
    obs.observe(el);
    return () => obs.disconnect();
  }, [fetchMore]);

  const skelGrid = (n: number) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i}>
          <div style={{ width: '100%', aspectRatio: '16/9', background: '#f2f2f2', marginBottom: 10 }} />
          <div style={{ height: 10, background: '#f0f0f0', marginBottom: 6 }} />
          <div style={{ height: 10, background: '#f0f0f0', width: '75%' }} />
        </div>
      ))}
    </div>
  );

  if (loading) return skelGrid(8);
  if (error || !items.length) return <p style={{ fontSize: 12, color: 'rgba(17,17,17,0.3)', padding: '16px 0' }}>영상을 불러오지 못했습니다.</p>;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        {items.map(item => (
          <a key={item.videoId} href={`https://www.youtube.com/watch?v=${item.videoId}`} target="_blank" rel="noopener noreferrer"
            style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
            <div style={{ width: '100%', aspectRatio: '16/9', background: '#f2f2f2', overflow: 'hidden', marginBottom: 10 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.thumbnail} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
            <p style={{ fontSize: 10, color: 'rgba(17,17,17,0.4)', marginBottom: 3 }}>{item.channel}</p>
            <p style={{ fontSize: 12, fontWeight: 400, lineHeight: 1.5, color: '#111' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.5')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
              {item.title}
            </p>
            <p style={{ fontSize: 10, color: 'rgba(17,17,17,0.3)', marginTop: 4 }}>{fmtDate(item.publishedAt)}</p>
          </a>
        ))}
        {loadMore && Array.from({ length: 4 }).map((_, i) => (
          <div key={`s-${i}`}>
            <div style={{ width: '100%', aspectRatio: '16/9', background: '#f2f2f2', marginBottom: 10 }} />
            <div style={{ height: 10, background: '#f0f0f0', marginBottom: 6 }} />
            <div style={{ height: 10, background: '#f0f0f0', width: '75%' }} />
          </div>
        ))}
      </div>
      {hasMore && <div ref={sentRef} style={{ height: 16 }} />}
    </>
  );
}

// ── 메인 대시보드 ──────────────────────────────────────────────
export default function Dashboard({ data }: { data: AggregatedData }) {
  const router = useRouter();

  const [currency, setCurrency] = useState<Currency>(() => {
    try { return (JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}').currency as Currency) ?? 'KRW'; }
    catch { return 'KRW'; }
  });
  const [showFeedback, setShowFeedback] = useState(false);
  const [showHelp, setShowHelp]         = useState(false);
  const [active, setActive]             = useState('sec-fx');
  const [cfdStd, setCfdStd]             = useState('服标');
  const [cfdData, setCfdData]           = useState(data.cfd);
  const [cfdLoading, setCfdLoading]     = useState(false);
  const [pdActive, setPdActive]         = useState(SHOPPING_KWS[0].query);
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
    NAV_ITEMS.forEach(({ id }) => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  function scrollTo(id: string) {
    const el = document.getElementById(id); if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 130, behavior: 'smooth' });
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

  const UBTN: React.CSSProperties = { fontSize: 11, fontWeight: 500, padding: '5px 6px', borderRadius: 99, border: 'none', background: 'none', color: 'rgba(17,17,17,0.38)', cursor: 'pointer', fontFamily: 'inherit' };
  const SEC: React.CSSProperties = { padding: '32px 40px', borderBottom: '1px solid #ebebeb' };

  return (
    <div style={{ minWidth: 1024, background: '#fff', color: '#111' }}>
      <NoticePopup />
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
      {showHelp     && <HelpModal    onClose={() => setShowHelp(false)} />}

      <header style={{ position: 'sticky', top: 0, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(8px)', zIndex: 10, borderBottom: '1px solid #ebebeb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 32px' }}>
          <h1 style={{ fontSize: 17, fontWeight: 400, letterSpacing: '0.1em', color: '#111' }}>GOOCHO MAGAZINE</h1>
          <div style={{ display: 'flex', gap: 2 }}>
            <button onClick={() => setShowFeedback(true)} style={UBTN}>의견보내기</button>
            <button onClick={() => setShowHelp(true)}     style={UBTN}>도움말</button>
            <button onClick={logout}                      style={UBTN}>로그아웃</button>
          </div>
        </div>

        <div style={{ padding: '14px 32px 2px', fontSize: 38, fontWeight: 900, letterSpacing: -1.5, lineHeight: 1.1, color: '#111' }}>
          구스이불의 모든 것, 취향껏 선택하다
        </div>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 32px', overflowX: 'auto', scrollbarWidth: 'none' } as React.CSSProperties}>
          {NAV_ITEMS.map(({ id, label, sep }) => {
            const on = active === id;
            return (
              <span key={id} style={{ display: 'flex', alignItems: 'center' }}>
                {sep && <span style={{ width: 1, height: 12, background: '#ddd', margin: '0 4px', flexShrink: 0 }} />}
                <button onClick={() => scrollTo(id)} style={{
                  fontSize: 13, fontWeight: 700, padding: '11px 14px',
                  background: 'none', border: 'none',
                  borderBottom: on ? `2px solid ${KEY}` : '2px solid transparent',
                  marginBottom: -1, cursor: 'pointer', whiteSpace: 'nowrap',
                  color: on ? KEY : '#111', fontFamily: 'inherit',
                }}>
                  {label}
                </button>
              </span>
            );
          })}
          <a href={PLAYBOARD_URL} target="_blank" rel="noopener noreferrer" style={{
            fontSize: 13, fontWeight: 700, padding: '11px 14px',
            borderBottom: '2px solid transparent', marginBottom: -1,
            whiteSpace: 'nowrap', color: '#111', textDecoration: 'none',
          }}>
            플레이보드 바로가기 ↗
          </a>
        </div>
      </header>

      <div id="sec-fx" style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', borderBottom: '1px solid #ebebeb', minHeight: 360 }}>
        <div style={{ borderRight: '1px solid #ebebeb', padding: '32px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'rgba(17,17,17,0.28)', marginBottom: 10, textTransform: 'uppercase' }}>EXCHANGE RATE · €1 EUR</p>
            <div style={{ fontSize: 72, fontWeight: 900, letterSpacing: -4, lineHeight: 1, color: '#111' }}>
              ₩{fmtNum(eurKrw, 0)}
            </div>
            <p style={{ fontSize: 12, color: 'rgba(17,17,17,0.35)', marginTop: 8 }}>{lastUpdated ? `${lastUpdated} · open.er-api.com` : 'open.er-api.com'}</p>
            <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
              {CURRENCIES.map(c => (
                <button key={c} onClick={() => saveCurrency(c)} style={{
                  fontSize: 12, fontWeight: 700, padding: '6px 12px 6px 0', background: 'none', border: 'none',
                  borderBottom: currency === c ? '2px solid #111' : '2px solid transparent',
                  color: currency === c ? '#111' : 'rgba(17,17,17,0.32)', cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  {CUR_SYM[c]} {CUR_LBL[c]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'rgba(17,17,17,0.28)', marginBottom: 10, textTransform: 'uppercase' }}>참고</p>
            <div style={{ display: 'flex', gap: 28 }}>
              <div style={{ fontSize: 12, color: 'rgba(17,17,17,0.35)' }}>
                <strong style={{ display: 'block', fontSize: 18, fontWeight: 900, color: '#111', letterSpacing: -0.5, marginBottom: 2 }}>₩{fmtNum(usdKrw, 0)}</strong>
                $1 USD
              </div>
              <div style={{ fontSize: 12, color: 'rgba(17,17,17,0.35)' }}>
                <strong style={{ display: 'block', fontSize: 18, fontWeight: 900, color: '#111', letterSpacing: -0.5, marginBottom: 2 }}>₩{fmtNum(cnyKrw, 2)}</strong>
                ¥1 CNY
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr' }}>
          <HeroPanel tag="백거위털 · 중국의류표준" title="화이트 구스다운" entry={wg90} currency={currency} fx={fx} />
          <HeroPanel tag="회거위털 · 중국의류표준" title="그레이 구스다운" entry={gg90} currency={currency} fx={fx} noBorder />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', borderBottom: '1px solid #ebebeb' }}>
        <ClockBar />
      </div>

      <div id="sec-goose" style={SEC}>
        <SecHdr tag="CFD · 중국우융공업협회" title="표준 규격" sub="해당 규격에 맞춘 중국산 원자재의 가격입니다." subRed />
        <div style={{ display: 'flex', borderBottom: '1px solid #ebebeb', margin: '16px 0 24px', overflowX: 'auto', scrollbarWidth: 'none' } as React.CSSProperties}>
          {CFD_STANDARDS.map(({ key, label }) => (
            <button key={key} onClick={() => switchStd(key)} disabled={cfdLoading} style={{
              fontSize: 12, fontWeight: 700, padding: '8px 14px', background: 'none', border: 'none',
              borderBottom: cfdStd === key ? '2px solid #111' : '2px solid transparent', marginBottom: -1,
              cursor: 'pointer', whiteSpace: 'nowrap', color: cfdStd === key ? '#111' : 'rgba(17,17,17,0.32)', fontFamily: 'inherit',
            }}>
              {label}
            </button>
          ))}
          {cfdLoading && <span style={{ fontSize: 12, marginLeft: 12, color: 'rgba(17,17,17,0.3)', alignSelf: 'center', flexShrink: 0 }}>로딩 중…</span>}
        </div>
        <p style={{ fontSize: 9, color: 'rgba(17,17,17,0.28)', marginBottom: 12 }}>마지막 업데이트 {cfdData.updatedAt} · 90% 기준</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #ebebeb', overflow: 'hidden', opacity: cfdLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
          {allCats.map((cat, i) => <MagCell key={cat.name} cat={cat} cur={currency} fx={fx} pos={i} />)}
        </div>
      </div>

      <div id="sec-cert" style={SEC}>
        <SecHdr tag="CERT" title="인증 현황" sub="구스다운 · 덕다운 관련 주요 국제 인증" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12 }}>
          {CERTS.map(cert => (
            <a key={cert.id} href={cert.href} target="_blank" rel="noopener noreferrer"
              style={{
                position: 'relative', display: 'flex', flexDirection: 'column',
                border: '1px solid #ebebeb', textDecoration: 'none', cursor: 'pointer',
                overflow: 'hidden', minHeight: 160,
              }}
              onMouseEnter={e => {
                const img = e.currentTarget.querySelector('img') as HTMLImageElement | null;
                if (img) img.style.transform = 'scale(1.07)';
              }}
              onMouseLeave={e => {
                const img = e.currentTarget.querySelector('img') as HTMLImageElement | null;
                if (img) img.style.transform = 'scale(1)';
              }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cert.src} alt={cert.name}
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  objectFit: 'cover', transition: 'transform 0.4s ease',
                }}
                onError={e => { e.currentTarget.style.display = 'none'; }} />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)',
              }} />
              <div style={{ position: 'relative', marginTop: 'auto', padding: '14px 14px 16px' }}>
                <p style={{ fontSize: 13, fontWeight: 900, color: '#fff', letterSpacing: -0.2 }}>{cert.name}</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 3, lineHeight: 1.5 }}>{cert.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      <div id="sec-customs" style={SEC}>
        <SecHdr tag="CUSTOMS · 관세청" title="한국 수입 통계" sub="월별 집계 · 매월 15일경 업데이트" />
        {!customs && (
          <div style={{ border: '1px solid rgba(0,0,0,0.06)', padding: '40px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'rgba(17,17,17,0.5)' }}>관세청 API 키가 설정되지 않았습니다</p>
            <a href="https://www.data.go.kr/data/15101609/openapi.do" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 8, fontSize: 12, color: '#111', textDecoration: 'underline' }}>API 키 발급 →</a>
          </div>
        )}
        {customs?.source === 'unavailable' && <p style={{ fontSize: 14, color: 'rgba(17,17,17,0.4)' }}>데이터를 불러오지 못했습니다</p>}
        {customs?.source === 'live' && customs.months.length > 0 && (
          <>
            <CustomsCharts months={customs.months} cur={currency} fx={fx} />
            <div style={{ margin: '16px 0 10px', fontSize: 10, color: 'rgba(17,17,17,0.35)' }}>※ HS 0505100000 — 충전용 깃털·솜털 &nbsp; {CUSTOMS_HS_NOTE}</div>
            <CustomsTable months={customs.months} fx={fx} />
            <p style={{ fontSize: 10, color: 'rgba(17,17,17,0.28)', marginTop: 12 }}>출처: 관세청 수출입통계 (data.go.kr)</p>
          </>
        )}
      </div>

      <div id="sec-news-kr" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #ebebeb' }}>
        <NewsCol title="국내 뉴스" keywords={['거위털', '오리털', '구스이불']} apiPath="/api/news-kr" sourceNote="출처: 네이버 뉴스 검색 API · 국내 언론사 기준" />
        <NewsCol title="해외 뉴스" keywords={['거위털', '오리털', '침구류']}  apiPath="/api/news"    sourceNote="출처: Google News RSS · 해외 영문 뉴스 기준" last />
      </div>

      <div id="sec-shopping" style={SEC}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'rgba(17,17,17,0.28)', marginBottom: 5, textTransform: 'uppercase' }}>SHOPPING TREND</p>
            <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.6, color: '#111' }}>쇼핑 트렌드</h2>
          </div>
          <span style={{ fontSize: 11, color: 'rgba(17,17,17,0.35)' }}>인기 · 판매량순 · 네이버 쇼핑 기준</span>
        </div>
        {SHOPPING_KWS.map(({ query, label }) => (
          <div key={query} style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: '#111' }}>{label}</p>
            <ShoppingCarousel query={query} />
          </div>
        ))}
        <p style={{ fontSize: 10, color: 'rgba(17,17,17,0.28)', marginTop: 14, lineHeight: 1.7 }}>출처: 네이버 쇼핑 검색 API</p>

        <div id="sec-price-dist" style={{ borderTop: '1px solid #ebebeb', marginTop: 20, paddingTop: 20 }}>
          <SecHdr tag="PRICE DIST" title="가격 분포" sub="상위 100개 기준 · 네이버 쇼핑" />
          <div style={{ display: 'flex', gap: 6, margin: '16px 0' }}>
            {SHOPPING_KWS.map(({ query, label }) => (
              <button key={query} onClick={() => setPdActive(query)} style={{
                fontSize: 12, fontWeight: 700, padding: '6px 12px 6px 0', background: 'none', border: 'none',
                borderBottom: pdActive === query ? '2px solid #111' : '2px solid transparent',
                color: pdActive === query ? '#111' : 'rgba(17,17,17,0.32)', cursor: 'pointer', fontFamily: 'inherit',
              }}>{label}</button>
            ))}
          </div>
          <PriceChart query={pdActive} />
        </div>
      </div>

      <div style={SEC}>
        <InsightSection />
      </div>

      <div id="sec-sns" style={SEC}>
        <SecHdr tag="SNS INSIGHT · YouTube Data API v3" title="유튜브 컨텐츠" sub="구스이불 · 유튜브 최신 영상" />
        <YoutubeGrid />
        <p style={{ fontSize: 10, color: 'rgba(17,17,17,0.28)', marginTop: 14 }}>출처: YouTube Data API v3</p>

        <div style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'rgba(17,17,17,0.28)', marginBottom: 5, textTransform: 'uppercase' }}>NAVER SHOPPING LIVE</p>
              <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.6, color: '#111' }}>네이버 쇼핑라이브</h2>
            </div>
            <span style={{ fontSize: 11, color: 'rgba(17,17,17,0.35)' }}>이불 · 최신 라이브 검색</span>
          </div>
          <div style={{ border: '1px solid #ebebeb', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid #ebebeb', background: '#fafafa' }}>
              <button onClick={() => { setNaverSrc(''); setTimeout(() => setNaverSrc('https://shoppinglive.naver.com/search/lives?query=%EC%9D%B4%EB%B6%88&sort=RECENT'), 50); }}
                style={{ fontSize: 13, cursor: 'pointer', background: 'none', border: 'none', color: 'rgba(17,17,17,0.4)', fontFamily: 'inherit' }}>⌂</button>
              <div style={{ flex: 1, fontSize: 11, color: 'rgba(17,17,17,0.35)', background: '#f0f0f0', borderRadius: 2, padding: '4px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                shoppinglive.naver.com
              </div>
              <a href="https://shoppinglive.naver.com/search/lives?query=%EC%9D%B4%EB%B6%88&sort=RECENT" target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 13, color: 'rgba(17,17,17,0.4)', textDecoration: 'none' }}>↗</a>
            </div>
            <div style={{ height: 800 }}>
              {naverSrc && <iframe src={naverSrc} width="100%" height="100%" style={{ border: 'none', display: 'block' }} title="네이버 쇼핑라이브" />}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 40px', borderTop: '1px solid #ebebeb' }}>
        <div style={{ fontSize: 10, color: '#111', lineHeight: 2 }}>
          <div>· CFD 시세는 중국 내수 도매가 기준입니다. 실제 수입가는 물류비·관세·마진을 포함하여 다를 수 있습니다.</div>
          <div>· 환율은 open.er-api.com 기준이며, 실제 거래 환율과 차이가 있을 수 있습니다.</div>
          <div>· 이 정보는 참고용이며, 투자·구매 결정의 직접 근거로 사용하지 마세요.</div>
        </div>
      </div>

      <footer style={{ borderTop: '1px solid #ebebeb', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 20 }}>
          <a href="https://www.cfd.com.cn" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#111' }}>CFD 원문</a>
          <a href="https://www.data.go.kr/data/15101609/openapi.do" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#111' }}>관세청 공공데이터</a>
          <a href="https://open.er-api.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#111' }}>환율 API</a>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11, color: '#111', lineHeight: 1.7 }}>
          <div>영이만을 위한 공간 © 2026</div>
          <div>Distributed by Kim Minsik · io.dlwlrma@gmail.com</div>
        </div>
      </footer>
    </div>
  );
}
