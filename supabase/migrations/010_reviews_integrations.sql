-- Migration: Reviews & Integrations for v3.0
-- TripAdvisor integration, review aggregation, embeddable widget, review requests

-- Enable pgcrypto for gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Review sources enum
CREATE TYPE review_source AS ENUM (
  'tripadvisor',
  'google',
  'yelp',
  'internal',
  'facebook'
);

-- Review status
CREATE TYPE review_status AS ENUM (
  'pending',
  'published',
  'hidden',
  'flagged'
);

-- Reviews table - aggregated from all sources
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  tour_id UUID REFERENCES tours(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  source review_source NOT NULL,
  external_id VARCHAR(255), -- ID from external platform
  external_url TEXT, -- Link to original review
  author_name VARCHAR(255) NOT NULL,
  author_avatar_url TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(500),
  content TEXT,
  review_date TIMESTAMP WITH TIME ZONE NOT NULL,
  language VARCHAR(10) DEFAULT 'en',
  status review_status DEFAULT 'published',
  response TEXT, -- Business response
  response_date TIMESTAMP WITH TIME ZONE,
  responded_by UUID REFERENCES staff(id),
  metadata JSONB DEFAULT '{}', -- Source-specific data
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(source, external_id)
);

-- Review request campaigns
CREATE TABLE review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL, -- email, sms, whatsapp
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, clicked, reviewed, failed
  target_platform review_source, -- Which platform to request review for
  sent_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_id UUID REFERENCES reviews(id),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Review platform connections
CREATE TABLE review_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  platform review_source NOT NULL,
  external_id VARCHAR(255) NOT NULL, -- Business ID on platform
  external_url TEXT, -- Link to business profile
  api_key TEXT, -- Encrypted API key if needed
  access_token TEXT, -- OAuth token
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  sync_enabled BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(location_id, platform)
);

-- Embeddable widgets configuration
CREATE TABLE booking_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  widget_key VARCHAR(64) NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  allowed_domains TEXT[] DEFAULT '{}', -- Domains that can embed
  tour_ids UUID[] DEFAULT '{}', -- Specific tours or empty for all
  theme JSONB DEFAULT '{
    "primaryColor": "#0ea5e9",
    "fontFamily": "Inter, sans-serif",
    "borderRadius": "8px",
    "showPrices": true,
    "showAvailability": true
  }',
  settings JSONB DEFAULT '{
    "showTourImages": true,
    "showDescription": true,
    "requirePhone": false,
    "collectNotes": true,
    "redirectUrl": null
  }',
  is_active BOOLEAN DEFAULT TRUE,
  embed_count INTEGER DEFAULT 0,
  booking_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Widget analytics
