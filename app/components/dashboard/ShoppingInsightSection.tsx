'use client';

import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { KEY } from './constants';
import { SectionLabel } from './SectionLabel';

// ─── 타입 ────────────────────────────────────────
interface InsightPoint     { period: string; ratio: number; }
interface InsightBreakdown { group: string;  ratio: number; }
interface InsightTrend     { title: string;  data: InsightPoint[]; }
interface InsightData {
  source:  'live' | 'unavailable';
  trends:  InsightTrend[];
  device?: Record<string, InsightBreakdown[]>;
  gender?: Record<string, InsightBreakdown[]>;
  age?:    Record<string, InsightBreakdown[]>;
  error?:  string;
}

// ─── 상수 ────────────────────────────────────────
const INSIGHT_KEYWORDS = ['구스이불', '구스베개', '구스토퍼'];
const DEVICE_LABEL: Record<string, string> = { pc: 'PC', mo: '모바일' };
const GENDER_LABEL: Record<string, string> = { f: '여성', m: '남성' };
const AGE_LABEL:    Record<string, string> = {
  '10': '10대', '20': '20대', '30': '30대',
  '40': '40대', '50': '50대', '60': '60대+',
};
const INSIGHT_COLORS = ['#111111', KEY];

// ─── 유틸 ────────────────────────────────────────
function aggregateByGroup(data: InsightBreakdown[]): InsightBreakdown[] {
  const sums: Record<string, { total: number; count: number }> = {};
  for (const d of data) {
    if (!sums[d.group]) sums[d.group] = { total: 0, count: 0 };
    sums[d.group].total += d.ratio;
    sums[d.group].count += 1;
  }
  return Object.entries(sums).map(([group, { total, count }]) => ({
    group,
    ratio: parseFloat((total / count).toFixed(1)),
  }));
}

