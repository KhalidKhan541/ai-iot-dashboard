/**
 * Widget management service.
 * Handles widget CRUD, types, configuration, layout positioning,
 * refresh intervals, data source bindings, and state management.
 */

import crypto from "crypto";

// ── Types ────────────────────────────────────────────────────────────────────

export type WidgetType =
  | "line_chart"
  | "area_chart"
  | "bar_chart"
  | "gauge"
  | "table"
  | "map"
  | "heatmap"
  | "status"
  | "kpi"
  | "text"
  | "image"
  | "pie_chart"
  | "donut_chart"
  | "sparkline"
  | "progress";

export type WidgetSize = "sm" | "md" | "lg" | "xl" | "custom";

export type WidgetRefreshUnit = "seconds" | "minutes" | "hours";

export type AggregationType =
  | "avg"
  | "min"
  | "max"
  | "sum"
  | "count"
  | "first"
  | "last"
  | "median"
  | "p95"
  | "p99";

export type TimeUnit =
  | "1m"
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "6h"
  | "12h"
  | "24h"
  | "7d"
  | "30d"
  | "90d";

export interface WidgetColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  border: string;
  gradient?: [string, string];
}

export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export interface WidgetDataFilter {
  field: string;
  operator:
    | "eq"
    | "neq"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "contains"
    | "startsWith"
    | "endsWith"
    | "in"
    | "between";
  value: unknown;
}

export interface WidgetDataTransform {
  type: "map" | "filter" | "reduce" | "sort" | "limit" | "pivot" | "derivative" | "cumulative";
  field?: string;
  expression?: string;
  aggregation?: AggregationType;
  limit?: number;
  order?: "asc" | "desc";
}

export interface WidgetThreshold {
  id: string;
  label: string;
  value: number;
  color: string;
  condition: "gt" | "gte" | "lt" | "lte" | "eq";
  showOnChart: boolean;
  alertEnabled: boolean;
  alertSeverity: "info" | "warning" | "critical";
}

export interface WidgetDataSourceConfig {
  sourceType: "device" | "aggregated" | "custom_sql" | "api" | "static";
  deviceId?: string;
  metric?: string;
  aggregation?: AggregationType;
  timeRange?: TimeUnit;
  sql?: string;
  apiUrl?: string;
  apiMethod?: "GET" | "POST";
  apiHeaders?: Record<string, string>;
  apiBody?: string;
  staticData?: unknown;
  refreshIntervalMs?: number;
  filters?: WidgetDataFilter[];
  transforms?: WidgetDataTransform[];
}

export interface LineChartConfig {
  type: "line_chart";
  showGrid: boolean;
  showLegend: boolean;
  showTooltip: boolean;
  showDots: boolean;
  lineWidth: number;
  fillOpacity: number;
  curveType: "linear" | "monotone" | "step" | "stepBefore" | "stepAfter";
  colors: string[];
  yAxisLabel: string;
  xAxisLabel: string;
  yAxisDomain?: [number, number];
  referenceLines?: { value: number; label: string; color: string }[];
  animationDuration: number;
}

export interface AreaChartConfig {
  type: "area_chart";
  showGrid: boolean;
  showLegend: boolean;
  showTooltip: boolean;
  stackAreas: boolean;
  fillOpacity: number;
  curveType: "linear" | "monotone" | "step";
  colors: string[];
  yAxisLabel: string;
  xAxisLabel: string;
  gradient: boolean;
  animationDuration: number;
}

export interface BarChartConfig {
  type: "bar_chart";
  showGrid: boolean;
  showLegend: boolean;
  showTooltip: boolean;
  orientation: "vertical" | "horizontal";
  barRadius: number;
  colors: string[];
  yAxisLabel: string;
  xAxisLabel: string;
  stacked: boolean;
  grouped: boolean;
  animationDuration: number;
}

export interface GaugeConfig {
  type: "gauge";
  min: number;
  max: number;
  value: number;
  unit: string;
  decimals: number;
  segments: { from: number; to: number; color: string }[];
  showValue: boolean;
  showLabel: boolean;
  size: "sm" | "md" | "lg";
  threshold?: WidgetThreshold[];
}

export interface TableConfig {
  type: "table";
  columns: {
    field: string;
    header: string;
    width?: number;
    align?: "left" | "center" | "right";
    sortable: boolean;
    format?: string;
  }[];
  pageSize: number;
  showPagination: boolean;
  showSearch: boolean;
  showExport: boolean;
  striped: boolean;
  compact: boolean;
  emptyMessage: string;
}

