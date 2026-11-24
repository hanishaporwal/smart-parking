// ============================================================================
// PARKWAY PATENT CLAIM 12 (src/scenarios/claims/claim12.ts)
// Claim 12: "Follow the lights" (Pillar: Guide)
// "Lights switch on one after another and lead the driver. No app needed."
// Full 6-step choreography: car arrival at gate, barrier lift, sequential route
// nodes from entrance to S7, LED sweep, driver following lit path, headlight flash,
// "No app. No screen." badge, and reversing into bay S7.
// ============================================================================

import { ClaimDefinition, seq, at, custom } from '../types';
import {
  targetRing,
  pillFlip,
  readout,
  zoneWipe,
  route,
  sweep,
  car,
} from '../director/primitives';
import {
  routeNodes,
  nodeIgnite,
  trailFade,
  pulseNode,
  switchOffNodesReverse,
  noAppBadge,
  clearRouteNodes,
  useRouteNodesStore,
} from '../fx/routeNodes';
import { barrier } from '../fx/barrier';
import { entryCar } from '../fx/entryCar';
import { followCar } from '../fx/followCar';
import { scanner } from '../fx/decisionBoard';
import { useSimStore } from '@/store';
import { useFxStore } from '../fx/store';
import { COLOR_RED } from '@/engine';
import { t } from '../pacing';

