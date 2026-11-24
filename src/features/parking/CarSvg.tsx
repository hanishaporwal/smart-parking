import React from 'react';
import { useSimStore } from '@/store';

export type CarStyle = 'sedan' | 'coupe' | 'suv';

export interface CarSvgProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color?: string;
  rotation?: number;
  className?: string;
  orientation?: 'portrait' | 'landscape';
  facing?: 'up' | 'down';
  isReversing?: boolean;
  style?: CarStyle;
}

export const CarSvg: React.FC<CarSvgProps> = React.memo(
  ({
    x = 0,
    y = 0,
    width = 85,
    height = 159,
    color = '#2563EB',
    rotation = 0,
    className = '',
    orientation,
    facing = 'down',
    isReversing = false,
    style,
  }) => {
    // Read global car style from store if not overridden via prop
    const storeCarStyle = useSimStore((s) => s.carStyle);
    const activeStyle: CarStyle = style ?? storeCarStyle ?? 'sedan';

    const isPortrait = orientation ? orientation === 'portrait' : height >= width;
    const uid = React.useId().replace(/:/g, '');

    // Common gradient definitions for ultra-realistic automotive paint & glass
    const renderDefs = (isHoriz: boolean) => (
      <defs>
        {/* Soft Ambient Ground Contact Shadow */}
        <filter id={`car-shadow-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" />
        </filter>

        {/* Headlight & Taillight Glow Filters */}
        <filter id={`drl-glow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id={`tail-glow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Deep Multi-Stop Lacquer Metallic Body Lighting (Specular sheen along center spine) */}
        {isHoriz ? (
          <linearGradient id={`car-metallic-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.45" />
            <stop offset="14%" stopColor="#000000" stopOpacity="0.18" />
            <stop offset="38%" stopColor="#FFFFFF" stopOpacity="0.18" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.35" />
            <stop offset="62%" stopColor="#FFFFFF" stopOpacity="0.18" />
            <stop offset="86%" stopColor="#000000" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.45" />
          </linearGradient>
        ) : (
          <linearGradient id={`car-metallic-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.45" />
            <stop offset="14%" stopColor="#000000" stopOpacity="0.18" />
            <stop offset="38%" stopColor="#FFFFFF" stopOpacity="0.18" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.35" />
            <stop offset="62%" stopColor="#FFFFFF" stopOpacity="0.18" />
            <stop offset="86%" stopColor="#000000" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.45" />
          </linearGradient>
        )}

        {/* Smoked Tinted Glass Reflection with Sky Blue Specular Sheen */}
        <linearGradient id={`car-glass-${uid}`} x1="0.1" y1="0.1" x2="0.9" y2="0.9">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.32" />
          <stop offset="28%" stopColor="#FFFFFF" stopOpacity="0.28" />
          <stop offset="38%" stopColor="#0F1319" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#080A0D" stopOpacity="0.98" />
        </linearGradient>

        {/* Carbon fiber / Matte Dark Accent Roof (Used in Coupe) */}
        <linearGradient id={`car-carbon-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1E232B" />
          <stop offset="50%" stopColor="#12151A" />
          <stop offset="100%" stopColor="#0B0D11" />
        </linearGradient>
      </defs>
    );

    // =========================================================================
    // 1. LANDSCAPE RENDER (Used for aisle driving, entry gate, and road motion)
    // Front is at right (+X), rear is at left (-X). Width = w, Height = h.
    // =========================================================================
    if (!isPortrait) {
      const w = width;
      const h = height;

      return (
        <g
          transform={`translate(${x}, ${y}) rotate(${rotation}, ${w / 2}, ${h / 2})`}
          className={className}
        >
          {renderDefs(true)}

          {/* Deep Ground Contact Shadow */}
          <ellipse
            cx={w / 2}
            cy={h / 2 + 1.5}
            rx={w * 0.49}
            ry={h * 0.46}
            fill="rgba(0, 0, 0, 0.65)"
            filter={`url(#car-shadow-${uid})`}
          />

          {/* Low profile performance tires tucked into wheel wells */}
          <rect x={w * 0.16} y={-h * 0.02} width={w * 0.18} height={h * 0.15} rx={3} fill="#14171C" stroke="#2B2F38" strokeWidth={0.8} />
          <rect x={w * 0.16} y={h * 0.87} width={w * 0.18} height={h * 0.15} rx={3} fill="#14171C" stroke="#2B2F38" strokeWidth={0.8} />
          <rect x={w * 0.66} y={-h * 0.02} width={w * 0.18} height={h * 0.15} rx={3} fill="#14171C" stroke="#2B2F38" strokeWidth={0.8} />
          <rect x={w * 0.66} y={h * 0.87} width={w * 0.18} height={h * 0.15} rx={3} fill="#14171C" stroke="#2B2F38" strokeWidth={0.8} />

          {/* Body Silhouette */}
          <path
            d={`
              M ${w * 0.04} ${h * 0.22}
              Q ${w * 0.01} ${h * 0.07} ${w * 0.18} ${h * 0.05}
              L ${w * 0.80} ${h * 0.05}
              Q ${w * 0.98} ${h * 0.08} ${w * 0.99} ${h * 0.26}
              L ${w} ${h * 0.50}
              L ${w * 0.99} ${h * 0.74}
              Q ${w * 0.98} ${h * 0.92} ${w * 0.80} ${h * 0.95}
              L ${w * 0.18} ${h * 0.95}
              Q ${w * 0.01} ${h * 0.93} ${w * 0.04} ${h * 0.78}
              Z
            `}
            fill={color}
            stroke="rgba(255, 255, 255, 0.22)"
            strokeWidth={1}
          />
          {/* Specular lighting overlay */}
          <path
            d={`
              M ${w * 0.04} ${h * 0.22}
              Q ${w * 0.01} ${h * 0.07} ${w * 0.18} ${h * 0.05}
              L ${w * 0.80} ${h * 0.05}
              Q ${w * 0.98} ${h * 0.08} ${w * 0.99} ${h * 0.26}
              L ${w} ${h * 0.50}
              L ${w * 0.99} ${h * 0.74}
              Q ${w * 0.98} ${h * 0.92} ${w * 0.80} ${h * 0.95}
              L ${w * 0.18} ${h * 0.95}
              Q ${w * 0.01} ${h * 0.93} ${w * 0.04} ${h * 0.78}
              Z
            `}
            fill={`url(#car-metallic-${uid})`}
          />

          {/* Panoramic Glass Canopy */}
          <path
            d={`
              M ${w * 0.22} ${h * 0.19}
              Q ${w * 0.18} ${h * 0.50} ${w * 0.22} ${h * 0.81}
              L ${w * 0.68} ${h * 0.78}
              Q ${w * 0.75} ${h * 0.50} ${w * 0.68} ${h * 0.22}
              Z
            `}
            fill={`url(#car-glass-${uid})`}
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth={0.8}
          />

          {/* Front Windshield Curved Rake Line */}
          <path
            d={`M ${w * 0.58} ${h * 0.17} Q ${w * 0.66} ${h * 0.50} ${w * 0.58} ${h * 0.83}`}
            fill="none"
            stroke="rgba(255, 255, 255, 0.3)"
            strokeWidth={0.8}
          />

          {/* Aerodynamic Side Mirrors */}
          <path
            d={`M ${w * 0.56} ${-h * 0.04} L ${w * 0.64} ${-h * 0.03} Q ${w * 0.66} ${-h * 0.01} ${w * 0.62} ${h * 0.05} L ${w * 0.56} ${h * 0.05} Z`}
            fill={color}
            stroke="#0A0D12"
            strokeWidth={0.5}
          />
          <line x1={w * 0.58} y1={-h * 0.02} x2={w * 0.63} y2={-h * 0.01} stroke="#F59E0B" strokeWidth={0.8} opacity={0.9} />

          <path
            d={`M ${w * 0.56} ${h * 1.04} L ${w * 0.64} ${h * 1.03} Q ${w * 0.66} ${h * 1.01} ${w * 0.62} ${h * 0.95} L ${w * 0.56} ${h * 0.95} Z`}
            fill={color}
            stroke="#0A0D12"
            strokeWidth={0.5}
          />
          <line x1={w * 0.58} y1={h * 1.02} x2={w * 0.63} y2={h * 1.01} stroke="#F59E0B" strokeWidth={0.8} opacity={0.9} />

          {/* Modern Slim Jewel LED Headlights (Right side - Front) */}
          <path
            d={`M ${w * 0.96} ${h * 0.13} L ${w * 0.86} ${h * 0.11} Q ${w * 0.84} ${h * 0.22} ${w * 0.98} ${h * 0.24} Z`}
            fill="#0F1318"
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth={0.6}
          />
          <path
            d={`M ${w * 0.88} ${h * 0.12} L ${w * 0.96} ${h * 0.14}`}
            stroke="#FFFFFF"
            strokeWidth={1.5}
            strokeLinecap="round"
            filter={`url(#drl-glow-${uid})`}
          />
          <circle cx={w * 0.91} cy={h * 0.17} r={1.8} fill="#E0F2FE" />

          <path
            d={`M ${w * 0.96} ${h * 0.87} L ${w * 0.86} ${h * 0.89} Q ${w * 0.84} ${h * 0.78} ${w * 0.98} ${h * 0.76} Z`}
            fill="#0F1318"
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth={0.6}
          />
          <path
            d={`M ${w * 0.88} ${h * 0.88} L ${w * 0.96} ${h * 0.86}`}
            stroke="#FFFFFF"
            strokeWidth={1.5}
            strokeLinecap="round"
            filter={`url(#drl-glow-${uid})`}
          />
          <circle cx={w * 0.91} cy={h * 0.83} r={1.8} fill="#E0F2FE" />

          {/* Precision LED Horizon Taillight Bar (Left side - Rear) */}
          <path
            d={`M ${w * 0.05} ${h * 0.14} L ${w * 0.01} ${h * 0.24} L ${w * 0.01} ${h * 0.76} L ${w * 0.05} ${h * 0.86}`}
            fill="none"
            stroke="#EF4444"
            strokeWidth={2.2}
            strokeLinecap="round"
            filter={`url(#tail-glow-${uid})`}
          />
          <path
            d={`M ${w * 0.04} ${h * 0.20} L ${w * 0.02} ${h * 0.30} L ${w * 0.02} ${h * 0.70} L ${w * 0.04} ${h * 0.80}`}
            fill="none"
            stroke="#FCA5A5"
            strokeWidth={0.8}
            strokeLinecap="round"
          />
        </g>
      );
    }

    // =========================================================================
    // 2. PORTRAIT RENDER (Used in Parking Bay Slots S1 - S8)
    // Headlights at bottom (front), taillights at top (rear). Width = w, Height = h.
    // =========================================================================
    const w = width;
    const h = height;

    const transformString = `translate(${x}, ${y}) rotate(${rotation}) ${
      facing === 'up' ? `rotate(180, ${w / 2}, ${h / 2})` : ''
    }`;

    return (
      <g transform={transformString} className={className}>
        {renderDefs(false)}

        {/* Multi-layered Soft Ground Drop Shadow under chassis */}
        <ellipse
          cx={w / 2}
          cy={h / 2 + 1.5}
          rx={w * 0.49}
          ry={h * 0.49}
          fill="rgba(0, 0, 0, 0.72)"
          filter={`url(#car-shadow-${uid})`}
        />
        <rect
          x={w * 0.05}
          y={h * 0.03}
          width={w * 0.90}
          height={h * 0.94}
          rx={w * 0.28}
          fill="rgba(0, 0, 0, 0.38)"
        />

        {/* =================================================================== */}
        {/* WHEELS / TIRES: Recessed low-profile rubber tires under wheel wells  */}
        {/* =================================================================== */}
        {/* Rear Wheels (Top) */}
        <rect x={w * 0.01} y={h * 0.12} width={w * 0.11} height={h * 0.17} rx={3} fill="#14171C" stroke="#2B2F38" strokeWidth={0.8} />
        <line x1={w * 0.065} y1={h * 0.15} x2={w * 0.065} y2={h * 0.26} stroke="#475569" strokeWidth={1} strokeDasharray="2 3" opacity={0.6} />

        <rect x={w * 0.88} y={h * 0.12} width={w * 0.11} height={h * 0.17} rx={3} fill="#14171C" stroke="#2B2F38" strokeWidth={0.8} />
        <line x1={w * 0.935} y1={h * 0.15} x2={w * 0.935} y2={h * 0.26} stroke="#475569" strokeWidth={1} strokeDasharray="2 3" opacity={0.6} />

        {/* Front Wheels (Bottom) */}
        <rect x={w * 0.01} y={h * 0.71} width={w * 0.11} height={h * 0.17} rx={3} fill="#14171C" stroke="#2B2F38" strokeWidth={0.8} />
        <line x1={w * 0.065} y1={h * 0.74} x2={w * 0.065} y2={h * 0.85} stroke="#475569" strokeWidth={1} strokeDasharray="2 3" opacity={0.6} />

        <rect x={w * 0.88} y={h * 0.71} width={w * 0.11} height={h * 0.17} rx={3} fill="#14171C" stroke="#2B2F38" strokeWidth={0.8} />
        <line x1={w * 0.935} y1={h * 0.74} x2={w * 0.935} y2={h * 0.85} stroke="#475569" strokeWidth={1} strokeDasharray="2 3" opacity={0.6} />

        {/* Brake calipers visible through wheel gap */}
        <rect x={w * 0.03} y={h * 0.18} width={3} height={9} rx={1.5} fill="#EF4444" opacity={0.85} />
        <rect x={w * 0.94} y={h * 0.18} width={3} height={9} rx={1.5} fill="#EF4444" opacity={0.85} />
        <rect x={w * 0.03} y={h * 0.77} width={3} height={9} rx={1.5} fill="#EF4444" opacity={0.85} />
        <rect x={w * 0.94} y={h * 0.77} width={3} height={9} rx={1.5} fill="#EF4444" opacity={0.85} />

        {/* =================================================================== */}
        {/* CAR BODY STYLES (Sedan, Coupe, SUV)                                 */}
        {/* =================================================================== */}

        {/* ------------------------------------------------------------------- */}
        {/* STYLE 1: LUXURY SEDAN / EV (Porsche Taycan / Tesla Model S Style)   */}
        {/* ------------------------------------------------------------------- */}
        {activeStyle === 'sedan' && (
          <g id={`body-sedan-${uid}`}>
            {/* Aerodynamic Tapered Silhouette */}
            <path
              d={`
                M ${w * 0.22} 0
                Q ${w * 0.50} ${-h * 0.015} ${w * 0.78} 0
                Q ${w * 0.95} ${h * 0.03} ${w * 0.94} ${h * 0.16}
                L ${w * 0.94} ${h * 0.34}
                Q ${w * 0.91} ${h * 0.50} ${w * 0.94} ${h * 0.66}
                L ${w * 0.94} ${h * 0.84}
                Q ${w * 0.95} ${h * 0.97} ${w * 0.78} ${h}
                Q ${w * 0.50} ${h * 1.015} ${w * 0.22} ${h}
                Q ${w * 0.05} ${h * 0.97} ${w * 0.06} ${h * 0.84}
                L ${w * 0.06} ${h * 0.66}
                Q ${w * 0.09} ${h * 0.50} ${w * 0.06} ${h * 0.34}
                L ${w * 0.06} ${h * 0.16}
                Q ${w * 0.05} ${h * 0.03} ${w * 0.22} 0
                Z
              `}
              fill={color}
              stroke="rgba(255, 255, 255, 0.26)"
              strokeWidth={1.2}
            />
            {/* Metallic Curvature Overlay */}
            <path
              d={`
                M ${w * 0.22} 0
                Q ${w * 0.50} ${-h * 0.015} ${w * 0.78} 0
                Q ${w * 0.95} ${h * 0.03} ${w * 0.94} ${h * 0.16}
                L ${w * 0.94} ${h * 0.34}
                Q ${w * 0.91} ${h * 0.50} ${w * 0.94} ${h * 0.66}
                L ${w * 0.94} ${h * 0.84}
                Q ${w * 0.95} ${h * 0.97} ${w * 0.78} ${h}
                Q ${w * 0.50} ${h * 1.015} ${w * 0.22} ${h}
                Q ${w * 0.05} ${h * 0.97} ${w * 0.06} ${h * 0.84}
                L ${w * 0.06} ${h * 0.66}
                Q ${w * 0.09} ${h * 0.50} ${w * 0.06} ${h * 0.34}
                L ${w * 0.06} ${h * 0.16}
                Q ${w * 0.05} ${h * 0.03} ${w * 0.22} 0
                Z
              `}
              fill={`url(#car-metallic-${uid})`}
            />

            {/* Subtle Front Hood Sculpted Creases */}
            <path d={`M ${w * 0.26} ${h * 0.78} Q ${w * 0.29} ${h * 0.88} ${w * 0.24} ${h * 0.95}`} stroke="rgba(255, 255, 255, 0.25)" strokeWidth={0.8} fill="none" />
            <path d={`M ${w * 0.74} ${h * 0.78} Q ${w * 0.71} ${h * 0.88} ${w * 0.76} ${h * 0.95}`} stroke="rgba(255, 255, 255, 0.25)" strokeWidth={0.8} fill="none" />

            {/* Seamless Panoramic Tinted Glass Canopy */}
            <path
              d={`
                M ${w * 0.21} ${h * 0.15}
                Q ${w * 0.50} ${h * 0.12} ${w * 0.79} ${h * 0.15}
                L ${w * 0.81} ${h * 0.64}
                Q ${w * 0.50} ${h * 0.73} ${w * 0.19} ${h * 0.64}
                Z
              `}
              fill={`url(#car-glass-${uid})`}
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth={0.8}
            />

            {/* Front & Rear Glass Boundary Slender Pillars */}
            <line x1={w * 0.20} y1={h * 0.27} x2={w * 0.80} y2={h * 0.27} stroke="rgba(255, 255, 255, 0.14)" strokeWidth={1} />
            <line x1={w * 0.19} y1={h * 0.58} x2={w * 0.81} y2={h * 0.58} stroke="rgba(255, 255, 255, 0.18)" strokeWidth={1.2} />

            {/* Flush Door Handles */}
            <line x1={w * 0.10} y1={h * 0.38} x2={w * 0.10} y2={h * 0.42} stroke="rgba(255, 255, 255, 0.45)" strokeWidth={1.2} strokeLinecap="round" />
            <line x1={w * 0.10} y1={h * 0.54} x2={w * 0.10} y2={h * 0.58} stroke="rgba(255, 255, 255, 0.45)" strokeWidth={1.2} strokeLinecap="round" />
            <line x1={w * 0.90} y1={h * 0.38} x2={w * 0.90} y2={h * 0.42} stroke="rgba(255, 255, 255, 0.45)" strokeWidth={1.2} strokeLinecap="round" />
            <line x1={w * 0.90} y1={h * 0.54} x2={w * 0.90} y2={h * 0.58} stroke="rgba(255, 255, 255, 0.45)" strokeWidth={1.2} strokeLinecap="round" />

            {/* Sleek Aero Mirrors at A-Pillars with Amber LED Indicator */}
            {/* Left Mirror */}
            <path d={`M ${w * 0.06} ${h * 0.60} L ${-w * 0.03} ${h * 0.58} Q ${-w * 0.05} ${h * 0.61} ${-w * 0.03} ${h * 0.64} L ${w * 0.06} ${h * 0.64} Z`} fill={color} stroke="#0B0E14" strokeWidth={0.6} />
            <line x1={-w * 0.03} y1={h * 0.60} x2={-w * 0.03} y2={h * 0.63} stroke="#F59E0B" strokeWidth={0.8} />

            {/* Right Mirror */}
            <path d={`M ${w * 0.94} ${h * 0.60} L ${w * 1.03} ${h * 0.58} Q ${w * 1.05} ${h * 0.61} ${w * 1.03} ${h * 0.64} L ${w * 0.94} ${h * 0.64} Z`} fill={color} stroke="#0B0D12" strokeWidth={0.6} />
            <line x1={w * 1.03} y1={h * 0.60} x2={w * 1.03} y2={h * 0.63} stroke="#F59E0B" strokeWidth={0.8} />

            {/* Front Bumper Air Curtain Inlets */}
            <rect x={w * 0.32} y={h * 0.965} width={w * 0.36} height={h * 0.025} rx={1.5} fill="#090B0E" stroke="rgba(255, 255, 255, 0.2)" strokeWidth={0.5} />

            {/* Modern Matrix LED Headlights (Dual Projector Diodes + Razor DRL Wing) */}
            {/* Left Headlight */}
            <g id="sedan-left-headlight">
              <path d={`M ${w * 0.09} ${h * 0.88} L ${w * 0.26} ${h * 0.97} L ${w * 0.23} ${h * 0.98} L ${w * 0.07} ${h * 0.91} Z`} fill="#090D14" stroke="rgba(255, 255, 255, 0.3)" strokeWidth={0.5} />
              <path d={`M ${w * 0.08} ${h * 0.89} L ${w * 0.24} ${h * 0.97}`} stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" filter={`url(#drl-glow-${uid})`} />
              <circle cx={w * 0.14} cy={h * 0.92} r={1.6} fill="#E0F2FE" />
              <circle cx={w * 0.19} cy={h * 0.945} r={1.6} fill="#E0F2FE" />
            </g>

            {/* Right Headlight */}
            <g id="sedan-right-headlight">
              <path d={`M ${w * 0.91} ${h * 0.88} L ${w * 0.74} ${h * 0.97} L ${w * 0.77} ${h * 0.98} L ${w * 0.93} ${h * 0.91} Z`} fill="#090D14" stroke="rgba(255, 255, 255, 0.3)" strokeWidth={0.5} />
              <path d={`M ${w * 0.92} ${h * 0.89} L ${w * 0.76} ${h * 0.97}`} stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" filter={`url(#drl-glow-${uid})`} />
              <circle cx={w * 0.86} cy={h * 0.92} r={1.6} fill="#E0F2FE" />
              <circle cx={w * 0.81} cy={h * 0.945} r={1.6} fill="#E0F2FE" />
            </g>

            {/* Full-Width Horizon LED Taillight Bar */}
            <path
              d={`M ${w * 0.08} ${h * 0.03} Q ${w * 0.50} ${h * 0.01} ${w * 0.92} ${h * 0.03}`}
              fill="none"
              stroke="#EF4444"
              strokeWidth={isReversing ? 3.2 : 2.2}
              strokeLinecap="round"
              filter={`url(#tail-glow-${uid})`}
            />
            <path
              d={`M ${w * 0.12} ${h * 0.03} Q ${w * 0.50} ${h * 0.015} ${w * 0.88} ${h * 0.03}`}
              fill="none"
              stroke="#FECACA"
              strokeWidth={0.8}
              strokeLinecap="round"
            />
          </g>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* STYLE 2: GT PERFORMANCE COUPE (Audi e-tron GT / BMW M4 Style)       */}
        {/* ------------------------------------------------------------------- */}
        {activeStyle === 'coupe' && (
          <g id={`body-coupe-${uid}`}>
            {/* Muscular Wide-Body Silhouette with Flared Haunches */}
            <path
              d={`
                M ${w * 0.24} 0
                Q ${w * 0.50} ${-h * 0.01} ${w * 0.76} 0
                Q ${w * 0.98} ${h * 0.02} ${w * 0.97} ${h * 0.18}
                L ${w * 0.93} ${h * 0.35}
                L ${w * 0.91} ${h * 0.50}
                L ${w * 0.95} ${h * 0.65}
                L ${w * 0.96} ${h * 0.82}
                Q ${w * 0.97} ${h * 0.98} ${w * 0.76} ${h}
                Q ${w * 0.50} ${h * 1.02} ${w * 0.24} ${h}
                Q ${w * 0.03} ${h * 0.98} ${w * 0.04} ${h * 0.82}
                L ${w * 0.05} ${h * 0.65}
                L ${w * 0.09} ${h * 0.50}
                L ${w * 0.07} ${h * 0.35}
                L ${w * 0.03} ${h * 0.18}
                Q ${w * 0.02} ${h * 0.02} ${w * 0.24} 0
                Z
              `}
              fill={color}
              stroke="rgba(255, 255, 255, 0.28)"
              strokeWidth={1.2}
            />
            {/* Metallic lighting */}
            <path
              d={`
                M ${w * 0.24} 0
                Q ${w * 0.50} ${-h * 0.01} ${w * 0.76} 0
                Q ${w * 0.98} ${h * 0.02} ${w * 0.97} ${h * 0.18}
                L ${w * 0.93} ${h * 0.35}
                L ${w * 0.91} ${h * 0.50}
                L ${w * 0.95} ${h * 0.65}
                L ${w * 0.96} ${h * 0.82}
                Q ${w * 0.97} ${h * 0.98} ${w * 0.76} ${h}
                Q ${w * 0.50} ${h * 1.02} ${w * 0.24} ${h}
                Q ${w * 0.03} ${h * 0.98} ${w * 0.04} ${h * 0.82}
                L ${w * 0.05} ${h * 0.65}
                L ${w * 0.09} ${h * 0.50}
                L ${w * 0.07} ${h * 0.35}
                L ${w * 0.03} ${h * 0.18}
                Q ${w * 0.02} ${h * 0.02} ${w * 0.24} 0
                Z
              `}
              fill={`url(#car-metallic-${uid})`}
            />

            {/* Muscular Hood Power-Dome Creases */}
            <polygon points={`${w * 0.36},${h * 0.76} ${w * 0.64},${h * 0.76} ${w * 0.60},${h * 0.94} ${w * 0.40},${h * 0.94}`} fill="rgba(0, 0, 0, 0.15)" />
            <line x1={w * 0.36} y1={h * 0.76} x2={w * 0.40} y2={h * 0.94} stroke="rgba(255, 255, 255, 0.32)" strokeWidth={0.8} />
            <line x1={w * 0.64} y1={h * 0.76} x2={w * 0.60} y2={h * 0.94} stroke="rgba(255, 255, 255, 0.32)" strokeWidth={0.8} />

            {/* Carbon-Fiber Aero Roof with Double-Bubble Channels */}
            <rect x={w * 0.22} y={h * 0.28} width={w * 0.56} height={h * 0.30} rx={3} fill={`url(#car-carbon-${uid})`} stroke="rgba(255,255,255,0.18)" strokeWidth={0.6} />
            <line x1={w * 0.36} y1={h * 0.28} x2={w * 0.36} y2={h * 0.58} stroke="rgba(0,0,0,0.4)" strokeWidth={1} />
            <line x1={w * 0.64} y1={h * 0.28} x2={w * 0.64} y2={h * 0.58} stroke="rgba(0,0,0,0.4)" strokeWidth={1} />

            {/* Low-Rake Front Windshield */}
            <path
              d={`
                M ${w * 0.21} ${h * 0.58}
                Q ${w * 0.50} ${h * 0.64} ${w * 0.79} ${h * 0.58}
                L ${w * 0.76} ${h * 0.74}
                Q ${w * 0.50} ${h * 0.77} ${w * 0.24} ${h * 0.74}
                Z
              `}
              fill={`url(#car-glass-${uid})`}
              stroke="rgba(255, 255, 255, 0.25)"
              strokeWidth={0.8}
            />

            {/* Rear Hatch Glass with Defroster Lines */}
            <path
              d={`
                M ${w * 0.23} ${h * 0.16}
                Q ${w * 0.50} ${h * 0.13} ${w * 0.77} ${h * 0.16}
                L ${w * 0.75} ${h * 0.28}
                Q ${w * 0.50} ${h * 0.26} ${w * 0.25} ${h * 0.28}
                Z
              `}
              fill={`url(#car-glass-${uid})`}
              stroke="rgba(255, 255, 255, 0.22)"
              strokeWidth={0.8}
            />
            <line x1={w * 0.28} y1={h * 0.20} x2={w * 0.72} y2={h * 0.20} stroke="#EF4444" strokeWidth={0.5} opacity={0.4} />
            <line x1={w * 0.29} y1={h * 0.23} x2={w * 0.71} y2={h * 0.23} stroke="#EF4444" strokeWidth={0.5} opacity={0.4} />

            {/* Aerodynamic Sport Side Mirrors on Thin Matte Stalks */}
            <path d={`M ${w * 0.08} ${h * 0.61} L ${-w * 0.04} ${h * 0.59} Q ${-w * 0.06} ${h * 0.62} ${-w * 0.03} ${h * 0.65} L ${w * 0.08} ${h * 0.65} Z`} fill="#0B0E14" stroke="#1E232B" strokeWidth={0.6} />
            <line x1={-w * 0.04} y1={h * 0.61} x2={-w * 0.04} y2={h * 0.64} stroke="#38BDF8" strokeWidth={0.8} />

            <path d={`M ${w * 0.92} ${h * 0.61} L ${w * 1.04} ${h * 0.59} Q ${w * 1.06} ${h * 0.62} ${w * 1.03} ${h * 0.65} L ${w * 0.92} ${h * 0.65} Z`} fill="#0B0E14" stroke="#1E232B" strokeWidth={0.6} />
            <line x1={w * 1.04} y1={h * 0.61} x2={w * 1.04} y2={h * 0.64} stroke="#38BDF8" strokeWidth={0.8} />

            {/* Sharp Laser Matrix Headlights with Dual-Angle Daytime Halos */}
            {/* Left Laser Headlight */}
            <g id="coupe-left-headlight">
              <path d={`M ${w * 0.08} ${h * 0.86} L ${w * 0.27} ${h * 0.96} L ${w * 0.23} ${h * 0.98} L ${w * 0.06} ${h * 0.90} Z`} fill="#080B10" stroke="rgba(255, 255, 255, 0.4)" strokeWidth={0.5} />
              <path d={`M ${w * 0.07} ${h * 0.88} L ${w * 0.16} ${h * 0.93} L ${w * 0.25} ${h * 0.96}`} stroke="#38BDF8" strokeWidth={1.8} strokeLinecap="round" filter={`url(#drl-glow-${uid})`} />
              <rect x={w * 0.12} y={h * 0.89} width={3} height={3} rx={1} fill="#FFFFFF" />
            </g>

            {/* Right Laser Headlight */}
            <g id="coupe-right-headlight">
              <path d={`M ${w * 0.92} ${h * 0.86} L ${w * 0.73} ${h * 0.96} L ${w * 0.77} ${h * 0.98} L ${w * 0.94} ${h * 0.90} Z`} fill="#080B10" stroke="rgba(255, 255, 255, 0.4)" strokeWidth={0.5} />
              <path d={`M ${w * 0.93} ${h * 0.88} L ${w * 0.84} ${h * 0.93} L ${w * 0.75} ${h * 0.96}`} stroke="#38BDF8" strokeWidth={1.8} strokeLinecap="round" filter={`url(#drl-glow-${uid})`} />
              <rect x={w * 0.85} y={h * 0.89} width={3} height={3} rx={1} fill="#FFFFFF" />
            </g>

            {/* Integrated Rear Lip Spoiler & 3D Segmented Taillights */}
            <path d={`M ${w * 0.10} ${h * 0.02} L ${w * 0.32} ${h * 0.01} L ${w * 0.68} ${h * 0.01} L ${w * 0.90} ${h * 0.02}`} stroke="#0B0E14" strokeWidth={1.8} strokeLinecap="round" />
            {/* Left taillight cluster */}
            <path d={`M ${w * 0.08} ${h * 0.03} L ${w * 0.28} ${h * 0.02} L ${w * 0.26} ${h * 0.06} L ${w * 0.06} ${h * 0.05} Z`} fill="#EF4444" filter={`url(#tail-glow-${uid})`} />
            <line x1={w * 0.09} y1={h * 0.035} x2={w * 0.27} y2={h * 0.025} stroke="#FECACA" strokeWidth={1} />
            {/* Right taillight cluster */}
            <path d={`M ${w * 0.92} ${h * 0.03} L ${w * 0.72} ${h * 0.02} L ${w * 0.74} ${h * 0.06} L ${w * 0.94} ${h * 0.05} Z`} fill="#EF4444" filter={`url(#tail-glow-${uid})`} />
            <line x1={w * 0.91} y1={h * 0.035} x2={w * 0.73} y2={h * 0.025} stroke="#FECACA" strokeWidth={1} />
          </g>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* STYLE 3: EXECUTIVE SUV / CROSSOVER (Range Rover / Macan Style)       */}
        {/* ------------------------------------------------------------------- */}
        {activeStyle === 'suv' && (
          <g id={`body-suv-${uid}`}>
            {/* Athletic Upright Stance with Muscular Square Shoulders */}
            <path
              d={`
                M ${w * 0.20} 0
                Q ${w * 0.50} ${-h * 0.01} ${w * 0.80} 0
                Q ${w * 0.96} ${h * 0.02} ${w * 0.96} ${h * 0.16}
                L ${w * 0.95} ${h * 0.40}
                L ${w * 0.94} ${h * 0.60}
                L ${w * 0.95} ${h * 0.84}
                Q ${w * 0.96} ${h * 0.98} ${w * 0.80} ${h}
                Q ${w * 0.50} ${h * 1.01} ${w * 0.20} ${h}
                Q ${w * 0.04} ${h * 0.98} ${w * 0.05} ${h * 0.84}
                L ${w * 0.06} ${h * 0.60}
                L ${w * 0.05} ${h * 0.40}
                L ${w * 0.04} ${h * 0.16}
                Q ${w * 0.04} ${h * 0.02} ${w * 0.20} 0
                Z
              `}
              fill={color}
              stroke="rgba(255, 255, 255, 0.24)"
              strokeWidth={1.2}
            />
            {/* Metallic body lighting */}
            <path
              d={`
                M ${w * 0.20} 0
                Q ${w * 0.50} ${-h * 0.01} ${w * 0.80} 0
                Q ${w * 0.96} ${h * 0.02} ${w * 0.96} ${h * 0.16}
                L ${w * 0.95} ${h * 0.40}
                L ${w * 0.94} ${h * 0.60}
                L ${w * 0.95} ${h * 0.84}
                Q ${w * 0.96} ${h * 0.98} ${w * 0.80} ${h}
                Q ${w * 0.50} ${h * 1.01} ${w * 0.20} ${h}
                Q ${w * 0.04} ${h * 0.98} ${w * 0.05} ${h * 0.84}
                L ${w * 0.06} ${h * 0.60}
                L ${w * 0.05} ${h * 0.40}
                L ${w * 0.04} ${h * 0.16}
                Q ${w * 0.04} ${h * 0.02} ${w * 0.20} 0
                Z
              `}
              fill={`url(#car-metallic-${uid})`}
            />

            {/* Clamshell Hood Shut-Line Accent */}
            <path d={`M ${w * 0.12} ${h * 0.74} Q ${w * 0.50} ${h * 0.76} ${w * 0.88} ${h * 0.74}`} fill="none" stroke="rgba(255, 255, 255, 0.3)" strokeWidth={0.8} />

            {/* Panoramic Glass Sunroof with Split Crossbeam */}
            <rect x={w * 0.20} y={h * 0.24} width={w * 0.60} height={h * 0.36} rx={4} fill={`url(#car-glass-${uid})`} stroke="rgba(255,255,255,0.2)" strokeWidth={0.8} />
            <line x1={w * 0.20} y1={h * 0.42} x2={w * 0.80} y2={h * 0.42} stroke="#1A202C" strokeWidth={2.5} />

            {/* Brushed Aluminum Flush Roof Rails */}
            <rect x={w * 0.15} y={h * 0.22} width={w * 0.03} height={h * 0.42} rx={1} fill="#CBD5E1" stroke="#475569" strokeWidth={0.5} />
            <rect x={w * 0.82} y={h * 0.22} width={w * 0.03} height={h * 0.42} rx={1} fill="#CBD5E1" stroke="#475569" strokeWidth={0.5} />

            {/* Upright Front Windshield */}
            <path
              d={`
                M ${w * 0.18} ${h * 0.60}
                Q ${w * 0.50} ${h * 0.63} ${w * 0.82} ${h * 0.60}
                L ${w * 0.78} ${h * 0.74}
                Q ${w * 0.50} ${h * 0.77} ${w * 0.22} ${h * 0.74}
                Z
              `}
              fill={`url(#car-glass-${uid})`}
              stroke="rgba(255, 255, 255, 0.25)"
              strokeWidth={0.8}
            />

            {/* Rear Tailgate Window with Wiper Arm */}
            <path
              d={`
                M ${w * 0.20} ${h * 0.14}
                Q ${w * 0.50} ${h * 0.12} ${w * 0.80} ${h * 0.14}
                L ${w * 0.78} ${h * 0.24}
                Q ${w * 0.50} ${h * 0.23} ${w * 0.22} ${h * 0.24}
                Z
              `}
              fill={`url(#car-glass-${uid})`}
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth={0.8}
            />
            <line x1={w * 0.50} y1={h * 0.14} x2={w * 0.38} y2={h * 0.19} stroke="#1E293B" strokeWidth={1} strokeLinecap="round" />

            {/* Sculpted SUV Side Mirrors */}
            <path d={`M ${w * 0.05} ${h * 0.59} L ${-w * 0.04} ${h * 0.57} Q ${-w * 0.06} ${h * 0.60} ${-w * 0.03} ${h * 0.64} L ${w * 0.05} ${h * 0.64} Z`} fill={color} stroke="#0F172A" strokeWidth={0.6} />
            <line x1={-w * 0.03} y1={h * 0.58} x2={-w * 0.03} y2={h * 0.62} stroke="#F59E0B" strokeWidth={0.8} />

            <path d={`M ${w * 0.95} ${h * 0.59} L ${w * 1.04} ${h * 0.57} Q ${w * 1.06} ${h * 0.60} ${w * 1.03} ${h * 0.64} L ${w * 0.95} ${h * 0.64} Z`} fill={color} stroke="#0F172A" strokeWidth={0.6} />
            <line x1={w * 1.03} y1={h * 0.58} x2={w * 1.03} y2={h * 0.62} stroke="#F59E0B" strokeWidth={0.8} />

            {/* Premium Jewel Quad-LED Headlights */}
            {/* Left Quad LED */}
            <g id="suv-left-headlight">
              <rect x={w * 0.08} y={h * 0.88} width={w * 0.18} height={h * 0.09} rx={2} fill="#0A0E14" stroke="rgba(255,255,255,0.4)" strokeWidth={0.6} />
              <circle cx={w * 0.12} cy={h * 0.91} r={1.6} fill="#FFFFFF" />
              <circle cx={w * 0.17} cy={h * 0.91} r={1.6} fill="#FFFFFF" />
              <circle cx={w * 0.22} cy={h * 0.91} r={1.6} fill="#FFFFFF" />
              <path d={`M ${w * 0.08} ${h * 0.95} L ${w * 0.26} ${h * 0.95}`} stroke="#FFFFFF" strokeWidth={1.4} filter={`url(#drl-glow-${uid})`} />
            </g>

            {/* Right Quad LED */}
            <g id="suv-right-headlight">
              <rect x={w * 0.74} y={h * 0.88} width={w * 0.18} height={h * 0.09} rx={2} fill="#0A0E14" stroke="rgba(255,255,255,0.4)" strokeWidth={0.6} />
              <circle cx={w * 0.78} cy={h * 0.91} r={1.6} fill="#FFFFFF" />
              <circle cx={w * 0.83} cy={h * 0.91} r={1.6} fill="#FFFFFF" />
              <circle cx={w * 0.88} cy={h * 0.91} r={1.6} fill="#FFFFFF" />
              <path d={`M ${w * 0.74} ${h * 0.95} L ${w * 0.92} ${h * 0.95}`} stroke="#FFFFFF" strokeWidth={1.4} filter={`url(#drl-glow-${uid})`} />
            </g>

            {/* Modern Slim Double Rear Light Guides */}
            <path d={`M ${w * 0.08} ${h * 0.03} L ${w * 0.32} ${h * 0.03} M ${w * 0.68} ${h * 0.03} L ${w * 0.92} ${h * 0.03}`} stroke="#EF4444" strokeWidth={2.4} strokeLinecap="round" filter={`url(#tail-glow-${uid})`} />
            <line x1={w * 0.44} y1={h * 0.015} x2={w * 0.56} y2={h * 0.015} stroke="#EF4444" strokeWidth={1.5} strokeLinecap="round" />
          </g>
        )}
      </g>
    );
  },
);

CarSvg.displayName = 'CarSvg';
