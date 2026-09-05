import { NextRequest, NextResponse } from "next/server";
import { db, now } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(req);
    const idx = db.alerts.findIndex((a) => a.id === params.id);
    if (idx === -1) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    const alert = db.alerts[idx];

    if (alert.status === "resolved") {
      return NextResponse.json(
        { error: "Alert is already resolved" },
        { status: 400 }
      );
    }

    if (alert.status === "acknowledged") {
      return NextResponse.json(
        { error: "Alert is already acknowledged" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const timestamp = now();

    alert.status = "acknowledged";
    alert.acknowledgedBy = auth.userId;
    alert.acknowledgedAt = timestamp;
    alert.metadata = {
      ...alert.metadata,
      acknowledgeNote: body.note || "",
      acknowledgedByName: "Admin User",
    };

    db.activityLogs.unshift({
      id: crypto.randomUUID(),
      type: "alert",
      action: "acknowledged",
      description: `Alert "${alert.title}" acknowledged`,
      deviceId: alert.deviceId,
      severity: "info",
      metadata: { note: body.note || "" },
      timestamp,
    });

    return NextResponse.json(alert);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to acknowledge alert" }, { status: 500 });
  }
}
