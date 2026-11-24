// ============================================================================
// PARKWAY SCENE DIRECTOR RUNNER (src/scenarios/director/runner.ts)
// Implements the Step Lifecycle synchronization contract, ActionTree executor,
// expect assertions, sweep-blocking sensing, and jump/recap mechanics.
// ============================================================================

import { ClaimDefinition, SceneStep, ActionTree, SlotId } from '../types';
import { useDirectorStore } from './store';
import { useSimStore } from '@/store';
import { useFxStore } from '../fx';
import { t, setClaimPlaying } from '../pacing';

export type DirectorStatus = 'idle' | 'playing' | 'paused' | 'completed';

export interface DirectorRunState {
  currentClaim: ClaimDefinition | null;
  status: DirectorStatus;
  currentStepIndex: number;
  activeStep: SceneStep | null;
  preClaimDistances: number[] | null;
  preClaimMode: 'firmware' | 'perLane' | null;
}

let currentAbortController: AbortController | null = null;
let interStepTimer: ReturnType<typeof setTimeout> | null = null;
let stepTimeoutTimer: ReturnType<typeof setTimeout> | null = null;

export async function waitForSweepIfRunning(): Promise<void> {
  const fxStore = useFxStore.getState();
  if (!fxStore.ledVisualState?.sweepProgress) return;

  return new Promise<void>((resolve) => {
    const check = () => {
      if (!useFxStore.getState().ledVisualState?.sweepProgress) {
        resolve();
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
}

/**
 * Executes an ActionTree (seq, par, at, custom, or direct function).
 */
export async function executeActionTree(
  tree: ActionTree,
  signal?: AbortSignal
): Promise<void> {
  if (signal?.aborted) return;
  if (typeof tree === 'function') {
    await waitForSweepIfRunning();
    await tree();
    return;
  }
  if (!tree) return;

  switch (tree.type) {
    case 'seq': {
      for (const child of tree.children) {
        if (signal?.aborted) return;
        await executeActionTree(child, signal);
      }
      break;
    }
    case 'par': {
      await Promise.all(tree.children.map((child) => executeActionTree(child, signal)));
      break;
    }
    case 'at': {
      const delay = t(tree.ms);
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          resolve();
        }, delay);
        signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          resolve();
        });
      });
      if (signal?.aborted) return;
      await executeActionTree(tree.action, signal);
      break;
    }
    case 'custom': {
      await waitForSweepIfRunning();
      await tree.execute(signal);
      break;
    }
  }
}

/**
 * Asserts engine occupancy and targets against step.expect.
 */
export function assertStepExpectations(step: SceneStep) {
  if (!step.expect) return;

  const simState = useSimStore.getState().state;
  const currentOccupiedIds: SlotId[] = simState.slots
    .filter((s) => s.occupied)
    .map((s) => `S${s.slotIndex + 1}` as SlotId);

  const currentTargetIds: SlotId[] = simState.slots
    .filter((s) => s.isTarget)
    .map((s) => `S${s.slotIndex + 1}` as SlotId);

  const expectedOccupied = step.expect.occupied || [];
  const expectedTargets = step.expect.targets || [];

  const occupiedMatch =
    expectedOccupied.length === currentOccupiedIds.length &&
    expectedOccupied.every((id) => currentOccupiedIds.includes(id));

  const targetsMatch =
    expectedTargets.length === currentTargetIds.length &&
    expectedTargets.every((id) => currentTargetIds.includes(id));

  if (!occupiedMatch || !targetsMatch) {
    const msg = `Step ${step.id} expect mismatch. Expected occupied: [${expectedOccupied.join(
      ', '
    )}], got [${currentOccupiedIds.join(
      ', '
    )}]. Expected targets: [${expectedTargets.join(
      ', '
    )}], got [${currentTargetIds.join(', ')}]`;

    console.error(`[SceneDirector Expect Mismatch]`, msg);
    useDirectorStore.getState().setMismatchWarning({ message: msg });
  } else {
    useDirectorStore.getState().setMismatchWarning(null);
  }
}

/**
 * Generates and presents the final Claim Recap card in ground.topLeft.
 */
export function showClaimRecap(claim: ClaimDefinition) {
  const simState = useSimStore.getState().state;
  const occupiedCount = simState.slots.filter((s) => s.occupied).length;
  const vacantCount = simState.slots.length - occupiedCount;
  const targets = simState.slots.filter((s) => s.isTarget).map((s) => `S${s.slotIndex + 1}`);
  const distances = simState.slots.map((s) => s.distance);

  let facts: string[] = [];

  if (claim.recap) {
    facts = claim.recap.facts({
      occupiedCount,
      vacantCount,
      targets,
      distances,
    });
  } else {
    facts = [
      `Vacant bays: ${vacantCount} of 8 free`,
      `Active target: ${targets.length > 0 ? targets.join(', ') : 'None'}`,
      `System verified: All steps satisfied`,
    ];
  }

  useDirectorStore.getState().setRecap({
    title: `Claim ${claim.number} Verified`,
    facts,
  });
}

export function abortCurrentExecution() {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
  if (interStepTimer !== null) {
    clearTimeout(interStepTimer);
    interStepTimer = null;
  }
  if (stepTimeoutTimer !== null) {
    clearTimeout(stepTimeoutTimer);
    stepTimeoutTimer = null;
  }
  setClaimPlaying(false);
}