export const claim12: ClaimDefinition = {
  number: 12,
  title: 'Follow the lights',
  pillar: 'Guide',
  simple: 'Lights switch on one after another and lead the driver. No app needed.',
  imagine: 'A driver enters. The lights are the only guide.',
  startState: [8, 8, 8, 28, 8, 8, 28, 28], // S1, S2, S3, S5, S6 occupied; S4, S7, S8 vacant. Engine target S7.
  recap: {
    facts: () => [
      'Path: Entrance to S7, 6 lights',
      'No app or screen used',
      'Next free: S4 and S8',
    ],
  },
  steps: [
    // --------------------------------------------------------------------------
    // STEP 1: A car arrives at the gate (Entry car, green light & barrier lift)
    // --------------------------------------------------------------------------
    {
      id: 'claim12-step1',
      live: 'A car arrives at the gate.',
      hint: 'The barrier opens.',
      callout: {
        text: 'Car at the gate',
        anchor: 'gate.stopLine',
        side: 'top',
      },
      pin: 'gate.booth',
      spotlight: ['gate.booth', 'gate.arm'],
      persist: ['gateCar', 'barrierState'],
      dwellMs: 1800,
      actions: seq(
        // Entry car slides in from road to the stop line
        custom(async () => {
          useFxStore.getState().setDeferSweepVisual(true);
          useFxStore.getState().setBarrierState({ lightColor: 'amber', armRaised: false });
          await entryCar({ durationMs: 1400 });
        }),
        // At 1200 ms: booth light switches to green and ENTRY plate glows gold
        at(
          1200,
          custom(async () => {
            useFxStore.getState().setBarrierState({ lightColor: 'green', entrySignGlow: true });
          })
        ),
        // At 1500 ms: barrier arm lifts up
        at(
          1500,
          custom(async () => {
            await barrier.lift();
          })
        )
      ),
      endState: () => {
        useSimStore.getState().resetSim([8, 8, 8, 28, 8, 8, 28, 28]);
        useFxStore.getState().setDeferSweepVisual(true);
        useFxStore.getState().setDriverCarState({
          visible: true,
          x: 195,
          y: 295,
          rotation: 180,
          headlights: true,
          brakeLights: false,
        });
        useFxStore.getState().setBarrierState({ armRaised: true, lightColor: 'green', entrySignGlow: true });
      },
      expect: {
        occupied: ['S1', 'S2', 'S3', 'S5', 'S6'],
        targets: ['S7'],
      },
    },

    // --------------------------------------------------------------------------
    // STEP 2: The path is planned (Scanner col 0..2, S7 target, route nodes dim)
    // --------------------------------------------------------------------------
    {
      id: 'claim12-step2',
      live: 'The path is planned.',
      hint: 'The route is a fixed sequence of lights from the entrance to the bay.',
      callout: {
        text: 'Nearest free slot: S7. 6 lights',
        anchor: 'slot(S7).card',
        side: 'top',
      },
      pin: 'slot(S7).card',
      spotlight: ['slot(S7).card', 'gate.booth', 'aisle.lowerLane'],
      persist: ['gateCar', 'barrierState', 'routeNodes'],
      dwellMs: 2500,
      actions: seq(
        // Scanner runs across columns: Pos 0 taken, Pos 1 taken, Pos 2 finds S7 free
        custom(async () => {
          await scanner({
            columns: [0, 1, 2],
            stopAtFirstFree: true,
            colIntervalMs: 500,
            holdMs: 500,
          });
        }),
        // At 1800 ms: targetRing on S7 and pill flips to TARGET
        at(
          1800,
          custom(async () => {
            await targetRing(6);
            await pillFlip(6, 'TARGET');
          })
        ),
        // At 2300 ms: 6 route nodes appear as dim outlines
        at(
          2300,
          custom(async () => {
            await routeNodes(1);
          })
        )
      ),
      endState: () => {
        useFxStore.getState().setDeferSweepVisual(true);
        targetRing(6);
        pillFlip(6, 'TARGET');
        routeNodes(1);
      },
      expect: {
        occupied: ['S1', 'S2', 'S3', 'S5', 'S6'],
        targets: ['S7'],
      },
    },

    // --------------------------------------------------------------------------
    // STEP 3: The lights switch on one after another (Synchronized sweep + node ignition)
    // --------------------------------------------------------------------------
    {
      id: 'claim12-step3',
      live: 'The lights switch on one after another.',
      hint: 'From the entrance toward the bay. Red bays stay red.',
      callout: {
        text: 'Lights run Entrance to S7',
        anchor: 'aisle.lowerLane',
        side: 'top',
      },
      pin: 'gate.exit',
      spotlight: ['aisle.lowerLane', 'strip(2)'],
      persist: ['gateCar', 'barrierState', 'routeNodes'],
      dwellMs: 3200,
      actions: seq(
        custom(async () => {
          // DeferSweepVisual off so visual route and LED sweep are drawn
          useFxStore.getState().setDeferSweepVisual(false);

          // Route drawn to S7
          route(1, 6);

          // LED strip sweep pixel-by-pixel toward S7 (px 74), skipping occupied S5/S6 zones
          sweep(2, 74, { skipOccupied: true });

          // Synchronized node ignition on one clock
          nodeIgnite(0); // Entrance
          setTimeout(() => nodeIgnite(1), t(500));  // L1
          setTimeout(() => nodeIgnite(2), t(1000)); // L2
          setTimeout(() => nodeIgnite(3), t(1500)); // L3
          setTimeout(() => nodeIgnite(4), t(2000)); // L4
          setTimeout(() => nodeIgnite(5), t(2600)); // S7

          await new Promise((r) => setTimeout(r, t(3000)));
        })
      ),
      endState: () => {
        useFxStore.getState().setDeferSweepVisual(false);
        route(1, 6);
        for (let i = 0; i <= 5; i++) {
          nodeIgnite(i);
        }
      },
      expect: {
        occupied: ['S1', 'S2', 'S3', 'S5', 'S6'],
        targets: ['S7'],
      },
    },

    // --------------------------------------------------------------------------
    // STEP 4: The driver follows the lights (FollowCar moves node-by-node, trail fades)
    // --------------------------------------------------------------------------
    {
      id: 'claim12-step4',
      live: 'The driver follows the lights.',
      hint: 'Only the lights ahead stay on.',
      callout: {
        text: 'Follow the lit path',
        anchor: 'the car',
        side: 'top',
      },
      pin: 'the car',
      spotlight: ['the car', 'aisle.lowerLane'],
      persist: ['barrierState', 'routeNodes'],
      dwellMs: 4800,
      actions: seq(
        custom(async () => {
          // FollowCar drives node-by-node over 4500 ms, fading trail behind it
          await followCar({
            targetSlot: 6,
            durationMs: 4500,
            nodeXCoords: [222, 337, 452, 568, 683, 799],
            onNodePassed: (idx) => {
              trailFade(idx);
            },
          });
        })
      ),
      endState: () => {
        useFxStore.getState().setDriverCarState({
          visible: true,
          x: 799,
          y: 295,
          rotation: 180,
          headlights: true,
          brakeLights: true,
          greenTrail: [],
        });
        for (let i = 0; i < 5; i++) {
          trailFade(i);
        }
      },
      expect: {
        occupied: ['S1', 'S2', 'S3', 'S5', 'S6'],
        targets: ['S7'],
      },
    },

    // --------------------------------------------------------------------------
    // STEP 5: No phone, no app, no screen (noAppBadge, headlight flash, S7 pulse)
    // --------------------------------------------------------------------------
    {
      id: 'claim12-step5',
      live: 'No phone, no app, no screen.',
      hint: 'The lit path is the navigation.',
      callout: {
        text: 'Lights replace the app',
        anchor: 'ground.topLeft',
        side: 'bottom',
      },
      pin: 'ground.topLeft',
      spotlight: ['the car', 'slot(S7).card'],
      persist: ['barrierState', 'routeNodes'],
      dwellMs: 2500,
      actions: seq(
        // noAppBadge draws in over 1200 ms
        custom(async () => {
          await noAppBadge({ durationMs: 1200 });
        }),
        // At 600 ms: car headlights flash once and the S7 node pulses
        at(
          600,
          custom(async () => {
            const cur = useFxStore.getState().driverCarState;
            if (cur) {
              useFxStore.getState().setDriverCarState({ ...cur, headlightFlash: true });
              setTimeout(() => {
                const c = useFxStore.getState().driverCarState;
                if (c) useFxStore.getState().setDriverCarState({ ...c, headlightFlash: false });
              }, t(250));
            }
            pulseNode(5);
          })
        )
      ),
      endState: () => {
        noAppBadge();
        pulseNode(5);
      },
      expect: {
        occupied: ['S1', 'S2', 'S3', 'S5', 'S6'],
        targets: ['S7'],
      },
    },

    // --------------------------------------------------------------------------
    // STEP 6: The car parks and the lights switch off (Reverse into S7, next tie S4 & S8)
    // --------------------------------------------------------------------------
    {
      id: 'claim12-step6',
      live: 'The car parks and the lights switch off.',
      hint: 'S7 turns red and the next target is chosen.',
      callout: {
        text: 'S7 taken. Next free: tie S4 and S8',
        anchor: 'slot(S7).card',
        side: 'top',
      },
      pin: 'slot(S7).card',
      spotlight: ['slot(S7).card'],
      dwellMs: 3800,
      actions: seq(
        // 0-2200 ms: car reverses into bay S7; crossing 15 cm triggers red readout & occupied pill
        custom(async () => {
          await car.reverseInto(6, {
            durationMs: 2000,
            onCrossThreshold: (slot) => {
              useSimStore.getState().setDistance(slot, 8);
              readout(slot, 8, 'red');
              pillFlip(slot, 'OCCUPIED');
              zoneWipe(2, 50, 74, COLOR_RED);
              useFxStore.getState().triggerStatPulse();
            },
          });
        }),
        // 2300-3300 ms: remaining nodes switch off in reverse order; barrier lowers with amber light
        at(
          2300,
          custom(async () => {
            await switchOffNodesReverse(120);
            await barrier.lower({ lightColor: 'amber' });
          })
        ),
        // At 3400 ms: targetRing on S4 and S8 (position 3 tie) with chip "Tie at position 3"
        at(
          3400,
          custom(async () => {
            await targetRing([3, 7]);
            useRouteNodesStore.getState().setTieChip({ text: 'Tie at position 3' });
          })
        )
      ),
      endState: () => {
        useSimStore.getState().resetSim([8, 8, 8, 28, 8, 8, 8, 28]);
        readout(6, 8, 'red');
        pillFlip(6, 'OCCUPIED');
        zoneWipe(2, 50, 74, COLOR_RED);
        barrier.lower({ lightColor: 'amber' });
        targetRing([3, 7]);
        useRouteNodesStore.getState().setTieChip({ text: 'Tie at position 3' });
        clearRouteNodes();
      },
      expect: {
        occupied: ['S1', 'S2', 'S3', 'S5', 'S6', 'S7'],
        targets: ['S4', 'S8'],
      },
    },
  ],
};

export default claim12;
