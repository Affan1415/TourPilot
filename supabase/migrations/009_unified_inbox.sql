-- Migration: Unified Inbox for v2.2
-- Centralizes all customer communications from Email, WhatsApp, Instagram, SMS, Messenger

-- Communication channels enum
CREATE TYPE communication_channel AS ENUM (
  'email',
  'whatsapp',
  'instagram',
  'sms',
  'messenger',
  'internal'
);

-- Message direction
CREATE TYPE message_direction AS ENUM (
  'inbound',
  'outbound'
);

-- Message status
CREATE TYPE message_status AS ENUM (
  'pending',
  'sent',
  'delivered',
  'read',
  'failed'
);

-- Conversation status
CREATE TYPE conversation_status AS ENUM (
  'open',
  'pending',
  'resolved',
  'spam'
);

-- Connected accounts for OAuth integrations
CREATE TABLE connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  channel communication_channel NOT NULL,
  account_name VARCHAR(255), -- e.g., email address, phone number, page name
  account_id VARCHAR(255), -- external platform account ID
  access_token TEXT, -- encrypted OAuth token
  refresh_token TEXT, -- encrypted refresh token
  token_expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}', -- channel-specific settings
  is_active BOOLEAN DEFAULT TRUE,
  connected_by UUID REFERENCES staff(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(location_id, channel, account_id)
);

-- Conversations (threads)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  channel communication_channel NOT NULL,
  external_thread_id VARCHAR(255), -- ID from external platform
  subject VARCHAR(500),
  status conversation_status DEFAULT 'open',
  priority INTEGER DEFAULT 0, -- 0=normal, 1=high, 2=urgent
  assigned_to UUID REFERENCES staff(id),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_preview TEXT,
  unread_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}', -- channel-specific data
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  external_message_id VARCHAR(255), -- ID from external platform
  direction message_direction NOT NULL,
  status message_status DEFAULT 'pending',
  sender_type VARCHAR(20) NOT NULL, -- 'customer', 'staff', 'system'
  sender_id UUID, -- staff ID if outbound
  sender_name VARCHAR(255),
  sender_email VARCHAR(255),
  sender_phone VARCHAR(50),
  content TEXT NOT NULL,
  content_type VARCHAR(50) DEFAULT 'text', -- text, html, image, video, audio, file
  attachments JSONB DEFAULT '[]', -- [{name, url, type, size}]
  metadata JSONB DEFAULT '{}', -- channel-specific data (e.g., email headers)
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message templates for quick replies
CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50), -- greeting, confirmation, follow-up, etc.
  channels communication_channel[] DEFAULT '{email,whatsapp,sms}',
  subject VARCHAR(500), -- for email
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}', -- {{customer_name}}, {{booking_date}}, etc.
  is_active BOOLEAN DEFAULT TRUE,
  use_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Canned responses / quick replies
CREATE TABLE quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  shortcut VARCHAR(50) NOT NULL, -- e.g., /thanks, /hours
  content TEXT NOT NULL,
  channels communication_channel[] DEFAULT '{email,whatsapp,sms,instagram,messenger}',
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(location_id, shortcut)
);

-- Webhook events log for debugging
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel communication_channel NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_conversations_location ON conversations(location_id);
CREATE INDEX idx_conversations_customer ON conversations(customer_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_assigned ON conversations(assigned_to);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX idx_conversations_channel ON conversations(channel);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_messages_external ON messages(external_message_id);

CREATE INDEX idx_connected_accounts_location ON connected_accounts(location_id);
CREATE INDEX idx_connected_accounts_channel ON connected_accounts(channel);

CREATE INDEX idx_webhook_events_processed ON webhook_events(processed) WHERE NOT processed;

-- Function to update conversation on new message
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100),
    unread_count = CASE
      WHEN NEW.direction = 'inbound' THEN unread_count + 1
      ELSE unread_count
    END,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_on_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_on_message();

