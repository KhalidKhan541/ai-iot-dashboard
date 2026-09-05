import crypto from "crypto";
import type {
  User,
  Device,
  DataPoint,
  DeviceCommand,
  Alert,
  AlertRule,
  Dashboard,
  DashboardWidget,
  Prediction,
  Anomaly,
  AIInsight,
  OptimizationSuggestion,
  Rule,
  Notification,
  UserSettings,
  Integration,
  ActivityLog,
  AggregatedData,
} from "@/types";

export function genId(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}

function minutesAgo(m: number): string {
  return new Date(Date.now() - m * 60000).toISOString();
}

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600000).toISOString();
}

function daysAgo(d: number): string {
  return new Date(Date.now() - d * 86400000).toISOString();
}

// ── Seed Data ──

const defaultSettings: UserSettings = {
  userId: "user-1",
  profile: { name: "Admin User", email: "admin@iotdash.io" },
  notifications: { email: true, push: true, sms: false },
  security: { twoFactorEnabled: false, sessionTimeout: 3600, ipWhitelist: [] },
  display: { theme: "dark", language: "en", timezone: "UTC", dateFormat: "YYYY-MM-DD", timeFormat: "24h" },
  dashboard: { autoRefresh: true, refreshInterval: 30000, showWelcomeScreen: false },
};

const seedUsers: User[] = [
  {
    id: "user-1",
    email: "admin@iotdash.io",
    name: "Admin User",
    password: "$2b$10$hashedpassword",
    role: "admin",
    createdAt: daysAgo(90),
    updatedAt: daysAgo(1),
    twoFactorEnabled: false,
    preferences: { theme: "dark", notifications: true, emailDigest: "daily", timezone: "UTC", language: "en" },
  },
  {
    id: "user-2",
    email: "operator@iotdash.io",
    name: "Jane Operator",
    password: "$2b$10$hashedpassword",
    role: "operator",
    createdAt: daysAgo(60),
    updatedAt: daysAgo(5),
    twoFactorEnabled: false,
    preferences: { theme: "light", notifications: true, emailDigest: "weekly", timezone: "UTC", language: "en" },
  },
];

