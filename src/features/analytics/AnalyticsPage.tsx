import React, { useEffect, useState, useRef } from 'react';
import { clsx } from 'clsx';
import {
  SlidersHorizontal,
  Download,
  Filter,
  FileSpreadsheet,
  FileJson,
  ChevronDown,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/Badge';
import { ANALYTICS_COPY } from '@/analytics/copy';
import { useAnalyticsStore } from '@/analytics/store';
import { FacilityPresetId, TimeRangeDays } from '@/analytics/types';
import { FACILITY_PRESETS } from '@/analytics/presets';
import { KpiStrip } from './KpiStrip';
import { AssumptionsDrawer } from './AssumptionsDrawer';
import { OccupancyTimelineChart } from './charts/OccupancyTimelineChart';
import { DemandHeatmapChart } from './charts/DemandHeatmapChart';
import { SearchTimeComparisonChart } from './charts/SearchTimeComparisonChart';
import { SavingsOverTimeChart } from './charts/SavingsOverTimeChart';
import { ZoneUtilisationChart } from './charts/ZoneUtilisationChart';
import { SlotMapChart } from './charts/SlotMapChart';
import { DwellTurnoverChart } from './charts/DwellTurnoverChart';

export const AnalyticsPage: React.FC = () => {
  const {
    presetId,
    rangeDays,
    zoneFilter,
    isLoading,
    progress,
    progressMessage,
    aggregates,
    setPreset,
    setRangeDays,
    setZoneFilter,
    setAssumptionsDrawerOpen,
    loadDataset,
    exportDataset,
  } = useAnalyticsStore();

  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Initialize dataset on mount
  useEffect(() => {
    if (!aggregates && !isLoading) {
      loadDataset();
    }
  }, [aggregates, isLoading, loadDataset]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentPreset = FACILITY_PRESETS[presetId];
  const zones = currentPreset?.zones ?? [];

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header with Badges */}
      <PageHeader
        eyebrow="Deployment analytics"
        title={ANALYTICS_COPY.page.title}
        subtitle={ANALYTICS_COPY.page.subtitle}
        badges={
          <Badge variant="gold" className="h-7 px-3 text-[11px]">
            Synthetic data
          </Badge>
        }
      />

      {/* 2. Control Bar (Glass Capsule Row) */}
      <div className="p-2 sm:p-2.5 rounded-pill glass-g3 flex flex-wrap items-center justify-between gap-3 border border-white/[0.08] shadow-glass-g3">
        {/* Left: Facility Presets & Range */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Segmented Buttons */}
          <div className="flex items-center p-1 rounded-pill bg-white/[0.03] border border-white/[0.05]">
            {(['mall', 'office', 'hospital', 'airport'] as FacilityPresetId[]).map(id => {
              const active = presetId === id;
              const p = FACILITY_PRESETS[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPreset(id)}
                  className={clsx(
                    'px-3 py-1.5 rounded-pill text-xs font-ui transition-all duration-150',
                    active
                      ? 'glass-g3 glass-tint-gold glass-rim-gold text-gold font-semibold shadow-sm'
                      : 'text-text-3 hover:text-text-1 hover:bg-white/[0.04]'
                  )}
                >
                  {p.shortName}
                </button>
              );
            })}
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center p-1 rounded-pill bg-white/[0.03] border border-white/[0.05]">
            {([7, 30, 90] as TimeRangeDays[]).map(days => {
              const active = rangeDays === days;
              return (
                <button
                  key={days}
                  type="button"
                  onClick={() => setRangeDays(days)}
                  className={clsx(
                    'px-2.5 py-1.5 rounded-pill text-xs font-ui transition-all duration-150 font-data',
                    active
                      ? 'glass-g3 glass-tint-gold glass-rim-gold text-gold font-semibold shadow-sm'
                      : 'text-text-3 hover:text-text-1 hover:bg-white/[0.04]'
                  )}
                >
                  {days}d
                </button>
              );
            })}
          </div>

          {/* Zone Filter */}
          <div className="flex items-center gap-1.5 pl-1">
            <Filter className="w-3.5 h-3.5 text-text-3 shrink-0" />
            <select
              value={zoneFilter}
              onChange={e => setZoneFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-pill glass-g3 text-xs text-text-2 border border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-gold/60 cursor-pointer"
            >
              <option value="all" className="bg-bg text-text-1">
                All Zones ({currentPreset.totalSlots} slots)
              </option>
              {zones.map(z => (
                <option key={z.id} value={z.id} className="bg-bg text-text-1">
                  {z.id} — {z.name} ({z.slotCount}s)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Assumptions Drawer Toggle & Export */}
        <div className="flex items-center gap-2">
          {/* Assumptions Drawer Button */}
          <button
            type="button"
            onClick={() => setAssumptionsDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill glass-g3 border border-white/[0.1] text-xs font-ui font-medium text-text-1 hover:border-gold/50 hover:text-gold transition-colors active:scale-[0.98]"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-gold" />
            <span>Assumptions</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setExportMenuOpen(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill glass-g3 border border-white/[0.1] text-xs font-ui font-medium text-text-1 hover:border-white/[0.2] transition-colors active:scale-[0.98]"
            >
              <Download className="w-3.5 h-3.5 text-text-2" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 text-text-3" />
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-inner-card glass-g1 border border-white/[0.1] shadow-2xl p-1.5 z-50 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    exportDataset('csv');
                    setExportMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-ui text-text-2 hover:text-text-1 hover:bg-white/[0.08] transition-colors text-left"
                >
                  <FileSpreadsheet className="w-4 h-4 text-green" />
                  <div>
                    <div className="font-medium text-text-1">Export CSV</div>
                    <div className="text-[10px] text-text-3">Hourly timeseries data</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportDataset('json');
                    setExportMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-ui text-text-2 hover:text-text-1 hover:bg-white/[0.08] transition-colors text-left"
                >
                  <FileJson className="w-4 h-4 text-gold" />
                  <div>
                    <div className="font-medium text-text-1">Export JSON</div>
                    <div className="text-[10px] text-text-3">Assumptions & seed config</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slim Progress Bar during generation */}
      {isLoading && (
        <div className="space-y-1.5 p-3 rounded-inner-card glass-g2 border border-white/[0.08] transition-all">
          <div className="flex justify-between items-center text-xs text-text-2 font-ui">
            <span className="flex items-center gap-2 text-gold">
              <span className="w-2 h-2 rounded-full bg-gold animate-ping" />
              <span>{progressMessage || 'Generating synthetic sessions...'}</span>
            </span>
            <span className="font-data text-text-3">{Math.round(progress * 100)}%</span>
          </div>
          <div className="w-full h-1.5 rounded-pill bg-white/[0.06] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold/60 to-gold transition-all duration-200"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* 3. KPI Strip (8 Glass Stat Cards) */}
      <section aria-label="Key Performance Indicators">
        <KpiStrip kpis={aggregates?.kpis ?? null} isLoading={isLoading} />
      </section>

      {/* 4. Page Grid (12 Columns, 24px gaps, G1 glass cards) */}
      <div className="grid grid-cols-12 gap-6">
        {isLoading || !aggregates ? (
          <>
            {/* Row 1 Skeletons: Timeline (8) & Heatmap (4) */}
            <div className="col-span-12 lg:col-span-8 rounded-card glass-g1 border border-white/[0.08] p-5 h-[400px] flex flex-col justify-between animate-pulse">
              <div className="space-y-2">
                <div className="h-5 w-48 bg-white/[0.08] rounded" />
                <div className="h-3 w-80 bg-white/[0.03] rounded" />
              </div>
              <div className="flex-1 my-4 rounded-lg bg-white/[0.02] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-gold/40 border-t-gold animate-spin" />
              </div>
              <div className="h-3.5 w-96 bg-white/[0.04] rounded" />
            </div>

            <div className="col-span-12 lg:col-span-4 rounded-card glass-g1 border border-white/[0.08] p-5 h-[400px] flex flex-col justify-between animate-pulse">
              <div className="space-y-2">
                <div className="h-5 w-40 bg-white/[0.08] rounded" />
                <div className="h-3 w-60 bg-white/[0.03] rounded" />
              </div>
              <div className="flex-1 my-4 rounded-lg bg-white/[0.02] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-gold/40 border-t-gold animate-spin" />
              </div>
              <div className="h-3.5 w-72 bg-white/[0.04] rounded" />
            </div>

            {/* Row 2 Skeleton: Search Time (12) */}
            <div className="col-span-12 rounded-card glass-g1 border border-white/[0.08] p-5 h-[380px] flex flex-col justify-between animate-pulse">
              <div className="space-y-2">
                <div className="h-5 w-52 bg-white/[0.08] rounded" />
                <div className="h-3 w-96 bg-white/[0.03] rounded" />
              </div>
              <div className="flex-1 my-4 rounded-lg bg-white/[0.02] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-gold/40 border-t-gold animate-spin" />
              </div>
              <div className="h-3.5 w-96 bg-white/[0.04] rounded" />
            </div>

            {/* Row 3 Skeletons: Savings (6) & Utilisation (6) */}
            <div className="col-span-12 lg:col-span-6 rounded-card glass-g1 border border-white/[0.08] p-5 h-[360px] flex flex-col justify-between animate-pulse">
              <div className="space-y-2">
                <div className="h-5 w-48 bg-white/[0.08] rounded" />
                <div className="h-3 w-72 bg-white/[0.03] rounded" />
              </div>
              <div className="flex-1 my-4 rounded-lg bg-white/[0.02] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-gold/40 border-t-gold animate-spin" />
              </div>
              <div className="h-3.5 w-80 bg-white/[0.04] rounded" />
            </div>

            <div className="col-span-12 lg:col-span-6 rounded-card glass-g1 border border-white/[0.08] p-5 h-[360px] flex flex-col justify-between animate-pulse">
              <div className="space-y-2">
                <div className="h-5 w-48 bg-white/[0.08] rounded" />
                <div className="h-3 w-72 bg-white/[0.03] rounded" />
              </div>
              <div className="flex-1 my-4 rounded-lg bg-white/[0.02] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-gold/40 border-t-gold animate-spin" />
              </div>
              <div className="h-3.5 w-80 bg-white/[0.04] rounded" />
            </div>

            {/* Row 4 Skeleton: Slot Map (12) */}
            <div className="col-span-12 rounded-card glass-g1 border border-white/[0.08] p-5 h-[420px] flex flex-col justify-between animate-pulse">
              <div className="space-y-2">
                <div className="h-5 w-56 bg-white/[0.08] rounded" />
                <div className="h-3 w-96 bg-white/[0.03] rounded" />
              </div>
              <div className="flex-1 my-4 rounded-lg bg-white/[0.02] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-gold/40 border-t-gold animate-spin" />
              </div>
              <div className="h-3.5 w-96 bg-white/[0.04] rounded" />
            </div>

            {/* Row 5 Skeleton: Dwell & Turnover (12) */}
            <div className="col-span-12 rounded-card glass-g1 border border-white/[0.08] p-5 h-[380px] flex flex-col justify-between animate-pulse">
              <div className="space-y-2">
                <div className="h-5 w-56 bg-white/[0.08] rounded" />
                <div className="h-3 w-96 bg-white/[0.03] rounded" />
              </div>
              <div className="flex-1 my-4 rounded-lg bg-white/[0.02] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-gold/40 border-t-gold animate-spin" />
              </div>
              <div className="h-3.5 w-96 bg-white/[0.04] rounded" />
            </div>
          </>
        ) : (
          <>
            {/* 1) Occupancy Timeline (8 wide) */}
            <OccupancyTimelineChart
              aggregates={aggregates}
              zoneFilter={zoneFilter}
            />

            {/* 2) Demand Heatmap (4 wide) */}
            <DemandHeatmapChart
              aggregates={aggregates}
            />

            {/* 3) Search Time: With Guidance vs Without (12 wide) */}
            <SearchTimeComparisonChart
              aggregates={aggregates}
            />

            {/* 4) Savings Over Time (6 wide) */}
            <SavingsOverTimeChart
              aggregates={aggregates}
            />

            {/* 5) Zone and Slot Utilisation (6 wide) */}
            <ZoneUtilisationChart
              aggregates={aggregates}
              currentZoneFilter={zoneFilter}
              onSelectZone={setZoneFilter}
            />

            {/* 5b) Facility Slot Map & Diurnal Time-Lapse (12 wide) */}
            <SlotMapChart
              aggregates={aggregates}
            />

            {/* 6) Dwell Duration & Bay Turnover (12 wide) */}
            <DwellTurnoverChart
              aggregates={aggregates}
            />
          </>
        )}
      </div>

      {/* Assumptions Drawer */}
      <AssumptionsDrawer />
    </div>
  );
};
