// =============================================================================
// ANOMALY DETECTOR - Statistical, ML & Seasonal Anomaly Detection
// =============================================================================
// Multi-algorithm anomaly detection engine with Z-score, IQR, moving averages,
// seasonal decomposition, and conceptual ML model support.
// =============================================================================

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

// -----------------------------------------------------------------------------
// Data Types
// -----------------------------------------------------------------------------

export enum AnomalyType {
  POINT = 'point',           // Single outlier point
  CONTEXTUAL = 'contextual', // Anomalous in context
  COLLECTIVE = 'collective', // Group of anomalous points
  PATTERN = 'pattern',       // Unusual pattern
  TREND = 'trend',           // Unusual trend change
  SEASONAL = 'seasonal',     // Seasonal deviation
}

export enum AnomalySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum DetectionAlgorithm {
  Z_SCORE = 'z_score',
  MODIFIED_Z_SCORE = 'modified_z_score',
  IQR = 'iqr',
  MAD = 'mad',
  MOVING_AVERAGE = 'moving_average',
  EXPONENTIAL_MOVING_AVERAGE = 'exponential_moving_average',
  SEASONAL_DECOMPOSITION = 'seasonal_decomposition',
  ISOLATION_FOREST = 'isolation_forest',
  LSTM = 'lstm',
  AUTOENCODER = 'autoencoder',
  ENSEMBLE = 'ensemble',
  CUSTOM = 'custom',
}

export interface DataPoint {
  timestamp: Date;
  value: number;
  deviceId: string;
  capabilityId: string;
  metadata?: Record<string, unknown>;
}

export interface AnomalyResult {
  id: string;
  timestamp: Date;
  deviceId: string;
  capabilityId: string;
  value: number;
  anomalyType: AnomalyType;
  severity: AnomalySeverity;
  score: number; // 0-1, higher = more anomalous
  confidence: number; // 0-1
  algorithm: DetectionAlgorithm;
  expectedRange: { min: number; max: number };
  deviation: number;
  description: string;
  context?: Record<string, unknown>;
  createdAt: Date;
}

export interface DetectionModel {
  id: string;
  name: string;
  algorithm: DetectionAlgorithm;
  deviceId: string;
  capabilityId: string;
  parameters: Record<string, unknown>;
  statistics: ModelStatistics;
  trainedAt: Date;
  lastUpdated: Date;
  enabled: boolean;
}

export interface ModelStatistics {
  mean: number;
  stdDev: number;
  variance: number;
  min: number;
  max: number;
  median: number;
  q1: number;
  q3: number;
  iqr: number;
  mad: number; // Median Absolute Deviation
  skewness: number;
  kurtosis: number;
  sampleSize: number;
  trendSlope: number;
  trendIntercept: number;
  seasonalityStrength: number;
  autocorrelation: number[];
}

export interface DetectionRule {
  id: string;
  name: string;
  description: string;
  deviceId: string;
  capabilityId: string;
  algorithm: DetectionAlgorithm;
  parameters: Record<string, unknown>;
  severity: AnomalySeverity;
  enabled: boolean;
  cooldown: number; // seconds
  minDataPoints: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SeasonalDecomposition {
  trend: number[];
  seasonal: number[];
  residual: number[];
  seasonalPeriod: number;
  strengthOfTrend: number;
  strengthOfSeasonality: number;
}

export interface AnomalyAlert {
  id: string;
  anomalyId: string;
  deviceId: string;
  capabilityId: string;
  severity: AnomalySeverity;
  message: string;
  score: number;
  timestamp: Date;
  acknowledged: boolean;
  resolved: boolean;
  metadata: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

export interface AnomalyDetectorConfig {
  maxModels: number;
  maxRules: number;
  maxDataPoints: number;
  defaultWindowSize: number;
  defaultSensitivity: number; // 0-1
  enableRealTimeDetection: boolean;
  detectionInterval: number; // ms
  alertOnDetection: boolean;
  persistResults: boolean;
  maxAnomalies: number;
  cleanupInterval: number; // ms
  algorithms: {
    zScore: { threshold: number; windowSize: number };
    modifiedZScore: { threshold: number; windowSize: number };
    iqr: { multiplier: number; windowSize: number };
    mad: { threshold: number; windowSize: number };
    movingAverage: { windowSize: number; threshold: number; alpha?: number };
    seasonalDecomposition: { period: number; harmonicTerms: number };
    isolationForest: { trees: number; sampleSize: number };
  };
}

const DEFAULT_CONFIG: AnomalyDetectorConfig = {
  maxModels: 1000,
  maxRules: 5000,
  maxDataPoints: 100000,
  defaultWindowSize: 100,
  defaultSensitivity: 0.5,
  enableRealTimeDetection: true,
  detectionInterval: 5000,
  alertOnDetection: true,
  persistResults: true,
  maxAnomalies: 100000,
  cleanupInterval: 3600000,
  algorithms: {
    zScore: { threshold: 3, windowSize: 100 },
    modifiedZScore: { threshold: 3.5, windowSize: 100 },
    iqr: { multiplier: 1.5, windowSize: 100 },
    mad: { threshold: 3.5, windowSize: 100 },
    movingAverage: { windowSize: 20, threshold: 2 },
    seasonalDecomposition: { period: 24, harmonicTerms: 3 },
    isolationForest: { trees: 100, sampleSize: 256 },
  },
};

// -----------------------------------------------------------------------------
// Anomaly Detector Service
// -----------------------------------------------------------------------------

export class AnomalyDetector extends EventEmitter {
  private models: Map<string, DetectionModel> = new Map();
  private rules: Map<string, DetectionRule> = new Map();
  private anomalies: Map<string, AnomalyResult> = new Map();
  private dataBuffers: Map<string, DataPoint[]> = new Map();
  private alerts: Map<string, AnomalyAlert> = new Map();
  private detectionTimer: ReturnType<typeof setInterval> | null = null;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private config: AnomalyDetectorConfig;

