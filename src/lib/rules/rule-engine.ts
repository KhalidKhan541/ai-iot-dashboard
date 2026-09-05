/**
 * Rule engine for IoT automation and alerting.
 * Create/edit/delete rules, evaluate conditions (AND/OR/NOT),
 * execute actions, chain rules, and manage templates.
 */

import crypto from "crypto";

// ── Types ────────────────────────────────────────────────────────────────────

export interface Rule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  conditions: ConditionGroup;
  actions: Action[];
  chain?: RuleChain;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  lastTriggeredAt?: Date;
  triggerCount: number;
  metadata?: Record<string, unknown>;
}

export interface ConditionGroup {
  logic: "AND" | "OR" | "NOT";
  conditions: (Condition | ConditionGroup)[];
}

export interface Condition {
  type: "threshold" | "comparison" | "rate_of_change" | "absence" | "presence" | "compound";
  deviceId?: string;
  metric: string;
  operator: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "between" | "inside" | "changes";
  value: number | string | [number, number];
  duration?: number;
  unit?: "seconds" | "minutes" | "hours" | "days";
}

export interface Action {
  type: "webhook" | "email" | "sms" | "push" | "device_command" | "lambda" | "log" | "chain";
  config: ActionConfig;
  delay?: number;
  condition?: ConditionGroup;
}

export type ActionConfig =
  | WebhookConfig
  | EmailConfig
  | SMSConfig
  | PushConfig
  | DeviceCommandConfig
  | LambdaConfig
  | LogConfig
  | ChainConfig;

export interface WebhookConfig {
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  timeout?: number;
  retryCount?: number;
}

export interface EmailConfig {
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  isHtml?: boolean;
  attachments?: { filename: string; content: string }[];
}

export interface SMSConfig {
  to: string[];
  message: string;
}

export interface PushConfig {
  title: string;
  body: string;
  url?: string;
  deviceIds?: string[];
  priority: "low" | "normal" | "high";
}

export interface DeviceCommandConfig {
  deviceId: string;
  command: string;
  params?: Record<string, unknown>;
  timeout?: number;
}

export interface LambdaConfig {
  functionId: string;
  payload: Record<string, unknown>;
  timeout?: number;
}

export interface LogConfig {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  includeData?: boolean;
}

export interface ChainConfig {
  ruleId: string;
  passData?: boolean;
}

export interface RuleChain {
  nextRuleId: string;
  delay?: number;
  condition?: ConditionGroup;
  maxDepth?: number;
}

export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  rule: Omit<Rule, "id" | "createdAt" | "updatedAt" | "triggerCount">;
  variables: TemplateVariable[];
}

export interface TemplateVariable {
  name: string;
  type: "string" | "number" | "boolean";
  description: string;
  defaultValue: string | number | boolean;
  required: boolean;
}

export interface RuleTestResult {
  ruleId: string;
  passed: boolean;
  evaluations: ConditionEvaluation[];
  actionsExecuted: ActionTestResult[];
  executionTimeMs: number;
  error?: string;
}

export interface ConditionEvaluation {
  condition: Condition | ConditionGroup;
  result: boolean;
  actualValue?: unknown;
  expectedValue?: unknown;
  reason: string;
}

export interface ActionTestResult {
  action: Action;
  executed: boolean;
  simulated: boolean;
  result?: unknown;
  error?: string;
}

export interface RuleContext {
  deviceId: string;
  metric: string;
  value: number;
  timestamp: Date;
  previousValue?: number;
  metadata?: Record<string, unknown>;
}

