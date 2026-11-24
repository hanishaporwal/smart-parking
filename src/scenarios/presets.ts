// ============================================================================
// PARKWAY SCENARIOS / PRESETS (src/scenarios/presets.ts)
// Adapter layer bridging registered ClaimDefinitions to Scenarios.
// ============================================================================

import { Scenario, ClaimDefinition } from './types';
import { getRegisteredClaim } from './registry';

function buildScenarioFromClaim(claim: ClaimDefinition, isValid = true): Scenario {
  return {
    id: `claim-${claim.number}`,
    title: `Patent Claim ${claim.number}: ${claim.title}`,
    subtitle: claim.simple,
    description: claim.imagine,
    category: 'claim',
    claimNumber: claim.number,
    initialDistances: [...claim.startState],
    startState: [...claim.startState],
    expectedTargets: [],
    totalDurationMs: claim.steps.length * 4000,
    recommendedMode: 'firmware',
    isValid,
    claim,
    steps: claim.steps.map((s, idx) => ({
      t: idx * 4000,
      slot: 0,
      distance: 28,
      stepTitle: `Step ${idx + 1} of ${claim.steps.length}`,
      caption: s.live,
      visualHint: s.hint,
      hint: s.hint,
      dwellMs: s.dwellMs,
      expectedState: s.expect,
      executeStep: async () => {
        s.endState();
      },
    })),
  };
}

const reg2 = getRegisteredClaim(2)!;
const reg5 = getRegisteredClaim(5)!;
const reg12 = getRegisteredClaim(12)!;
const reg7 = getRegisteredClaim(7)!;

export const SCENARIO_CLAIM_2: Scenario = buildScenarioFromClaim(reg2.claim, reg2.isValid);
export const SCENARIO_CLAIM_5: Scenario = buildScenarioFromClaim(reg5.claim, reg5.isValid);
export const SCENARIO_CLAIM_12: Scenario = buildScenarioFromClaim(reg12.claim, reg12.isValid);
export const SCENARIO_CLAIM_7: Scenario = buildScenarioFromClaim(reg7.claim, reg7.isValid);

export const ALL_SCENARIOS: Scenario[] = [
  SCENARIO_CLAIM_2,
  SCENARIO_CLAIM_5,
  SCENARIO_CLAIM_12,
  SCENARIO_CLAIM_7,
];

export const CLAIM_SCENARIOS = ALL_SCENARIOS;
