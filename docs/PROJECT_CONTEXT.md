# ParkWay — Project Context & Specification

## 1. Project Overview
- **Name:** ParkWay
- **Description:** High-fidelity digital twin of an ESP32-based IoT smart parking guidance system utilizing ultrasonic distance sensors and WS2812 addressable LED strip visual navigation paths.
- **Tagline:** "Follow the light to the nearest free slot"
- **Architecture:** Runs 100% locally in the browser with zero backend dependencies.
- **Tech Stack:** React, TypeScript, Vite, Tailwind CSS, Motion for React, SVG / Canvas.

### Branding & Identity
- **Logo Concept:** Matched exactly from `/reference/parkway-logo.png` (master at `public/logo-source.png`) in a 100×100 viewBox. A rounded-square clay tile (corner radius 21, from (9.5,10) to (90.5,88.5)) filled with a soft diagonal gradient from `#FFD34D` (top-left) to `#F5A623` (middle) to `#C9680F` (bottom-right), featuring a diffused top-left 3D gloss highlight and subtle darker rim. The glyph is a thick near-black (`#1C1C1E`) rounded "P" drawn as a two-lane road shape (stroke width 7.5, round caps/joins): an outer P outline, a rounded bottom joining to an inner parallel route line (gap 2.5), a start marker ring at the stem's bottom (center (35.2, 71.5), radius 2.85) with a tile-colored center, an inner route running up the stem and curving right into the bowl ending in an arrow chevron pointing toward the bright green (`#22C55E`, r=3.2) destination dot at (64.3, 39.7) with a soft yellow-green glow halo.
- **Wordmark:** "ParkWay" camel-cased with "Park" in `#F4EDE4` and "Way" in `#E0A84B` (Newsreader 600, letter-spacing -0.02em). Tagline: "Follow the light to the nearest free slot" (Hanken Grotesk 12px, text-muted, truncated).
- **Variants:** `<ParkWayLogo variant="tile" />` (full tile) and `variant="mark"` (glyph & dot only, glow filter dropped below 32px). Accessible with `role="img"` and `aria-label="ParkWay logo"`.
- **Sidebar Integration:** 56px logo tile, 26px wordmark, 12px tagline, 14px gap, 24px top/bottom padding in expanded mode; 44px centered tile with "ParkWay" tooltip in collapsed rail. Both act as links to Overview with gold focus rings and hover lift.
- **Design & Theme:** Advanced Liquid-Glass UI (refined glassmorphism with soft refraction, specular edges, ambient colour orbs behind glass, and fluid spring motion, inspired by modern mobile music-player interfaces)
  - **Three-Tier Liquid Glass Elevation System:**
    | Tier | Role & Elements | Surface & Backdrop | Border & Rim | Specular Highlight & Shadows |
    | :--- | :--- | :--- | :--- | :--- |
    | **Base / Ambient** | Fixed layer behind everything | `#0E0C0A` + 3 blurred colour orbs (Gold 55vw `rgba(224,168,75,0.16)`, Green 50vw `rgba(74,222,128,0.11)`, Info Blue 40vw `rgba(111,184,214,0.07)`, blur 120px with 40-60s drift) + 3% SVG grain | None | Vignette radial gradient overlay (`rgba(0,0,0,0.45)`) |
    | **Glass G1 (Panels)** | Main panels (sidebar, Digital Twin card, Claim Tracer card, Fig 3 card, Fig 3 info panel, strip cards, Drawer) | `linear-gradient(145deg, rgba(34,29,25,0.62), rgba(20,17,14,0.72))`, `backdrop-filter: blur(22px) saturate(160%) brightness(1.05)` | 1px gradient border via masked pseudo-element (top-left `rgba(255,240,225,0.38)` fading to `0.04` at middle and `0.14` at bottom-right) | Specular top edge: `inset 0 1px 0 rgba(255,255,255,0.14)` + inner glow `inset 0 0 24px rgba(255,240,225,0.03)` + radial sheen `rgba(255,255,255,0.10)`. Outer shadow: `0 18px 48px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.4)` |
    | **Glass G2 (Inner Boxes)** | Sub-panels inside cards (stat cards, step list rows, claim title block, Hardware Specs card, telemetry rows, hotspot bar, technical tables) | `rgba(255,240,225,0.045)` over the panel + tint gradient; **NO backdrop-filter** (never nest blur inside blur) | 1px gradient border (masked pseudo-element) | Specular top edge: `inset 0 1px 0 rgba(255,255,255,0.14)` + radial sheen. Shadow: `0 8px 22px rgba(0,0,0,0.38)` |
    | **Glass G3 (Interactive & Floating)** | Buttons, pills, chips, circular icon buttons, nav items, popover, zoom control capsule, live-section capsule, name chip | `rgba(255,240,225,0.08)` with vertical gradient (top `rgba(255,240,225,0.13)` to bottom `rgba(255,240,225,0.04)`). `backdrop-filter: blur(16px) saturate(170%)` only on floating capsules overlapping content (popover, zoom capsule, live-section capsule, name chip, tooltips) | 1px gradient border / colored rim at 45% on tinted variants | Specular sheen follows pointer via `requestAnimationFrame` (`--sheen-x`, `--sheen-y`). Outer shadow: `0 6px 18px rgba(0,0,0,0.45)`. Active: `scale(0.96)`. Hover: `translateY(-1px)`, shadow grows |
    | **Glass Recessed** | Inset elements (number inputs, sliders, search-like fields, live progress track) | `rgba(0,0,0,0.38)` | 1px `rgba(46,40,35,0.9)` | Inset shadow: `inset 2px 2px 8px rgba(0,0,0,0.6), inset -1px -1px 0 rgba(255,240,225,0.06)` |
  - Color Tokens (Strictly Preserved):
    - `bg`: `#0E0C0A` (page base, Level 0)
    - `level-1` / `surface`: `#1A1714` (cards, sidebar, Level 1)
    - `border-1`: `#3A332D` (Level 1 borders)
    - `level-2`: `#221E1A` (boxes inside panels, Level 2)
    - `border-2`: `#463E37` (Level 2 borders)
    - `level-3` / `raised`: `#2B2621` (interactive elements, Level 3)
    - `border-3`: `#5A5048` (Level 3 borders)
    - `level-3-hover` / `raised-hover`: `#352F29` (Level 3 hover)
    - `recessed`: `#100E0C` (recessed inputs and tracks)
    - `border-recessed`: `#2E2823` (recessed borders)
    - `asphalt`: `#0A0908` (page container dark base)
    - `lot-ground`: `#26282b` (dark grey lot ground with subtle speckle)
    - `lot-road`: `#3e4146` (aisle and entry driveway tarmac)
    - `lot-track`: `#35383c` (80% wheel-track bands along route lanes)
    - `lot-kerb`: `#6b6e73` (8px light-grey driveway kerbs)
    - `lot-border`: `#7b7e83` (vacant slot and guard booth 1.5px borders)
    - `lot-line`: `#8a8d91` (dashed centre line and vacant P circle stroke)
    - `lot-booth`: `#1d1f22` (guard booth and entry sign plate)
    - `lot-vacant`: `#2a2c2f` (92% vacant slot surface fill)
    - `hazard-yellow`: `#E8C53A` (45° hazard band yellow stripes)
    - `hazard-black`: `#14110F` (45° hazard band near-black stripes)
    - `lot-patch-dark`: `#1f2123` (subtle ground oil stain patches)
    - `lot-patch-light`: `#303337` (subtle ground worn area patches)
    - `lot-crack`: `#1b1c1e` (hairline ground cracks)
    - `border`: `rgba(46, 40, 35, 0.7)` / `#2E2823 at 70%` (thin outlines)
    - `text-1`: `#F6F0E8` (headings, values, step text, labels)
    - `text-2`: `#D2C8BB` (descriptions, subtitles, list items, table values)
    - `text-3`: `#A99F92` (captions, hints, units, GPIO text)
    - `gold`: `#E0A84B` (active nav, targets, primary buttons)
    - `green`: `#5FD08A` (vacant, guidance)
    - `red`: `#EF6B6B` (occupied)
    - `info`: `#6FB8D6` (ESP32 chip, sensor highlights)
    - `green-tint`: `rgba(95,208,138,0.12)`
    - `red-tint`: `rgba(239,107,107,0.14)`
    - `gold-tint`: `rgba(224,168,75,0.16)`
    - `gold-glow`: `rgba(224,168,75,0.40)`
    - `route-green`: `#00FF00` (matching blinking target LED strip light, guidance route line, direction arrowheads, comet ring)
    - `route-dotted`: `rgba(0, 255, 0, 0.95)` (pass-over dotted segment past occupied slots, 95% opacity, matching stroke width & glow)
    - `route-glow`: `rgba(0, 255, 0, 0.45)` (vibrant guidance route drop-shadow glow matching blinking green strip light)
  - Liquid Glass Hard Rules:
    - **No blur over drawings:** The parking lot SVG simulation canvas and Fig 3 architecture SVG diagram remain opaque inset "windows" with crisp borders and no backdrop filter overhead.
    - **Budget limit:** Maximum 6 active backdrop-filter elements visible on screen at once to preserve 60fps performance on all hardware.
    - **Accessibility fallbacks:** Solid fallbacks automatically engage under `@media (prefers-reduced-transparency)`, `@supports not (backdrop-filter: blur(1px))`, and `forced-colors: active`. Drift animations and spring motion disable under `prefers-reduced-motion: reduce`.
  - Radius Tokens: card 28px, inner card 20px, input/button 14px, pill 999px.
  - Functional indicators: Green (`#5FD08A` UI / `#00FF00` firmware) for vacant slots & sequential guidance; Red (`#EF6B6B` UI / `#FF0000` firmware) for occupied slots; Gold (`#E0A84B`) for targets and primary accents.
  - Lot Surface, Hazard Bands, Entry & Guidance Route Design:
    - Ground: Dark grey `#26282b` with a layered subtle texture (SVG feTurbulence fine grain noise at 7% overlay, soft elliptical patches in `#1f2123` and `#303337` at 10-15% opacity, and 1px hairline cracks in `#1b1c1e` at 40%), drawn beneath the road and cards so they remain crisp.
    - Hazard Bands: Thin 6px vertical bands centered in the gaps between neighbouring slots (S1-S2, S2-S3, S3-S4 and S5-S6, S6-S7, S7-S8) and at outer lane ends, running the full slot height with 45° diagonal yellow (`#E8C53A`) and near-black (`#14110F`) stripes. Positioned behind cards/strips with pointer-events-none.
    - Road: Lighter grey `#3e4146` with two `#35383c` (80%) wheel-track bands (~15% of aisle height) centered on route lanes.
    - Centre line: `#8a8d91` dashed line; no yellow lines or aisle direction arrows.
    - Slots: Normal vacant fill `#2a2c2f` (92%), `#7b7e83` 1.5px border, grey "P" circle (`#8a8d91` stroke, `#d2c8bb` letter). No separators between slots.
    - Entry: Driveway with 8px `#6b6e73` kerbs, guard booth (~56×48) in `#1d1f22` with `#7b7e83` border, ENTRY plate with gold border and arrow, red/white striped barrier arm with top/bottom posts, and painted green arrow at 90% opacity pointing into lot.
    - Guidance Route: Pure bright green (`#00FF00`) trajectory with drop-shadow glow (`rgba(0, 255, 0, 0.45)` at 70% size) matching the WS2812 blinking green target strip LEDs. All route segments share the single `ROUTE_STROKE_WIDTH = 3` token. The pass-over segment running past occupied slots is a dotted green line matching the solid route's stroke width, green, and glow, using round dots (`strokeLinecap="round"`, `strokeDasharray="0.01 6"`, gap = 2 × stroke width = 6px) at 95% opacity, transitioning seamlessly to solid green at the target without offset, gap, or overlap. Target arrival arrowheads, the comet ring, and the comet dot's outer ring use `#00FF00` while the comet center remains white. All red/orange route colors are completely eliminated.

