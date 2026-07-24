import { fetchPrices, PriceData } from '@/app/lib/prices';
import { fetchFxRates, FxRates } from '@/app/lib/sources/fx';
import { fetchCustomsData, CustomsData } from '@/app/lib/sources/customs';

export type { PriceData, FxRates, CustomsData };
export type { PriceEntry, CategoryPrices } from '@/app/lib/prices';
export type { CustomsMonthData } from '@/app/lib/sources/customs';

export interface AggregatedData {
  fetchedAt: string;
  fx: FxRates;
  cfd: PriceData;
  customs: CustomsData | null;
}

export async function aggregate(): Promise<AggregatedData> {
  const [cfd, fx, customs] = await Promise.all([
    fetchPrices(),
    fetchFxRates(),
    fetchCustomsData(),
  ]);

  return {
    fetchedAt: new Date().toISOString(),
    fx,
    cfd,
    customs,
  };
}
