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

interface ReviewRequestEmailProps {
  customerName: string;
  tourName: string;
  tourDate: string;
  tripAdvisorUrl?: string;
  googleReviewUrl?: string;
  companyName?: string;
}

export const ReviewRequestEmail = ({
  customerName = 'John',
  tourName = 'Sunset Sailing Cruise',
  tourDate = 'March 10, 2026',
  tripAdvisorUrl = 'https://tripadvisor.com/review',
  googleReviewUrl = 'https://google.com/review',
  companyName = 'TourPilot',
}: ReviewRequestEmailProps) => {
  const previewText = `How was your ${tourName} experience?`;

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

          {/* Hero */}
          <Section style={heroSection}>
            <Text style={waveEmoji}>👋</Text>
            <Heading style={heroTitle}>How Was Your Adventure?</Heading>
            <Text style={heroSubtitle}>
              We hope you had an amazing time!
            </Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Text style={paragraph}>Hi {customerName},</Text>

            <Text style={paragraph}>
              Thank you for joining us on the <strong>{tourName}</strong> on {tourDate}.
              We truly hope you had an unforgettable experience!
            </Text>

            <Text style={paragraph}>
              Your feedback means the world to us and helps other travelers discover
              amazing adventures. Would you mind taking a moment to share your experience?
            </Text>
          </Section>

          {/* Star Rating Visual */}
          <Section style={starSection}>
            <Text style={starText}>⭐⭐⭐⭐⭐</Text>
            <Text style={starSubtext}>Your review makes a difference!</Text>
          </Section>

          {/* Review Buttons */}
          <Section style={buttonsSection}>
            {tripAdvisorUrl && (
              <Button style={tripAdvisorButton} href={tripAdvisorUrl}>
                <span style={buttonIcon}>🦉</span> Review on TripAdvisor
              </Button>
            )}

            {googleReviewUrl && (
              <Button style={googleButton} href={googleReviewUrl}>
                <span style={buttonIcon}>G</span> Review on Google
              </Button>
            )}
          </Section>

          {/* What to Include */}
          <Section style={tipsSection}>
            <Heading style={tipsTitle}>Tips for a Great Review</Heading>
            <div style={tipRow}>
              <Text style={tipIcon}>📸</Text>
              <Text style={tipText}>Share your favorite photos from the tour</Text>
            </div>
            <div style={tipRow}>
              <Text style={tipIcon}>✨</Text>
              <Text style={tipText}>Mention highlights like the crew, views, or activities</Text>
            </div>
            <div style={tipRow}>
              <Text style={tipIcon}>💡</Text>
              <Text style={tipText}>Include tips for future guests</Text>
            </div>
          </Section>

          {/* Thank You Note */}
          <Section style={thankYouSection}>
            <Text style={thankYouText}>
              Thank you for being part of our {companyName} family. We can't wait to
              welcome you back for your next adventure! 🌊
            </Text>
          </Section>

          {/* Discount Offer */}
          <Section style={discountSection}>
            <Heading style={discountTitle}>Book Again & Save!</Heading>
            <Text style={discountText}>
              Use code <strong style={discountCode}>COMEBACK15</strong> for 15% off your next booking
            </Text>
            <Button style={bookAgainButton} href="#">
              Browse Tours
            </Button>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              {companyName} | 123 Marina Drive, Coastal City, FL 33139
            </Text>
            <Text style={footerLinks}>
              <Link href="#" style={footerLink}>Our Tours</Link>
              {' • '}
              <Link href="#" style={footerLink}>Contact Us</Link>
              {' • '}
              <Link href="#" style={footerLink}>Unsubscribe</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default ReviewRequestEmail;

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

const heroSection = {
  backgroundColor: '#fef3c7',
  padding: '32px',
  textAlign: 'center' as const,
};

const waveEmoji = {
  fontSize: '48px',
  margin: '0 0 16px',
};

const heroTitle = {
  color: '#92400e',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0 0 8px',
};

const heroSubtitle = {
  color: '#b45309',
  fontSize: '16px',
  margin: '0',
};

const content = {
  padding: '32px 32px 16px',
};

const paragraph = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 0 16px',
};

const starSection = {
  textAlign: 'center' as const,
  padding: '0 32px 24px',
};

const starText = {
  fontSize: '36px',
  margin: '0 0 8px',
  letterSpacing: '4px',
};

const starSubtext = {
  color: '#64748b',
  fontSize: '14px',
  margin: '0',
};

const buttonsSection = {
  textAlign: 'center' as const,
  padding: '0 32px 32px',
};

const tripAdvisorButton = {
  backgroundColor: '#00af87',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  padding: '14px 28px',
  display: 'inline-block',
  marginBottom: '12px',
};

const googleButton = {
  backgroundColor: '#4285f4',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  padding: '14px 28px',
  display: 'inline-block',
};

const buttonIcon = {
  marginRight: '8px',
};

const tipsSection = {
  backgroundColor: '#f8fafc',
  padding: '24px 32px',
  margin: '0 32px 24px',
  borderRadius: '8px',
};

const tipsTitle = {
  color: '#0f172a',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 16px',
};

const tipRow = {
  display: 'flex',
  alignItems: 'flex-start',
  marginBottom: '12px',
};

const tipIcon = {
  fontSize: '16px',
  marginRight: '12px',
  flexShrink: 0,
};

const tipText = {
  color: '#374151',
  fontSize: '14px',
  margin: '0',
  lineHeight: '20px',
};

const thankYouSection = {
  padding: '0 32px 24px',
  textAlign: 'center' as const,
};

const thankYouText = {
  color: '#374151',
  fontSize: '15px',
  fontStyle: 'italic',
  lineHeight: '24px',
  margin: '0',
};

const discountSection = {
  backgroundColor: '#0ea5e9',
  padding: '24px 32px',
  textAlign: 'center' as const,
};

const discountTitle = {
  color: '#ffffff',
  fontSize: '20px',
  fontWeight: '600',
  margin: '0 0 8px',
};

const discountText = {
  color: 'rgba(255,255,255,0.9)',
  fontSize: '14px',
  margin: '0 0 16px',
};

const discountCode = {
  backgroundColor: 'rgba(255,255,255,0.2)',
  padding: '2px 8px',
  borderRadius: '4px',
  fontFamily: 'monospace',
  letterSpacing: '1px',
};

const bookAgainButton = {
  backgroundColor: '#ffffff',
  borderRadius: '6px',
  color: '#0ea5e9',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  padding: '10px 24px',
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
  margin: '0 0 12px',
};

const footerLinks = {
  color: '#64748b',
  fontSize: '12px',
  margin: '0',
};

const footerLink = {
  color: '#64748b',
  textDecoration: 'underline',
};
