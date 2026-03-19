-- Migration: Dummy Booking Data for Testing
-- Description: Creates test customers, availabilities, and bookings for both test locations
-- Uses unique test emails to avoid conflicts with existing data

-- ============================================
-- GET OR CREATE TEST LOCATIONS
-- ============================================

-- Delete test locations if they exist (to reset with our known IDs)
DELETE FROM locations WHERE slug IN ('test-location-1', 'test-location-2');

-- Insert test locations with known IDs
INSERT INTO locations (id, name, slug, address, city, state, country, timezone, is_active)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'Test Location 1', 'test-location-1', '100 Test Harbor Dr', 'Miami', 'FL', 'USA', 'America/New_York', true),
    ('20000000-0000-0000-0000-000000000002', 'Test Location 2', 'test-location-2', '200 Test Marina Blvd', 'Key West', 'FL', 'USA', 'America/New_York', true);

-- ============================================
-- CREATE TEST BOATS (if not exist)
-- ============================================

-- Delete existing test boats first to avoid conflicts
DELETE FROM boats WHERE id IN (
    'b0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000004'
);

INSERT INTO boats (id, name, registration_number, boat_type, capacity, status, location_id)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'Sea Explorer', 'FL-1234-AB', 'Catamaran', 12, 'active', '10000000-0000-0000-0000-000000000001'),
    ('b0000000-0000-0000-0000-000000000002', 'Ocean Spirit', 'FL-5678-CD', 'Speedboat', 8, 'active', '10000000-0000-0000-0000-000000000001'),
    ('b0000000-0000-0000-0000-000000000003', 'Island Dream', 'FL-9012-EF', 'Pontoon', 15, 'active', '20000000-0000-0000-0000-000000000002'),
    ('b0000000-0000-0000-0000-000000000004', 'Sunset Chaser', 'FL-3456-GH', 'Yacht', 20, 'active', '20000000-0000-0000-0000-000000000002');

-- ============================================
-- CREATE TEST TOURS
-- ============================================

-- Delete existing test tours first (via slug)
DELETE FROM tours WHERE slug IN (
    'morning-snorkel-adventure', 'sunset-cruise', 'dolphin-watch-tour',
    'key-west-snorkel-safari', 'luxury-sunset-experience', 'fishing-charter'
);

INSERT INTO tours (id, name, slug, description, duration_minutes, base_price, max_capacity, status, location_id, boat_id)
VALUES
    -- Location 1 Tours
    ('d0000000-0000-0000-0000-000000000001', 'Morning Snorkel Adventure', 'morning-snorkel-adventure', 'Explore beautiful coral reefs', 180, 89.00, 12, 'active', '10000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001'),
    ('d0000000-0000-0000-0000-000000000002', 'Sunset Cruise', 'sunset-cruise', 'Watch the sunset from the water', 120, 65.00, 8, 'active', '10000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002'),
    ('d0000000-0000-0000-0000-000000000003', 'Dolphin Watch Tour', 'dolphin-watch-tour', 'See dolphins in their natural habitat', 150, 75.00, 12, 'active', '10000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001'),
    -- Location 2 Tours
    ('d0000000-0000-0000-0000-000000000004', 'Key West Snorkel Safari', 'key-west-snorkel-safari', 'Snorkel the best spots around Key West', 240, 120.00, 15, 'active', '20000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003'),
    ('d0000000-0000-0000-0000-000000000005', 'Luxury Sunset Experience', 'luxury-sunset-experience', 'Premium sunset experience on a yacht', 180, 150.00, 20, 'active', '20000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004'),
    ('d0000000-0000-0000-0000-000000000006', 'Fishing Charter', 'fishing-charter', 'Deep sea fishing adventure', 360, 200.00, 6, 'active', '20000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003');

-- ============================================
-- CREATE TEST CUSTOMERS (with unique test emails)
-- ============================================

