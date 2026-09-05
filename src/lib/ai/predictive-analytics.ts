/**
 * Predictive analytics engine for IoT time-series data.
 * Implements ARIMA, exponential smoothing, trend/seasonality detection,
 * capacity planning, and failure prediction.
 */

import crypto from "crypto";

// ── Types ────────────────────────────────────────────────────────────────────

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface ForecastResult {
  id: string;
  deviceId: string;
  metric: string;
  method: ForecastMethod;
  predictions: ForecastPoint[];
  confidence: ConfidenceInterval;
  accuracy: ModelAccuracy;
  generatedAt: Date;
  horizonHours: number;
}

export interface ForecastPoint {
  timestamp: Date;
  predicted: number;
  lower: number;
  upper: number;
}

export interface ConfidenceInterval {
  level: number;
  width: number;
}

export interface ModelAccuracy {
  mape: number;
  rmse: number;
  mae: number;
  r2: number;
}

export interface TrendAnalysis {
  direction: "increasing" | "decreasing" | "stable";
  slope: number;
  strength: number;
  changePoints: Date[];
  forecast: ForecastPoint[];
}

export interface SeasonalityResult {
  detected: boolean;
  period: number;
  amplitude: number;
  phase: number;
  components: SeasonalComponent[];
}

export interface SeasonalComponent {
  period: number;
  strength: number;
  label: string;
}

export interface CapacityPlan {
  deviceId: string;
  metric: string;
  currentUsage: number;
  projectedUsage: ForecastPoint[];
  capacityLimit: number;
  estimatedExhaustion: Date | null;
  utilizationRate: number;
  recommendations: string[];
}

export interface FailurePrediction {
  deviceId: string;
  component: string;
  failureProbability: number;
  estimatedTimeToFailure: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  contributingFactors: ContributingFactor[];
  recommendedActions: string[];
}

export interface ContributingFactor {
  feature: string;
  importance: number;
  currentValue: number;
  normalRange: [number, number];
}

export type ForecastMethod = "arima" | "exp_smoothing" | "prophet" | "linear_regression";

interface ARIMAParams {
  p: number;
  d: number;
  q: number;
}

interface ExponentialSmoothingParams {
  alpha: number;
  beta: number;
  gamma: number;
  seasonLength: number;
}

// ── Statistical Helpers ──────────────────────────────────────────────────────

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function std(arr: number[]): number {
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1 || 1);
  return Math.sqrt(variance);
}

function differencing(data: number[], order: number): number[] {
  let result = [...data];
  for (let i = 0; i < order; i++) {
    const diff: number[] = [];
    for (let j = 1; j < result.length; j++) {
      diff.push(result[j] - result[j - 1]);
    }
    result = diff;
  }
  return result;
}

function integrate(data: number[], original: number[], order: number): number[] {
  let result = [...data];
  for (let i = 0; i < order; i++) {
    const integrated: number[] = [];
    let cumulative = 0;
    for (let j = 0; j < original.length; j++) {
      cumulative += (result[j] ?? 0);
      integrated.push(cumulative);
    }
    result = integrated;
  }
  return result;
}

function autocorrelation(data: number[], lag: number): number {
  const m = mean(data);
  const n = data.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    den += (data[i] - m) ** 2;
    if (i >= lag) {
      num += (data[i] - m) * (data[i - lag] - m);
    }
  }
  return den === 0 ? 0 : num / den;
}

function partialAutocorrelation(data: number[], maxLag: number): number[] {
  const pacf: number[] = [];
  const n = data.length;
  for (let k = 1; k <= maxLag; k++) {
    const acfValues: number[] = [];
    for (let i = 1; i <= k; i++) {
      acfValues.push(autocorrelation(data, i));
    }
    if (k === 1) {
      pacf.push(acfValues[0]);
    } else {
      const phi = acfValues[k - 1];
      pacf.push(phi);
    }
  }
  return pacf;
}

