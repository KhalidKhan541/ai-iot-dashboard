export interface DataPoint {
  timestamp: number;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface TimeSeriesConfig {
  resampleInterval?: number;
  interpolationMethod?: "linear" | "nearest" | "previous" | "next" | "cubic";
  aggregationMethod?: "mean" | "median" | "min" | "max" | "sum" | "count" | "first" | "last";
  fillMissing?: "none" | "zero" | "forward" | "backward" | "interpolate";
}

export type ResampleInterval =
  | "1s" | "5s" | "10s" | "30s"
  | "1m" | "5m" | "10m" | "15m" | "30m"
  | "1h" | "2h" | "4h" | "6h" | "12h"
  | "1d" | "1w" | "1M";

const INTERVAL_MS: Record<ResampleInterval, number> = {
  "1s": 1000,
  "5s": 5000,
  "10s": 10000,
  "30s": 30000,
  "1m": 60000,
  "5m": 300000,
  "10m": 600000,
  "15m": 900000,
  "30m": 1800000,
  "1h": 3600000,
  "2h": 7200000,
  "4h": 14400000,
  "6h": 21600000,
  "12h": 43200000,
  "1d": 86400000,
  "1w": 604800000,
  "1M": 2592000000,
};

export function resample(
  data: DataPoint[],
  interval: ResampleInterval,
  aggregation: TimeSeriesConfig["aggregationMethod"] = "mean"
): DataPoint[] {
  if (data.length === 0) return [];

  const intervalMs = INTERVAL_MS[interval];
  const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
  const startTime = sortedData[0].timestamp;
  const endTime = sortedData[sortedData.length - 1].timestamp;

  const buckets = new Map<number, number[]>();
  const result: DataPoint[] = [];

  for (let time = startTime; time <= endTime; time += intervalMs) {
    const bucketEnd = time + intervalMs;
    const values: number[] = [];

    for (const point of sortedData) {
      if (point.timestamp >= time && point.timestamp < bucketEnd) {
        values.push(point.value);
      }
    }

    if (values.length > 0) {
      const aggregated = aggregate(values, aggregation);
      result.push({
        timestamp: time + intervalMs / 2,
        value: aggregated,
      });
    }
  }

  return result;
}

function aggregate(
  values: number[],
  method: TimeSeriesConfig["aggregationMethod"]
): number {
  if (values.length === 0) return 0;

  switch (method) {
    case "mean":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "median": {
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "count":
      return values.length;
    case "first":
      return values[0];
    case "last":
      return values[values.length - 1];
    default:
      return values.reduce((a, b) => a + b, 0) / values.length;
  }
}

export function interpolateLinear(
  data: DataPoint[],
  targetTimestamps: number[]
): DataPoint[] {
  if (data.length === 0) return targetTimestamps.map((t) => ({ timestamp: t, value: 0 }));
  if (data.length === 1) return targetTimestamps.map((t) => ({ timestamp: t, value: data[0].value }));

  const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
  const result: DataPoint[] = [];

  for (const target of targetTimestamps) {
    let i = 0;
    while (i < sorted.length - 1 && sorted[i + 1].timestamp <= target) {
      i++;
    }

    if (i >= sorted.length - 1) {
      result.push({ timestamp: target, value: sorted[sorted.length - 1].value });
      continue;
    }

    if (sorted[i].timestamp === target) {
      result.push({ timestamp: target, value: sorted[i].value });
      continue;
    }

    const t0 = sorted[i].timestamp;
    const t1 = sorted[i + 1].timestamp;
    const v0 = sorted[i].value;
    const v1 = sorted[i + 1].value;

    const ratio = (target - t0) / (t1 - t0);
    const value = v0 + (v1 - v0) * ratio;

    result.push({ timestamp: target, value });
  }

  return result;
}

export function interpolateNearest(
  data: DataPoint[],
  targetTimestamps: number[]
): DataPoint[] {
  if (data.length === 0) return targetTimestamps.map((t) => ({ timestamp: t, value: 0 }));

  const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
  const result: DataPoint[] = [];

  for (const target of targetTimestamps) {
    let closest = sorted[0];
    let minDist = Math.abs(target - closest.timestamp);

    for (const point of sorted) {
      const dist = Math.abs(target - point.timestamp);
      if (dist < minDist) {
        minDist = dist;
        closest = point;
      }
    }

    result.push({ timestamp: target, value: closest.value });
  }

  return result;
}

export function interpolatePrevious(
  data: DataPoint[],
  targetTimestamps: number[]
): DataPoint[] {
  if (data.length === 0) return targetTimestamps.map((t) => ({ timestamp: t, value: 0 }));

  const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
  const result: DataPoint[] = [];

  for (const target of targetTimestamps) {
    let value = sorted[0].value;
    for (const point of sorted) {
      if (point.timestamp <= target) {
        value = point.value;
      } else {
        break;
      }
    }
    result.push({ timestamp: target, value });
  }

  return result;
}

export function interpolateNext(
  data: DataPoint[],
  targetTimestamps: number[]
): DataPoint[] {
  if (data.length === 0) return targetTimestamps.map((t) => ({ timestamp: t, value: 0 }));

  const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
  const result: DataPoint[] = [];

  for (const target of targetTimestamps) {
    let value = sorted[sorted.length - 1].value;
    for (const point of sorted) {
      if (point.timestamp >= target) {
        value = point.value;
        break;
      }
    }
    result.push({ timestamp: target, value });
  }

  return result;
}

export function downsample(
  data: DataPoint[],
  maxPoints: number,
  method: "lttb" | "minmax" | "random" = "lttb"
): DataPoint[] {
  if (data.length <= maxPoints) return [...data];

  const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);

  switch (method) {
    case "lttb":
      return downsampleLTTB(sorted, maxPoints);
    case "minmax":
      return downsampleMinMax(sorted, maxPoints);
    case "random":
      return downsampleRandom(sorted, maxPoints);
    default:
      return downsampleLTTB(sorted, maxPoints);
  }
}

function downsampleLTTB(data: DataPoint[], targetPoints: number): DataPoint[] {
  if (data.length <= targetPoints) return [...data];
  if (targetPoints < 3) return [data[0], data[data.length - 1]];

  const result: DataPoint[] = [data[0]];
  const bucketSize = (data.length - 2) / (targetPoints - 2);

  let a = 0;
  for (let i = 1; i < targetPoints - 1; i++) {
    const rangeStart = Math.floor((i - 1) * bucketSize) + 1;
    const rangeEnd = Math.min(Math.floor(i * bucketSize) + 1, data.length);
    const nextRangeStart = Math.floor(i * bucketSize) + 1;
    const nextRangeEnd = Math.min(Math.floor((i + 1) * bucketSize) + 1, data.length);

    const avgTimestamp =
      data.slice(nextRangeStart, nextRangeEnd).reduce((sum, p) => sum + p.timestamp, 0) /
      (nextRangeEnd - nextRangeStart);

    let maxArea = -1;
    let maxAreaIndex = rangeStart;

    for (let j = rangeStart; j < rangeEnd; j++) {
      const area = Math.abs(
        (data[a].timestamp - avgTimestamp) * (data[j].value - data[a].value) -
        (data[a].timestamp - data[j].timestamp) * (0 - data[a].value)
      ) / 2;

      if (area > maxArea) {
        maxArea = area;
        maxAreaIndex = j;
      }
    }

    result.push(data[maxAreaIndex]);
    a = maxAreaIndex;
  }

  result.push(data[data.length - 1]);
  return result;
}

function downsampleMinMax(data: DataPoint[], targetPoints: number): DataPoint[] {
  if (data.length <= targetPoints) return [...data];

  const result: DataPoint[] = [];
  const bucketSize = Math.ceil(data.length / (targetPoints / 2));

  for (let i = 0; i < data.length; i += bucketSize) {
    const bucket = data.slice(i, i + bucketSize);
    if (bucket.length === 0) continue;

    const min = bucket.reduce((a, b) => (a.value < b.value ? a : b));
    const max = bucket.reduce((a, b) => (a.value > b.value ? a : b));

    if (min.timestamp === max.timestamp) {
      result.push(min);
    } else {
      result.push(min);
      result.push(max);
    }
  }

  return result.slice(0, targetPoints);
}

function downsampleRandom(data: DataPoint[], targetPoints: number): DataPoint[] {
  if (data.length <= targetPoints) return [...data];

  const indices = new Set<number>();
  indices.add(0);
  indices.add(data.length - 1);

  while (indices.size < targetPoints) {
    indices.add(Math.floor(Math.random() * data.length));
  }

  return Array.from(indices)
    .sort((a, b) => a - b)
    .map((i) => data[i]);
}

export function movingAverage(data: DataPoint[], window: number): DataPoint[] {
  if (data.length === 0 || window <= 0) return [];

  const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
  const result: DataPoint[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const start = Math.max(0, i - Math.floor(window / 2));
    const end = Math.min(sorted.length, i + Math.ceil(window / 2));
    const windowData = sorted.slice(start, end);
    const avg = windowData.reduce((sum, p) => sum + p.value, 0) / windowData.length;

    result.push({
      timestamp: sorted[i].timestamp,
      value: avg,
    });
  }

  return result;
}

export function exponentialMovingAverage(
  data: DataPoint[],
  alpha: number = 0.3
): DataPoint[] {
  if (data.length === 0) return [];

  const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
  const result: DataPoint[] = [{ timestamp: sorted[0].timestamp, value: sorted[0].value }];

  for (let i = 1; i < sorted.length; i++) {
    const prev = result[i - 1].value;
    const current = sorted[i].value;
    const ema = alpha * current + (1 - alpha) * prev;

    result.push({
      timestamp: sorted[i].timestamp,
      value: ema,
    });
  }

  return result;
}

export function detectAnomalies(
  data: DataPoint[],
  options?: {
    method?: "zscore" | "iqr" | "mad";
    threshold?: number;
    windowSize?: number;
  }
): DataPoint[] {
  const { method = "zscore", threshold = 3, windowSize = 20 } = options ?? {};
  const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
  const anomalies: DataPoint[] = [];

  for (let i = windowSize; i < sorted.length; i++) {
    const windowData = sorted.slice(i - windowSize, i).map((p) => p.value);
    const currentValue = sorted[i].value;
    let isAnomaly = false;

    switch (method) {
      case "zscore": {
        const mean = windowData.reduce((a, b) => a + b, 0) / windowData.length;
        const variance = windowData.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / windowData.length;
        const stdDev = Math.sqrt(variance);
        if (stdDev > 0) {
          const zscore = Math.abs((currentValue - mean) / stdDev);
          isAnomaly = zscore > threshold;
        }
        break;
      }
      case "iqr": {
        const sortedWindow = [...windowData].sort((a, b) => a - b);
        const q1 = sortedWindow[Math.floor(sortedWindow.length * 0.25)];
        const q3 = sortedWindow[Math.floor(sortedWindow.length * 0.75)];
        const iqr = q3 - q1;
        const lower = q1 - threshold * iqr;
        const upper = q3 + threshold * iqr;
        isAnomaly = currentValue < lower || currentValue > upper;
        break;
      }
      case "mad": {
        const median = windowData[Math.floor(windowData.length / 2)];
        const deviations = windowData.map((v) => Math.abs(v - median));
        const mad = deviations.sort((a, b) => a - b)[Math.floor(deviations.length / 2)];
        if (mad > 0) {
          const modifiedZscore = 0.6745 * (currentValue - median) / mad;
          isAnomaly = Math.abs(modifiedZscore) > threshold;
        }
        break;
      }
    }

    if (isAnomaly) {
      anomalies.push(sorted[i]);
    }
  }

  return anomalies;
}

export function calculateStatistics(data: DataPoint[]): {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  count: number;
  sum: number;
  variance: number;
  q1: number;
  q3: number;
  iqr: number;
} {
  const values = data.map((p) => p.value).sort((a, b) => a - b);
  const count = values.length;

  if (count === 0) {
    return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0, count: 0, sum: 0, variance: 0, q1: 0, q3: 0, iqr: 0 };
  }

  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / count;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / count;
  const stdDev = Math.sqrt(variance);

  const mid = Math.floor(count / 2);
  const median = count % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;

  const q1 = values[Math.floor(count * 0.25)];
  const q3 = values[Math.floor(count * 0.75)];
  const iqr = q3 - q1;

  return {
    mean,
    median,
    stdDev,
    min: values[0],
    max: values[count - 1],
    count,
    sum,
    variance,
    q1,
    q3,
    iqr,
  };
}

