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

    return NextResponse.json({
      status: res.status,
      htmlLength: html.length,
      anchorIdx,
      tableOpenIdx,
      allDatesInTable: tableOpenIdx !== -1
        ? [...html.slice(tableOpenIdx, tableCloseIdx + 8).matchAll(/(\d{4}-\d{2}-\d{2})/g)].map(m => m[1])
        : [],
      uniqueDatesInPage: uniqueDates.slice(0, 10),
      tableSnippet,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
