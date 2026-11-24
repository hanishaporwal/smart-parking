// ============================================================================
// PARKWAY PATENT CLAIM 7 (src/scenarios/claims/claim7.ts)
// Claim 7: "Change the plan" (Pillar: Adapt)
// "If the chosen slot is taken, the system picks a new one."
// Full 6-step choreography: Plan A S2 guidance, sensor loop tape (100 ms cycle),
// blind sweep block (375 ms), intruder car taking S2, 100 ms detection,
// Plan A strike-through & route retract, Plan B S3 recalculation, and redirection.
// ============================================================================

import { ClaimDefinition, seq, at, custom } from '../types';
import {
  targetRing,
  pillFlip,
  readout,
  zoneWipe,
  route,
  sweep,
} from '../director/primitives';
import { barrier } from '../fx/barrier';
import { driverCar } from '../fx/driverCar';
import { intruderCar } from '../fx/intruderCar';
import { routeRetract } from '../fx/routeRetract';
import { recalcChip, removeRecalcChip } from '../fx/recalcChip';
import {
  loopTape,
  blindBlock,
  clearBlindBlock,
  takenMark,
  seenMark,
  planChip,
  cancelPlanChip,
  clearLoopTape,
} from '../fx/loopTape';
import { useSimStore } from '@/store';
import { useFxStore } from '../fx/store';
import { COLOR_RED } from '@/engine';
import { t } from '../pacing';

