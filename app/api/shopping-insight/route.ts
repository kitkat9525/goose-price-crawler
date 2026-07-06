import { NextResponse } from 'next/server';

export const revalidate = 3600;

// 가구/인테리어 분야 코드 (침구 포함)
const CATEGORY_CODE = '50000004';
const KEYWORDS = ['구스이불', '구스베개', '구스토퍼'];

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function naverPost(
  url: string,
  body: object,
  clientId: string,
  clientSecret: string,
) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Naver-Client-Id':     clientId,
        'X-Naver-Client-Secret': clientSecret,
        'Content-Type':          'application/json',
      },
      body: JSON.stringify(body),
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      console.error(`[shopping-insight] ${url} → ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error(`[shopping-insight] fetch error:`, e);
    return null;
  }
}

export async function GET() {
  const clientId     = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ source: 'unavailable', error: 'naver_key_missing' });
  }

  const endDate   = new Date();
  const startDate = new Date(endDate);
  startDate.setFullYear(startDate.getFullYear() - 1);
  startDate.setDate(1);

  const base = {
    startDate: fmtDate(startDate),
    endDate:   fmtDate(endDate),
    timeUnit:  'month',
    category:  CATEGORY_CODE,
  };

  // 모든 요청 병렬 실행
  const [trendJson, ...breakdownJsons] = await Promise.all([
    // 월별 트렌드 (3 키워드 한번에)
    naverPost(
      'https://openapi.naver.com/v1/datalab/shopping/category/keywords',
      { ...base, keyword: KEYWORDS.map(k => ({ name: k, param: [k] })) },
      clientId, clientSecret,
    ),
    // 기기별·성별·연령별 (키워드별 개별 호출)
    ...KEYWORDS.flatMap(keyword => [
      naverPost('https://openapi.naver.com/v1/datalab/shopping/category/keyword/device',
        { ...base, keyword }, clientId, clientSecret),
      naverPost('https://openapi.naver.com/v1/datalab/shopping/category/keyword/gender',
        { ...base, keyword }, clientId, clientSecret),
      naverPost('https://openapi.naver.com/v1/datalab/shopping/category/keyword/age',
        { ...base, keyword }, clientId, clientSecret),
    ]),
  ]);

  // 월별 트렌드
  const trends = (trendJson?.results ?? []).map((r: {
    title: string;
    data?: { period: string; ratio: number }[];
  }) => ({ title: r.title, data: r.data ?? [] }));

  // 기기별·성별·연령별 — keyword → data[]
  type Breakdown = { group: string; ratio: number };
  const device: Record<string, Breakdown[]> = {};
  const gender: Record<string, Breakdown[]> = {};
  const age:    Record<string, Breakdown[]> = {};

  KEYWORDS.forEach((kw, i) => {
    device[kw] = breakdownJsons[i * 3    ]?.results?.[0]?.data ?? [];
    gender[kw] = breakdownJsons[i * 3 + 1]?.results?.[0]?.data ?? [];
    age[kw]    = breakdownJsons[i * 3 + 2]?.results?.[0]?.data ?? [];
  });

  const allEmpty = trends.length === 0 &&
    KEYWORDS.every(k => device[k].length === 0 && gender[k].length === 0 && age[k].length === 0);

  return NextResponse.json({
    source: allEmpty ? 'unavailable' : 'live',
    trends,
    device,
    gender,
    age,
  });
}
