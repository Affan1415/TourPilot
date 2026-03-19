-- Migration: Dummy Staff Members for Testing
-- Description: Creates test staff members for both test locations
-- Roles: admin, location_manager, captain, front_desk

-- ============================================
-- CLEAR EXISTING TEST STAFF
-- ============================================

-- Delete test staff if they exist (using test email pattern)
DELETE FROM staff WHERE email LIKE 'test.%@boatours.test';

-- ============================================
-- CREATE TEST STAFF FOR LOCATION 1 (Test Location 1 - Miami)
-- ============================================

INSERT INTO staff (id, name, email, phone, role, is_active, location_id)
VALUES
    -- Location Manager for Location 1
    ('c1000000-0000-0000-0000-000000000001', 'Maria Rodriguez', 'test.maria@boatours.test', '+1-305-555-0101', 'location_manager', true, '10000000-0000-0000-0000-000000000001'),

    -- Captains for Location 1
    ('c1000000-0000-0000-0000-000000000002', 'Captain Jake Wilson', 'test.jake@boatours.test', '+1-305-555-0102', 'captain', true, '10000000-0000-0000-0000-000000000001'),
    ('c1000000-0000-0000-0000-000000000003', 'Captain Sarah Chen', 'test.sarah@boatours.test', '+1-305-555-0103', 'captain', true, '10000000-0000-0000-0000-000000000001'),
    ('c1000000-0000-0000-0000-000000000004', 'Captain Mike Torres', 'test.mike.t@boatours.test', '+1-305-555-0104', 'captain', true, '10000000-0000-0000-0000-000000000001'),

    -- Front Desk for Location 1
    ('c1000000-0000-0000-0000-000000000005', 'Emily Davis', 'test.emily@boatours.test', '+1-305-555-0105', 'front_desk', true, '10000000-0000-0000-0000-000000000001'),
    ('c1000000-0000-0000-0000-000000000006', 'James Park', 'test.james@boatours.test', '+1-305-555-0106', 'front_desk', true, '10000000-0000-0000-0000-000000000001');

-- ============================================
-- CREATE TEST STAFF FOR LOCATION 2 (Test Location 2 - Key West)
-- ============================================

INSERT INTO staff (id, name, email, phone, role, is_active, location_id)
VALUES
    -- Location Manager for Location 2
    ('c2000000-0000-0000-0000-000000000001', 'Robert Thompson', 'test.robert@boatours.test', '+1-305-555-0201', 'location_manager', true, '20000000-0000-0000-0000-000000000002'),

    -- Captains for Location 2
    ('c2000000-0000-0000-0000-000000000002', 'Captain Ana Garcia', 'test.ana@boatours.test', '+1-305-555-0202', 'captain', true, '20000000-0000-0000-0000-000000000002'),
    ('c2000000-0000-0000-0000-000000000003', 'Captain David Lee', 'test.david@boatours.test', '+1-305-555-0203', 'captain', true, '20000000-0000-0000-0000-000000000002'),

    -- Front Desk for Location 2
    ('c2000000-0000-0000-0000-000000000004', 'Lisa Martinez', 'test.lisa@boatours.test', '+1-305-555-0204', 'front_desk', true, '20000000-0000-0000-0000-000000000002'),
    ('c2000000-0000-0000-0000-000000000005', 'Chris Johnson', 'test.chris@boatours.test', '+1-305-555-0205', 'front_desk', true, '20000000-0000-0000-0000-000000000002');

-- ============================================
-- CREATE GLOBAL ADMIN (no specific location)
-- ============================================

INSERT INTO staff (id, name, email, phone, role, is_active, location_id)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Admin User', 'test.admin@boatours.test', '+1-305-555-0001', 'admin', true, NULL);

-- ============================================
-- ASSIGN CAPTAINS TO BOATS
-- ============================================

-- Location 1: Assign captains to boats
UPDATE boats SET assigned_captain_id = 'c1000000-0000-0000-0000-000000000002' WHERE id = 'b0000000-0000-0000-0000-000000000001'; -- Jake Wilson -> Sea Explorer
UPDATE boats SET assigned_captain_id = 'c1000000-0000-0000-0000-000000000003' WHERE id = 'b0000000-0000-0000-0000-000000000002'; -- Sarah Chen -> Ocean Spirit

-- Location 2: Assign captains to boats
UPDATE boats SET assigned_captain_id = 'c2000000-0000-0000-0000-000000000002' WHERE id = 'b0000000-0000-0000-0000-000000000003'; -- Ana Garcia -> Island Dream
UPDATE boats SET assigned_captain_id = 'c2000000-0000-0000-0000-000000000003' WHERE id = 'b0000000-0000-0000-0000-000000000004'; -- David Lee -> Sunset Chaser

-- ============================================
-- SET UP REPORTING HIERARCHY
-- ============================================

-- Captains and Front Desk report to Location Managers
-- Location 1 staff report to Maria Rodriguez
UPDATE staff SET reports_to = 'c1000000-0000-0000-0000-000000000001'
WHERE location_id = '10000000-0000-0000-0000-000000000001'
AND role IN ('captain', 'front_desk');

-- Location 2 staff report to Robert Thompson
UPDATE staff SET reports_to = 'c2000000-0000-0000-0000-000000000001'
WHERE location_id = '20000000-0000-0000-0000-000000000002'
AND role IN ('captain', 'front_desk');

-- Location Managers report to Admin
UPDATE staff SET reports_to = 'c0000000-0000-0000-0000-000000000001'
WHERE role = 'location_manager';
