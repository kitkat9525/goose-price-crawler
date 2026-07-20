'use client';

import { useState, useEffect } from 'react';
import { fmtKst } from './constants';

interface Feedback { id: number; content: string; createdAt: string; }

export function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [content, setContent] = useState('');
  const [status, setStatus]   = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [feedbacks, setFeedbacks]   = useState<Feedback[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    async function load() {
      setLoadingList(true);
      try {
        const res = await fetch('/api/feedback');
        const json = await res.json();
        setFeedbacks(json.feedbacks ?? []);
      } catch {}
      setLoadingList(false);
    }
    load();
  }, []);

  async function handleSend() {
    if (!content.trim()) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        setStatus('done');
        setContent('');
        const res2 = await fetch('/api/feedback');
        const json = await res2.json();
        setFeedbacks(json.feedbacks ?? []);
        setTimeout(() => setStatus('idle'), 2000);
      } else setStatus('error');
    } catch { setStatus('error'); }
  }

  if (loadingList) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
      <div
        style={{ position: 'relative', background: '#fff', width: '100%', maxWidth: 480, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)', fontFamily: "'Pretendard', system-ui, sans-serif" }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #ebebeb' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#111', margin: 0, letterSpacing: -0.3 }}>의견</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(17,17,17,0.35)', lineHeight: 1 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* 목록 영역 */}
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {feedbacks.length === 0 && (
            <p style={{ fontSize: 12, color: 'rgba(17,17,17,0.3)', textAlign: 'center', padding: '16px 0' }}>아직 의견이 없습니다</p>
          )}
          {feedbacks.map((f) => (
            <div key={f.id} style={{ padding: '14px 24px', borderTop: '1px solid #ebebeb', transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
            >
              <p style={{ fontSize: 13, fontWeight: 700, color: '#111', margin: '0 0 4px', letterSpacing: -0.2, whiteSpace: 'pre-wrap' }}>{f.content}</p>
              <p style={{ fontSize: 11, color: 'rgba(17,17,17,0.35)', margin: 0 }}>{fmtKst(f.createdAt)}</p>
            </div>
          ))}
          <div style={{ height: 16 }} />
        </div>

        {/* 작성 영역 */}
        <div style={{ padding: '20px 24px', borderTop: '1px solid #ebebeb' }}>
          {status === 'done' ? (
            <p style={{ fontSize: 13, fontWeight: 700, color: '#AA8E5C', textAlign: 'center', padding: '12px 0', margin: 0 }}>✓ 의견이 저장되었습니다</p>
          ) : (
            <>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="불편한 점, 개선 아이디어, 데이터 오류 등 자유롭게 남겨주세요."
                rows={4}
                style={{ width: '100%', fontSize: 13, color: '#111', border: '1px solid #ebebeb', borderRadius: 8, padding: '12px 14px', resize: 'none', outline: 'none', boxSizing: 'border-box', background: '#fafafa', fontFamily: 'inherit', transition: 'border-color 0.15s, background 0.15s' }}
                onFocus={e => { e.target.style.borderColor = '#111'; e.target.style.background = '#fff'; }}
                onBlur={e => { e.target.style.borderColor = '#ebebeb'; e.target.style.background = '#fafafa'; }}
              />
              {status === 'error' && <p style={{ fontSize: 12, color: '#c0392b', margin: '6px 0 0' }}>저장에 실패했습니다. 다시 시도해주세요.</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  onClick={handleSend}
                  disabled={!content.trim() || status === 'sending'}
                  style={{ padding: '4px 0', background: 'none', border: 'none', color: !content.trim() || status === 'sending' ? 'rgba(17,17,17,0.3)' : '#111', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: !content.trim() || status === 'sending' ? 'default' : 'pointer' }}
                >
                  {status === 'sending' ? '저장 중...' : '보내기'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
