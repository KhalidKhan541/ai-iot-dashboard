import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ActivityLog, PaginatedResponse } from "@/types";

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(100, parseInt(url.searchParams.get("pageSize") || "20"));
    const type = url.searchParams.get("type") || "";
    const severity = url.searchParams.get("severity") || "";
    const search = url.searchParams.get("search")?.toLowerCase() || "";
    const hours = parseInt(url.searchParams.get("hours") || "24");

    let filtered = [...db.activityLogs];

    if (hours > 0) {
      const cutoff = new Date(Date.now() - hours * 3600000).toISOString();
      filtered = filtered.filter((l) => l.timestamp >= cutoff);
    }

    if (type) filtered = filtered.filter((l) => l.type === type);
    if (severity) filtered = filtered.filter((l) => l.severity === severity);
    if (search) {
      filtered = filtered.filter(
        (l) =>
          l.description.toLowerCase().includes(search) ||
          l.action.toLowerCase().includes(search) ||
          (l.userName && l.userName.toLowerCase().includes(search)) ||
          (l.deviceName && l.deviceName.toLowerCase().includes(search))
      );
    }

    filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    const timeline = buildTimeline(filtered);

    const summary = {
      total: filtered.length,
      byType: {
        device: filtered.filter((l) => l.type === "device").length,
        alert: filtered.filter((l) => l.type === "alert").length,
        rule: filtered.filter((l) => l.type === "rule").length,
        user: filtered.filter((l) => l.type === "user").length,
        system: filtered.filter((l) => l.type === "system").length,
        ai: filtered.filter((l) => l.type === "ai").length,
      },
      bySeverity: {
        info: filtered.filter((l) => l.severity === "info").length,
        success: filtered.filter((l) => l.severity === "success").length,
        warning: filtered.filter((l) => l.severity === "warning").length,
        error: filtered.filter((l) => l.severity === "error").length,
      },
    };

    const response: PaginatedResponse<ActivityLog> & {
      timeline: { hour: string; count: number }[];
      summary: typeof summary;
    } = {
      data: paged,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      timeline,
      summary,
    };

    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch activity logs" }, { status: 500 });
  }
}

function buildTimeline(logs: ActivityLog[]): { hour: string; count: number }[] {
  const buckets = new Map<string, number>();
  const now = new Date();

  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 3600000);
    const key = `${d.getHours().toString().padStart(2, "0")}:00`;
    buckets.set(key, 0);
  }

  for (const log of logs) {
    const d = new Date(log.timestamp);
    const key = `${d.getHours().toString().padStart(2, "0")}:00`;
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }
  }

  return Array.from(buckets.entries()).map(([hour, count]) => ({ hour, count }));
}