INSERT INTO customers (id, email, first_name, last_name, phone, country_code, total_bookings, total_spent)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'test.john.smith@testexample.com', 'John', 'Smith', '5551234567', '+1', 2, 178.00),
    ('c0000000-0000-0000-0000-000000000002', 'test.sarah.johnson@testexample.com', 'Sarah', 'Johnson', '5552345678', '+1', 1, 65.00),
    ('c0000000-0000-0000-0000-000000000003', 'test.mike.williams@testexample.com', 'Mike', 'Williams', '5553456789', '+1', 3, 315.00),
    ('c0000000-0000-0000-0000-000000000004', 'test.emily.brown@testexample.com', 'Emily', 'Brown', '5554567890', '+1', 1, 120.00),
    ('c0000000-0000-0000-0000-000000000005', 'test.david.jones@testexample.com', 'David', 'Jones', '5555678901', '+1', 2, 275.00),
    ('c0000000-0000-0000-0000-000000000006', 'test.lisa.garcia@testexample.com', 'Lisa', 'Garcia', '5556789012', '+1', 1, 150.00),
    ('c0000000-0000-0000-0000-000000000007', 'test.james.miller@testexample.com', 'James', 'Miller', '5557890123', '+1', 1, 89.00),
    ('c0000000-0000-0000-0000-000000000008', 'test.jennifer.davis@testexample.com', 'Jennifer', 'Davis', '5558901234', '+1', 2, 165.00)
