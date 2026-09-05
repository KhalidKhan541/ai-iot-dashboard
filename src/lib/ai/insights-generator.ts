/**
 * AI insights generator for IoT dashboards.
 * Auto-generates insights from device data, trend highlights,
 * anomaly explanations, recommendation engine, and summary reports.
 */

import crypto from "crypto";
import { AIClient, getAIClient } from "./provider";

// ── Types ────────────────────────────────────────────────────────────────────

export interface Insight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  summary: string;
  details: string;
  source: InsightSource;
  metrics: InsightMetric[];
  recommendations: string[];
  confidence: number;
  generatedAt: Date;
  expiresAt: Date;
  tags: string[];
  metadata?: Record<string, unknown>;
}

export type InsightType =
  | "trend"
  | "anomaly"
  | "forecast"
  | "performance"
  | "energy"
  | "maintenance"
  | "security"
  | "cost"
  | "comparison"
  | "correlation";

export type InsightSeverity = "info" | "positive" | "warning" | "critical";

export interface InsightSource {
  deviceId?: string;
  metric?: string;
  timeRange?: { start: Date; end: Date };
  algorithm?: string;
}

export interface InsightMetric {
  name: string;
  value: number;
  unit?: string;
  change?: number;
  changePercent?: number;
  benchmark?: number;
}

export interface TrendHighlight {
  id: string;
  metric: string;
  deviceId: string;
  direction: "up" | "down" | "stable";
  magnitude: number;
  period: string;
  significance: number;
  description: string;
  sparkline: number[];
}

export interface AnomalyExplanation {
  id: string;
  anomalyId: string;
  explanation: string;
  rootCause: string;
  impact: string;
  recommendations: string[];
  relatedMetrics: { metric: string; change: number }[];
  contextWindow: { start: Date; end: Date };
}

export interface Recommendation {
  id: string;
  category: "performance" | "cost" | "reliability" | "energy" | "security";
  priority: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  rationale: string;
  expectedBenefit: string;
  estimatedImpactUsd?: number;
  implementationSteps: string[];
  prerequisites: string[];
  relatedInsights: string[];
}

export interface SummaryReport {
  id: string;
  title: string;
  period: { start: Date; end: Date };
  generatedAt: Date;
  executiveSummary: string;
  sections: ReportSection[];
  keyMetrics: InsightMetric[];
  topInsights: Insight[];
  actionItems: string[];
  overallHealth: "excellent" | "good" | "fair" | "poor" | "critical";
  healthScore: number;
}

export interface ReportSection {
  title: string;
  content: string;
  metrics: InsightMetric[];
  insights: Insight[];
  charts: { type: string; title: string; data: Record<string, unknown> }[];
}

export interface InsightContext {
  devices: DeviceSummary[];
  timeRange: { start: Date; end: Date };
  previousTimeRange?: { start: Date; end: Date };
  alerts?: AlertSummary[];
  budget?: { monthlyUsd: number; currentSpendUsd: number };
}

export interface DeviceSummary {
  deviceId: string;
  type: string;
  status: string;
  location: string;
  metrics: { name: string; current: number; previous?: number; unit: string }[];
  uptime: number;
  errorRate: number;
}

export interface AlertSummary {
  id: string;
  severity: string;
  count: number;
  topDevice: string;
  metric: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;
}

function trendDirection(values: number[]): "up" | "down" | "stable" {
  if (values.length < 2) return "stable";
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
  const normalizedSlope = yMean !== 0 ? slope / Math.abs(yMean) : slope;
  if (normalizedSlope > 0.01) return "up";
  if (normalizedSlope < -0.01) return "down";
  return "stable";
}

function changePercent(current: number, previous: number): number {
  return previous === 0 ? 0 : ((current - previous) / Math.abs(previous)) * 100;
}

// ── InsightsGenerator ────────────────────────────────────────────────────────

export class InsightsGenerator {
  private aiClient: AIClient;
  private insightCache: Map<string, Insight[]> = new Map();

  constructor(aiClient?: AIClient) {
    this.aiClient = aiClient ?? getAIClient();
  }

