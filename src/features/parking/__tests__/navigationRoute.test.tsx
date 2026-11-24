import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NavigationRoute } from '../NavigationRoute';
import {
  ROUTE_GREEN,
  ROUTE_CORE,
  ROUTE_GLOW,
  ROUTE_STROKE_WIDTH,
  ROUTE_LED_DASHARRAY,
  ROUTE_CHANNEL_WIDTH,
  ROUTE_CHANNEL_COLOR,
  ROUTE_DOTTED_OPACITY,
} from '../routeTokens';
import { SlotState } from '@/engine';

function createMockSlots(occupiedIndices: number[], targetIndices: number[]): SlotState[] {
  return Array.from({ length: 8 }, (_, i) => ({
    slotIndex: i,
    lane: (i < 4 ? 0 : 1) as 0 | 1,
    positionInLane: i % 4,
    distance: occupiedIndices.includes(i) ? 8 : 28,
    rawDistance: occupiedIndices.includes(i) ? 8 : 28,
    occupied: occupiedIndices.includes(i),
    isTarget: targetIndices.includes(i),
  }));
}

describe('NavigationRoute Realistic Road-Embedded LED Guidance', () => {
  it('exports valid road-embedded LED styling tokens', () => {
    expect(ROUTE_GREEN).toBe('#00FF00');
    expect(ROUTE_CORE).toBe('#FFFFFF');
    expect(ROUTE_GLOW).toBe('rgba(0, 255, 0, 0.55)');
    expect(ROUTE_STROKE_WIDTH).toBe(3.0);
    expect(ROUTE_LED_DASHARRAY).toBe('0.01 6');
    expect(ROUTE_CHANNEL_COLOR).toBe('#16181b');
    expect(ROUTE_CHANNEL_WIDTH).toBe(5.0);
    expect(ROUTE_DOTTED_OPACITY).toBe(0.95);
  });

  it('renders recessed asphalt saw-cut groove and subtle light diffusion', () => {
    // S2 (index 1) target in Lane 0, S1 (index 0) occupied
    const slots = createMockSlots([0], [1]);
    const html = renderToStaticMarkup(
      <NavigationRoute
        slots={slots}
        slotWidth={170}
        slotGap={28}
        startX={324}
        entranceX={106}
        entranceY={311}
        lane0Y={227}
        lane1Y={395}
      />,
    );

    // Physical recessed channel groove in tarmac
    expect(html).toContain('id="channel-bed-1"');
    expect(html).toContain('stroke="#16181b"');
    expect(html).toContain('stroke-width="4.5"');
    expect(html).toContain('stroke="#0c0d0f"');

    // Natural light diffusion interacting with asphalt
    expect(html).toContain('id="light-diffusion-1"');
    expect(html).toContain('stroke="rgba(0, 255, 0, 0.12)"');
    expect(html).toContain('stroke="rgba(0, 255, 0, 0.22)"');

    // Dimmed pass-over segment for occupied slot
    expect(html).toContain('id="pass-over-leds-0"');
    expect(html).toContain(`opacity="${ROUTE_DOTTED_OPACITY}"`);

    // No cartoon red/orange guidance lines, uses pure green #00FF00
    expect(html).not.toContain('stroke="#EF6B6B"');
    expect(html).toContain('stroke="#00FF00"');
    expect(html).not.toContain('#5CFF3A');
  });

  it('renders discrete LED segments, optical cores, and physical chevron markers', () => {
    // S6 (index 5) target in Lane 1
    const slots = createMockSlots([4], [5]);
    const html = renderToStaticMarkup(
      <NavigationRoute
        slots={slots}
        slotWidth={170}
        slotGap={28}
        startX={324}
        entranceX={106}
        entranceY={311}
        lane0Y={227}
        lane1Y={395}
      />,
    );

    // Discrete embedded LED module segments and emitter cores
    expect(html).toContain(`stroke="${ROUTE_GREEN}"`);
    expect(html).toContain(`stroke-width="${ROUTE_STROKE_WIDTH}"`);
    expect(html).toContain(`stroke="${ROUTE_CORE}"`);
    expect(html).toContain('stroke-width="1.2"');

    // In-pavement chevron road markers instead of floating polygon arrows
    expect(html).toContain('id="target-chevron-marker-5"');
    expect(html).not.toContain('<polygon points="');

    // In-channel flush sequential pulse
    expect(html).toContain('id="in-channel-pulse-5"');
    expect(html).toContain('circle r="2.2"');
  });

  it('renders active embedded LEDs when first slot is target', () => {
    // S1 (index 0) is target, no slots occupied
    const slots = createMockSlots([], [0]);
    const html = renderToStaticMarkup(
      <NavigationRoute
        slots={slots}
        slotWidth={170}
        slotGap={28}
        startX={324}
        entranceX={106}
        entranceY={311}
        lane0Y={227}
        lane1Y={395}
      />,
    );

    // No pass-over LEDs needed
    expect(html).not.toContain('id="pass-over-leds-0"');
    // Active LEDs and turn-in LEDs rendered
    expect(html).toContain('id="active-leds-0"');
    expect(html).toContain('id="turn-in-leds-0"');
    expect(html).toContain('id="target-chevron-marker-0"');
  });
});

