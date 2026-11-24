import { HotspotId } from './componentInfo';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface NumeralAnchorDef {
  anchor: Point;
  offset: { dx: number; dy: number };
}

export const NUMERAL_ANCHORS: Record<HotspotId, NumeralAnchorDef> = {
  '101': { anchor: { x: 100, y: 82 }, offset: { dx: 0, dy: -30 } },
  '102': { anchor: { x: 220, y: 82 }, offset: { dx: 0, dy: -30 } },
  '103': { anchor: { x: 425, y: 115 }, offset: { dx: 0, dy: -70 } },
  '104': { anchor: { x: 150, y: 395 }, offset: { dx: -70, dy: 0 } },
  '105': { anchor: { x: 700, y: 395 }, offset: { dx: 65, dy: 0 } },
  '106': { anchor: { x: 580, y: 105 }, offset: { dx: 0, dy: -55 } },
  '107': { anchor: { x: 770, y: 110 }, offset: { dx: 35, dy: -60 } },
  '108': { anchor: { x: 495, y: 476 }, offset: { dx: 50, dy: 0 } },
};

export const COMPONENT_CENTERS: Record<HotspotId, Point> = {
  '101': { x: 100, y: 183 },
  '102': { x: 220, y: 183 },
  '103': { x: 425, y: 205 },
  '104': { x: 270, y: 385 },
  '105': { x: 585, y: 385 },
  '106': { x: 580, y: 145 },
  '107': { x: 745, y: 175 },
  '108': { x: 422, y: 476 },
};

export const COMPONENT_BOXES: Rect[] = [
  { x: 32, y: 82, w: 136, h: 202 },  // 101 (Parking Slots)
  { x: 168, y: 82, w: 100, h: 202 }, // 102 (Ultrasonic Sensors)
  { x: 345, y: 115, w: 160, h: 180 }, // 103
  { x: 150, y: 360, w: 240, h: 50 },  // 104
  { x: 460, y: 360, w: 250, h: 50 },  // 105
  { x: 540, y: 105, w: 80, h: 80 },   // 106
  { x: 642, y: 110, w: 206, h: 148 }, // 107 (realistic laptop footprint)
  { x: 350, y: 440, w: 145, h: 72 },  // 108
];

export const WIRE_BOXES: Rect[] = [
  // Wire 102->103 (Sensor 1)
  { x: 264, y: 120, w: 53, h: 4 },
  { x: 313, y: 122, w: 4, h: 35 },
  { x: 315, y: 153, w: 56, h: 4 },
  // Wire 102->103 (Sensor 2)
  { x: 264, y: 168, w: 73, h: 4 },
  { x: 333, y: 170, w: 4, h: 18 },
  { x: 335, y: 184, w: 36, h: 4 },
  // Wire 102->103 (Sensor 8)
  { x: 264, y: 240, w: 53, h: 4 },
  { x: 313, y: 218, w: 4, h: 26 },
  { x: 315, y: 216, w: 56, h: 4 },
  // Wire 103->104
  { x: 300, y: 268, w: 70, h: 4 },
  { x: 298, y: 270, w: 4, h: 90 },
  // Wire 103->105
  { x: 480, y: 268, w: 110, h: 4 },
  { x: 588, y: 270, w: 4, h: 90 },
  // Wire 108->103
  { x: 438, y: 300, w: 4, h: 145 },
  { x: 408, y: 300, w: 4, h: 145 },
  // Wire 108->104
  { x: 260, y: 474, w: 90, h: 4 },
  { x: 258, y: 430, w: 4, h: 46 },
  // Wire 108->105
  { x: 495, y: 474, w: 85, h: 4 },
  { x: 578, y: 430, w: 4, h: 46 },
  // Wire 103->106
  { x: 485, y: 178, w: 55, h: 4 },
  // Wire 106->107
  { x: 610, y: 178, w: 50, h: 4 },
];

export type ChipSide = 'above' | 'below' | 'left' | 'right';

export const PREFERRED_SIDES: Record<HotspotId, ChipSide> = {
  '101': 'above',
  '102': 'above',
  '103': 'above',
  '106': 'above',
  '107': 'above',
  '104': 'below',
  '105': 'below',
  '108': 'below',
};

