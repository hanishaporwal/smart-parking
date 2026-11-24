import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { FileCheck2, Cpu, Sparkles, Maximize2 } from 'lucide-react';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { ClaimId } from './digitalTwin/types';
import { CLAIMS_CONFIG } from './digitalTwin/claimsData';
import { TopDownTwinStage } from './digitalTwin/TopDownTwinStage';
import { ClaimStepList } from './digitalTwin/ClaimStepList';

const CLAIMS: { id: ClaimId; label: string; pillar: string; claimNum: number }[] = [
  { id: 'claim2', label: 'Claim 2', pillar: 'Sense', claimNum: 2 },
  { id: 'claim5', label: 'Claim 5', pillar: 'Decide', claimNum: 5 },
  { id: 'claim12', label: 'Claim 12', pillar: 'Guide', claimNum: 12 },
  { id: 'claim7', label: 'Claim 7', pillar: 'Adapt', claimNum: 7 },
];

export const ClaimTracerPanel: React.FC = () => {
  const [activeClaimId, setActiveClaimId] = useState<ClaimId>('claim7');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

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

  return (
    <Card className="space-y-5" padding="lg">
      {/* Panel Header */}
      <div className="pb-3.5 border-b border-border-1">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full glass-g3 glass-tint-gold glass-rim-gold text-gold flex items-center justify-center shrink-0 shadow-glass-g3 mt-0.5">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-xl sm:text-2xl font-display font-medium text-text-1">
                Patent Claim Tracer
              </h3>
              <Badge variant="gold" size="sm">
                SIMULATED
              </Badge>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full glass-g3 glass-tint-gold text-[11px] font-mono text-gold font-semibold shadow-sm">
                <Sparkles className="w-3 h-3 text-gold" />
                <span>Claim {activeClaim.claimNumber} — {activeClaim.pillar} (10.0s Timeline)</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.04] border border-border-2 text-[11px] font-mono text-text-3">
                <Cpu className="w-3 h-3 text-info" />
                <span>Digital Twin Mesh</span>
              </div>
              <NavLink
                to="/claims"
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full glass-g3 text-[11px] font-ui font-medium text-text-2 hover:text-gold hover:border-gold/30 transition-all cursor-pointer ml-auto"
                title="Open dedicated full-page view"
              >
                <Maximize2 className="w-3 h-3 text-gold" />
                <span>Full Page View</span>
              </NavLink>
            </div>

            <p className="text-sm text-text-2 font-ui mt-2">
              {activeClaimId === 'claim7'
                ? 'Dynamic re-routing when a target slot is taken: the sensor detects obstruction, re-evaluates the nearest free bay, and instantly re-directs the driver.'
                : activeClaimId === 'claim12'
                ? 'Follow the light: gate arrival, barrier lift, sequential LED strip illumination leading the driver into S3, and realistic parking maneuver.'
                : activeClaimId === 'claim5'
                ? 'Free bay discovery, distance-from-gate position ranking, constant-speed cross-lane scanning, and dual target selection.'
                : 'Real-time ultrasonic echo sensing on the digital twin layout: fast echoes (<15 cm) detect parked cars, while floor returns confirm vacant bays.'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Dual-Column Content: Digital Twin Canvas (Left) + Step List on Side (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Existing 8-Slot Digital Twin Layout (No text on lot) */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          {/* Claim Selector Tabs - Positioned above layout in compact pill format */}
          <div className="flex justify-center sm:justify-start">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl glass-recessed border border-border-recessed w-full max-w-xl">
              {CLAIMS.map((c) => {
                const isSel = c.id === activeClaimId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectClaim(c.id)}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-ui font-semibold transition-all cursor-pointer ${
                      isSel
                        ? 'glass-g3 glass-tint-gold text-gold shadow-md'
                        : 'text-text-3 hover:text-text-1 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSel ? 'bg-gold shadow-[0_0_8px_rgba(224,168,75,0.6)]' : 'bg-text-3/60'}`} />
                    <span className="truncate">{c.label}</span>
                    <span className="text-[10.5px] opacity-75 font-mono">({c.pillar})</span>
                  </button>
                );
              })}
            </div>
          </div>

          <TopDownTwinStage
            claimId={activeClaimId}
            time={currentTime}
            isPlaying={isPlaying}
          />
        </div>

        {/* Right Panel: Step List with active step in gold, completed steps checked + Controls */}
        <div className="lg:col-span-4 rounded-2xl glass-g2 border border-border-2 p-4 sm:p-5 flex flex-col justify-between shadow-glass-g2 min-h-[380px]">
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
  );
};

export default ClaimTracerPanel;