const seedDevices: Device[] = [
  {
    id: "dev-1", name: "Warehouse Temp Sensor", type: "sensor", status: "online",
    protocol: "mqtt", manufacturer: "TempCo", model: "TC-3000", firmware: "2.1.4",
    location: "Warehouse A, Zone 1", groupId: "grp-1", tags: ["temperature", "warehouse"],
    config: { pollingIntervalMs: 5000, heartbeatTimeoutMs: 30000, dataRetentionDays: 90, autoReconnect: true, encryption: true, customSettings: {} },
    lastSeen: minutesAgo(1), createdAt: daysAgo(80), updatedAt: daysAgo(2), ownerId: "user-1",
    dataPointCount: 128450, commandCount: 342, metadata: {},
  },
  {
    id: "dev-2", name: "Main Gate Camera", type: "camera", status: "online",
    protocol: "http", manufacturer: "SecureV", model: "SV-CAM-4K", firmware: "3.0.1",
    location: "Main Entrance", tags: ["security", "camera"],
    config: { pollingIntervalMs: 1000, heartbeatTimeoutMs: 10000, dataRetentionDays: 30, autoReconnect: true, encryption: true, customSettings: { resolution: "4k", fps: 30 } },
    lastSeen: minutesAgo(2), createdAt: daysAgo(60), updatedAt: daysAgo(1), ownerId: "user-1",
    dataPointCount: 2540000, commandCount: 156, metadata: {},
  },
  {
    id: "dev-3", name: "HVAC Controller", type: "thermostat", status: "warning",
    protocol: "zigbee", manufacturer: "ClimateCo", model: "CC-HVAC-Pro", firmware: "1.8.2",
    location: "Building B, Floor 2", groupId: "grp-2", tags: ["hvac", "energy", "comfort"],
    config: { pollingIntervalMs: 10000, heartbeatTimeoutMs: 60000, dataRetentionDays: 180, autoReconnect: true, encryption: false, customSettings: { mode: "auto" } },
    lastSeen: minutesAgo(5), createdAt: daysAgo(45), updatedAt: daysAgo(3), ownerId: "user-1",
    dataPointCount: 89200, commandCount: 1204, metadata: {},
  },
  {
    id: "dev-4", name: "Power Meter Main", type: "meter", status: "online",
    protocol: "modbus", manufacturer: "ElecMeter", model: "EM-500", firmware: "4.2.0",
    location: "Electrical Room", tags: ["power", "energy", "meter"],
    config: { pollingIntervalMs: 2000, heartbeatTimeoutMs: 15000, dataRetentionDays: 365, autoReconnect: true, encryption: true, customSettings: {} },
    lastSeen: minutesAgo(0), createdAt: daysAgo(120), updatedAt: daysAgo(1), ownerId: "user-1",
    dataPointCount: 4520000, commandCount: 89, metadata: {},
  },
  {
    id: "dev-5", name: "Smart Light Hub", type: "hub", status: "online",
    protocol: "bluetooth", manufacturer: "BrightTech", model: "BT-HUB-10", firmware: "2.0.0",
    location: "Office Area", groupId: "grp-3", tags: ["lighting", "office"],
    config: { pollingIntervalMs: 15000, heartbeatTimeoutMs: 120000, dataRetentionDays: 30, autoReconnect: true, encryption: false, customSettings: {} },
    lastSeen: minutesAgo(3), createdAt: daysAgo(30), updatedAt: daysAgo(7), ownerId: "user-2",
    dataPointCount: 15600, commandCount: 2340, metadata: {},
  },
  {
    id: "dev-6", name: "Motion Detector", type: "sensor", status: "offline",
    protocol: "z-wave", manufacturer: "SafeGuard", model: "SG-MOTION-2", firmware: "1.3.1",
    location: "Warehouse B", tags: ["security", "motion"],
    config: { pollingIntervalMs: 1000, heartbeatTimeoutMs: 5000, dataRetentionDays: 14, autoReconnect: true, encryption: true, customSettings: {} },
    lastSeen: hoursAgo(6), createdAt: daysAgo(50), updatedAt: daysAgo(10), ownerId: "user-1",
    dataPointCount: 8900, commandCount: 45, metadata: {},
  },
  {
    id: "dev-7", name: "Air Quality Monitor", type: "sensor", status: "online",
    protocol: "wifi", manufacturer: "AirPure", model: "AP-AQM-100", firmware: "1.5.0",
    location: "Office Area, Floor 3", tags: ["air-quality", "environment"],
    config: { pollingIntervalMs: 30000, heartbeatTimeoutMs: 180000, dataRetentionDays: 90, autoReconnect: true, encryption: false, customSettings: { metrics: ["pm25", "pm10", "co2", "voc"] } },
    lastSeen: minutesAgo(10), createdAt: daysAgo(20), updatedAt: daysAgo(1), ownerId: "user-2",
    dataPointCount: 42000, commandCount: 12, metadata: {},
  },
  {
    id: "dev-8", name: "Water Flow Sensor", type: "sensor", status: "error",
    protocol: "mqtt", manufacturer: "FlowTech", model: "FT-WFS-50", firmware: "2.0.3",
    location: "Basement, Pipe Room", tags: ["water", "utility"],
    config: { pollingIntervalMs: 5000, heartbeatTimeoutMs: 30000, dataRetentionDays: 180, autoReconnect: false, encryption: true, customSettings: {} },
    lastSeen: minutesAgo(15), createdAt: daysAgo(70), updatedAt: daysAgo(0), ownerId: "user-1",
    dataPointCount: 67000, commandCount: 200, metadata: { error: "Sensor calibration drift detected" },
  },
];

