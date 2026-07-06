import type { FxRates } from '@/app/lib/aggregate';
import { KEY, KEY_BG, KEY_BORDER, fmtNum } from './constants';

export function FxBar({ fx }: { fx: FxRates }) {
  const eurKrw = fx.KRW / fx.EUR;
  const usdKrw = fx.KRW / fx.USD;
  const cnyKrw = fx.KRW;

  const lastUpdated = fx.lastUpdatedUtc
    ? (() => {
        try {
          return new Date(fx.lastUpdatedUtc).toLocaleString('ko-KR', {
            timeZone: 'Asia/Seoul',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit',
          }) + ' KST';
        } catch { return fx.lastUpdatedUtc; }
      })()
    : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="text-xs text-black/35 font-medium">€1 EUR =</span>
        <span className="text-xl font-bold text-black">₩{fmtNum(eurKrw, 0)}</span>
        <span className="text-xs text-black/30">KRW</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-black/5 pt-2">
        <span className="text-xs text-black/30 font-medium">참고</span>
        <span className="text-xs text-black/50">$1 USD = <span className="font-semibold text-black/70">₩{fmtNum(usdKrw, 0)}</span></span>
        <span className="text-xs text-black/50">¥1 CNY = <span className="font-semibold text-black/70">₩{fmtNum(cnyKrw, 2)}</span></span>
        {lastUpdated && <span className="text-xs text-black/25 ml-auto">기준 {lastUpdated}</span>}
      </div>
    </div>
  );
}
