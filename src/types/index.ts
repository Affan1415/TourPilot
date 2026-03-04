// Database Types
export interface Tour {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  duration_minutes: number;
  base_price: number;
  max_capacity: number;
  min_guests: number;
  images: string[];
  location: string;
  meeting_point: string;
  what_to_bring: string[];
  includes: string[];
  requires_waiver: boolean;
  status: 'active' | 'draft' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface Availability {
  id: string;
  tour_id: string;
  date: string;
  start_time: string;
  end_time: string;
  price_override: number | null;
  capacity_override: number | null;
  booked_count: number;
  status: 'available' | 'full' | 'cancelled';
  created_at: string;
  tour?: Tour;
}

export interface Customer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  country_code: string;
  notes: string | null;
  tags: string[];
  total_bookings: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  booking_reference: string;
  customer_id: string;
  availability_id: string;
  guest_count: number;
  total_price: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  payment_intent_id: string | null;
  checked_in: boolean;
  checked_in_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  availability?: Availability;
  guests?: BookingGuest[];
  waivers?: Waiver[];
}

export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

export interface BookingGuest {
  id: string;
  booking_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  is_primary: boolean;
  checked_in: boolean;
  created_at: string;
}

export interface WaiverTemplate {
  id: string;
  name: string;
  content: string;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Waiver {
  id: string;
  booking_id: string;
  guest_id: string;
  waiver_template_id: string;
  signature_url: string | null;
  signed_at: string | null;
  ip_address: string | null;
  status: WaiverStatus;
  created_at: string;
  guest?: BookingGuest;
  template?: WaiverTemplate;
}

export type WaiverStatus = 'pending' | 'signed' | 'expired';

export interface Staff {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  role: StaffRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
}

export type StaffRole = 'admin' | 'manager' | 'captain' | 'guide' | 'front_desk';

export interface AvailabilityStaff {
  id: string;
  availability_id: string;
  staff_id: string;
  role: string;
  staff?: Staff;
}

export interface Communication {
  id: string;
  booking_id: string | null;
  customer_id: string;
  type: CommunicationType;
  template_type: string;
  subject: string | null;
  content: string;
  status: CommunicationStatus;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

export type CommunicationType = 'email' | 'sms' | 'whatsapp';
export type CommunicationStatus = 'pending' | 'sent' | 'delivered' | 'failed';

// UI Types
export interface ManifestEntry {
  booking: Booking;
  guests: BookingGuest[];
  waiverStatus: 'all_signed' | 'partial' | 'none';
  signedCount: number;
  totalGuests: number;
}

export interface DashboardStats {
  todayBookings: number;
  todayRevenue: number;
  todayGuests: number;
  pendingWaivers: number;
  weeklyBookings: number;
  weeklyRevenue: number;
  monthlyBookings: number;
  monthlyRevenue: number;
}

export interface BookingFormData {
  tour_id: string;
  availability_id: string;
  guest_count: number;
  guests: {
    first_name: string;
    last_name: string;
    email?: string;
    is_primary: boolean;
  }[];
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    country_code: string;
  };
  notes?: string;
}
