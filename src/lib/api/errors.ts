import { NextResponse } from "next/server";

export enum ErrorCode {
  // Authentication errors (401)
  UNAUTHORIZED = "UNAUTHORIZED",
  INVALID_TOKEN = "INVALID_TOKEN",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",

  // Authorization errors (403)
  FORBIDDEN = "FORBIDDEN",
  INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",

  // Not found errors (404)
  NOT_FOUND = "NOT_FOUND",
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",

  // Validation errors (400)
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_INPUT = "INVALID_INPUT",
  MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",

  // Conflict errors (409)
  CONFLICT = "CONFLICT",
  DUPLICATE_ENTRY = "DUPLICATE_ENTRY",
  ALREADY_EXISTS = "ALREADY_EXISTS",

  // Business logic errors (422)
  UNPROCESSABLE = "UNPROCESSABLE",
  CAPACITY_EXCEEDED = "CAPACITY_EXCEEDED",
  BOOKING_NOT_AVAILABLE = "BOOKING_NOT_AVAILABLE",
  INVALID_STATUS_TRANSITION = "INVALID_STATUS_TRANSITION",

  // Payment errors (402)
  PAYMENT_REQUIRED = "PAYMENT_REQUIRED",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  REFUND_FAILED = "REFUND_FAILED",

  // Rate limiting (429)
  RATE_LIMITED = "RATE_LIMITED",

  // Server errors (500)
  INTERNAL_ERROR = "INTERNAL_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
}

interface ApiError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.INVALID_TOKEN]: 401,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.RESOURCE_NOT_FOUND]: 404,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.DUPLICATE_ENTRY]: 409,
  [ErrorCode.ALREADY_EXISTS]: 409,
  [ErrorCode.UNPROCESSABLE]: 422,
  [ErrorCode.CAPACITY_EXCEEDED]: 422,
  [ErrorCode.BOOKING_NOT_AVAILABLE]: 422,
  [ErrorCode.INVALID_STATUS_TRANSITION]: 422,
  [ErrorCode.PAYMENT_REQUIRED]: 402,
  [ErrorCode.PAYMENT_FAILED]: 402,
  [ErrorCode.REFUND_FAILED]: 402,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 500,
};

/**
 * Creates a standardized API error response
 */
export function apiError(
  code: ErrorCode,
  message: string,
  details?: unknown
): NextResponse {
  const status = ERROR_STATUS_MAP[code];

  const error: ApiError = {
    code,
    message,
  };

  // Only include details in development
  if (details && process.env.NODE_ENV !== "production") {
    error.details = details;
  }

  return NextResponse.json({ error }, { status });
}

/**
 * Common error responses
 */
export const errors = {
  unauthorized: (message = "Authentication required") =>
    apiError(ErrorCode.UNAUTHORIZED, message),

  forbidden: (message = "You don't have permission to perform this action") =>
    apiError(ErrorCode.FORBIDDEN, message),

  notFound: (resource = "Resource") =>
    apiError(ErrorCode.NOT_FOUND, `${resource} not found`),

  validation: (message: string, details?: unknown) =>
    apiError(ErrorCode.VALIDATION_ERROR, message, details),

  conflict: (message: string) =>
    apiError(ErrorCode.CONFLICT, message),

  duplicate: (field: string) =>
    apiError(ErrorCode.DUPLICATE_ENTRY, `A record with this ${field} already exists`),

  capacityExceeded: (available: number) =>
    apiError(ErrorCode.CAPACITY_EXCEEDED, `Only ${available} spots available`),

  bookingUnavailable: (message = "This booking slot is no longer available") =>
    apiError(ErrorCode.BOOKING_NOT_AVAILABLE, message),

  paymentFailed: (message: string) =>
    apiError(ErrorCode.PAYMENT_FAILED, message),

  refundFailed: (message: string) =>
    apiError(ErrorCode.REFUND_FAILED, message),

  internal: (message = "An unexpected error occurred") =>
    apiError(ErrorCode.INTERNAL_ERROR, message),

  database: (details?: unknown) =>
    apiError(ErrorCode.DATABASE_ERROR, "Database operation failed", details),

  external: (service: string) =>
    apiError(ErrorCode.EXTERNAL_SERVICE_ERROR, `${service} service is unavailable`),
};

/**
 * Wraps an API handler with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error("API Error:", error);

      if (error instanceof Error) {
        // Handle known error types
        if (error.message.includes("Unauthorized")) {
          return errors.unauthorized();
        }
        if (error.message.includes("Forbidden")) {
          return errors.forbidden();
        }

        // Production: hide internal error details
        if (process.env.NODE_ENV === "production") {
          return errors.internal();
        }

        return errors.internal(error.message);
      }

      return errors.internal();
    }
  }) as T;
}

/**
 * Handles Supabase errors and returns appropriate API responses
 */
export function handleSupabaseError(error: { code?: string; message?: string }): NextResponse {
  switch (error.code) {
    case "PGRST116":
      return errors.notFound();
    case "23505":
      return errors.duplicate("record");
    case "23503":
      return apiError(
        ErrorCode.UNPROCESSABLE,
        "Referenced record does not exist"
      );
    case "22P02":
      return errors.validation("Invalid data format");
    default:
      console.error("Supabase error:", error);
      return errors.database(
        process.env.NODE_ENV !== "production" ? error.message : undefined
      );
  }
}
