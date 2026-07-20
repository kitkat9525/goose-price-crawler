'use client';

import { KEY, NAV_SECTIONS } from './constants';

const PLAYBOARD_URL = 'https://playboard.co/channel/UChuq17DrAiJwkpxNajkEDYw';

interface HeaderProps {
  activeSection: string;
  onScrollTo: (id: string) => void;
  onFeedback: () => void;
  onHelp: () => void;
  onLogout: () => void;
}

export function Header({ activeSection, onScrollTo, onFeedback, onHelp, onLogout }: HeaderProps) {
  return (
    <header className="border-b border-black/6 px-4 sm:px-6 sticky top-0 bg-white/95 z-10">

      {/* 로고 + 유틸 버튼 */}
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 py-3">
        <h1
          className="text-base sm:text-lg shrink-0"
          style={{ fontWeight: 500, letterSpacing: '0.1em' }}
        >
          구초뉴스
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onFeedback}
            className="text-xs font-bold px-3 py-1.5 border border-black/10 text-black/45 hover:text-black hover:border-black/30 transition-all"
            style={{ borderRadius: 0 }}
          >
            의견보내기
          </button>
          <button
            onClick={onHelp}
            className="text-xs font-bold px-3 py-1.5 border border-black/10 text-black/35 hover:text-black hover:border-black/30 transition-all"
            style={{ borderRadius: 0 }}
          >
            도움말
          </button>
          <button
            onClick={onLogout}
            className="text-xs font-bold px-3 py-1.5 border border-black/10 text-black/35 hover:text-black hover:border-black/30 transition-all"
            style={{ borderRadius: 0 }}
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* 네비 탭 — 언더라인 스타일 */}
      <div className="overflow-x-auto border-t border-black/5" style={{ scrollbarWidth: 'none' }}>
        <nav className="flex items-center px-4" style={{ width: 'fit-content', margin: '0 auto' }}>
          {NAV_SECTIONS.map(({ id, label }) => (
            <span key={id} className="flex items-center">
              {id === 'sec-shopping' && (
                <span className="w-px h-3 mx-2 shrink-0" style={{ backgroundColor: 'rgba(0,0,0,0.12)' }} />
              )}
              <button
                onClick={() => onScrollTo(id)}
                className="shrink-0 text-xs font-bold px-3 whitespace-nowrap transition-colors bg-transparent cursor-pointer"
                style={{
                  paddingTop: 8,
                  paddingBottom: 8,
                  marginBottom: -1,
                  border: 'none',
                  borderBottom: activeSection === id ? `2px solid ${KEY}` : '2px solid transparent',
                  color: activeSection === id ? '#111' : 'rgba(0,0,0,0.35)',
                }}
              >
                {label}
              </button>
            </span>
          ))}
          <a
            href={PLAYBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs font-bold px-3 whitespace-nowrap"
            style={{ color: 'rgba(0,0,0,0.35)', paddingTop: 8, paddingBottom: 8 }}
          >
            플레이보드 바로가기
          </a>
        </nav>
      </div>

    </header>
  );
}
