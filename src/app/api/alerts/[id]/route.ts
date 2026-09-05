import { NextRequest, NextResponse } from "next/server";
import { db, now } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAuth(req);
    const alert = db.alerts.find((a) => a.id === params.id);
    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }
    const device = db.devices.find((d) => d.id === alert.deviceId);
    const rule = db.alertRules.find((r) => r.id === alert.ruleId);

    return NextResponse.json({
      ...alert,
      deviceName: device?.name || "Unknown",
      deviceLocation: device?.location || "",
      ruleName: rule?.name || "Unknown",
      relatedAlerts: db.alerts.filter(
        (a) => a.id !== params.id && (a.deviceId === alert.deviceId || a.ruleId === alert.ruleId)
      ).slice(0, 5),
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch alert" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAuth(req);
    const idx = db.alerts.findIndex((a) => a.id === params.id);
    if (idx === -1) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }
    const body = await req.json();
    const allowed = ["severity", "title", "message", "status"];
    const timestamp = now();

    for (const key of allowed) {
      if (body[key] !== undefined) {
        (db.alerts[idx] as Record<string, unknown>)[key] = body[key];
      }
    }

    if (body.status === "resolved" && !db.alerts[idx].resolvedAt) {
      db.alerts[idx].resolvedAt = timestamp;
    }

    return NextResponse.json(db.alerts[idx]);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update alert" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAuth(req);
    const idx = db.alerts.findIndex((a) => a.id === params.id);
    if (idx === -1) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }
    db.alerts.splice(idx, 1);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to delete alert" }, { status: 500 });
  }
}
