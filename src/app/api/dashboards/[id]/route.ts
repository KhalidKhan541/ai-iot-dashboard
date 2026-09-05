import { NextRequest, NextResponse } from "next/server";
import { db, now } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAuth(req);
    const dashboard = db.dashboards.find((d) => d.id === params.id);
    if (!dashboard) {
      return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
    }

    const enrichedWidgets = dashboard.widgets.map((widget) => {
      const liveData = widget.dataSource.deviceIds.map((devId) => {
        const device = db.devices.find((d) => d.id === devId);
        const latestPoints = db.dataPoints
          .filter((dp) => dp.deviceId === devId && widget.dataSource.metrics.includes(dp.metric))
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
          .slice(0, 50);
        return {
          deviceId: devId,
          deviceName: device?.name || "Unknown",
          deviceStatus: device?.status || "unknown",
          dataPoints: latestPoints,
        };
      });
      return { ...widget, liveData };
    });

    return NextResponse.json({ ...dashboard, widgets: enrichedWidgets });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch dashboard" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAuth(req);
    const idx = db.dashboards.findIndex((d) => d.id === params.id);
    if (idx === -1) {
      return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
    }

    const body = await req.json();
    const allowed = ["name", "description", "layout", "widgets", "isDefault", "isPublic", "sharedWith", "tags", "refreshIntervalMs"];
    const timestamp = now();

    for (const key of allowed) {
      if (body[key] !== undefined) {
        (db.dashboards[idx] as Record<string, unknown>)[key] = body[key];
      }
    }
    db.dashboards[idx].updatedAt = timestamp;

    return NextResponse.json(db.dashboards[idx]);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update dashboard" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAuth(req);
    const idx = db.dashboards.findIndex((d) => d.id === params.id);
    if (idx === -1) {
      return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
    }

    const dashboard = db.dashboards[idx];
    if (dashboard.isDefault) {
      return NextResponse.json({ error: "Cannot delete the default dashboard" }, { status: 400 });
    }

    db.dashboards.splice(idx, 1);

    db.activityLogs.unshift({
      id: crypto.randomUUID(),
      type: "system",
      action: "dashboard_deleted",
      description: `Dashboard "${dashboard.name}" deleted`,
      severity: "warning",
      metadata: {},
      timestamp: now(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to delete dashboard" }, { status: 500 });
  }
}
