/**
 * Mathematical and statistical helper functions for ParkWay Analytics.
 * Pure, robust, and unit-tested.
 */

/**
 * Calculates the Gini coefficient of inequality for an array of values.
 * Returns a number in [0, 1] where 0 = perfect equality, 1 = maximum inequality.
 * Formula: G = sum_i sum_j |x_i - x_j| / (2 * n^2 * mean)
 */
export function calcGiniCoefficient(values: number[]): number {
  if (!values || values.length === 0) return 0;
  const n = values.length;
  if (n === 1) return 0;

  // Filter or clamp negative values
  const sorted = [...values].map(v => Math.max(0, v)).sort((a, b) => a - b);
  let totalSum = 0;
  for (let i = 0; i < n; i++) {
    totalSum += sorted[i];
  }

  if (totalSum === 0) return 0;

  let cumulativeSum = 0;
  let weightedSum = 0;
  for (let i = 0; i < n; i++) {
    cumulativeSum += sorted[i];
    weightedSum += (i + 1) * sorted[i];
  }

  // Efficient standard formula using sorted array:
  // G = (2 * sum_{i=1}^n i * x_i) / (n * sum x_i) - (n + 1) / n
  const gini = (2 * weightedSum) / (n * totalSum) - (n + 1) / n;
  return Math.max(0, Math.min(1, Math.round(gini * 100) / 100));
}

/**
 * Calculates the p-th percentile from a sorted array of numbers.
 * p is in [0, 100].
 */
export function calcPercentile(sortedValues: number[], p: number): number {
  if (!sortedValues || sortedValues.length === 0) return 0;
  if (p <= 0) return sortedValues[0];
  if (p >= 100) return sortedValues[sortedValues.length - 1];

  const rank = (p / 100) * (sortedValues.length - 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  const weight = rank - low;

  if (low === high) return sortedValues[low];
  return sortedValues[low] * (1 - weight) + sortedValues[high] * weight;
}

export interface HeatmapAnalysis {
  rowMeans: number[];
  colMeans: number[];
  grandMean: number;
  busiestCell: {
    dow: number;
    hour: number;
    val: number;
  };
}

/**
 * Computes row averages, column averages, grand average, and busiest cell for a 2D matrix.
 */
export function calcHeatmapMeans(matrix: number[][]): HeatmapAnalysis {
  if (!matrix || matrix.length === 0 || matrix[0].length === 0) {
    return {
      rowMeans: [],
      colMeans: [],
      grandMean: 0,
      busiestCell: { dow: 0, hour: 0, val: 0 },
    };
  }

  const numRows = matrix.length;
  const numCols = matrix[0].length;

  const rowMeans: number[] = new Array(numRows).fill(0);
  const colMeans: number[] = new Array(numCols).fill(0);
  let totalSum = 0;
  let maxVal = -1;
  let busiest = { dow: 0, hour: 0, val: 0 };

  for (let r = 0; r < numRows; r++) {
    let rSum = 0;
    for (let c = 0; c < numCols; c++) {
      const v = matrix[r][c];
      rSum += v;
      colMeans[c] += v;
      totalSum += v;

      if (v > maxVal) {
        maxVal = v;
        busiest = { dow: r, hour: c, val: v };
      }
    }
    rowMeans[r] = Math.round((rSum / numCols) * 1000) / 1000;
  }

  for (let c = 0; c < numCols; c++) {
    colMeans[c] = Math.round((colMeans[c] / numRows) * 1000) / 1000;
  }

  const grandMean = Math.round((totalSum / (numRows * numCols)) * 1000) / 1000;

  return {
    rowMeans,
    colMeans,
    grandMean,
    busiestCell: busiest,
  };
}

export interface DeadSlotItem {
  slotId: number;
  zoneId: string;
  utilisationPct: number;
  suspectSensor: boolean;
  faultType?: string;
}

/**
 * Detects underutilised or dead slots (utilisation < thresholdPct).
 */
export function detectDeadSlots(
  slots: { slotId: number; zoneId: string; utilisationPct: number; suspectFault?: string | null }[],
  thresholdPct = 2.0
): DeadSlotItem[] {
  return slots
    .filter(s => s.utilisationPct < thresholdPct)
    .map(s => ({
      slotId: s.slotId,
      zoneId: s.zoneId,
      utilisationPct: s.utilisationPct,
      suspectSensor: !!s.suspectFault,
      faultType: s.suspectFault || undefined,
    }))
    .sort((a, b) => a.utilisationPct - b.utilisationPct);
}
