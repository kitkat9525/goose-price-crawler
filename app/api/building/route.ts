import { NextRequest, NextResponse } from 'next/server';
import { fetchAll, delay } from '@/app/lib/building-api';
import { getBuildingCacheAll, getBuildingSummary, setBuildingCacheRow } from '@/app/lib/db';
import { BUSAN_SIGUNGU, SIGUNGU_NAME, todayStr } from '@/app/lib/busan';
import bjdongData from '@/data/bjdong.json';

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const refresh = new URL(request.url).searchParams.get('refresh') === 'true';

  const cached = await getBuildingCacheAll();
  const cachedMap = new Map(cached.map((r) => [r.bjdongKey, r]));
  const bjdongMap = bjdongData as Record<string, { c: string; n: string }[]>;

  const allBjdong: { sigunguCd: string; bjdongCd: string; sigunguName: string; bjdongName: string }[] = [];
  for (const sigunguCd of BUSAN_SIGUNGU) {
    const sigunguName = SIGUNGU_NAME[sigunguCd] ?? sigunguCd;
    for (const bjdong of bjdongMap[sigunguCd] ?? []) {
      allBjdong.push({ sigunguCd, bjdongCd: bjdong.c, sigunguName, bjdongName: bjdong.n });
    }
  }

  const today = todayStr();
  const toFetch = refresh
    ? allBjdong
    : allBjdong.filter((b) => {
        const row = cachedMap.get(b.sigunguCd + b.bjdongCd);
        return row != null && row.cachedAt !== today;
      });

  // 캐시 히트: summary만 바로 반환
  if (toFetch.length === 0) {
    const summary = await getBuildingSummary();
    return NextResponse.json({ summary });
  }

  // 캐시 미스: SSE로 진행상황 스트리밍
  const serviceKey = process.env.OPEN_API_KEY ?? '';
  if (!serviceKey) {
    return NextResponse.json({ error: 'OPEN_API_KEY가 설정되지 않았습니다.' }, { status: 500 });
  }

  const encoder = new TextEncoder();
  const sse = (event: string, data: unknown) =>
    encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  const stream = new ReadableStream({
    async start(controller) {
      const total = toFetch.length;
      let current = 0;

      for (const { sigunguCd, bjdongCd, sigunguName, bjdongName } of toFetch) {
        current++;
        controller.enqueue(sse('progress', { current, total, sigunguName, bjdongName }));
        try {
          const items = await fetchAll(serviceKey, sigunguCd, bjdongCd);
          const filtered = items.filter((item) => item.mainPurpsCd === '15000');
          const key = sigunguCd + bjdongCd;
          await setBuildingCacheRow(key, today, filtered);
          cachedMap.set(key, { bjdongKey: key, cachedAt: today, data: filtered });
        } catch (err) {
          console.error(`[api/building] ${sigunguCd}/${bjdongCd}:`, err);
        }
        await delay(150);
      }

      const summary = await getBuildingSummary();
      controller.enqueue(sse('done', { summary }));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
