import { describe, it, expect } from 'vitest'
import {
  uuidSchema,
  emailSchema,
  phoneSchema,
  dateSchema,
  timeSchema,
  customerCreateSchema,
  bookingCreateSchema,
  tourCreateSchema,
  availabilityCreateSchema,
  availabilityBulkCreateSchema,
  waiverTemplateCreateSchema,
  affiliateCreateSchema,
} from '../schemas'

describe('Common Schemas', () => {
  describe('uuidSchema', () => {
    it('accepts valid UUIDs', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000'
      expect(uuidSchema.safeParse(validUuid).success).toBe(true)
    })

    it('rejects invalid UUIDs', () => {
      expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false)
      expect(uuidSchema.safeParse('').success).toBe(false)
      expect(uuidSchema.safeParse('123').success).toBe(false)
    })
  })

  describe('emailSchema', () => {
    it('accepts valid emails', () => {
      expect(emailSchema.safeParse('test@example.com').success).toBe(true)
      expect(emailSchema.safeParse('user+tag@domain.co.uk').success).toBe(true)
    })

    it('transforms email to lowercase', () => {
      const result = emailSchema.safeParse('TEST@EXAMPLE.COM')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('test@example.com')
      }
    })

    it('rejects invalid emails', () => {
      expect(emailSchema.safeParse('not-an-email').success).toBe(false)
      expect(emailSchema.safeParse('missing@').success).toBe(false)
      expect(emailSchema.safeParse('@domain.com').success).toBe(false)
    })
  })

  describe('phoneSchema', () => {
    it('accepts valid phone numbers', () => {
      expect(phoneSchema.safeParse('+1 555-123-4567').success).toBe(true)
      expect(phoneSchema.safeParse('(555) 123-4567').success).toBe(true)
      expect(phoneSchema.safeParse('5551234567').success).toBe(true)
    })

    it('accepts null and undefined', () => {
      expect(phoneSchema.safeParse(null).success).toBe(true)
      expect(phoneSchema.safeParse(undefined).success).toBe(true)
    })

    it('rejects invalid phone numbers', () => {
      expect(phoneSchema.safeParse('abc').success).toBe(false)
      expect(phoneSchema.safeParse('123-abc-4567').success).toBe(false)
    })
  })

  describe('dateSchema', () => {
    it('accepts valid date format', () => {
      expect(dateSchema.safeParse('2024-01-15').success).toBe(true)
      expect(dateSchema.safeParse('2023-12-31').success).toBe(true)
    })

    it('rejects invalid date formats', () => {
      expect(dateSchema.safeParse('01-15-2024').success).toBe(false)
      expect(dateSchema.safeParse('2024/01/15').success).toBe(false)
      expect(dateSchema.safeParse('Jan 15, 2024').success).toBe(false)
    })
  })

  describe('timeSchema', () => {
    it('accepts valid time formats', () => {
      expect(timeSchema.safeParse('09:30').success).toBe(true)
      expect(timeSchema.safeParse('14:00:00').success).toBe(true)
      expect(timeSchema.safeParse('00:00').success).toBe(true)
    })

    it('rejects invalid time formats', () => {
      expect(timeSchema.safeParse('9:30').success).toBe(false) // Single digit hour
      expect(timeSchema.safeParse('9:30 AM').success).toBe(false) // AM/PM suffix
      expect(timeSchema.safeParse('invalid').success).toBe(false) // Non-time string
    })
  })
})

describe('Customer Schema', () => {
  describe('customerCreateSchema', () => {
    it('accepts valid customer data', () => {
      const validCustomer = {
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '+1 555-123-4567',
      }
      expect(customerCreateSchema.safeParse(validCustomer).success).toBe(true)
    })

    it('requires email, first_name, and last_name', () => {
      expect(customerCreateSchema.safeParse({}).success).toBe(false)
      expect(customerCreateSchema.safeParse({ email: 'test@example.com' }).success).toBe(false)
      expect(customerCreateSchema.safeParse({
        email: 'test@example.com',
        first_name: 'John'
      }).success).toBe(false)
    })

    it('applies default values', () => {
      const result = customerCreateSchema.safeParse({
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.country_code).toBe('+1')
        expect(result.data.tags).toEqual([])
      }
    })
  })
})

