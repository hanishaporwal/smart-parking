import React from 'react';

export interface ParkWayLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  variant?: 'tile' | 'mark';
  className?: string;
  glow?: boolean;
}

export const ParkWayLogo: React.FC<ParkWayLogoProps> = ({
  size = 100,
  variant = 'tile',
  className = '',
  glow,
  ...props
}) => {
  // Glow filter dropped below 32px rendering size for sharpness
  const isGlowActive = glow !== undefined ? glow : size >= 32;

  // Instance-safe unique IDs for SVG defs
  const rawId = React.useId();
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  const tileGradId = `pw-tile-grad-${safeId}`;
  const glossGradId = `pw-gloss-grad-${safeId}`;
  const destGlowId = `pw-dest-glow-${safeId}`;
  const tileShadowId = `pw-tile-shadow-${safeId}`;

  if (variant === 'mark') {
    return (
      <svg
        role="img"
        aria-label="ParkWay logo"
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <defs>
          {isGlowActive && (
            <filter id={destGlowId} x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2.4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>

        {/* Glyph: Near-black #1C1C1E two-lane road shape */}
        <g fill="#1C1C1E">
          {/* 1. Outer P outline: stem left, top bar, bowl outer sweep */}
          <path
            d="M 30.2 71.5 L 30.2 28.5 C 30.2 24, 34 22.2, 39 22.2 L 55 22.2 C 67.5 22.2, 76.5 29.5, 76.5 39.7 C 76.5 49.8, 67.5 57.2, 55 57.2 L 43.5 57.2"
            fill="none"
            stroke="#1C1C1E"
            strokeWidth="7.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 2. Rounded bottom of stem connecting outer P and inner route */}
          <path
            d="M 30.2 71.5 C 30.2 78.5, 40.2 78.5, 40.2 71.5"
            fill="none"
            stroke="#1C1C1E"
            strokeWidth="7.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 3. Inner route line running up stem and curving right into bowl */}
          <path
            d="M 40.2 71.5 L 40.2 46 C 40.2 41.5, 43.5 39.7, 49 39.7 L 54.5 39.7"
            fill="none"
            stroke="#1C1C1E"
            strokeWidth="7.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 4. Arrow chevron pointing into bowl's end */}
          <polygon points="53.2,34.8 59.8,39.7 53.2,44.6 54.8,39.7" fill="#1C1C1E" />
        </g>

        {/* Start marker ring at stem bottom (centre (35.2, 71.5), radius ~2.85) */}
        <circle cx="35.2" cy="71.5" r="2.85" fill="#A98B6B" />

        {/* Luminous green destination dot at (64.3, 39.7), radius 3.2 */}
        {isGlowActive && (
          <circle cx="64.3" cy="39.7" r="5.2" fill="#86EFAC" opacity="0.4" filter={`url(#${destGlowId})`} />
        )}
        <circle cx="64.3" cy="39.7" r="3.2" fill="#22C55E" />
      </svg>
    );
  }

  return (
    <svg
      role="img"
      aria-label="ParkWay logo"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        {/* Soft diagonal gradient in muted bronze-brown accent #A98B6B */}
        <linearGradient id={tileGradId} x1="0.12" y1="0.1" x2="0.88" y2="0.9">
          <stop offset="0%" stopColor="#C4A482" />
          <stop offset="42%" stopColor="#A98B6B" />
          <stop offset="78%" stopColor="#8A6D52" />
          <stop offset="100%" stopColor="#70533A" />
        </linearGradient>

        {/* Top-left smooth diffused highlight */}
        <radialGradient id={glossGradId} cx="0.22" cy="0.22" r="0.42">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>

        {/* Luminous yellow-green destination dot glow */}
        {isGlowActive && (
          <filter id={destGlowId} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}

        {/* Soft clay drop shadow matching reference */}
        <filter id={tileShadowId} x="-12%" y="-12%" width="130%" height="135%">
          <feDropShadow dx="0" dy="3" stdDeviation="3.2" floodColor="#3A1A00" floodOpacity="0.35" />
          <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#000000" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Tactile rounded-square tile with soft shadow & gradient */}
      <rect
        x="9.5"
        y="10"
        width="81"
        height="78.5"
        rx="21"
        fill={`url(#${tileGradId})`}
        filter={`url(#${tileShadowId})`}
      />

      {/* Subtle darker rim on perimeter */}
      <rect
        x="9.5"
        y="10"
        width="81"
        height="78.5"
        rx="21"
        fill="none"
        stroke="rgba(180, 85, 10, 0.4)"
        strokeWidth="0.65"
      />

      {/* Soft diffused top-left 3D gloss */}
      <rect x="9.5" y="10" width="81" height="78.5" rx="21" fill={`url(#${glossGradId})`} />

      {/* Glyph: Near-black #1C1C1E two-lane road shape */}
      <g fill="#1C1C1E">
        {/* 1. Outer P outline: stem left, top bar, bowl outer sweep */}
        <path
          d="M 30.2 71.5 L 30.2 28.5 C 30.2 24, 34 22.2, 39 22.2 L 55 22.2 C 67.5 22.2, 76.5 29.5, 76.5 39.7 C 76.5 49.8, 67.5 57.2, 55 57.2 L 43.5 57.2"
          fill="none"
          stroke="#1C1C1E"
          strokeWidth="7.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 2. Rounded bottom of stem connecting outer P and inner route */}
        <path
          d="M 30.2 71.5 C 30.2 78.5, 40.2 78.5, 40.2 71.5"
          fill="none"
          stroke="#1C1C1E"
          strokeWidth="7.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 3. Inner route line running up stem and curving right into bowl */}
        <path
          d="M 40.2 71.5 L 40.2 46 C 40.2 41.5, 43.5 39.7, 49 39.7 L 54.5 39.7"
          fill="none"
          stroke="#1C1C1E"
          strokeWidth="7.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 4. Arrowhead pointing toward the destination dot */}
        <polygon points="53.2,34.8 59.8,39.7 53.2,44.6 54.8,39.7" fill="#1C1C1E" />
      </g>

      {/* Start marker ring at stem bottom (centre (35.2, 71.5), radius ~2.85) with tile-coloured centre */}
      <circle cx="35.2" cy="71.5" r="2.85" fill="#A98B6B" />

      {/* Luminous green destination dot (centre (64.3, 39.7), radius 3.2) with soft glow */}
      {isGlowActive && (
        <circle cx="64.3" cy="39.7" r="5.2" fill="#86EFAC" opacity="0.4" filter={`url(#${destGlowId})`} />
      )}
      <circle cx="64.3" cy="39.7" r="3.2" fill="#22C55E" />
    </svg>
  );
};
