import { NextResponse } from 'next/server';

export const revalidate = 21600; // 6시간 캐시

const PROMPT = `
goosechoi.com은 한국의 구스다운(거위털) 침구 전문 브랜드야. 이 사이트를 분석해서 아래 JSON 형식으로만 응답해줘. 마크다운 없이 JSON만.

{
  "summary": "브랜드 인사이트 요약 2-3문장. 현재 시즌 전략, 주요 강점, 마케팅 방향 등.",
  "tags": ["#태그1", "#태그2", "#태그3", "#태그4", "#태그5", "#태그6"],
  "stats": {
    "product_count": 숫자,
    "promo_count": 숫자,
    "avg_rating": 숫자
  },
  "best_products": [
    {"rank": 1, "name": "상품명", "price": "599,000원", "original_price": "1,300,000원", "badges": ["BEST","SALE"], "reviews": "342"},
    {"rank": 2, "name": "상품명", "price": "가격", "original_price": null, "badges": ["HOT"], "reviews": "리뷰수"},
    {"rank": 3, "name": "상품명", "price": "가격", "original_price": "가격", "badges": ["NEW"], "reviews": "리뷰수"},
    {"rank": 4, "name": "상품명", "price": "가격", "original_price": null, "badges": [], "reviews": "리뷰수"},
    {"rank": 5, "name": "상품명", "price": "가격", "original_price": null, "badges": ["SALE"], "reviews": "리뷰수"}
  ],
  "promotions": [
    {"name": "프로모션명", "desc": "짧은 설명", "highlight": "강조 문구"},
    {"name": "프로모션명", "desc": "짧은 설명", "highlight": "강조 문구"},
    {"name": "프로모션명", "desc": "짧은 설명", "highlight": "강조 문구"},
    {"name": "프로모션명", "desc": "짧은 설명", "highlight": "강조 문구"}
  ],
  "marketing_points": [
    {"title": "포인트 제목", "desc": "상세 설명 1-2문장"},
    {"title": "포인트 제목", "desc": "상세 설명 1-2문장"},
    {"title": "포인트 제목", "desc": "상세 설명 1-2문장"}
  ]
}
`;

export async function GET() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'no_key' }, { status: 200 });
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: PROMPT }] }],
          generationConfig: { temperature: 0.3 },
        }),
        next: { revalidate: 21600 },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('[brand] Gemini error:', err);
      return NextResponse.json({ error: 'gemini_error' }, { status: 200 });
    }

    const gemini = await res.json();
    const text = gemini?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // 마크다운 코드블록 제거
    const clean = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
    const parsed = JSON.parse(clean);

    return NextResponse.json({ ...parsed, fetchedAt: new Date().toISOString() });
  } catch (e) {
    console.error('[brand] error:', e);
    return NextResponse.json({ error: 'parse_error' }, { status: 200 });
  }
}
