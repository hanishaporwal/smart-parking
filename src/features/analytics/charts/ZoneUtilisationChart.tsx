import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { useReducedMotion } from 'motion/react';
import { clsx } from 'clsx';
import { ChartCardShell } from './ChartCardShell';
import { ChartGlassTooltip } from './ChartGlassTooltip';
import { SimulationAggregates } from '@/analytics/types';
import { ANALYTICS_COPY } from '@/analytics/copy';

export interface ZoneUtilisationChartProps {
  aggregates: SimulationAggregates;
  currentZoneFilter: string;
  onSelectZone: (zoneId: string) => void;
}

export const ZoneUtilisationChart: React.FC<ZoneUtilisationChartProps> = ({
  aggregates,
  currentZoneFilter,
  onSelectZone,
}) => {
  const shouldReduceMotion = useReducedMotion();

  const zonesData = useMemo(() => {
    return (aggregates?.zoneUtilisation ?? []).map(z => ({
      ...z,
      peakDiff: Math.max(0, z.peakUtilisationPct - z.avgUtilisationPct),
    }));
  }, [aggregates?.zoneUtilisation]);

  const positionsData = aggregates?.positionUtilisation ?? [];
  const gini = aggregates?.giniCoefficient ?? 0;

  const soWhatSentence = useMemo(() => {
    const highestZone = [...zonesData].sort(
      (a, b) => b.avgUtilisationPct - a.avgUtilisationPct
    )[0];
    return `Zone ${highestZone?.name || 'A'} experiences highest average load (${highestZone?.avgUtilisationPct || 0}%, peaking at ${highestZone?.peakUtilisationPct || 0}%). Utilisation skew across positions (Gini = ${gini.toFixed(2)}) confirms entrance-proximate bays absorb disproportionate turnover, informing asphalt resurfacing schedules.`;
  }, [zonesData, gini]);

  // Accessible Table Representation
  const tableContent = (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-gold mb-2 font-ui">
          Zone Utilisation & Peak Congestion
        </h4>
        <table className="w-full text-left text-xs font-ui">
          <thead>
            <tr className="border-b border-white/[0.1] text-text-3">
              <th className="py-2 px-3 font-medium">Zone ID</th>
              <th className="py-2 px-3 font-medium">Zone Name</th>
              <th className="py-2 px-3 font-medium">Bays</th>
              <th className="py-2 px-3 font-medium text-gold">Avg Utilisation %</th>
              <th className="py-2 px-3 font-medium text-right text-red">Peak Utilisation %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {zonesData.map(z => (
              <tr
                key={z.zoneId}
                onClick={() => onSelectZone(currentZoneFilter === z.zoneId ? 'all' : z.zoneId)}
                className="hover:bg-white/[0.04] cursor-pointer"
              >
                <td className="py-1.5 px-3 font-medium text-text-1">{z.zoneId}</td>
                <td className="py-1.5 px-3 text-text-2">{z.name}</td>
                <td className="py-1.5 px-3 font-data text-text-3">{z.slotCount}</td>
                <td className="py-1.5 px-3 font-data text-gold">{z.avgUtilisationPct}%</td>
                <td className="py-1.5 px-3 font-data text-right text-red">{z.peakUtilisationPct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gold mb-2 font-ui">
          Position Utilisation Skew (Gini = {gini.toFixed(2)})
        </h4>
        <table className="w-full text-left text-xs font-ui">
          <thead>
            <tr className="border-b border-white/[0.1] text-text-3">
              <th className="py-2 px-3 font-medium">Position Bucket</th>
              <th className="py-2 px-3 font-medium">Proximity Description</th>
              <th className="py-2 px-3 font-medium text-right text-gold">Avg Utilisation %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {positionsData.map(pos => (
              <tr key={pos.positionIndex} className="hover:bg-white/[0.02]">
                <td className="py-1.5 px-3 font-medium text-text-1">Position {pos.positionIndex}</td>
                <td className="py-1.5 px-3 text-text-2">
                  {pos.positionIndex === 0
                    ? 'Nearest bay to entrance aisle'
                    : pos.positionIndex === 1
                    ? 'Second bay in lane'
                    : pos.positionIndex === 2
                    ? 'Third bay in lane'
                    : 'Deepest bay in lane'}
                </td>
                <td className="py-1.5 px-3 font-data text-right font-semibold text-gold">
                  {pos.avgUtilisationPct}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <ChartCardShell
      title={ANALYTICS_COPY.zoneUsage.title}
      whatItTells={ANALYTICS_COPY.zoneUsage.subtitle}
      soWhat={soWhatSentence}
      tableContent={tableContent}
      className="col-span-12 lg:col-span-6"
      headerActions={
        currentZoneFilter !== 'all' ? (
          <button
            type="button"
            onClick={() => onSelectZone('all')}
            className="px-2.5 py-1 rounded-pill text-[11px] font-ui glass-g3 text-gold border border-gold/40 hover:bg-gold/10 transition-colors"
          >
            Clear Filter ({currentZoneFilter})
          </button>
        ) : null
      }
    >
      <div className="space-y-5">
        {/* Top: Zone Utilisation Bar Chart */}
        <div>
          <div className="flex items-center justify-between text-xs font-ui mb-2 px-1">
            <span className="font-semibold text-text-1">{ANALYTICS_COPY.inner.useByZone}</span>
            <div className="flex items-center gap-3 text-[11px] text-text-3 font-ui">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#E0A84B]" /> Mean
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#EF6B6B]" /> Peak
              </span>
            </div>
          </div>

          <div className="h-[150px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={zonesData}
                margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid stroke="#3A332D" strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="zoneId"
                  stroke="#5A5048"
                  tick={{ fill: '#A99F92', fontSize: 11 }}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke="#5A5048"
                  tick={{ fill: '#A99F92', fontSize: 11 }}
                  tickFormatter={v => `${v}%`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const d = payload[0].payload;
                    return (
                      <ChartGlassTooltip
                        active={active}
                        label={`${d.zoneId} — ${d.name}`}
                        customRows={[
                          { label: 'Mean Utilisation', value: `${d.avgUtilisationPct}%`, color: '#E0A84B' },
                          { label: 'Peak Utilisation', value: `${d.peakUtilisationPct}%`, color: '#EF6B6B' },
                          { label: 'Capacity', value: `${d.slotCount} bays`, color: '#6FB8D6' },
                        ]}
                      />
                    );
                  }}
                />
                <Bar
                  dataKey="avgUtilisationPct"
                  name="Mean Utilisation"
                  fill="#E0A84B"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={!shouldReduceMotion}
                  onClick={(data: any) => {
                    const zId = data?.payload?.zoneId || data?.zoneId;
                    if (zId) {
                      onSelectZone(currentZoneFilter === zId ? 'all' : zId);
                    }
                  }}
                  className="cursor-pointer"
                >
                  {zonesData.map((entry) => (
                    <Cell
                      key={`cell-${entry.zoneId}`}
                      fill={currentZoneFilter === entry.zoneId ? '#5FD08A' : '#E0A84B'}
                      stroke={currentZoneFilter === entry.zoneId ? '#FFFFFF' : 'transparent'}
                      strokeWidth={1.5}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom: Position Skew (Nearest-First) */}
        <div className="pt-2 border-t border-white/[0.06] space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-ui px-1">
            <span className="font-semibold text-text-1">Nearest-First Entrance Skew</span>
            <span className="font-data text-[11px] px-2 py-0.5 rounded-pill bg-gold/10 text-gold border border-gold/20">
              Utilisation skew (Gini) = {gini.toFixed(2)}
            </span>
          </div>

          <p className="text-[11px] text-text-3 font-ui italic px-1 m-0">
            Always choosing the nearest free slot concentrates wear near the entrance.
          </p>

          <div className="space-y-1.5 pt-1">
            {positionsData.map(pos => {
              const pct = pos.avgUtilisationPct;
              const isNearest = pos.positionIndex === 0;
              return (
                <div key={pos.positionIndex} className="space-y-1">
                  <div className="flex justify-between text-xs font-ui">
                    <span className="text-text-2">
                      Pos {pos.positionIndex}{' '}
                      <span className="text-text-3 text-[10px]">
                        {isNearest ? '(Nearest Gate)' : pos.positionIndex === 3 ? '(Furthest)' : ''}
                      </span>
                    </span>
                    <span className="font-data font-semibold text-text-1">{pct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-pill bg-white/[0.06] overflow-hidden">
                    <div
                      className={clsx(
                        'h-full rounded-pill transition-all duration-300',
                        pos.positionIndex === 0
                          ? 'bg-gold'
                          : pos.positionIndex === 1
                          ? 'bg-gold/80'
                          : pos.positionIndex === 2
                          ? 'bg-gold/60'
                          : 'bg-gold/40'
                      )}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ChartCardShell>
  );
};
