import { NextRequest, NextResponse } from "next/server";
import { db, genId, now } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { AlertRule, PaginatedResponse } from "@/types";

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(100, parseInt(url.searchParams.get("pageSize") || "20"));
    const enabled = url.searchParams.get("enabled");
    const search = url.searchParams.get("search")?.toLowerCase() || "";
    const metric = url.searchParams.get("metric") || "";

    let filtered = [...db.alertRules];

    if (enabled !== null && enabled !== undefined) {
      filtered = filtered.filter((r) => r.enabled === (enabled === "true"));
    }
    if (search) {
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(search) ||
          r.description.toLowerCase().includes(search)
      );
    }
    if (metric) {
      filtered = filtered.filter((r) => r.metric === metric);
    }

    filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    const response: PaginatedResponse<AlertRule> = {
      data: paged,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };

    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch alert rules" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    const body = await req.json();
    const { name, description, metric, condition, severity, cooldownMs, notificationChannels, deviceType, deviceId } = body;

    if (!name || !metric || !condition || !severity) {
      return NextResponse.json(
        { error: "name, metric, condition, and severity are required" },
        { status: 400 }
      );
    }

    if (!condition.operator || condition.value === undefined) {
      return NextResponse.json(
        { error: "condition.operator and condition.value are required" },
        { status: 400 }
      );
    }

    const validOps = ["gt", "lt", "gte", "lte", "eq", "neq", "between", "outside"];
    if (!validOps.includes(condition.operator)) {
      return NextResponse.json(
        { error: `Invalid operator. Must be one of: ${validOps.join(", ")}` },
        { status: 400 }
      );
    }

    const timestamp = now();
    const rule: AlertRule = {
      id: genId(),
      name,
      description: description || "",
      enabled: true,
      deviceId: deviceId || undefined,
      deviceType: deviceType || undefined,
      metric,
      condition: {
        operator: condition.operator,
        value: Number(condition.value),
        value2: condition.value2 !== undefined ? Number(condition.value2) : undefined,
        durationMs: condition.durationMs || 0,
      },
      severity,
      cooldownMs: cooldownMs || 3600000,
      notificationChannels: notificationChannels || [],
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: auth.userId,
      triggerCount: 0,
    };

    db.alertRules.push(rule);

    db.activityLogs.unshift({
      id: genId(),
      type: "alert",
      action: "rule_created",
      description: `Alert rule "${name}" created`,
      severity: "info",
      metadata: { metric, severity },
      timestamp,
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create alert rule" }, { status: 500 });
  }
}
