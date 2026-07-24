import { NextRequest } from 'next/server';
import { BuildingPermitItem } from '@/types/building';
import { fetchAll, delay } from '@/app/lib/building-api';
import { getLodgingCacheAll, setLodgingCacheRow } from '@/app/lib/db';
import bjdongData from '@/data/bjdong.json';
import sigunguData from '@/data/sigungu.json';

export const maxDuration = 300;

const BUSAN_SIGUNGU = [
  '26110', '26140', '26170', '26200', '26230', '26260',
  '26290', '26320', '26350', '26380', '26410', '26440',
  '26470', '26500', '26530', '26710',
];

const SIGUNGU_NAME: Record<string, string> = Object.fromEntries(
  (sigunguData as { code: string; name: string }[]).map((s) => [s.code, s.name])
);

function today() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

export async function GET(request: NextRequest) {
  const refresh = new URL(request.url).searchParams.get('refresh') === 'true';
  const encoder = new TextEncoder();
  const sse = (event: string, data: unknown) =>
    encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  const stream = new ReadableStream({
    async start(controller) {
      // 캐시 전체 조회
      const cached = await getLodgingCacheAll();
      const cachedMap = new Map(cached.map((r) => [r.bjdongKey, r]));

      const bjdongMap = bjdongData as Record<string, { c: string; n: string }[]>;

      // 전체 법정동 목록
      const allBjdong: { sigunguCd: string; bjdongCd: string; sigunguName: string; bjdongName: string }[] = [];
      for (const sigunguCd of BUSAN_SIGUNGU) {
        const sigunguName = SIGUNGU_NAME[sigunguCd] ?? sigunguCd;
        for (const bjdong of bjdongMap[sigunguCd] ?? []) {
          allBjdong.push({ sigunguCd, bjdongCd: bjdong.c, sigunguName, bjdongName: bjdong.n });
        }
      }

      // 오늘 캐시가 있는 법정동은 스킵
      const toFetch = refresh
        ? allBjdong
        : allBjdong.filter((b) => {
            const key = b.sigunguCd + b.bjdongCd;
            const row = cachedMap.get(key);
            return !row || row.cachedAt !== today();
          });

      if (toFetch.length === 0) {
        // 전부 캐시 히트
        const allItems = cached.flatMap((r) => r.data as BuildingPermitItem[]);
        controller.enqueue(sse('done', {
          fromCache: true,
          totalFetched: allItems.length,
          totalLodging: allItems.length,
          data: allItems,
        }));
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
      const CONCURRENCY = 5;

      for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
        const batch = toFetch.slice(i, i + CONCURRENCY);

        await Promise.all(batch.map(async ({ sigunguCd, bjdongCd, sigunguName, bjdongName }) => {
          const idx = ++current;
          controller.enqueue(sse('progress', { current: idx, total, sigunguName, bjdongName }));

          try {
            const items = await fetchAll(serviceKey, sigunguCd, bjdongCd);
            const lodging = items.filter((item) => item.mainPurpsCd === '15000');
            const key = sigunguCd + bjdongCd;
            await setLodgingCacheRow(key, today(), lodging);
            cachedMap.set(key, { bjdongKey: key, cachedAt: today(), data: lodging });
          } catch (err) {
            console.error(`[${sigunguCd}/${bjdongCd}] 오류:`, err);
          }
        }));

        await delay(50);
      }

      const allItems = Array.from(cachedMap.values()).flatMap((r) => r.data as BuildingPermitItem[]);
      controller.enqueue(sse('done', {
        fromCache: false,
        totalFetched: allItems.length,
        totalLodging: allItems.length,
        data: allItems,
      }));
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
