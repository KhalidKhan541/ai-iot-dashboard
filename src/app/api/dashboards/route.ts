import { NextRequest, NextResponse } from "next/server";
import { db, genId, now } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { Dashboard, PaginatedResponse } from "@/types";

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(100, parseInt(url.searchParams.get("pageSize") || "20"));
    const search = url.searchParams.get("search")?.toLowerCase() || "";
    const isDefault = url.searchParams.get("isDefault");
    const isPublic = url.searchParams.get("isPublic");

    let filtered = [...db.dashboards];

    if (search) {
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(search) ||
          d.description.toLowerCase().includes(search) ||
          d.tags.some((t) => t.toLowerCase().includes(search))
      );
    }
    if (isDefault !== null && isDefault !== undefined) {
      filtered = filtered.filter((d) => d.isDefault === (isDefault === "true"));
    }
    if (isPublic !== null && isPublic !== undefined) {
      filtered = filtered.filter((d) => d.isPublic === (isPublic === "true"));
    }

    filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    const response: PaginatedResponse<Dashboard> = {
      data: paged,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };

    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch dashboards" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    const body = await req.json();
    const { name, description, layout, widgets, isPublic, tags, refreshIntervalMs } = body;

    if (!name) {
      return NextResponse.json({ error: "Dashboard name is required" }, { status: 400 });
    }

    if (name.length > 100) {
      return NextResponse.json({ error: "Dashboard name must be 100 characters or less" }, { status: 400 });
    }

    const existing = db.dashboards.find((d) => d.name === name && d.ownerId === auth.userId);
    if (existing) {
      return NextResponse.json({ error: "A dashboard with this name already exists" }, { status: 409 });
    }

    const timestamp = now();
    const dashboard: Dashboard = {
      id: genId(),
      name,
      description: description || "",
      layout: layout || { columns: 12, rowHeight: 60, gap: 16 },
      widgets: widgets || [],
      isDefault: db.dashboards.length === 0,
      isPublic: isPublic ?? false,
      ownerId: auth.userId,
      sharedWith: [],
      tags: tags || [],
      createdAt: timestamp,
      updatedAt: timestamp,
      refreshIntervalMs: refreshIntervalMs || 30000,
    };

    db.dashboards.push(dashboard);

    db.activityLogs.unshift({
      id: genId(),
      type: "system",
      action: "dashboard_created",
      description: `Dashboard "${name}" created`,
      severity: "success",
      metadata: { widgetCount: dashboard.widgets.length },
      timestamp,
    });

    return NextResponse.json(dashboard, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create dashboard" }, { status: 500 });
  }
}
