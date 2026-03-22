-- Widgets table for embeddable booking widgets
CREATE TABLE widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  widget_key VARCHAR(50) UNIQUE NOT NULL,
  allowed_domains TEXT[] DEFAULT ARRAY['*']::TEXT[],
  theme JSONB DEFAULT '{
    "primaryColor": "#0ea5e9",
    "fontFamily": "Inter, sans-serif",
    "borderRadius": "8px",
    "showPrices": true,
    "showAvailability": true,
    "showTourImages": true,
    "showDescription": true,
    "requirePhone": false,
    "collectNotes": true
  }'::JSONB,
  tour_ids UUID[] DEFAULT NULL, -- NULL means all tours, otherwise specific tour IDs
  is_active BOOLEAN DEFAULT true,
  embed_count INTEGER DEFAULT 0,
  booking_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for widget key lookups
CREATE INDEX idx_widgets_key ON widgets(widget_key);
CREATE INDEX idx_widgets_active ON widgets(is_active);

-- RLS
ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;

-- Public can view active widgets (for embed page)
CREATE POLICY "Active widgets are viewable by everyone" ON widgets
  FOR SELECT USING (is_active = true);

-- Staff full access
CREATE POLICY "Staff full access to widgets" ON widgets FOR ALL USING (
  EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid() AND is_active = true)
);

-- Trigger for updated_at
CREATE TRIGGER widgets_updated_at BEFORE UPDATE ON widgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to generate widget key
CREATE OR REPLACE FUNCTION generate_widget_key()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.widget_key IS NULL THEN
    NEW.widget_key := 'wgt_' || encode(gen_random_bytes(12), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for widget key generation
CREATE TRIGGER set_widget_key
  BEFORE INSERT ON widgets
  FOR EACH ROW
  WHEN (NEW.widget_key IS NULL)
  EXECUTE FUNCTION generate_widget_key();

-- Widget analytics table for tracking impressions
CREATE TABLE widget_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'view', 'booking_started', 'booking_completed'
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_widget_analytics_widget ON widget_analytics(widget_id);
CREATE INDEX idx_widget_analytics_date ON widget_analytics(created_at);

-- RLS for analytics
ALTER TABLE widget_analytics ENABLE ROW LEVEL SECURITY;

-- Anyone can insert analytics (for tracking)
CREATE POLICY "Anyone can insert widget analytics" ON widget_analytics
  FOR INSERT WITH CHECK (true);

-- Staff can view analytics
CREATE POLICY "Staff can view widget analytics" ON widget_analytics FOR SELECT USING (
  EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid() AND is_active = true)
);

-- Add widget_id to bookings table for tracking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS widget_id UUID REFERENCES widgets(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_widget ON bookings(widget_id);

-- Function to update widget booking count
CREATE OR REPLACE FUNCTION update_widget_booking_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.widget_id IS NOT NULL AND TG_OP = 'INSERT' THEN
    UPDATE widgets
    SET booking_count = booking_count + 1
    WHERE id = NEW.widget_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_widget_count
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_widget_booking_count();
