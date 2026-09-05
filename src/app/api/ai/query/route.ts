import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    requireAuth(req);
    const body = await req.json();
    const { query } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "query string is required" }, { status: 400 });
    }

    if (query.length > 500) {
      return NextResponse.json({ error: "Query must be 500 characters or less" }, { status: 400 });
    }

    const lowerQuery = query.toLowerCase();
    const response = await processNaturalLanguageQuery(lowerQuery);

    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "NL query processing failed" }, { status: 500 });
  }
}

async function processNaturalLanguageQuery(query: string) {
  // Pattern matching for common IoT queries
  if (query.includes("temperature") && (query.includes("current") || query.includes("now"))) {
    const tempDevices = db.devices.filter((d) =>
      d.tags.includes("temperature") || d.type === "thermostat" || d.type === "sensor"
    );
    const latestData = tempDevices.map((device) => {
      const latest = db.dataPoints
        .filter((dp) => dp.deviceId === device.id && dp.metric === "temperature")
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
      return {
        deviceName: device.name,
        deviceId: device.id,
        value: latest?.value || null,
        unit: "°C",
        timestamp: latest?.timestamp || null,
      };
    });

    return {
      query,
      answer: `Current temperatures across your sensors:\n${latestData.map((d) => `- ${d.deviceName}: ${d.value !== null ? `${d.value} ${d.unit}` : "No data"}`).join("\n")}`,
      data: latestData,
      confidence: 0.9,
      type: "data_retrieval",
    };
  }

  if (query.includes("device") && (query.includes("status") || query.includes("online"))) {
    const stats = {
      total: db.devices.length,
      online: db.devices.filter((d) => d.status === "online").length,
      offline: db.devices.filter((d) => d.status === "offline").length,
      warning: db.devices.filter((d) => d.status === "warning").length,
      error: db.devices.filter((d) => d.status === "error").length,
    };

    return {
      query,
      answer: `Device Status Summary:\n- Total: ${stats.total}\n- Online: ${stats.online}\n- Offline: ${stats.offline}\n- Warning: ${stats.warning}\n- Error: ${stats.error}\n\nOverall health: ${((stats.online / stats.total) * 100).toFixed(1)}%`,
      data: stats,
      confidence: 0.95,
      type: "summary",
    };
  }

  if (query.includes("alert") && (query.includes("active") || query.includes("open"))) {
    const activeAlerts = db.alerts.filter((a) => a.status === "active");
    return {
      query,
      answer: `There are ${activeAlerts.length} active alerts:\n${activeAlerts.map((a) => `- [${a.severity.toUpperCase()}] ${a.title}: ${a.message}`).join("\n") || "No active alerts"}`,
      data: activeAlerts,
      confidence: 0.95,
      type: "data_retrieval",
    };
  }

  if (query.includes("power") || query.includes("energy") || query.includes("electricity")) {
    const powerDevices = db.devices.filter((d) =>
      d.tags.includes("power") || d.tags.includes("energy") || d.type === "meter"
    );
    const latestPower = powerDevices.map((device) => {
      const latest = db.dataPoints
        .filter((dp) => dp.deviceId === device.id && dp.metric === "power")
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
      return { deviceName: device.name, value: latest?.value || null, unit: "kW" };
    });

    const totalPower = latestPower.reduce((sum, d) => sum + (d.value || 0), 0);

    return {
      query,
      answer: `Energy Summary:\n- Total current power: ${totalPower.toFixed(2)} kW\n- Active meters: ${powerDevices.length}\n${latestPower.map((d) => `- ${d.deviceName}: ${d.value !== null ? `${d.value} ${d.unit}` : "N/A"}`).join("\n")}`,
      data: { meters: latestPower, totalPower },
      confidence: 0.88,
      type: "summary",
    };
  }

  if (query.includes("optimize") || query.includes("improve") || query.includes("recommend")) {
    const suggestions = db.optimizations.filter((o) => o.status === "pending");
    return {
      query,
      answer: `I found ${suggestions.length} optimization opportunities:\n${suggestions.map((s) => `- ${s.title} (${s.type}): ${s.description} [Impact: ${s.estimatedImpact}]`).join("\n") || "No pending optimizations"}`,
      data: suggestions,
      confidence: 0.82,
      type: "recommendation",
    };
  }

  if (query.includes("anomal") || query.includes("unusual") || query.includes("strange")) {
    const recentAnomalies = db.anomalies
      .filter((a) => a.status === "new" || a.status === "investigating")
      .sort((a, b) => b.deviationScore - a.deviationScore);
    return {
      query,
      answer: `Detected ${recentAnomalies.length} anomalies requiring attention:\n${recentAnomalies.map((a) => `- [${a.severity}] ${a.description} (deviation: ${a.deviationScore}σ)`).join("\n") || "No anomalies detected"}`,
      data: recentAnomalies,
      confidence: 0.85,
      type: "anomaly_report",
    };
  }

  // Default response
  return {
    query,
    answer: `I understand you're asking about: "${query}"\n\nHere's what I can help with:\n- Current device status and readings\n- Active alerts and notifications\n- Energy and power consumption\n- Anomaly detection results\n- Optimization recommendations\n- Predictions and forecasts\n\nTry asking about specific metrics like "current temperature", "active alerts", "power usage", or "optimization suggestions".`,
    data: null,
    confidence: 0.3,
    type: "help",
    suggestions: [
      "What is the current temperature?",
      "Show me active alerts",
      "What is the power consumption?",
      "Are there any anomalies?",
      "Give me optimization suggestions",
      "Show device status",
    ],
  };
}
