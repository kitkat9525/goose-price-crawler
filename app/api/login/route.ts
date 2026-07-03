import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { verifyUser } from '@/app/lib/db';
import { JWT_SECRET } from '@/app/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { username, password } = await req.json();
  if (!username || !password) return NextResponse.json({ ok: false }, { status: 400 });

  const valid = await verifyUser(username, password);
  if (!valid) {
    return NextResponse.json({ ok: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }

  // JWT 발급 (24시간 유효)
  const token = await new SignJWT({ username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);

  const res = NextResponse.json({ ok: true });
  res.cookies.set('goose_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24시간
  });
  return res;
}
