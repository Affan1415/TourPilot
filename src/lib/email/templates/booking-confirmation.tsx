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
}: BookingConfirmationEmailProps) => {
  const previewText = `Your booking for ${tourName} is confirmed!`;

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
            <Heading style={successText}>Booking Confirmed!</Heading>
          </Section>

          {/* Greeting */}
          <Section style={content}>
            <Text style={paragraph}>Hi {customerName},</Text>
            <Text style={paragraph}>
              Thank you for booking with us! Your adventure is confirmed and we can't wait to see you.
            </Text>
          </Section>

          {/* Booking Details Card */}
          <Section style={bookingCard}>
            <Text style={bookingRefLabel}>Booking Reference</Text>
            <Text style={bookingRef}>{bookingReference}</Text>

            <Hr style={divider} />

            <table style={detailsTable}>
              <tbody>
                <tr>
                  <td style={detailLabel}>Tour</td>
                  <td style={detailValue}>{tourName}</td>
                </tr>
                <tr>
                  <td style={detailLabel}>Date</td>
                  <td style={detailValue}>{tourDate}</td>
                </tr>
                <tr>
                  <td style={detailLabel}>Time</td>
                  <td style={detailValue}>{tourTime}</td>
                </tr>
                <tr>
                  <td style={detailLabel}>Guests</td>
                  <td style={detailValue}>{guestCount} {guestCount === 1 ? 'person' : 'people'}</td>
                </tr>
                <tr>
                  <td style={detailLabel}>Total Paid</td>
                  <td style={detailValueBold}>${totalAmount.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Meeting Point */}
          {meetingPoint && (
            <Section style={meetingSection}>
              <Text style={meetingTitle}>📍 Meeting Point</Text>
              <Text style={meetingAddress}>{meetingPoint}</Text>
            </Section>
          )}

          {/* Important: Waiver CTA */}
          <Section style={waiverSection}>
            <Heading style={waiverTitle}>Important: Sign Your Waiver</Heading>
            <Text style={waiverText}>
              All guests must sign a digital waiver before the tour. Please complete this as soon as possible.
            </Text>
            <Button style={primaryButton} href={waiverUrl}>
              Sign Waiver Now
            </Button>
          </Section>

          {/* View Booking Button */}
          <Section style={buttonSection}>
            <Button style={secondaryButton} href={bookingUrl}>
              View Booking Details
            </Button>
          </Section>

          {/* What to Bring */}
          <Section style={tipsSection}>
            <Heading style={tipsTitle}>What to Bring</Heading>
            <Text style={tipItem}>• Sunscreen and sunglasses</Text>
            <Text style={tipItem}>• Comfortable clothing</Text>
            <Text style={tipItem}>• Camera (optional)</Text>
            <Text style={tipItem}>• Light jacket for evening tours</Text>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Questions? Reply to this email or call us at (555) 123-4567
            </Text>
            <Text style={footerText}>
              {companyName} | 123 Marina Drive, Coastal City, FL 33139
            </Text>
            <Text style={footerLinks}>
              <Link href="#" style={footerLink}>Terms</Link>
              {' • '}
              <Link href="#" style={footerLink}>Privacy</Link>
              {' • '}
              <Link href="#" style={footerLink}>Unsubscribe</Link>
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
