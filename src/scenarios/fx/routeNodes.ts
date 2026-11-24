// ============================================================================
// PARKWAY CLAIM 12 ROUTE NODES FX (src/scenarios/fx/routeNodes.ts)
// Planned route nodes ("Entrance", "L1", "L2", "L3", "L4", "S7"),
// node ignition synchronized with LED sweep, trail fading behind moving car,
// and the "No app. No screen." badge.
// ============================================================================

import { create } from 'zustand';
import { useFxStore, registerCancelHandler } from './store';
import { t, isReducedMotion } from '../pacing';

export interface RouteNodeItem {
  id: string;
  label: string;
  x: number;
  y: number;
  state: 'dim' | 'ignited' | 'trailFaded' | 'pulsing' | 'off';
  ignitedAt?: number;
}

export interface RouteNodesState {
  visible: boolean;
  nodes: RouteNodeItem[];
  noAppBadgeVisible: boolean;
  tieChip: { text: string } | null;

  setNodes: (nodes: RouteNodeItem[]) => void;
  igniteNode: (index: number) => void;
  trailFade: (upToIndex?: number) => void;
  pulseNode: (index: number) => void;
  switchOffNode: (index: number) => void;
  setNoAppBadge: (visible: boolean) => void;
  setTieChip: (chip: { text: string } | null) => void;
  reset: () => void;
}

// 6 Nodes from gate entrance to bay S7
const DEFAULT_NODES: Omit<RouteNodeItem, 'state'>[] = [
  { id: 'node-entrance', label: 'Entrance', x: 222, y: 295 },
  { id: 'node-l1', label: 'L1', x: 337, y: 295 },
  { id: 'node-l2', label: 'L2', x: 452, y: 295 },
  { id: 'node-l3', label: 'L3', x: 568, y: 295 },
  { id: 'node-l4', label: 'L4', x: 683, y: 295 },
  { id: 'node-s7', label: 'S7', x: 799, y: 345 },
];

export const useRouteNodesStore = create<RouteNodesState>((set) => ({
  visible: false,
  nodes: [],
  noAppBadgeVisible: false,
  tieChip: null,

  setNodes: (nodes) => set({ visible: true, nodes }),

  igniteNode: (index) =>
    set((state) => ({
      nodes: state.nodes.map((n, idx) =>
        idx === index
          ? { ...n, state: 'ignited', ignitedAt: Date.now() }
          : n
      ),
    })),

  trailFade: (upToIndex) =>
    set((state) => ({
      nodes: state.nodes.map((n, idx) => {
        if (upToIndex === undefined || idx <= upToIndex) {
          return n.state === 'ignited' ? { ...n, state: 'trailFaded' } : n;
        }
        return n;
      }),
    })),

  pulseNode: (index) =>
    set((state) => ({
      nodes: state.nodes.map((n, idx) =>
        idx === index ? { ...n, state: 'pulsing' } : n
      ),
    })),

  switchOffNode: (index) =>
    set((state) => ({
      nodes: state.nodes.map((n, idx) =>
        idx === index ? { ...n, state: 'off' } : n
      ),
    })),

  setNoAppBadge: (visible) => set({ noAppBadgeVisible: visible }),

  setTieChip: (tieChip) => set({ tieChip }),

  reset: () =>
    set({
      visible: false,
      nodes: [],
      noAppBadgeVisible: false,
      tieChip: null,
    }),
}));

/**
 * routeNodes(lane, labels): displays round glowing nodes at equal spacing
 * on the planned route from gate to bay S7, in dim outline mode.
 */
export function routeNodes(
  _lane?: 0 | 1 | 2,
  labels?: string[]
): Promise<void> {
  const nodeLabels = labels ?? ['Entrance', 'L1', 'L2', 'L3', 'L4', 'S7'];
  const nodes: RouteNodeItem[] = DEFAULT_NODES.map((d, idx) => ({
    ...d,
    label: nodeLabels[idx] ?? d.label,
    state: 'dim',
  }));

  useRouteNodesStore.getState().setNodes(nodes);
  return Promise.resolve();
}

/**
 * nodeIgnite(i): fills node i bright green with a ring pulse and label brightening.
 */
export function nodeIgnite(i: number): Promise<void> {
  useRouteNodesStore.getState().igniteNode(i);
  return Promise.resolve();
}

/**
 * trailFade(nodeIndex): dims nodes and route behind the moving car to 15% opacity over 600 ms.
 */
export function trailFade(nodeIndex?: number): Promise<void> {
  useRouteNodesStore.getState().trailFade(nodeIndex);
  return Promise.resolve();
}

/**
 * pulseNode(i): pulses node i with continuous green halo.
 */
export function pulseNode(i: number): void {
  useRouteNodesStore.getState().pulseNode(i);
}

/**
 * switchOffNodesReverse(staggerMs): switches off remaining nodes in reverse order (120 ms each).
 */
export function switchOffNodesReverse(staggerMs = 120): Promise<void> {
  const reduced = isReducedMotion();
  const store = useRouteNodesStore.getState();
  const count = store.nodes.length;

  if (reduced) {
    for (let i = 0; i < count; i++) {
      store.switchOffNode(i);
    }
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const delay = t(staggerMs);
    let step = 0;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const unregister = registerCancelHandler(() => {
      timeouts.forEach((tm) => clearTimeout(tm));
      resolve();
    });

    const runStep = () => {
      if (step >= count) {
        unregister();
        resolve();
        return;
      }
      const nodeIdx = count - 1 - step;
      useRouteNodesStore.getState().switchOffNode(nodeIdx);
      step++;
      const tm = setTimeout(runStep, delay);
      timeouts.push(tm);
    };

    runStep();
  });
}

/**
 * noAppBadge(): phone icon with diagonal red slash and "No app. No screen." text.
 */
export function noAppBadge(options: { durationMs?: number } = {}): Promise<void> {
  const store = useRouteNodesStore.getState();
  const reduced = isReducedMotion();

  store.setNoAppBadge(true);
  useFxStore.getState().setPhoneBadge({ visible: true, persisted: true });

  if (reduced) return Promise.resolve();

  return new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      unregister();
      resolve();
    }, t(options.durationMs ?? 600));

    const unregister = registerCancelHandler(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/**
 * removeNoAppBadge(): hides the badge.
 */
export function removeNoAppBadge(): void {
  useRouteNodesStore.getState().setNoAppBadge(false);
  useFxStore.getState().setPhoneBadge(null);
}

/**
 * clearRouteNodes(): cleans up all Claim 12 route nodes and overlays.
 */
export function clearRouteNodes(): void {
  useRouteNodesStore.getState().reset();
  useFxStore.getState().setPhoneBadge(null);
}
