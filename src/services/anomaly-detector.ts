// ── Types ────────────────────────────────────────────────────────────────────

export interface DataPoint {
  timestamp: Date;
  value: number;
}

export interface AnomalyResult {
  isAnomaly: boolean;
  score: number;
  confidence: number;
  type: 'point' | 'contextual' | 'collective';
  description: string;
  affectedMetrics: string[];
  suggestedAction?: string;
}

export interface AnomalyDetectionConfig {
  zScoreThreshold: number;
  iqrMultiplier: number;
  windowSize: number;
  minDataPoints: number;
  sensitivity: 'low' | 'medium' | 'high';
  enabledDetectors: string[];
}

export interface AnomalyPattern {
  id: string;
  type: string;
  frequency: number;
  lastSeen: Date;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

// ── Service ─────────────────────────────────────────────────────────────────

export class AnomalyDetector {
  private config: AnomalyDetectionConfig;
  private patterns: Map<string, AnomalyPattern> = new Map();

  constructor(config?: Partial<AnomalyDetectionConfig>) {
    this.config = {
      zScoreThreshold: config?.zScoreThreshold ?? 2.5,
      iqrMultiplier: config?.iqrMultiplier ?? 1.5,
      windowSize: config?.windowSize ?? 30,
      minDataPoints: config?.minDataPoints ?? 10,
      sensitivity: config?.sensitivity ?? 'medium',
      enabledDetectors: config?.enabledDetectors ?? ['zscore', 'iqr', 'moving_average', 'isolation'],
    };
  }

  detect(data: DataPoint[]): AnomalyResult[] {
    if (data.length < this.config.minDataPoints) {
      return data.map(() => ({
        isAnomaly: false,
        score: 0,
        confidence: 0,
        type: 'point' as const,
        description: 'Insufficient data',
        affectedMetrics: [],
      }));
    }

    const values = data.map(d => d.value);
    const results: AnomalyResult[] = [];

    for (let i = 0; i < data.length; i++) {
      const scores: number[] = [];

      if (this.config.enabledDetectors.includes('zscore')) {
        scores.push(this.zScoreDetection(values, i));
      }
      if (this.config.enabledDetectors.includes('iqr')) {
        scores.push(this.iqrDetection(values, i));
      }
      if (this.config.enabledDetectors.includes('moving_average')) {
        scores.push(this.movingAverageDetection(values, i));
      }
      if (this.config.enabledDetectors.includes('isolation')) {
        scores.push(this.isolationForestScore(values, i));
      }

      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const threshold = this.getThreshold();
      const isAnomaly = avgScore > threshold;

      results.push({
        isAnomaly,
        score: avgScore,
        confidence: this.calculateConfidence(avgScore, threshold),
        type: this.classifyAnomalyType(data, i),
        description: isAnomaly
          ? `Anomaly detected: value ${data[i].value} deviates significantly from expected range`
          : 'Normal data point',
        affectedMetrics: isAnomaly ? ['value'] : [],
        suggestedAction: isAnomaly ? this.suggestAction(data[i].value, values) : undefined,
      });

      if (isAnomaly) {
        this.recordPattern(data[i], avgScore);
      }
    }

    return results;
  }

  private zScoreDetection(values: number[], index: number): number {
    const windowStart = Math.max(0, index - this.config.windowSize);
    const window = values.slice(windowStart, index);
    if (window.length < 2) return 0;

    const mean = window.reduce((a, b) => a + b, 0) / window.length;
    const variance = window.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / window.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;
    return Math.abs((values[index] - mean) / stdDev) / this.config.zScoreThreshold;
  }

