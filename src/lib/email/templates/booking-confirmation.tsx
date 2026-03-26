import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { t, Locale, defaultLocale } from '@/lib/i18n';

interface BookingConfirmationEmailProps {
  customerName: string;
  bookingReference: string;
  tourName: string;
  tourDate: string;
  tourTime: string;
  guestCount: number;
  totalAmount: number;
  meetingPoint?: string;
  waiverUrl: string;
  bookingUrl: string;
  companyName?: string;
  locale?: Locale;
}

export const BookingConfirmationEmail = ({
  customerName = 'John',
  bookingReference = 'BK26030412',
  tourName = 'Sunset Sailing Cruise',
  tourDate = 'March 10, 2026',
  tourTime = '4:00 PM',
  guestCount = 2,
  totalAmount = 198,
  meetingPoint = '123 Marina Drive, Dock B',
  waiverUrl = 'https://example.com/waiver',
  bookingUrl = 'https://example.com/booking',
  companyName = 'TourPilot',
  locale = defaultLocale,
}: BookingConfirmationEmailProps) => {
  // Translation helper for this email
  const e = (key: string, params?: Record<string, string | number>) =>
    t(locale, `email.bookingConfirmation.${key}`, params);

  const previewText = e('subject', { tourName });

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

          {/* Success Badge */}
          <Section style={successBadge}>
            <Text style={successIcon}>✓</Text>
            <Heading style={successText}>{e('title')}</Heading>
          </Section>

          {/* Greeting */}
          <Section style={content}>
            <Text style={paragraph}>{e('greeting', { name: customerName })}</Text>
            <Text style={paragraph}>
              {e('thankYou')}
            </Text>
          </Section>

          {/* Booking Details Card */}
          <Section style={bookingCard}>
            <Text style={bookingRefLabel}>{e('bookingReference')}</Text>
            <Text style={bookingRef}>{bookingReference}</Text>

            <Hr style={divider} />

            <table style={detailsTable}>
              <tbody>
                <tr>
                  <td style={detailLabel}>{e('tour')}</td>
                  <td style={detailValue}>{tourName}</td>
                </tr>
                <tr>
                  <td style={detailLabel}>{e('date')}</td>
                  <td style={detailValue}>{tourDate}</td>
                </tr>
                <tr>
                  <td style={detailLabel}>{e('time')}</td>
                  <td style={detailValue}>{tourTime}</td>
                </tr>
                <tr>
                  <td style={detailLabel}>{e('guests')}</td>
                  <td style={detailValue}>{guestCount} {guestCount === 1 ? e('person') : e('people')}</td>
                </tr>
                <tr>
                  <td style={detailLabel}>{e('totalPaid')}</td>
                  <td style={detailValueBold}>${totalAmount.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Meeting Point */}
          {meetingPoint && (
            <Section style={meetingSection}>
              <Text style={meetingTitle}>📍 {e('meetingPoint')}</Text>
              <Text style={meetingAddress}>{meetingPoint}</Text>
            </Section>
          )}

          {/* Important: Waiver CTA */}
          <Section style={waiverSection}>
            <Heading style={waiverTitle}>{e('importantWaiver')}</Heading>
            <Text style={waiverText}>
              {e('waiverMessage')}
            </Text>
            <Button style={primaryButton} href={waiverUrl}>
              {e('signWaiverNow')}
            </Button>
          </Section>

          {/* View Booking Button */}
          <Section style={buttonSection}>
            <Button style={secondaryButton} href={bookingUrl}>
              {e('viewBookingDetails')}
            </Button>
          </Section>

          {/* What to Bring */}
          <Section style={tipsSection}>
            <Heading style={tipsTitle}>{e('whatToBring')}</Heading>
            <Text style={tipItem}>• {e('bringItem1')}</Text>
            <Text style={tipItem}>• {e('bringItem2')}</Text>
            <Text style={tipItem}>• {e('bringItem3')}</Text>
            <Text style={tipItem}>• {e('bringItem4')}</Text>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              {e('questions', { phone: '(555) 123-4567' })}
            </Text>
            <Text style={footerText}>
              {companyName} | 123 Marina Drive, Coastal City, FL 33139
            </Text>
            <Text style={footerLinks}>
              <Link href="#" style={footerLink}>{e('terms')}</Link>
              {' • '}
              <Link href="#" style={footerLink}>{e('privacy')}</Link>
              {' • '}
              <Link href="#" style={footerLink}>{e('unsubscribe')}</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default BookingConfirmationEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
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

const successBadge = {
  backgroundColor: '#ecfdf5',
  padding: '24px',
  textAlign: 'center' as const,
};

const successIcon = {
  backgroundColor: '#10b981',
  color: '#ffffff',
  fontSize: '24px',
  width: '48px',
  height: '48px',
  lineHeight: '48px',
  borderRadius: '50%',
  display: 'inline-block',
  margin: '0 0 12px 0',
};

const successText = {
  color: '#065f46',
  fontSize: '24px',
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

const bookingCard = {
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 32px',
  border: '1px solid #e2e8f0',
};

const bookingRefLabel = {
  color: '#64748b',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 4px',
};

const bookingRef = {
  color: '#0f172a',
  fontSize: '24px',
  fontWeight: '700',
  fontFamily: 'monospace',
  margin: '0',
};

const divider = {
  borderColor: '#e2e8f0',
  margin: '16px 0',
};

const detailsTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const detailLabel = {
  color: '#64748b',
  fontSize: '14px',
  padding: '8px 0',
  width: '40%',
};

const detailValue = {
  color: '#0f172a',
  fontSize: '14px',
  fontWeight: '500',
  padding: '8px 0',
  textAlign: 'right' as const,
};

const detailValueBold = {
  color: '#0f172a',
  fontSize: '16px',
  fontWeight: '700',
  padding: '8px 0',
  textAlign: 'right' as const,
};

const meetingSection = {
  padding: '0 32px 24px',
};

const meetingTitle = {
  color: '#0f172a',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px',
};

const meetingAddress = {
  color: '#374151',
  fontSize: '14px',
  margin: '0',
  backgroundColor: '#f1f5f9',
  padding: '12px 16px',
  borderRadius: '6px',
};

const waiverSection = {
  backgroundColor: '#fef3c7',
  padding: '24px 32px',
  margin: '0 32px 24px',
  borderRadius: '8px',
  textAlign: 'center' as const,
};

const waiverTitle = {
  color: '#92400e',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 8px',
};

const waiverText = {
  color: '#92400e',
  fontSize: '14px',
  margin: '0 0 16px',
};

const primaryButton = {
  backgroundColor: '#0ea5e9',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
};

const buttonSection = {
  textAlign: 'center' as const,
  padding: '0 32px 24px',
};

const secondaryButton = {
  backgroundColor: '#ffffff',
  border: '2px solid #0ea5e9',
  borderRadius: '6px',
  color: '#0ea5e9',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '10px 24px',
};

const tipsSection = {
  padding: '0 32px 24px',
};

const tipsTitle = {
  color: '#0f172a',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px',
};

const tipItem = {
  color: '#374151',
  fontSize: '14px',
  margin: '0 0 6px',
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

const footerLinks = {
  color: '#64748b',
  fontSize: '12px',
  margin: '16px 0 0',
};

const footerLink = {
  color: '#64748b',
  textDecoration: 'underline',
};
