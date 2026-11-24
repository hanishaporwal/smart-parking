import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import {
  FileCheck2,
  Clock,
  Sparkles,
  Radio,
  Compass,
  Layers,
} from 'lucide-react';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { StatusPill } from '@/components/StatusPill';
import { PageHeader } from '@/components/PageHeader';
import { ClaimId } from '@/features/parking/digitalTwin/types';
import { CLAIMS_CONFIG } from '@/features/parking/digitalTwin/claimsData';
import { TopDownTwinStage } from '@/features/parking/digitalTwin/TopDownTwinStage';
import { ClaimStepList } from '@/features/parking/digitalTwin/ClaimStepList';
import { CarShowcaseModal } from '@/features/parking/CarShowcaseModal';
import { useSimStore } from '@/store';
import { Car } from 'lucide-react';

const CLAIMS: { id: ClaimId; label: string; pillar: string; claimNum: number }[] = [
  { id: 'claim2', label: 'Claim 2', pillar: 'Sense', claimNum: 2 },
  { id: 'claim5', label: 'Claim 5', pillar: 'Decide', claimNum: 5 },
  { id: 'claim12', label: 'Claim 12', pillar: 'Guide', claimNum: 12 },
  { id: 'claim7', label: 'Claim 7', pillar: 'Adapt', claimNum: 7 },
];