---

## 2. Firmware Source of Truth (`reference/smart_parking.ino`)
All digital twin behaviors must faithfully replicate the physical ESP32 firmware logic:

### Topology & Hardware Pins
- **Parking Slots:** 8 slots total.
  - **Lane 0 (Strip 1):** Slots S1 – S4 (indices `0` to `3`).
  - **Lane 1 (Strip 2):** Slots S5 – S8 (indices `4` to `7`).
- **LED Strips:** 2 × WS2812 strips, 100 pixels each (25 pixels per slot, 4 slots per lane).
  - **Strip 1 Data Pin:** GPIO `23`
  - **Strip 2 Data Pin:** GPIO `15`
- **HC-SR04 Ultrasonic Sensors:**
  - `trigPins[8] = {5, 18, 19, 21, 13, 14, 26, 33}`
  - `echoPins[8] = {4, 17, 16, 22, 12, 27, 25, 32}`

### Sensor Classification & Occupancy
- **Distance Calculation:** `pulseIn(echoPin, HIGH, 30000) * 0.0343 / 2` (integer cm).
- **Timeout:** Defaults to `400 cm` if pulse duration is 0 or exceeds timeout.
- **No Filtering:** Instant raw readings; no debounce or moving averages applied in firmware.
- **Occupancy Condition:** `slotOccupied[i] = (slotDistance[i] < 15)` (`< 15 cm` = Occupied, `≥ 15 cm` = Vacant).

