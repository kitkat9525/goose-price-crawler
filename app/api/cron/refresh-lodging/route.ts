import { NextRequest, NextResponse } from 'next/server';
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
  // Vercel cron 보안 헤더 검증
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

  const allBjdong: { sigunguCd: string; bjdongCd: string }[] = [];
  for (const sigunguCd of BUSAN_SIGUNGU) {
    for (const bjdong of bjdongMap[sigunguCd] ?? []) {
      allBjdong.push({ sigunguCd, bjdongCd: bjdong.c });
    }
  }

  const toFetch = allBjdong.filter((b) => {
    const row = cachedMap.get(b.sigunguCd + b.bjdongCd);
    return !row || row.cachedAt !== today();
  });

  let fetched = 0;
  let errors = 0;

  for (const { sigunguCd, bjdongCd } of toFetch) {
    try {
      const items = await fetchAll(serviceKey, sigunguCd, bjdongCd);
      const lodging = items.filter((item: BuildingPermitItem) => item.mainPurpsCd === '15000');
      await setLodgingCacheRow(sigunguCd + bjdongCd, today(), lodging);
      fetched++;
    } catch (err) {
      console.error(`[${sigunguCd}/${bjdongCd}] 오류:`, err);
      errors++;
    }
    await delay(150);
  }

  console.log(`[cron] refresh-lodging 완료: ${fetched}개 갱신, ${errors}개 오류`);
  return NextResponse.json({ ok: true, fetched, errors, skipped: allBjdong.length - toFetch.length });
}
