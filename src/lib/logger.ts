// ─── Log Levels ───────────────────────────────────────────────────────────────

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: "DEBUG",
  [LogLevel.INFO]: "INFO",
  [LogLevel.WARN]: "WARN",
  [LogLevel.ERROR]: "ERROR",
  [LogLevel.FATAL]: "FATAL",
};

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: "\x1b[36m",
  [LogLevel.INFO]: "\x1b[32m",
  [LogLevel.WARN]: "\x1b[33m",
  [LogLevel.ERROR]: "\x1b[31m",
  [LogLevel.FATAL]: "\x1b[35m",
};

const RESET_COLOR = "\x1b[0m";

// ─── Logger Configuration ─────────────────────────────────────────────────────

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableJson: boolean;
  filePath?: string;
  maxFileSize: number;
  maxFiles: number;
  serviceName: string;
  environment: string;
}

const defaultConfig: LoggerConfig = {
  level: process.env.NODE_ENV === "development" ? LogLevel.DEBUG : LogLevel.INFO,
  enableConsole: true,
  enableFile: false,
  enableJson: process.env.NODE_ENV === "production",
  maxFileSize: 10 * 1024 * 1024,
  maxFiles: 5,
  serviceName: "ai-iot-dashboard",
  environment: process.env.NODE_ENV ?? "development",
};

let config: LoggerConfig = { ...defaultConfig };

// ─── Logger Interface ─────────────────────────────────────────────────────────

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: string;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  requestId?: string;
  userId?: string;
  duration?: number;
}

// ─── Logger Class ─────────────────────────────────────────────────────────────

class Logger {
  private context?: string;
  private static instance: Logger | null = null;
  private static globalContext: Record<string, unknown> = {};

  constructor(context?: string) {
    this.context = context;
  }

  static getInstance(context?: string): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(context);
    }
    return context ? new Logger(context) : Logger.instance;
  }

  static setGlobalContext(context: Record<string, unknown>) {
    Logger.globalContext = context;
  }

  configure(newConfig: Partial<LoggerConfig>) {
    config = { ...config, ...newConfig };
  }

  child(context: string): Logger {
    return new Logger(context);
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= config.level;
  }

  private formatEntry(entry: LogEntry): string {
    if (config.enableJson) {
      return JSON.stringify({
        ...entry,
        service: config.serviceName,
        env: config.environment,
      });
    }

    const timestamp = entry.timestamp;
    const level = LOG_LEVEL_NAMES[LogLevel[entry.level as keyof typeof LogLevel]] ?? entry.level;
    const context = entry.context ? `[${entry.context}]` : "";
    const requestId = entry.requestId ? `[req:${entry.requestId}]` : "";
    const userId = entry.userId ? `[user:${entry.userId}]` : "";
    const duration = entry.duration != null ? ` (${entry.duration}ms)` : "";

    let message = `${timestamp} ${level} ${context}${requestId}${userId} ${entry.message}${duration}`;

    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      message += ` ${JSON.stringify(entry.metadata)}`;
    }

    if (entry.error) {
      message += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack) {
        message += `\n  Stack: ${entry.error.stack}`;
      }
    }

    return message;
  }

  private write(level: LogLevel, message: string, extra?: Partial<LogEntry>) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LOG_LEVEL_NAMES[level],
      message,
      context: this.context,
      ...extra,
      metadata: {
        ...Logger.globalContext,
        ...extra?.metadata,
      },
    };

    if (config.enableConsole) {
      const color = LOG_LEVEL_COLORS[level];
      const formatted = this.formatEntry(entry);
      const lines = formatted.split("\n");

      for (const line of lines) {
        if (level >= LogLevel.ERROR) {
          console.error(`${color}${line}${RESET_COLOR}`);
        } else if (level >= LogLevel.WARN) {
          console.warn(`${color}${line}${RESET_COLOR}`);
        } else {
          console.log(`${color}${line}${RESET_COLOR}`);
        }
      }
    }
  }

  debug(message: string, metadata?: Record<string, unknown>) {
    this.write(LogLevel.DEBUG, message, { metadata });
  }

  info(message: string, metadata?: Record<string, unknown>) {
    this.write(LogLevel.INFO, message, { metadata });
  }

  warn(message: string, metadata?: Record<string, unknown>) {
    this.write(LogLevel.WARN, message, { metadata });
  }

  error(message: string, error?: Error | unknown, metadata?: Record<string, unknown>) {
    const errorInfo =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: (error as Error & { code?: string }).code,
          }
        : { name: "Unknown", message: String(error) };

    this.write(LogLevel.ERROR, message, {
      metadata,
      error: errorInfo,
    });
  }

  fatal(message: string, error?: Error | unknown, metadata?: Record<string, unknown>) {
    const errorInfo =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: (error as Error & { code?: string }).code,
          }
        : { name: "Unknown", message: String(error) };

    this.write(LogLevel.FATAL, message, {
      metadata,
      error: errorInfo,
    });
  }

  timer(label: string): () => number {
    const start = performance.now();
    return () => {
      const duration = Math.round(performance.now() - start);
      this.info(`${label} completed`, { duration });
      return duration;
    };
  }

  withRequest(requestId: string, userId?: string): Logger {
    const child = new Logger(this.context);
    const originalWrite = child.write.bind(child);
    child.write = (level: LogLevel, message: string, extra?: Partial<LogEntry>) => {
      originalWrite(level, message, {
        ...extra,
        requestId,
        userId,
      });
    };
    return child;
  }
}

