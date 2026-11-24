// ============================================================================
// PARKWAY PATENT CLAIM 2 (src/scenarios/claims/claim2.ts)
// Claim 2: "Measure the distance" (Pillar: Sense)
// "A sensor turns an echo into a distance, and the distance into occupied or vacant."
// Full 7-step choreography with the Sensor S3 Inspector, vertical ruler,
// threshold line, echo timer, acoustic pulse waves, side-car, and lot arrival.
// ============================================================================

import { ClaimDefinition, seq, par, at, custom } from '../types';
import {
  sonar,
  readout,
  pillFlip,
  ledFill,
  car,
} from '../director/primitives';
import {
  openInspector,
  closeInspector,
  flashTrigger,
  pulseWave,
  sideCarRollIn,
  sideCarRollOut,
  formulaChip,
  useInspectorStore,
} from '../fx/inspector';
import { useSimStore } from '@/store';
import { useFxStore } from '../fx/store';
import { COLOR_RED } from '@/engine';
import { t } from '../pacing';

export const claim2: ClaimDefinition = {
  number: 2,
  title: 'Measure the distance',
  pillar: 'Sense',
  simple: 'A sensor turns an echo into a distance, and the distance into occupied or vacant.',
  imagine: 'One sensor, one bay. We follow what it hears.',
  startState: [28, 28, 28, 28, 28, 28, 28, 28], // all 8 slots vacant at 28 cm; targets: S1, S5
  recap: {
    facts: () => [
      'S3 reads 8 cm: occupied',
      '7 bays read 28 cm: vacant',
      'Targets stay S1 and S5',
    ],
  },
  steps: [
    // --------------------------------------------------------------------------
    // STEP 1: All 8 bays have sensors
    // --------------------------------------------------------------------------
    {
      id: 'claim2-step1',
      live: 'Every bay has its own sensor.',
      hint: 'One HC-SR04 sensor watches one slot.',
      callout: {
        text: '8 bays, 8 sensors',
        anchor: 'slot(S3).sensor',
        side: 'bottom',
      },
      pin: 'slot(S3).sensor',
      spotlight: [
        'slot(S1).sensor',
        'slot(S2).sensor',
        'slot(S3).sensor',
        'slot(S4).sensor',
        'slot(S5).sensor',
        'slot(S6).sensor',
        'slot(S7).sensor',
        'slot(S8).sensor',
      ],
      dwellMs: 2000,
      actions: seq(
        // Sonar ping across all 8 sensors
        custom(async () => {
          await sonar('all', { stagger: 120 });
        }),
        // Staggered readouts (28 cm green)
        at(
          200,
          custom(async () => {
            for (let i = 0; i < 8; i++) {
              readout(i, 28, 'green');
              await new Promise((r) => setTimeout(r, t(60)));
            }
            // S3 sensor ends with gold glow
            useFxStore.getState().setSensorGlows([2]);
          })
        )
      ),
      endState: () => {
        useSimStore.getState().resetSim([28, 28, 28, 28, 28, 28, 28, 28]);
        for (let i = 0; i < 8; i++) {
          readout(i, 28, 'green');
        }
        useFxStore.getState().setSensorGlows([2]);
      },
      expect: {
        occupied: [],
        targets: ['S1', 'S5'],
      },
    },

    // --------------------------------------------------------------------------
    // STEP 2: The sensor sends a pulse (Inspector opens)
    // --------------------------------------------------------------------------
    {
      id: 'claim2-step2',
      live: 'The sensor sends a pulse.',
      hint: 'A short ultrasonic pulse travels toward the bay.',
      callout: {
        text: 'Pulse goes down to the bay',
        anchor: 'inspector.sensor',
        side: 'top',
      },
      pin: 'inspector.sensor',
      spotlight: ['slot(S3).card', 'inspector.panel'],
      persist: ['inspector.panel'],
      dwellMs: 2500,
      actions: seq(
        custom(async () => {
          // Clear 8 lot readouts
          useFxStore.getState().clearNonPersistedReadouts();
          // Open inspector panel with a spring
          await openInspector();
        }),
        at(
          100,
          custom(async () => {
            // 10 us trigger flashes on sensor
            await flashTrigger();
            // Wave travels down to floor (1633 us)
            await pulseWave('down', 1600, 1633);
          })
        )
      ),
      endState: () => {
        useInspectorStore.getState().setVisible(true);
        useInspectorStore.getState().setFloorVisible(true);
        useInspectorStore.getState().setEchoTimer(1633);
        useInspectorStore.getState().setRulerMarker(28);
      },
      expect: {
        occupied: [],
        targets: ['S1', 'S5'],
      },
    },

    // --------------------------------------------------------------------------
    // STEP 3: Empty bay answers late (1633 us)
    // --------------------------------------------------------------------------
    {
      id: 'claim2-step3',
      live: 'An empty bay answers late.',
      hint: 'A far floor means a long echo.',
      callout: {
        text: 'Far floor = long echo (1633 us)',
        anchor: 'inspector.timer',
        side: 'right',
      },
      pin: 'inspector.timer',
      spotlight: ['inspector.panel'],
      persist: ['inspector.panel'],
      dwellMs: 2200,
      actions: seq(
        // Wave travels back up to sensor
        custom(async () => {
          await pulseWave('up', 1400, 1633);
          // Readout counts to 28 cm green
          useInspectorStore.getState().setReadout(28, 'green');
          useInspectorStore.getState().setRulerMarker(28);
          useInspectorStore.getState().setPill('VACANT');
          await formulaChip(1633, 28);
        })
      ),
      endState: () => {
        useInspectorStore.getState().setVisible(true);
        useInspectorStore.getState().setFloorVisible(true);
        useInspectorStore.getState().setEchoTimer(1633);
        useInspectorStore.getState().setReadout(28, 'green');
        useInspectorStore.getState().setRulerMarker(28);
        useInspectorStore.getState().setPill('VACANT');
        useInspectorStore.getState().setFormula({ us: 1633, cm: 28 });
      },
      expect: {
        occupied: [],
        targets: ['S1', 'S5'],
      },
    },

    // --------------------------------------------------------------------------
    // STEP 4: A parked car answers sooner (467 us, 8 cm)
    // --------------------------------------------------------------------------
    {
      id: 'claim2-step4',
      live: 'A parked car answers sooner.',
      hint: 'A close roof means a short echo.',
      callout: {
        text: 'Close car = short echo (467 us)',
        anchor: 'inspector.floor',
        side: 'bottom',
      },
      pin: 'inspector.car',
      spotlight: ['inspector.panel'],
      persist: ['inspector.panel'],
      dwellMs: 2600,
      actions: seq(
        // Side car rolls into bay
        custom(async () => {
          await sideCarRollIn(8, 1100);
        }),
        // Pulse down and up against car roof (467 us total)
        custom(async () => {
          await pulseWave('down', 500, 233);
          await pulseWave('up', 500, 467);
          // Readout counts to 8 cm red
          useInspectorStore.getState().setReadout(8, 'red');
          useInspectorStore.getState().setRulerMarker(8);
          useInspectorStore.getState().setPill('OCCUPIED');
          await formulaChip(467, 8);
        })
      ),
      endState: () => {
        useInspectorStore.getState().setVisible(true);
        useInspectorStore.getState().setCar(true, 8, 1);
        useInspectorStore.getState().setEchoTimer(467);
        useInspectorStore.getState().setReadout(8, 'red');
        useInspectorStore.getState().setRulerMarker(8);
        useInspectorStore.getState().setPill('OCCUPIED');
        useInspectorStore.getState().setFormula({ us: 467, cm: 8 });
      },
      expect: {
        occupied: [],
        targets: ['S1', 'S5'],
      },
    },

    // --------------------------------------------------------------------------
    // STEP 5: Under 15 cm threshold comparison (16 cm, 15 cm, 14 cm, back to 8 cm)
    // --------------------------------------------------------------------------
    {
      id: 'claim2-step5',
      live: 'Under 15 cm means occupied.',
      hint: '14 cm is occupied, 15 cm is not.',
      callout: {
        text: 'Below 15 cm = occupied',
        anchor: 'inspector.threshold',
        side: 'top',
      },
      pin: 'inspector.threshold',
      spotlight: ['inspector.panel'],
      persist: ['inspector.panel'],
      dwellMs: 3800,
      actions: seq(
        custom(async () => {
          // Threshold line pulses red
          useInspectorStore.getState().setThresholdPulse(true);

          // 1. Move car to 16 cm (VACANT, timer 933 us)
          useInspectorStore.getState().setCar(true, 16, 1);
          useInspectorStore.getState().setRulerMarker(16);
          useInspectorStore.getState().setEchoTimer(933);
          useInspectorStore.getState().setReadout(16, 'green');
          useInspectorStore.getState().setPill('VACANT');
          useInspectorStore.getState().setFormula({ us: 933, cm: 16 });
          useInspectorStore.getState().setTag(null);
          await new Promise((r) => setTimeout(r, t(900)));

          // 2. Move car to 15 cm (VACANT, timer 875 us, tag "not below 15")
          useInspectorStore.getState().setCar(true, 15, 1);
          useInspectorStore.getState().setRulerMarker(15);
          useInspectorStore.getState().setEchoTimer(875);
          useInspectorStore.getState().setReadout(15, 'green');
          useInspectorStore.getState().setPill('VACANT');
          useInspectorStore.getState().setFormula({ us: 875, cm: 15 });
          useInspectorStore.getState().setTag('not below 15');
          await new Promise((r) => setTimeout(r, t(900)));

          // 3. Move car to 14 cm (OCCUPIED, timer 816 us)
          useInspectorStore.getState().setCar(true, 14, 1);
          useInspectorStore.getState().setRulerMarker(14);
          useInspectorStore.getState().setEchoTimer(816);
          useInspectorStore.getState().setReadout(14, 'red');
          useInspectorStore.getState().setPill('OCCUPIED');
          useInspectorStore.getState().setFormula({ us: 816, cm: 14 });
          useInspectorStore.getState().setTag('below 15 = OCCUPIED');
          await new Promise((r) => setTimeout(r, t(900)));

          // 4. Return to 8 cm (OCCUPIED, timer 467 us)
          useInspectorStore.getState().setCar(true, 8, 1);
          useInspectorStore.getState().setRulerMarker(8);
          useInspectorStore.getState().setEchoTimer(467);
          useInspectorStore.getState().setReadout(8, 'red');
          useInspectorStore.getState().setPill('OCCUPIED');
          useInspectorStore.getState().setFormula({ us: 467, cm: 8 });
          useInspectorStore.getState().setTag(null);
          useInspectorStore.getState().setThresholdPulse(false);
          await new Promise((r) => setTimeout(r, t(700)));
        })
      ),
      endState: () => {
        useInspectorStore.getState().setVisible(true);
        useInspectorStore.getState().setCar(true, 8, 1);
        useInspectorStore.getState().setRulerMarker(8);
        useInspectorStore.getState().setEchoTimer(467);
        useInspectorStore.getState().setReadout(8, 'red');
        useInspectorStore.getState().setPill('OCCUPIED');
        useInspectorStore.getState().setFormula({ us: 467, cm: 8 });
        useInspectorStore.getState().setThresholdPulse(false);
        useInspectorStore.getState().setTag(null);
      },
      expect: {
        occupied: [],
        targets: ['S1', 'S5'],
      },
    },

    // --------------------------------------------------------------------------
    // STEP 6: No echo means vacant (Timeout 400 cm)
    // --------------------------------------------------------------------------
    {
      id: 'claim2-step6',
      live: 'No echo means vacant.',
      hint: 'No answer within 30 ms is read as 400 cm.',
      callout: {
        text: 'No echo = 400 cm = vacant',
        anchor: 'inspector.sensor',
        side: 'top',
      },
      pin: 'inspector.timer',
      spotlight: ['inspector.panel'],
      persist: ['inspector.panel'],
      dwellMs: 2500,
      actions: seq(
        // Car rolls out and floor line fades into open air
        custom(async () => {
          await sideCarRollOut(900);
        }),
        // Pulse goes down with no echo return
        custom(async () => {
          await pulseWave('down', 1100, 2000);
          // Timer hits max with timeout tag
          useInspectorStore.getState().setEchoTimer(2000, true);
          useInspectorStore.getState().setReadout(400, 'green');
          useInspectorStore.getState().setRulerMarker(40);
          useInspectorStore.getState().setPill('VACANT');
          useInspectorStore.getState().setFormula(null);
          useInspectorStore
            .getState()
            .setNoteChip('400 cm is treated as vacant');
        })
      ),
      endState: () => {
        useInspectorStore.getState().setVisible(true);
        useInspectorStore.getState().setCar(false, 28, 0);
        useInspectorStore.getState().setFloorVisible(false);
        useInspectorStore.getState().setEchoTimer(2000, true);
        useInspectorStore.getState().setReadout(400, 'green');
        useInspectorStore.getState().setRulerMarker(40);
        useInspectorStore.getState().setPill('VACANT');
        useInspectorStore
          .getState()
          .setNoteChip('400 cm is treated as vacant');
      },
      expect: {
        occupied: [],
        targets: ['S1', 'S5'],
      },
    },

    // --------------------------------------------------------------------------
    // STEP 7: Every slot repeats this alone (Lot arrival at S3)
    // --------------------------------------------------------------------------
    {
      id: 'claim2-step7',
      live: 'Every slot repeats this alone.',
      hint: 'All 8 sensors decide independently.',
      callout: {
        text: 'Same test in all 8 bays',
        anchor: 'slot(S3).card',
        side: 'bottom',
      },
      pin: 'slot(S3).card',
      spotlight: 'none',
      dwellMs: 2500,
      actions: seq(
        // Inspector closes
        custom(async () => {
          await closeInspector();
        }),
        // Car arrives at S3 on the lot
        par(
          custom(async () => {
            await car.arrive(2, {
              distance: 8,
              onCrossThreshold: (slot) => {
                useSimStore.getState().setDistance(slot, 8);
                readout(slot, 8, 'red');
                pillFlip(slot, 'OCCUPIED');
                ledFill(1, 50, 74, COLOR_RED, 20);
              },
            });
          }),
          // Sonar ripple over the other 7 sensors
          at(
            300,
            custom(async () => {
              const otherSensors = [0, 1, 3, 4, 5, 6, 7];
              await sonar(otherSensors, { stagger: 100 });
              for (const s of otherSensors) {
                readout(s, 28, 'green');
              }
            })
          )
        )
      ),
      endState: () => {
        closeInspector();
        useSimStore.getState().setDistance(2, 8);
        readout(2, 8, 'red');
        pillFlip(2, 'OCCUPIED');
        for (const s of [0, 1, 3, 4, 5, 6, 7]) {
          useSimStore.getState().setDistance(s, 28);
          readout(s, 28, 'green');
        }
      },
      expect: {
        occupied: ['S3'],
        targets: ['S1', 'S5'],
      },
    },
  ],
};

export default claim2;
