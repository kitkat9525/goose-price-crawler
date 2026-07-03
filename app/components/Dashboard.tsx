'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { AggregatedData, CategoryPrices, PriceEntry, CustomsMonthData, FxRates } from '@/app/lib/aggregate';
import { CUSTOMS_HS_NOTE } from '@/app/lib/sources/customs';

// ──────────────────────────────────────────────
// 상수
// ──────────────────────────────────────────────
const KEY        = '#AA8E5C';
const KEY_BG     = 'rgba(170,142,92,0.08)';
const KEY_BORDER = 'rgba(170,142,92,0.3)';
const SETTINGS_KEY = 'goose-settings';
const PAGE_SIZE    = 10;

// ──────────────────────────────────────────────
// 통화
// ──────────────────────────────────────────────
type Currency = 'CNY' | 'USD' | 'KRW' | 'EUR';

const CURRENCY_LABELS: Record<Currency, string> = { CNY: '위안', USD: '달러', KRW: '원', EUR: '유로' };
const CURRENCY_SYMBOLS: Record<Currency, string> = { CNY: '¥', USD: '$', KRW: '₩', EUR: '€' };

function convert(cny: number, currency: Currency, fx: FxRates): number {
  if (currency === 'USD') return cny * fx.USD;
  if (currency === 'KRW') return cny * fx.KRW;
  if (currency === 'EUR') return cny * fx.EUR;
  return cny;
}

