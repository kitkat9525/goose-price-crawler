import { NextResponse } from 'next/server';

export const revalidate = 3600;

// 네이버 DataLab 쇼핑인사이트 분야 코드
// 가구/인테리어 (침구 포함) — https://datalab.naver.com/shoppingInsight/sCategory.naver
const CATEGORY_CODE = '50000004';

const KEYWORDS = ['구스이불', '구스베개', '구스토퍼'];

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  const clientId     = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ source: 'unavailable', trends: [], error: 'naver_key_missing' });
  }

  // 최근 12개월
  const endDate   = new Date();
  const startDate = new Date(endDate);
  startDate.setFullYear(startDate.getFullYear() - 1);
  startDate.setDate(1); // 월 시작일로 맞춤

  const body = {
    startDate: fmtDate(startDate),
    endDate:   fmtDate(endDate),
    timeUnit:  'month',
    category:  CATEGORY_CODE,
    keyword:   KEYWORDS.map(k => ({ name: k, param: [k] })),
  };

  try {
    const res = await fetch('https://openapi.naver.com/v1/datalab/shopping/category/keywords', {
      method:  'POST',
      headers: {
        'X-Naver-Client-Id':     clientId,
        'X-Naver-Client-Secret': clientSecret,
        'Content-Type':          'application/json',
      },
      body: JSON.stringify(body),
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[shopping-insight] API error:', res.status, errText);
      return NextResponse.json({
        source: 'unavailable',
        trends: [],
        error: `api_${res.status}`,
      });
    }

    const json = await res.json();
    // 응답: { startDate, endDate, timeUnit, results: [{ title, keyword, data: [{ period, ratio }] }] }
    const trends = (json.results ?? []).map((r: {
      title: string;
      data?: { period: string; ratio: number }[];
    }) => ({
      title: r.title,
      data:  r.data ?? [],
    }));

    return NextResponse.json({ source: 'live', trends });
  } catch (err) {
    console.error('[shopping-insight] fetch error:', err);
    return NextResponse.json({ source: 'unavailable', trends: [] });
  }
}
