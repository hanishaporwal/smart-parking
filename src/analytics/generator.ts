/**
 * High-performance deterministic simulation engine for ParkWay Analytics.
 * Generates minute-by-minute parking sessions, computes search-time counterfactuals,
 * enforces the firmware lowest-position-first assignment rule, and produces aggregates.
 */

import {
  createMulberry32,
  hashString,
  poisson,
  logNormalFactor,
  boxMuller,
} from './rng';
import {
  AnalyticsAssumptions,
  DEFAULT_ASSUMPTIONS,
  calcBaselineSearchTime,
  calcGuidedSearchTime,
  calcEffectiveSearchTime,
  calcDistanceCruisedKm,
  calcFuelConsumedLitres,
  calcCo2Kg,
  calcAbandonmentProb,
  calcFinancialPayback,
} from './model';
import {
  FacilityPresetId,
  TimeRangeDays,
  SimulationAggregates,
  SensorFaultEvent,
  SensorFaultType,
  DailySparklinePoint,
  SearchTimeHistogramBin,
  OccupancyBandStat,
  SlotMetric,
  CumulativeSavingsPoint,
  PercentilesRecord,
  TurnoverByDOWHourPoint,
} from './types';
import { FACILITY_PRESETS, getArrivalRateMultiplier } from './presets';
import { calcGiniCoefficient, calcPercentile } from './math';

export interface GenerateOptions {
  presetId: FacilityPresetId;
  days: TimeRangeDays;
  assumptions?: AnalyticsAssumptions;
  seedOverride?: number;
  onProgress?: (progress: number, message: string) => void;
}

const DATA_VERSION = 1;

/**
 * Runs the full deterministic simulation for the specified facility preset and range.
 */
