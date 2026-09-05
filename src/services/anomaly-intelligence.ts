// ── Types ────────────────────────────────────────────────────────────────────

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
}

export interface IntelligenceInsight {
  id: string;
  type: 'anomaly_pattern' | 'correlation' | 'trend_change' | 'forecast_alert' | 'optimization';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  affectedDevices: string[];
  affectedMetrics: string[];
  recommendation: string;
  evidence: EvidenceItem[];
  createdAt: Date;
  validUntil: Date;
}

export interface EvidenceItem {
  type: 'statistical' | 'historical' | 'comparative';
  description: string;
  value: number;
  reference?: number;
}

export interface CorrelationResult {
  metric1: string;
  metric2: string;
  coefficient: number;
  pValue: number;
  significant: boolean;
  lag?: number;
}

export interface TrendChange {
  timestamp: Date;
  metric: string;
  previousTrend: 'up' | 'down' | 'stable';
  currentTrend: 'up' | 'down' | 'stable';
  magnitude: number;
  significance: number;
}

export interface AnomalyIntelligenceConfig {
  analysisWindowMs: number;
  correlationThreshold: number;
  trendChangeThreshold: number;
  maxInsights: number;
  insightRetentionMs: number;
}

// ── Service ─────────────────────────────────────────────────────────────────

export class AnomalyIntelligence {
  private insights: Map<string, IntelligenceInsight> = new Map();
  private config: AnomalyIntelligenceConfig;

  constructor(config?: Partial<AnomalyIntelligenceConfig>) {
    this.config = {
      analysisWindowMs: config?.analysisWindowMs ?? 24 * 60 * 60 * 1000,
      correlationThreshold: config?.correlationThreshold ?? 0.7,
      trendChangeThreshold: config?.trendChangeThreshold ?? 0.1,
      maxInsights: config?.maxInsights ?? 100,
      insightRetentionMs: config?.insightRetentionMs ?? 7 * 24 * 60 * 60 * 1000,
    };
  }

  analyzeCorrelations(
    metrics: Map<string, TimeSeriesData[]>
  ): CorrelationResult[] {
    const results: CorrelationResult[] = [];
    const metricNames = Array.from(metrics.keys());

    for (let i = 0; i < metricNames.length; i++) {
      for (let j = i + 1; j < metricNames.length; j++) {
        const data1 = metrics.get(metricNames[i]) || [];
        const data2 = metrics.get(metricNames[j]) || [];

        const aligned = this.alignTimeSeries(data1, data2);
        if (aligned.length < 10) continue;

        const { coefficient, pValue } = this.pearsonCorrelation(
          aligned.map(a => a[0]),
          aligned.map(a => a[1])
        );

        results.push({
          metric1: metricNames[i],
          metric2: metricNames[j],
          coefficient,
          pValue,
          significant: Math.abs(coefficient) > this.config.correlationThreshold && pValue < 0.05,
        });
      }
    }

    return results;
  }

  detectTrendChanges(
    data: TimeSeriesData[],
    metric: string
  ): TrendChange[] {
    if (data.length < 20) return [];

    const changes: TrendChange[] = [];
    const windowSize = Math.floor(data.length / 4);

    for (let i = windowSize; i < data.length - windowSize; i += windowSize) {
      const before = data.slice(i - windowSize, i);
      const after = data.slice(i, i + windowSize);

      const trendBefore = this.calculateTrend(before);
      const trendAfter = this.calculateTrend(after);

      const magnitude = Math.abs(trendAfter - trendBefore);
      if (magnitude > this.config.trendChangeThreshold) {
        changes.push({
          timestamp: data[i].timestamp,
          metric,
          previousTrend: this.trendToDirection(trendBefore),
          currentTrend: this.trendToDirection(trendAfter),
          magnitude,
          significance: Math.min(1, magnitude / (this.config.trendChangeThreshold * 2)),
        });
      }
    }

    return changes;
  }

  private alignTimeSeries(
    data1: TimeSeriesData[],
    data2: TimeSeriesData[]
  ): [number, number][] {
    const map2 = new Map<number, number>();
    data2.forEach(d => map2.set(d.timestamp.getTime(), d.value));

    const aligned: [number, number][] = [];
    data1.forEach(d1 => {
      const value2 = map2.get(d1.timestamp.getTime());
      if (value2 !== undefined) {
        aligned.push([d1.value, value2]);
      }
    });

    return aligned;
  }

  private pearsonCorrelation(
    x: number[],
    y: number[]
  ): { coefficient: number; pValue: number } {
    const n = x.length;
    if (n < 3) return { coefficient: 0, pValue: 1 };

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);
    const sumY2 = y.reduce((a, b) => a + b * b, 0);

    const num = n * sumXY - sumX * sumY;
    const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    const coefficient = den !== 0 ? num / den : 0;

    const t = coefficient * Math.sqrt((n - 2) / (1 - coefficient * coefficient));
    const pValue = this.tDistPValue(Math.abs(t), n - 2);

