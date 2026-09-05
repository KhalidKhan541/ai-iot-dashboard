/**
 * AI-powered anomaly intelligence engine.
 * Pattern recognition, root cause analysis, correlation analysis,
 * anomaly clustering, and impact assessment for IoT data streams.
 */

import crypto from "crypto";

// ── Types ────────────────────────────────────────────────────────────────────

export interface DataPoint {
  timestamp: Date;
  deviceId: string;
  metric: string;
  value: number;
  tags?: Record<string, string>;
}

export interface Anomaly {
  id: string;
  timestamp: Date;
  deviceId: string;
  metric: string;
  value: number;
  expectedRange: [number, number];
  severity: AnomalySeverity;
  score: number;
  type: AnomalyType;
  patternId?: string;
  rootCauses?: RootCause[];
  correlations?: Correlation[];
  clusterId?: string;
  impact?: ImpactAssessment;
}

export type AnomalySeverity = "info" | "warning" | "critical" | "emergency";
export type AnomalyType =
  | "point"
  | "contextual"
  | "collective"
  | "pattern_shift"
  | "seasonal_deviation"
  | "threshold_breach";

export interface RootCause {
  factor: string;
  confidence: number;
  description: string;
  evidence: string[];
  suggestedAction: string;
}

export interface Correlation {
  sourceDevice: string;
  sourceMetric: string;
  targetDevice: string;
  targetMetric: string;
  correlationCoefficient: number;
  lagMs: number;
  significance: number;
  relationship: "leads" | "lags" | "synchronous" | "inverse";
}

export interface AnomalyCluster {
  id: string;
  anomalies: Anomaly[];
  centroid: { timestamp: number; score: number };
  pattern: string;
  description: string;
  commonFactors: string[];
  frequency: number;
}

export interface ImpactAssessment {
  severity: AnomalySeverity;
  affectedDevices: number;
  affectedMetrics: string[];
  estimatedDowntimeMinutes: number;
  estimatedCostUsd: number;
  cascadingRisk: number;
  businessImpact: string;
}

export interface PatternSignature {
  id: string;
  name: string;
  description: string;
  conditions: PatternCondition[];
  typicalDuration: number;
  severity: AnomalySeverity;
}

export interface PatternCondition {
  metric: string;
  operator: "gt" | "lt" | "eq" | "between" | "rate_of_change";
  value: number | [number, number];
  duration?: number;
}

// ── Z-Score & IQR Helpers ───────────────────────────────────────────────────

function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;
}

function std(arr: number[]): number {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1 || 1));
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function iqrBounds(arr: number[]): [number, number] {
  const sorted = [...arr].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  return [q1 - 1.5 * iqr, q3 + 1.5 * iqr];
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const mx = mean(x.slice(0, n));
  const my = mean(y.slice(0, n));
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

function crossCorrelation(x: number[], y: number[], maxLag: number): { lag: number; corr: number }[] {
  const results: { lag: number; corr: number }[] = [];
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    const shiftedX = lag >= 0 ? x.slice(lag) : x.slice(0, x.length + lag);
    const shiftedY = lag >= 0 ? y.slice(0, y.length - lag) : y.slice(-lag);
    const corr = pearsonCorrelation(shiftedX, shiftedY);
    results.push({ lag, corr });
  }
  return results;
}

// ── Pattern Signatures ───────────────────────────────────────────────────────

const BUILTIN_PATTERNS: PatternSignature[] = [
  {
    id: "spike",
    name: "Value Spike",
    description: "Sudden sharp increase in metric value",
    conditions: [{ metric: "*", operator: "rate_of_change", value: 3, duration: 1 }],
    typicalDuration: 5,
    severity: "warning",
  },
  {
    id: "drop",
    name: "Value Drop",
    description: "Sudden sharp decrease in metric value",
    conditions: [{ metric: "*", operator: "rate_of_change", value: -3, duration: 1 }],
    typicalDuration: 5,
    severity: "warning",
  },
  {
    id: "flatline",
    name: "Flatline",
    description: "Metric stuck at constant value for extended period",
    conditions: [{ metric: "*", operator: "between", value: [-0.01, 0.01], duration: 10 }],
    typicalDuration: 30,
    severity: "critical",
  },
  {
    id: "drift",
    name: "Gradual Drift",
    description: "Metric gradually drifting away from normal range",
    conditions: [{ metric: "*", operator: "rate_of_change", value: 0.5, duration: 20 }],
    typicalDuration: 60,
    severity: "info",
  },
  {
    id: "oscillation",
    name: "Oscillation",
    description: "Metric oscillating between high and low values",
    conditions: [{ metric: "*", operator: "rate_of_change", value: 2, duration: 5 }],
    typicalDuration: 15,
    severity: "warning",
  },
];

