// =============================================================================
// ALERT SERVICE - Alert Rules, Conditions, Actions & Escalation
// =============================================================================
// Comprehensive alerting system with rule management, multi-condition evaluation,
// action dispatching, suppression, and escalation policies.
// =============================================================================

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

// -----------------------------------------------------------------------------
// Data Types
// -----------------------------------------------------------------------------

export enum AlertSeverity {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  SUPPRESSED = 'suppressed',
  ESCALATED = 'escalated',
  EXPIRED = 'expired',
}

export enum ConditionType {
  THRESHOLD = 'threshold',
  THRESHOLD_RANGE = 'threshold_range',
  RATE_OF_CHANGE = 'rate_of_change',
  RATE_OF_INCREASE = 'rate_of_increase',
  RATE_OF_DECREASE = 'rate_of_decrease',
  ANOMALY = 'anomaly',
  MISSING_DATA = 'missing_data',
  DEVICE_OFFLINE = 'device_offline',
  COMPOSITE = 'composite',
  CUSTOM = 'custom',
}

export enum ActionType {
  EMAIL = 'email',
  WEBHOOK = 'webhook',
  SMS = 'sms',
  PUSH = 'push',
  SLACK = 'slack',
  PAGERDUTY = 'pagerduty',
  OPSGENIE = 'opsgenie',
  LAMBDA = 'lambda',
  LOG = 'log',
  CUSTOM = 'custom',
}

export enum SuppressionType {
  TIME_WINDOW = 'time_window',
  DAILY_SCHEDULE = 'daily_schedule',
  WEEKLY_SCHEDULE = 'weekly_schedule',
  MAINTENANCE_WINDOW = 'maintenance_window',
  COUNT_BASED = 'count_based',
  COOLDOWN = 'cooldown',
}

export enum EscalationPolicy {
  NONE = 'none',
  LINEAR = 'linear',
  EXPONENTIAL = 'exponential',
  STEP = 'step',
  CUSTOM = 'custom',
}

// -----------------------------------------------------------------------------
// Alert Rule
// -----------------------------------------------------------------------------

export interface AlertCondition {
  id: string;
  type: ConditionType;
  deviceId: string;
  capabilityId: string;
  operator: '>' | '>=' | '<' | '<=' | '==' | '!=' | 'between' | 'outside';
  threshold?: number;
  thresholdMin?: number;
  thresholdMax?: number;
  rateWindow?: number; // seconds
  rateThreshold?: number;
  duration?: number; // seconds - how long condition must be true
  consecutivePoints?: number;
  severity: AlertSeverity;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface AlertAction {
  id: string;
  type: ActionType;
  enabled: boolean;
  config: Record<string, unknown>;
  conditions?: {
    minSeverity?: AlertSeverity;
    requireAck?: boolean;
    timeout?: number;
  };
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: AlertCondition[];
  logic: 'and' | 'or';
  actions: AlertAction[];
  severity: AlertSeverity;
  cooldown: number; // seconds
  suppression: SuppressionConfig[];
  escalation: EscalationConfig;
  tags: string[];
  metadata: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
}

// -----------------------------------------------------------------------------
// Alert Instance
// -----------------------------------------------------------------------------

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  status: AlertStatus;
  severity: AlertSeverity;
  message: string;
  details: Record<string, unknown>;
  deviceId: string;
  capabilityId?: string;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  suppressedUntil?: Date;
  escalationLevel: number;
  lastEscalationAt?: Date;
  actionResults: ActionResult[];
  metadata: Record<string, unknown>;
}

export interface ActionResult {
  actionId: string;
  actionType: ActionType;
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  attempts: number;
  lastAttemptAt?: Date;
  lastError?: string;
  responseCode?: number;
  deliveredAt?: Date;
}

// -----------------------------------------------------------------------------
// Suppression & Escalation
// -----------------------------------------------------------------------------

export interface SuppressionConfig {
  type: SuppressionType;
  enabled: boolean;
  config: {
    duration?: number; // seconds
    startTime?: string; // HH:mm
    endTime?: string; // HH:mm
    daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
    maxAlerts?: number;
    cooldownPeriod?: number; // seconds
  };
}

export interface EscalationConfig {
  enabled: boolean;
  policy: EscalationPolicy;
  levels: EscalationLevel[];
  maxLevel: number;
}

export interface EscalationLevel {
  level: number;
  delay: number; // seconds before escalating to this level
  actions: AlertAction[];
  requireAck: boolean;
  ackTimeout: number; // seconds before escalating if not acked
}

