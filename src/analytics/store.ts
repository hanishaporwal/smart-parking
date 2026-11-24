/**
 * Zustand Store for ParkWay Analytics.
 * Handles facility preset, time range, zone filter, model assumptions,
 * worker generation progress, derived KPIs, and dataset export.
 */

import { create } from 'zustand';
import {
  FacilityPresetId,
  TimeRangeDays,
  SimulationAggregates,
} from './types';
import {
  AnalyticsAssumptions,
  DEFAULT_ASSUMPTIONS,
  calcFinancialPayback,
  calcDistanceCruisedKm,
  calcFuelConsumedLitres,
  calcCo2Kg,
} from './model';
import { generateAnalyticsDataset } from './client';

export interface AnalyticsState {
  presetId: FacilityPresetId;
  rangeDays: TimeRangeDays;
  zoneFilter: string; // 'all' or zoneId (e.g. 'Z1')
  assumptions: AnalyticsAssumptions;
  isAssumptionsDrawerOpen: boolean;

  isLoading: boolean;
  progress: number;
  progressMessage: string;
  aggregates: SimulationAggregates | null;
  error: string | null;

  // Actions
  setPreset: (presetId: FacilityPresetId) => void;
  setRangeDays: (days: TimeRangeDays) => void;
  setZoneFilter: (zoneId: string) => void;
  setAssumptionsDrawerOpen: (open: boolean) => void;
  updateAssumption: <K extends keyof AnalyticsAssumptions>(key: K, value: AnalyticsAssumptions[K]) => void;
  updateCapexBreakdown: (key: keyof AnalyticsAssumptions['capexBreakdown'], value: number) => void;
  resetAssumptions: () => void;
  loadDataset: (skipCache?: boolean) => Promise<void>;
  exportDataset: (format: 'csv' | 'json') => void;
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  presetId: 'mall',
  rangeDays: 30,
  zoneFilter: 'all',
  assumptions: { ...DEFAULT_ASSUMPTIONS },
  isAssumptionsDrawerOpen: false,

  isLoading: false,
  progress: 0,
  progressMessage: '',
  aggregates: null,
  error: null,

  setPreset: (presetId: FacilityPresetId) => {
    if (get().presetId === presetId) return;
    set({ presetId, zoneFilter: 'all' });
    get().loadDataset();
  },

  setRangeDays: (rangeDays: TimeRangeDays) => {
    if (get().rangeDays === rangeDays) return;
    set({ rangeDays });
    get().loadDataset();
  },

  setZoneFilter: (zoneFilter: string) => {
    set({ zoneFilter });
  },

  setAssumptionsDrawerOpen: (open: boolean) => {
    set({ isAssumptionsDrawerOpen: open });
  },

  updateAssumption: (key, value) => {
    const current = get().assumptions;
    const updated = { ...current, [key]: value };
    set({ assumptions: updated });

    // Instantly recompute derived KPIs without re-simulating
    const aggregates = get().aggregates;
    if (aggregates) {
      const recomputed = recomputeAggregatesWithAssumptions(aggregates, updated);
      set({ aggregates: recomputed });
    }
  },

  updateCapexBreakdown: (key, value) => {
    const current = get().assumptions;
    const updated = {
      ...current,
      capexBreakdown: {
        ...current.capexBreakdown,
        [key]: value,
      },
    };
    set({ assumptions: updated });

    const aggregates = get().aggregates;
    if (aggregates) {
      const recomputed = recomputeAggregatesWithAssumptions(aggregates, updated);
      set({ aggregates: recomputed });
    }
  },

  resetAssumptions: () => {
    const updated = { ...DEFAULT_ASSUMPTIONS };
    set({ assumptions: updated });

    const aggregates = get().aggregates;
    if (aggregates) {
      const recomputed = recomputeAggregatesWithAssumptions(aggregates, updated);
      set({ aggregates: recomputed });
    }
  },

