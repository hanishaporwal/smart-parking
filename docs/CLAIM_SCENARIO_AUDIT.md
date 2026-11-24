# ParkWay — Claim Scenario Audit

**Date:** 2026-10-14  
**Audit Scope:** Verification of simplified patent claim scenarios (Claims 1, 5, 7, 11, 12) against firmware logic (`reference/smart_parking.ino`), digital twin layout geometry, WS2812 sweep routines, and visual indicator subsystems.

---

## 1. Executive Summary
All 5 patent claim scenarios were audited step-by-step against the ESP32 firmware source of truth (`classifySlots()`, `findTargets()`, `drawStrips()`, `updateBlink()`). Every scenario's initial occupancy matrix, target resolution, sequential light sweep, car arrival/departure animation, and restore routines verify with zero discrepancies.

| Claim | Title | Start Occupancy | Expected Target(s) | Firmware Target Resolution | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Claim 1** | Sense, decide, guide, report | S1, S5, S6 occupied (8cm) | S2 (index 1) | $\min(i \pmod 4) = 1 \implies \mathbf{S2}$ | Verified |
| **Claim 5** | Pick the nearest free slot | S1, S2, S5 occupied (8cm) | S6 (index 5) | $\min(i \pmod 4) = 1 \implies \mathbf{S6}$ | Verified |
| **Claim 7** | Change target if taken | S1, S5, S6, S7 occupied (8cm) | S2 $\to$ S3 | S2 taken $\implies \min(i \pmod 4) = 2 \implies \mathbf{S3}$ | Verified |
| **Claim 11** | Keep watching while guiding | S1, S2, S5 occupied (8cm) | S6 $\to$ S1 | S1 departs $\implies \min(i \pmod 4) = 0 \implies \mathbf{S1}$ | Verified |
| **Claim 12** | Follow lights, no app needed | S1, S2, S3, S5, S6 occupied (8cm) | S7 (index 6) | $\min(i \pmod 4) = 2 \implies \mathbf{S7}$ | Verified |

---

## 2. Step-by-Step Claim Audits

### Claim 1: Sense, decide, guide, report (`claim-1-core-architecture`)
- **Initial Distances:** `[8, 28, 28, 28, 8, 8, 28, 28]` cm
  - Occupied ($<15$ cm): S1 (0), S5 (4), S6 (5).
  - Vacant ($\ge 15$ cm): S2 (1), S3 (2), S4 (3), S7 (6), S8 (7).
- **Target Calculation:**
  - Vacant positions modulo 4: S2 ($1$), S3 ($2$), S4 ($3$), S7 ($2$), S8 ($3$).
  - Global minimum position $\text{best} = \min(1, 2, 3, 2, 3) = 1$.
  - Slots where $i \pmod 4 == 1$: S2 (index 1) and S6 (index 5). Since S6 is occupied, **S2** is the sole target.
- **Step Progression:**
  - **Step 1:** Highlight `sensors`. Ultrasonic sensors sample all 8 bays.
  - **Step 2:** Highlight `esp32`. ESP32 classifies distances in ~100 ms loop.
  - **Step 3:** Highlight `redLeds`. Status indicator LEDs illuminate solid red on occupied bays S1, S5, S6.
  - **Step 4:** Highlight `slot:S2`. Target beacon pulses gold on S2.
  - **Step 5:** Highlight `sweep:strip1`. Sequential green sweep lights up along Lane 0 WS2812 strip directly to S2 (pixels 0..49).
  - **Step 6:** Highlight `statCards`. Monitoring telemetry updates to 3 occupied, 5 vacant bays.
- **End & Reset/Close Verification:**
  - End state: S1, S5, S6 occupied; S2 active target with green guidance path.
  - Close: Restores pre-claim distance matrix and mode cleanly.

---

### Claim 5: Pick the nearest free slot (`claim-5-nearest-slot`)
- **Initial Distances:** `[8, 8, 28, 28, 8, 28, 28, 28]` cm
  - Occupied: S1 (0), S2 (1), S5 (4).
  - Vacant: S3 (2), S4 (3), S6 (5), S7 (6), S8 (7).
- **Target Calculation:**
  - Vacant positions modulo 4: S3 ($2$), S4 ($3$), S6 ($1$), S7 ($2$), S8 ($3$).
  - Global minimum $\text{best} = \min(2, 3, 1, 2, 3) = 1$.
  - Sole matching vacant bay: **S6** (index 5, $5 \pmod 4 == 1$).
- **Step Progression:**
  - **Step 1:** Highlight `scanPositions`. Proximity search evaluates relative slot positions.
  - **Step 2:** Highlight `dim:S3,S7`. S3 and S7 shown as candidate vacant slots at position 2 (further away).
  - **Step 3:** Highlight `slot:S6`. S6 designated as winner (position 1) and receives active gold target beacon.
  - **Step 4:** Highlight `sweep:strip2`. WS2812 strip on Lane 1 executes sequential sweep terminating at S6 (pixel 49). Red preservation preserves S5 occupied LED state.

