'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { AggregatedData } from '@/app/lib/aggregate';
import type { PriceData } from '@/app/lib/prices';
import { CUSTOMS_HS_NOTE } from '@/app/lib/sources/customs';

import {
  KEY, KEY_BG, KEY_BORDER, SETTINGS_KEY, NAV_SECTIONS,
  Currency, CURRENCY_LABELS, CURRENCY_SYMBOLS,
} from './dashboard/constants';
import { SectionLabel }                  from './dashboard/SectionLabel';
import { FeedbackModal }                 from './dashboard/FeedbackModal';
import { FxBar }                         from './dashboard/FxBar';
import { CategoryCard, CfdBarChart }     from './dashboard/PriceSection';
import { CustomsLineChart, CustomsTable } from './dashboard/CustomsSection';
import { NewsSections }                  from './dashboard/NewsSection';
import { ShoppingSection }               from './dashboard/ShoppingSection';
import { ShoppingInsightSection }        from './dashboard/ShoppingInsightSection';
import { NoticePopup }                   from './dashboard/NoticePopup';

// ─── CFD 규격 상수 ───────────────────────────────
const CFD_STANDARDS = [
  { key: '服标', label: '중국의류표준' },
  { key: '寝标', label: '중국침구표준' },
  { key: '国标', label: '중국국가표준' },
  { key: '欧标', label: '유럽표준' },
  { key: '美标', label: '미국표준' },
  { key: '日标', label: '일본표준' },
] as const;

const CURRENCIES: Currency[] = ['CNY', 'USD', 'KRW', 'EUR'];

