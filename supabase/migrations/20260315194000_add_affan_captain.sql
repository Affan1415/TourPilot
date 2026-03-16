-- =============================================
-- Add affanzahir27@gmail.com as Captain with Test Data
-- =============================================

-- First, get the user ID for affanzahir27@gmail.com
DO $$
DECLARE
  v_user_id UUID;
  v_staff_id UUID;
  v_tour_id UUID;
  v_avail_id UUID;
  v_customer_id UUID;
  v_booking_id UUID;
  today_date DATE := CURRENT_DATE;
BEGIN
  -- Get user ID from auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'affanzahir27@gmail.com' LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User affanzahir27@gmail.com not found in auth.users';
    RETURN;
  END IF;

  RAISE NOTICE 'Found user ID: %', v_user_id;

  -- Create or update staff record for this user as captain
  INSERT INTO staff (user_id, email, name, role, phone, is_active)
  VALUES (
    v_user_id,
    'affanzahir27@gmail.com',
    'Captain Affan',
    'captain',
    '+1-555-0199',
    true
  )
  ON CONFLICT (email) DO UPDATE SET
    user_id = v_user_id,
    role = 'captain',
    name = 'Captain Affan',
    is_active = true
  RETURNING id INTO v_staff_id;

  RAISE NOTICE 'Staff ID: %', v_staff_id;

  -- Get or create a tour
  SELECT id INTO v_tour_id FROM tours WHERE status = 'active' LIMIT 1;

  IF v_tour_id IS NULL THEN
    INSERT INTO tours (name, description, location, meeting_point, duration_minutes, max_capacity, price, status)
    VALUES (
      'Sunset Sailing Adventure',
      'Experience a beautiful sunset on the water with our expert captain.',
      'Harbor Marina',
      'Dock 7, Main Harbor',
      120,
      12,
      75.00,
      'active'
    )
    RETURNING id INTO v_tour_id;
    RAISE NOTICE 'Created new tour: %', v_tour_id;
  END IF;

  -- Create morning availability for today
  INSERT INTO availabilities (tour_id, date, start_time, end_time, capacity_override, booked_count)
  VALUES (v_tour_id, today_date, '09:00:00', '11:00:00', 12, 0)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_avail_id;

  IF v_avail_id IS NOT NULL THEN
    -- Assign captain to this availability
    INSERT INTO availability_staff (availability_id, staff_id, role)
    VALUES (v_avail_id, v_staff_id, 'captain')
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created morning availability: %', v_avail_id;

    -- Create test customers and bookings
    -- Customer 1: John Smith with 2 guests
    INSERT INTO customers (first_name, last_name, email, phone)
    VALUES ('John', 'Smith', 'john.smith.test@example.com', '+1-555-1001')
    ON CONFLICT (email) DO UPDATE SET first_name = 'John', last_name = 'Smith'
    RETURNING id INTO v_customer_id;

    INSERT INTO bookings (customer_id, availability_id, booking_reference, status, guest_count, total_price, notes)
    VALUES (v_customer_id, v_avail_id, 'TP-JS0001', 'confirmed', 2, 150.00, 'Anniversary celebration')
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_booking_id;

    IF v_booking_id IS NOT NULL THEN
      INSERT INTO booking_guests (booking_id, first_name, last_name, email, is_primary, checked_in)
      VALUES
        (v_booking_id, 'John', 'Smith', 'john.smith.test@example.com', true, false),
        (v_booking_id, 'Jane', 'Smith', 'jane.smith.test@example.com', false, false);

      UPDATE availabilities SET booked_count = booked_count + 2 WHERE id = v_avail_id;
    END IF;

    -- Customer 2: Emily Johnson with 3 guests
    INSERT INTO customers (first_name, last_name, email, phone)
    VALUES ('Emily', 'Johnson', 'emily.johnson.test@example.com', '+1-555-1002')
    ON CONFLICT (email) DO UPDATE SET first_name = 'Emily', last_name = 'Johnson'
    RETURNING id INTO v_customer_id;

    INSERT INTO bookings (customer_id, availability_id, booking_reference, status, guest_count, total_price, notes)
    VALUES (v_customer_id, v_avail_id, 'TP-EJ0002', 'confirmed', 3, 225.00, NULL)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_booking_id;

    IF v_booking_id IS NOT NULL THEN
      INSERT INTO booking_guests (booking_id, first_name, last_name, email, is_primary, checked_in)
      VALUES
        (v_booking_id, 'Emily', 'Johnson', 'emily.johnson.test@example.com', true, false),
        (v_booking_id, 'Mike', 'Johnson', NULL, false, false),
        (v_booking_id, 'Sarah', 'Johnson', NULL, false, false);

      UPDATE availabilities SET booked_count = booked_count + 3 WHERE id = v_avail_id;
    END IF;

    -- Customer 3: David Brown solo
    INSERT INTO customers (first_name, last_name, email, phone)
    VALUES ('David', 'Brown', 'david.brown.test@example.com', '+1-555-1003')
    ON CONFLICT (email) DO UPDATE SET first_name = 'David', last_name = 'Brown'
    RETURNING id INTO v_customer_id;

    INSERT INTO bookings (customer_id, availability_id, booking_reference, status, guest_count, total_price, notes)
    VALUES (v_customer_id, v_avail_id, 'TP-DB0003', 'confirmed', 1, 75.00, 'First time sailing')
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_booking_id;

    IF v_booking_id IS NOT NULL THEN
      INSERT INTO booking_guests (booking_id, first_name, last_name, email, is_primary, checked_in)
      VALUES (v_booking_id, 'David', 'Brown', 'david.brown.test@example.com', true, false);

      UPDATE availabilities SET booked_count = booked_count + 1 WHERE id = v_avail_id;
    END IF;
  END IF;

  -- Create afternoon availability for today
  INSERT INTO availabilities (tour_id, date, start_time, end_time, capacity_override, booked_count)
  VALUES (v_tour_id, today_date, '14:00:00', '16:00:00', 12, 0)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_avail_id;

  IF v_avail_id IS NOT NULL THEN
    -- Assign captain to this availability
    INSERT INTO availability_staff (availability_id, staff_id, role)
    VALUES (v_avail_id, v_staff_id, 'captain')
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created afternoon availability: %', v_avail_id;

    -- Customer 4: Lisa Chen with 4 guests
    INSERT INTO customers (first_name, last_name, email, phone)
    VALUES ('Lisa', 'Chen', 'lisa.chen.test@example.com', '+1-555-1004')
    ON CONFLICT (email) DO UPDATE SET first_name = 'Lisa', last_name = 'Chen'
    RETURNING id INTO v_customer_id;

    INSERT INTO bookings (customer_id, availability_id, booking_reference, status, guest_count, total_price, notes)
    VALUES (v_customer_id, v_avail_id, 'TP-LC0004', 'confirmed', 4, 300.00, 'Birthday party - please prepare cake')
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_booking_id;

    IF v_booking_id IS NOT NULL THEN
      INSERT INTO booking_guests (booking_id, first_name, last_name, email, is_primary, checked_in)
      VALUES
        (v_booking_id, 'Lisa', 'Chen', 'lisa.chen.test@example.com', true, false),
        (v_booking_id, 'Tom', 'Chen', NULL, false, false),
        (v_booking_id, 'Amy', 'Chen', NULL, false, false),
        (v_booking_id, 'Kevin', 'Chen', NULL, false, false);

      UPDATE availabilities SET booked_count = booked_count + 4 WHERE id = v_avail_id;
    END IF;

    -- Customer 5: Robert Wilson with 2 guests
    INSERT INTO customers (first_name, last_name, email, phone)
    VALUES ('Robert', 'Wilson', 'robert.wilson.test@example.com', '+1-555-1005')
    ON CONFLICT (email) DO UPDATE SET first_name = 'Robert', last_name = 'Wilson'
    RETURNING id INTO v_customer_id;

    INSERT INTO bookings (customer_id, availability_id, booking_reference, status, guest_count, total_price, notes)
    VALUES (v_customer_id, v_avail_id, 'TP-RW0005', 'confirmed', 2, 150.00, NULL)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_booking_id;

    IF v_booking_id IS NOT NULL THEN
      INSERT INTO booking_guests (booking_id, first_name, last_name, email, is_primary, checked_in)
      VALUES
        (v_booking_id, 'Robert', 'Wilson', 'robert.wilson.test@example.com', true, false),
        (v_booking_id, 'Maria', 'Wilson', 'maria.wilson.test@example.com', false, false);

      UPDATE availabilities SET booked_count = booked_count + 2 WHERE id = v_avail_id;
    END IF;
  END IF;

  RAISE NOTICE 'Successfully created captain data for affanzahir27@gmail.com';
END $$;
