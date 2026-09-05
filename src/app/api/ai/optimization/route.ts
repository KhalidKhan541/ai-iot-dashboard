import { NextRequest, NextResponse } from "next/server";
import { db, genId } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { OptimizationSuggestion } from "@/types";

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "";
    const status = url.searchParams.get("status") || "";
    const deviceId = url.searchParams.get("deviceId") || "";

    let optimizations = [...db.optimizations];

    if (type) optimizations = optimizations.filter((o) => o.type === type);
    if (status) optimizations = optimizations.filter((o) => o.status === status);
    if (deviceId) optimizations = optimizations.filter((o) => o.relatedDeviceIds.includes(deviceId));

    optimizations.sort((a, b) => b.confidence - a.confidence);

    const stats = {
      total: optimizations.length,
      pending: optimizations.filter((o) => o.status === "pending").length,
      accepted: optimizations.filter((o) => o.status === "accepted").length,
      rejected: optimizations.filter((o) => o.status === "rejected").length,
      implemented: optimizations.filter((o) => o.status === "implemented").length,
      byType: {
        energy: optimizations.filter((o) => o.type === "energy").length,
        performance: optimizations.filter((o) => o.type === "performance").length,
        maintenance: optimizations.filter((o) => o.type === "maintenance").length,
        cost: optimizations.filter((o) => o.type === "cost").length,
        reliability: optimizations.filter((o) => o.type === "reliability").length,
      },
      avgConfidence: optimizations.length > 0
        ? Math.round((optimizations.reduce((s, o) => s + o.confidence, 0) / optimizations.length) * 100) / 100
        : 0,
    };

    return NextResponse.json({ optimizations, stats });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch optimizations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAuth(req);
    const body = await req.json();
    const { type, title, description, estimatedImpact, relatedDeviceIds, implementationSteps } = body;

    if (!title || !description) {
      return NextResponse.json({ error: "title and description are required" }, { status: 400 });
    }

    const validTypes = ["energy", "performance", "maintenance", "cost", "reliability"];
    const optType = validTypes.includes(type) ? type : "performance";

    const optimization: OptimizationSuggestion = {
      id: genId(),
      type: optType as OptimizationSuggestion["type"],
      title,
      description,
      estimatedImpact: estimatedImpact || "Impact assessment pending",
      confidence: 0.8,
      relatedDeviceIds: relatedDeviceIds || [],
      implementationSteps: implementationSteps || [],
      createdAt: new Date().toISOString(),
      status: "pending",
    };

    db.optimizations.push(optimization);

    return NextResponse.json(optimization, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create optimization" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    requireAuth(req);
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "id and status are required" }, { status: 400 });
    }

    const idx = db.optimizations.findIndex((o) => o.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Optimization not found" }, { status: 404 });
    }

    const validStatuses = ["pending", "accepted", "rejected", "implemented"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
    }

    db.optimizations[idx].status = status as OptimizationSuggestion["status"];

    db.activityLogs.unshift({
      id: genId(),
      type: "ai",
      action: `optimization_${status}`,
      description: `Optimization "${db.optimizations[idx].title}" ${status}`,
      severity: status === "accepted" ? "success" : "info",
      metadata: { type: db.optimizations[idx].type },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(db.optimizations[idx]);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update optimization" }, { status: 500 });
  }
}
