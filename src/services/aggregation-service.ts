// ── Types ────────────────────────────────────────────────────────────────────

export type AggregationFunction = 'avg' | 'min' | 'max' | 'sum' | 'count' | 'median' | 'p95' | 'p99';

export type TimeGranularity = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month';

export interface AggregationQuery {
  deviceId: string;
  metric: string;
  function: AggregationFunction;
  granularity: TimeGranularity;
  timeRange: { start: Date; end: Date };
}

export interface AggregationResult {
  query: AggregationQuery;
  dataPoints: DataPoint[];
  totalPoints: number;
  executionTimeMs: number;
}

export interface DataPoint {
  timestamp: Date;
  value: number;
  count: number;
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
}

export interface AggregationConfig {
  maxDataPoints: number;
  interpolationEnabled: boolean;
  cacheEnabled: boolean;
  cacheTtlMs: number;
}

// ── Service ─────────────────────────────────────────────────────────────────

export class AggregationService {
  private data: TimeSeriesData[] = [];
  private config: AggregationConfig;
  private cache: Map<string, AggregationResult> = new Map();

  constructor(config?: Partial<AggregationConfig>) {
    this.config = {
      maxDataPoints: config?.maxDataPoints ?? 1000,
      interpolationEnabled: config?.interpolationEnabled ?? true,
      cacheEnabled: config?.cacheEnabled ?? true,
      cacheTtlMs: config?.cacheTtlMs ?? 60000,
    };
  }

  addData(points: TimeSeriesData[]): void {
    this.data.push(...points);
    this.data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    if (this.config.cacheEnabled) {
      this.cache.clear();
    }
  }

  aggregate(query: AggregationQuery): AggregationResult {
    const start = Date.now();

    if (this.config.cacheEnabled) {
      const cached = this.getFromCache(query);
      if (cached) return { ...cached, executionTimeMs: Date.now() - start };
    }

    const filtered = this.data.filter(
      d =>
        d.timestamp >= query.timeRange.start &&
        d.timestamp <= query.timeRange.end
    );

    const bucketed = this.bucketByGranularity(filtered, query.granularity);
    const dataPoints: DataPoint[] = [];

    bucketed.forEach((bucket, timestamp) => {
      if (bucket.length === 0) return;
      const values = bucket.map(d => d.value).sort((a, b) => a - b);
      const aggregatedValue = this.applyFunction(query.function, values);

      dataPoints.push({
        timestamp,
        value: aggregatedValue,
        count: bucket.length,
      });
    });

    const result: AggregationResult = {
      query,
      dataPoints,
      totalPoints: dataPoints.length,
      executionTimeMs: Date.now() - start,
    };

    if (this.config.cacheEnabled) {
      this.setCache(query, result);
    }

    return result;
  }

  private bucketByGranularity(
    data: TimeSeriesData[],
    granularity: TimeGranularity
  ): Map<number, number[]> {
    const buckets = new Map<number, number[]>();

    data.forEach(d => {
      const key = this.getBucketKey(d.timestamp, granularity);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(d.value);
    });

    return buckets;
  }

  private getBucketKey(timestamp: Date, granularity: TimeGranularity): number {
    const d = new Date(timestamp);
    switch (granularity) {
      case 'second':
        d.setMilliseconds(0);
        break;
      case 'minute':
        d.setSeconds(0, 0);
        break;
      case 'hour':
        d.setMinutes(0, 0, 0);
        break;
      case 'day':
        d.setHours(0, 0, 0, 0);
        break;
      case 'week':
        d.setDate(d.getDate() - d.getDay());
        d.setHours(0, 0, 0, 0);
        break;
      case 'month':
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        break;
    }
    return d.getTime();
  }

  private applyFunction(fn: AggregationFunction, values: number[]): number {
    switch (fn) {
      case 'avg':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'count':
        return values.length;
      case 'median': {
        const mid = Math.floor(values.length / 2);
        return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
      }
      case 'p95': {
        const idx95 = Math.ceil(values.length * 0.95) - 1;
        return values[Math.min(idx95, values.length - 1)];
      }
      case 'p99': {
        const idx99 = Math.ceil(values.length * 0.99) - 1;
        return values[Math.min(idx99, values.length - 1)];
      }
      default:
        return 0;
    }
  }

  downsampler(data: DataPoint[], maxPoints: number): DataPoint[] {
    if (data.length <= maxPoints) return data;
    const step = Math.ceil(data.length / maxPoints);
    const sampled: DataPoint[] = [];
    for (let i = 0; i < data.length; i += step) {
      sampled.push(data[i]);
    }
    return sampled;
  }

  interpolate(data: DataPoint[], targetCount: number): DataPoint[] {
    if (!this.config.interpolationEnabled) return data;
    if (data.length >= targetCount) return data;

    const result: DataPoint[] = [...data];
    const step = (data[data.length - 1].timestamp.getTime() - data[0].timestamp.getTime()) / (targetCount - 1);

    while (result.length < targetCount) {
      let maxGap = 0;
      let maxGapIndex = 0;

      for (let i = 0; i < result.length - 1; i++) {
        const gap = result[i + 1].timestamp.getTime() - result[i].timestamp.getTime();
        if (gap > maxGap) {
          maxGap = gap;
          maxGapIndex = i;
        }
      }

      const prev = result[maxGapIndex];
      const next = result[maxGapIndex + 1];
      const midTime = new Date((prev.timestamp.getTime() + next.timestamp.getTime()) / 2);
      const midValue = (prev.value + next.value) / 2;

      result.splice(maxGapIndex + 1, 0, {
        timestamp: midTime,
        value: midValue,
        count: 1,
      });
    }

    return result;
  }

  calculateRate(data: TimeSeriesData[]): TimeSeriesData[] {
    if (data.length < 2) return [];
    const rates: TimeSeriesData[] = [];
    for (let i = 1; i < data.length; i++) {
      const timeDiff = (data[i].timestamp.getTime() - data[i - 1].timestamp.getTime()) / 1000;
      if (timeDiff > 0) {
        rates.push({
          timestamp: data[i].timestamp,
          value: (data[i].value - data[i - 1].value) / timeDiff,
        });
      }
    }
    return rates;
  }

  private getFromCache(query: AggregationQuery): AggregationResult | undefined {
    const key = this.getCacheKey(query);
    const cached = this.cache.get(key);
    if (!cached) return undefined;
    if (Date.now() - cached.executionTimeMs > this.config.cacheTtlMs) {
      this.cache.delete(key);
      return undefined;
    }
    return cached;
  }

  private setCache(query: AggregationQuery, result: AggregationResult): void {
    const key = this.getCacheKey(query);
    this.cache.set(key, result);
  }

  private getCacheKey(query: AggregationQuery): string {
    return `${query.deviceId}:${query.metric}:${query.function}:${query.granularity}:${query.timeRange.start.getTime()}:${query.timeRange.end.getTime()}`;
  }

  clear(): void {
    this.data = [];
    this.cache.clear();
  }

  getDataCount(): number {
    return this.data.length;
  }
}
