// ============================================================================
// PARKWAY SENSOR S3 INSPECTOR PANEL (src/features/parking/InspectorPanel.tsx)
// Renders the rich internal side-view of sensor S3 with transducers, vertical
// ruler, bay floor, 15cm threshold line, echo timer bar, pulse wave, and formula chip.
// ============================================================================

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useInspectorStore } from '@/scenarios/fx/inspector';
import { CarSvg } from './CarSvg';

export const InspectorPanel: React.FC = () => {
  const {
    visible,
    pulseDirection,
    pulseProgress,
    echoTimerUs,
    timerTimeout,
    carVisible,
    carCm,
    carProgress,
    triggerFlash,
    rulerMarkerCm,
    floorVisible,
    thresholdPulse,
    formula,
    readoutCm,
    readoutTone,
    pill,
    noteChip,
    tag,
  } = useInspectorStore();

  if (!visible) return null;

  // Panel geometry in 1100x590 lot space
  const panelX = 286;
  const panelY = 35;
  const panelWidth = 528;
  const panelHeight = 484;

  // Ruler vertical mapping: 0 cm at y=95, 40 cm at y=395 (300px for 40cm = 7.5px/cm)
  const rulerStartY = 95;
  const rulerHeight = 300;
  const pxPerCm = rulerHeight / 40; // 7.5 px per cm

  const getYForCm = (cm: number) => rulerStartY + Math.min(40, Math.max(0, cm)) * pxPerCm;

  const thresholdY = getYForCm(15); // ~207.5
  const floorY = getYForCm(28); // ~305
  const currentMarkerY = getYForCm(rulerMarkerCm);

  // Car vertical top-down position inside bay (matching parking bay orientation)
  const carW = 82;
  const carH = 152;
  const carX = 246 - carW / 2; // Centered under HC-SR04 transducers at x=246
  const carTargetY = getYForCm(carCm);
  const progress = carProgress !== undefined ? carProgress : 1;
  const carCurrentY = carVisible ? carTargetY + (1 - progress) * 140 : 420;

  // Pulse wave geometry
  // Transducers emit from y=85, travel to target (car top edge or floor)
  const targetWaveY = carVisible ? carCurrentY : floorVisible ? floorY : 420;
  let waveY = 85;
  if (pulseDirection === 'down') {
    waveY = 85 + (targetWaveY - 85) * pulseProgress;
  } else if (pulseDirection === 'up') {
    waveY = targetWaveY - (targetWaveY - 85) * pulseProgress;
  }

  // Timer vertical height (0 at top, 2000 at bottom)
  const timerTrackHeight = 220;
  const timerStartY = 135;
  const timerProgress = Math.min(1, echoTimerUs / 2000);
  const timerMarkerY = timerStartY + timerTrackHeight * timerProgress;

  // S3 Sensor leader line endpoint
  // S3 sensor in lot coords is at x=799, y=232
  const s3SensorX = 799;
  const s3SensorY = 232;

  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      {/* Leader line from S3's physical sensor to the inspector panel */}
      <svg
        viewBox="0 0 1100 590"
        className="absolute inset-0 w-full h-full block pointer-events-none"
        preserveAspectRatio="xMidYMid meet"
      >
        <line
          x1={panelX + panelWidth}
          y1={panelY + 120}
          x2={s3SensorX}
          y2={s3SensorY}
          stroke="#E0A84B"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          opacity={0.85}
        />
        <circle cx={s3SensorX} cy={s3SensorY} r={4} fill="#E0A84B" />
      </svg>

      {/* Main Glass Panel */}
      <motion.div
        key="sensor-s3-inspector"
        initial={{ opacity: 0, scale: 0.94, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 8 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="absolute rounded-[24px] bg-[#171411]/95 border border-gold/40 shadow-[0_24px_64px_rgba(0,0,0,0.85),0_0_24px_rgba(224,168,75,0.18)] backdrop-blur-[24px] overflow-hidden pointer-events-auto"
        style={{
          left: panelX,
          top: panelY,
          width: panelWidth,
          height: panelHeight,
        }}
      >
        {/* Specular Highlight Rim */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

        {/* Panel Header */}
        <div className="px-5 py-3 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gold animate-pulse" />
            <h3 className="text-base font-display font-medium text-text-1">Inside sensor S3</h3>
            <span className="text-[11px] font-mono text-gold/80 px-2 py-0.5 rounded-full bg-gold/10 border border-gold/30">
              HC-SR04 • GPIO 19/16
            </span>
          </div>

          <div className="flex items-center gap-2">
            {readoutCm !== null && (
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border transition-colors ${
                  readoutTone === 'red'
                    ? 'bg-red/15 text-red border-red/40'
                    : 'bg-green/15 text-green border-green/40'
                }`}
              >
                {readoutCm} cm
              </span>
            )}
            {pill && (
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-ui font-semibold border ${
                  pill === 'OCCUPIED'
                    ? 'bg-red/20 text-red border-red/50 shadow-sm'
                    : 'bg-green/20 text-green border-green/50 shadow-sm'
                }`}
              >
                {pill}
              </span>
            )}
          </div>
        </div>

        {/* Side-View SVG Canvas */}
        <svg
          viewBox="0 0 528 410"
          className="w-full block select-none"
          style={{ height: 360 }}
          preserveAspectRatio="none"
        >
          {/* Background Bay Ambience */}
          <rect x={110} y={75} width={280} height={330} fill="#1C1916" rx={6} opacity={0.6} />

          {/* 1. Sensor Housing at Top Center (x=250, y=30) */}
          <g transform="translate(250, 25)">
            {/* PCB Plate */}
            <rect x={-52} y={0} width={104} height={18} rx={4} fill="#1E3A2F" stroke="#2E5544" strokeWidth={1} />
            {/* Crystal Oscillator */}
            <rect x={-8} y={-4} width={16} height={6} rx={2} fill="#A99F92" />
            {/* Left Transducer (TX) */}
            <g transform="translate(-25, 18)">
              <rect x={-14} y={0} width={28} height={26} rx={4} fill="#B8C0C8" stroke="#7A8490" strokeWidth={1} />
              <circle cx={0} cy={13} r={10} fill="#4A525C" />
              <circle cx={0} cy={13} r={7} fill="none" stroke="#7A8490" strokeWidth={0.8} />
              <circle cx={0} cy={13} r={4} fill="none" stroke="#7A8490" strokeWidth={0.8} />
              <text x={0} y={32} fill="#A99F92" fontSize={7} fontFamily="IBM Plex Mono, monospace" textAnchor="middle">
                T
              </text>
            </g>
            {/* Right Transducer (RX) */}
            <g transform="translate(25, 18)">
              <rect x={-14} y={0} width={28} height={26} rx={4} fill="#B8C0C8" stroke="#7A8490" strokeWidth={1} />
              <circle cx={0} cy={13} r={10} fill="#4A525C" />
              <circle cx={0} cy={13} r={7} fill="none" stroke="#7A8490" strokeWidth={0.8} />
              <circle cx={0} cy={13} r={4} fill="none" stroke="#7A8490" strokeWidth={0.8} />
              <text x={0} y={32} fill="#A99F92" fontSize={7} fontFamily="IBM Plex Mono, monospace" textAnchor="middle">
                R
              </text>
            </g>
          </g>

          {/* Trigger Flash Chip */}
          <AnimatePresence>
            {triggerFlash && (
              <motion.g
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transform="translate(250, 8)"
              >
                <rect x={-42} y={-10} width={84} height={18} rx={9} fill="#E0A84B" />
                <text x={0} y={2.5} fill="#0E0C0A" fontSize={9} fontFamily="IBM Plex Mono, monospace" fontWeight="bold" textAnchor="middle">
                  10 μs trigger
                </text>
              </motion.g>
            )}
          </AnimatePresence>

          {/* 2. Vertical Ruler on the Left (x=30..90) */}
          <g transform="translate(42, 0)">
            {/* Ruler Baseline Line */}
            <line x1={40} y1={rulerStartY} x2={40} y2={rulerStartY + rulerHeight} stroke="#463E37" strokeWidth={1.5} />
            {/* Major & Minor Ticks from 0 to 40 cm */}
            {[0, 5, 10, 15, 20, 25, 28, 30, 35, 40].map((cm) => {
              const y = getYForCm(cm);
              const isMajor = cm % 10 === 0;
              const isThreshold = cm === 15;
              const isFloor = cm === 28;

              return (
                <g key={cm}>
                  <line
                    x1={isMajor ? 28 : isThreshold || isFloor ? 30 : 34}
                    y1={y}
                    x2={40}
                    y2={y}
                    stroke={isThreshold ? '#EF6B6B' : isFloor ? '#E0A84B' : isMajor ? '#A99F92' : '#5A5048'}
                    strokeWidth={isMajor || isThreshold || isFloor ? 1.5 : 1}
                  />
                  {isMajor && (
                    <text
                      x={24}
                      y={y + 3.5}
                      fill="#A99F92"
                      fontSize={9}
                      fontFamily="IBM Plex Mono, monospace"
                      textAnchor="end"
                    >
                      {cm}
                    </text>
                  )}
                </g>
              );
            })}
            <text x={24} y={rulerStartY - 10} fill="#7A8490" fontSize={8} fontFamily="Hanken Grotesk, sans-serif" textAnchor="middle">
              cm
            </text>

            {/* Moving Marker */}
            <g transform={`translate(42, ${currentMarkerY})`}>
              <polygon points="0,0 8,-5 8,5" fill="#E0A84B" />
            </g>
          </g>

          {/* 3. 15 cm Threshold Line */}
          <g>
            <line
              x1={86}
              y1={thresholdY}
              x2={386}
              y2={thresholdY}
              stroke="#EF6B6B"
              strokeWidth={thresholdPulse ? 2 : 1.5}
              strokeDasharray="4 4"
              className={thresholdPulse ? 'animate-pulse' : ''}
            />
            <rect x={290} y={thresholdY - 18} width={92} height={16} rx={4} fill="#2B1818" stroke="#EF6B6B" strokeWidth={1} opacity={0.9} />
            <text x={336} y={thresholdY - 7} fill="#EF6B6B" fontSize={8.5} fontFamily="IBM Plex Mono, monospace" textAnchor="middle" fontWeight="bold">
              15 cm: threshold
            </text>
          </g>

          {/* 4. Bay Floor Line (28 cm) */}
          <g opacity={floorVisible ? 1 : 0.2} className="transition-opacity duration-500">
            <line x1={86} y1={floorY} x2={386} y2={floorY} stroke="#8A8D91" strokeWidth={2} />
            <rect x={294} y={floorY + 4} width={88} height={16} rx={4} fill="#1E2024" stroke="#5A5E66" strokeWidth={1} />
            <text x={338} y={floorY + 15} fill="#D2C8BB" fontSize={8.5} fontFamily="Hanken Grotesk, sans-serif" textAnchor="middle">
              bay floor (28 cm)
            </text>
          </g>

          {/* Open Air Indicator (Step 6) */}
          {!floorVisible && (
            <text x={250} y={350} fill="#6FB8D6" fontSize={11} fontFamily="Hanken Grotesk, sans-serif" textAnchor="middle" fontStyle="italic">
              Open Air (No Echo Return)
            </text>
          )}

          {/* 5. Ultrasonic Pulse Wave (3 info-blue arcs) */}
          {pulseDirection !== 'none' && (
            <g transform={`translate(250, ${waveY})`}>
              <path
                d="M -30 0 A 40 40 0 0 1 30 0"
                fill="none"
                stroke="#6FB8D6"
                strokeWidth={2}
                strokeLinecap="round"
                opacity={0.8}
                transform={pulseDirection === 'up' ? 'scale(1, -1)' : ''}
              />
              <path
                d="M -42 8 A 52 52 0 0 1 42 8"
                fill="none"
                stroke="#6FB8D6"
                strokeWidth={2.2}
                strokeLinecap="round"
                opacity={0.95}
                transform={pulseDirection === 'up' ? 'scale(1, -1)' : ''}
              />
              <path
                d="M -54 16 A 64 64 0 0 1 54 16"
                fill="none"
                stroke="#6FB8D6"
                strokeWidth={2}
                strokeLinecap="round"
                opacity={0.7}
                transform={pulseDirection === 'up' ? 'scale(1, -1)' : ''}
              />
            </g>
          )}

          {/* 6. Top-Down Vertical Car (matching parking bay orientation) */}
          {carVisible && (
            <g transform={`translate(${carX}, ${carCurrentY})`}>
              {/* Distance Reference Line across top of vehicle */}
              <line
                x1={-24}
                y1={0}
                x2={carW + 24}
                y2={0}
                stroke="#E0A84B"
                strokeWidth={1.5}
                strokeDasharray="3 2"
              />
              <text
                x={carW / 2}
                y={-6}
                fill="#E0A84B"
                fontSize={8.5}
                fontFamily="IBM Plex Mono, monospace"
                textAnchor="middle"
              >
                car roof: {carCm} cm
              </text>

              {/* Vertical Top-Down Vehicle Sprite */}
              <CarSvg
                x={0}
                y={0}
                width={carW}
                height={carH}
                color="#2A5C8A"
                orientation="portrait"
                facing="down"
                isReversing={true}
              />
            </g>
          )}

          {/* 7. Echo Timer Bar on Right (x=420..490) */}
          <g transform="translate(424, 0)">
            <text x={35} y={115} fill="#F6F0E8" fontSize={9.5} fontFamily="Hanken Grotesk, sans-serif" fontWeight="600" textAnchor="middle">
              Echo timer
            </text>

            {/* Vertical Bar Track */}
            <rect x={20} y={timerStartY} width={30} height={timerTrackHeight} rx={6} fill="#110E0C" stroke="#3A332D" strokeWidth={1} />

            {/* Filled Progress */}
            <rect
              x={22}
              y={timerStartY + 2}
              width={26}
              height={Math.max(4, timerTrackHeight * timerProgress - 4)}
              rx={4}
              fill="url(#timer-gradient)"
              opacity={0.85}
            />

            {/* Ticks at 0, 500, 1000, 1500, 2000 us */}
            {[0, 500, 1000, 1500, 2000].map((us) => {
              const y = timerStartY + (us / 2000) * timerTrackHeight;
              return (
                <g key={us}>
                  <line x1={14} y1={y} x2={20} y2={y} stroke="#5A5048" strokeWidth={1} />
                  <text x={10} y={y + 3} fill="#7A8490" fontSize={7.5} fontFamily="IBM Plex Mono, monospace" textAnchor="end">
                    {us}
                  </text>
                </g>
              );
            })}

            {/* Moving Marker & Live Readout */}
            <g transform={`translate(54, ${timerMarkerY})`}>
              <polygon points="0,0 6,-4 6,4" fill="#6FB8D6" />
              <rect x={8} y={-9} width={42} height={18} rx={4} fill="#1C2834" stroke="#6FB8D6" strokeWidth={1} />
              <text x={29} y={3.5} fill="#6FB8D6" fontSize={8.5} fontFamily="IBM Plex Mono, monospace" fontWeight="bold" textAnchor="middle">
                {echoTimerUs}
              </text>
            </g>

            {/* Timeout Indicator Tag */}
            {timerTimeout && (
              <g transform={`translate(35, ${timerStartY + timerTrackHeight + 16})`}>
                <rect x={-34} y={-8} width={68} height={16} rx={4} fill="#2B1414" stroke="#EF6B6B" strokeWidth={1} />
                <text x={0} y={3.5} fill="#EF6B6B" fontSize={8} fontFamily="IBM Plex Mono, monospace" fontWeight="bold" textAnchor="middle">
                  TIMEOUT 30ms
                </text>
              </g>
            )}
          </g>

          <defs>
            <linearGradient id="timer-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6FB8D6" />
              <stop offset="100%" stopColor="#2A5C8A" />
            </linearGradient>
          </defs>
        </svg>

        {/* 8. Bottom Formula Chip & Live Substitution */}
        <div className="absolute bottom-2.5 inset-x-4 px-3.5 py-2 rounded-[14px] bg-[#1E1B18]/90 border border-white/[0.12] flex items-center justify-between text-xs font-mono shadow-inner">
          <div className="text-text-3 text-[11.5px]">
            distance = echo time × 0.0343 / 2
          </div>
          {formula ? (
            <motion.div
              key={`${formula.us}-${formula.cm}`}
              initial={{ scale: 0.95, opacity: 0.8 }}
              animate={{ scale: [1, 1.05, 1], opacity: 1 }}
              transition={{ duration: 0.35 }}
              className="px-2 py-0.5 rounded-md bg-gold/15 text-gold border border-gold/40 font-bold text-[12px]"
            >
              {formula.us} μs × 0.0343 / 2 = {formula.cm} cm
            </motion.div>
          ) : (
            <span className="text-text-3 font-mono text-[11px]">—</span>
          )}
        </div>

        {/* Optional Tag or Note Chip */}
        {tag && (
          <div className="absolute top-14 right-16 px-2.5 py-1 rounded-pill bg-gold/20 border border-gold/40 text-gold text-xs font-ui font-semibold shadow-sm">
            {tag}
          </div>
        )}
        {noteChip && (
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 px-3 py-1 rounded-pill bg-[#26282B]/95 border border-[#6FB8D6]/60 text-[#6FB8D6] text-xs font-ui font-semibold shadow-lg">
            {noteChip}
          </div>
        )}
      </motion.div>
    </div>
  );
};
