export interface Booking {
  id: string;
  booking_reference: string;
  customer_id: string;
  availability_id: string;
  guest_count: number;
  total_price: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  checked_in: boolean;
  notes: string | null;
  created_at: string;
  customer?: Customer;
  availability?: Availability;
  guests?: BookingGuest[];
}

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";

export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  country_code: string | null;
}

export interface Availability {
  id: string;
  tour_id: string;
  date: string;
  start_time: string;
  end_time: string | null;
  capacity_override: number | null;
  booked_count: number;
  status: "available" | "full" | "cancelled";
  tour?: Tour;
  boat?: Boat;
}

export interface Tour {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  max_capacity: number;
  price_per_person: number;
  location_id: string | null;
  status: "active" | "inactive" | "archived";
}

export interface Boat {
  id: string;
  name: string;
  registration_number: string | null;
  boat_type: string | null;
  capacity: number;
  status: "active" | "maintenance" | "retired";
}

export interface BookingGuest {
  id: string;
  booking_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  is_primary: boolean;
}

export interface Staff {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  role: StaffRole;
  location_id: string | null;
  phone: string | null;
  status: "active" | "inactive";
}

export type StaffRole = "super_admin" | "admin" | "location_admin" | "staff" | "captain";

export interface Location {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  timezone: string;
  is_primary: boolean;
  status: "active" | "inactive";
}
