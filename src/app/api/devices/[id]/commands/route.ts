import { NextRequest, NextResponse } from "next/server";
import { db, genId, now } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { DeviceCommand, PaginatedResponse } from "@/types";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAuth(req);
    const device = db.devices.find((d) => d.id === params.id);
    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(100, parseInt(url.searchParams.get("pageSize") || "20"));
    const status = url.searchParams.get("status") || "";

    let commands = db.commands.filter((c) => c.deviceId === params.id);
    if (status) commands = commands.filter((c) => c.status === status);

    commands.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));

    const total = commands.length;
    const start = (page - 1) * pageSize;
    const paged = commands.slice(start, start + pageSize);

    const response: PaginatedResponse<DeviceCommand> = {
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
    return NextResponse.json({ error: "Failed to fetch commands" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(req);
    const device = db.devices.find((d) => d.id === params.id);
    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    if (device.status === "offline") {
      return NextResponse.json(
        { error: "Cannot send command to offline device" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { command, parameters, timeout } = body;

    if (!command) {
      return NextResponse.json({ error: "Command name is required" }, { status: 400 });
    }

    const validCommands: Record<string, string[]> = {
      sensor: ["calibrate", "set_sampling_rate", "reset"],
      actuator: ["set_value", "toggle", "set_range"],
      camera: ["capture", "start_recording", "stop_recording", "set_resolution", "set_recording_mode"],
      thermostat: ["set_temperature", "set_mode", "set_fan_speed", "get_schedule"],
      light: ["set_brightness", "set_color", "toggle", "set_color_temp"],
      lock: ["lock", "unlock", "get_status", "set_auto_lock"],
      meter: ["reset", "set_display", "get_calibration"],
      hub: ["restart", "update_firmware", "scan_devices", "set_led"],
      gateway: ["restart", "update_firmware", "get_connected_devices", "reboot"],
    };

    const allowed = validCommands[device.type] || [];
    if (allowed.length > 0 && !allowed.includes(command)) {
      return NextResponse.json(
        { error: `Invalid command for ${device.type}. Allowed: ${allowed.join(", ")}` },
        { status: 400 }
      );
    }

    const timestamp = now();
    const cmd: DeviceCommand = {
      id: genId(),
      deviceId: params.id,
      command,
      parameters: parameters || {},
      status: "pending",
      issuedBy: auth.userId,
      issuedAt: timestamp,
      timeout: timeout || 30000,
    };

    db.commands.push(cmd);
    device.commandCount++;
    device.updatedAt = timestamp;

    // Simulate async execution
    setTimeout(() => {
      const idx = db.commands.findIndex((c) => c.id === cmd.id);
      if (idx !== -1) {
        const success = Math.random() > 0.1;
        db.commands[idx].status = success ? "completed" : "failed";
        db.commands[idx].result = success ? `Command ${command} executed successfully` : `Command ${command} failed: device timeout`;
        db.commands[idx].completedAt = new Date().toISOString();
      }
    }, Math.min(2000, cmd.timeout));

    db.activityLogs.unshift({
      id: genId(),
      type: "device",
      action: "command_sent",
      description: `Command "${command}" sent to ${device.name}`,
      deviceId: device.id,
      deviceName: device.name,
      severity: "info",
      metadata: { command, parameters },
      timestamp,
    });

    return NextResponse.json(cmd, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to send command" }, { status: 500 });
  }
}
