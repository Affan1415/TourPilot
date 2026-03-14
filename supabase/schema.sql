-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tours Table
CREATE TABLE tours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  short_description VARCHAR(500),
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  base_price DECIMAL(10, 2) NOT NULL,
  max_capacity INTEGER NOT NULL DEFAULT 10,
  min_guests INTEGER NOT NULL DEFAULT 1,
  images TEXT[] DEFAULT '{}',
  location VARCHAR(255),
  meeting_point TEXT,
  what_to_bring TEXT[] DEFAULT '{}',
  includes TEXT[] DEFAULT '{}',
  requires_waiver BOOLEAN DEFAULT true,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Availabilities Table
CREATE TABLE availabilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  price_override DECIMAL(10, 2),
  capacity_override INTEGER,
  booked_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'full', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tour_id, date, start_time)
);

-- Customers Table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  country_code VARCHAR(10) DEFAULT '+1',
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  total_bookings INTEGER DEFAULT 0,
  total_spent DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings Table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_reference VARCHAR(20) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  availability_id UUID NOT NULL REFERENCES availabilities(id),
  guest_count INTEGER NOT NULL DEFAULT 1,
  total_price DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show')),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  payment_intent_id VARCHAR(255),
  checked_in BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Booking Guests Table
CREATE TABLE booking_guests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  is_primary BOOLEAN DEFAULT false,
  checked_in BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Waiver Templates Table
CREATE TABLE waiver_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Waivers Table
CREATE TABLE waivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES booking_guests(id) ON DELETE CASCADE,
  waiver_template_id UUID NOT NULL REFERENCES waiver_templates(id),
  signature_url TEXT,
  signed_at TIMESTAMPTZ,
  ip_address VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(booking_id, guest_id)
);

-- Staff Table
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  role VARCHAR(20) DEFAULT 'guide' CHECK (role IN ('admin', 'manager', 'captain', 'guide', 'front_desk')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Availability Staff Assignment
CREATE TABLE availability_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  availability_id UUID NOT NULL REFERENCES availabilities(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  role VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(availability_id, staff_id)
);

-- Communications Log
CREATE TABLE communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'sms', 'whatsapp')),
  template_type VARCHAR(50) NOT NULL,
  subject VARCHAR(255),
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_availabilities_date ON availabilities(date);
CREATE INDEX idx_availabilities_tour_date ON availabilities(tour_id, date);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_availability ON bookings(availability_id);
CREATE INDEX idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_waivers_booking ON waivers(booking_id);
CREATE INDEX idx_waivers_status ON waivers(status);
CREATE INDEX idx_communications_customer ON communications(customer_id);

