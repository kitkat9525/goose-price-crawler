import { NextRequest } from 'next/server';
import { BuildingPermitItem } from '@/types/building';
import { fetchAll, delay } from '@/app/lib/building-api';
import { getLodgingCacheAll, setLodgingCacheRow } from '@/app/lib/db';
import { BUSAN_SIGUNGU, SIGUNGU_NAME, todayStr } from '@/app/lib/busan';
import bjdongData from '@/data/bjdong.json';

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const refresh = new URL(request.url).searchParams.get('refresh') === 'true';
  const encoder = new TextEncoder();
  const sse = (event: string, data: unknown) =>
    encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  const stream = new ReadableStream({
    async start(controller) {
      const cached = await getLodgingCacheAll();
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
            return !row || row.cachedAt !== today;
          });

      if (toFetch.length === 0) {
        const allItems = cached.flatMap((r) => r.data as BuildingPermitItem[]);
        controller.enqueue(sse('done', { fromCache: true, totalLodging: allItems.length, data: allItems }));
        controller.close();
        return;
      }

      const serviceKey = process.env.OPEN_API_KEY ?? '';
      if (!serviceKey) {
        controller.enqueue(sse('error', { message: 'OPEN_API_KEY가 설정되지 않았습니다.' }));
        controller.close();
        return;
      }

      const total = toFetch.length;
      let current = 0;

      for (const { sigunguCd, bjdongCd, sigunguName, bjdongName } of toFetch) {
        current++;
        controller.enqueue(sse('progress', { current, total, sigunguName, bjdongName }));
        try {
          const items = await fetchAll(serviceKey, sigunguCd, bjdongCd);
          const lodging = items.filter((item) => item.mainPurpsCd === '15000');
          const key = sigunguCd + bjdongCd;
          await setLodgingCacheRow(key, today, lodging);
          cachedMap.set(key, { bjdongKey: key, cachedAt: today, data: lodging });
        } catch (err) {
          console.error(`[busan-lodging] ${sigunguCd}/${bjdongCd}:`, err);
        }
        await delay(150);
      }

      const allItems = Array.from(cachedMap.values()).flatMap((r) => r.data as BuildingPermitItem[]);
      controller.enqueue(sse('done', { fromCache: false, totalLodging: allItems.length, data: allItems }));
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