### Main Loop Sequence (~100 ms Cycle)
1. `classifySlots()`: Reads all 8 ultrasonic sensors and updates occupancy.
2. `findTargets()`: Resolves active target slot(s) according to the target selection logic.
3. `stateChanged()`: If initial draw (`needDraw == true`) or any slot occupancy changed, triggers `drawStrips()`.
4. `updateBlink()`: Handles 300 ms target flashing.
5. `server.handleClient()`: Responds to HTTP `GET /status`.
6. `delay(100)`: 100 ms pause before next iteration.

### Target Selection Logic (`findTargets`)
- Calculates `best = min(i % 4)` across **all** vacant slots across **both** lanes (`0..7`).
- Every vacant slot matching that global minimum position `(i % 4 == best)` is marked as a target (`isTarget[i] = true`).
- Ties across lanes (e.g. S1 and S5 both vacant) result in multiple targets blinking simultaneously.

### LED Animation & Sweep Routine (`drawStrips`)
- **Base Fill:**
  - Occupied slots: Solid Red `(255, 0, 0)`.
  - Vacant slots: Dim Green `(0, 200, 0)`.
- **Sequential Sweep:**
  - Calculates `endPixel` for each lane with an active target: `((targetSlot % 4) + 1) * 25 - 1`.
  - Sweeps pixel-by-pixel `(0..99)` at **15 ms per pixel** toward the target end pixel.
  - **Red Preservation Rule:** If a pixel belongs to an occupied slot (`slotOccupied == true`), it is **skipped** (never overwrite red).
  - **Blocking Execution:** The 15 ms/pixel sweep blocks the microcontroller loop; sensors are not sampled during sweep execution.

### Target Blinking (`updateBlink`)
- Interval: Every `300 ms` (`BLINK_MS`).
- Toggles only target zones between Bright Green `(0, 255, 0)` and Off `(0, 0, 0)`.
- Non-target slots remain static (Red or Dim Green).

### Telemetry API Contract
- `GET /status` returns JSON:
  ```json
  {
    "slots": [
      { "occupied": false, "distance": 18 },
      { "occupied": true,  "distance": 8 },
      ...
    ],
    "targets": [0, 4]
  }
  ```

---

## 3. Known Differences & Guidance Modes
- **Discrepancy:** The initial patent proposal / conceptual documentation described independent per-lane vacant slot targeting (each lane guiding toward its own nearest vacant space). However, the actual firmware uses a **global minimum relative position** `(i % 4)` across all 8 slots, which causes tie blinking across lanes.
- **Engine Requirement:** The digital twin simulation engine must support configurable guidance modes:
  1. `mode: 'firmware'` (Default): Exact firmware behavior — global minimum position across all lanes, cross-lane ties both blink.
  2. `mode: 'perLane'` (Improved): Independent selection per lane — Lane 0 and Lane 1 independently target their own respective nearest vacant slot.

---

## 4. Mandatory Project Rules
1. **Simulation Disclaimer:** All sensor measurements, telemetry, and status streams must be explicitly labeled as **SIMULATED** throughout the UI (satisfied by the persistent page-header badges on Overview and Guidance & Hardware).
2. **Privacy & Identity Protection:** **NEVER** include inventor personal details (names, email addresses, phone numbers, signatures, or institutional personal IDs) anywhere in the application code, UI displays, or documentation.
3. **Execution Boundary:** Do not generate application source code until explicitly directed in subsequent tasks.

---

