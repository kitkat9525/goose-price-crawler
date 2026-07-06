'use client';

import { useState, useEffect } from 'react';
import { KEY, fmtKst } from './constants';

interface Feedback { id: number; content: string; createdAt: string; }

export function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab]         = useState<'write' | 'list'>('write');
  const [content, setContent] = useState('');
  const [status, setStatus]   = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [feedbacks, setFeedbacks]   = useState<Feedback[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  async function loadFeedbacks() {
    setLoadingList(true);
    try {
      const res = await fetch('/api/feedback');
      const json = await res.json();
      setFeedbacks(json.feedbacks ?? []);
    } catch {}
    setLoadingList(false);
  }

  useEffect(() => {
    if (tab === 'list') loadFeedbacks();
  }, [tab]);

  async function handleSend() {
    if (!content.trim()) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) { setStatus('done'); setContent(''); }
      else setStatus('error');
    } catch { setStatus('error'); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/6">
          <div className="flex gap-1">
            {(['write', 'list'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
                style={tab === t ? { backgroundColor: KEY, color: 'white' } : { color: 'rgba(0,0,0,0.4)' }}
              >
                {t === 'write' ? '의견 보내기' : '의견 목록'}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="text-black/30 hover:text-black transition-colors p-1">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* 작성 탭 */}
        {tab === 'write' && (
          <div className="px-5 py-5 space-y-4">
            {status === 'done' ? (
              <div className="text-center py-6">
                <p className="text-2xl mb-2">✓</p>
                <p className="text-sm font-semibold text-black">의견이 저장되었습니다</p>
                <button onClick={() => setStatus('idle')} className="mt-4 text-xs text-black/40 underline underline-offset-2">
                  다른 의견 보내기
                </button>
              </div>
            ) : (
              <>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="불편한 점, 개선 아이디어, 데이터 오류 등 자유롭게 남겨주세요."
                  rows={5}
                  className="w-full text-sm text-black border border-black/10 rounded-xl px-4 py-3 resize-none focus:outline-none focus:border-black/30 transition-colors placeholder:text-black/20"
                />
                {status === 'error' && (
                  <p className="text-xs text-red-500">저장에 실패했습니다. 다시 시도해주세요.</p>
                )}
                <button
                  onClick={handleSend}
                  disabled={!content.trim() || status === 'sending'}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
                  style={{ backgroundColor: KEY }}
                >
                  {status === 'sending' ? '저장 중...' : '보내기'}
                </button>
              </>
            )}
          </div>
        )}

        {/* 목록 탭 */}
        {tab === 'list' && (
          <div className="px-5 py-4 max-h-80 overflow-y-auto space-y-3">
            {loadingList && <p className="text-xs text-black/30 text-center py-6">불러오는 중...</p>}
            {!loadingList && feedbacks.length === 0 && (
              <p className="text-xs text-black/30 text-center py-6">아직 의견이 없습니다</p>
            )}
            {feedbacks.map(f => (
              <div key={f.id} className="border border-black/6 rounded-xl px-4 py-3 space-y-1">
                <p className="text-sm text-black/80 whitespace-pre-wrap">{f.content}</p>
                <p className="text-xs text-black/25">{fmtKst(f.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
