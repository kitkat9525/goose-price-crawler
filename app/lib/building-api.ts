import { BuildingPermitItem, BuildingPermitResponse } from '@/types/building';

const BASE_URL =
  'https://apis.data.go.kr/1613000/ArchPmsHubService/getApBasisOulnInfo';

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchPage(
  serviceKey: string,
  baseParams: URLSearchParams,
  pageNo: number,
  numOfRows: number
): Promise<{ items: BuildingPermitItem[]; totalCount: number }> {
  const params = new URLSearchParams(baseParams);
  params.set('pageNo', String(pageNo));
  params.set('numOfRows', String(numOfRows));

  const url = `${BASE_URL}?serviceKey=${encodeURIComponent(serviceKey)}&${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const json: BuildingPermitResponse = await response.json();
  const { header, body } = json.response;

  if (header.resultCode !== '00') {
    throw new Error(`[${header.resultCode}] ${header.resultMsg}`);
  }

  if (!body.items?.item) {
    return { items: [], totalCount: body.totalCount ?? 0 };
  }

  const items: BuildingPermitItem[] = Array.isArray(body.items.item)
    ? body.items.item
    : [body.items.item];

  return { items, totalCount: body.totalCount };
}

export async function fetchAll(
  serviceKey: string,
  sigunguCd: string,
  bjdongCd: string,
  extra: Record<string, string> = {}
): Promise<BuildingPermitItem[]> {
  const baseParams = new URLSearchParams({
    sigunguCd,
    bjdongCd,
    platGbCd: '0',
    _type: 'json',
    ...extra,
  });

  const first = await fetchPage(serviceKey, baseParams, 1, 100);
  const totalPages = Math.ceil(first.totalCount / 100);
  const allItems = [...first.items];

  for (let page = 2; page <= totalPages; page++) {
    await delay(150);
    const { items } = await fetchPage(serviceKey, baseParams, page, 100);
    allItems.push(...items);
  }

  return allItems;
}