const seedAlerts: Alert[] = [
  {
    id: "alert-1", deviceId: "dev-3", ruleId: "rule-1", severity: "high",
    title: "HVAC Temperature Threshold Exceeded", message: "Temperature in Building B reached 28.5°C, above threshold of 26°C",
    metric: "temperature", threshold: 26, currentValue: 28.5, status: "active",
    createdAt: minutesAgo(45), metadata: { zone: "Building B" },
  },
  {
    id: "alert-2", deviceId: "dev-8", severity: "critical",
    title: "Water Sensor Calibration Error", message: "Water flow sensor reporting invalid readings - calibration drift detected",
    metric: "flow_rate", status: "active", createdAt: minutesAgo(120), metadata: {},
  },
  {
    id: "alert-3", deviceId: "dev-6", severity: "medium",
    title: "Device Offline", message: "Motion detector has not sent data for 6 hours",
    status: "acknowledged", acknowledgedBy: "user-1", acknowledgedAt: minutesAgo(100),
    createdAt: hoursAgo(6), metadata: {},
  },
  {
    id: "alert-4", deviceId: "dev-1", severity: "low",
    title: "Temperature Fluctuation Detected", message: "Unusual temperature pattern detected in Warehouse A",
    metric: "temperature", status: "resolved", resolvedAt: minutesAgo(30),
    createdAt: hoursAgo(2), metadata: {},
  },
  {
    id: "alert-5", deviceId: "dev-4", severity: "info",
    title: "Monthly Energy Report Ready", message: "August energy consumption report has been generated",
    status: "resolved", resolvedAt: hoursAgo(1),
    createdAt: hoursAgo(1), metadata: { reportMonth: "August" },
  },
];

const seedAlertRules: AlertRule[] = [
  {
    id: "rule-1", name: "High Temperature Alert", description: "Triggers when temperature exceeds threshold",
    enabled: true, metric: "temperature",
    condition: { operator: "gt", value: 26, durationMs: 300000 },
    severity: "high", cooldownMs: 3600000,
    notificationChannels: [{ type: "email", target: "admin@iotdash.io", enabled: true }],
    createdAt: daysAgo(30), updatedAt: daysAgo(5), createdBy: "user-1",
    lastTriggered: minutesAgo(45), triggerCount: 12,
  },
  {
    id: "rule-2", name: "Device Offline Alert", description: "Triggers when a device goes offline",
    enabled: true, metric: "heartbeat",
    condition: { operator: "eq", value: 0, durationMs: 600000 },
    severity: "medium", cooldownMs: 7200000,
    notificationChannels: [{ type: "slack", target: "#iot-alerts", enabled: true }],
    createdAt: daysAgo(60), updatedAt: daysAgo(10), createdBy: "user-1",
    lastTriggered: hoursAgo(6), triggerCount: 34,
  },
  {
    id: "rule-3", name: "Critical Sensor Error", description: "Triggers on sensor calibration errors",
    enabled: true, metric: "error_code",
    condition: { operator: "gte", value: 1000 },
    severity: "critical", cooldownMs: 1800000,
    notificationChannels: [
      { type: "email", target: "admin@iotdash.io", enabled: true },
      { type: "sms", target: "+1234567890", enabled: true },
    ],
    createdAt: daysAgo(45), updatedAt: daysAgo(15), createdBy: "user-1",
    lastTriggered: minutesAgo(120), triggerCount: 8,
  },
];

