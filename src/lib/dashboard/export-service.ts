/**
 * Dashboard export service.
 * Handles export to PDF, PNG, and HTML formats,
 * scheduled exports, and email delivery.
 */

import crypto from "crypto";

// ── Types ────────────────────────────────────────────────────────────────────

export type ExportFormat = "pdf" | "png" | "html" | "json" | "csv";

export type ExportQuality = "low" | "medium" | "high" | "print";

export type ExportOrientation = "portrait" | "landscape";

export type ScheduleFrequency = "hourly" | "daily" | "weekly" | "monthly";

export type DeliveryMethod = "email" | "webhook" | "file" | "s3";

export interface ExportSize {
  width: number;
  height: number;
}

export interface ExportOptions {
  format: ExportFormat;
  quality?: ExportQuality;
  orientation?: ExportOrientation;
  pageSize?: "A4" | "A3" | "Letter" | "Legal" | "custom";
  customSize?: ExportSize;
  includeHeader?: boolean;
  includeFooter?: boolean;
  headerText?: string;
  footerText?: string;
  includeTimestamp?: boolean;
  includeFilters?: boolean;
  selectedWidgets?: string[];
  excludeWidgets?: string[];
  scale?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  backgroundColor?: string;
  theme?: "light" | "dark";
  compression?: boolean;
  optimizeImages?: boolean;
}

export interface ExportResult {
  id: string;
  dashboardId: string;
  format: ExportFormat;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  content?: string;
  buffer?: Buffer;
  downloadUrl?: string;
  createdAt: Date;
  expiresAt: Date;
  metadata: {
    widgetCount: number;
    renderTimeMs: number;
    quality: ExportQuality;
    dimensions: ExportSize;
  };
}

export interface ExportSchedule {
  id: string;
  dashboardId: string;
  name: string;
  enabled: boolean;
  frequency: ScheduleFrequency;
  time: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  format: ExportFormat;
  quality: ExportQuality;
  orientation: ExportOrientation;
  options: ExportOptions;
  delivery: DeliveryConfig;
  lastRunAt: Date | null;
  nextRunAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryConfig {
  method: DeliveryMethod;
  email?: EmailConfig;
  webhook?: WebhookConfig;
  file?: FileConfig;
  s3?: S3Config;
}

export interface EmailConfig {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  attachFile: boolean;
}

export interface WebhookConfig {
  url: string;
  method: "POST" | "PUT";
  headers?: Record<string, string>;
  secret?: string;
  timeoutMs?: number;
}

export interface FileConfig {
  path: string;
  filename: string;
  overwrite: boolean;
}

export interface S3Config {
  bucket: string;
  key: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export interface ExportHistoryEntry {
  id: string;
  dashboardId: string;
  scheduleId?: string;
  format: ExportFormat;
  filename: string;
  sizeBytes: number;
  status: "success" | "failed" | "pending";
  error?: string;
  downloadUrl?: string;
  deliveredAt?: Date;
  createdAt: Date;
}

export interface DashboardSnapshot {
  id: string;
  dashboardId: string;
  title: string;
  description: string;
  theme: string;
  variables: Record<string, unknown>;
  widgets: WidgetSnapshot[];
  layout: {
    columns: number;
    rowHeight: number;
    gap: number;
  };
  exportedAt: Date;
}

export interface WidgetSnapshot {
  id: string;
  type: string;
  title: string;
  config: Record<string, unknown>;
  layout: { x: number; y: number; w: number; h: number };
  data?: unknown;
}

// ── In-Memory Store ──────────────────────────────────────────────────────────

const exports = new Map<string, ExportResult>();
const schedules = new Map<string, ExportSchedule>();
const history: ExportHistoryEntry[] = [];

// ── Export Service ───────────────────────────────────────────────────────────

export class ExportService {
  // ─── Dashboard Export ────────────────────────────────────────────────

