const SPECULAR_MQ = '(prefers-reduced-motion: reduce)';
const TRANSPARENCY_MQ = '(prefers-reduced-transparency: reduce)';

function setTier(tier: 0 | 1 | 2 | 3) {
  document.documentElement.dataset.glassTier = String(tier);
}

/**
 * Progressive quality ladder when a frame budget is missed:
 * 1) drop pointer-specular, 2) drop refraction, 3) drop orb drift.
 */
export function initGlassPerformanceBudget(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const reducedMotion = window.matchMedia(SPECULAR_MQ);
  const reducedTransparency = window.matchMedia(TRANSPARENCY_MQ);

  const applyStatic = () => {
    if (reducedTransparency.matches) {
      setTier(3);
      return true;
    }
    if (reducedMotion.matches) {
      setTier(2);
      return true;
    }
    return false;
  };

  if (applyStatic()) {
    const onChange = () => {
      if (!applyStatic()) setTier(0);
    };
    reducedMotion.addEventListener('change', onChange);
    reducedTransparency.addEventListener('change', onChange);
    return () => {
      reducedMotion.removeEventListener('change', onChange);
      reducedTransparency.removeEventListener('change', onChange);
    };
  }

  setTier(0);

  let frames = 0;
  let acc = 0;
  let last = performance.now();
  let raf = 0;
  let cancelled = false;

  const sample = (now: number) => {
    if (cancelled) return;
    const dt = now - last;
    last = now;
    acc += dt;
    frames += 1;
    if (frames >= 120) {
      const avg = acc / frames;
      if (avg > 24) setTier(3);
      else if (avg > 20) setTier(2);
      else if (avg > 18) setTier(1);
      else setTier(0);
      return;
    }
    raf = requestAnimationFrame(sample);
  };

  raf = requestAnimationFrame(sample);

  const onChange = () => {
    if (applyStatic()) {
      cancelled = true;
      cancelAnimationFrame(raf);
    }
  };
  reducedMotion.addEventListener('change', onChange);
  reducedTransparency.addEventListener('change', onChange);

  return () => {
    cancelled = true;
    cancelAnimationFrame(raf);
    reducedMotion.removeEventListener('change', onChange);
    reducedTransparency.removeEventListener('change', onChange);
  };
}

export function enableLiquidRefractionSupport() {
  if (typeof window === 'undefined' || typeof CSS === 'undefined' || !CSS.supports) return;
  const chromium = /Chrome|Chromium|Edg\//.test(navigator.userAgent) && !/OPR\//.test(navigator.userAgent);
  if (
    chromium &&
    CSS.supports('backdrop-filter', 'url(#liquid-refraction)') &&
    CSS.supports('backdrop-filter', 'blur(16px)')
  ) {
    document.documentElement.classList.add('supports-liquid-refraction');
  }
}
