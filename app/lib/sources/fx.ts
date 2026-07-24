// 환율: open.er-api.com 기준 (1 CNY → 각 통화)

export interface FxRates {
  fetchedAt: string;
  lastUpdatedUtc: string; // API 원본 마지막 갱신 시각
  source: 'live' | 'fallback';
  // 1 CNY 당 환율
  USD: number;
  KRW: number;
  EUR: number;
}

// 폴백값 (실시간 조회 실패 시)
const FALLBACK: FxRates = {
  fetchedAt: '',
  lastUpdatedUtc: '',
  source: 'fallback',
  USD: 0.1388,  // 1 CNY ≈ $0.1388
  KRW: 190.5,   // 1 CNY ≈ ₩190.5
  EUR: 0.1290,  // 1 CNY ≈ €0.1290
};

export async function fetchFxRates(): Promise<FxRates> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/CNY', {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    if (json.result !== 'success') throw new Error('API 오류');

    return {
      fetchedAt: new Date().toISOString(),
      lastUpdatedUtc: json.time_last_update_utc ?? '',
      source: 'live',
      USD: json.rates.USD,
      KRW: json.rates.KRW,
      EUR: json.rates.EUR,
    };
  } catch {
    return { ...FALLBACK, fetchedAt: new Date().toISOString() };
  }
}