export interface RuleEvaluationResult {
  ruleId: string;
  triggered: boolean;
  conditionsMet: boolean;
  actionsTriggered: number;
  chainActivated: boolean;
  executionTimeMs: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function evaluateCondition(
  condition: Condition | ConditionGroup,
  data: Map<string, { current: number; previous?: number; timestamp: Date }>
): { result: boolean; evaluations: ConditionEvaluation[] } {
  if ("logic" in condition) {
    return evaluateConditionGroup(condition, data);
  }
  return evaluateSingleCondition(condition, data);
}

function evaluateConditionGroup(
  group: ConditionGroup,
  data: Map<string, { current: number; previous?: number; timestamp: Date }>
): { result: boolean; evaluations: ConditionEvaluation[] } {
  const evaluations: ConditionEvaluation[] = [];
  let result: boolean;

  switch (group.logic) {
    case "AND": {
      result = true;
      for (const cond of group.conditions) {
        const evalResult = evaluateCondition(cond, data);
        evaluations.push(...evalResult.evaluations);
        if (!evalResult.result) {
          result = false;
        }
      }
      break;
    }
    case "OR": {
      result = false;
      for (const cond of group.conditions) {
        const evalResult = evaluateCondition(cond, data);
        evaluations.push(...evalResult.evaluations);
        if (evalResult.result) {
          result = true;
          break;
        }
      }
      break;
    }
    case "NOT": {
      if (group.conditions.length > 0) {
        const evalResult = evaluateCondition(group.conditions[0], data);
        evaluations.push(...evalResult.evaluations);
        result = !evalResult.result;
      } else {
        result = true;
      }
      break;
    }
  }

  return { result, evaluations };
}

function evaluateSingleCondition(
  condition: Condition,
  data: Map<string, { current: number; previous?: number; timestamp: Date }>
): { result: boolean; evaluations: ConditionEvaluation[] } {
  const key = `${condition.deviceId ?? "*"}:${condition.metric}`;
  const entry = data.get(key) ?? data.get(`*:/${condition.metric}`);
  const evaluations: ConditionEvaluation[] = [];

  if (!entry) {
    evaluations.push({
      condition,
      result: false,
      reason: `No data available for ${condition.metric}`,
    });
    return { result: false, evaluations };
  }

  const val = entry.current;
  let result = false;
  let reason = "";

  switch (condition.operator) {
    case "eq":
      result = val === (condition.value as number);
      reason = `${val} == ${condition.value}`;
      break;
    case "neq":
      result = val !== (condition.value as number);
      reason = `${val} != ${condition.value}`;
      break;
    case "gt":
      result = val > (condition.value as number);
      reason = `${val} > ${condition.value}`;
      break;
    case "lt":
      result = val < (condition.value as number);
      reason = `${val} < ${condition.value}`;
      break;
    case "gte":
      result = val >= (condition.value as number);
      reason = `${val} >= ${condition.value}`;
      break;
    case "lte":
      result = val <= (condition.value as number);
      reason = `${val} <= ${condition.value}`;
      break;
    case "between": {
      const [low, high] = condition.value as [number, number];
      result = val >= low && val <= high;
      reason = `${val} between [${low}, ${high}]`;
      break;
    }
    case "inside": {
      const [low2, high2] = condition.value as [number, number];
      result = val < low2 || val > high2;
      reason = `${val} outside [${low2}, ${high2}]`;
      break;
    }
    case "changes": {
      if (entry.previous !== undefined) {
        const diff = Math.abs(val - entry.previous);
        result = diff > (condition.value as number);
        reason = `|${val} - ${entry.previous}| = ${diff} > ${condition.value}`;
      } else {
        result = false;
        reason = "No previous value available for change detection";
      }
      break;
    }
  }

  evaluations.push({
    condition,
    result,
    actualValue: val,
    expectedValue: condition.value,
    reason,
  });

  return { result, evaluations };
}

// ── RuleEngine ───────────────────────────────────────────────────────────────

export class RuleEngine {
  private rules = new Map<string, Rule>();
  private templates = new Map<string, RuleTemplate>();
  private executionLog: { ruleId: string; timestamp: Date; result: RuleEvaluationResult }[] = [];

  constructor() {
    this.registerBuiltinTemplates();
  }

  createRule(
    rule: Omit<Rule, "id" | "createdAt" | "updatedAt" | "triggerCount">
  ): Rule {
    const id = crypto.randomUUID();
    const newRule: Rule = {
      ...rule,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      triggerCount: 0,
    };
    this.rules.set(id, newRule);
    return newRule;
  }

  updateRule(id: string, updates: Partial<Omit<Rule, "id" | "createdAt">>): Rule | null {
    const existing = this.rules.get(id);
    if (!existing) return null;

    const updated: Rule = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.rules.set(id, updated);
    return updated;
  }

  deleteRule(id: string): boolean {
    return this.rules.delete(id);
  }

  getRule(id: string): Rule | undefined {
    return this.rules.get(id);
  }

  getAllRules(): Rule[] {
    return Array.from(this.rules.values());
  }

  getEnabledRules(): Rule[] {
    return this.getAllRules().filter((r) => r.enabled);
  }

