import React from 'react';
import { Play, Pause, RotateCcw, Check, Sparkles } from 'lucide-react';
import { ClaimDefinition } from './types';

interface ClaimStepListProps {
  claim: ClaimDefinition;
  currentTime: number;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReplay: () => void;
  onReset: () => void;
  onSeek?: (time: number) => void;
}

export const ClaimStepList: React.FC<ClaimStepListProps> = ({
  claim,
  currentTime,
  isPlaying,
  onPlay,
  onPause,
  onReplay,
  onReset,
  onSeek,
}) => {
  const isFinished = currentTime >= claim.duration;
  const progressRatio = Math.min(currentTime / claim.duration, 1);

  // Determine active step index
  let activeStepIndex = claim.steps.findIndex(
    (s) => currentTime >= s.startTime && currentTime < s.endTime
  );
  if (activeStepIndex === -1) {
    if (currentTime >= claim.duration) {
      activeStepIndex = claim.steps.length - 1;
    } else {
      activeStepIndex = 0;
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * claim.duration);
  };

  return (
    <div className="flex flex-col h-full justify-between space-y-4">
      {/* Top Header Information */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            <span className="text-xs font-mono font-medium text-gold uppercase tracking-wider">
              {claim.pillar} Phase
            </span>
          </div>
          <span className="text-xs font-mono text-text-3 tabular-nums">
            {currentTime.toFixed(1)}s / {claim.duration.toFixed(1)}s
          </span>
        </div>

        <h4 className="text-base sm:text-lg font-display font-medium text-text-1 leading-snug">
          {claim.title}
        </h4>

        {/* Timeline Progress Bar (interactive scrub) */}
        <div
          onClick={handleProgressClick}
          className="relative w-full h-2 rounded-full bg-[#141210] border border-border-recessed overflow-hidden cursor-pointer group"
          title="Click to scrub time"
        >
          <div
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-gold/70 to-gold rounded-full transition-all duration-75"
            style={{ width: `${progressRatio * 100}%` }}
          />
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-2 flex-1 my-1">
        {claim.steps.map((step, idx) => {
          const isActive = activeStepIndex === idx;
          const isCompleted = isFinished || currentTime >= step.endTime;

          return (
            <div
              key={step.number}
              onClick={() => onSeek && onSeek(step.startTime)}
              className={`flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'glass-g3 glass-tint-gold border-l-4 border-l-gold border border-gold/40 text-text-1 font-semibold shadow-glass-g3'
                  : isCompleted
                  ? 'glass-g2 border border-border-2 text-text-2 shadow-sm'
                  : 'glass-g2/40 border border-border-2/40 text-text-3 hover:text-text-2'
              }`}
            >
              {/* Step indicator icon/number */}
              <div className="shrink-0 mt-0.5">
                {isCompleted ? (
                  <div className="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center text-gold">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-xs font-semibold ${
                      isActive
                        ? 'bg-gold text-[#0E0C0A]'
                        : 'bg-white/[0.06] text-text-3 border border-border-2'
                    }`}
                  >
                    {step.number}
                  </div>
                )}
              </div>

              {/* Step Description */}
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-[13.5px] leading-relaxed font-ui">
                  {step.text}
                </p>
              </div>

              {/* Active pulsing beacon */}
              {isActive && (
                <span className="shrink-0 flex h-2 w-2 relative mt-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-gold" />
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Controls: Play/Pause, Replay, Reset */}
      <div className="pt-2 border-t border-border-2/60 flex items-center gap-2 flex-wrap">
        {isPlaying ? (
          <button
            type="button"
            onClick={onPause}
            aria-label="Pause scenario"
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl glass-g3 glass-tint-gold text-gold border border-gold/50 shadow-glass-g3 text-xs sm:text-sm font-ui font-semibold hover:scale-[1.02] active:scale-[0.97] transition-all cursor-pointer min-h-[38px]"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>Pause</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onPlay}
            aria-label="Play scenario"
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl glass-primary font-ui font-semibold text-xs sm:text-sm shadow-glass-gold-glow hover:brightness-105 active:scale-[0.97] transition-all cursor-pointer min-h-[38px]"
          >
            <Play className="w-3.5 h-3.5 fill-[#0E0C0A]" />
            <span>{isFinished ? 'Play Again' : 'Play'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onReplay}
          aria-label="Replay scenario"
          title="Restart scenario"
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl glass-g3 text-text-2 hover:text-text-1 border border-border-3 shadow-glass-g3 text-xs sm:text-sm font-ui font-medium hover:scale-[1.02] active:scale-[0.97] transition-all cursor-pointer min-h-[38px]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Replay</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          aria-label="Reset lot"
          title="Reset lot to clean initial state"
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl glass-g3 text-text-3 hover:text-text-2 border border-border-3/70 shadow-glass-g3 text-xs sm:text-sm font-ui font-medium hover:scale-[1.02] active:scale-[0.97] transition-all cursor-pointer min-h-[38px]"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};

export default ClaimStepList;
