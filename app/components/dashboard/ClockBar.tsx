'use client';

import { useEffect, useRef } from 'react';

const COUNTRIES = [
  { name: '폴란드',     tz: 'Europe/Warsaw'   },
  { name: '헝가리',     tz: 'Europe/Budapest' },
  { name: '중국',       tz: 'Asia/Shanghai'   },
  { name: '프랑스',     tz: 'Europe/Paris'    },
  { name: '우크라이나', tz: 'Europe/Kyiv'     },
];

const SIZE = 72;
const CX = SIZE / 2;

function getTimeParts(tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const h = parseInt(parts.find(p => p.type === 'hour')!.value);
  const m = parseInt(parts.find(p => p.type === 'minute')!.value);
  const s = parseInt(parts.find(p => p.type === 'second')!.value);
  return { h, m, s };
}

function handEnd(deg: number, len: number) {
  const rad = (deg - 90) * Math.PI / 180;
  return { x: CX + len * Math.cos(rad), y: CX + len * Math.sin(rad) };
}

function AnalogClock({ tz }: { tz: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const R = CX - 2;

    function draw() {
      const { h, m, s } = getTimeParts(tz);
      const hDeg = (h % 12) * 30 + m * 0.5 + s * (0.5 / 60);
      const mDeg = m * 6 + s * 0.1;
      const sDeg = s * 6;

      ctx.clearRect(0, 0, SIZE, SIZE);

      ctx.beginPath();
      ctx.arc(CX, CX, R, 0, Math.PI * 2);
      ctx.fillStyle = '#f9f9f9';
      ctx.fill();
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      ctx.stroke();

      for (let i = 0; i < 60; i++) {
        const a = (i * 6 - 90) * Math.PI / 180;
        const isMajor = i % 5 === 0;
        const r1 = isMajor ? R - 6 : R - 3;
        ctx.beginPath();
        ctx.moveTo(CX + r1 * Math.cos(a), CX + r1 * Math.sin(a));
        ctx.lineTo(CX + R * Math.cos(a), CX + R * Math.sin(a));
        ctx.strokeStyle = isMajor ? '#bbb' : '#e0e0e0';
        ctx.lineWidth = isMajor ? 1.5 : 0.8;
        ctx.stroke();
      }

      const hp = handEnd(hDeg, R * 0.52);
      ctx.beginPath(); ctx.moveTo(CX, CX); ctx.lineTo(hp.x, hp.y);
      ctx.strokeStyle = '#222'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke();

      const mp = handEnd(mDeg, R * 0.72);
      ctx.beginPath(); ctx.moveTo(CX, CX); ctx.lineTo(mp.x, mp.y);
      ctx.strokeStyle = '#444'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.stroke();

      const sp = handEnd(sDeg, R * 0.82);
      ctx.beginPath(); ctx.moveTo(CX, CX); ctx.lineTo(sp.x, sp.y);
      ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.lineCap = 'round'; ctx.stroke();

      ctx.beginPath(); ctx.arc(CX, CX, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#111'; ctx.fill();
    }

    draw();
    const id = setInterval(draw, 1000);
    return () => clearInterval(id);
  }, [tz]);

  return <canvas ref={canvasRef} width={SIZE} height={SIZE} style={{ display: 'block' }} />;
}

export function ClockBar() {
  return (
    <>
      {COUNTRIES.map((c, i) => {
        const { h, m } = getTimeParts(c.tz);
        const pad = (n: number) => String(n).padStart(2, '0');
        return (
          <div
            key={c.tz}
            style={{
              padding: '18px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              borderRight: 'none',
            }}
          >
            <AnalogClock tz={c.tz} />
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(17,17,17,0.4)' }}>{c.name}</p>
              <p style={{ fontSize: 17, fontWeight: 900, letterSpacing: -0.4, marginTop: 1 }}>
                {pad(h)}:{pad(m)}
              </p>
            </div>
          </div>
        );
      })}
    </>
  );
}
