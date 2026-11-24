import { useCallback, useRef } from 'react';

const THROTTLE_MS = 32;

function sheenAllowed() {
  if (typeof document === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  const tier = Number(document.documentElement.dataset.glassTier ?? '0');
  return tier < 1;
}

export function usePointerSheen<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const lastTs = useRef(0);
  const raf = useRef(0);

  const onPointerMove = useCallback((event: React.PointerEvent<T>) => {
    if (!sheenAllowed()) return;
    const now = performance.now();
    if (now - lastTs.current < THROTTLE_MS) return;
    lastTs.current = now;

    const el = event.currentTarget;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty('--sheen-x', `${Math.max(0, Math.min(100, x))}%`);
      el.style.setProperty('--sheen-y', `${Math.max(0, Math.min(100, y))}%`);
    });
  }, []);

  const onPointerLeave = useCallback((event: React.PointerEvent<T>) => {
    event.currentTarget.style.setProperty('--sheen-x', '30%');
    event.currentTarget.style.setProperty('--sheen-y', '20%');
  }, []);

  return { ref, onPointerMove, onPointerLeave };
}

export const glassSpring = { type: 'spring' as const, stiffness: 420, damping: 26 };
export const glassHover = { y: -1 };
export const glassTap = { scale: 0.96 };
