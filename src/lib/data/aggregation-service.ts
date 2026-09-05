// =============================================================================
// DATA AGGREGATION SERVICE - Real-Time Aggregation, Downsampling & Gap Filling
// =============================================================================
// Multi-resolution time-series aggregation with real-time streaming support,
// statistical functions, window operations, and intelligent gap filling.
// =============================================================================

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

// -----------------------------------------------------------------------------
// Data Types
// -----------------------------------------------------------------------------

export interface AggregatedPoint {
  id: string;
  deviceId: string;
  capabilityId: string;
  windowStart: Date;
  windowEnd: Date;
  resolution: AggregationResolution;
  stats: AggregationStats;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface AggregationStats {
  avg: number | null;
  min: number | null;
  max: number | null;
  sum: number | null;
  count: number;
  first: number | null;
  last: number | null;
  median: number | null;
  stdDev: number | null;
  variance: number | null;
  range: number | null;
  percentiles?: Record<string, number>;
  histogram?: HistogramBucket[];
  trend?: TrendAnalysis;
}

export interface HistogramBucket {
  lower: number;
  upper: number;
  count: number;
  percentage: number;
}

export interface TrendAnalysis {
  slope: number;
  intercept: number;
  rSquared: number;
  direction: 'increasing' | 'decreasing' | 'stable';
  strength: 'weak' | 'moderate' | 'strong';
}

export enum AggregationResolution {
  SECOND_1 = '1s',
  SECOND_5 = '5s',
  SECOND_10 = '10s',
  SECOND_30 = '30s',
  MINUTE_1 = '1m',
  MINUTE_5 = '5m',
  MINUTE_10 = '10m',
  MINUTE_15 = '15m',
  MINUTE_30 = '30m',
  HOUR_1 = '1h',
  HOUR_6 = '6h',
  HOUR_12 = '12h',
  DAY_1 = '1d',
  WEEK_1 = '1w',
  MONTH_1 = '1M',
}

export interface AggregationRule {
  id: string;
  name: string;
  description: string;
  deviceIds?: string[];
  capabilityIds?: string[];
  tags?: string[];
  sourceResolution: AggregationResolution;
  targetResolutions: AggregationResolution[];
  enabled: boolean;
  priority: number;
  retentionDays: Record<AggregationResolution, number>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WindowFunction {
  type: 'moving_average' | 'exponential_moving_average' | 'weighted_average' | 'cumulative_sum' | 'cumulative_avg' | 'lag' | 'lead' | 'rolling_percentile';
  windowSize: number;
  minPeriods?: number;
  alpha?: number; // For EMA
  percentile?: number;
  lag?: number;
}

export interface GapFillingConfig {
  enabled: boolean;
  maxGapDuration: number; // ms
  strategy: 'forward_fill' | 'backward_fill' | 'linear_interpolation' | 'spline_interpolation' | 'mean_substitution' | 'zero_fill' | 'nearest';
  maxFillPoints: number;
}

export interface DownsamplingConfig {
  enabled: boolean;
  targetResolution: AggregationResolution;
  algorithm: 'lttb' | 'min_max' | 'average' | 'first' | 'last' | 'random';
  preservePeaks: boolean;
  peakThreshold: number;
  outputPoints: number;
}

export interface AggregationPipeline {
  id: string;
  name: string;
  deviceId: string;
  capabilityId: string;
  rules: AggregationRule[];
  windowFunctions: WindowFunction[];
  gapFilling: GapFillingConfig;
  downsampling: DownsamplingConfig;
  enabled: boolean;
  lastRun?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// -----------------------------------------------------------------------------
// Raw Data Point
// -----------------------------------------------------------------------------

export interface RawDataPoint {
  deviceId: string;
  capabilityId: string;
  timestamp: Date;
  value: number;
  metadata?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// Aggregation Configuration
// -----------------------------------------------------------------------------

export interface AggregationConfig {
  maxConcurrentPipelines: number;
  windowBufferSize: number;
  aggregationBatchSize: number;
  aggregationIntervalMs: number;
  enableRealTimeAggregation: boolean;
  enableDownsampling: boolean;
  enableGapFilling: boolean;
  defaultGapFillingStrategy: GapFillingConfig['strategy'];
  maxGapDurationMs: number;
  minDataPointsForAggregation: number;
  enableTrendAnalysis: boolean;
  enableHistogram: boolean;
  histogramBuckets: number;
  percentileValues: number[];
  cleanupIntervalMs: number;
  maxAggregatedPoints: number;
}

const DEFAULT_AGGREGATION_CONFIG: AggregationConfig = {
  maxConcurrentPipelines: 100,
  windowBufferSize: 10000,
  aggregationBatchSize: 1000,
  aggregationIntervalMs: 1000,
  enableRealTimeAggregation: true,
  enableDownsampling: true,
  enableGapFilling: true,
  defaultGapFillingStrategy: 'linear_interpolation',
  maxGapDurationMs: 300000, // 5 minutes
  minDataPointsForAggregation: 2,
  enableTrendAnalysis: true,
  enableHistogram: true,
  histogramBuckets: 20,
  percentileValues: [50, 75, 90, 95, 99],
  cleanupIntervalMs: 3600000,
  maxAggregatedPoints: 10000000,
};

// -----------------------------------------------------------------------------
// Aggregation Service
// -----------------------------------------------------------------------------

export class AggregationService extends EventEmitter {
  private aggregatedData: Map<string, AggregatedPoint[]> = new Map();
  private pipelines: Map<string, AggregationPipeline> = new Map();
  private rules: Map<string, AggregationRule> = new Map();
  private windowBuffers: Map<string, RawDataPoint[]> = new Map();
  private realtimeBuffers: Map<string, RawDataPoint[]> = new Map();
  private aggregationTimer: ReturnType<typeof setInterval> | null = null;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private config: AggregationConfig;

