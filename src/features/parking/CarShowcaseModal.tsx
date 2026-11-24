import React, { useState } from 'react';
import { CarSvg, CarStyle } from './CarSvg';
import { useSimStore } from '@/store';
import { Check, Sparkles, X, Palette, Eye } from 'lucide-react';

interface CarShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CAR_OPTIONS: {
  id: CarStyle;
  name: string;
  subtitle: string;
  tag: string;
  inspiration: string;
  features: string[];
}[] = [
  {
    id: 'sedan',
    name: 'Modern Luxury Sedan',
    subtitle: 'Sleek Aerodynamic Fastback',
    tag: 'Aero Luxury EV',
    inspiration: 'Porsche Taycan / Tesla Model S',
    features: [
      'Seamless panoramic smoked glass canopy',
      'Dual crystal projector LED matrix headlights',
      'Continuous full-width horizon LED taillight',
      'Flush door handles & sculpted aero creases',
    ],
  },
  {
    id: 'coupe',
    name: 'Performance GT Coupe',
    subtitle: 'Aggressive Wide-Body Stance',
    tag: 'Track GT Sport',
    inspiration: 'Audi e-tron GT / BMW M4',
    features: [
      'Flared muscular wheel arches & haunches',
      'Double-bubble carbon fiber aero roof',
      'Sharp laser-light DRL halos in smoked housing',
      'Hood power-dome & rear integrated lip spoiler',
    ],
  },
  {
    id: 'suv',
    name: 'Executive Crossover SUV',
    subtitle: 'Athletic Premium Presence',
    tag: 'Executive SUV',
    inspiration: 'Range Rover Velar / Porsche Macan',
    features: [
      'Jewel-eye quad-LED matrix projector lamps',
      'Sculpted clamshell hood shut-lines',
      'Brushed aluminum flush roof rails',
      'Expansive glass sunroof with rear wiper arm',
    ],
  },
];

const PREVIEW_COLORS = [
  { name: 'Royal Blue', hex: '#2563EB' },
  { name: 'Sunflower Yellow', hex: '#EAB308' },
  { name: 'Crimson Red', hex: '#E11D48' },
  { name: 'Sunset Amber', hex: '#EA580C' },
  { name: 'Emerald Teal', hex: '#0D9488' },
  { name: 'Charcoal Black', hex: '#2A2E35' },
  { name: 'Pearl White', hex: '#F8FAFC' },
];

