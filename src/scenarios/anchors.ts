// ============================================================================
// PARKWAY ANCHOR SYSTEM (src/scenarios/anchors.ts)
// Single source of truth for positions in the lot coordinate system.
// Recomputed with ResizeObserver on lot/window changes (no cached stale values).
// ============================================================================

import {
  Rect,
  LOT_DESIGN_WIDTH,
  LOT_DESIGN_HEIGHT,
  START_X,
  TOTAL_STRIP_WIDTH,
  LANE0_LED_Y,
  LANE1_LED_Y,
  AISLE_HEIGHT,
  ENTRANCE_Y,
  getSlotCardRect,
  getSlotBayRect,
  getSlotSensorRect,
  getSlotPillRect,
  getSlotStripSegmentRect,
  getColumnRect,
  getStripPixelRect,
} from '@/features/parking/lotLayout';

export type { Rect };

// Listeners for anchor recomputation
const listeners = new Set<() => void>();

export function subscribeAnchors(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

let observer: ResizeObserver | null = null;
let observedElement: HTMLElement | null = null;

export function registerAnchorElement(el: HTMLElement | null) {
  if (typeof window === 'undefined') return;
  if (observedElement === el) return;

  if (observer) {
    observer.disconnect();
    observer = null;
  }

  observedElement = el;

  if (el && typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => {
      notifyListeners();
    });
    observer.observe(el);
  }
}

// Window resize listener
if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    notifyListeners();
  });
}

function notifyListeners() {
  listeners.forEach(cb => {
    try {
      cb();
    } catch (e) {
      console.error('Error in anchor subscriber:', e);
    }
  });
}

/**
 * Resolves an anchor name to a rectangle in 1100x590 lot coordinates.
 */
