/**
 * Route guidance design tokens.
 * Authentic smart parking visual guidance path:
 * - Solid vibrant emerald green line for active guidance trajectory
 * - Clearly distinguished dotted pass-over segment only past occupied slots
 * - High-visibility luminous traveling comet following the route
 */

export const ROUTE_GREEN = '#00FF00';
export const ROUTE_CORE = '#FFFFFF';
export const ROUTE_GLOW = 'rgba(0, 255, 0, 0.55)';
export const ROUTE_STROKE_WIDTH = 3.0;
export const ROUTE_LED_DASHARRAY = '0.01 6';
export const ROUTE_DOTTED_OPACITY = 0.95;
export const ROUTE_DOTTED_DASHARRAY = '0.01 6';
export const ROUTE_DOTTED_GREEN = '#00FF00';
export const ROUTE_CHANNEL_COLOR = '#16181b';
export const ROUTE_CHANNEL_WIDTH = 5.0;

export const ROUTE_TOKENS = {
  green: ROUTE_GREEN,
  core: ROUTE_CORE,
  glow: ROUTE_GLOW,
  strokeWidth: ROUTE_STROKE_WIDTH,
  ledDasharray: ROUTE_LED_DASHARRAY,
  dottedOpacity: ROUTE_DOTTED_OPACITY,
  dottedDasharray: ROUTE_DOTTED_DASHARRAY,
  dottedGreen: ROUTE_DOTTED_GREEN,
  channelColor: ROUTE_CHANNEL_COLOR,
  channelWidth: ROUTE_CHANNEL_WIDTH,
} as const;