// ── AnomalyIntelligenceEngine ────────────────────────────────────────────────

export class AnomalyIntelligenceEngine {
  private patterns: PatternSignature[];
  private anomalyHistory: Anomaly[] = [];

  constructor(patterns?: PatternSignature[]) {
    this.patterns = patterns ?? BUILTIN_PATTERNS;
  }

  async detectAnomalies(
    data: DataPoint[],
    options?: { sensitivity?: number; windowSize?: number; deviceId?: string }
  ): Promise<Anomaly[]> {
    const sensitivity = options?.sensitivity ?? 2.0;
    const windowSize = options?.windowSize ?? 50;
    const anomalies: Anomaly[] = [];

    const byMetric = new Map<string, DataPoint[]>();
    for (const point of data) {
      const key = `${point.deviceId}:${point.metric}`;
      if (!byMetric.has(key)) byMetric.set(key, []);
      byMetric.get(key)!.push(point);
    }

    for (const [key, points] of byMetric) {
      const [deviceId, metric] = key.split(":");
      const values = points.map((p) => p.value);

      const globalMean = mean(values);
      const globalStd = std(values);
      const [iqrLow, iqrHigh] = iqrBounds(values);

      for (let i = 0; i < points.length; i++) {
        const zScore = globalStd > 0 ? Math.abs(points[i].value - globalMean) / globalStd : 0;
        const isIqrOutlier = points[i].value < iqrLow || points[i].value > iqrHigh;
        const isZScoreOutlier = zScore > sensitivity;

        if (isIqrOutlier || isZScoreOutlier) {
          const windowStart = Math.max(0, i - windowSize);
          const localValues = values.slice(windowStart, i);
          const localMean = localValues.length > 0 ? mean(localValues) : globalMean;
          const localStd = localValues.length > 0 ? std(localValues) : globalStd;

          const expectedRange: [number, number] = [
            localMean - sensitivity * localStd,
            localMean + sensitivity * localStd,
          ];

          const severity = this.classifySeverity(zScore, points[i].value, globalMean, globalStd);
          const type = this.classifyAnomalyType(points, i, localMean, localStd);
          const score = Math.min(zScore / 5, 1);

          const anomaly: Anomaly = {
            id: crypto.randomUUID(),
            timestamp: points[i].timestamp,
            deviceId,
            metric,
            value: points[i].value,
            expectedRange,
            severity,
            score,
            type,
          };

          const matchedPattern = this.matchPattern(points, i);
          if (matchedPattern) {
            anomaly.patternId = matchedPattern.id;
          }

          anomalies.push(anomaly);
        }
      }
    }

    this.anomalyHistory.push(...anomalies);
    return anomalies;
  }

  async analyzeRootCause(
    anomalies: Anomaly[],
    contextData: DataPoint[],
    options?: { maxDepth?: number }
  ): Promise<Map<string, RootCause[]>> {
    const maxDepth = options?.maxDepth ?? 3;
    const results = new Map<string, RootCause[]>();

    for (const anomaly of anomalies) {
      const rootCauses: RootCause[] = [];

      const relatedData = contextData.filter(
        (d) =>
          d.deviceId === anomaly.deviceId ||
          d.metric === anomaly.metric
      );

      const timeWindow = 60 * 60 * 1000;
      const nearbyData = relatedData.filter(
        (d) =>
          Math.abs(d.timestamp.getTime() - anomaly.timestamp.getTime()) < timeWindow
      );

      const byMetric = new Map<string, DataPoint[]>();
      for (const point of nearbyData) {
        if (!byMetric.has(point.metric)) byMetric.set(point.metric, []);
        byMetric.get(point.metric)!.push(point);
      }

      for (const [metric, points] of byMetric) {
        if (metric === anomaly.metric) continue;

        const values = points.map((p) => p.value);
        const metricMean = mean(values);
        const metricStd = std(values);
        const deviation = metricStd > 0 ? Math.abs(anomaly.value - metricMean) / metricStd : 0;

        if (deviation > 1.5) {
          rootCauses.push({
            factor: `${metric} anomaly`,
            confidence: Math.min(deviation / 5, 0.95),
            description: `${metric} shows unusual behavior (z-score: ${deviation.toFixed(2)}) around the time of the anomaly`,
            evidence: [
              `Mean: ${metricMean.toFixed(2)}, Anomaly value: ${anomaly.value.toFixed(2)}`,
              `Deviation: ${deviation.toFixed(2)} standard deviations`,
            ],
            suggestedAction: `Investigate ${metric} readings for potential causal relationship`,
          });
        }
      }

      const timeSeriesAnomalies = anomalies.filter(
        (a) =>
          a.deviceId === anomaly.deviceId &&
          a.metric === anomaly.metric &&
          a.id !== anomaly.id
      );

      if (timeSeriesAnomalies.length > 0) {
        const recentSimilar = timeSeriesAnomalies.filter(
          (a) =>
            Math.abs(a.timestamp.getTime() - anomaly.timestamp.getTime()) < 24 * 60 * 60 * 1000
        );

        if (recentSimilar.length >= 2) {
          rootCauses.push({
            factor: "Recurring pattern",
            confidence: 0.7,
            description: `${recentSimilar.length} similar anomalies detected in the last 24 hours`,
            evidence: recentSimilar.map(
              (a) =>
                `${a.timestamp.toISOString()}: ${a.value.toFixed(2)} (score: ${a.score.toFixed(2)})`
            ),
            suggestedAction: "Investigate systemic issue - recurring anomalies suggest a persistent problem",
          });
        }
      }

      results.set(anomaly.id, rootCauses);
    }

    return results;
  }