## 5. Typography System & Editorial Hierarchy
The application follows a strict editorial typographic hierarchy:
- **Font Stack (Self-Hosted via Fontsource, Latin Subset, font-display: swap):**
  - **Display Serif (`--font-display`):** Newsreader (weight 500), fallback: `Georgia, serif`.
  - **UI / Body Sans (`--font-ui`):** Hanken Grotesk (weights 400, 500, 600; 400 and 600 preloaded), fallback: `system-ui, -apple-system, sans-serif`.
  - **Data Mono (`--font-data`):** IBM Plex Mono (weights 400, 500), fallback: `ui-monospace, SFMono-Regular, monospace`.
- **Strict Usage Boundaries:**
  - **Display Serif ONLY on:** Page titles (`Overview`, `Guidance & Hardware`), Card titles (`Patent Claim Tracer`, `Digital Twin`, `LED Guidance Strips`, `Fig 3 Redraw`), and the claim title ("Sense, decide, guide, report").
  - **Data Mono ONLY on:** Distances and numeric readouts (cm, ms, % numbers), slot IDs (`S1`–`S8`), pixel & GPIO labels (`GPIO 23`, `GPIO 15`), stat card big numbers (`text-stat-number`), sidebar Sensor Lab inputs, and the "Claim N - Step X of Y" counter.
  - **UI Sans on Everything Else:** Section subtitles, claim tabs, all buttons (Play/Pause, Replay, Reset, Play scenario), badges and status pills (`SIMULATED`, `ESP32 + WS2812`, `REF 103`, `TARGET`, `VACANT`, `OCCUPIED`), live step text, step list text, sidebar nav, Hardware Specs labels, Distance (cm) captions, and helper text.
  - **Letterform & Casing Rules:**
    - Sentence case across all titles, headers, descriptions, and labels.
    - All-caps strictly reserved for tiny 11px status badges (`SIMULATED`, `TARGET`, `VACANT`, `OCCUPIED`) with weight 600 and letter-spacing `0.06em`.
    - No italics used across the interface.
- **Type Scale Tokens:**
  - Page title: Newsreader 500, 40px/1.1 (32px on <768px), letter-spacing -0.02em (`text-page-title`).
  - Card title: Newsreader 500, 24px/1.2, letter-spacing -0.01em (`text-card-title`).
  - Sub-heading: Hanken Grotesk 600, 16px/1.3 (`text-subheading`).
  - Body: Hanken Grotesk 400, 15px/1.6, colour text-2, max line length 65–70ch (`text-body`).
  - Small: Hanken Grotesk 400, 13px/1.5 (`text-small`).
  - Caption: Hanken Grotesk 500, 12px/1.4, colour text-muted (`text-caption`).
  - Stat number: IBM Plex Mono 500, 36px/1 (28px on <768px), tabular-nums, letter-spacing -0.02em (`text-stat-number`).
  - Data inline: IBM Plex Mono 400, 13–14px, tabular-nums (`text-data-inline`).
  - Button text: Hanken Grotesk 600, 14px (`text-button`).

---

## 6. Digital Twin Layout, Live Section Header & Scene Director
- **Live Section Header 3-Row Structure:**
  - **Idle State:** The card header displays the title "Digital Twin Layout - 8 Slot HC-SR04 Mesh" (`font-display`, `text-card-title`, with small green status dot).
  - **Scenario Active State (Playing, Paused, Completed):** The heading disappears and is smoothly replaced in the header slot by the unified liquid-glass live claim box (`glass-g3-float`, `border border-white/[0.08]`, `shadow-glass-g3`):
    - **Row 1:** Claim title with status dot, interactive step progress track (clickable nodes when paused, checkmarks on completed steps, soft pulsating ring on active step), and controls on the right (Play/Pause, Replay, Close). (Note: The legacy "Step X of Y" pill is completely removed).
    - **Row 2:** Number badge (28px gold circle, mono font) and the step caption (`text-[22px] font-ui font-semibold text-text-1 leading-snug line-clamp-2`).
    - **Row 3:** "What you should see: " visual hint (`text-[13.5px] font-ui text-text-2 pl-[38px]`).
    - The step number badge, the pin on the parking lot, and the progress circle always show the exact same number.
- **Scene Director Architecture & Anchors:**
  - **Anchors (`src/scenarios/anchors.ts`):** Single source of truth for positions in 1100×590 lot space, recomputed via `ResizeObserver` on lot/window resize. Names: `slot(Sx).card | bay | sensor | pill | stripSegment`, `strip(1|2).px(n) | y | zone(Sx)`, `column(0..3)`, `gate.booth | arm | stopLine | exit`, `aisle.upperLane | lowerLane | centerLine | band`, `ground.topLeft | bottomLeft`, `lot.bounds`. Derived from `src/features/parking/lotLayout.ts`.
  - **Scene Layer (`SceneOverlay.tsx`):** Single pointer-events-none overlay layer above the lot and beneath the popover drawer, locked to the lot's 1100×590 coordinate space. Renders SVG (62% black spotlight scrim mask with soft 12px radius, gold dashed leader lines, terminal dots) and HTML glass chips (numbered pins, callouts, panels, chips, final claim recap).
  - **Collision-Avoiding Callout Placement (`placement.ts`):** Tests candidate positions on preferred side -> other sides -> `ground.topLeft` -> `ground.bottomLeft`, guaranteed to never collide with any of the 8 slot card rectangles (`S1`–`S8`).
  - **Step Lifecycle Sync Contract:**
    - Step start in ONE animation frame: live caption, hint, number badge, progress circle, pin, callout, spotlight, and first actions begin simultaneously.
    - Actions run as a tree: `seq([...])`, `par([...])`, and `at(ms, action)`.
    - Minimum dwell time: $\ge 3500$ ms. Step completes only when actions have resolved and `dwellMs` has elapsed.
    - Timeout fallback: 12 seconds (`t(12000)`).
    - Clear step-owned overlays (except `persist`), 600 ms gap before next step.
    - Expect assertions: asserts engine occupancy and targets against `step.expect`. Logs error and shows dev-only warning chip on mismatch.
    - Sweep blocking: sensing actions that change occupancy wait if a sweep is running.
    - Jump: when paused, clicking a progress circle restores `claim.startState`, executes `endState()` of every step prior to target step instantly, and holds at the target step.
    - Claim Recap: upon completing the last step, displays glass "Result" chip in `ground.topLeft` with short facts built from live engine state.
