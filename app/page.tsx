'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const KEY = '#AA8E5C';

const STEPS = [
  'CFD 중국우모협회 시세 조회 중',
  '실시간 환율 조회 중',
  '관세청 수입 데이터 조회 중',
  '데이터 정리 중',
];

export default function IntroPage() {
  const router = useRouter();

  // 로그인 상태
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);

  // 크롤링 상태
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    if (!loading || done) return;
    const id = setInterval(() => setDotCount(d => d >= 5 ? 1 : d + 1), 400);
    return () => clearInterval(id);
  }, [loading, done]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      setLoggedIn(true);
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

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* 상단 바 */}
      <header className="px-8 py-6 flex items-center justify-between border-b border-black/6">
        <span className="text-xs font-mono text-black/30 tracking-widest uppercase">구초뉴스</span>
        <span className="text-xs text-black/25">참고용 데이터</span>
      </header>

      {/* 메인 */}
      <main className="flex-1 flex flex-col items-center justify-center px-8">

        {/* 로고 */}
        <div className="mb-8 select-none">
          <Image src="/logo.png" alt="로고" width={300} height={300} priority className="object-contain w-48 h-48 sm:w-72 sm:h-72" />
        </div>

        <div className="mb-10" />

        {/* 로그인 폼 */}
        {!loggedIn && !loading && (
          <form onSubmit={handleLogin} className="w-full max-w-xs space-y-3">
            <input
              type="text"
              placeholder="아이디"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full text-sm text-black border border-black/10 rounded-xl px-4 py-3 focus:outline-none focus:border-black/30 transition-colors placeholder:text-black/25"
            />
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full text-sm text-black border border-black/10 rounded-xl px-4 py-3 focus:outline-none focus:border-black/30 transition-colors placeholder:text-black/25"
            />
            {loginError && (
              <p className="text-xs text-red-400 text-center">{loginError}</p>
            )}
            <button
              type="submit"
              disabled={!username || !password}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
              style={{ backgroundColor: KEY }}
            >
              로그인
            </button>
          </form>
        )}

        {/* 크롤링 중 */}
        {loading && (
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-3">
              {[1, 2, 3, 4, 5].map(i => {
                const active = done ? true : i <= dotCount;
                return (
                  <div
                    key={i}
                    className="rounded-full overflow-hidden border-2 transition-all duration-300"
                    style={{
                      width: 72,
                      height: 72,
                      borderColor: active ? KEY : 'rgba(0,0,0,0.08)',
                      opacity: active ? 1 : 0,
                      transform: active ? 'scale(1)' : 'scale(0.5)',
                    }}
                  >
                    <Image src="/loading.png" alt="" width={72} height={72} className="object-cover w-full h-full" />
                  </div>
                );
              })}
            </div>

            {!done ? (
              <p className="text-sm text-black/45 font-medium tracking-wide">{STEPS[step]}</p>
            ) : (
              <p className="text-sm font-medium text-black flex items-center gap-1.5">
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                이동 중...
              </p>
            )}
          </div>
        )}
      </main>

      {/* 하단 바 */}
      <footer className="px-8 py-6 border-t border-black/6 flex items-center justify-between">
        <span className="text-xs text-black/25">데이터 출처: CFD 중국우모협회 · 관세청 공공데이터 · open.er-api.com</span>
        <span className="text-xs text-black/20">© 2026</span>
      </footer>
    </div>
  );
}
