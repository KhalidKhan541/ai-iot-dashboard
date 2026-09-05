import { NextRequest, NextResponse } from "next/server";
import { db, now } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAuth(req);
    const rule = db.rules.find((r) => r.id === params.id);
    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    const executionHistory = db.activityLogs.filter(
      (l) => l.type === "rule" && l.metadata.ruleId === params.id
    ).slice(0, 20);

    return NextResponse.json({ ...rule, executionHistory });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch rule" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAuth(req);
    const idx = db.rules.findIndex((r) => r.id === params.id);
    if (idx === -1) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    const body = await req.json();
    const allowed = ["name", "description", "enabled", "type", "trigger", "conditions", "actions", "priority", "cooldownMs"];
    const timestamp = now();

    for (const key of allowed) {
      if (body[key] !== undefined) {
        (db.rules[idx] as Record<string, unknown>)[key] = body[key];
      }
    }
    db.rules[idx].updatedAt = timestamp;

    db.activityLogs.unshift({
      id: crypto.randomUUID(),
      type: "rule",
      action: "updated",
      description: `Rule "${db.rules[idx].name}" updated`,
      severity: "info",
      metadata: { updatedFields: Object.keys(body) },
      timestamp,
    });

    return NextResponse.json(db.rules[idx]);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update rule" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAuth(req);
    const idx = db.rules.findIndex((r) => r.id === params.id);
    if (idx === -1) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    const rule = db.rules[idx];
    db.rules.splice(idx, 1);

    db.activityLogs.unshift({
      id: crypto.randomUUID(),
      type: "rule",
      action: "deleted",
      description: `Rule "${rule.name}" deleted`,
      severity: "warning",
      metadata: { type: rule.type },
      timestamp: now(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to delete rule" }, { status: 500 });
  }
}
