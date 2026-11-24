// ============================================================================
// PARKWAY SCENE DIRECTOR TYPES (src/scenarios/director/types.ts)
// ============================================================================

import { Rect } from '../anchors';
import { CalloutPlacement } from './placement';

export interface PinOverlay {
  id: string;
  stepId: string;
  anchor: string;
  n: number;
  x: number;
  y: number;
  persist?: boolean;
}

export interface CalloutOverlay {
  id: string;
  stepId: string;
  text: string;
  anchor: string;
  n: number;
  placement: CalloutPlacement;
  persist?: boolean;
}

export interface SpotlightOverlay {
  stepId: string;
  anchors: string[] | 'none';
  rects: Rect[];
  persist?: boolean;
}

export interface PanelOverlay {
  id: string;
  stepId: string;
  rect: Rect;
  title: string;
  persist?: boolean;
}

export interface ChipOverlay {
  id: string;
  stepId: string;
  anchor: string;
  text: string;
  icon?: string;
  x: number;
  y: number;
  persist?: boolean;
}

export interface RecapFact {
  text: string;
}

export interface RecapOverlay {
  title: string;
  facts: string[];
}

export interface MismatchWarning {
  message: string;
  details?: string;
}

export interface SceneDirectorState {
  pins: PinOverlay[];
  callouts: CalloutOverlay[];
  spotlight: SpotlightOverlay | null;
  panels: PanelOverlay[];
  chips: ChipOverlay[];
  recap: RecapOverlay | null;
  mismatchWarning: MismatchWarning | null;

  // Actions
  addPin: (pin: PinOverlay) => void;
  removePin: (id: string) => void;
  setCallout: (callout: CalloutOverlay | null) => void;
  setSpotlight: (spotlight: SpotlightOverlay | null) => void;
  addPanel: (panel: PanelOverlay) => void;
  removePanel: (id: string) => void;
  addChip: (chip: ChipOverlay) => void;
  removeChip: (id: string) => void;
  setRecap: (recap: RecapOverlay | null) => void;
  setMismatchWarning: (warning: MismatchWarning | null) => void;
  clearStepOverlays: (stepId: string, persistIds?: string[]) => void;
  clearAllOverlays: () => void;
}
