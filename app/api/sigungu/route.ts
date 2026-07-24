import { NextResponse } from 'next/server';
import data from '@/data/sigungu.json';

export async function GET() {
  return NextResponse.json(data);
}