export function clampPan(newX: number, newY: number, currentZoom: number): Point {
  const minX = 880 * (1 - currentZoom);
  const minY = 525 * (1 - currentZoom);
  return {
    x: Math.min(0, Math.max(minX, newX)),
    y: Math.min(0, Math.max(minY, newY)),
  };
}

export function calcZoomStep(
  delta: number,
  currentZoom: number,
  currentPan: Point,
  centerSvgX = 440,
  centerSvgY = 262.5,
): { zoom: number; pan: Point } {
  const nextZoom = Math.min(3.0, Math.max(1.0, Math.round((currentZoom + delta) * 100) / 100));
  if (nextZoom === currentZoom) return { zoom: currentZoom, pan: currentPan };
  if (nextZoom === 1.0) return { zoom: 1.0, pan: { x: 0, y: 0 } };

  const newPanX = currentPan.x + (centerSvgX - currentPan.x) * (1 - nextZoom / currentZoom);
  const newPanY = currentPan.y + (centerSvgY - currentPan.y) * (1 - nextZoom / currentZoom);
  return {
    zoom: nextZoom,
    pan: clampPan(newPanX, newPanY, nextZoom),
  };
}

export function calcFocusOnHotspot(
  id: HotspotId,
  currentZoom: number,
  targetZoom = 2.0,
): { zoom: number; pan: Point } {
  const center = COMPONENT_CENTERS[id] || { x: 440, y: 262.5 };
  const z = currentZoom < 1.75 ? targetZoom : currentZoom;
  const desiredPanX = 440 - center.x * z;
  const desiredPanY = 262.5 - center.y * z;
  return {
    zoom: z,
    pan: clampPan(desiredPanX, desiredPanY, z),
  };
}

export interface OverlayBubbleState {
  id: HotspotId;
  anchorScreen: Point;
  bubbleScreen: Point;
  leaderEdge: Point;
  opacity: number;
  isOffScreen: boolean;
}