- **Controls & Semantics:**
  - `Play/Pause`: Toggles playback. Pausing freezes before starting the next step; running actions complete and hold.
  - `Replay`: Restarts the same claim from step 1 (playing).
  - `Reset`: Restores the claim's start state (`claim.startState`) and waits at step 1, paused, ready to play.
  - `Close`: Full exit. Stops the claim, restores pre-claim user state (`preScenarioDistances` and `preScenarioMode`), unmounts the live section, clears all overlays, and restores the idle title. Triggered by Close button or `Esc` key.
- **Sticky Header Block:** The card header is sticky (`top: 0`) at the top of the main scroll container, with `scroll-margin-top` ensuring that smooth-scrolling to the digital twin never covers the parking slots.

---

## 7. Claim Scenario Pacing & Time Scaling
- **Pacing Source of Truth:** Centralized in [`src/scenarios/pacing.ts`](file:///Users/pavan/Desktop/IOT%20CP/src/scenarios/pacing.ts).
  - `CLAIM_TIME_SCALE = 1.7` (1.0 = baseline speed, > 1.0 = slower).
  - Helper `t(ms) => Math.round(ms * CLAIM_TIME_SCALE)` scales all claim-related durations.
- **Paced Elements During Claim Playback:**
  - Car arrive/leave animations: `t(1200)` (~2040 ms).
  - LED sweep visual in claim playback: 15 ms/pixel becomes ~25.5 ms/pixel (`t(15)`). The physical firmware 15 ms/pixel in `src/engine` and manual sensor interaction remains untouched.
  - Route line draw-in, comet travel (`t(2400)`), pulse rings, transitions, and highlight glows.
  - Minimum dwell per step: `t(1200)` (~2040 ms).
  - Inter-step pause: `t(500)` (~850 ms) so users can comfortably read each caption before the next step starts.
  - Fallback safety timeout: `t(6000)` (~10.2 s).
- **Reduced Motion Support:** Instantaneous transitions and 0 pacing delays under `prefers-reduced-motion: reduce`.

---

## 8. Patent Claim Tracer Scenarios (Claims 2, 5, 12, 7, 9)
The application implements five core patent claim scenarios stored in dedicated modular files (`src/scenarios/claims/claimN.ts`) in exact order:
1. **Claim 2: "Measure the distance"** (Pillar: `Sense`, File: `src/scenarios/claims/claim2.ts`)
   - **One simple line:** "A sensor turns an echo into a distance, and the distance into occupied or vacant."
   - **Imagine:** "A sensor turns an echo into a distance, and the distance into occupied or vacant."
   - **startState:** All 8 vacant `[28, 28, 28, 28, 28, 28, 28, 28]` (expected targets: S1, S5).
2. **Claim 5: "Pick the nearest slot"** (Pillar: `Decide`, File: `src/scenarios/claims/claim5.ts`)
   - **One simple line:** "The system ranks free slots by position and picks the closest one."
   - **Imagine:** "S1, S2 and S5 are taken. Five slots are free."
   - **startState:** S1, S2, S5 occupied; others vacant `[8, 8, 28, 28, 8, 28, 28, 28]` (expected target: S6).
   - **Sequence:** 5 steps (candidate glow on free slots, column position ranking Pos 0..3, dimming distant slots S3/S7/S4/S8 to 45%, S6 wins target, sweep on strip 2 to S6).
3. **Claim 12: "Follow the lights"** (Pillar: `Guide`, File: `src/scenarios/claims/claim12.ts`)
   - **One simple line:** "Lights switch on one after another and lead the driver. No app needed."
   - **Imagine:** "A car enters and only follows the green lights."
   - **startState:** S1, S2, S3, S5, S6 occupied; S4, S7, S8 vacant `[8, 8, 8, 28, 8, 8, 28, 28]` (expected target: S7 at position 2). Barrier arm down, booth status light amber. `deferSweepVisual` on until step 3.
   - **Expected Targets:** S7 until step 5, then S4 and S8 (tie at position 3) from step 5.
   - **Sequence (6 Steps):** Entry car slides in, gate lifts; scan identifies S7; sweep to S7; car follows lights; car reverses into S7; no-app badge appears.
4. **Claim 7: "Change the plan"** (Pillar: `Adapt`, File: `src/scenarios/claims/claim7.ts`)
   - **One simple line:** "If the chosen slot is taken, the system picks a new one."
   - **Imagine:** "A driver is heading to S2, but another car parks there first."
   - **startState:** S1, S5, S6, S7 occupied; S2, S3, S4, S8 vacant `[8, 28, 28, 28, 8, 8, 8, 28]` (expected target: S2).
   - **deferSweepVisual:** On until step 1 plays the sweep.
   - **Sequence (5 Steps):** Driver enters toward S2; intruder steals S2; sensor detects intruder and recalculates; new target S3 chosen; sweep reroutes driver to S3.
5. **Claim 9: "Report to the dashboard"** (Pillar: `Report`, File: `src/scenarios/claims/claim9.ts`)
   - **One simple line:** "Occupancy and the target are sent over Wi-Fi to the dashboard."
   - **Imagine:** "Occupancy and the target are sent over Wi-Fi to the dashboard."
   - **startState:** S1, S5, S6 occupied `[8, 28, 28, 28, 8, 8, 28, 28]` (expected target: S2).
*(Note: Claim 1 has been completely removed from tabs, scenarios, and tests).*

---

## 9. Patent Fig 3 Redraw & Simplified Inspector
- **Architecture Diagram (`PatentArchitectureSvg`):**
  - Interactive SVG redraw of patent Fig 3 (hardware & wiring topology).
  - Single wrapper `<g id="diagram-zoom-wrapper">` for zoom and pan (`scale` and `translate`) containing component blocks and wires only, leaving individual component block transforms (`hotspot-101` .. `hotspot-108`) fixed and untouched.
  - Zoom range: 100% to 300% (step 25%).
  - Zoom controls toolbar positioned outside the figure box at the right end of the hotspot bar below the figure, on the same row as the 101–108 chips, right-aligned with 16px spacing (`gap-4`). The chips wrap to a second line before the controls shrink. Features 32px Level 3 raised round buttons: Zoom out (-), Zoom percentage readout, Zoom in (+), Fit (reset to 100%), Focus (zoom to selected component).
  - Multi-input interactions: Ctrl/Cmd + wheel (zoom toward cursor without hijacking normal scroll), touch pinch-to-zoom, double-click to zoom into component, keyboard shortcuts (`+`, `-`, `0`, and Arrow keys to pan when zoomed).
  - Drag-to-pan when `zoom > 1.0` with `grab`/`grabbing` cursor, clamped so the drawing never leaves the frame. Drag does not trigger numeral click, and numeral clicks do not start a pan. Zoom resets to 100% when leaving the page.
  - Unscaled overlay layer (`diagram-overlay-layer`): Numeral bubbles (101-108), leader lines, and component name chips are rendered in a separate unscaled overlay layer outside `<g id="diagram-zoom-wrapper">`. Screen positions are dynamically computed from the zoom matrix: `anchorScreen = (anchor.x * k + tx, anchor.y * k + ty)` and `bubbleScreen = anchorScreen + (dx, dy)`. Leader lines are drawn from `anchorScreen` to the bubble rim (`leaderEdge`). Bubbles are clamped at least 18px inside the frame; if an anchor is off-screen, the bubble pins to the nearest edge with leader pointing toward the component, fading out if >120px away.
  - All wiring paths retain stroke width on screen via `vectorEffect="non-scaling-stroke"`.
- **Component Name Chip & Collision-Free Placement:**
  - Displayed outside every component in clear space next to its numeral bubble with a small leader line, 11px font, dark fill, 1px gold border.
  - Rendered on hover, focus, and selection without covering any component, text, or wire at any zoom level, computed in screen coordinates.
  - Preference order: 101 above, 102 above, 103 above, 106 above, 107 above, 104 below, 105 below, 108 below (fallback: opposite, left, right; clamped).
  - "PARKING SLOTS (101)" title placed in the clear top margin of `hotspot-101` (`x="14" y="22"`) eliminating overlap with HC-SR04 Slot 8.
- **Simplified Info Panel (`componentInfo.ts`):**
  - Displays selected component reference with REF badge, title, subtitle, and 4 sections:
    1. "What it is": one short line
    2. "What it does": 2-3 bullets (<= 12 words per bullet)
    3. "In ParkWay": 2 bullets about this project (<= 12 words per bullet)
    4. "Technical": compact label-value rows (label in `text-2`, value in mono font `text-stat-number` / `font-data`, right-aligned, 12px), taken from simulation firmware and referencing engine constants
  - Internal vertical scrolling (`overflow-y-auto pr-1`) so numerals with many rows scroll cleanly while outer panel size remains constant.
  - Smooth fade/slide transition on selection change with stable container height and top alignment.
  - Eliminates description paragraph, patent role box, live telemetry table, SIMULATED badge inside panel, and bottom hint box.
---

## 10. Scenario Animation Toolkit (`src/scenarios/fx`) & Runner Common Rules
The application includes a modular animation toolkit in `src/scenarios/fx` designed for high-fidelity claim playback (Claims 1, 5, 7, 12).

### FX Toolkit Architecture
All effects return a `Promise<void>` that resolves when completed and register cancellation handlers via `registerCancelHandler()` for immediate teardown on Replay, Pause, or Close.
- `sonar(slotOrAll, { stagger, duration, tone, onPulseReturn })`: Emits expanding circular sonar wavefronts toward the slot bay with sensor rim glowing `info-blue` (`#6FB8D6`).
- `readout(slot, cm, tone, { persist, animateCount })`: Displays a floating mono glass bubble above the sensor (`28 cm` green, `8 cm` red) with spring pop-in and smooth numeric countdown.
- `pill(slot, state)`: Performs a 250 ms 3D flip (`rotateX: [0, 90, 0]`) to update slot status badge between `VACANT`, `OCCUPIED`, and `TARGET`.
- `ledFill(strip, fromPx, toPx, colour, msPerPx)`: Progressively colors an LED strip zone pixel by pixel on the visual overlay.
- `sweep(strip, toPx, { skipOccupied, onPixel })`: Plays the physical firmware green sweep on the visual strip at scaled speed (`t(15)` ms/px), respecting the Red Preservation Rule (skipping occupied red pixels), and triggering 300 ms target blinking on completion.
- `route(lane, targetSlot, { persist, cometProgress })`: Draws the guidance route trajectory with dotted bypass lines past occupied bays and solid green lines to the target.
- `targetRing(slots)`: Draws a glowing gold circular contour (`#E0A84B`) around the target slot card with breathing pulse animation.
- `scan({ columns, stopAtFirstFree })`: Sweeps a vertical translucent scan band across columns 0 to 3, flashing red crosses on occupied bays and green checks on vacant bays.
- `chip(anchor, text, icon, options)`: Places a floating G3 glass label using collision-avoidance geometry (slots, coords, or entry ground area).
- `dim(slots, level)` / `undim(slots, durationMs)`: Applies non-target candidate dimming down to 45% (or custom) opacity and smooth restoration.
- `haloCandidates(slots, { stagger, persist })`: Soft green breathing halo around candidate slot cards (1.6 s loop).
- `positionRuler({ persist })`: Painted measuring ticks along both aisle edges with labels "Pos 0", "Pos 1", "Pos 2", "Pos 3" and an "Entrance" flag at the left, plus faint vertical column bands over the lot.
- `measureArrow({ dwellPerColumn })`: An arrow extending from the gate across the aisle centre line, pausing at each position tick.
- `rankBadge(slot, text, { strikeP, persist })`: Small glass pill inside the slot ("Pos 2 - farther", "Pos 3 - farthest") near the P circle, with an optional subtle red strike line across the P circle.
- `car`: Provides `arrive(slot)`, `leave(slot)`, `enter()`, `driveTo(point)`, and `reverseInto(slot)` for vehicle kinematics.
- `entryCar(options)`: Spawns and animates claim-only blue vehicle sliding from entry driveway to stop line with illuminated headlights.
- `followCar(routePath, options)`: Drives vehicle along navigation corridor with dynamic trailing green wheel-path glow and deceleration brake lights.
- `phoneBadge(options)`: Renders entry-area glass pill badge with animated strikethrough vector slash ("No app needed").
- `pathGhost(options)`: Draws transient dashed historic transit path from gate through aisle to destination bay.
- `barrier`: Coordinates `lift()` and `lower()` on the entry gate arm with synchronized LED indicator state (amber/green/red) and ENTRY sign illumination.
- `dashboardCard(data)`: Displays a floating glass telemetry mini-card in the entrance ground area with outward-pulsing Wi-Fi waves and counting digits.
- `statCardsPulse()`: Ripples a sequential highlight pulse across Overview telemetry stat cards.
- `deferSweepVisual(defer)`: Visual-layer flag; when `true`, disables automatic background sweep redraws to let scenario steps explicitly control visual sweep progression without altering engine logic.

### Scenario Runner Common Rules
1. **Scaled Pacing via `t()`:** All base durations are passed through `t(ms)` using `CLAIM_TIME_SCALE = 1.7`. Under `prefers-reduced-motion: reduce`, animations resolve immediately while honoring step minimum dwells.
2. **Single-Frame Synchronization:** Step caption, hint, number badge, progress track, and primary visual actions trigger in the exact same render frame.
3. **Step Completion & Gap:** A step only completes when **all** active effect promises have resolved **and** its minimum dwell has elapsed. A 500 ms inter-step gap (`t(500)`) elapses before step N+1 begins.
4. **Overlay Cleanup:** All non-persisted FX overlays (chips, rings, readouts, dimming) are automatically cleared on transition to step N+1.
5. **Safety Timeout:** Each step enforces a 10-second safety fallback timeout (`t(10000)`).
6. **Playback State Transitions:**
   - **Pause:** Freezes playback before advancing to the next step; ongoing actions complete and hold.
   - **Replay:** Immediately cancels all active effects (`cancelAllActiveFx()`), cleans up all overlays (`clearAllFx()`), and restores initial start state.
   - **Close:** Cancels all active effects, cleans up all overlays, and restores pre-claim user distances and guidance modes.
7. **Automated Sync Checks:** At the conclusion of every step, the runner asserts engine occupancy and target arrays against `expectedState`. Discrepancies log a console error for rapid diagnostic validation.

---

## 9. Deployment Analytics Engine & Operational Model
- **Route:** `/analytics` (lazy-loaded via React Suspense)
- **Role:** Operational management interface showing what a real parking operator observes after months of live ParkWay deployment on site.
- **Synthetic Data & Assumption-Based Rule (Strict):**
  - All metrics, charts, timeseries, and aggregates on this page are **SYNTHETIC DATA** derived from mathematical models and calibrated assumptions.
  - The page header carries persistent badges: `"SYNTHETIC DATA"` (gold) and `"Assumption-based model"` (info).
  - Every card, chart shell, and stat module must include a visible `"synthetic"` marker badge. Nothing on the page may be presented as unverified measured field data.
- **Data Engine Architecture (`src/analytics/`):**
  - **Web Worker (`worker/generate.worker.ts`):** Offloads multi-month Poisson simulations off the UI thread to guarantee 60fps responsiveness.
  - **Deterministic Seeded PRNG (`rng.ts`):** Mulberry32 generator seeded by `hash(preset + range + version)` ensures identical inputs always produce identical results.
  - **Facility Presets (`presets.ts`):**
    - *Mall 480:* 6 zones × 80 slots, weekend & evening peaks, median dwell 95 min, festival event surges.
    - *Office campus 320:* 4 zones × 80 slots, weekday morning arrival & evening departure rushes, 8.5h dwell, quiet weekends.
    - *Hospital 240:* 3 zones × 80 slots, steady daytime clinics with night emergency base, bimodal dwell (35 min outpatient / 6h stays).
    - *Airport short-stay 600:* 5 zones × 120 slots, 3-4h flight wave surges, multiday dwell (6-72h).
  - **Firmware Allocation Logic:** Arriving vehicles are assigned to the lowest available position index (0 before 1 before 2 before 3) within each 8-slot node, strictly replicating firmware slot priority and creating an entrance proximity utilization gradient.
  - **Sensor Fleet Diagnostics:** Seeded fault schedule simulates stuck, disconnected (400 cm), noisy, and intermittent timeout sensors.
  - **Virtual Sensor Day Sampling:** `generateSensorDay(sensorId, day, mode)` generates 86,400 one-per-second readings on demand; raw data is not retained in memory.
  - **Client Caching (`cache.ts`):** IndexedDB database (`parkway_analytics_db`) caches computed aggregates for instant reloads.
- **Search-Time & Economic Model (`model.ts`):**
  - Baseline search: $T_0(\rho) = \max(t_{\text{Floor}}, T_{50} \cdot \exp(k \cdot (\rho - 0.5)))$
  - Guided search: $T_1(\rho) = t_{\text{Base}} + t_{\text{Slope}} \cdot \rho$
  - Compliance $c$, cruise speed, fuel burn rate, CO2 petrol factor (2.31 kg/L), fuel cost, abandonment probability $p_{\text{Ab}} = \text{clamp}((T - 180)/1200, 0, 0.25)$, and Capex payback amortization.
- **Assumptions Drawer (`AssumptionsDrawer.tsx`):**
  - Glass side drawer allowing operators to calibrate all mathematical assumptions and the ₹1,420/slot capex breakdown with 150 ms debounce.
  - Visible caution banner: *"Defaults are illustrative assumptions, not measured results. Replace them with site measurements before relying on any figure."*
- **KPI Strip (`KpiStrip.tsx`):**
  - 8 liquid-glass stat cards: Avg search time (guided vs baseline), Distance saved, Fuel saved, CO2 avoided, Peak occupancy, Avg turnover, Sensor uptime, and Estimated payback.

---

## 10. Analytics Charts & High-Density Visualizations
- **Styling & Theme:** Built with G3 liquid glass, dark glass tooltips (`ChartGlassTooltip`), accessible data tables ("View as table" toggle on every chart card), `text-1` headings, `12px` axis labels at `text-3` (contrast $\ge 4.5:1$), and reduced motion compliance (`isAnimationActive={!shouldReduceMotion}`).
- **Color Palette Tokens:**
  - Gold (`#E0A84B`): Primary series, targets, occupancy profile, hours saved.
  - Green (`#5FD08A`): Guided search time, free bays, fuel savings, healthy sensors.
  - Red (`#EF6B6B`): Baseline search time, occupied bays, peak markers, critical capacity, dead/suspect sensors.
  - Info Blue (`#6FB8D6`): CO₂ avoided, long stays, secondary telemetry series.
- **Card Shell Standard (`ChartCardShell.tsx`):**
  - Serif title (`Newsreader 500`), one-line "What this tells the operator", chart / accessible table toggle, and a dynamic "So what:" footer sentence generated from live simulation numbers.
- **12-Column Responsive Layout:**
  - **Occupancy Timeline (8 wide)** + **Demand Heatmap (4 wide)**
  - **Search Time: With Guidance vs Without (12 wide)**
  - **Savings Over Time (6 wide)** + **Zone & Position Utilisation (6 wide)**
  - **Facility Slot Map & Diurnal Time-Lapse (12 wide)**
  - **Dwell Duration & Bay Turnover (12 wide)**
  - Automatically stacks to a single column under 1024px.
- **Chart Implementations:**
  1. **Occupancy Timeline (`OccupancyTimelineChart.tsx`):** Recharts Area chart with zoom brush, 100% capacity line, 85% warning band (gold), 95% critical band (red), 24h / 7d / 30d / 90d view range switcher, zone filtering, and peak congestion marker dots.
  2. **Demand Heatmap (`DemandHeatmapChart.tsx`):** High-DPI Canvas 7×24 day-of-week by hour matrix with sequential scale (`#1A1714` $\to$ `#5FD08A` $\to$ `#E0A84B` $\to$ `#EF6B6B`), exact breakpoint legend, row & column averages, busiest cell annotation, in-cell values on wide viewports, and cell hover tooltips.
  3. **Search Time Comparison (`SearchTimeComparisonChart.tsx`):** Line chart comparing mean search time across 50% to 100% occupancy in 5% steps (guided vs baseline with shaded reduction at 90%), coupled with overlaid 10s-bin histograms up to 600s with p50/p90/p99 reference lines, percentiles summary table, and "All sessions" vs "Peak hours only" toggle.
  4. **Savings Over Time (`SavingsOverTimeChart.tsx`):** Cumulative area chart with metric switcher (Fuel Saved in L, CO₂ Avoided in kg, Driver-Hours Saved in h), alongside side stats for "Abandoned visits avoided" and "Revenue protected (₹)".
  5. **Zone & Position Utilisation (`ZoneUtilisationChart.tsx`):** Bar chart of mean utilisation per zone with peak overlay markers and click-to-filter interaction; lower section displays position 0..3 bucket bars demonstrating firmware entrance-proximity skew with live Gini coefficient calculation (`Utilisation skew (Gini) = 0.xx`).
  6. **Facility Slot Map & Time-Lapse (`SlotMapChart.tsx`):** High-performance Canvas virtualized slot map supporting up to 600 slots at 60fps grouped by zone. Features dual color modes (overall utilisation % vs state at time $t$), interactive time-lapse scrubber slider with play/pause and 1x/10x/60x speeds, slot hover tooltips, click popovers with 30-day occupied-minutes sparkline and sensor health, dotted red outlines on dead slots (<2% utilisation), and a sorted dead-slot audit table with suspect fault schedule matching.
  7. **Dwell Duration & Bay Turnover (`DwellTurnoverChart.tsx`):** Log-spaced dwell histogram with short (<30m), medium (30m–4h), and long (>4h) stay percentage splits; line chart of turnover velocity (sessions/bay/day) across 168 weekly hours; and "Slot-hours lost to overstay" KPI card.