const seedWidgets: DashboardWidget[] = [
  {
    id: "widget-1", type: "line-chart", title: "Temperature Over Time",
    config: { refreshIntervalMs: 30000, timeRange: "24h", custom: {} },
    position: { x: 0, y: 0, w: 8, h: 4 },
    dataSource: { deviceIds: ["dev-1"], metrics: ["temperature"] },
  },
  {
    id: "widget-2", type: "gauge", title: "Power Consumption",
    config: { refreshIntervalMs: 10000, unit: "kW", decimals: 1, thresholds: [{ value: 80, color: "#f59e0b" }, { value: 95, color: "#ef4444" }], custom: {} },
    position: { x: 8, y: 0, w: 4, h: 4 },
    dataSource: { deviceIds: ["dev-4"], metrics: ["power"] },
  },
  {
    id: "widget-3", type: "stat", title: "Active Devices",
    config: { refreshIntervalMs: 30000, custom: {} },
    position: { x: 0, y: 4, w: 4, h: 2 },
    dataSource: { deviceIds: [], metrics: ["device_count_active"], staticData: [{ value: 6 }] },
  },
  {
    id: "widget-4", type: "alert-list", title: "Recent Alerts",
    config: { refreshIntervalMs: 60000, custom: { maxItems: 5 } },
    position: { x: 4, y: 4, w: 8, h: 4 },
    dataSource: { deviceIds: [], metrics: [], staticData: [] },
  },
  {
    id: "widget-5", type: "pie-chart", title: "Device Status Distribution",
    config: { refreshIntervalMs: 60000, custom: {} },
    position: { x: 0, y: 8, w: 6, h: 4 },
    dataSource: { deviceIds: [], metrics: ["device_status"], staticData: [
      { name: "Online", value: 5 }, { name: "Offline", value: 1 }, { name: "Warning", value: 1 }, { name: "Error", value: 1 },
    ] },
  },
  {
    id: "widget-6", type: "map", title: "Device Locations",
    config: { refreshIntervalMs: 60000, custom: { center: [40.7128, -74.006], zoom: 13 } },
    position: { x: 6, y: 8, w: 6, h: 4 },
    dataSource: { deviceIds: ["dev-1", "dev-2", "dev-3", "dev-4", "dev-5"], metrics: [] },
  },
];

const seedDashboards: Dashboard[] = [
  {
    id: "dash-1", name: "Main Overview", description: "Primary dashboard with key metrics and device status",
    layout: { columns: 12, rowHeight: 60, gap: 16 },
    widgets: seedWidgets, isDefault: true, isPublic: false,
    ownerId: "user-1", sharedWith: ["user-2"], tags: ["overview", "main"],
    createdAt: daysAgo(80), updatedAt: daysAgo(1), refreshIntervalMs: 30000,
  },
  {
    id: "dash-2", name: "Energy Monitoring", description: "Power consumption and energy efficiency metrics",
    layout: { columns: 12, rowHeight: 60, gap: 16 },
    widgets: seedWidgets.slice(0, 3), isDefault: false, isPublic: true,
    ownerId: "user-1", sharedWith: [], tags: ["energy", "power"],
    createdAt: daysAgo(45), updatedAt: daysAgo(3), refreshIntervalMs: 10000,
  },
  {
    id: "dash-3", name: "Security Overview", description: "Camera feeds and security sensor status",
    layout: { columns: 12, rowHeight: 60, gap: 16 },
    widgets: seedWidgets.slice(4, 6), isDefault: false, isPublic: false,
    ownerId: "user-1", sharedWith: ["user-2"], tags: ["security"],
    createdAt: daysAgo(30), updatedAt: daysAgo(2), refreshIntervalMs: 5000,
  },
];

const seedPredictions: Prediction[] = [
  {
    id: "pred-1", deviceId: "dev-1", metric: "temperature", predictedValue: 24.2,
    confidence: 0.87, lowerBound: 23.1, upperBound: 25.3,
    predictedAt: now(), horizonMinutes: 60, model: "temp-lstm-v2",
    factors: [
      { name: "historical_trend", importance: 0.4, direction: "positive", description: "Temperature has been rising" },
      { name: "outdoor_temp", importance: 0.3, direction: "positive", description: "Outdoor temperature is high" },
      { name: "hvac_status", importance: 0.2, direction: "negative", description: "HVAC is running at capacity" },
      { name: "occupancy", importance: 0.1, direction: "positive", description: "Higher than normal occupancy" },
    ],
  },
  {
    id: "pred-2", deviceId: "dev-4", metric: "power", predictedValue: 42.5,
    confidence: 0.92, lowerBound: 38.0, upperBound: 47.0,
    predictedAt: now(), horizonMinutes: 30, model: "power-arima-v1",
    factors: [
      { name: "time_of_day", importance: 0.5, direction: "positive", description: "Peak hours approaching" },
      { name: "hvac_load", importance: 0.3, direction: "positive", description: "HVAC drawing more power" },
      { name: "lighting", importance: 0.2, direction: "negative", description: "Natural light reducing lighting needs" },
    ],
  },
  {
    id: "pred-3", deviceId: "dev-7", metric: "co2", predictedValue: 680,
    confidence: 0.78, lowerBound: 600, upperBound: 760,
    predictedAt: now(), horizonMinutes: 120, model: "aq-ensemble-v3",
    factors: [
      { name: "occupancy_pattern", importance: 0.6, direction: "positive", description: "Expected meeting in the area" },
      { name: "ventilation_rate", importance: 0.3, direction: "negative", description: "Ventilation system running" },
      { name: "historical_avg", importance: 0.1, direction: "positive", description: "Above daily average" },
    ],
  },
];

