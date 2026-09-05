import { NextRequest, NextResponse } from "next/server";
import { db, genId, now } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(req);
    const rule = db.rules.find((r) => r.id === params.id);
    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const testData = body.testData || {};

    const timestamp = now();
    const testResult = simulateRuleExecution(rule, testData);

    db.activityLogs.unshift({
      id: genId(),
      type: "rule",
      action: "tested",
      description: `Rule "${rule.name}" test executed`,
      userId: auth.userId,
      userName: "Admin User",
      severity: testResult.success ? "success" : "warning",
      metadata: { testResult: testResult.success ? "passed" : "failed", ruleId: rule.id },
      timestamp,
    });

    return NextResponse.json({
      ruleId: rule.id,
      ruleName: rule.name,
      testTimestamp: timestamp,
      ...testResult,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Rule test failed" }, { status: 500 });
  }
}

function simulateRuleExecution(
  rule: { trigger: { type: string; config: Record<string, unknown> }; conditions: { type: string; config: Record<string, unknown> }[]; actions: { type: string; config: Record<string, unknown> }[]; type: string },
  testData: Record<string, unknown>
) {
  const results: { action: string; result: string; success: boolean }[] = [];
  let allPassed = true;

  // Simulate trigger evaluation
  const triggerMet = evaluateTrigger(rule.trigger, testData);
  if (!triggerMet) {
    return {
      success: false,
      triggerMet: false,
      message: "Trigger condition not met with provided test data",
      actionResults: [],
      executionTimeMs: Math.round(Math.random() * 50 + 10),
    };
  }

  // Simulate condition evaluation
  const conditionsMet = rule.conditions.length === 0 || rule.conditions.every((c) => evaluateCondition(c, testData));

  // Simulate action execution
  for (const action of rule.actions) {
    const actionResult = simulateAction(action, testData);
    results.push(actionResult);
    if (!actionResult.success) allPassed = false;
  }

  const executionTimeMs = Math.round(Math.random() * 200 + 50);

  return {
    success: allPassed && conditionsMet,
    triggerMet,
    conditionsMet,
    message: allPassed && conditionsMet
      ? "Rule would execute successfully with provided test data"
      : "Rule execution would fail or not trigger with provided test data",
    actionResults: results,
    executionTimeMs,
    warnings: !conditionsMet ? ["Some conditions were not met"] : [],
  };
}

function evaluateTrigger(trigger: { type: string; config: Record<string, unknown> }, data: Record<string, unknown>): boolean {
  switch (trigger.type) {
    case "data-point":
      return data.value !== undefined || data.metric !== undefined;
    case "device-status":
      return data.status !== undefined;
    case "alert":
      return data.alertSeverity !== undefined;
    case "schedule":
      return true; // Schedule triggers always pass in test
    case "manual":
      return true;
    case "webhook":
      return data.webhookPayload !== undefined;
    case "time":
      return true;
    default:
      return true;
  }
}

function evaluateCondition(condition: { type: string; config: Record<string, unknown> }, data: Record<string, unknown>): boolean {
  switch (condition.type) {
    case "value": {
      const value = data.value as number | undefined;
      const threshold = condition.config.value as number | undefined;
      const operator = condition.config.operator as string;
      if (value === undefined || threshold === undefined) return true;
      switch (operator) {
        case "gt": return value > threshold;
        case "lt": return value < threshold;
        case "gte": return value >= threshold;
        case "lte": return value <= threshold;
        case "eq": return value === threshold;
        case "neq": return value !== threshold;
        default: return true;
      }
    }
    case "time":
      return true;
    case "device":
      return true;
    case "state":
      return true;
    case "compound":
      return true;
    default:
      return true;
  }
}

function simulateAction(
  action: { type: string; config: Record<string, unknown> },
  data: Record<string, unknown>
): { action: string; result: string; success: boolean; details: Record<string, unknown> } {
  const actionType = action.type;

  switch (actionType) {
    case "send-command":
      return {
        action: actionType,
        result: `Would send command "${action.config.command || 'test_cmd'}" to device ${action.config.deviceId || 'dev-test'}`,
        success: true,
        details: { command: action.config.command, deviceId: action.config.deviceId },
      };
    case "set-value":
      return {
        action: actionType,
        result: `Would set ${action.config.metric || 'metric'} to ${action.config.value || 'test_value'} on device ${action.config.deviceId || 'dev-test'}`,
        success: true,
        details: { metric: action.config.metric, value: action.config.value },
      };
    case "create-alert":
      return {
        action: actionType,
        result: `Would create ${action.config.severity || 'info'} alert: "${action.config.message || 'Test alert'}"`,
        success: true,
        details: { severity: action.config.severity },
      };
    case "send-notification":
      return {
        action: actionType,
        result: `Would send notification: "${action.config.title || 'Test notification'}"`,
        success: true,
        details: { title: action.config.title },
      };
    case "call-webhook":
      return {
        action: actionType,
        result: `Would call webhook at ${action.config.url || 'https://test.webhook'}`,
        success: true,
        details: { url: action.config.url },
      };
    case "run-ai":
      return {
        action: actionType,
        result: `Would execute AI action: ${action.config.action || 'analyze'}`,
        success: true,
        details: { action: action.config.action },
      };
    case "update-dashboard":
      return {
        action: actionType,
        result: `Would update dashboard widget ${action.config.widgetId || 'widget-test'}`,
        success: true,
        details: { widgetId: action.config.widgetId },
      };
    default:
      return {
        action: actionType,
        result: `Unknown action type: ${actionType}`,
        success: false,
        details: {},
      };
  }
}
