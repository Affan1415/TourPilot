import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, Mail } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="py-16 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
            <p className="text-xl text-muted-foreground">
              Your privacy is important to us. This policy explains how we collect,
              use, and protect your personal information.
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto prose prose-slate">
            <Card className="p-8 mb-8">
              <p className="text-muted-foreground">
                <strong>Effective Date:</strong> March 1, 2026<br />
                <strong>Last Updated:</strong> March 1, 2026
              </p>
            </Card>

            <h2>1. Information We Collect</h2>
            <p>
              We collect information you provide directly to us when you:
            </p>
            <ul>
              <li>Create a booking or account</li>
              <li>Sign a digital waiver</li>
              <li>Contact us for support</li>
              <li>Subscribe to our newsletter</li>
              <li>Participate in surveys or promotions</li>
            </ul>

            <h3>Personal Information</h3>
            <p>This may include:</p>
            <ul>
              <li>Name, email address, phone number</li>
              <li>Billing and payment information</li>
              <li>Emergency contact information</li>
              <li>Health information relevant to tour participation</li>
              <li>Digital signatures on waivers</li>
            </ul>

            <h3>Automatically Collected Information</h3>
            <p>
              When you visit our website, we automatically collect certain information,
              including:
            </p>
            <ul>
              <li>IP address and device information</li>
              <li>Browser type and settings</li>
              <li>Pages visited and time spent</li>
              <li>Referring website or source</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Process and manage your bookings</li>
              <li>Send booking confirmations, reminders, and updates</li>
              <li>Process payments securely</li>
              <li>Comply with legal requirements (waivers, safety records)</li>
              <li>Improve our services and website</li>
              <li>Send promotional communications (with your consent)</li>
              <li>Respond to your inquiries and support requests</li>
            </ul>

            <h2>3. Information Sharing</h2>
            <p>
              We do not sell, trade, or rent your personal information to third parties.
              We may share your information with:
            </p>
            <ul>
              <li>
                <strong>Service Providers:</strong> Payment processors (Stripe),
                email services (Resend), SMS providers (Twilio) who help us operate
                our business
              </li>
              <li>
                <strong>Tour Staff:</strong> Captains and crew receive guest manifests
                for operational purposes
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law, court order,
                or government regulation
              </li>
            </ul>

            <h2>4. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect
              your personal information, including:
            </p>
            <ul>
              <li>SSL/TLS encryption for all data transmission</li>
              <li>Secure payment processing through Stripe (PCI-DSS compliant)</li>
              <li>Regular security assessments and updates</li>
              <li>Limited access to personal data on a need-to-know basis</li>
              <li>Secure cloud storage with Supabase</li>
            </ul>

            <h2>5. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to:
            </p>
            <ul>
              <li>Provide our services to you</li>
              <li>Comply with legal obligations (waiver records, financial records)</li>
              <li>Resolve disputes and enforce our agreements</li>
            </ul>
            <p>
              Typically, booking records are retained for 7 years for legal and
              accounting purposes. You may request deletion of your data subject
              to legal retention requirements.
            </p>

            <h2>6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your information (subject to legal requirements)</li>
              <li>Opt out of marketing communications</li>
              <li>Withdraw consent where processing is based on consent</li>
            </ul>
            <p>
              To exercise these rights, please contact us at privacy@tourpilot.com.
            </p>

            <h2>7. Cookies and Tracking</h2>
            <p>
              We use cookies and similar technologies to:
            </p>
            <ul>
              <li>Keep you logged in to your account</li>
              <li>Remember your preferences</li>
              <li>Analyze website traffic and usage</li>
              <li>Improve our services</li>
            </ul>
            <p>
              You can control cookies through your browser settings. Note that disabling
              cookies may affect website functionality.
            </p>

            <h2>8. Third-Party Links</h2>
            <p>
              Our website may contain links to third-party websites (e.g., TripAdvisor,
              social media). We are not responsible for the privacy practices of these
              external sites. We encourage you to review their privacy policies.
            </p>

            <h2>9. Children's Privacy</h2>
            <p>
              Our services are not directed to children under 13. We do not knowingly
              collect personal information from children under 13. Parent or guardian
              information is collected for minor participants in our tours.
            </p>

            <h2>10. Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will notify you
              of significant changes by posting the new policy on this page and updating
              the "Last Updated" date.
            </p>

            <h2>11. Contact Us</h2>
            <p>
              If you have questions about this privacy policy or our data practices,
              please contact us:
            </p>
            <Card className="p-6 not-prose">
              <p className="font-semibold">TourPilot</p>
              <p className="text-muted-foreground">
                123 Marina Drive, Suite 100<br />
                Coastal City, FL 33139<br />
                Email: privacy@tourpilot.com<br />
                Phone: (555) 123-4567
              </p>
            </Card>

            <div className="mt-8 flex gap-4">
              <Link href="/terms">
                <Button variant="outline">Terms of Service</Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline">Contact Us</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
