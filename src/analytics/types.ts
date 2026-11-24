/**
 * TypeScript Interfaces and Types for ParkWay Analytics.
 */

export type FacilityPresetId = 'mall' | 'office' | 'hospital' | 'airport';

export type TimeRangeDays = 7 | 30 | 90;

export interface ZoneConfig {
  id: string; // e.g. 'Z1', 'Z2'
  name: string; // e.g. 'Zone A (North Gate)'
  slotCount: number; // multiple of 8
  entranceDistanceFactor: number; // 1.0 = nearest zone, 1.4 = farther
}

export interface PresetConfig {
  id: FacilityPresetId;
  name: string;
  shortName: string;
  totalSlots: number;
  zones: ZoneConfig[];
  description: string;
  targetOccupancyPeak: number; // e.g. 0.94
  medianDwellMin: number;
  dwellLogSigma: number;
  isBimodalDwell?: boolean;
  bimodalRatio?: number; // fraction short dwell
  bimodalShortDwellMin?: number;
  bimodalLongDwellMin?: number;
  specialEventDayIndices: number[]; // e.g. [12, 13, 34, 35, 62, 78]
  specialEventMultiplier: number; // e.g. 1.40
}

export type SensorFaultType = 'stuck' | 'disconnected' | 'noisy' | 'intermittent';

export interface SensorFaultEvent {
  sensorId: number; // 0..totalSlots - 1
  slotId: number;
  zoneId: string;
  type: SensorFaultType;
  startMinute: number;
  endMinute: number;
  description: string;
}

export interface DailySparklinePoint {
  day: number;
  value: number;
}

export interface SearchTimeHistogramBin {
  timeSec: number;
  baselineCount: number;
  guidedCount: number;
}

export interface OccupancyBandStat {
  band: string; // e.g. '0-20%', '20-40%', ...
  avgOccupancy: number;
  baselineSec: number;
  guidedSec: number;
  sampleCount: number;
}

export interface KpiSummary {
  // 1. Avg Search Time
  avgGuidedSearchTimeSec: number;
  avgBaselineSearchTimeSec: number;
  searchTimeReductionPct: number;
  searchTimeSparkline: DailySparklinePoint[];
  searchTimeDeltaPct: number;

  // 2. Distance Saved
  distanceSavedKm: number;
  distanceSavedSparkline: DailySparklinePoint[];
  distanceSavedDeltaPct: number;

  // 3. Fuel Saved
  fuelSavedLitres: number;
  fuelSavedSparkline: DailySparklinePoint[];
  fuelSavedDeltaPct: number;

  // 4. CO2 Avoided
  co2AvoidedKg: number;
  co2AvoidedSparkline: DailySparklinePoint[];
  co2AvoidedDeltaPct: number;

  // 5. Peak Occupancy
  peakOccupancyPct: number;
  peakOccupancyTimestamp: string;
  peakOccupancySparkline: DailySparklinePoint[];
  peakOccupancyDeltaPct: number;

  // 6. Avg Turnover
  avgTurnoverPerSlotPerDay: number;
  turnoverSparkline: DailySparklinePoint[];
  turnoverDeltaPct: number;

  // 7. Sensor Uptime
  sensorUptimePct: number;
  sensorUptimeSparkline: DailySparklinePoint[];
  sensorUptimeDeltaPct: number;

  // 8. Payback
  paybackMonths: number;
  monthlySavingsRs: number;
  paybackSparkline: DailySparklinePoint[];
  paybackDeltaPct: number;
}

export interface SlotMetric {
  slotId: number; // 1-based (S1..Sn)
  zoneId: string;
  zoneName: string;
  positionIndex: number; // 0, 1, 2, 3
  utilisationPct: number;
  sessionCount: number;
  meanDwellMinutes: number;
  dailyOccupiedMinutes: number[];
  isDeadSlot: boolean;
  suspectFault: SensorFaultType | null;
  faultDescription: string | null;
}

export interface CumulativeSavingsPoint {
  day: number;
  label: string;
  cumulativeFuelL: number;
  cumulativeCo2Kg: number;
  cumulativeDriverHours: number;
  cumulativeAbandonedSaved: number;
  cumulativeRevenueProtectedRs: number;
}

export interface PercentilesRecord {
  p50: number;
  p90: number;
  p99: number;
  baselineP50: number;
  baselineP90: number;
  baselineP99: number;
}

export interface TurnoverByDOWHourPoint {
  dow: number;
  hour: number;
  dayLabel: string;
  hourLabel: string;
  turnoverPerSlotDay: number;
}

export interface SimulationAggregates {
  presetId: FacilityPresetId;
  totalSlots: number;
  rangeDays: TimeRangeDays;
  totalSessions: number;
  seed: number;
  version: number;
  generatedTimestamp: number;

  // KPIs
  kpis: KpiSummary;

  // Hourly occupancy: rows = hours (rangeDays * 24), cols = zones
  hourlyTimestamps: number[]; // start minute of each hour
  hourlyZoneOccupancy: number[][]; // [hourIndex][zoneIndex] = fraction 0..1
  hourlyTotalOccupancy: number[]; // [hourIndex] = fraction 0..1

  // Zone & Position Utilisation
  zoneUtilisation: { zoneId: string; name: string; slotCount: number; avgUtilisationPct: number; peakUtilisationPct: number }[];
  positionUtilisation: { positionIndex: number; avgUtilisationPct: number }[]; // 0, 1, 2, 3
  giniCoefficient: number;

  // Individual Slot Metrics & Time-lapse States
  slots: SlotMetric[];
  slotHourlyOccupied: Uint8Array | number[]; // size: totalHours * totalSlots

  // Day of Week by Hour Matrix: 7 rows (Sun=0..Sat=6) x 24 cols
  dowHourOccupancyMatrix: number[][];

  // Cumulative Savings Timeseries
  cumulativeSavings: CumulativeSavingsPoint[];

  // Dwell histogram & Overstay KPIs
  dwellHistogramBins: { minDwell: number; maxDwell: number; label: string; count: number }[];
  shortStayPct: number;
  mediumStayPct: number;
  longStayPct: number;
  slotHoursLostToOverstay: number;

  // Arrivals and departures per hour
  hourlyArrivals: number[];
  hourlyDepartures: number[];
  turnoverByDOWHour: TurnoverByDOWHourPoint[];

  // Search time histograms & occupancy curves (5% steps from 50% to 100%)
  searchTimeHistograms: SearchTimeHistogramBin[];
  peakSearchTimeHistograms: SearchTimeHistogramBin[];
  searchTimeByOccupancy: OccupancyBandStat[];
  searchTimePercentilesAll: PercentilesRecord;
  searchTimePercentilesPeak: PercentilesRecord;

  // Fleet health & faults
  faultEvents: SensorFaultEvent[];
  fleetFaultDistribution: Record<SensorFaultType, number>;
}