// -----------------------------------------------------------------------------
// Alert Configuration
// -----------------------------------------------------------------------------

export interface AlertServiceConfig {
  maxRules: number;
  maxAlerts: number;
  maxAlertAge: number; // seconds
  evaluationInterval: number; // ms
  enableSuppression: boolean;
  enableEscalation: boolean;
  enableAutoResolve: boolean;
  autoResolveTimeout: number; // seconds
  maxActionRetries: number;
  alertRetentionDays: number;
  enableMetrics: boolean;
}

const DEFAULT_ALERT_CONFIG: AlertServiceConfig = {
  maxRules: 1000,
  maxAlerts: 100000,
  maxAlertAge: 86400 * 30, // 30 days
  evaluationInterval: 5000,
  enableSuppression: true,
  enableEscalation: true,
  enableAutoResolve: true,
  autoResolveTimeout: 300,
  maxActionRetries: 3,
  alertRetentionDays: 90,
  enableMetrics: true,
};

// -----------------------------------------------------------------------------
// Alert Metrics
// -----------------------------------------------------------------------------

export interface AlertMetrics {
  totalRules: number;
  activeRules: number;
  totalAlerts: number;
  activeAlerts: number;
  acknowledgedAlerts: number;
  resolvedAlerts: number;
  suppressedAlerts: number;
  escalatedAlerts: number;
  alertsBySeverity: Record<AlertSeverity, number>;
  alertsByType: Record<ConditionType, number>;
  averageResolutionTimeMs: number;
  averageAckTimeMs: number;
  actionSuccessRate: number;
  actionFailureRate: number;
  actionsByType: Record<ActionType, { sent: number; failed: number }>;
}

// -----------------------------------------------------------------------------
// Alert Service
// -----------------------------------------------------------------------------

export class AlertService extends EventEmitter {
  private rules: Map<string, AlertRule> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private suppressionState: Map<string, { count: number; lastAlert: Date; suppressedUntil?: Date }> = new Map();
  private evaluationTimer: ReturnType<typeof setInterval> | null = null;
  private metrics: AlertMetrics;

  // Data lookup callback
  private dataLookupCallback?: (deviceId: string, capabilityId: string, since: Date) => Promise<Array<{ value: number; timestamp: Date }>>;
  private deviceStatusCallback?: (deviceId: string) => Promise<{ status: string; lastSeen: Date }>;

  constructor(config: Partial<AlertServiceConfig> = {}) {
    super();
    this.config = { ...DEFAULT_ALERT_CONFIG, ...config };
    this.metrics = this.initializeMetrics();
    this.startEvaluation();
  }

  private config: AlertServiceConfig;

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  setDataCallbacks(
    dataLookup: (deviceId: string, capabilityId: string, since: Date) => Promise<Array<{ value: number; timestamp: Date }>>,
    deviceStatus: (deviceId: string) => Promise<{ status: string; lastSeen: Date }>
  ): void {
    this.dataLookupCallback = dataLookup;
    this.deviceStatusCallback = deviceStatus;
  }

