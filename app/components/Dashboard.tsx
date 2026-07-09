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
import { YoutubeSection }               from './dashboard/YoutubeSection';
import { NoticePopup }                   from './dashboard/NoticePopup';
import { CertSection }                   from './dashboard/CertSection';

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

  // 통화 설정 (로컬스토리지에서 초기값 복원)
  const [currency, setCurrency] = useState<Currency>(() => {
    try {
      const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
      return (s.currency as Currency) ?? 'KRW';
    } catch { return 'KRW'; }
  });

  // UI 상태
  const [showFeedback, setShowFeedback] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [activeSection, setActiveSection] = useState('sec-fx');

  // CFD 규격 탭 상태
  const [cfdStandard, setCfdStandard] = useState<string>('服标');
  const [cfdData, setCfdData] = useState<PriceData>(data.cfd);
  const [cfdLoading, setCfdLoading] = useState(false);

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

  return (
    <div className="min-h-screen bg-white">
      <NoticePopup />
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}

      {/* ── 도움말 팝업 ── */}
      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onClick={() => setShowHelp(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full overflow-hidden"
            style={{ maxWidth: 560, maxHeight: '85vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/8">
              <h2 className="text-sm font-bold text-black">구초뉴스 도움말</h2>
              <button onClick={() => setShowHelp(false)} className="text-black/25 hover:text-black transition-colors text-lg leading-none ml-4">✕</button>
            </div>

            {/* 본문 */}
            <div className="overflow-y-auto px-6 py-5 space-y-5" style={{ maxHeight: 'calc(85vh - 73px)' }}>

              {/* 사이트 소개 */}
              <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(170,142,92,0.06)', border: '1px solid rgba(170,142,92,0.2)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: KEY }}>이 사이트는 무엇인가요?</p>
                <p className="text-xs text-black/60 leading-relaxed">
                  구스초이의 최인영님을 위한 업무 관련 정보 모음 페이지입니다.
                  중국 원자재 가격부터 국내 소비자 쇼핑 트렌드까지, 업무에 필요한 핵심 데이터를 매일 자동으로 수집해 보여줍니다.
                </p>
              </div>

              {/* 섹션별 설명 */}
              {[
                {
                  label: '환율',
                  desc: '오늘의 환율 정보입니다. 중국 위안(CNY), 미국 달러(USD), 유럽 유로(EUR)를 원화로 환산한 값을 보여줍니다. 원자재 수입 비용 계산에 활용하세요.',
                },
                {
                  label: '구스 · 덕다운',
                  desc: '중국 CFD(중국우융공업협회 가격 플랫폼) 기준 거위털·오리털 원자재 가격입니다. 상단 탭에서 규격을 선택하면 해당 규격의 가격을 확인할 수 있습니다.',
                  extra: (
                    <div className="mt-3 rounded-lg p-3 space-y-2" style={{ backgroundColor: 'rgba(0,0,0,0.03)' }}>
                      <p className="text-[11px] text-black/70 leading-relaxed">
                        ⚠️ 해당 규격에 맞춰 생산한 <strong>중국산 원자재의 가격</strong>입니다.
                      </p>
                      <div className="space-y-1.5 pt-1">
                        {[
                          { key: '중국의류표준', desc: 'FZ/T 80001 — 중국 섬유공업연합회가 제정한 의류용 다운 기준입니다. 패딩점퍼 등 의류에 충전재로 사용되는 원자재에 적용되며, 솜털 함유율과 충전력(필파워) 등을 규정합니다.' },
                          { key: '중국침구표준', desc: 'QB/T 1193 — 이불·베개·토퍼 등 침구류에 사용되는 다운 기준입니다. 의류표준보다 위생·세탁 관련 요건이 더 엄격하게 적용되는 경향이 있습니다.' },
                          { key: '중국국가표준', desc: 'GB/T 17685 — 중국 국가표준화관리위원회(SAC)가 제정한 가장 공식적인 다운 국가표준입니다. 2026년 최신 개정판이 발표되었으며, 솜털 함유율·청결도·산소지수 등을 종합적으로 규정합니다.' },
                          { key: '유럽표준', desc: 'EN 12935 / EN 13186 — 유럽 시장 수출에 필요한 기준입니다. 알레르기 유발 물질, 위생 기준, 충전력 측정 방식이 중국 기준과 다르며, 유럽으로 수출하는 제품에 주로 요구됩니다.' },
                          { key: '미국표준', desc: 'IDFL / FTC 가이드라인 — 미국연방무역위원회(FTC)의 다운 라벨링 규정과 IDFL(국제우융우모검측실험실) 기준을 따릅니다. 미국 시장 수출 제품에 적용됩니다.' },
                          { key: '일본표준', desc: 'JIS L 1903 — 일본산업규격(JIS)의 다운·깃털 제품 기준입니다. 일본은 특히 청결도와 솜털 함유율 기준이 엄격하기로 유명하며, 일본 수출 제품에 요구됩니다.' },
                        ].map(s => (
                          <div key={s.key}>
                            <p className="text-[10px] font-semibold text-black/60">{s.key}</p>
                            <p className="text-[10px] text-black/45 leading-relaxed">{s.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ),
                },
                {
                  label: '수입통계',
                  desc: '관세청에서 제공하는 국내 깃털·솜털 수입 통계입니다. 월별 수입량과 금액 추이를 그래프와 표로 확인할 수 있어 시장 흐름을 파악하는 데 도움이 됩니다.',
                },
                {
                  label: '뉴스',
                  desc: '구스·오리털 관련 국내외 뉴스를 자동으로 모아 보여줍니다. 국내 언론사 뉴스와 해외 영문 뉴스를 나란히 볼 수 있습니다.',
                },
                {
                  label: '쇼핑트렌드',
                  desc: '네이버 쇼핑에서 구스이불·베개·토퍼 상품의 최신 인기 상품을 보여줍니다. 어떤 제품이 잘 팔리는지, 가격대는 어떤지 파악할 수 있습니다.',
                },
                {
                  label: '가격분포',
                  desc: '네이버 쇼핑 상위 100개 상품의 가격을 구간별로 나눠 그래프로 표시합니다. 시장에서 어느 가격대에 상품이 가장 많이 몰려 있는지 한눈에 볼 수 있습니다.',
                },
                {
                  label: '쇼핑인사이트',
                  desc: '네이버 쇼핑인사이트 데이터입니다. 소비자들이 구스이불·베개·토퍼를 얼마나 클릭하는지, 어떤 연령대·성별·기기에서 많이 검색하는지 보여줍니다.',
                },
                {
                  label: 'SNS인사이트',
                  desc: '유튜브 최신 영상과 네이버 쇼핑라이브를 한 곳에서 볼 수 있습니다. 유튜브에서는 구스이불 관련 최신 영상을, 네이버 쇼핑라이브에서는 이불 관련 실시간·최신 라이브 방송을 확인할 수 있습니다.',
                },
              ].map(({ label, desc, extra }) => (
                <div key={label} className="flex gap-3">
                  <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full h-fit mt-0.5 text-center" style={{ backgroundColor: 'rgba(170,142,92,0.1)', color: KEY, minWidth: 72 }}>{label}</span>
                  <div className="flex-1">
                    <p className="text-xs text-black/55 leading-relaxed">{desc}</p>
                    {extra}
                  </div>
                </div>
              ))}

              <p className="text-[10px] text-black/25 pt-2 border-t border-black/5">
                데이터는 자동으로 수집되며, 일부 항목은 API 상황에 따라 표시되지 않을 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      )}

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
              onClick={() => setShowHelp(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border border-black/10 text-black/35 hover:text-black hover:border-black/30 transition-all"
            >
              도움말
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

        {/* ── 인증 현황 ── */}
        <CertSection />

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
            <div style={{ opacity: cfdLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
              <SectionLabel
                title="거위털 — Goose Down"
                sub={`마지막 업데이트 ${cfdData.updatedAt}`}
              />
              <div className="space-y-4">
                <CfdBarChart categories={goose} currency={currency} fx={fx} label="거위털" />
                <div className="flex flex-col gap-4">
                  {goose.map(cat => <CategoryCard key={cat.name} cat={cat} currency={currency} fx={fx} />)}
                </div>
              </div>
            </div>

            <div style={{ opacity: cfdLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
              <SectionLabel
                title="오리털 — Duck Down"
                sub={`마지막 업데이트 ${cfdData.updatedAt}`}
              />
              <div className="space-y-4">
                <CfdBarChart categories={duck} currency={currency} fx={fx} label="오리털" />
                <div className="flex flex-col gap-4">
                  {duck.map(cat => <CategoryCard key={cat.name} cat={cat} currency={currency} fx={fx} />)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 인증 현황 ── */}
        <CertSection />

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

        {/* ── SNS 인사이트 ── */}
        <YoutubeSection />

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
