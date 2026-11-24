import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateClaim, ClaimDefinition, SceneStep } from '../types';
import { REGISTERED_CLAIMS } from '../registry';
import { computeCalloutPlacement, getSlotCardObstacles, rectanglesOverlap } from '../director/placement';
import { useDirectorStore } from '../director/store';
import { assertStepExpectations } from '../director/runner';
import { useScenarioStore } from '../useScenarioStore';
import { useSimStore } from '@/store';
import { pin, callout, spotlight, panel } from '../director/primitives';

describe('Scene Director & Registry Tests', () => {
  beforeEach(() => {
    useDirectorStore.getState().clearAllOverlays();
    useSimStore.getState().resetSim([28, 28, 28, 28, 28, 28, 28, 28]);
    useScenarioStore.getState().closeScenario();
  });

  // 1. Registry validation
  describe('Registry Validation', () => {
    it('rejects a claim with fewer than 5 steps', () => {
      const claimWith3Steps: ClaimDefinition = {
        number: 2,
        title: 'Test Claim',
        pillar: 'Sense',
        simple: 'Test line',
        imagine: 'Test situation',
        startState: [28, 28, 28, 28, 28, 28, 28, 28],
        steps: [
          {
            id: 'step-1',
            live: 'Step 1',
            hint: 'Hint 1',
            pin: 'slot(S1).sensor',
            callout: { text: 'Callout 1', anchor: 'slot(S1).card' },
            spotlight: ['slot(S1).card'],
            actions: () => {},
            endState: () => {},
            expect: { occupied: [], targets: ['S1'] },
          },
        ],
      };

      const result = validateClaim(claimWith3Steps);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('needs at least 5 steps'))).toBe(true);
    });

    it('rejects steps missing required fields (live, hint, pin, callout, actions, endState, expect)', () => {
      const invalidClaim = {
        number: 5,
        title: 'Incomplete Claim',
        pillar: 'Decide',
        simple: 'Simple',
        imagine: 'Imagine',
        startState: [8, 8, 28, 28, 8, 28, 28, 28],
        steps: [
          // Missing callout, actions, endState, expect
          {
            id: 'broken-step',
            live: 'Live text',
            hint: 'Hint text',
            pin: 'slot(S2).card',
          } as any,
          {} as any,
          {} as any,
          {} as any,
          {} as any,
        ],
      } as ClaimDefinition;

      const result = validateClaim(invalidClaim);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('validates claim 2, claim 5, claim 12 and claim 7 as valid', () => {
      const claims = REGISTERED_CLAIMS;
      expect(claims.length).toBe(4);
      const numbers = claims.map((r) => r.claim.number);
      expect(numbers).toEqual([2, 5, 12, 7]);

      // Claim 2 is implemented with 7 steps and is valid
      const claim2Reg = claims.find((c) => c.claim.number === 2)!;
      expect(claim2Reg.isValid).toBe(true);
      expect(claim2Reg.validation.valid).toBe(true);
      expect(claim2Reg.claim.steps.length).toBe(7);

      // Claim 5 is implemented with 6 steps and is valid
      const claim5Reg = claims.find((c) => c.claim.number === 5)!;
      expect(claim5Reg.isValid).toBe(true);
      expect(claim5Reg.validation.valid).toBe(true);
      expect(claim5Reg.claim.steps.length).toBe(6);

      // Claim 12 is implemented with 6 steps and is valid
      const claim12Reg = claims.find((c) => c.claim.number === 12)!;
      expect(claim12Reg.isValid).toBe(true);
      expect(claim12Reg.validation.valid).toBe(true);
      expect(claim12Reg.claim.steps.length).toBe(6);

      // Claim 7 is implemented with 6 steps and is valid
      const claim7Reg = claims.find((c) => c.claim.number === 7)!;
      expect(claim7Reg.isValid).toBe(true);
      expect(claim7Reg.validation.valid).toBe(true);
      expect(claim7Reg.claim.steps.length).toBe(6);
    });
  });

  // 2. Expect assertions
  describe('Expect Assertions', () => {
    it('sets mismatch warning when engine state does not match step expectations', () => {
      // Sim state: S1 occupied (8cm), others vacant (28cm)
      useSimStore.getState().setDistance(0, 8); // S1 occupied
      useSimStore.getState().setDistance(1, 28); // S2 vacant

      const stepWithWrongExpect: SceneStep = {
        id: 'test-expect-step',
        live: 'Checking expectations',
        hint: 'Engine state check',
        pin: 'slot(S1).sensor',
        callout: { text: 'Expect check', anchor: 'slot(S1).card' },
        spotlight: 'none',
        actions: () => {},
        endState: () => {},
        // Expect S2 occupied (which is false)
        expect: {
          occupied: ['S2'],
          targets: ['S3'],
        },
      };

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      assertStepExpectations(stepWithWrongExpect);
      errorSpy.mockRestore();

      const warning = useDirectorStore.getState().mismatchWarning;
      expect(warning).not.toBeNull();
      expect(warning?.message).toContain('expect mismatch');
    });

    it('clears mismatch warning when engine state matches step expectations', () => {
      // Sim state: S1 occupied, others vacant
      useSimStore.getState().resetSim([8, 28, 28, 28, 28, 28, 28, 28]);

      // Target in firmware mode with S1 occupied will be S2 & S5 (tie at pos 0 in Lane 1, or S2 in Lane 0)
      const currentTargets = useSimStore.getState().state.slots.filter(s => s.isTarget).map(s => `S${s.slotIndex + 1}` as any);

      const matchingStep: SceneStep = {
        id: 'matching-step',
        live: 'Matching step',
        hint: 'Matches perfectly',
        pin: 'slot(S1).sensor',
        callout: { text: 'Matches', anchor: 'slot(S1).card' },
        spotlight: 'none',
        actions: () => {},
        endState: () => {},
        expect: {
          occupied: ['S1'],
          targets: currentTargets,
        },
      };

      assertStepExpectations(matchingStep);
      expect(useDirectorStore.getState().mismatchWarning).toBeNull();
    });
  });

  // 3. Pause/Replay/Close leave no overlays
  describe('Overlay Lifecycle on Pause / Replay / Close', () => {
    it('leaves no overlays after closeScenario() and restart()', async () => {
      // Add active overlays
      await pin('slot(S1).sensor', 1, { stepId: 'step-1' });
      await callout('Testing callout', 'slot(S1).card', 'bottom', { stepId: 'step-1', n: 1 });
      await spotlight(['slot(S1).card'], { stepId: 'step-1' });
      await panel({ x: 100, y: 100, width: 200, height: 100 }, 'Info', { stepId: 'step-1' });

      const store = useDirectorStore.getState();
      expect(store.pins.length).toBe(1);
      expect(store.callouts.length).toBe(1);
      expect(store.spotlight).not.toBeNull();
      expect(store.panels.length).toBe(1);

      // Trigger closeScenario
      useScenarioStore.getState().closeScenario();

      const clearedStore = useDirectorStore.getState();
      expect(clearedStore.pins.length).toBe(0);
      expect(clearedStore.callouts.length).toBe(0);
      expect(clearedStore.spotlight).toBeNull();
      expect(clearedStore.panels.length).toBe(0);
      expect(clearedStore.chips.length).toBe(0);
    });
  });

  // 4. Jump applies endState
  describe('Jump Mechanic', () => {
    it('applies endState() of all previous steps when jumping', () => {
      const step0EndState = vi.fn(() => {
        useSimStore.getState().setDistance(0, 8); // S1 occupied
      });
      const step1EndState = vi.fn(() => {
        useSimStore.getState().setDistance(1, 8); // S2 occupied
      });
      const step2EndState = vi.fn(() => {
        useSimStore.getState().setDistance(2, 8); // S3 occupied
      });

      const multiStepClaim: ClaimDefinition = {
        number: 5,
        title: 'Decide Target',
        pillar: 'Decide',
        simple: 'Test',
        imagine: 'Test',
        startState: [28, 28, 28, 28, 28, 28, 28, 28],
        steps: [
          {
            id: 's0',
            live: 'Step 0',
            hint: 'Hint 0',
            pin: 'slot(S1).sensor',
            callout: { text: 'Callout 0', anchor: 'slot(S1).card' },
            spotlight: 'none',
            actions: () => {},
            endState: step0EndState,
            expect: { occupied: ['S1'], targets: [] },
          },
          {
            id: 's1',
            live: 'Step 1',
            hint: 'Hint 1',
            pin: 'slot(S2).sensor',
            callout: { text: 'Callout 1', anchor: 'slot(S2).card' },
            spotlight: 'none',
            actions: () => {},
            endState: step1EndState,
            expect: { occupied: ['S1', 'S2'], targets: [] },
          },
          {
            id: 's2',
            live: 'Step 2',
            hint: 'Hint 2',
            pin: 'slot(S3).sensor',
            callout: { text: 'Callout 2', anchor: 'slot(S3).card' },
            spotlight: 'none',
            actions: () => {},
            endState: step2EndState,
            expect: { occupied: ['S1', 'S2', 'S3'], targets: [] },
          },
          {
            id: 's3',
            live: 'Step 3',
            hint: 'Hint 3',
            pin: 'slot(S4).sensor',
            callout: { text: 'Callout 3', anchor: 'slot(S4).card' },
            spotlight: 'none',
            actions: () => {},
            endState: () => {},
            expect: { occupied: ['S1', 'S2', 'S3'], targets: [] },
          },
          {
            id: 's4',
            live: 'Step 4',
            hint: 'Hint 4',
            pin: 'slot(S5).sensor',
            callout: { text: 'Callout 4', anchor: 'slot(S5).card' },
            spotlight: 'none',
            actions: () => {},
            endState: () => {},
            expect: { occupied: ['S1', 'S2', 'S3'], targets: [] },
          },
        ],
      };

      // Load claim paused
      useScenarioStore.getState().loadClaim(multiStepClaim, false);
      expect(useScenarioStore.getState().status).toBe('paused');

      // Jump to step 3 (index 3)
      useScenarioStore.getState().jumpToStep(3);

      // Verify that step0, step1, step2 endState were all called
      expect(step0EndState).toHaveBeenCalled();
      expect(step1EndState).toHaveBeenCalled();
      expect(step2EndState).toHaveBeenCalled();

      // Verify simulation distances reflect the applied end states
      const slots = useSimStore.getState().state.slots;
      expect(slots[0].occupied).toBe(true);
      expect(slots[1].occupied).toBe(true);
      expect(slots[2].occupied).toBe(true);
      expect(useScenarioStore.getState().currentStepIndex).toBe(3);
    });
  });

  // 5. Callout placement never overlaps slot rectangles for all 8 slots
  describe('Callout Collision Avoidance', () => {
    it('never overlaps any of the 8 slot card rectangles for any slot S1-S8', () => {
      const obstacles = getSlotCardObstacles();
      expect(obstacles.length).toBe(8);

      const sides = ['top', 'bottom', 'left', 'right'] as const;

      for (let i = 1; i <= 8; i++) {
        const slotName = `S${i}`;
        const targets = [
          `slot(${slotName}).card`,
          `slot(${slotName}).sensor`,
          `slot(${slotName}).bay`,
          `slot(${slotName}).pill`,
        ];

        for (const target of targets) {
          for (const preferredSide of sides) {
            const placement = computeCalloutPlacement(
              target,
              preferredSide,
              'Follow lights to free slot'
            );

            const calloutRect = {
              x: placement.x,
              y: placement.y,
              width: placement.width,
              height: placement.height,
            };

            // Assert that this placement does not overlap ANY slot card
            obstacles.forEach((slotCard, slotIdx) => {
              const overlaps = rectanglesOverlap(calloutRect, slotCard);
              expect(
                overlaps,
                `Callout for ${target} (${preferredSide}) collided with S${slotIdx + 1} at (${slotCard.x}, ${slotCard.y})`
              ).toBe(false);
            });
          }
        }
      }
    });
  });
});
