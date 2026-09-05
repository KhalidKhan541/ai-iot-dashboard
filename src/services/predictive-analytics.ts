// ── Types ────────────────────────────────────────────────────────────────────

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
}

export interface PredictionResult {
  timestamp: Date;
  predicted: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  model: string;
}

export interface ForecastResult {
  predictions: PredictionResult[];
  accuracy: number;
  model: string;
  trainingDataPoints: number;
  executionTimeMs: number;
}

export interface ModelMetrics {
  mae: number;
  rmse: number;
  mape: number;
  r2: number;
}

export interface PredictiveConfig {
  forecastHorizon: number;
  confidenceLevel: number;
  minTrainingPoints: number;
  seasonalityPeriod?: number;
  model: 'linear' | 'exponential' | 'arima' | 'prophet';
}

// ── Service ─────────────────────────────────────────────────────────────────

export class PredictiveAnalytics {
  private config: PredictiveConfig;
  private trainingData: Map<string, TimeSeriesData[]> = new Map();

  constructor(config?: Partial<PredictiveConfig>) {
    this.config = {
      forecastHorizon: config?.forecastHorizon ?? 24,
      confidenceLevel: config?.confidenceLevel ?? 0.95,
      minTrainingPoints: config?.minTrainingPoints ?? 10,
      seasonalityPeriod: config?.seasonalityPeriod,
      model: config?.model ?? 'linear',
    };
  }

