-- Migration: Advanced Analytics for v3.1
-- Revenue reports, booking analytics, operations reports, scheduled exports

-- Scheduled reports configuration
CREATE TABLE scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  report_type VARCHAR(50) NOT NULL, -- revenue, bookings, operations, custom
  frequency VARCHAR(20) NOT NULL, -- daily, weekly, monthly
  day_of_week INTEGER, -- 0-6 for weekly reports
  day_of_month INTEGER, -- 1-31 for monthly reports
  time_of_day TIME DEFAULT '08:00:00',
  timezone VARCHAR(50) DEFAULT 'UTC',
  recipients TEXT[] NOT NULL, -- email addresses
  filters JSONB DEFAULT '{}', -- date range, tours, boats, etc.
  format VARCHAR(10) DEFAULT 'pdf', -- pdf, csv, excel
  include_charts BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  next_send_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Report generation history
CREATE TABLE report_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_report_id UUID REFERENCES scheduled_reports(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL,
  generated_by UUID REFERENCES staff(id),
  parameters JSONB NOT NULL, -- filters, date range, etc.
  file_url TEXT, -- S3/storage URL
  file_size INTEGER,
  status VARCHAR(20) DEFAULT 'completed', -- pending, generating, completed, failed
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics snapshots for historical data
CREATE TABLE analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  snapshot_type VARCHAR(20) NOT NULL, -- daily, weekly, monthly
  metrics JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(location_id, snapshot_date, snapshot_type)
);

-- Indexes
CREATE INDEX idx_scheduled_reports_location ON scheduled_reports(location_id);
CREATE INDEX idx_scheduled_reports_next_send ON scheduled_reports(next_send_at) WHERE is_active = TRUE;
CREATE INDEX idx_report_history_location ON report_history(location_id);
CREATE INDEX idx_report_history_created ON report_history(created_at DESC);
CREATE INDEX idx_analytics_snapshots_location_date ON analytics_snapshots(location_id, snapshot_date);

