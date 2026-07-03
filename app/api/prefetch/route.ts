// 인트로 화면에서 버튼 클릭 시 호출 — 데이터를 미리 크롤링/캐싱
import { NextResponse } from 'next/server';
import { aggregate } from '@/app/lib/aggregate';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await aggregate();
  return NextResponse.json({
    ok: true,
    fetchedAt: data.fetchedAt,
    cfdSource: data.cfd.source,
    fxSource: data.fx.source,
    customsSource: data.customs?.source ?? 'unavailable',
  });
}
