import { z } from "zod";

// Common schemas
export const uuidSchema = z.string().uuid("Invalid UUID format");

export const emailSchema = z
  .string()
  .email("Invalid email address")
  .transform((v) => v.toLowerCase());

export const phoneSchema = z
  .string()
  .regex(/^[\d\s\-+()]+$/, "Invalid phone number")
  .optional()
  .nullable();

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

export const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Time must be in HH:MM or HH:MM:SS format");

// Customer schemas
export const customerCreateSchema = z.object({
  email: emailSchema,
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  phone: phoneSchema,
  country_code: z.string().max(10).default("+1"),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
});

export const customerUpdateSchema = customerCreateSchema.partial();

// Guest schemas
export const guestSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  email: emailSchema.optional().nullable(),
});

// Booking schemas
export const bookingCreateSchema = z.object({
  customer: customerCreateSchema,
  availability_id: uuidSchema,
  guest_count: z.number().int().min(1, "At least 1 guest required").max(100),
  guests: z.array(guestSchema).min(1, "At least one guest is required"),
  notes: z.string().optional().nullable(),
  total_price: z.number().positive("Price must be positive"),
  affiliate_code: z.string().optional().nullable(),
});

export const bookingUpdateSchema = z.object({
  guest_count: z.number().int().min(1).max(100).optional(),
  notes: z.string().optional().nullable(),
  status: z.enum(["pending", "confirmed", "checked_in", "completed", "cancelled", "no_show"]).optional(),
  special_requests: z.string().optional().nullable(),
});

export const bookingCancelSchema = z.object({
  refund: z.boolean().optional().default(false),
  refund_amount: z.number().positive().optional(),
  reason: z.string().optional(),
});

export const bookingRescheduleSchema = z.object({
  new_availability_id: uuidSchema,
  notify_customer: z.boolean().optional().default(true),
});

// Tour schemas
export const tourCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().optional().nullable(),
  short_description: z.string().max(500).optional().nullable(),
  duration_minutes: z.number().int().positive().default(60),
  base_price: z.number().positive("Price must be positive"),
  max_capacity: z.number().int().positive().default(10),
  min_guests: z.number().int().positive().default(1),
  images: z.array(z.string().url()).optional().default([]),
  location: z.string().max(255).optional().nullable(),
  meeting_point: z.string().optional().nullable(),
  what_to_bring: z.array(z.string()).optional().default([]),
  includes: z.array(z.string()).optional().default([]),
  requires_waiver: z.boolean().default(true),
  status: z.enum(["active", "draft", "archived"]).default("draft"),
  boat_id: uuidSchema.optional().nullable(),
});

export const tourUpdateSchema = tourCreateSchema.partial();

export const tourPatchSchema = z.object({
  status: z.enum(["active", "draft", "archived"]).optional(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  base_price: z.number().positive().optional(),
  max_capacity: z.number().int().positive().optional(),
  requires_waiver: z.boolean().optional(),
});

// Availability schemas
export const availabilityCreateSchema = z.object({
  tour_id: uuidSchema,
  boat_id: uuidSchema.optional().nullable(),
  date: dateSchema,
  start_time: timeSchema,
  end_time: timeSchema,
  price_override: z.number().positive().optional().nullable(),
  capacity_override: z.number().int().positive().optional().nullable(),
});

export const availabilityBulkCreateSchema = z.object({
  bulk: z.literal(true),
  tour_id: uuidSchema,
  boat_id: uuidSchema.optional().nullable(),
  start_date: dateSchema,
  end_date: dateSchema,
  days_of_week: z.array(z.number().int().min(0).max(6)).optional(),
  time_slots: z.array(z.object({
    start_time: timeSchema,
    end_time: timeSchema,
  })).min(1, "At least one time slot is required"),
  price_override: z.number().positive().optional().nullable(),
  capacity_override: z.number().int().positive().optional().nullable(),
});

export const availabilityUpdateSchema = z.object({
  boat_id: uuidSchema.optional().nullable(),
  date: dateSchema.optional(),
  start_time: timeSchema.optional(),
  end_time: timeSchema.optional(),
  price_override: z.number().positive().optional().nullable(),
  capacity_override: z.number().int().positive().optional().nullable(),
  status: z.enum(["available", "full", "cancelled"]).optional(),
});

export const blackoutCreateSchema = z.object({
  tour_id: uuidSchema.optional(),
  start_date: dateSchema,
  end_date: dateSchema,
  reason: z.string().optional(),
});

// Waiver template schemas
export const waiverTemplateCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  content: z.string().min(1, "Content is required"),
  is_active: z.boolean().default(true),
});

export const waiverTemplateUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
});

// Waiver signing schema
export const waiverSignSchema = z.object({
  signature_data: z.string().min(1, "Signature is required"),
  agreed: z.literal(true).describe("You must agree to the waiver terms"),
});

// Payment schemas
export const paymentIntentSchema = z.object({
  booking_id: uuidSchema,
  amount: z.number().positive("Amount must be positive"),
});

// Affiliate schemas
export const affiliateCreateSchema = z.object({
  user_id: uuidSchema.optional(),
  name: z.string().min(1, "Name is required").max(255),
  email: emailSchema,
  phone: phoneSchema,
  company_name: z.string().max(255).optional().nullable(),
  affiliate_code: z.string().min(3).max(20).regex(/^[A-Z0-9]+$/, "Code must be uppercase alphanumeric").optional(),
  commission_type: z.enum(["percentage", "fixed"]).default("percentage"),
  commission_rate: z.number().positive().max(100),
  discount_type: z.enum(["percentage", "fixed"]).default("percentage"),
  discount_value: z.number().nonnegative().max(100),
  is_active: z.boolean().default(true),
});

export const affiliateUpdateSchema = affiliateCreateSchema.partial().omit({ affiliate_code: true });

// Staff schemas
export const staffCreateSchema = z.object({
  user_id: uuidSchema.optional(),
  name: z.string().min(1, "Name is required").max(255),
  email: emailSchema,
  phone: phoneSchema,
  role: z.enum(["admin", "manager", "captain", "guide", "front_desk"]).default("guide"),
  avatar_url: z.string().url().optional().nullable(),
  is_active: z.boolean().default(true),
});

export const staffUpdateSchema = staffCreateSchema.partial();

// Type exports
export type CustomerCreate = z.infer<typeof customerCreateSchema>;
export type CustomerUpdate = z.infer<typeof customerUpdateSchema>;
export type BookingCreate = z.infer<typeof bookingCreateSchema>;
export type BookingUpdate = z.infer<typeof bookingUpdateSchema>;
export type TourCreate = z.infer<typeof tourCreateSchema>;
export type TourUpdate = z.infer<typeof tourUpdateSchema>;
export type AvailabilityCreate = z.infer<typeof availabilityCreateSchema>;
export type AvailabilityBulkCreate = z.infer<typeof availabilityBulkCreateSchema>;
export type WaiverTemplateCreate = z.infer<typeof waiverTemplateCreateSchema>;
export type AffiliateCreate = z.infer<typeof affiliateCreateSchema>;
export type StaffCreate = z.infer<typeof staffCreateSchema>;
