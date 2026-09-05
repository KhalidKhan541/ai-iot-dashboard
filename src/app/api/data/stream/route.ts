import { NextRequest, NextResponse } from "next/server";
import { db, genId } from "@/lib/db";

const streamSubscriptions = new Map<string, Set<ReadableStreamDefaultController>>();

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const deviceIds = url.searchParams.get("deviceIds")?.split(",") || [];
  const metrics = url.searchParams.get("metrics")?.split(",") || [];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const subId = genId();
      streamSubscriptions.set(subId, new Set([controller]));

      // Send initial connection message
      const connectMsg = JSON.stringify({
        type: "connected",
        subscriptionId: subId,
        deviceIds,
        metrics,
        timestamp: new Date().toISOString(),
      });
      controller.enqueue(encoder.encode(`data: ${connectMsg}\n\n`));

      // Simulate real-time data stream
      const interval = setInterval(() => {
        try {
          const targetDevices = deviceIds.length > 0
            ? db.devices.filter((d) => deviceIds.includes(d.id))
            : db.devices.filter((d) => d.status === "online");

          for (const device of targetDevices) {
            const targetMetrics = metrics.length > 0 ? metrics : ["temperature", "humidity", "power"];
            for (const metric of targetMetrics) {
              const dataPoint = {
                type: "data",
                deviceId: device.id,
                deviceName: device.name,
                metric,
                value: generateSimulatedValue(metric),
                unit: getUnit(metric),
                timestamp: new Date().toISOString(),
                quality: "good",
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(dataPoint)}\n\n`));
            }
          }
        } catch {
          clearInterval(interval);
          streamSubscriptions.delete(subId);
        }
      }, 2000);

      // Handle cleanup
      req.signal?.addEventListener("abort", () => {
        clearInterval(interval);
        streamSubscriptions.delete(subId);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
    cancel() {
      // Cleanup handled by abort listener
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

function generateSimulatedValue(metric: string): number {
  const baselines: Record<string, number> = {
    temperature: 22,
    humidity: 55,
    power: 45,
    flow_rate: 12,
    co2: 450,
    pm25: 15,
  };
  const base = baselines[metric] || 50;
  return Math.round((base + (Math.random() - 0.5) * 10) * 100) / 100;
}

function getUnit(metric: string): string {
  const units: Record<string, string> = {
    temperature: "°C",
    humidity: "%",
    power: "kW",
    flow_rate: "L/min",
    co2: "ppm",
    pm25: "µg/m³",
  };
  return units[metric] || "";
}