-- Function to get revenue analytics
CREATE OR REPLACE FUNCTION get_revenue_analytics(
  p_location_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  total_revenue DECIMAL,
  total_bookings INTEGER,
  avg_booking_value DECIMAL,
  refund_total DECIMAL,
  net_revenue DECIMAL,
  revenue_by_tour JSONB,
  revenue_by_day JSONB,
  payment_methods JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH booking_data AS (
    SELECT
      b.id,
      b.total_price,
      b.status,
      b.payment_method,
      b.created_at::DATE as booking_date,
      t.name as tour_name,
      t.id as tour_id
    FROM bookings b
    JOIN availabilities a ON b.availability_id = a.id
    JOIN tours t ON a.tour_id = t.id
    WHERE t.location_id = p_location_id
      AND b.created_at::DATE BETWEEN p_start_date AND p_end_date
  ),
  revenue_stats AS (
    SELECT
      COALESCE(SUM(CASE WHEN status IN ('confirmed', 'completed') THEN total_price ELSE 0 END), 0) as total_rev,
      COUNT(*) FILTER (WHERE status IN ('confirmed', 'completed')) as total_book,
      COALESCE(SUM(CASE WHEN status = 'cancelled' THEN total_price ELSE 0 END), 0) as refund_tot
    FROM booking_data
  ),
  by_tour AS (
    SELECT jsonb_agg(jsonb_build_object(
      'tour', tour_name,
      'revenue', tour_revenue,
      'bookings', tour_bookings
    )) as data
    FROM (
      SELECT
        tour_name,
        SUM(CASE WHEN status IN ('confirmed', 'completed') THEN total_price ELSE 0 END) as tour_revenue,
        COUNT(*) FILTER (WHERE status IN ('confirmed', 'completed')) as tour_bookings
      FROM booking_data
      GROUP BY tour_name
      ORDER BY tour_revenue DESC
    ) t
  ),
  by_day AS (
    SELECT jsonb_agg(jsonb_build_object(
      'date', booking_date,
      'revenue', day_revenue,
      'bookings', day_bookings
    ) ORDER BY booking_date) as data
    FROM (
      SELECT
        booking_date,
        SUM(CASE WHEN status IN ('confirmed', 'completed') THEN total_price ELSE 0 END) as day_revenue,
        COUNT(*) FILTER (WHERE status IN ('confirmed', 'completed')) as day_bookings
      FROM booking_data
      GROUP BY booking_date
    ) t
  ),
  by_payment AS (
    SELECT jsonb_agg(jsonb_build_object(
      'method', COALESCE(payment_method, 'unknown'),
      'count', method_count,
      'amount', method_amount
    )) as data
    FROM (
      SELECT
        payment_method,
        COUNT(*) as method_count,
        SUM(total_price) as method_amount
      FROM booking_data
      WHERE status IN ('confirmed', 'completed')
      GROUP BY payment_method
    ) t
  )
  SELECT
    rs.total_rev,
    rs.total_book::INTEGER,
    CASE WHEN rs.total_book > 0 THEN ROUND(rs.total_rev / rs.total_book, 2) ELSE 0 END,
    rs.refund_tot,
    rs.total_rev - rs.refund_tot,
    COALESCE(bt.data, '[]'::JSONB),
    COALESCE(bd.data, '[]'::JSONB),
    COALESCE(bp.data, '[]'::JSONB)
  FROM revenue_stats rs
  CROSS JOIN by_tour bt
  CROSS JOIN by_day bd
  CROSS JOIN by_payment bp;
END;
$$ LANGUAGE plpgsql;

-- Function to get booking analytics
CREATE OR REPLACE FUNCTION get_booking_analytics(
  p_location_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  total_bookings INTEGER,
  confirmed_bookings INTEGER,
  cancelled_bookings INTEGER,
  cancellation_rate DECIMAL,
  avg_lead_time_days DECIMAL,
  avg_group_size DECIMAL,
  bookings_by_status JSONB,
  bookings_by_source JSONB,
  lead_time_distribution JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH booking_data AS (
    SELECT
      b.id,
      b.status,
      b.number_of_guests,
      b.created_at,
      a.date as tour_date,
      EXTRACT(DAY FROM a.date - b.created_at::DATE) as lead_time,
      b.metadata->>'source' as booking_source
    FROM bookings b
    JOIN availabilities a ON b.availability_id = a.id
    JOIN tours t ON a.tour_id = t.id
    WHERE t.location_id = p_location_id
      AND b.created_at::DATE BETWEEN p_start_date AND p_end_date
  ),
  stats AS (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status IN ('confirmed', 'completed')) as confirmed,
      COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
      AVG(lead_time) as avg_lead,
      AVG(number_of_guests) as avg_guests
    FROM booking_data
  ),
  by_status AS (
    SELECT jsonb_object_agg(status, cnt) as data
    FROM (
      SELECT status, COUNT(*) as cnt
      FROM booking_data
      GROUP BY status
    ) t
  ),
  by_source AS (
    SELECT jsonb_agg(jsonb_build_object(
      'source', COALESCE(booking_source, 'direct'),
      'count', cnt
    )) as data
    FROM (
      SELECT booking_source, COUNT(*) as cnt
      FROM booking_data
      GROUP BY booking_source
    ) t
  ),
  lead_dist AS (
    SELECT jsonb_agg(jsonb_build_object(
      'range', range_label,
      'count', cnt
    )) as data
    FROM (
      SELECT
        CASE
          WHEN lead_time <= 1 THEN 'Same/Next Day'
          WHEN lead_time <= 3 THEN '2-3 Days'
          WHEN lead_time <= 7 THEN '4-7 Days'
          WHEN lead_time <= 14 THEN '1-2 Weeks'
          WHEN lead_time <= 30 THEN '2-4 Weeks'
          ELSE '1+ Month'
        END as range_label,
        COUNT(*) as cnt
      FROM booking_data
      GROUP BY range_label
    ) t
  )
  SELECT
    s.total::INTEGER,
    s.confirmed::INTEGER,
    s.cancelled::INTEGER,
    CASE WHEN s.total > 0 THEN ROUND((s.cancelled::DECIMAL / s.total) * 100, 1) ELSE 0 END,
    ROUND(COALESCE(s.avg_lead, 0), 1),
    ROUND(COALESCE(s.avg_guests, 0), 1),
    COALESCE(bs.data, '{}'::JSONB),
    COALESCE(bsrc.data, '[]'::JSONB),
    COALESCE(ld.data, '[]'::JSONB)
  FROM stats s
  CROSS JOIN by_status bs
  CROSS JOIN by_source bsrc
  CROSS JOIN lead_dist ld;
END;
$$ LANGUAGE plpgsql;

-- Function to get operations analytics
CREATE OR REPLACE FUNCTION get_operations_analytics(
  p_location_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  total_tours_run INTEGER,
  total_guests INTEGER,
  avg_capacity_utilization DECIMAL,
  boats_data JSONB,
  captains_data JSONB,
  peak_hours JSONB,
  peak_days JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH tour_data AS (
    SELECT
      a.id as availability_id,
      a.date,
      a.start_time,
      t.name as tour_name,
      t.id as tour_id,
      b.name as boat_name,
      b.id as boat_id,
      b.capacity,
      COALESCE(SUM(bk.number_of_guests), 0) as guests,
      s.name as captain_name,
      s.id as captain_id
    FROM availabilities a
    JOIN tours t ON a.tour_id = t.id
    LEFT JOIN boats b ON a.boat_id = b.id
    LEFT JOIN staff s ON a.captain_id = s.id
    LEFT JOIN bookings bk ON bk.availability_id = a.id AND bk.status IN ('confirmed', 'completed')
    WHERE t.location_id = p_location_id
      AND a.date BETWEEN p_start_date AND p_end_date
    GROUP BY a.id, a.date, a.start_time, t.name, t.id, b.name, b.id, b.capacity, s.name, s.id
  ),
  totals AS (
    SELECT
      COUNT(DISTINCT availability_id) as tours,
      SUM(guests) as total_guests,
      AVG(CASE WHEN capacity > 0 THEN (guests::DECIMAL / capacity) * 100 ELSE 0 END) as avg_util
    FROM tour_data
  ),
  boats AS (
    SELECT jsonb_agg(jsonb_build_object(
      'name', boat_name,
      'tours', boat_tours,
      'guests', boat_guests,
      'utilization', boat_util
    )) as data
    FROM (
      SELECT
        boat_name,
        COUNT(*) as boat_tours,
        SUM(guests) as boat_guests,
        ROUND(AVG(CASE WHEN capacity > 0 THEN (guests::DECIMAL / capacity) * 100 ELSE 0 END), 1) as boat_util
      FROM tour_data
      WHERE boat_name IS NOT NULL
      GROUP BY boat_name
      ORDER BY boat_tours DESC
    ) t
  ),
  captains AS (
    SELECT jsonb_agg(jsonb_build_object(
      'name', captain_name,
      'tours', captain_tours,
      'guests', captain_guests
    )) as data
    FROM (
      SELECT
        captain_name,
        COUNT(*) as captain_tours,
        SUM(guests) as captain_guests
      FROM tour_data
      WHERE captain_name IS NOT NULL
      GROUP BY captain_name
      ORDER BY captain_tours DESC
    ) t
  ),
  hours AS (
    SELECT jsonb_agg(jsonb_build_object(
      'hour', hour_label,
      'bookings', cnt
    ) ORDER BY start_hour) as data
    FROM (
      SELECT
        EXTRACT(HOUR FROM start_time) as start_hour,
        TO_CHAR(start_time, 'HH:MI AM') as hour_label,
        COUNT(*) as cnt
      FROM tour_data
      GROUP BY start_hour, hour_label
    ) t
  ),
  days AS (
    SELECT jsonb_agg(jsonb_build_object(
      'day', day_name,
      'bookings', cnt
    ) ORDER BY day_num) as data
    FROM (
      SELECT
        EXTRACT(DOW FROM date) as day_num,
        TO_CHAR(date, 'Day') as day_name,
        COUNT(*) as cnt
      FROM tour_data
      GROUP BY day_num, day_name
    ) t
  )
  SELECT
    t.tours::INTEGER,
    t.total_guests::INTEGER,
    ROUND(COALESCE(t.avg_util, 0), 1),
    COALESCE(b.data, '[]'::JSONB),
    COALESCE(c.data, '[]'::JSONB),
    COALESCE(h.data, '[]'::JSONB),
    COALESCE(d.data, '[]'::JSONB)
  FROM totals t
  CROSS JOIN boats b
  CROSS JOIN captains c
  CROSS JOIN hours h
  CROSS JOIN days d;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage their location reports"
  ON scheduled_reports FOR ALL
  USING (location_id IN (
    SELECT location_id FROM staff WHERE user_id = auth.uid()
  ));

CREATE POLICY "Staff can view their location report history"
  ON report_history FOR SELECT
  USING (location_id IN (
    SELECT location_id FROM staff WHERE user_id = auth.uid()
  ));

CREATE POLICY "Staff can view their location analytics"
  ON analytics_snapshots FOR SELECT
  USING (location_id IN (
    SELECT location_id FROM staff WHERE user_id = auth.uid()
  ));
