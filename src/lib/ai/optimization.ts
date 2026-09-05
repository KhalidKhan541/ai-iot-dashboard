/**
 * AI-powered optimization engine for IoT systems.
 * Energy optimization, maintenance scheduling, resource allocation,
 * performance recommendations, and cost optimization.
 */

import crypto from "crypto";

// ── Types ────────────────────────────────────────────────────────────────────

export interface DeviceData {
  deviceId: string;
  type: string;
  location: string;
  metrics: MetricTimeSeries[];
  capabilities: string[];
  currentStatus: "online" | "offline" | "maintenance" | "error";
  metadata?: Record<string, unknown>;
}

export interface MetricTimeSeries {
  metric: string;
  values: { timestamp: Date; value: number }[];
  unit: string;
  min?: number;
  max?: number;
}

export interface EnergyOptimization {
  deviceId: string;
  currentConsumption: number;
  optimizedConsumption: number;
  savingsPercent: number;
  recommendations: EnergyRecommendation[];
  scheduleAdjustments: ScheduleAdjustment[];
  estimatedAnnualSavingsUsd: number;
}

export interface EnergyRecommendation {
  id: string;
  priority: "low" | "medium" | "high";
  title: string;
  description: string;
  estimatedSavingWatts: number;
  implementationComplexity: "easy" | "moderate" | "complex";
  prerequisites: string[];
}

export interface ScheduleAdjustment {
  deviceId: string;
  action: "power_down" | "reduce_power" | "optimize_duty_cycle" | "shift_load";
  recommendedTime: string;
  duration: number;
  expectedSavingWatts: number;
}

export interface MaintenanceSchedule {
  deviceId: string;
  component: string;
  recommendedAction: string;
  urgency: "routine" | "soon" | "urgent" | "critical";
  estimatedFailureDate: Date | null;
  maintenanceWindow: TimeWindow;
  estimatedCostUsd: number;
  riskIfSkipped: string;
}

export interface TimeWindow {
  start: Date;
  end: Date;
  preferred: boolean;
}

export interface ResourceAllocation {
  clusterId: string;
  totalResources: ResourcePool;
  currentAllocation: AllocationEntry[];
  optimizedAllocation: AllocationEntry[];
  efficiencyGain: number;
  bottlenecks: Bottleneck[];
}

export interface ResourcePool {
  cpu: number;
  memory: number;
  storage: number;
  bandwidth: number;
}

export interface AllocationEntry {
  deviceId: string;
  cpu: number;
  memory: number;
  storage: number;
  bandwidth: number;
  utilization: number;
}

export interface Bottleneck {
  resource: string;
  currentUtilization: number;
  threshold: number;
  affectedDevices: string[];
  severity: "low" | "medium" | "high";
}

export interface PerformanceRecommendation {
  id: string;
  category: "latency" | "throughput" | "reliability" | "scalability";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  metrics: { name: string; current: number; target: number; unit: string }[];
  implementation: string[];
  estimatedImprovement: string;
}

export interface CostOptimization {
  totalCurrentCostUsd: number;
  optimizedCostUsd: number;
  potentialSavingsUsd: number;
  breakdown: CostBreakdown[];
  recommendations: CostRecommendation[];
  roi: number;
  paybackPeriodDays: number;
}

export interface CostBreakdown {
  category: string;
  currentCostUsd: number;
  optimizedCostUsd: number;
  savingsUsd: number;
}

