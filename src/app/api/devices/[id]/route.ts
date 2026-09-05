import { NextRequest, NextResponse } from "next/server";
import { db, now } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAuth(req);
    const device = db.devices.find((d) => d.id === params.id);
    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }
    const recentDataPoints = db.dataPoints
      .filter((dp) => dp.deviceId === params.id)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 10);
    const activeAlerts = db.alerts.filter(
      (a) => a.deviceId === params.id && a.status === "active"
    );
    const recentCommands = db.commands
      .filter((c) => c.deviceId === params.id)
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
      .slice(0, 5);
    return NextResponse.json({
      ...device,
      recentDataPoints,
      activeAlerts,
      recentCommands,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch device" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAuth(req);
    const idx = db.devices.findIndex((d) => d.id === params.id);
    if (idx === -1) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }
    const body = await req.json();
    const allowed = ["name", "type", "status", "protocol", "manufacturer", "model", "firmware", "location", "groupId", "tags", "config", "metadata"];
    const timestamp = now();

    for (const key of allowed) {
      if (body[key] !== undefined) {
        if (key === "config") {
          db.devices[idx].config = { ...db.devices[idx].config, ...body.config };
        } else if (key === "metadata") {
          db.devices[idx].metadata = { ...db.devices[idx].metadata, ...body.metadata };
        } else {
          (db.devices[idx] as Record<string, unknown>)[key] = body[key];
        }
      }
    }
    db.devices[idx].updatedAt = timestamp;

    db.activityLogs.unshift({
      id: crypto.randomUUID(),
      type: "device",
      action: "updated",
      description: `Device "${db.devices[idx].name}" updated`,
      deviceId: db.devices[idx].id,
      deviceName: db.devices[idx].name,
      severity: "info",
      metadata: { updatedFields: Object.keys(body) },
      timestamp,
    });

    return NextResponse.json(db.devices[idx]);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update device" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAuth(req);
    const idx = db.devices.findIndex((d) => d.id === params.id);
    if (idx === -1) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }
    const device = db.devices[idx];

    const softDelete = req.nextUrl.searchParams.get("soft") === "true";
    if (softDelete) {
      db.devices[idx].status = "maintenance";
      db.devices[idx].updatedAt = now();
      return NextResponse.json({ success: true, message: "Device soft-deleted (set to maintenance)" });
    }

    db.devices.splice(idx, 1);
    db.dataPoints = db.dataPoints.filter((dp) => dp.deviceId !== params.id);
    db.commands = db.commands.filter((c) => c.deviceId !== params.id);
    db.alerts = db.alerts.filter((a) => a.deviceId !== params.id);

    db.activityLogs.unshift({
      id: crypto.randomUUID(),
      type: "device",
      action: "deleted",
      description: `Device "${device.name}" permanently deleted`,
      deviceId: device.id,
      deviceName: device.name,
      severity: "warning",
      metadata: { type: device.type },
      timestamp: now(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to delete device" }, { status: 500 });
  }
}