export interface MapConfig {
  type: "map";
  center: { lat: number; lng: number };
  zoom: number;
  mapStyle: "street" | "satellite" | "terrain" | "dark" | "light";
  showMarkers: boolean;
  showHeatmap: boolean;
  showClusters: boolean;
  markerIcon?: string;
  clusterColor?: string;
}

export interface HeatmapConfig {
  type: "heatmap";
  colorScale: string[];
  xLabel: string;
  yLabel: string;
  showValues: boolean;
  cellSize: number;
  borderRadius: number;
}

export interface StatusConfig {
  type: "status";
  value: string;
  statusMap: Record<string, { label: string; color: string; icon: string }>;
  showLabel: boolean;
  showIcon: boolean;
  size: "sm" | "md" | "lg" | "xl";
  animation: "none" | "pulse" | "blink";
}

export interface KPIConfig {
  type: "kpi";
  value: number;
  previousValue?: number;
  unit: string;
  format: "number" | "currency" | "percent" | "bytes" | "duration" | "custom";
  currency?: string;
  decimals: number;
  showTrend: boolean;
  trendDirection: "up" | "down" | "neutral";
  trendColor: string;
  showSparkline: boolean;
  sparklineData: number[];
  comparisonLabel: string;
  icon?: string;
  size: "sm" | "md" | "lg";
}

export interface TextConfig {
  type: "text";
  content: string;
  format: "plain" | "markdown" | "html";
  fontSize: "sm" | "md" | "lg" | "xl";
  fontWeight: "normal" | "medium" | "semibold" | "bold";
  color: string;
  alignment: "left" | "center" | "right";
  lineHeight: number;
}

export interface ImageConfig {
  type: "image";
  src: string;
  alt: string;
  fit: "cover" | "contain" | "fill" | "none";
  borderRadius: number;
  showCaption: boolean;
  caption: string;
  lazyLoad: boolean;
}

export interface PieChartConfig {
  type: "pie_chart";
  colors: string[];
  showLegend: boolean;
  showTooltip: boolean;
  showLabels: boolean;
  innerRadius: number;
  padAngle: number;
  animationDuration: number;
  labelFormat: string;
}

export interface SparklineConfig {
  type: "sparkline";
  color: string;
  lineWidth: number;
  showArea: boolean;
  fillOpacity: number;
  curveType: "linear" | "monotone" | "step";
}

export interface ProgressConfig {
  type: "progress";
  value: number;
  max: number;
  color: string;
  trackColor: string;
  height: number;
  borderRadius: number;
  showLabel: boolean;
  labelFormat: "percent" | "value" | "fraction";
  animationDuration: number;
}

export type WidgetConfig =
  | LineChartConfig
  | AreaChartConfig
  | BarChartConfig
  | GaugeConfig
  | TableConfig
  | MapConfig
  | HeatmapConfig
  | StatusConfig
  | KPIConfig
  | TextConfig
  | ImageConfig
  | PieChartConfig
  | SparklineConfig
  | ProgressConfig;

export interface Widget {
  id: string;
  dashboardId: string;
  type: WidgetType;
  title: string;
  description: string;
  config: WidgetConfig;
  layout: WidgetLayout;
  dataSource: WidgetDataSourceConfig;
  thresholds: WidgetThreshold[];
  colorScheme: WidgetColorScheme;
  refreshIntervalMs: number;
  autoRefresh: boolean;
  isVisible: boolean;
  isLocked: boolean;
  zIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetCreateInput {
  dashboardId: string;
  type: WidgetType;
  title: string;
  description?: string;
  config?: Partial<WidgetConfig>;
  layout?: Partial<WidgetLayout>;
  dataSource?: Partial<WidgetDataSourceConfig>;
  thresholds?: WidgetThreshold[];
  colorScheme?: Partial<WidgetColorScheme>;
  refreshIntervalMs?: number;
  autoRefresh?: boolean;
}

export interface WidgetUpdateInput {
  title?: string;
  description?: string;
  config?: Partial<WidgetConfig>;
  layout?: Partial<WidgetLayout>;
  dataSource?: Partial<WidgetDataSourceConfig>;
  thresholds?: WidgetThreshold[];
  colorScheme?: Partial<WidgetColorScheme>;
  refreshIntervalMs?: number;
  autoRefresh?: boolean;
  isVisible?: boolean;
  isLocked?: boolean;
  zIndex?: number;
}

export interface WidgetBatchUpdate {
  id: string;
  layout?: Partial<WidgetLayout>;
  zIndex?: number;
  isVisible?: boolean;
}

// ── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_COLOR_SCHEME: WidgetColorScheme = {
  primary: "#3b82f6",
  secondary: "#8b5cf6",
  accent: "#06b6d4",
  background: "#ffffff",
  text: "#1f2937",
  border: "#e5e7eb",
};