export interface CostRecommendation {
  id: string;
  title: string;
  description: string;
  estimatedSavingsUsd: number;
  implementationCostUsd: number;
  paybackDays: number;
  risk: "low" | "medium" | "high";
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function hourOfDay(date: Date): number {
  return date.getHours();
}

function dayOfWeek(date: Date): number {
  return date.getDay();
}

// ── OptimizationEngine ───────────────────────────────────────────────────────

export class OptimizationEngine {
  async optimizeEnergy(devices: DeviceData[]): Promise<EnergyOptimization[]> {
    const results: EnergyOptimization[] = [];

    for (const device of devices) {
      const powerSeries = device.metrics.find(
        (m) => m.metric === "power" || m.metric === "consumption" || m.metric === "watts"
      );
      if (!powerSeries || powerSeries.values.length < 24) {
        results.push(this.defaultEnergyResult(device));
        continue;
      }

      const values = powerSeries.values.map((v) => v.value);
      const timestamps = powerSeries.values.map((v) => v.timestamp);
      const currentConsumption = mean(values);

      const hourlyBuckets = new Array(24).fill(0).map(() => [] as number[]);
      const hourlyCounts = new Array(24).fill(0);
      for (let i = 0; i < values.length; i++) {
        const hour = hourOfDay(timestamps[i]);
        hourlyBuckets[hour].push(values[i]);
        hourlyCounts[hour]++;
      }
      const hourlyAvg = hourlyBuckets.map((bucket, i) =>
        hourlyCounts[i] > 0 ? mean(bucket) : 0
      );

      const peakHour = hourlyAvg.indexOf(Math.max(...hourlyAvg));
      const lowHour = hourlyAvg.reduce(
        (min, val, i) => (val < hourlyAvg[min] && val > 0 ? i : min),
        0
      );

      const recommendations: EnergyRecommendation[] = [];
      const scheduleAdjustments: ScheduleAdjustment[] = [];

      const peakValleyDiff = hourlyAvg[peakHour] - hourlyAvg[lowHour];
      if (peakValleyDiff > currentConsumption * 0.2) {
        recommendations.push({
          id: crypto.randomUUID(),
          priority: "high",
          title: "Load shifting opportunity",
          description: `Shift non-critical operations from peak hour (${peakHour}:00) to off-peak (${lowHour}:00)`,
          estimatedSavingWatts: peakValleyDiff * 0.3,
          implementationComplexity: "moderate",
          prerequisites: ["Identify non-critical workloads"],
        });

        scheduleAdjustments.push({
          deviceId: device.deviceId,
          action: "shift_load",
          recommendedTime: `${lowHour}:00`,
          duration: 60 * 60 * 1000,
          expectedSavingWatts: peakValleyDiff * 0.3,
        });
      }

      const cv = std(values) / (currentConsumption || 1);
      if (cv > 0.3) {
        recommendations.push({
          id: crypto.randomUUID(),
          priority: "medium",
          title: "Implement power smoothing",
          description: "High consumption variability detected. Smooth power draw with buffer capacity.",
          estimatedSavingWatts: currentConsumption * 0.1,
          implementationComplexity: "complex",
          prerequisites: ["Battery buffer or capacitor bank"],
        });
      }

      const weekendValues = values.filter((_, i) => {
        const dow = dayOfWeek(timestamps[i]);
        return dow === 0 || dow === 6;
      });
      const weekdayValues = values.filter((_, i) => {
        const dow = dayOfWeek(timestamps[i]);
        return dow > 0 && dow < 6;
      });

      if (weekendValues.length > 0 && weekdayValues.length > 0) {
        const weekendAvg = mean(weekendValues);
        const weekdayAvg = mean(weekdayValues);
        if (weekendAvg > weekdayAvg * 0.7) {
          recommendations.push({
            id: crypto.randomUUID(),
            priority: "high",
            title: "Weekend power waste detected",
            description: `Weekend consumption (${weekendAvg.toFixed(1)}W) is ${((weekendAvg / weekdayAvg) * 100).toFixed(0)}% of weekday levels`,
            estimatedSavingWatts: weekendAvg * 0.4,
            implementationComplexity: "easy",
            prerequisites: [],
          });

          scheduleAdjustments.push({
            deviceId: device.deviceId,
            action: "power_down",
            recommendedTime: "Saturday 02:00",
            duration: 48 * 60 * 60 * 1000,
            expectedSavingWatts: weekendAvg * 0.4,
          });
        }
      }

      const avgConsumption = currentConsumption;
      const dutyCycleEstimate = values.filter((v) => v > avgConsumption * 0.5).length / values.length;
      if (dutyCycleEstimate < 0.5 && dutyCycleEstimate > 0.1) {
        recommendations.push({
          id: crypto.randomUUID(),
          priority: "medium",
          title: "Optimize duty cycle",
          description: `Device is active ~${(dutyCycleEstimate * 100).toFixed(0)}% of the time. Consider reducing idle power draw.`,
          estimatedSavingWatts: avgConsumption * (1 - dutyCycleEstimate) * 0.3,
          implementationComplexity: "moderate",
          prerequisites: ["Analyze idle power consumption"],
        });
      }

      const optimizedConsumption =
        currentConsumption -
        recommendations.reduce((sum, r) => sum + r.estimatedSavingWatts, 0);

      results.push({
        deviceId: device.deviceId,
        currentConsumption,
        optimizedConsumption: Math.max(optimizedConsumption, currentConsumption * 0.5),
        savingsPercent:
          ((currentConsumption - Math.max(optimizedConsumption, currentConsumption * 0.5)) /
            currentConsumption) *
          100,
        recommendations,
        scheduleAdjustments,
        estimatedAnnualSavingsUsd:
          ((currentConsumption - Math.max(optimizedConsumption, currentConsumption * 0.5)) / 1000) *
          0.12 *
          8760,
      });
    }

    return results;
  }

