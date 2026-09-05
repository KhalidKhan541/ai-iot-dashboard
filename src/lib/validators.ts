import { z } from "zod";

// ─── Auth Schemas ─────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
    organizationName: z.string().min(2).max(100).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ─── User Schemas ─────────────────────────────────────────────────────────────

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  image: z.string().url().optional().nullable(),
  role: z.enum(["SUPER_ADMIN", "ORG_ADMIN", "ORG_MEMBER", "DEVICE_MANAGER", "VIEWER"]).optional(),
});

// ─── Organization Schemas ─────────────────────────────────────────────────────

export const createOrganizationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  description: z.string().max(500).optional(),
  website: z.string().url().optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  website: z.string().url().optional().nullable(),
  logo: z.string().url().optional().nullable(),
});

export const addOrgMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ORG_ADMIN", "ORG_MEMBER", "DEVICE_MANAGER", "VIEWER"]),
});

// ─── Device Schemas ───────────────────────────────────────────────────────────

export const createDeviceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  serialNumber: z.string().max(100).optional(),
  deviceTypeId: z.string().cuid().optional(),
  assigneeId: z.string().cuid().optional(),
  groupId: z.string().cuid().optional(),
  location: z.string().max(200).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  firmwareVersion: z.string().max(50).optional(),
  config: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  tagIds: z.array(z.string().cuid()).optional(),
});

export const updateDeviceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  serialNumber: z.string().max(100).optional(),
  deviceTypeId: z.string().cuid().optional().nullable(),
  assigneeId: z.string().cuid().optional().nullable(),
  groupId: z.string().cuid().optional().nullable(),
  location: z.string().max(200).optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  firmwareVersion: z.string().max(50).optional(),
  status: z.enum(["ONLINE", "OFFLINE", "IDLE", "ERROR", "MAINTENANCE", "PROVISIONING", "DECOMMISSIONED"]).optional(),
  config: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  tagIds: z.array(z.string().cuid()).optional(),
});

export const deviceQuerySchema = z.object({
  organizationId: z.string().cuid(),
  status: z.enum(["ONLINE", "OFFLINE", "IDLE", "ERROR", "MAINTENANCE", "PROVISIONING", "DECOMMISSIONED"]).optional(),
  deviceTypeId: z.string().cuid().optional(),
  groupId: z.string().cuid().optional(),
  assigneeId: z.string().cuid().optional(),
  search: z.string().optional(),
  tags: z.array(z.string().cuid()).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["name", "status", "createdAt", "lastSeenAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// ─── Device Data Schemas ──────────────────────────────────────────────────────

export const deviceDataSchema = z.object({
  deviceId: z.string().cuid(),
  dataType: z.enum([
    "TEMPERATURE", "HUMIDITY", "PRESSURE", "VOLTAGE", "CURRENT",
    "POWER", "GPS", "ACCELEROMETER", "GYROSCOPE", "TEXT",
    "BOOLEAN", "INTEGER", "FLOAT", "JSON", "BINARY",
  ]),
  source: z.enum(["DEVICE_TELEMETRY", "SIMULATED", "EXTERNAL_API", "MANUAL"]).default("DEVICE_TELEMETRY"),
  batchId: z.string().optional(),
  dataPoints: z
    .array(
      z.object({
        key: z.string().min(1).max(100),
        value: z.unknown(),
        unit: z.string().max(20).optional(),
        quality: z.number().int().min(0).max(100).optional(),
      })
    )
    .min(1, "At least one data point is required"),
});

export const deviceDataQuerySchema = z.object({
  deviceId: z.string().cuid(),
  dataType: z.enum([
    "TEMPERATURE", "HUMIDITY", "PRESSURE", "VOLTAGE", "CURRENT",
    "POWER", "GPS", "ACCELEROMETER", "GYROSCOPE", "TEXT",
    "BOOLEAN", "INTEGER", "FLOAT", "JSON", "BINARY",
  ]).optional(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
});

// ─── Device Type Schemas ──────────────────────────────────────────────────────

export const createDeviceTypeSchema = z.object({
  name: z.string().min(2).max(100).unique(),
  description: z.string().max(500).optional(),
  category: z.string().max(100).optional(),
  manufacturer: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  protocol: z.string().max(50).optional(),
});

export const updateDeviceTypeSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  category: z.string().max(100).optional(),
  manufacturer: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  protocol: z.string().max(50).optional(),
});

// ─── Dashboard Schemas ────────────────────────────────────────────────────────

export const createDashboardSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  deviceGroupId: z.string().cuid().optional(),
  isPublic: z.boolean().default(false),
  refreshInterval: z.number().int().min(5).max(3600).default(30),
  timeRange: z.string().default("last24h"),
  layout: z.record(z.unknown()).optional(),
});

