/**
 * Pure Mathematical Model for ParkWay Search Times, Cruising, Emissions, and Economics.
 * All functions are pure, deterministic, and read strictly from the assumptions object.
 */

import { logNormalFactor, type RNG } from './rng';

export interface CapexBreakdown {
  hcSr04: number; // Rs 90
  esp32Share: number; // Rs 100
  ledAndDriver: number; // Rs 220
  wiringEnclosure: number; // Rs 260
  installCommissioning: number; // Rs 600
  networkDashboardShare: number; // Rs 150
}

export interface AnalyticsAssumptions {
  // Baseline Search Parameters
  t50: number; // seconds at 50% occupancy (default: 45)
  t90: number; // seconds at 90% occupancy (default: 270)
  tFloor: number; // floor seconds (default: 15)
  baselineNoiseSigma: number; // lognormal noise sigma (default: 0.35)

  // Guided Search Parameters
  tBase: number; // base guidance search time in seconds (default: 18)
  tSlope: number; // slope parameter in seconds (default: 22)
  guidedNoiseSigma: number; // lognormal noise sigma (default: 0.20)

  // Driver Behavior
  compliance: number; // fraction 0..1 who follow guidance (default: 0.90)

  // Cruising & Environmental
  cruiseSpeedKmH: number; // aisle cruise speed in km/h (default: 8)
  fuelPerHourL: number; // fuel consumption while idling/cruising in L/h (default: 0.9)
  co2FactorKgPerL: number; // CO2 emission factor in kg/L (default: 2.31)
  fuelPriceRsPerL: number; // fuel cost in Rs/L (default: 105)

  // Parking Facility Commercials
  parkingFeePerHourRs: number; // parking revenue per hour in Rs (default: 40)
  avgTicketValueAbandonedRs: number; // store/facility lost revenue per abandoned visit in Rs (default: 250)

  // Hardware Capital & Operational Expenses
  capexBreakdown: CapexBreakdown;
  opexPerSlotMonthRs: number; // maintenance/cloud/power in Rs/slot/month (default: 25)
  sensorReplacementAnnualRate: number; // annual replacement rate fraction (default: 0.04)
  discountRate: number; // cost of capital annual fraction (default: 0.10)
}

export const DEFAULT_ASSUMPTIONS: AnalyticsAssumptions = {
  t50: 45,
  t90: 270,
  tFloor: 15,
  baselineNoiseSigma: 0.35,

  tBase: 18,
  tSlope: 22,
  guidedNoiseSigma: 0.20,

  compliance: 0.90,

  cruiseSpeedKmH: 8,
  fuelPerHourL: 0.9,
  co2FactorKgPerL: 2.31,
  fuelPriceRsPerL: 105,

  parkingFeePerHourRs: 40,
  avgTicketValueAbandonedRs: 250,

  capexBreakdown: {
    hcSr04: 90,
    esp32Share: 100,
    ledAndDriver: 220,
    wiringEnclosure: 260,
    installCommissioning: 600,
    networkDashboardShare: 150,
  },
  opexPerSlotMonthRs: 25,
  sensorReplacementAnnualRate: 0.04,
  discountRate: 0.10,
};

/**
 * Calculates total capex per slot by summing breakdown items.
 */
export function getCapexPerSlot(assumptions: AnalyticsAssumptions): number {
  const b = assumptions.capexBreakdown;
  return (
    b.hcSr04 +
    b.esp32Share +
    b.ledAndDriver +
    b.wiringEnclosure +
    b.installCommissioning +
    b.networkDashboardShare
  );
}

/**
 * Unassisted / Baseline Search Time:
 * T0(rho) = max(tFloor, T50 * exp(k * (rho - 0.5)))
 * where k = ln(T90 / T50) / 0.4
 */
export function calcBaselineSearchTime(
  rho: number,
  assumptions: AnalyticsAssumptions,
  rng?: RNG
): number {
  const clampedRho = Math.max(0, Math.min(1, rho));
  const k = Math.log(assumptions.t90 / assumptions.t50) / 0.4;
  const rawT = assumptions.t50 * Math.exp(k * (clampedRho - 0.5));
  const deterministicTime = Math.max(assumptions.tFloor, rawT);

  if (!rng) return deterministicTime;
  const factor = logNormalFactor(rng, assumptions.baselineNoiseSigma);
  return Math.max(assumptions.tFloor, deterministicTime * factor);
}

/**
 * Guided Search Time:
 * T1(rho) = tBase + tSlope * rho
 */
export function calcGuidedSearchTime(
  rho: number,
  assumptions: AnalyticsAssumptions,
  rng?: RNG
): number {
  const clampedRho = Math.max(0, Math.min(1, rho));
  const deterministicTime = assumptions.tBase + assumptions.tSlope * clampedRho;

  if (!rng) return deterministicTime;
  const factor = logNormalFactor(rng, assumptions.guidedNoiseSigma);
  return Math.max(5, deterministicTime * factor);
}

/**
 * Effective Search Time taking driver compliance into account:
 * Driver follows lights with probability c, else behaves like baseline.
 */
export function calcEffectiveSearchTime(
  tGuided: number,
  tBaseline: number,
  compliance: number
): number {
  const c = Math.max(0, Math.min(1, compliance));
  return c * tGuided + (1 - c) * tBaseline;
}

/**
 * Distance Cruised in Kilometers:
 * Distance = (T in seconds / 3600) * cruiseSpeed in km/h
 */