// ─── 컴포넌트 ────────────────────────────────────
export default function Dashboard({ data }: { data: AggregatedData }) {
  const router = useRouter();

  // 통화 설정
  const [currency, setCurrency] = useState<Currency>('KRW');

  // UI 상태
  const [showFeedback, setShowFeedback] = useState(false);
  const [activeSection, setActiveSection] = useState('sec-fx');

  // CFD 규격 탭 상태
  const [cfdStandard, setCfdStandard] = useState<string>('服标');
  const [cfdData, setCfdData] = useState<PriceData>(data.cfd);
  const [cfdLoading, setCfdLoading] = useState(false);

  // 로컬스토리지에서 통화 설정 복원
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
      if (s.currency) setCurrency(s.currency);
    } catch {}
  }, []);

  // 스크롤 위치에 따른 활성 섹션 추적
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveSection(visible[0].target.id);
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );
    NAV_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // ─── 핸들러 ──────────────────────────────────
  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' });
  }

  function saveCurrency(c: Currency) {
    setCurrency(c);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ currency: c })); } catch {}
  }

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/');
  }

  async function switchStandard(key: string) {
    if (key === cfdStandard || cfdLoading) return;
    setCfdStandard(key);
    setCfdLoading(true);
    try {
      const res = await fetch(`/api/cfd?standard=${encodeURIComponent(key)}`);
      const json: PriceData = await res.json();
      setCfdData(json);
    } catch {
      // 실패 시 현재 데이터 유지
    } finally {
      setCfdLoading(false);
    }
  }

  // ─── 파생 데이터 ─────────────────────────────
  const { fx, customs } = data;
  const goose = cfdData.categories.filter(c => c.type === 'goose');
  const duck  = cfdData.categories.filter(c => c.type === 'duck');
  const currentStandardLabel = CFD_STANDARDS.find(s => s.key === cfdStandard)?.label ?? '';

  return (
    <div className="min-h-screen bg-white">
      <NoticePopup />
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}

      {/* ── 헤더 ── */}
      <header className="border-b border-black/6 px-4 sm:px-6 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 py-3">
          <h1 className="text-base sm:text-lg font-bold text-black tracking-tight shrink-0">구초뉴스</h1>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setShowFeedback(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-all"
              style={{ backgroundColor: KEY_BG, color: KEY, borderColor: KEY_BORDER }}
            >
              의견보내기
            </button>
            <button
              onClick={handleLogout}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border border-black/10 text-black/35 hover:text-black hover:border-black/30 transition-all"
            >
              로그아웃
            </button>
          </div>
        </div>
        <div className="overflow-x-auto border-t border-black/5" style={{ scrollbarWidth: 'none' }}>
          <nav className="flex items-center gap-1 px-4 pb-2.5 pt-2" style={{ width: 'fit-content', margin: '0 auto' }}>
            {NAV_SECTIONS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="shrink-0 text-xs font-semibold px-3 py-1 rounded-full transition-all whitespace-nowrap"
                style={activeSection === id
                  ? { backgroundColor: KEY, color: '#fff' }
                  : { color: 'rgba(0,0,0,0.35)', backgroundColor: 'transparent' }
                }
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-12 sm:space-y-16">

        {/* ── 환율 ── */}
        <section id="sec-fx" className="border border-black/6 rounded-2xl px-5 py-4 space-y-4">
          <FxBar fx={fx} />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-black/30 font-medium mr-1">통화</span>
            {CURRENCIES.map(c => (
              <button
                key={c}
                onClick={() => saveCurrency(c)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-all"
                style={currency === c
                  ? { backgroundColor: KEY, color: 'white', borderColor: KEY }
                  : { backgroundColor: 'white', color: 'rgba(0,0,0,0.45)', borderColor: 'rgba(0,0,0,0.12)' }
                }
              >
                {CURRENCY_SYMBOLS[c]} {CURRENCY_LABELS[c]}
              </button>
            ))}
          </div>
        </section>

        {/* ── 표준규격 + 거위털 + 오리털 ── */}
        <div id="sec-goose" className="space-y-6">
          <div>
            <SectionLabel title="표준 규격" sub="해당 규격에 맞춘 중국산 원자재의 가격입니다." subStyle={{ color: '#c0392b' }} />
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
              {CFD_STANDARDS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => switchStandard(key)}
                  disabled={cfdLoading}
                  className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all whitespace-nowrap"
                  style={cfdStandard === key
                    ? { backgroundColor: '#111', color: 'white', borderColor: '#111' }
                    : { backgroundColor: 'white', color: 'rgba(0,0,0,0.45)', borderColor: 'rgba(0,0,0,0.12)' }
                  }
                >
                  {label}
                </button>
              ))}
              {cfdLoading && (
                <span className="text-xs shrink-0 ml-2" style={{ color: 'rgba(0,0,0,0.3)' }}>로딩 중…</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <section style={{ opacity: cfdLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
            <SectionLabel
              title="거위털 — Goose Down"
              sub={`CFD · ${currentStandardLabel} · 마지막 업데이트 ${cfdData.updatedAt}`}
            />
            <div className="space-y-4">
              <CfdBarChart categories={goose} currency={currency} fx={fx} label="거위털" />
              <div className="flex flex-col gap-4">
                {goose.map(cat => <CategoryCard key={cat.name} cat={cat} currency={currency} fx={fx} />)}
              </div>
            </div>
          </section>

          <section style={{ opacity: cfdLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
            <SectionLabel
              title="오리털 — Duck Down"
              sub={`CFD · ${currentStandardLabel} · 마지막 업데이트 ${cfdData.updatedAt}`}
            />
            <div className="space-y-4">
              <CfdBarChart categories={duck} currency={currency} fx={fx} label="오리털" />
              <div className="flex flex-col gap-4">
                {duck.map(cat => <CategoryCard key={cat.name} cat={cat} currency={currency} fx={fx} />)}
              </div>
            </div>
          </section>
          </div>
        </div>

        {/* ── 관세청 수입통계 ── */}
        <section id="sec-customs">
          <SectionLabel title="한국 수입 통계 — 관세청" sub="월별 집계 · 매월 15일경 업데이트" />

          {!customs && (
            <div className="border border-black/6 rounded-2xl px-5 py-10 text-center">
              <p className="text-sm font-medium text-black/50">관세청 API 키가 설정되지 않았습니다</p>
              <p className="text-xs text-black/30 mt-1">
                <code className="bg-black/5 px-1 rounded">.env.local</code>에{' '}
                <code className="bg-black/5 px-1 rounded">CUSTOMS_API_KEY</code> 추가 필요
              </p>
              <a
                href="https://www.data.go.kr/data/15101609/openapi.do"
                target="_blank" rel="noopener noreferrer"
                className="inline-block mt-2 text-xs text-black underline underline-offset-2"
              >
                API 키 발급 →
              </a>
            </div>
          )}

          {customs?.source === 'unavailable' && (
            <div className="border border-black/6 rounded-2xl px-5 py-10 text-center">
              <p className="text-sm text-black/40">데이터를 불러오지 못했습니다</p>
              <p className="text-xs text-black/25 mt-1">API 응답 오류 — 잠시 후 다시 시도해주세요</p>
            </div>
          )}

          {customs?.source === 'live' && customs.months.length > 0 && (
            <div className="space-y-4">
              <CustomsLineChart months={customs.months} currency={currency} fxKrw={fx.KRW} fxUsd={fx.USD} fxEur={fx.EUR} />
              <div className="border border-black/6 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-black/5 bg-black/[0.02] flex items-start gap-2">
                  <span className="text-black/30 mt-0.5 text-xs">※</span>
                  <div>
                    <p className="text-xs font-semibold text-black/60">HS 0505100000 — 충전용 깃털·솜털</p>
                    <p className="text-xs text-black/35 mt-0.5">{CUSTOMS_HS_NOTE}</p>
                  </div>
                </div>
                <CustomsTable months={customs.months} fxKrw={fx.KRW} fxUsd={fx.USD} />
                <div className="px-5 py-2.5 border-t border-black/5 bg-black/[0.015]">
                  <p className="text-xs text-black/25">출처: 관세청 수출입통계 (data.go.kr)</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── 뉴스 ── */}
        <NewsSections />

        {/* ── 쇼핑트렌드 ── */}
        <ShoppingSection />

        {/* ── 쇼핑인사이트 ── */}
        <ShoppingInsightSection />

        {/* ── 주의사항 ── */}
        <section className="text-xs text-black/20 space-y-1 pb-4 border-t border-black/5 pt-6">
          <p>· CFD 시세는 중국 내수 도매가 기준입니다. 실제 수입가는 물류비·관세·마진을 포함하여 다를 수 있습니다.</p>
          <p>· 환율은 open.er-api.com 기준이며, 실제 거래 환율과 차이가 있을 수 있습니다.</p>
          <p>· 이 정보는 참고용이며, 투자·구매 결정의 직접 근거로 사용하지 마세요.</p>
        </section>
      </main>

      {/* ── 푸터 ── */}
      <footer className="border-t border-black/6 px-6 py-5">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs text-black/25">
          <div className="flex items-center gap-5">
            <a href="https://www.cfd.com.cn/index.php?s=/Web/Market/platform.html" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">CFD 원문</a>
            <a href="https://www.data.go.kr/data/15101609/openapi.do" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">관세청 공공데이터</a>
            <a href="https://open.er-api.com" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">환율 API</a>
          </div>
          <p>영이만을 위한 공간 · © 2026</p>
        </div>
      </footer>
    </div>
  );
}