export const updateDashboardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  deviceGroupId: z.string().cuid().optional().nullable(),
  isPublic: z.boolean().optional(),
  refreshInterval: z.number().int().min(5).max(3600).optional(),
  timeRange: z.string().optional(),
  layout: z.record(z.unknown()).optional(),
});

// ─── Widget Schemas ───────────────────────────────────────────────────────────

export const createWidgetSchema = z.object({
  title: z.string().min(1).max(100),
  widgetType: z.enum([
    "LINE_CHART", "BAR_CHART", "PIE_CHART", "GAUGE", "SINGLE_VALUE",
    "TABLE", "MAP", "HEATMAP", "SCATTER_PLOT", "AREA_CHART",
    "RADAR", "FUNNEL", "ALERTS_LIST", "DEVICE_STATUS", "SPARKLINE",
    "PROGRESS_BAR", "TEXT_CARD", "IMAGE", "CUSTOM",
  ]),
  metricId: z.string().cuid().optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
  }),
  config: z.record(z.unknown()),
  query: z.record(z.unknown()).optional(),
  refreshInterval: z.number().int().min(5).max(3600).optional(),
});

export const updateWidgetSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  widgetType: z.enum([
    "LINE_CHART", "BAR_CHART", "PIE_CHART", "GAUGE", "SINGLE_VALUE",
    "TABLE", "MAP", "HEATMAP", "SCATTER_PLOT", "AREA_CHART",
    "RADAR", "FUNNEL", "ALERTS_LIST", "DEVICE_STATUS", "SPARKLINE",
    "PROGRESS_BAR", "TEXT_CARD", "IMAGE", "CUSTOM",
  ]).optional(),
  metricId: z.string().cuid().optional().nullable(),
  position: z
    .object({
      x: z.number(),
      y: z.number(),
      w: z.number(),
      h: z.number(),
    })
    .optional(),
  config: z.record(z.unknown()).optional(),
  query: z.record(z.unknown()).optional().nullable(),
  refreshInterval: z.number().int().min(5).max(3600).optional(),
  isVisible: z.boolean().optional(),
});

// ─── Alert Schemas ────────────────────────────────────────────────────────────

export const alertQuerySchema = z.object({
  deviceId: z.string().cuid().optional(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]).optional(),
  status: z.string().optional(),
  isRead: z.coerce.boolean().optional(),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const acknowledgeAlertSchema = z.object({
  alertId: z.string().cuid(),
  message: z.string().max(500).optional(),
});

export const resolveAlertSchema = z.object({
  alertId: z.string().cuid(),
  message: z.string().max(500).optional(),
});

// ─── Alert Rule Schemas ───────────────────────────────────────────────────────

export const createAlertRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]),
  conditions: z
    .array(
      z.object({
        field: z.string(),
        operator: z.enum(["gt", "gte", "lt", "lte", "eq", "neq", "contains", "not_contains"]),
        value: z.unknown(),
        logicalOp: z.enum(["AND", "OR"]).optional(),
      })
    )
    .min(1),
  actions: z
    .array(
      z.object({
        type: z.enum([
          "SEND_NOTIFICATION", "CALL_WEBHOOK", "UPDATE_DEVICE",
          "CREATE_TICKET", "EXECUTE_LAMBDA", "TRIGGER_SNS",
          "LOG_EVENT", "SET_VALUE",
        ]),
        config: z.record(z.unknown()).optional(),
        order: z.number().int().min(0).optional(),
      })
    )
    .min(1),
  isActive: z.boolean().default(true),
  priority: z.number().int().min(0).max(10).default(0),
  cooldownMinutes: z.number().int().min(1).max(1440).default(5),
  deviceIds: z.array(z.string().cuid()).optional(),
  tagIds: z.array(z.string().cuid()).optional(),
});

export const updateAlertRuleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]).optional(),
  isActive: z.boolean().optional(),
  priority: z.number().int().min(0).max(10).optional(),
  cooldownMinutes: z.number().int().min(1).max(1440).optional(),
});

// ─── Metric Schemas ───────────────────────────────────────────────────────────

export const createMetricSchema = z.object({
  deviceId: z.string().cuid(),
  name: z.string().min(1).max(100),
  displayName: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  dataType: z.enum([
    "TEMPERATURE", "HUMIDITY", "PRESSURE", "VOLTAGE", "CURRENT",
    "POWER", "GPS", "ACCELEROMETER", "GYROSCOPE", "TEXT",
    "BOOLEAN", "INTEGER", "FLOAT", "JSON", "BINARY",
  ]),
  metricType: z.enum(["DEVICE_DATA", "SYSTEM", "BUSINESS", "CUSTOM"]).default("DEVICE_DATA"),
  unit: z.string().max(20).optional(),
  source: z.enum(["DEVICE_TELEMETRY", "SIMULATED", "EXTERNAL_API", "MANUAL"]).default("DEVICE_TELEMETRY"),
  config: z.record(z.unknown()).optional(),
});