export function calcDistanceCruisedKm(
  searchTimeSec: number,
  cruiseSpeedKmH: number
): number {
  return (Math.max(0, searchTimeSec) / 3600) * cruiseSpeedKmH;
}

/**
 * Fuel Consumed in Litres:
 * Fuel = (T in seconds / 3600) * fuelPerHour in L/h
 */
export function calcFuelConsumedLitres(
  searchTimeSec: number,
  fuelPerHourL: number
): number {
  return (Math.max(0, searchTimeSec) / 3600) * fuelPerHourL;
}

/**
 * CO2 Emissions in Kilograms:
 * CO2 = Fuel in Litres * co2Factor in kg/L
 */
export function calcCo2Kg(fuelLitres: number, co2FactorKgPerL: number): number {
  return Math.max(0, fuelLitres) * co2FactorKgPerL;
}

/**
 * Fuel Cost in Currency (Rs):
 * Cost = Fuel in Litres * fuelPrice in Rs/L
 */
export function calcFuelCost(fuelLitres: number, fuelPriceRsPerL: number): number {
  return Math.max(0, fuelLitres) * fuelPriceRsPerL;
}

/**
 * Abandonment Probability:
 * pAb = clamp((T - 180) / 1200, 0, 0.25)
 * If search time is <= 3 minutes, 0% abandonment.
 * If search time is 23 minutes, up to 25% abandonment.
 */
export function calcAbandonmentProb(searchTimeSec: number): number {
  return Math.max(0, Math.min(0.25, (searchTimeSec - 180) / 1200));
}

export interface PaybackAnalysis {
  totalCapexRs: number;
  annualOpexRs: number;
  annualSensorReplacementRs: number;
  annualTotalCostRs: number;
  monthlyDriverFuelSavedRs: number;
  monthlyOperatorRevenueProtectedRs: number;
  netMonthlyBenefitRs: number;
  paybackMonths: number;
}

/**
 * Computes financial payback period and operational benefits.
 */
export function calcFinancialPayback(
  totalSlots: number,
  assumptions: AnalyticsAssumptions,
  totalSessions: number,
  avgBaselineSec: number,
  avgEffectiveSec: number,
  durationDays: number
): PaybackAnalysis {
  const capexPerSlot = getCapexPerSlot(assumptions);
  const totalCapexRs = totalSlots * capexPerSlot;

  // Annual ongoing costs
  const annualOpexRs = totalSlots * assumptions.opexPerSlotMonthRs * 12;
  const annualSensorReplacementRs =
    totalSlots *
    assumptions.capexBreakdown.hcSr04 *
    assumptions.sensorReplacementAnnualRate;
  const annualTotalCostRs = annualOpexRs + annualSensorReplacementRs;
  const monthlyCostRs = annualTotalCostRs / 12;

  // Annualized sessions
  const sessionsPerDay = durationDays > 0 ? totalSessions / durationDays : 0;
  const monthlySessions = sessionsPerDay * 30.416;

  // Savings per session
  const deltaSecPerSession = Math.max(0, avgBaselineSec - avgEffectiveSec);
  const fuelSavedPerSessionL = calcFuelConsumedLitres(
    deltaSecPerSession,
    assumptions.fuelPerHourL
  );
  const monthlyDriverFuelSavedRs =
    monthlySessions * calcFuelCost(fuelSavedPerSessionL, assumptions.fuelPriceRsPerL);

  // Revenue protected from reduced abandonment during peak congested hours
  // Baseline search time peaks up to t90 (270s+), where drivers abandon without guidance
  const peakPeriodWeight = 0.35; // ~35% of visits occur during peak congested hours (rho >= 0.8)
  const pAbPeakBaseline = calcAbandonmentProb(assumptions.t90);
  const pAbPeakEffective = calcAbandonmentProb(assumptions.tBase + assumptions.tSlope * 0.9);
  const deltaAbandonedRate =
    Math.max(0, pAbPeakBaseline - pAbPeakEffective) * peakPeriodWeight * assumptions.compliance;
  const monthlyAbandonedVisitsPrevented = monthlySessions * deltaAbandonedRate;

  // Average dwell assumption for fee: 1.5 hours
  const revenuePerVisitRs =
    assumptions.avgTicketValueAbandonedRs + 1.5 * assumptions.parkingFeePerHourRs;
  const monthlyOperatorRevenueProtectedRs =
    monthlyAbandonedVisitsPrevented * revenuePerVisitRs;

  // Modest turnover efficiency gain (1.5% more turnover from faster slot turnover)
  const monthlyTurnoverGainRs = monthlySessions * 0.015 * assumptions.parkingFeePerHourRs;

  // Net monthly operator benefit considered for capex payback
  const netMonthlyBenefitRs = Math.max(
    1000,
    monthlyOperatorRevenueProtectedRs + monthlyTurnoverGainRs - monthlyCostRs
  );

  const paybackMonths =
    netMonthlyBenefitRs > 0
      ? Math.round((totalCapexRs / netMonthlyBenefitRs) * 10) / 10
      : 999;

  return {
    totalCapexRs,
    annualOpexRs,
    annualSensorReplacementRs,
    annualTotalCostRs,
    monthlyDriverFuelSavedRs,
    monthlyOperatorRevenueProtectedRs,
    netMonthlyBenefitRs,
    paybackMonths,
  };
}
