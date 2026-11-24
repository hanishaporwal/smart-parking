// ============================================================================
// PARKWAY SCENARIOS & SCENE DIRECTOR TYPES
// ============================================================================

export type SlotId = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8';
export type ClaimNumber = 2 | 5 | 12 | 7;
export type PillarTag = 'Sense' | 'Decide' | 'Guide' | 'Adapt';

export type SubsystemHighlight =
  | 'sensors'
  | 'esp32'
  | 'indicators'
  | 'led_strip'
  | 'dashboard'
  | 'route';

export type StepType =
  | 'sensor'
  | 'chip'
  | 'led'
  | 'target'
  | 'route'
  | 'dashboard'
  | 'car';

export interface CalloutDef {
  text: string;
  anchor: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export type ActionTree =
  | { type: 'seq'; children: ActionTree[] }
  | { type: 'par'; children: ActionTree[] }
  | { type: 'at'; ms: number; action: ActionTree }
  | { type: 'custom'; execute: (signal?: AbortSignal) => Promise<void> }
  | (() => Promise<void> | void);

export interface ExpectedState {
  occupied: SlotId[];
  targets: SlotId[];
}

export interface SceneStep {
  id: string;
  live: string; // caption
  hint: string;
  pin: string; // Anchor name
  callout: CalloutDef;
  spotlight: string[] | 'none'; // Anchor names or "none"
  actions: ActionTree;
  dwellMs?: number;
  endState(): void; // applies this step's final state instantly
  expect: ExpectedState;
  persist?: string[]; // IDs or types of overlays that should persist past this step
}

export interface ClaimRecap {
  facts: (state: {
    occupiedCount: number;
    vacantCount: number;
    targets: string[];
    distances: number[];
  }) => string[];
}

export interface ClaimDefinition {
  number: ClaimNumber;
  title: string;
  pillar: PillarTag;
  simple: string;
  imagine: string;
  startState: number[];
  steps: SceneStep[];
  recap?: ClaimRecap;
}

export interface ClaimValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates claim data structure according to the Director specification:
 * - Needs at least 5 steps
 * - Every step needs live, hint, pin, callout (with text & anchor), at least one action, and endState
 */
export function validateClaim(claim: ClaimDefinition): ClaimValidationResult {
  const errors: string[] = [];

  if (!claim) {
    return { valid: false, errors: ['Claim definition is null or undefined'] };
  }

  if (!claim.steps || claim.steps.length < 5) {
    errors.push(`Claim ${claim.number} needs at least 5 steps (found ${claim.steps?.length ?? 0})`);
  }

  if (claim.steps && Array.isArray(claim.steps)) {
    claim.steps.forEach((step, idx) => {
      const stepPrefix = `Step ${idx + 1} (${step?.id || 'unnamed'})`;
      if (!step.live || typeof step.live !== 'string' || step.live.trim() === '') {
        errors.push(`${stepPrefix}: missing 'live' caption`);
      }
      if (!step.hint || typeof step.hint !== 'string' || step.hint.trim() === '') {
        errors.push(`${stepPrefix}: missing 'hint'`);
      }
      if (!step.pin || typeof step.pin !== 'string' || step.pin.trim() === '') {
        errors.push(`${stepPrefix}: missing 'pin' anchor`);
      }
      if (!step.callout || !step.callout.text || !step.callout.anchor) {
        errors.push(`${stepPrefix}: missing or incomplete 'callout' (needs text and anchor)`);
      }
      if (!step.actions) {
        errors.push(`${stepPrefix}: missing 'actions' tree`);
      }
      if (typeof step.endState !== 'function') {
        errors.push(`${stepPrefix}: missing 'endState' function`);
      }
      if (!step.expect || !Array.isArray(step.expect.occupied) || !Array.isArray(step.expect.targets)) {
        errors.push(`${stepPrefix}: missing or invalid 'expect' { occupied, targets }`);
      }
    });
  }

  if (errors.length > 0) {
    console.error(`[ClaimLoader] Claim ${claim.number} validation failed:`, errors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Helpers for ActionTree construction
export const seq = (...children: ActionTree[]): ActionTree => ({ type: 'seq', children });
export const par = (...children: ActionTree[]): ActionTree => ({ type: 'par', children });
export const at = (ms: number, action: ActionTree): ActionTree => ({ type: 'at', ms, action });
export const custom = (execute: (signal?: AbortSignal) => Promise<void>): ActionTree => ({
  type: 'custom',
  execute,
});

// Legacy backward-compatibility interfaces
export interface StepAction {
  type: string;
  slot?: number;
  slots?: number[];
  distance?: number;
  durationMs?: number;
  staggerMs?: number;
}

export type StepCompletionCondition = 'actionsDone' | 'sweepDone' | 'carDone' | 'dwell';

export interface ClaimStepDefinition {
  stepNum: number;
  caption: string;
  hint: string;
  actions: StepAction[];
  highlight?: string;
  completionCondition?: StepCompletionCondition;
  dwellMs?: number;
  expectedState?: ExpectedState;
  executeStep?: () => Promise<void>;
}

export interface ScenarioStep {
  t: number;
  slot: number;
  distance: number;
  caption: string;
  stepTitle?: string;
  highlight?: SubsystemHighlight | string;
  visualHint?: string;
  hint?: string;
  dwellMs?: number;
  expectedState?: ExpectedState;
  executeStep?: () => Promise<void>;
}

export type ScenarioCategory = 'preset' | 'claim';

export interface Scenario {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: ScenarioCategory;
  claimNumber?: ClaimNumber;
  initialDistances: number[];
  startState?: number[];
  expectedTargets?: string[];
  steps: ScenarioStep[];
  totalDurationMs: number;
  recommendedMode?: 'firmware' | 'perLane';
  claim?: ClaimDefinition;
  isValid?: boolean;
}

export interface PatentClaimMeta {
  claimNumber: ClaimNumber;
  pillar: PillarTag;
  title: string;
  category: string;
  claimText: string;
  summary: string;
  simpleDescription: string;
  imagine: string;
  startState: number[];
  expectedTargets: string[];
  initialDistances: number[];
  expectedTarget: string;
  steps: ClaimStepDefinition[];
  targetSubsystems: SubsystemHighlight[];
  scenarioId: string;
  isValid?: boolean;
}
