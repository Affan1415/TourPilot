import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { t, Locale, defaultLocale } from '@/lib/i18n';

interface TourReminderEmailProps {
  customerName: string;
  bookingReference: string;
  tourName: string;
  tourDate: string;
  tourTime: string;
  guestCount: number;
  meetingPoint?: string;
  waiverSigned: boolean;
  waiverUrl: string;
  bookingUrl: string;
  companyName?: string;
  companyPhone?: string;
  locale?: Locale;
}

export const TourReminderEmail = ({
  customerName = 'John',
  bookingReference = 'BK26030412',
  tourName = 'Sunset Sailing Cruise',
  tourDate = 'Tomorrow, March 10',
  tourTime = '4:00 PM',
  guestCount = 2,
  meetingPoint = '123 Marina Drive, Dock B',
  waiverSigned = false,
  waiverUrl = 'https://example.com/waiver',
  bookingUrl = 'https://example.com/booking',
  companyName = 'TourPilot',
  companyPhone = '(555) 123-4567',
  locale = defaultLocale,
}: TourReminderEmailProps) => {
  // Translation helper for this email
  const e = (key: string, params?: Record<string, string | number>) =>
    t(locale, `email.tourReminder.${key}`, params);

  const previewText = e('subject', { tourName, date: tourDate });

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logo}>{companyName}</Heading>
          </Section>

          {/* Countdown Badge */}
          <Section style={countdownBadge}>
            <Text style={countdownIcon}>🎉</Text>
            <Heading style={countdownText}>{e('title')}</Heading>
          </Section>

          {/* Greeting */}
          <Section style={content}>
            <Text style={paragraph}>{e('greeting', { name: customerName })}</Text>
            <Text style={paragraph}>
              {e('reminderMessage')}
            </Text>
          </Section>

          {/* Tour Details Card */}
          <Section style={tourCard}>
            <Heading style={tourName_style}>{tourName}</Heading>

            <div style={dateTimeRow}>
              <div style={dateBox}>
                <Text style={dateLabel}>📅 {e('dateLabel')}</Text>
                <Text style={dateValue}>{tourDate}</Text>
              </div>
              <div style={timeBox}>
                <Text style={dateLabel}>🕐 {e('timeLabel')}</Text>
                <Text style={dateValue}>{tourTime}</Text>
              </div>
            </div>

            <div style={meetingBox}>
              <Text style={meetingLabel}>📍 {e('meetingPoint')}</Text>
              <Text style={meetingValue}>{meetingPoint}</Text>
            </div>

            <Text style={guestInfo}>
              {e('guestInfo', { count: guestCount, reference: bookingReference })}
            </Text>
          </Section>

          {/* Waiver Warning (if not signed) */}
          {!waiverSigned && (
            <Section style={waiverWarning}>
              <Text style={warningIcon}>⚠️</Text>
              <Heading style={warningTitle}>{e('waiverNotSigned')}</Heading>
              <Text style={warningText}>
                {e('waiverWarning')}
              </Text>
              <Button style={waiverButton} href={waiverUrl}>
                {e('signWaiverNow')}
              </Button>
            </Section>
          )}

          {/* Waiver Complete (if signed) */}
          {waiverSigned && (
            <Section style={waiverComplete}>
              <Text style={checkIcon}>✓</Text>
              <Text style={completeText}>{e('allWaiversSigned')}</Text>
            </Section>
          )}

          {/* Checklist */}
          <Section style={checklistSection}>
            <Heading style={checklistTitle}>{e('checklist')}</Heading>
            <div style={checklistItem}>
              <Text style={checkbox}>☐</Text>
              <Text style={checklistText}>{e('checkItem1')}</Text>
            </div>
            <div style={checklistItem}>
              <Text style={checkbox}>☐</Text>
              <Text style={checklistText}>{e('checkItem2')}</Text>
            </div>
            <div style={checklistItem}>
              <Text style={checkbox}>☐</Text>
              <Text style={checklistText}>{e('checkItem3')}</Text>
            </div>
            <div style={checklistItem}>
              <Text style={checkbox}>☐</Text>
              <Text style={checklistText}>{e('checkItem4')}</Text>
            </div>
            <div style={checklistItem}>
              <Text style={checkbox}>☐</Text>
              <Text style={checklistText}>{e('checkItem5')}</Text>
            </div>
          </Section>

          {/* Weather Note */}
          <Section style={weatherNote}>
            <Text style={weatherText}>
              🌤️ {e('weatherNote')}
            </Text>
          </Section>

          {/* CTA Button */}
          <Section style={buttonSection}>
            <Button style={primaryButton} href={bookingUrl}>
              {e('viewBookingDetails')}
            </Button>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              {e('needChanges', { phone: companyPhone })}
            </Text>
            <Text style={footerText}>
              {companyName} | 123 Marina Drive, Coastal City, FL 33139
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default TourReminderEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  maxWidth: '600px',
  borderRadius: '8px',
  overflow: 'hidden' as const,
};

