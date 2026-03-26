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

interface WaiverRequestEmailProps {
  guestName: string;
  customerName: string;
  tourName: string;
  tourDate: string;
  tourTime: string;
  waiverUrl: string;
  companyName?: string;
  companyPhone?: string;
  locale?: Locale;
}

export const WaiverRequestEmail = ({
  guestName = 'Guest',
  customerName = 'John Smith',
  tourName = 'Sunset Sailing Cruise',
  tourDate = 'March 10, 2026',
  tourTime = '4:00 PM',
  waiverUrl = 'https://example.com/waiver',
  companyName = 'TourPilot',
  companyPhone = '(555) 123-4567',
  locale = defaultLocale,
}: WaiverRequestEmailProps) => {
  // Translation helper for this email
  const e = (key: string, params?: Record<string, string | number>) =>
    t(locale, `email.waiverRequest.${key}`, params);

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

          {/* Icon */}
          <Section style={iconSection}>
            <Text style={documentIcon}>📋</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Heading style={title}>{e('title')}</Heading>

            <Text style={paragraph}>{e('greeting', { name: guestName })}</Text>

            <Text style={paragraph}>
              {e('message', { customerName })}
            </Text>
          </Section>

          {/* Tour Info */}
          <Section style={tourInfo}>
            <Text style={tourLabel}>{e('yourUpcomingTour')}</Text>
            <Heading style={tourNameStyle}>{tourName}</Heading>
            <Text style={tourDetails}>
              📅 {e('dateTime', { date: tourDate, time: tourTime })}
            </Text>
          </Section>

          {/* CTA */}
          <Section style={ctaSection}>
            <Button style={primaryButton} href={waiverUrl}>
              {e('signWaiverNow')}
            </Button>
            <Text style={ctaNote}>
              {e('takesLessThan')}
            </Text>
          </Section>

          {/* Why Sign */}
          <Section style={whySection}>
            <Heading style={whyTitle}>{e('whySign')}</Heading>
            <Text style={whyText}>
              {e('whySignMessage')}
            </Text>
          </Section>

          {/* Steps */}
          <Section style={stepsSection}>
            <Heading style={stepsTitle}>{e('howItWorks')}</Heading>
            <div style={step}>
              <Text style={stepNumber}>1</Text>
              <Text style={stepText}>{e('step1')}</Text>
            </div>
            <div style={step}>
              <Text style={stepNumber}>2</Text>
              <Text style={stepText}>{e('step2')}</Text>
            </div>
            <div style={step}>
              <Text style={stepNumber}>3</Text>
              <Text style={stepText}>{e('step3')}</Text>
            </div>
            <div style={step}>
              <Text style={stepNumber}>4</Text>
              <Text style={stepText}>{e('step4')} 🎉</Text>
            </div>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              {e('questions', { phone: companyPhone })}
            </Text>
            <Text style={footerText}>
              {companyName} | 123 Marina Drive, Coastal City, FL 33139
            </Text>
            <Text style={footerSmall}>
              {e('notExpectingEmail')}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default WaiverRequestEmail;

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

const iconSection = {
  textAlign: 'center' as const,
  padding: '32px 0 0',
};

const documentIcon = {
  fontSize: '48px',
  margin: '0',
};

const content = {
  padding: '16px 32px 0',
};

const title = {
  color: '#0f172a',
  fontSize: '24px',
  fontWeight: '700',
  textAlign: 'center' as const,
  margin: '0 0 24px',
};

const paragraph = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
};

const tourInfo = {
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  padding: '20px',
  margin: '8px 32px 24px',
  textAlign: 'center' as const,
  border: '1px solid #e2e8f0',
};

const tourLabel = {
  color: '#64748b',
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 8px',
};

const tourNameStyle = {
  color: '#0f172a',
  fontSize: '20px',
  fontWeight: '600',
  margin: '0 0 8px',
};

const tourDetails = {
  color: '#374151',
  fontSize: '14px',
  margin: '0',
};

const ctaSection = {
  textAlign: 'center' as const,
  padding: '0 32px 24px',
};

const primaryButton = {
  backgroundColor: '#0ea5e9',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: '600',
  textDecoration: 'none',
  padding: '16px 48px',
  display: 'inline-block',
};

const ctaNote = {
  color: '#64748b',
  fontSize: '13px',
  margin: '12px 0 0',
};

const whySection = {
  backgroundColor: '#f0f9ff',
  padding: '20px 32px',
  margin: '0 32px 24px',
  borderRadius: '8px',
};

const whyTitle = {
  color: '#0c4a6e',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px',
};

const whyText = {
  color: '#0369a1',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0',
};

const stepsSection = {
  padding: '0 32px 24px',
};

const stepsTitle = {
  color: '#0f172a',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 16px',
};

const step = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: '12px',
};

const stepNumber = {
  backgroundColor: '#0ea5e9',
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: '600',
  width: '24px',
  height: '24px',
  lineHeight: '24px',
  borderRadius: '50%',
  textAlign: 'center' as const,
  marginRight: '12px',
  flexShrink: 0,
};

const stepText = {
  color: '#374151',
  fontSize: '14px',
  margin: '0',
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

const footerSmall = {
  color: '#94a3b8',
  fontSize: '11px',
  margin: '16px 0 0',
  lineHeight: '16px',
};