export const CarShowcaseModal: React.FC<CarShowcaseModalProps> = ({ isOpen, onClose }) => {
  const currentCarStyle = useSimStore((s) => s.carStyle);
  const setCarStyle = useSimStore((s) => s.setCarStyle);

  const [selectedColor, setSelectedColor] = useState<string>('#2563EB');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl glass-g1 border border-white/10 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-border-1/60 bg-level-2/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gold/15 text-gold border border-gold/30 shadow-sm">
              <Sparkles className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h2 className="text-xl font-display font-medium text-text-1 tracking-tight">
                Realistic Vehicle Model Showcase
              </h2>
              <p className="text-xs font-ui text-text-3">
                Select your preferred realistic automotive design to apply across all parking bays and live guidance paths.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center glass-g3 text-text-3 hover:text-text-1 hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Preview Controls (Color Swatches & View Orientation) */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 border-b border-border-1/40 bg-level-1/40">
          {/* Color Palette Selector */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs font-mono text-text-3">
              <Palette className="w-3.5 h-3.5 text-gold" />
              <span>TEST COLOR:</span>
            </div>
            <div className="flex items-center gap-1.5">
              {PREVIEW_COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => setSelectedColor(c.hex)}
                  title={c.name}
                  className={`w-6 h-6 rounded-full border transition-all ${
                    selectedColor === c.hex
                      ? 'scale-115 ring-2 ring-gold border-white shadow-md'
                      : 'border-white/20 hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          {/* Orientation Toggle (Portrait Parking Slot vs Landscape Road Driving) */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-mono text-text-3">
              <Eye className="w-3.5 h-3.5 text-info" />
              <span>VIEW MODE:</span>
            </div>
            <div className="inline-flex rounded-xl p-0.5 glass-recessed border border-border-2">
              <button
                onClick={() => setOrientation('portrait')}
                className={`px-3 py-1 text-xs font-ui font-semibold rounded-lg transition-all ${
                  orientation === 'portrait'
                    ? 'bg-gold text-bg shadow-sm'
                    : 'text-text-3 hover:text-text-1'
                }`}
              >
                Slot (Portrait)
              </button>
              <button
                onClick={() => setOrientation('landscape')}
                className={`px-3 py-1 text-xs font-ui font-semibold rounded-lg transition-all ${
                  orientation === 'landscape'
                    ? 'bg-gold text-bg shadow-sm'
                    : 'text-text-3 hover:text-text-1'
                }`}
              >
                Aisle (Landscape)
              </button>
            </div>
          </div>
        </div>

        {/* 3 Model Cards Container */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          {CAR_OPTIONS.map((opt) => {
            const isCurrent = currentCarStyle === opt.id;

            return (
              <div
                key={opt.id}
                onClick={() => setCarStyle(opt.id)}
                className={`relative flex flex-col rounded-2xl p-5 cursor-pointer transition-all duration-200 border ${
                  isCurrent
                    ? 'glass-g2 border-gold/60 shadow-[0_0_24px_rgba(224,168,75,0.2)] ring-1 ring-gold/40'
                    : 'glass-g2 border-border-1/50 hover:border-white/20 hover:bg-white/[0.04]'
                }`}
              >
                {/* Active Selection Badge */}
                {isCurrent && (
                  <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/40 text-[10px] font-mono font-bold tracking-wide">
                    <Check className="w-3 h-3 stroke-[2.5]" />
                    <span>ACTIVE</span>
                  </div>
                )}

                {/* Tag & Name */}
                <div className="mb-4">
                  <span className="inline-block px-2.5 py-0.5 rounded-md bg-white/[0.06] text-text-3 text-[10.5px] font-mono font-medium tracking-wide mb-1.5">
                    {opt.tag}
                  </span>
                  <h3 className="text-lg font-display font-medium text-text-1 leading-snug">
                    {opt.name}
                  </h3>
                  <p className="text-xs font-ui text-text-3 mt-0.5">
                    Style: <span className="text-text-2">{opt.inspiration}</span>
                  </p>
                </div>

                {/* SVG Visual Stage */}
                <div className="w-full h-56 rounded-xl bg-asphalt/80 border border-white/[0.06] flex items-center justify-center p-3 my-2 shadow-inner overflow-hidden">
                  {orientation === 'portrait' ? (
                    <div className="w-24 h-48 flex items-center justify-center">
                      <CarSvg
                        width={90}
                        height={170}
                        color={selectedColor}
                        orientation="portrait"
                        style={opt.id}
                        facing="down"
                      />
                    </div>
                  ) : (
                    <div className="w-48 h-24 flex items-center justify-center">
                      <CarSvg
                        width={170}
                        height={90}
                        color={selectedColor}
                        orientation="landscape"
                        style={opt.id}
                      />
                    </div>
                  )}
                </div>

                {/* Feature Bullet Points */}
                <div className="mt-4 flex-1 space-y-2">
                  <div className="text-[11px] font-mono font-semibold text-text-3 uppercase tracking-wider">
                    Design Highlights
                  </div>
                  <ul className="space-y-1.5">
                    {opt.features.map((f, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs font-ui text-text-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gold/80 mt-1.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Apply Button */}
                <div className="mt-5 pt-3 border-t border-border-1/40">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCarStyle(opt.id);
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl font-ui font-semibold text-xs transition-all flex items-center justify-center gap-2 ${
                      isCurrent
                        ? 'bg-gold text-bg shadow-md cursor-default'
                        : 'glass-g3 text-text-1 hover:bg-white/15 hover:border-gold/50'
                    }`}
                  >
                    {isCurrent ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Applied Everywhere</span>
                      </>
                    ) : (
                      <span>Apply This Model</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-1/60 bg-level-2/70">
          <div className="text-xs font-mono text-text-3">
            Currently active model: <span className="text-gold font-bold uppercase">{currentCarStyle}</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gold hover:bg-gold/90 text-bg text-xs font-ui font-semibold shadow-md transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