  loadDataset: async (skipCache = false) => {
    const { presetId, rangeDays, assumptions } = get();
    set({ isLoading: true, progress: 0.05, progressMessage: 'Initializing operational model...', error: null });

    try {
      const aggregates = await generateAnalyticsDataset(
        {
          presetId,
          days: rangeDays,
          assumptions,
          onProgress: (progress, message) => {
            set({ progress, progressMessage: message });
          },
        },
        skipCache
      );

      // Recompute with current in-memory assumptions in case user modified them
      const withCurrentAssumptions = recomputeAggregatesWithAssumptions(aggregates, assumptions);
      set({ aggregates: withCurrentAssumptions, isLoading: false, progress: 1.0, progressMessage: '' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate dataset';
      set({ error: msg, isLoading: false, progress: 0 });
    }
  },

  exportDataset: (format: 'csv' | 'json') => {
    const { aggregates, assumptions, presetId, rangeDays } = get();
    if (!aggregates) return;

    if (format === 'json') {
      const exportPayload = {
        metadata: {
          app: 'ParkWay Smart Parking',
          disclaimer: 'SYNTHETIC DATA — ASSUMPTION-BASED OPERATIONAL MODEL',
          preset: presetId,
          rangeDays,
          generatedAt: new Date(aggregates.generatedTimestamp).toISOString(),
          seed: aggregates.seed,
          version: aggregates.version,
        },
        assumptions,
        kpis: aggregates.kpis,
        zoneUtilisation: aggregates.zoneUtilisation,
        positionUtilisation: aggregates.positionUtilisation,
        faultEvents: aggregates.faultEvents,
        searchTimeByOccupancy: aggregates.searchTimeByOccupancy,
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: 'application/json',
      });
      downloadBlob(blob, `parkway_analytics_${presetId}_${rangeDays}d.json`);
    } else {
      // CSV Export of Hourly Occupancy and KPIs
      const lines: string[] = [];
      lines.push('# ParkWay Deployment Analytics - Synthetic Data Export');
      lines.push(`# Preset: ${presetId}, Range: ${rangeDays} days, Seed: ${aggregates.seed}`);
      lines.push('# All metrics are synthetic projections derived from mathematical assumptions');
      lines.push('');
      lines.push('HourIndex,TotalOccupancyRate,Arrivals,Departures');

      for (let h = 0; h < aggregates.hourlyTotalOccupancy.length; h++) {
        lines.push(
          `${h},${aggregates.hourlyTotalOccupancy[h].toFixed(4)},${aggregates.hourlyArrivals[h] || 0},${aggregates.hourlyDepartures[h] || 0}`
        );
      }

      lines.push('');
      lines.push('ZoneId,ZoneName,Slots,AvgUtilisationPct');
      aggregates.zoneUtilisation.forEach(z => {
        lines.push(`${z.zoneId},"${z.name}",${z.slotCount},${z.avgUtilisationPct}`);
      });

      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, `parkway_analytics_${presetId}_${rangeDays}d.csv`);
    }
  },
}));

/**
 * Recomputes derived economic and environmental KPIs based on current assumptions.
 */
function recomputeAggregatesWithAssumptions(
  aggregates: SimulationAggregates,
  assumptions: AnalyticsAssumptions
): SimulationAggregates {
  const { kpis, totalSessions, totalSlots, rangeDays } = aggregates;

  // Search time scaling
  const effectiveReduction =
    kpis.avgBaselineSearchTimeSec > 0
      ? Math.round(
          ((kpis.avgBaselineSearchTimeSec - kpis.avgGuidedSearchTimeSec) /
            kpis.avgBaselineSearchTimeSec) *
            1000
        ) / 10
      : 0;

  const totalDiffSec =
    Math.max(0, kpis.avgBaselineSearchTimeSec - kpis.avgGuidedSearchTimeSec) * totalSessions;
  const distanceSavedKm = Math.round(
    calcDistanceCruisedKm(totalDiffSec, assumptions.cruiseSpeedKmH)
  );
  const fuelSavedLitres = Math.round(
    calcFuelConsumedLitres(totalDiffSec, assumptions.fuelPerHourL)
  );
  const co2AvoidedKg = Math.round(calcCo2Kg(fuelSavedLitres, assumptions.co2FactorKgPerL));

  const payback = calcFinancialPayback(
    totalSlots,
    assumptions,
    totalSessions,
    kpis.avgBaselineSearchTimeSec,
    kpis.avgGuidedSearchTimeSec,
    rangeDays
  );

  return {
    ...aggregates,
    kpis: {
      ...kpis,
      searchTimeReductionPct: effectiveReduction,
      distanceSavedKm,
      fuelSavedLitres,
      co2AvoidedKg,
      paybackMonths: payback.paybackMonths,
      monthlySavingsRs: Math.round(payback.netMonthlyBenefitRs),
    },
  };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
