import { DeviceStatus } from "./device";

export type AlertSeverity = "info" | "warning" | "critical";
export type AlertStatus = "active" | "acknowledged" | "resolved" | "snoozed";
export type AlertType = "threshold" | "anomaly" | "connection" | "custom" | "composite";
export type ConditionOperator =
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "eq"
  | "neq"
  | "between"
  | "outside"
  | "changes_by"
  | "increases_by"
  | "decreases_by"
  | "stays_above"
  | "stays_below"
  | "contains";

export interface Alert {
  id: string;
  name: string;
  description?: string;
  severity: AlertSeverity;
  status: AlertStatus;
  type: AlertType;
  ruleId: string;
  deviceId: string;
  sensorId?: string;
  condition: AlertCondition;
  currentValue?: number;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: number;
  message: string;
  metadata?: Record<string, unknown>;
  notifications: AlertNotification[];
  escalationPolicy?: EscalationPolicy;
  tags?: string[];
}

export interface AlertCondition {
  operator: ConditionOperator;
  threshold: number | number[];
  unit?: string;
  duration?: number;
  timeWindow?: number;
  cooldown?: number;
  evaluationInterval?: number;
  aggregations?: AlertAggregation[];
  compositeLogic?: "and" | "or";
  conditions?: AlertCondition[];
}

export interface AlertAggregation {
  type: "avg" | "min" | "max" | "sum" | "count" | "last";
  timeWindow: number;
}

export interface AlertNotification {
  id: string;
  type: "email" | "webhook" | "sms" | "push" | "slack" | "teams";
  target: string;
  sentAt?: Date;
  status: "pending" | "sent" | "failed";
  error?: string;
}

export interface EscalationPolicy {
  id: string;
  name: string;
  rules: EscalationRule[];
}

export interface EscalationRule {
  level: number;
  delay: number;
  notify: AlertNotification[];
  repeatInterval?: number;
  maxRepeats?: number;
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  type: AlertType;
  enabled: boolean;
  severity: AlertSeverity;
  condition: AlertCondition;
  deviceIds: string[];
  sensorIds?: string[];
  notificationChannels: AlertNotification[];
  escalationPolicy?: EscalationPolicy;
  cooldown: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  lastTriggered?: Date;
  triggerCount: number;
}

export interface AlertStats {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  bySeverity: {
    info: number;
    warning: number;
    critical: number;
  };
  byDevice: Array<{
    deviceId: string;
    deviceName: string;
    count: number;
  }>;
  timeline: Array<{
    timestamp: Date;
    count: number;
    severity: AlertSeverity;
  }>;
  meanTimeToAcknowledge: number;
  meanTimeToResolve: number;
}

export interface AlertFilter {
  severity?: AlertSeverity[];
  status?: AlertStatus[];
  deviceId?: string;
  type?: AlertType[];
  search?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
}

export interface CreateAlertRuleInput {
  name: string;
  description?: string;
  type: AlertType;
  severity: AlertSeverity;
  condition: AlertCondition;
  deviceIds: string[];
  sensorIds?: string[];
  notificationChannels?: AlertNotification[];
  escalationPolicy?: EscalationPolicy;
  cooldown?: number;
  tags?: string[];
}

export interface UpdateAlertRuleInput {
  name?: string;
  description?: string;
  enabled?: boolean;
  severity?: AlertSeverity;
  condition?: AlertCondition;
  deviceIds?: string[];
  sensorIds?: string[];
  notificationChannels?: AlertNotification[];
  escalationPolicy?: EscalationPolicy;
  cooldown?: number;
  tags?: string[];
}

export interface AlertRuleEvaluation {
  ruleId: string;
  ruleName: string;
  deviceId: string;
  sensorId?: string;
  conditionMet: boolean;
  currentValue: number;
  threshold: number | number[];
  evaluatedAt: Date;
  message: string;
}

export interface AlertSubscription {
  id: string;
  userId: string;
  alertRuleId?: string;
  deviceId?: string;
  channels: AlertNotification[];
  severity?: AlertSeverity[];
  enabled: boolean;
  createdAt: Date;
}

export interface AlertSummary {
  period: "hour" | "day" | "week" | "month";
  startDate: Date;
  endDate: Date;
  totalAlerts: number;
  resolvedAlerts: number;
  averageResolutionTime: number;
  topAlertTypes: Array<{
    type: AlertType;
    count: number;
  }>;
  topDevices: Array<{
    deviceId: string;
    deviceName: string;
    alertCount: number;
  }>;
}

export interface AlertHistoryEntry {
  id: string;
  alertId: string;
  action: "created" | "acknowledged" | "resolved" | "snoozed" | "escalated" | "notification_sent";
  userId?: string;
  details?: string;
  timestamp: Date;
}
