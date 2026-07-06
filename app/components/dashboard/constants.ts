import type { FxRates } from '@/app/lib/aggregate';

// ─── 색상 ───────────────────────────────────────
export const KEY        = '#AA8E5C';
export const KEY_BG     = 'rgba(170,142,92,0.08)';
export const KEY_BORDER = 'rgba(170,142,92,0.3)';

// ─── 앱 설정 ────────────────────────────────────
export const SETTINGS_KEY = 'goose-settings';
export const PAGE_SIZE    = 10;

// ─── 내비게이션 ─────────────────────────────────
export const NAV_SECTIONS = [
  { id: 'sec-fx',       label: '환율' },
  { id: 'sec-goose',    label: '거위털' },
  { id: 'sec-duck',     label: '오리털' },
  { id: 'sec-customs',  label: '수입통계' },
  { id: 'sec-news-kr',  label: '국내뉴스' },
  { id: 'sec-news',     label: '해외뉴스' },
  { id: 'sec-shopping', label: '쇼핑트렌드' },
  { id: 'sec-insight',  label: '쇼핑인사이트' },
] as const;

// ─── 통화 ───────────────────────────────────────
export type Currency = 'CNY' | 'USD' | 'KRW' | 'EUR';

export const CURRENCY_LABELS: Record<Currency, string>  = { CNY: '위안', USD: '달러', KRW: '원', EUR: '유로' };
export const CURRENCY_SYMBOLS: Record<Currency, string> = { CNY: '¥', USD: '$', KRW: '₩', EUR: '€' };

export function convert(cny: number, currency: Currency, fx: FxRates): number {
  if (currency === 'USD') return cny * fx.USD;
  if (currency === 'KRW') return cny * fx.KRW;
  if (currency === 'EUR') return cny * fx.EUR;
  return cny;
}

export function fmtPrice(amount: number, currency: Currency): string {
  const sym = CURRENCY_SYMBOLS[currency];
  if (currency === 'KRW') return `${sym}${Math.round(amount).toLocaleString('ko-KR')}`;
  return `${sym}${amount.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtNum(n: number, decimals = 2): string {
  return n.toLocaleString('ko-KR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtKst(iso: string, showTime = true): string {
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

export function fmtPubDate(s: string): string {
  if (!s) return '';
  try {
    return new Date(s).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return s; }
}
