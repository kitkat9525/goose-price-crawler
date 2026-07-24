// 관세청 수출입실적 API — HS 0505100000 (충전용 깃털·솜털, 거위+오리 합산)
// OPEN_API_KEY 환경변수 필요

export const CUSTOMS_HS_CODE = '0505100000';
export const CUSTOMS_HS_NOTE =
  'HS 품목코드 0505100000은 거위털과 오리털을 구분하지 않아 합산 집계됩니다.';

export interface CustomsMonthData {
  period: string;       // YYYYMM
  periodLabel: string;  // 예: 2026년 5월
  importVolume: number; // 수입량 (kg)
  importValue: number;  // 수입금액 (USD)
  unitPrice: number;    // 평균 수입단가 (USD/kg)
}

export interface CustomsData {
  fetchedAt: string;
  source: 'live' | 'unavailable';
  months: CustomsMonthData[];
}

function toPeriodLabel(ym: string): string {
  return `${ym.slice(0, 4)}년 ${parseInt(ym.slice(4, 6), 10)}월`;
}

// YYYYMM 문자열 생성
function toYymm(date: Date): string {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// 관세청 XML 파싱 — 총계 행(hsCode="-") 제외
function parseXml(xml: string): CustomsMonthData[] {
  const results: CustomsMonthData[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;

  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const get = (tag: string) => {
      const t = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
      return t ? t[1].trim() : '';
    };

    if (get('hsCode') === '-') continue; // 총계 행 제외

    const yearRaw = get('year'); // "2026.04"
    if (!yearRaw || yearRaw === '총계') continue;

    const period = yearRaw.replace('.', ''); // "202604"
    const qty = parseFloat(get('impWgt'));
    const amt = parseFloat(get('impDlr'));

    if (isNaN(qty) || qty === 0) continue;

    results.push({
      period,
      periodLabel: toPeriodLabel(period),
      importVolume: qty,
      importValue: isNaN(amt) ? 0 : amt,
      unitPrice: !isNaN(amt) && qty > 0 ? amt / qty : 0,
    });
  }

  return results;
}

export async function fetchCustomsData(): Promise<CustomsData | null> {
  const apiKey = process.env.OPEN_API_KEY;
  if (!apiKey) return null;

  const now = new Date();
  // 관세청은 전월 데이터까지 제공 (당월 집계 미완료)
  const end = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const start = new Date(now.getFullYear(), now.getMonth() - 6, 1);

  const url = new URL('https://apis.data.go.kr/1220000/Itemtrade/getItemtradeList');
  url.searchParams.set('serviceKey', apiKey);
  url.searchParams.set('hsSgn', CUSTOMS_HS_CODE);
  url.searchParams.set('strtYymm', toYymm(start));
  url.searchParams.set('endYymm', toYymm(end));

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
    if (!res.ok) return { fetchedAt: new Date().toISOString(), source: 'unavailable', months: [] };

    const xml = await res.text();
    const months = parseXml(xml).sort((a, b) => b.period.localeCompare(a.period));

    return {
      fetchedAt: new Date().toISOString(),
      source: months.length > 0 ? 'live' : 'unavailable',
      months,
    };
  } catch {
    return { fetchedAt: new Date().toISOString(), source: 'unavailable', months: [] };
  }
}
