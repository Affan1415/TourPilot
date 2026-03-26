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

interface ReviewRequestEmailProps {
  customerName: string;
  tourName: string;
  tourDate: string;
  tripAdvisorUrl?: string;
  googleReviewUrl?: string;
  companyName?: string;
  locale?: Locale;
}

export const ReviewRequestEmail = ({
  customerName = 'John',
  tourName = 'Sunset Sailing Cruise',
  tourDate = 'March 10, 2026',
  tripAdvisorUrl = 'https://tripadvisor.com/review',
  googleReviewUrl = 'https://google.com/review',
  companyName = 'TourPilot',
  locale = defaultLocale,
}: ReviewRequestEmailProps) => {
  // Translation helper for this email
  const e = (key: string, params?: Record<string, string | number>) =>
    t(locale, `email.reviewRequest.${key}`, params);

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

          {/* Hero */}
          <Section style={heroSection}>
            <Text style={waveEmoji}>👋</Text>
            <Heading style={heroTitle}>{e('title')}</Heading>
            <Text style={heroSubtitle}>
              {e('subtitle')}
            </Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Text style={paragraph}>{e('greeting', { name: customerName })}</Text>

            <Text style={paragraph}>
              {e('thankYou', { tourName, date: tourDate })}
            </Text>

            <Text style={paragraph}>
              {e('feedbackMessage')}
            </Text>
          </Section>

          {/* Star Rating Visual */}
          <Section style={starSection}>
            <Text style={starText}>⭐⭐⭐⭐⭐</Text>
            <Text style={starSubtext}>{e('reviewMakesDifference')}</Text>
          </Section>

          {/* Review Buttons */}
          <Section style={buttonsSection}>
            {tripAdvisorUrl && (
              <Button style={tripAdvisorButton} href={tripAdvisorUrl}>
                <span style={buttonIcon}>🦉</span> {e('reviewOnTripAdvisor')}
              </Button>
            )}

            {googleReviewUrl && (
              <Button style={googleButton} href={googleReviewUrl}>
                <span style={buttonIcon}>G</span> {e('reviewOnGoogle')}
              </Button>
            )}
          </Section>

          {/* What to Include */}
          <Section style={tipsSection}>
            <Heading style={tipsTitle}>{e('tipsTitle')}</Heading>
            <div style={tipRow}>
              <Text style={tipIcon}>📸</Text>
              <Text style={tipText}>{e('tip1')}</Text>
            </div>
            <div style={tipRow}>
              <Text style={tipIcon}>✨</Text>
              <Text style={tipText}>{e('tip2')}</Text>
            </div>
            <div style={tipRow}>
              <Text style={tipIcon}>💡</Text>
              <Text style={tipText}>{e('tip3')}</Text>
            </div>
          </Section>

          {/* Thank You Note */}
          <Section style={thankYouSection}>
            <Text style={thankYouText}>
              {e('thankYouNote', { companyName })}
            </Text>
          </Section>

          {/* Discount Offer */}
          <Section style={discountSection}>
            <Heading style={discountTitle}>{e('discountTitle')}</Heading>
            <Text style={discountText}>
              {e('discountMessage')}
            </Text>
            <Button style={bookAgainButton} href="#">
              {e('browseTours')}
            </Button>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              {companyName} | 123 Marina Drive, Coastal City, FL 33139
            </Text>
            <Text style={footerLinks}>
              <Link href="#" style={footerLink}>{e('ourTours')}</Link>
              {' • '}
              <Link href="#" style={footerLink}>{e('contactUs')}</Link>
              {' • '}
              <Link href="#" style={footerLink}>{e('unsubscribe')}</Link>
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
