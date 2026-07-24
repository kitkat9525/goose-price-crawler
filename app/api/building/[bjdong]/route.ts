import { NextResponse } from 'next/server';
import { getBuildingByBjdong } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ bjdong: string }> }) {
  const { bjdong } = await params;
  const data = await getBuildingByBjdong(bjdong);
  return NextResponse.json({ data });
}
