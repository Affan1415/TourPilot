import { vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Create a mock NextRequest for testing API routes
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string
    body?: any
    headers?: Record<string, string>
  } = {}
): NextRequest {
  const { method = 'GET', body, headers = {} } = options

  const requestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body && method !== 'GET' ? JSON.stringify(body) : undefined,
  }

  return new NextRequest(new URL(url, 'http://localhost:3000'), requestInit)
}

/**
 * Create mock Supabase client for testing
 */
export function createMockSupabaseClient(overrides: any = {}) {
  const mockFrom = vi.fn(() => mockQueryBuilder)

  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  }

  return {
    from: mockFrom,
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    _queryBuilder: mockQueryBuilder,
  }
}

/**
 * Create a mock authenticated user
 */
export function createMockUser(overrides: any = {}) {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    role: 'admin',
    app_metadata: {},
    user_metadata: {
      role: 'admin',
    },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Extract JSON from NextResponse
 */
export async function parseResponseJson(response: Response): Promise<any> {
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/**
 * Generate a valid UUID for testing
 */
export function generateTestUuid(): string {
  return '550e8400-e29b-41d4-a716-446655440000'
}

/**
 * Create mock tour data
 */
export function createMockTour(overrides: any = {}) {
  return {
    id: generateTestUuid(),
    name: 'Test Tour',
    slug: 'test-tour',
    description: 'A test tour description',
    base_price: 99.99,
    duration_minutes: 120,
    max_capacity: 20,
    min_guests: 1,
    status: 'active',
    requires_waiver: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Create mock booking data
 */
export function createMockBooking(overrides: any = {}) {
  return {
    id: generateTestUuid(),
    reference_number: 'BK-ABC123',
    customer_id: generateTestUuid(),
    availability_id: generateTestUuid(),
    guest_count: 2,
    total_price: 199.98,
    status: 'confirmed',
    payment_status: 'paid',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Create mock availability data
 */
export function createMockAvailability(overrides: any = {}) {
  return {
    id: generateTestUuid(),
    tour_id: generateTestUuid(),
    date: '2024-06-15',
    start_time: '09:00',
    end_time: '11:00',
    status: 'available',
    spots_remaining: 15,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Create mock customer data
 */
export function createMockCustomer(overrides: any = {}) {
  return {
    id: generateTestUuid(),
    email: 'customer@example.com',
    first_name: 'John',
    last_name: 'Doe',
    phone: '+1 555-123-4567',
    country_code: '+1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}
