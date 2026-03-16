-- =============================================
-- Captain Test Data Migration
-- Creates a test captain user and sample data
-- =============================================

-- First, let's create a test captain in the staff table
-- We'll use a placeholder user_id that will be updated when the captain logs in

-- Create test captain staff record (if email doesn't exist)
INSERT INTO staff (email, name, role, phone, is_active)
VALUES (
  'captain@tourpilot.com',
  'Captain Mike',
  'captain',
  '+1-555-0123',
  true
)
ON CONFLICT (email) DO UPDATE SET
  role = 'captain',
  name = 'Captain Mike',
  is_active = true;

-- Create a second test captain
INSERT INTO staff (email, name, role, phone, is_active)
VALUES (
  'captain2@tourpilot.com',
  'Captain Sarah',
  'captain',
  '+1-555-0124',
  true
)
ON CONFLICT (email) DO UPDATE SET
  role = 'captain',
  name = 'Captain Sarah',
  is_active = true;

-- Ensure we have active tours
UPDATE tours SET status = 'active' WHERE status IS NULL OR status != 'active';

-- Create test availabilities for today and tomorrow if they don't exist
DO $$
DECLARE
  tour_rec RECORD;
  captain_id UUID;
  avail_id UUID;
  today_date DATE := CURRENT_DATE;
  tomorrow_date DATE := CURRENT_DATE + INTERVAL '1 day';
BEGIN
  -- Get the first captain's ID
  SELECT id INTO captain_id FROM staff WHERE email = 'captain@tourpilot.com' LIMIT 1;

  -- Loop through active tours
  FOR tour_rec IN SELECT id, name FROM tours WHERE status = 'active' LIMIT 3 LOOP
    -- Create today's availability (morning)
    INSERT INTO availabilities (tour_id, date, start_time, end_time, capacity_override)
    VALUES (tour_rec.id, today_date, '09:00:00', '11:00:00', 12)
    ON CONFLICT DO NOTHING
    RETURNING id INTO avail_id;

    -- If created, assign captain
    IF avail_id IS NOT NULL AND captain_id IS NOT NULL THEN
      INSERT INTO availability_staff (availability_id, staff_id, role)
      VALUES (avail_id, captain_id, 'captain')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Create today's availability (afternoon)
    INSERT INTO availabilities (tour_id, date, start_time, end_time, capacity_override)
    VALUES (tour_rec.id, today_date, '14:00:00', '16:00:00', 12)
    ON CONFLICT DO NOTHING
    RETURNING id INTO avail_id;

    IF avail_id IS NOT NULL AND captain_id IS NOT NULL THEN
      INSERT INTO availability_staff (availability_id, staff_id, role)
      VALUES (avail_id, captain_id, 'captain')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Create tomorrow's availability
    INSERT INTO availabilities (tour_id, date, start_time, end_time, capacity_override)
    VALUES (tour_rec.id, tomorrow_date, '10:00:00', '12:00:00', 12)
    ON CONFLICT DO NOTHING
    RETURNING id INTO avail_id;

    IF avail_id IS NOT NULL AND captain_id IS NOT NULL THEN
      INSERT INTO availability_staff (availability_id, staff_id, role)
      VALUES (avail_id, captain_id, 'captain')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- Create test customers
INSERT INTO customers (first_name, last_name, email, phone)
VALUES
  ('John', 'Smith', 'john.smith@example.com', '+1-555-1001'),
  ('Emily', 'Johnson', 'emily.j@example.com', '+1-555-1002'),
  ('Michael', 'Williams', 'mike.w@example.com', '+1-555-1003'),
  ('Sarah', 'Brown', 'sarah.brown@example.com', '+1-555-1004'),
  ('David', 'Jones', 'david.jones@example.com', '+1-555-1005')
ON CONFLICT (email) DO NOTHING;

-- Create test bookings with guests for today's tours
DO $$
DECLARE
  avail_rec RECORD;
  customer_rec RECORD;
  booking_id UUID;
  booking_ref TEXT;
  guest_count INT;
BEGIN
  -- Get today's availabilities assigned to our captain
  FOR avail_rec IN
    SELECT a.id, a.tour_id, a.date, a.start_time
    FROM availabilities a
    JOIN availability_staff ast ON a.id = ast.availability_id
    JOIN staff s ON ast.staff_id = s.id
    WHERE s.email = 'captain@tourpilot.com'
      AND a.date = CURRENT_DATE
    LIMIT 2
  LOOP
    -- Create bookings for each customer
    FOR customer_rec IN
      SELECT id, first_name, last_name, email
      FROM customers
      LIMIT 3
    LOOP
      -- Generate booking reference
      booking_ref := 'TP-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
      guest_count := 1 + FLOOR(RANDOM() * 3)::INT; -- 1-3 guests

      -- Insert booking
      INSERT INTO bookings (
        customer_id,
        availability_id,
        booking_reference,
        status,
        guest_count,
        total_price,
        notes
      )
      VALUES (
        customer_rec.id,
        avail_rec.id,
        booking_ref,
        'confirmed',
        guest_count,
        guest_count * 75.00,
        CASE WHEN RANDOM() > 0.7 THEN 'Special request: Front of boat preferred' ELSE NULL END
      )
      ON CONFLICT DO NOTHING
      RETURNING id INTO booking_id;

      -- Create booking guests
      IF booking_id IS NOT NULL THEN
        -- Add primary guest (customer)
        INSERT INTO booking_guests (
          booking_id,
          first_name,
          last_name,
          email,
          is_primary,
          checked_in
        )
        VALUES (
          booking_id,
          customer_rec.first_name,
          customer_rec.last_name,
          customer_rec.email,
          true,
          false
        );

        -- Add additional guests
        FOR i IN 2..guest_count LOOP
          INSERT INTO booking_guests (
            booking_id,
            first_name,
            last_name,
            email,
            is_primary,
            checked_in
          )
          VALUES (
            booking_id,
            CASE i
              WHEN 2 THEN 'Guest'
              WHEN 3 THEN 'Guest'
              ELSE 'Guest'
            END,
            customer_rec.last_name || ' ' || i::TEXT,
            NULL,
            false,
            false
          );
        END LOOP;

        -- Update availability booked count
        UPDATE availabilities
        SET booked_count = COALESCE(booked_count, 0) + guest_count
        WHERE id = avail_rec.id;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Output confirmation
DO $$
DECLARE
  captain_count INT;
  avail_count INT;
  booking_count INT;
  guest_count INT;
BEGIN
  SELECT COUNT(*) INTO captain_count FROM staff WHERE role = 'captain';
  SELECT COUNT(*) INTO avail_count FROM availabilities WHERE date = CURRENT_DATE;
  SELECT COUNT(*) INTO booking_count FROM bookings WHERE status = 'confirmed';
  SELECT COUNT(*) INTO guest_count FROM booking_guests;

  RAISE NOTICE 'Test data created: % captains, % availabilities today, % bookings, % guests',
    captain_count, avail_count, booking_count, guest_count;
END $$;