const seedAnomalies: Anomaly[] = [
  {
    id: "anom-1", deviceId: "dev-8", metric: "flow_rate", timestamp: minutesAgo(30),
    value: 0, expectedValue: 12.5, deviationScore: 4.2,
    severity: "critical", status: "investigating", description: "Water flow dropped to zero while sensor reports active",
    model: "anomaly-isolation-forest", relatedAnomalyIds: [],
  },
  {
    id: "anom-2", deviceId: "dev-1", metric: "temperature", timestamp: hoursAgo(3),
    value: 15.2, expectedValue: 22.0, deviationScore: 2.8,
    severity: "medium", status: "resolved", description: "Sudden temperature drop in warehouse - dock door left open",
    model: "anomaly-isolation-forest", relatedAnomalyIds: [],
  },
  {
    id: "anom-3", deviceId: "dev-4", metric: "power_factor", timestamp: hoursAgo(1),
    value: 0.65, expectedValue: 0.92, deviationScore: 3.1,
    severity: "high", status: "new", description: "Power factor degradation detected - possible motor issue",
    model: "anomaly-dbstream", relatedAnomalyIds: [],
  },
];

const seedInsights: AIInsight[] = [
  {
    id: "ins-1", type: "optimization", title: "HVAC Schedule Optimization",
    description: "Adjusting HVAC schedule by 30 minutes earlier could reduce energy consumption by 12% without affecting comfort",
    severity: "low", confidence: 0.85, relatedDeviceIds: ["dev-3"], relatedMetricIds: ["temperature", "energy"],
    actionable: true, suggestedActions: ["Update HVAC start time to 6:30 AM", "Reduce evening runtime by 30 minutes"],
    createdAt: hoursAgo(2), metadata: { estimatedSavings: "$240/month" },
  },
  {
    id: "ins-2", type: "anomaly", title: "Correlated Anomaly Pattern Detected",
    description: "Power factor drop in the main meter correlates with HVAC compressor startup - suggesting a power quality issue",
    severity: "high", confidence: 0.78, relatedDeviceIds: ["dev-3", "dev-4"], relatedMetricIds: ["power_factor", "power"],
    actionable: true, suggestedActions: ["Install power factor correction capacitor", "Schedule motor inspection"],
    createdAt: hoursAgo(1), metadata: {},
  },
  {
    id: "ins-3", type: "prediction", title: "Peak Demand Alert",
    description: "AI predicts power demand will exceed 90kW threshold tomorrow between 2-4 PM based on weather forecast and historical patterns",
    severity: "medium", confidence: 0.82, relatedDeviceIds: ["dev-4"], relatedMetricIds: ["power"],
    actionable: true, suggestedActions: ["Pre-cool building during off-peak hours", "Shift non-critical loads to evening"],
    createdAt: minutesAgo(30), metadata: { predictedPeak: "92.5kW", threshold: "90kW" },
  },
  {
    id: "ins-4", type: "summary", title: "Weekly Performance Summary",
    description: "Overall system health improved by 3.2% this week. 6 devices operating optimally, 1 requires attention (water sensor calibration).",
    severity: "info", confidence: 0.95, relatedDeviceIds: ["dev-1", "dev-2", "dev-3", "dev-4", "dev-5", "dev-7", "dev-8"],
    relatedMetricIds: [], actionable: false, suggestedActions: [],
    createdAt: hoursAgo(6), expiresAt: daysAgo(-7), metadata: { weekStart: daysAgo(7), weekEnd: now() },
  },
];