const DEFAULT_LAYOUT: WidgetLayout = {
  x: 0,
  y: 0,
  w: 6,
  h: 4,
  minW: 2,
  minH: 2,
};

function getDefaultConfig(type: WidgetType): WidgetConfig {
  switch (type) {
    case "line_chart":
      return {
        type: "line_chart",
        showGrid: true,
        showLegend: true,
        showTooltip: true,
        showDots: false,
        lineWidth: 2,
        fillOpacity: 0.1,
        curveType: "monotone",
        colors: ["#3b82f6", "#ef4444", "#10b981", "#f59e0b"],
        yAxisLabel: "",
        xAxisLabel: "",
        animationDuration: 300,
      };
    case "area_chart":
      return {
        type: "area_chart",
        showGrid: true,
        showLegend: true,
        showTooltip: true,
        stackAreas: false,
        fillOpacity: 0.3,
        curveType: "monotone",
        colors: ["#3b82f6", "#8b5cf6", "#06b6d4"],
        yAxisLabel: "",
        xAxisLabel: "",
        gradient: true,
        animationDuration: 300,
      };
    case "bar_chart":
      return {
        type: "bar_chart",
        showGrid: true,
        showLegend: true,
        showTooltip: true,
        orientation: "vertical",
        barRadius: 4,
        colors: ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981"],
        yAxisLabel: "",
        xAxisLabel: "",
        stacked: false,
        grouped: true,
        animationDuration: 300,
      };
    case "gauge":
      return {
        type: "gauge",
        min: 0,
        max: 100,
        value: 0,
        unit: "%",
        decimals: 0,
        segments: [
          { from: 0, to: 33, color: "#ef4444" },
          { from: 33, to: 66, color: "#f59e0b" },
          { from: 66, to: 100, color: "#10b981" },
        ],
        showValue: true,
        showLabel: true,
        size: "md",
      };
    case "table":
      return {
        type: "table",
        columns: [],
        pageSize: 10,
        showPagination: true,
        showSearch: true,
        showExport: false,
        striped: true,
        compact: false,
        emptyMessage: "No data available",
      };
    case "map":
      return {
        type: "map",
        center: { lat: 0, lng: 0 },
        zoom: 2,
        mapStyle: "street",
        showMarkers: true,
        showHeatmap: false,
        showClusters: true,
      };
    case "heatmap":
      return {
        type: "heatmap",
        colorScale: ["#eff6ff", "#3b82f6", "#1e40af"],
        xLabel: "",
        yLabel: "",
        showValues: true,
        cellSize: 40,
        borderRadius: 4,
      };
    case "status":
      return {
        type: "status",
        value: "offline",
        statusMap: {
          online: { label: "Online", color: "#10b981", icon: "check-circle" },
          offline: { label: "Offline", color: "#6b7280", icon: "x-circle" },
          warning: { label: "Warning", color: "#f59e0b", icon: "alert-triangle" },
          error: { label: "Error", color: "#ef4444", icon: "alert-circle" },
        },
        showLabel: true,
        showIcon: true,
        size: "md",
        animation: "none",
      };
    case "kpi":
      return {
        type: "kpi",
        value: 0,
        unit: "",
        format: "number",
        decimals: 0,
        showTrend: true,
        trendDirection: "neutral",
        trendColor: "#6b7280",
        showSparkline: false,
        sparklineData: [],
        comparisonLabel: "vs previous period",
        size: "md",
      };
    case "text":
      return {
        type: "text",
        content: "",
        format: "markdown",
        fontSize: "md",
        fontWeight: "normal",
        color: "#1f2937",
        alignment: "left",
        lineHeight: 1.5,
      };
    case "image":
      return {
        type: "image",
        src: "",
        alt: "",
        fit: "cover",
        borderRadius: 8,
        showCaption: false,
        caption: "",
        lazyLoad: true,
      };
    case "pie_chart":
      return {
        type: "pie_chart",
        colors: ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"],
        showLegend: true,
        showTooltip: true,
        showLabels: true,
        innerRadius: 0,
        padAngle: 2,
        animationDuration: 300,
        labelFormat: "percent",
      };
    case "sparkline":
      return {
        type: "sparkline",
        color: "#3b82f6",
        lineWidth: 2,
        showArea: true,
        fillOpacity: 0.2,
        curveType: "monotone",
      };
    case "progress":
      return {
        type: "progress",
        value: 0,
        max: 100,
        color: "#3b82f6",
        trackColor: "#e5e7eb",
        height: 8,
        borderRadius: 4,
        showLabel: true,
        labelFormat: "percent",
        animationDuration: 500,
      };
  }
}

