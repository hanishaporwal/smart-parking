import { describe, it, expect } from 'vitest';
import { runSimulation, generateSensorDay } from '../generator';
import { DEFAULT_ASSUMPTIONS } from '../model';

describe('Analytics Simulation Engine', () => {
  it('is strictly deterministic: identical seed produces identical session count and metrics', () => {
    const run1 = runSimulation({
      presetId: 'mall',
      days: 7,
      assumptions: DEFAULT_ASSUMPTIONS,
      seedOverride: 987654,
    });

    const run2 = runSimulation({
      presetId: 'mall',
      days: 7,
      assumptions: DEFAULT_ASSUMPTIONS,
      seedOverride: 987654,
    });

    expect(run1.totalSessions).toBe(run2.totalSessions);
    expect(run1.kpis.avgGuidedSearchTimeSec).toBe(run2.kpis.avgGuidedSearchTimeSec);
    expect(run1.kpis.peakOccupancyPct).toBe(run2.kpis.peakOccupancyPct);
    expect(run1.kpis.distanceSavedKm).toBe(run2.kpis.distanceSavedKm);
    expect(run1.hourlyZoneOccupancy).toEqual(run2.hourlyZoneOccupancy);
  });

  it('never exceeds facility or zone slot capacity', () => {
    const run = runSimulation({
      presetId: 'office',
      days: 7,
      assumptions: DEFAULT_ASSUMPTIONS,
      seedOverride: 112233,
    });

    // Check hourly occupancy fractions never exceed 1.0
    run.hourlyTotalOccupancy.forEach(occ => {
      expect(occ).toBeLessThanOrEqual(1.0);
      expect(occ).toBeGreaterThanOrEqual(0.0);
    });

    run.hourlyZoneOccupancy.forEach(zoneRow => {
      zoneRow.forEach(zoneOcc => {
        expect(zoneOcc).toBeLessThanOrEqual(1.0);
        expect(zoneOcc).toBeGreaterThanOrEqual(0.0);
      });
    });
  });

  it('enforces the firmware lowest-position-first assignment rule (skews utilization to position 0)', () => {
    const run = runSimulation({
      presetId: 'mall',
      days: 7,
      assumptions: DEFAULT_ASSUMPTIONS,
      seedOverride: 554433,
    });

    const pos0 = run.positionUtilisation.find(p => p.positionIndex === 0)?.avgUtilisationPct ?? 0;
    const pos3 = run.positionUtilisation.find(p => p.positionIndex === 3)?.avgUtilisationPct ?? 0;

    // Position 0 (closest to entrance) must experience higher utilisation than Position 3 (farthest)
    expect(pos0).toBeGreaterThan(pos3);
  });

  it('generates a valid sensor fault schedule with fleet uptime >= 95%', () => {
    const run = runSimulation({
      presetId: 'hospital',
      days: 30,
      assumptions: DEFAULT_ASSUMPTIONS,
      seedOverride: 778899,
    });

    expect(run.kpis.sensorUptimePct).toBeGreaterThanOrEqual(95);
    expect(run.kpis.sensorUptimePct).toBeLessThanOrEqual(100);

    // Each fault event has valid times and types
    run.faultEvents.forEach(evt => {
      expect(['stuck', 'disconnected', 'noisy', 'intermittent']).toContain(evt.type);
      expect(evt.endMinute).toBeGreaterThan(evt.startMinute);
    });
  });

  it('generates exactly 86,400 samples for on-demand virtual sensor day', () => {
    const readings = generateSensorDay(
      0, // sensor 0
      1, // day 1
      minute => minute >= 480 && minute <= 600 // occupied between 08:00 and 10:00
    );

    expect(readings.length).toBe(86400);

    // During occupied window (e.g. minute 500 = second 30000), readings must be < 15 cm
    const occupiedReading = readings[500 * 60 + 10];
    expect(occupiedReading).toBeLessThan(15);

    // During vacant window (e.g. minute 200 = second 12000), readings must be >= 15 cm
    const vacantReading = readings[200 * 60 + 10];
    expect(vacantReading).toBeGreaterThanOrEqual(15);
  });
});
