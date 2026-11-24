import { describe, it, expect } from 'vitest';
import {
  DEFAULT_ASSUMPTIONS,
  calcBaselineSearchTime,
  calcGuidedSearchTime,
  calcEffectiveSearchTime,
  calcDistanceCruisedKm,
  calcFuelConsumedLitres,
  calcCo2Kg,
  calcFuelCost,
  calcAbandonmentProb,
  calcFinancialPayback,
  getCapexPerSlot,
} from '../model';
import { createMulberry32 } from '../rng';

describe('Search-Time & Operational Mathematical Model', () => {
  it('enforces search time monotonicity: baseline search time increases with occupancy', () => {
    const occupancies = [0.1, 0.3, 0.5, 0.7, 0.9, 0.95];
    const times = occupancies.map(rho => calcBaselineSearchTime(rho, DEFAULT_ASSUMPTIONS));

    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
    }
  });

  it('guarantees guided search time is strictly faster than unguided baseline at moderate/high occupancy', () => {
    const testRhos = [0.4, 0.5, 0.7, 0.85, 0.95];
    testRhos.forEach(rho => {
      const tBase = calcBaselineSearchTime(rho, DEFAULT_ASSUMPTIONS);
      const tGuided = calcGuidedSearchTime(rho, DEFAULT_ASSUMPTIONS);
      expect(tGuided).toBeLessThan(tBase);
    });
  });

  it('matches T50 and T90 baseline calibration points exactly without noise', () => {
    const t50 = calcBaselineSearchTime(0.5, DEFAULT_ASSUMPTIONS);
    expect(Math.round(t50)).toBe(DEFAULT_ASSUMPTIONS.t50);

    const t90 = calcBaselineSearchTime(0.9, DEFAULT_ASSUMPTIONS);
    expect(Math.round(t90)).toBe(DEFAULT_ASSUMPTIONS.t90);
  });

  it('correctly weighs compliance in effective search time', () => {
    const tGuided = 20;
    const tBase = 100;

    // 100% compliance
    expect(calcEffectiveSearchTime(tGuided, tBase, 1.0)).toBe(20);

    // 0% compliance
    expect(calcEffectiveSearchTime(tGuided, tBase, 0.0)).toBe(100);

    // 90% compliance
    const eff90 = calcEffectiveSearchTime(tGuided, tBase, 0.9);
    expect(eff90).toBeCloseTo(0.9 * 20 + 0.1 * 100, 5);
  });

  it('correctly computes distance, fuel, CO2, and fuel costs', () => {
    const searchTimeSec = 3600; // 1 hour
    const distKm = calcDistanceCruisedKm(searchTimeSec, 8); // 8 km/h
    expect(distKm).toBe(8);

    const fuelL = calcFuelConsumedLitres(searchTimeSec, 0.9); // 0.9 L/h
    expect(fuelL).toBeCloseTo(0.9, 5);

    const co2Kg = calcCo2Kg(fuelL, 2.31);
    expect(co2Kg).toBeCloseTo(0.9 * 2.31, 5);

    const costRs = calcFuelCost(fuelL, 105);
    expect(costRs).toBeCloseTo(0.9 * 105, 5);
  });

  it('clamps abandonment probability between 0 and 0.25', () => {
    expect(calcAbandonmentProb(60)).toBe(0); // <= 180s
    expect(calcAbandonmentProb(180)).toBe(0);
    expect(calcAbandonmentProb(300)).toBeCloseTo(120 / 1200, 5);
    expect(calcAbandonmentProb(2000)).toBe(0.25); // capped at 0.25
  });

  it('calculates total capex breakdown accurately', () => {
    const capex = getCapexPerSlot(DEFAULT_ASSUMPTIONS);
    expect(capex).toBe(1420); // 90+100+220+260+600+150
  });

  it('computes positive financial payback with illustrative parameters', () => {
    const payback = calcFinancialPayback(
      480, // total slots
      DEFAULT_ASSUMPTIONS,
      50000, // total sessions
      120, // avg baseline sec
      35, // avg effective sec
      30 // days
    );

    expect(payback.totalCapexRs).toBe(480 * 1420);
    expect(payback.paybackMonths).toBeGreaterThan(0);
    expect(payback.paybackMonths).toBeLessThan(120);
    expect(payback.netMonthlyBenefitRs).toBeGreaterThan(0);
  });

  it('is deterministic when seeded with Mulberry32 RNG', () => {
    const rng1 = createMulberry32(12345);
    const rng2 = createMulberry32(12345);

    const sample1 = Array.from({ length: 5 }, () =>
      calcBaselineSearchTime(0.7, DEFAULT_ASSUMPTIONS, rng1)
    );
    const sample2 = Array.from({ length: 5 }, () =>
      calcBaselineSearchTime(0.7, DEFAULT_ASSUMPTIONS, rng2)
    );

    expect(sample1).toEqual(sample2);
  });
});
