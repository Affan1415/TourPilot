import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
  message?: string;  // Custom error message
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
// In production, use Redis or similar for distributed rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

export function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from various headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  const ip = cfConnectingIp || realIp || forwardedFor?.split(',')[0]?.trim() || 'unknown';

  // Optionally include user ID for authenticated requests
  const authHeader = request.headers.get('authorization');

  return `${ip}:${authHeader ? 'auth' : 'anon'}`;
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || entry.resetTime < now) {
    // Create new entry
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(identifier, newEntry);
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: newEntry.resetTime,
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

export function rateLimitResponse(resetTime: number, message?: string): NextResponse {
  const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
  return NextResponse.json(
    { error: message || 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)),
      },
    }
  );
}

// Pre-configured rate limiters for different use cases
export const RATE_LIMITS = {
  // Strict limit for auth endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },

  // Moderate limit for booking creation
  booking: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 bookings per minute
    message: 'Too many booking requests. Please slow down.',
  },

  // Standard limit for API endpoints
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    message: 'Rate limit exceeded. Please try again later.',
  },

  // Strict limit for affiliate code validation
  affiliate: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 validations per minute
    message: 'Too many validation requests.',
  },

  // Limit for widget embed requests
  widget: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    message: 'Widget rate limit exceeded.',
  },
};

// Helper function to apply rate limiting in API routes
export function withRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  keyPrefix?: string
): NextResponse | null {
  const identifier = `${keyPrefix || 'default'}:${getClientIdentifier(request)}`;
  const result = checkRateLimit(identifier, config);

  if (!result.allowed) {
    return rateLimitResponse(result.resetTime, config.message);
  }

  return null; // Allowed to proceed
}

// Utility to create rate-limited API handler
export function createRateLimitedHandler<T>(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>,
  config: RateLimitConfig,
  keyPrefix?: string
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    const rateLimitError = withRateLimit(request, config, keyPrefix);
    if (rateLimitError) {
      return rateLimitError;
    }
    return handler(request, ...args);
  };
}