// ── In-Memory Store ──────────────────────────────────────────────────────────

const widgets = new Map<string, Widget>();

// ── Widget Service ───────────────────────────────────────────────────────────

export class WidgetService {
  createWidget(input: WidgetCreateInput): Widget {
    const id = crypto.randomUUID();
    const now = new Date();

    const baseConfig = getDefaultConfig(input.type);
    const config = { ...baseConfig, ...input.config } as WidgetConfig;

    const widget: Widget = {
      id,
      dashboardId: input.dashboardId,
      type: input.type,
      title: input.title,
      description: input.description ?? "",
      config,
      layout: { ...DEFAULT_LAYOUT, ...input.layout },
      dataSource: {
        sourceType: "static",
        ...input.dataSource,
      },
      thresholds: input.thresholds ?? [],
      colorScheme: { ...DEFAULT_COLOR_SCHEME, ...input.colorScheme },
      refreshIntervalMs: input.refreshIntervalMs ?? 30_000,
      autoRefresh: input.autoRefresh ?? true,
      isVisible: true,
      isLocked: false,
      zIndex: this.getNextZIndex(input.dashboardId),
      createdAt: now,
      updatedAt: now,
    };

    widgets.set(id, widget);
    return widget;
  }

  getWidget(id: string): Widget | null {
    return widgets.get(id) ?? null;
  }

  updateWidget(id: string, input: WidgetUpdateInput): Widget | null {
    const existing = widgets.get(id);
    if (!existing) return null;

    const updated: Widget = {
      ...existing,
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.config !== undefined && {
        config: { ...existing.config, ...input.config } as WidgetConfig,
      }),
      ...(input.layout !== undefined && {
        layout: { ...existing.layout, ...input.layout },
      }),
      ...(input.dataSource !== undefined && {
        dataSource: { ...existing.dataSource, ...input.dataSource },
      }),
      ...(input.thresholds !== undefined && { thresholds: input.thresholds }),
      ...(input.colorScheme !== undefined && {
        colorScheme: { ...existing.colorScheme, ...input.colorScheme },
      }),
      ...(input.refreshIntervalMs !== undefined && {
        refreshIntervalMs: input.refreshIntervalMs,
      }),
      ...(input.autoRefresh !== undefined && { autoRefresh: input.autoRefresh }),
      ...(input.isVisible !== undefined && { isVisible: input.isVisible }),
      ...(input.isLocked !== undefined && { isLocked: input.isLocked }),
      ...(input.zIndex !== undefined && { zIndex: input.zIndex }),
      updatedAt: new Date(),
    };