  // Callbacks
  private dataCallback?: (deviceId: string, capabilityId: string, limit: number) => Promise<DataPoint[]>;

  constructor(config: Partial<AnomalyDetectorConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startTimers();
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  setDataCallback(callback: (deviceId: string, capabilityId: string, limit: number) => Promise<DataPoint[]>): void {
    this.dataCallback = callback;
  }

  destroy(): void {
    if (this.detectionTimer) clearInterval(this.detectionTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  private startTimers(): void {
    if (this.config.enableRealTimeDetection) {
      this.detectionTimer = setInterval(() => {
        this.runDetection();
      }, this.config.detectionInterval);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupOldData();
    }, this.config.cleanupInterval);
  }

  // -------------------------------------------------------------------------
  // Model Management
  // -------------------------------------------------------------------------

  async createModel(
    deviceId: string,
    capabilityId: string,
    algorithm: DetectionAlgorithm = DetectionAlgorithm.Z_SCORE,
    parameters: Record<string, unknown> = {}
  ): Promise<DetectionModel> {
    if (this.models.size >= this.config.maxModels) {
      throw new Error('Maximum models limit reached');
    }

    const model: DetectionModel = {
      id: uuidv4(),
      name: `${algorithm}_${deviceId}_${capabilityId}`,
      algorithm,
      deviceId,
      capabilityId,
      parameters: { ...this.config.algorithms[algorithm] || {}, ...parameters },
      statistics: this.emptyStatistics(),
      trainedAt: new Date(),
      lastUpdated: new Date(),
      enabled: true,
    };

    this.models.set(model.id, model);

    // Auto-train with available data
    await this.trainModel(model.id);

    return model;
  }

  async updateModel(id: string, updates: Partial<DetectionModel>): Promise<DetectionModel | undefined> {
    const model = this.models.get(id);
    if (!model) return undefined;

    const updated = { ...model, ...updates, lastUpdated: new Date() };
    this.models.set(id, updated);

    return updated;
  }

  async deleteModel(id: string): Promise<boolean> {
    return this.models.delete(id);
  }

  getModel(id: string): DetectionModel | undefined {
    return this.models.get(id);
  }

  listModels(): DetectionModel[] {
    return Array.from(this.models.values());
  }

  // -------------------------------------------------------------------------
  // Rule Management
  // -------------------------------------------------------------------------

  createRule(rule: Omit<DetectionRule, 'id' | 'createdAt' | 'updatedAt'>): DetectionRule {
    if (this.rules.size >= this.config.maxRules) {
      throw new Error('Maximum rules limit reached');
    }

    const newRule: DetectionRule = {
      ...rule,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.rules.set(newRule.id, newRule);
    return newRule;
  }

  updateRule(id: string, updates: Partial<DetectionRule>): DetectionRule | undefined {
    const rule = this.rules.get(id);
    if (!rule) return undefined;

    const updated = { ...rule, ...updates, updatedAt: new Date() };
    this.rules.set(id, updated);
    return updated;
  }

  deleteRule(id: string): boolean {
    return this.rules.delete(id);
  }

  listRules(): DetectionRule[] {
    return Array.from(this.rules.values());
  }

  // -------------------------------------------------------------------------
  // Data Ingestion
  // -------------------------------------------------------------------------

  ingestDataPoint(point: DataPoint): void {
    const key = `${point.deviceId}:${point.capabilityId}`;

    if (!this.dataBuffers.has(key)) {
      this.dataBuffers.set(key, []);
    }

    const buffer = this.dataBuffers.get(key)!;
    buffer.push(point);

    // Trim buffer
    if (buffer.length > this.config.maxDataPoints) {
      this.dataBuffers.set(key, buffer.slice(-this.config.maxDataPoints));
    }

    // Real-time detection
    if (this.config.enableRealTimeDetection) {
      this.detectAnomaliesForBuffer(key);
    }
  }

  ingestDataPoints(points: DataPoint[]): void {
    for (const point of points) {
      this.ingestDataPoint(point);
    }
  }

  // -------------------------------------------------------------------------
  // Model Training
  // -------------------------------------------------------------------------

  async trainModel(modelId: string): Promise<DetectionModel> {
    const model = this.models.get(modelId);
    if (!model) throw new Error(`Model not found: ${modelId}`);

    // Get training data
    const data = await this.getTrainingData(model.deviceId, model.capabilityId);
    if (data.length < 10) {
      throw new Error('Insufficient data for training');
    }

    // Calculate statistics
    const values = data.map(d => d.value);
    model.statistics = this.calculateStatistics(values);

    // Additional algorithm-specific training
    switch (model.algorithm) {
      case DetectionAlgorithm.SEASONAL_DECOMPOSITION:
        model.statistics.seasonalityStrength = this.calculateSeasonalityStrength(values, model.parameters.period as number || 24);
        break;

      case DetectionAlgorithm.ISOLATION_FOREST:
        // Conceptual - in production, train actual isolation forest
        break;

      case DetectionAlgorithm.LSTM:
        // Conceptual - in production, train actual LSTM model
        break;

      case DetectionAlgorithm.AUTOENCODER:
        // Conceptual - in production, train actual autoencoder
        break;
    }

    model.trainedAt = new Date();
    model.lastUpdated = new Date();

    this.emit('model:trained', { modelId, sampleSize: data.length });

    return model;
  }

  // -------------------------------------------------------------------------
  // Detection Algorithms
  // -------------------------------------------------------------------------

  private async runDetection(): Promise<void> {
    for (const [key, buffer] of this.dataBuffers) {
      if (buffer.length < 10) continue;

      const anomalies = this.detectAnomaliesForBuffer(key);
      for (const anomaly of anomalies) {
        this.storeAnomaly(anomaly);

        if (this.config.alertOnDetection) {
          this.createAlert(anomaly);
        }

        this.emit('anomaly:detected', anomaly);
      }
    }
  }

  private detectAnomaliesForBuffer(key: string): AnomalyResult[] {
    const buffer = this.dataBuffers.get(key);
    if (!buffer || buffer.length < 10) return [];

    const [deviceId, capabilityId] = key.split(':');
    const values = buffer.map(d => d.value);

    // Find applicable models
    const applicableModels = Array.from(this.models.values()).filter(
      m => m.deviceId === deviceId && m.capabilityId === capabilityId && m.enabled
    );

    // Find applicable rules
    const applicableRules = Array.from(this.rules.values()).filter(
      r => r.deviceId === deviceId && r.capabilityId === capabilityId && r.enabled
    );

    const anomalies: AnomalyResult[] = [];

    // Run each applicable algorithm
    for (const model of applicableModels) {
      const results = this.runDetectionAlgorithm(model, buffer, values);
      anomalies.push(...results);
    }

    // Run each applicable rule
    for (const rule of applicableRules) {
      const results = this.runDetectionRule(rule, buffer, values);
      anomalies.push(...results);
    }

    // If no models/rules, use default Z-score
    if (applicableModels.length === 0 && applicableRules.length === 0) {
      const results = this.detectZScore(buffer, values);
      anomalies.push(...results);
    }

    return anomalies;
  }

  private runDetectionAlgorithm(
    model: DetectionModel,
    buffer: DataPoint[],
    values: number[]
  ): AnomalyResult[] {
    switch (model.algorithm) {
      case DetectionAlgorithm.Z_SCORE:
        return this.detectZScore(buffer, values, model);

      case DetectionAlgorithm.MODIFIED_Z_SCORE:
        return this.detectModifiedZScore(buffer, values, model);

      case DetectionAlgorithm.IQR:
        return this.detectIQR(buffer, values, model);

      case DetectionAlgorithm.MAD:
        return this.detectMAD(buffer, values, model);

      case DetectionAlgorithm.MOVING_AVERAGE:
        return this.detectMovingAverage(buffer, values, model);

      case DetectionAlgorithm.EXPONENTIAL_MOVING_AVERAGE:
        return this.detectExponentialMovingAverage(buffer, values, model);

      case DetectionAlgorithm.SEASONAL_DECOMPOSITION:
        return this.detectSeasonalDecomposition(buffer, values, model);

      case DetectionAlgorithm.ENSEMBLE:
        return this.detectEnsemble(buffer, values, model);

      default:
        return this.detectZScore(buffer, values, model);
    }
  }

  private runDetectionRule(
    rule: DetectionRule,
    buffer: DataPoint[],
    values: number[]
  ): AnomalyResult[] {
    const model: Partial<DetectionModel> = {
      algorithm: rule.algorithm,
      parameters: rule.parameters,
      statistics: this.calculateStatistics(values),
    };

    return this.runDetectionAlgorithm(model as DetectionModel, buffer, values);
  }

  // -- Z-Score Detection --
  private detectZScore(
    buffer: DataPoint[],
    values: number[],
    model?: DetectionModel
  ): AnomalyResult[] {
    const results: AnomalyResult[] = [];
    const stats = model?.statistics || this.calculateStatistics(values);
    const threshold = (model?.parameters.threshold as number) || this.config.algorithms.zScore.threshold;
    const windowSize = (model?.parameters.windowSize as number) || this.config.algorithms.zScore.windowSize;

    for (let i = windowSize; i < buffer.length; i++) {
      const window = values.slice(i - windowSize, i);
      const windowStats = this.calculateStatistics(window);

      const zScore = Math.abs((values[i] - windowStats.mean) / (windowStats.stdDev || 1));

      if (zScore > threshold) {
        const severity = this.zScoreToSeverity(zScore, threshold);
        const score = Math.min(1, zScore / (threshold * 2));

        results.push(this.createAnomalyResult(
          buffer[i],
          AnomalyType.POINT,
          severity,
          score,
          DetectionAlgorithm.Z_SCORE,
          {
            min: windowStats.mean - threshold * windowStats.stdDev,
            max: windowStats.mean + threshold * windowStats.stdDev,
          },
          values[i] - windowStats.mean,
          `Z-score ${zScore.toFixed(2)} exceeds threshold ${threshold}`
        ));
      }
    }

    return results;
  }

  // -- Modified Z-Score Detection --
  private detectModifiedZScore(
    buffer: DataPoint[],
    values: number[],
    model?: DetectionModel
  ): AnomalyResult[] {
    const results: AnomalyResult[] = [];
    const stats = model?.statistics || this.calculateStatistics(values);
    const threshold = (model?.parameters.threshold as number) || this.config.algorithms.modifiedZScore.threshold;
    const windowSize = (model?.parameters.windowSize as number) || this.config.algorithms.modifiedZScore.windowSize;

    const median = stats.median;
    const mad = stats.mad;

    if (mad === 0) return results;

    for (let i = windowSize; i < buffer.length; i++) {
      const window = values.slice(i - windowSize, i);
      const windowMedian = this.calculateMedian(window);
      const windowMAD = this.calculateMAD(window, windowMedian);

      if (windowMAD === 0) continue;

      const modifiedZScore = 0.6745 * (values[i] - windowMedian) / windowMAD;

      if (Math.abs(modifiedZScore) > threshold) {
        const severity = this.zScoreToSeverity(Math.abs(modifiedZScore), threshold);
        const score = Math.min(1, Math.abs(modifiedZScore) / (threshold * 2));

        results.push(this.createAnomalyResult(
          buffer[i],
          AnomalyType.POINT,
          severity,
          score,
          DetectionAlgorithm.MODIFIED_Z_SCORE,
          {
            min: windowMedian - threshold * windowMAD / 0.6745,
            max: windowMedian + threshold * windowMAD / 0.6745,
          },
          values[i] - windowMedian,
          `Modified Z-score ${modifiedZScore.toFixed(2)} exceeds threshold ${threshold}`
        ));
      }
    }

    return results;
  }

  // -- IQR Detection --
  private detectIQR(
    buffer: DataPoint[],
    values: number[],
    model?: DetectionModel
  ): AnomalyResult[] {
    const results: AnomalyResult[] = [];
    const stats = model?.statistics || this.calculateStatistics(values);
    const multiplier = (model?.parameters.multiplier as number) || this.config.algorithms.iqr.multiplier;
    const windowSize = (model?.parameters.windowSize as number) || this.config.algorithms.iqr.windowSize;

    for (let i = windowSize; i < buffer.length; i++) {
      const window = values.slice(i - windowSize, i);
      const sorted = [...window].sort((a, b) => a - b);

      const q1 = this.calculatePercentile(sorted, 25);
      const q3 = this.calculatePercentile(sorted, 75);
      const iqr = q3 - q1;

      const lowerBound = q1 - multiplier * iqr;
      const upperBound = q3 + multiplier * iqr;

      if (values[i] < lowerBound || values[i] > upperBound) {
        const deviation = values[i] < lowerBound ? lowerBound - values[i] : values[i] - upperBound;
        const range = upperBound - lowerBound;
        const score = Math.min(1, deviation / (range || 1));
        const severity = this.scoreToSeverity(score);

        results.push(this.createAnomalyResult(
          buffer[i],
          AnomalyType.POINT,
          severity,
          score,
          DetectionAlgorithm.IQR,
          { min: lowerBound, max: upperBound },
          deviation,
          `Value ${values[i]} outside IQR bounds [${lowerBound.toFixed(2)}, ${upperBound.toFixed(2)}]`
        ));
      }
    }

    return results;
  }

  // -- MAD Detection --
  private detectMAD(
    buffer: DataPoint[],
    values: number[],
    model?: DetectionModel
  ): AnomalyResult[] {
    const results: AnomalyResult[] = [];
    const stats = model?.statistics || this.calculateStatistics(values);
    const threshold = (model?.parameters.threshold as number) || this.config.algorithms.mad.threshold;
    const windowSize = (model?.parameters.windowSize as number) || this.config.algorithms.mad.windowSize;

    for (let i = windowSize; i < buffer.length; i++) {
      const window = values.slice(i - windowSize, i);
      const median = this.calculateMedian(window);
      const mad = this.calculateMAD(window, median);

      if (mad === 0) continue;

      const deviation = Math.abs(values[i] - median) / (1.4826 * mad);

      if (deviation > threshold) {
        const score = Math.min(1, deviation / (threshold * 2));
        const severity = this.scoreToSeverity(score);

        results.push(this.createAnomalyResult(
          buffer[i],
          AnomalyType.POINT,
          severity,
          score,
          DetectionAlgorithm.MAD,
          {
            min: median - threshold * 1.4826 * mad,
            max: median + threshold * 1.4826 * mad,
          },
          values[i] - median,
          `MAD score ${deviation.toFixed(2)} exceeds threshold ${threshold}`
        ));
      }
    }

    return results;
  }

  // -- Moving Average Detection --
  private detectMovingAverage(
    buffer: DataPoint[],
    values: number[],
    model?: DetectionModel
  ): AnomalyResult[] {
    const results: AnomalyResult[] = [];
    const windowSize = (model?.parameters.windowSize as number) || this.config.algorithms.movingAverage.windowSize;
    const threshold = (model?.parameters.threshold as number) || this.config.algorithms.movingAverage.threshold;

    for (let i = windowSize; i < buffer.length; i++) {
      const window = values.slice(i - windowSize, i);
      const movingAvg = window.reduce((a, b) => a + b, 0) / window.length;
      const movingStdDev = Math.sqrt(
        window.reduce((sum, v) => sum + Math.pow(v - movingAvg, 2), 0) / window.length
      );

      const deviation = Math.abs(values[i] - movingAvg);
      const zScore = movingStdDev > 0 ? deviation / movingStdDev : 0;

      if (zScore > threshold) {
        const score = Math.min(1, zScore / (threshold * 2));
        const severity = this.scoreToSeverity(score);

        results.push(this.createAnomalyResult(
          buffer[i],
          AnomalyType.CONTEXTUAL,
          severity,
          score,
          DetectionAlgorithm.MOVING_AVERAGE,
          {
            min: movingAvg - threshold * movingStdDev,
            max: movingAvg + threshold * movingStdDev,
            movingAvg,
          },
          values[i] - movingAvg,
          `Value deviates from moving average by ${zScore.toFixed(2)} standard deviations`
        ));
      }
    }

    return results;
  }

  // -- Exponential Moving Average Detection --
  private detectExponentialMovingAverage(
    buffer: DataPoint[],
    values: number[],
    model?: DetectionModel
  ): AnomalyResult[] {
    const results: AnomalyResult[] = [];
    const alpha = (model?.parameters.alpha as number) || 0.3;
    const threshold = (model?.parameters.threshold as number) || this.config.algorithms.movingAverage.threshold;

    let ema = values[0];
    let emaVariance = 0;

    for (let i = 1; i < buffer.length; i++) {
      const prevEma = ema;
      ema = alpha * values[i] + (1 - alpha) * ema;
      emaVariance = alpha * Math.pow(values[i] - prevEma, 2) + (1 - alpha) * emaVariance;
      const emaStdDev = Math.sqrt(emaVariance);

      const deviation = Math.abs(values[i] - ema);
      const zScore = emaStdDev > 0 ? deviation / emaStdDev : 0;

      if (zScore > threshold) {
        const score = Math.min(1, zScore / (threshold * 2));
        const severity = this.scoreToSeverity(score);

        results.push(this.createAnomalyResult(
          buffer[i],
          AnomalyType.CONTEXTUAL,
          severity,
          score,
          DetectionAlgorithm.EXPONENTIAL_MOVING_AVERAGE,
          {
            min: ema - threshold * emaStdDev,
            max: ema + threshold * emaStdDev,
            ema,
          },
          values[i] - ema,
          `Value deviates from EMA by ${zScore.toFixed(2)} standard deviations`
        ));
      }
    }

    return results;
  }

  // -- Seasonal Decomposition Detection --
  private detectSeasonalDecomposition(
    buffer: DataPoint[],
    values: number[],
    model?: DetectionModel
  ): AnomalyResult[] {
    const results: AnomalyResult[] = [];
    const period = (model?.parameters.period as number) || this.config.algorithms.seasonalDecomposition.period;

    if (values.length < period * 2) return results;

    // Perform decomposition
    const decomposition = this.seasonalDecomposition(values, period);

    // Analyze residuals for anomalies
    const residualStats = this.calculateStatistics(decomposition.residual);
    const threshold = 3; // Z-score threshold for residuals

    for (let i = 0; i < decomposition.residual.length; i++) {
      const zScore = Math.abs(
        (decomposition.residual[i] - residualStats.mean) / (residualStats.stdDev || 1)
      );

      if (zScore > threshold) {
        const score = Math.min(1, zScore / (threshold * 2));
        const severity = this.scoreToSeverity(score);

        const expectedValue = decomposition.trend[i] + decomposition.seasonal[i];
        const actualValue = values[i + period] || values[i];

        results.push(this.createAnomalyResult(
          buffer[i + period] || buffer[i],
          AnomalyType.SEASONAL,
          severity,
          score,
          DetectionAlgorithm.SEASONAL_DECOMPOSITION,
          {
            expectedValue,
            trend: decomposition.trend[i],
            seasonal: decomposition.seasonal[i],
            residual: decomposition.residual[i],
          },
          actualValue - expectedValue,
          `Seasonal residual ${decomposition.residual[i].toFixed(2)} is anomalous`
        ));
      }
    }

    return results;
  }

  // -- Ensemble Detection --
  private detectEnsemble(
    buffer: DataPoint[],
    values: number[],
    model?: DetectionModel
  ): AnomalyResult[] {
    const results: AnomalyResult[] = [];

    // Run multiple algorithms
    const zScoreResults = this.detectZScore(buffer, values, model);
    const iqrResults = this.detectIQR(buffer, values, model);
    const madResults = this.detectMAD(buffer, values, model);

    // Combine results
    const allResults = [...zScoreResults, ...iqrResults, ...madResults];

    // Group by timestamp
    const byTimestamp = new Map<number, AnomalyResult[]>();
    for (const result of allResults) {
      const ts = result.timestamp.getTime();
      if (!byTimestamp.has(ts)) byTimestamp.set(ts, []);
      byTimestamp.get(ts)!.push(result);
    }

    // Create ensemble results
    for (const [ts, results] of byTimestamp) {
      if (results.length >= 2) {
        // At least 2 algorithms agree
        const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
        const maxSeverity = results.reduce(
          (max, r) => this.severityToNumber(r.severity) > this.severityToNumber(max) ? r.severity : max,
          AnomalySeverity.LOW
        );

        const ensembleResult = this.createAnomalyResult(
          results[0].timestamp instanceof Date ? results[0].timestamp : new Date(ts),
          AnomalyType.POINT,
          maxSeverity,
          avgScore,
          DetectionAlgorithm.ENSEMBLE,
          results[0].expectedRange,
          results[0].deviation,
          `Ensemble consensus: ${results.length} algorithms detected anomaly`
        );

        // Add context from all algorithms
        (ensembleResult.context as Record<string, unknown>) = {
          algorithmCount: results.length,
          algorithms: results.map(r => r.algorithm),
          individualScores: results.map(r => r.score),
        };

        results.push(ensembleResult);
      }
    }

    return results.filter(r => r.algorithm === DetectionAlgorithm.ENSEMBLE);
  }

  // -------------------------------------------------------------------------
  // Statistical Calculations
  // -------------------------------------------------------------------------

  private calculateStatistics(values: number[]): ModelStatistics {
    const n = values.length;
    if (n === 0) return this.emptyStatistics();

    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    const median = this.calculateMedian(sorted);
    const q1 = this.calculatePercentile(sorted, 25);
    const q3 = this.calculatePercentile(sorted, 75);
    const iqr = q3 - q1;
    const mad = this.calculateMAD(values, median);

    // Skewness
    const m3 = values.reduce((sum, v) => sum + Math.pow(v - mean, 3), 0) / n;
    const skewness = stdDev > 0 ? m3 / Math.pow(stdDev, 3) : 0;

    // Kurtosis
    const m4 = values.reduce((sum, v) => sum + Math.pow(v - mean, 4), 0) / n;
    const kurtosis = stdDev > 0 ? m4 / Math.pow(stdDev, 4) - 3 : 0;

    // Linear regression for trend
    const x = values.map((_, i) => i);
    const { slope, intercept } = this.linearRegression(x, values);

    // Autocorrelation
    const autocorrelation = this.calculateAutocorrelation(values, Math.min(20, n - 1));

    return {
      mean,
      stdDev,
      variance,
      min: sorted[0],
      max: sorted[n - 1],
      median,
      q1,
      q3,
      iqr,
      mad,
      skewness,
      kurtosis,
      sampleSize: n,
      trendSlope: slope,
      trendIntercept: intercept,
      seasonalityStrength: 0,
      autocorrelation,
    };
  }

  private calculateMedian(sorted: number[]): number {
    const n = sorted.length;
    if (n === 0) return 0;
    if (n % 2 === 0) {
      return (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
    }
    return sorted[Math.floor(n / 2)];
  }

  private calculatePercentile(sorted: number[], percentile: number): number {
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const fraction = index - lower;

    if (lower === upper) return sorted[lower];
    return sorted[lower] * (1 - fraction) + sorted[upper] * fraction;
  }

  private calculateMAD(values: number[], median: number): number {
    const deviations = values.map(v => Math.abs(v - median));
    deviations.sort((a, b) => a - b);
    return this.calculateMedian(deviations);
  }

  private calculateSeasonalityStrength(values: number[], period: number): number {
    if (values.length < period * 2) return 0;

    const decomposition = this.seasonalDecomposition(values, period);
    const totalVariance = values.reduce((sum, v) => {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      return sum + Math.pow(v - mean, 2);
    }, 0);

    const seasonalVariance = decomposition.seasonal.reduce((sum, v) => sum + v * v, 0);

    return totalVariance > 0 ? seasonalVariance / totalVariance : 0;
  }

  private seasonalDecomposition(values: number[], period: number): SeasonalDecomposition {
    const n = values.length;

    // Calculate trend using moving average
    const trend: number[] = [];
    for (let i = 0; i < n; i++) {
      const windowStart = Math.max(0, i - Math.floor(period / 2));
      const windowEnd = Math.min(n, i + Math.ceil(period / 2));
      const window = values.slice(windowStart, windowEnd);
      trend.push(window.reduce((a, b) => a + b, 0) / window.length);
    }

    // Calculate seasonal component
    const seasonalAvg: number[] = new Array(period).fill(0);
    const seasonalCount: number[] = new Array(period).fill(0);

    for (let i = 0; i < n; i++) {
      const season = i % period;
      seasonalAvg[season] += values[i] - trend[i];
      seasonalCount[season]++;
    }

    for (let i = 0; i < period; i++) {
      if (seasonalCount[i] > 0) {
        seasonalAvg[i] /= seasonalCount[i];
      }
    }

    // Normalize seasonal component
    const seasonalMean = seasonalAvg.reduce((a, b) => a + b, 0) / period;
    const seasonal = seasonalAvg.map(v => v - seasonalMean);

    // Extend seasonal to match data length
    const seasonalExtended: number[] = [];
    for (let i = 0; i < n; i++) {
      seasonalExtended.push(seasonal[i % period]);
    }

    // Calculate residual
    const residual: number[] = [];
    for (let i = 0; i < n; i++) {
      residual.push(values[i] - trend[i] - seasonalExtended[i]);
    }

    // Calculate strength measures
    const residualVariance = residual.reduce((sum, v) => sum + v * v, 0) / n;
    const trendVariance = trend.reduce((sum, v) => {
      const trendMean = trend.reduce((a, b) => a + b, 0) / n;
      return sum + Math.pow(v - trendMean, 2);
    }, 0) / n;
    const seasonalVariance = seasonalExtended.reduce((sum, v) => sum + v * v, 0) / n;

    const strengthOfTrend = residualVariance > 0 ? 1 - residualVariance / (trendVariance + residualVariance) : 0;
    const strengthOfSeasonality = residualVariance > 0 ? 1 - residualVariance / (seasonalVariance + residualVariance) : 0;

    return {
      trend,
      seasonal: seasonalExtended,
      residual,
      seasonalPeriod: period,
      strengthOfTrend,
      strengthOfSeasonality,
    };
  }

  private linearRegression(x: number[], y: number[]): { slope: number; intercept: number; rSquared: number } {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // R-squared
    const meanY = sumY / n;
    const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0);
    const ssResidual = y.reduce((sum, yi, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(yi - predicted, 2);
    }, 0);
    const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

    return { slope, intercept, rSquared };
  }

  private calculateAutocorrelation(values: number[], maxLag: number): number[] {
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;

    const acf: number[] = [];
    for (let lag = 0; lag <= maxLag; lag++) {
      let sum = 0;
      for (let i = 0; i < n - lag; i++) {
        sum += (values[i] - mean) * (values[i + lag] - mean);
      }
      acf.push(variance > 0 ? sum / (n * variance) : 0);
    }

    return acf;
  }

  // -------------------------------------------------------------------------
  // Anomaly Result Helpers
  // -------------------------------------------------------------------------

  private createAnomalyResult(
    dataPoint: DataPoint | Date,
    anomalyType: AnomalyType,
    severity: AnomalySeverity,
    score: number,
    algorithm: DetectionAlgorithm,
    expectedRange: { min: number; max: number },
    deviation: number,
    description: string
  ): AnomalyResult {
    const timestamp = dataPoint instanceof Date ? dataPoint : dataPoint.timestamp;
    const deviceId = dataPoint instanceof Date ? '' : dataPoint.deviceId;
    const capabilityId = dataPoint instanceof Date ? '' : dataPoint.capabilityId;
    const value = dataPoint instanceof Date ? 0 : dataPoint.value;

    return {
      id: uuidv4(),
      timestamp,
      deviceId,
      capabilityId,
      value,
      anomalyType,
      severity,
      score,
      confidence: this.scoreToConfidence(score),
      algorithm,
      expectedRange,
      deviation,
      description,
      createdAt: new Date(),
    };
  }

  private storeAnomaly(anomaly: AnomalyResult): void {
    this.anomalies.set(anomaly.id, anomaly);

    // Trim anomalies if too many
    if (this.anomalies.size > this.config.maxAnomalies) {
      const sorted = Array.from(this.anomalies.values())
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const toDelete = sorted.slice(0, sorted.length - this.config.maxAnomalies);
      for (const a of toDelete) {
        this.anomalies.delete(a.id);
      }
    }
  }

  private createAlert(anomaly: AnomalyResult): AnomalyAlert {
    const alert: AnomalyAlert = {
      id: uuidv4(),
      anomalyId: anomaly.id,
      deviceId: anomaly.deviceId,
      capabilityId: anomaly.capabilityId,
      severity: anomaly.severity,
      message: `Anomaly detected: ${anomaly.description}`,
      score: anomaly.score,
      timestamp: new Date(),
      acknowledged: false,
      resolved: false,
      metadata: {
        algorithm: anomaly.algorithm,
        expectedRange: anomaly.expectedRange,
        deviation: anomaly.deviation,
      },
    };

    this.alerts.set(alert.id, alert);
    this.emit('alert:created', alert);

    return alert;
  }

  // -------------------------------------------------------------------------
  // Helper Methods
  // -------------------------------------------------------------------------

  private async getTrainingData(deviceId: string, capabilityId: string): Promise<DataPoint[]> {
    const key = `${deviceId}:${capabilityId}`;
    const buffer = this.dataBuffers.get(key) || [];

    if (buffer.length > 0) return buffer;

    if (this.dataCallback) {
      return this.dataCallback(deviceId, capabilityId, this.config.maxDataPoints);
    }

    return [];
  }

  private emptyStatistics(): ModelStatistics {
    return {
      mean: 0,
      stdDev: 0,
      variance: 0,
      min: 0,
      max: 0,
      median: 0,
      q1: 0,
      q3: 0,
      iqr: 0,
      mad: 0,
      skewness: 0,
      kurtosis: 0,
      sampleSize: 0,
      trendSlope: 0,
      trendIntercept: 0,
      seasonalityStrength: 0,
      autocorrelation: [],
    };
  }

  private zScoreToSeverity(zScore: number, threshold: number): AnomalySeverity {
    const ratio = zScore / threshold;
    if (ratio > 2) return AnomalySeverity.CRITICAL;
    if (ratio > 1.5) return AnomalySeverity.HIGH;
    if (ratio > 1.2) return AnomalySeverity.MEDIUM;
    return AnomalySeverity.LOW;
  }

  private scoreToSeverity(score: number): AnomalySeverity {
    if (score > 0.8) return AnomalySeverity.CRITICAL;
    if (score > 0.6) return AnomalySeverity.HIGH;
    if (score > 0.4) return AnomalySeverity.MEDIUM;
    return AnomalySeverity.LOW;
  }

  private severityToNumber(severity: AnomalySeverity): number {
    const map: Record<AnomalySeverity, number> = {
      [AnomalySeverity.LOW]: 1,
      [AnomalySeverity.MEDIUM]: 2,
      [AnomalySeverity.HIGH]: 3,
      [AnomalySeverity.CRITICAL]: 4,
    };
    return map[severity];
  }

  private scoreToConfidence(score: number): number {
    // Simple confidence model - higher score = higher confidence
    return Math.min(1, score * 1.2);
  }

  private cleanupOldData(): void {
    const maxAge = 30 * 24 * 3600 * 1000; // 30 days
    const cutoff = new Date(Date.now() - maxAge);

    // Cleanup anomalies
    for (const [id, anomaly] of this.anomalies) {
      if (anomaly.createdAt < cutoff) {
        this.anomalies.delete(id);
      }
    }

    // Cleanup alerts
    for (const [id, alert] of this.alerts) {
      if (alert.timestamp < cutoff) {
        this.alerts.delete(id);
      }
    }

    // Cleanup data buffers
    for (const [key, buffer] of this.dataBuffers) {
      const filtered = buffer.filter(p => p.timestamp >= cutoff);
      if (filtered.length === 0) {
        this.dataBuffers.delete(key);
      } else {
        this.dataBuffers.set(key, filtered);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Query Methods
  // -------------------------------------------------------------------------

  getAnomalies(options: {
    deviceId?: string;
    capabilityId?: string;
    severity?: AnomalySeverity;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
    offset?: number;
  } = {}): AnomalyResult[] {
    let results = Array.from(this.anomalies.values());

    if (options.deviceId) {
      results = results.filter(a => a.deviceId === options.deviceId);
    }
    if (options.capabilityId) {
      results = results.filter(a => a.capabilityId === options.capabilityId);
    }
    if (options.severity) {
      results = results.filter(a => a.severity === options.severity);
    }
    if (options.startTime) {
      results = results.filter(a => a.timestamp >= options.startTime!);
    }
    if (options.endTime) {
      results = results.filter(a => a.timestamp <= options.endTime!);
    }

    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const offset = options.offset || 0;
    const limit = options.limit || 50;
    return results.slice(offset, offset + limit);
  }

  getAlerts(options: {
    deviceId?: string;
    severity?: AnomalySeverity;
    acknowledged?: boolean;
    limit?: number;
  } = {}): AnomalyAlert[] {
    let results = Array.from(this.alerts.values());

    if (options.deviceId) {
      results = results.filter(a => a.deviceId === options.deviceId);
    }
    if (options.severity) {
      results = results.filter(a => a.severity === options.severity);
    }
    if (options.acknowledged !== undefined) {
      results = results.filter(a => a.acknowledged === options.acknowledged);
    }

    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return results.slice(0, options.limit || 50);
  }

  async acknowledgeAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    this.emit('alert:acknowledged', { alertId });
    return true;
  }

  async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.resolved = true;
    this.emit('alert:resolved', { alertId });
    return true;
  }

  getStatistics(): {
    totalModels: number;
    totalRules: number;
    totalAnomalies: number;
    totalAlerts: number;
    anomaliesBySeverity: Record<AnomalySeverity, number>;
    anomaliesByType: Record<AnomalyType, number>;
    anomaliesByAlgorithm: Record<DetectionAlgorithm, number>;
  } {
    const anomaliesBySeverity: Record<AnomalySeverity, number> = {
      [AnomalySeverity.LOW]: 0,
      [AnomalySeverity.MEDIUM]: 0,
      [AnomalySeverity.HIGH]: 0,
      [AnomalySeverity.CRITICAL]: 0,
    };
    const anomaliesByType: Record<AnomalyType, number> = {
      [AnomalyType.POINT]: 0,
      [AnomalyType.CONTEXTUAL]: 0,
      [AnomalyType.COLLECTIVE]: 0,
      [AnomalyType.PATTERN]: 0,
      [AnomalyType.TREND]: 0,
      [AnomalyType.SEASONAL]: 0,
    };
    const anomaliesByAlgorithm: Record<DetectionAlgorithm, number> = {} as any;

    for (const anomaly of this.anomalies.values()) {
      anomaliesBySeverity[anomaly.severity]++;
      anomaliesByType[anomaly.anomalyType]++;
      anomaliesByAlgorithm[anomaly.algorithm] = (anomaliesByAlgorithm[anomaly.algorithm] || 0) + 1;
    }

    return {
      totalModels: this.models.size,
      totalRules: this.rules.size,
      totalAnomalies: this.anomalies.size,
      totalAlerts: this.alerts.size,
      anomaliesBySeverity,
      anomaliesByType,
      anomaliesByAlgorithm,
    };
  }
}

// Singleton instance
let detectorInstance: AnomalyDetector | null = null;

export function getAnomalyDetector(): AnomalyDetector {
  if (!detectorInstance) {
    detectorInstance = new AnomalyDetector();
  }
  return detectorInstance;
}

export default AnomalyDetector;
