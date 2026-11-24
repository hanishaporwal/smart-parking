import { describe, it, expect } from 'vitest';
import { calculatePopoverPosition } from '../popoverPosition';

describe('calculatePopoverPosition', () => {
  const popoverWidth = 380;
  const popoverHeight = 560;
  const viewportWidth = 1440;
  const viewportHeight = 900;

  it('positions cursor inside popover on standard click (e.g. Slot S1)', () => {
    const anchor = { x: 300, y: 250 };
    const coords = calculatePopoverPosition(
      anchor,
      popoverWidth,
      popoverHeight,
      viewportWidth,
      viewportHeight,
    );

    // Initial top-left is 12px up-left of cursor
    expect(coords.left).toBe(anchor.x - 12);
    expect(coords.top).toBe(anchor.y - 12);

    // Cursor is inside the popover bounds
    expect(anchor.x).toBeGreaterThanOrEqual(coords.left);
    expect(anchor.x).toBeLessThanOrEqual(coords.left + popoverWidth);
    expect(anchor.y).toBeGreaterThanOrEqual(coords.top);
    expect(anchor.y).toBeLessThanOrEqual(coords.top + popoverHeight);
  });

  it('shifts left on right-boundary click (Slot S4) and keeps cursor inside', () => {
    // S4 clicked near right screen margin
    const anchor = { x: 1380, y: 250 };
    const coords = calculatePopoverPosition(
      anchor,
      popoverWidth,
      popoverHeight,
      viewportWidth,
      viewportHeight,
    );

    // Popover must not overflow viewport right edge (1440 - 16 = 1424)
    expect(coords.left + popoverWidth).toBeLessThanOrEqual(viewportWidth - 16);

    // Cursor must still be inside the popover after the shift
    expect(anchor.x).toBeGreaterThanOrEqual(coords.left);
    expect(anchor.x).toBeLessThanOrEqual(coords.left + popoverWidth);
  });

  it('shifts horizontally and vertically on bottom-right click (Slot S8) and keeps cursor inside', () => {
    // S8 clicked near bottom-right
    const anchor = { x: 1350, y: 820 };
    const coords = calculatePopoverPosition(
      anchor,
      popoverWidth,
      popoverHeight,
      viewportWidth,
      viewportHeight,
    );

    // Stays within screen boundaries
    expect(coords.left + popoverWidth).toBeLessThanOrEqual(viewportWidth - 16);
    expect(coords.top + popoverHeight).toBeLessThanOrEqual(viewportHeight - 16);
    expect(coords.left).toBeGreaterThanOrEqual(16);
    expect(coords.top).toBeGreaterThanOrEqual(16);

    // Cursor strictly stays inside popover
    expect(anchor.x).toBeGreaterThanOrEqual(coords.left);
    expect(anchor.x).toBeLessThanOrEqual(coords.left + popoverWidth);
    expect(anchor.y).toBeGreaterThanOrEqual(coords.top);
    expect(anchor.y).toBeLessThanOrEqual(coords.top + popoverHeight);
  });

  it('shifts up for lower-lane slots (Slot S5) and keeps cursor inside', () => {
    const anchor = { x: 300, y: 750 };
    const coords = calculatePopoverPosition(
      anchor,
      popoverWidth,
      popoverHeight,
      viewportWidth,
      viewportHeight,
    );

    // Must not overflow viewport bottom
    expect(coords.top + popoverHeight).toBeLessThanOrEqual(viewportHeight - 16);

    // Cursor stays inside
    expect(anchor.y).toBeGreaterThanOrEqual(coords.top);
    expect(anchor.y).toBeLessThanOrEqual(coords.top + popoverHeight);
  });

  it('clamps to left screen boundary when clicked very close to left edge', () => {
    const anchor = { x: 20, y: 200 };
    const coords = calculatePopoverPosition(
      anchor,
      popoverWidth,
      popoverHeight,
      viewportWidth,
      viewportHeight,
    );

    // Screen left edge minimum
    expect(coords.left).toBeGreaterThanOrEqual(4); // cursor constraint allows safe margin
    expect(anchor.x).toBeGreaterThanOrEqual(coords.left);
    expect(anchor.x).toBeLessThanOrEqual(coords.left + popoverWidth);
  });
});
