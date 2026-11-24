import { useFxStore } from './store';

export function recalcChip(text = 'Recalculating...'): void {
  const store = useFxStore.getState();
  store.addChip({
    id: 'recalc-chip',
    anchor: { type: 'coord', x: 260, y: 180 },
    text,
    icon: 'spinner',
    visible: true,
  });
}

export function removeRecalcChip(): void {
  useFxStore.getState().removeChip('recalc-chip');
}
