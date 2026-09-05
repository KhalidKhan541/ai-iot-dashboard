import { NextRequest, NextResponse } from "next/server";
import { db, genId, now } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { Device, PaginatedResponse } from "@/types";

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "20")));
    const search = url.searchParams.get("search")?.toLowerCase() || "";
    const sortBy = url.searchParams.get("sortBy") || "createdAt";
    const sortOrder = url.searchParams.get("sortOrder") || "desc";
    const type = url.searchParams.get("type") || "";
    const status = url.searchParams.get("status") || "";
    const groupId = url.searchParams.get("groupId") || "";
    const tag = url.searchParams.get("tag") || "";

    let filtered = [...db.devices];

    if (search) {
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(search) ||
          d.location.toLowerCase().includes(search) ||
          d.manufacturer.toLowerCase().includes(search) ||
          d.model.toLowerCase().includes(search) ||
          d.tags.some((t) => t.toLowerCase().includes(search))
      );
    }
    if (type) filtered = filtered.filter((d) => d.type === type);
    if (status) filtered = filtered.filter((d) => d.status === status);
    if (groupId) filtered = filtered.filter((d) => d.groupId === groupId);
    if (tag) filtered = filtered.filter((d) => d.tags.includes(tag));

    filtered.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const aVal = a[sortBy] ?? "";
      const bVal = b[sortBy] ?? "";
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortOrder === "asc" ? cmp : -cmp;
    });

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    const response: PaginatedResponse<Device> = {
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
    return NextResponse.json({ error: "Failed to fetch devices" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAuth(req);
    const body = await req.json();
    const { name, type, protocol, manufacturer, model, firmware, location, groupId, tags, config } = body;

    if (!name || !type || !protocol) {
      return NextResponse.json(
        { error: "Name, type, and protocol are required" },
        { status: 400 }
      );
    }

    const validTypes = ["sensor", "actuator", "gateway", "camera", "thermostat", "light", "lock", "meter", "hub", "custom"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Invalid device type. Must be one of: ${validTypes.join(", ")}` }, { status: 400 });
    }

    const validProtocols = ["mqtt", "coap", "http", "websocket", "zigbee", "z-wave", "bluetooth", "lora", "modbus", "custom"];
    if (!validProtocols.includes(protocol)) {
      return NextResponse.json({ error: `Invalid protocol. Must be one of: ${validProtocols.join(", ")}` }, { status: 400 });
    }

    const timestamp = now();
    const device: Device = {
      id: genId(),
      name,
      type,
      status: "provisioning",
      protocol,
      manufacturer: manufacturer || "",
      model: model || "",
      firmware: firmware || "1.0.0",
      location: location || "",
      groupId: groupId || undefined,
      tags: tags || [],
      config: {
        pollingIntervalMs: config?.pollingIntervalMs || 10000,
        heartbeatTimeoutMs: config?.heartbeatTimeoutMs || 60000,
        dataRetentionDays: config?.dataRetentionDays || 90,
        autoReconnect: config?.autoReconnect ?? true,
        encryption: config?.encryption ?? false,
        customSettings: config?.customSettings || {},
      },
      lastSeen: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      ownerId: "user-1",
      dataPointCount: 0,
      commandCount: 0,
      metadata: body.metadata || {},
    };

    db.devices.push(device);

    db.activityLogs.unshift({
      id: genId(),
      type: "device",
      action: "created",
      description: `New device "${name}" registered`,
      deviceId: device.id,
      deviceName: name,
      severity: "success",
      metadata: { type, protocol },
      timestamp,
    });

    return NextResponse.json(device, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create device" }, { status: 500 });
  }
}
