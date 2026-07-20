'use client';

import type { FxRates } from '@/app/lib/aggregate';
import { Currency, CURRENCIES, CURRENCY_LABELS, CURRENCY_SYMBOLS } from './constants';
import { FxBar } from './FxBar';
import { ClockBar } from './ClockBar';

interface FxSectionProps {
  fx: FxRates;
  currency: Currency;
  onCurrencyChange: (c: Currency) => void;
}

export function FxSection({ fx, currency, onCurrencyChange }: FxSectionProps) {
  return (
    <div id="sec-fx" className="space-y-4">
      <ClockBar />
      <section className="border border-black/8 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/6">
          <FxBar fx={fx} />
        </div>
        <div className="px-5 flex items-center gap-0">
          <span className="text-xs font-bold tracking-widest uppercase text-black/25 mr-3">통화</span>
          {CURRENCIES.map(c => (
            <button
              key={c}
              onClick={() => onCurrencyChange(c)}
              className="text-xs font-bold px-3 whitespace-nowrap transition-colors bg-transparent cursor-pointer"
              style={{
                paddingTop: 8,
                paddingBottom: 8,
                marginBottom: -1,
                border: 'none',
                borderBottom: currency === c ? '2px solid #111' : '2px solid transparent',
                color: currency === c ? '#111' : 'rgba(0,0,0,0.35)',
              }}
            >
              {CURRENCY_SYMBOLS[c]} {CURRENCY_LABELS[c]}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
