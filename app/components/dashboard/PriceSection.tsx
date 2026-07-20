import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { CategoryPrices, PriceEntry, FxRates } from '@/app/lib/aggregate';
import { Currency, convert, fmtPrice, fmtNum, CURRENCY_SYMBOLS } from './constants';

export function PriceRow({ entry, currency, fx }: { entry: PriceEntry; currency: Currency; fx: FxRates }) {
  const current = convert(entry.current, currency, fx);
  const diff    = convert(Math.abs(entry.diff), currency, fx);
  const isDown  = entry.diff <= 0;

  return (
    <tr className="border-t border-black/5 hover:bg-black/[0.02] transition-colors">
      <td className="py-2.5 px-4 text-xs font-bold text-black/35 w-16">{entry.grade}</td>
      <td className="py-2.5 px-4 text-right">
        <span className="text-sm font-bold text-black">{fmtPrice(current, currency)}<span className="text-xs font-normal text-black/30">/kg</span></span>
      </td>
      <td className="py-2.5 px-4 text-right">
        <span className={`text-xs font-medium ${isDown ? 'text-black/40' : 'text-black/70'}`}>
          {isDown ? '▼' : '▲'} {fmtPrice(diff, currency)}
        </span>
        {entry.yoy && <span className="text-xs text-black/20 ml-1">({entry.yoy})</span>}
      </td>
    </tr>
  );
}

export function CategoryCard({ cat, currency, fx }: { cat: CategoryPrices; currency: Currency; fx: FxRates }) {
  const isGoose = cat.type === 'goose';
  const top = cat.prices.find(p => p.grade === '90%');

  return (
    <div className="bg-white border border-black/8 overflow-hidden">
      <div className="px-4 py-4 bg-black">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-white/40 tracking-widest uppercase mb-1">
              {isGoose ? 'Goose Down' : 'Duck Down'} · {cat.color === 'white' ? 'White' : 'Grey'}
            </p>
            <h3 className="text-lg font-black text-white leading-tight">{cat.nameKr}</h3>
            <p className="text-xs text-white/30 mt-0.5">{cat.name}</p>
          </div>
          {top && (
            <div className="text-right shrink-0">
              <p className="text-xs text-white/30 mb-0.5">90% 기준</p>
              <p className="text-2xl font-black text-white leading-none">{fmtPrice(convert(top.current, currency, fx), currency)}</p>
              <p className="text-xs text-white/30 mt-0.5">/kg</p>
            </div>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px]">
          <thead>
            <tr className="border-b border-black/5">
              <th className="py-2 px-3 sm:px-4 text-left text-xs text-black/25 font-bold">등급</th>
              <th className="py-2 px-3 sm:px-4 text-right text-xs text-black/25 font-bold">이번 주</th>
              <th className="py-2 px-3 sm:px-4 text-right text-xs text-black/25 font-bold">전주 대비</th>
            </tr>
          </thead>
          <tbody>
            {cat.prices.map(entry => (
              <PriceRow key={entry.grade} entry={entry} currency={currency} fx={fx} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const CFD_CHART_COLORS = ['#111111', '#888888'];
const CFD_GRADES = ['70%', '80%', '90%', '95%'];

export function CfdBarChart({ categories, currency, fx, label }: {
  categories: CategoryPrices[]; currency: Currency; fx: FxRates; label: string;
}) {
  const sym = CURRENCY_SYMBOLS[currency];
  const chartData = CFD_GRADES.map(grade => {
    const row: Record<string, string | number> = { grade };
    categories.forEach(cat => {
      const entry = cat.prices.find(p => p.grade === grade);
      if (entry) row[cat.nameKr] = parseFloat(convert(entry.current, currency, fx).toFixed(2));
    });
    return row;
  });

  return (
    <div className="border border-black/8 overflow-hidden">
      <div className="px-5 py-4 border-b border-black/5">
        <p className="text-xs font-bold text-black/40 uppercase tracking-widest">{label} — 등급별 시세 비교</p>
      </div>
      <div className="px-4 py-5">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={4}>
            <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.05)" />
            <XAxis dataKey="grade" tick={{ fontSize: 11, fill: 'rgba(0,0,0,0.35)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'rgba(0,0,0,0.35)' }} axisLine={false} tickLine={false} tickFormatter={v => `${sym}${v}`} width={56} />
            <Tooltip
              contentStyle={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: 0, fontSize: 12 }}
              labelStyle={{ color: 'rgba(0,0,0,0.75)', fontWeight: 700 }}
              itemStyle={{ fontWeight: 700 }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => [`${sym}${fmtNum(Number(v ?? 0))}/kg`]}
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', paddingTop: 8 }} />
            {categories.map((cat, idx) => (
              <Bar key={cat.name} dataKey={cat.nameKr} fill={CFD_CHART_COLORS[idx % CFD_CHART_COLORS.length]} radius={[0, 0, 0, 0]} maxBarSize={36} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
