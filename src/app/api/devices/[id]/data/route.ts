import { NextRequest, NextResponse } from "next/server";
import { db, genId } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { DataPoint, PaginatedResponse } from "@/types";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAuth(req);
    const device = db.devices.find((d) => d.id === params.id);
    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(500, Math.max(1, parseInt(url.searchParams.get("pageSize") || "100")));
    const metric = url.searchParams.get("metric") || "";
    const startTime = url.searchParams.get("startTime") || "";
    const endTime = url.searchParams.get("endTime") || "";
    const quality = url.searchParams.get("quality") || "";
    const sortOrder = url.searchParams.get("sortOrder") || "desc";

    let points = db.dataPoints.filter((dp) => dp.deviceId === params.id);

    if (metric) points = points.filter((dp) => dp.metric === metric);
    if (quality) points = points.filter((dp) => dp.quality === quality);
    if (startTime) points = points.filter((dp) => dp.timestamp >= startTime);
    if (endTime) points = points.filter((dp) => dp.timestamp <= endTime);

    points.sort((a, b) =>
      sortOrder === "asc"
        ? a.timestamp.localeCompare(b.timestamp)
        : b.timestamp.localeCompare(a.timestamp)
    );

    const total = points.length;
    const start = (page - 1) * pageSize;
    const paged = points.slice(start, start + pageSize);

    const metrics = [...new Set(db.dataPoints.filter((dp) => dp.deviceId === params.id).map((dp) => dp.metric))];

    const response: PaginatedResponse<DataPoint> & { availableMetrics: string[] } = {
      data: paged,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      availableMetrics: metrics,
    };

    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch device data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAuth(req);
    const device = db.devices.find((d) => d.id === params.id);
    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    const body = await req.json();
    const { dataPoints } = body;

    if (!Array.isArray(dataPoints) || dataPoints.length === 0) {
      return NextResponse.json({ error: "dataPoints array is required" }, { status: 400 });
    }

    if (dataPoints.length > 1000) {
      return NextResponse.json({ error: "Maximum 1000 data points per request" }, { status: 400 });
    }

    const created: DataPoint[] = [];
    for (const dp of dataPoints) {
      if (!dp.metric || dp.value === undefined || !dp.unit) {
        continue;
      }
      const point: DataPoint = {
        id: genId(),
        deviceId: params.id,
        timestamp: dp.timestamp || new Date().toISOString(),
        metric: dp.metric,
        value: Number(dp.value),
        unit: dp.unit,
        quality: dp.quality || "good",
        metadata: dp.metadata || {},
      };
      created.push(point);
      db.dataPoints.push(point);
    }

    device.dataPointCount += created.length;
    device.lastSeen = new Date().toISOString();
    device.updatedAt = new Date().toISOString();

    return NextResponse.json({ created: created.length, dataPoints: created }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to ingest data points" }, { status: 500 });
  }
}
