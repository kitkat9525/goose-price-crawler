import { NextRequest, NextResponse } from 'next/server';
import data from '@/data/bjdong.json';

const bjdongMap = data as Record<string, { c: string; n: string }[]>;

export async function GET(request: NextRequest) {
  const sigunguCd = new URL(request.url).searchParams.get('sigunguCd');
  if (!sigunguCd) {
    return NextResponse.json({ error: 'sigunguCd 파라미터가 필요합니다.' }, { status: 400 });
  }
  return NextResponse.json(bjdongMap[sigunguCd] ?? []);
}