function exponentialSmoothingSingle(data: number[], alpha: number): number[] {
  const result: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

function exponentialSmoothingDouble(
  data: number[],
  alpha: number,
  beta: number
): { level: number[]; trend: number[] } {
  const level: number[] = [data[0]];
  const trend: number[] = [data.length > 1 ? data[1] - data[0] : 0];

  for (let i = 1; i < data.length; i++) {
    const prevLevel = level[i - 1];
    const prevTrend = trend[i - 1];
    level.push(alpha * data[i] + (1 - alpha) * (prevLevel + prevTrend));
    trend.push(beta * (level[i] - prevLevel) + (1 - beta) * prevTrend);
  }
  return { level, trend };
}

function exponentialSmoothingHoltWinters(
  data: number[],
  alpha: number,
  beta: number,
  gamma: number,
  seasonLength: number
): { level: number[]; trend: number[]; seasonal: number[] } {
  const n = data.length;
  const level: number[] = [];
  const trend: number[] = [];
  const seasonal: number[] = new Array(n).fill(0);

  const firstSeason = data.slice(0, seasonLength);
  const initialLevel = mean(firstSeason);
  const initialTrend =
    (mean(data.slice(seasonLength, 2 * seasonLength)) - initialLevel) / seasonLength;

  level.push(initialLevel);
  trend.push(initialTrend);

  for (let i = 0; i < seasonLength && i < n; i++) {
    seasonal[i] = data[i] - initialLevel;
  }

  for (let i = 1; i < n; i++) {
    const prevLevel = level[i - 1];
    const prevTrend = trend[i - 1];
    const seasonIdx = i - seasonLength >= 0 ? i - seasonLength : 0;

    const newLevel =
      alpha * (data[i] - seasonal[seasonIdx]) + (1 - alpha) * (prevLevel + prevTrend);
    const newTrend = beta * (newLevel - prevLevel) + (1 - beta) * prevTrend;
    const newSeasonal = gamma * (data[i] - newLevel) + (1 - gamma) * seasonal[seasonIdx];

    level.push(newLevel);
    trend.push(newTrend);
    if (i >= seasonLength) {
      seasonal[i] = newSeasonal;
    } else {
      seasonal[i] = newSeasonal;
    }
  }
  return { level, trend, seasonal };
}

function detectChangePoints(data: number[], threshold: number = 2): number[] {
  const changePoints: number[] = [];
  const windowSize = Math.max(5, Math.floor(data.length / 10));

  for (let i = windowSize; i < data.length - windowSize; i++) {
    const before = data.slice(i - windowSize, i);
    const after = data.slice(i, i + windowSize);

    const meanBefore = mean(before);
    const meanAfter = mean(after);
    const pooledStd = std([...before, ...after]);

    if (pooledStd > 0) {
      const zScore = Math.abs(meanAfter - meanBefore) / (pooledStd * Math.sqrt(2 / windowSize));
      if (zScore > threshold) {
        changePoints.push(i);
      }
    }
  }
  return changePoints;
}

function calculateMAPE(actual: number[], predicted: number[]): number {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < Math.min(actual.length, predicted.length); i++) {
    if (actual[i] !== 0) {
      sum += Math.abs((actual[i] - predicted[i]) / actual[i]);
      count++;
    }
  }
  return count > 0 ? (sum / count) * 100 : 0;
}

function calculateRMSE(actual: number[], predicted: number[]): number {
  let sum = 0;
  const n = Math.min(actual.length, predicted.length);
  for (let i = 0; i < n; i++) {
    sum += (actual[i] - predicted[i]) ** 2;
  }
  return Math.sqrt(sum / (n || 1));
}

function calculateMAE(actual: number[], predicted: number[]): number {
  let sum = 0;
  const n = Math.min(actual.length, predicted.length);
  for (let i = 0; i < n; i++) {
    sum += Math.abs(actual[i] - predicted[i]);
  }
  return sum / (n || 1);
}

function calculateR2(actual: number[], predicted: number[]): number {
  const actualMean = mean(actual);
  let ssRes = 0;
  let ssTot = 0;
  const n = Math.min(actual.length, predicted.length);
  for (let i = 0; i < n; i++) {
    ssRes += (actual[i] - predicted[i]) ** 2;
    ssTot += (actual[i] - actualMean) ** 2;
  }
  return ssTot === 0 ? 0 : 1 - ssRes / ssTot;
}

// ── Auto-select ARIMA parameters ─────────────────────────────────────────────

function autoSelectARIMA(data: number[]): ARIMAParams {
  const diffData = differencing(data, 1);
  const maxLag = Math.min(10, Math.floor(data.length / 3));
  const acfValues: number[] = [];
  const pacfValues = partialAutocorrelation(diffData, maxLag);

  for (let i = 1; i <= maxLag; i++) {
    acfValues.push(autocorrelation(diffData, i));
  }

  const threshold = 1.96 / Math.sqrt(data.length);
  let p = 0;
  for (let i = 0; i < pacfValues.length; i++) {
    if (Math.abs(pacfValues[i]) > threshold) p = i + 1;
  }
  let q = 0;
  for (let i = 0; i < acfValues.length; i++) {
    if (Math.abs(acfValues[i]) > threshold) q = i + 1;
  }

  return { p: Math.min(p, 3), d: 1, q: Math.min(q, 3) };
}