export function computeOverlayBubbleState(
  id: HotspotId,
  k: number,
  tx: number,
  ty: number,
  visualRadius: number,
): OverlayBubbleState {
  const def = NUMERAL_ANCHORS[id];
  const anchorScreen: Point = {
    x: def.anchor.x * k + tx,
    y: def.anchor.y * k + ty,
  };

  const rawBubbleX = anchorScreen.x + def.offset.dx;
  const rawBubbleY = anchorScreen.y + def.offset.dy;

  // Clamp bubbles inside the figure frame keeping at least 18px inside
  const minX = 18 + visualRadius;
  const maxX = 880 - (18 + visualRadius);
  const minY = 18 + visualRadius;
  const maxY = 525 - (18 + visualRadius);

  const clampedX = Math.max(minX, Math.min(maxX, rawBubbleX));
  const clampedY = Math.max(minY, Math.min(maxY, rawBubbleY));

  // Distance of anchorScreen outside the 0..880 x 0..525 frame
  const offX = anchorScreen.x < 0 ? -anchorScreen.x : anchorScreen.x > 880 ? anchorScreen.x - 880 : 0;
  const offY = anchorScreen.y < 0 ? -anchorScreen.y : anchorScreen.y > 525 ? anchorScreen.y - 525 : 0;
  const distAway = Math.hypot(offX, offY);

  // Fade out if anchor is more than 120px away
  let opacity = 1;
  if (distAway > 120) {
    opacity = 0;
  } else if (distAway > 60) {
    opacity = Math.max(0, 1 - (distAway - 60) / 60);
  }

  // Leader line connects anchorScreen to the bubble's outer rim
  const dx = anchorScreen.x - clampedX;
  const dy = anchorScreen.y - clampedY;
  const dist = Math.hypot(dx, dy);

  const leaderEdge: Point =
    dist > visualRadius
      ? {
          x: clampedX + (dx / dist) * visualRadius,
          y: clampedY + (dy / dist) * visualRadius,
        }
      : { x: clampedX, y: clampedY };

  return {
    id,
    anchorScreen,
    bubbleScreen: { x: clampedX, y: clampedY },
    leaderEdge,
    opacity,
    isOffScreen: distAway > 0,
  };
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

export interface ChipPlacementResult {
  tx: number;
  ty: number;
  tw: number;
  th: number;
  line: { x1: number; y1: number; x2: number; y2: number };
  side: ChipSide;
  title: string;
}

export function computeScreenChipPlacement(
  id: HotspotId,
  bubbleScreen: Point,
  visualRadius: number,
  k: number,
  tx: number,
  ty: number,
  title: string,
  allBubbleScreens: Record<HotspotId, Point>,
): ChipPlacementResult {
  const tw = Math.max(90, title.length * 7.2 + 22);
  const th = 22;
  const gap = 8;

  const preferred = PREFERRED_SIDES[id];
  const opposite: ChipSide =
    preferred === 'above' ? 'below' : preferred === 'below' ? 'above' : preferred === 'left' ? 'right' : 'left';
  const rawSides: ChipSide[] = [preferred, opposite, 'left', 'right'];
  const candidateSides: ChipSide[] = rawSides.filter((s, idx, arr) => arr.indexOf(s) === idx);

  // Scaled component obstacles in screen coordinates
  const screenComponentBoxes: Rect[] = COMPONENT_BOXES.map(c => ({
    x: c.x * k + tx,
    y: c.y * k + ty,
    w: c.w * k,
    h: c.h * k,
  }));

  // Other bubbles in screen coordinates
  const otherBubbleBoxes: Rect[] = (Object.keys(allBubbleScreens) as HotspotId[])
    .filter(otherId => otherId !== id)
    .map(otherId => {
      const ob = allBubbleScreens[otherId];
      return { x: ob.x - 20, y: ob.y - 20, w: 40, h: 40 };
    });

  const allObstacles = [...screenComponentBoxes, ...otherBubbleBoxes];

  for (const side of candidateSides) {
    let chipX = 0;
    let chipY = 0;
    let lx1 = 0;
    let ly1 = 0;
    let lx2 = 0;
    let ly2 = 0;

    if (side === 'above') {
      chipY = bubbleScreen.y - visualRadius - gap - th;
      chipX = bubbleScreen.x - tw / 2;
      lx1 = bubbleScreen.x;
      ly1 = chipY + th;
      lx2 = bubbleScreen.x;
      ly2 = bubbleScreen.y - visualRadius;
    } else if (side === 'below') {
      chipY = bubbleScreen.y + visualRadius + gap;
      chipX = bubbleScreen.x - tw / 2;
      lx1 = bubbleScreen.x;
      ly1 = chipY;
      lx2 = bubbleScreen.x;
      ly2 = bubbleScreen.y + visualRadius;
    } else if (side === 'left') {
      chipX = bubbleScreen.x - visualRadius - gap - tw;
      chipY = bubbleScreen.y - th / 2;
      lx1 = chipX + tw;
      ly1 = bubbleScreen.y;
      lx2 = bubbleScreen.x - visualRadius;
      ly2 = bubbleScreen.y;
    } else {
      chipX = bubbleScreen.x + visualRadius + gap;
      chipY = bubbleScreen.y - th / 2;
      lx1 = chipX;
      ly1 = bubbleScreen.y;
      lx2 = bubbleScreen.x + visualRadius;
      ly2 = bubbleScreen.y;
    }

    const clampedTx = Math.min(872 - tw, Math.max(8, chipX));
    const clampedTy = Math.min(520 - th, Math.max(8, chipY));
    const chipRect: Rect = { x: clampedTx, y: clampedTy, w: tw, h: th };

    const collides = allObstacles.some(obs => rectsOverlap(chipRect, obs));
    if (!collides) {
      return {
        tx: clampedTx,
        ty: clampedTy,
        tw,
        th,
        line: { x1: lx1, y1: ly1, x2: lx2, y2: ly2 },
        side,
        title,
      };
    }
  }

  const defTx = Math.min(872 - tw, Math.max(8, bubbleScreen.x - tw / 2));
  const defTy = preferred === 'above' ? 8 : 520 - th;
  return {
    tx: defTx,
    ty: defTy,
    tw,
    th,
    line: {
      x1: bubbleScreen.x,
      y1: preferred === 'above' ? defTy + th : defTy,
      x2: bubbleScreen.x,
      y2: preferred === 'above' ? bubbleScreen.y - visualRadius : bubbleScreen.y + visualRadius,
    },
    side: preferred,
    title,
  };
}
