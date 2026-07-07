import { NextRequest, NextResponse } from 'next/server';

const TARGET_ORIGIN = 'https://goosechoi.com';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const path = searchParams.get('path') ?? '/review';
  const targetUrl = `${TARGET_ORIGIN}${path.startsWith('/') ? path : '/' + path}`;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      cache: 'no-store',
    });

    const contentType = res.headers.get('content-type') ?? 'text/html';

    // 바이너리 리소스(이미지, 폰트, CSS, JS 등)는 그대로 프록시
    if (!contentType.includes('text/html')) {
      const buf = await res.arrayBuffer();
      return new NextResponse(buf, {
        status: res.status,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    let html = await res.text();

    // 상대경로 → 절대경로 변환 (CSS, JS, 이미지, 링크)
    html = html
      .replace(/(href|src|action)="\/(?!\/)/g, `$1="${TARGET_ORIGIN}/`)
      .replace(/(href|src|action)='\/(?!\/)/g, `$1='${TARGET_ORIGIN}/`)
      // url() in style 태그
      .replace(/url\((['"]?)\/(?!\/)/g, `url($1${TARGET_ORIGIN}/`);

    // 내부 링크를 프록시 경유로 변경
    html = html.replace(
      new RegExp(`href="${TARGET_ORIGIN}(/[^"]*)"`, 'g'),
      `href="/api/review-proxy?path=$1"`,
    );

    // <base> 태그 추가 (상대경로 보완)
    html = html.replace('<head>', `<head><base href="${TARGET_ORIGIN}/">`);

    return new NextResponse(html, {
      status: res.status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('[review-proxy]', e);
    return new NextResponse('프록시 오류가 발생했습니다.', { status: 502 });
  }
}
