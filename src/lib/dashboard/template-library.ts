/**
 * Dashboard template library.
 * Provides built-in templates for common IoT use cases:
 * environmental monitoring, industrial IoT, smart home, fleet tracking,
 * energy management, and custom template creation.
 */

import crypto from "crypto";

// ── Types ────────────────────────────────────────────────────────────────────

export type TemplateCategory =
  | "environmental"
  | "industrial"
  | "smart_home"
  | "fleet"
  | "energy"
  | "custom";

export type WidgetTemplateType =
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
  | "sparkline"
  | "progress";

export interface TemplateWidget {
  id: string;
  type: WidgetTemplateType;
  title: string;
  description: string;
  layout: { x: number; y: number; w: number; h: number };
  config: Record<string, unknown>;
  dataSource: {
    sourceType: "device" | "aggregated" | "custom_sql" | "api" | "static";
    deviceId?: string;
    metric?: string;
    aggregation?: string;
    timeRange?: string;
    filters?: { field: string; operator: string; value: unknown }[];
  };
  refreshIntervalMs: number;
  thresholds?: {
    id: string;
    label: string;
    value: number;
    color: string;
    condition: string;
  }[];
}

export interface TemplateVariable {
  name: string;
  label: string;
  type: "text" | "number" | "select" | "device" | "location";
  defaultValue: string;
  options?: string[];
  required: boolean;
  description: string;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  thumbnailUrl: string;
  widgets: TemplateWidget[];
  variables: TemplateVariable[];
  tags: string[];
  isBuiltIn: boolean;
  createdBy: string;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
  layout: {
    columns: number;
    rowHeight: number;
    gap: number;
  };
}

export interface TemplateCreateInput {
  name: string;
  description: string;
  category: TemplateCategory;
  widgets: Omit<TemplateWidget, "id">[];
  variables?: TemplateVariable[];
  tags?: string[];
  layout?: Partial<DashboardTemplate["layout"]>;
}