    return { coefficient, pValue };
  }

  private tDistPValue(t: number, df: number): number {
    const x = df / (df + t * t);
    return Math.max(0, Math.min(1, 1 - 0.5 * this.incompleteBeta(df / 2, 0.5, x)));
  }

  private incompleteBeta(a: number, b: number, x: number): number {
    if (x === 0) return 0;
    if (x === 1) return 1;

    const maxIterations = 100;
    const epsilon = 1e-10;
    let result = 0;
    let term = 1;

    for (let n = 0; n < maxIterations; n++) {
      if (n > 0) {
        term *= (a + n - 1) * x / (a + b + n - 1);
      }
      result += term / (a + n);
      if (Math.abs(term / (a + n)) < epsilon) break;
    }

    return result * Math.exp(
      a * Math.log(x) + b * Math.log(1 - x) - this.logBeta(a, b)
    );
  }

  private logBeta(a: number, b: number): number {
    return this.logGamma(a) + this.logGamma(b) - this.logGamma(a + b);
  }

  private logGamma(x: number): number {
    const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
      -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    let y = x;
    let tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let sum = 1.000000000190015;
    for (let j = 0; j < 6; j++) {
      sum += c[j] / ++y;
    }
    return -tmp + Math.log(2.5066282746310005 * sum / x);
  }

  private calculateTrend(data: TimeSeriesData[]): number {
    if (data.length < 2) return 0;
    const n = data.length;
    const values = data.map(d => d.value);
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const xMean = (n - 1) / 2;

    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (values[i] - mean);
      den += Math.pow(i - xMean, 2);
    }

    return den !== 0 ? num / den / mean : 0;
  }

  private trendToDirection(trend: number): 'up' | 'down' | 'stable' {
    if (Math.abs(trend) < 0.01) return 'stable';
    return trend > 0 ? 'up' : 'down';
  }

  generateInsights(
    correlations: CorrelationResult[],
    trendChanges: TrendChange[],
    anomalies: { timestamp: Date; severity: string }[]
  ): IntelligenceInsight[] {
    const insights: IntelligenceInsight[] = [];
    const now = new Date();

    correlations.filter(c => c.significant).forEach(c => {
      insights.push({
        id: crypto.randomUUID(),
        type: 'correlation',
        title: `Strong correlation detected between ${c.metric1} and ${c.metric2}`,
        description: `Correlation coefficient: ${c.coefficient.toFixed(3)} (p=${c.pValue.toFixed(4)})`,
        severity: Math.abs(c.coefficient) > 0.9 ? 'high' : 'medium',
        confidence: 1 - c.pValue,
        affectedDevices: [],
        affectedMetrics: [c.metric1, c.metric2],
        recommendation: 'Consider monitoring these metrics together for predictive insights',
        evidence: [{
          type: 'statistical',
          description: 'Pearson correlation coefficient',
          value: c.coefficient,
          reference: this.config.correlationThreshold,
        }],
        createdAt: now,
        validUntil: new Date(now.getTime() + this.config.insightRetentionMs),
      });
    });

    trendChanges.forEach(tc => {
      insights.push({
        id: crypto.randomUUID(),
        type: 'trend_change',
        title: `Trend change in ${tc.metric}`,
        description: `Changed from ${tc.previousTrend} to ${tc.currentTrend}`,
        severity: tc.significance > 0.8 ? 'high' : 'medium',
        confidence: tc.significance,
        affectedDevices: [],
        affectedMetrics: [tc.metric],
        recommendation: 'Investigate potential root cause of trend change',
        evidence: [{
          type: 'historical',
          description: `Previous trend: ${tc.previousTrend}, Current: ${tc.currentTrend}`,
          value: tc.magnitude,
        }],
        createdAt: now,
        validUntil: new Date(now.getTime() + this.config.insightRetentionMs),
      });
    });

    if (anomalies.length > 5) {
      const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
      insights.push({
        id: crypto.randomUUID(),
        type: 'anomaly_pattern',
        title: `Elevated anomaly activity detected`,
        description: `${anomalies.length} anomalies detected in the analysis window`,
        severity: criticalCount > 2 ? 'critical' : 'high',
        confidence: Math.min(1, anomalies.length / 10),
        affectedDevices: [],
        affectedMetrics: [],
        recommendation: 'Review system health and check for cascading failures',
        evidence: [{
          type: 'statistical',
          description: 'Anomaly count in window',
          value: anomalies.length,
        }],
        createdAt: now,
        validUntil: new Date(now.getTime() + this.config.insightRetentionMs),
      });
    }

    this.cleanupInsights();
    insights.forEach(i => this.insights.set(i.id, i));

    return insights.slice(0, this.config.maxInsights);
  }

  private cleanupInsights(): void {
    const now = Date.now();
    this.insights.forEach((insight, id) => {
      if (now > insight.validUntil.getTime()) {
        this.insights.delete(id);
      }
    });
  }

  getInsights(): IntelligenceInsight[] {
    return Array.from(this.insights.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  getInsightById(id: string): IntelligenceInsight | undefined {
    return this.insights.get(id);
  }

  clear(): void {
    this.insights.clear();
  }
}