describe('Tour Schema', () => {
  describe('tourCreateSchema', () => {
    it('accepts valid tour data', () => {
      const validTour = {
        name: 'Sunset Cruise',
        slug: 'sunset-cruise',
        base_price: 99.99,
        duration_minutes: 120,
        max_capacity: 20,
      }
      const result = tourCreateSchema.safeParse(validTour)
      expect(result.success).toBe(true)
    })

    it('validates slug format', () => {
      expect(tourCreateSchema.safeParse({
        name: 'Test',
        slug: 'valid-slug-123',
        base_price: 50,
      }).success).toBe(true)

      expect(tourCreateSchema.safeParse({
        name: 'Test',
        slug: 'Invalid Slug!',
        base_price: 50,
      }).success).toBe(false)
    })

    it('requires positive price', () => {
      expect(tourCreateSchema.safeParse({
        name: 'Test',
        slug: 'test',
        base_price: 0,
      }).success).toBe(false)

      expect(tourCreateSchema.safeParse({
        name: 'Test',
        slug: 'test',
        base_price: -50,
      }).success).toBe(false)
    })

    it('validates status enum', () => {
      expect(tourCreateSchema.safeParse({
        name: 'Test',
        slug: 'test',
        base_price: 50,
        status: 'active',
      }).success).toBe(true)

      expect(tourCreateSchema.safeParse({
        name: 'Test',
        slug: 'test',
        base_price: 50,
        status: 'invalid',
      }).success).toBe(false)
    })
  })
})

