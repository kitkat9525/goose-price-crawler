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
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
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
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', justifyContent: 'center', alignItems: isMobile ? 'flex-end' : 'center' }}
      onClick={close}
    >
      <style>{SLIDE_UP}</style>

      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', animation: 'fade-in 0.2s ease' }} />

      <div
        style={isMobile ? {
          position: 'relative', background: '#fff', width: '100%', overflow: 'hidden',
          borderRadius: '16px 16px 0 0', border: '0.5px solid rgba(0,0,0,0.1)',
          fontFamily: "'Pretendard', system-ui, sans-serif",
          animation: 'sheet-up 0.3s cubic-bezier(0.32,0.72,0,1)',
          display: 'flex', flexDirection: 'column',
        } : {
          position: 'relative', background: '#fff', width: '100%', maxWidth: 480, overflow: 'hidden',
          borderRadius: 16, border: '0.5px solid rgba(0,0,0,0.1)', margin: 16,
          fontFamily: "'Pretendard', system-ui, sans-serif",
          animation: 'fade-in 0.2s ease',
          display: 'flex', flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #ebebeb', flexShrink: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#111', margin: 0, letterSpacing: -0.3 }}>공지사항</p>
          <button onClick={close} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(17,17,17,0.35)', lineHeight: 1 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* 공지 목록 */}
        <div style={{ overflowY: 'auto', maxHeight: 420 }}>
          {notices.map((n, i) => {
            const { badge, body } = parseNotice(n.content);
            const isLatest = i === 0;
            return (
              <div key={n.id} style={{ padding: '16px 24px', borderBottom: '1px solid #ebebeb', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                {badge === 'update' && (
                  <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '2px 6px', letterSpacing: 0.5, marginTop: 2,
                    color: isLatest ? '#22c55e' : 'rgba(17,17,17,0.25)',
                    border: `1px solid ${isLatest ? '#22c55e' : 'rgba(17,17,17,0.15)'}`,
                  }}>NEW</span>
                )}
                {badge === 'notice' && (
                  <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: '#111', border: '1px solid #111', borderRadius: 4, padding: '2px 6px', letterSpacing: 0.5, marginTop: 2 }}>공지</span>
                )}
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#111', margin: '0 0 5px', letterSpacing: -0.2, lineHeight: 1.5 }}>{body}</p>
                  <p style={{ fontSize: 11, color: 'rgba(17,17,17,0.35)', margin: 0 }}>{fmtKst(n.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 하단 */}
        <div style={{ padding: '14px 24px', paddingBottom: isMobile ? 'max(14px, env(safe-area-inset-bottom))' : 14, borderTop: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }} onClick={() => setSkipToday(v => !v)}>
            <div style={{ width: 16, height: 16, border: `1px solid ${skipToday ? '#22c55e' : '#d0d0d0'}`, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'border-color 0.15s' }}>
              {skipToday && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span style={{ fontSize: 12, color: 'rgba(17,17,17,0.45)' }}>오늘 하루 보지 않기</span>
          </label>
          <button onClick={close} style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 700, color: '#111', fontFamily: 'inherit', cursor: 'pointer', padding: '4px 0' }}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
