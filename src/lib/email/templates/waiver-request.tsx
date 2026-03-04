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

interface WaiverRequestEmailProps {
  guestName: string;
  customerName: string;
  tourName: string;
  tourDate: string;
  tourTime: string;
  waiverUrl: string;
  companyName?: string;
  companyPhone?: string;
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
}: WaiverRequestEmailProps) => {
  const previewText = `Please sign your waiver for ${tourName}`;

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
            <Heading style={title}>Digital Waiver Required</Heading>

            <Text style={paragraph}>Hi {guestName},</Text>

            <Text style={paragraph}>
              {customerName} has booked a tour and listed you as a guest. Before the tour,
              we need you to complete a quick digital waiver.
            </Text>
          </Section>

          {/* Tour Info */}
          <Section style={tourInfo}>
            <Text style={tourLabel}>Your upcoming tour:</Text>
            <Heading style={tourNameStyle}>{tourName}</Heading>
            <Text style={tourDetails}>
              📅 {tourDate} at {tourTime}
            </Text>
          </Section>

          {/* CTA */}
          <Section style={ctaSection}>
            <Button style={primaryButton} href={waiverUrl}>
              Sign Waiver Now
            </Button>
            <Text style={ctaNote}>
              Takes less than 2 minutes to complete
            </Text>
          </Section>

          {/* Why Sign */}
          <Section style={whySection}>
            <Heading style={whyTitle}>Why do I need to sign?</Heading>
            <Text style={whyText}>
              The waiver ensures your safety and allows you to participate in the tour.
              It covers standard liability release and acknowledgment of activity risks.
              All guests must sign before boarding.
            </Text>
          </Section>

          {/* Steps */}
          <Section style={stepsSection}>
            <Heading style={stepsTitle}>How it works:</Heading>
            <div style={step}>
              <Text style={stepNumber}>1</Text>
              <Text style={stepText}>Click the button above</Text>
            </div>
            <div style={step}>
              <Text style={stepNumber}>2</Text>
              <Text style={stepText}>Review the waiver terms</Text>
            </div>
            <div style={step}>
              <Text style={stepNumber}>3</Text>
              <Text style={stepText}>Sign with your finger or mouse</Text>
            </div>
            <div style={step}>
              <Text style={stepNumber}>4</Text>
              <Text style={stepText}>You're done! 🎉</Text>
            </div>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Questions? Contact us at {companyPhone}
            </Text>
            <Text style={footerText}>
              {companyName} | 123 Marina Drive, Coastal City, FL 33139
            </Text>
            <Text style={footerSmall}>
              If you were not expecting this email or did not book this tour,
              please disregard this message.
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
