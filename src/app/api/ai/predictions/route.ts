import { NextRequest, NextResponse } from "next/server";
import { db, genId } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { Prediction } from "@/types";

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
    const url = new URL(req.url);
    const deviceId = url.searchParams.get("deviceId") || "";
    const metric = url.searchParams.get("metric") || "";
    const minConfidence = parseFloat(url.searchParams.get("minConfidence") || "0");

    let predictions = [...db.predictions];

    if (deviceId) predictions = predictions.filter((p) => p.deviceId === deviceId);
    if (metric) predictions = predictions.filter((p) => p.metric === metric);
    if (minConfidence > 0) predictions = predictions.filter((p) => p.confidence >= minConfidence);

    predictions.sort((a, b) => b.confidence - a.confidence);

    return NextResponse.json({
      predictions,
      total: predictions.length,
      models: [...new Set(predictions.map((p) => p.model))],
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch predictions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAuth(req);
    const body = await req.json();
    const { deviceId, metric, horizonMinutes } = body;

    if (!deviceId || !metric) {
      return NextResponse.json({ error: "deviceId and metric are required" }, { status: 400 });
    }

    const device = db.devices.find((d) => d.id === deviceId);
    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    const historicalPoints = db.dataPoints
      .filter((dp) => dp.deviceId === deviceId && dp.metric === metric)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    if (historicalPoints.length < 10) {
      return NextResponse.json({ error: "Insufficient historical data for prediction (need at least 10 points)" }, { status: 400 });
    }

    const values = historicalPoints.map((p) => p.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);

    const recentTrend = values.slice(-10);
    const trendSlope = (recentTrend[recentTrend.length - 1] - recentTrend[0]) / recentTrend.length;
    const predicted = mean + trendSlope * (horizonMinutes || 60) / 10;

    const confidence = Math.min(0.95, Math.max(0.5, 1 - stdDev / mean));

    const prediction: Prediction = {
      id: genId(),
      deviceId,
      metric,
      predictedValue: Math.round(predicted * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      lowerBound: Math.round((predicted - stdDev * 1.5) * 100) / 100,
      upperBound: Math.round((predicted + stdDev * 1.5) * 100) / 100,
      predictedAt: new Date().toISOString(),
      horizonMinutes: horizonMinutes || 60,
      model: "trend-analysis-v1",
      factors: [
        { name: "historical_mean", importance: 0.4, direction: trendSlope > 0 ? "positive" : "negative", description: `Historical average: ${mean.toFixed(2)}` },
        { name: "recent_trend", importance: 0.35, direction: trendSlope > 0 ? "positive" : "negative", description: `Trend slope: ${trendSlope > 0 ? "+" : ""}${trendSlope.toFixed(4)}` },
        { name: "volatility", importance: 0.25, direction: stdDev > mean * 0.2 ? "negative" : "positive", description: `Standard deviation: ${stdDev.toFixed(2)}` },
      ],
    };

    db.predictions.push(prediction);

    return NextResponse.json(prediction, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Prediction generation failed" }, { status: 500 });
  }
}