// ─── 가로 바 차트 (기기별·성별·연령별 공용) ──────
function HBarChart({ data, labelMap, colors }: {
  data: InsightBreakdown[];
  labelMap: Record<string, string>;
  colors?: string[];
}) {
  const mapped = data.map(d => ({
    name:  labelMap[d.group] ?? d.group,
    ratio: parseFloat(Number(d.ratio).toFixed(1)),
  }));
  const maxRatio = Math.max(...mapped.map(d => d.ratio), 1);
  const palette = colors ?? INSIGHT_COLORS;

  if (!mapped.length) return <p className="text-xs text-black/25 text-center py-4">데이터 없음</p>;

  return (
    <div className="flex flex-col gap-2">
      {mapped.map((d, i) => (
        <div key={d.name} className="flex items-center gap-2">
          <span className="text-xs text-black/45 shrink-0" style={{ width: 44, textAlign: 'right' }}>{d.name}</span>
          <div className="flex-1 h-5 rounded bg-black/[0.06] overflow-hidden">
            <div
              className="h-full rounded flex items-center transition-all duration-500"
              style={{ width: `${d.ratio}%`, backgroundColor: palette[i % palette.length] }}
            >
              {d.ratio >= 12 && (
                <span className="text-[10px] font-semibold text-white pl-2">{d.ratio}%</span>
              )}
            </div>
          </div>
          {d.ratio < 12 && (
            <span className="text-[10px] font-semibold text-black/40 shrink-0">{d.ratio}%</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── 메인 섹션 ───────────────────────────────────
export function ShoppingInsightSection() {
  const [data, setData]       = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive]   = useState(INSIGHT_KEYWORDS[0]);

  useEffect(() => {
    fetch('/api/shopping-insight')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const trend      = data?.trends.find(t => t.title === active);
  const chartData  = (trend?.data ?? []).map(d => ({
    label:     d.period.slice(5, 7) + '월',
    fullLabel: d.period.slice(0, 7).replace('-', '.'),
    ratio:     parseFloat(Number(d.ratio).toFixed(1)),
  }));
  const deviceData = aggregateByGroup(data?.device?.[active] ?? []);
  const genderData = aggregateByGroup(data?.gender?.[active] ?? []);
  const ageData    = aggregateByGroup(data?.age?.[active]    ?? []);

  return (
    <section id="sec-insight" className="mb-10">
      <SectionLabel title="쇼핑 인사이트" sub="네이버 쇼핑인사이트 · 클릭 지수 기준" />

      {loading && (
        <div className="border border-black/8 rounded-2xl flex items-center justify-center py-12 text-sm text-black/30">
          불러오는 중...
        </div>
      )}

      {!loading && (!data || data.source === 'unavailable') && (
        <div className="border border-black/6 rounded-2xl px-5 py-10 text-center">
          {data?.error === 'naver_key_missing'
            ? <>
                <p className="text-sm font-medium text-black/50">네이버 API 키가 설정되지 않았습니다</p>
                <p className="text-xs text-black/30 mt-1">
                  <code className="bg-black/5 px-1 rounded">NAVER_CLIENT_ID</code> /{' '}
                  <code className="bg-black/5 px-1 rounded">NAVER_CLIENT_SECRET</code> 필요
                </p>
              </>
            : <p className="text-sm text-black/40">데이터를 불러오지 못했습니다</p>
          }
        </div>
      )}

      {!loading && data?.source === 'live' && (
        <div className="border border-black/8 rounded-2xl overflow-hidden">
          {/* 키워드 탭 */}
          <div className="px-5 py-3 border-b border-black/5 flex items-center gap-2">
            {INSIGHT_KEYWORDS.map(k => (
              <button key={k} onClick={() => setActive(k)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
                style={active === k ? { backgroundColor: KEY, color: '#fff' } : { color: 'rgba(0,0,0,0.35)' }}
              >
                {k}
              </button>
            ))}
          </div>

          {/* 월별 클릭 트렌드 */}
          <div className="px-5 pt-5 pb-3">
            <p className="text-xs font-semibold text-black/35 uppercase tracking-widest mb-3">월별 클릭 트렌드</p>
            {chartData.length === 0
              ? <p className="text-xs text-black/25 text-center py-6">데이터 없음</p>
              : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'rgba(0,0,0,0.35)' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'rgba(0,0,0,0.35)' }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip
                      contentStyle={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                      labelStyle={{ color: 'rgba(0,0,0,0.75)', fontWeight: 600 }}
          itemStyle={{ fontWeight: 700 }}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel ?? ''}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: any) => [v, '클릭 지수']}
                      cursor={{ stroke: 'rgba(0,0,0,0.08)' }}
                    />
                    <Line type="monotone" dataKey="ratio" stroke={KEY} strokeWidth={2}
                      dot={{ r: 4, fill: KEY, strokeWidth: 0 }} activeDot={{ r: 5, fill: KEY }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )
            }
          </div>

          {/* 기기별 · 성별 · 연령별 */}
          <div className="grid grid-cols-2 border-t border-black/5">
            {/* 좌: 기기별 + 성별 */}
            <div className="px-5 py-4 border-r border-black/5 flex flex-col gap-5">
              <div>
                <p className="text-xs font-semibold text-black/35 uppercase tracking-widest mb-3">기기별</p>
                <HBarChart data={deviceData} labelMap={DEVICE_LABEL} />
              </div>
              <div>
                <p className="text-xs font-semibold text-black/35 uppercase tracking-widest mb-3">성별</p>
                <HBarChart data={genderData} labelMap={GENDER_LABEL} />
              </div>
            </div>
            {/* 우: 연령별 */}
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-black/35 uppercase tracking-widest mb-3">연령별</p>
              <HBarChart
                data={ageData}
                labelMap={AGE_LABEL}
                colors={[KEY, KEY, KEY, '#111', KEY, KEY]}
              />
            </div>
          </div>

          {/* 푸터 */}
          <div className="px-5 py-2.5 border-t border-black/5 bg-black/[0.015]">
            <p className="text-xs text-black/25">
              출처: 네이버 쇼핑인사이트 · 기간 내 최대값=100 기준 상대값 · 실제 판매량과 다를 수 있음
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
