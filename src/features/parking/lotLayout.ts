// ============================================================================
// PARKWAY LOT LAYOUT CONSTANTS & GEOMETRY
// Single source of truth for the 1100x590 design coordinate system.
// ============================================================================

export const LOT_DESIGN_WIDTH = 1100;
export const LOT_DESIGN_HEIGHT = 590;

export const ENTRY_ZONE_WIDTH = 324;
export const SLOT_WIDTH = 190;
export const SLOT_HEIGHT = 232;
export const SLOT_GAP = 0;
export const START_X = 324; // 324..1084 spans the 4 slot columns
export const TOTAL_STRIP_WIDTH = SLOT_WIDTH * 4; // 760px

export const UPPER_ROW_Y = 0;
export const LANE0_LED_Y = 232; // Strip 1
export const AISLE_HEIGHT = 126;
export const ENTRANCE_Y = LANE0_LED_Y + Math.round(AISLE_HEIGHT / 2); // 295 (aisle centre line)
export const LANE1_LED_Y = LANE0_LED_Y + AISLE_HEIGHT; // 358 (Strip 2)
export const LOWER_ROW_Y = LANE1_LED_Y; // 358..590

export const GATE_EXIT_X = 222;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Returns slot card bounding box in 1100x590 lot coordinates.
 * S1..S4 are in Lane 0 (top row, y=0), indices 0..3.
 * S5..S8 are in Lane 1 (bottom row, y=358), indices 4..7.
 */
export function getSlotCardRect(slotNumOrId: number | string): Rect {
  const num = typeof slotNumOrId === 'string'
    ? parseInt(slotNumOrId.replace(/\D/g, ''), 10)
    : slotNumOrId;
  const idx = Math.max(0, Math.min(7, num - 1));
  const lane = idx < 4 ? 0 : 1;
  const col = idx % 4;

  const x = START_X + col * (SLOT_WIDTH + SLOT_GAP);
  const y = lane === 0 ? UPPER_ROW_Y : LOWER_ROW_Y;

  return { x, y, width: SLOT_WIDTH, height: SLOT_HEIGHT };
}

/**
 * Returns parking bay floor inside the slot card.
 */
export function getSlotBayRect(slotNumOrId: number | string): Rect {
  const card = getSlotCardRect(slotNumOrId);
  return {
    x: card.x + 2,
    y: card.y + 2,
    width: card.width - 4,
    height: card.height - 4,
  };
}

/**
 * Returns ultrasonic sensor rectangle on far wall.
 */
export function getSlotSensorRect(slotNumOrId: number | string): Rect {
  const card = getSlotCardRect(slotNumOrId);
  const num = typeof slotNumOrId === 'string'
    ? parseInt(slotNumOrId.replace(/\D/g, ''), 10)
    : slotNumOrId;
  const idx = Math.max(0, Math.min(7, num - 1));
  const lane = idx < 4 ? 0 : 1;

  const sensorW = 52;
  const sensorH = 18;
  const sensorX = card.x + (card.width - sensorW) * 0.5;
  const sensorY = lane === 0 ? card.y + 6 : card.y + card.height - 6 - sensorH;

  return { x: sensorX, y: sensorY, width: sensorW, height: sensorH };
}

/**
 * Returns status pill rectangle on aisle edge.
 */
export function getSlotPillRect(slotNumOrId: number | string): Rect {
  const card = getSlotCardRect(slotNumOrId);
  const num = typeof slotNumOrId === 'string'
    ? parseInt(slotNumOrId.replace(/\D/g, ''), 10)
    : slotNumOrId;
  const idx = Math.max(0, Math.min(7, num - 1));
  const lane = idx < 4 ? 0 : 1;

  const pillW = Math.round(card.width * 0.44);
  const pillH = 18;
  const pillX = card.x + (card.width - pillW) * 0.5;
  const pillY = lane === 0 ? card.y + card.height - pillH - 7 : card.y + 7;

  return { x: pillX, y: pillY, width: pillW, height: pillH };
}

/**
 * Returns strip segment corresponding to a slot (25 pixels).
 */
export function getSlotStripSegmentRect(slotNumOrId: number | string): Rect {
  const card = getSlotCardRect(slotNumOrId);
  const num = typeof slotNumOrId === 'string'
    ? parseInt(slotNumOrId.replace(/\D/g, ''), 10)
    : slotNumOrId;
  const idx = Math.max(0, Math.min(7, num - 1));
  const lane = idx < 4 ? 0 : 1;
  const stripY = lane === 0 ? LANE0_LED_Y : LANE1_LED_Y;

  return {
    x: card.x,
    y: stripY,
    width: SLOT_WIDTH,
    height: 12,
  };
}

/**
 * Returns column bounding box (0..3).
 */
export function getColumnRect(col: number): Rect {
  const clamped = Math.max(0, Math.min(3, col));
  return {
    x: START_X + clamped * (SLOT_WIDTH + SLOT_GAP),
    y: 0,
    width: SLOT_WIDTH,
    height: LOT_DESIGN_HEIGHT,
  };
}

/**
 * Strip pixel rectangle.
 */
export function getStripPixelRect(stripN: 1 | 2, px: number): Rect {
  const clampedPx = Math.max(0, Math.min(99, px));
  const stripY = stripN === 1 ? LANE0_LED_Y : LANE1_LED_Y;
  const pxWidth = TOTAL_STRIP_WIDTH / 100;
  return {
    x: START_X + clampedPx * pxWidth,
    y: stripY,
    width: pxWidth,
    height: 12,
  };
}
