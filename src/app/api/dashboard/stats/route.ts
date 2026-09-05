import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { DashboardStats } from "@/types";

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);

    const totalDevices = db.devices.length;
    const onlineDevices = db.devices.filter((d) => d.status === "online").length;
    const offlineDevices = db.devices.filter((d) => d.status === "offline").length;
    const warningDevices = db.devices.filter((d) => d.status === "warning").length;
    const errorDevices = db.devices.filter((d) => d.status === "error").length;
    const activeAlerts = db.alerts.filter((a) => a.status === "active").length;
    const criticalAlerts = db.alerts.filter(
      (a) => a.severity === "critical" && a.status === "active"
    ).length;
    const resolvedToday = db.alerts.filter(
      (a) => a.status === "resolved" && a.resolvedAt && isToday(a.resolvedAt)
    ).length;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStr = todayStart.toISOString();
    const dataPointsToday = db.dataPoints.filter((dp) => dp.timestamp >= todayStr).length;
    const dataPointsTotal = db.dataPoints.length;

    const recentCommands = db.commands.slice(-100);
    const commandSuccessRate = recentCommands.length > 0
      ? Math.round(
          (recentCommands.filter((c) => c.status === "completed").length / recentCommands.length) * 1000
        ) / 10
      : 100;

    const onlinePercent = totalDevices > 0
      ? Math.round((onlineDevices / totalDevices) * 1000) / 10
      : 0;

    const totalStorage = 10 * 1024 * 1024 * 1024;
    const storageUsed = Math.round(dataPointsTotal * 256);
    const storageTotal = totalStorage;

    const aiQueriesToday = db.activityLogs.filter(
      (l) => l.type === "ai" && isToday(l.timestamp)
    ).length;

    const stats: DashboardStats = {
      totalDevices,
      onlineDevices,
      offlineDevices,
      warningDevices,
      errorDevices,
      activeAlerts,
      criticalAlerts,
      resolvedToday,
      dataPointsToday,
      dataPointsTotal,
      commandSuccessRate,
      uptime: onlinePercent,
      storageUsed,
      storageTotal,
      aiQueriesToday,
      aiCostToday: Math.round(aiQueriesToday * 0.002 * 100) / 100,
    };

    return NextResponse.json(stats);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}

function isToday(timestamp: string): boolean {
  const date = new Date(timestamp);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}
