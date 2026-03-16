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
  boat_id: string | null; // Legacy single boat (deprecated)
  boat?: Boat;
  tour_boats?: TourBoat[]; // Multiple boats via junction table
  default_slots?: TourDefaultSlot[]; // Default time slots
  created_at: string;
  updated_at: string;
}

export interface Availability {
  id: string;
  tour_id: string;
  boat_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  price_override: number | null;
  capacity_override: number | null;
  booked_count: number;
  status: 'available' | 'full' | 'cancelled';
  created_at: string;
  tour?: Tour;
  boat?: Boat;
}

export interface Customer {
  id: string;
  user_id: string | null;
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
  location_id: string | null;
  tour_ids: string[] | null; // Empty array or null = all tours
  language: string;
  usage_count: number;
  signed_count: number;
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

// Boat/Fleet Types
export interface Boat {
  id: string;
  name: string;
  registration_number: string | null;
  boat_type: string | null;
  capacity: number;
  description: string | null;
  images: string[];
  features: string[];
  status: BoatStatus;
  maintenance_notes: string | null;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  assigned_captain_id: string | null;
  assigned_captain?: Staff;
  created_at: string;
  updated_at: string;
}

export type BoatStatus = 'active' | 'maintenance' | 'retired';

// Tour-Boat Assignment Types
export interface TourBoat {
  id: string;
  tour_id: string;
  boat_id: string;
  is_primary: boolean;
  price_modifier: number;
  created_at: string;
  boat?: Boat;
  tour?: Tour;
}

// Tour Default Slots (daily recurring)
export interface TourDefaultSlot {
  id: string;
  tour_id: string;
  start_time: string;
  end_time: string;
  price_override: number | null;
  capacity_override: number | null;
  days_of_week: number[]; // 0-6, Sunday-Saturday
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Tour Blackouts (entire tour unavailable)
export interface TourBlackout {
  id: string;
  tour_id: string;
  date: string;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}

// Boat Blackouts (specific boat unavailable)
export interface BoatBlackout {
  id: string;
  boat_id: string;
  date: string;
  reason: string | null;
  created_by: string | null;
  created_at: string;
  boat?: Boat;
}

// Slot Exceptions (override specific slot on specific date)
export interface SlotException {
  id: string;
  tour_id: string;
  default_slot_id: string | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  price_override: number | null;
  capacity_override: number | null;
  boat_id: string | null;
  is_cancelled: boolean;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}

// Slot Boat Assignment (for assigning boats to specific date+slot)
export interface SlotBoatAssignment {
  id: string;
  default_slot_id: string;
  date: string;
  boat_id: string;
  created_by: string | null;
  created_at: string;
  boat?: Boat;
  default_slot?: TourDefaultSlot;
}

// Location Types
export interface Location {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  phone: string | null;
  email: string | null;
  description: string | null;
  images: string[];
  operating_hours: Record<string, { open: string; close: string }>;
  parking_info: string | null;
  amenities: string[];
  is_active: boolean;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

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

// Safety Checklist Types
export interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
  requiresPhoto: boolean;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  description: string | null;
  items: ChecklistItem[];
  tour_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  tour?: Tour;
}

export interface CompletedChecklistItem {
  itemId: string;
  checked: boolean;
  photoUrl?: string;
  note?: string;
}

export interface ChecklistCompletion {
  id: string;
  checklist_template_id: string;
  availability_id: string;
  captain_id: string;
  completed_items: CompletedChecklistItem[];
  photos: string[];
  signature_url: string | null;
  notes: string | null;
  completed_at: string;
  created_at: string;
  template?: ChecklistTemplate;
  availability?: Availability;
  captain?: Staff;
}

export type IncidentType = 'safety' | 'medical' | 'equipment' | 'weather' | 'customer' | 'other';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'closed';

export interface IncidentReport {
  id: string;
  availability_id: string | null;
  captain_id: string;
  incident_type: IncidentType;
  severity: IncidentSeverity;
  title: string;
  description: string;
  location_lat: number | null;
  location_lng: number | null;
  location_description: string | null;
  media_urls: string[];
  witnesses: string | null;
  actions_taken: string | null;
  follow_up_required: boolean;
  status: IncidentStatus;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  availability?: Availability;
  captain?: Staff;
}

export interface TourLog {
  id: string;
  availability_id: string;
  captain_id: string;
  actual_departure: string | null;
  actual_return: string | null;
  fuel_used: number | null;
  fuel_unit: string;
  weather_conditions: string | null;
  sea_conditions: string | null;
  guest_count: number | null;
  notes: string | null;
  highlights: string | null;
  issues: string | null;
  photos: string[];
  created_at: string;
  availability?: Availability;
  captain?: Staff;
}
