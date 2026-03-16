-- Reset/Clean all data from the database
-- Run this in Supabase Dashboard → SQL Editor

-- Disable triggers temporarily for faster deletion
SET session_replication_role = 'replica';

-- Delete data in order (child tables first, then parent tables)

-- Waivers
TRUNCATE TABLE waivers CASCADE;
TRUNCATE TABLE waiver_template_versions CASCADE;
TRUNCATE TABLE waiver_templates CASCADE;

-- Bookings and related
TRUNCATE TABLE booking_guests CASCADE;
TRUNCATE TABLE bookings CASCADE;

-- Availability and scheduling
TRUNCATE TABLE slot_exceptions CASCADE;
TRUNCATE TABLE tour_blackouts CASCADE;
TRUNCATE TABLE boat_blackouts CASCADE;
TRUNCATE TABLE tour_default_slots CASCADE;
TRUNCATE TABLE availabilities CASCADE;
TRUNCATE TABLE recurring_schedules CASCADE;

-- Tours and boats
TRUNCATE TABLE tour_boats CASCADE;
TRUNCATE TABLE tours CASCADE;
TRUNCATE TABLE boats CASCADE;

-- Customers and CRM
TRUNCATE TABLE customer_activities CASCADE;
TRUNCATE TABLE customer_reminders CASCADE;
TRUNCATE TABLE customer_notes CASCADE;
TRUNCATE TABLE customer_tag_assignments CASCADE;
TRUNCATE TABLE customer_tags CASCADE;
TRUNCATE TABLE customers CASCADE;

-- Communications / Inbox
TRUNCATE TABLE messages CASCADE;
TRUNCATE TABLE conversations CASCADE;
TRUNCATE TABLE connected_accounts CASCADE;
TRUNCATE TABLE message_templates CASCADE;
TRUNCATE TABLE quick_replies CASCADE;

-- Reviews
TRUNCATE TABLE review_requests CASCADE;
TRUNCATE TABLE review_request_templates CASCADE;
TRUNCATE TABLE reviews CASCADE;
TRUNCATE TABLE review_platforms CASCADE;

-- Pricing
TRUNCATE TABLE promo_code_uses CASCADE;
TRUNCATE TABLE promo_codes CASCADE;
TRUNCATE TABLE pricing_rules CASCADE;

-- Analytics
TRUNCATE TABLE analytics_snapshots CASCADE;
TRUNCATE TABLE report_history CASCADE;
TRUNCATE TABLE scheduled_reports CASCADE;

-- Widgets
TRUNCATE TABLE widget_events CASCADE;
TRUNCATE TABLE booking_widgets CASCADE;

-- Notifications and webhooks
TRUNCATE TABLE notification_logs CASCADE;
TRUNCATE TABLE push_tokens CASCADE;
TRUNCATE TABLE webhook_events CASCADE;

-- Locations (optional - uncomment if you want to delete)
-- TRUNCATE TABLE locations CASCADE;

-- Staff (optional - uncomment if you want to delete)
-- TRUNCATE TABLE availability_staff CASCADE;
-- TRUNCATE TABLE staff CASCADE;

-- Re-enable triggers
SET session_replication_role = 'origin';

SELECT 'Database cleaned successfully!' as status;
