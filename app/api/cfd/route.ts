import { NextResponse } from 'next/server';
import { fetchPrices } from '@/app/lib/prices';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const standard = searchParams.get('standard') ?? '服标';
  const data = await fetchPrices(standard);
  return NextResponse.json(data);
}
