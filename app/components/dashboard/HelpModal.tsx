'use client';

const HELP_ITEMS = [
  {
    label: '환율',
    desc: '오늘의 환율 정보입니다. 중국 위안(CNY), 미국 달러(USD), 유럽 유로(EUR)를 원화로 환산한 값을 보여줍니다. 원자재 수입 비용 계산에 활용하세요.',
  },
  {
    label: '구스 · 덕다운',
    desc: '중국 CFD(중국우융공업협회 가격 플랫폼) 기준 거위털·오리털 원자재 가격입니다. 상단 탭에서 규격을 선택하면 해당 규격의 가격을 확인할 수 있습니다.',
    extra: (
      <div className="mt-3 p-3 space-y-2" style={{ backgroundColor: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
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
              <p className="text-[10px] font-bold text-black/60">{s.key}</p>
              <p className="text-[10px] text-black/45 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  { label: '인증현황',   desc: '구스다운·덕다운 업계에서 통용되는 주요 국제 인증 6종(OEKO-TEX, RDS, IDFL, Ultra-Fresh, SGS, DOWNPASS)을 한눈에 정리했습니다. 각 로고를 클릭하면 해당 인증 기관의 최신 소식 페이지로 이동합니다.' },
  { label: '수입통계',   desc: '관세청에서 제공하는 국내 깃털·솜털 수입 통계입니다. 월별 수입량과 금액 추이를 그래프와 표로 확인할 수 있어 시장 흐름을 파악하는 데 도움이 됩니다.' },
  { label: '뉴스',       desc: '구스·오리털 관련 국내외 뉴스를 자동으로 모아 보여줍니다. 국내 언론사 뉴스와 해외 영문 뉴스를 나란히 볼 수 있습니다.' },
  { label: '쇼핑트렌드', desc: '네이버 쇼핑에서 구스이불·베개·토퍼 상품의 최신 인기 상품을 보여줍니다. 어떤 제품이 잘 팔리는지, 가격대는 어떤지 파악할 수 있습니다.' },
  { label: '가격분포',   desc: '네이버 쇼핑 상위 100개 상품의 가격을 구간별로 나눠 그래프로 표시합니다. 시장에서 어느 가격대에 상품이 가장 많이 몰려 있는지 한눈에 볼 수 있습니다.' },
  { label: '쇼핑인사이트', desc: '네이버 쇼핑인사이트 데이터입니다. 소비자들이 구스이불·베개·토퍼를 얼마나 클릭하는지, 어떤 연령대·성별·기기에서 많이 검색하는지 보여줍니다.' },
  { label: 'SNS인사이트', desc: '유튜브 최신 영상과 네이버 쇼핑라이브를 한 곳에서 볼 수 있습니다. 유튜브에서는 구스이불 관련 최신 영상을, 네이버 쇼핑라이브에서는 이불 관련 실시간·최신 라이브 방송을 확인할 수 있습니다.' },
  { label: '플레이보드 바로가기', desc: '상단 메뉴탭의 링크입니다. 클릭하면 Playboard의 구스초이 채널 분석 페이지가 새 탭으로 열립니다. 구독자 증감 추이, 영상별 성과 등 심층 데이터를 확인할 수 있습니다.' },
] as const;

interface HelpModalProps {
  onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="relative bg-white w-full overflow-hidden border border-black/10"
        style={{ maxWidth: 560, maxHeight: '85vh', borderRadius: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/8">
          <h2 className="text-sm font-black text-black tracking-tight">구초뉴스 도움말</h2>
          <button onClick={onClose} className="text-black/25 hover:text-black transition-colors text-lg leading-none ml-4">✕</button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-5" style={{ maxHeight: 'calc(85vh - 73px)' }}>
          <div className="p-4 border border-black/8" style={{ background: 'rgba(0,0,0,0.02)' }}>
            <p className="text-xs font-bold mb-1 text-black/60 uppercase tracking-widest">이 사이트는 무엇인가요?</p>
            <p className="text-xs text-black/55 leading-relaxed">
              구스초이의 최인영님을 위한 업무 관련 정보 모음 페이지입니다.
              중국 원자재 가격부터 국내 소비자 쇼핑 트렌드까지, 업무에 필요한 핵심 데이터를 매일 자동으로 수집해 보여줍니다.
            </p>
          </div>

          {HELP_ITEMS.map((item) => (
            <div key={item.label} className="flex gap-3">
              <span
                className="shrink-0 text-[10px] font-bold px-2 py-0.5 h-fit mt-0.5 text-center border border-black/10 text-black/50"
                style={{ minWidth: 72 }}
              >
                {item.label}
              </span>
              <div className="flex-1">
                <p className="text-xs text-black/55 leading-relaxed">{item.desc}</p>
                {'extra' in item && item.extra}
              </div>
            </div>
          ))}

          <p className="text-[10px] text-black/25 pt-2 border-t border-black/5">
            데이터는 자동으로 수집되며, 일부 항목은 API 상황에 따라 표시되지 않을 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
