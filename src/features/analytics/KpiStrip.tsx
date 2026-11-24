import React from 'react';
import { KpiCard } from './KpiCard';
import { KpiSummary } from '@/analytics/types';
import { ANALYTICS_COPY } from '@/analytics/copy';

export interface KpiStripProps {
  kpis: KpiSummary | null;
  isLoading?: boolean;
}

export const KpiStrip: React.FC<KpiStripProps> = ({ kpis, isLoading }) => {
  if (isLoading || !kpis) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div
            key={`kpi-skeleton-${idx}`}
            className="h-32 rounded-inner-card glass-g1 p-4 border border-white/[0.08] animate-pulse flex flex-col justify-between"
          >
            <div className="flex justify-between items-center">
              <div className="w-24 h-3 bg-white/[0.08] rounded" />
              <div className="w-14 h-3 bg-white/[0.04] rounded" />
            </div>
            <div className="w-20 h-7 bg-white/[0.1] rounded my-2" />
            <div className="w-32 h-3 bg-white/[0.05] rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Search time */}
      <KpiCard
        title={ANALYTICS_COPY.kpis.searchTime}
        value={kpis.avgGuidedSearchTimeSec}
        unit="sec"
        subtitle={`Baseline ${kpis.avgBaselineSearchTimeSec}s (${kpis.searchTimeReductionPct}% faster)`}
        deltaPct={kpis.searchTimeDeltaPct}
        isPositiveGood={true} // stored as positive improvement
        sparklineData={kpis.searchTimeSparkline}
        accentColor="green"
      />

      {/* 2. Distance saved */}
      <KpiCard
        title={ANALYTICS_COPY.kpis.distanceSaved}
        value={kpis.distanceSavedKm.toLocaleString()}
        unit="km"
        subtitle="Avoided aisle circling"
        deltaPct={kpis.distanceSavedDeltaPct}
        isPositiveGood={true}
        sparklineData={kpis.distanceSavedSparkline}
        accentColor="gold"
      />

      {/* 3. Fuel saved */}
      <KpiCard
        title={ANALYTICS_COPY.kpis.fuelSaved}
        value={kpis.fuelSavedLitres.toLocaleString()}
        unit="litres"
        subtitle="Idle & cruising reduction"
        deltaPct={kpis.fuelSavedDeltaPct}
        isPositiveGood={true}
        sparklineData={kpis.fuelSavedSparkline}
        accentColor="gold"
      />

      {/* 4. CO2 saved */}
      <KpiCard
        title={ANALYTICS_COPY.kpis.co2Saved}
        value={kpis.co2AvoidedKg.toLocaleString()}
        unit="kg"
        subtitle="2.31 kg/L petrol factor"
        deltaPct={kpis.co2AvoidedDeltaPct}
        isPositiveGood={true}
        sparklineData={kpis.co2AvoidedSparkline}
        accentColor="green"
      />

      {/* 5. Peak load */}
      <KpiCard
        title={ANALYTICS_COPY.kpis.peakLoad}
        value={`${kpis.peakOccupancyPct}%`}
        subtitle={kpis.peakOccupancyTimestamp}
        deltaPct={kpis.peakOccupancyDeltaPct}
        isPositiveGood={false} // high occupancy is stress
        sparklineData={kpis.peakOccupancySparkline}
        accentColor="info"
      />

      {/* 6. Turnover */}
      <KpiCard
        title={ANALYTICS_COPY.kpis.turnover}
        value={kpis.avgTurnoverPerSlotPerDay}
        unit="turns/day"
        subtitle="Sessions per slot per day"
        deltaPct={kpis.turnoverDeltaPct}
        isPositiveGood={true}
        sparklineData={kpis.turnoverSparkline}
        accentColor="gold"
      />

      {/* 7. Sensor uptime */}
      <KpiCard
        title={ANALYTICS_COPY.kpis.sensorUptime}
        value={`${kpis.sensorUptimePct}%`}
        subtitle="HC-SR04 mesh diagnostics"
        deltaPct={kpis.sensorUptimeDeltaPct}
        isPositiveGood={true}
        sparklineData={kpis.sensorUptimeSparkline}
        accentColor={kpis.sensorUptimePct >= 99 ? 'green' : 'red'}
      />

      {/* 8. Payback */}
      <KpiCard
        title={ANALYTICS_COPY.kpis.payback}
        value={kpis.paybackMonths > 120 ? '>10 yrs' : `${kpis.paybackMonths} mo`}
        subtitle={`Net ₹${kpis.monthlySavingsRs.toLocaleString()}/mo protected`}
        deltaPct={kpis.paybackDeltaPct}
        isPositiveGood={false} // shorter payback is better
        sparklineData={kpis.paybackSparkline}
        accentColor="green"
      />
    </div>
  );
};
