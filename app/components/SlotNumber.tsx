'use client';

import { useEffect, useRef } from 'react';

const CHARS = '9374820615';

interface Props {
  value: number;
  decimals?: number;
}

export default function SlotNumber({ value, decimals = 0 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || isNaN(value)) return;

    const formatted = value.toLocaleString('ko-KR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    el.innerHTML = '';
    const chars = formatted.split('');
    const digitSlots: HTMLSpanElement[] = [];

    chars.forEach(ch => {
      if (ch === ',' || ch === '.') {
        const sep = document.createElement('span');
        sep.textContent = ch;
        sep.style.cssText =
          'display:inline-block;vertical-align:bottom;line-height:1.15em;height:1.15em;';
        el.appendChild(sep);
      } else {
        const slot = document.createElement('span');
        slot.style.cssText =
          'display:inline-block;overflow:hidden;height:1.15em;width:0.65em;vertical-align:bottom;position:relative;';
        const cell = document.createElement('span');
        cell.style.cssText =
          'position:absolute;top:0;left:0;right:0;height:1.15em;line-height:1.15em;text-align:center;';
        cell.textContent = CHARS[Math.floor(Math.random() * 10)];
        slot.appendChild(cell);
        el.appendChild(slot);
        digitSlots.push(slot);
      }
    });

    const actualDigits = chars.filter(c => c !== ',' && c !== '.');
    let cancelled = false;

    const timers: ReturnType<typeof setTimeout>[] = [];

    digitSlots.forEach((slot, i) => {
      const target = actualDigits[i];
      const cell = slot.querySelector('span') as HTMLSpanElement;
      let spinning = true;
      let frameCount = 0;

      function spin() {
        if (cancelled || !spinning) return;
        frameCount++;
        const interval =
          frameCount < 8 ? 40 : frameCount < 16 ? 65 : frameCount < 22 ? 100 : 140;
        cell.textContent = CHARS[Math.floor(Math.random() * 10)];
        timers.push(setTimeout(spin, interval));
      }
      spin();

      timers.push(
        setTimeout(() => {
          spinning = false;
          if (!cancelled) cell.textContent = target;
        }, 400 + (i + 1) * 160),
      );
    });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [value, decimals]);

  const initial = value.toLocaleString('ko-KR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return <span ref={ref}>{initial}</span>;
}