-- Function to log customer activity when message sent
CREATE OR REPLACE FUNCTION log_message_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_channel TEXT;
BEGIN
  SELECT customer_id, channel::TEXT INTO v_customer_id, v_channel
  FROM conversations WHERE id = NEW.conversation_id;

  IF v_customer_id IS NOT NULL THEN
    INSERT INTO customer_activities (customer_id, activity_type, title, description, metadata)
    VALUES (
      v_customer_id,
      CASE WHEN NEW.direction = 'inbound' THEN 'message_received' ELSE 'message_sent' END,
      CASE WHEN NEW.direction = 'inbound'
        THEN 'Received ' || v_channel || ' message'
        ELSE 'Sent ' || v_channel || ' message'
      END,
      LEFT(NEW.content, 200),
      jsonb_build_object('channel', v_channel, 'message_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_message_activity
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION log_message_activity();

-- RLS Policies
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;

-- Policies for staff to access their location's data
CREATE POLICY "Staff can view their location connected accounts"
  ON connected_accounts FOR SELECT
  USING (location_id IN (
    SELECT location_id FROM staff WHERE user_id = auth.uid()
  ));

CREATE POLICY "Staff can view their location conversations"
  ON conversations FOR SELECT
  USING (location_id IN (
    SELECT location_id FROM staff WHERE user_id = auth.uid()
  ));

CREATE POLICY "Staff can manage their location conversations"
  ON conversations FOR ALL
  USING (location_id IN (
    SELECT location_id FROM staff WHERE user_id = auth.uid()
  ));

CREATE POLICY "Staff can view messages in their conversations"
  ON messages FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM conversations WHERE location_id IN (
      SELECT location_id FROM staff WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Staff can send messages"
  ON messages FOR INSERT
  WITH CHECK (conversation_id IN (
    SELECT id FROM conversations WHERE location_id IN (
      SELECT location_id FROM staff WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Staff can use their location templates"
  ON message_templates FOR SELECT
  USING (location_id IN (
    SELECT location_id FROM staff WHERE user_id = auth.uid()
  ));

CREATE POLICY "Staff can use their location quick replies"
  ON quick_replies FOR SELECT
  USING (location_id IN (
    SELECT location_id FROM staff WHERE user_id = auth.uid()
  ));

-- Insert default templates
INSERT INTO message_templates (name, category, channels, subject, content, variables) VALUES
('Booking Confirmation', 'confirmation', '{email,whatsapp,sms}', 'Your booking is confirmed!',
 'Hi {{customer_name}}, your booking for {{tour_name}} on {{booking_date}} at {{booking_time}} is confirmed! Your reference number is {{booking_reference}}. See you soon!',
 '{customer_name,tour_name,booking_date,booking_time,booking_reference}'),
('Booking Reminder', 'reminder', '{email,whatsapp,sms}', 'Reminder: Your tour is tomorrow!',
 'Hi {{customer_name}}, just a friendly reminder that your {{tour_name}} tour is scheduled for tomorrow at {{booking_time}}. Please arrive 15 minutes early. Looking forward to seeing you!',
 '{customer_name,tour_name,booking_time}'),
('Thank You', 'follow-up', '{email,whatsapp}', 'Thank you for joining us!',
 'Hi {{customer_name}}, thank you for joining our {{tour_name}} tour! We hope you had a wonderful experience. We''d love to hear your feedback - please leave us a review!',
 '{customer_name,tour_name}'),
('Weather Update', 'notification', '{email,whatsapp,sms}', 'Important: Weather update for your tour',
 'Hi {{customer_name}}, due to weather conditions, we need to provide you with an update about your {{tour_name}} tour on {{booking_date}}. Please contact us for more details.',
 '{customer_name,tour_name,booking_date}');

-- Insert default quick replies
INSERT INTO quick_replies (shortcut, content) VALUES
('/thanks', 'Thank you for your message! We''ll get back to you shortly.'),
('/hours', 'Our office hours are Monday-Saturday, 8 AM - 6 PM. Tours run daily, weather permitting.'),
('/location', 'We''re located at the marina. Here''s a link to the map: [Map Link]'),
('/waiver', 'Please complete your waiver before the tour: [Waiver Link]'),
('/cancel', 'We''re sorry to hear you need to cancel. Please note our cancellation policy: Full refund for cancellations 24+ hours before the tour.'),
('/reschedule', 'We''d be happy to reschedule your booking. What date and time works best for you?');