describe('Availability Schema', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000'

  describe('availabilityCreateSchema', () => {
    it('accepts valid availability data', () => {
      const result = availabilityCreateSchema.safeParse({
        tour_id: validUuid,
        date: '2024-06-15',
        start_time: '09:00',
        end_time: '11:00',
      })
      expect(result.success).toBe(true)
    })

    it('accepts optional overrides', () => {
      const result = availabilityCreateSchema.safeParse({
        tour_id: validUuid,
        boat_id: validUuid,
        date: '2024-06-15',
        start_time: '09:00',
        end_time: '11:00',
        price_override: 149.99,
        capacity_override: 15,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('availabilityBulkCreateSchema', () => {
    it('accepts valid bulk availability data', () => {
      const result = availabilityBulkCreateSchema.safeParse({
        bulk: true,
        tour_id: validUuid,
        start_date: '2024-06-01',
        end_date: '2024-06-30',
        days_of_week: [1, 2, 3, 4, 5],
        time_slots: [
          { start_time: '09:00', end_time: '11:00' },
          { start_time: '14:00', end_time: '16:00' },
        ],
      })
      expect(result.success).toBe(true)
    })

    it('requires at least one time slot', () => {
      const result = availabilityBulkCreateSchema.safeParse({
        bulk: true,
        tour_id: validUuid,
        start_date: '2024-06-01',
        end_date: '2024-06-30',
        time_slots: [],
      })
      expect(result.success).toBe(false)
    })

    it('validates days_of_week values', () => {
      expect(availabilityBulkCreateSchema.safeParse({
        bulk: true,
        tour_id: validUuid,
        start_date: '2024-06-01',
        end_date: '2024-06-30',
        days_of_week: [7],
        time_slots: [{ start_time: '09:00', end_time: '11:00' }],
      }).success).toBe(false)

      expect(availabilityBulkCreateSchema.safeParse({
        bulk: true,
        tour_id: validUuid,
        start_date: '2024-06-01',
        end_date: '2024-06-30',
        days_of_week: [-1],
        time_slots: [{ start_time: '09:00', end_time: '11:00' }],
      }).success).toBe(false)
    })
  })
})

describe('Waiver Template Schema', () => {
  describe('waiverTemplateCreateSchema', () => {
    it('accepts valid waiver template', () => {
      const result = waiverTemplateCreateSchema.safeParse({
        name: 'Standard Waiver',
        content: 'I agree to the terms and conditions...',
      })
      expect(result.success).toBe(true)
    })

    it('sets default is_active to true', () => {
      const result = waiverTemplateCreateSchema.safeParse({
        name: 'Standard Waiver',
        content: 'I agree...',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.is_active).toBe(true)
      }
    })

    it('requires name and content', () => {
      expect(waiverTemplateCreateSchema.safeParse({}).success).toBe(false)
      expect(waiverTemplateCreateSchema.safeParse({ name: 'Test' }).success).toBe(false)
      expect(waiverTemplateCreateSchema.safeParse({ content: 'Test' }).success).toBe(false)
    })
  })
})

describe('Affiliate Schema', () => {
  describe('affiliateCreateSchema', () => {
    it('accepts valid affiliate data', () => {
      const result = affiliateCreateSchema.safeParse({
        name: 'Partner Hotel',
        email: 'partner@hotel.com',
        commission_rate: 10,
        discount_value: 5,
      })
      expect(result.success).toBe(true)
    })

    it('validates affiliate code format', () => {
      expect(affiliateCreateSchema.safeParse({
        name: 'Partner',
        email: 'test@test.com',
        affiliate_code: 'PARTNER123',
        commission_rate: 10,
        discount_value: 5,
      }).success).toBe(true)

      expect(affiliateCreateSchema.safeParse({
        name: 'Partner',
        email: 'test@test.com',
        affiliate_code: 'invalid-code',
        commission_rate: 10,
        discount_value: 5,
      }).success).toBe(false)
    })

    it('validates commission rate bounds', () => {
      expect(affiliateCreateSchema.safeParse({
        name: 'Partner',
        email: 'test@test.com',
        commission_rate: 101,
        discount_value: 5,
      }).success).toBe(false)

      expect(affiliateCreateSchema.safeParse({
        name: 'Partner',
        email: 'test@test.com',
        commission_rate: -5,
        discount_value: 5,
      }).success).toBe(false)
    })

    it('sets default commission and discount types', () => {
      const result = affiliateCreateSchema.safeParse({
        name: 'Partner',
        email: 'test@test.com',
        commission_rate: 10,
        discount_value: 5,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.commission_type).toBe('percentage')
        expect(result.data.discount_type).toBe('percentage')
      }
    })
  })
})

describe('Booking Schema', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000'

  describe('bookingCreateSchema', () => {
    it('accepts valid booking data', () => {
      const result = bookingCreateSchema.safeParse({
        customer: {
          email: 'customer@example.com',
          first_name: 'Jane',
          last_name: 'Smith',
        },
        availability_id: validUuid,
        guest_count: 2,
        guests: [
          { first_name: 'Jane', last_name: 'Smith' },
          { first_name: 'John', last_name: 'Smith' },
        ],
        total_price: 199.98,
      })
      expect(result.success).toBe(true)
    })

    it('requires at least one guest', () => {
      const result = bookingCreateSchema.safeParse({
        customer: {
          email: 'customer@example.com',
          first_name: 'Jane',
          last_name: 'Smith',
        },
        availability_id: validUuid,
        guest_count: 1,
        guests: [],
        total_price: 99.99,
      })
      expect(result.success).toBe(false)
    })

    it('requires positive guest count', () => {
      const result = bookingCreateSchema.safeParse({
        customer: {
          email: 'customer@example.com',
          first_name: 'Jane',
          last_name: 'Smith',
        },
        availability_id: validUuid,
        guest_count: 0,
        guests: [{ first_name: 'Jane', last_name: 'Smith' }],
        total_price: 99.99,
      })
      expect(result.success).toBe(false)
    })

    it('requires positive total price', () => {
      const result = bookingCreateSchema.safeParse({
        customer: {
          email: 'customer@example.com',
          first_name: 'Jane',
          last_name: 'Smith',
        },
        availability_id: validUuid,
        guest_count: 1,
        guests: [{ first_name: 'Jane', last_name: 'Smith' }],
        total_price: 0,
      })
      expect(result.success).toBe(false)
    })
  })
})
