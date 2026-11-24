import { describe, it, expect } from 'vitest';
import {
  calcGiniCoefficient,
  calcPercentile,
  calcHeatmapMeans,
  detectDeadSlots,
} from '../math';

describe('Analytics Math & Statistical Algorithms', () => {
  describe('calcGiniCoefficient', () => {
    it('returns 0 for perfect equality', () => {
      expect(calcGiniCoefficient([10, 10, 10, 10, 10])).toBe(0);
      expect(calcGiniCoefficient([50, 50])).toBe(0);
    });

    it('returns 0 for empty or single-element arrays', () => {
      expect(calcGiniCoefficient([])).toBe(0);
      expect(calcGiniCoefficient([100])).toBe(0);
    });

    it('calculates expected inequality for known skewed distributions', () => {
      // One individual has everything, others have 0: Gini approaches 1 - 1/n
      const extremeSkew = [0, 0, 0, 0, 100];
      const giniExtreme = calcGiniCoefficient(extremeSkew);
      expect(giniExtreme).toBeCloseTo(0.8, 1);

      // Mild gradient
      const mildSkew = [10, 20, 30, 40, 50];
      const giniMild = calcGiniCoefficient(mildSkew);
      expect(giniMild).toBeGreaterThan(0.2);
      expect(giniMild).toBeLessThan(0.4);
    });
  });

  describe('calcPercentile', () => {
    it('accurately calculates median (p50), p90, and p99 on sorted arrays', () => {
      const arr = Array.from({ length: 101 }, (_, i) => i); // 0..100
      expect(calcPercentile(arr, 50)).toBe(50);
      expect(calcPercentile(arr, 90)).toBe(90);
      expect(calcPercentile(arr, 99)).toBe(99);
      expect(calcPercentile(arr, 0)).toBe(0);
      expect(calcPercentile(arr, 100)).toBe(100);
    });

    it('interpolates values between ranks smoothly', () => {
      const arr = [10, 20];
      expect(calcPercentile(arr, 50)).toBe(15);
    });
  });

  describe('calcHeatmapMeans', () => {
    it('computes row means, col means, and identifies the busiest cell', () => {
      const matrix = [
        [0.1, 0.2, 0.3],
        [0.4, 0.9, 0.5], // Busiest cell is (1, 1) = 0.9
      ];

      const res = calcHeatmapMeans(matrix);
      expect(res.rowMeans[0]).toBeCloseTo(0.2, 2);
      expect(res.rowMeans[1]).toBeCloseTo(0.6, 2);
      expect(res.colMeans[0]).toBeCloseTo(0.25, 2);
      expect(res.colMeans[1]).toBeCloseTo(0.55, 2);
      expect(res.colMeans[2]).toBeCloseTo(0.4, 2);
      expect(res.busiestCell).toEqual({ dow: 1, hour: 1, val: 0.9 });
    });
  });

  describe('detectDeadSlots', () => {
    it('flags slots under the threshold and identifies suspect sensors', () => {
      const sampleSlots = [
        { slotId: 1, zoneId: 'Z1', utilisationPct: 45.2, suspectFault: null },
        { slotId: 2, zoneId: 'Z1', utilisationPct: 1.1, suspectFault: 'disconnected' },
        { slotId: 3, zoneId: 'Z2', utilisationPct: 0.4, suspectFault: 'stuck' },
        { slotId: 4, zoneId: 'Z2', utilisationPct: 12.0, suspectFault: null },
      ];

      const dead = detectDeadSlots(sampleSlots, 2.0);
      expect(dead.length).toBe(2);
      expect(dead[0].slotId).toBe(3); // lowest first (0.4%)
      expect(dead[0].suspectSensor).toBe(true);
      expect(dead[0].faultType).toBe('stuck');

      expect(dead[1].slotId).toBe(2); // 1.1%
      expect(dead[1].suspectSensor).toBe(true);
      expect(dead[1].faultType).toBe('disconnected');
    });
  });
});
