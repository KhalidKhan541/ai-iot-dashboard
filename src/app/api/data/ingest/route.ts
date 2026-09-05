import { NextRequest, NextResponse } from "next/server";
import { db, genId } from "@/lib/db";
import type { DataIngestRequest, DataPoint } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body: DataIngestRequest = await req.json();
    const { deviceId, dataPoints } = body;

    if (!deviceId) {
      return NextResponse.json({ error: "deviceId is required" }, { status: 400 });
    }
    if (!Array.isArray(dataPoints) || dataPoints.length === 0) {
      return NextResponse.json({ error: "dataPoints array is required" }, { status: 400 });
    }
    if (dataPoints.length > 5000) {
      return NextResponse.json({ error: "Maximum 5000 data points per ingestion" }, { status: 400 });
    }

    const device = db.devices.find((d) => d.id === deviceId);
    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    const created: DataPoint[] = [];
    const errors: { index: number; error: string }[] = [];

    for (let i = 0; i < dataPoints.length; i++) {
      const dp = dataPoints[i];
      if (!dp.metric || dp.value === undefined || !dp.unit) {
        errors.push({ index: i, error: "Missing required fields: metric, value, unit" });
        continue;
      }
      if (typeof dp.value !== "number" || isNaN(dp.value)) {
        errors.push({ index: i, error: "Value must be a valid number" });
        continue;
      }

      const point: DataPoint = {
        id: genId(),
        deviceId,
        timestamp: dp.timestamp || new Date().toISOString(),
        metric: dp.metric,
        value: dp.value,
        unit: dp.unit,
        quality: dp.quality || "good",
        metadata: dp.metadata || {},
      };
      created.push(point);
      db.dataPoints.push(point);
    }

    if (created.length > 0) {
      device.dataPointCount += created.length;
      device.lastSeen = new Date().toISOString();
      device.updatedAt = new Date().toISOString();

      if (device.status === "offline") {
        device.status = "online";
      }

      // Check alert rules for this device
      checkAlertRules(deviceId, created);
    }

    return NextResponse.json({
      accepted: created.length,
      rejected: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    }, { status: created.length > 0 ? 201 : 400 });
  } catch {
    return NextResponse.json({ error: "Ingestion failed" }, { status: 500 });
  }
}

function checkAlertRules(deviceId: string, points: DataPoint[]): void {
  const rules = db.alertRules.filter((r) => r.enabled);

  for (const rule of rules) {
    if (rule.deviceId && rule.deviceId !== deviceId) continue;
    if (rule.deviceType) {
      const device = db.devices.find((d) => d.id === deviceId);
      if (device && device.type !== rule.deviceType) continue;
    }

    const matchingPoints = points.filter((p) => p.metric === rule.metric);
    if (matchingPoints.length === 0) continue;

    const now = Date.now();
    if (rule.lastTriggered) {
      const cooldownEnd = new Date(rule.lastTriggered).getTime() + rule.cooldownMs;
      if (now < cooldownEnd) continue;
    }

    for (const point of matchingPoints) {
      let triggered = false;
      const { condition } = rule;

      switch (condition.operator) {
        case "gt": triggered = point.value > condition.value; break;
        case "lt": triggered = point.value < condition.value; break;
        case "gte": triggered = point.value >= condition.value; break;
        case "lte": triggered = point.value <= condition.value; break;
        case "eq": triggered = point.value === condition.value; break;
        case "neq": triggered = point.value !== condition.value; break;
        case "between":
          triggered = point.value >= condition.value && point.value <= (condition.value2 ?? Infinity);
          break;
        case "outside":
          triggered = point.value < condition.value || point.value > (condition.value2 ?? Infinity);
          break;
      }

      if (triggered) {
        const alert = {
          id: genId(),
          deviceId,
          ruleId: rule.id,
          severity: rule.severity,
          title: `Alert: ${rule.name}`,
          message: `Metric "${rule.metric}" value ${point.value} ${point.unit} triggered rule "${rule.name}"`,
          metric: rule.metric,
          threshold: condition.value,
          currentValue: point.value,
          status: "active" as const,
          createdAt: new Date().toISOString(),
          metadata: { dataPointId: point.id },
        };
        db.alerts.push(alert);
        rule.lastTriggered = new Date().toISOString();
        rule.triggerCount++;
        break;
      }
    }
  }
}
