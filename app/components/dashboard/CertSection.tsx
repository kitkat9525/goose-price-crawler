import { SectionLabel } from './SectionLabel';

const CERTS = [
  {
    id: 'oekotex',
    name: 'OEKO-TEX®',
    desc: '유해물질 검출 안전성 인증',
    src: '/certs/oeko-tex.webp',
    href: 'https://www.oeko-tex.com/en/news/',
  },
  {
    id: 'rds',
    name: 'RDS',
    desc: '책임있는 다운 표준 인증',
    src: '/certs/rds.png',
    href: 'https://textileexchange.org/conference-2026/',
  },
  {
    id: 'idfl',
    name: 'IDFL',
    desc: '국제 다운·깃털 시험 기관',
    src: '/certs/idfl.jpeg',
    href: 'https://idfl.com/ko/news/',
  },
  {
    id: 'ultrafresh',
    name: 'Ultra-Fresh',
    desc: '항균·항곰팡이 처리 인증',
    src: '/certs/ultra-fresh.png',
    href: 'https://www.ultra-fresh.com/antimicrobial-blog',
  },
  {
    id: 'sgs',
    name: 'SGS',
    desc: '글로벌 검사·시험·인증 기관',
    src: '/certs/sgs.webp',
    href: 'https://www.sgs.com/en/news-and-resources',
  },
  {
    id: 'downpass',
    name: 'DOWNPASS',
    desc: '다운·깃털 추적성·품질 인증',
    src: '/certs/downpass.png',
    href: 'https://www.downpass.com/de/startseite/',
  },
] as const;

export function CertSection() {
  return (
    <section id="sec-cert">
      <SectionLabel title="인증 현황" sub="구스다운 · 덕다운 관련 주요 국제 인증" />
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {CERTS.map(cert => (
          <a
            key={cert.id}
            href={cert.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-2 p-3 rounded-xl border border-black/6 hover:border-black/15 transition-all group"
          >
            <div className="w-14 h-14 relative flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cert.src}
                alt={cert.name}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
              />
            </div>
            <div className="text-center">
              <p className="text-[11px] font-bold text-black/75 leading-tight">{cert.name}</p>
              <p className="text-[9px] text-black/30 mt-0.5 leading-tight">{cert.desc}</p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
