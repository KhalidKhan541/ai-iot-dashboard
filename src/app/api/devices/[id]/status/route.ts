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

    const url = new URL(req.url);
    const detailed = url.searchParams.get("detailed") === "true";

    const uptime = calculateUptime(device);
    const lastDataPoint = db.dataPoints
      .filter((dp) => dp.deviceId === params.id)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

    const recentCommands = db.commands
      .filter((c) => c.deviceId === params.id)
      .slice(0, 10);

    const commandSuccessRate = recentCommands.length > 0
      ? (recentCommands.filter((c) => c.status === "completed").length / recentCommands.length) * 100
      : 100;

    const activeAlerts = db.alerts.filter(
      (a) => a.deviceId === params.id && a.status === "active"
    );

    const statusResponse: Record<string, unknown> = {
      deviceId: device.id,
      deviceName: device.name,
      currentStatus: device.status,
      lastSeen: device.lastSeen,
      uptime,
      signalStrength: device.status === "online" ? 85 + Math.random() * 15 : 0,
      batteryLevel: device.type === "sensor" ? 60 + Math.random() * 40 : null,
      firmwareVersion: device.firmware,
      protocol: device.protocol,
      ipAddress: device.status === "online" ? `192.168.1.${100 + parseInt(params.id.replace(/\D/g, "") || "1") % 50}` : null,
      macAddress: device.status === "online" ? `AA:BB:CC:DD:EE:${params.id.slice(-2).toUpperCase()}` : null,
      lastDataPointTimestamp: lastDataPoint?.timestamp || null,
      commandSuccessRate: Math.round(commandSuccessRate * 10) / 10,
      activeAlerts: activeAlerts.length,
      timestamp: now(),
    };

    if (detailed) {
      statusResponse.recentCommands = recentCommands;
      statusResponse.networkStats = {
        packetsSent: Math.floor(Math.random() * 10000),
        packetsReceived: Math.floor(Math.random() * 9500),
        packetsLost: Math.floor(Math.random() * 50),
        avgLatencyMs: Math.round(Math.random() * 20 + 5),
        bandwidth: {
          up: Math.round(Math.random() * 1000) + " KB/s",
          down: Math.round(Math.random() * 5000) + " KB/s",
        },
      };
      statusResponse.systemInfo = {
        cpuUsage: Math.round(Math.random() * 30 + 10) + "%",
        memoryUsage: Math.round(Math.random() * 40 + 30) + "%",
        storageUsage: Math.round(Math.random() * 20 + 10) + "%",
        temperature: Math.round(Math.random() * 15 + 25) + "°C",
        uptime: `${Math.floor(Math.random() * 30)}d ${Math.floor(Math.random() * 24)}h`,
      };
    }

    return NextResponse.json(statusResponse);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch device status" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAuth(req);
    const device = db.devices.find((d) => d.id === params.id);
    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    const body = await req.json();
    const { status } = body;

    const validStatuses = ["online", "offline", "warning", "error", "maintenance", "provisioning"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const prevStatus = device.status;
    device.status = status;
    device.updatedAt = now();
    if (status === "online") device.lastSeen = now();

    db.activityLogs.unshift({
      id: crypto.randomUUID(),
      type: "device",
      action: "status_change",
      description: `${device.name} status changed from ${prevStatus} to ${status}`,
      deviceId: device.id,
      deviceName: device.name,
      severity: status === "error" ? "error" : status === "offline" ? "warning" : "info",
      metadata: { from: prevStatus, to: status },
      timestamp: now(),
    });

    return NextResponse.json(device);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update device status" }, { status: 500 });
  }
}

function calculateUptime(device: { lastSeen: string; status: string }): number {
  if (device.status === "offline") return 0;
  const lastSeen = new Date(device.lastSeen).getTime();
  const nowMs = Date.now();
  const diff = nowMs - lastSeen;
  if (diff > 600000) return Math.max(0, 99 - Math.floor(diff / 3600000));
  return 99.9;
}
