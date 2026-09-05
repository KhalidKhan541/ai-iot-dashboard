import { NextRequest, NextResponse } from "next/server";
import { db, genId, now } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { DashboardWidget } from "@/types";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAuth(req);
    const dashboard = db.dashboards.find((d) => d.id === params.id);
    if (!dashboard) {
      return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
    }

    const url = new URL(req.url);
    const widgetType = url.searchParams.get("type") || "";

    let widgets = [...dashboard.widgets];
    if (widgetType) {
      widgets = widgets.filter((w) => w.type === widgetType);
    }

    return NextResponse.json({
      widgets,
      total: widgets.length,
      availableTypes: [...new Set(dashboard.widgets.map((w) => w.type))],
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch widgets" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAuth(req);
    const dashboard = db.dashboards.find((d) => d.id === params.id);
    if (!dashboard) {
      return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
    }

    const body = await req.json();
    const { type, title, config, position, dataSource } = body;

    if (!type || !title) {
      return NextResponse.json({ error: "type and title are required" }, { status: 400 });
    }

    const validTypes = ["line-chart", "bar-chart", "pie-chart", "gauge", "stat", "table", "map", "heatmap", "scatter", "area-chart", "donut", "sparkline", "text", "device-status", "alert-list"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Invalid widget type. Must be one of: ${validTypes.join(", ")}` }, { status: 400 });
    }

    if (position && (position.w < 1 || position.h < 1 || position.w > 12)) {
      return NextResponse.json({ error: "Widget width must be between 1 and 12" }, { status: 400 });
    }

    const widget: DashboardWidget = {
      id: genId(),
      type,
      title,
      config: {
        refreshIntervalMs: config?.refreshIntervalMs || 30000,
        timeRange: config?.timeRange || "24h",
        aggregation: config?.aggregation || "avg",
        colors: config?.colors || [],
        thresholds: config?.thresholds || [],
        decimals: config?.decimals,
        unit: config?.unit,
        custom: config?.custom || {},
      },
      position: position || { x: 0, y: dashboard.widgets.length * 4, w: 6, h: 4 },
      dataSource: {
        deviceIds: dataSource?.deviceIds || [],
        metrics: dataSource?.metrics || [],
        formula: dataSource?.formula,
        staticData: dataSource?.staticData,
      },
    };

    dashboard.widgets.push(widget);
    dashboard.updatedAt = now();

    return NextResponse.json(widget, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to add widget" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAuth(req);
    const dashboard = db.dashboards.find((d) => d.id === params.id);
    if (!dashboard) {
      return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
    }

    const body = await req.json();
    const { widgets } = body;

    if (!Array.isArray(widgets)) {
      return NextResponse.json({ error: "widgets array is required" }, { status: 400 });
    }

    dashboard.widgets = widgets;
    dashboard.updatedAt = now();

    return NextResponse.json({ widgets: dashboard.widgets });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update widgets" }, { status: 500 });
  }
}
