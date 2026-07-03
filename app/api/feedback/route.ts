import { NextResponse } from 'next/server';
import { insertFeedback, getAllFeedbacks } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ ok: false }, { status: 400 });
  await insertFeedback(content.trim());
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const feedbacks = await getAllFeedbacks();
  return NextResponse.json({ feedbacks });
}