// ─── Default Logger Instance ──────────────────────────────────────────────────

export const logger = new Logger();

// ─── Request Logger Middleware Helper ─────────────────────────────────────────

export function createRequestLogger(
  requestId: string,
  userId?: string
): Logger {
  return logger.withRequest(requestId, userId);
}

// ─── Timing Helpers ───────────────────────────────────────────────────────────

export function logAsync<T>(
  label: string,
  fn: () => Promise<T>,
  context?: string
): Promise<T> {
  const log = context ? logger.child(context) : logger;
  const timer = log.timer(label);

  return fn()
    .then((result) => {
      timer();
      return result;
    })
    .catch((error) => {
      const duration = timer();
      log.error(`${label} failed after ${duration}ms`, error);
      throw error;
    });
}

export function logSync<T>(label: string, fn: () => T, context?: string): T {
  const log = context ? logger.child(context) : logger;
  const timer = log.timer(label);

  try {
    const result = fn();
    timer();
    return result;
  } catch (error) {
    const duration = timer();
    log.error(`${label} failed after ${duration}ms`, error);
    throw error;
  }
}

// ─── Performance Logger ───────────────────────────────────────────────────────

export class PerformanceLogger {
  private marks: Map<string, number> = new Map();
  private logger: Logger;

  constructor(context?: string) {
    this.logger = logger.child(context ?? "Performance");
  }

  mark(name: string) {
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark: string, endMark?: string) {
    const start = this.marks.get(startMark);
    if (start === undefined) {
      this.logger.warn(`Mark '${startMark}' not found`);
      return;
    }

    const end = endMark ? this.marks.get(endMark) : performance.now();
    if (end === undefined) {
      this.logger.warn(`Mark '${endMark}' not found`);
      return;
    }

    const duration = Math.round(end - start);
    this.logger.info(`${name}`, { duration, startMark, endMark: endMark ?? "now" });
    return duration;
  }

  clear() {
    this.marks.clear();
  }
}

// ─── Structured Event Logger ──────────────────────────────────────────────────

export const eventLogger = {
  deviceConnected(deviceId: string, organizationId: string) {
    logger.info("Device connected", {
      event: "device_connected",
      deviceId,
      organizationId,
    });
  },

  deviceDisconnected(deviceId: string, reason?: string) {
    logger.info("Device disconnected", {
      event: "device_disconnected",
      deviceId,
      reason,
    });
  },

  telemetryReceived(deviceId: string, dataType: string, pointCount: number) {
    logger.debug("Telemetry data received", {
      event: "telemetry_received",
      deviceId,
      dataType,
      pointCount,
    });
  },

  alertTriggered(alertId: string, deviceId: string, severity: string) {
    logger.warn("Alert triggered", {
      event: "alert_triggered",
      alertId,
      deviceId,
      severity,
    });
  },

  alertResolved(alertId: string, resolvedBy: string) {
    logger.info("Alert resolved", {
      event: "alert_resolved",
      alertId,
      resolvedBy,
    });
  },

  userLogin(userId: string, method: string) {
    logger.info("User logged in", {
      event: "user_login",
      userId,
      method,
    });
  },

  userLogout(userId: string) {
    logger.info("User logged out", {
      event: "user_logout",
      userId,
    });
  },

  apiRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    userId?: string
  ) {
    const level =
      statusCode >= 500
        ? LogLevel.ERROR
        : statusCode >= 400
          ? LogLevel.WARN
          : LogLevel.INFO;

    logger.write(level, `${method} ${path} ${statusCode}`, {
      metadata: { method, path, statusCode, duration, userId },
    });
  },

  integrationSync(integrationId: string, type: string, success: boolean) {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    logger.write(level, `Integration sync ${success ? "completed" : "failed"}`, {
      metadata: { integrationId, type, success },
    });
  },

  reportGenerated(reportId: string, format: string, duration: number) {
    logger.info("Report generated", {
      event: "report_generated",
      reportId,
      format,
      duration,
    });
  },

  ruleEvaluated(ruleId: string, triggered: boolean, duration: number) {
    logger.debug("Rule evaluated", {
      event: "rule_evaluated",
      ruleId,
      triggered,
      duration,
    });
  },

  dataAggregated(
    metricId: string,
    aggregationType: string,
    pointCount: number,
    duration: number
  ) {
    logger.debug("Data aggregated", {
      event: "data_aggregated",
      metricId,
      aggregationType,
      pointCount,
      duration,
    });
  },
};

// ─── Export Logger Instance ───────────────────────────────────────────────────

export default logger;
