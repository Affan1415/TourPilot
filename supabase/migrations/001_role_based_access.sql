-- =============================================
-- TourPilot Role-Based Access Control Migration
-- =============================================
-- This migration adds support for three actors:
-- 1. Admin - Full access to manage tours, bookings, staff, etc.
-- 2. Captain - View assigned tours and manage check-ins
-- 3. Customer - Book tours, view their bookings, sign waivers
-- =============================================

-- Add user_id to customers table for customer login
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) UNIQUE;

-- Add index for faster user_id lookups
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);

-- Create a user_roles view for easy role checking
CREATE OR REPLACE VIEW user_roles AS
SELECT
  u.id as user_id,
  u.email,
  CASE
    WHEN s.id IS NOT NULL THEN s.role
    WHEN c.id IS NOT NULL THEN 'customer'
    ELSE NULL
  END as role,
  CASE
    WHEN s.id IS NOT NULL THEN s.id
    WHEN c.id IS NOT NULL THEN c.id
    ELSE NULL
  END as profile_id,
  CASE
    WHEN s.id IS NOT NULL THEN s.name
    WHEN c.id IS NOT NULL THEN c.first_name || ' ' || c.last_name
    ELSE NULL
  END as display_name,
  CASE
    WHEN s.id IS NOT NULL THEN s.is_active
    WHEN c.id IS NOT NULL THEN true
    ELSE false
  END as is_active
FROM auth.users u
LEFT JOIN staff s ON s.user_id = u.id
LEFT JOIN customers c ON c.user_id = u.id;

-- Function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM user_roles WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin or manager
CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM staff
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'manager')
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is staff (any role)
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM staff
    WHERE user_id = auth.uid()
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is captain
CREATE OR REPLACE FUNCTION is_captain()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM staff
    WHERE user_id = auth.uid()
    AND role = 'captain'
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get staff ID for current user
CREATE OR REPLACE FUNCTION get_staff_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM staff WHERE user_id = auth.uid() AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get customer ID for current user
CREATE OR REPLACE FUNCTION get_customer_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM customers WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Update RLS Policies for Role-Based Access
-- =============================================

-- Drop existing policies first (if they exist)
DROP POLICY IF EXISTS "Tours are viewable by everyone" ON tours;
DROP POLICY IF EXISTS "Public can view active tours" ON tours;
DROP POLICY IF EXISTS "Admin can manage tours" ON tours;
DROP POLICY IF EXISTS "Staff can view all tours" ON tours;
DROP POLICY IF EXISTS "Staff full access to tours" ON tours;
DROP POLICY IF EXISTS "Staff full access to availabilities" ON availabilities;
DROP POLICY IF EXISTS "Public can view availabilities" ON availabilities;
DROP POLICY IF EXISTS "Admin can manage availabilities" ON availabilities;
DROP POLICY IF EXISTS "Captain can view assigned availabilities" ON availabilities;
DROP POLICY IF EXISTS "Staff full access to customers" ON customers;
DROP POLICY IF EXISTS "Admin can manage customers" ON customers;
DROP POLICY IF EXISTS "Staff can view customers" ON customers;
DROP POLICY IF EXISTS "Customers can view own profile" ON customers;
DROP POLICY IF EXISTS "Customers can update own profile" ON customers;
DROP POLICY IF EXISTS "Public can create customers" ON customers;
DROP POLICY IF EXISTS "Staff full access to bookings" ON bookings;
DROP POLICY IF EXISTS "Admin can manage bookings" ON bookings;
DROP POLICY IF EXISTS "Staff can view bookings" ON bookings;
DROP POLICY IF EXISTS "Captain can check in guests" ON bookings;
DROP POLICY IF EXISTS "Customers can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Public can create bookings" ON bookings;
DROP POLICY IF EXISTS "Staff full access to booking_guests" ON booking_guests;
DROP POLICY IF EXISTS "Admin can manage booking guests" ON booking_guests;
DROP POLICY IF EXISTS "Staff can view booking guests" ON booking_guests;
DROP POLICY IF EXISTS "Captain can check in booking guests" ON booking_guests;
DROP POLICY IF EXISTS "Customers can view own booking guests" ON booking_guests;
DROP POLICY IF EXISTS "Public can create booking guests" ON booking_guests;
DROP POLICY IF EXISTS "Staff full access to waivers" ON waivers;
DROP POLICY IF EXISTS "Admin can manage waivers" ON waivers;
DROP POLICY IF EXISTS "Staff can view waivers" ON waivers;
DROP POLICY IF EXISTS "Public can view waivers" ON waivers;
DROP POLICY IF EXISTS "Public can sign waivers" ON waivers;
DROP POLICY IF EXISTS "Staff full access to waiver_templates" ON waiver_templates;
DROP POLICY IF EXISTS "Public can view active waiver templates" ON waiver_templates;
DROP POLICY IF EXISTS "Admin can manage waiver templates" ON waiver_templates;
DROP POLICY IF EXISTS "Staff full access to staff" ON staff;
DROP POLICY IF EXISTS "Admin can manage staff" ON staff;
DROP POLICY IF EXISTS "Staff can view own profile" ON staff;
DROP POLICY IF EXISTS "Staff can view all staff" ON staff;
DROP POLICY IF EXISTS "Staff full access to availability_staff" ON availability_staff;
DROP POLICY IF EXISTS "Admin can manage availability staff" ON availability_staff;
DROP POLICY IF EXISTS "Staff can view availability staff" ON availability_staff;
DROP POLICY IF EXISTS "Staff full access to communications" ON communications;
DROP POLICY IF EXISTS "Admin can manage communications" ON communications;
DROP POLICY IF EXISTS "Staff can view communications" ON communications;
DROP POLICY IF EXISTS "Customers can view own communications" ON communications;
DROP POLICY IF EXISTS "Anyone can create bookings" ON bookings;
DROP POLICY IF EXISTS "Anyone can create customers" ON customers;
DROP POLICY IF EXISTS "Anyone can create booking_guests" ON booking_guests;
DROP POLICY IF EXISTS "Anyone can view their waiver" ON waivers;
DROP POLICY IF EXISTS "Anyone can sign waivers" ON waivers;
DROP POLICY IF EXISTS "Availabilities are viewable by everyone" ON availabilities;
DROP POLICY IF EXISTS "Active waiver templates are viewable" ON waiver_templates;

