import { NextRequest, NextResponse } from "next/server";
import { db, genId, now } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { Integration, PaginatedResponse } from "@/types";

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "";
    const status = url.searchParams.get("status") || "";

    let filtered = [...db.integrations];

    if (type) filtered = filtered.filter((i) => i.type === type);
    if (status) filtered = filtered.filter((i) => i.status === status);

    filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const response: PaginatedResponse<Integration> & { availableTypes: string[] } = {
      data: filtered,
      total: filtered.length,
      page: 1,
      pageSize: filtered.length,
      totalPages: 1,
      availableTypes: [...new Set(db.integrations.map((i) => i.type))],
    };

    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch integrations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAuth(req);
    const body = await req.json();
    const { type, name, description, config } = body;

    if (!type || !name) {
      return NextResponse.json({ error: "type and name are required" }, { status: 400 });
    }

    const existing = db.integrations.find((i) => i.type === type && i.name === name);
    if (existing) {
      return NextResponse.json({ error: "Integration with this type and name already exists" }, { status: 409 });
    }

    const timestamp = now();
    const integration: Integration = {
      id: genId(),
      type,
      name,
      description: description || "",
      enabled: true,
      config: config || {},
      status: "disconnected",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    db.integrations.push(integration);

    db.activityLogs.unshift({
      id: genId(),
      type: "system",
      action: "integration_created",
      description: `Integration "${name}" (${type}) created`,
      severity: "success",
      metadata: { type },
      timestamp,
    });

    return NextResponse.json(integration, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create integration" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    requireAuth(req);
    const body = await req.json();
    const { id, enabled, config } = body;

    if (!id) {
      return NextResponse.json({ error: "Integration id is required" }, { status: 400 });
    }

    const idx = db.integrations.findIndex((i) => i.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    const timestamp = now();
    if (enabled !== undefined) db.integrations[idx].enabled = enabled;
    if (config) db.integrations[idx].config = { ...db.integrations[idx].config, ...config };
    db.integrations[idx].updatedAt = timestamp;

    return NextResponse.json(db.integrations[idx]);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update integration" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    requireAuth(req);
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Integration id is required" }, { status: 400 });
    }

    const idx = db.integrations.findIndex((i) => i.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    const integration = db.integrations[idx];
    db.integrations.splice(idx, 1);

    db.activityLogs.unshift({
      id: crypto.randomUUID(),
      type: "system",
      action: "integration_deleted",
      description: `Integration "${integration.name}" deleted`,
      severity: "warning",
      metadata: { type: integration.type },
      timestamp: now(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to delete integration" }, { status: 500 });
  }
}