-- Function to generate booking reference
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TRIGGER AS $$
BEGIN
  NEW.booking_reference := 'BK' || TO_CHAR(NOW(), 'YYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for booking reference
CREATE TRIGGER set_booking_reference
  BEFORE INSERT ON bookings
  FOR EACH ROW
  WHEN (NEW.booking_reference IS NULL)
  EXECUTE FUNCTION generate_booking_reference();

-- Function to update availability booked count
CREATE OR REPLACE FUNCTION update_availability_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status != 'cancelled' THEN
    UPDATE availabilities
    SET booked_count = booked_count + NEW.guest_count
    WHERE id = NEW.availability_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
      UPDATE availabilities
      SET booked_count = booked_count - OLD.guest_count
      WHERE id = NEW.availability_id;
    ELSIF OLD.status = 'cancelled' AND NEW.status != 'cancelled' THEN
      UPDATE availabilities
      SET booked_count = booked_count + NEW.guest_count
      WHERE id = NEW.availability_id;
    ELSIF OLD.guest_count != NEW.guest_count AND NEW.status != 'cancelled' THEN
      UPDATE availabilities
      SET booked_count = booked_count - OLD.guest_count + NEW.guest_count
      WHERE id = NEW.availability_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status != 'cancelled' THEN
    UPDATE availabilities
    SET booked_count = booked_count - OLD.guest_count
    WHERE id = OLD.availability_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for availability count
CREATE TRIGGER booking_availability_count
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_availability_count();

-- Function to update customer stats
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.payment_status = 'paid' THEN
    UPDATE customers
    SET total_bookings = total_bookings + 1,
        total_spent = total_spent + NEW.total_price
    WHERE id = NEW.customer_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.payment_status != 'paid' AND NEW.payment_status = 'paid' THEN
      UPDATE customers
      SET total_bookings = total_bookings + 1,
          total_spent = total_spent + NEW.total_price
      WHERE id = NEW.customer_id;
    ELSIF OLD.payment_status = 'paid' AND NEW.payment_status = 'refunded' THEN
      UPDATE customers
      SET total_bookings = total_bookings - 1,
          total_spent = total_spent - NEW.total_price
      WHERE id = NEW.customer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for customer stats
CREATE TRIGGER booking_customer_stats
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_stats();

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER tours_updated_at BEFORE UPDATE ON tours FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER waiver_templates_updated_at BEFORE UPDATE ON waiver_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER boats_updated_at BEFORE UPDATE ON boats FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insert default waiver template
INSERT INTO waiver_templates (name, content, is_active) VALUES (
  'Standard Liability Waiver',
  '<h2>Release of Liability and Assumption of Risk Agreement</h2>
  <p>I, the undersigned, acknowledge that I am voluntarily participating in activities provided by the tour operator.</p>
  <h3>Assumption of Risk</h3>
  <p>I understand and acknowledge that the activities I am about to engage in carry inherent risks, hazards, and dangers that may result in injury, illness, death, or property damage.</p>
  <h3>Release of Liability</h3>
  <p>In consideration of being permitted to participate in these activities, I hereby release, waive, discharge, and covenant not to sue the tour operator, its owners, officers, employees, guides, and agents from any and all liability, claims, demands, actions, or causes of action arising out of or related to any loss, damage, or injury that may be sustained by me.</p>
  <h3>Medical Authorization</h3>
  <p>I authorize the tour operator to obtain emergency medical treatment for me if necessary.</p>
  <h3>Acknowledgment</h3>
  <p>I have read this agreement, fully understand its terms, and understand that I am giving up substantial rights by signing it. I sign it freely and voluntarily without any inducement.</p>',
  true
);

-- Boats Table
CREATE TABLE boats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  registration_number VARCHAR(100),
  boat_type VARCHAR(100),
  capacity INTEGER NOT NULL DEFAULT 10,
  description TEXT,
  images TEXT[] DEFAULT '{}',
  features TEXT[] DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),
  maintenance_notes TEXT,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add boat_id to tours (default boat for a tour)
ALTER TABLE tours ADD COLUMN boat_id UUID REFERENCES boats(id) ON DELETE SET NULL;

-- Add boat_id to availabilities (can override tour's default boat per slot)
ALTER TABLE availabilities ADD COLUMN boat_id UUID REFERENCES boats(id) ON DELETE SET NULL;

-- Indexes for boats
CREATE INDEX idx_boats_status ON boats(status);
CREATE INDEX idx_tours_boat ON tours(boat_id);
CREATE INDEX idx_availabilities_boat ON availabilities(boat_id);

-- RLS Policies
ALTER TABLE boats ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE availabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiver_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

-- Public read access for boats
CREATE POLICY "Active boats are viewable by everyone" ON boats FOR SELECT USING (status = 'active');

-- Staff full access to boats
CREATE POLICY "Staff full access to boats" ON boats FOR ALL USING (
  EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid() AND is_active = true)
);

-- Public read access for tours
CREATE POLICY "Tours are viewable by everyone" ON tours FOR SELECT USING (status = 'active');

-- Public read access for availabilities
CREATE POLICY "Availabilities are viewable by everyone" ON availabilities FOR SELECT USING (true);

-- Public access for waiver templates
CREATE POLICY "Active waiver templates are viewable" ON waiver_templates FOR SELECT USING (is_active = true);

-- Staff can do everything
CREATE POLICY "Staff full access to tours" ON tours FOR ALL USING (
  EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Staff full access to availabilities" ON availabilities FOR ALL USING (
  EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Staff full access to customers" ON customers FOR ALL USING (
  EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Staff full access to bookings" ON bookings FOR ALL USING (
  EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Staff full access to booking_guests" ON booking_guests FOR ALL USING (
  EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Staff full access to waivers" ON waivers FOR ALL USING (
  EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Staff full access to waiver_templates" ON waiver_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Staff full access to staff" ON staff FOR ALL USING (
  EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid() AND role IN ('admin', 'manager') AND is_active = true)
);

CREATE POLICY "Staff full access to availability_staff" ON availability_staff FOR ALL USING (
  EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Staff full access to communications" ON communications FOR ALL USING (
  EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid() AND is_active = true)
);

-- Public insert for bookings (for checkout)
CREATE POLICY "Anyone can create bookings" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can create customers" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can create booking_guests" ON booking_guests FOR INSERT WITH CHECK (true);

-- Public waiver signing
CREATE POLICY "Anyone can view their waiver" ON waivers FOR SELECT USING (true);
CREATE POLICY "Anyone can sign waivers" ON waivers FOR UPDATE USING (true);
