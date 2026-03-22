/**
 * CSRF Protection Utility
 * Generates and validates CSRF tokens for form submissions
 */

import { cookies } from "next/headers";

const CSRF_COOKIE_NAME = "_csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_TOKEN_LENGTH = 32;

/**
 * Generate a cryptographically secure random token
 */
function generateToken(): string {
  const array = new Uint8Array(CSRF_TOKEN_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Get or create a CSRF token for the current session
 * Stores token in an HTTP-only cookie
 */
export async function getCSRFToken(): Promise<string> {
  const cookieStore = await cookies();
  const existingToken = cookieStore.get(CSRF_COOKIE_NAME);

  if (existingToken?.value) {
    return existingToken.value;
  }

  // Generate new token
  const newToken = generateToken();

  // Note: In App Router, we can't set cookies from server components directly
  // This would need to be called from a route handler or server action
  return newToken;
}

/**
 * Set CSRF token in cookie (call from route handler)
 */
export async function setCSRFTokenCookie(): Promise<string> {
  const token = generateToken();
  const cookieStore = await cookies();

  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return token;
}

/**
 * Validate CSRF token from request header against cookie
 */
export async function validateCSRFToken(
  request: Request
): Promise<{ valid: boolean; error?: string }> {
  // Skip CSRF for safe methods
  const method = request.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return { valid: true };
  }

  // Skip CSRF for API routes with Bearer token (they use different auth)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return { valid: true };
  }

  // Get token from cookie
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (!cookieToken) {
    return { valid: false, error: "No CSRF cookie found" };
  }

  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!headerToken) {
    // Also check request body for form submissions
    // But be careful not to consume the body
    return { valid: false, error: "No CSRF token in request" };
  }

  // Constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(cookieToken, headerToken)) {
    return { valid: false, error: "CSRF token mismatch" };
  }

  return { valid: true };
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * React hook to get CSRF token for form submissions
 * Use this on the client side
 */
export function getCSRFHeaders(token: string): Record<string, string> {
  return {
    [CSRF_HEADER_NAME]: token,
  };
}

/**
 * Middleware helper to check CSRF
 */
export async function csrfProtect(
  request: Request
): Promise<Response | null> {
  const { valid, error } = await validateCSRFToken(request);

  if (!valid) {
    return new Response(JSON.stringify({ error: "Invalid CSRF token", details: error }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return null; // Continue with request
}