ON CONFLICT (email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;

-- ============================================
-- CREATE AVAILABILITIES (TOUR SLOTS)
-- ============================================

-- Current date plus various offsets for realistic data
-- Location 1 - Availabilities for the next 14 days
INSERT INTO availabilities (id, tour_id, boat_id, date, start_time, end_time, price_override, capacity_override, booked_count, status)
VALUES
    -- Morning Snorkel Adventure - Location 1 (next 7 days)
    ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', CURRENT_DATE, '08:00', '11:00', NULL, NULL, 4, 'available'),
    ('a0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', CURRENT_DATE + 1, '08:00', '11:00', NULL, NULL, 2, 'available'),
    ('a0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', CURRENT_DATE + 2, '08:00', '11:00', NULL, NULL, 0, 'available'),
    ('a0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', CURRENT_DATE + 3, '08:00', '11:00', NULL, NULL, 0, 'available'),
    ('a0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', CURRENT_DATE + 4, '08:00', '11:00', NULL, NULL, 0, 'available'),
    ('a0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', CURRENT_DATE + 5, '08:00', '11:00', NULL, NULL, 0, 'available'),
    ('a0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', CURRENT_DATE + 6, '08:00', '11:00', NULL, NULL, 0, 'available'),

    -- Sunset Cruise - Location 1
    ('a0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', CURRENT_DATE, '17:00', '19:00', NULL, NULL, 3, 'available'),
    ('a0000000-0000-0000-0000-000000000012', 'd0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', CURRENT_DATE + 1, '17:00', '19:00', NULL, NULL, 0, 'available'),
    ('a0000000-0000-0000-0000-000000000013', 'd0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', CURRENT_DATE + 2, '17:00', '19:00', NULL, NULL, 0, 'available'),
    ('a0000000-0000-0000-0000-000000000014', 'd0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', CURRENT_DATE + 3, '17:00', '19:00', NULL, NULL, 0, 'available'),
    ('a0000000-0000-0000-0000-000000000015', 'd0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', CURRENT_DATE + 4, '17:00', '19:00', NULL, NULL, 0, 'available'),

    -- Dolphin Watch Tour - Location 1
    ('a0000000-0000-0000-0000-000000000021', 'd0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', CURRENT_DATE, '13:00', '15:30', NULL, NULL, 2, 'available'),
    ('a0000000-0000-0000-0000-000000000022', 'd0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', CURRENT_DATE + 1, '13:00', '15:30', NULL, NULL, 0, 'available'),
    ('a0000000-0000-0000-0000-000000000023', 'd0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', CURRENT_DATE + 2, '13:00', '15:30', NULL, NULL, 0, 'available'),
    ('a0000000-0000-0000-0000-000000000024', 'd0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', CURRENT_DATE + 3, '13:00', '15:30', NULL, NULL, 0, 'available'),

    -- Key West Snorkel Safari - Location 2
    ('a0000000-0000-0000-0000-000000000031', 'd0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000003', CURRENT_DATE, '09:00', '13:00', NULL, NULL, 5, 'available'),
    ('a0000000-0000-0000-0000-000000000032', 'd0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000003', CURRENT_DATE + 1, '09:00', '13:00', NULL, NULL, 0, 'available'),
    ('a0000000-0000-0000-0000-000000000033', 'd0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000003', CURRENT_DATE + 2, '09:00', '13:00', NULL, NULL, 0, 'available'),
    ('a0000000-0000-0000-0000-000000000034', 'd0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000003', CURRENT_DATE + 3, '09:00', '13:00', NULL, NULL, 0, 'available'),
    ('a0000000-0000-0000-0000-000000000035', 'd0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000003', CURRENT_DATE + 4, '09:00', '13:00', NULL, NULL, 0, 'available'),

    -- Luxury Sunset Experience - Location 2
    ('a0000000-0000-0000-0000-000000000041', 'd0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000004', CURRENT_DATE, '16:30', '19:30', NULL, NULL, 4, 'available'),
    ('a0000000-0000-0000-0000-000000000042', 'd0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000004', CURRENT_DATE + 1, '16:30', '19:30', NULL, NULL, 0, 'available'),
    ('a0000000-0000-0000-0000-000000000043', 'd0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000004', CURRENT_DATE + 2, '16:30', '19:30', NULL, NULL, 0, 'available'),
    ('a0000000-0000-0000-0000-000000000044', 'd0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000004', CURRENT_DATE + 3, '16:30', '19:30', NULL, NULL, 0, 'available'),

    -- Fishing Charter - Location 2
    ('a0000000-0000-0000-0000-000000000051', 'd0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000003', CURRENT_DATE, '06:00', '12:00', NULL, 6, 2, 'available'),
    ('a0000000-0000-0000-0000-000000000052', 'd0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000003', CURRENT_DATE + 1, '06:00', '12:00', NULL, 6, 0, 'available'),
    ('a0000000-0000-0000-0000-000000000053', 'd0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000003', CURRENT_DATE + 2, '06:00', '12:00', NULL, 6, 0, 'available'),
    ('a0000000-0000-0000-0000-000000000054', 'd0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000003', CURRENT_DATE + 3, '06:00', '12:00', NULL, 6, 0, 'available')
ON CONFLICT DO NOTHING;

-- ============================================
-- CREATE BOOKINGS
-- ============================================

-- Disable trigger temporarily to manually set booking counts
ALTER TABLE bookings DISABLE TRIGGER booking_availability_count;

INSERT INTO bookings (id, booking_reference, customer_id, availability_id, guest_count, total_price, status, payment_status, checked_in)
VALUES
    -- Location 1 Bookings - Morning Snorkel Adventure (today)
    ('e0000000-0000-0000-0000-000000000001', 'BK260319001', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 2, 178.00, 'confirmed', 'paid', false),
    ('e0000000-0000-0000-0000-000000000002', 'BK260319002', 'c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 2, 178.00, 'confirmed', 'paid', false),

    -- Location 1 Bookings - Morning Snorkel Adventure (tomorrow)
    ('e0000000-0000-0000-0000-000000000003', 'BK260319003', 'c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 2, 178.00, 'confirmed', 'paid', false),

    -- Location 1 Bookings - Sunset Cruise (today)
    ('e0000000-0000-0000-0000-000000000004', 'BK260319004', 'c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000011', 1, 65.00, 'confirmed', 'paid', false),
    ('e0000000-0000-0000-0000-000000000005', 'BK260319005', 'c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000011', 2, 130.00, 'confirmed', 'paid', false),

    -- Location 1 Bookings - Dolphin Watch (today)
    ('e0000000-0000-0000-0000-000000000006', 'BK260319006', 'c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000021', 2, 150.00, 'pending', 'pending', false),

    -- Location 2 Bookings - Key West Snorkel Safari (today)
    ('e0000000-0000-0000-0000-000000000007', 'BK260319007', 'c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000031', 3, 360.00, 'confirmed', 'paid', false),
    ('e0000000-0000-0000-0000-000000000008', 'BK260319008', 'c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000031', 2, 240.00, 'confirmed', 'paid', false),

    -- Location 2 Bookings - Luxury Sunset Experience (today)
    ('e0000000-0000-0000-0000-000000000009', 'BK260319009', 'c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000041', 2, 300.00, 'confirmed', 'paid', false),
    ('e0000000-0000-0000-0000-00000000000a', 'BK260319010', 'c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000041', 2, 300.00, 'checked_in', 'paid', true),

    -- Location 2 Bookings - Fishing Charter (today)
    ('e0000000-0000-0000-0000-00000000000b', 'BK260319011', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000051', 2, 400.00, 'confirmed', 'paid', false),

    -- Past bookings (completed)
    ('e0000000-0000-0000-0000-00000000000c', 'BK260318001', 'c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 1, 89.00, 'completed', 'paid', true)
ON CONFLICT DO NOTHING;

-- Re-enable trigger
ALTER TABLE bookings ENABLE TRIGGER booking_availability_count;

-- ============================================
-- CREATE BOOKING GUESTS
-- ============================================

INSERT INTO booking_guests (id, booking_id, first_name, last_name, email, is_primary, checked_in)
VALUES
    -- Booking 1 guests (John Smith - Morning Snorkel)
    ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'John', 'Smith', 'test.john.smith@testexample.com', true, false),
    ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'Jane', 'Smith', 'jane.smith@testexample.com', false, false),

    -- Booking 2 guests (James Miller - Morning Snorkel)
    ('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000002', 'James', 'Miller', 'test.james.miller@testexample.com', true, false),
    ('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000002', 'Mary', 'Miller', NULL, false, false),

    -- Booking 4 guests (Sarah - Sunset Cruise)
    ('f0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000004', 'Sarah', 'Johnson', 'test.sarah.johnson@testexample.com', true, false),

    -- Booking 5 guests (Jennifer - Sunset Cruise)
    ('f0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000005', 'Jennifer', 'Davis', 'test.jennifer.davis@testexample.com', true, false),
    ('f0000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000005', 'Mark', 'Davis', NULL, false, false),

    -- Booking 7 guests (Emily - Key West Safari)
    ('f0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000007', 'Emily', 'Brown', 'test.emily.brown@testexample.com', true, false),
    ('f0000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000007', 'Tom', 'Brown', NULL, false, false),
    ('f0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-000000000007', 'Lucy', 'Brown', NULL, false, false),

    -- Booking 9 guests (Lisa - Luxury Sunset)
    ('f0000000-0000-0000-0000-00000000000b', 'e0000000-0000-0000-0000-000000000009', 'Lisa', 'Garcia', 'test.lisa.garcia@testexample.com', true, false),
    ('f0000000-0000-0000-0000-00000000000c', 'e0000000-0000-0000-0000-000000000009', 'Carlos', 'Garcia', NULL, false, false),

    -- Booking 10 guests (David - Luxury Sunset - checked in)
    ('f0000000-0000-0000-0000-00000000000d', 'e0000000-0000-0000-0000-00000000000a', 'David', 'Jones', 'test.david.jones@testexample.com', true, true),
    ('f0000000-0000-0000-0000-00000000000e', 'e0000000-0000-0000-0000-00000000000a', 'Amy', 'Jones', NULL, false, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- SUMMARY
-- ============================================
-- Location 1 (Test Location 1): 6 bookings
--   - Morning Snorkel Adventure: 3 bookings (4 guests today, 2 tomorrow)
--   - Sunset Cruise: 2 bookings (3 guests)
--   - Dolphin Watch: 1 booking (2 guests)
--
-- Location 2 (Test Location 2): 5 bookings
--   - Key West Snorkel Safari: 2 bookings (5 guests)
--   - Luxury Sunset Experience: 2 bookings (4 guests)
--   - Fishing Charter: 1 booking (2 guests)
