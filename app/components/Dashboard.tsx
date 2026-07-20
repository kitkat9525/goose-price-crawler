'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { AggregatedData } from '@/app/lib/aggregate';
import type { PriceData } from '@/app/lib/prices';
import { CUSTOMS_HS_NOTE } from '@/app/lib/sources/customs';

import { SETTINGS_KEY, NAV_SECTIONS, CFD_STANDARDS, Currency } from './dashboard/constants';
import { SectionLabel }           from './dashboard/SectionLabel';
import { Header }                 from './dashboard/Header';
import { HelpModal }              from './dashboard/HelpModal';
import { FxSection }              from './dashboard/FxSection';
import { FeedbackModal }          from './dashboard/FeedbackModal';
import { CategoryCard, CfdBarChart } from './dashboard/PriceSection';
import { CustomsLineChart, CustomsTable } from './dashboard/CustomsSection';
import { NewsSections }           from './dashboard/NewsSection';
import { ShoppingSection }        from './dashboard/ShoppingSection';
import { ShoppingInsightSection } from './dashboard/ShoppingInsightSection';
import { YoutubeSection }         from './dashboard/YoutubeSection';
import { NoticePopup }            from './dashboard/NoticePopup';
import { CertSection }            from './dashboard/CertSection';

export default function Dashboard({ data }: { data: AggregatedData }) {
  const router = useRouter();

  const [currency, setCurrency] = useState<Currency>(() => {
    try {
      const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
      return (s.currency as Currency) ?? 'KRW';
    } catch { return 'KRW'; }
  });

  const [showFeedback, setShowFeedback] = useState(false);
  const [showHelp,     setShowHelp]     = useState(false);
  const [activeSection, setActiveSection] = useState('sec-fx');

  const [cfdStandard, setCfdStandard] = useState<string>('服标');
  const [cfdData,     setCfdData]     = useState<PriceData>(data.cfd);
  const [cfdLoading,  setCfdLoading]  = useState(false);

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

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 130, behavior: 'smooth' });
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
      setCfdData(await res.json());
    } catch {
    } finally {
      setCfdLoading(false);
    }
  }

  const { fx, customs } = data;
  const goose = cfdData.categories.filter(c => c.type === 'goose');
  const duck  = cfdData.categories.filter(c => c.type === 'duck');

  return (
    <div className="min-h-screen bg-white">
      <NoticePopup />
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
      {showHelp     && <HelpModal    onClose={() => setShowHelp(false)} />}

      <Header
        activeSection={activeSection}
        onScrollTo={scrollTo}
        onFeedback={() => setShowFeedback(true)}
        onHelp={() => setShowHelp(true)}
        onLogout={handleLogout}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-12 sm:space-y-16">

        {/* 환율 + 세계시계 */}
        <FxSection fx={fx} currency={currency} onCurrencyChange={saveCurrency} />

        {/* 구스 · 덕다운 */}
        <div id="sec-goose" className="space-y-6">
          <div>
            <SectionLabel title="표준 규격" sub="해당 규격에 맞춘 중국산 원자재의 가격입니다." subStyle={{ color: '#c0392b' }} />
            <div className="flex items-center overflow-x-auto border-b border-black/8" style={{ scrollbarWidth: 'none' }}>
              {CFD_STANDARDS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => switchStandard(key)}
                  disabled={cfdLoading}
                  className="shrink-0 text-xs font-bold px-3 whitespace-nowrap transition-colors bg-transparent cursor-pointer"
                  style={{
                    paddingTop: 8,
                    paddingBottom: 8,
                    marginBottom: -1,
                    border: 'none',
                    borderBottom: cfdStandard === key ? '2px solid #111' : '2px solid transparent',
                    color: cfdStandard === key ? '#111' : 'rgba(0,0,0,0.35)',
                  }}
                >
                  {label}
                </button>
              ))}
              {cfdLoading && (
                <span className="text-xs shrink-0 ml-3" style={{ color: 'rgba(0,0,0,0.3)' }}>로딩 중…</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div style={{ opacity: cfdLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
              <SectionLabel title="거위털 — Goose Down" sub={`마지막 업데이트 ${cfdData.updatedAt}`} />
              <div className="space-y-4">
                <CfdBarChart categories={goose} currency={currency} fx={fx} label="거위털" />
                <div className="flex flex-col gap-4">
                  {goose.map(cat => <CategoryCard key={cat.name} cat={cat} currency={currency} fx={fx} />)}
                </div>
              </div>
            </div>

            <div style={{ opacity: cfdLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
              <SectionLabel title="오리털 — Duck Down" sub={`마지막 업데이트 ${cfdData.updatedAt}`} />
              <div className="space-y-4">
                <CfdBarChart categories={duck} currency={currency} fx={fx} label="오리털" />
                <div className="flex flex-col gap-4">
                  {duck.map(cat => <CategoryCard key={cat.name} cat={cat} currency={currency} fx={fx} />)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 인증현황 */}
        <CertSection />

        {/* 관세청 수입통계 */}
        <section id="sec-customs">
          <SectionLabel title="한국 수입 통계 — 관세청" sub="월별 집계 · 매월 15일경 업데이트" />

          {!customs && (
            <div className="border border-black/6 px-5 py-10 text-center">
              <p className="text-sm font-medium text-black/50">관세청 API 키가 설정되지 않았습니다</p>
              <p className="text-xs text-black/30 mt-1">
                <code className="bg-black/5 px-1">.env.local</code>에{' '}
                <code className="bg-black/5 px-1">CUSTOMS_API_KEY</code> 추가 필요
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
            <div className="border border-black/6 px-5 py-10 text-center">
              <p className="text-sm text-black/40">데이터를 불러오지 못했습니다</p>
              <p className="text-xs text-black/25 mt-1">API 응답 오류 — 잠시 후 다시 시도해주세요</p>
            </div>
          )}

          {customs?.source === 'live' && customs.months.length > 0 && (
            <div className="space-y-4">
              <CustomsLineChart months={customs.months} currency={currency} fxKrw={fx.KRW} fxUsd={fx.USD} fxEur={fx.EUR} />
              <div className="border border-black/6 overflow-hidden">
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

        {/* 뉴스 */}
        <NewsSections />

        {/* 쇼핑트렌드 */}
        <ShoppingSection />

        {/* 쇼핑인사이트 */}
        <ShoppingInsightSection />

        {/* SNS 인사이트 */}
        <YoutubeSection />

        {/* 주의사항 */}
        <section className="text-xs text-black/20 space-y-1 pb-4 border-t border-black/5 pt-6">
          <p>· CFD 시세는 중국 내수 도매가 기준입니다. 실제 수입가는 물류비·관세·마진을 포함하여 다를 수 있습니다.</p>
          <p>· 환율은 open.er-api.com 기준이며, 실제 거래 환율과 차이가 있을 수 있습니다.</p>
          <p>· 이 정보는 참고용이며, 투자·구매 결정의 직접 근거로 사용하지 마세요.</p>
        </section>
      </main>

      {/* 푸터 */}
      <footer className="border-t border-black/6 px-6 py-5">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs text-black/25">
          <div className="flex items-center gap-5">
            <a href="https://www.cfd.com.cn/index.php?s=/Web/Market/platform.html" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">CFD 원문</a>
            <a href="https://www.data.go.kr/data/15101609/openapi.do" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">관세청 공공데이터</a>
            <a href="https://open.er-api.com" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">환율 API</a>
          </div>
          <div className="text-right">
            <p>영이만을 위한 공간 © 2026</p>
            <p className="mt-0.5">Distributed by Kim Minsik</p>
            <p>io.dlwlrma@gmail.com</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
