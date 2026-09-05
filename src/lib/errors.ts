// ─── Base Error Classes ───────────────────────────────────────────────────────

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string = "INTERNAL_ERROR",
    statusCode: number = 500,
    details?: Record<string, unknown>,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

// ─── Specific Error Classes ───────────────────────────────────────────────────

export class ValidationError extends AppError {
  public readonly fields: Array<{
    field: string;
    message: string;
    code: string;
  }>;

  constructor(
    message: string = "Validation failed",
    fields: Array<{ field: string; message: string; code: string }> = []
  ) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
    this.fields = fields;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      fields: this.fields,
    };
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, "AUTHENTICATION_ERROR", 401);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppError {
  constructor(
    message: string = "Insufficient permissions",
    details?: Record<string, unknown>
  ) {
    super(message, "AUTHORIZATION_ERROR", 403, details);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends AppError {
  constructor(
    resource: string = "Resource",
    identifier?: string
  ) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, "NOT_FOUND", 404, { resource, identifier });
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(
    message: string = "Resource already exists",
    details?: Record<string, unknown>
  ) {
    super(message, "CONFLICT", 409, details);
    this.name = "ConflictError";
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(
    message: string = "Too many requests",
    retryAfter: number = 60
  ) {
    super(message, "RATE_LIMITED", 429, { retryAfter });
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

export class ExternalServiceError extends AppError {
  public readonly service: string;

  constructor(
    service: string,
    message: string = "External service error",
    details?: Record<string, unknown>
  ) {
    super(message, "EXTERNAL_SERVICE_ERROR", 502, { service, ...details });
    this.name = "ExternalServiceError";
    this.service = service;
  }
}

export class DatabaseError extends AppError {
  constructor(
    message: string = "Database operation failed",
    details?: Record<string, unknown>
  ) {
    super(message, "DATABASE_ERROR", 500, details);
    this.name = "DatabaseError";
  }
}

export class ConfigurationError extends AppError {
  constructor(
    message: string = "Configuration error",
    details?: Record<string, unknown>
  ) {
    super(message, "CONFIGURATION_ERROR", 500, details, false);
    this.name = "ConfigurationError";
  }
}

export class DeviceOfflineError extends AppError {
  public readonly deviceId: string;

  constructor(deviceId: string) {
    super(
      `Device '${deviceId}' is offline`,
      "DEVICE_OFFLINE",
      503,
      { deviceId }
    );
    this.name = "DeviceOfflineError";
    this.deviceId = deviceId;
  }
}

export class DataValidationError extends AppError {
  public readonly dataType: string;
  public readonly expectedFormat: string;

  constructor(
    dataType: string,
    expectedFormat: string,
    message?: string
  ) {
    super(
      message ?? `Invalid data format for ${dataType}. Expected: ${expectedFormat}`,
      "DATA_VALIDATION_ERROR",
      400,
      { dataType, expectedFormat }
    );
    this.name = "DataValidationError";
    this.dataType = dataType;
    this.expectedFormat = expectedFormat;
  }
}

// ─── Error Response Builder ───────────────────────────────────────────────────

export function buildErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        ...(error instanceof ValidationError ? { fields: error.fields } : {}),
      },
    };
  }

  if (error instanceof Error) {
    return {
      error: {
        code: "INTERNAL_ERROR",
        message:
          process.env.NODE_ENV === "development"
            ? error.message
            : "An unexpected error occurred",
      },
    };
  }

  return {
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    },
  };
}

export function getStatusCode(error: unknown): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }
  return 500;
}

export function isErrorOfType<T extends AppError>(
  error: unknown,
  errorClass: new (...args: unknown[]) => T
): error is T {
  return error instanceof errorClass;
}

// ─── Error Logging Helper ─────────────────────────────────────────────────────

export function logError(error: unknown, context?: Record<string, unknown>) {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    ...(error instanceof AppError
      ? {
          name: error.name,
          message: error.message,
          code: error.code,
          statusCode: error.statusCode,
          details: error.details,
          isOperational: error.isOperational,
        }
      : {
          name: "UnknownError",
          message: error instanceof Error ? error.message : String(error),
        }),
    context,
    stack: error instanceof Error ? error.stack : undefined,
  };

  if (
    error instanceof AppError &&
    error.statusCode >= 500 &&
    !error.isOperational
  ) {
    console.error("[CRITICAL]", JSON.stringify(errorInfo, null, 2));
  } else if (error instanceof AppError && error.statusCode >= 400) {
    console.warn("[CLIENT_ERROR]", JSON.stringify(errorInfo, null, 2));
  } else {
    console.error("[ERROR]", JSON.stringify(errorInfo, null, 2));
  }
}
