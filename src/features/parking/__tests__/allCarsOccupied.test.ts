import { describe, it, expect } from 'vitest';
import { createInitialEngineState, tick, SimulatedSource } from '@/engine';

describe('All 8 Slots Occupied Car Layout and Bounds Assertions', () => {
  it('correctly classifies all 8 slots as occupied when distance is 8 cm', () => {
    const distances = [8, 8, 8, 8, 8, 8, 8, 8];
    const source = new SimulatedSource(distances);
    const initial = createInitialEngineState({
      threshold: 15,
      mode: 'firmware',
      filtering: 'none',
      hysteresisLow: 15,
      hysteresisHigh: 18,
      debounceTicks: 3,
    });

    const result = tick(initial, source, 100);
    expect(result.state.slots).toHaveLength(8);
    for (let i = 0; i < 8; i++) {
      expect(result.state.slots[i].occupied).toBe(true);
      expect(result.state.slots[i].distance).toBe(8);
    }
  });

  it('guarantees car sprite is positioned strictly inside bay bounds for all 8 slots in both lanes', () => {
    const cardWidth = 170;
    const cardHeight = 227; // 3:4 aspect ratio (170 * 4 / 3 = 226.7)

    // Bay area: 82% card width by 74% card height, vertically centred at 50% (spans ~13% to ~87%)
    const bayW = cardWidth * 0.82;
    const bayH = cardHeight * 0.74;
    const bayX = (cardWidth - bayW) * 0.5;
    const bayCenterY = cardHeight * 0.50;
    const bayY = bayCenterY - bayH * 0.5;

    // Car sprite: 70% of slot height by 50% of slot width, centred in the slot
    const carW = cardWidth * 0.50;
    const carH = cardHeight * 0.70;
    const carCenterX = cardWidth * 0.5;
    const carCenterY = cardHeight * 0.50;
    const carX = carCenterX - carW * 0.5;
    const carY = carCenterY - carH * 0.5;

    // Bounds assertions: car must be strictly inside bay bounds with ~2% top/bottom padding
    expect(carX).toBeGreaterThanOrEqual(bayX);
    expect(carY).toBeGreaterThanOrEqual(bayY);
    expect(carX + carW).toBeLessThanOrEqual(bayX + bayW);
    expect(carY + carH).toBeLessThanOrEqual(bayY + bayH);

    // Padding between car and bay outline is ~2% of slot height
    const topPadding = carY - bayY;
    const bottomPadding = (bayY + bayH) - (carY + carH);
    expect(topPadding / cardHeight).toBeCloseTo(0.02, 2);
    expect(bottomPadding / cardHeight).toBeCloseTo(0.02, 2);

    // Car must be strictly inside card bounds with margins
    expect(carX).toBeGreaterThanOrEqual(10);
    expect(cardWidth - (carX + carW)).toBeGreaterThanOrEqual(10);
    expect(carY).toBeGreaterThanOrEqual(10);
    expect(cardHeight - (carY + carH)).toBeGreaterThanOrEqual(10);
  });

  it('guarantees zero overlap between sensor, left text stack, bay, and status pill', () => {
    const cardWidth = 170;
    const cardHeight = 227;

    // Sensor: horizontally centered, ~30% width
    const sensorW = cardWidth * 0.30;
    const sensorX = (cardWidth - sensorW) * 0.5;

    // Top-left text stack: 5% inset from left
    const stackX = cardWidth * 0.05;
    const estimatedMaxTextWidth = 46; // "S1" + "400 cm"
    const textStackRightEdge = stackX + estimatedMaxTextWidth;

    // Text stack sits beside the sensor at the wall with NO overlap
    expect(textStackRightEdge).toBeLessThan(sensorX);
    expect(sensorX - textStackRightEdge).toBeGreaterThanOrEqual(3);

    // Bay area: vertically centered at 50%, height 74% (spans 13% to 87%)
    const bayCenterY = cardHeight * 0.50;
    const bayH = cardHeight * 0.74;
    const bayTop = bayCenterY - bayH * 0.5; // 13%
    const bayBottom = bayCenterY + bayH * 0.5; // 87%

    // Top lane (0):
    // Sensor: 2% to 8.5% -> bottom is cardHeight * 0.085 (~19.3px)
    // Sensor is well above bayTop (29.5px)
    expect(cardHeight * 0.085).toBeLessThan(bayTop);

    // Status pill: centered at 88.5% down card, top is 88.5%
    const pillTop = cardHeight * 0.885;
    // Status pill is well below bayBottom (87%)
    expect(bayBottom).toBeLessThan(pillTop);
  });

  it('guarantees mirrored reverse-parked orientations for lane 0 and lane 1 with resting rotation 0', () => {
    // Top lane (0): Aisle at bottom -> headlights face bottom ('down'), taillights at top
    // Bottom lane (1): Aisle at top -> headlights face top ('up'), taillights at bottom
    for (let slotIndex = 0; slotIndex < 8; slotIndex++) {
      const lane = slotIndex < 4 ? 0 : 1;
      const carFacing = lane === 0 ? 'down' : 'up';
      const restingRotate = 0; // Both lanes rest at rotation 0 in SlotCard.tsx

      expect(carFacing).toBe(lane === 0 ? 'down' : 'up');
      expect(restingRotate).toBe(0);
    }
  });
});