-- =============================================
-- TOURS POLICIES
-- =============================================

-- Public can view active tours
CREATE POLICY "Public can view active tours"
ON tours FOR SELECT
USING (status = 'active');

-- Admin/Manager can do everything with tours
CREATE POLICY "Admin can manage tours"
ON tours FOR ALL
USING (is_admin_or_manager());

-- Staff can view all tours (for assignments)
CREATE POLICY "Staff can view all tours"
ON tours FOR SELECT
USING (is_staff());

-- =============================================
-- AVAILABILITIES POLICIES
-- =============================================

-- Public can view available slots
CREATE POLICY "Public can view availabilities"
ON availabilities FOR SELECT
USING (true);

-- Admin/Manager can manage availabilities
CREATE POLICY "Admin can manage availabilities"
ON availabilities FOR ALL
USING (is_admin_or_manager());

-- Captain can view availabilities they are assigned to
CREATE POLICY "Captain can view assigned availabilities"
ON availabilities FOR SELECT
USING (
  is_captain() AND EXISTS (
    SELECT 1 FROM availability_staff
    WHERE availability_id = availabilities.id
    AND staff_id = get_staff_id()
  )
);

-- =============================================
-- CUSTOMERS POLICIES
-- =============================================

-- Admin/Manager can view all customers
CREATE POLICY "Admin can manage customers"
ON customers FOR ALL
USING (is_admin_or_manager());

-- Staff can view customers (for bookings)
CREATE POLICY "Staff can view customers"
ON customers FOR SELECT
USING (is_staff());

-- Customers can view and update their own profile
CREATE POLICY "Customers can view own profile"
ON customers FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Customers can update own profile"
ON customers FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Public can create customers (for checkout)
CREATE POLICY "Public can create customers"
ON customers FOR INSERT
WITH CHECK (true);

-- =============================================
-- BOOKINGS POLICIES
-- =============================================

-- Admin/Manager can manage all bookings
CREATE POLICY "Admin can manage bookings"
ON bookings FOR ALL
USING (is_admin_or_manager());

-- Staff can view all bookings
CREATE POLICY "Staff can view bookings"
ON bookings FOR SELECT
USING (is_staff());

-- Captain can update booking check-in status for assigned tours
CREATE POLICY "Captain can check in guests"
ON bookings FOR UPDATE
USING (
  is_captain() AND EXISTS (
    SELECT 1 FROM availability_staff asg
    WHERE asg.availability_id = bookings.availability_id
    AND asg.staff_id = get_staff_id()
  )
);

-- Customers can view their own bookings
CREATE POLICY "Customers can view own bookings"
ON bookings FOR SELECT
USING (customer_id = get_customer_id());

-- Public can create bookings (checkout)
CREATE POLICY "Public can create bookings"
ON bookings FOR INSERT
WITH CHECK (true);

-- =============================================
-- BOOKING GUESTS POLICIES
-- =============================================

-- Admin/Manager can manage booking guests
CREATE POLICY "Admin can manage booking guests"
ON booking_guests FOR ALL
USING (is_admin_or_manager());

-- Staff can view booking guests
CREATE POLICY "Staff can view booking guests"
ON booking_guests FOR SELECT
USING (is_staff());

