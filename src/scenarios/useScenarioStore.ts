// ============================================================================
// PARKWAY SCENE DIRECTOR & SCENARIO RUNNER STORE (src/scenarios/useScenarioStore.ts)
// Orchestrates claims, synchronization contract, ActionTree execution, and
// lot-visible Scene Director overlays.
// ============================================================================

import { create } from 'zustand';
import { ClaimDefinition, Scenario, StepType } from './types';
import { useSimStore } from '@/store';
import { t, setClaimPlaying, isReducedMotion } from './pacing';
import { cancelAllActiveFx, useFxStore, deferSweepVisual } from './fx';
import { useDirectorStore } from './director/store';
import { pin, callout, spotlight } from './director/primitives';
import {
  executeActionTree,
  assertStepExpectations,
  showClaimRecap,
  abortCurrentExecution,
} from './director/runner';

export type RunnerStatus = 'idle' | 'playing' | 'paused' | 'completed';

export interface ActiveCarAnimation {
  type: 'arrive' | 'leave' | 'route';
  slotIndex: number;
}

export interface ScenarioRunnerState {
  currentClaim: ClaimDefinition | null;
  currentScenario: Scenario | null;
  status: RunnerStatus;
  currentTimeMs: number;
  currentStepIndex: number;
  activeCaption: string | null;
  activeStepTitle: string | null;
  highlightSubsystem: string | null;
  currentVisualHint: string | null;
  currentStepType: StepType | null;
  activeCarAnimation: ActiveCarAnimation | null;
  preScenarioDistances: number[] | null;
  preScenarioMode: 'firmware' | 'perLane' | null;

  // Backwards compatibility overlay flags
  candidateGlowSlots: number[] | null;
  positionLabelsVisible: boolean;
  dimmedSlots: number[] | null;
  dashboardChipVisible: boolean;
  flashingSensors: number[] | null;
  gateCarState: 'none' | 'atGate' | 'followingRoute' | 'parked';
  barrierArmRaised: boolean;
  noAppBadgeVisible: boolean;

  // Actions
  loadClaim: (claim: ClaimDefinition, autoPlay?: boolean) => void;
  loadScenario: (scenario: Scenario | ClaimDefinition, autoPlay?: boolean) => void;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  restart: () => void;
  resetScenario: () => void;
  closeScenario: () => void;
  jumpToStep: (stepIndex: number) => void;
  seek: (timeMs: number) => void;
  stepNext: () => void;
  stepPrev: () => void;
  exitScenario: () => void;
}

const STEP_MIN_DWELL_MS = 3500;
const STEP_GAP_MS = 600;
const STEP_TIMEOUT_MS = 12000;

let currentRunId = 0;
let stepGapTimer: ReturnType<typeof setTimeout> | null = null;
let stepSafetyTimer: ReturnType<typeof setTimeout> | null = null;
let activeAbortController: AbortController | null = null;

function clearStoreTimers() {
  if (stepGapTimer !== null) {
    clearTimeout(stepGapTimer);
    stepGapTimer = null;
  }
  if (stepSafetyTimer !== null) {
    clearTimeout(stepSafetyTimer);
    stepSafetyTimer = null;
  }
  if (activeAbortController !== null) {
    activeAbortController.abort();
    activeAbortController = null;
  }
  abortCurrentExecution();
}

const initialOverlayState = {
  candidateGlowSlots: null,
  positionLabelsVisible: false,
  dimmedSlots: null,
  dashboardChipVisible: false,
  flashingSensors: null,
  gateCarState: 'none' as const,
  barrierArmRaised: false,
  noAppBadgeVisible: false,
};

