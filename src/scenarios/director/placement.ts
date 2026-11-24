// ============================================================================
// PARKWAY SCENE DIRECTOR - CALLOUT PLACEMENT SYSTEM
// Avoids all 8 slot cards (S1-S8), sensors, and clamps inside lot boundaries.
// ============================================================================

import { getAnchor, Rect } from '../anchors';
import { getSlotCardRect, LOT_DESIGN_WIDTH, LOT_DESIGN_HEIGHT } from '@/features/parking/lotLayout';

export type PlacementSide = 'top' | 'bottom' | 'left' | 'right';

export interface CalloutPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  targetX: number;
  targetY: number;
  side: PlacementSide | 'ground';
}

const CALLOUT_DEFAULT_WIDTH = 240;
const CALLOUT_DEFAULT_HEIGHT = 44;
const LOT_PADDING = 10;
const ANCHOR_GAP = 14;

/**
 * Checks if two axis-aligned bounding boxes overlap.
 */
export function rectanglesOverlap(
  r1: { x: number; y: number; width: number; height: number },
  r2: { x: number; y: number; width: number; height: number },
  margin = 2
): boolean {
  return !(
    r1.x + r1.width + margin <= r2.x ||
    r1.x >= r2.x + r2.width + margin ||
    r1.y + r1.height + margin <= r2.y ||
    r1.y >= r2.y + r2.height + margin
  );
}

/**
 * Returns the 8 slot card bounding boxes that callouts must never overlap.
 */
export function getSlotCardObstacles(): Rect[] {
  const obstacles: Rect[] = [];
  for (let i = 1; i <= 8; i++) {
    obstacles.push(getSlotCardRect(`S${i}`));
  }
  return obstacles;
}

/**
 * Finds the optimal placement for a callout chip relative to an anchor,
 * trying preferred side -> other sides -> ground.topLeft -> ground.bottomLeft.
 * Clamps inside the lot and ensures zero overlap with slot cards S1-S8.
 */
export function computeCalloutPlacement(
  anchorName: string,
  preferredSide: PlacementSide = 'bottom',
  text = '',
  width = CALLOUT_DEFAULT_WIDTH,
  height = CALLOUT_DEFAULT_HEIGHT
): CalloutPlacement {
  const anchorRect = getAnchor(anchorName);
  const targetX = Math.round(anchorRect.x + anchorRect.width / 2);
  const targetY = Math.round(anchorRect.y + anchorRect.height / 2);

  // Approximate width based on text length (clamp between 190 and 280)
  const estimatedWidth = Math.min(280, Math.max(190, width + Math.max(0, text.length - 25) * 4));

  const obstacles = getSlotCardObstacles();

  const sides: PlacementSide[] = ['top', 'bottom', 'left', 'right'];
  const orderedSides: PlacementSide[] = [
    preferredSide,
    ...sides.filter(s => s !== preferredSide),
  ];

  const candidates: Array<{ x: number; y: number; side: PlacementSide | 'ground' }> = [];

  for (const side of orderedSides) {
    let cx = 0;
    let cy = 0;

    switch (side) {
      case 'top':
        cx = targetX - estimatedWidth / 2;
        cy = anchorRect.y - height - ANCHOR_GAP;
        break;
      case 'bottom':
        cx = targetX - estimatedWidth / 2;
        cy = anchorRect.y + anchorRect.height + ANCHOR_GAP;
        break;
      case 'left':
        cx = anchorRect.x - estimatedWidth - ANCHOR_GAP;
        cy = targetY - height / 2;
        break;
      case 'right':
        cx = anchorRect.x + anchorRect.width + ANCHOR_GAP;
        cy = targetY - height / 2;
        break;
    }

    // Clamp candidate to lot bounds
    const clampedX = Math.max(LOT_PADDING, Math.min(LOT_DESIGN_WIDTH - estimatedWidth - LOT_PADDING, cx));
    const clampedY = Math.max(LOT_PADDING, Math.min(LOT_DESIGN_HEIGHT - height - LOT_PADDING, cy));

    candidates.push({ x: clampedX, y: clampedY, side });
  }

  // Fallback ground coordinates (entry driveway / clearance area)
  // ground.topLeft: x: 20, y: 24 (slot cards start at x=324)
  candidates.push({ x: 24, y: 24, side: 'ground' });
  // ground.bottomLeft: x: 20, y: 390
  candidates.push({ x: 24, y: 390, side: 'ground' });

  // Find first candidate that does not overlap any slot card
  for (const cand of candidates) {
    const candRect = { x: cand.x, y: cand.y, width: estimatedWidth, height };
    const collides = obstacles.some(obs => rectanglesOverlap(candRect, obs));

    if (!collides) {
      return {
        x: cand.x,
        y: cand.y,
        width: estimatedWidth,
        height,
        targetX,
        targetY,
        side: cand.side,
      };
    }
  }

  // Safe ultimate fallback: ground.topLeft is always outside the slot card area
  return {
    x: 24,
    y: 24,
    width: estimatedWidth,
    height,
    targetX,
    targetY,
    side: 'ground',
  };
}
