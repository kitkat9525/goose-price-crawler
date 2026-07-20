import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { JWT_SECRET } from '@/app/lib/auth';

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get('goose_token')?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 이미 로그인된 상태에서 로그인 화면 접근 → 홈으로
  if (pathname === '/') {
    if (await isAuthenticated(req)) {
      return NextResponse.redirect(new URL('/home', req.url));
    }
    return NextResponse.next();
  }

  // 홈 접근 시 인증 확인
  if (await isAuthenticated(req)) {
    return NextResponse.next();
  }

  const res = NextResponse.redirect(new URL('/', req.url));
  res.cookies.delete('goose_token');
  return res;
}

export const config = {
  matcher: ['/', '/home/:path*'],
};