export const useScenarioStore = create<ScenarioRunnerState>((set, get) => ({
  currentClaim: null,
  currentScenario: null,
  status: 'idle',
  currentTimeMs: 0,
  currentStepIndex: 0,
  activeCaption: null,
  activeStepTitle: null,
  highlightSubsystem: null,
  currentVisualHint: null,
  currentStepType: null,
  activeCarAnimation: null,
  preScenarioDistances: null,
  preScenarioMode: null,
  ...initialOverlayState,

  loadClaim: (claim: ClaimDefinition, autoPlay = true) => {
    // Validation check: claims must have at least 5 steps
    if (!claim || !claim.steps || claim.steps.length < 5) {
      console.warn(`[SceneDirector] Cannot load claim ${claim?.number}: Claim data invalid (< 5 steps)`);
      return;
    }

    clearStoreTimers();
    cancelAllActiveFx();
    useFxStore.getState().clearAllFx();
    useDirectorStore.getState().clearAllOverlays();
    deferSweepVisual(true);

    currentRunId++;
    const thisRunId = currentRunId;
    const simStore = useSimStore.getState();

    // Snapshot pre-scenario state if not recorded
    const preDistances = get().preScenarioDistances ?? simStore.state.slots.map((s) => s.distance);
    const preMode = get().preScenarioMode ?? simStore.state.config.mode;

    // Apply claim startState to simulation
    simStore.resetSim(claim.startState);

    // Build scenario representation for components that read currentScenario
    const scenarioAdapter: Scenario = {
      id: `claim-${claim.number}`,
      title: `Claim ${claim.number} - ${claim.title}`,
      subtitle: claim.simple,
      description: claim.imagine,
      category: 'claim',
      claimNumber: claim.number,
      initialDistances: [...claim.startState],
      startState: [...claim.startState],
      expectedTargets: [],
      totalDurationMs: claim.steps.length * 4000,
      steps: claim.steps.map((st, idx) => ({
        t: idx * 4000,
        slot: 0,
        distance: 28,
        caption: st.live,
        stepTitle: `Step ${idx + 1} of ${claim.steps.length}`,
        hint: st.hint,
        visualHint: st.hint,
        dwellMs: st.dwellMs,
        expectedState: st.expect,
      })),
      claim,
    };

    const firstStep = claim.steps[0];
    const initialStatus = autoPlay ? 'playing' : 'paused';

    set({
      currentClaim: claim,
      currentScenario: scenarioAdapter,
      status: initialStatus,
      currentTimeMs: 0,
      currentStepIndex: 0,
      activeCaption: firstStep.live,
      activeStepTitle: `Claim ${claim.number} - ${claim.title}`,
      currentVisualHint: firstStep.hint,
      currentStepType: null,
      activeCarAnimation: null,
      preScenarioDistances: preDistances,
      preScenarioMode: preMode,
      ...initialOverlayState,
    });

    if (autoPlay) {
      setClaimPlaying(true);
      runClaimStep(0, claim, thisRunId, set, get);
    } else {
      setClaimPlaying(false);
      // Setup overlays for paused initial step
      pin(firstStep.pin, 1, { stepId: firstStep.id });
      callout(firstStep.callout.text, firstStep.callout.anchor, firstStep.callout.side, {
        n: 1,
        stepId: firstStep.id,
      });
      spotlight(firstStep.spotlight, { stepId: firstStep.id });
    }
  },

  loadScenario: (scenarioOrClaim: Scenario | ClaimDefinition, autoPlay = true) => {
    // If it's a ClaimDefinition
    if ('pillar' in scenarioOrClaim && 'steps' in scenarioOrClaim) {
      get().loadClaim(scenarioOrClaim as ClaimDefinition, autoPlay);
      return;
    }

    const scenario = scenarioOrClaim as Scenario;
    if (scenario.claim) {
      get().loadClaim(scenario.claim, autoPlay);
      return;
    }

    // Fallback adapter for legacy presets
    clearStoreTimers();
    cancelAllActiveFx();
    useFxStore.getState().clearAllFx();
    useDirectorStore.getState().clearAllOverlays();
    deferSweepVisual(true);

    currentRunId++;
    const simStore = useSimStore.getState();

    const preDistances = get().preScenarioDistances ?? simStore.state.slots.map((s) => s.distance);
    const preMode = get().preScenarioMode ?? simStore.state.config.mode;

    simStore.resetSim(scenario.initialDistances);

    const firstStep = scenario.steps[0];
    set({
      currentClaim: null,
      currentScenario: scenario,
      status: autoPlay ? 'playing' : 'paused',
      currentTimeMs: 0,
      currentStepIndex: 0,
      activeCaption: firstStep?.caption || scenario.description,
      activeStepTitle: scenario.title,
      currentVisualHint: firstStep?.hint || null,
      currentStepType: null,
      activeCarAnimation: null,
      preScenarioDistances: preDistances,
      preScenarioMode: preMode,
      ...initialOverlayState,
    });
  },

  play: () => {
    const { status, currentClaim, currentStepIndex } = get();
    if (!currentClaim) return;

    if (status === 'completed') {
      get().restart();
      return;
    }

    if (status === 'playing') return;

    set({ status: 'playing' });
    setClaimPlaying(true);
    currentRunId++;
    const thisRunId = currentRunId;

    runClaimStep(currentStepIndex, currentClaim, thisRunId, set, get);
  },

  pause: () => {
    clearStoreTimers();
    set({ status: 'paused' });
    setClaimPlaying(false);
  },

  togglePlayPause: () => {
    const { status } = get();
    if (status === 'playing') {
      get().pause();
    } else {
      get().play();
    }
  },

  restart: () => {
    const { currentClaim } = get();
    if (!currentClaim) return;

    clearStoreTimers();
    cancelAllActiveFx();
    useFxStore.getState().clearAllFx();
    useDirectorStore.getState().clearAllOverlays();
    deferSweepVisual(true);

    currentRunId++;
    const thisRunId = currentRunId;

    const simStore = useSimStore.getState();
    simStore.resetSim(currentClaim.startState);

    const firstStep = currentClaim.steps[0];
    set({
      currentTimeMs: 0,
      currentStepIndex: 0,
      status: 'playing',
      activeCaption: firstStep.live,
      currentVisualHint: firstStep.hint,
      activeCarAnimation: null,
      ...initialOverlayState,
    });
    setClaimPlaying(true);

    runClaimStep(0, currentClaim, thisRunId, set, get);
  },

  resetScenario: () => {
    const { currentClaim } = get();
    if (!currentClaim) return;

    clearStoreTimers();
    cancelAllActiveFx();
    useFxStore.getState().clearAllFx();
    useDirectorStore.getState().clearAllOverlays();
    deferSweepVisual(true);

    currentRunId++;
    setClaimPlaying(false);

    const simStore = useSimStore.getState();
    simStore.resetSim(currentClaim.startState);

    const firstStep = currentClaim.steps[0];
    set({
      currentTimeMs: 0,
      currentStepIndex: 0,
      status: 'paused',
      activeCaption: firstStep.live,
      currentVisualHint: firstStep.hint,
      activeCarAnimation: null,
      ...initialOverlayState,
    });

    pin(firstStep.pin, 1, { stepId: firstStep.id });
    callout(firstStep.callout.text, firstStep.callout.anchor, firstStep.callout.side, {
      n: 1,
      stepId: firstStep.id,
    });
    spotlight(firstStep.spotlight, { stepId: firstStep.id });
  },

  closeScenario: () => {
    clearStoreTimers();
    cancelAllActiveFx();
    useFxStore.getState().clearAllFx();
    useDirectorStore.getState().clearAllOverlays();
    deferSweepVisual(false);

    currentRunId++;
    setClaimPlaying(false);

    const { preScenarioDistances, preScenarioMode } = get();
    const simStore = useSimStore.getState();

    if (preScenarioDistances) {
      simStore.setAllDistances(preScenarioDistances);
    }
    if (preScenarioMode && preScenarioMode !== simStore.state.config.mode) {
      simStore.updateConfig({ mode: preScenarioMode });
    }

    set({
      currentClaim: null,
      currentScenario: null,
      status: 'idle',
      currentTimeMs: 0,
      currentStepIndex: 0,
      activeCaption: null,
      activeStepTitle: null,
      highlightSubsystem: null,
      currentVisualHint: null,
      currentStepType: null,
      activeCarAnimation: null,
      preScenarioDistances: null,
      preScenarioMode: null,
      ...initialOverlayState,
    });
  },

  jumpToStep: (stepIndex: number) => {
    const { currentClaim, status } = get();
    if (!currentClaim || status !== 'paused') return;

    clearStoreTimers();
    useDirectorStore.getState().clearAllOverlays();
    currentRunId++;

    const clampedIndex = Math.max(0, Math.min(stepIndex, currentClaim.steps.length - 1));
    const simStore = useSimStore.getState();

    // Reset simulation to startState
    simStore.resetSim(currentClaim.startState);

    // Apply endState() for all steps before clampedIndex
    for (let i = 0; i < clampedIndex; i++) {
      currentClaim.steps[i].endState();
    }

    const targetStep = currentClaim.steps[clampedIndex];
    const stepNum = clampedIndex + 1;

    // Apply overlays for the target step
    set({
      currentTimeMs: clampedIndex * 4000,
      currentStepIndex: clampedIndex,
      activeCaption: targetStep.live,
      currentVisualHint: targetStep.hint,
      activeCarAnimation: null,
    });

    pin(targetStep.pin, stepNum, { stepId: targetStep.id });
    callout(targetStep.callout.text, targetStep.callout.anchor, targetStep.callout.side, {
      n: stepNum,
      stepId: targetStep.id,
    });
    spotlight(targetStep.spotlight, { stepId: targetStep.id });
  },

  seek: (timeMs: number) => {
    const { currentClaim } = get();
    if (!currentClaim) return;
    const stepIdx = Math.floor(timeMs / 4000);
    get().jumpToStep(stepIdx);
  },

  stepNext: () => {
    const { currentClaim, currentStepIndex } = get();
    if (!currentClaim) return;
    const nextIndex = Math.min(currentClaim.steps.length - 1, currentStepIndex + 1);
    get().jumpToStep(nextIndex);
  },

  stepPrev: () => {
    const { currentClaim, currentStepIndex } = get();
    if (!currentClaim) return;
    const prevIndex = Math.max(0, currentStepIndex - 1);
    get().jumpToStep(prevIndex);
  },

  exitScenario: () => {
    get().closeScenario();
  },
}));