export function getAnchor(name: string): Rect {
  const trimmed = name.trim();

  // lot.bounds
  if (trimmed === 'lot.bounds') {
    return { x: 0, y: 0, width: LOT_DESIGN_WIDTH, height: LOT_DESIGN_HEIGHT };
  }

  // ground.topLeft | bottomLeft
  if (trimmed === 'ground.topLeft') {
    return { x: 12, y: 12, width: 290, height: 216 };
  }
  if (trimmed === 'ground.bottomLeft') {
    return { x: 12, y: 362, width: 290, height: 216 };
  }

  // gate.booth | arm | stopLine | exit
  if (trimmed === 'gate.booth') {
    return { x: 142, y: 262, width: 56, height: 48 };
  }
  if (trimmed === 'gate.arm') {
    return { x: 206, y: 266, width: 4, height: 58 };
  }
  if (trimmed === 'gate.stopLine') {
    return { x: 202, y: 264, width: 4, height: 62 };
  }
  if (trimmed === 'gate.exit') {
    return { x: 222, y: LANE0_LED_Y, width: 102, height: AISLE_HEIGHT };
  }
  if (trimmed === 'gate') {
    return { x: 142, y: 262, width: 80, height: 60 };
  }
  if (
    trimmed === 'the car' ||
    trimmed === 'car' ||
    trimmed === 'driver car' ||
    trimmed === 'driverCar'
  ) {
    return { x: 420, y: 280, width: 60, height: 32 };
  }
  if (
    trimmed === 'intruder car' ||
    trimmed === 'intruder' ||
    trimmed === 'intruderCar'
  ) {
    return { x: 609, y: 116, width: 60, height: 80 };
  }
  if (trimmed === 'loopTape' || trimmed === 'loop tape' || trimmed === 'the loop tape') {
    return { x: 16, y: 405, width: 285, height: 75 };
  }

  // aisle.upperLane | lowerLane | centerLine | band
  if (trimmed === 'aisle.upperLane') {
    return { x: 222, y: LANE0_LED_Y, width: LOT_DESIGN_WIDTH - 222, height: Math.round(AISLE_HEIGHT / 2) };
  }
  if (trimmed === 'aisle.lowerLane') {
    return { x: 222, y: ENTRANCE_Y, width: LOT_DESIGN_WIDTH - 222, height: Math.round(AISLE_HEIGHT / 2) };
  }
  if (trimmed === 'aisle.centerLine') {
    return { x: 222, y: ENTRANCE_Y - 1, width: LOT_DESIGN_WIDTH - 222, height: 2 };
  }
  if (trimmed === 'aisle.band') {
    return { x: 222, y: LANE0_LED_Y, width: LOT_DESIGN_WIDTH - 222, height: AISLE_HEIGHT };
  }

  // Inspector anchors
  const inspMatch = trimmed.match(/^inspector[\.\s]?(panel|sensor|timer|threshold|floor|car)?$/i);
  if (inspMatch) {
    const part = (inspMatch[1] || 'panel').toLowerCase();
    switch (part) {
      case 'sensor':
        return { x: 520, y: 55, width: 60, height: 35 };
      case 'timer':
        return { x: 670, y: 120, width: 110, height: 260 };
      case 'threshold':
        return { x: 340, y: 220, width: 340, height: 24 };
      case 'floor':
        return { x: 340, y: 350, width: 340, height: 30 };
      case 'car':
        return { x: 420, y: 300, width: 180, height: 80 };
      case 'panel':
      default:
        return { x: 286, y: 35, width: 528, height: 484 };
    }
  }
  if (trimmed === 'the inspector' || trimmed === 'inspector') {
    return { x: 286, y: 35, width: 528, height: 484 };
  }
  if (trimmed === 'the threshold line' || trimmed === 'threshold line' || trimmed === 'the 15 cm threshold line') {
    return { x: 340, y: 220, width: 340, height: 24 };
  }
  if (trimmed === 'the echo timer' || trimmed === 'echo timer') {
    return { x: 670, y: 120, width: 110, height: 260 };
  }
  if (trimmed === 'inspector floor area') {
    return { x: 340, y: 350, width: 340, height: 30 };
  }
  if (trimmed === 'sideCar position') {
    return { x: 420, y: 300, width: 180, height: 80 };
  }

  // column(0..3)
  const colMatch = trimmed.match(/^column\((\d+)\)$/i);
  if (colMatch) {
    const col = parseInt(colMatch[1], 10);
    return getColumnRect(col);
  }

  // slot(Sx).card | bay | sensor | pill | stripSegment
  const slotMatch = trimmed.match(/^slot\(([sS]?\d+)\)\.(card|bay|sensor|pill|stripSegment)$/i);
  if (slotMatch) {
    const slotId = slotMatch[1];
    const part = slotMatch[2].toLowerCase();

    switch (part) {
      case 'card':
        return getSlotCardRect(slotId);
      case 'bay':
        return getSlotBayRect(slotId);
      case 'sensor':
        return getSlotSensorRect(slotId);
      case 'pill':
        return getSlotPillRect(slotId);
      case 'stripsegment':
        return getSlotStripSegmentRect(slotId);
    }
  }

  // strip(1|2).px(n) | y | zone(Sx) or bare strip(1|2)
  const bareStripMatch = trimmed.match(/^strip\s*\(([12])\)$/i);
  if (bareStripMatch) {
    const stripN = parseInt(bareStripMatch[1], 10) as 1 | 2;
    const y = stripN === 1 ? LANE0_LED_Y : LANE1_LED_Y;
    return { x: START_X, y, width: TOTAL_STRIP_WIDTH, height: 12 };
  }

  const stripMatch = trimmed.match(/^strip\(([12])\)\.(px\((\d+)\)|y|zone\(([sS]?\d+)\))$/i);
  if (stripMatch) {
    const stripN = parseInt(stripMatch[1], 10) as 1 | 2;
    const sub = stripMatch[2];

    if (sub === 'y') {
      const y = stripN === 1 ? LANE0_LED_Y : LANE1_LED_Y;
      return { x: START_X, y, width: TOTAL_STRIP_WIDTH, height: 12 };
    }

    const pxMatch = sub.match(/^px\((\d+)\)$/i);
    if (pxMatch) {
      const px = parseInt(pxMatch[1], 10);
      return getStripPixelRect(stripN, px);
    }

    const zoneMatch = sub.match(/^zone\(([sS]?\d+)\)$/i);
    if (zoneMatch) {
      return getSlotStripSegmentRect(zoneMatch[1]);
    }
  }

  // Natural 'S2 sensor' or 'S2 card'
  const naturalSlotMatch = trimmed.match(/^([sS]\d+)\s+(sensor|card|bay|pill)$/i);
  if (naturalSlotMatch) {
    const slotId = naturalSlotMatch[1];
    const part = naturalSlotMatch[2].toLowerCase();
    if (part === 'sensor') return getSlotSensorRect(slotId);
    if (part === 'bay') return getSlotBayRect(slotId);
    if (part === 'pill') return getSlotPillRect(slotId);
    return getSlotCardRect(slotId);
  }

  // Fallback: check if it's just Sx (e.g. 'S1' or 'slot(S1)')
  const bareSlotMatch = trimmed.match(/^(?:slot\()?([sS]\d+)\)?$/i);
  if (bareSlotMatch) {
    return getSlotCardRect(bareSlotMatch[1]);
  }

  console.warn(`[anchors] Unknown anchor name: "${name}", falling back to lot.bounds`);
  return { x: 0, y: 0, width: LOT_DESIGN_WIDTH, height: LOT_DESIGN_HEIGHT };
}

/**
 * Returns center coordinates of an anchor rectangle.
 */
export function getAnchorCenter(name: string): { x: number; y: number } {
  const rect = getAnchor(name);
  return {
    x: Math.round(rect.x + rect.width / 2),
    y: Math.round(rect.y + rect.height / 2),
  };
}
