import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch(
      'https://www.cfd.com.cn/index.php?s=/Web/Market/platform.html',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          Referer: 'https://www.cfd.com.cn/',
        },
        cache: 'no-store',
      }
    );

    const html = await res.text();

    // 날짜 패턴 전부 추출
    const allDates = [...html.matchAll(/(\d{4}-\d{2}-\d{2})/g)].map(m => m[1]);
    const uniqueDates = [...new Set(allDates)].sort().reverse();

    // 白鸭绒 주변 컨텍스트
    const anchorIdx = html.indexOf('白鸭绒');
    const tableOpenIdx = anchorIdx !== -1 ? html.lastIndexOf('<table', anchorIdx) : -1;
    const tableCloseIdx = anchorIdx !== -1 ? html.indexOf('</table>', anchorIdx) : -1;
    const tableSnippet = tableOpenIdx !== -1 ? html.slice(tableOpenIdx, Math.min(tableOpenIdx + 2000, tableCloseIdx + 8)) : 'TABLE NOT FOUND';

    // 白鸭绒 주변 실제 HTML
    const aroundAnchor = anchorIdx !== -1
      ? html.slice(Math.max(0, anchorIdx - 300), anchorIdx + 500)
      : 'NOT FOUND';

    // 2026-07-03 주변
    const dateIdx = html.indexOf('2026-07-03');
    const aroundDate = dateIdx !== -1
      ? html.slice(Math.max(0, dateIdx - 200), dateIdx + 300)
      : 'NOT FOUND';

    // <table 태그가 전체 HTML에 있는지
    const tableCount = (html.match(/<table/gi) ?? []).length;

    return NextResponse.json({
      status: res.status,
      htmlLength: html.length,
      anchorIdx,
      tableCount,
      tableOpenIdx,
      uniqueDatesInPage: uniqueDates.slice(0, 10),
      aroundAnchor,
      aroundDate,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
