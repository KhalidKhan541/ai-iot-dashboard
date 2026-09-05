import { NextRequest, NextResponse } from "next/server";
import { db, genId } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { Anomaly } from "@/types";

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
    const url = new URL(req.url);
    const deviceId = url.searchParams.get("deviceId") || "";
    const metric = url.searchParams.get("metric") || "";
    const status = url.searchParams.get("status") || "";
    const severity = url.searchParams.get("severity") || "";
    const minDeviation = parseFloat(url.searchParams.get("minDeviation") || "0");

    let anomalies = [...db.anomalies];

    if (deviceId) anomalies = anomalies.filter((a) => a.deviceId === deviceId);
    if (metric) anomalies = anomalies.filter((a) => a.metric === metric);
    if (status) anomalies = anomalies.filter((a) => a.status === status);
    if (severity) anomalies = anomalies.filter((a) => a.severity === severity);
    if (minDeviation > 0) anomalies = anomalies.filter((a) => a.deviationScore >= minDeviation);

    anomalies.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    const stats = {
      total: anomalies.length,
      new: anomalies.filter((a) => a.status === "new").length,
      investigating: anomalies.filter((a) => a.status === "investigating").length,
      resolved: anomalies.filter((a) => a.status === "resolved").length,
      falsePositive: anomalies.filter((a) => a.status === "false-positive").length,
      bySeverity: {
        critical: anomalies.filter((a) => a.severity === "critical").length,
        high: anomalies.filter((a) => a.severity === "high").length,
        medium: anomalies.filter((a) => a.severity === "medium").length,
        low: anomalies.filter((a) => a.severity === "low").length,
      },
      avgDeviationScore: anomalies.length > 0
        ? Math.round((anomalies.reduce((sum, a) => sum + a.deviationScore, 0) / anomalies.length) * 100) / 100
        : 0,
    };

    return NextResponse.json({ anomalies, stats });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch anomalies" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAuth(req);
    const body = await req.json();
    const { deviceId, metric } = body;

    if (!deviceId || !metric) {
      return NextResponse.json({ error: "deviceId and metric are required" }, { status: 400 });
    }

    const points = db.dataPoints
      .filter((dp) => dp.deviceId === deviceId && dp.metric === metric)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    if (points.length < 20) {
      return NextResponse.json({ error: "Need at least 20 data points for anomaly detection" }, { status: 400 });
    }

    const values = points.map((p) => p.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
    const threshold = 2.5;

    const detected: Anomaly[] = [];
    for (let i = 0; i < points.length; i++) {
      const deviation = Math.abs(points[i].value - mean) / (stdDev || 1);
      if (deviation > threshold) {
        const severity = deviation > 4 ? "critical" : deviation > 3 ? "high" : "medium";
        const anomaly: Anomaly = {
          id: genId(),
          deviceId,
          metric,
          timestamp: points[i].timestamp,
          value: points[i].value,
          expectedValue: Math.round(mean * 100) / 100,
          deviationScore: Math.round(deviation * 100) / 100,
          severity: severity as "critical" | "high" | "medium",
          status: "new",
          description: `${metric} value of ${points[i].value} deviates ${deviation.toFixed(1)} standard deviations from mean (${mean.toFixed(2)})`,
          model: "z-score-detection",
          relatedAnomalyIds: [],
        };
        detected.push(anomaly);
        db.anomalies.push(anomaly);
      }
    }

    return NextResponse.json({
      scanned: points.length,
      detected: detected.length,
      anomalies: detected,
    }, { status: detected.length > 0 ? 200 : 200 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Anomaly detection failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    requireAuth(req);
    const body = await req.json();
    const { anomalyId, status } = body;

    if (!anomalyId || !status) {
      return NextResponse.json({ error: "anomalyId and status are required" }, { status: 400 });
    }

    const idx = db.anomalies.findIndex((a) => a.id === anomalyId);
    if (idx === -1) {
      return NextResponse.json({ error: "Anomaly not found" }, { status: 404 });
    }

    const validStatuses = ["new", "investigating", "resolved", "false-positive"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
    }

    db.anomalies[idx].status = status as Anomaly["status"];
    return NextResponse.json(db.anomalies[idx]);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update anomaly" }, { status: 500 });
  }
}
