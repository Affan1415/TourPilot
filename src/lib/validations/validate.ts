import { NextResponse } from "next/server";
import { ZodSchema, ZodError } from "zod";

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: NextResponse;
}

/**
 * Validates request body against a Zod schema
 * Returns parsed data or a formatted error response
 */
export async function validateBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return {
        success: false,
        error: formatZodError(result.error),
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (e) {
    return {
      success: false,
      error: NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      ),
    };
  }
}

/**
 * Validates query parameters against a Zod schema
 */
export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>
): ValidationResult<T> {
  const params: Record<string, string | string[]> = {};

  searchParams.forEach((value, key) => {
    if (params[key]) {
      // Handle multiple values for same key
      if (Array.isArray(params[key])) {
        (params[key] as string[]).push(value);
      } else {
        params[key] = [params[key] as string, value];
      }
    } else {
      params[key] = value;
    }
  });

  const result = schema.safeParse(params);

  if (!result.success) {
    return {
      success: false,
      error: formatZodError(result.error),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Formats Zod errors into a user-friendly API response
 */
function formatZodError(error: ZodError): NextResponse {
  const issues = error.issues || [];
  const errors = issues.map((issue) => ({
    field: issue.path.map(String).join("."),
    message: issue.message,
  }));

  return NextResponse.json(
    {
      error: "Validation failed",
      details: errors,
    },
    { status: 400 }
  );
}

/**
 * Simple validation helper for direct schema usage
 */
export function validate<T>(data: unknown, schema: ZodSchema<T>): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      error: formatZodError(result.error),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}