export const claim7: ClaimDefinition = {
  number: 7,
  title: 'Change the plan',
  pillar: 'Adapt',
  simple: 'If the chosen slot is taken, the system picks a new one.',
  imagine: 'A driver is heading to S2, but another car parks there first.',
  startState: [8, 28, 8, 28, 8, 8, 28, 28], // S1, S3, S5, S6 occupied; S2, S4, S7, S8 vacant. Engine target S2.
  recap: {
    facts: () => [
      'Plan A S2 taken',
      'Seen within 100 ms',
      'Plan B S7 lit',
    ],
  },
  steps: [
    // --------------------------------------------------------------------------
    // STEP 1: Plan A: guide the driver to S2 (Sweep lights path, sensors blind 375 ms)
    // --------------------------------------------------------------------------
    {
      id: 'claim7-step1',
      live: 'Plan A: guide the driver to S2.',
      hint: 'The sweep lights the path. The sensors are blind while it runs.',
      callout: {
        text: 'Plan A: lights lead to S2',
        anchor: 'slot(S2).card',
        side: 'top',
      },
      pin: 'slot(S2).card',
      spotlight: ['slot(S2).card', 'aisle.upperLane', 'strip(1)'],
      persist: ['barrierState', 'driverCar', 'loopTape'],
      dwellMs: 2500,
      actions: seq(
        // Barrier lifts and driver car enters to stop line
        custom(async () => {
          await barrier.lift();
          await driverCar.enter({ stopX: 195 });
        }),
        // At 800 ms: targetRing on S2, pill flips to TARGET, Plan A chip appears
        at(
          800,
          custom(async () => {
            await targetRing(1);
            await pillFlip(1, 'TARGET');
            await planChip('Plan A', 1);
          })
        ),
        // At 1400 ms: route and sweep run together (S1 zone stays red), loopTape shows blind block (375 ms)
        at(
          1400,
          custom(async () => {
            useFxStore.getState().setDeferSweepVisual(false);
            route(0, 1);
            sweep(1, 49, { skipOccupied: true });
            await loopTape();
            await blindBlock(375);
          })
        )
      ),
      endState: () => {
        useSimStore.getState().resetSim([8, 28, 28, 28, 8, 8, 8, 28]);
        useFxStore.getState().setDeferSweepVisual(false);
        useFxStore.getState().setBarrierState({ armRaised: true, lightColor: 'green' });
        driverCar.enter({ stopX: 195 });
        targetRing(1);
        pillFlip(1, 'TARGET');
        planChip('Plan A', 1);
        route(0, 1);
        loopTape();
      },
      expect: {
        occupied: ['S1', 'S5', 'S6', 'S7'],
        targets: ['S2'],
      },
    },

    // --------------------------------------------------------------------------
    // STEP 2: The driver heads to S2 (Car follows lights, loop resumes 100 ms)
    // --------------------------------------------------------------------------
    {
      id: 'claim7-step2',
      live: 'The driver heads to S2.',
      hint: 'The sensors listen again every 100 ms.',
      callout: {
        text: 'Loop back to 100 ms',
        anchor: 'loopTape',
        side: 'top',
      },
      pin: 'loopTape',
      spotlight: ['loopTape', 'the car'],
      persist: ['barrierState', 'driverCar', 'loopTape'],
      dwellMs: 3200,
      actions: seq(
        custom(async () => {
          clearBlindBlock();
          // Driver car follows the lights to ~60% of the route (x ~ 450)
          await driverCar.followTo(450, 295, 3000);
        })
      ),
      endState: () => {
        useFxStore.getState().setDriverCarState({
          visible: true,
          x: 450,
          y: 295,
          rotation: 180,
          headlights: true,
          brakeLights: false,
        });
        clearBlindBlock();
        loopTape();
      },
      expect: {
        occupied: ['S1', 'S5', 'S6', 'S7'],
        targets: ['S2'],
      },
    },

    // --------------------------------------------------------------------------
    // STEP 3: Another car parks in S2 first (Intruder car takes bay S2)
    // --------------------------------------------------------------------------
    {
      id: 'claim7-step3',
      live: 'Another car parks in S2 first.',
      hint: 'The slot is taken before the driver arrives.',
      callout: {
        text: 'S2 taken before the driver arrives',
        anchor: 'slot(S2).card',
        side: 'top',
      },
      pin: 'slot(S2).card',
      spotlight: ['slot(S2).card', 'intruder car', 'the car'],
      persist: ['barrierState', 'driverCar', 'loopTape'],
      dwellMs: 3400,
      actions: seq(
        custom(async () => {
          // Intruder car enters from right, drives left and reverses into S2
          await intruderCar({
            slot: 1,
            driveDurationMs: 1400,
            reverseDurationMs: 1200,
            onCrossThreshold: (slot) => {
              // Driver car hits brakes
              driverCar.brake(400);
              useSimStore.getState().setDistance(slot, 8);
              readout(slot, 8, 'red');
              pillFlip(slot, 'OCCUPIED');
              takenMark();
            },
          });
        })
      ),
      endState: () => {
        useSimStore.getState().setDistance(1, 8);
        readout(1, 8, 'red');
        pillFlip(1, 'OCCUPIED');
        driverCar.brake(100);
        takenMark();
      },
      expect: {
        occupied: ['S1', 'S2', 'S5', 'S6', 'S7'],
        targets: ['S3'],
      },
    },

    // --------------------------------------------------------------------------
    // STEP 4: The next loop sees it (Seen in < 100 ms, wipe, retract route)
    // --------------------------------------------------------------------------
    {
      id: 'claim7-step4',
      live: 'The next loop sees it.',
      hint: 'Detected within one 100 ms loop.',
      callout: {
        text: 'Seen in under 100 ms',
        anchor: 'loopTape',
        side: 'top',
      },
      pin: 'slot(S2).sensor',
      spotlight: ['slot(S2).sensor', 'loopTape', 'strip(1)'],
      persist: ['barrierState', 'driverCar', 'loopTape'],
      dwellMs: 2500,
      actions: seq(
        custom(async () => {
          // Seen mark appears on timeline
          seenMark('Seen within 100 ms');
          // S2 sensor flashes
          useFxStore.getState().setSensorGlows([1]);
          // Zone wipe on Strip 1 pixels 25-49 (S2) turns red
          zoneWipe(1, 25, 49, COLOR_RED);
          // Plan A chip cancelled with red strike line
          cancelPlanChip('Plan A');
          // Old route retracts cleanly
          routeRetract(600);
          // Occupied stat card updates 4 to 5
          useFxStore.getState().triggerStatPulse();
          await new Promise((r) => setTimeout(r, t(900)));
        })
      ),
      endState: () => {
        seenMark('Seen within 100 ms');
        zoneWipe(1, 25, 49, COLOR_RED);
        cancelPlanChip('Plan A');
        routeRetract(10);
      },
      expect: {
        occupied: ['S1', 'S2', 'S3', 'S5', 'S6'],
        targets: ['S7'],
      },
    },

    // --------------------------------------------------------------------------
    // STEP 5: Plan B: S7 is the next nearest free slot (Recalculating chip, S7 target)
    // --------------------------------------------------------------------------
    {
      id: 'claim7-step5',
      live: 'The next loop picks S7.',
      hint: 'Position 2 on Lane 1 is the closest free position now.',
      callout: {
        text: 'Plan B: S7 (position 2)',
        anchor: 'slot(S7).card',
        side: 'top',
      },
      pin: 'slot(S7).card',
      spotlight: ['slot(S7).card', 'column(2)'],
      persist: ['barrierState', 'driverCar', 'loopTape'],
      dwellMs: 2600,
      actions: seq(
        // Recalculating spinner chip appears
        custom(async () => {
          recalcChip();
          await new Promise((r) => setTimeout(r, t(600)));
          removeRecalcChip();
        }),
        // At 700 ms: column 2 band lights up
        at(
          700,
          custom(async () => {
            useFxStore.getState().setPositionRuler({
              visible: true,
              visibleColumns: [2],
              activeHighlightColumn: 2,
              persisted: false,
            });
          })
        ),
        // At 1200 ms: targetRing on S7, pill TARGET, Plan B chip, driver flashes headlights
        at(
          1200,
          custom(async () => {
            await targetRing(6);
            await pillFlip(6, 'TARGET');
            await planChip('Plan B', 6);
            await driverCar.flashHeadlights(2, 120);
          })
        )
      ),
      endState: () => {
        removeRecalcChip();
        targetRing(6);
        pillFlip(6, 'TARGET');
        planChip('Plan B', 6);
      },
      expect: {
        occupied: ['S1', 'S2', 'S3', 'S5', 'S6'],
        targets: ['S7'],
      },
    },

    // --------------------------------------------------------------------------
    // STEP 6: The driver parks in S7 (New sweep to S7, driver follows)
    // --------------------------------------------------------------------------
    {
      id: 'claim7-step6',
      live: 'The driver parks in S7.',
      hint: 'The sweep skips occupied zones and ends at S7.',
      callout: {
        text: 'New lights lead to S7',
        anchor: 'aisle.lowerLane',
        side: 'top',
      },
      pin: 'gate.exit',
      spotlight: ['slot(S7).card', 'aisle.lowerLane', 'strip(2)'],
      dwellMs: 3800,
      actions: seq(
        // Route draws to S7, sweep skips S5 and S6 (pixels 0-49) and lights pixels 50-74
        custom(async () => {
          route(1, 2);
          sweep(2, 74, { skipOccupied: true });
          await blindBlock(375);
        }),
        // At 3000 ms: driver car follows new lights to bay S7 and stops with headlights on
        at(
          3000,
          custom(async () => {
            clearBlindBlock();
            await driverCar.followTo(799, 474, 2800);
          })
        )
      ),
      endState: () => {
        useSimStore.getState().resetSim([8, 8, 8, 28, 8, 8, 8, 28]);
        route(1, 2);
        driverCar.followTo(799, 474, 10);
        clearLoopTape();
      },
      expect: {
        occupied: ['S1', 'S2', 'S3', 'S5', 'S6'],
        targets: ['S7'],
      },
    },
  ],
};

export default claim7;