---

### Claim 7: Change target if it gets taken (`rerouting`)
- **Initial Distances:** `[8, 28, 28, 28, 8, 8, 8, 28]` cm
  - Occupied: S1 (0), S5 (4), S6 (5), S7 (6).
  - Vacant: S2 (1), S3 (2), S4 (3), S8 (7).
- **Initial Target:**
  - Minimum position modulo 4: S2 ($1$) $\implies$ **S2**.
- **Dynamic Transition:**
  - **Step 1:** S2 designated target; guidance sweep reaches S2.
  - **Step 2:** Another vehicle parks in S2 (`action: { type: 'carArrive', slot: 1, distance: 8 }`). Vehicle animation settles, bay indicator switches to solid red, distance drops to 8 cm.
  - **Firmware Blocking Compliance:** Step 2 triggers strictly after the Lane 0 sweep to S2 completes (750 ms), conforming to the firmware loop execution order.
  - **Step 3:** Highlight `esp32`. ESP32 detects threshold drop ($<15$ cm).
  - **Step 4:** Recalculating vacant slots: S3 ($2$), S4 ($3$), S8 ($3$). New minimum position $= 2$. S7 is occupied ($8$ cm), so **S3** is the sole matching target. Target shifts to S3.
  - **Step 5:** Highlight `sweep:strip1`. Sequential sweep re-fires and guides to S3 (pixels 0..74).

---

### Claim 11: Keep watching while guiding (`claim-11-continuous-monitoring`)
- **Initial Distances:** `[8, 8, 28, 28, 8, 28, 28, 28]` cm
  - Occupied: S1 (0), S2 (1), S5 (4).
  - Initial target: **S6** ($5 \pmod 4 = 1$).
- **Dynamic Transition:**
  - **Step 1:** Lane 1 strip sweep guides incoming driver to S6.
  - **Step 2:** Continuous sampling demonstrates sensor reading loop (~100 ms) while guidance LEDs are lit.
  - **Step 3:** Vehicle departs S1 (`action: { type: 'carLeave', slot: 0, distance: 28 }`). Vehicle departs, distance increases to 28 cm.
  - **Step 4:** Recalculation: S1 is vacant ($0 \pmod 4 = 0$). Minimum position across all vacant bays drops from 1 to 0! S1 becomes the highest priority target.
  - **Step 5:** Highlight `sweep:strip1`. Guidance switches dynamically from Lane 1 over to Lane 0.

---

### Claim 12: Follow the lights, no app needed (`claim-12-in-situ-guidance`)
- **Initial Distances:** `[8, 8, 8, 28, 8, 8, 28, 28]` cm
  - Occupied: S1, S2, S3, S5, S6.
  - Vacant: S4 (3), S7 (2), S8 (3).
  - Target: **S7** ($6 \pmod 4 = 2$).
- **Step Progression:**
  - **Step 1:** S7 designated target.
  - **Step 2:** Green lights trace guidance route from gate entrance along Lane 1 to S7.
  - **Step 3:** Vehicle enters along `#route-to-s7` trajectory, following lit path to S7.
  - **Step 4:** Vehicle parks in S7 (`distance = 8 cm`), turning S7 occupied red.
  - **Step 5:** Telemetry confirms complete in-situ visual guidance cycle without phone/app dependency.

---

## 3. Subsystem Element ID & Highlight Verification
Every highlight string declared in scenario definitions maps to an existing visual element on the digital twin canvas:
- `sensors`: Top & bottom HC-SR04 ultrasonic transducer rows.
- `esp32`: Onboard ESP32 microcontroller SoC chip in top-left bay.
- `redLeds`: Red parking stall status indicator units.
- `slot:S<N>`: Target halo beacon and gold pulsing border on bay S1–S8.
- `dim:S<N>`: Dashed amber candidate rings on secondary vacant bays.
- `sweep:strip1`: Lane 0 WS2812 addressable LED strip (GPIO 23).
- `sweep:strip2`: Lane 1 WS2812 addressable LED strip (GPIO 15).
- `carRoute`: Animated vehicle following entrance trajectory `#route-to-s7`.
- `statCards`: Dashboard telemetry stats panel.

---

## 4. Reset & Close Consistency
- **Replay:** Restarts the active claim at step 1 immediately in playing state.
- **Reset:** Restores the active claim's initial distance matrix (`scenario.initialDistances`), holds at step 1 in paused state ready to play, and retains the live section.
- **Close:** Full exit. Halts any running animation, resets the simulation to the exact pre-claim user state (`preScenarioDistances` and `preScenarioMode`), unmounts the live section, and returns the card header to the permanent title.
