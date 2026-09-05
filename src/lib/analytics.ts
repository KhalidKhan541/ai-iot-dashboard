export interface AnalyticsConfig {
  enabled: boolean;
  apiEndpoint?: string;
  apiKey?: string;
  environment?: "development" | "staging" | "production";
  userId?: string;
  sessionId?: string;
  flushInterval?: number;
  maxQueueSize?: number;
}

export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, unknown>;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  environment?: string;
  source?: string;
}

export interface PageViewEvent {
  page: string;
  title?: string;
  referrer?: string;
  duration?: number;
}

export interface DeviceEvent {
  deviceId: string;
  eventType: "data" | "alert" | "connection" | "disconnection" | "error";
  data?: Record<string, unknown>;
}

export interface UserEvent {
  eventType: "login" | "logout" | "signup" | "profile_update" | "settings_change";
  data?: Record<string, unknown>;
}

interface MetricEntry {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp: number;
}

interface MetricCounter {
  count: number;
  sum: number;
  min: number;
  max: number;
  lastUpdated: number;
}

export class Analytics {
  private config: Required<AnalyticsConfig>;
  private eventQueue: AnalyticsEvent[] = [];
  private metrics = new Map<string, MetricCounter>();
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private observers: Array<(event: AnalyticsEvent) => void> = [];

  constructor(config: AnalyticsConfig) {
    this.config = {
      enabled: true,
      apiEndpoint: "/api/analytics",
      apiKey: "",
      environment: "development",
      flushInterval: 10000,
      maxQueueSize: 100,
      ...config,
    };

    if (this.config.enabled) {
      this.startFlushTimer();
    }
  }

  private generateSessionId(): string {
    return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private createEvent(
    event: string,
    properties?: Record<string, unknown>
  ): AnalyticsEvent {
    return {
      event,
      properties,
      timestamp: Date.now(),
      userId: this.config.userId,
      sessionId: this.config.sessionId ?? this.generateSessionId(),
      environment: this.config.environment,
      source: "web",
    };
  }

  track(event: string, properties?: Record<string, unknown>): void {
    if (!this.config.enabled) return;

    const analyticsEvent = this.createEvent(event, properties);
    this.eventQueue.push(analyticsEvent);

    for (const observer of this.observers) {
      observer(analyticsEvent);
    }

    if (this.eventQueue.length >= this.config.maxQueueSize) {
      this.flush();
    }
  }

  trackPageView(page: string, options?: Partial<PageViewEvent>): void {
    this.track("page_view", {
      page,
      title: options?.title,
      referrer: options?.referrer,
      duration: options?.duration,
    });
  }

  trackDeviceEvent(event: DeviceEvent): void {
    this.track("device_event", {
      deviceId: event.deviceId,
      eventType: event.eventType,
      ...event.data,
    });
  }

  trackUserEvent(event: UserEvent): void {
    this.track("user_event", {
      eventType: event.eventType,
      ...event.data,
    });
  }

  trackError(error: Error, context?: Record<string, unknown>): void {
    this.track("error", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...context,
    });
  }

  trackPerformance(
    metric: string,
    value: number,
    tags?: Record<string, string>
  ): void {
    this.track("performance", {
      metric,
      value,
      tags,
    });

    this.recordMetric(metric, value, tags);
  }

  trackTiming(category: string, variable: string, duration: number): void {
    this.track("timing", {
      category,
      variable,
      duration,
    });
  }

  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    const key = `${name}:${JSON.stringify(tags ?? {})}`;

    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        count: 0,
        sum: 0,
        min: value,
        max: value,
        lastUpdated: Date.now(),
      });
    }

    const metric = this.metrics.get(key)!;
    metric.count++;
    metric.sum += value;
    metric.min = Math.min(metric.min, value);
    metric.max = Math.max(metric.max, value);
    metric.lastUpdated = Date.now();
  }

  getMetric(name: string, tags?: Record<string, string>): MetricCounter | undefined {
    const key = `${name}:${JSON.stringify(tags ?? {})}`;
    return this.metrics.get(key);
  }

  getMetrics(): Array<MetricCounter & { name: string }> {
    return Array.from(this.metrics.entries()).map(([key, metric]) => {
      const name = key.split(":")[0];
      return { ...metric, name };
    });
  }

  incrementCounter(name: string, value: number = 1, tags?: Record<string, string>): void {
    const key = `counter:${name}:${JSON.stringify(tags ?? {})}`;

    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        count: 0,
        sum: 0,
        min: 0,
        max: 0,
        lastUpdated: Date.now(),
      });
    }

    const metric = this.metrics.get(key)!;
    metric.count += value;
    metric.sum += value;
    metric.lastUpdated = Date.now();
  }

  setUserId(userId: string): void {
    this.config.userId = userId;
  }

  clearUserId(): void {
    this.config.userId = undefined;
  }

  async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      if (this.config.apiEndpoint && typeof fetch !== "undefined") {
        await fetch(this.config.apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(this.config.apiKey ? { "X-API-Key": this.config.apiKey } : {}),
          },
          body: JSON.stringify({
            events: eventsToSend,
            metrics: this.getMetrics(),
          }),
        });
      }
    } catch {
      this.eventQueue.unshift(...eventsToSend);
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => this.flush(), this.config.flushInterval);
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }

  subscribe(observer: (event: AnalyticsEvent) => void): () => void {
    this.observers.push(observer);
    return () => {
      const idx = this.observers.indexOf(observer);
      if (idx !== -1) this.observers.splice(idx, 1);
    };
  }

  getQueueSize(): number {
    return this.eventQueue.length;
  }

  identify(userId: string, traits?: Record<string, unknown>): void {
    this.track("identify", {
      userId,
      ...traits,
    });
  }

  group(groupId: string, traits?: Record<string, unknown>): void {
    this.track("group", {
      groupId,
      ...traits,
    });
  }
}

export function createAnalytics(config?: Partial<AnalyticsConfig>): Analytics {
  return new Analytics({
    enabled: config?.enabled ?? process.env.NODE_ENV === "production",
    apiEndpoint: config?.apiEndpoint ?? "/api/analytics",
    apiKey: config?.apiKey ?? process.env.ANALYTICS_API_KEY ?? "",
    environment: config?.environment ?? (process.env.NODE_ENV as "development" | "staging" | "production") ?? "development",
    userId: config?.userId,
    sessionId: config?.sessionId,
    flushInterval: config?.flushInterval ?? 10000,
    maxQueueSize: config?.maxQueueSize ?? 100,
  });
}

export const analytics = createAnalytics();