  private iqrDetection(values: number[], index: number): number {
    const windowStart = Math.max(0, index - this.config.windowSize);
    const window = [...values.slice(windowStart, index)].sort((a, b) => a - b);
    if (window.length < 4) return 0;

    const q1 = window[Math.floor(window.length * 0.25)];
    const q3 = window[Math.floor(window.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - this.config.iqrMultiplier * iqr;
    const upperBound = q3 + this.config.iqrMultiplier * iqr;

    const value = values[index];
    if (value < lowerBound) return Math.abs(value - lowerBound) / (iqr || 1);
    if (value > upperBound) return Math.abs(value - upperBound) / (iqr || 1);
    return 0;
  }

  private movingAverageDetection(values: number[], index: number): number {
    const windowSize = Math.min(this.config.windowSize, index);
    if (windowSize < 2) return 0;

    const window = values.slice(index - windowSize, index);
    const ma = window.reduce((a, b) => a + b, 0) / window.length;
    const variance = window.reduce((sum, v) => sum + Math.pow(v - ma, 2), 0) / window.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;
    return Math.abs(values[index] - ma) / stdDev;
  }

  private isolationForestScore(values: number[], index: number): number {
    if (index < 2) return 0;
    const value = values[index];
    const prev = values[index - 1];
    const next = index < values.length - 1 ? values[index + 1] : value;

    const neighbors = [prev, next];
    const distances = neighbors.map(n => Math.abs(value - n));
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    const allDistances: number[] = [];

    for (let i = 1; i < values.length; i++) {
      allDistances.push(Math.abs(values[i] - values[i - 1]));
    }

    const sortedDistances = [...allDistances].sort((a, b) => a - b);
    const median = sortedDistances[Math.floor(sortedDistances.length / 2)];
    return median > 0 ? avgDistance / median : 0;
  }

  private getThreshold(): number {
    switch (this.config.sensitivity) {
      case 'low': return 1.5;
      case 'medium': return 1.0;
      case 'high': return 0.6;
    }
  }

  private calculateConfidence(score: number, threshold: number): number {
    if (score <= threshold) return 0;
    return Math.min(1, (score - threshold) / threshold);
  }

  private classifyAnomalyType(
    data: DataPoint[],
    index: number
  ): 'point' | 'contextual' | 'collective' {
    if (index === 0 || index === data.length - 1) return 'point';
    const prev = data[index - 1].value;
    const curr = data[index].value;
    const next = data[index + 1].value;
    const isLocalExtreme = (curr > prev && curr > next) || (curr < prev && curr < next);
    return isLocalExtreme ? 'contextual' : 'collective';
  }

  private suggestAction(value: number, historicalValues: number[]): string {
    const mean = historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length;
    if (value > mean) {
      return 'Investigate potential overheating or overload condition';
    }
    return 'Check for sensor malfunction or disconnection';
  }

  private recordPattern(dataPoint: DataPoint, score: number): void {
    const hour = dataPoint.timestamp.getHours();
    const patternKey = `hour_${hour}`;
    const existing = this.patterns.get(patternKey);

    if (existing) {
      existing.frequency++;
      existing.lastSeen = dataPoint.timestamp;
      existing.severity = score > 2 ? 'high' : score > 1 ? 'medium' : 'low';
    } else {
      this.patterns.set(patternKey, {
        id: crypto.randomUUID(),
        type: 'temporal',
        frequency: 1,
        lastSeen: dataPoint.timestamp,
        description: `Anomaly pattern at hour ${hour}`,
        severity: score > 2 ? 'high' : score > 1 ? 'medium' : 'low',
      });
    }
  }

  getPatterns(): AnomalyPattern[] {
    return Array.from(this.patterns.values());
  }

  getTrend(data: DataPoint[]): { slope: number; direction: 'up' | 'down' | 'stable' } {
    if (data.length < 2) return { slope: 0, direction: 'stable' };

    const n = data.length;
    const xMean = (n - 1) / 2;
    const yMean = data.reduce((sum, d) => sum + d.value, 0) / n;

    let num = 0;
    let den = 0;
    data.forEach((d, i) => {
      num += (i - xMean) * (d.value - yMean);
      den += Math.pow(i - xMean, 2);
    });

    const slope = den !== 0 ? num / den : 0;
    const direction = Math.abs(slope) < 0.01 ? 'stable' : slope > 0 ? 'up' : 'down';

    return { slope, direction };
  }

  clear(): void {
    this.patterns.clear();
  }
}
