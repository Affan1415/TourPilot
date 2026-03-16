-- =============================================
-- Captain Dummy Data for Next Week
-- For user: affanzahir27@gmail.com
-- =============================================

DO $$
DECLARE
    v_user_id UUID;
    v_staff_id UUID;
    v_boat_1_id UUID;
    v_boat_2_id UUID;
    v_tour_1_id UUID;
    v_tour_2_id UUID;
    v_tour_3_id UUID;
    v_avail_id UUID;
    v_customer_id UUID;
    v_booking_id UUID;
    v_admin_staff_id UUID;
    today_date DATE := CURRENT_DATE;
    i INTEGER;
BEGIN
    -- Get user ID for affanzahir27@gmail.com
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'affanzahir27@gmail.com' LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User affanzahir27@gmail.com not found, skipping...';
        RETURN;
    END IF;

    -- Get or create staff record
    SELECT id INTO v_staff_id FROM staff WHERE user_id = v_user_id LIMIT 1;

    IF v_staff_id IS NULL THEN
        INSERT INTO staff (user_id, email, name, role, is_active)
        VALUES (v_user_id, 'affanzahir27@gmail.com', 'Captain Affan', 'captain', true)
        RETURNING id INTO v_staff_id;
    ELSE
        UPDATE staff SET role = 'captain', name = COALESCE(name, 'Captain Affan') WHERE id = v_staff_id;
    END IF;

    RAISE NOTICE 'Staff ID: %', v_staff_id;

    -- Get an admin staff ID for messages (or use the captain's ID)
    SELECT id INTO v_admin_staff_id FROM staff WHERE role = 'admin' AND id != v_staff_id LIMIT 1;
    IF v_admin_staff_id IS NULL THEN
        v_admin_staff_id := v_staff_id;
    END IF;

    -- Create/Get Boats
    SELECT id INTO v_boat_1_id FROM boats WHERE name = 'Sea Breeze' LIMIT 1;
    IF v_boat_1_id IS NULL THEN
        INSERT INTO boats (name, capacity, status)
        VALUES ('Sea Breeze', 12, 'active')
        RETURNING id INTO v_boat_1_id;
    END IF;

    SELECT id INTO v_boat_2_id FROM boats WHERE name = 'Ocean Spirit' LIMIT 1;
    IF v_boat_2_id IS NULL THEN
        INSERT INTO boats (name, capacity, status)
        VALUES ('Ocean Spirit', 20, 'active')
        RETURNING id INTO v_boat_2_id;
    END IF;

    RAISE NOTICE 'Boats: % and %', v_boat_1_id, v_boat_2_id;

    -- Create/Get Tours
    SELECT id INTO v_tour_1_id FROM tours WHERE name = 'Sunset Harbor Cruise' AND status = 'active' LIMIT 1;
    IF v_tour_1_id IS NULL THEN
        INSERT INTO tours (name, slug, description, location, meeting_point, duration_minutes, max_capacity, base_price, status, requires_waiver)
        VALUES ('Sunset Harbor Cruise', 'sunset-harbor-cruise', 'Beautiful sunset cruise around the harbor with stunning views', 'Marina Bay', 'Dock 5, Marina Bay Harbor', 120, 12, 85.00, 'active', true)
        RETURNING id INTO v_tour_1_id;
    END IF;

    SELECT id INTO v_tour_2_id FROM tours WHERE name = 'Dolphin Watch Adventure' AND status = 'active' LIMIT 1;
    IF v_tour_2_id IS NULL THEN
        INSERT INTO tours (name, slug, description, location, meeting_point, duration_minutes, max_capacity, base_price, status, requires_waiver)
        VALUES ('Dolphin Watch Adventure', 'dolphin-watch-adventure', 'Exciting dolphin watching expedition with marine biologist narration', 'Ocean Point', 'Pier 7, Ocean Point Marina', 180, 20, 125.00, 'active', true)
        RETURNING id INTO v_tour_2_id;
    END IF;

    SELECT id INTO v_tour_3_id FROM tours WHERE name = 'Morning Fishing Charter' AND status = 'active' LIMIT 1;
    IF v_tour_3_id IS NULL THEN
        INSERT INTO tours (name, slug, description, location, meeting_point, duration_minutes, max_capacity, base_price, status, requires_waiver)
        VALUES ('Morning Fishing Charter', 'morning-fishing-charter', 'Half-day fishing adventure with all equipment provided', 'Fishermans Wharf', 'Slip 12, Fishermans Wharf', 240, 8, 175.00, 'active', true)
        RETURNING id INTO v_tour_3_id;
    END IF;

    RAISE NOTICE 'Tours: %, %, %', v_tour_1_id, v_tour_2_id, v_tour_3_id;

    -- Clear existing data for this captain
    DELETE FROM availability_staff WHERE staff_id = v_staff_id;
    DELETE FROM fuel_logs WHERE captain_id = v_staff_id;
    DELETE FROM trip_logs WHERE captain_id = v_staff_id;
    DELETE FROM captain_messages WHERE sender_id = v_staff_id OR recipient_id = v_staff_id;
    DELETE FROM time_entries WHERE captain_id = v_staff_id;

    -- Create availabilities and bookings for the next 7 days
    FOR i IN 0..6 LOOP
        DECLARE
            current_day DATE := today_date + i;
            day_of_week INTEGER := EXTRACT(DOW FROM current_day);
            morning_avail_id UUID;
            afternoon_avail_id UUID;
            evening_avail_id UUID;
        BEGIN
            -- Morning Tour (9 AM) - Dolphin Watch (Mon-Sat)
            IF day_of_week != 0 THEN
                INSERT INTO availabilities (tour_id, boat_id, date, start_time, end_time, capacity_override, booked_count, status)
                VALUES (v_tour_2_id, v_boat_2_id, current_day, '09:00:00', '12:00:00', 20, 0, 'available')
                ON CONFLICT DO NOTHING
                RETURNING id INTO morning_avail_id;

                IF morning_avail_id IS NULL THEN
                    SELECT id INTO morning_avail_id FROM availabilities
                    WHERE tour_id = v_tour_2_id AND date = current_day AND start_time = '09:00:00' LIMIT 1;
                END IF;

                IF morning_avail_id IS NOT NULL THEN
                    INSERT INTO availability_staff (availability_id, staff_id, role)
                    VALUES (morning_avail_id, v_staff_id, 'captain')
                    ON CONFLICT DO NOTHING;

                    -- Add bookings for today and tomorrow only
                    IF i <= 1 THEN
                        -- Booking 1: Family group
                        INSERT INTO customers (first_name, last_name, email, phone)
                        VALUES ('Michael', 'Thompson', 'michael.thompson' || i || '@test.com', '+1-555-100' || i)
                        ON CONFLICT (email) DO UPDATE SET first_name = 'Michael'
                        RETURNING id INTO v_customer_id;

                        INSERT INTO bookings (customer_id, availability_id, booking_reference, status, guest_count, total_price, notes)
                        VALUES (v_customer_id, morning_avail_id, 'TP-THOM' || i || '1', 'confirmed', 4, 500.00, 'Family trip - kids ages 8 and 12')
                        RETURNING id INTO v_booking_id;

                        INSERT INTO booking_guests (booking_id, first_name, last_name, email, is_primary, checked_in) VALUES
                            (v_booking_id, 'Michael', 'Thompson', 'michael.thompson' || i || '@test.com', true, false),
                            (v_booking_id, 'Sarah', 'Thompson', NULL, false, false),
                            (v_booking_id, 'Emma', 'Thompson', NULL, false, false),
                            (v_booking_id, 'Jake', 'Thompson', NULL, false, false);

                        UPDATE availabilities SET booked_count = booked_count + 4 WHERE id = morning_avail_id;

                        -- Booking 2: Couple
                        INSERT INTO customers (first_name, last_name, email, phone)
                        VALUES ('David', 'Martinez', 'david.martinez' || i || '@test.com', '+1-555-200' || i)
                        ON CONFLICT (email) DO UPDATE SET first_name = 'David'
                        RETURNING id INTO v_customer_id;

                        INSERT INTO bookings (customer_id, availability_id, booking_reference, status, guest_count, total_price, notes)
                        VALUES (v_customer_id, morning_avail_id, 'TP-MART' || i || '1', 'confirmed', 2, 250.00, 'Anniversary celebration')
                        RETURNING id INTO v_booking_id;

                        INSERT INTO booking_guests (booking_id, first_name, last_name, email, is_primary, checked_in) VALUES
                            (v_booking_id, 'David', 'Martinez', 'david.martinez' || i || '@test.com', true, false),
                            (v_booking_id, 'Lisa', 'Martinez', 'lisa.martinez@test.com', false, false);

                        UPDATE availabilities SET booked_count = booked_count + 2 WHERE id = morning_avail_id;

                        -- Booking 3: Solo traveler
                        INSERT INTO customers (first_name, last_name, email, phone)
                        VALUES ('Jennifer', 'Lee', 'jennifer.lee' || i || '@test.com', '+1-555-300' || i)
                        ON CONFLICT (email) DO UPDATE SET first_name = 'Jennifer'
                        RETURNING id INTO v_customer_id;

                        INSERT INTO bookings (customer_id, availability_id, booking_reference, status, guest_count, total_price, notes)
                        VALUES (v_customer_id, morning_avail_id, 'TP-LEE0' || i || '1', 'confirmed', 1, 125.00, 'Photography enthusiast - may bring camera equipment')
                        RETURNING id INTO v_booking_id;

                        INSERT INTO booking_guests (booking_id, first_name, last_name, email, is_primary, checked_in) VALUES
                            (v_booking_id, 'Jennifer', 'Lee', 'jennifer.lee' || i || '@test.com', true, false);

                        UPDATE availabilities SET booked_count = booked_count + 1 WHERE id = morning_avail_id;
                    END IF;
                END IF;
            END IF;

            -- Afternoon Tour (2 PM) - Sunset Cruise (Daily)
            INSERT INTO availabilities (tour_id, boat_id, date, start_time, end_time, capacity_override, booked_count, status)
            VALUES (v_tour_1_id, v_boat_1_id, current_day, '14:00:00', '16:00:00', 12, 0, 'available')
            ON CONFLICT DO NOTHING
            RETURNING id INTO afternoon_avail_id;

            IF afternoon_avail_id IS NULL THEN
                SELECT id INTO afternoon_avail_id FROM availabilities
                WHERE tour_id = v_tour_1_id AND date = current_day AND start_time = '14:00:00' LIMIT 1;
            END IF;

            IF afternoon_avail_id IS NOT NULL THEN
                INSERT INTO availability_staff (availability_id, staff_id, role)
                VALUES (afternoon_avail_id, v_staff_id, 'captain')
                ON CONFLICT DO NOTHING;

                -- Add bookings for today and tomorrow
                IF i <= 1 THEN
                    -- Booking: Group of friends
                    INSERT INTO customers (first_name, last_name, email, phone)
                    VALUES ('Robert', 'Johnson', 'robert.johnson' || i || '@test.com', '+1-555-400' || i)
                    ON CONFLICT (email) DO UPDATE SET first_name = 'Robert'
                    RETURNING id INTO v_customer_id;

                    INSERT INTO bookings (customer_id, availability_id, booking_reference, status, guest_count, total_price, notes)
                    VALUES (v_customer_id, afternoon_avail_id, 'TP-JOHN' || i || '2', 'confirmed', 5, 425.00, 'Bachelor party - please provide champagne toast')
                    RETURNING id INTO v_booking_id;

                    INSERT INTO booking_guests (booking_id, first_name, last_name, email, is_primary, checked_in) VALUES
                        (v_booking_id, 'Robert', 'Johnson', 'robert.johnson' || i || '@test.com', true, false),
                        (v_booking_id, 'Mark', 'Williams', NULL, false, false),
                        (v_booking_id, 'Steve', 'Brown', NULL, false, false),
                        (v_booking_id, 'Tom', 'Davis', NULL, false, false),
                        (v_booking_id, 'Chris', 'Miller', NULL, false, false);

                    UPDATE availabilities SET booked_count = booked_count + 5 WHERE id = afternoon_avail_id;

                    -- Booking: Elderly couple
                    INSERT INTO customers (first_name, last_name, email, phone)
                    VALUES ('George', 'Wilson', 'george.wilson' || i || '@test.com', '+1-555-500' || i)
                    ON CONFLICT (email) DO UPDATE SET first_name = 'George'
                    RETURNING id INTO v_customer_id;

                    INSERT INTO bookings (customer_id, availability_id, booking_reference, status, guest_count, total_price, notes)
                    VALUES (v_customer_id, afternoon_avail_id, 'TP-WILS' || i || '2', 'confirmed', 2, 170.00, 'Mobility assistance needed - please have ramp ready')
                    RETURNING id INTO v_booking_id;

                    INSERT INTO booking_guests (booking_id, first_name, last_name, email, is_primary, checked_in) VALUES
                        (v_booking_id, 'George', 'Wilson', 'george.wilson' || i || '@test.com', true, false),
                        (v_booking_id, 'Martha', 'Wilson', NULL, false, false);

                    UPDATE availabilities SET booked_count = booked_count + 2 WHERE id = afternoon_avail_id;
                END IF;
            END IF;

            -- Evening Tour (5 PM) - Sunset Cruise on weekends
            IF day_of_week IN (0, 5, 6) THEN
                INSERT INTO availabilities (tour_id, boat_id, date, start_time, end_time, capacity_override, booked_count, status)
                VALUES (v_tour_1_id, v_boat_1_id, current_day, '17:00:00', '19:00:00', 12, 0, 'available')
                ON CONFLICT DO NOTHING
                RETURNING id INTO evening_avail_id;

                IF evening_avail_id IS NULL THEN
                    SELECT id INTO evening_avail_id FROM availabilities
                    WHERE tour_id = v_tour_1_id AND date = current_day AND start_time = '17:00:00' LIMIT 1;
                END IF;

                IF evening_avail_id IS NOT NULL THEN
                    INSERT INTO availability_staff (availability_id, staff_id, role)
                    VALUES (evening_avail_id, v_staff_id, 'captain')
                    ON CONFLICT DO NOTHING;

                    -- Add booking for weekend evening
                    IF i <= 2 THEN
                        INSERT INTO customers (first_name, last_name, email, phone)
                        VALUES ('Amanda', 'Garcia', 'amanda.garcia' || i || '@test.com', '+1-555-600' || i)
                        ON CONFLICT (email) DO UPDATE SET first_name = 'Amanda'
                        RETURNING id INTO v_customer_id;

                        INSERT INTO bookings (customer_id, availability_id, booking_reference, status, guest_count, total_price, notes)
                        VALUES (v_customer_id, evening_avail_id, 'TP-GARC' || i || '3', 'confirmed', 3, 255.00, 'Sunset photography session')
                        RETURNING id INTO v_booking_id;

                        INSERT INTO booking_guests (booking_id, first_name, last_name, email, is_primary, checked_in) VALUES
                            (v_booking_id, 'Amanda', 'Garcia', 'amanda.garcia' || i || '@test.com', true, false),
                            (v_booking_id, 'Carlos', 'Garcia', NULL, false, false),
                            (v_booking_id, 'Sofia', 'Garcia', NULL, false, false);

                        UPDATE availabilities SET booked_count = booked_count + 3 WHERE id = evening_avail_id;
                    END IF;
                END IF;
            END IF;
        END;
    END LOOP;

    -- Add Fuel Logs (last 5 days of history)
    FOR i IN 1..5 LOOP
        INSERT INTO fuel_logs (boat_id, captain_id, log_type, fuel_level_percentage, engine_hours, oil_level, notes, created_at)
        VALUES
            (v_boat_1_id, v_staff_id, 'pre_trip', 85 - (i * 5), 1234.5 + (i * 2), 'normal', 'Pre-trip check - Day ' || i, today_date - i + INTERVAL '8 hours'),
            (v_boat_1_id, v_staff_id, 'post_trip', 65 - (i * 5), 1236.5 + (i * 2), 'normal', 'Post-trip - All systems normal', today_date - i + INTERVAL '17 hours');
    END LOOP;

    -- Add recent fuel log for today
    INSERT INTO fuel_logs (boat_id, captain_id, log_type, fuel_level_percentage, engine_hours, oil_level, notes, created_at)
    VALUES (v_boat_1_id, v_staff_id, 'pre_trip', 90, 1244.5, 'full', 'Morning check - topped off fuel yesterday', NOW());

    -- Add Trip Logs (last 3 days)
    FOR i IN 1..3 LOOP
        DECLARE
            trip_avail_id UUID;
        BEGIN
            SELECT a.id INTO trip_avail_id
            FROM availabilities a
            JOIN availability_staff ast ON a.id = ast.availability_id
            WHERE ast.staff_id = v_staff_id AND a.date = today_date - i
            LIMIT 1;

            IF trip_avail_id IS NOT NULL THEN
                INSERT INTO trip_logs (availability_id, captain_id, boat_id, status, departed_at, docked_at, returned_at, passenger_count, distance_nm, max_speed_knots, avg_speed_knots, notes, created_at)
                VALUES (
                    trip_avail_id,
                    v_staff_id,
                    v_boat_1_id,
                    'completed',
                    (today_date - i + INTERVAL '14 hours')::timestamptz,
                    (today_date - i + INTERVAL '15 hours 45 minutes')::timestamptz,
                    (today_date - i + INTERVAL '16 hours')::timestamptz,
                    7 + i,
                    12.5 + i,
                    18.5,
                    12.3,
                    'Great weather, spotted dolphins near buoy 7',
                    today_date - i + INTERVAL '14 hours'
                );
            END IF;
        END;
    END LOOP;

    -- Add Captain Messages (conversation history)
    INSERT INTO captain_messages (sender_id, recipient_id, message_type, content, metadata, is_read, created_at) VALUES
        (v_admin_staff_id, v_staff_id, 'broadcast', 'Reminder: Safety meeting tomorrow at 8 AM in the marina office.', '{}', true, NOW() - INTERVAL '2 days'),
        (v_staff_id, NULL, 'status_update', 'Status: Departed', '{"status": "departed"}', true, NOW() - INTERVAL '1 day' + INTERVAL '9 hours'),
        (v_staff_id, NULL, 'chat', 'Departed on time with 7 passengers. Weather is perfect!', '{}', true, NOW() - INTERVAL '1 day' + INTERVAL '9 hours 5 minutes'),
        (v_admin_staff_id, v_staff_id, 'chat', 'Great! Have a safe trip.', '{}', true, NOW() - INTERVAL '1 day' + INTERVAL '9 hours 10 minutes'),
        (v_staff_id, NULL, 'status_update', 'Status: Returning', '{"status": "returning"}', true, NOW() - INTERVAL '1 day' + INTERVAL '11 hours 30 minutes'),
        (v_staff_id, NULL, 'status_update', 'Status: Docked', '{"status": "docked"}', true, NOW() - INTERVAL '1 day' + INTERVAL '12 hours'),
        (v_admin_staff_id, v_staff_id, 'chat', 'VIP guest tomorrow at 2 PM - please ensure boat is extra clean.', '{}', false, NOW() - INTERVAL '3 hours'),
        (v_admin_staff_id, v_staff_id, 'alert', 'Weather Advisory: Wind speeds may increase to 15-18 mph this afternoon. Use caution.', '{}', false, NOW() - INTERVAL '1 hour');

    -- Add Time Entries (last week)
    FOR i IN 1..5 LOOP
        IF EXTRACT(DOW FROM today_date - i) NOT IN (0) THEN -- Skip Sundays
            INSERT INTO time_entries (captain_id, clock_in, clock_out, total_hours, notes, created_at)
            VALUES (
                v_staff_id,
                (today_date - i + INTERVAL '7 hours 30 minutes')::timestamptz,
                (today_date - i + INTERVAL '17 hours')::timestamptz,
                9.5,
                CASE WHEN i = 1 THEN 'Two tours completed' ELSE 'Normal shift' END,
                today_date - i + INTERVAL '7 hours 30 minutes'
            );
        END IF;
    END LOOP;

    -- Add Maintenance Issues
    INSERT INTO maintenance_issues (boat_id, reported_by, title, description, category, severity, status, reported_at, created_at) VALUES
        (v_boat_1_id, v_staff_id, 'Minor scratch on port side hull', 'Noticed a 6-inch scratch on the port side, likely from docking. Does not affect operation.', 'hull', 'low', 'open', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
        (v_boat_2_id, v_staff_id, 'GPS unit intermittent', 'GPS occasionally loses signal for a few seconds. Still functional but should be checked.', 'navigation', 'medium', 'in_progress', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
        (v_boat_1_id, v_staff_id, 'Life jacket storage latch broken', 'The latch on the life jacket storage compartment is not closing properly.', 'safety_equipment', 'high', 'parts_ordered', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days');

    RAISE NOTICE 'SUCCESS: Created comprehensive dummy data for Captain Affan';
    RAISE NOTICE 'Tours assigned for next 7 days with bookings';
    RAISE NOTICE 'Added fuel logs, trip history, messages, time entries, and maintenance issues';
END $$;

-- Create waivers for all new guests
DO $$
DECLARE
    v_template_id UUID;
    v_guest RECORD;
BEGIN
    -- Get active waiver template
    SELECT id INTO v_template_id FROM waiver_templates WHERE is_active = true LIMIT 1;

    IF v_template_id IS NULL THEN
        INSERT INTO waiver_templates (name, content, is_active)
        VALUES (
            'Standard Liability Waiver',
            E'# Liability Waiver and Release Form\n\nI understand that participating in water-based activities involves inherent risks. By signing below, I acknowledge these risks and release the tour operator from liability.',
            true
        )
        RETURNING id INTO v_template_id;
    END IF;

    -- Create pending waivers for guests without waivers
    FOR v_guest IN
        SELECT bg.id as guest_id, bg.booking_id
        FROM booking_guests bg
        JOIN bookings b ON bg.booking_id = b.id
        WHERE b.status IN ('confirmed', 'pending')
        AND NOT EXISTS (
            SELECT 1 FROM waivers w WHERE w.guest_id = bg.id AND w.booking_id = bg.booking_id
        )
    LOOP
        INSERT INTO waivers (booking_id, guest_id, waiver_template_id, status)
        VALUES (v_guest.booking_id, v_guest.guest_id, v_template_id, 'pending')
        ON CONFLICT DO NOTHING;
    END LOOP;

    RAISE NOTICE 'Created pending waivers for all guests';
END $$;