/**
 * Executes a single step of a claim according to the Scene Director sync contract.
 */
async function runClaimStep(
  stepIdx: number,
  claim: ClaimDefinition,
  runId: number,
  set: (partial: Partial<ScenarioRunnerState> | ((state: ScenarioRunnerState) => Partial<ScenarioRunnerState>)) => void,
  get: () => ScenarioRunnerState
) {
  if (runId !== currentRunId || get().status !== 'playing') return;

  if (stepIdx >= claim.steps.length) {
    set({ status: 'completed' });
    setClaimPlaying(false);
    showClaimRecap(claim);
    return;
  }

  const step = claim.steps[stepIdx];
  const stepNumber = stepIdx + 1;
  const reduced = isReducedMotion();

  // Create AbortController for this step
  activeAbortController = new AbortController();
  const signal = activeAbortController.signal;

  // Step start in ONE animation frame:
  // Live caption, hint, number badge, pin, callout, spotlight begin together.
  set({
    currentStepIndex: stepIdx,
    activeCaption: step.live,
    currentVisualHint: step.hint,
    status: 'playing',
  });

  pin(step.pin, stepNumber, { stepId: step.id });
  callout(step.callout.text, step.callout.anchor, step.callout.side, {
    n: stepNumber,
    stepId: step.id,
  });
  spotlight(step.spotlight, { stepId: step.id });

  if (reduced) {
    step.endState();
    assertStepExpectations(step);
    useDirectorStore.getState().clearStepOverlays(step.id, step.persist);
    const nextIdx = stepIdx + 1;
    if (nextIdx >= claim.steps.length) {
      set({ status: 'completed' });
      setClaimPlaying(false);
      showClaimRecap(claim);
    } else {
      runClaimStep(nextIdx, claim, runId, set, get);
    }
    return;
  }

  const dwellMs = t(Math.max(step.dwellMs ?? STEP_MIN_DWELL_MS, STEP_MIN_DWELL_MS));

  // Run actions tree and dwell timer in parallel
  const actionsPromise = executeActionTree(step.actions, signal);
  const dwellPromise = new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, dwellMs);
    signal.addEventListener('abort', () => clearTimeout(timer));
  });

  // Safety fallback timeout: 12 seconds
  const safetyTimeoutMs = t(STEP_TIMEOUT_MS);
  const safetyPromise = new Promise<void>((resolve) => {
    stepSafetyTimer = setTimeout(() => {
      console.warn(`[SceneDirector] Step ${step.id} exceeded safety timeout (${safetyTimeoutMs}ms). Completing.`);
      resolve();
    }, safetyTimeoutMs);
    signal.addEventListener('abort', () => {
      if (stepSafetyTimer) clearTimeout(stepSafetyTimer);
    });
  });

  // Step completes when actions have resolved and dwellMs has elapsed, or timeout occurs
  await Promise.race([Promise.all([actionsPromise, dwellPromise]), safetyPromise]);

  if (stepSafetyTimer) {
    clearTimeout(stepSafetyTimer);
    stepSafetyTimer = null;
  }

  if (signal.aborted || runId !== currentRunId) return;

  // Assert engine state against step.expect
  assertStepExpectations(step);

  // If paused mid-step, hold
  if (get().status === 'paused') {
    return;
  }

  // Clear step-owned overlays
  useDirectorStore.getState().clearStepOverlays(step.id, step.persist);

  // Inter-step gap (600 ms)
  const gapMs = t(STEP_GAP_MS);
  await new Promise<void>((resolve) => {
    stepGapTimer = setTimeout(resolve, gapMs);
    signal.addEventListener('abort', () => {
      if (stepGapTimer) clearTimeout(stepGapTimer);
    });
  });

  if (signal.aborted || runId !== currentRunId || get().status !== 'playing') return;

  // Advance to next step
  const nextIdx = stepIdx + 1;
  runClaimStep(nextIdx, claim, runId, set, get);
}
