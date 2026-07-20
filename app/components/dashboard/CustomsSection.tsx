import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import type { CustomsMonthData } from '@/app/lib/aggregate';
import { Currency, fmtNum, CURRENCY_SYMBOLS } from './constants';

export function CustomsLineChart({ months, currency, fxKrw, fxUsd, fxEur }: {
  months: CustomsMonthData[]; currency: Currency; fxKrw: number; fxUsd: number; fxEur: number;
}) {
  const sym = CURRENCY_SYMBOLS[currency];
  const unitLabel = currency === 'KRW' ? '₩/kg' : `${sym}/kg`;

  const toDisplay = (usdPerKg: number): number => {
    if (currency === 'KRW') return parseFloat((usdPerKg * (fxKrw / fxUsd)).toFixed(0));
    if (currency === 'CNY') return parseFloat((usdPerKg / fxUsd).toFixed(2));
    if (currency === 'EUR') return parseFloat((usdPerKg * (fxEur / fxUsd)).toFixed(2));
    return parseFloat(usdPerKg.toFixed(2));
  };

  const chartData = [...months]
    .sort((a, b) => a.period.localeCompare(b.period))
    .map(m => ({
      label: m.periodLabel.replace('년 ', '.').replace('월', ''),
      단가:   toDisplay(m.unitPrice),
      수입량: parseFloat((m.importVolume / 1000).toFixed(1)),
    }));

  const tooltipStyle = { border: '1px solid rgba(0,0,0,0.1)', borderRadius: 0, fontSize: 12 };

  return (
    <div className="border border-black/8 overflow-hidden">
      <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
        <p className="text-xs font-bold text-black/40 uppercase tracking-widest">평균 수입단가 추이</p>
        <p className="text-xs text-black/25">HS 0505100000 · 거위·오리 합산</p>
      </div>
      <div className="px-4 py-4">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.05)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'rgba(0,0,0,0.35)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'rgba(0,0,0,0.35)' }} axisLine={false} tickLine={false} tickFormatter={v => `${sym}${v}`} width={52} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ color: 'rgba(0,0,0,0.75)', fontWeight: 700 }}
              itemStyle={{ fontWeight: 700 }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => [`${sym}${fmtNum(Number(v ?? 0), currency === 'KRW' ? 0 : 2)} ${unitLabel}`]}
              cursor={{ stroke: 'rgba(0,0,0,0.08)' }}
            />
            <Line type="monotone" dataKey="단가" stroke="#111" strokeWidth={2} dot={{ r: 4, fill: '#111', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#111' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="px-4 pb-4 border-t border-black/5 pt-3">
        <p className="text-xs text-black/25 mb-3 px-1">수입량 (톤)</p>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={chartData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.05)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.3)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.3)' }} axisLine={false} tickLine={false} width={36} tickFormatter={v => `${v}t`} />
            <Tooltip
              contentStyle={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: 0, fontSize: 12 }}
              labelStyle={{ color: 'rgba(0,0,0,0.75)', fontWeight: 700 }}
              itemStyle={{ fontWeight: 700 }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => [`${v ?? 0}톤`]}
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
            />
            <Bar dataKey="수입량" fill="rgba(0,0,0,0.15)" radius={[0, 0, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CustomsTable({ months, fxKrw, fxUsd }: { months: CustomsMonthData[]; fxKrw: number; fxUsd: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[320px]">
        <thead>
          <tr className="border-b border-black/8">
            <th className="py-2.5 px-3 sm:px-4 text-left text-xs text-black/30 font-bold">기간</th>
            <th className="py-2.5 px-3 sm:px-4 text-right text-xs text-black/30 font-bold">수입량</th>
            <th className="py-2.5 px-3 sm:px-4 text-right text-xs text-black/30 font-bold hidden sm:table-cell">수입금액</th>
            <th className="py-2.5 px-3 sm:px-4 text-right text-xs text-black/30 font-bold">평균 수입단가</th>
            <th className="py-2.5 px-3 sm:px-4 text-right text-xs text-black/30 font-bold hidden sm:table-cell">원화 환산</th>
          </tr>
        </thead>
        <tbody>
          {months.map(m => (
            <tr key={m.period} className="border-t border-black/5 hover:bg-black/[0.02]">
              <td className="py-3 px-3 sm:px-4 font-bold text-black/70 text-xs sm:text-sm">{m.periodLabel}</td>
              <td className="py-3 px-3 sm:px-4 text-right text-black/50 text-xs sm:text-sm">
                {m.importVolume >= 1000 ? `${fmtNum(m.importVolume / 1000, 1)}톤` : `${fmtNum(m.importVolume, 0)}kg`}
              </td>
              <td className="py-3 px-3 sm:px-4 text-right text-black/50 text-xs sm:text-sm hidden sm:table-cell">${fmtNum(m.importValue, 0)}</td>
              <td className="py-3 px-3 sm:px-4 text-right font-black text-black text-xs sm:text-sm">${fmtNum(m.unitPrice, 2)}/kg</td>
              <td className="py-3 px-3 sm:px-4 text-right text-black/40 text-xs sm:text-sm hidden sm:table-cell">
                ₩{Math.round(m.unitPrice * (fxKrw / fxUsd)).toLocaleString('ko-KR')}/kg
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
