'use client';

import { useState, useEffect } from 'react';
import { KEY, fmtKst } from './constants';

interface Feedback { id: number; content: string; createdAt: string; }

const NOTICE_KEY = 'notice_seen_date';
const NOTICE_RE  = /^\d{8}\s+업데이트\s*:\s*/;

function parseNotice(content: string) {
  const body = content.replace(NOTICE_RE, '').trim();
  return { isUpdate: NOTICE_RE.test(content), body };
}

export function NoticePopup() {
  const [notices, setNotices] = useState<Feedback[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(NOTICE_KEY) === today) return;

    fetch('/api/feedback')
      .then(r => r.json())
      .then(d => {
        const items: Feedback[] = (d.feedbacks ?? []).filter(
          (f: Feedback) => NOTICE_RE.test(f.content)
        );
        if (items.length > 0) {
          setNotices(items);
          setVisible(true);
        }
        localStorage.setItem(NOTICE_KEY, today);
      })
      .catch(() => {});
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={() => setVisible(false)}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: KEY }}>
              공지사항
            </span>
          </div>
          <button
            onClick={() => setVisible(false)}
            className="text-black/30 hover:text-black transition-colors p-1"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* 공지 목록 */}
        <div className="px-5 py-4 max-h-72 overflow-y-auto space-y-3">
          {notices.map(n => {
            const { isUpdate, body } = parseNotice(n.content);
            return (
              <div key={n.id} className="space-y-1">
                <div className="flex items-start gap-2">
                  {isUpdate && (
                    <span className="shrink-0 mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white"
                      style={{ backgroundColor: '#22c55e' }}>
                      NEW
                    </span>
                  )}
                  <p className="text-sm font-medium text-black/85 leading-snug">{body}</p>
                </div>
                <p className="text-xs text-black/25">{fmtKst(n.createdAt)}</p>
              </div>
            );
          })}
        </div>

        {/* 확인 버튼 */}
        <div className="px-5 py-4 border-t border-black/5">
          <button
            onClick={() => setVisible(false)}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: KEY }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
