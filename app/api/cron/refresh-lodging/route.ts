import { NextRequest, NextResponse } from 'next/server';
import { BuildingPermitItem } from '@/types/building';
import { fetchAll, delay } from '@/app/lib/building-api';
import { getLodgingCacheAll, setLodgingCacheRow } from '@/app/lib/db';
import { BUSAN_SIGUNGU, todayStr } from '@/app/lib/busan';
import bjdongData from '@/data/bjdong.json';

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceKey = process.env.OPEN_API_KEY ?? '';
  if (!serviceKey) {
    return NextResponse.json({ error: 'OPEN_API_KEY 없음' }, { status: 500 });
  }

  const cached = await getLodgingCacheAll();
  const cachedMap = new Map(cached.map((r) => [r.bjdongKey, r]));
  const bjdongMap = bjdongData as Record<string, { c: string; n: string }[]>;
  const today = todayStr();

  const allBjdong: { sigunguCd: string; bjdongCd: string }[] = [];
  for (const sigunguCd of BUSAN_SIGUNGU) {
    for (const bjdong of bjdongMap[sigunguCd] ?? []) {
      allBjdong.push({ sigunguCd, bjdongCd: bjdong.c });
    }
  }

  const toFetch = allBjdong.filter((b) => {
    const row = cachedMap.get(b.sigunguCd + b.bjdongCd);
    return !row || row.cachedAt !== today;
  });

  let fetched = 0;
  let errors = 0;

  for (const { sigunguCd, bjdongCd } of toFetch) {
    try {
      const items = await fetchAll(serviceKey, sigunguCd, bjdongCd);
      const lodging = items.filter((item: BuildingPermitItem) => item.mainPurpsCd === '15000');
      await setLodgingCacheRow(sigunguCd + bjdongCd, today, lodging);
      fetched++;
    } catch (err) {
      console.error(`[cron/refresh-lodging] ${sigunguCd}/${bjdongCd}:`, err);
      errors++;
    }
    await delay(150);
  }

  return NextResponse.json({ ok: true, fetched, errors, skipped: allBjdong.length - toFetch.length });
}
