import {
  Car,
  CheckCircle2,
  Compass,
  Layers,
  Radio,
} from 'lucide-react';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import React, { useState, useEffect } from 'react';
import { useSimStore } from '@/store';
import { useScenarioStore } from '@/scenarios';
import { useFxStore } from '@/scenarios/fx';
import { Stat } from '@/components/Stat';
import { StatusPill } from '@/components/StatusPill';
import { Badge } from '@/components/Badge';
import { PageHeader } from '@/components/PageHeader';
import { TopDownParkingLot } from '@/features/parking/TopDownParkingLot';
import { SlotDetailDrawer } from '@/features/parking/SlotDetailDrawer';
import { LedStrip } from '@/components/LedStrip';

export const OverviewPage: React.FC = () => {
  const { state, events } = useSimStore();
  const { highlightSubsystem } = useScenarioStore();
  const statPulseTrigger = useFxStore(s => s.statPulseTrigger);
  const [isPulsing, setIsPulsing] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (statPulseTrigger > 0) {
      setIsPulsing(true);
      const tm = setTimeout(() => setIsPulsing(false), 800);
      return () => clearTimeout(tm);
    }
    return undefined;
  }, [statPulseTrigger]);

  const occupiedCount = state.slots.filter(s => s.occupied).length;
  const vacantCount = state.slots.filter(s => !s.occupied).length;
  const targetSlots = state.slots.filter(s => s.isTarget);
  const targetNames = targetSlots.map(s => `S${s.slotIndex + 1}`).join(', ') || 'None';

  // Last event from telemetry log
  const lastEvent = events[0];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.05,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, filter: 'blur(6px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: shouldReduceMotion ? 0 : 0.35, ease: 'easeOut' },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* =================================================================== */}
      {/* TOP HEADER & STATUS INDICATORS                                      */}
      {/* =================================================================== */}
      <PageHeader
        title={
          <>
            <span className="text-text">Park</span>
            <span className="text-gold">Way</span>
            <span className="text-text"> : Smart Parking Guidance Using Ultrasonic Sensor Mesh</span>
          </>
        }
        badges={
          <>
            <Badge variant="gold" className="h-7 px-3 text-[11px]">
              ESP32 + WS2812
            </Badge>
            <StatusPill
              status="simulated"
              label="SIMULATED TELEMETRY"
              pulse
              className="h-7 px-3 text-[11px]"
            />
            <StatusPill
              status={state.sweep ? 'sweeping' : 'online'}
              label={state.sweep ? 'SWEEPING' : 'ONLINE'}
              pulse={!!state.sweep}
              className="h-7 px-3 text-[11px]"
            />
          </>
        }
        subtitle="High-fidelity physical twin of 8-slot ultrasonic parking mesh and sequential LED guidance navigation."
      />

      {/* =================================================================== */}
      {/* 5 MAIN COUNTERS GRID (STAT CARDS)                                   */}
      {/* =================================================================== */}
      <motion.div
        variants={itemVariants}
        className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 p-1 rounded-card transition-all duration-300 ${highlightSubsystem === 'statCards' || isPulsing
            ? 'ring-2 ring-gold bg-gold-tint shadow-glass-g3 motion-safe:animate-pulse'
            : ''
          }`}
      >
        <Stat
          label="Total slots"
          value={8}
          unit="bays"
          subtext="2 Lanes • 4 Slots/Lane"
          icon={<Layers className="w-4 h-4 text-[#D2C8BB]" />}
        />
        <Stat
          label="Occupied"
          value={occupiedCount}
          unit="vehicles"
          variant="red"
          subtext={`${Math.round((occupiedCount / 8) * 100)}% Facility Capacity`}
          icon={<Car className="w-4 h-4 text-[#EF6B6B]" />}
        />
        <Stat
          label="Vacant"
          value={vacantCount}
          unit="available"
          variant="green"
          subtext="Ready for Parking"
          icon={<CheckCircle2 className="w-4 h-4 text-[#5FD08A]" />}
        />
        <Stat
          label="Target slots"
          value={targetNames}
          variant="gold"
          subtext={`Mode: ${state.config.mode.toUpperCase()}`}
          icon={<Compass className="w-4 h-4 text-[#E5A93C]" />}
        />
        <Stat
          label="Last telemetry event"
          value={lastEvent ? lastEvent.type.replace(/_/g, ' ') : 'BOOT INITIALIZED'}
          variant="cyan"
          subtext={lastEvent ? `+${Math.round(lastEvent.timestamp)}ms • ${lastEvent.description?.slice(0, 24)}...` : 'System idle'}
          icon={<Radio className="w-4 h-4 text-[#6FB8D6]" />}
        />
      </motion.div>

      {/* =================================================================== */}
      {/* CENTERPIECE: TOP-DOWN SVG PARKING LOT DIGITAL TWIN                  */}
      {/* =================================================================== */}
      <motion.div variants={itemVariants}>
        <TopDownParkingLot />
      </motion.div>


      {/* =================================================================== */}
      {/* HARDWARE TWIN: WS2812 CANVAS LED STRIPS (STACKED)                   */}
      {/* =================================================================== */}
      <motion.div variants={itemVariants}>
        <LedStrip />
      </motion.div>

      {/* =================================================================== */}
      {/* INTERACTIVE SLOT TELEMETRY DETAIL DRAWER (COMPACT POPOVER)          */}
      {/* =================================================================== */}
      <SlotDetailDrawer />
    </motion.div>
  );
};
