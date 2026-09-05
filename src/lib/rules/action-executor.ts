/**
 * Action executor for IoT rule engine.
 * Executes webhooks, email, SMS, push notifications,
 * device commands, and lambda functions.
 */

import crypto from "crypto";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ExecutionRequest {
  id: string;
  actionType: string;
  config: Record<string, unknown>;
  context?: Record<string, unknown>;
  dryRun?: boolean;
  timeout?: number;
}

export interface ExecutionResult {
  id: string;
  request: ExecutionRequest;
  success: boolean;
  statusCode?: number;
  response?: unknown;
  error?: string;
  durationMs: number;
  retried: boolean;
  executedAt: Date;
}

export interface ExecutionLog {
  entries: ExecutionResult[];
  totalExecutions: number;
  successRate: number;
  avgDurationMs: number;
}

export interface WebhookPayload {
  event: string;
  deviceId: string;
  metric: string;
  value: number;
  timestamp: string;
  ruleId: string;
  ruleName: string;
  severity: string;
  metadata?: Record<string, unknown>;
}

export interface EmailMessage {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: { filename: string; content: string; contentType?: string }[];
}

export interface SMSMessage {
  to: string[];
  body: string;
  sender?: string;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  badge?: number;
  priority: "low" | "normal" | "high" | "max";
  data?: Record<string, unknown>;
  deviceIds?: string[];
}

export interface DeviceCommand {
  deviceId: string;
  command: string;
  params?: Record<string, unknown>;
  timeoutMs?: number;
  retryCount?: number;
}

