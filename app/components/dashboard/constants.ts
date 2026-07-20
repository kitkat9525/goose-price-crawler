import type { FxRates } from '@/app/lib/aggregate';

// ─── 키컬러 (Header 네비 active 언더라인에만 사용) ──
export const KEY = '#AA8E5C';

// ─── 앱 설정 ────────────────────────────────────
export const SETTINGS_KEY = 'goose-settings';
export const PAGE_SIZE    = 10;

// ─── CFD 규격 ────────────────────────────────────
export const CFD_STANDARDS = [
  { key: '服标', label: '중국의류표준' },
  { key: '寝标', label: '중국침구표준' },
  { key: '国标', label: '중국국가표준' },
  { key: '欧标', label: '유럽표준' },
  { key: '美标', label: '미국표준' },
  { key: '日标', label: '일본표준' },
] as const;

export type CfdStandardKey = typeof CFD_STANDARDS[number]['key'];

export type Currency = 'CNY' | 'USD' | 'KRW' | 'EUR';

export const CURRENCY_LABELS: Record<Currency, string>  = { CNY: '위안', USD: '달러', KRW: '원', EUR: '유로' };
export const CURRENCY_SYMBOLS: Record<Currency, string> = { CNY: '¥', USD: '$', KRW: '₩', EUR: '€' };
export const CURRENCIES: Currency[] = ['CNY', 'USD', 'KRW', 'EUR'];

// ─── 내비게이션 ─────────────────────────────────
export const NAV_SECTIONS = [
  { id: 'sec-fx',         label: '환율' },
  { id: 'sec-goose',      label: '구스 · 덕다운' },
  { id: 'sec-cert',       label: '인증현황' },
  { id: 'sec-customs',    label: '수입통계' },
  { id: 'sec-news-kr',    label: '뉴스' },
  { id: 'sec-shopping',   label: '쇼핑트렌드' },
  { id: 'sec-price-dist', label: '가격분포' },
  { id: 'sec-insight',    label: '쇼핑인사이트' },
  { id: 'sec-sns',        label: 'SNS인사이트' },
] as const;

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