  async analyzeCorrelations(
    data: DataPoint[],
    options?: { minCorrelation?: number; maxLagMinutes?: number }
  ): Promise<Correlation[]> {
    const minCorrelation = options?.minCorrelation ?? 0.6;
    const maxLagMinutes = options?.maxLagMinutes ?? 60;

    const seriesMap = new Map<string, { timestamps: number[]; values: number[] }>();
    for (const point of data) {
      const key = `${point.deviceId}:${point.metric}`;
      if (!seriesMap.has(key)) {
        seriesMap.set(key, { timestamps: [], values: [] });
      }
      const series = seriesMap.get(key)!;
      series.timestamps.push(point.timestamp.getTime());
      series.values.push(point.value);
    }

    const correlations: Correlation[] = [];
    const keys = Array.from(seriesMap.keys());

    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const [sourceDevice, sourceMetric] = keys[i].split(":");
        const [targetDevice, targetMetric] = keys[j].split(":");

        const sourceData = seriesMap.get(keys[i])!;
        const targetData = seriesMap.get(keys[j])!;

        const alignedSource: number[] = [];
        const alignedTarget: number[] = [];

        const targetTimestamps = new Map<number, number>();
        targetData.timestamps.forEach((t, idx) => targetTimestamps.set(t, idx));

        for (let k = 0; k < sourceData.timestamps.length; k++) {
          const t = sourceData.timestamps[k];
          const tolerance = 5 * 60 * 1000;
          for (const [targetT, targetIdx] of targetTimestamps) {
            if (Math.abs(t - targetT) < tolerance) {
              alignedSource.push(sourceData.values[k]);
              alignedTarget.push(targetData.values[targetIdx]);
              break;
            }
          }
        }

        if (alignedSource.length < 10) continue;

        const directCorr = pearsonCorrelation(alignedSource, alignedTarget);
        if (Math.abs(directCorr) >= minCorrelation) {
          correlations.push({
            sourceDevice,
            sourceMetric,
            targetDevice,
            targetMetric,
            correlationCoefficient: directCorr,
            lagMs: 0,
            significance: Math.abs(directCorr),
            relationship: "synchronous",
          });
        }

        const maxLagPoints = Math.floor(maxLagMinutes / 5);
        const crossCorrs = crossCorrelation(alignedSource, alignedTarget, maxLagPoints);

        for (const cc of crossCorrs) {
          if (cc.lag !== 0 && Math.abs(cc.corr) >= minCorrelation) {
            const relationship: Correlation["relationship"] =
              cc.corr < 0
                ? "inverse"
                : cc.lag > 0
                ? "leads"
                : "lags";

            correlations.push({
              sourceDevice,
              sourceMetric,
              targetDevice,
              targetMetric,
              correlationCoefficient: cc.corr,
              lagMs: cc.lag * 5 * 60 * 1000,
              significance: Math.abs(cc.corr),
              relationship,
            });
          }
        }
      }
    }

    return correlations.sort((a, b) => b.significance - a.significance);
  }

  async clusterAnomalies(
    anomalies: Anomaly[],
    options?: { maxClusters?: number; minClusterSize?: number }
  ): Promise<AnomalyCluster[]> {
    const maxClusters = options?.maxClusters ?? 10;
    const minClusterSize = options?.minClusterSize ?? 2;

    if (anomalies.length < minClusterSize) return [];

    const features = anomalies.map((a) => [
      a.timestamp.getTime() / (24 * 60 * 60 * 1000),
      a.score,
      a.severity === "emergency" ? 4 : a.severity === "critical" ? 3 : a.severity === "warning" ? 2 : 1,
    ]);

    const nClusters = Math.min(maxClusters, Math.floor(anomalies.length / minClusterSize));
    const assignments = this.kMeans(features, nClusters);

    const clusterMap = new Map<number, Anomaly[]>();
    for (let i = 0; i < anomalies.length; i++) {
      const clusterId = assignments[i];
      if (!clusterMap.has(clusterId)) clusterMap.set(clusterId, []);
      clusterMap.get(clusterId)!.push(anomalies[i]);
    }

    const clusters: AnomalyCluster[] = [];
    for (const [clusterId, clusterAnomalies] of clusterMap) {
      if (clusterAnomalies.length < minClusterSize) continue;

      const centroidTimestamp = mean(clusterAnomalies.map((a) => a.timestamp.getTime()));
      const centroidScore = mean(clusterAnomalies.map((a) => a.score));

      const metrics = [...new Set(clusterAnomalies.map((a) => a.metric))];
      const devices = [...new Set(clusterAnomalies.map((a) => a.deviceId))];
      const severities = clusterAnomalies.map((a) => a.severity);
      const mostCommonSeverity = this.mode(severities);

      const avgTimeDiff =
        clusterAnomalies.length > 1
          ? mean(
              clusterAnomalies.slice(1).map(
                (a, i) =>
                  (a.timestamp.getTime() - clusterAnomalies[i].timestamp.getTime()) /
                  (60 * 60 * 1000)
              )
            )
          : 0;

      clusters.push({
        id: crypto.randomUUID(),
        anomalies: clusterAnomalies,
        centroid: { timestamp: centroidTimestamp, score: centroidScore },
        pattern: `${metrics.join(", ")} on ${devices.length} device(s)`,
        description: `${clusterAnomalies.length} anomalies with ${mostCommonSeverity} severity, ~${avgTimeDiff.toFixed(1)}h apart`,
        commonFactors: [...metrics, ...devices],
        frequency: clusterAnomalies.length,
      });
    }

    return clusters.sort((a, b) => b.frequency - a.frequency);
  }

  async assessImpact(
    anomalies: Anomaly[],
    deviceInventory: { deviceId: string; metrics: string[]; criticality: string }[]
  ): Promise<Map<string, ImpactAssessment>> {
    const results = new Map<string, ImpactAssessment>();

    for (const anomaly of anomalies) {
      const affectedDevices = new Set<string>();
      const affectedMetrics = new Set<string>();

      affectedDevices.add(anomaly.deviceId);
      affectedMetrics.add(anomaly.metric);

      const correlated = anomaly.correlations ?? [];
      for (const corr of correlated) {
        affectedDevices.add(corr.targetDevice);
        affectedMetrics.add(corr.targetMetric);
      }

      const deviceCriticality = deviceInventory.find(
        (d) => d.deviceId === anomaly.deviceId
      )?.criticality ?? "low";

      const criticalityMultiplier =
        deviceCriticality === "critical" ? 3 :
        deviceCriticality === "high" ? 2 :
        deviceCriticality === "medium" ? 1.5 : 1;

      const estimatedDowntimeMinutes =
        anomaly.severity === "emergency" ? 60 * criticalityMultiplier :
        anomaly.severity === "critical" ? 30 * criticalityMultiplier :
        anomaly.severity === "warning" ? 10 * criticalityMultiplier : 0;

      const estimatedCostUsd =
        anomaly.severity === "emergency" ? 5000 * criticalityMultiplier :
        anomaly.severity === "critical" ? 1000 * criticalityMultiplier :
        anomaly.severity === "warning" ? 200 * criticalityMultiplier : 0;

      const cascadingRisk = Math.min(
        (affectedDevices.size / Math.max(deviceInventory.length, 1)) * anomaly.score,
        1
      );

      let businessImpact: string;
      if (anomaly.severity === "emergency") {
        businessImpact = "Critical system failure risk - immediate intervention required";
      } else if (anomaly.severity === "critical") {
        businessImpact = "Significant operational impact - prioritize resolution";
      } else if (anomaly.severity === "warning") {
        businessImpact = "Moderate impact - schedule investigation";
      } else {
        businessImpact = "Minimal business impact - monitor for escalation";
      }

      results.set(anomaly.id, {
        severity: anomaly.severity,
        affectedDevices: affectedDevices.size,
        affectedMetrics: Array.from(affectedMetrics),
        estimatedDowntimeMinutes,
        estimatedCostUsd,
        cascadingRisk,
        businessImpact,
      });
    }

    return results;
  }

  private classifySeverity(
    zScore: number,
    value: number,
    globalMean: number,
    globalStd: number
  ): AnomalySeverity {
    if (zScore > 4 || Math.abs(value - globalMean) > 5 * globalStd) return "emergency";
    if (zScore > 3) return "critical";
    if (zScore > 2.5) return "warning";
    return "info";
  }

  private classifyAnomalyType(
    points: DataPoint[],
    index: number,
    localMean: number,
    localStd: number
  ): AnomalyType {
    const windowSize = Math.min(10, index);
    if (windowSize < 3) return "point";

    const recentValues = points.slice(index - windowSize, index + 1).map((p) => p.value);
    const diffs = recentValues.slice(1).map((v, i) => v - recentValues[i]);
    const diffMean = mean(diffs);
    const diffStd = std(diffs);

    if (diffStd > 0 && Math.abs(diffs[diffs.length - 1] - diffMean) > 2 * diffStd) {
      return "point";
    }

    const isFlat = recentValues.every(
      (v) => Math.abs(v - recentValues[0]) < 0.01 * Math.abs(recentValues[0] || 1)
    );
    if (isFlat && windowSize >= 5) return "collective";

    const deviationFromLocal =
      localStd > 0 ? Math.abs(points[index].value - localMean) / localStd : 0;
    if (deviationFromLocal > 2) return "contextual";

    return "point";
  }

  private matchPattern(points: DataPoint[], index: number): PatternSignature | null {
    const windowSize = Math.min(20, index);
    if (windowSize < 3) return null;

    const recentValues = points.slice(index - windowSize, index + 1).map((p) => p.value);
    const diffs = recentValues.slice(1).map((v, i) => v - recentValues[i]);
    const rateOfChange = diffs.length > 0 ? diffs[diffs.length - 1] / (Math.abs(mean(recentValues)) || 1) : 0;

    for (const pattern of this.patterns) {
      for (const condition of pattern.conditions) {
        if (condition.operator === "rate_of_change") {
          const threshold = condition.value as number;
          if (Math.abs(rateOfChange) > Math.abs(threshold)) {
            return pattern;
          }
        }
      }
    }
    return null;
  }

  private kMeans(features: number[][], k: number): number[] {
    const n = features.length;
    const dim = features[0].length;
    const assignments = new Array(n).fill(0);

    let centroids: number[][] = [];
    const indices = new Set<number>();
    while (indices.size < k && indices.size < n) {
      indices.add(Math.floor(Math.random() * n));
    }
    for (const idx of indices) {
      centroids.push([...features[idx]]);
    }

    for (let iter = 0; iter < 50; iter++) {
      let changed = false;
      for (let i = 0; i < n; i++) {
        let minDist = Infinity;
        let bestCluster = 0;
        for (let c = 0; c < centroids.length; c++) {
          let dist = 0;
          for (let d = 0; d < dim; d++) {
            dist += (features[i][d] - centroids[c][d]) ** 2;
          }
          if (dist < minDist) {
            minDist = dist;
            bestCluster = c;
          }
        }
        if (assignments[i] !== bestCluster) {
          assignments[i] = bestCluster;
          changed = true;
        }
      }

      if (!changed) break;

      const sums = centroids.map(() => new Array(dim).fill(0));
      const counts = new Array(centroids.length).fill(0);
      for (let i = 0; i < n; i++) {
        counts[assignments[i]]++;
        for (let d = 0; d < dim; d++) {
          sums[assignments[i]][d] += features[i][d];
        }
      }
      for (let c = 0; c < centroids.length; c++) {
        if (counts[c] > 0) {
          for (let d = 0; d < dim; d++) {
            centroids[c][d] = sums[c][d] / counts[c];
          }
        }
      }
    }

    return assignments;
  }

  private mode(arr: string[]): string {
    const counts = new Map<string, number>();
    for (const v of arr) {
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    let best = arr[0];
    let bestCount = 0;
    for (const [val, count] of counts) {
      if (count > bestCount) {
        best = val;
        bestCount = count;
      }
    }
    return best;
  }
}