export interface TemplateSearchOptions {
  category?: TemplateCategory;
  search?: string;
  tags?: string[];
  sortBy?: "name" | "usageCount" | "createdAt";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

// ── Built-in Templates ───────────────────────────────────────────────────────

const BUILT_IN_TEMPLATES: DashboardTemplate[] = [
  {
    id: "tpl-environmental",
    name: "Environmental Monitoring",
    description: "Monitor air quality, temperature, humidity, and weather conditions across sensor networks.",
    category: "environmental",
    thumbnailUrl: "/templates/environmental.png",
    tags: ["environment", "sensors", "weather", "air-quality"],
    isBuiltIn: true,
    createdBy: "system",
    usageCount: 1247,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-06-20"),
    layout: { columns: 12, rowHeight: 80, gap: 16 },
    variables: [
      {
        name: "locationId",
        label: "Location",
        type: "location",
        defaultValue: "",
        required: true,
        description: "Select monitoring location",
      },
      {
        name: "timeRange",
        label: "Time Range",
        type: "select",
        defaultValue: "24h",
        options: ["1h", "6h", "12h", "24h", "7d", "30d"],
        required: false,
        description: "Data time range",
      },
    ],
    widgets: [
      {
        id: "w-env-temp",
        type: "line_chart",
        title: "Temperature Trend",
        description: "Real-time temperature readings",
        layout: { x: 0, y: 0, w: 6, h: 4 },
        config: {
          showGrid: true,
          showLegend: true,
          yAxisLabel: "Temperature (°C)",
          colors: ["#ef4444", "#f59e0b"],
          curveType: "monotone",
        },
        dataSource: { sourceType: "device", metric: "temperature", aggregation: "avg", timeRange: "24h" },
        refreshIntervalMs: 30_000,
        thresholds: [
          { id: "th-1", label: "High", value: 35, color: "#ef4444", condition: "gt" },
          { id: "th-2", label: "Low", value: 5, color: "#3b82f6", condition: "lt" },
        ],
      },
      {
        id: "w-env-humidity",
        type: "gauge",
        title: "Humidity Level",
        description: "Current humidity percentage",
        layout: { x: 6, y: 0, w: 3, h: 4 },
        config: {
          min: 0,
          max: 100,
          unit: "%",
          segments: [
            { from: 0, to: 30, color: "#f59e0b" },
            { from: 30, to: 60, color: "#10b981" },
            { from: 60, to: 100, color: "#3b82f6" },
          ],
          showValue: true,
          showLabel: true,
          size: "md",
        },
        dataSource: { sourceType: "device", metric: "humidity", aggregation: "avg" },
        refreshIntervalMs: 30_000,
      },
      {
        id: "w-env-aqi",
        type: "kpi",
        title: "Air Quality Index",
        description: "Current AQI reading",
        layout: { x: 9, y: 0, w: 3, h: 4 },
        config: {
          unit: "AQI",
          format: "number",
          decimals: 0,
          showTrend: true,
          comparisonLabel: "vs yesterday",
          icon: "wind",
          size: "md",
        },
        dataSource: { sourceType: "device", metric: "aqi", aggregation: "avg" },
        refreshIntervalMs: 60_000,
        thresholds: [
          { id: "th-aqi-1", label: "Good", value: 50, color: "#10b981", condition: "lt" },
          { id: "th-aqi-2", label: "Moderate", value: 100, color: "#f59e0b", condition: "gt" },
        ],
      },
      {
        id: "w-env-pressure",
        type: "area_chart",
        title: "Barometric Pressure",
        description: "Atmospheric pressure trend",
        layout: { x: 0, y: 4, w: 6, h: 4 },
        config: {
          showGrid: true,
          yAxisLabel: "hPa",
          gradient: true,
          colors: ["#8b5cf6"],
        },
        dataSource: { sourceType: "device", metric: "pressure", aggregation: "avg", timeRange: "24h" },
        refreshIntervalMs: 60_000,
      },
      {
        id: "w-env-devices",
        type: "table",
        title: "Sensor Status",
        description: "Overview of all environmental sensors",
        layout: { x: 6, y: 4, w: 6, h: 4 },
        config: {
          columns: [
            { field: "name", header: "Sensor", sortable: true },
            { field: "status", header: "Status", sortable: true },
            { field: "battery", header: "Battery", sortable: true },
            { field: "lastSeen", header: "Last Seen", sortable: true },
          ],
          pageSize: 10,
          showPagination: true,
          showSearch: true,
          striped: true,
        },
        dataSource: { sourceType: "aggregated", metrics: ["status"], aggregation: "last" },
        refreshIntervalMs: 60_000,
      },
      {
        id: "w-env-map",
        type: "map",
        title: "Sensor Locations",
        description: "Map view of all sensors",
        layout: { x: 0, y: 8, w: 8, h: 6 },
        config: {
          center: { lat: 40.7128, lng: -74.006 },
          zoom: 12,
          mapStyle: "street",
          showMarkers: true,
          showClusters: true,
        },
        dataSource: { sourceType: "aggregated", metrics: ["location"], aggregation: "first" },
        refreshIntervalMs: 120_000,
      },
      {
        id: "w-env-wind",
        type: "bar_chart",
        title: "Wind Speed",
        description: "Wind speed distribution",
        layout: { x: 8, y: 8, w: 4, h: 6 },
        config: {
          orientation: "vertical",
          barRadius: 4,
          showGrid: true,
          showLegend: false,
          yAxisLabel: "m/s",
          colors: ["#06b6d4"],
        },
        dataSource: { sourceType: "device", metric: "wind_speed", aggregation: "avg", timeRange: "24h" },
        refreshIntervalMs: 60_000,
      },
    ],
  },
  {
    id: "tpl-industrial",
    name: "Industrial IoT",
    description: "Monitor manufacturing equipment, production lines, and factory floor metrics.",
    category: "industrial",
    thumbnailUrl: "/templates/industrial.png",
    tags: ["manufacturing", "equipment", "production", "factory"],
    isBuiltIn: true,
    createdBy: "system",
    usageCount: 892,
    createdAt: new Date("2024-02-10"),
    updatedAt: new Date("2024-07-15"),
    layout: { columns: 12, rowHeight: 80, gap: 16 },
    variables: [
      {
        name: "productionLine",
        label: "Production Line",
        type: "select",
        defaultValue: "line-1",
        options: ["line-1", "line-2", "line-3", "line-4"],
        required: true,
        description: "Select production line",
      },
    ],
    widgets: [
      {
        id: "w-ind-oee",
        type: "kpi",
        title: "OEE Score",
        description: "Overall Equipment Effectiveness",
        layout: { x: 0, y: 0, w: 3, h: 3 },
        config: {
          unit: "%",
          format: "percent",
          decimals: 1,
          showTrend: true,
          showSparkline: true,
          sparklineData: [72, 75, 78, 74, 80, 82, 79, 85],
          comparisonLabel: "vs target 85%",
          icon: "activity",
          size: "lg",
        },
        dataSource: { sourceType: "aggregated", metrics: ["oee"], aggregation: "avg" },
        refreshIntervalMs: 60_000,
      },
      {
        id: "w-ind-downtime",
        type: "kpi",
        title: "Downtime",
        description: "Unplanned downtime today",
        layout: { x: 3, y: 0, w: 3, h: 3 },
        config: {
          unit: "min",
          format: "duration",
          showTrend: true,
          comparisonLabel: "vs yesterday",
          icon: "clock",
          size: "lg",
        },
        dataSource: { sourceType: "aggregated", metrics: ["downtime"], aggregation: "sum" },
        refreshIntervalMs: 60_000,
      },
      {
        id: "w-ind-throughput",
        type: "kpi",
        title: "Throughput",
        description: "Units per hour",
        layout: { x: 6, y: 0, w: 3, h: 3 },
        config: {
          unit: "units/hr",
          format: "number",
          decimals: 0,
          showTrend: true,
          icon: "zap",
          size: "lg",
        },
        dataSource: { sourceType: "aggregated", metrics: ["throughput"], aggregation: "avg" },
        refreshIntervalMs: 30_000,
      },
      {
        id: "w-ind-defects",
        type: "kpi",
        title: "Defect Rate",
        description: "Defects per million",
        layout: { x: 9, y: 0, w: 3, h: 3 },
        config: {
          unit: "DPM",
          format: "number",
          decimals: 0,
          showTrend: true,
          icon: "alert-triangle",
          size: "lg",
        },
        dataSource: { sourceType: "aggregated", metrics: ["defects"], aggregation: "sum" },
        refreshIntervalMs: 60_000,
        thresholds: [
          { id: "th-def", label: "Critical", value: 100, color: "#ef4444", condition: "gt" },
        ],
      },
      {
        id: "w-ind-vibration",
        type: "line_chart",
        title: "Vibration Analysis",
        description: "Machine vibration frequency",
        layout: { x: 0, y: 3, w: 6, h: 5 },
        config: {
          showGrid: true,
          showLegend: true,
          yAxisLabel: "mm/s",
          colors: ["#3b82f6", "#ef4444"],
          curveType: "monotone",
        },
        dataSource: { sourceType: "device", metric: "vibration", aggregation: "avg", timeRange: "12h" },
        refreshIntervalMs: 10_000,
        thresholds: [
          { id: "th-vib", label: "Alert", value: 7.1, color: "#ef4444", condition: "gt" },
        ],
      },
      {
        id: "w-ind-temperature",
        type: "area_chart",
        title: "Machine Temperature",
        description: "Motor and bearing temperatures",
        layout: { x: 6, y: 3, w: 6, h: 5 },
        config: {
          showGrid: true,
          stackAreas: false,
          gradient: true,
          colors: ["#ef4444", "#f59e0b", "#3b82f6"],
          yAxisLabel: "°C",
        },
        dataSource: { sourceType: "device", metric: "temperature", aggregation: "avg", timeRange: "12h" },
        refreshIntervalMs: 15_000,
      },
      {
        id: "w-ind-status",
        type: "status",
        title: "Line Status",
        description: "Current production line status",
        layout: { x: 0, y: 8, w: 4, h: 3 },
        config: {
          value: "running",
          statusMap: {
            running: { label: "Running", color: "#10b981", icon: "play-circle" },
            stopped: { label: "Stopped", color: "#6b7280", icon: "pause-circle" },
            maintenance: { label: "Maintenance", color: "#f59e0b", icon: "tool" },
            fault: { label: "Fault", color: "#ef4444", icon: "alert-circle" },
          },
          showLabel: true,
          showIcon: true,
          size: "lg",
          animation: "none",
        },
        dataSource: { sourceType: "device", metric: "status", aggregation: "last" },
        refreshIntervalMs: 10_000,
      },
      {
        id: "w-ind-maintenance",
        type: "table",
        title: "Maintenance Schedule",
        description: "Upcoming maintenance tasks",
        layout: { x: 4, y: 8, w: 8, h: 3 },
        config: {
          columns: [
            { field: "equipment", header: "Equipment", sortable: true },
            { field: "task", header: "Task", sortable: false },
            { field: "dueDate", header: "Due Date", sortable: true },
            { field: "priority", header: "Priority", sortable: true },
            { field: "status", header: "Status", sortable: true },
          ],
          pageSize: 5,
          showPagination: true,
          showSearch: false,
          striped: true,
        },
        dataSource: { sourceType: "static", data: [], format: "json" },
        refreshIntervalMs: 300_000,
      },
    ],
  },
  {
    id: "tpl-smart-home",
    name: "Smart Home",
    description: "Control and monitor smart home devices, energy usage, and security systems.",
    category: "smart_home",
    thumbnailUrl: "/templates/smart-home.png",
    tags: ["home", "iot", "automation", "security"],
    isBuiltIn: true,
    createdBy: "system",
    usageCount: 2103,
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-08-01"),
    layout: { columns: 12, rowHeight: 80, gap: 16 },
    variables: [
      {
        name: "homeId",
        label: "Home",
        type: "select",
        defaultValue: "home-1",
        options: ["home-1", "home-2"],
        required: true,
        description: "Select home",
      },
    ],
    widgets: [
      {
        id: "w-sh-temp",
        type: "gauge",
        title: "Indoor Temperature",
        description: "Current indoor temperature",
        layout: { x: 0, y: 0, w: 3, h: 4 },
        config: {
          min: 15,
          max: 30,
          unit: "°C",
          segments: [
            { from: 15, to: 18, color: "#3b82f6" },
            { from: 18, to: 24, color: "#10b981" },
            { from: 24, to: 30, color: "#ef4444" },
          ],
          showValue: true,
          showLabel: true,
          size: "md",
        },
        dataSource: { sourceType: "device", metric: "indoor_temp", aggregation: "avg" },
        refreshIntervalMs: 30_000,
      },
      {
        id: "w-sh-energy",
        type: "area_chart",
        title: "Energy Consumption",
        description: "Real-time power usage",
        layout: { x: 3, y: 0, w: 6, h: 4 },
        config: {
          showGrid: true,
          gradient: true,
          colors: ["#f59e0b", "#10b981"],
          yAxisLabel: "Watts",
        },
        dataSource: { sourceType: "device", metric: "power", aggregation: "avg", timeRange: "24h" },
        refreshIntervalMs: 15_000,
      },
      {
        id: "w-sh-security",
        type: "status",
        title: "Security System",
        description: "Armed/Disarmed status",
        layout: { x: 9, y: 0, w: 3, h: 4 },
        config: {
          value: "armed",
          statusMap: {
            armed: { label: "Armed", color: "#10b981", icon: "shield" },
            disarmed: { label: "Disarmed", color: "#6b7280", icon: "shield-off" },
            triggered: { label: "Triggered", color: "#ef4444", icon: "alert-triangle" },
          },
          showLabel: true,
          showIcon: true,
          size: "xl",
          animation: "pulse",
        },
        dataSource: { sourceType: "device", metric: "security_status", aggregation: "last" },
        refreshIntervalMs: 10_000,
      },
      {
        id: "w-sh-devices",
        type: "bar_chart",
        title: "Device Power Usage",
        description: "Power consumption by device",
        layout: { x: 0, y: 4, w: 6, h: 5 },
        config: {
          orientation: "vertical",
          barRadius: 4,
          showGrid: true,
          showLegend: false,
          colors: ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"],
        },
        dataSource: { sourceType: "aggregated", metrics: ["power"], aggregation: "sum", groupBy: "device" },
        refreshIntervalMs: 60_000,
      },
      {
        id: "w-sh-rooms",
        type: "heatmap",
        title: "Room Occupancy",
        description: "Heatmap of room occupancy",
        layout: { x: 6, y: 4, w: 6, h: 5 },
        config: {
          colorScale: ["#f0fdf4", "#86efac", "#22c55e", "#15803d"],
          xLabel: "Room",
          yLabel: "Hour",
          showValues: true,
          cellSize: 40,
        },
        dataSource: { sourceType: "aggregated", metrics: ["occupancy"], aggregation: "avg", groupBy: "location" },
        refreshIntervalMs: 300_000,
      },
    ],
  },
  {
    id: "tpl-fleet",
    name: "Fleet Tracking",
    description: "Track vehicle locations, fuel consumption, driver behavior, and route optimization.",
    category: "fleet",
    thumbnailUrl: "/templates/fleet.png",
    tags: ["vehicles", "tracking", "logistics", "transport"],
    isBuiltIn: true,
    createdBy: "system",
    usageCount: 654,
    createdAt: new Date("2024-03-05"),
    updatedAt: new Date("2024-07-22"),
    layout: { columns: 12, rowHeight: 80, gap: 16 },
    variables: [
      {
        name: "fleetId",
        label: "Fleet",
        type: "select",
        defaultValue: "all",
        options: ["all", "delivery", "logistics", "service"],
        required: true,
        description: "Select fleet",
      },
    ],
    widgets: [
      {
        id: "w-fl-map",
        type: "map",
        title: "Vehicle Locations",
        description: "Real-time vehicle tracking",
        layout: { x: 0, y: 0, w: 8, h: 7 },
        config: {
          center: { lat: 40.7128, lng: -74.006 },
          zoom: 11,
          mapStyle: "dark",
          showMarkers: true,
          showClusters: true,
        },
        dataSource: { sourceType: "aggregated", metrics: ["location"], aggregation: "first" },
        refreshIntervalMs: 10_000,
      },
      {
        id: "w-fl-active",
        type: "kpi",
        title: "Active Vehicles",
        description: "Currently active vehicles",
        layout: { x: 8, y: 0, w: 2, h: 3 },
        config: {
          unit: "",
          format: "number",
          showTrend: true,
          comparisonLabel: "vs last hour",
          icon: "truck",
          size: "md",
        },
        dataSource: { sourceType: "aggregated", metrics: ["status"], aggregation: "count" },
        refreshIntervalMs: 30_000,
      },
      {
        id: "w-fl-idle",
        type: "kpi",
        title: "Idle Time",
        description: "Total idle minutes today",
        layout: { x: 10, y: 0, w: 2, h: 3 },
        config: {
          unit: "min",
          format: "duration",
          showTrend: true,
          comparisonLabel: "vs average",
          icon: "clock",
          size: "md",
        },
        dataSource: { sourceType: "aggregated", metrics: ["idle_time"], aggregation: "sum" },
        refreshIntervalMs: 60_000,
      },
      {
        id: "w-fl-fuel",
        type: "line_chart",
        title: "Fuel Consumption",
        description: "Fuel usage trend",
        layout: { x: 8, y: 3, w: 4, h: 4 },
        config: {
          showGrid: true,
          showLegend: false,
          yAxisLabel: "L/hr",
          colors: ["#f59e0b"],
          curveType: "monotone",
        },
        dataSource: { sourceType: "device", metric: "fuel", aggregation: "avg", timeRange: "24h" },
        refreshIntervalMs: 60_000,
      },
      {
        id: "w-fl-speed",
        type: "bar_chart",
        title: "Speed Distribution",
        description: "Vehicle speed histogram",
        layout: { x: 0, y: 7, w: 6, h: 4 },
        config: {
          orientation: "vertical",
          barRadius: 4,
          showGrid: true,
          showLegend: false,
          colors: ["#10b981"],
        },
        dataSource: { sourceType: "aggregated", metrics: ["speed"], aggregation: "avg" },
        refreshIntervalMs: 60_000,
      },
      {
        id: "w-fl-table",
        type: "table",
        title: "Vehicle Status",
        description: "All vehicles overview",
        layout: { x: 6, y: 7, w: 6, h: 4 },
        config: {
          columns: [
            { field: "vehicle", header: "Vehicle", sortable: true },
            { field: "driver", header: "Driver", sortable: true },
            { field: "status", header: "Status", sortable: true },
            { field: "speed", header: "Speed", sortable: true },
            { field: "fuel", header: "Fuel", sortable: true },
          ],
          pageSize: 8,
          showPagination: true,
          showSearch: true,
          striped: true,
        },
        dataSource: { sourceType: "aggregated", metrics: ["status", "speed", "fuel"], aggregation: "last" },
        refreshIntervalMs: 30_000,
      },
    ],
  },
  {
    id: "tpl-energy",
    name: "Energy Management",
    description: "Monitor energy production, consumption, grid status, and sustainability metrics.",
    category: "energy",
    thumbnailUrl: "/templates/energy.png",
    tags: ["energy", "power", "solar", "grid", "sustainability"],
    isBuiltIn: true,
    createdBy: "system",
    usageCount: 478,
    createdAt: new Date("2024-04-01"),
    updatedAt: new Date("2024-08-10"),
    layout: { columns: 12, rowHeight: 80, gap: 16 },
    variables: [
      {
        name: "siteId",
        label: "Site",
        type: "location",
        defaultValue: "",
        required: true,
        description: "Select energy site",
      },
    ],
    widgets: [
      {
        id: "w-en-production",
        type: "kpi",
        title: "Total Production",
        description: "Energy produced today",
        layout: { x: 0, y: 0, w: 3, h: 3 },
        config: {
          unit: "kWh",
          format: "number",
          decimals: 0,
          showTrend: true,
          showSparkline: true,
          sparklineData: [1200, 1350, 1180, 1420, 1380, 1500, 1450, 1520],
          comparisonLabel: "vs yesterday",
          icon: "zap",
          size: "lg",
        },
        dataSource: { sourceType: "aggregated", metrics: ["production"], aggregation: "sum" },
        refreshIntervalMs: 60_000,
      },
      {
        id: "w-en-consumption",
        type: "kpi",
        title: "Total Consumption",
        description: "Energy consumed today",
        layout: { x: 3, y: 0, w: 3, h: 3 },
        config: {
          unit: "kWh",
          format: "number",
          decimals: 0,
          showTrend: true,
          comparisonLabel: "vs yesterday",
          icon: "zap-off",
          size: "lg",
        },
        dataSource: { sourceType: "aggregated", metrics: ["consumption"], aggregation: "sum" },
        refreshIntervalMs: 60_000,
      },
      {
        id: "w-en-net",
        type: "kpi",
        title: "Net Energy",
        description: "Production minus consumption",
        layout: { x: 6, y: 0, w: 3, h: 3 },
        config: {
          unit: "kWh",
          format: "number",
          decimals: 0,
          showTrend: true,
          comparisonLabel: "surplus/deficit",
          icon: "activity",
          size: "lg",
        },
        dataSource: { sourceType: "custom_sql", sql: "SELECT production - consumption as net FROM energy" },
        refreshIntervalMs: 60_000,
      },
      {
        id: "w-en-efficiency",
        type: "gauge",
        title: "Grid Efficiency",
        description: "Current grid efficiency",
        layout: { x: 9, y: 0, w: 3, h: 3 },
        config: {
          min: 0,
          max: 100,
          unit: "%",
          segments: [
            { from: 0, to: 60, color: "#ef4444" },
            { from: 60, to: 80, color: "#f59e0b" },
            { from: 80, to: 100, color: "#10b981" },
          ],
          showValue: true,
          showLabel: true,
          size: "md",
        },
        dataSource: { sourceType: "aggregated", metrics: ["efficiency"], aggregation: "avg" },
        refreshIntervalMs: 30_000,
      },
      {
        id: "w-en-trend",
        type: "area_chart",
        title: "Production vs Consumption",
        description: "Energy balance over time",
        layout: { x: 0, y: 3, w: 8, h: 5 },
        config: {
          showGrid: true,
          stackAreas: false,
          gradient: true,
          colors: ["#10b981", "#ef4444"],
          yAxisLabel: "kW",
        },
        dataSource: { sourceType: "aggregated", metrics: ["production", "consumption"], aggregation: "avg", timeRange: "24h" },
        refreshIntervalMs: 60_000,
      },
      {
        id: "w-en-solar",
        type: "progress",
        title: "Solar Panel Output",
        description: "Current vs max capacity",
        layout: { x: 8, y: 3, w: 4, h: 2 },
        config: {
          value: 78,
          max: 100,
          color: "#f59e0b",
          trackColor: "#e5e7eb",
          height: 16,
          borderRadius: 8,
          showLabel: true,
          labelFormat: "percent",
          animationDuration: 500,
        },
        dataSource: { sourceType: "device", metric: "solar_output", aggregation: "avg" },
        refreshIntervalMs: 30_000,
      },
      {
        id: "w-en-breakdown",
        type: "pie_chart",
        title: "Energy Source Breakdown",
        description: "Sources contributing to grid",
        layout: { x: 8, y: 5, w: 4, h: 3 },
        config: {
          colors: ["#f59e0b", "#10b981", "#3b82f6", "#6b7280"],
          showLegend: true,
          showTooltip: true,
          showLabels: true,
          innerRadius: 60,
        },
        dataSource: { sourceType: "aggregated", metrics: ["source"], aggregation: "sum", groupBy: "source" },
        refreshIntervalMs: 300_000,
      },
    ],
  },
];

// ── In-Memory Store ──────────────────────────────────────────────────────────

const customTemplates = new Map<string, DashboardTemplate>();

// ── Template Library Service ─────────────────────────────────────────────────

export class TemplateLibraryService {
  getAllTemplates(): DashboardTemplate[] {
    return [
      ...BUILT_IN_TEMPLATES,
      ...Array.from(customTemplates.values()),
    ];
  }