export function generateTimeRange(
  start: number,
  end: number,
  interval: ResampleInterval
): number[] {
  const intervalMs = INTERVAL_MS[interval];
  const timestamps: number[] = [];

  for (let t = start; t <= end; t += intervalMs) {
    timestamps.push(t);
  }

  return timestamps;
}

export function alignToInterval(
  timestamp: number,
  interval: ResampleInterval
): number {
  const intervalMs = INTERVAL_MS[interval];
  return Math.floor(timestamp / intervalMs) * intervalMs;
}

export function formatTimestamp(
  timestamp: number,
  format: "iso" | "unix" | "readable" = "readable"
): string {
  switch (format) {
    case "iso":
      return new Date(timestamp).toISOString();
    case "unix":
      return String(Math.floor(timestamp / 1000));
    case "readable":
      return new Date(timestamp).toLocaleString();
    default:
      return new Date(timestamp).toISOString();
  }
}

export function getTimeSeriesInfo(data: DataPoint[]): {
  start: number;
  end: number;
  duration: number;
  pointCount: number;
  avgInterval: number;
  minInterval: number;
  maxInterval: number;
} {
  if (data.length === 0) {
    return { start: 0, end: 0, duration: 0, pointCount: 0, avgInterval: 0, minInterval: 0, maxInterval: 0 };
  }

  const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
  const intervals: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    intervals.push(sorted[i].timestamp - sorted[i - 1].timestamp);
  }

  return {
    start: sorted[0].timestamp,
    end: sorted[sorted.length - 1].timestamp,
    duration: sorted[sorted.length - 1].timestamp - sorted[0].timestamp,
    pointCount: sorted.length,
    avgInterval: intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0,
    minInterval: intervals.length > 0 ? Math.min(...intervals) : 0,
    maxInterval: intervals.length > 0 ? Math.max(...intervals) : 0,
  };
}
