/**
 * Input Sanitization Utilities
 * Prevents XSS, SQL injection, and other input-based attacks
 */

// HTML entities to escape
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(str: string): string {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Remove HTML tags from string
 */
export function stripHtml(str: string): string {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize string for safe database storage
 * Removes potential SQL injection patterns
 */
export function sanitizeForDb(str: string): string {
  if (typeof str !== 'string') return '';

  return str
    // Remove null bytes
    .replace(/\0/g, '')
    // Escape single quotes by doubling them (standard SQL escaping)
    .replace(/'/g, "''")
    // Remove semicolons that could terminate statements
    .replace(/;/g, '')
    // Trim whitespace
    .trim();
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  options: {
    escapeHtml?: boolean;
    stripHtml?: boolean;
    maxStringLength?: number;
    allowedKeys?: string[];
  } = {}
): T {
  const {
    escapeHtml: shouldEscapeHtml = true,
    stripHtml: shouldStripHtml = false,
    maxStringLength = 10000,
    allowedKeys,
  } = options;

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip keys not in allowlist if provided
    if (allowedKeys && !allowedKeys.includes(key)) {
      continue;
    }

    if (typeof value === 'string') {
      let sanitizedValue = value;

      if (shouldStripHtml) {
        sanitizedValue = stripHtml(sanitizedValue);
      } else if (shouldEscapeHtml) {
        sanitizedValue = escapeHtml(sanitizedValue);
      }

      // Truncate long strings
      if (sanitizedValue.length > maxStringLength) {
        sanitizedValue = sanitizedValue.slice(0, maxStringLength);
      }

      sanitized[key] = sanitizedValue;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? sanitizeObject(item, options)
          : typeof item === 'string'
          ? shouldStripHtml
            ? stripHtml(item)
            : shouldEscapeHtml
            ? escapeHtml(item)
            : item
          : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, options);
    } else {
      // Pass through numbers, booleans, null
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Validate and sanitize email address
 */
export function sanitizeEmail(email: string): string | null {
  if (typeof email !== 'string') return null;

  const trimmed = email.trim().toLowerCase();

  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmed)) {
    return null;
  }

  // Remove any HTML/script tags that might have snuck in
  return stripHtml(trimmed);
}

/**
 * Sanitize phone number - keep only digits and common separators
 */
export function sanitizePhone(phone: string): string {
  if (typeof phone !== 'string') return '';

  // Keep only digits, spaces, dashes, parentheses, and plus sign
  return phone.replace(/[^\d\s\-()+ ]/g, '').trim();
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(url: string): string | null {
  if (typeof url !== 'string') return null;

  const trimmed = url.trim();

  // Only allow http and https protocols
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
  if (typeof query !== 'string') return '';

  return query
    // Remove special characters that could break SQL LIKE patterns
    .replace(/[%_\\]/g, '')
    // Strip HTML
    .replace(/<[^>]*>/g, '')
    // Limit length
    .slice(0, 100)
    .trim();
}

/**
 * Validate UUID format
 */
export function isValidUuid(str: string): boolean {
  if (typeof str !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Sanitize filename for upload
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') return 'file';

  return filename
    // Remove path traversal attempts
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '')
    // Keep only alphanumeric, dots, dashes, underscores
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    // Remove leading dots (hidden files)
    .replace(/^\.+/, '')
    // Limit length
    .slice(0, 255)
    || 'file';
}

/**
 * Content Security Policy nonce generator
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString('base64');
}
