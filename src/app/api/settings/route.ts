import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db, now } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
    return NextResponse.json(db.settings);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    requireAuth(req);
    const body = await req.json();
    const timestamp = now();

    if (body.profile) {
      db.settings.profile = { ...db.settings.profile, ...body.profile };
    }
    if (body.notifications) {
      db.settings.notifications = { ...db.settings.notifications, ...body.notifications };
    }
    if (body.security) {
      db.settings.security = { ...db.settings.security, ...body.security };
    }
    if (body.display) {
      db.settings.display = { ...db.settings.display, ...body.display };
    }
    if (body.dashboard) {
      db.settings.dashboard = { ...db.settings.dashboard, ...body.dashboard };
    }

    db.activityLogs.unshift({
      id: crypto.randomUUID(),
      type: "user",
      action: "settings_updated",
      description: "User settings updated",
      severity: "info",
      metadata: { updatedSections: Object.keys(body) },
      timestamp,
    });

    return NextResponse.json(db.settings);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
