import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { JWT_SECRET } from '@/app/lib/auth';

export async function proxy(req: NextRequest) {
  const token = req.cookies.get('goose_token')?.value;

  if (!token) return NextResponse.redirect(new URL('/', req.url));

  try {
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch {
    // 토큰 만료 또는 위조
    const res = NextResponse.redirect(new URL('/', req.url));
    res.cookies.delete('goose_token');
    return res;
  }
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
