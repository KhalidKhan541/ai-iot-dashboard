import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAuth(req);
    const dashboard = db.dashboards.find((d) => d.id === params.id);
    if (!dashboard) {
      return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
    }

    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "json";

    if (format === "csv") {
      const csvLines = ["Widget ID,Type,Title,Position X,Position Y,Width,Height,Devices,Metrics"];
      for (const w of dashboard.widgets) {
        csvLines.push([
          w.id,
          w.type,
          `"${w.title}"`,
          w.position.x,
          w.position.y,
          w.position.w,
          w.position.h,
          `"${w.dataSource.deviceIds.join(";")}"`,
          `"${w.dataSource.metrics.join(";")}"`,
        ].join(","));
      }

      return new Response(csvLines.join("\n"), {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${dashboard.name.replace(/[^a-zA-Z0-9]/g, "_")}_export.csv"`,
        },
      });
    }

    if (format === "pdf") {
      const exportData = {
        dashboard: {
          id: dashboard.id,
          name: dashboard.name,
          description: dashboard.description,
          exportedAt: new Date().toISOString(),
        },
        widgets: dashboard.widgets.map((w) => ({
          ...w,
          liveData: w.dataSource.deviceIds.map((devId) => {
            const device = db.devices.find((d) => d.id === devId);
            const latestPoints = db.dataPoints
              .filter((dp) => dp.deviceId === devId && w.dataSource.metrics.includes(dp.metric))
              .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
              .slice(0, 10);
            return { deviceId: devId, deviceName: device?.name, dataPoints: latestPoints };
          }),
        })),
      };

      return NextResponse.json({
        status: "export_ready",
        format: "pdf",
        data: exportData,
        message: "PDF export would be generated server-side. Returning JSON data for client rendering.",
      });
    }

    // Default: JSON export
    const exportData = {
      dashboard: {
        id: dashboard.id,
        name: dashboard.name,
        description: dashboard.description,
        layout: dashboard.layout,
        refreshIntervalMs: dashboard.refreshIntervalMs,
        tags: dashboard.tags,
      },
      widgets: dashboard.widgets.map((w) => ({
        id: w.id,
        type: w.type,
        title: w.title,
        config: w.config,
        position: w.position,
        dataSource: w.dataSource,
        exportedData: w.dataSource.deviceIds.flatMap((devId) => {
          const device = db.devices.find((d) => d.id === devId);
          return db.dataPoints
            .filter((dp) => dp.deviceId === devId && w.dataSource.metrics.includes(dp.metric))
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
            .slice(0, 100)
            .map((dp) => ({
              ...dp,
              deviceName: device?.name || "Unknown",
            }));
        }),
      })),
      exportedAt: new Date().toISOString(),
      format: "json",
    };

    const blob = JSON.stringify(exportData, null, 2);

    if (url.searchParams.get("download") === "true") {
      return new Response(blob, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${dashboard.name.replace(/[^a-zA-Z0-9]/g, "_")}_export.json"`,
        },
      });
    }

    return NextResponse.json(exportData);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
