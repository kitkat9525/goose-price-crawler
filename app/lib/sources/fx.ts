// 환율 소스: open.er-api.com (무료, 인증 불필요, 매 시간 업데이트)
// 기준: 1 CNY = ? (각 통화)

export interface FxRates {
  fetchedAt: string;
  source: 'live' | 'fallback';
  // 1 CNY 당 환율
  USD: number;
  KRW: number;
  EUR: number;
}

// 폴백: 수동 확인 기준값 (실시간 조회 실패 시)
const FALLBACK: FxRates = {
  fetchedAt: '',
  source: 'fallback',
  USD: 0.1388,  // 1 CNY ≈ $0.1388
  KRW: 190.5,   // 1 CNY ≈ ₩190.5
  EUR: 0.1290,  // 1 CNY ≈ €0.1290
};

export async function fetchFxRates(): Promise<FxRates> {
  const apiKey = process.env.EXCHANGERATE_API_KEY;

  // API 키 없으면 open.er-api.com (키 불필요 무료 엔드포인트) 사용
  const url = apiKey
    ? `https://v6.exchangerate-api.com/v6/${apiKey}/latest/CNY`
    : 'https://open.er-api.com/v6/latest/CNY';

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    if (json.result !== 'success') throw new Error('API 오류');

    // v6.exchangerate-api.com → conversion_rates
    // open.er-api.com        → rates
    const r = json.conversion_rates ?? json.rates;

    return {
      fetchedAt: new Date().toISOString(),
      source: 'live',
      USD: r.USD,
      KRW: r.KRW,
      EUR: r.EUR,
    };
  } catch {
    return { ...FALLBACK, fetchedAt: new Date().toISOString() };
  }
}