  getRulesByTag(tag: string): Rule[] {
    return this.getAllRules().filter((r) => r.tags.includes(tag));
  }

  async evaluate(
    context: RuleContext,
    data: Map<string, { current: number; previous?: number; timestamp: Date }>
  ): Promise<RuleEvaluationResult[]> {
    const results: RuleEvaluationResult[] = [];
    const enabledRules = this.getEnabledRules().sort((a, b) => b.priority - a.priority);

    for (const rule of enabledRules) {
      const start = Date.now();
      const { result: conditionsMet, evaluations } = evaluateCondition(rule.conditions, data);

      let actionsTriggered = 0;
      let chainActivated = false;

      if (conditionsMet) {
        for (const action of rule.actions) {
          if (action.condition) {
            const { result: actionConditionMet } = evaluateCondition(action.condition, data);
            if (!actionConditionMet) continue;
          }

          actionsTriggered++;

          if (action.type === "chain" && rule.chain) {
            chainActivated = true;
          }
        }

        rule.lastTriggeredAt = new Date();
        rule.triggerCount++;
        this.rules.set(rule.id, rule);
      }

      const result: RuleEvaluationResult = {
        ruleId: rule.id,
        triggered: conditionsMet,
        conditionsMet,
        actionsTriggered,
        chainActivated,
        executionTimeMs: Date.now() - start,
      };

      results.push(result);
      this.executionLog.push({ ruleId: rule.id, timestamp: new Date(), result });
    }

    return results;
  }

  async evaluateConditionandalone(
    condition: ConditionGroup,
    data: Map<string, { current: number; previous?: number; timestamp: Date }>
  ): Promise<{ result: boolean; evaluations: ConditionEvaluation[] }> {
    return evaluateCondition(condition, data);
  }

  testRule(
    ruleId: string,
    testData: Map<string, { current: number; previous?: number; timestamp: Date }>,
    simulateActions: boolean = true
  ): RuleTestResult {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      return {
        ruleId,
        passed: false,
        evaluations: [],
        actionsExecuted: [],
        executionTimeMs: 0,
        error: `Rule ${ruleId} not found`,
      };
    }

    const start = Date.now();
    const { result: conditionsMet, evaluations } = evaluateCondition(rule.conditions, testData);

    const actionsExecuted: ActionTestResult[] = rule.actions.map((action) => ({
      action,
      executed: conditionsMet,
      simulated: simulateActions,
      result: simulateActions ? { simulated: true, wouldExecute: action.type } : undefined,
    }));

    return {
      ruleId,
      passed: conditionsMet,
      evaluations,
      actionsExecuted,
      executionTimeMs: Date.now() - start,
    };
  }

  chainRules(
    ruleId: string,
    chainConfig: RuleChain
  ): { success: boolean; chainLength: number; error?: string } {
    const rule = this.rules.get(ruleId);
    if (!rule) return { success: false, chainLength: 0, error: "Rule not found" };

    const targetRule = this.rules.get(chainConfig.nextRuleId);
    if (!targetRule) return { success: false, chainLength: 0, error: "Target rule not found" };

    rule.chain = chainConfig;
    this.rules.set(ruleId, rule);

    const maxDepth = chainConfig.maxDepth ?? 5;
    let chainLength = 1;
    let current = targetRule;
    const visited = new Set<string>([ruleId]);

    while (current.chain && chainLength < maxDepth) {
      if (visited.has(current.chain.nextRuleId)) {
        return { success: false, chainLength, error: "Circular chain detected" };
      }
      visited.add(current.chain.nextRuleId);
      current = this.rules.get(current.chain.nextRuleId)!;
      if (!current) break;
      chainLength++;
    }

    return { success: true, chainLength };
  }

  getExecutionLog(ruleId?: string, limit: number = 100): { ruleId: string; timestamp: Date; result: RuleEvaluationResult }[] {
    let log = this.executionLog;
    if (ruleId) {
      log = log.filter((e) => e.ruleId === ruleId);
    }
    return log.slice(-limit);
  }

  getTemplates(): RuleTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplate(id: string): RuleTemplate | undefined {
    return this.templates.get(id);
  }

  createRuleFromTemplate(
    templateId: string,
    variables: Record<string, string | number | boolean>
  ): Rule | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    const ruleJson = JSON.stringify(template.rule);
    let processedJson = ruleJson;

