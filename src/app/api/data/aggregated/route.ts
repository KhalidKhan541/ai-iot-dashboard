import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { AggregatedData } from "@/types";

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
    const url = new URL(req.url);
    const deviceId = url.searchParams.get("deviceId") || "";
    const metric = url.searchParams.get("metric") || "";
    const hours = parseInt(url.searchParams.get("hours") || "24");
    const interval = url.searchParams.get("interval") || "1h";

    const intervalMs = parseInterval(interval);
    const startTime = new Date(Date.now() - hours * 3600000).toISOString();

    let points = db.dataPoints.filter(
      (dp) =>
        dp.timestamp >= startTime &&
        (!deviceId || dp.deviceId === deviceId) &&
        (!metric || dp.metric === metric)
    );

    points.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    const buckets = new Map<string, typeof points>();
    for (const point of points) {
      const ts = new Date(point.timestamp).getTime();
      const bucketKey = `${point.deviceId}:${point.metric}:${Math.floor(ts / intervalMs) * intervalMs}`;
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(point);
    }

    const aggregated: AggregatedData[] = [];
    for (const [, bucketPoints] of buckets) {
      const values = bucketPoints.map((p) => p.value);
      aggregated.push({
        deviceId: bucketPoints[0].deviceId,
        metric: bucketPoints[0].metric,
        timestamp: bucketPoints[0].timestamp,
        avg: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100,
        min: Math.round(Math.min(...values) * 100) / 100,
        max: Math.round(Math.max(...values) * 100) / 100,
        sum: Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100,
        count: values.length,
      });
    }

    aggregated.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    const summary: Record<string, Record<string, { avg: number; min: number; max: number; trend: string }>> = {};
    for (const agg of aggregated) {
      if (!summary[agg.deviceId]) summary[agg.deviceId] = {};
      const existing = summary[agg.deviceId][agg.metric];
      if (existing) {
        existing.avg = (existing.avg + agg.avg) / 2;
        existing.min = Math.min(existing.min, agg.min);
        existing.max = Math.max(existing.max, agg.max);
      } else {
        summary[agg.deviceId][agg.metric] = {
          avg: agg.avg,
          min: agg.min,
          max: agg.max,
          trend: agg.avg > (existing?.avg || agg.avg) ? "up" : "down",
        };
      }
    }

    return NextResponse.json({
      data: aggregated,
      summary,
      meta: {
        total: aggregated.length,
        hours,
        interval,
        deviceId: deviceId || "all",
        metric: metric || "all",
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Aggregation query failed" }, { status: 500 });
  }
}

function parseInterval(interval: string): number {
  const match = interval.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 3600000;
  const value = parseInt(match[1]);
  const unit = match[2];
  switch (unit) {
    case "s": return value * 1000;
    case "m": return value * 60000;
    case "h": return value * 3600000;
    case "d": return value * 86400000;
    default: return 3600000;
  }
}