export const PatentClaimsPage: React.FC = () => {
  const [activeClaimId, setActiveClaimId] = useState<ClaimId>('claim7');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isCarModalOpen, setIsCarModalOpen] = useState<boolean>(false);
  const carStyle = useSimStore((s) => s.carStyle);
  const reducedMotion = useReducedMotion();

  const activeClaim = CLAIMS_CONFIG[activeClaimId];

  // Single 60fps Master Clock Reference
  const lastTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const stopAnimation = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    lastTimeRef.current = null;
  }, []);

  const handlePlay = useCallback(() => {
    setCurrentTime((prev) => (prev >= activeClaim.duration ? 0 : prev));
    setIsPlaying(true);
  }, [activeClaim.duration]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    stopAnimation();
  }, [stopAnimation]);

  const handleReplay = useCallback(() => {
    stopAnimation();
    setCurrentTime(0);
    setIsPlaying(true);
  }, [stopAnimation]);

  const handleReset = useCallback(() => {
    stopAnimation();
    setIsPlaying(false);
    setCurrentTime(0);
  }, [stopAnimation]);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(Math.max(0, Math.min(time, activeClaim.duration)));
  }, [activeClaim.duration]);

  const handleSelectClaim = (id: ClaimId) => {
    if (id !== activeClaimId) {
      stopAnimation();
      setIsPlaying(false);
      setCurrentTime(0);
      setActiveClaimId(id);
    }
  };

  // Master Timeline Loop (Single clock driving the lot, steps, timer and progress)
  useEffect(() => {
    if (!isPlaying) {
      stopAnimation();
      return;
    }

    const tick = (now: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = now;
      }
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      setCurrentTime((prev) => {
        const next = prev + delta;
        if (next >= activeClaim.duration) {
          setIsPlaying(false);
          stopAnimation();
          return activeClaim.duration;
        }
        return next;
      });

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      stopAnimation();
    };
  }, [isPlaying, activeClaim.duration, stopAnimation]);

  // Derived telemetry states for the active claim
  const currentStep = activeClaim.steps.find(
    (s) => currentTime >= s.startTime && currentTime <= s.endTime
  ) || activeClaim.steps[activeClaim.steps.length - 1];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: reducedMotion ? 0 : 0.05,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, filter: 'blur(6px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: reducedMotion ? 0 : 0.35, ease: 'easeOut' },
    },
  };

  const claimSubtitle =
    activeClaimId === 'claim7'
      ? 'Dynamic re-routing when a target slot is taken: the sensor detects obstruction, re-evaluates the nearest free bay, and instantly re-directs the driver.'
      : activeClaimId === 'claim12'
        ? 'Follow the light: gate arrival, barrier lift, sequential LED strip illumination leading the driver into S3, and realistic parking maneuver.'
        : activeClaimId === 'claim5'
          ? 'Free bay discovery, distance-from-gate position ranking, constant-speed cross-lane scanning, and nearest target selection.'
          : 'Real-time ultrasonic echo sensing on the digital twin layout: fast echoes (<15 cm) detect parked cars, while floor returns confirm vacant bays.';

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ================================================================= */}
      {/* 1. PAGE HEADER (MATCHING GUIDANCE & HARDWARE PAGE)                */}
      {/* ================================================================= */}
      <PageHeader
        title="Patent Claim Tracer"
        badges={
          <>
            <Badge variant="gold" className="h-7 px-3 text-[11px]">
              Claim {activeClaim.claimNumber} — {activeClaim.pillar}
            </Badge>
            <Badge variant="info" className="h-7 px-3 text-[11px]">
              ESP32 + WS2812
            </Badge>
            <StatusPill
              status="simulated"
              label="SIMULATED TELEMETRY"
              className="h-7 px-3 text-[11px]"
            />
            {/* Master Clock Pill in Header */}
            <div className="flex items-center gap-2 h-7 px-3 rounded-full glass-recessed border border-border-recessed text-xs font-mono text-text-2">
              <Clock className="w-3.5 h-3.5 text-gold" />
              <span>CLOCK:</span>
              <span className="text-gold font-bold tabular-nums">
                {currentTime.toFixed(1)}s
              </span>
              <span className="text-text-3">/ 10.0s</span>
              <span className={`w-2 h-2 rounded-full ml-0.5 ${isPlaying ? 'bg-green animate-pulse' : 'bg-text-3/60'}`} />
            </div>
          </>
        }
        subtitle={claimSubtitle}
      />

      {/* ================================================================= */}
      {/* 2. MAIN CARDS: STEP LIST CARD (LEFT) + TWIN STAGE CARD (RIGHT)    */}
      {/* ================================================================= */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row gap-5 items-stretch">
        {/* Left: Step List with claim selector & playback controls (Compact ergonomic width) */}
        <div className="w-full lg:w-[330px] xl:w-[350px] shrink-0 flex flex-col">
          <Card padding="none" className="overflow-hidden flex flex-col h-full justify-between shadow-glass-g2">
            <div className="p-3.5 sm:p-4 flex flex-col justify-between h-full space-y-3">
              {/* Claim Selector Buttons embedded directly inside the Step Box */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-xl glass-recessed border border-border-recessed w-full">
                {CLAIMS.map((c) => {
                  const isSel = c.id === activeClaimId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectClaim(c.id)}
                      className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-xs font-ui font-semibold transition-all cursor-pointer ${isSel
                          ? 'glass-g3 glass-tint-gold text-gold shadow-md'
                          : 'text-text-3 hover:text-text-1 hover:bg-white/[0.04]'
                        }`}
                    >
                      <div className="flex items-center gap-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSel
                              ? 'bg-gold shadow-[0_0_8px_rgba(224,168,75,0.6)]'
                              : 'bg-text-3/60'
                            }`}
                        />
                        <span>{c.label}</span>
                      </div>
                      <span className="text-[10px] opacity-75 font-mono">({c.pillar})</span>
                    </button>
                  );
                })}
              </div>

              {/* Step List content */}
              <div className="flex-1 min-h-0 flex flex-col justify-between">
                <ClaimStepList
                  claim={activeClaim}
                  currentTime={currentTime}
                  isPlaying={isPlaying}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onReplay={handleReplay}
                  onReset={handleReset}
                  onSeek={handleSeek}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Digital Twin 8-Slot Layout Canvas (Expands to take all remaining space) */}
        <div className="flex-1 min-w-0 flex flex-col">
          <Card padding="none" className="overflow-hidden flex flex-col h-full justify-between shadow-2xl">
            {/* Header area above the twin layout with soft gold-tinted gradient band */}
            <div className="px-5 py-3 border-b border-border-1/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gradient-to-b from-gold/14 via-gold/5 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg glass-g3 glass-tint-gold text-gold flex items-center justify-center shrink-0 shadow-glass-g3">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-display text-[17px] text-text-1 tracking-tight leading-tight">
                    FIG. Digital Twin Layout — 8-Slot Ultrasonic Mesh
                  </h2>
                  <p className="text-[11px] font-ui text-text-3">
                    WS2812 addressable LED strip visual navigation • GPIO 23 & GPIO 15
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCarModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full glass-g3 hover:border-gold/50 text-[11px] font-mono text-text-2 hover:text-text-1 font-semibold shadow-sm transition-all hover:scale-102 active:scale-98"
                  title="Choose realistic car design (3 Styles)"
                >
                  <Car className="w-3.5 h-3.5 text-gold" />
                  <span>MODEL: <strong className="text-gold uppercase">{carStyle}</strong></span>
                </button>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full glass-g3 text-[11px] font-mono text-gold font-semibold shadow-sm">
                  <Sparkles className="w-3 h-3 text-gold" />
                  <span>Claim {activeClaim.claimNumber} • {activeClaim.pillar}</span>
                </div>
              </div>
            </div>

            {/* Layout Canvas Area - Compact padding to maximize SVG twin canvas scale */}
            <div className="p-2 sm:p-2.5 flex items-center justify-center flex-1 min-h-0 bg-asphalt/60">
              <TopDownTwinStage
                claimId={activeClaimId}
                time={currentTime}
                isPlaying={isPlaying}
              />
            </div>

            {/* Telemetry Status Strip at the bottom of the twin card */}
            <div className="px-4 py-2.5 border-t border-border-1/60 bg-level-2/60">
              <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono text-text-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-info" />
                    <span>STEP:</span>
                    <span className="text-text-1 font-semibold">
                      Step {currentStep?.number || 1} of {activeClaim.steps.length} ({activeClaim.pillar.toUpperCase()})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-gold" />
                    <span>TARGET:</span>
                    <span className="text-gold font-semibold">
                      {activeClaimId === 'claim7'
                        ? (currentTime < 5.5 ? 'S2 (Upper Lane)' : 'S7 (Lower Lane)')
                        : activeClaimId === 'claim12'
                          ? 'S3 (Lane 0)'
                          : activeClaimId === 'claim5'
                            ? (currentTime < 8.5 ? 'Comparing (S6, S3, S8)' : 'S6 (Nearest Target)')
                            : 'S1, S4, S6, S7 (Vacant)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-green" />
                    <span>LED STRIP:</span>
                    <span className="text-green font-semibold">
                      {activeClaimId === 'claim7'
                        ? (currentTime < 4.5 ? 'GPIO 23 Active (S2)' : currentTime < 5.5 ? 'Idle' : 'GPIO 15 Active (S7)')
                        : 'GPIO 23 / GPIO 15'}
                    </span>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-2 text-[11px] text-text-3/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-info/80" />
                  <span>Full-Page Twin Architecture • 10.0s Master Timeline</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </motion.div>

      {/* Realistic Vehicle Model Showcase Modal */}
      <CarShowcaseModal
        isOpen={isCarModalOpen}
        onClose={() => setIsCarModalOpen(false)}
      />
    </motion.div>
  );
};

export default PatentClaimsPage;
