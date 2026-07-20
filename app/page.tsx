'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const STEPS = [
  'CFD 중국우모협회 시세 조회 중',
  '실시간 환율 조회 중',
  '관세청 수입 데이터 조회 중',
  '데이터 정리 중',
];

export default function IntroPage() {
  const router = useRouter();

  const [username, setUsername]     = useState('');
  const [password, setPassword]     = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading]       = useState(false);
  const [step, setStep]             = useState(0);
  const [done, setDone]             = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      handleStart();
    } else {
      const json = await res.json();
      setLoginError(json.message ?? '로그인 실패');
    }
  }

  async function handleStart() {
    setLoading(true);
    setStep(0);

    const timers = STEPS.map((_, i) =>
      setTimeout(() => setStep(i), i * 900)
    );

    await Promise.race([
      fetch('/api/prefetch').catch(() => {}),
      new Promise<void>(r => setTimeout(r, 12000)),
    ]);

    timers.forEach(clearTimeout);
    setDone(true);
    setTimeout(() => router.push('/dashboard'), 400);
  }

  function stepStatus(i: number): 'idle' | 'active' | 'done' {
    if (done || i < step) return 'done';
    if (i === step) return 'active';
    return 'idle';
  }

  return (
    <div className="min-h-screen bg-white flex flex-col sm:grid sm:grid-cols-[1fr_400px]">

      {/* 로고 */}
      <div className="flex-1 flex items-center justify-center py-14 sm:py-0 sm:flex-none sm:border-r border-black/8">
        <Image
          src="/logo.png"
          alt="구초뉴스"
          width={200}
          height={200}
          priority
          className="object-contain w-48 h-48 sm:w-48 sm:h-48"
        />
      </div>

      {/* 로그인 / 로딩 */}
      <div className="flex items-center justify-center p-8 pb-16 sm:p-10">

        {/* 로그인 폼 */}
        {!loading && (
          <form onSubmit={handleLogin} className="w-full max-w-[280px] flex flex-col gap-2">
            <p className="text-[22px] font-black tracking-tight mb-1.5 text-black">안녕하세요</p>
            <p className="text-xs leading-relaxed mb-6" style={{ color: 'rgba(17,17,17,0.45)' }}>
              인증된 사용자만 접근할 수 있습니다.<br />
              아이디와 비밀번호를 입력해 주세요.
            </p>
            <input
              type="text"
              placeholder="아이디"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full text-sm text-black border border-black/10 px-4 py-3 outline-none transition-colors placeholder:text-black/25 focus:border-black/40"
              style={{ borderRadius: 0 }}
            />
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full text-sm text-black border border-black/10 px-4 py-3 outline-none transition-colors placeholder:text-black/25 focus:border-black/40"
              style={{ borderRadius: 0 }}
            />
            {loginError && (
              <p className="text-xs text-red-400 text-center">{loginError}</p>
            )}
            <button
              type="submit"
              disabled={!username || !password}
              className="w-full mt-1 py-3 text-sm font-bold text-white bg-[#111] transition-opacity disabled:opacity-40"
              style={{ borderRadius: 0 }}
            >
              로그인
            </button>
          </form>
        )}

        {/* 로딩 */}
        {loading && (
          <div className="w-full max-w-[280px] flex flex-col gap-6">
            <p className="text-[22px] font-black tracking-tight">데이터 로딩 중</p>
            <div style={{ borderTop: '1px solid rgba(17,17,17,0.08)' }}>
              {STEPS.map((label, i) => {
                const status = stepStatus(i);
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-3 text-xs transition-colors"
                    style={{
                      borderBottom: '1px solid rgba(17,17,17,0.08)',
                      color: status === 'idle' ? 'rgba(17,17,17,0.35)' : '#111',
                    }}
                  >
                    <span
                      className="text-[10px] font-bold tracking-widest shrink-0 w-5"
                      style={{ color: 'rgba(17,17,17,0.28)' }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1">{label}</span>
                    <span style={{ fontSize: 11, color: 'rgba(17,17,17,0.4)' }}>
                      {status === 'done' ? '✓' : status === 'active' ? '●' : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
            {done && (
              <p className="text-xs" style={{ color: 'rgba(17,17,17,0.4)' }}>이동 중...</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