  // Raw data callback
  private rawDataCallback?: (deviceId: string, capabilityId: string, startTime: Date, endTime: Date) => Promise<RawDataPoint[]>;

  constructor(config: Partial<AggregationConfig> = {}) {
    super();
    this.config = { ...DEFAULT_AGGREGATION_CONFIG, ...config };
    this.startTimers();
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  setRawDataCallback(callback: (deviceId: string, capabilityId: string, startTime: Date, endTime: Date) => Promise<RawDataPoint[]>): void {
    this.rawDataCallback = callback;
  }

  destroy(): void {
    if (this.aggregationTimer) clearInterval(this.aggregationTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  private startTimers(): void {
    if (this.config.enableRealTimeAggregation) {
      this.aggregationTimer = setInterval(() => {
        this.processRealtimeBuffers();
      }, this.config.aggregationIntervalMs);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupOldData();
    }, this.config.cleanupIntervalMs);
  }

  // -------------------------------------------------------------------------
  // Real-Time Data Ingestion
  // -------------------------------------------------------------------------

  ingestDataPoint(point: RawDataPoint): void {
    const key = `${point.deviceId}:${point.capabilityId}`;

    // Add to realtime buffer
    if (!this.realtimeBuffers.has(key)) {
      this.realtimeBuffers.set(key, []);
    }
    this.realtimeBuffers.get(key)!.push(point);

    // Emit for real-time subscribers
    this.emit('data:point', point);

    // Check if buffer is full
    const buffer = this.realtimeBuffers.get(key)!;
    if (buffer.length >= this.config.windowBufferSize) {
      this.processRealtimeBuffersForKey(key);
    }
  }

  ingestDataPoints(points: RawDataPoint[]): void {
    for (const point of points) {
      this.ingestDataPoint(point);
    }
  }

  private processRealtimeBuffers(): void {
    for (const key of this.realtimeBuffers.keys()) {
      this.processRealtimeBuffersForKey(key);
    }
  }

  private processRealtimeBuffersForKey(key: string): void {
    const buffer = this.realtimeBuffers.get(key);
    if (!buffer || buffer.length === 0) return;

    const points = [...buffer];
    this.realtimeBuffers.set(key, []);

    // Process for each applicable pipeline
    for (const pipeline of this.pipelines.values()) {
      if (!pipeline.enabled) continue;

      const [deviceId, capabilityId] = key.split(':');
      if (pipeline.deviceId !== deviceId || pipeline.capabilityId !== capabilityId) continue;

      this.processPointsForPipeline(pipeline, points);
    }
  }

  // -------------------------------------------------------------------------
  // Pipeline Management
  // -------------------------------------------------------------------------

  createPipeline(pipeline: Omit<AggregationPipeline, 'id' | 'createdAt' | 'updatedAt'>): AggregationPipeline {
    if (this.pipelines.size >= this.config.maxConcurrentPipelines) {
      throw new Error('Maximum concurrent pipelines reached');
    }

    const newPipeline: AggregationPipeline = {
      ...pipeline,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.pipelines.set(newPipeline.id, newPipeline);
    return newPipeline;
  }

  updatePipeline(id: string, updates: Partial<AggregationPipeline>): AggregationPipeline | undefined {
    const pipeline = this.pipelines.get(id);
    if (!pipeline) return undefined;

    const updated = { ...pipeline, ...updates, updatedAt: new Date() };
    this.pipelines.set(id, updated);
    return updated;
  }

  deletePipeline(id: string): boolean {
    return this.pipelines.delete(id);
  }

  getPipeline(id: string): AggregationPipeline | undefined {
    return this.pipelines.get(id);
  }

  listPipelines(): AggregationPipeline[] {
    return Array.from(this.pipelines.values());
  }

  // -------------------------------------------------------------------------
  // Aggregation Rules
  // -------------------------------------------------------------------------

  createRule(rule: Omit<AggregationRule, 'id' | 'createdAt' | 'updatedAt'>): AggregationRule {
    const newRule: AggregationRule = {
      ...rule,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.rules.set(newRule.id, newRule);
    return newRule;
  }

  updateRule(id: string, updates: Partial<AggregationRule>): AggregationRule | undefined {
    const rule = this.rules.get(id);
    if (!rule) return undefined;

    const updated = { ...rule, ...updates, updatedAt: new Date() };
    this.rules.set(id, updated);
    return updated;
  }

  deleteRule(id: string): boolean {
    return this.rules.delete(id);
  }

  listRules(): AggregationRule[] {
    return Array.from(this.rules.values());
  }

  // -------------------------------------------------------------------------
  // Aggregation Processing
  // -------------------------------------------------------------------------

  private processPointsForPipeline(pipeline: AggregationPipeline, points: RawDataPoint[]): void {
    // Add to window buffer
    const key = `${pipeline.id}`;
    if (!this.windowBuffers.has(key)) {
      this.windowBuffers.set(key, []);
    }
    this.windowBuffers.get(key)!.push(...points);

    // Process each target resolution
    for (const resolution of pipeline.targetResolutions) {
      this.aggregateForResolution(pipeline, resolution);
    }
  }

  private aggregateForResolution(pipeline: AggregationPipeline, resolution: AggregationResolution): void {
    const key = `${pipeline.id}:${resolution}`;
    const buffer = this.windowBuffers.get(pipeline.id) || [];

    if (buffer.length < this.config.minDataPointsForAggregation) return;

    const windowMs = this.resolutionToMs(resolution);
    const now = Date.now();

    // Group points into windows
    const windows = this.groupIntoWindows(buffer, windowMs, now);

    for (const [windowStart, windowPoints] of windows) {
      const windowEnd = new Date(windowStart.getTime() + windowMs);

      // Check if window is complete (except for current window)
      if (windowEnd.getTime() < now) {
        const stats = this.computeStatistics(windowPoints, pipeline);
        const aggregatedPoint = this.createAggregatedPoint(
          pipeline,
          resolution,
          new Date(windowStart),
          windowEnd,
          stats
        );

        this.storeAggregatedPoint(aggregatedPoint);
        this.emit('aggregation:complete', aggregatedPoint);
      }
    }
  }

  private groupIntoWindows(
    points: RawDataPoint[],
    windowMs: number,
    referenceTime: number
  ): Map<number, RawDataPoint[]> {
    const windows = new Map<number, RawDataPoint[]>();

    for (const point of points) {
      const windowStart = Math.floor(point.timestamp.getTime() / windowMs) * windowMs;
      if (!windows.has(windowStart)) {
        windows.set(windowStart, []);
      }
      windows.get(windowStart)!.push(point);
    }

    return windows;
  }

  private computeStatistics(
    points: RawDataPoint[],
    pipeline: AggregationPipeline
  ): AggregationStats {
    const values = points.map(p => p.value).filter(v => !isNaN(v) && isFinite(v));

    if (values.length === 0) {
      return this.emptyStats();
    }

    const sorted = [...values].sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / count;
    const min = sorted[0];
    const max = sorted[count - 1];

    // Median
    const mid = Math.floor(count / 2);
    const median = count % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    // Standard deviation and variance
    const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / count;
    const stdDev = Math.sqrt(variance);

    // Percentiles
    const percentiles: Record<string, number> = {};
    for (const p of this.config.percentileValues) {
      const index = Math.ceil(count * (p / 100)) - 1;
      percentiles[`${p}`] = sorted[Math.max(0, index)];
    }

    // Histogram
    let histogram: HistogramBucket[] | undefined;
    if (this.config.enableHistogram) {
      histogram = this.computeHistogram(values, this.config.histogramBuckets);
    }

    // Trend analysis
    let trend: TrendAnalysis | undefined;
    if (this.config.enableTrendAnalysis && count >= 3) {
      trend = this.computeTrend(points.map(p => ({ x: p.timestamp.getTime(), y: p.value })));
    }

    return {
      avg,
      min,
      max,
      sum,
      count,
      first: values[0],
      last: values[count - 1],
      median,
      stdDev,
      variance,
      range: max - min,
      percentiles,
      histogram,
      trend,
    };
  }

  private computeHistogram(values: number[], buckets: number): HistogramBucket[] {
    if (values.length === 0) return [];

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const bucketSize = range / buckets;

    const histogram: HistogramBucket[] = [];
    for (let i = 0; i < buckets; i++) {
      const lower = min + i * bucketSize;
      const upper = min + (i + 1) * bucketSize;
      const count = values.filter(v => v >= lower && (i === buckets - 1 ? v <= upper : v < upper)).length;
      histogram.push({
        lower,
        upper,
        count,
        percentage: (count / values.length) * 100,
      });
    }

    return histogram;
  }

  private computeTrend(data: Array<{ x: number; y: number }>): TrendAnalysis {
    const n = data.length;
    const sumX = data.reduce((acc, d) => acc + d.x, 0);
    const sumY = data.reduce((acc, d) => acc + d.y, 0);
    const sumXY = data.reduce((acc, d) => acc + d.x * d.y, 0);
    const sumX2 = data.reduce((acc, d) => acc + d.x * d.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // R-squared
    const meanY = sumY / n;
    const ssTotal = data.reduce((acc, d) => acc + Math.pow(d.y - meanY, 2), 0);
    const ssResidual = data.reduce((acc, d) => {
      const predicted = slope * d.x + intercept;
      return acc + Math.pow(d.y - predicted, 2);
    }, 0);
    const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

    // Direction and strength
    const direction: TrendAnalysis['direction'] =
      Math.abs(slope) < 0.0001 ? 'stable' : slope > 0 ? 'increasing' : 'decreasing';

    const strength: TrendAnalysis['strength'] =
      Math.abs(rSquared) < 0.3 ? 'weak' : Math.abs(rSquared) < 0.7 ? 'moderate' : 'strong';

    return { slope, intercept, rSquared, direction, strength };
  }

  private createAggregatedPoint(
    pipeline: AggregationPipeline,
    resolution: AggregationResolution,
    windowStart: Date,
    windowEnd: Date,
    stats: AggregationStats
  ): AggregatedPoint {
    return {
      id: uuidv4(),
      deviceId: pipeline.deviceId,
      capabilityId: pipeline.capabilityId,
      windowStart,
      windowEnd,
      resolution,
      stats,
      metadata: {
        pipelineId: pipeline.id,
        pipelineName: pipeline.name,
      },
      createdAt: new Date(),
    };
  }

  private storeAggregatedPoint(point: AggregatedPoint): void {
    const key = `${point.deviceId}:${point.capabilityId}:${point.resolution}`;
    if (!this.aggregatedData.has(key)) {
      this.aggregatedData.set(key, []);
    }
    this.aggregatedData.get(key)!.push(point);

    // Enforce max points limit
    const data = this.aggregatedData.get(key)!;
    if (data.length > this.config.maxAggregatedPoints) {
      this.aggregatedData.set(key, data.slice(-this.config.maxAggregatedPoints));
    }
  }

  // -------------------------------------------------------------------------
  // Window Functions
  // -------------------------------------------------------------------------

  applyWindowFunction(
    points: RawDataPoint[],
    windowFunc: WindowFunction
  ): Array<{ timestamp: Date; value: number }> {
    const result: Array<{ timestamp: Date; value: number }> = [];

    switch (windowFunc.type) {
      case 'moving_average': {
        for (let i = 0; i < points.length; i++) {
          const windowStart = Math.max(0, i - windowFunc.windowSize + 1);
          const windowPoints = points.slice(windowStart, i + 1);
          const avg = windowPoints.reduce((acc, p) => acc + p.value, 0) / windowPoints.length;
          result.push({ timestamp: points[i].timestamp, value: avg });
        }
        break;
      }

      case 'exponential_moving_average': {
        const alpha = windowFunc.alpha || 2 / (windowFunc.windowSize + 1);
        let ema = points[0].value;
        result.push({ timestamp: points[0].timestamp, value: ema });

        for (let i = 1; i < points.length; i++) {
          ema = alpha * points[i].value + (1 - alpha) * ema;
          result.push({ timestamp: points[i].timestamp, value: ema });
        }
        break;
      }

      case 'weighted_average': {
        const weights = Array.from({ length: windowFunc.windowSize }, (_, i) => i + 1);
        const totalWeight = weights.reduce((a, b) => a + b, 0);

        for (let i = 0; i < points.length; i++) {
          const windowStart = Math.max(0, i - windowFunc.windowSize + 1);
          const windowPoints = points.slice(windowStart, i + 1);
          const w = weights.slice(-windowPoints.length);
          const wTotal = w.reduce((a, b) => a + b, 0);
          const weightedSum = windowPoints.reduce((acc, p, j) => acc + p.value * w[j], 0);
          result.push({ timestamp: points[i].timestamp, value: weightedSum / wTotal });
        }
        break;
      }

      case 'cumulative_sum': {
        let cumSum = 0;
        for (const point of points) {
          cumSum += point.value;
          result.push({ timestamp: point.timestamp, value: cumSum });
        }
        break;
      }

      case 'cumulative_avg': {
        let cumSum = 0;
        for (let i = 0; i < points.length; i++) {
          cumSum += points[i].value;
          result.push({ timestamp: points[i].timestamp, value: cumSum / (i + 1) });
        }
        break;
      }

      case 'lag': {
        const lag = windowFunc.lag || 1;
        for (let i = lag; i < points.length; i++) {
          result.push({ timestamp: points[i].timestamp, value: points[i - lag].value });
        }
        break;
      }

      case 'lead': {
        const lead = windowFunc.lag || 1;
        for (let i = 0; i < points.length - lead; i++) {
          result.push({ timestamp: points[i].timestamp, value: points[i + lead].value });
        }
        break;
      }

      case 'rolling_percentile': {
        const percentile = windowFunc.percentile || 50;
        for (let i = 0; i < points.length; i++) {
          const windowStart = Math.max(0, i - windowFunc.windowSize + 1);
          const windowPoints = points.slice(windowStart, i + 1);
          const sorted = windowPoints.map(p => p.value).sort((a, b) => a - b);
          const index = Math.ceil(sorted.length * (percentile / 100)) - 1;
          result.push({ timestamp: points[i].timestamp, value: sorted[Math.max(0, index)] });
        }
        break;
      }
    }

    return result;
  }

  // -------------------------------------------------------------------------
  // Gap Filling
  // -------------------------------------------------------------------------

  fillGaps(
    points: RawDataPoint[],
    config: GapFillingConfig,
    expectedIntervalMs: number
  ): RawDataPoint[] {
    if (!config.enabled || points.length < 2) return points;

    const sorted = [...points].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const result: RawDataPoint[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i].timestamp.getTime() - sorted[i - 1].timestamp.getTime();

      if (gap > expectedIntervalMs * 1.5 && gap <= config.maxGapDuration) {
        const gapPoints = this.generateGapFillPoints(
          sorted[i - 1],
          sorted[i],
          config,
          expectedIntervalMs
        );
        result.push(...gapPoints.slice(0, config.maxFillPoints));
      }

      result.push(sorted[i]);
    }

    return result;
  }

  private generateGapFillPoints(
    before: RawDataPoint,
    after: RawDataPoint,
    config: GapFillingConfig,
    expectedIntervalMs: number
  ): RawDataPoint[] {
    const points: RawDataPoint[] = [];
    const gapMs = after.timestamp.getTime() - before.timestamp.getTime();
    const numPoints = Math.floor(gapMs / expectedIntervalMs);

    for (let i = 1; i <= numPoints; i++) {
      const timestamp = new Date(before.timestamp.getTime() + i * expectedIntervalMs);
      let value: number;

      switch (config.strategy) {
        case 'forward_fill':
          value = before.value;
          break;

        case 'backward_fill':
          value = after.value;
          break;

        case 'linear_interpolation': {
          const ratio = i / (numPoints + 1);
          value = before.value + (after.value - before.value) * ratio;
          break;
        }

        case 'spline_interpolation': {
          // Simplified cubic spline
          const t = i / (numPoints + 1);
          const t2 = t * t;
          const t3 = t2 * t;
          value =
            (2 * t3 - 3 * t2 + 1) * before.value +
            (t3 - 2 * t2 + t) * (after.value - before.value) * 0.5 +
            (-2 * t3 + 3 * t2) * after.value;
          break;
        }

        case 'mean_substitution':
          value = (before.value + after.value) / 2;
          break;

        case 'zero_fill':
          value = 0;
          break;

        case 'nearest':
          value = Math.abs(before.timestamp.getTime() - timestamp.getTime()) <
            Math.abs(after.timestamp.getTime() - timestamp.getTime())
            ? before.value
            : after.value;
          break;

        default:
          value = before.value;
      }

      points.push({
        deviceId: before.deviceId,
        capabilityId: before.capabilityId,
        timestamp,
        value,
        metadata: { filled: true, strategy: config.strategy },
      });
    }

    return points;
  }

  // -------------------------------------------------------------------------
  // Downsampling
  // -------------------------------------------------------------------------

  downsample(
    points: RawDataPoint[],
    config: DownsamplingConfig
  ): RawDataPoint[] {
    if (!config.enabled || points.length <= config.outputPoints) return points;

    const sorted = [...points].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    switch (config.algorithm) {
      case 'lttb':
        return this.lttbDownsample(sorted, config.outputPoints, config.peakThreshold);

      case 'min_max':
        return this.minMaxDownsample(sorted, config.outputPoints, config.preservePeaks, config.peakThreshold);

      case 'average':
        return this.averageDownsample(sorted, config.outputPoints);

      case 'first':
        return this.takeFirstDownsample(sorted, config.outputPoints);

      case 'last':
        return this.takeLastDownsample(sorted, config.outputPoints);

      case 'random':
        return this.randomDownsample(sorted, config.outputPoints);

      default:
        return this.lttbDownsample(sorted, config.outputPoints, config.peakThreshold);
    }
  }

  private lttbDownsample(data: RawDataPoint[], targetPoints: number, threshold: number): RawDataPoint[] {
    if (data.length <= targetPoints) return data;

    const result: RawDataPoint[] = [data[0]];
    const bucketSize = (data.length - 2) / (targetPoints - 2);

    let a = 0; // Index of previously selected point

    for (let i = 0; i < targetPoints - 2; i++) {
      const rangeStart = Math.floor((i + 1) * bucketSize) + 1;
      const rangeEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, data.length - 1);

      // Calculate average of next bucket
      let avgX = 0;
      let avgY = 0;
      const rangeLength = rangeEnd - rangeStart + 1;

      for (let j = rangeStart; j <= rangeEnd; j++) {
        avgX += data[j].timestamp.getTime();
        avgY += data[j].value;
      }
      avgX /= rangeLength;
      avgY /= rangeLength;

      // Calculate point range
      const currRangeStart = Math.floor(i * bucketSize) + 1;
      const currRangeEnd = Math.min(Math.floor((i + 1) * bucketSize) + 1, data.length - 1);

      // Find the point in current bucket that forms largest triangle with avg point
      let maxArea = -1;
      let maxIdx = currRangeStart;

      for (let j = currRangeStart; j <= currRangeEnd; j++) {
        const area = Math.abs(
          (data[a].timestamp.getTime() - avgX) * (data[j].value - data[a].value) -
          (data[a].timestamp.getTime() - data[j].timestamp.getTime()) * (avgY - data[a].value)
        ) * 0.5;

        if (area > maxArea) {
          maxArea = area;
          maxIdx = j;
        }
      }

      result.push(data[maxIdx]);
      a = maxIdx;
    }

    result.push(data[data.length - 1]);
    return result;
  }

  private minMaxDownsample(
    data: RawDataPoint[],
    targetPoints: number,
    preservePeaks: boolean,
    peakThreshold: number
  ): RawDataPoint[] {
    if (data.length <= targetPoints) return data;

    const bucketSize = Math.ceil(data.length / targetPoints);
    const result: RawDataPoint[] = [];

    for (let i = 0; i < data.length; i += bucketSize) {
      const bucket = data.slice(i, i + bucketSize);
      if (bucket.length === 0) continue;

      const values = bucket.map(p => p.value);
      const min = Math.min(...values);
      const max = Math.max(...values);

      if (preservePeaks) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const isPeak = max - avg > peakThreshold || avg - min > peakThreshold;

        if (isPeak) {
          const minIdx = values.indexOf(min);
          const maxIdx = values.indexOf(max);
          result.push(bucket[minIdx]);
          if (minIdx !== maxIdx) {
            result.push(bucket[maxIdx]);
          }
          continue;
        }
      }

      result.push(bucket[0]); // First point
      if (bucket.length > 1) {
        result.push(bucket[bucket.length - 1]); // Last point
      }
    }

    return result.slice(0, targetPoints);
  }

  private averageDownsample(data: RawDataPoint[], targetPoints: number): RawDataPoint[] {
    if (data.length <= targetPoints) return data;

    const bucketSize = Math.ceil(data.length / targetPoints);
    const result: RawDataPoint[] = [];

    for (let i = 0; i < data.length; i += bucketSize) {
      const bucket = data.slice(i, i + bucketSize);
      if (bucket.length === 0) continue;

      const avgValue = bucket.reduce((acc, p) => acc + p.value, 0) / bucket.length;
      const midTimestamp = new Date(
        (bucket[0].timestamp.getTime() + bucket[bucket.length - 1].timestamp.getTime()) / 2
      );

      result.push({
        ...bucket[0],
        timestamp: midTimestamp,
        value: avgValue,
        metadata: { ...bucket[0].metadata, downsampled: true, originalCount: bucket.length },
      });
    }

    return result;
  }

  private takeFirstDownsample(data: RawDataPoint[], targetPoints: number): RawDataPoint[] {
    if (data.length <= targetPoints) return data;
    const step = Math.floor(data.length / targetPoints);
    return data.filter((_, i) => i % step === 0).slice(0, targetPoints);
  }

  private takeLastDownsample(data: RawDataPoint[], targetPoints: number): RawDataPoint[] {
    if (data.length <= targetPoints) return data;
    const step = Math.floor(data.length / targetPoints);
    return data.filter((_, i) => (i + 1) % step === 0 || i === data.length - 1).slice(0, targetPoints);
  }

  private randomDownsample(data: RawDataPoint[], targetPoints: number): RawDataPoint[] {
    if (data.length <= targetPoints) return data;
    const indices = new Set<number>();
    while (indices.size < targetPoints) {
      indices.add(Math.floor(Math.random() * data.length));
    }
    return Array.from(indices)
      .sort((a, b) => a - b)
      .map(i => data[i]);
  }

  // -------------------------------------------------------------------------
  // Query Aggregated Data
  // -------------------------------------------------------------------------

  queryAggregated(
    deviceId: string,
    capabilityId: string,
    resolution: AggregationResolution,
    startTime: Date,
    endTime: Date
  ): AggregatedPoint[] {
    const key = `${deviceId}:${capabilityId}:${resolution}`;
    const data = this.aggregatedData.get(key) || [];

    return data.filter(p =>
      p.windowStart >= startTime && p.windowEnd <= endTime
    );
  }

  getLatestAggregated(
    deviceId: string,
    capabilityId: string,
    resolution: AggregationResolution,
    count: number = 1
  ): AggregatedPoint[] {
    const key = `${deviceId}:${capabilityId}:${resolution}`;
    const data = this.aggregatedData.get(key) || [];

    return data
      .sort((a, b) => b.windowStart.getTime() - a.windowStart.getTime())
      .slice(0, count);
  }

  // -------------------------------------------------------------------------
  // Utilities
  // -------------------------------------------------------------------------

  private resolutionToMs(resolution: AggregationResolution): number {
    const map: Record<string, number> = {
      '1s': 1000,
      '5s': 5000,
      '10s': 10000,
      '30s': 30000,
      '1m': 60000,
      '5m': 300000,
      '10m': 600000,
      '15m': 900000,
      '30m': 1800000,
      '1h': 3600000,
      '6h': 21600000,
      '12h': 43200000,
      '1d': 86400000,
      '1w': 604800000,
      '1M': 2592000000,
    };
    return map[resolution] || 60000;
  }

  private emptyStats(): AggregationStats {
    return {
      avg: null,
      min: null,
      max: null,
      sum: null,
      count: 0,
      first: null,
      last: null,
      median: null,
      stdDev: null,
      variance: null,
      range: null,
    };
  }

  private cleanupOldData(): void {
    const maxAge = 30 * 24 * 3600 * 1000; // 30 days
    const cutoff = new Date(Date.now() - maxAge);

    for (const [key, data] of this.aggregatedData) {
      const filtered = data.filter(p => p.windowStart > cutoff);
      if (filtered.length === 0) {
        this.aggregatedData.delete(key);
      } else {
        this.aggregatedData.set(key, filtered);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Statistics
  // -------------------------------------------------------------------------

  getStatistics(): {
    totalPipelines: number;
    totalRules: number;
    totalAggregatedPoints: number;
    byResolution: Record<string, number>;
    byDevice: Map<string, number>;
  } {
    const byResolution: Record<string, number> = {};
    const byDevice = new Map<string, number>();
    let totalPoints = 0;

    for (const [key, data] of this.aggregatedData) {
      totalPoints += data.length;

      const parts = key.split(':');
      const resolution = parts[2];
      byResolution[resolution] = (byResolution[resolution] || 0) + data.length;

      const deviceId = parts[0];
      byDevice.set(deviceId, (byDevice.get(deviceId) || 0) + data.length);
    }

    return {
      totalPipelines: this.pipelines.size,
      totalRules: this.rules.size,
      totalAggregatedPoints: totalPoints,
      byResolution,
      byDevice,
    };
  }
}

// Singleton instance
let aggregationInstance: AggregationService | null = null;

export function getAggregationService(): AggregationService {
  if (!aggregationInstance) {
    aggregationInstance = new AggregationService();
  }
  return aggregationInstance;
}

export default AggregationService;
