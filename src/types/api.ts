export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: APIError;
  meta?: APIMeta;
  timestamp: number;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  field?: string;
  timestamp?: number;
  requestId?: string;
  documentation?: string;
}

export interface APIMeta {
  requestId: string;
  timestamp: number;
  duration?: number;
  pagination?: PaginationMeta;
  rateLimit?: RateLimitMeta;
  version?: string;
  deprecation?: DeprecationInfo;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextPage?: number;
  previousPage?: number;
}

export interface RateLimitMeta {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export interface DeprecationInfo {
  deprecated: boolean;
  sunsetDate?: string;
 替代Api?: string;
  documentation?: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface FilterParams {
  search?: string;
  status?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  tags?: string[];
}

export interface APIRequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | string[]>;
}

export interface DeviceAPIResponse {
  devices: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    lastSeen?: string;
    sensors: Array<{
      id: string;
      name: string;
      type: string;
      unit: string;
      lastValue?: number;
    }>;
  }>;
  total: number;
}

export interface SensorDataAPIResponse {
  deviceId: string;
  sensorId: string;
  data: Array<{
    timestamp: number;
    value: number;
    quality?: string;
  }>;
  metadata: {
    unit: string;
    min?: number;
    max?: number;
    avg?: number;
  };
}

export interface AlertAPIResponse {
  alerts: Array<{
    id: string;
    name: string;
    severity: string;
    status: string;
    deviceId: string;
    message: string;
    triggeredAt: string;
    acknowledgedAt?: string;
  }>;
  total: number;
}

export interface DashboardAPIResponse {
  dashboards: Array<{
    id: string;
    name: string;
    description?: string;
    layout: string;
    widgetCount: number;
    isDefault: boolean;
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  total: number;
}

export interface AuthAPIResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    avatar?: string;
  };
  token: string;
  refreshToken: string;
  expiresAt: number;
}

export interface WebsocketMessage<T = unknown> {
  type: "data" | "alert" | "status" | "command" | "error" | "ping" | "pong";
  payload: T;
  timestamp: number;
  deviceId?: string;
  source?: string;
}

export interface APIErrorCode {
  VALIDATION_ERROR: "VALIDATION_ERROR";
  NOT_FOUND: "NOT_FOUND";
  UNAUTHORIZED: "UNAUTHORIZED";
  FORBIDDEN: "FORBIDDEN";
  CONFLICT: "CONFLICT";
  RATE_LIMITED: "RATE_LIMITED";
  INTERNAL_ERROR: "INTERNAL_ERROR";
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
  TIMEOUT: "TIMEOUT";
  BAD_REQUEST: "BAD_REQUEST";
}

export const API_ERROR_CODES: APIErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  TIMEOUT: "TIMEOUT",
  BAD_REQUEST: "BAD_REQUEST",
};

export function createSuccessResponse<T>(
  data: T,
  meta?: Partial<APIMeta>
): APIResponse<T> {
  return {
    success: true,
    data,
    meta: {
      requestId: `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      ...meta,
    },
    timestamp: Date.now(),
  };
}

export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  field?: string
): APIResponse<never> {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      field,
      timestamp: Date.now(),
      requestId: `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    },
    timestamp: Date.now(),
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): APIResponse<T[]> {
  const totalPages = Math.ceil(total / pageSize);

  return createSuccessResponse(data, {
    pagination: {
      total,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      nextPage: page < totalPages ? page + 1 : undefined,
      previousPage: page > 1 ? page - 1 : undefined,
    },
  });
}

export function isSuccessResponse<T>(response: APIResponse<T>): response is APIResponse<T> & { data: T } {
  return response.success && response.data !== undefined;
}

export function isErrorResponse(response: APIResponse<unknown>): response is APIResponse<never> & { error: APIError } {
  return !response.success && response.error !== undefined;
}
