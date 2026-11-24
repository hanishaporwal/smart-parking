import { DashboardCardData } from './types';
import { useFxStore, registerCancelHandler } from './store';
import { t, isReducedMotion } from '../pacing';

export function dashboardCard(data: DashboardCardData): Promise<void> {
  const store = useFxStore.getState();
  const reduced = isReducedMotion();

  store.setDashboardCard({
    visible: true,
    data,
    countProgress: reduced ? 1 : 0,
  });

  if (reduced) return Promise.resolve();

  return new Promise<void>(resolve => {
    let progress = 0;
    const steps = 12;
    const intervalMs = t(50);

    const interval = setInterval(() => {
      progress += 1 / steps;
      store.setDashboardCard({
        visible: true,
        data,
        countProgress: Math.min(1, progress),
      });

      if (progress >= 1) {
        clearInterval(interval);
        unregister();
        resolve();
      }
    }, intervalMs);

    const unregister = registerCancelHandler(() => {
      clearInterval(interval);
      store.setDashboardCard({
        visible: true,
        data,
        countProgress: 1,
      });
      resolve();
    });
  });
}