export function runSimulation(options: GenerateOptions): SimulationAggregates {
  const {
    presetId,
    days,
    assumptions = DEFAULT_ASSUMPTIONS,
    seedOverride,
    onProgress,
  } = options;

  const preset = FACILITY_PRESETS[presetId];
  if (!preset) {
    throw new Error(`Unknown facility preset: ${presetId}`);
  }

  const seed = seedOverride ?? hashString(`${presetId}_${days}_v${DATA_VERSION}`);
  const rng = createMulberry32(seed);

  const totalSlots = preset.totalSlots;
  const numZones = preset.zones.length;
  const totalMinutes = days * 24 * 60;
  const totalHours = days * 24;

  // Setup Slot metadata
  const slotZones = new Uint8Array(totalSlots);
  const slotPositions = new Uint8Array(totalSlots);
  const slotOccupiedUntil = new Int32Array(totalSlots).fill(-1);
  const slotTotalOccupiedMinutes = new Uint32Array(totalSlots);
  const slotSessionCount = new Uint32Array(totalSlots);
  const slotTotalDwellMinutes = new Float64Array(totalSlots);
  const slotDailyOccupiedMinutes = Array.from({ length: totalSlots }, () => new Uint16Array(days));

  let currentSlotOffset = 0;
  const zoneSlotRanges: { start: number; end: number; zoneIndex: number }[] = [];

  preset.zones.forEach((zone, zIdx) => {
    const start = currentSlotOffset;
    const end = start + zone.slotCount;
    zoneSlotRanges.push({ start, end, zoneIndex: zIdx });

    for (let s = start; s < end; s++) {
      slotZones[s] = zIdx;
      slotPositions[s] = (s - start) % 4; // 0, 1, 2, 3
    }
    currentSlotOffset = end;
  });

  // Base arrival calibration
  const avgDwellHours = preset.medianDwellMin / 60;
  const nominalOccupancyTarget = preset.targetOccupancyPeak * 0.72;
  const baseArrivalPerHour = (totalSlots * nominalOccupancyTarget) / Math.max(0.5, avgDwellHours);
  const baseArrivalPerMinute = baseArrivalPerHour / 60;

  // Session storage
  const initialCap = Math.max(10000, days * totalSlots * 5);
  let sessionCapacity = initialCap;
  let sessionCount = 0;

  let sessionStartMin = new Int32Array(sessionCapacity);
  let sessionEndMin = new Int32Array(sessionCapacity);
  let sessionZone = new Uint8Array(sessionCapacity);
  let sessionSlot = new Uint16Array(sessionCapacity);
  let sessionPosition = new Uint8Array(sessionCapacity);
  let sessionRho = new Float32Array(sessionCapacity);
  let sessionTGuided = new Float32Array(sessionCapacity);
  let sessionTBaseline = new Float32Array(sessionCapacity);
  let sessionTEffective = new Float32Array(sessionCapacity);
  let sessionAbandoned = new Uint8Array(sessionCapacity);

  function expandSessionBuffers() {
    const newCap = sessionCapacity * 2;
    const sStart = new Int32Array(newCap);
    sStart.set(sessionStartMin);
    sessionStartMin = sStart;

    const sEnd = new Int32Array(newCap);
    sEnd.set(sessionEndMin);
    sessionEndMin = sEnd;

    const sZone = new Uint8Array(newCap);
    sZone.set(sessionZone);
    sessionZone = sZone;

    const sSlot = new Uint16Array(newCap);
    sSlot.set(sessionSlot);
    sessionSlot = sSlot;

    const sPos = new Uint8Array(newCap);
    sPos.set(sessionPosition);
    sessionPosition = sPos;

    const sRho = new Float32Array(newCap);
    sRho.set(sessionRho);
    sessionRho = sRho;

    const sTGuided = new Float32Array(newCap);
    sTGuided.set(sessionTGuided);
    sessionTGuided = sTGuided;

    const sTBase = new Float32Array(newCap);
    sTBase.set(sessionTBaseline);
    sessionTBaseline = sTBase;

    const sTEff = new Float32Array(newCap);
    sTEff.set(sessionTEffective);
    sessionTEffective = sTEff;

    const sAb = new Uint8Array(newCap);
    sAb.set(sessionAbandoned);
    sessionAbandoned = sAb;

    sessionCapacity = newCap;
  }

  // Tracking hourly arrivals and departures
  const hourlyArrivals = new Uint32Array(totalHours);
  const hourlyDepartures = new Uint32Array(totalHours);
  const hourlyZoneOccupancyCounts = Array.from({ length: totalHours }, () => new Uint16Array(numZones));
  const hourlyTotalOccupancy = new Float32Array(totalHours);
  const slotHourlyOccupied = new Uint8Array(totalHours * totalSlots);

  // Day-of-week (7) by Hour (24) occupancy accumulator
  const dowHourOccupancySum = Array.from({ length: 7 }, () => new Float64Array(24));
  const dowHourCount = Array.from({ length: 7 }, () => new Uint32Array(24));
  const dowHourTurnoverSum = Array.from({ length: 7 }, () => new Float64Array(24));

  // Current occupancy counters
  const zoneCurrentOccupied = new Uint16Array(numZones);
  let totalCurrentOccupied = 0;

  const progressInterval = Math.max(1000, Math.floor(totalMinutes / 20));

  // Run Minute-by-Minute Simulation
  for (let m = 0; m < totalMinutes; m++) {
    if (m % progressInterval === 0 && onProgress) {
      const pct = m / totalMinutes;
      onProgress(pct * 0.7, `Simulating live facility traffic (${Math.round(pct * 100)}%)...`);
    }

    const currentHourIndex = Math.floor(m / 60);
    const dayIndex = Math.floor(m / (24 * 60));
    const minuteInDay = m % (24 * 60);
    const hourOfDay = Math.floor(minuteInDay / 60);
    const dow = (dayIndex + 1) % 7; // Mon=1..Sun=0

    // 1. Process Departures
    for (let s = 0; s < totalSlots; s++) {
      if (slotOccupiedUntil[s] === m) {
        slotOccupiedUntil[s] = -1;
        const zIdx = slotZones[s];
        zoneCurrentOccupied[zIdx]--;
        totalCurrentOccupied--;
        hourlyDepartures[currentHourIndex]++;
      }
    }

    // 2. Compute current arrival intensity
    const dowHourMultiplier = getArrivalRateMultiplier(presetId, dow, hourOfDay);
    const isSpecialEvent = preset.specialEventDayIndices.includes(dayIndex);
    const eventFactor = isSpecialEvent ? preset.specialEventMultiplier : 1.0;
    const weekIndex = Math.floor(dayIndex / 7);
    const seasonalTrend = 1.0 + 0.05 * Math.sin((weekIndex / 12) * Math.PI * 2);

    const currentRho = totalCurrentOccupied / totalSlots;
    const capacityThrottle =
      currentRho >= 0.98 ? 0.05 : currentRho >= 0.93 ? 0.45 : currentRho >= 0.88 ? 0.8 : 1.0;

    const minuteLambda =
      baseArrivalPerMinute *
      dowHourMultiplier *
      eventFactor *
      seasonalTrend *
      capacityThrottle;

    const arrivalsThisMinute = poisson(rng, minuteLambda);

    // 3. Assign Arriving Drivers to Slots
    for (let a = 0; a < arrivalsThisMinute; a++) {
      if (totalCurrentOccupied >= totalSlots) break;

      let chosenZoneIdx = -1;
      let minZoneRho = 1.0;

      for (let z = 0; z < numZones; z++) {
        const zoneCap = preset.zones[z].slotCount;
        const occ = zoneCurrentOccupied[z];
        if (occ < zoneCap) {
          const zRho = occ / zoneCap;
          const score = zRho * preset.zones[z].entranceDistanceFactor;
          if (score < minZoneRho) {
            minZoneRho = score;
            chosenZoneIdx = z;
          }
        }
      }

      if (chosenZoneIdx === -1) {
        for (let z = 0; z < numZones; z++) {
          if (zoneCurrentOccupied[z] < preset.zones[z].slotCount) {
            chosenZoneIdx = z;
            break;
          }
        }
      }

      if (chosenZoneIdx === -1) continue;

      // Firmware Assignment Rule: Lowest position index first (0 before 1 before 2 before 3)
      const zRange = zoneSlotRanges[chosenZoneIdx];
      let bestSlot = -1;
      let bestPosition = 999;

      for (let s = zRange.start; s < zRange.end; s++) {
        if (slotOccupiedUntil[s] === -1) {
          const pos = slotPositions[s];
          if (pos < bestPosition) {
            bestPosition = pos;
            bestSlot = s;
            if (pos === 0) break;
          }
        }
      }

      if (bestSlot === -1) continue;

      let dwellMinutes = 0;
      if (preset.isBimodalDwell) {
        const isShort = rng() < (preset.bimodalRatio ?? 0.5);
        if (isShort) {
          dwellMinutes = Math.max(10, Math.round(preset.bimodalShortDwellMin! * logNormalFactor(rng, 0.3)));
        } else {
          dwellMinutes = Math.max(30, Math.round(preset.bimodalLongDwellMin! * logNormalFactor(rng, 0.4)));
        }
      } else {
        dwellMinutes = Math.max(
          12,
          Math.round(preset.medianDwellMin * logNormalFactor(rng, preset.dwellLogSigma))
        );
      }

      const depMinute = m + dwellMinutes;
      slotOccupiedUntil[bestSlot] = depMinute;
      zoneCurrentOccupied[chosenZoneIdx]++;
      totalCurrentOccupied++;
      hourlyArrivals[currentHourIndex]++;
      slotSessionCount[bestSlot]++;
      slotTotalDwellMinutes[bestSlot] += dwellMinutes;
      dowHourTurnoverSum[dow][hourOfDay] += 1 / totalSlots;

      const rhoAtArrival = currentRho;
      const tBaseline = calcBaselineSearchTime(rhoAtArrival, assumptions, rng);
      const tGuided = calcGuidedSearchTime(rhoAtArrival, assumptions, rng);
      const tEffective = calcEffectiveSearchTime(tGuided, tBaseline, assumptions.compliance);
      const isAbandoned = rng() < calcAbandonmentProb(tEffective) ? 1 : 0;

      if (sessionCount >= sessionCapacity) {
        expandSessionBuffers();
      }

      sessionStartMin[sessionCount] = m;
      sessionEndMin[sessionCount] = depMinute;
      sessionZone[sessionCount] = chosenZoneIdx;
      sessionSlot[sessionCount] = bestSlot;
      sessionPosition[sessionCount] = bestPosition;
      sessionRho[sessionCount] = rhoAtArrival;
      sessionTBaseline[sessionCount] = tBaseline;
      sessionTGuided[sessionCount] = tGuided;
      sessionTEffective[sessionCount] = tEffective;
      sessionAbandoned[sessionCount] = isAbandoned;
      sessionCount++;
    }

    // Accumulate slot occupied minutes
    for (let s = 0; s < totalSlots; s++) {
      if (slotOccupiedUntil[s] !== -1) {
        slotTotalOccupiedMinutes[s]++;
        slotDailyOccupiedMinutes[s][dayIndex]++;
      }
    }

    // Hourly sample at end of each hour (minute 59)
    if (m % 60 === 59) {
      for (let z = 0; z < numZones; z++) {
        hourlyZoneOccupancyCounts[currentHourIndex][z] = zoneCurrentOccupied[z];
      }
      const hRho = totalCurrentOccupied / totalSlots;
      hourlyTotalOccupancy[currentHourIndex] = hRho;
      dowHourOccupancySum[dow][hourOfDay] += hRho;
      dowHourCount[dow][hourOfDay]++;

      // Snapshot each slot's occupied state at this hour for slot map scrubber
      const hourOffset = currentHourIndex * totalSlots;
      for (let s = 0; s < totalSlots; s++) {
        slotHourlyOccupied[hourOffset + s] = slotOccupiedUntil[s] !== -1 ? 1 : 0;
      }
    }
  }

  if (onProgress) {
    onProgress(0.8, `Computing operational aggregates for ${sessionCount.toLocaleString()} sessions...`);
  }

  // 4. Compute Summary Aggregates
  const hourlyZoneOccupancy: number[][] = Array.from({ length: totalHours }, (_, h) => {
    const row = new Array(numZones);
    for (let z = 0; z < numZones; z++) {
      row[z] = hourlyZoneOccupancyCounts[h][z] / preset.zones[z].slotCount;
    }
    return row;
  });

  const hourlyTimestamps: number[] = Array.from({ length: totalHours }, (_, h) => h * 60);

  // Zone & Position Utilisation with Peak Zone Marker
  const zoneUtilisation = preset.zones.map((zone, zIdx) => {
    let totalOccMins = 0;
    const range = zoneSlotRanges[zIdx];
    for (let s = range.start; s < range.end; s++) {
      totalOccMins += slotTotalOccupiedMinutes[s];
    }
    const maxPossMins = zone.slotCount * totalMinutes;

    let peakOcc = 0;
    for (let h = 0; h < totalHours; h++) {
      const occFrac = hourlyZoneOccupancyCounts[h][zIdx] / zone.slotCount;
      if (occFrac > peakOcc) peakOcc = occFrac;
    }

    return {
      zoneId: zone.id,
      name: zone.name,
      slotCount: zone.slotCount,
      avgUtilisationPct: Math.round((totalOccMins / maxPossMins) * 1000) / 10,
      peakUtilisationPct: Math.round(peakOcc * 1000) / 10,
    };
  });

  // Position Utilisation (0, 1, 2, 3)
  const posCounts = [0, 0, 0, 0];
  const posOccMins = [0, 0, 0, 0];
  for (let s = 0; s < totalSlots; s++) {
    const pos = slotPositions[s];
    posCounts[pos]++;
    posOccMins[pos] += slotTotalOccupiedMinutes[s];
  }
  const positionUtilisation = [0, 1, 2, 3].map(pos => {
    const maxMins = posCounts[pos] * totalMinutes;
    return {
      positionIndex: pos,
      avgUtilisationPct: maxMins > 0 ? Math.round((posOccMins[pos] / maxMins) * 1000) / 10 : 0,
    };
  });

  // Slot utilizations array for Gini calculation
  const slotUtilisations: number[] = new Array(totalSlots);
  for (let s = 0; s < totalSlots; s++) {
    slotUtilisations[s] = Math.round((slotTotalOccupiedMinutes[s] / totalMinutes) * 1000) / 10;
  }
  const giniCoefficient = calcGiniCoefficient(slotUtilisations);

  // Day of Week by Hour Matrix
  const dowHourOccupancyMatrix: number[][] = Array.from({ length: 7 }, (_, d) => {
    const row = new Array(24);
    for (let h = 0; h < 24; h++) {
      const cnt = dowHourCount[d][h];
      row[h] = cnt > 0 ? Math.round((dowHourOccupancySum[d][h] / cnt) * 1000) / 1000 : 0;
    }
    return row;
  });

  // Turnover by DOW and Hour
  const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const turnoverByDOWHour: TurnoverByDOWHourPoint[] = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const dayOccurrences = Math.max(1, Math.floor(days / 7) + (d < (days % 7) ? 1 : 0));
      const turns = dowHourTurnoverSum[d][h] / dayOccurrences;
      turnoverByDOWHour.push({
        dow: d,
        hour: h,
        dayLabel: dowNames[d],
        hourLabel: `${String(h).padStart(2, '0')}:00`,
        turnoverPerSlotDay: Math.round(turns * 24 * 100) / 100,
      });
    }
  }

  // Dwell Histogram Bins & Overstay Metrics
  const dwellBinsConfig = [
    { min: 0, max: 15, label: '<15m' },
    { min: 15, max: 30, label: '15-30m' },
    { min: 30, max: 60, label: '30-60m' },
    { min: 60, max: 120, label: '1-2h' },
    { min: 120, max: 240, label: '2-4h' },
    { min: 240, max: 480, label: '4-8h' },
    { min: 480, max: 1440, label: '8-24h' },
    { min: 1440, max: 99999, label: '>24h' },
  ];
  const dwellHistogramBins = dwellBinsConfig.map(b => ({
    minDwell: b.min,
    maxDwell: b.max,
    label: b.label,
    count: 0,
  }));

  let shortStayCount = 0; // <30m
  let mediumStayCount = 0; // 30m - 4h (240m)
  let longStayCount = 0; // >4h

  // Overstay limit by preset (min)
  const overstayLimits: Record<FacilityPresetId, number> = {
    mall: 180, // 3 hours
    office: 600, // 10 hours
    hospital: 360, // 6 hours
    airport: 2880, // 48 hours
  };
  const presetOverstayLimit = overstayLimits[presetId];
  let totalOverstayMinutes = 0;

  let sumBaselineSec = 0;
  let sumGuidedSec = 0;
  let sumEffectiveSec = 0;

  for (let i = 0; i < sessionCount; i++) {
    const dwell = sessionEndMin[i] - sessionStartMin[i];
    sumBaselineSec += sessionTBaseline[i];
    sumGuidedSec += sessionTGuided[i];
    sumEffectiveSec += sessionTEffective[i];

    if (dwell < 30) {
      shortStayCount++;
    } else if (dwell <= 240) {
      mediumStayCount++;
    } else {
      longStayCount++;
    }

    if (dwell > presetOverstayLimit) {
      totalOverstayMinutes += dwell - presetOverstayLimit;
    }

    for (let b = 0; b < dwellBinsConfig.length; b++) {
      if (dwell >= dwellBinsConfig[b].min && dwell < dwellBinsConfig[b].max) {
        dwellHistogramBins[b].count++;
        break;
      }
    }
  }

  const shortStayPct = sessionCount > 0 ? Math.round((shortStayCount / sessionCount) * 1000) / 10 : 0;
  const mediumStayPct = sessionCount > 0 ? Math.round((mediumStayCount / sessionCount) * 1000) / 10 : 0;
  const longStayPct = sessionCount > 0 ? Math.round((longStayCount / sessionCount) * 1000) / 10 : 0;
  const slotHoursLostToOverstay = Math.round(totalOverstayMinutes / 60);

  const avgBaselineSearchTimeSec =
    sessionCount > 0 ? Math.round((sumBaselineSec / sessionCount) * 10) / 10 : 45;
  const avgGuidedSearchTimeSec =
    sessionCount > 0 ? Math.round((sumEffectiveSec / sessionCount) * 10) / 10 : 20;
  const searchTimeReductionPct =
    avgBaselineSearchTimeSec > 0
      ? Math.round(
          ((avgBaselineSearchTimeSec - avgGuidedSearchTimeSec) / avgBaselineSearchTimeSec) * 1000
        ) / 10
      : 0;

  // Environmental and distance savings
  const totalSearchSecSaved = Math.max(0, sumBaselineSec - sumEffectiveSec);
  const distanceSavedKm =
    Math.round(calcDistanceCruisedKm(totalSearchSecSaved, assumptions.cruiseSpeedKmH));
  const fuelSavedLitres =
    Math.round(calcFuelConsumedLitres(totalSearchSecSaved, assumptions.fuelPerHourL));
  const co2AvoidedKg = Math.round(calcCo2Kg(fuelSavedLitres, assumptions.co2FactorKgPerL));

  // Peak occupancy
  let maxOccupancy = 0;
  let peakHourIndex = 0;
  for (let h = 0; h < totalHours; h++) {
    if (hourlyTotalOccupancy[h] > maxOccupancy) {
      maxOccupancy = hourlyTotalOccupancy[h];
      peakHourIndex = h;
    }
  }

  const peakDay = Math.floor(peakHourIndex / 24);
  const peakHour = peakHourIndex % 24;
  const peakDow = (peakDay + 1) % 7;
  const peakOccupancyTimestamp = `${dowNames[peakDow]} Day ${peakDay + 1}, ${String(peakHour).padStart(2, '0')}:00`;

  // Turnover per slot per day
  const avgTurnoverPerSlotPerDay =
    totalSlots > 0 && days > 0
      ? Math.round((sessionCount / (totalSlots * days)) * 10) / 10
      : 0;

  // 5. Sensor Fault Schedule (Seeded)
  const faultEvents: SensorFaultEvent[] = [];
  const faultRng = createMulberry32(seed + 101);
  const faultTypes: SensorFaultType[] = ['stuck', 'disconnected', 'noisy', 'intermittent'];
  const faultDistribution: Record<SensorFaultType, number> = {
    stuck: 0,
    disconnected: 0,
    noisy: 0,
    intermittent: 0,
  };

  let totalFaultMinutesAcrossFleet = 0;
  const totalFleetMinutes = totalSlots * totalMinutes;
  const slotFaultMap = new Map<number, SensorFaultEvent>();

  for (let s = 0; s < totalSlots; s++) {
    const faultChance = 0.035 * (days / 30);
    if (faultRng() < faultChance) {
      const type = faultTypes[Math.floor(faultRng() * faultTypes.length)];
      faultDistribution[type]++;

      const startMin = Math.floor(faultRng() * (totalMinutes - 2880));
      const durationHours = 12 + Math.floor(faultRng() * 60);
      const endMin = Math.min(totalMinutes, startMin + durationHours * 60);
      totalFaultMinutesAcrossFleet += endMin - startMin;

      const zIdx = slotZones[s];
      const faultEvt: SensorFaultEvent = {
        sensorId: s,
        slotId: s + 1,
        zoneId: preset.zones[zIdx].id,
        type,
        startMinute: startMin,
        endMinute: endMin,
        description: `Sensor S${s + 1} (${type}) detected during routine mesh sweep`,
      };
      faultEvents.push(faultEvt);
      slotFaultMap.set(s, faultEvt);
    }
  }

  const sensorUptimePct =
    totalFleetMinutes > 0
      ? Math.round((1 - totalFaultMinutesAcrossFleet / totalFleetMinutes) * 1000) / 10
      : 99.8;

  // Payback Analysis
  const payback = calcFinancialPayback(
    totalSlots,
    assumptions,
    sessionCount,
    avgBaselineSearchTimeSec,
    avgGuidedSearchTimeSec,
    days
  );

  // Construct individual SlotMetric items
  const slots: SlotMetric[] = [];
  for (let s = 0; s < totalSlots; s++) {
    const zIdx = slotZones[s];
    const sUtil = slotUtilisations[s];
    const fault = slotFaultMap.get(s);
    const sSessions = slotSessionCount[s];
    const mDwell = sSessions > 0 ? Math.round(slotTotalDwellMinutes[s] / sSessions) : 0;

    const dailyMins: number[] = new Array(days);
    for (let d = 0; d < days; d++) {
      dailyMins[d] = slotDailyOccupiedMinutes[s][d];
    }

    slots.push({
      slotId: s + 1,
      zoneId: preset.zones[zIdx].id,
      zoneName: preset.zones[zIdx].name,
      positionIndex: slotPositions[s],
      utilisationPct: sUtil,
      sessionCount: sSessions,
      meanDwellMinutes: mDwell,
      dailyOccupiedMinutes: dailyMins,
      isDeadSlot: sUtil < 2.0,
      suspectFault: fault ? fault.type : null,
      faultDescription: fault ? fault.description : null,
    });
  }

  // 6. Cumulative Savings Timeseries (day-by-day)
  const cumulativeSavings: CumulativeSavingsPoint[] = [];
  let cumFuelL = 0;
  let cumCo2Kg = 0;
  let cumDriverHours = 0;
  let cumAbandonedVisits = 0;
  let cumRevenueProtected = 0;

  const dailySessionsList: number[][] = Array.from({ length: days }, () => []);
  for (let i = 0; i < sessionCount; i++) {
    const d = Math.min(days - 1, Math.floor(sessionStartMin[i] / 1440));
    dailySessionsList[d].push(i);
  }

  const revPerVisit =
    assumptions.avgTicketValueAbandonedRs + 1.5 * assumptions.parkingFeePerHourRs;

  for (let d = 0; d < days; d++) {
    const sIndices = dailySessionsList[d];
    let dSecSaved = 0;
    let dAbSaved = 0;

    for (let idx = 0; idx < sIndices.length; idx++) {
      const sIdx = sIndices[idx];
      const diffSec = Math.max(0, sessionTBaseline[sIdx] - sessionTEffective[sIdx]);
      dSecSaved += diffSec;

      const pAbBase = calcAbandonmentProb(sessionTBaseline[sIdx]);
      const pAbEff = calcAbandonmentProb(sessionTEffective[sIdx]);
      dAbSaved += Math.max(0, pAbBase - pAbEff);
    }

    const dFuelL = calcFuelConsumedLitres(dSecSaved, assumptions.fuelPerHourL);
    cumFuelL += dFuelL;
    cumCo2Kg += calcCo2Kg(dFuelL, assumptions.co2FactorKgPerL);
    cumDriverHours += dSecSaved / 3600;
    cumAbandonedVisits += dAbSaved;
    cumRevenueProtected += dAbSaved * revPerVisit;

    cumulativeSavings.push({
      day: d + 1,
      label: `Day ${d + 1}`,
      cumulativeFuelL: Math.round(cumFuelL * 10) / 10,
      cumulativeCo2Kg: Math.round(cumCo2Kg * 10) / 10,
      cumulativeDriverHours: Math.round(cumDriverHours * 10) / 10,
      cumulativeAbandonedSaved: Math.round(cumAbandonedVisits),
      cumulativeRevenueProtectedRs: Math.round(cumRevenueProtected),
    });
  }

  // 7. Daily Sparklines & Period Deltas
  const halfDays = Math.max(1, Math.floor(days / 2));
  const dailyTurnover: number[] = new Array(days).fill(0);
  const dailySearchTimeSaved: number[] = new Array(days).fill(0);
  const dailyDistanceSaved: number[] = new Array(days).fill(0);
  const dailyFuelSaved: number[] = new Array(days).fill(0);
  const dailyCo2Avoided: number[] = new Array(days).fill(0);
  const dailyPeakOccupancy: number[] = new Array(days).fill(0);
  const dailySensorUptime: number[] = new Array(days).fill(100);

  for (let i = 0; i < sessionCount; i++) {
    const day = Math.min(days - 1, Math.floor(sessionStartMin[i] / 1440));
    dailyTurnover[day] += 1 / totalSlots;
    const diffSec = Math.max(0, sessionTBaseline[i] - sessionTEffective[i]);
    dailySearchTimeSaved[day] += diffSec;
    dailyDistanceSaved[day] += calcDistanceCruisedKm(diffSec, assumptions.cruiseSpeedKmH);
    const fuelL = calcFuelConsumedLitres(diffSec, assumptions.fuelPerHourL);
    dailyFuelSaved[day] += fuelL;
    dailyCo2Avoided[day] += calcCo2Kg(fuelL, assumptions.co2FactorKgPerL);
  }

  for (let d = 0; d < days; d++) {
    let dayMaxRho = 0;
    for (let h = 0; h < 24; h++) {
      const idx = d * 24 + h;
      if (idx < totalHours && hourlyTotalOccupancy[idx] > dayMaxRho) {
        dayMaxRho = hourlyTotalOccupancy[idx];
      }
    }
    dailyPeakOccupancy[d] = Math.round(dayMaxRho * 100);
  }

  function calcHalfDelta(arr: number[]): number {
    if (arr.length < 2) return 0;
    const firstHalf = arr.slice(0, halfDays).reduce((a, b) => a + b, 0) / halfDays;
    const secondHalf = arr.slice(halfDays).reduce((a, b) => a + b, 0) / (arr.length - halfDays);
    if (firstHalf <= 0) return 0;
    return Math.round(((secondHalf - firstHalf) / firstHalf) * 1000) / 10;
  }

  function makeSparkline(arr: number[]): DailySparklinePoint[] {
    const step = Math.max(1, Math.floor(arr.length / 14));
    const points: DailySparklinePoint[] = [];
    for (let i = 0; i < arr.length; i += step) {
      points.push({ day: i + 1, value: Math.round(arr[i] * 10) / 10 });
    }
    if (points[points.length - 1].day !== arr.length) {
      points.push({ day: arr.length, value: Math.round(arr[arr.length - 1] * 10) / 10 });
    }
    return points;
  }

  const kpis = {
    avgGuidedSearchTimeSec,
    avgBaselineSearchTimeSec,
    searchTimeReductionPct,
    searchTimeSparkline: makeSparkline(dailySearchTimeSaved),
    searchTimeDeltaPct: -calcHalfDelta(dailySearchTimeSaved),

    distanceSavedKm,
    distanceSavedSparkline: makeSparkline(dailyDistanceSaved),
    distanceSavedDeltaPct: calcHalfDelta(dailyDistanceSaved),

    fuelSavedLitres,
    fuelSavedSparkline: makeSparkline(dailyFuelSaved),
    fuelSavedDeltaPct: calcHalfDelta(dailyFuelSaved),

    co2AvoidedKg,
    co2AvoidedSparkline: makeSparkline(dailyCo2Avoided),
    co2AvoidedDeltaPct: calcHalfDelta(dailyCo2Avoided),

    peakOccupancyPct: Math.round(maxOccupancy * 1000) / 10,
    peakOccupancyTimestamp,
    peakOccupancySparkline: makeSparkline(dailyPeakOccupancy),
    peakOccupancyDeltaPct: calcHalfDelta(dailyPeakOccupancy),

    avgTurnoverPerSlotPerDay,
    turnoverSparkline: makeSparkline(dailyTurnover),
    turnoverDeltaPct: calcHalfDelta(dailyTurnover),

    sensorUptimePct,
    sensorUptimeSparkline: makeSparkline(dailySensorUptime),
    sensorUptimeDeltaPct: 0.1,

    paybackMonths: payback.paybackMonths,
    monthlySavingsRs: Math.round(payback.netMonthlyBenefitRs),
    paybackSparkline: makeSparkline(dailyFuelSaved),
    paybackDeltaPct: -1.2,
  };

  // 8. Search Time Histograms (10s bins up to 600s) & Percentiles
  const maxSearchTimeSec = 600;
  const histStep = 10;
  const numHistBins = Math.floor(maxSearchTimeSec / histStep) + 1;

  const searchTimeHistograms: SearchTimeHistogramBin[] = Array.from({ length: numHistBins }, (_, idx) => ({
    timeSec: idx * histStep,
    baselineCount: 0,
    guidedCount: 0,
  }));

  const peakSearchTimeHistograms: SearchTimeHistogramBin[] = Array.from({ length: numHistBins }, (_, idx) => ({
    timeSec: idx * histStep,
    baselineCount: 0,
    guidedCount: 0,
  }));

  const allGuidedTimes: number[] = new Array(sessionCount);
  const allBaselineTimes: number[] = new Array(sessionCount);
  const peakGuidedTimes: number[] = [];
  const peakBaselineTimes: number[] = [];

  for (let i = 0; i < sessionCount; i++) {
    const bTime = sessionTBaseline[i];
    const gTime = sessionTEffective[i];
    allGuidedTimes[i] = gTime;
    allBaselineTimes[i] = bTime;

    const bIdx = Math.min(numHistBins - 1, Math.floor(bTime / histStep));
    const gIdx = Math.min(numHistBins - 1, Math.floor(gTime / histStep));
    searchTimeHistograms[bIdx].baselineCount++;
    searchTimeHistograms[gIdx].guidedCount++;

    const isPeak = sessionRho[i] >= 0.75;
    if (isPeak) {
      peakGuidedTimes.push(gTime);
      peakBaselineTimes.push(bTime);
      peakSearchTimeHistograms[bIdx].baselineCount++;
      peakSearchTimeHistograms[gIdx].guidedCount++;
    }
  }

  allGuidedTimes.sort((a, b) => a - b);
  allBaselineTimes.sort((a, b) => a - b);
  peakGuidedTimes.sort((a, b) => a - b);
  peakBaselineTimes.sort((a, b) => a - b);

  const searchTimePercentilesAll: PercentilesRecord = {
    p50: Math.round(calcPercentile(allGuidedTimes, 50) * 10) / 10,
    p90: Math.round(calcPercentile(allGuidedTimes, 90) * 10) / 10,
    p99: Math.round(calcPercentile(allGuidedTimes, 99) * 10) / 10,
    baselineP50: Math.round(calcPercentile(allBaselineTimes, 50) * 10) / 10,
    baselineP90: Math.round(calcPercentile(allBaselineTimes, 90) * 10) / 10,
    baselineP99: Math.round(calcPercentile(allBaselineTimes, 99) * 10) / 10,
  };

  const searchTimePercentilesPeak: PercentilesRecord = {
    p50: Math.round(calcPercentile(peakGuidedTimes, 50) * 10) / 10,
    p90: Math.round(calcPercentile(peakGuidedTimes, 90) * 10) / 10,
    p99: Math.round(calcPercentile(peakGuidedTimes, 99) * 10) / 10,
    baselineP50: Math.round(calcPercentile(peakBaselineTimes, 50) * 10) / 10,
    baselineP90: Math.round(calcPercentile(peakBaselineTimes, 90) * 10) / 10,
    baselineP99: Math.round(calcPercentile(peakBaselineTimes, 99) * 10) / 10,
  };

  // Occupancy bands in 5% steps from 50% to 100%
  const searchTimeByOccupancy: OccupancyBandStat[] = [];
  for (let pct = 50; pct <= 95; pct += 5) {
    const minRho = pct / 100;
    const maxRho = (pct + 5) / 100;
    let bSum = 0;
    let gSum = 0;
    let cnt = 0;

    for (let i = 0; i < sessionCount; i++) {
      if (sessionRho[i] >= minRho && sessionRho[i] < maxRho) {
        bSum += sessionTBaseline[i];
        gSum += sessionTEffective[i];
        cnt++;
      }
    }

    searchTimeByOccupancy.push({
      band: `${pct}%`,
      avgOccupancy: (minRho + maxRho) / 2,
      baselineSec: cnt > 0 ? Math.round((bSum / cnt) * 10) / 10 : Math.round(calcBaselineSearchTime((minRho + maxRho) / 2, assumptions)),
      guidedSec: cnt > 0 ? Math.round((gSum / cnt) * 10) / 10 : Math.round(calcGuidedSearchTime((minRho + maxRho) / 2, assumptions)),
      sampleCount: cnt,
    });
  }

  if (onProgress) {
    onProgress(1.0, `Completed dataset generation for ${preset.name}`);
  }

  return {
    presetId,
    totalSlots,
    rangeDays: days,
    totalSessions: sessionCount,
    seed,
    version: DATA_VERSION,
    generatedTimestamp: Date.now(),
    kpis,
    hourlyTimestamps,
    hourlyZoneOccupancy,
    hourlyTotalOccupancy: Array.from(hourlyTotalOccupancy),
    zoneUtilisation,
    positionUtilisation,
    giniCoefficient,
    slots,
    slotHourlyOccupied,
    dowHourOccupancyMatrix,
    cumulativeSavings,
    dwellHistogramBins,
    shortStayPct,
    mediumStayPct,
    longStayPct,
    slotHoursLostToOverstay,
    hourlyArrivals: Array.from(hourlyArrivals),
    hourlyDepartures: Array.from(hourlyDepartures),
    turnoverByDOWHour,
    searchTimeHistograms,
    peakSearchTimeHistograms,
    searchTimeByOccupancy,
    searchTimePercentilesAll,
    searchTimePercentilesPeak,
    faultEvents,
    fleetFaultDistribution: faultDistribution,
  };
}

/**
 * Generates 86,400 one-per-second virtual sensor readings on demand for a single sensor-day.
 */
export function generateSensorDay(
  sensorId: number,
  day: number,
  isOccupiedDuringTime: (minuteOfDay: number) => boolean,
  mode: 'raw' | 'smooth' = 'raw'
): Uint16Array {
  const seed = hashString(`sensor_${sensorId}_day_${day}`);
  const rng = createMulberry32(seed);
  const readings = new Uint16Array(86400);

  for (let s = 0; s < 86400; s++) {
    const minute = Math.floor(s / 60);
    const occupied = isOccupiedDuringTime(minute);

    if (occupied) {
      const jitter = mode === 'raw' ? Math.round(boxMuller(rng) * 1.5) : 0;
      readings[s] = Math.max(3, Math.min(14, 8 + jitter));
    } else {
      const isTimeout = rng() < 0.005;
      if (isTimeout) {
        readings[s] = 400;
      } else {
        const jitter = mode === 'raw' ? Math.round(boxMuller(rng) * 2.5) : 0;
        readings[s] = Math.max(16, Math.min(45, 28 + jitter));
      }
    }
  }

  return readings;
}
