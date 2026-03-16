-- =============================================
-- Fix Captain Data - Direct Insert
-- =============================================

DO $$
DECLARE
  v_user_id UUID;
  v_staff_id UUID;
  v_tour_id UUID;
  v_avail_id_1 UUID;
  v_avail_id_2 UUID;
  v_customer_id UUID;
  v_booking_id UUID;
  today_date DATE := CURRENT_DATE;
BEGIN
  -- Get user ID for affanzahir27@gmail.com
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'affanzahir27@gmail.com' LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User affanzahir27@gmail.com not found';
  END IF;

  -- Get or create staff record
  SELECT id INTO v_staff_id FROM staff WHERE user_id = v_user_id LIMIT 1;

  IF v_staff_id IS NULL THEN
    INSERT INTO staff (user_id, email, name, role, is_active)
    VALUES (v_user_id, 'affanzahir27@gmail.com', 'Captain Affan', 'captain', true)
    RETURNING id INTO v_staff_id;
  END IF;

  RAISE NOTICE 'Staff ID: %', v_staff_id;

  -- Get first active tour
  SELECT id INTO v_tour_id FROM tours WHERE status = 'active' LIMIT 1;

  IF v_tour_id IS NULL THEN
    -- Create a tour if none exists
    INSERT INTO tours (name, description, location, meeting_point, duration_minutes, max_capacity, price, status)
    VALUES ('Sunset Harbor Cruise', 'Beautiful sunset cruise around the harbor', 'Marina Bay', 'Dock 5', 120, 12, 85.00, 'active')
    RETURNING id INTO v_tour_id;
    RAISE NOTICE 'Created tour: %', v_tour_id;
  END IF;

  RAISE NOTICE 'Tour ID: %', v_tour_id;

  -- Delete any existing staff assignments for this captain
  DELETE FROM availability_staff WHERE staff_id = v_staff_id;

  -- Get or create morning availability
  SELECT id INTO v_avail_id_1 FROM availabilities
  WHERE tour_id = v_tour_id AND date = today_date AND start_time = '09:00:00' LIMIT 1;

  IF v_avail_id_1 IS NULL THEN
    INSERT INTO availabilities (tour_id, date, start_time, end_time, capacity_override, booked_count)
    VALUES (v_tour_id, today_date, '09:00:00', '11:00:00', 12, 0)
    RETURNING id INTO v_avail_id_1;
  END IF;

  RAISE NOTICE 'Morning availability ID: %', v_avail_id_1;

  -- Assign captain to morning tour
  INSERT INTO availability_staff (availability_id, staff_id, role)
  VALUES (v_avail_id_1, v_staff_id, 'captain')
  ON CONFLICT DO NOTHING;

  -- Get or create afternoon availability
  SELECT id INTO v_avail_id_2 FROM availabilities
  WHERE tour_id = v_tour_id AND date = today_date AND start_time = '14:00:00' LIMIT 1;

  IF v_avail_id_2 IS NULL THEN
    INSERT INTO availabilities (tour_id, date, start_time, end_time, capacity_override, booked_count)
    VALUES (v_tour_id, today_date, '14:00:00', '16:00:00', 12, 0)
    RETURNING id INTO v_avail_id_2;
  END IF;

  RAISE NOTICE 'Afternoon availability ID: %', v_avail_id_2;

  -- Assign captain to afternoon tour
  INSERT INTO availability_staff (availability_id, staff_id, role)
  VALUES (v_avail_id_2, v_staff_id, 'captain')
  ON CONFLICT DO NOTHING;

  -- Create customers and bookings for morning tour
  -- Customer 1: Smith family
  INSERT INTO customers (first_name, last_name, email, phone)
  VALUES ('John', 'Smith', 'john.smith.captain@test.com', '+1-555-0001')
  ON CONFLICT (email) DO UPDATE SET first_name = 'John'
  RETURNING id INTO v_customer_id;

  INSERT INTO bookings (customer_id, availability_id, booking_reference, status, guest_count, total_price, notes)
  VALUES (v_customer_id, v_avail_id_1, 'TP-SMITH1', 'confirmed', 2, 170.00, 'Anniversary celebration')
  RETURNING id INTO v_booking_id;

  INSERT INTO booking_guests (booking_id, first_name, last_name, email, is_primary, checked_in) VALUES
    (v_booking_id, 'John', 'Smith', 'john.smith.captain@test.com', true, false),
    (v_booking_id, 'Jane', 'Smith', 'jane.smith@test.com', false, false);

  UPDATE availabilities SET booked_count = booked_count + 2 WHERE id = v_avail_id_1;

  -- Customer 2: Johnson family
  INSERT INTO customers (first_name, last_name, email, phone)
  VALUES ('Emily', 'Johnson', 'emily.johnson.captain@test.com', '+1-555-0002')
  ON CONFLICT (email) DO UPDATE SET first_name = 'Emily'
  RETURNING id INTO v_customer_id;

  INSERT INTO bookings (customer_id, availability_id, booking_reference, status, guest_count, total_price, notes)
  VALUES (v_customer_id, v_avail_id_1, 'TP-JOHNS1', 'confirmed', 3, 255.00, NULL)
  RETURNING id INTO v_booking_id;

  INSERT INTO booking_guests (booking_id, first_name, last_name, email, is_primary, checked_in) VALUES
    (v_booking_id, 'Emily', 'Johnson', 'emily.johnson.captain@test.com', true, false),
    (v_booking_id, 'Mike', 'Johnson', NULL, false, false),
    (v_booking_id, 'Sarah', 'Johnson', NULL, false, false);

  UPDATE availabilities SET booked_count = booked_count + 3 WHERE id = v_avail_id_1;

  -- Customer 3: Solo traveler
  INSERT INTO customers (first_name, last_name, email, phone)
  VALUES ('David', 'Brown', 'david.brown.captain@test.com', '+1-555-0003')
  ON CONFLICT (email) DO UPDATE SET first_name = 'David'
  RETURNING id INTO v_customer_id;

  INSERT INTO bookings (customer_id, availability_id, booking_reference, status, guest_count, total_price, notes)
  VALUES (v_customer_id, v_avail_id_1, 'TP-BROWN1', 'confirmed', 1, 85.00, 'First time sailing')
  RETURNING id INTO v_booking_id;

  INSERT INTO booking_guests (booking_id, first_name, last_name, email, is_primary, checked_in) VALUES
    (v_booking_id, 'David', 'Brown', 'david.brown.captain@test.com', true, false);

  UPDATE availabilities SET booked_count = booked_count + 1 WHERE id = v_avail_id_1;

  -- Create bookings for afternoon tour
  -- Customer 4: Chen family (birthday party)
  INSERT INTO customers (first_name, last_name, email, phone)
  VALUES ('Lisa', 'Chen', 'lisa.chen.captain@test.com', '+1-555-0004')
  ON CONFLICT (email) DO UPDATE SET first_name = 'Lisa'
  RETURNING id INTO v_customer_id;

  INSERT INTO bookings (customer_id, availability_id, booking_reference, status, guest_count, total_price, notes)
  VALUES (v_customer_id, v_avail_id_2, 'TP-CHEN01', 'confirmed', 4, 340.00, 'Birthday party - please prepare cake')
  RETURNING id INTO v_booking_id;

  INSERT INTO booking_guests (booking_id, first_name, last_name, email, is_primary, checked_in) VALUES
    (v_booking_id, 'Lisa', 'Chen', 'lisa.chen.captain@test.com', true, false),
    (v_booking_id, 'Tom', 'Chen', NULL, false, false),
    (v_booking_id, 'Amy', 'Chen', NULL, false, false),
    (v_booking_id, 'Kevin', 'Chen', NULL, false, false);

  UPDATE availabilities SET booked_count = booked_count + 4 WHERE id = v_avail_id_2;

  -- Customer 5: Wilson couple
  INSERT INTO customers (first_name, last_name, email, phone)
  VALUES ('Robert', 'Wilson', 'robert.wilson.captain@test.com', '+1-555-0005')
  ON CONFLICT (email) DO UPDATE SET first_name = 'Robert'
  RETURNING id INTO v_customer_id;

  INSERT INTO bookings (customer_id, availability_id, booking_reference, status, guest_count, total_price, notes)
  VALUES (v_customer_id, v_avail_id_2, 'TP-WILSO1', 'confirmed', 2, 170.00, NULL)
  RETURNING id INTO v_booking_id;

  INSERT INTO booking_guests (booking_id, first_name, last_name, email, is_primary, checked_in) VALUES
    (v_booking_id, 'Robert', 'Wilson', 'robert.wilson.captain@test.com', true, false),
    (v_booking_id, 'Maria', 'Wilson', 'maria.wilson@test.com', false, false);

  UPDATE availabilities SET booked_count = booked_count + 2 WHERE id = v_avail_id_2;

  RAISE NOTICE 'SUCCESS: Created 2 tours with 5 bookings and 12 guests for Captain Affan';
END $$;
