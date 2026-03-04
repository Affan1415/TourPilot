import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Scale } from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="py-16 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Scale className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
            <p className="text-xl text-muted-foreground">
              Please read these terms carefully before using our services.
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

            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing our website or booking a tour with TourPilot
              ("Company," "we," "us," or "our"), you agree to be bound by these Terms
              of Service. If you do not agree to these terms, please do not use our
              services.
            </p>

            <h2>2. Booking and Reservations</h2>
            <h3>2.1 Making a Booking</h3>
            <p>
              When you make a booking through our website, you are making an offer to
              purchase our services. A binding contract is formed when we send you a
              booking confirmation.
            </p>

            <h3>2.2 Accuracy of Information</h3>
            <p>
              You agree to provide accurate, current, and complete information when
              making a booking. This includes guest names, contact information, and
              any relevant health or medical information.
            </p>

            <h3>2.3 Booking Confirmation</h3>
            <p>
              You will receive a confirmation email with your booking details. Please
              review this carefully and contact us immediately if any information is
              incorrect.
            </p>

            <h2>3. Payment Terms</h2>
            <h3>3.1 Pricing</h3>
            <p>
              All prices are displayed in US Dollars (USD) and include applicable
              taxes unless otherwise stated. Prices are subject to change without
              notice, but changes will not affect confirmed bookings.
            </p>

            <h3>3.2 Payment Methods</h3>
            <p>
              We accept major credit cards and other payment methods as displayed
              at checkout. Payment is processed securely through Stripe.
            </p>

            <h3>3.3 Payment Timing</h3>
            <p>
              Full payment is required at the time of booking unless otherwise
              specified for group bookings or private charters.
            </p>

            <h2>4. Cancellation and Refunds</h2>
            <p>
              Our cancellation policy is as follows:
            </p>
            <ul>
              <li><strong>48+ hours before tour:</strong> Full refund</li>
              <li><strong>24-48 hours before tour:</strong> 50% refund or credit</li>
              <li><strong>Less than 24 hours / No-show:</strong> No refund</li>
            </ul>
            <p>
              For complete details, please see our{" "}
              <Link href="/cancellation" className="text-primary">Cancellation Policy</Link>.
            </p>

            <h2>5. Tour Participation</h2>
            <h3>5.1 Waivers</h3>
            <p>
              All participants must sign a digital liability waiver before participating
              in any tour. Parents or legal guardians must sign on behalf of minors.
              Failure to sign a waiver may result in denial of participation without
              refund.
            </p>

            <h3>5.2 Health and Safety</h3>
            <p>
              You are responsible for ensuring that you and all guests in your booking
              are physically fit to participate. Please inform us of any medical
              conditions, allergies, or special requirements that may affect participation.
            </p>

            <h3>5.3 Conduct</h3>
            <p>
              All participants must follow the instructions of our crew and staff.
              We reserve the right to refuse service or remove participants who:
            </p>
            <ul>
              <li>Are intoxicated or under the influence of drugs</li>
              <li>Behave in a manner that endangers themselves or others</li>
              <li>Fail to follow safety instructions</li>
              <li>Engage in harassment or disruptive behavior</li>
            </ul>
            <p>
              No refund will be provided if you are removed from a tour due to conduct
              violations.
            </p>

            <h3>5.4 Arrival Time</h3>
            <p>
              Please arrive at least 15 minutes before your scheduled departure time.
              Late arrivals may not be able to participate, and no refund will be
              provided for missed tours.
            </p>

            <h2>6. Weather and Cancellations by Company</h2>
            <p>
              We reserve the right to cancel or modify tours due to weather conditions,
              mechanical issues, or other circumstances beyond our control. In such
              cases, you will be offered:
            </p>
            <ul>
              <li>A full refund to your original payment method, OR</li>
              <li>Rescheduling to an alternative date at no extra cost</li>
            </ul>

            <h2>7. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law:
            </p>
            <ul>
              <li>
                We are not liable for any indirect, incidental, special, or
                consequential damages arising from your use of our services.
              </li>
              <li>
                Our total liability for any claim shall not exceed the amount
                you paid for the tour in question.
              </li>
              <li>
                We are not responsible for loss or damage to personal property
                during tours.
              </li>
            </ul>

            <h2>8. Intellectual Property</h2>
            <p>
              All content on our website, including text, images, logos, and
              software, is owned by or licensed to TourPilot and
              protected by copyright and trademark laws.
            </p>

            <h2>9. User Content</h2>
            <p>
              By submitting reviews, photos, or other content to us, you grant us
              a non-exclusive, royalty-free license to use, reproduce, and display
              such content for marketing and promotional purposes.
            </p>

            <h2>10. Privacy</h2>
            <p>
              Your privacy is important to us. Please review our{" "}
              <Link href="/privacy" className="text-primary">Privacy Policy</Link>{" "}
              for information on how we collect, use, and protect your personal
              information.
            </p>

            <h2>11. Dispute Resolution</h2>
            <p>
              Any disputes arising from these terms or our services shall be:
            </p>
            <ul>
              <li>First attempted to be resolved through good-faith negotiation</li>
              <li>Governed by the laws of the State of Florida</li>
              <li>Subject to the exclusive jurisdiction of courts in Miami-Dade County, Florida</li>
            </ul>

            <h2>12. Changes to Terms</h2>
            <p>
              We may update these terms from time to time. Changes will be posted
              on this page with an updated effective date. Your continued use of
              our services after changes constitutes acceptance of the new terms.
            </p>

            <h2>13. Contact Information</h2>
            <p>
              For questions about these terms, please contact us:
            </p>
            <Card className="p-6 not-prose">
              <p className="font-semibold">TourPilot</p>
              <p className="text-muted-foreground">
                123 Marina Drive, Suite 100<br />
                Coastal City, FL 33139<br />
                Email: legal@tourpilot.com<br />
                Phone: (555) 123-4567
              </p>
            </Card>

            <div className="mt-8 flex gap-4">
              <Link href="/privacy">
                <Button variant="outline">Privacy Policy</Button>
              </Link>
              <Link href="/cancellation">
                <Button variant="outline">Cancellation Policy</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