const seedOptimizations: OptimizationSuggestion[] = [
  {
    id: "opt-1", type: "energy", title: "Implement Night Mode for Office Lights",
    description: "Smart light hub shows lights remain on after 8 PM with zero occupancy. Auto-off after 30 minutes of inactivity could save ~15% lighting energy.",
    estimatedImpact: "~15% reduction in lighting energy costs", confidence: 0.9,
    relatedDeviceIds: ["dev-5"],
    implementationSteps: [
      "Enable occupancy-linked auto-off on smart light hub",
      "Set inactivity timeout to 30 minutes",
      "Add manual override capability for late workers",
    ],
    createdAt: hoursAgo(4), status: "pending",
  },
  {
    id: "opt-2", type: "maintenance", title: "Water Sensor Maintenance Required",
    description: "Water flow sensor showing calibration drift. Recommend recalibration or replacement within 2 weeks to avoid data integrity issues.",
    estimatedImpact: "Prevents potential water waste of ~500 gallons/day", confidence: 0.95,
    relatedDeviceIds: ["dev-8"],
    implementationSteps: [
      "Schedule sensor calibration during maintenance window",
      "Order replacement sensor as backup",
      "Review historical data for data gaps",
    ],
    createdAt: minutesAgo(120), status: "pending",
  },
  {
    id: "opt-3", type: "performance", title: "Optimize Data Polling Frequency",
    description: "Air quality monitor polls every 30s but data changes slowly. Reducing to 60s would halve network traffic with negligible data loss.",
    estimatedImpact: "~50% reduction in air quality sensor network traffic", confidence: 0.88,
    relatedDeviceIds: ["dev-7"],
    implementationSteps: [
      "Update polling interval to 60 seconds",
      "Monitor data quality for 1 week",
      "Adjust if any metrics show degradation",
    ],
    createdAt: daysAgo(1), status: "accepted",
  },
];

const seedRules: Rule[] = [
  {
    id: "rule-auto-1", name: "Auto-Adjust HVAC on High Temp", description: "Automatically lower HVAC setpoint when warehouse temp exceeds 25°C",
    enabled: true, type: "threshold",
    trigger: { type: "data-point", config: { deviceId: "dev-1", metric: "temperature" } },
    conditions: [
      { type: "value", config: { metric: "temperature", operator: "gt", value: 25 } },
      { type: "time", config: { start: "08:00", end: "18:00" } },
    ],
    actions: [
      { type: "send-command", config: { deviceId: "dev-3", command: "set_temperature", params: { target: 22 } } },
      { type: "create-alert", config: { severity: "low", message: "HVAC auto-adjusted due to high warehouse temperature" } },
    ],
    priority: 2, createdAt: daysAgo(20), updatedAt: daysAgo(5), createdBy: "user-1",
    lastTriggered: hoursAgo(3), executionCount: 45, cooldownMs: 1800000,
  },
  {
    id: "rule-auto-2", name: "Night Security Mode", description: "Enable enhanced security monitoring after business hours",
    enabled: true, type: "scheduling",
    trigger: { type: "schedule", config: { cron: "0 18 * * 1-5" } },
    conditions: [],
    actions: [
      { type: "send-command", config: { deviceId: "dev-2", command: "set_recording_mode", params: { mode: "continuous" } } },
      { type: "send-notification", config: { title: "Night Mode Activated", message: "Security monitoring enhanced for after-hours" } },
    ],
    priority: 3, createdAt: daysAgo(40), updatedAt: daysAgo(10), createdBy: "user-1",
    lastTriggered: hoursAgo(14), executionCount: 200, cooldownMs: 0,
  },
  {
    id: "rule-auto-3", name: "Emergency Shut-off", description: "Auto shut off water valve when flow anomaly detected",
    enabled: true, type: "composite",
    trigger: { type: "alert", config: { alertSeverity: "critical" } },
    conditions: [
      { type: "device", config: { deviceId: "dev-8", status: "error" } },
      { type: "value", config: { metric: "flow_rate", operator: "eq", value: 0 } },
    ],
    actions: [
      { type: "send-command", config: { deviceId: "dev-8", command: "close_valve", params: {} } },
      { type: "create-alert", config: { severity: "critical", message: "Emergency water valve shut-off triggered" } },
      { type: "send-notification", config: { title: "EMERGENCY: Water Shut-off", message: "Automatic water valve closed due to anomaly" } },
    ],
    priority: 1, createdAt: daysAgo(60), updatedAt: daysAgo(2), createdBy: "user-1",
    lastTriggered: minutesAgo(120), executionCount: 3, cooldownMs: 0,
  },
];