const header = {
  backgroundColor: '#0ea5e9',
  padding: '24px',
  textAlign: 'center' as const,
};

const logo = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0',
};

const countdownBadge = {
  backgroundColor: '#dbeafe',
  padding: '24px',
  textAlign: 'center' as const,
};

const countdownIcon = {
  fontSize: '32px',
  margin: '0 0 8px',
};

const countdownText = {
  color: '#1e40af',
  fontSize: '22px',
  fontWeight: '600',
  margin: '0',
};

const content = {
  padding: '24px 32px 0',
};

const paragraph = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
};

const tourCard = {
  backgroundColor: '#0ea5e9',
  borderRadius: '12px',
  padding: '24px',
  margin: '16px 32px 24px',
  color: '#ffffff',
};

const tourName_style = {
  color: '#ffffff',
  fontSize: '20px',
  fontWeight: '700',
  margin: '0 0 16px',
  textAlign: 'center' as const,
};

const dateTimeRow = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '16px',
};

const dateBox = {
  flex: '1',
  textAlign: 'center' as const,
};

const timeBox = {
  flex: '1',
  textAlign: 'center' as const,
};

const dateLabel = {
  color: 'rgba(255,255,255,0.8)',
  fontSize: '12px',
  margin: '0 0 4px',
};

const dateValue = {
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
};

const meetingBox = {
  backgroundColor: 'rgba(255,255,255,0.15)',
  borderRadius: '8px',
  padding: '12px',
  marginBottom: '12px',
};

const meetingLabel = {
  color: 'rgba(255,255,255,0.8)',
  fontSize: '12px',
  margin: '0 0 4px',
};

const meetingValue = {
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0',
};

const guestInfo = {
  color: 'rgba(255,255,255,0.8)',
  fontSize: '12px',
  textAlign: 'center' as const,
  margin: '0',
};

const waiverWarning = {
  backgroundColor: '#fef2f2',
  padding: '24px 32px',
  margin: '0 32px 24px',
  borderRadius: '8px',
  textAlign: 'center' as const,
  border: '1px solid #fecaca',
};

const warningIcon = {
  fontSize: '24px',
  margin: '0 0 8px',
};

const warningTitle = {
  color: '#991b1b',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 8px',
};

const warningText = {
  color: '#991b1b',
  fontSize: '14px',
  margin: '0 0 16px',
};

const waiverButton = {
  backgroundColor: '#dc2626',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  padding: '10px 24px',
};

const waiverComplete = {
  backgroundColor: '#ecfdf5',
  padding: '16px 32px',
  margin: '0 32px 24px',
  borderRadius: '8px',
  textAlign: 'center' as const,
  border: '1px solid #a7f3d0',
};

const checkIcon = {
  backgroundColor: '#10b981',
  color: '#ffffff',
  fontSize: '16px',
  width: '28px',
  height: '28px',
  lineHeight: '28px',
  borderRadius: '50%',
  display: 'inline-block',
  margin: '0 8px 0 0',
};

const completeText = {
  color: '#065f46',
  fontSize: '14px',
  fontWeight: '500',
  display: 'inline',
  margin: '0',
};

const checklistSection = {
  padding: '0 32px 24px',
};

const checklistTitle = {
  color: '#0f172a',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 16px',
};

const checklistItem = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: '8px',
};

const checkbox = {
  fontSize: '16px',
  marginRight: '8px',
  color: '#94a3b8',
};

const checklistText = {
  color: '#374151',
  fontSize: '14px',
  margin: '0',
};

const weatherNote = {
  backgroundColor: '#fefce8',
  padding: '12px 24px',
  margin: '0 32px 24px',
  borderRadius: '8px',
};

const weatherText = {
  color: '#713f12',
  fontSize: '13px',
  margin: '0',
  textAlign: 'center' as const,
};

const buttonSection = {
  textAlign: 'center' as const,
  padding: '0 32px 24px',
};

const primaryButton = {
  backgroundColor: '#0ea5e9',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  padding: '12px 32px',
};

const hr = {
  borderColor: '#e2e8f0',
  margin: '0',
};

const footer = {
  padding: '24px 32px',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#64748b',
  fontSize: '12px',
  margin: '0 0 8px',
};