CREATE TABLE widget_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID NOT NULL REFERENCES booking_widgets(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- view, tour_select, date_select, booking_start, booking_complete
  referrer_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Review request templates
CREATE TABLE review_request_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  channel VARCHAR(20) NOT NULL, -- email, sms
  subject VARCHAR(255), -- For email
  content TEXT NOT NULL,
  delay_hours INTEGER DEFAULT 24, -- Hours after tour to send
  target_platform review_source,
  is_active BOOLEAN DEFAULT TRUE,
  use_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_reviews_location ON reviews(location_id);
CREATE INDEX idx_reviews_tour ON reviews(tour_id);
CREATE INDEX idx_reviews_source ON reviews(source);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_date ON reviews(review_date DESC);
CREATE INDEX idx_reviews_status ON reviews(status);

CREATE INDEX idx_review_requests_location ON review_requests(location_id);
CREATE INDEX idx_review_requests_booking ON review_requests(booking_id);
CREATE INDEX idx_review_requests_status ON review_requests(status);

CREATE INDEX idx_widget_events_widget ON widget_events(widget_id);
CREATE INDEX idx_widget_events_type ON widget_events(event_type);

-- Function to calculate average rating
CREATE OR REPLACE FUNCTION get_location_rating(p_location_id UUID)
RETURNS TABLE(avg_rating DECIMAL, total_reviews INTEGER, rating_distribution JSONB) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(AVG(rating)::DECIMAL, 1) as avg_rating,
    COUNT(*)::INTEGER as total_reviews,
    jsonb_build_object(
      '5', COUNT(*) FILTER (WHERE rating = 5),
      '4', COUNT(*) FILTER (WHERE rating = 4),
      '3', COUNT(*) FILTER (WHERE rating = 3),
      '2', COUNT(*) FILTER (WHERE rating = 2),
      '1', COUNT(*) FILTER (WHERE rating = 1)
    ) as rating_distribution
  FROM reviews
  WHERE location_id = p_location_id AND status = 'published';
END;
$$ LANGUAGE plpgsql;

-- Function to auto-schedule review request after booking completion
CREATE OR REPLACE FUNCTION schedule_review_request()
RETURNS TRIGGER AS $$
DECLARE
  v_template review_request_templates%ROWTYPE;
  v_tour_date TIMESTAMP;
BEGIN
  -- Only trigger when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get the tour date from availability
    SELECT date INTO v_tour_date
    FROM availabilities
    WHERE id = NEW.availability_id;

    -- Get active template for this location
    SELECT * INTO v_template
    FROM review_request_templates
    WHERE location_id = (
      SELECT location_id FROM availabilities a
      JOIN tours t ON a.tour_id = t.id
      WHERE a.id = NEW.availability_id
    )
    AND is_active = TRUE
    LIMIT 1;

    IF v_template.id IS NOT NULL THEN
      INSERT INTO review_requests (
        location_id,
        booking_id,
        customer_id,
        channel,
        target_platform,
        status
      ) VALUES (
        v_template.location_id,
        NEW.id,
        NEW.customer_id,
        v_template.channel,
        v_template.target_platform,
        'pending'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_schedule_review_request
AFTER UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION schedule_review_request();

-- RLS Policies
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_request_templates ENABLE ROW LEVEL SECURITY;

-- Staff can manage their location's reviews
CREATE POLICY "Staff can view their location reviews"
  ON reviews FOR SELECT
  USING (location_id IN (
    SELECT location_id FROM staff WHERE user_id = auth.uid()
  ));

CREATE POLICY "Staff can respond to reviews"
  ON reviews FOR UPDATE
  USING (location_id IN (
    SELECT location_id FROM staff WHERE user_id = auth.uid()
  ));

-- Public can view published reviews (for widget)
CREATE POLICY "Public can view published reviews"
  ON reviews FOR SELECT
  USING (status = 'published');

-- Widget access (by widget key, handled in API)
CREATE POLICY "Staff can manage their location widgets"
  ON booking_widgets FOR ALL
  USING (location_id IN (
    SELECT location_id FROM staff WHERE user_id = auth.uid()
  ));

-- Insert default review request template
INSERT INTO review_request_templates (name, channel, subject, content, delay_hours, target_platform) VALUES
('Post-Tour Email', 'email', 'How was your {{tour_name}} experience?',
 'Hi {{customer_name}},

Thank you for joining us on the {{tour_name}} tour!

We hope you had an amazing experience. Would you mind taking a moment to share your thoughts? Your feedback helps other travelers discover us and helps us continue to improve.

[Leave a Review]

Thank you for your support!

Best regards,
The TourPilot Team',
 24, 'google');

-- Insert sample widget
INSERT INTO booking_widgets (name, allowed_domains, theme, settings) VALUES
('Default Widget', '{"*"}',
 '{"primaryColor": "#0ea5e9", "fontFamily": "Inter, sans-serif", "borderRadius": "8px", "showPrices": true, "showAvailability": true}',
 '{"showTourImages": true, "showDescription": true, "requirePhone": false, "collectNotes": true}');
