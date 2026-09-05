// ── Types ────────────────────────────────────────────────────────────────────

export interface MetricData {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp: Date;
}

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  service: string;
  traceId?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: ComponentHealth[];
  uptime: number;
  version: string;
}

export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs?: number;
  error?: string;
}

// ── Monitoring Service ──────────────────────────────────────────────────────

class MonitoringService {
  private metrics: MetricData[] = [];
  private logs: LogEntry[] = [];
  private startTime: number;
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  constructor() {
    this.startTime = Date.now();
  }

  // Metrics
  recordMetric(metric: MetricData): void {
    this.metrics.push(metric);
    if (this.metrics.length > 10000) {
      this.metrics = this.metrics.slice(-5000);
    }
  }

  incrementCounter(name: string, tags?: Record<string, string>): void {
    const key = this.getKey(name, tags);
    this.counters.set(key, (this.counters.get(key) || 0) + 1);
    this.recordMetric({
      name,
      value: this.counters.get(key)!,
      tags,
      timestamp: new Date(),
    });
  }

  setGauge(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.getKey(name, tags);
    this.gauges.set(key, value);
    this.recordMetric({ name, value, tags, timestamp: new Date() });
  }

  recordHistogram(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.getKey(name, tags);
    const values = this.histograms.get(key) || [];
    values.push(value);
    if (values.length > 1000) values.shift();
    this.histograms.set(key, values);
    this.recordMetric({ name, value, tags, timestamp: new Date() });
  }

  private getKey(name: string, tags?: Record<string, string>): string {
    if (!tags) return name;
    const tagStr = Object.entries(tags)
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return `${name}:{${tagStr}}`;
  }

  getCounter(name: string, tags?: Record<string, string>): number {
    return this.counters.get(this.getKey(name, tags)) || 0;
  }

  getGauge(name: string, tags?: Record<string, string>): number {
    return this.gauges.get(this.getKey(name, tags)) || 0;
  }

  getHistogramStats(name: string, tags?: Record<string, string>): {
    count: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  } {
    const values = this.histograms.get(this.getKey(name, tags)) || [];
    if (values.length === 0) {
      return { count: 0, min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    return {
      count: sorted.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sorted.reduce((a, b) => a + b, 0) / sorted.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  // Logging
  log(entry: Omit<LogEntry, 'timestamp'>): void {
    this.logs.push({ ...entry, timestamp: new Date() });
    if (this.logs.length > 5000) {
      this.logs = this.logs.slice(-2500);
    }
  }

  info(message: string, metadata?: Record<string, unknown>, service = 'app'): void {
    this.log({ level: 'info', message, metadata, service });
  }

  warn(message: string, metadata?: Record<string, unknown>, service = 'app'): void {
    this.log({ level: 'warn', message, metadata, service });
  }

  error(message: string, metadata?: Record<string, unknown>, service = 'app'): void {
    this.log({ level: 'error', message, metadata, service });
  }

  debug(message: string, metadata?: Record<string, unknown>, service = 'app'): void {
    this.log({ level: 'debug', message, metadata, service });
  }

  getLogs(filter?: { level?: string; service?: string; since?: Date }): LogEntry[] {
    let results = [...this.logs];
    if (filter?.level) {
      results = results.filter(l => l.level === filter.level);
    }
    if (filter?.service) {
      results = results.filter(l => l.service === filter.service);
    }
    if (filter?.since) {
      results = results.filter(l => l.timestamp >= filter.since!);
    }
    return results;
  }

  // Health Check
  async getHealth(): Promise<HealthStatus> {
    const components: ComponentHealth[] = [];

    // Check memory usage
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    components.push({
      name: 'memory',
      status: heapUsedMB < 500 ? 'healthy' : heapUsedMB < 1000 ? 'degraded' : 'unhealthy',
      latencyMs: heapUsedMB,
    });

    // Check uptime
    const uptimeMs = Date.now() - this.startTime;
    components.push({
      name: 'uptime',
      status: 'healthy',
      latencyMs: uptimeMs,
    });

    const overallStatus = components.every(c => c.status === 'healthy')
      ? 'healthy'
      : components.some(c => c.status === 'unhealthy')
        ? 'unhealthy'
        : 'degraded';

    return {
      status: overallStatus,
      components,
      uptime: uptimeMs,
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  // Request tracking
  trackRequest(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number
  ): void {
    this.incrementCounter('http.requests', { method, path: this.sanitizePath(path) });
    this.incrementCounter('http.responses', {
      method,
      path: this.sanitizePath(path),
      status: statusCode.toString(),
    });
    this.recordHistogram('http.duration', durationMs, {
      method,
      path: this.sanitizePath(path),
    });

    if (statusCode >= 400) {
      this.incrementCounter('http.errors', {
        method,
        path: this.sanitizePath(path),
        status: statusCode.toString(),
      });
    }
  }

  private sanitizePath(path: string): string {
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
      .replace(/\?.*$/, '');
  }

  // IoT specific metrics
  trackDeviceMetric(deviceId: string, metric: string, value: number): void {
    this.recordMetric({
      name: `iot.device.${metric}`,
      value,
      tags: { deviceId },
      timestamp: new Date(),
    });
  }

  trackAlert(severity: string, category: string): void {
    this.incrementCounter('alerts.total', { severity, category });
  }

  trackAIRequest(provider: string, model: string, latencyMs: number, tokens: number): void {
    this.recordHistogram('ai.request.duration', latencyMs, { provider, model });
    this.recordHistogram('ai.request.tokens', tokens, { provider, model });
  }

  getMetricsSummary(): Record<string, unknown> {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histogramStats: Object.fromEntries(
        Array.from(this.histograms.entries()).map(([key, values]) => [
          key,
          {
            count: values.length,
            avg: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
          },
        ])
      ),
      totalMetrics: this.metrics.length,
      totalLogs: this.logs.length,
    };
  }

  clear(): void {
    this.metrics = [];
    this.logs = [];
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }
}

// Singleton instance
export const monitoring = new MonitoringService();