  destroy(): void {
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
      this.evaluationTimer = null;
    }
  }

  private initializeMetrics(): AlertMetrics {
    return {
      totalRules: 0,
      activeRules: 0,
      totalAlerts: 0,
      activeAlerts: 0,
      acknowledgedAlerts: 0,
      resolvedAlerts: 0,
      suppressedAlerts: 0,
      escalatedAlerts: 0,
      alertsBySeverity: {
        [AlertSeverity.INFO]: 0,
        [AlertSeverity.LOW]: 0,
        [AlertSeverity.MEDIUM]: 0,
        [AlertSeverity.HIGH]: 0,
        [AlertSeverity.CRITICAL]: 0,
      },
      alertsByType: {
        [ConditionType.THRESHOLD]: 0,
        [ConditionType.THRESHOLD_RANGE]: 0,
        [ConditionType.RATE_OF_CHANGE]: 0,
        [ConditionType.RATE_OF_INCREASE]: 0,
        [ConditionType.RATE_OF_DECREASE]: 0,
        [ConditionType.ANOMALY]: 0,
        [ConditionType.MISSING_DATA]: 0,
        [ConditionType.DEVICE_OFFLINE]: 0,
        [ConditionType.COMPOSITE]: 0,
        [ConditionType.CUSTOM]: 0,
      },
      averageResolutionTimeMs: 0,
      averageAckTimeMs: 0,
      actionSuccessRate: 100,
      actionFailureRate: 0,
      actionsByType: {
        [ActionType.EMAIL]: { sent: 0, failed: 0 },
        [ActionType.WEBHOOK]: { sent: 0, failed: 0 },
        [ActionType.SMS]: { sent: 0, failed: 0 },
        [ActionType.PUSH]: { sent: 0, failed: 0 },
        [ActionType.SLACK]: { sent: 0, failed: 0 },
        [ActionType.PAGERDUTY]: { sent: 0, failed: 0 },
        [ActionType.OPSGENIE]: { sent: 0, failed: 0 },
        [ActionType.LAMBDA]: { sent: 0, failed: 0 },
        [ActionType.LOG]: { sent: 0, failed: 0 },
        [ActionType.CUSTOM]: { sent: 0, failed: 0 },
      },
    };
  }

  private startEvaluation(): void {
    this.evaluationTimer = setInterval(() => {
      this.evaluateAllRules();
    }, this.config.evaluationInterval);
  }

  // -------------------------------------------------------------------------
  // Rule Management
  // -------------------------------------------------------------------------

  async createRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt' | 'triggerCount'>): Promise<AlertRule> {
    if (this.rules.size >= this.config.maxRules) {
      throw new Error('Maximum alert rules limit reached');
    }

    const newRule: AlertRule = {
      ...rule,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
      triggerCount: 0,
    };

    this.rules.set(newRule.id, newRule);
    this.metrics.totalRules++;
    if (newRule.enabled) this.metrics.activeRules++;

    this.emit('rule:created', { ruleId: newRule.id, name: newRule.name });

    return newRule;
  }

  async updateRule(id: string, updates: Partial<AlertRule>): Promise<AlertRule | undefined> {
    const rule = this.rules.get(id);
    if (!rule) return undefined;

    const wasEnabled = rule.enabled;
    const updated = { ...rule, ...updates, updatedAt: new Date() };

    this.rules.set(id, updated);

    if (!wasEnabled && updated.enabled) {
      this.metrics.activeRules++;
    } else if (wasEnabled && !updated.enabled) {
      this.metrics.activeRules--;
    }

    this.emit('rule:updated', { ruleId: id });

    return updated;
  }

  async deleteRule(id: string): Promise<boolean> {
    const rule = this.rules.get(id);
    if (!rule) return false;

    this.rules.delete(id);
    this.metrics.totalRules--;
    if (rule.enabled) this.metrics.activeRules--;

    this.emit('rule:deleted', { ruleId: id });

    return true;
  }

  getRule(id: string): AlertRule | undefined {
    return this.rules.get(id);
  }

  listRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  getActiveRules(): AlertRule[] {
    return Array.from(this.rules.values()).filter(r => r.enabled);
  }

  // -------------------------------------------------------------------------
  // Rule Evaluation
  // -------------------------------------------------------------------------

  private async evaluateAllRules(): Promise<void> {
    const activeRules = this.getActiveRules();

    for (const rule of activeRules) {
      try {
        await this.evaluateRule(rule);
      } catch (error) {
        console.error(`Error evaluating rule ${rule.id}:`, error);
        this.emit('rule:evaluation_error', { ruleId: rule.id, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  }

  private async evaluateRule(rule: AlertRule): Promise<void> {
    const now = new Date();

    // Check cooldown
    if (rule.lastTriggered) {
      const timeSinceLastTrigger = (now.getTime() - rule.lastTriggered.getTime()) / 1000;
      if (timeSinceLastTrigger < rule.cooldown) {
        return; // Still in cooldown
      }
    }

    // Evaluate conditions
    const conditionResults: boolean[] = [];
    for (const condition of rule.conditions) {
      const result = await this.evaluateCondition(condition, now);
      conditionResults.push(result);
    }

    // Apply logic
    let triggered: boolean;
    if (rule.logic === 'and') {
      triggered = conditionResults.every(r => r);
    } else {
      triggered = conditionResults.some(r => r);
    }

    if (triggered) {
      await this.triggerAlert(rule, now, conditionResults);
    }
  }

  private async evaluateCondition(condition: AlertCondition, now: Date): Promise<boolean> {
    switch (condition.type) {
      case ConditionType.THRESHOLD:
        return this.evaluateThreshold(condition, now);

      case ConditionType.THRESHOLD_RANGE:
        return this.evaluateThresholdRange(condition, now);

      case ConditionType.RATE_OF_CHANGE:
      case ConditionType.RATE_OF_INCREASE:
      case ConditionType.RATE_OF_DECREASE:
        return this.evaluateRateOfChange(condition, now);

      case ConditionType.MISSING_DATA:
        return this.evaluateMissingData(condition, now);

      case ConditionType.DEVICE_OFFLINE:
        return this.evaluateDeviceOffline(condition, now);

      default:
        return false;
    }
  }

  private async evaluateThreshold(condition: AlertCondition, now: Date): Promise<boolean> {
    if (!this.dataLookupCallback) return false;

    const since = new Date(now.getTime() - (condition.duration || 60) * 1000);
    const dataPoints = await this.dataLookupCallback(condition.deviceId, condition.capabilityId, since);

    if (dataPoints.length === 0) return false;

    const latestValue = dataPoints[dataPoints.length - 1].value;

    switch (condition.operator) {
      case '>': return latestValue > (condition.threshold || 0);
      case '>=': return latestValue >= (condition.threshold || 0);
      case '<': return latestValue < (condition.threshold || 0);
      case '<=': return latestValue <= (condition.threshold || 0);
      case '==': return latestValue === (condition.threshold || 0);
      case '!=': return latestValue !== (condition.threshold || 0);
      default: return false;
    }
  }

  private async evaluateThresholdRange(condition: AlertCondition, now: Date): Promise<boolean> {
    if (!this.dataLookupCallback) return false;

    const since = new Date(now.getTime() - (condition.duration || 60) * 1000);
    const dataPoints = await this.dataLookupCallback(condition.deviceId, condition.capabilityId, since);

    if (dataPoints.length === 0) return false;

    const latestValue = dataPoints[dataPoints.length - 1].value;
    const min = condition.thresholdMin ?? -Infinity;
    const max = condition.thresholdMax ?? Infinity;

    if (condition.operator === 'between') {
      return latestValue >= min && latestValue <= max;
    } else {
      return latestValue < min || latestValue > max;
    }
  }

  private async evaluateRateOfChange(condition: AlertCondition, now: Date): Promise<boolean> {
    if (!this.dataLookupCallback) return false;

    const windowSeconds = condition.rateWindow || 60;
    const since = new Date(now.getTime() - windowSeconds * 1000);
    const dataPoints = await this.dataLookupCallback(condition.deviceId, condition.capabilityId, since);

    if (dataPoints.length < 2) return false;

    const firstValue = dataPoints[0].value;
    const lastValue = dataPoints[dataPoints.length - 1].value;
    const timeDiff = (dataPoints[dataPoints.length - 1].timestamp.getTime() - dataPoints[0].timestamp.getTime()) / 1000;

    if (timeDiff === 0) return false;

    const rateOfChange = (lastValue - firstValue) / timeDiff;
    const threshold = condition.rateThreshold || 0;

    switch (condition.type) {
      case ConditionType.RATE_OF_CHANGE:
        return Math.abs(rateOfChange) > threshold;
      case ConditionType.RATE_OF_INCREASE:
        return rateOfChange > threshold;
      case ConditionType.RATE_OF_DECREASE:
        return rateOfChange < -threshold;
      default:
        return false;
    }
  }

  private async evaluateMissingData(condition: AlertCondition, now: Date): Promise<boolean> {
    if (!this.dataLookupCallback) return false;

    const since = new Date(now.getTime() - (condition.duration || 300) * 1000);
    const dataPoints = await this.dataLookupCallback(condition.deviceId, condition.capabilityId, since);

    return dataPoints.length === 0;
  }

  private async evaluateDeviceOffline(condition: AlertCondition, now: Date): Promise<boolean> {
    if (!this.deviceStatusCallback) return false;

    const status = await this.deviceStatusCallback(condition.deviceId);
    const offlineThreshold = (condition.duration || 300) * 1000;

    return status.status === 'offline' || (now.getTime() - status.lastSeen.getTime()) > offlineThreshold;
  }

  // -------------------------------------------------------------------------
  // Alert Triggering
  // -------------------------------------------------------------------------

  private async triggerAlert(
    rule: AlertRule,
    now: Date,
    conditionResults: boolean[]
  ): Promise<void> {
    // Check suppression
    if (this.config.enableSuppression && this.isSuppressed(rule, now)) {
      return;
    }

    // Create alert instance
    const alert: Alert = {
      id: uuidv4(),
      ruleId: rule.id,
      ruleName: rule.name,
      status: AlertStatus.ACTIVE,
      severity: rule.severity,
      message: this.generateAlertMessage(rule, conditionResults),
      details: {
        ruleLogic: rule.logic,
        conditionResults: rule.conditions.map((c, i) => ({
          conditionId: c.id,
          type: c.type,
          result: conditionResults[i],
        })),
      },
      deviceId: rule.conditions[0]?.deviceId || '',
      capabilityId: rule.conditions[0]?.capabilityId,
      triggeredAt: now,
      escalationLevel: 0,
      actionResults: [],
      metadata: rule.metadata,
    };

    this.alerts.set(alert.id, alert);
    this.alertHistory.push(alert);

    // Update rule
    rule.lastTriggered = now;
    rule.triggerCount++;

    // Update metrics
    this.metrics.totalAlerts++;
    this.metrics.activeAlerts++;
    this.metrics.alertsBySeverity[alert.severity]++;

    // Update suppression state
    this.updateSuppressionState(rule.id, now);

    // Execute actions
    await this.executeActions(alert, rule.actions);

    // Emit event
    this.emit('alert:triggered', { alertId: alert.id, ruleId: rule.id, severity: rule.severity });

    // Start escalation if enabled
    if (this.config.enableEscalation && rule.escalation.enabled) {
      this.startEscalation(alert, rule);
    }
  }

  private generateAlertMessage(rule: AlertRule, conditionResults: boolean[]): string {
    const triggeredConditions = rule.conditions.filter((_, i) => conditionResults[i]);
    const messages = triggeredConditions.map(c => c.message || `${c.type} condition on ${c.deviceId}:${c.capabilityId}`);
    return `${rule.name}: ${messages.join('; ')}`;
  }

  // -------------------------------------------------------------------------
  // Action Execution
  // -------------------------------------------------------------------------

  private async executeActions(alert: Alert, actions: AlertAction[]): Promise<void> {
    for (const action of actions) {
      if (!action.enabled) continue;

      const actionResult: ActionResult = {
        actionId: action.id,
        actionType: action.type,
        status: 'pending',
        attempts: 0,
      };

      alert.actionResults.push(actionResult);

      try {
        await this.executeAction(action, alert, actionResult);
      } catch (error) {
        actionResult.status = 'failed';
        actionResult.lastError = error instanceof Error ? error.message : 'Unknown error';
        this.metrics.actionsByType[action.type].failed++;
      }
    }
  }

  private async executeAction(
    action: AlertAction,
    alert: Alert,
    result: ActionResult
  ): Promise<void> {
    const maxRetries = action.retryPolicy?.maxRetries || this.config.maxActionRetries;
    let retryDelay = action.retryPolicy?.retryDelay || 1000;
    const backoffMultiplier = action.retryPolicy?.backoffMultiplier || 2;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      result.attempts = attempt;
      result.lastAttemptAt = new Date();

      try {
        switch (action.type) {
          case ActionType.EMAIL:
            await this.sendEmail(action.config, alert);
            break;

          case ActionType.WEBHOOK:
            await this.sendWebhook(action.config, alert);
            break;

          case ActionType.SMS:
            await this.sendSms(action.config, alert);
            break;

          case ActionType.PUSH:
            await this.sendPush(action.config, alert);
            break;

          case ActionType.SLACK:
            await this.sendSlack(action.config, alert);
            break;

          case ActionType.PAGERDUTY:
            await this.sendPagerDuty(action.config, alert);
            break;

          case ActionType.OPSGENIE:
            await this.sendOpsGenie(action.config, alert);
            break;

          case ActionType.LAMBDA:
            await this.invokeLambda(action.config, alert);
            break;

          case ActionType.LOG:
            await this.logAlert(action.config, alert);
            break;

          default:
            throw new Error(`Unknown action type: ${action.type}`);
        }

        result.status = 'sent';
        result.deliveredAt = new Date();
        this.metrics.actionsByType[action.type].sent++;

        // Update success/failure rates
        const totalActions = Object.values(this.metrics.actionsByType)
          .reduce((sum, a) => sum + a.sent + a.failed, 0);
        const totalSuccess = Object.values(this.metrics.actionsByType)
          .reduce((sum, a) => sum + a.sent, 0);
        this.metrics.actionSuccessRate = totalActions > 0 ? (totalSuccess / totalActions) * 100 : 100;
        this.metrics.actionFailureRate = 100 - this.metrics.actionSuccessRate;

        return;
      } catch (error) {
        result.lastError = error instanceof Error ? error.message : 'Unknown error';
        result.status = 'retrying';

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retryDelay *= backoffMultiplier;
        }
      }
    }

    result.status = 'failed';
    this.metrics.actionsByType[action.type].failed++;
  }

  private async sendEmail(config: Record<string, unknown>, alert: Alert): Promise<void> {
    const to = config.to as string | string[];
    const subject = `[${alert.severity.toUpperCase()}] ${alert.ruleName}`;
    const body = this.formatAlertBody(alert);

    // In production, integrate with email service
    this.emit('action:email', { to, subject, body, alertId: alert.id });
  }

  private async sendWebhook(config: Record<string, unknown>, alert: Alert): Promise<void> {
    const url = config.url as string;
    const method = (config.method as string) || 'POST';
    const headers = config.headers as Record<string, string> || {};

    const payload = {
      alertId: alert.id,
      ruleName: alert.ruleName,
      severity: alert.severity,
      status: alert.status,
      message: alert.message,
      deviceId: alert.deviceId,
      triggeredAt: alert.triggeredAt.toISOString(),
      metadata: alert.metadata,
    };

    // In production, make HTTP request
    this.emit('action:webhook', { url, method, headers, payload, alertId: alert.id });
  }

  private async sendSms(config: Record<string, unknown>, alert: Alert): Promise<void> {
    const phoneNumbers = config.phoneNumbers as string[];
    const message = `[${alert.severity.toUpperCase()}] ${alert.message}`;

    // In production, integrate with SMS service
    this.emit('action:sms', { phoneNumbers, message, alertId: alert.id });
  }

  private async sendPush(config: Record<string, unknown>, alert: Alert): Promise<void> {
    const userIds = config.userIds as string[];
    const title = alert.ruleName;
    const body = alert.message;
    const priority = alert.severity === AlertSeverity.CRITICAL ? 'high' : 'normal';

    // In production, integrate with push notification service
    this.emit('action:push', { userIds, title, body, priority, alertId: alert.id });
  }

  private async sendSlack(config: Record<string, unknown>, alert: Alert): Promise<void> {
    const webhookUrl = config.webhookUrl as string;
    const channel = config.channel as string;

    const payload = {
      channel,
      text: `*${alert.severity.toUpperCase()}*: ${alert.ruleName}`,
      attachments: [{
        color: this.getSeverityColor(alert.severity),
        fields: [
          { title: 'Device', value: alert.deviceId, short: true },
          { title: 'Severity', value: alert.severity, short: true },
          { title: 'Message', value: alert.message, short: false },
          { title: 'Time', value: alert.triggeredAt.toISOString(), short: true },
        ],
      }],
    };

    // In production, make HTTP request to Slack webhook
    this.emit('action:slack', { webhookUrl, payload, alertId: alert.id });
  }

  private async sendPagerDuty(config: Record<string, unknown>, alert: Alert): Promise<void> {
    const serviceKey = config.serviceKey as string;

    const payload = {
      service_key: serviceKey,
      event_action: 'trigger',
      dedup_key: alert.id,
      payload: {
        summary: `${alert.ruleName}: ${alert.message}`,
        source: alert.deviceId,
        severity: alert.severity,
        timestamp: alert.triggeredAt.toISOString(),
        component: alert.capabilityId || 'unknown',
        group: alert.metadata.group as string || 'default',
        class: alert.severity,
      },
    };

    // In production, make HTTP request to PagerDuty API
    this.emit('action:pagerduty', { payload, alertId: alert.id });
  }

  private async sendOpsGenie(config: Record<string, unknown>, alert: Alert): Promise<void> {
    const apiKey = config.apiKey as string;

    const payload = {
      message: `${alert.ruleName}: ${alert.message}`,
      alias: alert.id,
      description: alert.message,
      priority: this.mapSeverityToOpsGenie(alert.severity),
      details: {
        deviceId: alert.deviceId,
        capabilityId: alert.capabilityId,
        ruleId: alert.ruleId,
      },
      tags: alert.metadata.tags as string[] || [],
    };

    // In production, make HTTP request to OpsGenie API
    this.emit('action:opsgenie', { apiKey, payload, alertId: alert.id });
  }

  private async invokeLambda(config: Record<string, unknown>, alert: Alert): Promise<void> {
    const functionName = config.functionName as string;
    const payload = {
      alertId: alert.id,
      ruleId: alert.ruleId,
      severity: alert.severity,
      message: alert.message,
      deviceId: alert.deviceId,
      timestamp: alert.triggeredAt.toISOString(),
    };

    // In production, invoke Lambda function
    this.emit('action:lambda', { functionName, payload, alertId: alert.id });
  }

  private async logAlert(config: Record<string, unknown>, alert: Alert): Promise<void> {
    const level = (config.level as string) || 'info';
    this.emit('action:log', { level, alert, alertId: alert.id });
  }

  private formatAlertBody(alert: Alert): string {
    return `
Alert: ${alert.ruleName}
Severity: ${alert.severity.toUpperCase()}
Status: ${alert.status}
Device: ${alert.deviceId}
Capability: ${alert.capabilityId || 'N/A'}
Message: ${alert.message}
Time: ${alert.triggeredAt.toISOString()}
    `.trim();
  }

  private getSeverityColor(severity: AlertSeverity): string {
    const colors: Record<AlertSeverity, string> = {
      [AlertSeverity.INFO]: '#36a64f',
      [AlertSeverity.LOW]: '#ffeb3b',
      [AlertSeverity.MEDIUM]: '#ff9800',
      [AlertSeverity.HIGH]: '#f44336',
      [AlertSeverity.CRITICAL]: '#9c27b0',
    };
    return colors[severity];
  }

  private mapSeverityToOpsGenie(severity: AlertSeverity): string {
    const map: Record<AlertSeverity, string> = {
      [AlertSeverity.INFO]: 'P5',
      [AlertSeverity.LOW]: 'P4',
      [AlertSeverity.MEDIUM]: 'P3',
      [AlertSeverity.HIGH]: 'P2',
      [AlertSeverity.CRITICAL]: 'P1',
    };
    return map[severity];
  }

  // -------------------------------------------------------------------------
  // Suppression
  // -------------------------------------------------------------------------

  private isSuppressed(rule: AlertRule, now: Date): boolean {
    if (!rule.suppression || rule.suppression.length === 0) return false;

    for (const suppression of rule.suppression) {
      if (!suppression.enabled) continue;

      if (this.checkSuppression(rule.id, suppression, now)) {
        return true;
      }
    }

    return false;
  }

  private checkSuppression(ruleId: string, suppression: SuppressionConfig, now: Date): boolean {
    const state = this.suppressionState.get(ruleId);

    switch (suppression.type) {
      case SuppressionType.COOLDOWN: {
        if (!state) return false;
        const cooldownPeriod = suppression.config.cooldownPeriod || 300;
        const timeSinceLastAlert = (now.getTime() - state.lastAlert.getTime()) / 1000;
        return timeSinceLastAlert < cooldownPeriod;
      }

      case SuppressionType.COUNT_BASED: {
        if (!state) return false;
        const maxAlerts = suppression.config.maxAlerts || 10;
        return state.count >= maxAlerts;
      }

      case SuppressionType.TIME_WINDOW: {
        if (!state?.suppressedUntil) return false;
        return now < state.suppressedUntil;
      }

      case SuppressionType.DAILY_SCHEDULE: {
        const startTime = suppression.config.startTime || '00:00';
        const endTime = suppression.config.endTime || '23:59';
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

        if (currentTime >= startTime && currentTime <= endTime) {
          return true; // Within maintenance window
        }
        return false;
      }

      case SuppressionType.WEEKLY_SCHEDULE: {
        const daysOfWeek = suppression.config.daysOfWeek || [];
        const currentDay = now.getDay();

        if (!daysOfWeek.includes(currentDay)) return false;

        const startTime = suppression.config.startTime || '00:00';
        const endTime = suppression.config.endTime || '23:59';
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

        return currentTime >= startTime && currentTime <= endTime;
      }

      case SuppressionType.MAINTENANCE_WINDOW: {
        if (!state?.suppressedUntil) return false;
        return now < state.suppressedUntil;
      }

      default:
        return false;
    }
  }

  private updateSuppressionState(ruleId: string, now: Date): void {
    let state = this.suppressionState.get(ruleId);

    if (!state) {
      state = { count: 0, lastAlert: now };
      this.suppressionState.set(ruleId, state);
    }

    state.count++;
    state.lastAlert = now;

    // Reset count if enough time has passed
    const resetWindow = 86400000; // 24 hours
    if (now.getTime() - state.lastAlert.getTime() > resetWindow) {
      state.count = 1;
    }
  }

  // -------------------------------------------------------------------------
  // Escalation
  // -------------------------------------------------------------------------

  private startEscalation(alert: Alert, rule: AlertRule): void {
    if (rule.escalation.levels.length === 0) return;

    const checkEscalation = () => {
      if (alert.status !== AlertStatus.ACTIVE) return;

      const now = new Date();
      const timeSinceTrigger = (now.getTime() - alert.triggeredAt.getTime()) / 1000;

      // Check if we should escalate
      for (const level of rule.escalation.levels) {
        if (alert.escalationLevel >= level.level) continue;

        const shouldEscalate = timeSinceTrigger >= level.delay ||
          (level.requireAck && !alert.acknowledgedAt &&
            timeSinceTrigger >= level.ackTimeout);

        if (shouldEscalate) {
          alert.escalationLevel = level.level;
          alert.status = AlertStatus.ESCALATED;
          alert.lastEscalationAt = now;

          // Execute escalation actions
          this.executeActions(alert, level.actions);

          this.metrics.escalatedAlerts++;
          this.emit('alert:escalated', { alertId: alert.id, level: level.level });
        }
      }
    };

    // Check every 30 seconds
    const interval = setInterval(() => {
      if (alert.status !== AlertStatus.ACTIVE && alert.status !== AlertStatus.ESCALATED) {
        clearInterval(interval);
        return;
      }
      checkEscalation();
    }, 30000);

    // Initial check after first level delay
    if (rule.escalation.levels.length > 0) {
      setTimeout(checkEscalation, rule.escalation.levels[0].delay * 1000);
    }
  }

  // -------------------------------------------------------------------------
  // Alert Management
  // -------------------------------------------------------------------------

  async acknowledgeAlert(alertId: string, userId: string): Promise<Alert | undefined> {
    const alert = this.alerts.get(alertId);
    if (!alert) return undefined;

    alert.status = AlertStatus.ACKNOWLEDGED;
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = userId;

    this.metrics.activeAlerts--;
    this.metrics.acknowledgedAlerts++;

    const ackTime = alert.acknowledgedAt.getTime() - alert.triggeredAt.getTime();
    this.metrics.averageAckTimeMs =
      (this.metrics.averageAckTimeMs * (this.metrics.acknowledgedAlerts - 1) + ackTime) /
      this.metrics.acknowledgedAlerts;

    this.emit('alert:acknowledged', { alertId, userId });

    return alert;
  }

  async resolveAlert(alertId: string, userId?: string): Promise<Alert | undefined> {
    const alert = this.alerts.get(alertId);
    if (!alert) return undefined;

    alert.status = AlertStatus.RESOLVED;
    alert.resolvedAt = new Date();
    alert.resolvedBy = userId;

    this.metrics.activeAlerts--;
    this.metrics.resolvedAlerts++;

    if (alert.acknowledgedAt) {
      const resolutionTime = alert.resolvedAt.getTime() - alert.triggeredAt.getTime();
      this.metrics.averageResolutionTimeMs =
        (this.metrics.averageResolutionTimeMs * (this.metrics.resolvedAlerts - 1) + resolutionTime) /
        this.metrics.resolvedAlerts;
    }

    this.emit('alert:resolved', { alertId, userId });

    return alert;
  }

  async suppressAlert(alertId: string, duration: number): Promise<Alert | undefined> {
    const alert = this.alerts.get(alertId);
    if (!alert) return undefined;

    alert.status = AlertStatus.SUPPRESSED;
    alert.suppressedUntil = new Date(Date.now() + duration * 1000);

    this.metrics.activeAlerts--;
    this.metrics.suppressedAlerts++;

    this.emit('alert:suppressed', { alertId, duration });

    return alert;
  }

  getAlert(id: string): Alert | undefined {
    return this.alerts.get(id);
  }

  listAlerts(options: {
    status?: AlertStatus;
    severity?: AlertSeverity;
    deviceId?: string;
    limit?: number;
    offset?: number;
  } = {}): Alert[] {
    let alerts = Array.from(this.alerts.values());

    if (options.status) {
      alerts = alerts.filter(a => a.status === options.status);
    }
    if (options.severity) {
      alerts = alerts.filter(a => a.severity === options.severity);
    }
    if (options.deviceId) {
      alerts = alerts.filter(a => a.deviceId === options.deviceId);
    }

    alerts.sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());

    const offset = options.offset || 0;
    const limit = options.limit || 50;
    return alerts.slice(offset, offset + limit);
  }

  getAlertHistory(limit: number = 100): Alert[] {
    return this.alertHistory.slice(-limit);
  }

  // -------------------------------------------------------------------------
  // Metrics
  // -------------------------------------------------------------------------

  getMetrics(): AlertMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
  }
}

// Singleton instance
let alertInstance: AlertService | null = null;

export function getAlertService(): AlertService {
  if (!alertInstance) {
    alertInstance = new AlertService();
  }
  return alertInstance;
}

export default AlertService;
