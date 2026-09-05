import { z } from 'zod';

// ── Types ────────────────────────────────────────────────────────────────────

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';

export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'suppressed';

export type AlertCategory = 'threshold' | 'anomaly' | 'predictive' | 'system' | 'custom';

export interface Alert {
  id: string;
  deviceId: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  status: AlertStatus;
  category: AlertCategory;
  metric?: string;
  currentValue?: number;
  threshold?: number;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

export interface AlertRule {
  id: string;
  name: string;
  deviceId: string;
  metric: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  cooldownMs: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertCondition {
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=' | 'between' | 'outside';
  value: number;
  value2?: number;
  durationMs?: number;
}

export interface AlertCreateInput {
  deviceId: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  category: AlertCategory;
  metric?: string;
  currentValue?: number;
  threshold?: number;
  metadata?: Record<string, unknown>;
}

export interface AlertStats {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  suppressed: number;
  bySeverity: Record<AlertSeverity, number>;
  byCategory: Record<AlertCategory, number>;
  avgResolutionTimeMs: number;
}

// ── Service ─────────────────────────────────────────────────────────────────

export class AlertService {
  private alerts: Map<string, Alert> = new Map();
  private rules: Map<string, AlertRule> = new Map();
  private lastTriggered: Map<string, number> = new Map();

  create(input: AlertCreateInput): Alert {
    const now = new Date();
    const alert: Alert = {
      id: crypto.randomUUID(),
      ...input,
      status: 'active',
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };
    this.alerts.set(alert.id, alert);
    return alert;
  }

  getById(id: string): Alert | undefined {
    return this.alerts.get(id);
  }

  getAll(filter?: {
    status?: AlertStatus[];
    severity?: AlertSeverity[];
    deviceId?: string;
    category?: AlertCategory;
  }): Alert[] {
    let results = Array.from(this.alerts.values());

    if (filter) {
      if (filter.status?.length) {
        results = results.filter(a => filter.status!.includes(a.status));
      }
      if (filter.severity?.length) {
        results = results.filter(a => filter.severity!.includes(a.severity));
      }
      if (filter.deviceId) {
        results = results.filter(a => a.deviceId === filter.deviceId);
      }
      if (filter.category) {
        results = results.filter(a => a.category === filter.category);
      }
    }

    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  acknowledge(id: string, userId: string): Alert | undefined {
    const alert = this.alerts.get(id);
    if (!alert || alert.status !== 'active') return undefined;

    alert.status = 'acknowledged';
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();
    alert.updatedAt = new Date();
    return alert;
  }

  resolve(id: string): Alert | undefined {
    const alert = this.alerts.get(id);
    if (!alert) return undefined;
    if (alert.status === 'resolved' || alert.status === 'suppressed') return undefined;

    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    alert.updatedAt = new Date();
    return alert;
  }

  suppress(id: string): Alert | undefined {
    const alert = this.alerts.get(id);
    if (!alert || alert.status === 'resolved') return undefined;

    alert.status = 'suppressed';
    alert.updatedAt = new Date();
    return alert;
  }

  addRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): AlertRule {
    const now = new Date();
    const fullRule: AlertRule = {
      ...rule,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.rules.set(fullRule.id, fullRule);
    return fullRule;
  }

  evaluateRules(deviceId: string, metric: string, value: number): Alert[] {
    const triggeredAlerts: Alert[] = [];
    const now = Date.now();

    this.rules.forEach(rule => {
      if (!rule.enabled) return;
      if (rule.deviceId !== deviceId || rule.metric !== metric) return;

      const lastTime = this.lastTriggered.get(rule.id) ?? 0;
      if (now - lastTime < rule.cooldownMs) return;

      if (this.evaluateCondition(rule.condition, value)) {
        const alert = this.create({
          deviceId,
          title: `Rule triggered: ${rule.name}`,
          message: `${metric} value ${value} triggered rule "${rule.name}"`,
          severity: rule.severity,
          category: 'threshold',
          metric,
          currentValue: value,
          threshold: rule.condition.value,
        });
        triggeredAlerts.push(alert);
        this.lastTriggered.set(rule.id, now);
      }
    });

    return triggeredAlerts;
  }

  private evaluateCondition(condition: AlertCondition, value: number): boolean {
    switch (condition.operator) {
      case '>': return value > condition.value;
      case '<': return value < condition.value;
      case '>=': return value >= condition.value;
      case '<=': return value <= condition.value;
      case '==': return value === condition.value;
      case '!=': return value !== condition.value;
      case 'between':
        return value >= condition.value && value <= (condition.value2 ?? condition.value);
      case 'outside':
        return value < condition.value || value > (condition.value2 ?? condition.value);
      default: return false;
    }
  }

  getStats(): AlertStats {
    const all = Array.from(this.alerts.values());
    const resolutionTimes = all
      .filter(a => a.resolvedAt)
      .map(a => a.resolvedAt!.getTime() - a.createdAt.getTime());

    const bySeverity: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    all.forEach(a => {
      bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1;
      byCategory[a.category] = (byCategory[a.category] || 0) + 1;
    });

    return {
      total: all.length,
      active: all.filter(a => a.status === 'active').length,
      acknowledged: all.filter(a => a.status === 'acknowledged').length,
      resolved: all.filter(a => a.status === 'resolved').length,
      suppressed: all.filter(a => a.status === 'suppressed').length,
      bySeverity: bySeverity as Record<AlertSeverity, number>,
      byCategory: byCategory as Record<AlertCategory, number>,
      avgResolutionTimeMs:
        resolutionTimes.length > 0
          ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
          : 0,
    };
  }

  delete(id: string): boolean {
    return this.alerts.delete(id);
  }

  deleteRule(id: string): boolean {
    return this.rules.delete(id);
  }

  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  getActiveAlertCount(): number {
    return Array.from(this.alerts.values()).filter(a => a.status === 'active').length;
  }

  clear(): void {
    this.alerts.clear();
    this.rules.clear();
    this.lastTriggered.clear();
  }

  count(): number {
    return this.alerts.size;
  }
}
