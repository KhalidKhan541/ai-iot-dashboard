import { NextRequest, NextResponse } from "next/server";
import { db, genId, now } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { Rule, PaginatedResponse } from "@/types";

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(100, parseInt(url.searchParams.get("pageSize") || "20"));
    const search = url.searchParams.get("search")?.toLowerCase() || "";
    const type = url.searchParams.get("type") || "";
    const enabled = url.searchParams.get("enabled");

    let filtered = [...db.rules];

    if (search) {
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(search) ||
          r.description.toLowerCase().includes(search)
      );
    }
    if (type) filtered = filtered.filter((r) => r.type === type);
    if (enabled !== null && enabled !== undefined) {
      filtered = filtered.filter((r) => r.enabled === (enabled === "true"));
    }

    filtered.sort((a, b) => a.priority - b.priority);

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    const response: PaginatedResponse<Rule> & { summary: Record<string, number> } = {
      data: paged,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      summary: {
        total: db.rules.length,
        enabled: db.rules.filter((r) => r.enabled).length,
        disabled: db.rules.filter((r) => !r.enabled).length,
        automation: db.rules.filter((r) => r.type === "automation").length,
        scheduling: db.rules.filter((r) => r.type === "scheduling").length,
        threshold: db.rules.filter((r) => r.type === "threshold").length,
        composite: db.rules.filter((r) => r.type === "composite").length,
        predictive: db.rules.filter((r) => r.type === "predictive").length,
      },
    };

    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch rules" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    const body = await req.json();
    const { name, description, type, trigger, conditions, actions, priority, cooldownMs } = body;

    if (!name || !type || !trigger) {
      return NextResponse.json(
        { error: "name, type, and trigger are required" },
        { status: 400 }
      );
    }

    const validTypes = ["automation", "scheduling", "threshold", "composite", "predictive"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    if (!trigger.type) {
      return NextResponse.json({ error: "trigger.type is required" }, { status: 400 });
    }

    const validTriggerTypes = ["data-point", "device-status", "alert", "schedule", "manual", "webhook", "time"];
    if (!validTriggerTypes.includes(trigger.type)) {
      return NextResponse.json(
        { error: `Invalid trigger type. Must be one of: ${validTriggerTypes.join(", ")}` },
        { status: 400 }
      );
    }

    if (!Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json({ error: "At least one action is required" }, { status: 400 });
    }

    const validActionTypes = ["send-command", "set-value", "create-alert", "send-notification", "call-webhook", "run-ai", "update-dashboard"];
    for (const action of actions) {
      if (!validActionTypes.includes(action.type)) {
        return NextResponse.json(
          { error: `Invalid action type: ${action.type}. Must be one of: ${validActionTypes.join(", ")}` },
          { status: 400 }
        );
      }
    }

    const timestamp = now();
    const rule: Rule = {
      id: genId(),
      name,
      description: description || "",
      enabled: true,
      type: type as Rule["type"],
      trigger: {
        type: trigger.type,
        config: trigger.config || {},
      },
      conditions: (conditions || []).map((c: Record<string, unknown>) => ({
        type: c.type || "value",
        operator: c.operator,
        config: (c.config as Record<string, unknown>) || {},
        children: c.children,
      })),
      actions: actions.map((a: Record<string, unknown>) => ({
        type: a.type,
        config: (a.config as Record<string, unknown>) || {},
        delayMs: a.delayMs || 0,
      })),
      priority: priority || 5,
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: auth.userId,
      executionCount: 0,
      cooldownMs: cooldownMs || 0,
    };

    db.rules.push(rule);

    db.activityLogs.unshift({
      id: genId(),
      type: "rule",
      action: "created",
      description: `Automation rule "${name}" created`,
      severity: "info",
      metadata: { type, actionCount: actions.length },
      timestamp,
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create rule" }, { status: 500 });
  }
}
