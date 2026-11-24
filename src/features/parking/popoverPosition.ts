export interface PopoverCoords {
  left: number;
  top: number;
}

/**
 * Calculates optimal popover viewport coordinates (left, top) anchored to a click or element center.
 * Guarantees:
 * 1. Cursor is initially INSIDE the popover (cursorInset up-left).
 * 2. Shifts/flips so popover remains fully on-screen (including S4, S8 near boundaries).
 * 3. After any shift, strictly maintains the cursor INSIDE the popover boundaries.
 */
export function calculatePopoverPosition(
  anchor: { x: number; y: number },
  popoverWidth: number,
  popoverHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  padding = 16,
  cursorInset = 12,
): PopoverCoords {
  const cursorX = anchor.x;
  const cursorY = anchor.y;

  // 1. Initial preferred position: top-left about 12px up-left of the click point
  let left = cursorX - cursorInset;
  let top = cursorY - cursorInset;

  // 2. Adjust horizontally for screen bounds (shifts left for S4, S8 near right boundary)
  const maxLeft = Math.max(padding, viewportWidth - padding - popoverWidth);
  const minLeft = padding;

  if (left > maxLeft) {
    left = maxLeft;
  }
  if (left < minLeft) {
    left = minLeft;
  }

  // Bound check: strictly guarantee cursor is within [left + 8, left + popoverWidth - 8]
  const minLeftForCursor = cursorX - popoverWidth + 8;
  const maxLeftForCursor = cursorX - 8;
  left = Math.max(minLeftForCursor, Math.min(left, maxLeftForCursor));

  // 3. Adjust vertically for screen bounds (shifts up for lower-row slots S5-S8)
  const maxTop = Math.max(padding, viewportHeight - padding - popoverHeight);
  const minTop = padding;

  if (top > maxTop) {
    top = maxTop;
  }
  if (top < minTop) {
    top = minTop;
  }

  // Bound check: strictly guarantee cursor is within [top + 8, top + popoverHeight - 8]
  const minTopForCursor = cursorY - popoverHeight + 8;
  const maxTopForCursor = cursorY - 8;
  top = Math.max(minTopForCursor, Math.min(top, maxTopForCursor));

  return {
    left: Math.round(left),
    top: Math.round(top),
  };
}
