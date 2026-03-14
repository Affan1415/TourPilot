-- CRM Features Migration
-- Adds tags, notes, activity tracking, and customer segments

-- Customer tags table
CREATE TABLE customer_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  color VARCHAR(20) DEFAULT 'gray',
  description TEXT,
  is_auto BOOLEAN DEFAULT FALSE,
  auto_rules JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Junction table for customer-tag relationship
CREATE TABLE customer_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES customer_tags(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(customer_id, tag_id)
);

-- Customer notes table
CREATE TABLE customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id),
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer activity log
CREATE TABLE customer_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  metadata JSONB,
  staff_id UUID REFERENCES staff(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Follow-up reminders
CREATE TABLE customer_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'dismissed')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns to customers table for CRM
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_bookings INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_spent DECIMAL(10,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS lifetime_value DECIMAL(10,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_booking_date DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_booking_date DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS average_booking_value DECIMAL(10,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS preferred_tour_id UUID REFERENCES tours(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS source VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;

-- Indexes for performance
CREATE INDEX idx_customer_tags_name ON customer_tags(name);
CREATE INDEX idx_customer_tag_assignments_customer ON customer_tag_assignments(customer_id);
CREATE INDEX idx_customer_tag_assignments_tag ON customer_tag_assignments(tag_id);
CREATE INDEX idx_customer_notes_customer ON customer_notes(customer_id);
CREATE INDEX idx_customer_activities_customer ON customer_activities(customer_id);
CREATE INDEX idx_customer_activities_type ON customer_activities(activity_type);
CREATE INDEX idx_customer_reminders_customer ON customer_reminders(customer_id);
CREATE INDEX idx_customer_reminders_due ON customer_reminders(due_date) WHERE status = 'pending';

-- RLS Policies
ALTER TABLE customer_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_reminders ENABLE ROW LEVEL SECURITY;

-- Staff can manage tags
CREATE POLICY "Staff can manage tags"
  ON customer_tags
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid())
  );

-- Staff can manage tag assignments
CREATE POLICY "Staff can manage tag assignments"
  ON customer_tag_assignments
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid())
  );

-- Staff can manage notes
CREATE POLICY "Staff can manage notes"
  ON customer_notes
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid())
  );

-- Staff can view activities
CREATE POLICY "Staff can view activities"
  ON customer_activities
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid())
  );

-- Staff can insert activities
CREATE POLICY "Staff can insert activities"
  ON customer_activities
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid())
  );

-- Staff can manage reminders
CREATE POLICY "Staff can manage reminders"
  ON customer_reminders
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid())
  );

-- Insert default tags
INSERT INTO customer_tags (name, color, description, is_auto, auto_rules) VALUES
  ('VIP', 'purple', 'High-value customers with 5+ bookings or $1000+ spent', true, '{"min_bookings": 5, "min_spent": 1000}'),
  ('Repeat', 'blue', 'Customers with 2+ bookings', true, '{"min_bookings": 2}'),
  ('New', 'green', 'First-time customers', true, '{"max_bookings": 1}'),
  ('Corporate', 'cyan', 'Business/corporate customers', false, null),
  ('Family', 'orange', 'Family groups', false, null),
  ('Local', 'teal', 'Local residents', false, null),
  ('Tourist', 'pink', 'Visiting tourists', false, null),
  ('Group Leader', 'amber', 'Organizes group bookings', false, null)
ON CONFLICT (name) DO NOTHING;

-- Function to update customer stats
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE customers
  SET
    total_bookings = (
      SELECT COUNT(*) FROM bookings
      WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id)
      AND status != 'cancelled'
    ),
    total_spent = (
      SELECT COALESCE(SUM(total_price), 0) FROM bookings
      WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id)
      AND status IN ('confirmed', 'completed')
    ),
    first_booking_date = (
      SELECT MIN(created_at::date) FROM bookings
      WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id)
    ),
    last_booking_date = (
      SELECT MAX(created_at::date) FROM bookings
      WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id)
    )
  WHERE id = COALESCE(NEW.customer_id, OLD.customer_id);

  -- Update average and lifetime value
  UPDATE customers
  SET
    average_booking_value = CASE WHEN total_bookings > 0 THEN total_spent / total_bookings ELSE 0 END,
    lifetime_value = total_spent
  WHERE id = COALESCE(NEW.customer_id, OLD.customer_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update customer stats on booking changes
DROP TRIGGER IF EXISTS update_customer_stats_trigger ON bookings;
CREATE TRIGGER update_customer_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_stats();

-- Function to log customer activity
CREATE OR REPLACE FUNCTION log_customer_activity(
  p_customer_id UUID,
  p_activity_type VARCHAR(50),
  p_title VARCHAR(255),
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_staff_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO customer_activities (customer_id, activity_type, title, description, metadata, staff_id)
  VALUES (p_customer_id, p_activity_type, p_title, p_description, p_metadata, p_staff_id)
  RETURNING id INTO activity_id;

  RETURN activity_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-log booking activities
CREATE OR REPLACE FUNCTION log_booking_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_customer_activity(
      NEW.customer_id,
      'booking_created',
      'New booking created',
      'Booking reference: ' || NEW.booking_reference,
      jsonb_build_object('booking_id', NEW.id, 'reference', NEW.booking_reference, 'amount', NEW.total_price)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      PERFORM log_customer_activity(
        NEW.customer_id,
        'booking_status_changed',
        'Booking status changed to ' || NEW.status,
        'Booking reference: ' || NEW.booking_reference,
        jsonb_build_object('booking_id', NEW.id, 'old_status', OLD.status, 'new_status', NEW.status)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_booking_activity_trigger ON bookings;
CREATE TRIGGER log_booking_activity_trigger
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION log_booking_activity();
