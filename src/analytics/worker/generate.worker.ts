/**
 * Dedicated Web Worker for ParkWay Analytics Data Engine.
 * Keeps the main thread at 60fps with zero long tasks during intensive simulation runs.
 */

import { runSimulation, GenerateOptions } from '../generator';
import { SimulationAggregates } from '../types';

export interface WorkerStartMessage {
  type: 'START';
  options: GenerateOptions;
}

export interface WorkerProgressMessage {
  type: 'PROGRESS';
  progress: number;
  message: string;
}

export interface WorkerDoneMessage {
  type: 'DONE';
  aggregates: SimulationAggregates;
}

export interface WorkerErrorMessage {
  type: 'ERROR';
  error: string;
}

export type WorkerInMessage = WorkerStartMessage;
export type WorkerOutMessage = WorkerProgressMessage | WorkerDoneMessage | WorkerErrorMessage;

self.onmessage = (event: MessageEvent<WorkerInMessage>) => {
  const data = event.data;
  if (data?.type === 'START') {
    try {
      const aggregates = runSimulation({
        ...data.options,
        onProgress: (progress, message) => {
          self.postMessage({
            type: 'PROGRESS',
            progress,
            message,
          } as WorkerProgressMessage);
        },
      });

      self.postMessage({
        type: 'DONE',
        aggregates,
      } as WorkerDoneMessage);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      self.postMessage({
        type: 'ERROR',
        error: errorMsg,
      } as WorkerErrorMessage);
    }
  }
};
