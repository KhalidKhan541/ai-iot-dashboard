// ─── Core Domain Types ────────────────────────────────────────────────────────

export type UserRole = "SUPER_ADMIN" | "ORG_ADMIN" | "ORG_MEMBER" | "DEVICE_MANAGER" | "VIEWER";

export type DeviceStatus = "ONLINE" | "OFFLINE" | "IDLE" | "ERROR" | "MAINTENANCE" | "PROVISIONING" | "DECOMMISSIONED";

export type AlertSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type DataType =
  | "TEMPERATURE" | "HUMIDITY" | "PRESSURE" | "VOLTAGE" | "CURRENT"
  | "POWER" | "GPS" | "ACCELEROMETER" | "GYROSCOPE" | "TEXT"
  | "BOOLEAN" | "INTEGER" | "FLOAT" | "JSON" | "BINARY";

export type AggregationType =
  | "AVG" | "SUM" | "MIN" | "MAX" | "COUNT"
  | "PERCENTILE_50" | "PERCENTILE_90" | "PERCENTILE_95" | "PERCENTILE_99"
  | "RATE" | "STDDEV";

export type WidgetType =
  | "LINE_CHART" | "BAR_CHART" | "PIE_CHART" | "GAUGE" | "SINGLE_VALUE"
  | "TABLE" | "MAP" | "HEATMAP" | "SCATTER_PLOT" | "AREA_CHART"
  | "RADAR" | "FUNNEL" | "ALERTS_LIST" | "DEVICE_STATUS" | "SPARKLINE"
  | "PROGRESS_BAR" | "TEXT_CARD" | "IMAGE" | "CUSTOM";

export type RuleActionType =
  | "SEND_NOTIFICATION" | "CALL_WEBHOOK" | "UPDATE_DEVICE"
  | "CREATE_TICKET" | "EXECUTE_LAMBDA" | "TRIGGER_SNS"
  | "LOG_EVENT" | "SET_VALUE";

export type IntegrationType =
  | "AWS_IOT" | "MQTT" | "REST_API" | "WEBHOOK" | "GRAFANA"
  | "PROMETHEUS" | "INFLUXDB" | "DATADOG" | "PAGERDUTY" | "SLACK";

export type ReportFormat = "PDF" | "CSV" | "JSON" | "HTML" | "XLSX";

export type NotificationChannel = "EMAIL" | "SMS" | "WEBHOOK" | "SLACK" | "PUSH" | "IN_APP";

export type MetricType = "DEVICE_DATA" | "SYSTEM" | "BUSINESS" | "CUSTOM";

export type DataSource = "DEVICE_TELEMETRY" | "SIMULATED" | "EXTERNAL_API" | "MANUAL";

// ─── User & Auth Types ────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserSession {
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    role: UserRole;
    organizationId?: string;
  };
  expires: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: UserRole;
  organizationId?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  organizationName?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordReset {
  token: string;
  password: string;
  confirmPassword: string;
}

// ─── Organization Types ───────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  website: string | null;
  plan: string;
  ownerId: string;
  settings: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrgMember {
  id: string;
  organizationId: string;
  userId: string;
  role: UserRole;
  joinedAt: string;
  user: User;
  organization: Organization;
}

export interface OrganizationWithMembers extends Organization {
  members: OrgMember[];
  _count: {
    devices: number;
    dashboards: number;
  };
}

// ─── Device Types ─────────────────────────────────────────────────────────────

