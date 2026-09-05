import { NextRequest, NextResponse } from "next/server";
import { db, genId, now } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { Alert, PaginatedResponse } from "@/types";

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(100, parseInt(url.searchParams.get("pageSize") || "20"));
    const severity = url.searchParams.get("severity") || "";
    const status = url.searchParams.get("status") || "";
    const deviceId = url.searchParams.get("deviceId") || "";
    const search = url.searchParams.get("search")?.toLowerCase() || "";
    const sortBy = url.searchParams.get("sortBy") || "createdAt";
    const sortOrder = url.searchParams.get("sortOrder") || "desc";

    let filtered = [...db.alerts];

    if (severity) filtered = filtered.filter((a) => a.severity === severity);
    if (status) filtered = filtered.filter((a) => a.status === status);
    if (deviceId) filtered = filtered.filter((a) => a.deviceId === deviceId);
    if (search) {
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(search) ||
          a.message.toLowerCase().includes(search)
      );
    }

    filtered.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const aVal = a[sortBy] ?? "";
      const bVal = b[sortBy] ?? "";
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortOrder === "asc" ? cmp : -cmp;
    });

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    const enriched = paged.map((alert) => {
      const device = db.devices.find((d) => d.id === alert.deviceId);
      return { ...alert, deviceName: device?.name || "Unknown", deviceLocation: device?.location || "" };
    });

    const counts = {
      total: db.alerts.length,
      active: db.alerts.filter((a) => a.status === "active").length,
      acknowledged: db.alerts.filter((a) => a.status === "acknowledged").length,
      resolved: db.alerts.filter((a) => a.status === "resolved").length,
      critical: db.alerts.filter((a) => a.severity === "critical" && a.status === "active").length,
      high: db.alerts.filter((a) => a.severity === "high" && a.status === "active").length,
      medium: db.alerts.filter((a) => a.severity === "medium" && a.status === "active").length,
      low: db.alerts.filter((a) => a.severity === "low" && a.status === "active").length,
    };

    const response: PaginatedResponse<Alert> & { counts: typeof counts } = {
      data: enriched,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      counts,
    };

    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAuth(req);
    const body = await req.json();
    const { deviceId, severity, title, message, metric, threshold, currentValue } = body;

    if (!title || !message || !severity) {
      return NextResponse.json(
        { error: "title, message, and severity are required" },
        { status: 400 }
      );
    }

    const validSeverities = ["critical", "high", "medium", "low", "info"];
    if (!validSeverities.includes(severity)) {
      return NextResponse.json(
        { error: `Invalid severity. Must be one of: ${validSeverities.join(", ")}` },
        { status: 400 }
      );
    }

    const timestamp = now();
    const alert: Alert = {
      id: genId(),
      deviceId: deviceId || undefined,
      severity,
      title,
      message,
      metric: metric || undefined,
      threshold: threshold !== undefined ? Number(threshold) : undefined,
      currentValue: currentValue !== undefined ? Number(currentValue) : undefined,
      status: "active",
      createdAt: timestamp,
      metadata: body.metadata || {},
    };

    db.alerts.push(alert);

    db.activityLogs.unshift({
      id: genId(),
      type: "alert",
      action: "created",
      description: `Alert created: ${title}`,
      deviceId: deviceId || undefined,
      severity: severity === "critical" || severity === "high" ? "error" : "warning",
      metadata: { severity },
      timestamp,
    });

    return NextResponse.json(alert, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create alert" }, { status: 500 });
  }
}
