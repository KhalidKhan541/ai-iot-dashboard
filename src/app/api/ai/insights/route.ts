import { NextRequest, NextResponse } from "next/server";
import { db, genId } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { AIInsight } from "@/types";

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "";
    const severity = url.searchParams.get("severity") || "";
    const actionable = url.searchParams.get("actionable");
    const deviceId = url.searchParams.get("deviceId") || "";

    let insights = [...db.insights];

    if (type) insights = insights.filter((i) => i.type === type);
    if (severity) insights = insights.filter((i) => i.severity === severity);
    if (actionable !== null && actionable !== undefined) {
      insights = insights.filter((i) => i.actionable === (actionable === "true"));
    }
    if (deviceId) {
      insights = insights.filter((i) => i.relatedDeviceIds.includes(deviceId));
    }

    const now = new Date().toISOString();
    insights = insights.filter((i) => !i.expiresAt || i.expiresAt > now);

    insights.sort((a, b) => b.confidence - a.confidence);

    const summary = {
      total: insights.length,
      byType: {
        recommendation: insights.filter((i) => i.type === "recommendation").length,
        prediction: insights.filter((i) => i.type === "prediction").length,
        anomaly: insights.filter((i) => i.type === "anomaly").length,
        optimization: insights.filter((i) => i.type === "optimization").length,
        summary: insights.filter((i) => i.type === "summary").length,
      },
      actionableCount: insights.filter((i) => i.actionable).length,
      avgConfidence: insights.length > 0
        ? Math.round((insights.reduce((s, i) => s + i.confidence, 0) / insights.length) * 100) / 100
        : 0,
    };

    return NextResponse.json({ insights, summary });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch insights" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAuth(req);
    const body = await req.json();
    const { type, title, description, severity, relatedDeviceIds, relatedMetricIds, suggestedActions } = body;

    if (!title || !description) {
      return NextResponse.json({ error: "title and description are required" }, { status: 400 });
    }

    const validTypes = ["recommendation", "prediction", "anomaly", "optimization", "summary"];
    const insightType = validTypes.includes(type) ? type : "recommendation";

    const insight: AIInsight = {
      id: genId(),
      type: insightType,
      title,
      description,
      severity: severity || "info",
      confidence: 0.85,
      relatedDeviceIds: relatedDeviceIds || [],
      relatedMetricIds: relatedMetricIds || [],
      actionable: suggestedActions?.length > 0,
      suggestedActions: suggestedActions || [],
      createdAt: new Date().toISOString(),
      metadata: body.metadata || {},
    };

    db.insights.push(insight);

    return NextResponse.json(insight, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create insight" }, { status: 500 });
  }
}