const seedNotifications: Notification[] = [
  { id: "notif-1", userId: "user-1", type: "alert", title: "High Temperature Alert", message: "HVAC temperature threshold exceeded in Building B", read: false, actionUrl: "/devices/dev-3", metadata: {}, createdAt: minutesAgo(45) },
  { id: "notif-2", userId: "user-1", type: "system", title: "System Update Available", message: "Firmware update v2.2.0 available for 3 devices", read: false, metadata: {}, createdAt: hoursAgo(2) },
  { id: "notif-3", userId: "user-1", type: "ai", title: "AI Insight: Energy Optimization", message: "New optimization suggestion for office lighting", read: true, actionUrl: "/analytics", metadata: {}, createdAt: hoursAgo(4) },
  { id: "notif-4", userId: "user-1", type: "device", title: "Device Back Online", message: "Motion Detector is back online", read: true, metadata: {}, createdAt: hoursAgo(8) },
  { id: "notif-5", userId: "user-2", type: "alert", title: "Sensor Error", message: "Water flow sensor calibration error detected", read: false, actionUrl: "/devices/dev-8", metadata: {}, createdAt: minutesAgo(120) },
  { id: "notif-6", userId: "user-1", type: "rule", title: "Rule Executed", message: "Auto-Adjust HVAC rule triggered successfully", read: true, metadata: {}, createdAt: hoursAgo(3) },
  { id: "notif-7", userId: "user-1", type: "info", title: "Weekly Report Ready", message: "Your weekly IoT performance report is now available", read: false, metadata: {}, createdAt: hoursAgo(6) },
];

const seedIntegrations: Integration[] = [
  { id: "int-1", type: "mqtt", name: "MQTT Broker", description: "Primary MQTT broker connection", enabled: true, config: { broker: "mqtt://broker.iotdash.io:1883", clientId: "iotdash-main" }, status: "connected", lastSync: minutesAgo(1), createdAt: daysAgo(90), updatedAt: daysAgo(1) },
  { id: "int-2", type: "grafana", name: "Grafana", description: "Grafana dashboard sync", enabled: false, config: { url: "https://grafana.iotdash.io" }, status: "disconnected", createdAt: daysAgo(30), updatedAt: daysAgo(15) },
  { id: "int-3", type: "aws", name: "AWS IoT Core", description: "AWS IoT cloud integration", enabled: true, config: { region: "us-east-1", thingType: "iotdash-device" }, status: "connected", lastSync: minutesAgo(5), createdAt: daysAgo(60), updatedAt: daysAgo(2) },
  { id: "int-4", type: "slack", name: "Slack Notifications", description: "Alert notifications to Slack channels", enabled: true, config: { webhook: "https://hooks.slack.com/services/xxx" }, status: "connected", lastSync: minutesAgo(45), createdAt: daysAgo(45), updatedAt: daysAgo(1) },
];

function generateSeedDataPoints(): DataPoint[] {
  const points: DataPoint[] = [];
  const metrics = ["temperature", "humidity", "power", "flow_rate", "co2", "pm25"];
  const units = ["°C", "%", "kW", "L/min", "ppm", "µg/m³"];
  for (let i = 0; i < 200; i++) {
    const idx = i % metrics.length;
    const deviceId = seedDevices[i % seedDevices.length].id;
    points.push({
      id: genId(), deviceId,
      timestamp: minutesAgo(i * 5),
      metric: metrics[idx],
      value: Math.round((Math.random() * 100) * 100) / 100,
      unit: units[idx],
      quality: "good",
      metadata: {},
    });
  }
  return points;
}

