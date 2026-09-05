// ── Types ────────────────────────────────────────────────────────────────────

export type RuleOperator = 'and' | 'or' | 'not';

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_equal'
  | 'less_equal'
  | 'contains'
  | 'not_contains'
  | 'in'
  | 'not_in'
  | 'between'
  | 'regex';

export interface Rule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  lastTriggeredAt?: Date;
  triggerCount: number;
}

export interface RuleCondition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
  value2?: unknown;
}

export interface RuleAction {
  type: 'alert' | 'notification' | 'webhook' | 'log' | 'notification_channel';
  config: Record<string, unknown>;
  delayMs?: number;
}

export interface RuleContext {
  deviceId: string;
  metric: string;
  value: number;
  timestamp: Date;
  metadata: Record<string, unknown>;
  deviceMetadata: Record<string, unknown>;
}

export interface RuleEvaluationResult {
  ruleId: string;
  triggered: boolean;
  matchedConditions: number;
  totalConditions: number;
  actions: RuleAction[];
  evaluationTimeMs: number;
}

export interface RuleEngineConfig {
  maxRules: number;
  maxConditionsPerRule: number;
  evaluationTimeoutMs: number;
  enableCaching: boolean;
  cacheTtlMs: number;
}

// ── Service ─────────────────────────────────────────────────────────────────

export class RuleEngine {
  private rules: Map<string, Rule> = new Map();
  private config: RuleEngineConfig;
  private evaluationCache: Map<string, { result: boolean; timestamp: number }> = new Map();

  constructor(config?: Partial<RuleEngineConfig>) {
    this.config = {
      maxRules: config?.maxRules ?? 1000,
      maxConditionsPerRule: config?.maxConditionsPerRule ?? 10,
      evaluationTimeoutMs: config?.evaluationTimeoutMs ?? 5000,
      enableCaching: config?.enableCaching ?? true,
      cacheTtlMs: config?.cacheTtlMs ?? 5000,
    };
  }

  addRule(rule: Omit<Rule, 'id' | 'createdAt' | 'updatedAt' | 'triggerCount'>): Rule {
    if (this.rules.size >= this.config.maxRules) {
      throw new Error(`Maximum rule limit (${this.config.maxRules}) reached`);
    }
    if (rule.conditions.length > this.config.maxConditionsPerRule) {
      throw new Error(
        `Maximum conditions per rule (${this.config.maxConditionsPerRule}) exceeded`
      );
    }

    const now = new Date();
    const fullRule: Rule = {
      ...rule,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      triggerCount: 0,
    };
    this.rules.set(fullRule.id, fullRule);
    return fullRule;
  }

  getRule(id: string): Rule | undefined {
    return this.rules.get(id);
  }

  getAllRules(filter?: { enabled?: boolean; priority?: number }): Rule[] {
    let results = Array.from(this.rules.values());
    if (filter?.enabled !== undefined) {
      results = results.filter(r => r.enabled === filter.enabled);
    }
    if (filter?.priority !== undefined) {
      results = results.filter(r => r.priority === filter.priority);
    }
    return results.sort((a, b) => b.priority - a.priority);
  }

  updateRule(id: string, input: Partial<Omit<Rule, 'id' | 'createdAt'>>): Rule | undefined {
    const rule = this.rules.get(id);
    if (!rule) return undefined;

    if (input.name) rule.name = input.name;
    if (input.description !== undefined) rule.description = input.description;
    if (input.enabled !== undefined) rule.enabled = input.enabled;
    if (input.priority !== undefined) rule.priority = input.priority;
    if (input.conditions) rule.conditions = input.conditions;
    if (input.actions) rule.actions = input.actions;
    rule.updatedAt = new Date();
    return rule;
  }

  deleteRule(id: string): boolean {
    return this.rules.delete(id);
  }

  evaluate(context: RuleContext): RuleEvaluationResult[] {
    const enabledRules = Array.from(this.rules.values())
      .filter(r => r.enabled)
      .sort((a, b) => b.priority - a.priority);

    return enabledRules.map(rule => this.evaluateRule(rule, context));
  }

  private evaluateRule(rule: Rule, context: RuleContext): RuleEvaluationResult {
    const start = Date.now();

    const cacheKey = `${rule.id}:${context.deviceId}:${context.metric}:${context.value}`;
    if (this.config.enableCaching) {
      const cached = this.evaluationCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.config.cacheTtlMs) {
        return {
          ruleId: rule.id,
          triggered: cached.result,
          matchedConditions: cached.result ? rule.conditions.length : 0,
          totalConditions: rule.conditions.length,
          actions: cached.result ? rule.actions : [],
          evaluationTimeMs: 0,
        };
      }
    }

    let triggered = false;
    let matchedConditions = 0;

    for (const condition of rule.conditions) {
      const fieldValue = this.getFieldValue(context, condition.field);
      if (this.evaluateCondition(fieldValue, condition)) {
        matchedConditions++;
      }
    }

    triggered = matchedConditions === rule.conditions.length;

    if (triggered) {
      rule.triggerCount++;
      rule.lastTriggeredAt = new Date();
    }

    if (this.config.enableCaching) {
      this.evaluationCache.set(cacheKey, {
        result: triggered,
        timestamp: Date.now(),
      });
    }

    return {
      ruleId: rule.id,
      triggered,
      matchedConditions,
      totalConditions: rule.conditions.length,
      actions: triggered ? rule.actions : [],
      evaluationTimeMs: Date.now() - start,
    };
  }

  private getFieldValue(context: RuleContext, field: string): unknown {
    const fieldMap: Record<string, unknown> = {
      deviceId: context.deviceId,
      metric: context.metric,
      value: context.value,
      timestamp: context.timestamp,
      ...context.metadata,
      ...context.deviceMetadata,
    };
    return fieldMap[field];
  }

  private evaluateCondition(value: unknown, condition: RuleCondition): boolean {
    const { operator } = condition;

    switch (operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'greater_than':
        return (value as number) > (condition.value as number);
      case 'less_than':
        return (value as number) < (condition.value as number);
      case 'greater_equal':
        return (value as number) >= (condition.value as number);
      case 'less_equal':
        return (value as number) <= (condition.value as number);
      case 'contains':
        return String(value).includes(String(condition.value));
      case 'not_contains':
        return !String(value).includes(String(condition.value));
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(value);
      case 'between':
        return (
          (value as number) >= (condition.value as number) &&
          (value as number) <= (condition.value2 as number)
        );
      case 'regex':
        return new RegExp(String(condition.value)).test(String(value));
      default:
        return false;
    }
  }

  evaluateComposite(
    operator: RuleOperator,
    results: boolean[]
  ): boolean {
    switch (operator) {
      case 'and':
        return results.every(r => r);
      case 'or':
        return results.some(r => r);
      case 'not':
        return !results[0];
      default:
        return false;
    }
  }

  getStats(): {
    total: number;
    enabled: number;
    disabled: number;
    totalTriggers: number;
    avgConditionsPerRule: number;
  } {
    const all = Array.from(this.rules.values());
    return {
      total: all.length,
      enabled: all.filter(r => r.enabled).length,
      disabled: all.filter(r => !r.enabled).length,
      totalTriggers: all.reduce((sum, r) => sum + r.triggerCount, 0),
      avgConditionsPerRule:
        all.length > 0
          ? all.reduce((sum, r) => sum + r.conditions.length, 0) / all.length
          : 0,
    };
  }

  clearCache(): void {
    this.evaluationCache.clear();
  }

  clear(): void {
    this.rules.clear();
    this.evaluationCache.clear();
  }

  count(): number {
    return this.rules.size;
  }
}
