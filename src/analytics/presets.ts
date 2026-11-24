/**
 * Facility Presets for ParkWay Analytics.
 * Configured to match real physical deployment environments.
 */

import { FacilityPresetId, PresetConfig } from './types';

export const FACILITY_PRESETS: Record<FacilityPresetId, PresetConfig> = {
  mall: {
    id: 'mall',
    name: 'Retail Shopping Mall',
    shortName: 'Mall 480',
    totalSlots: 480,
    description: '6 zones × 80 slots. High weekend and evening peaks with steady dwell turnover.',
    targetOccupancyPeak: 0.94,
    medianDwellMin: 95,
    dwellLogSigma: 0.45,
    specialEventDayIndices: [6, 13, 27, 41, 55, 76], // festival weekends
    specialEventMultiplier: 1.42,
    zones: [
      { id: 'Z1', name: 'West Atrium (North Entry)', slotCount: 80, entranceDistanceFactor: 1.0 },
      { id: 'Z2', name: 'Anchor Store Direct', slotCount: 80, entranceDistanceFactor: 1.05 },
      { id: 'Z3', name: 'Cinema & Food Court Upper', slotCount: 80, entranceDistanceFactor: 1.15 },
      { id: 'Z4', name: 'Cinema & Food Court Lower', slotCount: 80, entranceDistanceFactor: 1.25 },
      { id: 'Z5', name: 'East Plaza Mezzanine', slotCount: 80, entranceDistanceFactor: 1.35 },
      { id: 'Z6', name: 'South Overflow Deck', slotCount: 80, entranceDistanceFactor: 1.45 },
    ],
  },

  office: {
    id: 'office',
    name: 'Corporate Tech Campus',
    shortName: 'Office campus 320',
    totalSlots: 320,
    description: '4 zones × 80 slots. Morning rush arrivals, workday dwell (8-9h), quiet weekends.',
    targetOccupancyPeak: 0.91,
    medianDwellMin: 510, // ~8.5 hours
    dwellLogSigma: 0.18,
    specialEventDayIndices: [14, 45, 77], // campus all-hands events
    specialEventMultiplier: 1.35,
    zones: [
      { id: 'Z1', name: 'Executive & Visitor Bay', slotCount: 80, entranceDistanceFactor: 1.0 },
      { id: 'Z2', name: 'Engineering Core East', slotCount: 80, entranceDistanceFactor: 1.1 },
      { id: 'Z3', name: 'Engineering Core West', slotCount: 80, entranceDistanceFactor: 1.2 },
      { id: 'Z4', name: 'Perimeter Overflow Wing', slotCount: 80, entranceDistanceFactor: 1.35 },
    ],
  },

  hospital: {
    id: 'hospital',
    name: 'Metropolitan Hospital & Clinics',
    shortName: 'Hospital 240',
    totalSlots: 240,
    description: '3 zones × 80 slots. Continuous 07:00-20:00 demand, emergency night baseline, bimodal dwell.',
    targetOccupancyPeak: 0.88,
    medianDwellMin: 130,
    dwellLogSigma: 0.65,
    isBimodalDwell: true,
    bimodalRatio: 0.45, // 45% outpatient/quick visits
    bimodalShortDwellMin: 35,
    bimodalLongDwellMin: 360, // 6 hours
    specialEventDayIndices: [10, 32, 60], // blood drives / clinic seminar days
    specialEventMultiplier: 1.30,
    zones: [
      { id: 'Z1', name: 'Emergency & Urgent Ambulatory', slotCount: 80, entranceDistanceFactor: 1.0 },
      { id: 'Z2', name: 'Main Hospital Outpatient', slotCount: 80, entranceDistanceFactor: 1.15 },
      { id: 'Z3', name: 'Specialist Suites & Staff Wing', slotCount: 80, entranceDistanceFactor: 1.3 },
    ],
  },

  airport: {
    id: 'airport',
    name: 'International Airport Short-Stay',
    shortName: 'Airport short-stay 600',
    totalSlots: 600,
    description: '5 zones × 120 slots. Continuous flight-wave surges, multiday dwell (6-72 hours).',
    targetOccupancyPeak: 0.96,
    medianDwellMin: 1800, // 30 hours
    dwellLogSigma: 0.85,
    specialEventDayIndices: [5, 12, 26, 40, 54, 82], // holiday flight clusters
    specialEventMultiplier: 1.38,
    zones: [
      { id: 'Z1', name: 'Terminal 1 Premium Walkway', slotCount: 120, entranceDistanceFactor: 1.0 },
      { id: 'Z2', name: 'Terminal 1 Skybridge Level', slotCount: 120, entranceDistanceFactor: 1.1 },
      { id: 'Z3', name: 'Terminal 2 Direct Concourse', slotCount: 120, entranceDistanceFactor: 1.2 },
      { id: 'Z4', name: 'Inter-Terminal Express Link', slotCount: 120, entranceDistanceFactor: 1.3 },
      { id: 'Z5', name: 'South Long-Term Rapid Connect', slotCount: 120, entranceDistanceFactor: 1.45 },
    ],
  },
};

/**
 * Returns arrival intensity lambda(h, dow) multiplier for hour of day and day of week.
 * dow: 0 = Sun, 1 = Mon, ... 6 = Sat
 * h: 0..23
 */
export function getArrivalRateMultiplier(
  presetId: FacilityPresetId,
  dow: number,
  h: number
): number {
  const isWeekend = dow === 0 || dow === 6;

  switch (presetId) {
    case 'mall': {
      if (isWeekend) {
        if (h >= 12 && h < 21) return 2.6;
        if (h >= 10 && h < 12) return 1.8;
        if (h >= 21 && h < 23) return 1.2;
        if (h >= 8 && h < 10) return 0.5;
        return 0.1;
      }
      // Weekdays: lunchtime peak and evening rush 17:00-21:00
      if (h >= 17 && h < 21) return 2.1;
      if (h >= 12 && h < 14) return 1.4;
      if (h >= 10 && h < 17) return 1.0;
      if (h >= 21 && h < 23) return 0.6;
      return 0.08;
    }

    case 'office': {
      if (isWeekend) {
        return 0.04; // Near-empty weekends
      }
      // Mon-Fri: steep arrival peak 08:00-10:00
      if (h >= 8 && h < 10) return 3.4;
      if (h >= 7 && h < 8) return 1.5;
      if (h >= 10 && h < 12) return 0.7;
      if (h >= 12 && h < 14) return 0.5;
      if (h >= 14 && h < 16) return 0.3;
      return 0.05;
    }

    case 'hospital': {
      // Steady 07:00-20:00 with morning clinic surge and night emergency
      if (h >= 7 && h < 12) return 1.8;
      if (h >= 12 && h < 17) return 1.5;
      if (h >= 17 && h < 20) return 1.2;
      if (h >= 20 && h < 23) return 0.6;
      return 0.35; // Night emergency admissions
    }

    case 'airport': {
      // Flight waves occur roughly every 3-4 hours: peaks at 06:00, 10:00, 14:00, 18:00, 22:00
      const wavePhase = (h % 4);
      const baseFlightWave = wavePhase === 2 ? 1.9 : wavePhase === 1 ? 1.5 : 1.1;
      return isWeekend ? baseFlightWave * 1.25 : baseFlightWave;
    }
  }
}
