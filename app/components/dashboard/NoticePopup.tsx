'use client';

import { useState, useEffect } from 'react';
import { fmtKst } from './constants';

interface Feedback { id: number; content: string; createdAt: string; }

const NOTICE_KEY = 'notice_seen_date';
const UPDATE_RE  = /^\d{8}\s+업데이트\s*:\s*/;
const NOTICE_RE  = /^\d{8}\s+공지사항\s*:\s*/;
const EITHER_RE  = /^\d{8}\s+(업데이트|공지사항)\s*:\s*/;

type BadgeType = 'update' | 'notice' | null;

function parseNotice(content: string): { badge: BadgeType; body: string } {
  if (UPDATE_RE.test(content)) return { badge: 'update', body: content.replace(UPDATE_RE, '').trim() };
  if (NOTICE_RE.test(content)) return { badge: 'notice', body: content.replace(NOTICE_RE, '').trim() };
  return { badge: null, body: content };
}

const SLIDE_UP = `
@keyframes sheet-up {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
`;

export function NoticePopup() {
  const [notices, setNotices]     = useState<Feedback[]>([]);
  const [visible, setVisible]     = useState(false);
  const [skipToday, setSkipToday] = useState(false);
  const [isMobile, setIsMobile]   = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobile(window.innerWidth < 640);
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(NOTICE_KEY) === today) return;

    fetch('/api/feedback')
      .then(r => r.json())
      .then(d => {
        const items: Feedback[] = (d.feedbacks ?? []).filter(
          (f: Feedback) => EITHER_RE.test(f.content)
        );
        if (items.length > 0) {
          setNotices(items);
          setVisible(true);
        }
      })
      .catch(() => {});
  }, []);

  function close() {
    if (skipToday) {
      localStorage.setItem(NOTICE_KEY, new Date().toISOString().slice(0, 10));
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center"
      style={{ alignItems: isMobile ? 'flex-end' : 'center' }}
      onClick={close}
    >
      <style>{SLIDE_UP}</style>

      {/* 딤 */}
      <div
        className="absolute inset-0 bg-black/35"
        style={{ animation: 'fade-in 0.2s ease' }}
      />

      {/* 패널 */}
      <div
        className="relative bg-white w-full overflow-hidden border border-black/10"
        style={isMobile ? {
          maxWidth: '100%',
          borderRadius: 0,
          animation: 'sheet-up 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        } : {
          maxWidth: '384px',
          borderRadius: 0,
          animation: 'fade-in 0.2s ease',
          margin: '16px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/8">
          <span className="text-xs font-bold tracking-widest uppercase text-black/50">
            공지사항
          </span>
          <button onClick={close} className="text-black/30 hover:text-black transition-colors p-1">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* 공지 목록 */}
        <div className="px-5 py-4 max-h-72 overflow-y-auto space-y-3">
          {notices.map(n => {
            const { badge, body } = parseNotice(n.content);
            return (
              <div key={n.id} className="space-y-1">
                <div className="flex items-start gap-2">
                  {badge === 'update' && (
                    <span className="shrink-0 mt-0.5 text-[10px] font-bold px-1.5 py-0.5 text-white"
                      style={{ backgroundColor: '#22c55e', borderRadius: 0 }}>
                      NEW
                    </span>
                  )}
                  {badge === 'notice' && (
                    <span className="shrink-0 mt-0.5 text-[10px] font-bold px-1.5 py-0.5 text-white"
                      style={{ backgroundColor: '#1a1a1a', borderRadius: 0 }}>
                      공지
                    </span>
                  )}
                  <p className="text-sm font-medium text-black/85 leading-snug">{body}</p>
                </div>
                <p className="text-xs text-black/25">{fmtKst(n.createdAt)}</p>
              </div>
            );
          })}
        </div>

        {/* 하단 */}
        <div className="px-5 py-4 border-t border-black/5 space-y-3" style={{ paddingBottom: isMobile ? 'max(16px, env(safe-area-inset-bottom))' : '16px' }}>
          <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
            <input
              type="checkbox"
              checked={skipToday}
              onChange={e => setSkipToday(e.target.checked)}
              className="w-3.5 h-3.5 accent-black"
            />
            <span className="text-xs text-black/40">오늘 하루 보지 않기</span>
          </label>
          <button
            onClick={close}
            className="w-full py-2.5 text-sm font-bold text-white bg-[#111] transition-opacity hover:opacity-85"
            style={{ borderRadius: 0 }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