const seedActivityLogs: ActivityLog[] = [
  { id: "log-1", type: "device", action: "status_change", description: "HVAC Controller status changed to warning", deviceId: "dev-3", deviceName: "HVAC Controller", severity: "warning", metadata: {}, timestamp: minutesAgo(45) },
  { id: "log-2", type: "alert", action: "triggered", description: "High temperature alert triggered", severity: "error", metadata: {}, timestamp: minutesAgo(45) },
  { id: "log-3", type: "rule", action: "executed", description: "Auto-Adjust HVAC rule executed successfully", severity: "info", metadata: {}, timestamp: hoursAgo(3) },
  { id: "log-4", type: "user", action: "login", description: "Admin User logged in", userId: "user-1", userName: "Admin User", severity: "info", metadata: {}, timestamp: hoursAgo(4) },
  { id: "log-5", type: "device", action: "offline", description: "Motion Detector went offline", deviceId: "dev-6", deviceName: "Motion Detector", severity: "warning", metadata: {}, timestamp: hoursAgo(6) },
  { id: "log-6", type: "system", action: "backup", description: "System backup completed successfully", severity: "success", metadata: { backupSize: "2.4 GB" }, timestamp: hoursAgo(8) },
  { id: "log-7", type: "ai", action: "insight_generated", description: "AI generated energy optimization insight", severity: "info", metadata: {}, timestamp: hoursAgo(4) },
  { id: "log-8", type: "device", action: "command_sent", description: "Smart Light Hub command: set_brightness", deviceId: "dev-5", deviceName: "Smart Light Hub", severity: "info", metadata: {}, timestamp: hoursAgo(5) },
  { id: "log-9", type: "alert", action: "acknowledged", description: "Device offline alert acknowledged by Admin User", severity: "info", metadata: {}, timestamp: hoursAgo(2) },
  { id: "log-10", type: "system", action: "config_change", description: "MQTT broker configuration updated", severity: "info", metadata: {}, timestamp: daysAgo(1) },
];

function generateSeedAggregated(): AggregatedData[] {
  const result: AggregatedData[] = [];
  const devMetrics = [
    { deviceId: "dev-1", metric: "temperature" },
    { deviceId: "dev-1", metric: "humidity" },
    { deviceId: "dev-4", metric: "power" },
    { deviceId: "dev-7", metric: "co2" },
  ];
  for (const dm of devMetrics) {
    for (let i = 0; i < 24; i++) {
      const base = 20 + Math.random() * 10;
      result.push({
        ...dm,
        timestamp: hoursAgo(24 - i),
        avg: Math.round(base * 100) / 100,
        min: Math.round((base - 2 - Math.random() * 3) * 100) / 100,
        max: Math.round((base + 2 + Math.random() * 3) * 100) / 100,
        sum: Math.round(base * 10 * 100) / 100,
        count: 60,
      });
    }
  }
  return result;
}

// ── Database Class ──

class InMemoryDB {
  users: User[] = [...seedUsers];
  devices: Device[] = [...seedDevices];
  dataPoints: DataPoint[] = generateSeedDataPoints();
  commands: DeviceCommand[] = [];
  alerts: Alert[] = [...seedAlerts];
  alertRules: AlertRule[] = [...seedAlertRules];
  dashboards: Dashboard[] = [...seedDashboards];
  predictions: Prediction[] = [...seedPredictions];
  anomalies: Anomaly[] = [...seedAnomalies];
  insights: AIInsight[] = [...seedInsights];
  optimizations: OptimizationSuggestion[] = [...seedOptimizations];
  rules: Rule[] = [...seedRules];
  notifications: Notification[] = [...seedNotifications];
  settings: UserSettings = { ...defaultSettings };
  integrations: Integration[] = [...seedIntegrations];
  activityLogs: ActivityLog[] = [...seedActivityLogs];
  aggregatedData: AggregatedData[] = generateSeedAggregated();
  sessions: Record<string, { userId: string; expiresAt: number }> = {};
}

const globalForDb = globalThis as unknown as { __db: InMemoryDB };

export const db = globalForDb.__db || (globalForDb.__db = new InMemoryDB());
