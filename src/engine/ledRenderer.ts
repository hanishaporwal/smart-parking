import {
  NUM_SLOTS,
  PIXELS_PER_STRIP,
  PIXELS_PER_SLOT,
  SLOTS_PER_STRIP,
  NUM_STRIPS,
  RgbColor,
  COLOR_RED,
  COLOR_GREEN,
  COLOR_DIM,
  COLOR_OFF,
  LedStrip,
  LedFrame,
  SlotState,
} from './types';

/**
 * Creates an empty LED strip initialized to COLOR_OFF.
 */
export function createEmptyStrip(): LedStrip {
  const strip: LedStrip = [];
  for (let i = 0; i < PIXELS_PER_STRIP; i++) {
    strip.push({ ...COLOR_OFF });
  }
  return strip;
}

/**
 * Creates an empty 2-strip frame.
 */
export function createEmptyFrame(): LedFrame {
  return [createEmptyStrip(), createEmptyStrip()];
}

/**
 * Clones a 2-strip frame.
 */
export function cloneFrame(frame: LedFrame): LedFrame {
  return [
    frame[0].map(c => ({ ...c })),
    frame[1].map(c => ({ ...c })),
  ];
}

/**
 * Checks if two colors are identical.
 */
export function isColorEqual(c1: RgbColor, c2: RgbColor): boolean {
  return c1.r === c2.r && c1.g === c2.g && c1.b === c2.b;
}

/**
 * Fills a slot's 25 pixels on its respective lane.
 */
export function fillSlotZone(frame: LedFrame, slotIndex: number, color: RgbColor): void {
  const lane = Math.floor(slotIndex / SLOTS_PER_STRIP);
  const start = (slotIndex % SLOTS_PER_STRIP) * PIXELS_PER_SLOT;
  for (let p = 0; p < PIXELS_PER_SLOT; p++) {
    frame[lane][start + p] = { ...color };
  }
}

/**
 * Computes target end pixel indices for both lanes:
 * endPixel = ((targetSlot % 4) + 1) * 25 - 1.
 * Returns [-1, -1] if no target on a lane.
 */
export function calculateEndPixels(slots: SlotState[]): [number, number] {
  const endPixel: [number, number] = [-1, -1];
  for (let i = 0; i < NUM_SLOTS; i++) {
    if (slots[i].isTarget) {
      const lane = Math.floor(i / SLOTS_PER_STRIP);
      const pos = i % SLOTS_PER_STRIP;
      endPixel[lane] = (pos + 1) * PIXELS_PER_SLOT - 1;
    }
  }
  return endPixel;
}

/**
 * Builds the initial base frame as defined in firmware drawStrips():
 * - Occupied slots: Solid Red (255, 0, 0)
 * - Vacant slots: Dim Green (0, 200, 0)
 */
export function buildBaseFrame(slots: SlotState[]): LedFrame {
  const frame = createEmptyFrame();
  for (let i = 0; i < NUM_SLOTS; i++) {
    fillSlotZone(frame, i, slots[i].occupied ? COLOR_RED : COLOR_DIM);
  }
  return frame;
}

/**
 * Builds a frame corresponding to a sweep step up to pixel `currentPixel` (0..99).
 * Strictly enforces firmware Red Preservation:
 * "if (slotOccupied[slotOfPixel]) continue; // never overwrite red"
 */
export function buildSweepFrame(
  baseFrame: LedFrame,
  slots: SlotState[],
  currentPixel: number,
  endPixels: [number, number],
): LedFrame {
  const frame = cloneFrame(baseFrame);
  const clampedPixel = Math.min(PIXELS_PER_STRIP - 1, Math.max(0, currentPixel));

  for (let p = 0; p <= clampedPixel; p++) {
    for (let l = 0; l < NUM_STRIPS; l++) {
      if (p > endPixels[l]) continue;
      const slotOfPixel = l * SLOTS_PER_STRIP + Math.floor(p / PIXELS_PER_SLOT);
      if (slots[slotOfPixel].occupied) {
        continue; // Red preservation rule
      }
      frame[l][p] = { ...COLOR_GREEN };
    }
  }

  return frame;
}

/**
 * Applies 300 ms target flashing to an existing frame as in firmware updateBlink().
 * Only modifies target slots (toggles between COLOR_GREEN and COLOR_OFF).
 * Non-target slots remain completely untouched.
 */
export function applyBlinkToFrame(
  currentFrame: LedFrame,
  slots: SlotState[],
  blinkOn: boolean,
): LedFrame {
  const frame = cloneFrame(currentFrame);
  for (let i = 0; i < NUM_SLOTS; i++) {
    if (slots[i].isTarget) {
      fillSlotZone(frame, i, blinkOn ? COLOR_GREEN : COLOR_OFF);
    }
  }
  return frame;
}

/**
 * Generates the complete post-sweep frame with blink phase applied.
 */
export function buildCompletedFrame(slots: SlotState[], blinkOn = true): LedFrame {
  const baseFrame = buildBaseFrame(slots);
  const endPixels = calculateEndPixels(slots);
  const maxEndPixel = Math.max(endPixels[0], endPixels[1]);

  let sweptFrame = baseFrame;
  if (maxEndPixel >= 0) {
    sweptFrame = buildSweepFrame(baseFrame, slots, maxEndPixel, endPixels);
  }

  return applyBlinkToFrame(sweptFrame, slots, blinkOn);
}