-- Captain can update guest check-in status
CREATE POLICY "Captain can check in booking guests"
ON booking_guests FOR UPDATE
USING (
  is_captain() AND EXISTS (
    SELECT 1 FROM bookings b
    JOIN availability_staff asg ON asg.availability_id = b.availability_id
    WHERE b.id = booking_guests.booking_id
    AND asg.staff_id = get_staff_id()
  )
);

-- Customers can view their booking guests
CREATE POLICY "Customers can view own booking guests"
ON booking_guests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bookings
    WHERE id = booking_guests.booking_id
    AND customer_id = get_customer_id()
  )
);

-- Public can create booking guests (checkout)
CREATE POLICY "Public can create booking guests"
ON booking_guests FOR INSERT
WITH CHECK (true);

-- =============================================
-- WAIVERS POLICIES
-- =============================================

-- Admin/Manager can manage waivers
CREATE POLICY "Admin can manage waivers"
ON waivers FOR ALL
USING (is_admin_or_manager());

-- Staff can view waivers
CREATE POLICY "Staff can view waivers"
ON waivers FOR SELECT
USING (is_staff());

-- Public can view and sign their waivers (via token)
CREATE POLICY "Public can view waivers"
ON waivers FOR SELECT
USING (true);

CREATE POLICY "Public can sign waivers"
ON waivers FOR UPDATE
USING (true)
WITH CHECK (true);

-- =============================================
-- WAIVER TEMPLATES POLICIES
-- =============================================

-- Public can view active templates
CREATE POLICY "Public can view active waiver templates"
ON waiver_templates FOR SELECT
USING (is_active = true);

-- Admin/Manager can manage templates
CREATE POLICY "Admin can manage waiver templates"
ON waiver_templates FOR ALL
USING (is_admin_or_manager());

-- =============================================
-- STAFF POLICIES
-- =============================================

-- Admin/Manager can manage staff
CREATE POLICY "Admin can manage staff"
ON staff FOR ALL
USING (is_admin_or_manager());

-- Staff can view their own profile
CREATE POLICY "Staff can view own profile"
ON staff FOR SELECT
USING (user_id = auth.uid());

-- Staff can view other staff (for assignments display)
CREATE POLICY "Staff can view all staff"
ON staff FOR SELECT
USING (is_staff());

-- =============================================
-- AVAILABILITY STAFF POLICIES
-- =============================================

-- Admin/Manager can manage assignments
CREATE POLICY "Admin can manage availability staff"
ON availability_staff FOR ALL
USING (is_admin_or_manager());

-- Staff can view assignments
CREATE POLICY "Staff can view availability staff"
ON availability_staff FOR SELECT
USING (is_staff());

-- =============================================
-- COMMUNICATIONS POLICIES
-- =============================================

-- Admin/Manager can manage communications
CREATE POLICY "Admin can manage communications"
ON communications FOR ALL
USING (is_admin_or_manager());

-- Staff can view communications
CREATE POLICY "Staff can view communications"
ON communications FOR SELECT
USING (is_staff());

-- Customers can view their own communications
CREATE POLICY "Customers can view own communications"
ON communications FOR SELECT
USING (customer_id = get_customer_id());

-- =============================================
-- CAPTAIN ASSIGNMENTS VIEW
-- =============================================

-- Create a view for captains to see their assigned tours
CREATE OR REPLACE VIEW captain_assigned_tours AS
SELECT
  a.id as availability_id,
  a.date,
  a.start_time,
  a.end_time,
  a.booked_count,
  COALESCE(a.capacity_override, t.max_capacity) as capacity,
  a.status as availability_status,
  t.id as tour_id,
  t.name as tour_name,
  t.slug as tour_slug,
  t.location,
  t.meeting_point,
  t.duration_minutes,
  asg.staff_id,
  asg.role as assignment_role,
  s.name as staff_name
FROM availability_staff asg
JOIN availabilities a ON a.id = asg.availability_id
JOIN tours t ON t.id = a.tour_id
JOIN staff s ON s.id = asg.staff_id
WHERE a.status != 'cancelled';

-- =============================================
-- CUSTOMER PORTAL VIEW
-- =============================================

-- Create a view for customers to see their booking history
CREATE OR REPLACE VIEW customer_booking_history AS
SELECT
  b.id as booking_id,
  b.booking_reference,
  b.guest_count,
  b.total_price,
  b.status as booking_status,
  b.payment_status,
  b.checked_in,
  b.created_at as booked_at,
  a.date as tour_date,
  a.start_time,
  a.end_time,
  t.name as tour_name,
  t.slug as tour_slug,
  t.location,
  t.meeting_point,
  t.images,
  c.id as customer_id,
  c.user_id,
  (
    SELECT COUNT(*) FROM waivers w
    JOIN booking_guests bg ON bg.id = w.guest_id
    WHERE bg.booking_id = b.id AND w.status = 'signed'
  ) as signed_waivers,
  b.guest_count as total_waivers_needed