  async scheduleMaintenance(devices: DeviceData[]): Promise<MaintenanceSchedule[]> {
    const schedules: MaintenanceSchedule[] = [];

    for (const device of devices) {
      const failureSeries = device.metrics.find(
        (m) =>
          m.metric === "failure_probability" ||
          m.metric === "health_score" ||
          m.metric === "degradation"
      );
      const ageSeries = device.metrics.find((m) => m.metric === "uptime_hours");
      const errorSeries = device.metrics.find((m) => m.metric === "error_count");

      let healthScore = 100;
      if (failureSeries && failureSeries.values.length > 0) {
        healthScore = 100 - mean(failureSeries.values.map((v) => v.value)) * 100;
      }

      let errorRate = 0;
      if (errorSeries && errorSeries.values.length > 1) {
        const errVals = errorSeries.values.map((v) => v.value);
        errorRate = mean(errVals.slice(-24)) / (mean(errVals.slice(0, -24)) || 1);
      }

      let uptimeHours = 0;
      if (ageSeries && ageSeries.values.length > 0) {
        uptimeHours = ageSeries.values[ageSeries.values.length - 1].value;
      }

      const urgency = this.determineUrgency(healthScore, errorRate, uptimeHours);
      const estimatedFailureDate = this.estimateFailureDate(healthScore, errorRate, uptimeHours);

      const maintenanceWindow = this.calculateMaintenanceWindow(urgency, estimatedFailureDate);

      schedules.push({
        deviceId: device.deviceId,
        component: this.identifyComponent(device),
        recommendedAction: this.recommendAction(urgency, healthScore, device),
        urgency,
        estimatedFailureDate,
        maintenanceWindow,
        estimatedCostUsd: this.estimateMaintenanceCost(urgency, device),
        riskIfSkipped: this.assessSkipRisk(urgency, estimatedFailureDate),
      });
    }

    return schedules.sort((a, b) => {
      const urgencyOrder = { critical: 0, urgent: 1, soon: 2, routine: 3 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
  }

  async allocateResources(
    devices: DeviceData[],
    clusterId: string
  ): Promise<ResourceAllocation> {
    const totalResources: ResourcePool = {
      cpu: devices.length * 2,
      memory: devices.length * 4096,
      storage: devices.length * 100,
      bandwidth: devices.length * 1000,
    };

    const currentAllocation: AllocationEntry[] = devices.map((device) => {
      const cpuMetric = device.metrics.find((m) => m.metric === "cpu_usage");
      const memMetric = device.metrics.find((m) => m.metric === "memory_usage");
      const storageMetric = device.metrics.find((m) => m.metric === "storage_usage");
      const netMetric = device.metrics.find((m) => m.metric === "network_throughput");

      return {
        deviceId: device.deviceId,
        cpu: cpuMetric ? mean(cpuMetric.values.map((v) => v.value)) : totalResources.cpu / devices.length,
        memory: memMetric ? mean(memMetric.values.map((v) => v.value)) : totalResources.memory / devices.length,
        storage: storageMetric ? mean(storageMetric.values.map((v) => v.value)) : totalResources.storage / devices.length,
        bandwidth: netMetric ? mean(netMetric.values.map((v) => v.value)) : totalResources.bandwidth / devices.length,
        utilization: 0,
      };
    });

    const totalCpu = currentAllocation.reduce((s, a) => s + a.cpu, 0);
    const totalMem = currentAllocation.reduce((s, a) => s + a.memory, 0);

    for (const entry of currentAllocation) {
      entry.utilization =
        ((entry.cpu / totalCpu) * 0.4 +
          (entry.memory / totalMem) * 0.3 +
          (entry.storage / totalResources.storage) * 0.2 +
          (entry.bandwidth / totalResources.bandwidth) * 0.1);
    }

    const optimizedAllocation = this.computeOptimalAllocation(
      currentAllocation,
      totalResources
    );

    const bottlenecks: Bottleneck[] = [];
    const cpuUtil = totalCpu / totalResources.cpu;
    if (cpuUtil > 0.8) {
      bottlenecks.push({
        resource: "cpu",
        currentUtilization: cpuUtil * 100,
        threshold: 80,
        affectedDevices: currentAllocation
          .filter((a) => a.cpu / (totalResources.cpu / devices.length) > 1.2)
          .map((a) => a.deviceId),
        severity: cpuUtil > 0.95 ? "high" : "medium",
      });
    }

    const memUtil = totalMem / totalResources.memory;
    if (memUtil > 0.8) {
      bottlenecks.push({
        resource: "memory",
        currentUtilization: memUtil * 100,
        threshold: 80,
        affectedDevices: currentAllocation
          .filter((a) => a.memory / (totalResources.memory / devices.length) > 1.2)
          .map((a) => a.deviceId),
        severity: memUtil > 0.95 ? "high" : "medium",
      });
    }

    const efficiencyGain =
      optimizedAllocation.reduce((s, a, i) => s + Math.abs(a.utilization - currentAllocation[i].utilization), 0) /
      (devices.length || 1);

    return {
      clusterId,
      totalResources,
      currentAllocation,
      optimizedAllocation,
      efficiencyGain,
      bottlenecks,
    };
  }

  async generatePerformanceRecommendations(
    devices: DeviceData[]
  ): Promise<PerformanceRecommendation[]> {
    const recommendations: PerformanceRecommendation[] = [];

    for (const device of devices) {
      const latencyMetric = device.metrics.find((m) => m.metric === "latency" || m.metric === "response_time");
      if (latencyMetric && latencyMetric.values.length > 0) {
        const latencies = latencyMetric.values.map((v) => v.value);
        const p95 = percentile(latencies, 95);
        const avg = mean(latencies);

        if (p95 > 1000) {
          recommendations.push({
            id: crypto.randomUUID(),
            category: "latency",
            severity: p95 > 5000 ? "critical" : "warning",
            title: `High latency detected on ${device.deviceId}`,
            description: `P95 latency is ${p95.toFixed(0)}ms (avg: ${avg.toFixed(0)}ms)`,
            metrics: [
              { name: "P95 Latency", current: p95, target: 500, unit: "ms" },
              { name: "Avg Latency", current: avg, target: 200, unit: "ms" },
            ],
            implementation: [
              "Check network congestion",
              "Optimize data serialization",
              "Consider edge processing",
            ],
            estimatedImprovement: `${Math.max(0, ((p95 - 500) / p95) * 100).toFixed(0)}% latency reduction`,
          });
        }
      }

      const throughputMetric = device.metrics.find((m) => m.metric === "throughput" || m.metric === "data_rate");
      if (throughputMetric && throughputMetric.values.length > 0) {
        const throughputs = throughputMetric.values.map((v) => v.value);
        const avg = mean(throughputs);
        const min = Math.min(...throughputs);

        if (min < avg * 0.3) {
          recommendations.push({
            id: crypto.randomUUID(),
            category: "throughput",
            severity: "warning",
            title: `Throughput instability on ${device.deviceId}`,
            description: `Throughput drops to ${min.toFixed(0)} (avg: ${avg.toFixed(0)})`,
            metrics: [
              { name: "Avg Throughput", current: avg, target: avg * 1.2, unit: "units/s" },
              { name: "Min Throughput", current: min, target: avg * 0.7, unit: "units/s" },
            ],
            implementation: [
              "Add buffering",
              "Implement backpressure",
              "Scale horizontally",
            ],
            estimatedImprovement: "30-50% throughput stability improvement",
          });
        }
      }

      const errorMetric = device.metrics.find((m) => m.metric === "error_rate" || m.metric === "error_count");
      if (errorMetric && errorMetric.values.length > 0) {
        const errorRate = mean(errorMetric.values.map((v) => v.value));
        if (errorRate > 0.01) {
          recommendations.push({
            id: crypto.randomUUID(),
            category: "reliability",
            severity: errorRate > 0.05 ? "critical" : "warning",
            title: `Elevated error rate on ${device.deviceId}`,
            description: `Error rate: ${(errorRate * 100).toFixed(2)}%`,
            metrics: [
              { name: "Error Rate", current: errorRate * 100, target: 0.1, unit: "%" },
            ],
            implementation: [
              "Review recent deployments",
              "Check dependency health",
              "Add circuit breakers",
            ],
            estimatedImprovement: `${((1 - 0.001 / errorRate) * 100).toFixed(0)}% error reduction`,
          });
        }
      }

      const connectionMetric = device.metrics.find((m) => m.metric === "connection_count" || m.metric === "active_connections");
      if (connectionMetric && connectionMetric.values.length > 10) {
        const connections = connectionMetric.values.map((v) => v.value);
        const maxConn = Math.max(...connections);
        const avgConn = mean(connections);
        if (maxConn > avgConn * 3) {
          recommendations.push({
            id: crypto.randomUUID(),
            category: "scalability",
            severity: "info",
            title: `Connection spike pattern on ${device.deviceId}`,
            description: `Max connections (${maxConn}) is ${((maxConn / avgConn) * 100).toFixed(0)}% of average (${avgConn.toFixed(0)})`,
            metrics: [
              { name: "Max Connections", current: maxConn, target: avgConn * 2, unit: "connections" },
            ],
            implementation: [
              "Implement connection pooling",
              "Add auto-scaling triggers",
              "Optimize keep-alive settings",
            ],
            estimatedImprovement: "Better resource utilization under load",
          });
        }
      }
    }

    return recommendations;
  }

  async optimizeCost(
    devices: DeviceData[],
    costPerKwh: number = 0.12
  ): Promise<CostOptimization> {
    const breakdown: CostBreakdown[] = [];
    let totalCurrentCost = 0;
    let totalOptimizedCost = 0;

    for (const device of devices) {
      const powerMetric = device.metrics.find(
        (m) => m.metric === "power" || m.metric === "consumption" || m.metric === "watts"
      );
      const computeMetric = device.metrics.find(
        (m) => m.metric === "cpu_usage" || m.metric === "compute_time"
      );

      const currentPowerCost = powerMetric
        ? (mean(powerMetric.values.map((v) => v.value)) / 1000) * 8760 * costPerKwh
        : 0;

      const computeCost = computeMetric
        ? mean(computeMetric.values.map((v) => v.value)) * 8760 * 0.05
        : 0;

      const deviceCurrentCost = currentPowerCost + computeCost;
      const optimizedPowerCost = currentPowerCost * 0.75;
      const optimizedComputeCost = computeCost * 0.8;

      totalCurrentCost += deviceCurrentCost;
      totalOptimizedCost += optimizedPowerCost + optimizedComputeCost;

      breakdown.push({
        category: `${device.deviceId} (${device.type})`,
        currentCostUsd: deviceCurrentCost,
        optimizedCostUsd: optimizedPowerCost + optimizedComputeCost,
        savingsUsd: deviceCurrentCost - (optimizedPowerCost + optimizedComputeCost),
      });
    }

    const recommendations: CostRecommendation[] = [];
    const totalSavings = totalCurrentCost - totalOptimizedCost;

    if (totalCurrentCost > 1000) {
      recommendations.push({
        id: crypto.randomUUID(),
        title: "Implement energy-efficient scheduling",
        description: "Shift workloads to off-peak hours for reduced energy rates",
        estimatedSavingsUsd: totalSavings * 0.3,
        implementationCostUsd: 500,
        paybackDays: Math.round(500 / ((totalSavings * 0.3) / 365)),
        risk: "low",
      });
    }

    const highPowerDevices = devices.filter((d) => {
      const p = d.metrics.find((m) => m.metric === "power" || m.metric === "consumption");
      return p && mean(p.values.map((v) => v.value)) > 500;
    });

    if (highPowerDevices.length > 0) {
      recommendations.push({
        id: crypto.randomUUID(),
        title: "Upgrade high-consumption devices",
        description: `${highPowerDevices.length} device(s) consuming >500W - consider energy-efficient alternatives`,
        estimatedSavingsUsd: totalSavings * 0.4,
        implementationCostUsd: highPowerDevices.length * 2000,
        paybackDays: Math.round((highPowerDevices.length * 2000) / ((totalSavings * 0.4) / 365)),
        risk: "medium",
      });
    }

    return {
      totalCurrentCostUsd: totalCurrentCost,
      optimizedCostUsd: totalOptimizedCost,
      potentialSavingsUsd: totalSavings,
      breakdown,
      recommendations,
      roi: totalCurrentCost > 0 ? (totalSavings / totalCurrentCost) * 100 : 0,
      paybackPeriodDays: totalSavings > 0 ? Math.round((recommendations.reduce((s, r) => s + r.implementationCostUsd, 0) / totalSavings) * 365) : 0,
    };
  }

  private defaultEnergyResult(device: DeviceData): EnergyOptimization {
    return {
      deviceId: device.deviceId,
      currentConsumption: 0,
      optimizedConsumption: 0,
      savingsPercent: 0,
      recommendations: [],
      scheduleAdjustments: [],
      estimatedAnnualSavingsUsd: 0,
    };
  }

  private determineUrgency(
    healthScore: number,
    errorRate: number,
    uptimeHours: number
  ): MaintenanceSchedule["urgency"] {
    if (healthScore < 20 || errorRate > 5) return "critical";
    if (healthScore < 40 || errorRate > 2) return "urgent";
    if (healthScore < 60 || uptimeHours > 8760) return "soon";
    return "routine";
  }

  private estimateFailureDate(
    healthScore: number,
    errorRate: number,
    uptimeHours: number
  ): Date | null {
    if (healthScore > 80 && errorRate < 0.5) return null;

    const degradationRate = (100 - healthScore) / Math.max(uptimeHours, 1);
    const hoursToFailure = healthScore > 0 ? healthScore / degradationRate : 1;
    return new Date(Date.now() + hoursToFailure * 3600000);
  }

  private calculateMaintenanceWindow(
    urgency: MaintenanceSchedule["urgency"],
    failureDate: Date | null
  ): TimeWindow {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (urgency) {
      case "critical":
        start = new Date(now.getTime() + 2 * 3600000);
        end = new Date(now.getTime() + 24 * 3600000);
        break;
      case "urgent":
        start = new Date(now.getTime() + 24 * 3600000);
        end = new Date(now.getTime() + 72 * 3600000);
        break;
      case "soon":
        start = new Date(now.getTime() + 7 * 24 * 3600000);
        end = new Date(now.getTime() + 14 * 24 * 3600000);
        break;
      default:
        start = new Date(now.getTime() + 30 * 24 * 3600000);
        end = new Date(now.getTime() + 60 * 24 * 3600000);
    }

    if (failureDate && end > failureDate) {
      end = new Date(failureDate.getTime() - 24 * 3600000);
    }

    return { start, end, preferred: urgency === "critical" || urgency === "urgent" };
  }

  private identifyComponent(device: DeviceData): string {
    const typeMap: Record<string, string> = {
      sensor: "Sensor module",
      actuator: "Actuator mechanism",
      gateway: "Communication module",
      controller: "Processing unit",
      camera: "Optics module",
      thermostat: "Temperature sensor",
      default: "General hardware",
    };
    return typeMap[device.type] ?? typeMap.default;
  }

  private recommendAction(
    urgency: MaintenanceSchedule["urgency"],
    healthScore: number,
    device: DeviceData
  ): string {
    if (urgency === "critical") return "Immediate replacement recommended";
    if (urgency === "urgent") return "Schedule urgent repair within 72 hours";
    if (healthScore < 60) return "Preventive maintenance within 2 weeks";
    return "Routine inspection during next maintenance window";
  }

  private estimateMaintenanceCost(
    urgency: MaintenanceSchedule["urgency"],
    device: DeviceData
  ): number {
    const baseCost = 100;
    const multipliers: Record<string, number> = {
      critical: 5,
      urgent: 3,
      soon: 1.5,
      routine: 1,
    };
    return baseCost * (multipliers[urgency] ?? 1);
  }

  private assessSkipRisk(
    urgency: MaintenanceSchedule["urgency"],
    failureDate: Date | null
  ): string {
    if (urgency === "critical") return "HIGH RISK: System failure likely without intervention";
    if (urgency === "urgent") return "ELEVATED RISK: Performance degradation expected";
    if (failureDate) {
      const daysUntil = Math.round(
        (failureDate.getTime() - Date.now()) / (24 * 3600000)
      );
      return `Estimated ${daysUntil} days until failure if skipped`;
    }
    return "Low risk - next maintenance can be deferred if needed";
  }

  private computeOptimalAllocation(
    current: AllocationEntry[],
    total: ResourcePool
  ): AllocationEntry[] {
    const n = current.length;
    if (n === 0) return [];

    const totalUtil = current.reduce((s, a) => s + a.utilization, 0);
    const avgUtil = totalUtil / n;

    return current.map((entry) => {
      const targetUtil = avgUtil;
      const scaleFactor = entry.utilization > 0 ? targetUtil / entry.utilization : 1;

      return {
        deviceId: entry.deviceId,
        cpu: entry.cpu * Math.min(scaleFactor, 1.5),
        memory: entry.memory * Math.min(scaleFactor, 1.5),
        storage: entry.storage,
        bandwidth: entry.bandwidth * Math.min(scaleFactor, 1.3),
        utilization: targetUtil,
      };
    });
  }
}

function std(arr: number[]): number {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1 || 1));
}
