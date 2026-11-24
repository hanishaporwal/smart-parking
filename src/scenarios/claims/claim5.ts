// ============================================================================
// PARKWAY PATENT CLAIM 5 (src/scenarios/claims/claim5.ts)
// Claim 5: "Pick the nearest slot" (Pillar: Decide)
// "The system ranks free slots by position and picks the closest one."
// Full 6-step choreography with the ranking board, column-by-column position map,
// translucent scanner, aisle scoreboard comparison (S3 vs S6), car leaving S2,
// and tie resolution.
// ============================================================================

import { ClaimDefinition, seq, at, custom } from '../types';
import {
  targetRing,
  pillFlip,
  readout,
  sonar,
  dim,
  halo,
  car,
} from '../director/primitives';
import {
  positionMap,
  positionTag,
  clearPositionTags,
  scanner,
  scoreboard,
  clearScoreboard,
  tieBadge,
  aisleCountChip,
  clearAisleCountChip,
  fadeOutDecisionBoard,
  useDecisionBoardStore,
} from '../fx/decisionBoard';
import { useSimStore } from '@/store';
import { useFxStore } from '../fx/store';
import { t } from '../pacing';

export const claim5: ClaimDefinition = {
  number: 5,
  title: 'Pick the nearest slot',
  pillar: 'Decide',
  simple: 'The system ranks free slots by position and picks the closest one.',
  imagine: 'Five bays are free. Which one is nearest?',
  startState: [8, 8, 28, 28, 8, 28, 28, 28], // S1, S2, S5 occupied; S3, S4, S6, S7, S8 vacant. Engine target S6.
  recap: {
    facts: () => [
      'Rule: lowest position wins',
      'Ties blink together',
      'Targets: S2 and S6',
    ],
  },
  steps: [
    // --------------------------------------------------------------------------
    // STEP 1: Five bays are free (Candidate Halos & Count-up chip)
    // --------------------------------------------------------------------------
    {
      id: 'claim5-step1',
      live: 'Five bays are free.',
      hint: 'Free bays are the candidates.',
      callout: {
        text: '5 free bays to choose from',
        anchor: 'aisle.centerLine',
        side: 'top',
      },
      pin: 'aisle.centerLine',
      spotlight: [
        'slot(S3).card',
        'slot(S4).card',
        'slot(S6).card',
        'slot(S7).card',
        'slot(S8).card',
      ],
      persist: ['candidateHalos'],
      dwellMs: 1800,
      actions: seq(
        custom(async () => {
          // Defer LED visual sweeps throughout Claim 5
          useFxStore.getState().setDeferSweepVisual(true);
          // Halos on free slots S3, S4, S6, S7, S8 (indices 2, 3, 5, 6, 7)
          await halo([2, 3, 5, 6, 7], { stagger: 150, persist: true });
        }),
        at(
          300,
          custom(async () => {
            // Chip "Occupied 3 - Free 5" with count-up in the aisle
            await aisleCountChip(3, 5, 800);
          })
        )
      ),
      endState: () => {
        useSimStore.getState().resetSim([8, 8, 28, 28, 8, 28, 28, 28]);
        useFxStore.getState().setDeferSweepVisual(true);
        useFxStore.getState().setCandidateHalos([2, 3, 5, 6, 7], true);
        useDecisionBoardStore.getState().setAisleCountChip({ occ: 3, free: 5 });
      },
      expect: {
        occupied: ['S1', 'S2', 'S5'],
        targets: ['S6'],
      },
    },

    // --------------------------------------------------------------------------
    // STEP 2: Every bay has a position (Column bands Pos 0..3 & Position tags)
    // --------------------------------------------------------------------------
    {
      id: 'claim5-step2',
      live: 'Every bay has a position.',
      hint: 'Position = slot number mod 4. Position 0 is closest to the gate.',
      callout: {
        text: 'Closer to the gate = lower position',
        anchor: 'gate.booth',
        side: 'bottom',
      },
      pin: 'gate.booth',
      spotlight: 'none',
      persist: ['candidateHalos', 'positionRuler', 'positionTags'],
      dwellMs: 2500,
      actions: seq(
        custom(async () => {
          clearAisleCountChip();
          // Reveals Pos 0 to Pos 3 column by column, 450 ms each, with measuring arrow
          await positionMap({
            dwellPerColumn: 450,
            onColumnRevealed: (col) => {
              positionTag(col);
              positionTag(col + 4);
            },
          });
        })
      ),
      endState: () => {
        clearAisleCountChip();
        useFxStore.getState().setDeferSweepVisual(true);
        useFxStore.getState().setCandidateHalos([2, 3, 5, 6, 7], true);
        useFxStore.getState().setPositionRuler({
          visible: true,
          visibleColumns: [0, 1, 2, 3],
          activeHighlightColumn: null,
          persisted: true,
        });
        useFxStore.getState().setMeasureArrow({
          visible: true,
          targetX: 989,
          currentColumn: 3,
        });
        for (let i = 0; i < 8; i++) {
          useDecisionBoardStore.getState().setPositionTag(i, `pos ${i % 4}`);
        }
        useDecisionBoardStore.getState().setFormulaChip('position = slot index mod 4');
      },
      expect: {
        occupied: ['S1', 'S2', 'S5'],
        targets: ['S6'],
      },
    },

    // --------------------------------------------------------------------------
    // STEP 3: The scanner looks for the lowest position (Scanner col 0 -> col 1)
    // --------------------------------------------------------------------------
    {
      id: 'claim5-step3',
      live: 'The scanner looks for the lowest position.',
      hint: 'It checks position 0 first, then position 1.',
      callout: {
        text: 'Pos 0: both taken. Pos 1: S6 is free',
        anchor: 'column(1)',
        side: 'bottom',
      },
      pin: 'column(1)',
      spotlight: ['column(0)', 'column(1)'],
      persist: ['candidateHalos', 'positionRuler', 'positionTags'],
      dwellMs: 2600,
      actions: seq(
        custom(async () => {
          // Scanner runs across column 0 (both taken) and column 1 (S6 free) then stops
          await scanner({
            columns: [0, 1],
            stopAtFirstFree: true,
            colIntervalMs: 800,
            holdMs: 800,
          });
          // Columns 2 and 3 dim to 40% (S3, S4, S7, S8)
          await dim([2, 3, 6, 7], 0.40);
        })
      ),
      endState: () => {
        useFxStore.getState().setDeferSweepVisual(true);
        useFxStore.getState().setCandidateHalos([2, 3, 5, 6, 7], true);
        useFxStore.getState().setPositionRuler({
          visible: true,
          visibleColumns: [0, 1, 2, 3],
          activeHighlightColumn: null,
          persisted: true,
        });
        useFxStore.getState().setScanState({
          active: true,
          currentColumn: 1,
          results: { 0: 'cross', 4: 'cross', 1: 'cross', 5: 'check' },
        });
        dim([2, 3, 6, 7], 0.40);
      },
      expect: {
        occupied: ['S1', 'S2', 'S5'],
        targets: ['S6'],
      },
    },

    // --------------------------------------------------------------------------
    // STEP 4: Both lanes are compared together (Scoreboard S3 vs S6)
    // --------------------------------------------------------------------------
    {
      id: 'claim5-step4',
      live: 'Both lanes are compared together.',
      hint: 'S6 is in the other lane, but it is still closer than S3.',
      callout: {
        text: 'S6 (pos 1) beats S3 (pos 2)',
        anchor: 'aisle.centerLine',
        side: 'top',
      },
      pin: 'slot(S6).card',
      spotlight: ['slot(S3).card', 'slot(S6).card'],
      persist: ['candidateHalos', 'positionRuler', 'positionTags'],
      dwellMs: 2600,
      actions: seq(
        custom(async () => {
          // Scoreboard initialized with S3 (pos 2) and S6 (pos 1)
          const sb = scoreboard(2, 5);

          // At 700 ms: comparator animates (<)
          await new Promise((r) => setTimeout(r, t(700)));
          await sb.animateComparator();

          // At 1200 ms: crown lands on S6 and S3 gets a "farther" tag
          await new Promise((r) => setTimeout(r, t(500)));
          await sb.crownWinner(5);
          sb.setFartherTag(2);

          // At 1500 ms: targetRing on S6 and pill flips to TARGET
          await new Promise((r) => setTimeout(r, t(300)));
          await targetRing(5);
          await pillFlip(5, 'TARGET');
        })
      ),
      endState: () => {
        useFxStore.getState().setDeferSweepVisual(true);
        useDecisionBoardStore.getState().setScoreboard({
          slotA: 2,
          posA: 2,
          slotB: 5,
          posB: 1,
          showComparator: true,
          winnerSlot: 5,
          fartherSlot: 2,
        });
        targetRing(5);
        pillFlip(5, 'TARGET');
      },
      expect: {
        occupied: ['S1', 'S2', 'S5'],
        targets: ['S6'],
      },
    },

    // --------------------------------------------------------------------------
    // STEP 5: A car leaves S2 (Occupancy changes -> S2 free, scanner re-evaluates)
    // --------------------------------------------------------------------------
    {
      id: 'claim5-step5',
      live: 'A car leaves S2.',
      hint: 'The map changes, so the decision runs again.',
      callout: {
        text: 'S2 is free again: position 1',
        anchor: 'slot(S2).card',
        side: 'bottom',
      },
      pin: 'slot(S2).card',
      spotlight: ['slot(S2).card'],
      dwellMs: 3200,
      actions: seq(
        custom(async () => {
          // Clear scoreboard & tags from previous step
          clearScoreboard();
          clearPositionTags();
          // Clear column dimming
          useFxStore.getState().clearAllDim();
          // Re-add candidate halo to S2
          useFxStore.getState().addCandidateHalo(1);
        }),
        // At 200 ms: car leaves S2
        at(
          200,
          custom(async () => {
            await car.leave(1, {
              onCrossThreshold: async () => {
                useSimStore.getState().setDistance(1, 28);
                readout(1, 28, 'green');
                pillFlip(1, 'VACANT');
                await sonar(1, { tone: 'green' });
                useFxStore.getState().triggerStatPulse();
              },
            });

            // At +800 ms after car moves: scanner runs again over col 0 & col 1
            await new Promise((r) => setTimeout(r, t(300)));
            await scanner({
              columns: [0, 1],
              stopAtFirstFree: true,
              colIntervalMs: 700,
              holdMs: 800,
            });
          })
        )
      ),
      endState: () => {
        clearScoreboard();
        clearPositionTags();
        useFxStore.getState().clearAllDim();
        useSimStore.getState().setDistance(1, 28);
        readout(1, 28, 'green');
        pillFlip(1, 'VACANT');
        useFxStore.getState().setScanState({
          active: true,
          currentColumn: 1,
          results: { 0: 'cross', 4: 'cross', 1: 'check', 5: 'check' },
        });
      },
      expect: {
        occupied: ['S1', 'S5'],
        targets: ['S2', 'S6'],
      },
    },

    // --------------------------------------------------------------------------
    // STEP 6: Equal positions: both are targets (Tie at pos 1, both blink)
    // --------------------------------------------------------------------------
    {
      id: 'claim5-step6',
      live: 'Equal positions: both are targets.',
      hint: 'A tie lights both slots, and both blink.',
      callout: {
        text: 'Tie at position 1: S2 and S6 blink',
        anchor: 'aisle.centerLine',
        side: 'top',
      },
      pin: 'aisle.centerLine',
      spotlight: ['slot(S2).card', 'slot(S6).card'],
      dwellMs: 2800,
      actions: seq(
        // At 0: tie badge displayed
        custom(async () => {
          await tieBadge([1, 5]);
        }),
        // At 400 ms: targetRing on both S2 and S6, pills flip to TARGET
        at(
          400,
          custom(async () => {
            await targetRing([1, 5]);
            await pillFlip(1, 'TARGET');
            await pillFlip(5, 'TARGET');
          })
        ),
        // At 1400 ms: positionMap, tags, halos fade out. No route, no sweep.
        at(
          1400,
          custom(async () => {
            fadeOutDecisionBoard();
          })
        )
      ),
      endState: () => {
        useSimStore.getState().resetSim([8, 28, 28, 28, 8, 28, 28, 28]);
        targetRing([1, 5]);
        pillFlip(1, 'TARGET');
        pillFlip(5, 'TARGET');
        fadeOutDecisionBoard();
      },
      expect: {
        occupied: ['S1', 'S5'],
        targets: ['S2', 'S6'],
      },
    },
  ],
};

export default claim5;