FROM bookings b
JOIN availabilities a ON a.id = b.availability_id
JOIN tours t ON t.id = a.tour_id
JOIN customers c ON c.id = b.customer_id;

-- =============================================
-- DASHBOARD STATS FUNCTIONS
-- =============================================

-- Function to get dashboard stats for admin
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats(target_date DATE DEFAULT CURRENT_DATE)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'today_bookings', (
      SELECT COUNT(*) FROM bookings b
      JOIN availabilities a ON a.id = b.availability_id
      WHERE a.date = target_date AND b.status != 'cancelled'
    ),
    'today_guests', (
      SELECT COALESCE(SUM(b.guest_count), 0) FROM bookings b
      JOIN availabilities a ON a.id = b.availability_id
      WHERE a.date = target_date AND b.status != 'cancelled'
    ),
    'today_revenue', (
      SELECT COALESCE(SUM(b.total_price), 0) FROM bookings b
      JOIN availabilities a ON a.id = b.availability_id
      WHERE a.date = target_date AND b.payment_status = 'paid'
    ),
    'pending_waivers', (
      SELECT COUNT(*) FROM waivers w
      JOIN booking_guests bg ON bg.id = w.guest_id
      JOIN bookings b ON b.id = bg.booking_id
      JOIN availabilities a ON a.id = b.availability_id
      WHERE a.date = target_date AND w.status = 'pending' AND b.status != 'cancelled'
    ),
    'upcoming_tours', (
      SELECT COUNT(DISTINCT a.id) FROM availabilities a
      WHERE a.date >= target_date AND a.date <= target_date + INTERVAL '7 days'
      AND a.status = 'available' AND a.booked_count > 0
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get captain's assigned tours for a date range
CREATE OR REPLACE FUNCTION get_captain_tours(
  captain_staff_id UUID,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE DEFAULT CURRENT_DATE + INTERVAL '30 days'
)
RETURNS TABLE (
  availability_id UUID,
  tour_date DATE,
  start_time TIME,
  end_time TIME,
  tour_name TEXT,
  tour_slug TEXT,
  location TEXT,
  meeting_point TEXT,
  booked_count INT,
  capacity INT,
  checked_in_count BIGINT,
  total_guests BIGINT,
  waiver_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.date,
    a.start_time,
    a.end_time,
    t.name::TEXT,
    t.slug::TEXT,
    t.location::TEXT,
    t.meeting_point::TEXT,
    a.booked_count,
    COALESCE(a.capacity_override, t.max_capacity),
    (
      SELECT COUNT(*) FROM booking_guests bg
      JOIN bookings b ON b.id = bg.booking_id
      WHERE b.availability_id = a.id AND bg.checked_in = true
    ),
    (
      SELECT COUNT(*) FROM booking_guests bg
      JOIN bookings b ON b.id = bg.booking_id
      WHERE b.availability_id = a.id AND b.status != 'cancelled'
    ),
    CASE
      WHEN (
        SELECT COUNT(*) FROM waivers w
        JOIN booking_guests bg ON bg.id = w.guest_id
        JOIN bookings b ON b.id = bg.booking_id
        WHERE b.availability_id = a.id AND b.status != 'cancelled'
      ) = 0 THEN 'none'
      WHEN (
        SELECT COUNT(*) FROM waivers w
        JOIN booking_guests bg ON bg.id = w.guest_id
        JOIN bookings b ON b.id = bg.booking_id
        WHERE b.availability_id = a.id AND w.status = 'signed' AND b.status != 'cancelled'
      ) = (
        SELECT COUNT(*) FROM waivers w
        JOIN booking_guests bg ON bg.id = w.guest_id
        JOIN bookings b ON b.id = bg.booking_id
        WHERE b.availability_id = a.id AND b.status != 'cancelled'
      ) THEN 'complete'
      ELSE 'partial'
    END::TEXT
  FROM availability_staff asg
  JOIN availabilities a ON a.id = asg.availability_id
  JOIN tours t ON t.id = a.tour_id
  WHERE asg.staff_id = captain_staff_id
  AND a.date >= start_date
  AND a.date <= end_date
  AND a.status != 'cancelled'
  ORDER BY a.date, a.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_or_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION is_captain() TO authenticated;
GRANT EXECUTE ON FUNCTION get_staff_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_captain_tours(UUID, DATE, DATE) TO authenticated;

-- Grant view permissions
GRANT SELECT ON user_roles TO authenticated;
GRANT SELECT ON captain_assigned_tours TO authenticated;
GRANT SELECT ON customer_booking_history TO authenticated;