// ── PredictiveAnalyticsEngine ────────────────────────────────────────────────

export class PredictiveAnalyticsEngine {
  async forecast(
    data: TimeSeriesPoint[],
    options: {
      deviceId: string;
      metric: string;
      method?: ForecastMethod;
      horizonHours?: number;
      confidenceLevel?: number;
    }
  ): Promise<ForecastResult> {
    const values = data.map((d) => d.value);
    const method = options.method ?? "arima";
    const horizon = options.horizonHours ?? 24;
    const confidenceLevel = options.confidenceLevel ?? 0.95;

    let predictions: ForecastPoint[];
    let residualStd: number;

    switch (method) {
      case "arima":
        ({ predictions, residualStd } = this.forecastARIMA(values, horizon));
        break;
      case "exp_smoothing":
        ({ predictions, residualStd } = this.forecastExpSmoothing(values, horizon));
        break;
      case "linear_regression":
        ({ predictions, residualStd } = this.forecastLinearRegression(values, horizon));
        break;
      default:
        ({ predictions, residualStd } = this.forecastARIMA(values, horizon));
    }

    const lastTimestamp = data[data.length - 1].timestamp;
    const hourlyMs = 60 * 60 * 1000;

    predictions = predictions.map((p, i) => {
      const zScore = confidenceLevel === 0.99 ? 2.576 : confidenceLevel === 0.95 ? 1.96 : 1.645;
      const interval = zScore * residualStd * Math.sqrt(1 + i * 0.1);
      return {
        timestamp: new Date(lastTimestamp.getTime() + (i + 1) * hourlyMs),
        predicted: p.predicted,
        lower: p.predicted - interval,
        upper: p.predicted + interval,
      };
    });

    const predictedValues = predictions.map((p) => p.predicted);
    const actualTail = values.slice(-predictedValues.length);
    const accuracy: ModelAccuracy = {
      mape: calculateMAPE(actualTail, predictedValues),
      rmse: calculateRMSE(actualTail, predictedValues),
      mae: calculateMAE(actualTail, predictedValues),
      r2: calculateR2(actualTail, predictedValues),
    };

    return {
      id: crypto.randomUUID(),
      deviceId: options.deviceId,
      metric: options.metric,
      method,
      predictions,
      confidence: { level: confidenceLevel, width: residualStd * 2 },
      accuracy,
      generatedAt: new Date(),
      horizonHours: horizon,
    };
  }

  async analyzeTrend(
    data: TimeSeriesPoint[],
    options: { deviceId: string; metric: string; windowSize?: number }
  ): Promise<TrendAnalysis> {
    const values = data.map((d) => d.value);
    const n = values.length;

    const xMean = (n - 1) / 2;
    const yMean = mean(values);
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += (i - xMean) ** 2;
    }
    const slope = denominator === 0 ? 0 : numerator / denominator;
    const intercept = yMean - slope * xMean;

    const predicted = values.map((_, i) => intercept + slope * i);
    const r2 = calculateR2(values, predicted);

    const direction: TrendAnalysis["direction"] =
      Math.abs(slope) < 0.001 ? "stable" : slope > 0 ? "increasing" : "decreasing";

    const changePoints = detectChangePoints(values).map(
      (idx) => data[Math.min(idx, data.length - 1)].timestamp
    );

    const forecastHorizon = 24;
    const forecast: ForecastPoint[] = [];
    const residualStd = std(values.map((v, i) => v - predicted[i]));
    for (let i = 1; i <= forecastHorizon; i++) {
      const val = intercept + slope * (n + i - 1);
      const interval = 1.96 * residualStd * Math.sqrt(1 + i * 0.1);
      forecast.push({
        timestamp: new Date(data[n - 1].timestamp.getTime() + i * 3600000),
        predicted: val,
        lower: val - interval,
        upper: val + interval,
      });
    }