function fmtPrice(amount: number, currency: Currency): string {
  const sym = CURRENCY_SYMBOLS[currency];
  if (currency === 'KRW') return `${sym}${Math.round(amount).toLocaleString('ko-KR')}`;
  return `${sym}${amount.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtNum(n: number, decimals = 2): string {
  return n.toLocaleString('ko-KR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// ──────────────────────────────────────────────
// 날짜 포맷 (UTC ISO → KST 문자열)
// ──────────────────────────────────────────────
function fmtKst(iso: string, showTime = true): string {
  if (!iso) return '';
  try {
    const normalized = iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z';
    const opts: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Seoul',
      year: 'numeric', month: '2-digit', day: '2-digit',
      ...(showTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    };
    return new Date(normalized).toLocaleString('ko-KR', opts) + (showTime ? ' KST' : '');
  } catch { return ''; }
}

function fmtPubDate(s: string): string {
  if (!s) return '';
  try {
    return new Date(s).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return s; }
}

// ──────────────────────────────────────────────
// 의견 모달
// ──────────────────────────────────────────────
interface Feedback { id: number; content: string; createdAt: string; }

function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'write' | 'list'>('write');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  async function loadFeedbacks() {
    setLoadingList(true);
    try {
      const res = await fetch('/api/feedback');
      const json = await res.json();
      setFeedbacks(json.feedbacks ?? []);
    } catch {}
    setLoadingList(false);
  }

  useEffect(() => {
    if (tab === 'list') loadFeedbacks();
  }, [tab]);

  async function handleSend() {
    if (!content.trim()) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) { setStatus('done'); setContent(''); }
      else setStatus('error');
    } catch { setStatus('error'); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/6">
          <div className="flex gap-1">
            {(['write', 'list'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
                style={tab === t ? { backgroundColor: KEY, color: 'white' } : { color: 'rgba(0,0,0,0.4)' }}
              >
                {t === 'write' ? '의견 보내기' : '의견 목록'}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="text-black/30 hover:text-black transition-colors p-1">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* 작성 탭 */}
        {tab === 'write' && (
          <div className="px-5 py-5 space-y-4">
            {status === 'done' ? (
              <div className="text-center py-6">
                <p className="text-2xl mb-2">✓</p>
                <p className="text-sm font-semibold text-black">의견이 저장되었습니다</p>
                <button onClick={() => setStatus('idle')} className="mt-4 text-xs text-black/40 underline underline-offset-2">
                  다른 의견 보내기
                </button>
              </div>
            ) : (
              <>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="불편한 점, 개선 아이디어, 데이터 오류 등 자유롭게 남겨주세요."
                  rows={5}
                  className="w-full text-sm text-black border border-black/10 rounded-xl px-4 py-3 resize-none focus:outline-none focus:border-black/30 transition-colors placeholder:text-black/20"
                />
                {status === 'error' && (
                  <p className="text-xs text-red-500">저장에 실패했습니다. 다시 시도해주세요.</p>
                )}
                <button
                  onClick={handleSend}
                  disabled={!content.trim() || status === 'sending'}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
                  style={{ backgroundColor: KEY }}
                >
                  {status === 'sending' ? '저장 중...' : '보내기'}
                </button>
              </>
            )}
          </div>
        )}

        {/* 목록 탭 */}
        {tab === 'list' && (
          <div className="px-5 py-4 max-h-80 overflow-y-auto space-y-3">
            {loadingList && <p className="text-xs text-black/30 text-center py-6">불러오는 중...</p>}
            {!loadingList && feedbacks.length === 0 && (
              <p className="text-xs text-black/30 text-center py-6">아직 의견이 없습니다</p>
            )}
            {feedbacks.map(f => (
              <div key={f.id} className="border border-black/6 rounded-xl px-4 py-3 space-y-1">
                <p className="text-sm text-black/80 whitespace-pre-wrap">{f.content}</p>
                <p className="text-xs text-black/25">{fmtKst(f.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// 실시간 뱃지
// ──────────────────────────────────────────────
function StatusBadge({ source }: { source: 'live' | 'fallback' | 'unavailable' }) {
  if (source !== 'live') return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: KEY_BG, border: `1px solid ${KEY_BORDER}`, color: KEY }}>
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: '#22c55e' }} /> 실시간
    </span>
  );
}

// ──────────────────────────────────────────────
// 환율 바
// ──────────────────────────────────────────────
function FxBar({ fx }: { fx: FxRates }) {
  const cny = 1 / fx.USD;
  const krw = fx.KRW / fx.USD;
  const eur = fx.EUR / fx.USD;

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-x-6 gap-y-2">
      <span className="text-xs text-black/35 font-medium tracking-wide">$1 USD =</span>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span className="text-sm font-semibold text-black">¥{fmtNum(cny, 2)} <span className="text-xs text-black/30 font-normal">CNY</span></span>
        <span className="text-sm font-semibold text-black">₩{fmtNum(krw, 0)} <span className="text-xs text-black/30 font-normal">KRW</span></span>
        <span className="text-sm font-semibold text-black">€{fmtNum(eur, 4)} <span className="text-xs text-black/30 font-normal">EUR</span></span>
      </div>
      <StatusBadge source={fx.source} />
    </div>
  );
}

// ──────────────────────────────────────────────
// 가격 행
// ──────────────────────────────────────────────
function PriceRow({ entry, currency, fx }: { entry: PriceEntry; currency: Currency; fx: FxRates }) {
  const current = convert(entry.current, currency, fx);
  const diff    = convert(Math.abs(entry.diff), currency, fx);
  const isDown  = entry.diff <= 0;

  return (
    <tr className="border-t border-black/5 hover:bg-black/[0.02] transition-colors">
      <td className="py-2.5 px-4 text-xs font-semibold text-black/35 w-16">{entry.grade}</td>
      <td className="py-2.5 px-4 text-right">
        <span className="text-sm font-bold text-black">{fmtPrice(current, currency)}<span className="text-xs font-normal text-black/30">/kg</span></span>
      </td>
      <td className="py-2.5 px-4 text-right">
        <span className={`text-xs font-medium ${isDown ? 'text-black/40' : 'text-black/70'}`}>
          {isDown ? '▼' : '▲'} {fmtPrice(diff, currency)}
        </span>
        {entry.yoy && <span className="text-xs text-black/20 ml-1">({entry.yoy})</span>}
      </td>
    </tr>
  );
}

// ──────────────────────────────────────────────
// 시세 카드
// ──────────────────────────────────────────────
function CategoryCard({ cat, currency, fx }: { cat: CategoryPrices; currency: Currency; fx: FxRates }) {
  const isGoose = cat.type === 'goose';
  const top = cat.prices.find(p => p.grade === '90%');

  return (
    <div className="bg-white rounded-2xl border border-black/8 overflow-hidden">
      <div className="h-0.5" style={{ backgroundColor: KEY }} />
      <div className="px-4 py-4 bg-black">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-white/40 tracking-widest uppercase mb-1">
              {isGoose ? 'Goose Down' : 'Duck Down'} · {cat.color === 'white' ? 'White' : 'Grey'}
            </p>
            <h3 className="text-lg font-bold text-white leading-tight">{cat.nameKr}</h3>
            <p className="text-xs text-white/30 mt-0.5">{cat.name}</p>
          </div>
          {top && (
            <div className="text-right shrink-0">
              <p className="text-xs text-white/30 mb-0.5">90% 기준</p>
              <p className="text-2xl font-bold text-white leading-none">{fmtPrice(convert(top.current, currency, fx), currency)}</p>
              <p className="text-xs text-white/30 mt-0.5">/kg</p>
            </div>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px]">
          <thead>
            <tr className="border-b border-black/5">
              <th className="py-2 px-3 sm:px-4 text-left text-xs text-black/25 font-medium">등급</th>
              <th className="py-2 px-3 sm:px-4 text-right text-xs text-black/25 font-medium">이번 주</th>
              <th className="py-2 px-3 sm:px-4 text-right text-xs text-black/25 font-medium">전주 대비</th>
            </tr>
          </thead>
          <tbody>
            {cat.prices.map(entry => (
              <PriceRow key={entry.grade} entry={entry} currency={currency} fx={fx} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// CFD 등급별 가격 비교 막대 차트
// ──────────────────────────────────────────────
const CFD_CHART_COLORS = [KEY, '#000000'];
const CFD_GRADES = ['70%', '80%', '90%', '95%'];

function CfdBarChart({ categories, currency, fx, label }: {
  categories: CategoryPrices[]; currency: Currency; fx: FxRates; label: string;
}) {
  const sym = CURRENCY_SYMBOLS[currency];
  const chartData = CFD_GRADES.map(grade => {
    const row: Record<string, string | number> = { grade };
    categories.forEach(cat => {
      const entry = cat.prices.find(p => p.grade === grade);
      if (entry) row[cat.nameKr] = parseFloat(convert(entry.current, currency, fx).toFixed(2));
    });
    return row;
  });

  return (
    <div className="border border-black/6 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-black/5">
        <p className="text-xs font-semibold text-black/40 uppercase tracking-widest">{label} — 등급별 시세 비교</p>
      </div>
      <div className="px-4 py-5">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={4}>
            <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.05)" />
            <XAxis dataKey="grade" tick={{ fontSize: 11, fill: 'rgba(0,0,0,0.35)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'rgba(0,0,0,0.35)' }} axisLine={false} tickLine={false} tickFormatter={v => `${sym}${v}`} width={56} />
            <Tooltip
              contentStyle={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => [`${sym}${fmtNum(Number(v ?? 0))}/kg`]}
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', paddingTop: 8 }} />
            {categories.map((cat, idx) => (
              <Bar key={cat.name} dataKey={cat.nameKr} fill={CFD_CHART_COLORS[idx % CFD_CHART_COLORS.length]} radius={[3, 3, 0, 0]} maxBarSize={36} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// 관세청 월별 추이 차트
// ──────────────────────────────────────────────
function CustomsLineChart({ months, currency, fxKrw, fxUsd, fxEur }: {
  months: CustomsMonthData[]; currency: Currency; fxKrw: number; fxUsd: number; fxEur: number;
}) {
  const sym = CURRENCY_SYMBOLS[currency];
  const unitLabel = currency === 'KRW' ? '₩/kg' : `${sym}/kg`;

  // 관세청 단가는 USD/kg 기준 → 각 통화로 변환
  // KRW/USD = fx.KRW / fx.USD (교차환율), EUR/USD = fx.EUR / fx.USD
  const toDisplay = (usdPerKg: number): number => {
    if (currency === 'KRW') return parseFloat((usdPerKg * (fxKrw / fxUsd)).toFixed(0));
    if (currency === 'CNY') return parseFloat((usdPerKg / fxUsd).toFixed(2));
    if (currency === 'EUR') return parseFloat((usdPerKg * (fxEur / fxUsd)).toFixed(2));
    return parseFloat(usdPerKg.toFixed(2));
  };

  const chartData = [...months]
    .sort((a, b) => a.period.localeCompare(b.period))
    .map(m => ({
      label: m.periodLabel.replace('년 ', '.').replace('월', ''),
      단가: toDisplay(m.unitPrice),
      수입량: parseFloat((m.importVolume / 1000).toFixed(1)),
    }));

  const tooltipStyle = { border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' };

  return (
    <div className="border border-black/6 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
        <p className="text-xs font-semibold text-black/40 uppercase tracking-widest">평균 수입단가 추이</p>
        <p className="text-xs text-black/25">HS 0505100000 · 거위·오리 합산</p>
      </div>
      <div className="px-4 py-4">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.05)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'rgba(0,0,0,0.35)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'rgba(0,0,0,0.35)' }} axisLine={false} tickLine={false} tickFormatter={v => `${sym}${v}`} width={52} />
            <Tooltip
              contentStyle={tooltipStyle}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => [`${sym}${fmtNum(Number(v ?? 0), currency === 'KRW' ? 0 : 2)} ${unitLabel}`]}
              cursor={{ stroke: 'rgba(0,0,0,0.08)' }}
            />
            <Line type="monotone" dataKey="단가" stroke={KEY} strokeWidth={2} dot={{ r: 4, fill: KEY, strokeWidth: 0 }} activeDot={{ r: 5, fill: KEY }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="px-4 pb-4 border-t border-black/5 pt-3">
        <p className="text-xs text-black/25 mb-3 px-1">수입량 (톤)</p>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={chartData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.05)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.3)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.3)' }} axisLine={false} tickLine={false} width={36} tickFormatter={v => `${v}t`} />
            <Tooltip
              contentStyle={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, fontSize: 12 }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => [`${v ?? 0}톤`]}
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
            />
            <Bar dataKey="수입량" fill="rgba(0,0,0,0.12)" radius={[3, 3, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// 관세청 수입 통계 테이블
// ──────────────────────────────────────────────
function CustomsTable({ months, fxKrw, fxUsd }: { months: CustomsMonthData[]; fxKrw: number; fxUsd: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[320px]">
        <thead>
          <tr className="border-b border-black/5">
            <th className="py-2.5 px-3 sm:px-4 text-left text-xs text-black/30 font-medium">기간</th>
            <th className="py-2.5 px-3 sm:px-4 text-right text-xs text-black/30 font-medium">수입량</th>
            <th className="py-2.5 px-3 sm:px-4 text-right text-xs text-black/30 font-medium hidden sm:table-cell">수입금액</th>
            <th className="py-2.5 px-3 sm:px-4 text-right text-xs text-black/30 font-medium">평균 수입단가</th>
            <th className="py-2.5 px-3 sm:px-4 text-right text-xs text-black/30 font-medium hidden sm:table-cell">원화 환산</th>
          </tr>
        </thead>
        <tbody>
          {months.map(m => (
            <tr key={m.period} className="border-t border-black/5 hover:bg-black/[0.02]">
              <td className="py-3 px-3 sm:px-4 font-medium text-black/70 text-xs sm:text-sm">{m.periodLabel}</td>
              <td className="py-3 px-3 sm:px-4 text-right text-black/50 text-xs sm:text-sm">
                {m.importVolume >= 1000 ? `${fmtNum(m.importVolume / 1000, 1)}톤` : `${fmtNum(m.importVolume, 0)}kg`}
              </td>
              <td className="py-3 px-3 sm:px-4 text-right text-black/50 text-xs sm:text-sm hidden sm:table-cell">${fmtNum(m.importValue, 0)}</td>
              <td className="py-3 px-3 sm:px-4 text-right font-bold text-black text-xs sm:text-sm">${fmtNum(m.unitPrice, 2)}/kg</td>
              <td className="py-3 px-3 sm:px-4 text-right text-black/40 text-xs sm:text-sm hidden sm:table-cell">
                ₩{Math.round(m.unitPrice * (fxKrw / fxUsd)).toLocaleString('ko-KR')}/kg
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ──────────────────────────────────────────────
// 섹션 헤더
// ──────────────────────────────────────────────
function SectionLabel({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xs font-semibold text-black/40 uppercase tracking-widest">{title}</h2>
      {sub && <p className="text-xs text-black/25">{sub}</p>}
    </div>
  );
}

// ──────────────────────────────────────────────
// 뉴스
// ──────────────────────────────────────────────
interface NewsItem { title: string; link: string; pubDate: string; source: string; }

function NewsCard({ item, index }: { item: NewsItem; index: number }) {
  return (
    <li className="flex items-start gap-4 px-5 py-3.5 hover:bg-black/[0.02] transition-colors">
      <span className="text-xs text-black/20 mt-0.5 w-5 shrink-0 text-right">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <a href={item.link} target="_blank" rel="noopener noreferrer"
          className="text-sm font-medium text-black/80 hover:text-black transition-colors leading-snug line-clamp-2">
          {item.title}
        </a>
        <div className="flex items-center gap-2 mt-1">
          {item.source && <span className="text-xs text-black/30">{item.source}</span>}
          {item.source && item.pubDate && <span className="text-black/15 text-xs">·</span>}
          {item.pubDate && <span className="text-xs text-black/25">{fmtPubDate(item.pubDate)}</span>}
        </div>
      </div>
      <a href={item.link} target="_blank" rel="noopener noreferrer"
        className="shrink-0 text-xs px-2.5 py-1 rounded-md border transition-colors"
        style={{ borderColor: KEY_BORDER, color: KEY }}
        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = KEY_BG; }}
        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent'; }}>
        기사 보기
      </a>
    </li>
  );
}

function NewsSectionBase({ title, subtitle, apiPath, sourceNote }: {
  title: string; subtitle: string; apiPath: string; sourceNote: string;
}) {
  const [news, setNews]       = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [page, setPage]       = useState(0);

  useEffect(() => {
    fetch(apiPath)
      .then(r => r.json())
      .then(d => { setNews(d.news ?? []); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [apiPath]);

  const totalPages = Math.ceil(news.length / PAGE_SIZE);
  const paged = news.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const pageBtnStyle = (disabled: boolean) =>
    disabled
      ? { borderColor: 'rgba(0,0,0,0.1)', color: 'rgba(0,0,0,0.3)' }
      : { borderColor: KEY, color: KEY };

  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-sm font-semibold tracking-widest text-black/40 uppercase">{title}</h2>
        <div className="flex-1 h-px bg-black/6" />
        <span className="text-xs text-black/25">{subtitle}</span>
      </div>
      <div className="rounded-xl border border-black/8 overflow-hidden" style={{ borderTop: `2px solid ${KEY}` }}>
        {loading && <div className="flex items-center justify-center py-12 text-sm text-black/30">뉴스를 불러오는 중...</div>}
        {!loading && error && <div className="flex items-center justify-center py-12 text-sm text-black/30">뉴스를 가져오지 못했습니다.</div>}
        {!loading && !error && news.length === 0 && <div className="flex items-center justify-center py-12 text-sm text-black/30">표시할 뉴스가 없습니다.</div>}
        {!loading && !error && news.length > 0 && (
          <ul className="divide-y divide-black/5">
            {paged.map((item, i) => <NewsCard key={page * PAGE_SIZE + i} item={item} index={page * PAGE_SIZE + i} />)}
          </ul>
        )}
        {totalPages > 1 && (
          <div className="border-t border-black/5 py-3 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="text-xs font-medium px-3 py-1 rounded-md border transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
              style={pageBtnStyle(page === 0)}
            >← 이전</button>
            <span className="text-xs font-medium text-black/50 px-1">
              {page + 1} <span className="text-black/25 font-normal">/ {totalPages}</span>
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="text-xs font-medium px-3 py-1 rounded-md border transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
              style={pageBtnStyle(page === totalPages - 1)}
            >다음 →</button>
          </div>
        )}
        <div className="px-5 py-2.5 border-t border-black/5 bg-black/[0.015]">
          <p className="text-xs text-black/25">{sourceNote}</p>
        </div>
      </div>
    </section>
  );
}

function KrNewsSection() {
  return (
    <NewsSectionBase
      title="국내 뉴스"
      subtitle="거위털 · 오리털 · 구스이불"
      apiPath="/api/news-kr"
      sourceNote="출처: 네이버 뉴스 검색 API · 국내 언론사 기준"
    />
  );
}

function NewsSection() {
  return (
    <NewsSectionBase
      title="해외 뉴스"
      subtitle="거위털 · 오리털 · 침구류"
      apiPath="/api/news"
      sourceNote="출처: Google News RSS · 해외 영문 뉴스 기준"
    />
  );
}

// ──────────────────────────────────────────────
// 네이버 쇼핑 캐러셀
// ──────────────────────────────────────────────
interface ShoppingItem { title: string; link: string; image: string; lprice: number; mallName: string; }

function ShoppingCarousel({ query, label }: { query: string; label: string }) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [noKey, setNoKey] = useState(false);

  useEffect(() => {
    fetch(`/api/shopping?query=${encodeURIComponent(query)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error === 'naver_key_missing') { setNoKey(true); }
        else { setItems(d.items ?? []); }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [query]);

  return (
    <div className="mb-6">
      <p className="text-xs font-semibold text-black/35 tracking-widest uppercase mb-3">{label}</p>

      {loading && (
        <div className="flex gap-3 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-40 shrink-0 rounded-xl border border-black/6 bg-black/[0.02] h-52 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && noKey && (
        <p className="text-xs text-black/30 py-4">네이버 API 키가 설정되지 않았습니다.</p>
      )}

      {!loading && !noKey && items.length === 0 && (
        <p className="text-xs text-black/30 py-4">상품을 가져오지 못했습니다.</p>
      )}

      {!loading && !noKey && items.length > 0 && (
        <div
          className="flex gap-3 overflow-x-auto pb-2"
          style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
        >
          {items.map((item, i) => (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="w-40 shrink-0 flex flex-col rounded-xl border border-black/8 overflow-hidden hover:border-black/20 transition-all group"
              style={{ scrollSnapAlign: 'start' }}
            >
              {/* 상품 이미지 */}
              <div className="w-full h-36 bg-black/[0.03] overflow-hidden">
                {item.image
                  ? <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  : <div className="w-full h-full flex items-center justify-center text-black/15 text-xs">이미지 없음</div>
                }
              </div>
              {/* 정보 */}
              <div className="px-3 py-2.5 flex flex-col gap-1 flex-1">
                <p className="text-xs font-medium text-black/75 leading-snug line-clamp-2">{item.title}</p>
                <p className="text-xs text-black/30 mt-auto">{item.mallName}</p>
                <p className="text-sm font-bold text-black">
                  {item.lprice > 0 ? `₩${item.lprice.toLocaleString('ko-KR')}` : '가격 미정'}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function ShoppingSection() {
  return (
    <section>
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-sm font-semibold tracking-widest text-black/40 uppercase">네이버 쇼핑</h2>
        <div className="flex-1 h-px bg-black/6" />
        <span className="text-xs text-black/25">인기순 · 네이버 쇼핑 기준</span>
      </div>
      <ShoppingCarousel query="구스이불" label="구스이불" />
      <ShoppingCarousel query="구스베개" label="구스베개" />
      <p className="text-xs text-black/25 mt-1">출처: 네이버 쇼핑 검색 API</p>
    </section>
  );
}

// ──────────────────────────────────────────────
// 메인 대시보드
// ──────────────────────────────────────────────
export default function Dashboard({ data }: { data: AggregatedData }) {
  const router = useRouter();
  const [currency, setCurrency]     = useState<Currency>('KRW');
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
      if (s.currency) setCurrency(s.currency);
    } catch {}
  }, []);

  function save(c: Currency) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ currency: c })); } catch {}
  }

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/');
  }

  const { fx, cfd, customs } = data;
  const goose = cfd.categories.filter(c => c.type === 'goose');
  const duck  = cfd.categories.filter(c => c.type === 'duck');

  return (
    <div className="min-h-screen bg-white">
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}

      {/* 헤더 */}
      <header className="border-b border-black/6 px-4 sm:px-6 py-4 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <h1 className="text-base sm:text-lg font-bold text-black tracking-tight">구초뉴스</h1>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setShowFeedback(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-all"
              style={{ backgroundColor: KEY_BG, color: KEY, borderColor: KEY_BORDER }}
            >
              의견보내기
            </button>
            <button
              onClick={handleLogout}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border border-black/10 text-black/35 hover:text-black hover:border-black/30 transition-all"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 sm:space-y-10">

        {/* 환율 + 통화 토글 */}
        <section className="border border-black/6 rounded-2xl px-5 py-4 space-y-4">
          <FxBar fx={fx} />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-black/30 font-medium mr-1">통화</span>
            {(['CNY', 'USD', 'KRW', 'EUR'] as Currency[]).map(c => (
              <button
                key={c}
                onClick={() => { setCurrency(c); save(c); }}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-all"
                style={currency === c
                  ? { backgroundColor: KEY, color: 'white', borderColor: KEY }
                  : { backgroundColor: 'white', color: 'rgba(0,0,0,0.45)', borderColor: 'rgba(0,0,0,0.12)' }
                }
              >
                {CURRENCY_SYMBOLS[c]} {CURRENCY_LABELS[c]}
              </button>
            ))}
          </div>
        </section>

        {/* 거위털 */}
        <section>
          <SectionLabel title="거위털 — Goose Down" sub={`CFD 중국우모협회 · 마지막 업데이트 ${cfd.updatedAt}`} />
          <div className="space-y-4">
            <CfdBarChart categories={goose} currency={currency} fx={fx} label="거위털" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goose.map(cat => <CategoryCard key={cat.name} cat={cat} currency={currency} fx={fx} />)}
            </div>
          </div>
        </section>

        {/* 오리털 */}
        <section>
          <SectionLabel title="오리털 — Duck Down" sub={`CFD 중국우모협회 · 마지막 업데이트 ${cfd.updatedAt}`} />
          <div className="space-y-4">
            <CfdBarChart categories={duck} currency={currency} fx={fx} label="오리털" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {duck.map(cat => <CategoryCard key={cat.name} cat={cat} currency={currency} fx={fx} />)}
            </div>
          </div>
        </section>

        {/* 관세청 수입 통계 */}
        <section>
          <SectionLabel title="한국 수입 통계 — 관세청" sub="월별 집계 · 매월 15일경 업데이트" />

          {!customs && (
            <div className="border border-black/6 rounded-2xl px-5 py-10 text-center">
              <p className="text-sm font-medium text-black/50">관세청 API 키가 설정되지 않았습니다</p>
              <p className="text-xs text-black/30 mt-1">
                <code className="bg-black/5 px-1 rounded">.env.local</code>에{' '}
                <code className="bg-black/5 px-1 rounded">CUSTOMS_API_KEY</code> 추가 필요
              </p>
              <a href="https://www.data.go.kr/data/15101609/openapi.do" target="_blank" rel="noopener noreferrer"
                className="inline-block mt-2 text-xs text-black underline underline-offset-2">
                API 키 발급 →
              </a>
            </div>
          )}

          {customs?.source === 'unavailable' && (
            <div className="border border-black/6 rounded-2xl px-5 py-10 text-center">
              <p className="text-sm text-black/40">데이터를 불러오지 못했습니다</p>
              <p className="text-xs text-black/25 mt-1">API 응답 오류 — 잠시 후 다시 시도해주세요</p>
            </div>
          )}

          {customs?.source === 'live' && customs.months.length > 0 && (
            <div className="space-y-4">
              <CustomsLineChart months={customs.months} currency={currency} fxKrw={fx.KRW} fxUsd={fx.USD} fxEur={fx.EUR} />
              <div className="border border-black/6 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-black/5 bg-black/[0.02] flex items-start gap-2">
                  <span className="text-black/30 mt-0.5 text-xs">※</span>
                  <div>
                    <p className="text-xs font-semibold text-black/60">HS 0505100000 — 충전용 깃털·솜털</p>
                    <p className="text-xs text-black/35 mt-0.5">{CUSTOMS_HS_NOTE}</p>
                  </div>
                </div>
                <CustomsTable months={customs.months} fxKrw={fx.KRW} fxUsd={fx.USD} />
                <div className="px-5 py-2.5 border-t border-black/5 bg-black/[0.015] flex items-center justify-between">
                  <p className="text-xs text-black/25">출처: 관세청 수출입통계 (data.go.kr)</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 국내 뉴스 */}
        <KrNewsSection />

        {/* 해외 뉴스 */}
        <NewsSection />

        {/* 네이버 쇼핑 */}
        <ShoppingSection />

        {/* 주의사항 */}
        <section className="text-xs text-black/20 space-y-1 pb-4 border-t border-black/5 pt-6">
          <p>· CFD 시세는 중국 내수 도매가 기준입니다. 실제 수입가는 물류비·관세·마진을 포함하여 다를 수 있습니다.</p>
          <p>· 환율은 open.er-api.com 기준이며, 실제 거래 환율과 차이가 있을 수 있습니다.</p>
          <p>· 이 정보는 참고용이며, 투자·구매 결정의 직접 근거로 사용하지 마세요.</p>
        </section>
      </main>

      {/* 푸터 */}
      <footer className="border-t border-black/6 px-6 py-5">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs text-black/25">
          <div className="flex items-center gap-5">
            <a href="https://www.cfd.com.cn/index.php?s=/Web/Market/platform.html" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">CFD 원문</a>
            <a href="https://www.data.go.kr/data/15101609/openapi.do" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">관세청 공공데이터</a>
            <a href="https://open.er-api.com" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">환율 API</a>
          </div>
          <p>거위털 국제 원료 시세 · 참고용 · © 2026</p>
        </div>
      </footer>
    </div>
  );
}