export interface LambdaInvocation {
  functionId: string;
  payload: Record<string, unknown>;
  invocationType?: "sync" | "async";
  timeoutMs?: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface ActionExecutorConfig {
  retryConfig: RetryConfig;
  defaultTimeoutMs: number;
  webhookBaseUrl?: string;
  emailProvider?: string;
  smsProvider?: string;
  lambdaProvider?: string;
  logLevel: "debug" | "info" | "warn" | "error";
}

// ── HTTP Client abstraction ──────────────────────────────────────────────────

async function httpRequest(
  url: string,
  options: {
    method: string;
    headers?: Record<string, string>;
    body?: unknown;
    timeout?: number;
  }
): Promise<{ status: number; data: unknown; headers: Record<string, string> }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout ?? 30000);

  try {
    const response = await fetch(url, {
      method: options.method,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "IoT-RuleEngine/1.0",
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);
    const headers: Record<string, string> = {};
    response.headers.forEach((v, k) => (headers[k] = v));

    return { status: response.status, data, headers };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── ActionExecutor ───────────────────────────────────────────────────────────

export class ActionExecutor {
  private config: ActionExecutorConfig;
  private log: ExecutionResult[] = [];

  constructor(config?: Partial<ActionExecutorConfig>) {
    this.config = {
      retryConfig: {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        backoffMultiplier: 2,
        ...config?.retryConfig,
      },
      defaultTimeoutMs: config?.defaultTimeoutMs ?? 30000,
      logLevel: config?.logLevel ?? "info",
      ...config,
    };
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const start = Date.now();
    let lastError: string | undefined;
    let lastResponse: unknown;
    let lastStatusCode: number | undefined;
    let retried = false;

    const maxAttempts = this.config.retryConfig.maxRetries + 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (attempt > 1) {
          retried = true;
          const delay = Math.min(
            this.config.retryConfig.baseDelayMs *
              Math.pow(this.config.retryConfig.backoffMultiplier, attempt - 2),
            this.config.retryConfig.maxDelayMs
          );
          await this.sleep(delay);
        }

        const result = await this.executeAction(request);
        lastResponse = result.response;
        lastStatusCode = result.statusCode;

        if (result.success) {
          const executionResult: ExecutionResult = {
            id: request.id,
            request,
            success: true,
            statusCode: result.statusCode,
            response: result.response,
            durationMs: Date.now() - start,
            retried,
            executedAt: new Date(),
          };
          this.log.push(executionResult);
          return executionResult;
        }

        lastError = result.error;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    const failedResult: ExecutionResult = {
      id: request.id,
      request,
      success: false,
      statusCode: lastStatusCode,
      response: lastResponse,
      error: lastError,
      durationMs: Date.now() - start,
      retried,
      executedAt: new Date(),
    };
    this.log.push(failedResult);
    return failedResult;
  }

  async executeBatch(
    requests: ExecutionRequest[]
  ): Promise<ExecutionResult[]> {
    return Promise.all(requests.map((r) => this.execute(r)));
  }

  getExecutionLog(limit: number = 100): ExecutionLog {
    const entries = this.log.slice(-limit);
    const successCount = entries.filter((e) => e.success).length;
    const avgDuration =
      entries.length > 0
        ? entries.reduce((s, e) => s + e.durationMs, 0) / entries.length
        : 0;

    return {
      entries,
      totalExecutions: entries.length,
      successRate: entries.length > 0 ? (successCount / entries.length) * 100 : 100,
      avgDurationMs: avgDuration,
    };
  }

  private async executeAction(
    request: ExecutionRequest
  ): Promise<{ success: boolean; statusCode?: number; response?: unknown; error?: string }> {
    switch (request.actionType) {
      case "webhook":
        return this.executeWebhook(request);
      case "email":
        return this.executeEmail(request);
      case "sms":
        return this.executeSMS(request);
      case "push":
        return this.executePush(request);
      case "device_command":
        return this.executeDeviceCommand(request);
      case "lambda":
        return this.executeLambda(request);
      case "log":
        return this.executeLog(request);
      default:
        return { success: false, error: `Unknown action type: ${request.actionType}` };
    }
  }

  private async executeWebhook(
    request: ExecutionRequest
  ): Promise<{ success: boolean; statusCode?: number; response?: unknown; error?: string }> {
    const config = request.config as {
      url: string;
      method?: string;
      headers?: Record<string, string>;
      body?: Record<string, unknown>;
      timeout?: number;
    };

    let url = config.url;
    if (this.config.webhookBaseUrl && !url.startsWith("http")) {
      url = `${this.config.webhookBaseUrl}/${url}`;
    }

    const payload: WebhookPayload = {
      event: (request.context?.event as string) ?? "rule_triggered",
      deviceId: (request.context?.deviceId as string) ?? "unknown",
      metric: (request.context?.metric as string) ?? "unknown",
      value: (request.context?.value as number) ?? 0,
      timestamp: new Date().toISOString(),
      ruleId: (request.context?.ruleId as string) ?? "unknown",
      ruleName: (request.context?.ruleName as string) ?? "Unknown Rule",
      severity: (request.context?.severity as string) ?? "info",
      metadata: request.context?.metadata as Record<string, unknown>,
    };

    try {
      const response = await httpRequest(url, {
        method: config.method ?? "POST",
        headers: config.headers,
        body: { ...payload, ...config.body },
        timeout: config.timeout ?? this.config.defaultTimeoutMs,
      });

      return {
        success: response.status >= 200 && response.status < 300,
        statusCode: response.status,
        response: response.data,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Webhook request failed",
      };
    }
  }

  private async executeEmail(
    request: ExecutionRequest
  ): Promise<{ success: boolean; statusCode?: number; response?: unknown; error?: string }> {
    const config = request.config as {
      to: string[];
      cc?: string[];
      subject: string;
      body: string;
      isHtml?: boolean;
    };

    if (request.dryRun) {
      return {
        success: true,
        response: {
          simulated: true,
          to: config.to,
          subject: config.subject,
          bodyLength: config.body.length,
        },
      };
    }

    try {
      if (this.config.emailProvider === "sendgrid") {
        const response = await httpRequest("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          },
          body: {
            personalizations: [{ to: config.to.map((email) => ({ email })) }],
            from: { email: process.env.FROM_EMAIL ?? "noreply@iot-dashboard.com" },
            subject: config.subject,
            content: [
              {
                type: config.isHtml ? "text/html" : "text/plain",
                value: config.body,
              },
            ],
          },
        });

        return {
          success: response.status === 202,
          statusCode: response.status,
          response: response.data,
        };
      }

      this.logAction("email", `Email to ${config.to.join(", ")}: ${config.subject}`);
      return {
        success: true,
        response: { simulated: true, provider: this.config.emailProvider ?? "console" },
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Email sending failed",
      };
    }
  }

  private async executeSMS(
    request: ExecutionRequest
  ): Promise<{ success: boolean; statusCode?: number; response?: unknown; error?: string }> {
    const config = request.config as {
      to: string[];
      message: string;
      sender?: string;
    };

    if (request.dryRun) {
      return {
        success: true,
        response: {
          simulated: true,
          to: config.to,
          messageLength: config.message.length,
        },
      };
    }

    try {
      if (this.config.smsProvider === "twilio") {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromNumber = config.sender ?? process.env.TWILIO_FROM_NUMBER;

        if (!accountSid || !authToken || !fromNumber) {
          return { success: false, error: "Twilio credentials not configured" };
        }

        const results = await Promise.all(
          config.to.map(async (to) => {
            const response = await httpRequest(
              `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
              {
                method: "POST",
                headers: {
                  Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
                },
                body: {
                  To: to,
                  From: fromNumber,
                  Body: config.message,
                },
              }
            );
            return { to, success: response.status === 201 };
          })
        );

        const allSuccess = results.every((r) => r.success);
        return {
          success: allSuccess,
          response: results,
        };
      }

      this.logAction("sms", `SMS to ${config.to.join(", ")}: ${config.message.substring(0, 50)}...`);
      return {
        success: true,
        response: { simulated: true, provider: this.config.smsProvider ?? "console" },
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "SMS sending failed",
      };
    }
  }

  private async executePush(
    request: ExecutionRequest
  ): Promise<{ success: boolean; statusCode?: number; response?: unknown; error?: string }> {
    const config = request.config as PushPayload;

    if (request.dryRun) {
      return {
        success: true,
        response: {
          simulated: true,
          title: config.title,
          body: config.body,
          devices: config.deviceIds ?? ["all"],
        },
      };
    }

    try {
      const payload: PushPayload = {
        title: config.title,
        body: config.body,
        icon: config.icon ?? "/icons/alert.png",
        url: config.url,
        priority: config.priority ?? "normal",
        data: {
          ...config.data,
          deviceId: request.context?.deviceId,
          metric: request.context?.metric,
          value: request.context?.value,
          timestamp: new Date().toISOString(),
        },
        deviceIds: config.deviceIds,
      };

      this.logAction("push", `Push notification: ${config.title}`);
      return {
        success: true,
        response: { delivered: true, payload },
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Push notification failed",
      };
    }
  }

  private async executeDeviceCommand(
    request: ExecutionRequest
  ): Promise<{ success: boolean; statusCode?: number; response?: unknown; error?: string }> {
    const config = request.config as DeviceCommand;

    if (request.dryRun) {
      return {
        success: true,
        response: {
          simulated: true,
          deviceId: config.deviceId,
          command: config.command,
          params: config.params,
        },
      };
    }

    try {
      const apiUrl = process.env.DEVICE_API_URL ?? "http://localhost:8080";
      const response = await httpRequest(
        `${apiUrl}/api/devices/${config.deviceId}/commands`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.DEVICE_API_TOKEN}`,
          },
          body: {
            command: config.command,
            params: config.params ?? {},
            timeout: config.timeoutMs ?? 10000,
          },
          timeout: config.timeoutMs ?? this.config.defaultTimeoutMs,
        }
      );

      return {
        success: response.status >= 200 && response.status < 300,
        statusCode: response.status,
        response: response.data,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Device command failed",
      };
    }
  }

  private async executeLambda(
    request: ExecutionRequest
  ): Promise<{ success: boolean; statusCode?: number; response?: unknown; error?: string }> {
    const config = request.config as LambdaInvocation;

    if (request.dryRun) {
      return {
        success: true,
        response: {
          simulated: true,
          functionId: config.functionId,
          payloadKeys: Object.keys(config.payload),
        },
      };
    }

    try {
      if (this.config.lambdaProvider === "aws") {
        const lambdaUrl = process.env.AWS_LAMBDA_INVOKE_URL;
        if (!lambdaUrl) {
          return { success: false, error: "Lambda invoke URL not configured" };
        }

        const response = await httpRequest(lambdaUrl, {
          method: "POST",
          headers: {
            "X-Amz-Invocation-Type": config.invocationType ?? "RequestResponse",
            Authorization: `Bearer ${process.env.AWS_LAMBDA_TOKEN}`,
          },
          body: {
            functionId: config.functionId,
            payload: {
              ...config.payload,
              triggerContext: request.context,
              timestamp: new Date().toISOString(),
            },
          },
          timeout: config.timeoutMs ?? this.config.defaultTimeoutMs,
        });

        return {
          success: response.status >= 200 && response.status < 300,
          statusCode: response.status,
          response: response.data,
        };
      }

      this.logAction("lambda", `Lambda invocation: ${config.functionId}`);
      return {
        success: true,
        response: { simulated: true, functionId: config.functionId },
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Lambda invocation failed",
      };
    }
  }

  private async executeLog(
    request: ExecutionRequest
  ): Promise<{ success: boolean; statusCode?: number; response?: unknown; error?: string }> {
    const config = request.config as {
      level: string;
      message: string;
      includeData?: boolean;
    };

    const logEntry = {
      level: config.level,
      message: config.message,
      timestamp: new Date().toISOString(),
      context: config.includeData ? request.context : undefined,
    };

    this.logAction(config.level as string, JSON.stringify(logEntry));
    return {
      success: true,
      response: logEntry,
    };
  }

  private logAction(type: string, message: string): void {
    if (this.config.logLevel === "debug" || type === "error") {
      console.log(`[${new Date().toISOString()}] [${type.toUpperCase()}] ${message}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
