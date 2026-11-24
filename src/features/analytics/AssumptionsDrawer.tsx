import React, { useState, useEffect } from 'react';
import { Drawer } from '@/components/Drawer';
import { RotateCcw, AlertTriangle, Sparkles, DollarSign, Activity } from 'lucide-react';
import { useAnalyticsStore } from '@/analytics/store';
import { getCapexPerSlot } from '@/analytics/model';

export const AssumptionsDrawer: React.FC = () => {
  const {
    assumptions,
    isAssumptionsDrawerOpen,
    setAssumptionsDrawerOpen,
    updateAssumption,
    updateCapexBreakdown,
    resetAssumptions,
  } = useAnalyticsStore();

  const [localValues, setLocalValues] = useState({ ...assumptions });

  useEffect(() => {
    setLocalValues({ ...assumptions });
  }, [assumptions]);

  // Debounced sync to store (150ms)
  const handleNumericChange = (key: keyof typeof assumptions, valStr: string) => {
    const num = parseFloat(valStr);
    if (isNaN(num)) return;
    setLocalValues(prev => ({ ...prev, [key]: num }));

    const timer = setTimeout(() => {
      updateAssumption(key, num);
    }, 150);
    return () => clearTimeout(timer);
  };

  const handleCapexChange = (
    key: keyof typeof assumptions.capexBreakdown,
    valStr: string
  ) => {
    const num = parseFloat(valStr);
    if (isNaN(num)) return;
    setLocalValues(prev => ({
      ...prev,
      capexBreakdown: { ...prev.capexBreakdown, [key]: num },
    }));

    const timer = setTimeout(() => {
      updateCapexBreakdown(key, num);
    }, 150);
    return () => clearTimeout(timer);
  };

  const totalCapex = getCapexPerSlot(localValues);

  return (
    <Drawer
      isOpen={isAssumptionsDrawerOpen}
      onClose={() => setAssumptionsDrawerOpen(false)}
      title="Operational Model Assumptions"
      position="right"
      className="w-full sm:max-w-md lg:max-w-lg"
    >
      <div className="space-y-5 text-sm font-ui pb-8">
        {/* Visible Caution Banner */}
        <div className="p-3.5 rounded-inner-card glass-g3 glass-tint-gold border border-gold/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-gold shrink-0 mt-0.5" />
          <div className="text-xs text-text-2 leading-relaxed">
            <span className="font-semibold text-gold block mb-0.5">Illustrative Baseline Parameters</span>
            Defaults are illustrative assumptions, not measured results. Replace them with site measurements before relying on any figure.
          </div>
        </div>

        {/* Section 1: Search Time Dynamics */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-1 uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5 text-gold" />
            <span>Search Time Dynamics</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-text-3 mb-1">
                T50 (Search at 50% occ)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="15"
                  max="120"
                  step="1"
                  value={localValues.t50}
                  onChange={e => handleNumericChange('t50', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg glass-recessed text-text-1 font-data text-xs border border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-gold/60"
                />
                <span className="absolute right-2.5 top-1.5 text-[11px] text-text-3 font-mono pointer-events-none">
                  sec
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-text-3 mb-1">
                T90 (Search at 90% occ)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="90"
                  max="600"
                  step="5"
                  value={localValues.t90}
                  onChange={e => handleNumericChange('t90', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg glass-recessed text-text-1 font-data text-xs border border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-gold/60"
                />
                <span className="absolute right-2.5 top-1.5 text-[11px] text-text-3 font-mono pointer-events-none">
                  sec
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-text-3 mb-1">
                tBase (Guided Base)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="5"
                  max="60"
                  step="1"
                  value={localValues.tBase}
                  onChange={e => handleNumericChange('tBase', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg glass-recessed text-text-1 font-data text-xs border border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-gold/60"
                />
                <span className="absolute right-2.5 top-1.5 text-[11px] text-text-3 font-mono pointer-events-none">
                  sec
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-text-3 mb-1">
                tSlope (Guided Slope)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="5"
                  max="60"
                  step="1"
                  value={localValues.tSlope}
                  onChange={e => handleNumericChange('tSlope', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg glass-recessed text-text-1 font-data text-xs border border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-gold/60"
                />
                <span className="absolute right-2.5 top-1.5 text-[11px] text-text-3 font-mono pointer-events-none">
                  sec
                </span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-text-3 mb-1">
              <span>Driver Compliance Factor</span>
              <span className="font-data text-gold">{Math.round(localValues.compliance * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.0"
              step="0.01"
              value={localValues.compliance}
              onChange={e => handleNumericChange('compliance', e.target.value)}
              className="w-full accent-gold cursor-pointer"
            />
          </div>
        </div>

        {/* Section 2: Vehicle & Environmental Parameters */}
        <div className="space-y-3 pt-2 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-1 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-green" />
            <span>Vehicles & Emissions</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-text-3 mb-1">Cruise Speed</label>
              <div className="relative">
                <input
                  type="number"
                  min="3"
                  max="20"
                  step="0.5"
                  value={localValues.cruiseSpeedKmH}
                  onChange={e => handleNumericChange('cruiseSpeedKmH', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg glass-recessed text-text-1 font-data text-xs border border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-gold/60"
                />
                <span className="absolute right-2.5 top-1.5 text-[11px] text-text-3 font-mono pointer-events-none">
                  km/h
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-text-3 mb-1">Fuel Burn Rate</label>
              <div className="relative">
                <input
                  type="number"
                  min="0.3"
                  max="3.0"
                  step="0.05"
                  value={localValues.fuelPerHourL}
                  onChange={e => handleNumericChange('fuelPerHourL', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg glass-recessed text-text-1 font-data text-xs border border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-gold/60"
                />
                <span className="absolute right-2.5 top-1.5 text-[11px] text-text-3 font-mono pointer-events-none">
                  L/h
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-text-3 mb-1">CO₂ Factor (Petrol)</label>
              <div className="relative">
                <input
                  type="number"
                  min="1.5"
                  max="3.5"
                  step="0.05"
                  value={localValues.co2FactorKgPerL}
                  onChange={e => handleNumericChange('co2FactorKgPerL', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg glass-recessed text-text-1 font-data text-xs border border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-gold/60"
                />
                <span className="absolute right-2.5 top-1.5 text-[11px] text-text-3 font-mono pointer-events-none">
                  kg/L
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-text-3 mb-1">Fuel Price</label>
              <div className="relative">
                <input
                  type="number"
                  min="60"
                  max="180"
                  step="1"
                  value={localValues.fuelPriceRsPerL}
                  onChange={e => handleNumericChange('fuelPriceRsPerL', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg glass-recessed text-text-1 font-data text-xs border border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-gold/60"
                />
                <span className="absolute right-2.5 top-1.5 text-[11px] text-text-3 font-mono pointer-events-none">
                  ₹/L
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Commercials & Capex per Slot */}
        <div className="space-y-3 pt-2 border-t border-white/[0.06]">
          <div className="flex items-center justify-between text-xs font-semibold text-text-1 uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-gold" />
              <span>Capex Breakdown (₹ / Slot)</span>
            </div>
            <span className="text-gold font-data text-xs">Total: ₹{totalCapex.toLocaleString()}</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div>
              <label className="block text-[11px] text-text-3 mb-0.5">HC-SR04 Sensor</label>
              <input
                type="number"
                value={localValues.capexBreakdown.hcSr04}
                onChange={e => handleCapexChange('hcSr04', e.target.value)}
                className="w-full px-2 py-1 rounded glass-recessed text-text-1 font-data text-xs border border-white/[0.08]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-text-3 mb-0.5">ESP32 SoC Share</label>
              <input
                type="number"
                value={localValues.capexBreakdown.esp32Share}
                onChange={e => handleCapexChange('esp32Share', e.target.value)}
                className="w-full px-2 py-1 rounded glass-recessed text-text-1 font-data text-xs border border-white/[0.08]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-text-3 mb-0.5">WS2812 LEDs & Driver</label>
              <input
                type="number"
                value={localValues.capexBreakdown.ledAndDriver}
                onChange={e => handleCapexChange('ledAndDriver', e.target.value)}
                className="w-full px-2 py-1 rounded glass-recessed text-text-1 font-data text-xs border border-white/[0.08]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-text-3 mb-0.5">Wiring & Enclosure</label>
              <input
                type="number"
                value={localValues.capexBreakdown.wiringEnclosure}
                onChange={e => handleCapexChange('wiringEnclosure', e.target.value)}
                className="w-full px-2 py-1 rounded glass-recessed text-text-1 font-data text-xs border border-white/[0.08]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-text-3 mb-0.5">Install & Commission</label>
              <input
                type="number"
                value={localValues.capexBreakdown.installCommissioning}
                onChange={e => handleCapexChange('installCommissioning', e.target.value)}
                className="w-full px-2 py-1 rounded glass-recessed text-text-1 font-data text-xs border border-white/[0.08]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-text-3 mb-0.5">Network & Dashboard</label>
              <input
                type="number"
                value={localValues.capexBreakdown.networkDashboardShare}
                onChange={e => handleCapexChange('networkDashboardShare', e.target.value)}
                className="w-full px-2 py-1 rounded glass-recessed text-text-1 font-data text-xs border border-white/[0.08]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] text-text-3 mb-1">Opex (₹/slot/mo)</label>
              <input
                type="number"
                value={localValues.opexPerSlotMonthRs}
                onChange={e => handleNumericChange('opexPerSlotMonthRs', e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg glass-recessed text-text-1 font-data text-xs border border-white/[0.08]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-text-3 mb-1">Sensor Fail (%/yr)</label>
              <input
                type="number"
                step="0.5"
                value={localValues.sensorReplacementAnnualRate * 100}
                onChange={e =>
                  handleNumericChange('sensorReplacementAnnualRate', (parseFloat(e.target.value) / 100).toString())
                }
                className="w-full px-2.5 py-1.5 rounded-lg glass-recessed text-text-1 font-data text-xs border border-white/[0.08]"
              />
            </div>
          </div>
        </div>

        {/* Reset Button */}
        <div className="pt-3 border-t border-white/[0.06] flex justify-end">
          <button
            type="button"
            onClick={resetAssumptions}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-g3 text-xs text-text-2 hover:text-text-1 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>
        </div>
      </div>
    </Drawer>
  );
};