  async generateInsights(context: InsightContext): Promise<Insight[]> {
    const insights: Insight[] = [];

    insights.push(...this.analyzeDeviceHealth(context));
    insights.push(...this.analyzeTrends(context));
    insights.push(...this.analyzePerformance(context));
    insights.push(...this.analyzeEnergy(context));
    insights.push(...this.analyzeCosts(context));
    insights.push(...this.analyzeComparisons(context));

    const cacheKey = `insights:${context.timeRange.start.toISOString()}:${context.timeRange.end.toISOString()}`;
    this.insightCache.set(cacheKey, insights);

    return insights.sort((a, b) => {
      const sevOrder: Record<string, number> = { critical: 0, warning: 1, positive: 2, info: 3 };
      return (sevOrder[a.severity] ?? 4) - (sevOrder[b.severity] ?? 4);
    });
  }

  async generateInsightsWithAI(
    context: InsightContext,
    data: { deviceId: string; metric: string; values: number[]; timestamps: Date[] }[]
  ): Promise<Insight[]> {
    const dataSummary = data
      .map(
        (d) =>
          `${d.deviceId}/${d.metric}: current=${d.values[d.values.length - 1]?.toFixed(2)}, avg=${mean(d.values).toFixed(2)}, min=${Math.min(...d.values).toFixed(2)}, max=${Math.max(...d.values).toFixed(2)}`
      )
      .join("\n");

    const response = await this.aiClient.chat([
      {
        role: "system",
        content: `You are an IoT analytics expert. Generate insights from device data.
Output ONLY a JSON array of insights matching this schema:
[{
  "type": "trend"|"anomaly"|"performance"|"energy"|"cost"|"comparison",
  "severity": "info"|"positive"|"warning"|"critical",
  "title": "...",
  "summary": "...",
  "details": "...",
  "metrics": [{"name": "...", "value": number, "unit": "..."}],
  "recommendations": ["..."],
  "confidence": 0-1,
  "tags": ["..."]
}]
Focus on actionable insights. Max 10 insights.`,
      },
      {
        role: "user",
        content: `Time range: ${context.timeRange.start.toISOString()} to ${context.timeRange.end.toISOString()}
Devices: ${context.devices.map((d) => `${d.deviceId} (${d.type}, ${d.status})`).join(", ")}
Data:\n${dataSummary}`,
      },
    ]);

    try {
      const parsed = JSON.parse(response) as Omit<Insight, "id" | "generatedAt" | "expiresAt" | "source">[];
      return parsed.map((item) => ({
        id: crypto.randomUUID(),
        type: item.type,
        severity: item.severity,
        title: item.title,
        summary: item.summary,
        details: item.details,
        source: { timeRange: context.timeRange },
        metrics: item.metrics ?? [],
        recommendations: item.recommendations ?? [],
        confidence: item.confidence ?? 0.7,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 6 * 3600000),
        tags: item.tags ?? [],
      }));
    } catch {
      return this.generateInsights(context);
    }
  }

  highlightTrends(
    deviceId: string,
    metric: string,
    values: number[],
    timestamps: Date[]
  ): TrendHighlight[] {
    const highlights: TrendHighlight[] = [];
    if (values.length < 5) return highlights;

    const direction = trendDirection(values);
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    const firstMean = mean(firstHalf);
    const secondMean = mean(secondHalf);
    const magnitude = firstMean !== 0 ? Math.abs(secondMean - firstMean) / Math.abs(firstMean) : 0;

    if (magnitude > 0.05) {
      highlights.push({
        id: crypto.randomUUID(),
        metric,
        deviceId,
        direction,
        magnitude: magnitude * 100,
        period: `${timestamps.length} data points`,
        significance: Math.min(magnitude * 5, 1),
        description: `${metric} is ${direction === "up" ? "increasing" : direction === "down" ? "decreasing" : "stable"} by ${(magnitude * 100).toFixed(1)}% on average`,
        sparkline: values.slice(-20),
      });
    }

    const rollingWindow = 5;
    for (let i = rollingWindow; i < values.length; i++) {
      const window = values.slice(i - rollingWindow, i);
      const windowMean = mean(window);
      const deviation = windowMean > 0 ? Math.abs(values[i] - windowMean) / windowMean : 0;
      if (deviation > 0.3) {
        highlights.push({
          id: crypto.randomUUID(),
          metric,
          deviceId,
          direction: values[i] > windowMean ? "up" : "down",
          magnitude: deviation * 100,
          period: `point at index ${i}`,
          significance: Math.min(deviation, 1),
          description: `Significant deviation detected: ${values[i].toFixed(2)} vs rolling avg ${windowMean.toFixed(2)}`,
          sparkline: values.slice(Math.max(0, i - 10), i + 1),
        });
      }
    }

    return highlights;
  }

  explainAnomaly(
    anomaly: {
      timestamp: Date;
      value: number;
      expectedRange: [number, number];
      metric: string;
      deviceId: string;
    },
    contextMetrics: { metric: string; values: number[]; timestamps: Date[] }[]
  ): AnomalyExplanation {
    const deviation = anomaly.expectedRange[1] - anomaly.expectedRange[0];
    const severity = Math.abs(anomaly.value - (anomaly.expectedRange[0] + anomaly.expectedRange[1]) / 2) / (deviation / 2);

    const relatedMetrics: { metric: string; change: number }[] = [];
    for (const ctx of contextMetrics) {
      if (ctx.metric === anomaly.metric) continue;
      const nearIdx = ctx.timestamps.findIndex(
        (t) => Math.abs(t.getTime() - anomaly.timestamp.getTime()) < 3600000
      );
      if (nearIdx > 0) {
        const before = mean(ctx.values.slice(Math.max(0, nearIdx - 5), nearIdx));
        const after = mean(ctx.values.slice(nearIdx, Math.min(ctx.values.length, nearIdx + 5)));
        const change = before !== 0 ? ((after - before) / Math.abs(before)) * 100 : 0;
        if (Math.abs(change) > 5) {
          relatedMetrics.push({ metric: ctx.metric, change });
        }
      }
    }

    let rootCause = "No clear root cause identified from available data.";
    if (relatedMetrics.length > 0) {
      const topCorrelated = relatedMetrics.sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0];
      rootCause = `Strong correlation with ${topCorrelated.metric} (${topCorrelated.change > 0 ? "+" : ""}${topCorrelated.change.toFixed(1)}% change). This may indicate a systemic issue affecting multiple metrics.`;
    }

    const impact = severity > 3
      ? "Critical anomaly requiring immediate attention"
      : severity > 2
      ? "Significant deviation that should be investigated"
      : "Minor anomaly within acceptable monitoring thresholds";

    return {
      id: crypto.randomUUID(),
      anomalyId: crypto.randomUUID(),
      explanation: `The ${anomaly.metric} value of ${anomaly.value.toFixed(2)} deviated ${severity.toFixed(1)} standard deviations from the expected range [${anomaly.expectedRange[0].toFixed(2)}, ${anomaly.expectedRange[1].toFixed(2)}]`,
      rootCause,
      impact,
      recommendations: [
        "Review recent configuration changes",
        "Check for environmental factors",
        ...relatedMetrics.map((r) => `Monitor ${r.metric} for correlated changes`),
      ],
      relatedMetrics,
      contextWindow: {
        start: new Date(anomaly.timestamp.getTime() - 3600000),
        end: new Date(anomaly.timestamp.getTime() + 3600000),
      },
    };
  }

  generateRecommendations(context: InsightContext): Recommendation[] {
    const recommendations: Recommendation[] = [];

    for (const device of context.devices) {
      if (device.errorRate > 0.05) {
        recommendations.push({
          id: crypto.randomUUID(),
          category: "reliability",
          priority: "high",
          title: `Reduce error rate on ${device.deviceId}`,
          description: `Current error rate is ${(device.errorRate * 100).toFixed(1)}%, which is above the 5% threshold.`,
          rationale: "High error rates indicate hardware issues, connectivity problems, or software bugs that need attention.",
          expectedBenefit: "Improved data quality and system reliability",
          implementationSteps: [
            "Review error logs for patterns",
            "Check device firmware version",
            "Verify network connectivity",
            "Run diagnostic tests",
          ],
          prerequisites: [],
          relatedInsights: [],
        });
      }

      if (device.uptime < 0.95) {
        recommendations.push({
          id: crypto.randomUUID(),
          category: "reliability",
          priority: "medium",
          title: `Improve uptime for ${device.deviceId}`,
          description: `Current uptime is ${(device.uptime * 100).toFixed(1)}%, below the 95% target.`,
          rationale: "Low uptime affects data continuity and can mask important events.",
          expectedBenefit: "Consistent monitoring coverage",
          implementationSteps: [
            "Investigate root cause of downtime",
            "Consider redundant power supply",
            "Add health monitoring alerts",
          ],
          prerequisites: [],
          relatedInsights: [],
        });
      }

      for (const metric of device.metrics) {
        if (metric.previous !== undefined) {
          const change = changePercent(metric.current, metric.previous);
          if (Math.abs(change) > 20) {
            recommendations.push({
              id: crypto.randomUUID(),
              category: "performance",
              priority: change > 50 ? "high" : "medium",
              title: `${metric.name} changed significantly on ${device.deviceId}`,
              description: `${metric.name} changed by ${change > 0 ? "+" : ""}${change.toFixed(1)}% (from ${metric.previous.toFixed(2)} to ${metric.current.toFixed(2)} ${metric.unit ?? ""})`,
              rationale: "Significant metric changes may indicate issues or optimization opportunities.",
              expectedBenefit: "Early detection of performance issues",
              implementationSteps: [
                "Review what changed in the time period",
                "Check for correlated metric changes",
                "Set up alerts for future occurrences",
              ],
              prerequisites: [],
              relatedInsights: [],
            });
          }
        }
      }
    }

    if (context.budget) {
      const spendRate = context.budget.currentSpendUsd / context.budget.monthlyUsd;
      if (spendRate > 0.8) {
        recommendations.push({
          id: crypto.randomUUID(),
          category: "cost",
          priority: spendRate > 1 ? "critical" : "high",
          title: "Budget utilization above threshold",
          description: `Current spend is ${(spendRate * 100).toFixed(0)}% of monthly budget.`,
          rationale: "Overspending on IoT infrastructure can impact other operational areas.",
          expectedBenefit: "Cost savings of up to 20-30%",
          estimatedImpactUsd: context.budget.currentSpendUsd * 0.2,
          implementationSteps: [
            "Review resource allocation",
            "Identify idle or underutilized devices",
            "Consider scheduling optimizations",
            "Evaluate usage-based pricing options",
          ],
          prerequisites: [],
          relatedInsights: [],
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priOrder[a.priority] - priOrder[b.priority];
    });
  }

  async generateSummaryReport(context: InsightContext): Promise<SummaryReport> {
    const insights = await this.generateInsights(context);
    const recommendations = this.generateRecommendations(context);

    const healthScores = context.devices.map((d) => {
      let score = 100;
      if (d.errorRate > 0.05) score -= 20;
      if (d.errorRate > 0.1) score -= 20;
      if (d.uptime < 0.95) score -= 15;
      if (d.uptime < 0.9) score -= 15;
      const warningMetrics = d.metrics.filter(
        (m) => m.previous !== undefined && Math.abs(changePercent(m.current, m.previous)) > 20
      );
      score -= warningMetrics.length * 5;
      return Math.max(0, Math.min(100, score));
    });

    const healthScore = mean(healthScores);
    const overallHealth: SummaryReport["overallHealth"] =
      healthScore >= 90 ? "excellent" :
      healthScore >= 75 ? "good" :
      healthScore >= 60 ? "fair" :
      healthScore >= 40 ? "poor" : "critical";

    const executiveSummary = this.buildExecutiveSummary(
      insights,
      recommendations,
      healthScore,
      context
    );

    const sections: ReportSection[] = [
      {
        title: "Device Health Overview",
        content: `${context.devices.length} devices monitored. Average health score: ${healthScore.toFixed(0)}/100.`,
        metrics: context.devices.map((d) => ({
          name: d.deviceId,
          value: d.uptime * 100,
          unit: "%",
          benchmark: 95,
        })),
        insights: insights.filter((i) => i.type === "performance"),
        charts: [],
      },
      {
        title: "Key Metrics Trends",
        content: "Analysis of metric trends across the reporting period.",
        metrics: this.extractKeyMetrics(context),
        insights: insights.filter((i) => i.type === "trend"),
        charts: [],
      },
      {
        title: "Cost & Energy Analysis",
        content: "Resource utilization and cost optimization opportunities.",
        metrics: [],
        insights: insights.filter((i) => i.type === "energy" || i.type === "cost"),
        charts: [],
      },
    ];

    return {
      id: crypto.randomUUID(),
      title: `IoT Dashboard Summary Report - ${context.timeRange.start.toLocaleDateString()} to ${context.timeRange.end.toLocaleDateString()}`,
      period: context.timeRange,
      generatedAt: new Date(),
      executiveSummary,
      sections,
      keyMetrics: this.extractKeyMetrics(context),
      topInsights: insights.slice(0, 5),
      actionItems: recommendations.slice(0, 5).map((r) => r.title),
      overallHealth,
      healthScore,
    };
  }

  private analyzeDeviceHealth(context: InsightContext): Insight[] {
    const insights: Insight[] = [];

    for (const device of context.devices) {
      if (device.errorRate > 0.1) {
        insights.push({
          id: crypto.randomUUID(),
          type: "performance",
          severity: "critical",
          title: `High error rate on ${device.deviceId}`,
          summary: `Error rate is ${(device.errorRate * 100).toFixed(1)}%`,
          details: `Device ${device.deviceId} (${device.type}) at ${device.location} is experiencing elevated error rates that may indicate hardware failure or connectivity issues.`,
          source: { deviceId: device.deviceId },
          metrics: [{ name: "Error Rate", value: device.errorRate * 100, unit: "%" }],
          recommendations: ["Check device health", "Review error logs", "Consider replacement"],
          confidence: 0.9,
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + 3600000),
          tags: ["error-rate", "device-health"],
        });
      }

      if (device.uptime < 0.9) {
        insights.push({
          id: crypto.randomUUID(),
          type: "performance",
          severity: "warning",
          title: `Low uptime on ${device.deviceId}`,
          summary: `Uptime is ${(device.uptime * 100).toFixed(1)}%`,
          details: `Device ${device.deviceId} has been offline more than usual. This may affect data completeness.`,
          source: { deviceId: device.deviceId },
          metrics: [{ name: "Uptime", value: device.uptime * 100, unit: "%", benchmark: 95 }],
          recommendations: ["Check power supply", "Verify network connectivity"],
          confidence: 0.95,
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + 3600000),
          tags: ["uptime", "device-health"],
        });
      }
    }

    return insights;
  }

  private analyzeTrends(context: InsightContext): Insight[] {
    const insights: Insight[] = [];

    for (const device of context.devices) {
      for (const metric of device.metrics) {
        if (metric.previous !== undefined) {
          const change = changePercent(metric.current, metric.previous);
          if (Math.abs(change) > 30) {
            insights.push({
              id: crypto.randomUUID(),
              type: "trend",
              severity: change > 0 ? (metric.name.includes("error") ? "negative" : "positive") : (metric.name.includes("error") ? "positive" : "warning"),
              title: `${metric.name} trend on ${device.deviceId}`,
              summary: `${metric.name} changed by ${change > 0 ? "+" : ""}${change.toFixed(1)}%`,
              details: `${metric.name} went from ${metric.previous.toFixed(2)} to ${metric.current.toFixed(2)} ${metric.unit ?? ""}`,
              source: { deviceId: device.deviceId, metric: metric.name },
              metrics: [
                { name: metric.name, value: metric.current, unit: metric.unit, change: metric.current - (metric.previous ?? 0), changePercent: change, benchmark: metric.previous },
              ],
              recommendations: [`Monitor ${metric.name} for continued trend`],
              confidence: 0.8,
              generatedAt: new Date(),
              expiresAt: new Date(Date.now() + 6 * 3600000),
              tags: ["trend", metric.name],
            });
          }
        }
      }
    }

    return insights;
  }

  private analyzePerformance(context: InsightContext): Insight[] {
    const insights: Insight[] = [];

    const offlineDevices = context.devices.filter((d) => d.status === "offline");
    if (offlineDevices.length > 0) {
      insights.push({
        id: crypto.randomUUID(),
        type: "performance",
        severity: offlineDevices.length > 3 ? "critical" : "warning",
        title: `${offlineDevices.length} device(s) offline`,
        summary: `Devices offline: ${offlineDevices.map((d) => d.deviceId).join(", ")}`,
        details: "Offline devices cannot contribute to monitoring and may indicate infrastructure issues.",
        source: {},
        metrics: [{ name: "Offline Devices", value: offlineDevices.length }],
        recommendations: ["Check device connectivity", "Verify power supplies", "Review network infrastructure"],
        confidence: 1,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        tags: ["offline", "connectivity"],
      });
    }

    return insights;
  }

  private analyzeEnergy(context: InsightContext): Insight[] {
    const insights: Insight[] = [];

    for (const device of context.devices) {
      const powerMetric = device.metrics.find(
        (m) => m.name === "power" || m.name === "consumption"
      );
      if (powerMetric && powerMetric.previous !== undefined) {
        const change = changePercent(powerMetric.current, powerMetric.previous);
        if (change > 20) {
          insights.push({
            id: crypto.randomUUID(),
            type: "energy",
            severity: "warning",
            title: `Increased power consumption on ${device.deviceId}`,
            summary: `Power usage up ${change.toFixed(1)}%`,
            details: `Power consumption increased from ${powerMetric.previous.toFixed(1)} to ${powerMetric.current.toFixed(1)}W`,
            source: { deviceId: device.deviceId, metric: "power" },
            metrics: [{ name: "Power", value: powerMetric.current, unit: "W", changePercent: change }],
            recommendations: ["Check for inefficient operations", "Review duty cycle", "Consider optimization"],
            confidence: 0.85,
            generatedAt: new Date(),
            expiresAt: new Date(Date.now() + 12 * 3600000),
            tags: ["energy", "power"],
          });
        }
      }
    }

    return insights;
  }

  private analyzeCosts(context: InsightContext): Insight[] {
    const insights: Insight[] = [];

    if (context.budget) {
      const utilization = (context.budget.currentSpendUsd / context.budget.monthlyUsd) * 100;
      if (utilization > 90) {
        insights.push({
          id: crypto.randomUUID(),
          type: "cost",
          severity: utilization > 100 ? "critical" : "warning",
          title: "Budget nearing limit",
          summary: `${utilization.toFixed(0)}% of monthly budget used`,
          details: `Current spend: $${context.budget.currentSpendUsd.toFixed(2)} / $${context.budget.monthlyUsd.toFixed(2)}`,
          source: {},
          metrics: [
            { name: "Budget Used", value: utilization, unit: "%", benchmark: 80 },
          ],
          recommendations: ["Review resource allocation", "Identify cost-saving opportunities"],
          confidence: 1,
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 3600000),
          tags: ["cost", "budget"],
        });
      }
    }

    return insights;
  }

  private analyzeComparisons(context: InsightContext): Insight[] {
    const insights: Insight[] = [];

    if (context.devices.length >= 2) {
      const errorRates = context.devices.map((d) => ({
        deviceId: d.deviceId,
        rate: d.errorRate,
      }));
      const avgRate = mean(errorRates.map((e) => e.rate));
      const outliers = errorRates.filter((e) => e.rate > avgRate * 2 && e.rate > 0.05);

      if (outliers.length > 0) {
        insights.push({
          id: crypto.randomUUID(),
          type: "comparison",
          severity: "warning",
          title: "Device performance outliers detected",
          summary: `${outliers.length} device(s) performing significantly worse than average`,
          details: `Devices with error rates >2x average: ${outliers.map((o) => `${o.deviceId} (${(o.rate * 100).toFixed(1)}%)`).join(", ")}`,
          source: {},
          metrics: outliers.map((o) => ({
            name: o.deviceId,
            value: o.rate * 100,
            unit: "%",
            benchmark: avgRate * 100,
          })),
          recommendations: ["Investigate outlier devices", "Compare configurations"],
          confidence: 0.8,
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + 12 * 3600000),
          tags: ["comparison", "outliers"],
        });
      }
    }

    return insights;
  }

  private extractKeyMetrics(context: InsightContext): InsightMetric[] {
    const metrics: InsightMetric[] = [];
    for (const device of context.devices.slice(0, 5)) {
      for (const m of device.metrics.slice(0, 3)) {
        metrics.push({
          name: `${device.deviceId}/${m.name}`,
          value: m.current,
          unit: m.unit,
          changePercent: m.previous !== undefined ? changePercent(m.current, m.previous) : undefined,
          benchmark: m.previous,
        });
      }
    }
    return metrics;
  }

  private buildExecutiveSummary(
    insights: Insight[],
    recommendations: Recommendation[],
    healthScore: number,
    context: InsightContext
  ): string {
    const criticalCount = insights.filter((i) => i.severity === "critical").length;
    const warningCount = insights.filter((i) => i.severity === "warning").length;
    const onlineCount = context.devices.filter((d) => d.status === "online").length;

    let summary = `System health score: ${healthScore.toFixed(0)}/100. `;
    summary += `${onlineCount}/${context.devices.length} devices online. `;

    if (criticalCount > 0) {
      summary += `${criticalCount} critical issue(s) require immediate attention. `;
    }
    if (warningCount > 0) {
      summary += `${warningCount} warning(s) should be investigated. `;
    }
    if (recommendations.length > 0) {
      summary += `${recommendations.length} recommendation(s) available for optimization.`;
    }

    return summary;
  }
}
