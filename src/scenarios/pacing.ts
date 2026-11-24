/**
 * Central pacing configuration for claim scenario playback.
 * All claim-related durations, animations, and dwell times scale through `t()`.
 *
 * CLAIM_TIME_SCALE = 1.7 (1.0 = baseline speed, > 1.0 = slower).
 */
export const CLAIM_TIME_SCALE = 1.7;

let _claimPlaying = false;

export function setClaimPlaying(active: boolean): void {
  _claimPlaying = active;
}

export function isClaimPlaying(): boolean {
  return _claimPlaying;
}

export function isReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Scales a millisecond duration by CLAIM_TIME_SCALE.
 *
 * @param ms Duration in milliseconds at 1x speed
 * @returns Scaled millisecond duration
 */
export function t(ms: number): number {
  return Math.round(ms * CLAIM_TIME_SCALE);
}
