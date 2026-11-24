/**
 * Deterministic PRNG and statistical distribution functions for ParkWay Analytics.
 * Powered by Mulberry32 seeded RNG.
 */

export type RNG = () => number;

/**
 * Generates a 32-bit hash from a string to seed the PRNG.
 */
export function hashString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

/**
 * Creates a deterministic mulberry32 generator from a 32-bit seed.
 * Produces pseudo-random floats in [0, 1).
 */
export function createMulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return function mulberry32(): number {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Standard normal distribution generator using Box-Muller transform.
 * Returns a float with mean 0 and standard deviation 1.
 */
export function boxMuller(rng: RNG): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng(); // Avoid log(0)
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Generates a lognormal random variable with mean-preserving scaling.
 * Expectation E[X] = exp(mu + sigma^2 / 2).
 * If centering around 1 with parameter sigma, uses exp(z * sigma - sigma^2 / 2).
 */
export function logNormalFactor(rng: RNG, sigma: number): number {
  const z = boxMuller(rng);
  return Math.exp(z * sigma - 0.5 * sigma * sigma);
}

/**
 * Poisson random variable generator.
 * For small to moderate lambda uses Knuth's algorithm; for large lambda uses Gaussian approximation.
 */
export function poisson(rng: RNG, lambda: number): number {
  if (lambda <= 0) return 0;
  if (lambda > 30) {
    // Gaussian approximation for large lambda
    const z = boxMuller(rng);
    const val = Math.round(lambda + Math.sqrt(lambda) * z);
    return Math.max(0, val);
  }
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1.0;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}
