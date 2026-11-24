import React, { useState, useRef, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { clsx } from 'clsx';
import { COMPONENT_INFO, Fig3Numeral } from '@/features/fig3/componentInfo';
import {
  COMPONENT_CENTERS,
  clampPan,
  calcZoomStep,
  calcFocusOnHotspot,
  computeOverlayBubbleState,
  computeScreenChipPlacement,
  OverlayBubbleState,
  Point,
} from '@/features/fig3/geometry';

export type HotspotId = '101' | '102' | '103' | '104' | '105' | '106' | '107' | '108';

export interface HotspotInfo {
  id: HotspotId;
  numeral: string;
  title: string;
  subtitle: string;
  description: string;
  role: string;
}

export const HOTSPOT_DATA: Record<HotspotId, HotspotInfo> = {
  '101': {
    id: '101',
    numeral: '101',
    title: 'Parking Slots',
    subtitle: 'Physical Bays (S1–S8)',
    description:
      'Eight designated vehicle parking bays arranged across two parallel navigation lanes (Lane 0: S1–S4; Lane 1: S5–S8). Monitored continuously for vehicle occupancy.',
    role: 'Physical vehicle storage bays subject to ultrasonic presence detection.',
  },
  '102': {
    id: '102',
    numeral: '102',
    title: 'Ultrasonic Sensors',
    subtitle: 'HC-SR04 Distance Mesh',
    description:
      'Eight ceiling/bay-mounted HC-SR04 ultrasonic distance sensors operating at 40 kHz. Sampled sequentially via dedicated GPIO trigger and echo pins. Threshold: < 15 cm indicates occupancy.',
    role: 'Acoustic distance measurement detecting vehicle arrival or departure.',
  },
  '103': {
    id: '103',
    numeral: '103',
    title: 'ESP32 Microcontroller',
    subtitle: 'Dual-Core IoT Controller',
    description:
      'Xtensa dual-core 32-bit LX6 @ 240 MHz. Executes the parking classification loop (~100 ms), drives WS2812 pixel data streams (GPIO 23 & 15), and hosts the local HTTP telemetry server.',
    role: 'Core computing node executing sensor classification, path selection, and strip control.',
  },
  '104': {
    id: '104',
    numeral: '104',
    title: 'Status Indicator LEDs',
    subtitle: 'Solid Red Occupancy Markers',
    description:
      'Red visual indicator zones (RGB 255, 0, 0) demarcating occupied parking bays. Under the Red Preservation Rule, red zones are strictly immune from green sweep overwrites.',
    role: 'Instant visual confirmation that a specific parking space is taken.',
  },
  '105': {
    id: '105',
    numeral: '105',
    title: 'Sequential LED Guidance',
    subtitle: 'WS2812 Green Visual Pathway',
    description:
      'Addressable RGB LED strip units creating an animated physical light trail from the facility entrance to the nearest vacant bay. Sweeps sequentially at 15 ms/pixel, with 300 ms target flashing.',
    role: 'In-situ physical navigation path guiding drivers directly to available space.',
  },
  '106': {
    id: '106',
    numeral: '106',
    title: 'Wireless Communication',
    subtitle: 'Wi-Fi 802.11 b/g/n Telemetry',
    description:
      '2.4 GHz Wi-Fi link enabling local networking and remote monitoring. Serves real-time JSON telemetry at HTTP GET /status endpoint with slot occupancy arrays and target indices.',
    role: 'Wireless transport streaming IoT status to dashboards and mobile systems.',
  },
  '107': {
    id: '107',
    numeral: '107',
    title: 'Monitoring Dashboard',
    subtitle: 'Digital Twin Web Interface',
    description:
      'High-fidelity digital twin interface displaying top-down parking topology, live sensor measurements, and strip rendering states in real time.',
    role: 'Administrative and driver-facing visual management interface.',
  },
  '108': {
    id: '108',
    numeral: '108',
    title: 'Regulated Power Supply',
    subtitle: '5V / 3.3V DC Power Bus',
    description:
      'Regulated DC power distribution network supplying 5V DC for 200 × WS2812 RGB pixels (~1.8A max) and HC-SR04 sensors, with onboard 3.3V LDO regulation powering the ESP32 SoC.',
    role: 'Electrical power supply and common ground bus for all system peripherals.',
  },
};

const HOTSPOT_LIST: HotspotId[] = ['101', '102', '103', '104', '105', '106', '107', '108'];

export interface PatentArchitectureSvgProps {
  selectedId: HotspotId | null;
  onSelect: (id: HotspotId | null) => void;
  hoveredId?: HotspotId | null;
  onHover?: (id: HotspotId | null) => void;
  className?: string;
  zoom?: number;
  onZoomChange?: (zoom: number | ((prev: number) => number)) => void;
  pan?: { x: number; y: number };
  onPanChange?: (pan: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
}

export const PatentArchitectureSvg: React.FC<PatentArchitectureSvgProps> = ({
  selectedId,
  onSelect,
  hoveredId: externalHoveredId,
  onHover,
  className,
  zoom: externalZoom,
  onZoomChange,
  pan: externalPan,
  onPanChange,
}) => {
  const reducedMotion = useReducedMotion();
  const [internalHoveredId, setInternalHoveredId] = useState<HotspotId | null>(null);
  const [focusedId, setFocusedId] = useState<HotspotId | null>(null);
  const [rippleKey, setRippleKey] = useState<number>(0);

  // Zoom & Pan state (controlled with fallback to local state)
  const [internalZoom, setInternalZoom] = useState<number>(1.0);
  const [internalPan, setInternalPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const zoom = externalZoom !== undefined ? externalZoom : internalZoom;
  const setZoom = onZoomChange || setInternalZoom;
  const pan = externalPan !== undefined ? externalPan : internalPan;
  const setPan = onPanChange || setInternalPan;

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(880);
  const numeralRefs = useRef<Record<string, SVGGElement | null>>({});

  const dragStartRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const hasDraggedRef = useRef<boolean>(false);
  const touchPinchRef = useRef<{
    dist: number;
    svgMidX: number;
    svgMidY: number;
    zoom: number;
    panX: number;
    panY: number;
  } | null>(null);

  const activeHoverId = externalHoveredId !== undefined ? externalHoveredId : internalHoveredId;
  const isSelected = (id: HotspotId) => selectedId === id;

  const handleZoomStep = (delta: number) => {
    const res = calcZoomStep(delta, zoom, pan);
    setZoom(res.zoom);
    setPan(res.pan);
  };

  const handleFit = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const focusOnHotspot = (id: HotspotId, targetZoom = 2.0) => {
    const res = calcFocusOnHotspot(id, zoom, targetZoom);
    setZoom(res.zoom);
    setPan(res.pan);
  };

  useEffect(() => {
    setRippleKey(k => k + 1);
  }, [selectedId]);

  // When zoomed, selecting a numeral pans the view so the selected component is visible
  useEffect(() => {
    if (!selectedId || zoom <= 1.0) return;
    const center = COMPONENT_CENTERS[selectedId];
    if (!center) return;

    const visMinX = -pan.x / zoom;
    const visMaxX = (-pan.x + 880) / zoom;
    const visMinY = -pan.y / zoom;
    const visMaxY = (-pan.y + 525) / zoom;

    const margin = 50;
    const isOut =
      center.x < visMinX + margin ||
      center.x > visMaxX - margin ||
      center.y < visMinY + margin ||
      center.y > visMaxY - margin;

    if (isOut) {
      const desiredPanX = 440 - center.x * zoom;
      const desiredPanY = 262.5 - center.y * zoom;
      setPan(clampPan(desiredPanX, desiredPanY, zoom));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, zoom]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Ctrl/Cmd + wheel zoom toward cursor (without hijacking page scroll)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const svgX = (mouseX / rect.width) * 880;
      const svgY = (mouseY / rect.height) * 525;

      const delta = e.deltaY < 0 ? 0.25 : -0.25;
      setZoom(currentZoom => {
        const nextZoom = Math.min(3.0, Math.max(1.0, Math.round((currentZoom + delta) * 100) / 100));
        if (nextZoom === currentZoom) return currentZoom;

        setPan(currentPan => {
          if (nextZoom === 1.0) return { x: 0, y: 0 };
          const newPanX = currentPan.x + (svgX - currentPan.x) * (1 - nextZoom / currentZoom);
          const newPanY = currentPan.y + (svgY - currentPan.y) * (1 - nextZoom / currentZoom);
          const minX = 880 * (1 - nextZoom);
          const minY = 525 * (1 - nextZoom);
          return {
            x: Math.min(0, Math.max(minX, newPanX)),
            y: Math.min(0, Math.max(minY, newPanY)),
          };
        });

        return nextZoom;
      });
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pointer drag panning when zoomed
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || zoom <= 1.0) return;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    hasDraggedRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current || zoom <= 1.0) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    if (!hasDraggedRef.current && Math.hypot(dx, dy) > 4) {
      hasDraggedRef.current = true;
      setIsDragging(true);
    }

    if (hasDraggedRef.current) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const svgDx = (dx / rect.width) * 880;
      const svgDy = (dy / rect.height) * 525;
      const newPanX = dragStartRef.current.panX + svgDx;
      const newPanY = dragStartRef.current.panY + svgDy;
      setPan(clampPan(newPanX, newPanY, zoom));
    }
  };

  const handlePointerUp = () => {
    dragStartRef.current = null;
    setIsDragging(false);
  };

  // Touch pinch zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const midClientX = (t1.clientX + t2.clientX) / 2 - rect.left;
      const midClientY = (t1.clientY + t2.clientY) / 2 - rect.top;
      touchPinchRef.current = {
        dist,
        svgMidX: (midClientX / rect.width) * 880,
        svgMidY: (midClientY / rect.height) * 525,
        zoom,
        panX: pan.x,
        panY: pan.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchPinchRef.current) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const ratio = dist / touchPinchRef.current.dist;
      const nextZoom = Math.min(3.0, Math.max(1.0, Math.round(touchPinchRef.current.zoom * ratio * 100) / 100));

      const svgX = touchPinchRef.current.svgMidX;
      const svgY = touchPinchRef.current.svgMidY;
      const initialPanX = touchPinchRef.current.panX;
      const initialPanY = touchPinchRef.current.panY;
      const initialZoom = touchPinchRef.current.zoom;

      const newPanX = initialPanX + (svgX - initialPanX) * (1 - nextZoom / initialZoom);
      const newPanY = initialPanY + (svgY - initialPanY) * (1 - nextZoom / initialZoom);

      setZoom(nextZoom);
      setPan(clampPan(newPanX, newPanY, nextZoom));
    }
  };

  const handleTouchEnd = () => {
    touchPinchRef.current = null;
  };

  // Double click to zoom into component
  const handleDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement | SVGElement | null;
    const hotspotEl = target?.closest('[data-hotspot-id]') as HTMLElement | null;
    const clickedId = (hotspotEl?.dataset?.hotspotId as HotspotId) || selectedId || '103';

    if (zoom >= 2.75) {
      handleFit();
    } else {
      const nextZoom = zoom < 1.75 ? 2.0 : Math.min(3.0, zoom + 0.5);
      focusOnHotspot(clickedId, nextZoom);
    }
  };

  // Keyboard navigation (+, -, 0 for zoom/fit, Shift+Arrows for pan)
  const handleContainerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      handleZoomStep(0.25);
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      handleZoomStep(-0.25);
    } else if (e.key === '0') {
      e.preventDefault();
      handleFit();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      if (e.shiftKey && zoom > 1.0) {
        e.preventDefault();
        const panStep = 40;
        setPan(p => clampPan(p.x + panStep, p.y, zoom));
      }
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      if (e.shiftKey && zoom > 1.0) {
        e.preventDefault();
        const panStep = 40;
        setPan(p => clampPan(p.x - panStep, p.y, zoom));
      }
    }
  };

  // Compute responsive bubble radius ensuring at least 28px on-screen diameter on narrow screens
  const scale = Math.max(0.1, containerWidth / 880);
  const visualRadius = Math.max(16, Math.min(32, Math.round(14 / scale)));
  const hitRadius = Math.max(26, visualRadius + 10);
  const fontSize = Math.max(11, Math.round(visualRadius * 0.68));

  const handleHover = (id: HotspotId | null) => {
    setInternalHoveredId(id);
    onHover?.(id);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: HotspotId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(id);
      return;
    }
    const SEQUENCE: (HotspotId | null)[] = [null, ...HOTSPOT_LIST];
    const currentIndex = SEQUENCE.indexOf(id);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      const prevIndex = (currentIndex - 1 + SEQUENCE.length) % SEQUENCE.length;
      const prevId = SEQUENCE[prevIndex];
      onSelect(prevId);
      if (prevId) numeralRefs.current[prevId]?.focus();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      const nextIndex = (currentIndex + 1) % SEQUENCE.length;
      const nextId = SEQUENCE[nextIndex];
      onSelect(nextId);
      if (nextId) numeralRefs.current[nextId]?.focus();
    }
  };

  const activeChipId = activeHoverId || focusedId || selectedId;

  // Helper to determine wire flowing dash active state (all wires active when selectedId === null)
  const isWireActive = (activeNumerals: HotspotId[]) =>
    selectedId !== null ? activeNumerals.includes(selectedId) : true;

  const renderWire = (
    d: string,
    activeNumerals: HotspotId[],
    defaultStroke = '#A88C6C',
    defaultDash = 'none',
  ) => {
    const active = isWireActive(activeNumerals);
    const strokeColor = selectedId !== null
      ? (active ? '#A88C6C' : defaultStroke)
      : (defaultStroke !== '#A88C6C' ? defaultStroke : '#A88C6C');

    return (
      <g>
        <path
          d={d}
          fill="none"
          stroke={strokeColor}
          strokeWidth={active ? 2 : 1.25}
          strokeDasharray={active ? '8 6' : defaultDash}
          opacity={active ? (selectedId !== null ? 1 : 0.95) : 0.45}
          vectorEffect="non-scaling-stroke"
          className="transition-opacity duration-200"
        />
        {active && !reducedMotion && (
          <motion.path
            d={d}
            fill="none"
            stroke={strokeColor}
            strokeWidth={2}
            strokeDasharray="8 6"
            vectorEffect="non-scaling-stroke"
            animate={{ strokeDashoffset: [28, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </g>
    );
  };

  const bubbleStates = {} as Record<HotspotId, OverlayBubbleState>;
  const allBubbleScreens = {} as Record<HotspotId, Point>;
  HOTSPOT_LIST.forEach(id => {
    const state = computeOverlayBubbleState(id, zoom, pan.x, pan.y, visualRadius);
    bubbleStates[id] = state;
    allBubbleScreens[id] = state.bubbleScreen;
  });

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="region"
      aria-label="Patent Figure 3 architectural diagram. Use plus and minus keys to zoom, arrow keys to pan."
      onKeyDown={handleContainerKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ cursor: zoom > 1.0 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      className={clsx('relative w-full overflow-hidden select-none outline-none focus:ring-1 focus:ring-gold/30', className)}
    >
      <svg
        viewBox="0 0 880 525"
        className="w-full h-auto block max-w-full"
      >
        <defs>
          {/* Warm Charcoal Grid Pattern with visible blueprint engineering boxes */}
          <pattern id="arch-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="0.75" />
          </pattern>
          <pattern id="arch-grid-major" width="96" height="96" patternUnits="userSpaceOnUse">
            <path d="M 96 0 L 0 0 0 96" fill="none" stroke="rgba(255, 255, 255, 0.14)" strokeWidth="1" />
          </pattern>

          {/* Clay Raised Filter for Diagram Blocks */}
          <filter id="clay-block-shadow" x="-10%" y="-10%" width="125%" height="125%">
            <feDropShadow dx="3" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity={0.55} />
            <feDropShadow dx="-1" dy="-1" stdDeviation="2" floodColor="#FFF0E1" floodOpacity={0.04} />
          </filter>

          {/* ESP32 Clay PCB Surface */}
          <linearGradient id="esp32-pcb" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#221E1A" />
            <stop offset="100%" stopColor="#171412" />
          </linearGradient>

          <linearGradient id="shield-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2E2823" />
            <stop offset="50%" stopColor="#231F1B" />
            <stop offset="100%" stopColor="#1C1815" />
          </linearGradient>

          {/* Realistic Sensor HC-SR04 Gradients */}
          <linearGradient id="sensor-pcb-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E40AF" />
            <stop offset="40%" stopColor="#1D4ED8" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>

          <radialGradient id="sensor-can-grad" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="35%" stopColor="#CBD5E1" />
            <stop offset="70%" stopColor="#64748B" />
            <stop offset="100%" stopColor="#334155" />
          </radialGradient>

          <radialGradient id="sensor-inner-can" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0B132B" />
            <stop offset="80%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>

          <linearGradient id="crystal-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E2E8F0" />
            <stop offset="50%" stopColor="#F8FAFC" />
            <stop offset="100%" stopColor="#94A3B8" />
          </linearGradient>

          {/* Realistic ESP32 PCB Gradients */}
          <linearGradient id="esp32-pcb-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#221E1B" />
            <stop offset="30%" stopColor="#1A1715" />
            <stop offset="100%" stopColor="#100E0C" />
          </linearGradient>

          <linearGradient id="esp32-shield-metal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3E3833" />
            <stop offset="40%" stopColor="#28231E" />
            <stop offset="70%" stopColor="#332D28" />
            <stop offset="100%" stopColor="#1A1613" />
          </linearGradient>

          <linearGradient id="esp32-antenna-copper" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="50%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>

          <linearGradient id="pin-gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>

          <linearGradient id="chip-body-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1F1C1A" />
            <stop offset="100%" stopColor="#0E0C0B" />
          </linearGradient>

          {/* Realistic LED Strip SMD 5050 Gradients */}
          <linearGradient id="smd5050-pkg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="100%" stopColor="#CBD5E1" />
          </linearGradient>

          <radialGradient id="red-led-emission" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="1" />
            <stop offset="45%" stopColor="#DC2626" stopOpacity="0.8" />
            <stop offset="75%" stopColor="#991B1B" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#7F1D1D" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="green-led-emission" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22C55E" stopOpacity="1" />
            <stop offset="45%" stopColor="#16A34A" stopOpacity="0.8" />
            <stop offset="75%" stopColor="#15803D" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#14532D" stopOpacity="0" />
          </radialGradient>

          {/* Realistic Power Supply (SMPS) Gradients */}
          <linearGradient id="smps-cage-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3C3631" />
            <stop offset="25%" stopColor="#2E2824" />
            <stop offset="85%" stopColor="#1E1A17" />
            <stop offset="100%" stopColor="#14110F" />
          </linearGradient>

          <linearGradient id="smps-transformer-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FACC15" />
            <stop offset="100%" stopColor="#A16207" />
          </linearGradient>

          <radialGradient id="smps-copper-coil" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#D97706" />
            <stop offset="70%" stopColor="#92400E" />
            <stop offset="100%" stopColor="#451A03" />
          </radialGradient>

          {/* Realistic Wi-Fi Gateway Gradients */}
          <linearGradient id="wifi-chassis-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2C2723" />
            <stop offset="35%" stopColor="#1F1B18" />
            <stop offset="100%" stopColor="#12100E" />
          </linearGradient>

          <linearGradient id="wifi-antenna-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1E1B18" />
            <stop offset="40%" stopColor="#302A25" />
            <stop offset="100%" stopColor="#14110F" />
          </linearGradient>

          <linearGradient id="wifi-gold-sma" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>

          {/* Realistic Laptop Filters & Gradients */}
          <filter id="laptop-shadow-blur" x="-20%" y="-40%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>

          <linearGradient id="laptop-lid-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#282421" />
            <stop offset="25%" stopColor="#1E1A18" />
            <stop offset="85%" stopColor="#14110F" />
            <stop offset="100%" stopColor="#0E0C0A" />
          </linearGradient>

          <linearGradient id="laptop-lid-rim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF0E1" stopOpacity="0.45" />
            <stop offset="35%" stopColor="#FFF0E1" stopOpacity="0.12" />
            <stop offset="70%" stopColor="#FFF0E1" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#FFF0E1" stopOpacity="0.22" />
          </linearGradient>

          <linearGradient id="laptop-hinge-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0E0C0A" />
            <stop offset="30%" stopColor="#3A322C" />
            <stop offset="60%" stopColor="#221E1A" />
            <stop offset="100%" stopColor="#0B0908" />
          </linearGradient>

          <linearGradient id="laptop-deck-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#181513" />
            <stop offset="18%" stopColor="#25201C" />
            <stop offset="70%" stopColor="#201C19" />
            <stop offset="100%" stopColor="#2C2622" />
          </linearGradient>

          <linearGradient id="laptop-lip-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2E2824" />
            <stop offset="40%" stopColor="#1B1715" />
            <stop offset="100%" stopColor="#100E0C" />
          </linearGradient>

          <linearGradient id="laptop-trackpad-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1E1A17" />
            <stop offset="100%" stopColor="#171412" />
          </linearGradient>

          {/* Laptop Screen Clip & Realistic Reflection */}
          <clipPath id="laptop-screen-clip">
            <rect x="8" y="8" width="156" height="88" rx="3" />
          </clipPath>
          <linearGradient id="laptop-screen-glare" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.12" />
            <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.03" />
            <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="75%" stopColor="#FFFFFF" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Diagram Zoom & Pan Single Wrapper Group */}
        <g
          id="diagram-zoom-wrapper"
          transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
          style={{
            transformOrigin: '0 0',
          }}
        >
          {/* Background & Blueprint Grid (Warm Dark Base) - Fills all over the box */}
          <rect x="-880" y="-525" width="2640" height="1575" fill="#110E0C" onClick={() => onSelect(null)} className="cursor-pointer" />
          <rect x="-880" y="-525" width="2640" height="1575" fill="url(#arch-grid)" onClick={() => onSelect(null)} className="cursor-pointer" />
          <rect x="-880" y="-525" width="2640" height="1575" fill="url(#arch-grid-major)" onClick={() => onSelect(null)} className="cursor-pointer" />

        {/* =====================================================================
            101: PARKING SLOTS (BAYS S1, S2, S8) & 102: ULTRASONIC SENSORS (HC-SR04)
            Compact integrated architecture: sensors mounted directly at each bay
        ===================================================================== */}
        {/* Unified Outer Enclosure & Background */}
        <g id="enclosure-101-102">
          {/* Main Enclosure Card */}
          <rect
            x="32"
            y="82"
            width="236"
            height="202"
            rx="10"
            fill="#161311"
            stroke="rgba(255, 255, 255, 0.18)"
            strokeWidth="1.2"
            filter="url(#clay-block-shadow)"
          />
          {/* Subtle Vertical Divider between Bays and Sensors */}
          <line
            x1="168"
            y1="88"
            x2="168"
            y2="278"
            stroke="rgba(255, 255, 255, 0.07)"
            strokeDasharray="3 3"
          />
        </g>

        {/* =====================================================================
            HOTSPOT 101: PARKING SLOTS BAYS (S1, S2, S8)
        ===================================================================== */}
        {(() => {
          const active = isSelected('101');
          const isHovered = activeHoverId === '101';
          const isDimmed = selectedId !== null && !active && !isHovered;

          return (
            <g
              id="hotspot-101"
              aria-label={HOTSPOT_DATA['101'].title}
              onClick={() => onSelect('101')}
              onPointerEnter={() => handleHover('101')}
              onPointerLeave={() => handleHover(null)}
              className="cursor-pointer outline-none focus:outline-none"
              style={{ outline: 'none' }}
            >
              <motion.g
                animate={{
                  opacity: isDimmed ? 0.5 : 1,
                  scale: isHovered && !reducedMotion ? 1.01 : 1,
                }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              >
                {/* 101 Section Header Title */}
                <text
                  x="40"
                  y="95"
                  fill={active ? '#A88C6C' : isHovered ? '#F6F0E8' : '#D2C8BB'}
                  fontSize="7"
                  fontFamily="Hanken Grotesk, system-ui, sans-serif"
                  fontWeight="600"
                  className="select-none pointer-events-none"
                >
                  PARKING SLOTS (101)
                </text>

                {/* ---------------- SLOT 1 (S1) - OCCUPIED BAY ---------------- */}
                <g id="bay-s1">
                  {/* Bay Stall Outline & Asphalt */}
                  <rect
                    x="38"
                    y="104"
                    width="124"
                    height="36"
                    rx="4"
                    fill={active ? 'rgba(168, 140, 108, 0.14)' : isHovered ? 'rgba(255, 255, 255, 0.06)' : '#1B1816'}
                    stroke={active ? '#A88C6C' : isHovered ? 'rgba(168, 140, 108, 0.7)' : 'rgba(255, 255, 255, 0.16)'}
                    strokeWidth={active ? 1.6 : 0.9}
                    className="transition-all duration-150"
                  />
                  {/* Yellow Bay Stall Markings */}
                  <line x1="42" y1="105" x2="158" y2="105" stroke="#E8C53A" strokeWidth="1" />
                  <line x1="42" y1="139" x2="158" y2="139" stroke="#E8C53A" strokeWidth="1" />
                  {/* Rubber Wheel Stop */}
                  <rect x="42" y="108" width="3" height="28" rx="0.8" fill="#2E2823" stroke="#E8C53A" strokeWidth="0.4" />

                  {/* Stenciled Slot Number */}
                  <text x="48" y="113" fill="#D2C8BB" fontSize="5.5" fontFamily="IBM Plex Mono, monospace" fontWeight="700">
                    S1
                  </text>

                  {/* Compact Parked Vehicle: Sporty Red Sedan */}
                  <g id="vehicle-s1">
                    {/* 4 Tires */}
                    <rect x="58" y="108" width="10" height="2.5" rx="0.8" fill="#0A0807" />
                    <rect x="90" y="108" width="10" height="2.5" rx="0.8" fill="#0A0807" />
                    <rect x="58" y="133.5" width="10" height="2.5" rx="0.8" fill="#0A0807" />
                    <rect x="90" y="133.5" width="10" height="2.5" rx="0.8" fill="#0A0807" />
                    {/* Car Body */}
                    <rect x="54" y="110" width="50" height="24" rx="4" fill="#DC2626" stroke="#991B1B" strokeWidth="0.6" />
                    {/* Rear Window */}
                    <rect x="58" y="113" width="6" height="18" rx="1.5" fill="#0E0C0A" opacity={0.92} />
                    {/* Cabin Roof */}
                    <rect x="66" y="114" width="16" height="16" rx="2" fill="#B91C1C" />
                    {/* Front Windshield */}
                    <rect x="84" y="113" width="8" height="18" rx="1.5" fill="#0E0C0A" opacity={0.92} />
                    {/* Headlights */}
                    <circle cx="103" cy="113" r="1.3" fill="#FEF08A" />
                    <circle cx="103" cy="131" r="1.3" fill="#FEF08A" />
                    {/* Tail Lights */}
                    <circle cx="55" cy="113" r="1.1" fill="#7F1D1D" />
                    <circle cx="55" cy="131" r="1.1" fill="#7F1D1D" />
                  </g>
                </g>

                {/* ---------------- SLOT 2 (S2) - OCCUPIED BAY ---------------- */}
                <g id="bay-s2">
                  {/* Bay Stall Outline & Asphalt */}
                  <rect
                    x="38"
                    y="152"
                    width="124"
                    height="36"
                    rx="4"
                    fill={active ? 'rgba(168, 140, 108, 0.14)' : isHovered ? 'rgba(255, 255, 255, 0.06)' : '#1B1816'}
                    stroke={active ? '#A88C6C' : isHovered ? 'rgba(168, 140, 108, 0.7)' : 'rgba(255, 255, 255, 0.16)'}
                    strokeWidth={active ? 1.6 : 0.9}
                    className="transition-all duration-150"
                  />
                  {/* Yellow Bay Stall Markings */}
                  <line x1="42" y1="153" x2="158" y2="153" stroke="#E8C53A" strokeWidth="1" />
                  <line x1="42" y1="187" x2="158" y2="187" stroke="#E8C53A" strokeWidth="1" />
                  {/* Rubber Wheel Stop */}
                  <rect x="42" y="156" width="3" height="28" rx="0.8" fill="#2E2823" stroke="#E8C53A" strokeWidth="0.4" />

                  {/* Stenciled Slot Number */}
                  <text x="48" y="161" fill="#D2C8BB" fontSize="5.5" fontFamily="IBM Plex Mono, monospace" fontWeight="700">
                    S2
                  </text>

                  {/* Compact Parked Vehicle: Sapphire Blue Sedan */}
                  <g id="vehicle-s2">
                    {/* 4 Tires */}
                    <rect x="58" y="156" width="10" height="2.5" rx="0.8" fill="#0A0807" />
                    <rect x="90" y="156" width="10" height="2.5" rx="0.8" fill="#0A0807" />
                    <rect x="58" y="181.5" width="10" height="2.5" rx="0.8" fill="#0A0807" />
                    <rect x="90" y="181.5" width="10" height="2.5" rx="0.8" fill="#0A0807" />
                    {/* Car Body */}
                    <rect x="54" y="158" width="50" height="24" rx="4" fill="#2563EB" stroke="#1D4ED8" strokeWidth="0.6" />
                    {/* Rear Window */}
                    <rect x="58" y="161" width="6" height="18" rx="1.5" fill="#0E0C0A" opacity={0.92} />
                    {/* Cabin Roof */}
                    <rect x="66" y="162" width="16" height="16" rx="2" fill="#1E40AF" />
                    {/* Front Windshield */}
                    <rect x="84" y="161" width="8" height="18" rx="1.5" fill="#0E0C0A" opacity={0.92} />
                    {/* Headlights */}
                    <circle cx="103" cy="161" r="1.3" fill="#FEF08A" />
                    <circle cx="103" cy="179" r="1.3" fill="#FEF08A" />
                    {/* Tail Lights */}
                    <circle cx="55" cy="161" r="1.1" fill="#7F1D1D" />
                    <circle cx="55" cy="179" r="1.1" fill="#7F1D1D" />
                  </g>
                </g>

                {/* ---------------- MIDDLE CADENCE (SLOTS S3 - S7) ---------------- */}
                <g id="cadence-bays">
                  <circle cx="100" cy="196" r="1.5" fill="#A99F92" opacity={0.7} />
                  <circle cx="100" cy="201" r="1.5" fill="#A99F92" opacity={0.7} />
                  <circle cx="100" cy="206" r="1.5" fill="#A99F92" opacity={0.7} />
                </g>

                {/* ---------------- SLOT 8 (S8) - VACANT BAY ---------------- */}
                <g id="bay-s8">
                  {/* Bay Stall Outline & Asphalt */}
                  <rect
                    x="38"
                    y="224"
                    width="124"
                    height="36"
                    rx="4"
                    fill={active ? 'rgba(168, 140, 108, 0.14)' : isHovered ? 'rgba(255, 255, 255, 0.06)' : '#1B1816'}
                    stroke={active ? '#A88C6C' : isHovered ? 'rgba(168, 140, 108, 0.7)' : 'rgba(95, 208, 138, 0.35)'}
                    strokeWidth={active ? 1.6 : 0.9}
                    className="transition-all duration-150"
                  />
                  {/* Yellow/Green Bay Stall Markings */}
                  <line x1="42" y1="225" x2="158" y2="225" stroke="#5FD08A" strokeWidth="0.9" strokeDasharray="5 2.5" opacity={0.8} />
                  <line x1="42" y1="259" x2="158" y2="259" stroke="#5FD08A" strokeWidth="0.9" strokeDasharray="5 2.5" opacity={0.8} />
                  {/* Rubber Wheel Stop */}
                  <rect x="42" y="228" width="3" height="28" rx="0.8" fill="#2E2823" stroke="#5FD08A" strokeWidth="0.4" />

                  {/* Stenciled Slot Number */}
                  <text x="48" y="233" fill="#5FD08A" fontSize="5.5" fontFamily="IBM Plex Mono, monospace" fontWeight="700">
                    S8
                  </text>

                  {/* Clean Vacant Parking "P" Circle Marker (Unwanted overlapping text removed) */}
                  <g transform="translate(80, 242)">
                    <circle cx="0" cy="0" r="10" fill="rgba(95, 208, 138, 0.08)" stroke="#5FD08A" strokeWidth="0.9" strokeDasharray="2.5 1.5" />
                    <text x="0" y="3.5" textAnchor="middle" fill="#5FD08A" fontSize="9" fontWeight="bold" fontFamily="Hanken Grotesk, sans-serif">
                      P
                    </text>
                  </g>
                </g>
              </motion.g>
            </g>
          );
        })()}

        {/* =====================================================================
            HOTSPOT 102: ULTRASONIC SENSORS (HC-SR04 MESH MOUNTED ON EACH BAY)
        ===================================================================== */}
        {(() => {
          const active = isSelected('102');
          const isHovered = activeHoverId === '102';
          const isDimmed = selectedId !== null && !active && !isHovered;

          // Helper to render an authentic compact HC-SR04 module mounted at the head of a bay
          const renderMountedSensor = (
            yCenter: number,
            slotId: string,
            isOccupied: boolean,
            distanceCm: number,
            showWaves = true,
          ) => {
            const sensorX = 170;
            const sensorY = yCenter - 18;

            return (
              <g key={`sensor-${slotId}`}>
                {/* 1. Rigid Mounting Bracket attaching sensor to the parking bay */}
                <rect x="164" y={yCenter - 3} width="6" height="6" rx="1" fill="#374151" stroke="#4B5563" strokeWidth="0.4" />
                <circle cx="167" cy={yCenter} r="0.9" fill="#9CA3AF" />

                {/* 2. Acoustic Measurement Zone (Between car bumper and sensor) */}
                {/* Expanding 40 kHz Ultrasonic Sonar Wave Arcs radiating from Transmitter "T" into the bay */}
                {(active || selectedId === null || showWaves) && !reducedMotion && (
                  <g>
                    <motion.path
                      d={`M ${sensorX} ${yCenter - 11} Q ${sensorX - 14} ${yCenter} ${sensorX} ${yCenter + 11}`}
                      fill="none"
                      stroke="#C9C2B8"
                      strokeWidth={1.2}
                      initial={{ x: 0, opacity: 0.9 }}
                      animate={{ x: isOccupied ? -38 : -85, opacity: 0 }}
                      transition={{ duration: 1.1, repeat: Infinity, ease: 'easeOut' }}
                    />
                    <motion.path
                      d={`M ${sensorX} ${yCenter - 11} Q ${sensorX - 14} ${yCenter} ${sensorX} ${yCenter + 11}`}
                      fill="none"
                      stroke="#C9C2B8"
                      strokeWidth={1.2}
                      initial={{ x: 0, opacity: 0.9 }}
                      animate={{ x: isOccupied ? -38 : -85, opacity: 0 }}
                      transition={{ duration: 1.1, repeat: Infinity, delay: 0.55, ease: 'easeOut' }}
                    />
                  </g>
                )}

                {/* Compact Distance Measurement Readout Badge */}
                <g transform={`translate(136, ${yCenter})`}>
                  <rect
                    x="-18"
                    y="-6.5"
                    width="36"
                    height="13"
                    rx="2.5"
                    fill={isOccupied ? '#1C1412' : '#122017'}
                    stroke={isOccupied ? '#EF4444' : '#5FD08A'}
                    strokeWidth="0.75"
                    className="shadow-sm"
                  />
                  <circle cx="-12" cy="0" r="1.4" fill={isOccupied ? '#EF4444' : '#5FD08A'} />
                  <text
                    x="2"
                    y="2.5"
                    textAnchor="middle"
                    fill={isOccupied ? '#EF6B6B' : '#5FD08A'}
                    fontSize="4.2"
                    fontFamily="IBM Plex Mono, monospace"
                    fontWeight="600"
                  >
                    {isOccupied ? `${distanceCm}cm` : `${distanceCm}cm`}
                  </text>
                </g>

                {/* 3. Compact HC-SR04 Photorealistic Sensor Board */}
                <g transform={`translate(${sensorX}, ${sensorY})`}>
                  {/* Blue FR-4 Fiberglass PCB */}
                  <rect
                    x="0"
                    y="0"
                    width="94"
                    height="36"
                    rx="3.5"
                    fill={active ? 'rgba(168, 140, 108, 0.22)' : 'url(#sensor-pcb-grad)'}
                    stroke={active ? '#A88C6C' : isHovered ? 'rgba(168, 140, 108, 0.8)' : '#C9C2B8'}
                    strokeOpacity={active ? 1 : isHovered ? 0.9 : 0.65}
                    strokeWidth={active ? 2 : isHovered ? 1.6 : 1.1}
                    filter="url(#clay-block-shadow)"
                    className="transition-all duration-150"
                  />

                  {/* 4 Corner Silver Plated Solder Mounting Holes */}
                  <circle cx="3.5" cy="3.5" r="1.3" fill="#1E293B" stroke="#94A3B8" strokeWidth="0.6" />
                  <circle cx="90.5" cy="3.5" r="1.3" fill="#1E293B" stroke="#94A3B8" strokeWidth="0.6" />
                  <circle cx="3.5" cy="32.5" r="1.3" fill="#1E293B" stroke="#94A3B8" strokeWidth="0.6" />
                  <circle cx="90.5" cy="32.5" r="1.3" fill="#1E293B" stroke="#94A3B8" strokeWidth="0.6" />

                  {/* Left Transducer "T" (Transmitter) */}
                  <circle cx="24" cy="18" r="11" fill="url(#sensor-can-grad)" stroke="#64748B" strokeWidth="0.6" />
                  <circle cx="24" cy="18" r="9" fill="url(#sensor-inner-can)" stroke="#1E293B" strokeWidth="0.6" />
                  <circle cx="24" cy="18" r="6.5" fill="none" stroke="#475569" strokeWidth="0.4" strokeDasharray="1.2 0.8" />
                  <circle cx="24" cy="18" r="4.2" fill="none" stroke="#64748B" strokeWidth="0.4" strokeDasharray="1.2 0.8" />
                  <circle cx="24" cy="18" r="2.2" fill="#C9C2B8" />
                  <text x="14" y="10" fill="#FFFFFF" opacity={0.85} fontSize="3.8" fontWeight="bold" fontFamily="IBM Plex Mono, monospace">T</text>

                  {/* Right Transducer "R" (Receiver) */}
                  <circle cx="70" cy="18" r="11" fill="url(#sensor-can-grad)" stroke="#64748B" strokeWidth="0.6" />
                  <circle cx="70" cy="18" r="9" fill="url(#sensor-inner-can)" stroke="#1E293B" strokeWidth="0.6" />
                  <circle cx="70" cy="18" r="6.5" fill="none" stroke="#475569" strokeWidth="0.4" strokeDasharray="1.2 0.8" />
                  <circle cx="70" cy="18" r="4.2" fill="none" stroke="#64748B" strokeWidth="0.4" strokeDasharray="1.2 0.8" />
                  <circle cx="70" cy="18" r="2.2" fill="#C9C2B8" />
                  <text x="80" y="10" fill="#FFFFFF" opacity={0.85} fontSize="3.8" fontWeight="bold" fontFamily="IBM Plex Mono, monospace">R</text>

                  {/* Center Components: 16MHz Crystal Oscillator & Op-Amp IC */}
                  <rect x="44" y="6" width="5" height="11" rx="2" fill="url(#crystal-grad)" stroke="#475569" strokeWidth="0.3" />
                  <text x="46.5" y="13" textAnchor="middle" fill="#334155" fontSize="2.3" fontFamily="IBM Plex Mono, monospace">16M</text>

                  <rect x="43" y="21" width="8" height="6" rx="0.5" fill="#0F172A" stroke="#334155" strokeWidth="0.3" />
                  <circle cx="44.2" cy="22.2" r="0.3" fill="#94A3B8" />

                  {/* 4-Pin Right Angle Header Shroud & Gold Pins on Right Edge */}
                  <rect x="86" y="11" width="3" height="14" rx="0.4" fill="#0A0807" />
                  <rect x="88.5" y="12.5" width="5.5" height="1.5" rx="0.3" fill="url(#pin-gold-grad)" />
                  <rect x="88.5" y="15.5" width="5.5" height="1.5" rx="0.3" fill="url(#pin-gold-grad)" />
                  <rect x="88.5" y="18.5" width="5.5" height="1.5" rx="0.3" fill="url(#pin-gold-grad)" />
                  <rect x="88.5" y="21.5" width="5.5" height="1.5" rx="0.3" fill="url(#pin-gold-grad)" />

                  {/* Silk-Screen Pinout Text */}
                  <text x="47" y="31.5" textAnchor="middle" fill="#FFFFFF" opacity={0.7} fontSize="2.8" fontFamily="IBM Plex Mono, monospace" letterSpacing="0.06em">
                    VCC TRIG ECHO GND
                  </text>

                  {/* Sensor Model & Slot Identification Label */}
                  <text x="47" y="5" textAnchor="middle" fill="#FFFFFF" opacity={0.85} fontSize="3.8" fontWeight="600" fontFamily="Hanken Grotesk, sans-serif">
                    HC-SR04 ({slotId})
                  </text>
                </g>
              </g>
            );
          };

          return (
            <g
              id="hotspot-102"
              aria-label={HOTSPOT_DATA['102'].title}
              onClick={() => onSelect('102')}
              onPointerEnter={() => handleHover('102')}
              onPointerLeave={() => handleHover(null)}
              className="cursor-pointer outline-none focus:outline-none"
              style={{ outline: 'none' }}
            >
              <motion.g
                animate={{
                  opacity: isDimmed ? 0.5 : 1,
                  scale: isHovered && !reducedMotion ? 1.01 : 1,
                }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              >
                {/* 102 Section Header Title */}
                <text
                  x="176"
                  y="95"
                  fill={active ? '#A88C6C' : isHovered ? '#F6F0E8' : '#D2C8BB'}
                  fontSize="7"
                  fontFamily="Hanken Grotesk, system-ui, sans-serif"
                  fontWeight="600"
                  className="select-none pointer-events-none"
                >
                  ULTRASONIC SENSORS (102)
                </text>

                {/* Sensor 1 (Mounted on Slot 1) */}
                {renderMountedSensor(122, 'Slot 1', true, 8, true)}

                {/* Sensor 2 (Mounted on Slot 2) */}
                {renderMountedSensor(170, 'Slot 2', true, 8, true)}

                {/* Vertical Cadence Ellipsis */}
                <g id="cadence-sensors">
                  <circle cx="217" cy="196" r="1.5" fill="#A99F92" opacity={0.7} />
                  <circle cx="217" cy="201" r="1.5" fill="#A99F92" opacity={0.7} />
                  <circle cx="217" cy="206" r="1.5" fill="#A99F92" opacity={0.7} />
                </g>

                {/* Sensor 8 (Mounted on Slot 8) */}
                {renderMountedSensor(242, 'Slot 8', false, 400, true)}
              </motion.g>
            </g>
          );
        })()}

        {/* =====================================================================
            BUS WIRES: SENSORS TO ESP32 (HOTSPOTS 102 & 103)
            Clean, non-overlapping orthogonal schematic traces to ESP32 GPIOs
        ===================================================================== */}
        {renderWire('M 264 122 L 315 122 L 315 155 L 369 155', ['102', '103'])}
        {renderWire('M 264 170 L 335 170 L 335 186 L 369 186', ['102', '103'])}
        {renderWire('M 264 242 L 315 242 L 315 218 L 369 218', ['102', '103'])}

        {/* =====================================================================
            103: ESP32 MICROCONTROLLER BOARD (CENTER)
            Position locked on static outer <g transform="translate(365, 115)">
        ===================================================================== */}
        {(() => {
          const active = isSelected('103');
          const isHovered = activeHoverId === '103';
          const isDimmed = selectedId !== null && !active && !isHovered;

          const LEFT_PINS = ['3V3', 'EN', 'VP', 'VN', 'D34', 'D35', 'D32', 'D33', 'D25', 'D26', 'D27', 'D14', 'D12', 'GND', 'D13'];
          const RIGHT_PINS = ['D23', 'D22', 'TX0', 'RX0', 'D21', 'D19', 'D18', 'D5', 'TX2', 'RX2', 'D4', 'D2', 'D15', 'GND', '5V'];

          return (
            <g
              id="hotspot-103"
              transform="translate(365, 115)"
              aria-label={HOTSPOT_DATA['103'].title}
              onClick={() => onSelect('103')}
              onPointerEnter={() => handleHover('103')}
              onPointerLeave={() => handleHover(null)}
              className="cursor-pointer outline-none focus:outline-none"
              style={{ outline: 'none' }}
            >
              <motion.g
                animate={{
                  opacity: isDimmed ? 0.55 : 1,
                  scale: isHovered && !reducedMotion ? 1.015 : 1,
                }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              >
                {/* 1. Matte-Black High-Tg FR-4 PCB Base */}
                <rect
                  x="0"
                  y="0"
                  width="120"
                  height="185"
                  rx="10"
                  fill={active ? 'rgba(168, 140, 108, 0.16)' : isHovered ? 'rgba(255, 255, 255, 0.08)' : 'url(#esp32-pcb-grad)'}
                  stroke={active ? '#A88C6C' : isHovered ? 'rgba(168, 140, 108, 0.7)' : 'rgba(255, 255, 255, 0.25)'}
                  strokeWidth={active ? 2.5 : isHovered ? 2 : 1.5}
                  filter="url(#clay-block-shadow)"
                  className="transition-all duration-150"
                />

                {/* 4 Corner Silver Plated Solder Mounting Holes */}
                <circle cx="7" cy="7" r="2.2" fill="#120F0D" stroke="#94A3B8" strokeWidth="0.8" />
                <circle cx="113" cy="7" r="2.2" fill="#120F0D" stroke="#94A3B8" strokeWidth="0.8" />
                <circle cx="7" cy="178" r="2.2" fill="#120F0D" stroke="#94A3B8" strokeWidth="0.8" />
                <circle cx="113" cy="178" r="2.2" fill="#120F0D" stroke="#94A3B8" strokeWidth="0.8" />

                {/* 2. Top Inverted-F Meander PCB Antenna (MIFA) */}
                <rect x="25" y="3" width="70" height="19" rx="2" fill="#18120C" stroke="#2B2117" strokeWidth="0.5" />
                <path
                  d="M 35 20 L 35 6 L 85 6 L 85 10 L 73 10 L 73 15 L 85 15 L 85 20"
                  fill="none"
                  stroke="url(#esp32-antenna-copper)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* 3. 30-Pin Dual Inline Headers with Authentic Pin Labels */}
                {/* Left Header Insulator Block */}
                <rect x="3" y="14" width="8" height="157" rx="1" fill="#120F0D" stroke="#2B2621" strokeWidth="0.4" />
                {LEFT_PINS.map((pin, i) => {
                  const py = 16 + i * 10.5;
                  return (
                    <g key={`lpin-${pin}`}>
                      <rect x="4" y={py} width="6" height="5" rx="0.5" fill="url(#pin-gold-grad)" />
                      <circle cx="7" cy={py + 2.5} r="1" fill="#1A1510" />
                      <text x="13" y={py + 4} fill="#D2C8BB" fontSize="4.2" fontFamily="IBM Plex Mono, monospace" fontWeight="500">
                        {pin}
                      </text>
                    </g>
                  );
                })}

                {/* Right Header Insulator Block */}
                <rect x="109" y="14" width="8" height="157" rx="1" fill="#120F0D" stroke="#2B2621" strokeWidth="0.4" />
                {RIGHT_PINS.map((pin, i) => {
                  const py = 16 + i * 10.5;
                  const isSpecial = pin === 'D23' || pin === 'D15';
                  return (
                    <g key={`rpin-${pin}`}>
                      <rect x="110" y={py} width="6" height="5" rx="0.5" fill="url(#pin-gold-grad)" />
                      <circle cx="113" cy={py + 2.5} r="1" fill="#1A1510" />
                      <text
                        x="107"
                        y={py + 4}
                        textAnchor="end"
                        fill={isSpecial ? '#A88C6C' : '#D2C8BB'}
                        fontSize="4.2"
                        fontFamily="IBM Plex Mono, monospace"
                        fontWeight={isSpecial ? 'bold' : '500'}
                      >
                        {pin}
                      </text>
                    </g>
                  );
                })}

                {/* 4. ESP-WROOM-32 Metal RF Shield Can */}
                <motion.rect
                  x="22"
                  y="24"
                  width="76"
                  height="74"
                  rx="4"
                  fill="url(#esp32-shield-metal)"
                  stroke={active ? '#A88C6C' : isHovered ? 'rgba(168, 140, 108, 0.6)' : 'rgba(255, 255, 255, 0.25)'}
                  strokeWidth={active ? 1.5 : 1}
                  animate={
                    (active || selectedId === null) && !reducedMotion
                      ? { strokeOpacity: [0.6, 1, 0.6] }
                      : undefined
                  }
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />

                {/* Stamped Shield Laser Markings */}
                <text x="60" y="44" textAnchor="middle" fill="#F6F0E8" fontSize="7.5" fontWeight="bold" fontFamily="Hanken Grotesk, system-ui, sans-serif" letterSpacing="0.05em">
                  ESP32
                </text>
                <text x="60" y="55" textAnchor="middle" fill="#D2C8BB" fontSize="6.2" fontFamily="Hanken Grotesk, system-ui, sans-serif">
                  WROOM-32
                </text>
                <text x="60" y="65" textAnchor="middle" fill="#A99F92" fontSize="4.2" fontFamily="IBM Plex Mono, monospace">
                  FCC ID: 2AC7Z-ESPWROOM32
                </text>
                {/* 2D DataMatrix Simulation */}
                <rect x="80" y="32" width="10" height="10" fill="#14110F" stroke="#3A332D" strokeWidth="0.4" />
                <rect x="82" y="34" width="3" height="3" fill="#D2C8BB" />
                <rect x="86" y="37" width="2" height="2" fill="#D2C8BB" />

                {/* Board Model Title */}
                <text x="60" y="101" textAnchor="middle" fill="#F6F0E8" fontSize="6.5" fontWeight="600" fontFamily="Hanken Grotesk, system-ui, sans-serif">
                  ESP32 DevKit (103)
                </text>

                {/* 5. AMS1117 3.3V Low-Dropout Voltage Regulator */}
                <rect x="48" y="105" width="24" height="13" rx="1.5" fill="url(#chip-body-grad)" stroke="#2B2621" strokeWidth="0.4" />
                <rect x="53" y="102" width="14" height="3" fill="#94A3B8" rx="0.5" />
                <rect x="51" y="118" width="2.5" height="3" fill="#CBD5E1" />
                <rect x="59" y="118" width="2.5" height="3" fill="#CBD5E1" />
                <rect x="67" y="118" width="2.5" height="3" fill="#CBD5E1" />
                <text x="60" y="114" textAnchor="middle" fill="#A99F92" fontSize="3.6" fontFamily="IBM Plex Mono, monospace">AMS1117-3.3</text>

                {/* 6. Silicon Labs CP2102 USB-to-UART Bridge IC */}
                <rect x="49" y="125" width="22" height="18" rx="1.5" fill="url(#chip-body-grad)" stroke="#3A332D" strokeWidth="0.4" />
                <circle cx="52" cy="128" r="0.6" fill="#94A3B8" />
                <text x="60" y="136" textAnchor="middle" fill="#D2C8BB" fontSize="4.5" fontFamily="IBM Plex Mono, monospace" fontWeight="600">CP2102</text>

                {/* 7. Status LEDs */}
                <circle cx="43" cy="147" r="1.3" fill="#EF4444" />
                <text x="43" y="144" textAnchor="middle" fill="#EF6B6B" fontSize="3.2" fontFamily="IBM Plex Mono, monospace">PWR</text>
                <circle cx="77" cy="147" r="1.3" fill="#38BDF8" />
                <text x="77" y="144" textAnchor="middle" fill="#38BDF8" fontSize="3.2" fontFamily="IBM Plex Mono, monospace">IO2</text>

                {/* 8. Tactile Microswitches (EN & BOOT) */}
                {/* EN Switch */}
                <rect x="25" y="152" width="16" height="12" rx="1" fill="#1C1815" stroke="#3A332D" strokeWidth="0.4" />
                <circle cx="33" cy="158" r="3.2" fill="#D2C8BB" stroke="#64748B" strokeWidth="0.5" />
                <text x="33" y="170" textAnchor="middle" fill="#A99F92" fontSize="4.5" fontFamily="IBM Plex Mono, monospace">EN</text>

                {/* BOOT Switch */}
                <rect x="79" y="152" width="16" height="12" rx="1" fill="#1C1815" stroke="#3A332D" strokeWidth="0.4" />
                <circle cx="87" cy="158" r="3.2" fill="#D2C8BB" stroke="#64748B" strokeWidth="0.5" />
                <text x="87" y="170" textAnchor="middle" fill="#A99F92" fontSize="4.5" fontFamily="IBM Plex Mono, monospace">BOOT</text>

                {/* 9. Stainless Steel Micro-USB Port */}
                <rect x="48" y="171" width="24" height="14" rx="2" fill="#24201D" stroke="#0E0C0A" strokeWidth="1" />
                <rect x="52" y="176" width="16" height="6" rx="1" fill="#0A0807" />
                {/* 5 Gold Contact Pins */}
                {Array.from({ length: 5 }).map((_, i) => (
                  <rect key={`usb-pin-${i}`} x={55 + i * 2.5} y="177" width="1.2" height="3" fill="#FDE047" />
                ))}
              </motion.g>
            </g>
          );
        })()}

        {/* =====================================================================
            104: STATUS INDICATOR RED LEDS (BOTTOM LEFT)
            Position locked on static outer <g transform="translate(150, 360)">
        ===================================================================== */}
        {(() => {
          const active = isSelected('104');
          const isHovered = activeHoverId === '104';
          const isDimmed = selectedId !== null && !active && !isHovered;

          return (
            <g
              id="hotspot-104"
              transform="translate(150, 360)"
              aria-label={HOTSPOT_DATA['104'].title}
              onClick={() => onSelect('104')}
              onPointerEnter={() => handleHover('104')}
              onPointerLeave={() => handleHover(null)}
              className="cursor-pointer outline-none focus:outline-none"
              style={{ outline: 'none' }}
            >
              <motion.g
                animate={{
                  opacity: isDimmed ? 0.55 : 1,
                  scale: isHovered && !reducedMotion ? 1.015 : 1,
                }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              >
                {/* 1. Anodized Aluminum Fixture Channel Housing */}
                <rect
                  x="0"
                  y="0"
                  width="240"
                  height="70"
                  rx="10"
                  fill={active ? 'rgba(168, 140, 108, 0.16)' : isHovered ? 'rgba(239, 107, 107, 0.12)' : '#14110F'}
                  stroke={active ? '#A88C6C' : isHovered ? 'rgba(168, 140, 108, 0.7)' : '#EF6B6B'}
                  strokeOpacity={active ? 1 : isHovered ? 0.9 : 0.65}
                  strokeWidth={active ? 2.5 : isHovered ? 2 : 1.25}
                  filter="url(#clay-block-shadow)"
                  className="transition-all duration-150"
                />

                {/* Specular Channel Mounting Rails */}
                <line x1="4" y1="2" x2="236" y2="2" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="0.75" />
                <line x1="4" y1="68" x2="236" y2="68" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="0.75" />

                {/* 2. Black Flex PCB Strip Substrate */}
                <rect x="8" y="21" width="224" height="40" rx="3" fill="#1C1816" stroke="rgba(255, 255, 255, 0.06)" strokeWidth="0.5" />

                {/* Copper Power Bus Traces */}
                <line x1="12" y1="26" x2="228" y2="26" stroke="#92400E" strokeWidth="0.75" opacity={0.6} />
                <line x1="12" y1="56" x2="228" y2="56" stroke="#92400E" strokeWidth="0.75" opacity={0.6} />

                {/* Section Title Header */}
                <text x="12" y="15" fill={active ? '#A88C6C' : '#EF6B6B'} fontSize="7.5" fontWeight="600" fontFamily="Hanken Grotesk, system-ui, sans-serif" letterSpacing="0.04em">
                  STATUS INDICATOR UNITS (104) — RED OCCUPANCY
                </text>

                {/* 3. 6 × SMD 5050 High-Power Red LED Modules */}
                {Array.from({ length: 6 }).map((_, i) => {
                  const lx = 25 + i * 36;
                  return (
                    <g key={`rled-${i}`}>
                      {/* Volumetric Radial Red Emission Glow */}
                      {(active || selectedId === null) && !reducedMotion ? (
                        <motion.circle
                          cx={lx}
                          cy={41}
                          r={16}
                          fill="url(#red-led-emission)"
                          animate={{ opacity: [0.35, 0.95, 0.35], scale: [0.92, 1.22, 0.92] }}
                          transition={{
                            duration: 1.4,
                            repeat: Infinity,
                            delay: i * 0.15,
                            ease: 'easeInOut',
                          }}
                        />
                      ) : (
                        <circle cx={lx} cy={41} r={12} fill="url(#red-led-emission)" opacity={0.5} />
                      )}

                      {/* White Ceramic SMD 5050 Package (5×5mm) */}
                      <rect x={lx - 7.5} y="33.5" width="15" height="15" rx="1.5" fill="url(#smd5050-pkg)" stroke="#64748B" strokeWidth="0.4" />
                      {/* Corner Index Notch */}
                      <path d={`M ${lx - 7.5} 36.5 L ${lx - 4.5} 33.5`} stroke="#94A3B8" strokeWidth="0.5" />

                      {/* Circular Reflector Cup */}
                      <circle cx={lx} cy="41" r="5.8" fill="#1C1815" stroke="#334155" strokeWidth="0.4" />

                      {/* Red LED Micro-Dies */}
                      <rect x={lx - 2.5} y="39.5" width="2" height="2" rx="0.3" fill="#EF4444" />
                      <rect x={lx + 0.5} y="39.5" width="2" height="2" rx="0.3" fill="#EF4444" />
                      <rect x={lx - 1} y="41.8" width="2" height="2" rx="0.3" fill="#EF4444" />

                      {/* Specular Clear Epoxy Dome Lens Glint */}
                      <circle cx={lx - 2} cy="38.5" r="1.2" fill="#FFFFFF" opacity={0.45} />

                      {/* SMT 0603 Decoupling Capacitor beside LED */}
                      <rect x={lx + 9} y="39" width="3" height="4.5" rx="0.4" fill="#78350F" stroke="#94A3B8" strokeWidth="0.3" />

                      {/* Solder Tabs */}
                      <rect x={lx - 7} y="48.5" width="3.5" height="1.5" fill="url(#pin-gold-grad)" />
                      <rect x={lx + 3.5} y="48.5" width="3.5" height="1.5" fill="url(#pin-gold-grad)" />
                    </g>
                  );
                })}

                {/* Solder Bridge Wire Connections */}
                <line x1="16" y1="56" x2="220" y2="56" stroke="#A99F92" strokeWidth="1" strokeDasharray="4 2" />
              </motion.g>
            </g>
          );
        })()}

        {/* Wire from ESP32 to Red LEDs 104 */}
        {renderWire('M 370 270 L 300 270 L 300 360', ['103', '104'], '#C46A62')}

        {/* =====================================================================
            105: SEQUENTIAL LED GUIDANCE GREEN STRIP (BOTTOM RIGHT)
            Position locked on static outer <g transform="translate(460, 360)">
        ===================================================================== */}
        {(() => {
          const active = isSelected('105');
          const isHovered = activeHoverId === '105';
          const isDimmed = selectedId !== null && !active && !isHovered;

          return (
            <g
              id="hotspot-105"
              transform="translate(460, 360)"
              aria-label={HOTSPOT_DATA['105'].title}
              onClick={() => onSelect('105')}
              onPointerEnter={() => handleHover('105')}
              onPointerLeave={() => handleHover(null)}
              className="cursor-pointer outline-none focus:outline-none"
              style={{ outline: 'none' }}
            >
              <motion.g
                animate={{
                  opacity: isDimmed ? 0.55 : 1,
                  scale: isHovered && !reducedMotion ? 1.015 : 1,
                }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              >
                {/* 1. Anodized Aluminum Guide Track Channel */}
                <rect
                  x="0"
                  y="0"
                  width="240"
                  height="70"
                  rx="10"
                  fill={active ? 'rgba(168, 140, 108, 0.16)' : isHovered ? 'rgba(95, 208, 138, 0.12)' : '#14110F'}
                  stroke={active ? '#A88C6C' : isHovered ? 'rgba(168, 140, 108, 0.7)' : '#5FD08A'}
                  strokeOpacity={active ? 1 : isHovered ? 0.9 : 0.65}
                  strokeWidth={active ? 2.5 : isHovered ? 2 : 1.25}
                  filter="url(#clay-block-shadow)"
                  className="transition-all duration-150"
                />

                {/* Specular Guide Rails */}
                <line x1="4" y1="2" x2="236" y2="2" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="0.75" />
                <line x1="4" y1="68" x2="236" y2="68" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="0.75" />

                {/* 2. WS2812B Black Flexible Ribbon PCB */}
                <rect x="8" y="21" width="224" height="40" rx="3" fill="#181513" stroke="rgba(255, 255, 255, 0.06)" strokeWidth="0.5" />

                {/* Copper Trace Data Buses */}
                <line x1="12" y1="25" x2="228" y2="25" stroke="#92400E" strokeWidth="0.6" opacity={0.6} />
                <line x1="12" y1="28" x2="228" y2="28" stroke="#92400E" strokeWidth="0.6" opacity={0.6} />
                <line x1="12" y1="56" x2="228" y2="56" stroke="#92400E" strokeWidth="0.6" opacity={0.6} />

                {/* Section Title Header */}
                <text x="12" y="15" fill={active ? '#A88C6C' : '#5FD08A'} fontSize="7.5" fontWeight="600" fontFamily="Hanken Grotesk, system-ui, sans-serif" letterSpacing="0.04em">
                  SEQUENTIAL GUIDANCE UNITS (105) — WS2812 GREEN
                </text>

                {/* 3. 6 × WS2812B Addressable Smart RGB Pixels */}
                {Array.from({ length: 6 }).map((_, i) => {
                  const gx = 25 + i * 36;
                  return (
                    <g key={`ws2812-${i}`}>
                      {/* Volumetric Radial Green Sweep Emission Aura */}
                      {(active || selectedId === null) && !reducedMotion ? (
                        <motion.circle
                          cx={gx}
                          cy={41}
                          r={16}
                          fill="url(#green-led-emission)"
                          animate={{ opacity: [0.15, 1, 0.15], scale: [0.9, 1.35, 0.9] }}
                          transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            delay: (i / 6) * 1.2,
                            times: [0, 0.3, 1],
                            ease: 'easeInOut',
                          }}
                        />
                      ) : (
                        <circle cx={gx} cy={41} r={12} fill="url(#green-led-emission)" opacity={0.5} />
                      )}

                      {/* White Ceramic SMD 5050 Package (5×5mm) */}
                      <rect x={gx - 7.5} y="33.5" width="15" height="15" rx="1.5" fill="url(#smd5050-pkg)" stroke="#64748B" strokeWidth="0.4" />
                      {/* Polar Index Notch */}
                      <path d={`M ${gx - 7.5} 36.5 L ${gx - 4.5} 33.5`} stroke="#94A3B8" strokeWidth="0.5" />

                      {/* Circular Reflector Chamber */}
                      <circle cx={gx} cy="41" r="5.8" fill="#161A17" stroke="#334155" strokeWidth="0.4" />

                      {/* WS2811 Microcontroller Control Silicon Die (Integrated into package) */}
                      <rect x={gx - 4} y="37.5" width="2.5" height="2.5" rx="0.3" fill="#0A0908" stroke="#FDE047" strokeWidth="0.3" />
                      {/* Gold Bond Wire simulation */}
                      <line x1={gx - 2.5} y1={39} x2={gx - 0.5} y2={40.5} stroke="#FDE047" strokeWidth="0.3" />

                      {/* Green RGB Emitter Die */}
                      <rect x={gx - 0.5} y="40" width="3" height="3" rx="0.4" fill="#00FF00" />

                      {/* Specular Lens Reflection */}
                      <circle cx={gx - 2} cy="38.5" r="1.2" fill="#FFFFFF" opacity={0.5} />

                      {/* Decoupling 0603 Capacitor */}
                      <rect x={gx + 9} y="39" width="3" height="4.5" rx="0.4" fill="#78350F" stroke="#94A3B8" strokeWidth="0.3" />

                      {/* Flexible Cut-Point Copper Pads (+5V, DI, DO, GND) */}
                      {i < 5 && (
                        <g opacity={0.8}>
                          <rect x={gx + 15} y="36" width="3" height="2" fill="url(#pin-gold-grad)" />
                          <rect x={gx + 15} y="41" width="3" height="2" fill="url(#pin-gold-grad)" />
                          <rect x={gx + 15} y="46" width="3" height="2" fill="url(#pin-gold-grad)" />
                          {/* Data Direction Arrow */}
                          <path d={`M ${gx + 19.5} 41 L ${gx + 21.5} 42 L ${gx + 19.5} 43`} fill="none" stroke="#D2C8BB" strokeWidth="0.5" />
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* Bus Signal Continuity Line */}
                <line x1="16" y1="56" x2="220" y2="56" stroke="#A99F92" strokeWidth="1" strokeDasharray="4 2" />
              </motion.g>
            </g>
          );
        })()}

        {/* Wire from ESP32 to Green LEDs 105 */}
        {renderWire('M 480 270 L 590 270 L 590 360', ['103', '105'], '#6FD39A')}

        {/* =====================================================================
            108: POWER SUPPLY UNIT (BOTTOM CENTER)
            Position locked on static outer <g transform="translate(350, 445)">
        ===================================================================== */}
        {(() => {
          const active = isSelected('108');
          const isHovered = activeHoverId === '108';
          const isDimmed = selectedId !== null && !active && !isHovered;

          return (
            <g
              id="hotspot-108"
              transform="translate(350, 445)"
              aria-label={HOTSPOT_DATA['108'].title}
              onClick={() => onSelect('108')}
              onPointerEnter={() => handleHover('108')}
              onPointerLeave={() => handleHover(null)}
              className="cursor-pointer outline-none focus:outline-none"
              style={{ outline: 'none' }}
            >
              <motion.g
                animate={{
                  opacity: isDimmed ? 0.55 : 1,
                  scale: isHovered && !reducedMotion ? 1.015 : 1,
                }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              >
                {/* 1. Stamped Galvanized Steel Perforated Enclosure Cage */}
                <rect
                  x="0"
                  y="0"
                  width="145"
                  height="62"
                  rx="6"
                  fill={active ? 'rgba(168, 140, 108, 0.16)' : isHovered ? 'rgba(255, 255, 255, 0.08)' : 'url(#smps-cage-grad)'}
                  stroke={active ? '#A88C6C' : isHovered ? 'rgba(168, 140, 108, 0.7)' : 'rgba(255, 255, 255, 0.25)'}
                  strokeWidth={active ? 2.5 : isHovered ? 2 : 1.25}
                  filter="url(#clay-block-shadow)"
                  className="transition-all duration-150"
                />

                {/* Specular Sheet Metal Rim */}
                <line x1="4" y1="1" x2="141" y2="1" stroke="rgba(255, 255, 255, 0.22)" strokeWidth="0.5" />

                {/* 2. Internal Components (Visible through ventilation pattern) */}
                {/* Yellow High-Frequency Step-Down Transformer */}
                <rect x="15" y="14" width="28" height="24" rx="2" fill="url(#smps-transformer-grad)" stroke="#78350F" strokeWidth="0.5" />
                <text x="29" y="27" textAnchor="middle" fill="#451A03" fontSize="4.2" fontWeight="bold" fontFamily="IBM Plex Mono, monospace">
                  5V 10A
                </text>

                {/* Copper Toroidal Inductor Coil */}
                <circle cx="58" cy="26" r="10.5" fill="url(#smps-copper-coil)" stroke="#78350F" strokeWidth="0.6" />
                <circle cx="58" cy="26" r="5" fill="#181513" />

                {/* Electrolytic High-Voltage Filter Capacitor */}
                <circle cx="82" cy="22" r="7.5" fill="#1C1815" stroke="#475569" strokeWidth="0.6" />
                {/* Aluminum Vent Cross Stamp on Top */}
                <line x1="77" y1="22" x2="87" y2="22" stroke="#94A3B8" strokeWidth="0.75" />
                <line x1="82" y1="17" x2="82" y2="27" stroke="#94A3B8" strokeWidth="0.75" />

                {/* 3. Stamped Slotted Ventilation Louver Array */}
                <g opacity={0.65}>
                  {Array.from({ length: 6 }).map((_, r) =>
                    Array.from({ length: 11 }).map((_, c) => (
                      <rect
                        key={`vent-${r}-${c}`}
                        x={14 + c * 7.5}
                        y={12 + r * 6.5}
                        width="4"
                        height="2"
                        rx="1"
                        fill="#0A0807"
                      />
                    ))
                  )}
                </g>

                {/* 4. Heavy-Duty Screw Terminal Barrier Block (Right Side) */}
                <rect x="102" y="8" width="37" height="46" rx="2" fill="#100E0C" stroke="#2B2621" strokeWidth="0.6" />

                {/* 5 Terminal Screw Positions with Philips Cross Slots */}
                {[
                  { y: 13, label: 'L', color: '#EF6B6B' },
                  { y: 22, label: 'N', color: '#C9C2B8' },
                  { y: 31, label: '⏚', color: '#5FD08A' },
                  { y: 40, label: '-V', color: '#D2C8BB' },
                  { y: 49, label: '+V', color: '#EF6B6B' },
                ].map((term, i) => (
                  <g key={`term-${i}`}>
                    {/* Metal Screw Washer */}
                    <circle cx="111" cy={term.y} r="3" fill="#CBD5E1" stroke="#475569" strokeWidth="0.4" />
                    {/* Cross Slot */}
                    <line x1="109" y1={term.y} x2="113" y2={term.y} stroke="#1E293B" strokeWidth="0.6" />
                    <line x1="111" y1={term.y - 2} x2="111" y2={term.y + 2} stroke="#1E293B" strokeWidth="0.6" />
                    {/* Terminal Label */}
                    <text x="122" y={term.y + 1.8} fill={term.color} fontSize="4.5" fontWeight="bold" fontFamily="IBM Plex Mono, monospace">
                      {term.label}
                    </text>
                  </g>
                ))}

                {/* 5. Indicators & Adjustment Trimmer */}
                {/* DC OK Green Status LED */}
                <circle cx="76" cy="48" r="1.5" fill="#22C55E" />
                <circle cx="76" cy="48" r="3" fill="none" stroke="#22C55E" strokeWidth="0.4" opacity={0.6} />
                <text x="76" y="56" textAnchor="middle" fill="#5FD08A" fontSize="3" fontFamily="IBM Plex Mono, monospace">DC OK</text>

                {/* Brass Voltage Adjustment Trimmer (+V ADJ) */}
                <circle cx="91" cy="48" r="2.5" fill="#D97706" stroke="#92400E" strokeWidth="0.4" />
                <line x1="89" y1="48" x2="93" y2="48" stroke="#451A03" strokeWidth="0.5" />
                <text x="91" y="56" textAnchor="middle" fill="#A99F92" fontSize="3" fontFamily="IBM Plex Mono, monospace">+V ADJ</text>

                {/* Technical Title Label */}
                <text x="15" y="55" fill="#F6F0E8" fontSize="6.5" fontWeight="600" fontFamily="Hanken Grotesk, system-ui, sans-serif">
                  POWER SUPPLY (108)
                </text>
                <text x="15" y="60" fill="#A99F92" fontSize="4.2" fontFamily="IBM Plex Mono, monospace">
                  5V DC / 3.3V LDO
                </text>
              </motion.g>
            </g>
          );
        })()}

        {/* Power Distribution Wires (Connected to 108, 103, 104, 105) */}
        {renderWire('M 440 445 L 440 300', ['108', '103'], '#8F887E', '4 3')}
        {renderWire('M 410 445 L 410 300', ['108', '103'], '#8F887E', '4 3')}
        {renderWire('M 350 476 L 260 476 L 260 430', ['108', '104'], '#8F887E', '4 3')}
        {renderWire('M 495 476 L 580 476 L 580 430', ['108', '105'], '#8F887E', '4 3')}

        {/* =====================================================================
            106: WI-FI WIRELESS TELEMETRY GATEWAY (TOP RIGHT)
            Position locked on static outer <g transform="translate(540, 105)">
        ===================================================================== */}
        {(() => {
          const active = isSelected('106');
          const isHovered = activeHoverId === '106';
          const isDimmed = selectedId !== null && !active && !isHovered;

          return (
            <g
              id="hotspot-106"
              transform="translate(540, 105)"
              aria-label={HOTSPOT_DATA['106'].title}
              onClick={() => onSelect('106')}
              onPointerEnter={() => handleHover('106')}
              onPointerLeave={() => handleHover(null)}
              className="cursor-pointer outline-none focus:outline-none"
              style={{ outline: 'none' }}
            >
              <motion.g
                animate={{
                  opacity: isDimmed ? 0.55 : 1,
                  scale: isHovered && !reducedMotion ? 1.015 : 1,
                }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              >
                {/* 1. Realistic Dual High-Gain Omnidirectional Dipole Antennas */}
                {/* Left Antenna SMA Gold Knurled Connector */}
                <rect x="15" y="24" width="6" height="4" rx="0.5" fill="url(#wifi-gold-sma)" stroke="#78350F" strokeWidth="0.3" />
                {/* Left Antenna Mast (Angled outward slightly) */}
                <path d="M 18 24 L 14 0" stroke="url(#wifi-antenna-grad)" strokeWidth="3.5" strokeLinecap="round" />

                {/* Right Antenna SMA Gold Knurled Connector */}
                <rect x="55" y="24" width="6" height="4" rx="0.5" fill="url(#wifi-gold-sma)" stroke="#78350F" strokeWidth="0.3" />
                {/* Right Antenna Mast (Angled outward slightly) */}
                <path d="M 58 24 L 62 0" stroke="url(#wifi-antenna-grad)" strokeWidth="3.5" strokeLinecap="round" />

                {/* 2. IoT Wireless Gateway Titanium Enclosure */}
                <rect
                  x="4"
                  y="26"
                  width="68"
                  height="48"
                  rx="6"
                  fill={active ? 'rgba(168, 140, 108, 0.16)' : isHovered ? 'rgba(255, 255, 255, 0.08)' : 'url(#wifi-chassis-grad)'}
                  stroke={active ? '#A88C6C' : isHovered ? 'rgba(168, 140, 108, 0.7)' : 'rgba(255, 255, 255, 0.22)'}
                  strokeWidth={active ? 2.5 : isHovered ? 2 : 1.25}
                  filter="url(#clay-block-shadow)"
                  className="transition-all duration-150"
                />

                {/* Specular Bevel Line along Top Edge */}
                <line x1="8" y1="27" x2="68" y2="27" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="0.5" />

                {/* 3. Electromagnetic Concentric Microwave Waves (2.4 GHz) */}
                <motion.path
                  d="M 14 36 A 32 32 0 0 1 62 36"
                  fill="none"
                  stroke={active ? '#A88C6C' : isHovered ? '#A88C6C' : '#A99F92'}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  animate={
                    (active || selectedId === null) && !reducedMotion
                      ? { opacity: [0.2, 0.95, 0.2] }
                      : undefined
                  }
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0.6 }}
                />
                <motion.path
                  d="M 22 43 A 20 20 0 0 1 54 43"
                  fill="none"
                  stroke={active ? '#A88C6C' : isHovered ? '#A88C6C' : '#D2C8BB'}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  animate={
                    (active || selectedId === null) && !reducedMotion
                      ? { opacity: [0.2, 0.95, 0.2] }
                      : undefined
                  }
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }}
                />
                <motion.path
                  d="M 30 50 A 10 10 0 0 1 46 50"
                  fill="none"
                  stroke={active ? '#A88C6C' : isHovered ? '#A88C6C' : '#C9C2B8'}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  animate={
                    (active || selectedId === null) && !reducedMotion
                      ? { opacity: [0.2, 0.95, 0.2] }
                      : undefined
                  }
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                />

                {/* Radiating Antenna Focal Emitter Dot */}
                <circle cx="38" cy="54" r="2.5" fill={active ? '#A88C6C' : '#C9C2B8'} />

                {/* 4. Front Panel LED Activity Indicators */}
                <g>
                  {/* PWR LED */}
                  <circle cx="16" cy="64" r="1.2" fill="#5FD08A" />
                  <text x="16" y="60" textAnchor="middle" fill="#A99F92" fontSize="3" fontFamily="IBM Plex Mono, monospace">PWR</text>

                  {/* 2.4G LED */}
                  <circle cx="38" cy="64" r="1.2" fill="#A88C6C" />
                  <text x="38" y="60" textAnchor="middle" fill="#A99F92" fontSize="3" fontFamily="IBM Plex Mono, monospace">2.4G</text>

                  {/* DATA Activity LED */}
                  <circle cx="60" cy="64" r="1.2" fill="#C9C2B8" />
                  <text x="60" y="60" textAnchor="middle" fill="#A99F92" fontSize="3" fontFamily="IBM Plex Mono, monospace">DATA</text>
                </g>

                {/* Component Label */}
                <text x="38" y="70" textAnchor="middle" fill={active ? '#A88C6C' : '#D2C8BB'} fontSize="6.5" fontWeight="600" fontFamily="Hanken Grotesk, system-ui, sans-serif">
                  Wi-Fi (106)
                </text>
              </motion.g>
            </g>
          );
        })()}

        {/* Bidirectional Telemetry Dashed Links */}
        {renderWire('M 485 180 L 540 180', ['103', '106'], '#8F887E', '4 3')}
        {renderWire('M 610 180 L 660 180', ['106', '107'], '#8F887E', '4 3')}

        {/* =====================================================================
            107: WEB-BASED MONITORING DASHBOARD LAPTOP (FAR RIGHT)
            Position locked on static outer <g transform="translate(660, 110)">
        ===================================================================== */}
        {(() => {
          const active = isSelected('107');
          const isHovered = activeHoverId === '107';
          const isDimmed = selectedId !== null && !active && !isHovered;

          return (
            <g
              id="hotspot-107"
              transform="translate(660, 110)"
              aria-label={HOTSPOT_DATA['107'].title}
              onClick={() => onSelect('107')}
              onPointerEnter={() => handleHover('107')}
              onPointerLeave={() => handleHover(null)}
              className="cursor-pointer outline-none focus:outline-none"
              style={{ outline: 'none' }}
            >
              <motion.g
                animate={{
                  opacity: isDimmed ? 0.55 : 1,
                  scale: isHovered && !reducedMotion ? 1.015 : 1,
                }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              >
                {/* 1. Under-Chassis Contact Shadow (Grounding) */}
                <ellipse
                  cx="86"
                  cy="144"
                  rx="104"
                  ry="5.5"
                  fill="#000000"
                  opacity={0.65}
                  filter="url(#laptop-shadow-blur)"
                />
                <ellipse
                  cx="86"
                  cy="143"
                  rx="88"
                  ry="3.5"
                  fill="#000000"
                  opacity={0.8}
                />

                {/* 2. Rubber Non-Slip Feet Under Base */}
                <rect x="-9" y="143" width="10" height="1.6" rx="0.8" fill="#0B0908" />
                <rect x="171" y="143" width="10" height="1.6" rx="0.8" fill="#0B0908" />

                {/* 3. Base Front Chamfer & Lip (3D depth) */}
                <path
                  d="M -18.5 140.5 L 190.5 140.5 Q 191 144.5 188 144.5 L -16 144.5 Q -19 144.5 -18.5 140.5 Z"
                  fill="url(#laptop-lip-grad)"
                  stroke="rgba(0, 0, 0, 0.6)"
                  strokeWidth="0.5"
                />

                {/* Front Lip Specular Edge Line */}
                <line
                  x1="-18"
                  y1="140.5"
                  x2="190"
                  y2="140.5"
                  stroke={active ? '#A88C6C' : 'rgba(255, 255, 255, 0.4)'}
                  strokeWidth={active ? 1 : 0.75}
                />

                {/* Thumb Opening Notch (MacBook Scoop) */}
                <path
                  d="M 71 140.5 Q 73 143 76 143 L 96 143 Q 99 143 101 140.5 Z"
                  fill="#120F0D"
                  stroke="rgba(255, 255, 255, 0.25)"
                  strokeWidth="0.5"
                />

                {/* 4. Keyboard Deck Main Perspective Surface */}
                <path
                  d="M -11.5 113.5 L 183.5 113.5 Q 185.5 113.5 186.5 115 L 190.5 139.5 Q 191.2 140.5 189.5 140.5 L -17.5 140.5 Q -19.2 140.5 -18.5 139.5 L -14.5 115 Q -13.5 113.5 -11.5 113.5 Z"
                  fill="url(#laptop-deck-grad)"
                  stroke={active ? '#A88C6C' : isHovered ? 'rgba(168, 140, 108, 0.7)' : 'rgba(255, 255, 255, 0.22)'}
                  strokeWidth={active ? 2 : isHovered ? 1.5 : 1}
                  className="transition-all duration-150"
                />

                {/* 5. Left Edge Ports (MagSafe 3 & Dual Thunderbolt USB-C) */}
                <rect x="-15.5" y="117" width="1.8" height="3.2" rx="0.8" fill="#0A0807" stroke="#A88C6C" strokeWidth="0.3" strokeOpacity={0.8} />
                <rect x="-16.8" y="122.5" width="1.6" height="2.8" rx="0.7" fill="#0A0807" stroke="#3A332D" strokeWidth="0.3" />
                <rect x="-17.6" y="127" width="1.6" height="2.8" rx="0.7" fill="#0A0807" stroke="#3A332D" strokeWidth="0.3" />

                {/* 6. Right Edge Ports (Thunderbolt USB-C & 3.5mm Audio Jack) */}
                <rect x="187.2" y="123" width="1.6" height="2.8" rx="0.7" fill="#0A0807" stroke="#3A332D" strokeWidth="0.3" />
                <circle cx="188.5" cy="129" r="1.1" fill="#0A0807" stroke="#3A332D" strokeWidth="0.3" />

                {/* 7. Laser-Drilled Dual Acoustic Speaker Grilles */}
                <g opacity={0.75}>
                  {/* Left Speaker */}
                  {Array.from({ length: 8 }).map((_, r) =>
                    Array.from({ length: 4 }).map((_, c) => (
                      <circle
                        key={`lspk-${r}-${c}`}
                        cx={4.5 + c * 2.5}
                        cy={117.5 + r * 2.2}
                        r={0.42}
                        fill="#0E0C0A"
                      />
                    ))
                  )}
                  {/* Right Speaker */}
                  {Array.from({ length: 8 }).map((_, r) =>
                    Array.from({ length: 4 }).map((_, c) => (
                      <circle
                        key={`rspk-${r}-${c}`}
                        cx={160 + c * 2.5}
                        cy={117.5 + r * 2.2}
                        r={0.42}
                        fill="#0E0C0A"
                      />
                    ))
                  )}
                </g>

                {/* 8. Recessed Backlit Keyboard Well */}
                <rect
                  x="17"
                  y="115.5"
                  width="138"
                  height="18.5"
                  rx="2"
                  fill="#100E0C"
                  stroke="rgba(0, 0, 0, 0.85)"
                  strokeWidth="0.6"
                />

                {/* Keyboard Backlit Keycaps Matrix */}
                <g>
                  {/* Row 0: Function Keys */}
                  <rect x="18.5" y="116.5" width="8" height="2.1" rx="0.5" fill="#1B1715" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="0.35" />
                  {Array.from({ length: 12 }).map((_, i) => (
                    <rect
                      key={`fn-${i}`}
                      x={27.5 + i * 8.7}
                      y="116.5"
                      width="7.7"
                      height="2.1"
                      rx="0.5"
                      fill="#1B1715"
                      stroke="rgba(255, 255, 255, 0.12)"
                      strokeWidth="0.35"
                    />
                  ))}
                  <rect x="144" y="116.5" width="9.5" height="2.1" rx="0.5" fill="#14110F" stroke="rgba(255, 255, 255, 0.18)" strokeWidth="0.35" />

                  {/* Row 1: Number Row */}
                  {Array.from({ length: 13 }).map((_, i) => (
                    <rect
                      key={`num-${i}`}
                      x={18.5 + i * 9.0}
                      y="119.3"
                      width="8.0"
                      height="2.5"
                      rx="0.5"
                      fill="#1A1614"
                      stroke="rgba(255, 255, 255, 0.12)"
                      strokeWidth="0.35"
                    />
                  ))}
                  <rect x="136.5" y="119.3" width="17" height="2.5" rx="0.5" fill="#1A1614" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="0.35" />

                  {/* Row 2: QWERTY Row */}
                  <rect x="18.5" y="122.5" width="11" height="2.5" rx="0.5" fill="#1A1614" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="0.35" />
                  {Array.from({ length: 11 }).map((_, i) => (
                    <rect
                      key={`qwerty-${i}`}
                      x={30.5 + i * 9.1}
                      y="122.5"
                      width="8.1"
                      height="2.5"
                      rx="0.5"
                      fill="#1A1614"
                      stroke="rgba(255, 255, 255, 0.12)"
                      strokeWidth="0.35"
                    />
                  ))}
                  <rect x="131.6" y="122.5" width="10" height="2.5" rx="0.5" fill="#1A1614" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="0.35" />
                  <rect x="142.6" y="122.5" width="10.9" height="2.5" rx="0.5" fill="#1A1614" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="0.35" />

                  {/* Row 3: ASDF / Home Row */}
                  <rect x="18.5" y="125.7" width="13" height="2.5" rx="0.5" fill="#1A1614" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="0.35" />
                  {Array.from({ length: 11 }).map((_, i) => (
                    <rect
                      key={`asdf-${i}`}
                      x={32.5 + i * 9.1}
                      y="125.7"
                      width="8.1"
                      height="2.5"
                      rx="0.5"
                      fill="#1A1614"
                      stroke="rgba(255, 255, 255, 0.12)"
                      strokeWidth="0.35"
                    />
                  ))}
                  <rect x="133.6" y="125.7" width="19.9" height="2.5" rx="0.5" fill="#1A1614" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="0.35" />

                  {/* Row 4: Bottom Row & Spacebar */}
                  <rect x="18.5" y="128.9" width="9" height="3.0" rx="0.6" fill="#1A1614" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="0.35" />
                  <rect x="28.5" y="128.9" width="8" height="3.0" rx="0.6" fill="#1A1614" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="0.35" />
                  <rect x="37.5" y="128.9" width="8" height="3.0" rx="0.6" fill="#1A1614" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="0.35" />
                  <rect x="46.5" y="128.9" width="9.5" height="3.0" rx="0.6" fill="#1A1614" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="0.35" />
                  {/* Spacebar */}
                  <rect x="57" y="128.9" width="58" height="3.0" rx="0.8" fill="#1E1917" stroke={active ? '#A88C6C' : 'rgba(255, 255, 255, 0.18)'} strokeWidth="0.4" />
                  <rect x="116" y="128.9" width="9.5" height="3.0" rx="0.6" fill="#1A1614" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="0.35" />
                  <rect x="126.5" y="128.9" width="8" height="3.0" rx="0.6" fill="#1A1614" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="0.35" />
                  {/* Arrow Keys */}
                  <rect x="135.5" y="130.4" width="5.5" height="1.5" rx="0.4" fill="#1A1614" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="0.3" />
                  <rect x="142" y="128.9" width="5.5" height="1.4" rx="0.4" fill="#1A1614" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="0.3" />
                  <rect x="142" y="130.4" width="5.5" height="1.5" rx="0.4" fill="#1A1614" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="0.3" />
                  <rect x="148.5" y="130.4" width="5" height="1.5" rx="0.4" fill="#1A1614" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="0.3" />
                </g>

                {/* 9. Glass Precision Trackpad */}
                <rect
                  x="62"
                  y="135"
                  width="48"
                  height="4.8"
                  rx="1.4"
                  fill="url(#laptop-trackpad-grad)"
                  stroke="rgba(255, 255, 255, 0.18)"
                  strokeWidth="0.5"
                />
                <line
                  x1="63"
                  y1="135.2"
                  x2="109"
                  y2="135.2"
                  stroke="rgba(255, 255, 255, 0.25)"
                  strokeWidth="0.35"
                />

                {/* 10. Central Cylindrical Display Hinge */}
                <rect
                  x="56"
                  y="111.5"
                  width="60"
                  height="4.2"
                  rx="1.5"
                  fill="url(#laptop-hinge-grad)"
                  stroke="#100E0C"
                  strokeWidth="0.5"
                />
                {/* Hinge Seam Gap Lines */}
                <rect x="55" y="111.8" width="1.2" height="3.8" fill="#0A0807" />
                <rect x="115.8" y="111.8" width="1.2" height="3.8" fill="#0A0807" />

                {/* 11. Laptop Display Lid & Bezel Frame */}
                <rect
                  x="0"
                  y="0"
                  width="172"
                  height="114"
                  rx="8"
                  fill={active ? 'rgba(168, 140, 108, 0.16)' : isHovered ? 'rgba(255, 255, 255, 0.08)' : 'url(#laptop-lid-grad)'}
                  stroke={active ? '#A88C6C' : isHovered ? 'rgba(168, 140, 108, 0.7)' : 'url(#laptop-lid-rim)'}
                  strokeWidth={active ? 2.5 : isHovered ? 2 : 1.25}
                  filter="url(#clay-block-shadow)"
                  className="transition-all duration-150"
                />

                {/* Specular Top Chamfer on Lid */}
                <line
                  x1="8"
                  y1="0.75"
                  x2="164"
                  y2="0.75"
                  stroke="rgba(255, 255, 255, 0.22)"
                  strokeWidth="0.5"
                />

                {/* 12. Top Bezel Hardware (Camera notch, lens, LED, sensor) */}
                <rect x="80" y="2.2" width="12" height="3.6" rx="1.8" fill="#0A0807" />
                {/* Ambient Sensor */}
                <circle cx="82" cy="4" r="0.45" fill="#1C1815" />
                {/* Camera Lens */}
                <circle cx="85" cy="4" r="1.1" fill="#0F172A" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="0.3" />
                <circle cx="84.7" cy="3.7" r="0.35" fill="#38BDF8" />
                {/* Green Active Camera Indicator LED */}
                <circle cx="88.5" cy="4" r="0.6" fill="#22C55E" />
                <circle cx="88.5" cy="4" r="1.2" fill="none" stroke="#22C55E" strokeWidth="0.3" opacity={0.6} />

                {/* 13. High-Fidelity Display Screen (Clipped) */}
                <g clipPath="url(#laptop-screen-clip)">
                  {/* Screen Dark Base */}
                  <rect x="8" y="8" width="156" height="88" fill="#0E0C0A" />

                  {/* Browser Window Chrome Top Bar */}
                  <rect x="8" y="8" width="156" height="8.5" fill="#181513" />
                  <line x1="8" y1="16.5" x2="164" y2="16.5" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="0.5" />

                  {/* Window Control Dots */}
                  <circle cx="13" cy="12.2" r="1.2" fill="#EF6B6B" />
                  <circle cx="17.2" cy="12.2" r="1.2" fill="#E8C53A" />
                  <circle cx="21.4" cy="12.2" r="1.2" fill="#5FD08A" />

                  {/* Browser Address Pill */}
                  <rect
                    x="34"
                    y="9.8"
                    width="88"
                    height="5.0"
                    rx="2.5"
                    fill="rgba(255, 255, 255, 0.06)"
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="0.35"
                  />
                  <circle cx="38" cy="12.3" r="0.75" fill="#5FD08A" />
                  <text
                    x="41"
                    y="13.5"
                    fill="#A99F92"
                    fontSize="3.4"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    parkway.local/dashboard
                  </text>

                  {/* Live Status Badge */}
                  <rect
                    x="141"
                    y="10.2"
                    width="18"
                    height="4.2"
                    rx="2.1"
                    fill="rgba(95, 208, 138, 0.15)"
                    stroke="rgba(95, 208, 138, 0.35)"
                    strokeWidth="0.3"
                  />
                  <circle cx="144" cy="12.3" r="0.7" fill="#5FD08A" />
                  <text
                    x="146.5"
                    y="13.4"
                    fill="#5FD08A"
                    fontSize="2.8"
                    fontFamily="Hanken Grotesk, sans-serif"
                    fontWeight="600"
                  >
                    LIVE
                  </text>

                  {/* Real ParkWay Overview Screenshot */}
                  <image
                    href="/overview-screen.webp"
                    x="8"
                    y="16.5"
                    width="156"
                    height="79.5"
                    preserveAspectRatio="xMidYMid slice"
                  />

                  {/* Diagonal Glass Sheen Reflection */}
                  <rect
                    x="8"
                    y="8"
                    width="156"
                    height="88"
                    fill="url(#laptop-screen-glare)"
                    pointerEvents="none"
                  />

                  {/* Top Edge Specular Reflection */}
                  <line
                    x1="8"
                    y1="8.5"
                    x2="164"
                    y2="8.5"
                    stroke="rgba(255, 255, 255, 0.22)"
                    strokeWidth="0.5"
                    pointerEvents="none"
                  />

                  {/* Active / Idle Live Telemetry Pulse Ring */}
                  {(active || selectedId === null) && (
                    <motion.rect
                      x="8"
                      y="8"
                      width="156"
                      height="88"
                      fill="none"
                      stroke={active ? '#A88C6C' : 'rgba(95, 208, 138, 0.35)'}
                      strokeWidth="1.2"
                      animate={!reducedMotion ? { opacity: [0.35, 0.85, 0.35] } : undefined}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      pointerEvents="none"
                    />
                  )}
                </g>

                {/* 14. Screen Inner Rubber Gasket Rim */}
                <rect
                  x="8"
                  y="8"
                  width="156"
                  height="88"
                  rx="3"
                  fill="none"
                  stroke={active ? '#A88C6C' : 'rgba(46, 40, 35, 0.85)'}
                  strokeWidth="0.75"
                  pointerEvents="none"
                />

                {/* 15. Bottom Bezel Chin Title Label */}
                <text
                  x="86"
                  y="106"
                  textAnchor="middle"
                  fill={active ? '#A88C6C' : isHovered ? '#F6F0E8' : '#D2C8BB'}
                  fontSize="7.5"
                  fontWeight="600"
                  fontFamily="Hanken Grotesk, system-ui, sans-serif"
                  letterSpacing="0.05em"
                  className="transition-colors duration-150"
                >
                  DASHBOARD (107)
                </text>
              </motion.g>
            </g>
          );
        })()}

        </g>

        {/* =====================================================================
            UNSCALED OVERLAY LAYER: NUMERAL BUBBLES (101 - 108) & NAME CHIP
            Rendered outside diagram-zoom-wrapper so screen positions & sizes
            are always constant and leader lines connect dynamically to components
        ===================================================================== */}
        <g id="diagram-overlay-layer">
          {HOTSPOT_LIST.map(id => {
            const active = isSelected(id);
            const isHovered = activeHoverId === id;
            const isFocused = focusedId === id;
            const bState = bubbleStates[id];

            if (!bState || bState.opacity <= 0) return null;

            return (
              <g
                key={id}
                style={{ opacity: bState.opacity }}
                className="transition-opacity duration-150"
              >
                {/* Thin warm-grey leader line from anchorScreen to bubble rim (leaderEdge) */}
                <line
                  x1={bState.anchorScreen.x}
                  y1={bState.anchorScreen.y}
                  x2={bState.leaderEdge.x}
                  y2={bState.leaderEdge.y}
                  stroke={active ? '#A88C6C' : isHovered ? 'rgba(168, 140, 108, 0.7)' : '#8F887E'}
                  strokeWidth={active ? 2 : isHovered ? 1.75 : 1.25}
                  strokeDasharray={active ? 'none' : '3 2'}
                  className="transition-all duration-150"
                />

                {/* Ripple ring on selection */}
                {active && !reducedMotion && (
                  <motion.circle
                    key={`ripple-${id}-${rippleKey}`}
                    cx={bState.bubbleScreen.x}
                    cy={bState.bubbleScreen.y}
                    initial={{ r: visualRadius, opacity: 0.6 }}
                    animate={{ r: visualRadius + 28, opacity: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    fill="none"
                    stroke="#A88C6C"
                    strokeWidth={2}
                    className="pointer-events-none"
                  />
                )}

                {/* Hover soft gold glow ring */}
                {(isHovered || isFocused) && !active && (
                  <circle
                    cx={bState.bubbleScreen.x}
                    cy={bState.bubbleScreen.y}
                    r={visualRadius + 4}
                    fill="none"
                    stroke="rgba(168, 140, 108, 0.45)"
                    strokeWidth={3}
                    className="pointer-events-none transition-all duration-150"
                  />
                )}

                {/* Focus ring */}
                {isFocused && (
                  <circle
                    cx={bState.bubbleScreen.x}
                    cy={bState.bubbleScreen.y}
                    r={visualRadius + 5}
                    fill="none"
                    stroke="#A88C6C"
                    strokeWidth={2}
                    strokeDasharray="3 2"
                    className="pointer-events-none"
                  />
                )}

                {/* Interactive Numeral Bubble Button */}
                <motion.g
                  ref={el => {
                    numeralRefs.current[id] = el;
                  }}
                  data-hotspot-id={id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${id} ${HOTSPOT_DATA[id].title}`}
                  aria-pressed={active}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => {
                    if (!hasDraggedRef.current) {
                      onSelect(id);
                    }
                  }}
                  onKeyDown={e => handleKeyDown(e, id)}
                  onPointerEnter={() => handleHover(id)}
                  onPointerLeave={() => handleHover(null)}
                  onFocus={() => setFocusedId(id)}
                  onBlur={() => setFocusedId(null)}
                  className="cursor-pointer outline-none focus:outline-none"
                  style={{
                    outline: 'none',
                    transformBox: 'fill-box',
                    transformOrigin: `${bState.bubbleScreen.x}px ${bState.bubbleScreen.y}px`,
                  }}
                  whileTap={!reducedMotion ? { scale: 0.94 } : undefined}
                  animate={{
                    scale: isHovered || isFocused ? 1.12 : 1,
                  }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                >
                  {/* Generous invisible hit target circle */}
                  <circle
                    cx={bState.bubbleScreen.x}
                    cy={bState.bubbleScreen.y}
                    r={hitRadius}
                    fill="transparent"
                    className="cursor-pointer"
                  />

                  {/* Visual circle: radius visualRadius */}
                  <circle
                    cx={bState.bubbleScreen.x}
                    cy={bState.bubbleScreen.y}
                    r={visualRadius}
                    fill={active ? '#A88C6C' : 'rgba(21, 18, 16, 0.88)'}
                    stroke={active ? 'rgba(255,255,255,0.7)' : isHovered || isFocused ? '#A88C6C' : 'rgba(255,255,255,0.22)'}
                    strokeWidth={active ? 2.5 : isHovered || isFocused ? 2 : 1}
                    filter={
                      active
                        ? 'drop-shadow(0 0 10px rgba(168, 140, 108, 0.55)) drop-shadow(0 4px 12px rgba(0,0,0,0.6))'
                        : 'drop-shadow(0 4px 12px rgba(0,0,0,0.45))'
                    }
                    className="transition-all duration-150"
                  />

                  {/* Numeral text */}
                  <text
                    x={bState.bubbleScreen.x}
                    y={bState.bubbleScreen.y + fontSize * 0.35}
                    textAnchor="middle"
                    fill={active ? '#0A0908' : '#F3EFE9'}
                    fontSize={fontSize}
                    fontWeight="600"
                    fontFamily="IBM Plex Mono, monospace"
                    className="select-none pointer-events-none"
                  >
                    {id}
                  </text>
                </motion.g>
              </g>
            );
          })}

          {/* =====================================================================
              HOVER, FOCUS & SELECTED COMPONENT NAME CHIP WITH LEADER LINE
              (OUTSIDE EVERY COMPONENT, IN EMPTY SPACE, CONSTANT ON-SCREEN SIZE)
          ===================================================================== */}
          {activeChipId && bubbleStates[activeChipId]?.opacity > 0 && (() => {
            const bState = bubbleStates[activeChipId];
            const info = COMPONENT_INFO[activeChipId as Fig3Numeral];
            const title = info ? info.title : HOTSPOT_DATA[activeChipId].title;
            const placement = computeScreenChipPlacement(
              activeChipId,
              bState.bubbleScreen,
              visualRadius,
              zoom,
              pan.x,
              pan.y,
              title,
              allBubbleScreens
            );

            return (
              <g className="pointer-events-none select-none">
                {/* Leader line from chip to bubble */}
                <line
                  x1={placement.line.x1}
                  y1={placement.line.y1}
                  x2={placement.line.x2}
                  y2={placement.line.y2}
                  stroke="#A88C6C"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  className="transition-all duration-150"
                />

                {/* Name chip box */}
                <rect
                  x={placement.tx}
                  y={placement.ty}
                  width={placement.tw}
                  height={placement.th}
                  rx={8}
                  fill="rgba(21, 18, 16, 0.92)"
                  stroke="#A88C6C"
                  strokeWidth={1}
                  filter="drop-shadow(0 6px 18px rgba(0,0,0,0.45))"
                />

                {/* Name chip text */}
                <text
                  x={placement.tx + placement.tw / 2}
                  y={placement.ty + 15}
                  textAnchor="middle"
                  fill="#F3EFE9"
                  fontSize="11"
                  fontWeight="500"
                  fontFamily="Hanken Grotesk, system-ui, sans-serif"
                >
                  {placement.title}
                </text>
              </g>
            );
          })()}
        </g>
      </svg>
    </div>
  );
};
