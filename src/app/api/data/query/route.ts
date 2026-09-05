import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { DataQueryRequest, DataPoint, AggregatedData } from "@/types";

export async function POST(req: NextRequest) {
  try {
    requireAuth(req);
    const body: DataQueryRequest = await req.json();
    const { deviceIds, metrics, startTime, endTime, aggregation, interval, limit, order } = body;

    if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
      return NextResponse.json({ error: "deviceIds array is required" }, { status: 400 });
    }
    if (!Array.isArray(metrics) || metrics.length === 0) {
      return NextResponse.json({ error: "metrics array is required" }, { status: 400 });
    }
    if (!startTime || !endTime) {
      return NextResponse.json({ error: "startTime and endTime are required" }, { status: 400 });
    }

    const maxPoints = Math.min(limit || 10000, 50000);

    let points = db.dataPoints.filter(
      (dp) =>
        deviceIds.includes(dp.deviceId) &&
        metrics.includes(dp.metric) &&
        dp.timestamp >= startTime &&
        dp.timestamp <= endTime
    );

    points.sort((a, b) =>
      (order === "asc" ? 1 : -1) * a.timestamp.localeCompare(b.timestamp)
    );

    if (points.length > maxPoints) {
      const step = Math.ceil(points.length / maxPoints);
      points = points.filter((_, i) => i % step === 0);
    }

    if (!aggregation || aggregation === "raw") {
      return NextResponse.json({
        data: points,
        meta: {
          total: points.length,
          deviceIds,
          metrics,
          startTime,
          endTime,
          aggregation: "raw",
        },
      });
    }

    const intervalMs = parseInterval(interval || "1h");
    const buckets = new Map<string, DataPoint[]>();

    for (const point of points) {
      const ts = new Date(point.timestamp).getTime();
      const bucketKey = `${point.deviceId}:${point.metric}:${Math.floor(ts / intervalMs) * intervalMs}`;
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(point);
    }

    const aggregated: AggregatedData[] = [];
    for (const [key, bucketPoints] of buckets) {
      const [deviceId, metric] = key.split(":");
      const values = bucketPoints.map((p) => p.value);
      const timestamp = bucketPoints[0].timestamp;

      const agg: AggregatedData = {
        deviceId,
        metric,
        timestamp,
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        sum: values.reduce((a, b) => a + b, 0),
        count: values.length,
      };

      // Apply specific aggregation
      let value: number;
      switch (aggregation) {
        case "avg": value = agg.avg; break;
        case "min": value = agg.min; break;
        case "max": value = agg.max; break;
        case "sum": value = agg.sum; break;
        case "count": value = agg.count; break;
        default: value = agg.avg;
      }

      aggregated.push({
        ...agg,
        avg: Math.round(agg.avg * 100) / 100,
        min: Math.round(agg.min * 100) / 100,
        max: Math.round(agg.max * 100) / 100,
        sum: Math.round(agg.sum * 100) / 100,
      });
    }

    aggregated.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    return NextResponse.json({
      data: aggregated,
      meta: {
        total: aggregated.length,
        deviceIds,
        metrics,
        startTime,
        endTime,
        aggregation,
        interval,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
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