export const metricQuerySchema = z.object({
  deviceId: z.string().cuid().optional(),
  metricType: z.enum(["DEVICE_DATA", "SYSTEM", "BUSINESS", "CUSTOM"]).optional(),
  aggregationType: z.enum([
    "AVG", "SUM", "MIN", "MAX", "COUNT", "PERCENTILE_50",
    "PERCENTILE_90", "PERCENTILE_95", "PERCENTILE_99", "RATE", "STDDEV",
  ]).optional(),
  intervalMinutes: z.coerce.number().int().min(1).optional(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
});

// ─── Rule Schemas ─────────────────────────────────────────────────────────────

export const createRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
  priority: z.number().int().min(0).max(10).default(0),
  cooldownMinutes: z.number().int().min(1).max(1440).default(5),
  conditions: z
    .array(
      z.object({
        field: z.string().min(1),
        operator: z.enum(["gt", "gte", "lt", "lte", "eq", "neq", "contains", "not_contains"]),
        value: z.unknown(),
        logicalOp: z.enum(["AND", "OR"]).optional(),
      })
    )
    .min(1),
  actions: z
    .array(
      z.object({
        type: z.enum([
          "SEND_NOTIFICATION", "CALL_WEBHOOK", "UPDATE_DEVICE",
          "CREATE_TICKET", "EXECUTE_LAMBDA", "TRIGGER_SNS",
          "LOG_EVENT", "SET_VALUE",
        ]),
        config: z.record(z.unknown()).optional(),
        order: z.number().int().min(0).optional(),
      })
    )
    .min(1),
  deviceIds: z.array(z.string().cuid()).optional(),
  tagIds: z.array(z.string().cuid()).optional(),
});

export const updateRuleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
  priority: z.number().int().min(0).max(10).optional(),
  cooldownMinutes: z.number().int().min(1).max(1440).optional(),
});

// ─── Integration Schemas ──────────────────────────────────────────────────────

export const createIntegrationSchema = z.object({
  type: z.enum([
    "AWS_IOT", "MQTT", "REST_API", "WEBHOOK", "GRAFANA",
    "PROMETHEUS", "INFLUXDB", "DATADOG", "PAGERDUTY", "SLACK",
  ]),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  config: z.record(z.unknown()).optional(),
  credentials: z.record(z.string()).optional(),
});

export const updateIntegrationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
  credentials: z.record(z.string()).optional(),
});

// ─── Notification Schemas ─────────────────────────────────────────────────────

export const updateNotificationPreferenceSchema = z.object({
  channel: z.enum(["EMAIL", "SMS", "WEBHOOK", "SLACK", "PUSH", "IN_APP"]),
  type: z.string().min(1),
  enabled: z.boolean(),
  config: z.record(z.unknown()).optional(),
});

// ─── Report Schemas ───────────────────────────────────────────────────────────

export const createScheduledReportSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  integrationId: z.string().cuid().optional(),
  templateId: z.string().cuid().optional(),
  schedule: z.string().min(1, "Cron schedule is required"),
  format: z.enum(["PDF", "CSV", "JSON", "HTML", "XLSX"]).default("PDF"),
  recipients: z.array(z.string().email()).optional(),
  config: z.record(z.unknown()).optional(),
});

export const updateScheduledReportSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  schedule: z.string().optional(),
  format: z.enum(["PDF", "CSV", "JSON", "HTML", "XLSX"]).optional(),
  recipients: z.array(z.string().email()).optional(),
  isActive: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
});

// ─── Tag Schemas ──────────────────────────────────────────────────────────────

export const createTagSchema = z.object({
  name: z.string().min(1).max(50).unique(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color")
    .optional(),
});

export const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color")
    .optional(),
});

// ─── Group Schemas ────────────────────────────────────────────────────────────

export const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  parentId: z.string().cuid().optional(),
});

export const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  parentId: z.string().cuid().optional().nullable(),
});

// ─── Pagination Schema ────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// ─── ID Schema ────────────────────────────────────────────────────────────────

export const idSchema = z.object({
  id: z.string().cuid("Invalid ID format"),
});

// ─── Bulk Operation Schemas ───────────────────────────────────────────────────

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(100),
});

export const bulkUpdateStatusSchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(100),
  status: z.enum(["ONLINE", "OFFLINE", "IDLE", "ERROR", "MAINTENANCE", "PROVISIONING", "DECOMMISSIONED"]),
});

// ─── API Key Schemas ──────────────────────────────────────────────────────────

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  expiresAt: z.coerce.date().optional(),
});

export const validateApiKeySchema = z.object({
  key: z.string().min(1),
});