export interface DeviceType {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  manufacturer: string | null;
  model: string | null;
  protocol: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceTag {
  id: string;
  name: string;
  color: string | null;
}

export interface DeviceGroup {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Device {
  id: string;
  organizationId: string;
  deviceTypeId: string | null;
  creatorId: string | null;
  assigneeId: string | null;
  name: string;
  description: string | null;
  serialNumber: string | null;
  firmwareVersion: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  status: DeviceStatus;
  lastSeenAt: string | null;
  config: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  isActive: boolean;
  provisionedAt: string | null;
  decommissionedAt: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceWithRelations extends Device {
  deviceType: DeviceType | null;
  creator: Pick<User, "id" | "name" | "image"> | null;
  assignee: Pick<User, "id" | "name" | "image"> | null;
  group: DeviceGroup | null;
  tags: DeviceTag[];
  _count: {
    dataPoints: number;
    alerts: number;
    metrics: number;
  };
}

export interface DeviceListItem {
  id: string;
  name: string;
  serialNumber: string | null;
  status: DeviceStatus;
  lastSeenAt: string | null;
  deviceType: Pick<DeviceType, "id" | "name"> | null;
  group: Pick<DeviceGroup, "id" | "name"> | null;
  tags: Pick<DeviceTag, "id" | "name" | "color">[];
}

export interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  error: number;
  onlineRate: number;
}

// ─── Device Data Types ────────────────────────────────────────────────────────

export interface DeviceData {
  id: string;
  deviceId: string;
  dataType: DataType;
  source: DataSource;
  timestamp: string;
  batchId: string | null;
  createdAt: string;
}

export interface DeviceDataPoint {
  id: string;
  deviceDataId: string;
  key: string;
  value: unknown;
  unit: string | null;
  quality: number | null;
  createdAt: string;
}

export interface DeviceDataWithPoints extends DeviceData {
  dataPoints: DeviceDataPoint[];
}

export interface TelemetryPayload {
  deviceId: string;
  dataType: DataType;
  timestamp?: string;
  dataPoints: Array<{
    key: string;
    value: unknown;
    unit?: string;
    quality?: number;
  }>;
}

// ─── Metric Types ─────────────────────────────────────────────────────────────

export interface Metric {
  id: string;
  deviceId: string;
  name: string;
  displayName: string | null;
  description: string | null;
  dataType: DataType;
  metricType: MetricType;
  unit: string | null;
  source: DataSource;
  config: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MetricWithDevice extends Metric {
  device: Pick<Device, "id" | "name">;
}

export interface MetricAggregation {
  id: string;
  metricId: string;
  aggregationType: AggregationType;
  intervalMinutes: number;
  value: number;
  startTime: string;
  endTime: string;
  sampleCount: number | null;
  min: number | null;
  max: number | null;
  stddev: number | null;
  createdAt: string;
}

export interface MetricDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface MetricTimeSeries {
  metricId: string;
  metricName: string;
  unit: string | null;
  dataPoints: MetricDataPoint[];
}

// ─── Dashboard Types ──────────────────────────────────────────────────────────

export interface Dashboard {
  id: string;
  organizationId: string;
  deviceGroupId: string | null;
  ownerId: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  isDefault: boolean;
  layout: Record<string, unknown> | null;
  refreshInterval: number;
  timeRange: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardWidget {
  id: string;
  dashboardId: string;
  metricId: string | null;
  title: string;
  widgetType: WidgetType;
  position: WidgetPosition;
  config: WidgetConfig;
  query: Record<string, unknown> | null;
  refreshInterval: number | null;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardWithWidgets extends Dashboard {
  widgets: DashboardWidgetWithConfig[];
  owner: Pick<User, "id" | "name" | "image">;
  _count: {
    widgets: number;
  };
}

export interface DashboardListItem {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  refreshInterval: number;
  _count: {
    widgets: number;
  };
  owner: Pick<User, "id" | "name" | "image">;
  updatedAt: string;
}

// ─── Widget Types ─────────────────────────────────────────────────────────────

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WidgetConfig {
  dataSource?: DataSourceConfig;
  display?: DisplayConfig;
  thresholds?: ThresholdConfig;
  colors?: ColorConfig;
  formatters?: FormatterConfig;
  interactions?: InteractionConfig;
}

export interface DataSourceConfig {
  type: "metric" | "device_data" | "custom_query";
  metricId?: string;
  deviceId?: string;
  query?: Record<string, unknown>;
  refreshInterval?: number;
}

export interface DisplayConfig {
  showLegend?: boolean;
  showGrid?: boolean;
  showAxes?: boolean;
  showTooltip?: boolean;
  animation?: boolean;
  theme?: "light" | "dark";
  density?: "compact" | "comfortable" | "spacious";
}

export interface ThresholdConfig {
  warning?: number;
  critical?: number;
  min?: number;
  max?: number;
  units?: string;
}

export interface ColorConfig {
  primary?: string;
  secondary?: string;
  warning?: string;
  critical?: string;
  gradient?: string[];
}

export interface FormatterConfig {
  valueFormat?: string;
  dateFormat?: string;
  precision?: number;
  prefix?: string;
  suffix?: string;
}

export interface InteractionConfig {
  clickable?: boolean;
  zoomable?: boolean;
  pannable?: boolean;
  crosshair?: boolean;
}

export interface WidgetConfigFull {
  id: string;
  widgetId: string;
  dataSource: DataSourceConfig | null;
  displayConfig: DisplayConfig | null;
  thresholds: ThresholdConfig | null;
  colors: ColorConfig | null;
  formatters: FormatterConfig | null;
  interactions: InteractionConfig | null;
}

export interface DashboardWidgetWithConfig extends DashboardWidget {
  config: WidgetConfig;
  metric: Pick<Metric, "id" | "name" | "unit" | "dataType"> | null;
}

// ─── Alert Types ──────────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  deviceId: string;
  ruleId: string | null;
  severity: AlertSeverity;
  title: string;
  description: string | null;
  value: unknown;
  threshold: unknown;
  isRead: boolean;
  isAcknowledged: boolean;
  acknowledgedAt: string | null;
  acknowledgedById: string | null;
  resolvedAt: string | null;
  resolvedById: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlertWithDevice extends Alert {
  device: Pick<Device, "id" | "name" | "serialNumber">;
  rule: Pick<Rule, "id" | "name"> | null;
  acknowledgedBy: Pick<User, "id" | "name"> | null;
  resolvedBy: Pick<User, "id" | "name"> | null;
}

export interface AlertListItem {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string | null;
  status: string;
  deviceName: string;
  createdAt: string;
}

export interface AlertStats {
  critical: number;
  high: number;
  medium: number;
  low: number;
  totalToday: number;
}

export interface AlertRule {
  id: string;
  organizationId: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
  priority: number;
  cooldownMinutes: number;
  config: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlertRuleWithDetails extends AlertRule {
  conditions: RuleCondition[];
  actions: RuleActionItem[];
}

export interface AlertHistory {
  id: string;
  alertId: string;
  action: string;
  message: string | null;
  performedById: string | null;
  createdAt: string;
}

// ─── Rule Types ───────────────────────────────────────────────────────────────

export interface Rule {
  id: string;
  organizationId: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
  priority: number;
  cooldownMinutes: number;
  config: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface RuleWithDetails extends Rule {
  conditions: RuleCondition[];
  actions: RuleActionItem[];
}

export interface RuleCondition {
  id: string;
  ruleId: string;
  field: string;
  operator: string;
  value: unknown;
  logicalOp: string | null;
}

export interface RuleActionItem {
  id: string;
  ruleId: string;
  type: RuleActionType;
  config: Record<string, unknown> | null;
  order: number;
}

// ─── Notification Types ───────────────────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationChannel;
  isRead: boolean;
  readAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  channel: NotificationChannel;
  type: string;
  enabled: boolean;
  config: Record<string, unknown> | null;
}

// ─── Integration Types ────────────────────────────────────────────────────────

export interface Integration {
  id: string;
  organizationId: string;
  type: IntegrationType;
  name: string;
  description: string | null;
  isActive: boolean;
  config: Record<string, unknown> | null;
  lastSyncAt: string | null;
  syncStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationWithConfigs extends Integration {
  configs: IntegrationConfig[];
}

export interface IntegrationConfig {
  id: string;
  integrationId: string;
  key: string;
  value: string;
  isSecret: boolean;
  description: string | null;
}

// ─── Report Types ─────────────────────────────────────────────────────────────

export interface ScheduledReport {
  id: string;
  organizationId: string;
  integrationId: string | null;
  ownerId: string;
  templateId: string | null;
  name: string;
  description: string | null;
  schedule: string;
  format: ReportFormat;
  recipients: string[] | null;
  config: Record<string, unknown> | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReportTemplate {
  id: string;
  dashboardId: string | null;
  name: string;
  description: string | null;
  content: Record<string, unknown>;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Audit Log Types ──────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  organizationId: string | null;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogWithUser extends AuditLog {
  user: Pick<User, "id" | "name" | "email"> | null;
}

// ─── Subscription Types ───────────────────────────────────────────────────────

export interface Subscription {
  id: string;
  userId: string;
  plan: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAt: string | null;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UsageMetric {
  id: string;
  subscriptionId: string;
  metricName: string;
  quantity: number;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

// ─── API Key Types ────────────────────────────────────────────────────────────

export interface ApiKey {
  id: string;
  userId: string;
  key: string;
  name: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  isActive: boolean;
  createdAt: string;
}

// ─── Pagination & Query Types ─────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    cursor?: string;
  };
}

export interface CursorPaginationResult<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface DeviceQueryParams extends PaginationParams {
  organizationId: string;
  status?: DeviceStatus;
  deviceTypeId?: string;
  groupId?: string;
  assigneeId?: string;
  search?: string;
  tags?: string[];
}

export interface AlertQueryParams extends PaginationParams {
  deviceId?: string;
  severity?: AlertSeverity;
  status?: string;
  isRead?: boolean;
  startTime?: string;
  endTime?: string;
}

export interface MetricQueryParams {
  deviceId?: string;
  metricType?: MetricType;
  aggregationType?: AggregationType;
  intervalMinutes?: number;
  startTime: string;
  endTime: string;
}

// ─── WebSocket Types ──────────────────────────────────────────────────────────

export interface WebSocketMessage {
  type: "device_status" | "telemetry" | "alert" | "notification" | "heartbeat";
  payload: unknown;
  timestamp: string;
}

export interface DeviceStatusUpdate {
  deviceId: string;
  status: DeviceStatus;
  lastSeenAt: string;
}

export interface TelemetryUpdate {
  deviceId: string;
  dataType: DataType;
  dataPoints: Array<{
    key: string;
    value: unknown;
    unit?: string;
  }>;
  timestamp: string;
}

export interface AlertUpdate {
  alertId: string;
  severity: AlertSeverity;
  title: string;
  deviceId: string;
  timestamp: string;
}

// ─── Dashboard Layout Types ───────────────────────────────────────────────────

export interface DashboardLayout {
  columns: number;
  rowHeight: number;
  gap: number;
  widgets: Array<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }>;
}

export interface GridPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ─── Chart Types ──────────────────────────────────────────────────────────────

export interface ChartDataPoint {
  timestamp: string;
  value: number;
  label?: string;
  series?: string;
  metadata?: Record<string, unknown>;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
}

export interface ChartConfig {
  type: WidgetType;
  title: string;
  series: ChartSeries[];
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  legend?: LegendConfig;
  tooltip?: TooltipConfig;
  grid?: GridConfig;
}

export interface AxisConfig {
  label?: string;
  type?: "linear" | "logarithmic" | "time" | "category";
  min?: number;
  max?: number;
  tickInterval?: number;
  format?: string;
}

export interface LegendConfig {
  show: boolean;
  position: "top" | "bottom" | "left" | "right";
}

export interface TooltipConfig {
  show: boolean;
  format?: string;
  shared?: boolean;
}

export interface GridConfig {
  show: boolean;
  color?: string;
}

// ─── Error Types ──────────────────────────────────────────────────────────────

export interface AppError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode: number;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ValidationError[];
  };
}

// ─── Event Types ──────────────────────────────────────────────────────────────

export interface SystemEvent {
  type: string;
  source: string;
  data: Record<string, unknown>;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface DeviceEvent {
  deviceId: string;
  eventType: "status_change" | "data_received" | "alert_triggered" | "config_updated";
  data: Record<string, unknown>;
  timestamp: string;
}

export interface UserEvent {
  userId: string;
  eventType: "login" | "logout" | "action" | "setting_change";
  data: Record<string, unknown>;
  timestamp: string;
}

// ─── Configuration Types ──────────────────────────────────────────────────────

export interface AppConfig {
  database: {
    url: string;
    directUrl: string;
  };
  redis: {
    url: string;
  };
  auth: {
    secret: string;
    providers: {
      github?: { clientId: string; clientSecret: string };
      google?: { clientId: string; clientSecret: string };
    };
  };
  mqtt: {
    broker: string;
    port: number;
    username?: string;
    password?: string;
  };
  aws: {
    iotEndpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  grafana: {
    url: string;
    apiKey: string;
  };
}

export interface DeviceConfig {
  telemetryInterval: number;
  heartbeatInterval: number;
  maxRetryCount: number;
  dataRetentionDays: number;
  aggregationIntervals: number[];
}

// ─── Permission Types ─────────────────────────────────────────────────────────

export type Permission =
  | "organization:create"
  | "organization:read"
  | "organization:update"
  | "organization:delete"
  | "organization:manage_members"
  | "device:create"
  | "device:read"
  | "device:update"
  | "device:delete"
  | "device:manage"
  | "device:data:read"
  | "device:data:write"
  | "dashboard:create"
  | "dashboard:read"
  | "dashboard:update"
  | "dashboard:delete"
  | "dashboard:share"
  | "alert:read"
  | "alert:manage"
  | "alert:acknowledge"
  | "alert:resolve"
  | "rule:create"
  | "rule:read"
  | "rule:update"
  | "rule:delete"
  | "metric:read"
  | "metric:create"
  | "metric:delete"
  | "integration:create"
  | "integration:read"
  | "integration:update"
  | "integration:delete"
  | "report:create"
  | "report:read"
  | "report:update"
  | "report:delete"
  | "audit:read"
  | "user:read"
  | "user:update"
  | "user:delete"
  | "settings:read"
  | "settings:update";

export interface PermissionCheck {
  resource: string;
  action: string;
  resourceId?: string;
  organizationId?: string;
}

// ─── Real-time Types ──────────────────────────────────────────────────────────

export interface RealtimeChannel {
  name: string;
  organizationId: string;
  deviceId?: string;
}

export interface RealtimeSubscription {
  channel: string;
  callback: (data: unknown) => void;
  unsubscribe: () => void;
}

// ─── Export Utility Types ─────────────────────────────────────────────────────

export type WithTimestamps<T> = T & {
  createdAt: string;
  updatedAt: string;
};

export type WithId<T> = T & { id: string };

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Nullable<T> = T | null;

export type Prettify<T> = { [K in keyof T]: T[K] } & {};