  addTrainingData(key: string, data: TimeSeriesData[]): void {
    const existing = this.trainingData.get(key) || [];
    this.trainingData.set(key, [...existing, ...data].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    ));
  }

  forecast(key: string): ForecastResult | null {
    const data = this.trainingData.get(key);
    if (!data || data.length < this.config.minTrainingPoints) {
      return null;
    }

    const start = Date.now();
    let predictions: PredictionResult[];

    switch (this.config.model) {
      case 'linear':
        predictions = this.linearForecast(data);
        break;
      case 'exponential':
        predictions = this.exponentialForecast(data);
        break;
      case 'arima':
        predictions = this.arimaForecast(data);
        break;
      default:
        predictions = this.linearForecast(data);
    }

    const accuracy = this.calculateAccuracy(data, predictions);

    return {
      predictions,
      accuracy,
      model: this.config.model,
      trainingDataPoints: data.length,
      executionTimeMs: Date.now() - start,
    };
  }

  private linearForecast(data: TimeSeriesData[]): PredictionResult[] {
    const n = data.length;
    const values = data.map(d => d.value);
    const timestamps = data.map(d => d.timestamp.getTime());

    const xMean = timestamps.reduce((a, b) => a + b, 0) / n;
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (timestamps[i] - xMean) * (values[i] - yMean);
      den += Math.pow(timestamps[i] - xMean, 2);
    }

    const slope = den !== 0 ? num / den : 0;
    const intercept = yMean - slope * xMean;

    const residuals = values.map((v, i) => v - (slope * timestamps[i] + intercept));
    const mse = residuals.reduce((sum, r) => sum + r * r, 0) / n;
    const stdError = Math.sqrt(mse);

    const lastTimestamp = data[data.length - 1].timestamp.getTime();
    const interval = data.length > 1
      ? (lastTimestamp - data[0].timestamp.getTime()) / (n - 1)
      : 3600000;

    const predictions: PredictionResult[] = [];
    for (let i = 1; i <= this.config.forecastHorizon; i++) {
      const futureTime = new Date(lastTimestamp + interval * i);
      const predicted = slope * futureTime.getTime() + intercept;
      const zScore = this.getZScore();
      const margin = zScore * stdError * Math.sqrt(1 + i / n);

      predictions.push({
        timestamp: futureTime,
        predicted,
        lowerBound: predicted - margin,
        upperBound: predicted + margin,
        confidence: this.config.confidenceLevel,
        model: 'linear',
      });
    }

    return predictions;
  }

  private exponentialForecast(data: TimeSeriesData[]): PredictionResult[] {
    const values = data.map(d => d.value);
    const alpha = 0.3;
    let smoothed = values[0];

    for (let i = 1; i < values.length; i++) {
      smoothed = alpha * values[i] + (1 - alpha) * smoothed;
    }

    const trend = values.length > 1
      ? (values[values.length - 1] - values[0]) / (values.length - 1)
      : 0;

    const lastTimestamp = data[data.length - 1].timestamp.getTime();
    const interval = data.length > 1
      ? (lastTimestamp - data[0].timestamp.getTime()) / (data.length - 1)
      : 3600000;

    const residuals = values.map((v, i) => v - (smoothed + trend * (i - values.length + 1)));
    const mse = residuals.reduce((sum, r) => sum + r * r, 0) / values.length;
    const stdError = Math.sqrt(mse);

    const predictions: PredictionResult[] = [];
    for (let i = 1; i <= this.config.forecastHorizon; i++) {
      const futureTime = new Date(lastTimestamp + interval * i);
      const predicted = smoothed + trend * i;
      const zScore = this.getZScore();
      const margin = zScore * stdError * Math.sqrt(1 + i / values.length);

      predictions.push({
        timestamp: futureTime,
        predicted,
        lowerBound: predicted - margin,
        upperBound: predicted + margin,
        confidence: this.config.confidenceLevel,
        model: 'exponential',
      });
    }

    return predictions;
  }

  private arimaForecast(data: TimeSeriesData[]): PredictionResult[] {
    const values = data.map(d => d.value);
    const diff = this.difference(values, 1);
    const ma = this.movingAverage(diff, 3);
    const lastValue = values[values.length - 1];

    const lastTimestamp = data[data.length - 1].timestamp.getTime();
    const interval = data.length > 1
      ? (lastTimestamp - data[0].timestamp.getTime()) / (data.length - 1)
      : 3600000;

    const stdError = Math.sqrt(
      diff.reduce((sum, d) => sum + d * d, 0) / diff.length
    );

    const predictions: PredictionResult[] = [];
    let cumulative = lastValue;

    for (let i = 1; i <= this.config.forecastHorizon; i++) {
      const futureTime = new Date(lastTimestamp + interval * i);
      const maEffect = i <= ma.length ? ma[ma.length - i] : 0;
      cumulative += maEffect;
      const zScore = this.getZScore();
      const margin = zScore * stdError * Math.sqrt(i);

      predictions.push({
        timestamp: futureTime,
        predicted: cumulative,
        lowerBound: cumulative - margin,
        upperBound: cumulative + margin,
        confidence: this.config.confidenceLevel,
        model: 'arima',
      });
    }

    return predictions;
  }

  private difference(data: number[], order: number): number[] {
    let result = [...data];
    for (let o = 0; o < order; o++) {
      const diff: number[] = [];
      for (let i = 1; i < result.length; i++) {
        diff.push(result[i] - result[i - 1]);
      }
      result = diff;
    }
    return result;
  }

  private movingAverage(data: number[], window: number): number[] {
    const result: number[] = [];
    for (let i = window - 1; i < data.length; i++) {
      const slice = data.slice(i - window + 1, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / window);
    }
    return result;
  }

  private getZScore(): number {
    switch (this.config.confidenceLevel) {
      case 0.90: return 1.645;
      case 0.95: return 1.96;
      case 0.99: return 2.576;
      default: return 1.96;
    }
  }

  calculateAccuracy(actual: TimeSeriesData[], predicted: PredictionResult[]): number {
    if (actual.length === 0 || predicted.length === 0) return 0;

    const lastN = Math.min(predicted.length, actual.length);
    const actualValues = actual.slice(-lastN).map(d => d.value);
    const predictedValues = predicted.slice(0, lastN).map(p => p.predicted);

    const metrics = this.calculateMetrics(actualValues, predictedValues);
    return Math.max(0, Math.min(1, metrics.r2));
  }

  calculateMetrics(actual: number[], predicted: number[]): ModelMetrics {
    const n = actual.length;
    if (n === 0) return { mae: 0, rmse: 0, mape: 0, r2: 0 };

    let sumAbsError = 0;
    let sumSquaredError = 0;
    let sumPercentError = 0;
    let validPercentages = 0;

    const mean = actual.reduce((a, b) => a + b, 0) / n;
    let totalSumSquares = 0;

    for (let i = 0; i < n; i++) {
      const error = actual[i] - predicted[i];
      sumAbsError += Math.abs(error);
      sumSquaredError += error * error;
      totalSumSquares += Math.pow(actual[i] - mean, 2);

      if (actual[i] !== 0) {
        sumPercentError += Math.abs(error / actual[i]) * 100;
        validPercentages++;
      }
    }

    return {
      mae: sumAbsError / n,
      rmse: Math.sqrt(sumSquaredError / n),
      mape: validPercentages > 0 ? sumPercentError / validPercentages : 0,
      r2: totalSumSquares > 0 ? 1 - sumSquaredError / totalSumSquares : 0,
    };
  }

  predictSingle(data: TimeSeriesData[], stepsAhead: number): number {
    const values = data.map(d => d.value);
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const trend = n > 1 ? (values[n - 1] - values[0]) / (n - 1) : 0;
    return mean + trend * stepsAhead;
  }

  detectSeasonality(data: TimeSeriesData[]): number | null {
    if (data.length < 20) return null;
    const values = data.map(d => d.value);
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;

    let bestPeriod = -1;
    let bestCorrelation = 0;

    for (let period = 5; period <= n / 2; period++) {
      let correlation = 0;
      let count = 0;
      for (let i = 0; i < n - period; i++) {
        correlation += (values[i] - mean) * (values[i + period] - mean);
        count++;
      }
      if (count > 0) {
        correlation /= count;
        if (Math.abs(correlation) > bestCorrelation) {
          bestCorrelation = Math.abs(correlation);
          bestPeriod = period;
        }
      }
    }

    return bestCorrelation > 0.3 ? bestPeriod : null;
  }

  clear(): void {
    this.trainingData.clear();
  }
}