    for (const [name, value] of Object.entries(variables)) {
      const pattern = new RegExp(`\\{\\{${name}\\}\\}`, "g");
      processedJson = processedJson.replace(pattern, String(value));
    }

    const processed = JSON.parse(processedJson) as Omit<Rule, "id" | "createdAt" | "updatedAt" | "triggerCount">;
    return this.createRule(processed);
  }

  createTemplate(
    template: Omit<RuleTemplate, "id">
  ): RuleTemplate {
    const id = crypto.randomUUID();
    const newTemplate: RuleTemplate = { ...template, id };
    this.templates.set(id, newTemplate);
    return newTemplate;
  }

  private registerBuiltinTemplates(): void {
    this.createTemplate({
      name: "Temperature Alert",
      description: "Alert when temperature exceeds threshold",
      category: "monitoring",
      rule: {
        name: "Temperature Alert - {{threshold}}°C",
        description: "Triggers when {{metric}} exceeds {{threshold}} on {{deviceId}}",
        enabled: true,
        priority: 5,
        conditions: {
          logic: "AND",
          conditions: [
            {
              type: "threshold",
              deviceId: "{{deviceId}}",
              metric: "{{metric}}",
              operator: "gt",
              value: "{{threshold}}",
            },
          ],
        },
        actions: [
          {
            type: "email",
            config: {
              to: ["{{email}}"],
              subject: "Temperature Alert: {{deviceId}}",
              body: "Temperature exceeded {{threshold}}°C on device {{deviceId}}. Current value: {{value}}",
            },
          },
        ],
        tags: ["temperature", "alert"],
      },
      variables: [
        { name: "deviceId", type: "string", description: "Target device", defaultValue: "", required: true },
        { name: "metric", type: "string", description: "Metric to monitor", defaultValue: "temperature", required: false },
        { name: "threshold", type: "number", description: "Alert threshold", defaultValue: 35, required: true },
        { name: "email", type: "string", description: "Alert email", defaultValue: "", required: true },
      ],
    });

    this.createTemplate({
      name: "Device Offline Alert",
      description: "Alert when device goes offline",
      category: "monitoring",
      rule: {
        name: "Device Offline - {{deviceId}}",
        description: "Triggers when {{deviceId}} reports offline status",
        enabled: true,
        priority: 10,
        conditions: {
          logic: "AND",
          conditions: [
            {
              type: "threshold",
              deviceId: "{{deviceId}}",
              metric: "status",
              operator: "eq",
              value: "offline",
            },
          ],
        },
        actions: [
          {
            type: "push",
            config: {
              title: "Device Offline",
              body: "Device {{deviceId}} has gone offline",
              priority: "high",
            },
          },
        ],
        tags: ["offline", "connectivity"],
      },
      variables: [
        { name: "deviceId", type: "string", description: "Target device", defaultValue: "", required: true },
      ],
    });

    this.createTemplate({
      name: "Rate of Change Alert",
      description: "Alert on rapid metric changes",
      category: "anomaly",
      rule: {
        name: "Rate of Change - {{metric}} on {{deviceId}}",
        description: "Triggers when {{metric}} changes by more than {{threshold}} on {{deviceId}}",
        enabled: true,
        priority: 7,
        conditions: {
          logic: "AND",
          conditions: [
            {
              type: "threshold",
              deviceId: "{{deviceId}}",
              metric: "{{metric}}",
              operator: "changes",
              value: "{{threshold}}",
            },
          ],
        },
        actions: [
          {
            type: "webhook",
            config: {
              url: "{{webhookUrl}}",
              method: "POST",
              body: {
                event: "rate_of_change",
                deviceId: "{{deviceId}}",
                metric: "{{metric}}",
                threshold: "{{threshold}}",
              },
            },
          },
        ],
        tags: ["anomaly", "rate-of-change"],
      },
      variables: [
        { name: "deviceId", type: "string", description: "Target device", defaultValue: "", required: true },
        { name: "metric", type: "string", description: "Metric to monitor", defaultValue: "temperature", required: true },
        { name: "threshold", type: "number", description: "Change threshold", defaultValue: 10, required: true },
        { name: "webhookUrl", type: "string", description: "Webhook URL", defaultValue: "", required: true },
      ],
    });
  }
}
