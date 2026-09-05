import { DeviceStatus } from "./device";

export type WidgetType =
  | "line_chart"
  | "bar_chart"
  | "pie_chart"
  | "gauge"
  | "stat_card"
  | "table"
  | "map"
  | "timeline"
  | "heatmap"
  | "scatter_plot"
  | "area_chart"
  | "donut_chart"
  | "radial_bar"
  | "sparkline"
  | "alert_list"
  | "device_list"
  | "text"
  | "iframe"
  | "image"
  | "custom";

export type DashboardLayout = "grid" | "freeform" | "tabs";

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  layout: DashboardLayout;
  widgets: Widget[];
  isDefault: boolean;
  isPublic: boolean;
  ownerId: string;
  sharedWith?: DashboardShare[];
  refreshInterval?: number;
  timeRange?: TimeRange;
  theme?: "light" | "dark" | "system";
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  icon?: string;
  color?: string;
}

export interface Widget {
  id: string;
  dashboardId: string;
  type: WidgetType;
  title: string;
  description?: string;
  position: WidgetPosition;
  size: WidgetSize;
  config: WidgetConfig;
  dataSource: WidgetDataSource;
  style?: WidgetStyle;
  refreshInterval?: number;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetPosition {
  x: number;
  y: number;
  z?: number;
}

export interface WidgetSize {
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface WidgetConfig {
  chartType?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  colors?: string[];
  gradient?: boolean;
  animation?: boolean;
  threshold?: WidgetThreshold[];
  format?: ValueFormat;
  aggregation?: AggregationType;
  timeWindow?: number;
  decimals?: number;
  unit?: string;
  suffix?: string;
  prefix?: string;
  min?: number;
  max?: number;
  steps?: number[];
  orientation?: "horizontal" | "vertical";
  sort?: "asc" | "desc" | "none";
  maxItems?: number;
  showTimestamp?: boolean;
  showStatus?: boolean;
  statusColors?: Record<string, string>;
  text?: string;
  fontSize?: number;
  textAlign?: "left" | "center" | "right";
  url?: string;
  allowInteraction?: boolean;
}

export interface WidgetThreshold {
  value: number;
  color: string;
  label?: string;
  type?: "line" | "area";
}

export interface ValueFormat {
  type: "number" | "currency" | "percent" | "bytes" | "duration" | "custom";
  currency?: string;
  decimals?: number;
  compact?: boolean;
  customFormat?: string;
}

export type AggregationType =
  | "none"
  | "avg"
  | "min"
  | "max"
  | "sum"
  | "count"
  | "last"
  | "first"
  | "median"
  | "p95"
  | "p99";

export interface WidgetDataSource {
  type: "device" | "api" | "static" | "computed";
  deviceId?: string;
  sensorIds?: string[];
  apiUrl?: string;
  apiMethod?: "GET" | "POST";
  apiBody?: Record<string, unknown>;
  refreshInterval?: number;
  staticData?: Record<string, unknown>[];
  computedExpression?: string;
  dependencies?: string[];
}

export interface WidgetStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderRadius?: number;
  padding?: number;
  margin?: number;
  shadow?: "none" | "sm" | "md" | "lg";
  opacity?: number;
}

export interface TimeRange {
  start: Date | "now" | "today" | "yesterday" | "last_7_days" | "last_30_days" | "last_90_days";
  end: Date | "now";
  relative?: boolean;
  quickSelect?: string;
}

export interface DashboardShare {
  userId: string;
  permission: "view" | "edit" | "admin";
  sharedAt: Date;
  sharedBy: string;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  widgets: Omit<Widget, "id" | "dashboardId" | "createdAt" | "updatedAt">[];
  thumbnail?: string;
  isOfficial: boolean;
  usageCount: number;
}

export interface DashboardStats {
  dashboardId: string;
  viewCount: number;
  lastViewed?: Date;
  widgetCount: number;
  activeDevices: number;
  refreshCount: number;
}

export interface DashboardEvent {
  id: string;
  dashboardId: string;
  eventType: "create" | "update" | "delete" | "share" | "view" | "export";
  userId: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

export interface DashboardFilter {
  search?: string;
  ownerId?: string;
  isPublic?: boolean;
  tags?: string[];
  layout?: DashboardLayout;
}

export interface WidgetData {
  widgetId: string;
  data: unknown[];
  lastUpdated: Date;
  error?: string;
  status: "loading" | "success" | "error" | "empty";
}

export interface DashboardState {
  dashboards: Dashboard[];
  currentDashboard: Dashboard | null;
  widgetData: Map<string, WidgetData>;
  isLoading: boolean;
  error: string | null;
  selectedWidgets: string[];
  isEditing: boolean;
  isDragging: boolean;
}

export interface CreateDashboardInput {
  name: string;
  description?: string;
  layout?: DashboardLayout;
  isDefault?: boolean;
  isPublic?: boolean;
  widgets?: Omit<Widget, "id" | "dashboardId" | "createdAt" | "updatedAt">[];
  tags?: string[];
  icon?: string;
  color?: string;
}

export interface UpdateDashboardInput {
  name?: string;
  description?: string;
  layout?: DashboardLayout;
  isDefault?: boolean;
  isPublic?: boolean;
  refreshInterval?: number;
  timeRange?: TimeRange;
  theme?: "light" | "dark" | "system";
  tags?: string[];
  icon?: string;
  color?: string;
}

export interface CreateWidgetInput {
  type: WidgetType;
  title: string;
  description?: string;
  position?: WidgetPosition;
  size?: WidgetSize;
  config?: Partial<WidgetConfig>;
  dataSource: WidgetDataSource;
  style?: WidgetStyle;
  refreshInterval?: number;
}

export interface UpdateWidgetInput {
  title?: string;
  description?: string;
  position?: WidgetPosition;
  size?: WidgetSize;
  config?: Partial<WidgetConfig>;
  dataSource?: WidgetDataSource;
  style?: WidgetStyle;
  refreshInterval?: number;
  isVisible?: boolean;
}
