import React from 'react';

/** Fixed, non-scrolling ambient field behind all UI. No backdrop-filter. */
export const AmbientLayer: React.FC = () => {
  return (
    <div className="ambient-layer" aria-hidden="true">
      <div className="ambient-orbs">
        <div className="ambient-orb ambient-orb-gold" />
        <div className="ambient-orb ambient-orb-green" />
        <div className="ambient-orb ambient-orb-blue" />
      </div>
      <div className="ambient-vignette" />
      <div className="ambient-grain" />
    </div>
  );
};