  getTemplate(id: string): DashboardTemplate | null {
    return (
      BUILT_IN_TEMPLATES.find((t) => t.id === id) ??
      customTemplates.get(id) ??
      null
    );
  }

  searchTemplates(options: TemplateSearchOptions = {}): DashboardTemplate[] {
    let results = this.getAllTemplates();

    if (options.category) {
      results = results.filter((t) => t.category === options.category);
    }

    if (options.search) {
      const q = options.search.toLowerCase();
      results = results.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    if (options.tags?.length) {
      results = results.filter((t) =>
        options.tags!.some((tag) => t.tags.includes(tag))
      );
    }

    const sortBy = options.sortBy ?? "usageCount";
    const sortOrder = options.sortOrder ?? "desc";
    results.sort((a, b) => {
      if (sortBy === "name") {
        return sortOrder === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
      if (aVal instanceof Date && bVal instanceof Date) {
        return sortOrder === "asc"
          ? aVal.getTime() - bVal.getTime()
          : bVal.getTime() - aVal.getTime();
      }
      return 0;
    });

    const limit = options.limit ?? results.length;
    const offset = options.offset ?? 0;
    return results.slice(offset, offset + limit);
  }

  getTemplatesByCategory(category: TemplateCategory): DashboardTemplate[] {
    return this.searchTemplates({ category });
  }

  getPopularTemplates(limit = 10): DashboardTemplate[] {
    return this.searchTemplates({ sortBy: "usageCount", sortOrder: "desc", limit });
  }

  // ─── Custom Templates ────────────────────────────────────────────────

  createTemplate(input: TemplateCreateInput): DashboardTemplate {
    const id = `tpl-custom-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date();

    const template: DashboardTemplate = {
      id,
      name: input.name,
      description: input.description,
      category: input.category,
      thumbnailUrl: "",
      widgets: input.widgets.map((w) => ({
        ...w,
        id: w.id || crypto.randomUUID(),
      })),
      variables: input.variables ?? [],
      tags: input.tags ?? [],
      isBuiltIn: false,
      createdBy: "user",
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
      layout: {
        columns: 12,
        rowHeight: 80,
        gap: 16,
        ...input.layout,
      },
    };

    customTemplates.set(id, template);
    return template;
  }

  updateTemplate(
    id: string,
    input: Partial<TemplateCreateInput>
  ): DashboardTemplate | null {
    const existing = customTemplates.get(id);
    if (!existing || existing.isBuiltIn) return null;

    const updated: DashboardTemplate = {
      ...existing,
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.widgets !== undefined && {
        widgets: input.widgets.map((w) => ({
          ...w,
          id: w.id || crypto.randomUUID(),
        })),
      }),
      ...(input.variables !== undefined && { variables: input.variables }),
      ...(input.tags !== undefined && { tags: input.tags }),
      updatedAt: new Date(),
    };

    customTemplates.set(id, updated);
    return updated;
  }

  deleteTemplate(id: string): boolean {
    const existing = customTemplates.get(id);
    if (!existing || existing.isBuiltIn) return false;
    return customTemplates.delete(id);
  }

  duplicateTemplate(
    sourceId: string,
    newName: string
  ): DashboardTemplate | null {
    const source = this.getTemplate(sourceId);
    if (!source) return null;

    return this.createTemplate({
      name: newName,
      description: source.description,
      category: source.category,
      widgets: source.widgets.map((w) => ({ ...w })),
      variables: source.variables.map((v) => ({ ...v })),
      tags: [...source.tags],
      layout: { ...source.layout },
    });
  }

  incrementUsage(id: string): void {
    const builtIn = BUILT_IN_TEMPLATES.find((t) => t.id === id);
    if (builtIn) {
      builtIn.usageCount += 1;
      return;
    }
    const custom = customTemplates.get(id);
    if (custom) {
      custom.usageCount += 1;
    }
  }

  // ─── Widget Presets ──────────────────────────────────────────────────

  getWidgetPresets(): {
    category: string;
    widgets: Omit<TemplateWidget, "id">[];
  }[] {
    return [
      {
        category: "Charts",
        widgets: [
          {
            type: "line_chart",
            title: "Line Chart",
            description: "Display trends over time",
            layout: { x: 0, y: 0, w: 6, h: 4 },
            config: { showGrid: true, showLegend: true },
            dataSource: { sourceType: "device", metric: "temperature", aggregation: "avg", timeRange: "24h" },
            refreshIntervalMs: 30_000,
          },
          {
            type: "area_chart",
            title: "Area Chart",
            description: "Filled line chart for volume data",
            layout: { x: 6, y: 0, w: 6, h: 4 },
            config: { showGrid: true, gradient: true },
            dataSource: { sourceType: "device", metric: "power", aggregation: "avg", timeRange: "24h" },
            refreshIntervalMs: 30_000,
          },
          {
            type: "bar_chart",
            title: "Bar Chart",
            description: "Compare values across categories",
            layout: { x: 0, y: 4, w: 6, h: 4 },
            config: { showGrid: true, barRadius: 4 },
            dataSource: { sourceType: "aggregated", metrics: ["count"], aggregation: "count" },
            refreshIntervalMs: 60_000,
          },
          {
            type: "pie_chart",
            title: "Pie Chart",
            description: "Show proportional data",
            layout: { x: 6, y: 4, w: 6, h: 4 },
            config: { showLegend: true, showTooltip: true },
            dataSource: { sourceType: "static", data: [], format: "json" },
            refreshIntervalMs: 0,
          },
        ],
      },
      {
        category: "Indicators",
        widgets: [
          {
            type: "gauge",
            title: "Gauge",
            description: "Display a single value in range",
            layout: { x: 0, y: 0, w: 4, h: 4 },
            config: { min: 0, max: 100, showValue: true },
            dataSource: { sourceType: "device", metric: "battery", aggregation: "avg" },
            refreshIntervalMs: 30_000,
          },
          {
            type: "kpi",
            title: "KPI Card",
            description: "Key performance indicator",
            layout: { x: 4, y: 0, w: 4, h: 3 },
            config: { showTrend: true, format: "number" },
            dataSource: { sourceType: "aggregated", metrics: ["value"], aggregation: "avg" },
            refreshIntervalMs: 60_000,
          },
          {
            type: "status",
            title: "Status Indicator",
            description: "Device or system status",
            layout: { x: 8, y: 0, w: 4, h: 3 },
            config: { showLabel: true, showIcon: true },
            dataSource: { sourceType: "device", metric: "status", aggregation: "last" },
            refreshIntervalMs: 10_000,
          },
          {
            type: "progress",
            title: "Progress Bar",
            description: "Progress toward a goal",
            layout: { x: 4, y: 3, w: 8, h: 1 },
            config: { showLabel: true, height: 8 },
            dataSource: { sourceType: "static", data: { value: 75 }, format: "json" },
            refreshIntervalMs: 0,
          },
        ],
      },
      {
        category: "Data",
        widgets: [
          {
            type: "table",
            title: "Data Table",
            description: "Tabular data display",
            layout: { x: 0, y: 0, w: 12, h: 5 },
            config: { pageSize: 10, showSearch: true, showPagination: true, striped: true },
            dataSource: { sourceType: "aggregated", metrics: ["*"], aggregation: "last" },
            refreshIntervalMs: 60_000,
          },
          {
            type: "map",
            title: "Map",
            description: "Geographic visualization",
            layout: { x: 0, y: 5, w: 8, h: 6 },
            config: { center: { lat: 0, lng: 0 }, zoom: 2, mapStyle: "street" },
            dataSource: { sourceType: "aggregated", metrics: ["location"], aggregation: "first" },
            refreshIntervalMs: 60_000,
          },
          {
            type: "heatmap",
            title: "Heatmap",
            description: "Color-coded matrix",
            layout: { x: 8, y: 5, w: 4, h: 6 },
            config: { showValues: true, cellSize: 40 },
            dataSource: { sourceType: "static", data: [], format: "json" },
            refreshIntervalMs: 0,
          },
        ],
      },
    ];
  }

  getCategoryInfo(): { category: TemplateCategory; name: string; description: string; icon: string; count: number }[] {
    const all = this.getAllTemplates();
    const categories: { category: TemplateCategory; name: string; description: string; icon: string }[] = [
      { category: "environmental", name: "Environmental", description: "Air quality, weather, and environmental sensors", icon: "cloud" },
      { category: "industrial", name: "Industrial", description: "Manufacturing, production, and equipment monitoring", icon: "factory" },
      { category: "smart_home", name: "Smart Home", description: "Home automation, security, and energy", icon: "home" },
      { category: "fleet", name: "Fleet Tracking", description: "Vehicle tracking and logistics", icon: "truck" },
      { category: "energy", name: "Energy", description: "Power production, consumption, and grid management", icon: "zap" },
      { category: "custom", name: "Custom", description: "User-created templates", icon: "settings" },
    ];

    return categories.map((cat) => ({
      ...cat,
      count: all.filter((t) => t.category === cat.category).length,
    }));
  }
}

// ── Factory ──────────────────────────────────────────────────────────────────

let defaultService: TemplateLibraryService | null = null;

export function getTemplateLibraryService(): TemplateLibraryService {
  if (!defaultService) defaultService = new TemplateLibraryService();
  return defaultService;
}

export function createTemplateLibraryService(): TemplateLibraryService {
  return new TemplateLibraryService();
}