    widgets.set(id, updated);
    return updated;
  }

  deleteWidget(id: string): boolean {
    return widgets.delete(id);
  }

  getDashboardWidgets(dashboardId: string): Widget[] {
    return Array.from(widgets.values())
      .filter((w) => w.dashboardId === dashboardId)
      .sort((a, b) => a.zIndex - b.zIndex);
  }

  getVisibleWidgets(dashboardId: string): Widget[] {
    return this.getDashboardWidgets(dashboardId).filter((w) => w.isVisible);
  }

  batchUpdateWidgets(updates: WidgetBatchUpdate[]): Widget[] {
    const results: Widget[] = [];
    for (const update of updates) {
      const widget = widgets.get(update.id);
      if (!widget) continue;
      if (update.layout) widget.layout = { ...widget.layout, ...update.layout };
      if (update.zIndex !== undefined) widget.zIndex = update.zIndex;
      if (update.isVisible !== undefined) widget.isVisible = update.isVisible;
      widget.updatedAt = new Date();
      results.push(widget);
    }
    return results;
  }

  // ─── Layout helpers ──────────────────────────────────────────────────

  reorderWidgets(
    dashboardId: string,
    widgetIds: string[]
  ): Widget[] {
    const updated: Widget[] = [];
    widgetIds.forEach((id, index) => {
      const widget = widgets.get(id);
      if (widget && widget.dashboardId === dashboardId) {
        widget.zIndex = index;
        widget.updatedAt = new Date();
        updated.push(widget);
      }
    });
    return updated;
  }

  resizeWidget(
    id: string,
    layout: Partial<WidgetLayout>
  ): Widget | null {
    const widget = widgets.get(id);
    if (!widget) return null;

    if (layout.w !== undefined && widget.layout.minW) {
      layout.w = Math.max(layout.w, widget.layout.minW);
    }
    if (layout.h !== undefined && widget.layout.minH) {
      layout.h = Math.max(layout.h, widget.layout.minH);
    }
    if (layout.w !== undefined && widget.layout.maxW) {
      layout.w = Math.min(layout.w, widget.layout.maxW);
    }
    if (layout.h !== undefined && widget.layout.maxH) {
      layout.h = Math.min(layout.h, widget.layout.maxH);
    }

    widget.layout = { ...widget.layout, ...layout };
    widget.updatedAt = new Date();
    return widget;
  }

  moveWidget(
    id: string,
    x: number,
    y: number
  ): Widget | null {
    const widget = widgets.get(id);
    if (!widget) return null;
    widget.layout.x = Math.max(0, x);
    widget.layout.y = Math.max(0, y);
    widget.updatedAt = new Date();
    return widget;
  }

  private getNextZIndex(dashboardId: string): number {
    const dashboardWidgets = this.getDashboardWidgets(dashboardId);
    if (dashboardWidgets.length === 0) return 0;
    return Math.max(...dashboardWidgets.map((w) => w.zIndex)) + 1;
  }

  // ─── Clone ───────────────────────────────────────────────────────────

  cloneWidget(
    widgetId: string,
    newDashboardId: string,
    offsetLayout = true
  ): Widget | null {
    const source = widgets.get(widgetId);
    if (!source) return null;

    const id = crypto.randomUUID();
    const now = new Date();
    const clone: Widget = {
      ...source,
      id,
      dashboardId: newDashboardId,
      layout: offsetLayout
        ? { ...source.layout, x: source.layout.x + 1, y: source.layout.y + 1 }
        : { ...source.layout },
      thresholds: source.thresholds.map((t) => ({ ...t, id: crypto.randomUUID() })),
      createdAt: now,
      updatedAt: now,
    };

    widgets.set(id, clone);
    return clone;
  }

  // ─── Validation ──────────────────────────────────────────────────────

  validateWidget(widget: Widget): string[] {
    const errors: string[] = [];

    if (!widget.title.trim()) errors.push("Title is required");
    if (widget.layout.w < 1) errors.push("Width must be at least 1");
    if (widget.layout.h < 1) errors.push("Height must be at least 1");
    if (widget.refreshIntervalMs < 1000) {
      errors.push("Refresh interval must be at least 1 second");
    }

    if (widget.dataSource.sourceType === "custom_sql" && !widget.dataSource.sql) {
      errors.push("SQL query is required for custom SQL data source");
    }
    if (widget.dataSource.sourceType === "api" && !widget.dataSource.apiUrl) {
      errors.push("API URL is required for API data source");
    }
    if (widget.dataSource.sourceType === "device" && !widget.dataSource.deviceId) {
      errors.push("Device ID is required for device data source");
    }

    return errors;
  }

  // ─── Bulk operations ─────────────────────────────────────────────────

  deleteDashboardWidgets(dashboardId: string): number {
    let count = 0;
    for (const [key, widget] of widgets) {
      if (widget.dashboardId === dashboardId) {
        widgets.delete(key);
        count++;
      }
    }
    return count;
  }

  getWidgetCount(dashboardId: string): number {
    return Array.from(widgets.values()).filter(
      (w) => w.dashboardId === dashboardId
    ).length;
  }

  getWidgetsByType(dashboardId: string, type: WidgetType): Widget[] {
    return Array.from(widgets.values()).filter(
      (w) => w.dashboardId === dashboardId && w.type === type
    );
  }

  exportWidgets(dashboardId: string): Widget[] {
    return this.getDashboardWidgets(dashboardId).map((w) => ({ ...w }));
  }

  importWidgets(
    dashboardId: string,
    widgetData: Widget[]
  ): Widget[] {
    const imported: Widget[] = [];
    for (const data of widgetData) {
      const id = crypto.randomUUID();
      const widget: Widget = {
        ...data,
        id,
        dashboardId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      widgets.set(id, widget);
      imported.push(widget);
    }
    return imported;
  }
}

// ── Factory ──────────────────────────────────────────────────────────────────

let defaultService: WidgetService | null = null;

export function getWidgetService(): WidgetService {
  if (!defaultService) defaultService = new WidgetService();
  return defaultService;
}

export function createWidgetService(): WidgetService {
  return new WidgetService();
}
