/**
 * Analytics Engine Client Bridge.
 * Manages Web Worker lifecycles, progress streaming, and IndexedDB caching.
 * Falls back seamlessly to direct thread execution if Web Workers are unavailable.
 */

import { GenerateOptions, runSimulation } from './generator';
import { SimulationAggregates } from './types';
import { getCachedAggregates, setCachedAggregates } from './cache';
import { WorkerInMessage, WorkerOutMessage } from './worker/generate.worker';

let activeWorker: Worker | null = null;

export async function generateAnalyticsDataset(
  options: GenerateOptions,
  skipCache = false
): Promise<SimulationAggregates> {
  const SCHEMA_VERSION = 'v2';
  const cacheKey = `${options.presetId}_${options.days}_${SCHEMA_VERSION}`;

  // 1. Check IndexedDB cache
  if (!skipCache) {
    const cached = await getCachedAggregates(cacheKey);
    if (
      cached &&
      cached.version >= 2 &&
      Array.isArray(cached.searchTimeByOccupancy) &&
      Array.isArray(cached.cumulativeSavings) &&
      Array.isArray(cached.slots) &&
      Array.isArray(cached.dwellHistogramBins) &&
      cached.slotHourlyOccupied
    ) {
      if (options.onProgress) {
        options.onProgress(1.0, 'Loaded from instant local cache');
      }
      return cached;
    }
  }

  // 2. If Web Worker is supported in environment
  if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
    return new Promise((resolve, reject) => {
      // Terminate any existing worker to prevent duplicate concurrent runs
      if (activeWorker) {
        activeWorker.terminate();
        activeWorker = null;
      }

      try {
        const worker = new Worker(
          new URL('./worker/generate.worker.ts', import.meta.url),
          { type: 'module' }
        );
        activeWorker = worker;

        worker.onmessage = async (e: MessageEvent<WorkerOutMessage>) => {
          const msg = e.data;
          if (msg.type === 'PROGRESS') {
            options.onProgress?.(msg.progress, msg.message);
          } else if (msg.type === 'DONE') {
            // Save to cache
            await setCachedAggregates(cacheKey, msg.aggregates);
            worker.terminate();
            activeWorker = null;
            resolve(msg.aggregates);
          } else if (msg.type === 'ERROR') {
            worker.terminate();
            activeWorker = null;
            try {
              const result = runSimulation(options);
              setCachedAggregates(cacheKey, result);
              resolve(result);
            } catch (syncErr) {
              reject(syncErr);
            }
          }
        };

        worker.onerror = () => {
          worker.terminate();
          activeWorker = null;
          try {
            const result = runSimulation(options);
            setCachedAggregates(cacheKey, result);
            resolve(result);
          } catch (syncErr) {
            reject(syncErr);
          }
        };

        const startMsg: WorkerInMessage = {
          type: 'START',
          options,
        };
        worker.postMessage(startMsg);
      } catch {
        // Fallback to synchronous in-thread generation
        try {
          const result = runSimulation(options);
          setCachedAggregates(cacheKey, result);
          resolve(result);
        } catch (syncErr) {
          reject(syncErr);
        }
      }
    });
  }

  // 3. Fallback for non-worker environments (e.g. Node / Vitest)
  const result = runSimulation(options);
  await setCachedAggregates(cacheKey, result);
  return result;
}