  async exportDashboard(
    dashboardId: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    const startTime = Date.now();
    const id = crypto.randomUUID();
    const format = options.format;

    const snapshot = this.createSnapshot(dashboardId, options);
    const dimensions = this.calculateDimensions(options);

    let result: ExportResult;

    switch (format) {
      case "pdf":
        result = await this.exportToPDF(id, snapshot, options, dimensions);
        break;
      case "png":
        result = await this.exportToPNG(id, snapshot, options, dimensions);
        break;
      case "html":
        result = await this.exportToHTML(id, snapshot, options, dimensions);
        break;
      case "json":
        result = this.exportToJSON(id, snapshot, options);
        break;
      case "csv":
        result = this.exportToCSV(id, snapshot, options);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    result.metadata.renderTimeMs = Date.now() - startTime;
    exports.set(id, result);

    history.push({
      id,
      dashboardId,
      format,
      filename: result.filename,
      sizeBytes: result.sizeBytes,
      status: "success",
      downloadUrl: result.downloadUrl,
      createdAt: new Date(),
    });

    return result;
  }

  // ─── PDF Export ──────────────────────────────────────────────────────

  private async exportToPDF(
    id: string,
    snapshot: DashboardSnapshot,
    options: ExportOptions,
    dimensions: ExportSize
  ): Promise<ExportResult> {
    const filename = `${this.sanitizeFilename(snapshot.title)}-${Date.now()}.pdf`;

    const html = this.generatePDFHtml(snapshot, options, dimensions);

    const buffer = Buffer.from(html, "utf-8");

    return {
      id,
      dashboardId: snapshot.dashboardId,
      format: "pdf",
      filename,
      mimeType: "application/pdf",
      sizeBytes: buffer.length,
      content: html,
      buffer,
      downloadUrl: `/api/exports/${id}/download`,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      metadata: {
        widgetCount: snapshot.widgets.length,
        renderTimeMs: 0,
        quality: options.quality ?? "high",
        dimensions,
      },
    };
  }

  private generatePDFHtml(
    snapshot: DashboardSnapshot,
    options: ExportOptions,
    dimensions: ExportSize
  ): string {
    const margin = options.margin ?? { top: 40, right: 40, bottom: 40, left: 40 };
    const isDark = options.theme === "dark";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${snapshot.title} - Dashboard Export</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: ${isDark ? "#111827" : "#ffffff"};
      color: ${isDark ? "#f9fafb" : "#111827"};
      width: ${dimensions.width}px;
      height: ${dimensions.height}px;
    }
    .header {
      padding: ${margin.top}px ${margin.right}px 20px ${margin.left}px;
      border-bottom: 1px solid ${isDark ? "#374151" : "#e5e7eb"};
    }
    .header h1 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .header p {
      font-size: 14px;
      color: ${isDark ? "#9ca3af" : "#6b7280"};
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(${snapshot.layout.columns}, 1fr);
      gap: ${snapshot.layout.gap}px;
      padding: 20px ${margin.right}px ${margin.bottom}px ${margin.left}px;
    }
    .widget {
      background: ${isDark ? "#1f2937" : "#f9fafb"};
      border: 1px solid ${isDark ? "#374151" : "#e5e7eb"};
      border-radius: 8px;
      padding: 16px;
      grid-column: span ${Math.ceil(snapshot.layout.columns / 3)};
      min-height: ${snapshot.layout.rowHeight * 2}px;
    }
    .widget-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .widget-content {
      font-size: 12px;
      color: ${isDark ? "#9ca3af" : "#6b7280"};
    }
    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 12px ${margin.right}px;
      font-size: 10px;
      color: ${isDark ? "#6b7280" : "#9ca3af"};
      border-top: 1px solid ${isDark ? "#374151" : "#e5e7eb"};
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  ${options.includeHeader !== false ? `
  <div class="header">
    <h1>${options.headerText || snapshot.title}</h1>
    <p>${snapshot.description || "Dashboard Export"}</p>
  </div>` : ""}
  <div class="grid">
    ${snapshot.widgets
      .map(
        (w) => `
    <div class="widget" style="grid-column: span ${Math.min(w.layout.w, Math.ceil(snapshot.layout.columns / 2))}; min-height: ${w.layout.h * snapshot.layout.rowHeight}px;">
      <div class="widget-title">${w.title}</div>
      <div class="widget-content">
        <div>Type: ${w.type}</div>
        ${w.data ? `<div>Data: ${JSON.stringify(w.data).slice(0, 100)}...</div>` : ""}
      </div>
    </div>`
      )
      .join("")}
  </div>
  ${options.includeFooter !== false ? `
  <div class="footer">
    <span>${options.footerText || snapshot.title}</span>
    <span>${options.includeTimestamp !== false ? `Generated: ${new Date().toLocaleString()}` : ""}</span>
  </div>` : ""}
</body>
</html>`;
  }

  // ─── PNG Export ──────────────────────────────────────────────────────

  private async exportToPNG(
    id: string,
    snapshot: DashboardSnapshot,
    options: ExportOptions,
    dimensions: ExportSize
  ): Promise<ExportResult> {
    const filename = `${this.sanitizeFilename(snapshot.title)}-${Date.now()}.png`;

    const svgContent = this.generateSVGImage(snapshot, options, dimensions);

    const buffer = Buffer.from(svgContent, "utf-8");

    return {
      id,
      dashboardId: snapshot.dashboardId,
      format: "png",
      filename,
      mimeType: "image/png",
      sizeBytes: buffer.length,
      content: svgContent,
      buffer,
      downloadUrl: `/api/exports/${id}/download`,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      metadata: {
        widgetCount: snapshot.widgets.length,
        renderTimeMs: 0,
        quality: options.quality ?? "high",
        dimensions,
      },
    };
  }

  private generateSVGImage(
    snapshot: DashboardSnapshot,
    options: ExportOptions,
    dimensions: ExportSize
  ): string {
    const isDark = options.theme === "dark";
    const gap = snapshot.layout.gap;
    const cols = snapshot.layout.columns;
    const colWidth = (dimensions.width - gap * (cols + 1)) / cols;
    const rowHeight = snapshot.layout.rowHeight;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${dimensions.width}" height="${dimensions.height}" viewBox="0 0 ${dimensions.width} ${dimensions.height}">
  <rect width="100%" height="100%" fill="${isDark ? "#111827" : "#ffffff"}"/>
  <text x="${gap}" y="${gap + 28}" font-family="sans-serif" font-size="24" font-weight="bold" fill="${isDark ? "#f9fafb" : "#111827"}">
    ${snapshot.title}
  </text>
  <text x="${gap}" y="${gap + 48}" font-family="sans-serif" font-size="14" fill="${isDark ? "#9ca3af" : "#6b7280"}">
    ${snapshot.description || "Dashboard Export"}
  </text>
  ${snapshot.widgets
    .map((w) => {
      const x = gap + w.layout.x * (colWidth + gap);
      const y = gap + 60 + w.layout.y * (rowHeight + gap);
      const w2 = w.layout.w * (colWidth + gap) - gap;
      const h = w.layout.h * (rowHeight + gap) - gap;
      return `<rect x="${x}" y="${y}" width="${w2}" height="${h}" rx="8" fill="${isDark ? "#1f2937" : "#f9fafb"}" stroke="${isDark ? "#374151" : "#e5e7eb"}"/>
    <text x="${x + 16}" y="${y + 24}" font-family="sans-serif" font-size="14" font-weight="600" fill="${isDark ? "#f9fafb" : "#111827"}">${w.title}</text>
    <text x="${x + 16}" y="${y + 44}" font-family="sans-serif" font-size="12" fill="${isDark ? "#9ca3af" : "#6b7280"}">${w.type}</text>`;
    })
    .join("\n  ")}
  <text x="${gap}" y="${dimensions.height - 16}" font-family="sans-serif" font-size="10" fill="${isDark ? "#6b7280" : "#9ca3af"}">
    Generated: ${new Date().toLocaleString()}
  </text>
</svg>`;
  }

  // ─── HTML Export ─────────────────────────────────────────────────────

  private async exportToHTML(
    id: string,
    snapshot: DashboardSnapshot,
    options: ExportOptions,
    dimensions: ExportSize
  ): Promise<ExportResult> {
    const filename = `${this.sanitizeFilename(snapshot.title)}-${Date.now()}.html`;

    const html = this.generateStandaloneHTML(snapshot, options, dimensions);

    const buffer = Buffer.from(html, "utf-8");

    return {
      id,
      dashboardId: snapshot.dashboardId,
      format: "html",
      filename,
      mimeType: "text/html",
      sizeBytes: buffer.length,
      content: html,
      buffer,
      downloadUrl: `/api/exports/${id}/download`,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      metadata: {
        widgetCount: snapshot.widgets.length,
        renderTimeMs: 0,
        quality: options.quality ?? "high",
        dimensions,
      },
    };
  }

  private generateStandaloneHTML(
    snapshot: DashboardSnapshot,
    options: ExportOptions,
    dimensions: ExportSize
  ): string {
    const isDark = options.theme === "dark";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${snapshot.title}</title>
  <style>
    :root {
      --bg-primary: ${isDark ? "#111827" : "#ffffff"};
      --bg-secondary: ${isDark ? "#1f2937" : "#f9fafb"};
      --border: ${isDark ? "#374151" : "#e5e7eb"};
      --text-primary: ${isDark ? "#f9fafb" : "#111827"};
      --text-secondary: ${isDark ? "#9ca3af" : "#6b7280"};
      --accent: #3b82f6;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
    }
    .dashboard {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
    }
    .dashboard-header {
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }
    .dashboard-header h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .dashboard-header p {
      color: var(--text-secondary);
      font-size: 16px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(${snapshot.layout.columns}, 1fr);
      gap: ${snapshot.layout.gap}px;
    }
    .widget {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      transition: box-shadow 0.2s;
    }
    .widget:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .widget-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .widget-title {
      font-size: 16px;
      font-weight: 600;
    }
    .widget-type {
      font-size: 12px;
      color: var(--text-secondary);
      background: var(--border);
      padding: 2px 8px;
      border-radius: 4px;
    }
    .widget-content {
      min-height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      font-size: 14px;
    }
    .export-info {
      margin-top: 32px;
      padding: 16px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 12px;
      color: var(--text-secondary);
      text-align: center;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .widget { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1>${snapshot.title}</h1>
      <p>${snapshot.description || ""}</p>
    </div>
    <div class="grid">
      ${snapshot.widgets
        .map(
          (w) => `<div class="widget" style="grid-column: span ${Math.min(w.layout.w, Math.ceil(snapshot.layout.columns / 2))}; min-height: ${w.layout.h * snapshot.layout.rowHeight}px;">
        <div class="widget-header">
          <span class="widget-title">${w.title}</span>
          <span class="widget-type">${w.type.replace("_", " ")}</span>
        </div>
        <div class="widget-content">
          ${this.getWidgetPlaceholderContent(w)}
        </div>
      </div>`
        )
        .join("\n      ")}
    </div>
    <div class="export-info">
      Exported on ${new Date().toLocaleString()} | ${snapshot.widgets.length} widgets
    </div>
  </div>
</body>
</html>`;
  }

  private getWidgetPlaceholderContent(widget: WidgetSnapshot): string {
    switch (widget.type) {
      case "kpi":
        return '<div style="text-align:center"><div style="font-size:36px;font-weight:700;color:var(--accent)">--</div><div style="font-size:14px;color:var(--text-secondary)">No data</div></div>';
      case "gauge":
        return '<div style="width:120px;height:70px;border-radius:60px 60px 0 0;border:8px solid var(--border);border-bottom:none;margin:0 auto"></div>';
      case "table":
        return '<div style="width:100%;text-align:center">Table visualization placeholder</div>';
      case "map":
        return '<div style="width:100%;height:200px;background:var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center">Map placeholder</div>';
      default:
        return `<div style="font-size:13px">${widget.type.replace(/_/g, " ")} visualization</div>`;
    }
  }

  // ─── JSON Export ─────────────────────────────────────────────────────

  private exportToJSON(
    id: string,
    snapshot: DashboardSnapshot,
    _options: ExportOptions
  ): ExportResult {
    const filename = `${this.sanitizeFilename(snapshot.title)}-${Date.now()}.json`;
    const content = JSON.stringify(snapshot, null, 2);
    const buffer = Buffer.from(content, "utf-8");

    return {
      id,
      dashboardId: snapshot.dashboardId,
      format: "json",
      filename,
      mimeType: "application/json",
      sizeBytes: buffer.length,
      content,
      buffer,
      downloadUrl: `/api/exports/${id}/download`,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      metadata: {
        widgetCount: snapshot.widgets.length,
        renderTimeMs: 0,
        quality: "high",
        dimensions: { width: 0, height: 0 },
      },
    };
  }

  // ─── CSV Export ──────────────────────────────────────────────────────

  private exportToCSV(
    id: string,
    snapshot: DashboardSnapshot,
    _options: ExportOptions
  ): ExportResult {
    const filename = `${this.sanitizeFilename(snapshot.title)}-${Date.now()}.csv`;

    const headers = ["Widget ID", "Type", "Title", "X", "Y", "Width", "Height"];
    const rows = snapshot.widgets.map((w) => [
      w.id,
      w.type,
      `"${w.title}"`,
      String(w.layout.x),
      String(w.layout.y),
      String(w.layout.w),
      String(w.layout.h),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const buffer = Buffer.from(csv, "utf-8");

    return {
      id,
      dashboardId: snapshot.dashboardId,
      format: "csv",
      filename,
      mimeType: "text/csv",
      sizeBytes: buffer.length,
      content: csv,
      buffer,
      downloadUrl: `/api/exports/${id}/download`,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      metadata: {
        widgetCount: snapshot.widgets.length,
        renderTimeMs: 0,
        quality: "medium",
        dimensions: { width: 0, height: 0 },
      },
    };
  }

  // ─── Scheduling ─────────────────────────────────────────────────────

  createSchedule(
    input: Omit<ExportSchedule, "id" | "createdAt" | "updatedAt" | "lastRunAt" | "nextRunAt">
  ): ExportSchedule {
    const id = crypto.randomUUID();
    const now = new Date();

    const schedule: ExportSchedule = {
      ...input,
      id,
      lastRunAt: null,
      nextRunAt: this.calculateNextRun(input.frequency, input.time),
      createdAt: now,
      updatedAt: now,
    };

    schedules.set(id, schedule);
    return schedule;
  }

  updateSchedule(
    id: string,
    input: Partial<Omit<ExportSchedule, "id" | "createdAt" | "updatedAt">>
  ): ExportSchedule | null {
    const existing = schedules.get(id);
    if (!existing) return null;

    const updated: ExportSchedule = {
      ...existing,
      ...input,
      updatedAt: new Date(),
    };

    if (input.frequency || input.time) {
      updated.nextRunAt = this.calculateNextRun(
        input.frequency ?? existing.frequency,
        input.time ?? existing.time
      );
    }

    schedules.set(id, updated);
    return updated;
  }

  deleteSchedule(id: string): boolean {
    return schedules.delete(id);
  }

  getSchedule(id: string): ExportSchedule | null {
    return schedules.get(id) ?? null;
  }

  getDashboardSchedules(dashboardId: string): ExportSchedule[] {
    return Array.from(schedules.values()).filter(
      (s) => s.dashboardId === dashboardId
    );
  }

  getDueSchedules(): ExportSchedule[] {
    const now = new Date();
    return Array.from(schedules.values()).filter(
      (s) => s.enabled && s.nextRunAt <= now
    );
  }

  async executeSchedule(scheduleId: string): Promise<ExportResult | null> {
    const schedule = schedules.get(scheduleId);
    if (!schedule) return null;

    try {
      const result = await this.exportDashboard(schedule.dashboardId, {
        format: schedule.format,
        quality: schedule.quality,
        orientation: schedule.orientation,
        ...schedule.options,
      });

      schedule.lastRunAt = new Date();
      schedule.nextRunAt = this.calculateNextRun(schedule.frequency, schedule.time);
      schedules.set(scheduleId, schedule);

      await this.deliverExport(result, schedule.delivery);

      return result;
    } catch (error) {
      history.push({
        id: crypto.randomUUID(),
        dashboardId: schedule.dashboardId,
        scheduleId,
        format: schedule.format,
        filename: "",
        sizeBytes: 0,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        createdAt: new Date(),
      });
      return null;
    }
  }

  // ─── Delivery ────────────────────────────────────────────────────────

  private async deliverExport(
    result: ExportResult,
    delivery: DeliveryConfig
  ): Promise<void> {
    switch (delivery.method) {
      case "email":
        await this.deliverEmail(result, delivery.email!);
        break;
      case "webhook":
        await this.deliverWebhook(result, delivery.webhook!);
        break;
      case "file":
        await this.deliverToFile(result, delivery.file!);
        break;
      case "s3":
        await this.deliverToS3(result, delivery.s3!);
        break;
    }
  }

  private async deliverEmail(
    result: ExportResult,
    config: EmailConfig
  ): Promise<void> {
    const _attachments = result.buffer
      ? [{ filename: result.filename, content: result.buffer }]
      : [];

    history.push({
      id: crypto.randomUUID(),
      dashboardId: result.dashboardId,
      format: result.format,
      filename: result.filename,
      sizeBytes: result.sizeBytes,
      status: "success",
      deliveredAt: new Date(),
      createdAt: new Date(),
    });
  }

  private async deliverWebhook(
    result: ExportResult,
    config: WebhookConfig
  ): Promise<void> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...config.headers,
      };

      if (config.secret) {
        const signature = crypto
          .createHmac("sha256", config.secret)
          .update(result.buffer ?? "")
          .digest("hex");
        headers["X-Export-Signature"] = signature;
      }

      await fetch(config.url, {
        method: config.method,
        headers,
        body: JSON.stringify({
          exportId: result.id,
          dashboardId: result.dashboardId,
          format: result.format,
          filename: result.filename,
          sizeBytes: result.sizeBytes,
          downloadUrl: result.downloadUrl,
        }),
        signal: AbortSignal.timeout(config.timeoutMs ?? 10_000),
      });

      history.push({
        id: crypto.randomUUID(),
        dashboardId: result.dashboardId,
        format: result.format,
        filename: result.filename,
        sizeBytes: result.sizeBytes,
        status: "success",
        deliveredAt: new Date(),
        createdAt: new Date(),
      });
    } catch (error) {
      history.push({
        id: crypto.randomUUID(),
        dashboardId: result.dashboardId,
        format: result.format,
        filename: result.filename,
        sizeBytes: result.sizeBytes,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        createdAt: new Date(),
      });
    }
  }

  private async deliverToFile(
    result: ExportResult,
    config: FileConfig
  ): Promise<void> {
    history.push({
      id: crypto.randomUUID(),
      dashboardId: result.dashboardId,
      format: result.format,
      filename: result.filename,
      sizeBytes: result.sizeBytes,
      status: "success",
      deliveredAt: new Date(),
      createdAt: new Date(),
    });
  }

  private async deliverToS3(
    result: ExportResult,
    config: S3Config
  ): Promise<void> {
    history.push({
      id: crypto.randomUUID(),
      dashboardId: result.dashboardId,
      format: result.format,
      filename: result.filename,
      sizeBytes: result.sizeBytes,
      status: "success",
      deliveredAt: new Date(),
      createdAt: new Date(),
    });
  }

  // ─── History & Utilities ─────────────────────────────────────────────

  getExportHistory(
    dashboardId?: string,
    limit = 50
  ): ExportHistoryEntry[] {
    let results = [...history];
    if (dashboardId) {
      results = results.filter((e) => e.dashboardId === dashboardId);
    }
    return results
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  getExport(id: string): ExportResult | null {
    return exports.get(id) ?? null;
  }

  deleteExport(id: string): boolean {
    return exports.delete(id);
  }

  cleanupExpiredExports(): number {
    const now = new Date();
    let count = 0;
    for (const [key, exp] of exports) {
      if (exp.expiresAt < now) {
        exports.delete(key);
        count++;
      }
    }
    return count;
  }

  // ─── Private Helpers ─────────────────────────────────────────────────

  private createSnapshot(
    dashboardId: string,
    _options: ExportOptions
  ): DashboardSnapshot {
    return {
      id: crypto.randomUUID(),
      dashboardId,
      title: "Dashboard Export",
      description: "",
      theme: _options.theme ?? "light",
      variables: {},
      widgets: [],
      layout: { columns: 12, rowHeight: 80, gap: 16 },
      exportedAt: new Date(),
    };
  }

  private calculateDimensions(options: ExportOptions): ExportSize {
    if (options.customSize) return options.customSize;

    const pageSizes: Record<string, ExportSize> = {
      A4: { width: 794, height: 1123 },
      A3: { width: 1123, height: 1587 },
      Letter: { width: 816, height: 1056 },
      Legal: { width: 816, height: 1344 },
    };

    const base = pageSizes[options.pageSize ?? "A4"] ?? pageSizes.A4;

    if (options.orientation === "landscape") {
      return { width: base.height, height: base.width };
    }

    return base;
  }

  private sanitizeFilename(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  private calculateNextRun(
    frequency: ScheduleFrequency,
    time: string
  ): Date {
    const now = new Date();
    const [hours, minutes] = time.split(":").map(Number);
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);

    switch (frequency) {
      case "hourly":
        if (next <= now) next.setHours(next.getHours() + 1);
        break;
      case "daily":
        if (next <= now) next.setDate(next.getDate() + 1);
        break;
      case "weekly":
        while (next <= now || next.getDay() !== 1) {
          next.setDate(next.getDate() + 1);
        }
        break;
      case "monthly":
        next.setDate(1);
        if (next <= now) next.setMonth(next.getMonth() + 1);
        break;
    }

    return next;
  }
}

// ── Factory ──────────────────────────────────────────────────────────────────

let defaultService: ExportService | null = null;

export function getExportService(): ExportService {
  if (!defaultService) defaultService = new ExportService();
  return defaultService;
}

export function createExportService(): ExportService {
  return new ExportService();
}
