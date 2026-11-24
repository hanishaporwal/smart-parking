import { useFxStore, registerCancelHandler } from './store';
import { useScenarioStore } from '../useScenarioStore';
import { t, isReducedMotion } from '../pacing';

export interface BarrierActionOptions {
  lightColor?: 'red' | 'green' | 'amber';
  entrySignGlow?: boolean;
}

export const barrier = {
  lift: (options: BarrierActionOptions = {}): Promise<void> => {
    const store = useFxStore.getState();
    const reduced = isReducedMotion();

    store.setBarrierState({
      armRaised: true,
      lightColor: options.lightColor ?? 'green',
      entrySignGlow: options.entrySignGlow ?? true,
    });
    useScenarioStore.setState({ barrierArmRaised: true });

    if (reduced) return Promise.resolve();

    return new Promise<void>(resolve => {
      const timer = setTimeout(() => {
        unregister();
        resolve();
      }, t(600));

      const unregister = registerCancelHandler(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  },

  lower: (options: BarrierActionOptions = {}): Promise<void> => {
    const store = useFxStore.getState();
    const reduced = isReducedMotion();

    store.setBarrierState({
      armRaised: false,
      lightColor: options.lightColor ?? 'amber',
      entrySignGlow: options.entrySignGlow ?? false,
    });
    useScenarioStore.setState({ barrierArmRaised: false });

    if (reduced) return Promise.resolve();

    return new Promise<void>(resolve => {
      const timer = setTimeout(() => {
        unregister();
        resolve();
      }, t(600));

      const unregister = registerCancelHandler(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  },
};