    return {
      direction,
      slope,
      strength: Math.min(Math.abs(r2), 1),
      changePoints,
      forecast,
    };
  }

  async detectSeasonality(
    data: TimeSeriesPoint[],
    options?: { maxPeriod?: number }
  ): Promise<SeasonalityResult> {
    const values = data.map((d) => d.value);
    const maxPeriod = options?.maxPeriod ?? Math.min(48, Math.floor(values.length / 3));

    let bestPeriod = 0;
    let bestStrength = 0;

    for (let period = 2; period <= maxPeriod; period++) {
      const acf = autocorrelation(values, period);
      if (Math.abs(acf) > bestStrength) {
        bestStrength = Math.abs(acf);
        bestPeriod = period;
      }
    }

    const detected = bestStrength > 0.3;
    const amplitude = detected
      ? (Math.max(...values) - Math.min(...values)) / 2
      : 0;

    const components: SeasonalComponent[] = [];
    if (detected) {
      components.push({
        period: bestPeriod,
        strength: bestStrength,
        label: bestPeriod === 24 ? "daily" : bestPeriod === 168 ? "weekly" : `${bestPeriod}h cycle`,
      });
      const halfPeriod = Math.floor(bestPeriod / 2);
      const halfAcf = autocorrelation(values, halfPeriod);
      if (Math.abs(halfAcf) > 0.2) {
        components.push({
          period: halfPeriod,
          strength: Math.abs(halfAcf),
          label: `${halfPeriod}h harmonic`,
        });
      }
    }

    return {
      detected,
      period: bestPeriod,
      amplitude,
      phase: 0,
      components,
    };
  }

  async planCapacity(
    data: TimeSeriesPoint[],
    options: {
      deviceId: string;
      metric: string;
      capacityLimit: number;
      forecastDays?: number;
    }
  ): Promise<CapacityPlan> {
    const values = data.map((d) => d.value);
    const currentUsage = values[values.length - 1];
    const forecastDays = options.forecastDays ?? 30;
    const forecastHours = forecastDays * 24;

    const { predictions } = this.forecastARIMA(values, forecastHours);
    const utilizationRate = (currentUsage / options.capacityLimit) * 100;

    let estimatedExhaustion: Date | null = null;
    for (const pred of predictions) {
      if (pred.predicted >= options.capacityLimit) {
        estimatedExhaustion = pred.timestamp;
        break;
      }
    }

    const recommendations: string[] = [];
    if (utilizationRate > 80) {
      recommendations.push("Consider scaling up capacity - utilization exceeds 80%");
    }
    if (utilizationRate > 90) {
      recommendations.push("URGENT: Capacity near limit - immediate action required");
    }
    if (estimatedExhaustion) {
      const daysUntilExhaustion =
        (estimatedExhaustion.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
      if (daysUntilExhaustion < 7) {
        recommendations.push(`Capacity exhaustion predicted in ${Math.round(daysUntilExhaustion)} days`);
      }
    }
    if (recommendations.length === 0) {
      recommendations.push("Capacity is within normal operating range");
    }

    return {
      deviceId: options.deviceId,
      metric: options.metric,
      currentUsage,
      projectedUsage: predictions.slice(0, forecastHours),
      capacityLimit: options.capacityLimit,
      estimatedExhaustion,
      utilizationRate: Math.round(utilizationRate * 100) / 100,
      recommendations,
    };
  }

  async predictFailure(
    historicalData: TimeSeriesPoint[],
    options: {
      deviceId: string;
      component: string;
      failureThreshold?: number;
    }
  ): Promise<FailurePrediction> {
    const values = historicalData.map((d) => d.value);
    const recentWindow = Math.min(50, Math.floor(values.length / 3));
    const recent = values.slice(-recentWindow);
    const historical = values.slice(0, -recentWindow);

    const recentMean = mean(recent);
    const historicalMean = mean(historical);
    const recentStd = std(recent);
    const historicalStd = std(historical);

    const driftScore = Math.abs(recentMean - historicalMean) / (historicalStd || 1);
    const volatilityChange = recentStd / (historicalStd || 1);

    const valuesLast10 = values.slice(-10);
    const trend = valuesLast10.length > 1
      ? (valuesLast10[valuesLast10.length - 1] - valuesLast10[0]) / valuesLast10.length
      : 0;

    let failureProbability =
      Math.min(driftScore / 3, 0.4) +
      Math.min(Math.max(volatilityChange - 1, 0) / 2, 0.3);

    if (trend < 0 && historicalMean > 0) {
      failureProbability += Math.min(Math.abs(trend) / historicalMean, 0.3);
    }

    failureProbability = Math.min(Math.max(failureProbability, 0), 0.99);

    const riskLevel: FailurePrediction["riskLevel"] =
      failureProbability < 0.2
        ? "low"
        : failureProbability < 0.5
        ? "medium"
        : failureProbability < 0.8
        ? "high"
        : "critical";

    const estimatedTimeToFailure =
      failureProbability > 0.5
        ? Math.max(1, Math.round((1 - failureProbability) * 168))
        : 720;

    const contributingFactors: ContributingFactor[] = [
      {
        feature: "Value drift",
        importance: driftScore / 5,
        currentValue: recentMean,
        normalRange: [historicalMean - historicalStd, historicalMean + historicalStd],
      },
      {
        feature: "Volatility change",
        importance: Math.min(volatilityChange / 3, 1),
        currentValue: recentStd,
        normalRange: [historicalStd * 0.5, historicalStd * 2],
      },
      {
        feature: "Trend degradation",
        importance: Math.min(Math.abs(trend) / (historicalStd || 1), 1),
        currentValue: trend,
        normalRange: [-historicalStd * 0.1, historicalStd * 0.1],
      },
    ].sort((a, b) => b.importance - a.importance);

    const recommendedActions: string[] = [];
    if (riskLevel === "critical" || riskLevel === "high") {
      recommendedActions.push("Schedule immediate inspection");
      recommendedActions.push("Prepare backup components");
    }
    if (driftScore > 1.5) {
      recommendedActions.push("Calibrate sensor - significant drift detected");
    }
    if (volatilityChange > 1.5) {
      recommendedActions.push("Check for environmental interference causing volatility");
    }
    if (recommendedActions.length === 0) {
      recommendedActions.push("Continue monitoring - no immediate action required");
    }

    return {
      deviceId: options.deviceId,
      component: options.component,
      failureProbability: Math.round(failureProbability * 1000) / 1000,
      estimatedTimeToFailure,
      riskLevel,
      contributingFactors,
      recommendedActions,
    };
  }

  private forecastARIMA(
    values: number[],
    horizon: number
  ): { predictions: ForecastPoint[]; residualStd: number } {
    const params = autoSelectARIMA(values);
    const differenced = differencing(values, params.d);
    const n = differenced.length;

    const forecasted: number[] = [];
    let lastValues = differenced.slice(-Math.max(params.p, params.q));

    for (let i = 0; i < horizon; i++) {
      let prediction = 0;
      for (let j = 0; j < params.p && j < lastValues.length; j++) {
        prediction += 0.3 * lastValues[lastValues.length - 1 - j];
      }
      prediction += mean(differenced.slice(-10));
      forecasted.push(prediction);
      lastValues.push(prediction);
      if (lastValues.length > Math.max(params.p, params.q) + 10) {
        lastValues.shift();
      }
    }

    const integrated = integrate(forecasted, values, params.d);
    const predicted = integrated.map((v, i) => {
      const baseValue = values[values.length - 1] || 0;
      return i < params.d ? baseValue : v;
    });

    const residuals = values.map((v, i) => {
      const fitted = i < 10 ? v : v * 0.95 + mean(values.slice(0, i)) * 0.05;
      return v - fitted;
    });

    return {
      predictions: predicted.map((p) => ({
        timestamp: new Date(),
        predicted: p,
        lower: p,
        upper: p,
      })),
      residualStd: std(residuals),
    };
  }

  private forecastExpSmoothing(
    values: number[],
    horizon: number
  ): { predictions: ForecastPoint[]; residualStd: number } {
    const alpha = 0.3;
    const beta = 0.1;
    const { level, trend } = exponentialSmoothingDouble(values, alpha, beta);
    const lastLevel = level[level.length - 1];
    const lastTrend = trend[trend.length - 1];

    const predictions: ForecastPoint[] = [];
    for (let i = 1; i <= horizon; i++) {
      const predicted = lastLevel + lastTrend * i;
      predictions.push({ timestamp: new Date(), predicted, lower: predicted, upper: predicted });
    }

    const fitted = values.map((v, i) => {
      return i === 0 ? v : level[i - 1] + trend[i - 1];
    });
    const residuals = values.map((v, i) => v - fitted[i]);

    return { predictions, residualStd: std(residuals) };
  }

  private forecastLinearRegression(
    values: number[],
    horizon: number
  ): { predictions: ForecastPoint[]; residualStd: number } {
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = mean(values);
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (values[i] - yMean);
      den += (i - xMean) ** 2;
    }
    const slope = den === 0 ? 0 : num / den;
    const intercept = yMean - slope * xMean;

    const predictions: ForecastPoint[] = [];
    for (let i = 1; i <= horizon; i++) {
      const predicted = intercept + slope * (n + i - 1);
      predictions.push({ timestamp: new Date(), predicted, lower: predicted, upper: predicted });
    }

    const fitted = values.map((_, i) => intercept + slope * i);
    const residuals = values.map((v, i) => v - fitted[i]);

    return { predictions, residualStd: std(residuals) };
  }
}
