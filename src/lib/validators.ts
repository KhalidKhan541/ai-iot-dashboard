import { z } from 'zod';

// ── Device Validators ───────────────────────────────────────────────────────

export const deviceNameSchema = z.string()
  .min(1, 'Device name is required')
  .max(100, 'Device name must be 100 characters or less')
  .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Device name contains invalid characters');

export const deviceIdSchema = z.string()
  .uuid('Invalid device ID format');

export const deviceLocationSchema = z.string()
  .min(1, 'Location is required')
  .max(200, 'Location must be 200 characters or less');

export const deviceTypeSchema = z.enum(['sensor', 'actuator', 'gateway', 'controller'], {
  errorMap: () => ({ message: 'Invalid device type' }),
});

export const deviceStatusSchema = z.enum(['online', 'offline', 'warning', 'error'], {
  errorMap: () => ({ message: 'Invalid device status' }),
});

export const batteryLevelSchema = z.number()
  .min(0, 'Battery level must be at least 0')
  .max(100, 'Battery level must be at most 100');

export const firmwareVersionSchema = z.string()
  .regex(/^\d+\.\d+\.\d+$/, 'Firmware must be in semver format (e.g., 1.0.0)');

// ── Sensor Data Validators ──────────────────────────────────────────────────

export const sensorValueSchema = z.number()
  .finite('Sensor value must be a finite number');

export const metricNameSchema = z.string()
  .min(1, 'Metric name is required')
  .max(50, 'Metric name must be 50 characters or less')
  .regex(/^[a-zA-Z0-9_]+$/, 'Metric name must be alphanumeric with underscores only');

export const unitSchema = z.string()
  .min(1, 'Unit is required')
  .max(20, 'Unit must be 20 characters or less');

export const qualityScoreSchema = z.number()
  .min(0, 'Quality score must be at least 0')
  .max(1, 'Quality score must be at most 1');

export const timestampSchema = z.string()
  .datetime('Invalid timestamp format')
  .or(z.date());

// ── Alert Validators ────────────────────────────────────────────────────────

export const alertSeveritySchema = z.enum(['info', 'warning', 'critical', 'emergency'], {
  errorMap: () => ({ message: 'Invalid alert severity' }),
});

export const alertTitleSchema = z.string()
  .min(1, 'Alert title is required')
  .max(200, 'Alert title must be 200 characters or less');

export const alertMessageSchema = z.string()
  .min(1, 'Alert message is required')
  .max(2000, 'Alert message must be 2000 characters or less');

// ── Dashboard Validators ────────────────────────────────────────────────────

export const dashboardNameSchema = z.string()
  .min(1, 'Dashboard name is required')
  .max(100, 'Dashboard name must be 100 characters or less');

export const widgetTypeSchema = z.enum(
  ['chart', 'gauge', 'table', 'map', 'status', 'alert-list', 'kpi'],
  { errorMap: () => ({ message: 'Invalid widget type' }) }
);

export const chartTypeSchema = z.enum(['line', 'bar', 'area', 'pie', 'scatter'], {
  errorMap: () => ({ message: 'Invalid chart type' }),
});

export const positionSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(1).max(20),
});

// ── User Validators ─────────────────────────────────────────────────────────

export const emailSchema = z.string()
  .email('Invalid email format')
  .max(255, 'Email must be 255 characters or less');

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be 128 characters or less')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const usernameSchema = z.string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be 30 characters or less')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username must be alphanumeric with underscores only');

// ── API Validators ──────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const timeRangeSchema = z.object({
  start: z.string().datetime().or(z.date()),
  end: z.string().datetime().or(z.date()),
}).refine(data => {
  const start = new Date(data.start);
  const end = new Date(data.end);
  return start < end;
}, { message: 'Start time must be before end time' });

export const searchQuerySchema = z.string()
  .min(1, 'Search query is required')
  .max(200, 'Search query must be 200 characters or less')
  .trim();

// ── Validation Helpers ──────────────────────────────────────────────────────

export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }
  return result.data;
}

export function validateSafe<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: true;
  data: T;
} | {
  success: false;
  errors: string[];
} {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
  };
}

export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delayMs);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limitMs);
    }
  };
}
