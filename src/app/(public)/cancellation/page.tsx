import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CloudRain,
  Phone,
} from "lucide-react";

export default function CancellationPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="py-16 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <FileText className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-4">Cancellation Policy</h1>
            <p className="text-xl text-muted-foreground">
              We understand plans change. Here's everything you need to know about
              cancellations and refunds.
            </p>
          </div>
        </div>
      </section>

      {/* Policy Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Overview Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="p-6 text-center bg-green-50 border-green-200">
                <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-3" />
                <h3 className="font-semibold text-green-800">48+ Hours</h3>
                <p className="text-green-700 text-sm">Full Refund</p>
              </Card>
              <Card className="p-6 text-center bg-yellow-50 border-yellow-200">
                <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-3" />
                <h3 className="font-semibold text-yellow-800">24-48 Hours</h3>
                <p className="text-yellow-700 text-sm">50% Refund or Credit</p>
              </Card>
              <Card className="p-6 text-center bg-red-50 border-red-200">
                <XCircle className="h-8 w-8 text-red-600 mx-auto mb-3" />
                <h3 className="font-semibold text-red-800">Less than 24 Hours</h3>
                <p className="text-red-700 text-sm">No Refund</p>
              </Card>
            </div>

            {/* Detailed Policy */}
            <Card className="p-8">
              <h2 className="text-2xl font-bold mb-6">Standard Cancellation Policy</h2>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">48+ Hours Before Tour</h3>
                    <p className="text-muted-foreground">
                      Cancel at least 48 hours before your scheduled tour time and receive
                      a <strong>full refund</strong> to your original payment method.
                      Refunds are typically processed within 5-7 business days.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">24-48 Hours Before Tour</h3>
                    <p className="text-muted-foreground">
                      Cancellations made between 24 and 48 hours before your tour will
                      receive a <strong>50% refund</strong> or a full credit toward a
                      future booking (valid for 12 months).
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Less Than 24 Hours / No-Show</h3>
                    <p className="text-muted-foreground">
                      Unfortunately, cancellations made less than 24 hours before your
                      tour or failure to show up (no-show) are <strong>not eligible
                      for refund</strong>. We encourage you to contact us as early as
                      possible if your plans change.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Weather Policy */}
            <Card className="p-8 bg-blue-50 border-blue-200">
              <div className="flex gap-4">
                <CloudRain className="h-8 w-8 text-blue-600 flex-shrink-0" />
                <div>
                  <h2 className="text-xl font-bold text-blue-800 mb-2">
                    Weather Cancellations
                  </h2>
                  <p className="text-blue-700 mb-4">
                    Your safety is our top priority. If we cancel a tour due to
                    inclement weather or unsafe conditions, you will receive:
                  </p>
                  <ul className="space-y-2 text-blue-700">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <strong>Full refund</strong> to your original payment method, OR
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <strong>Free rescheduling</strong> to any available date
                    </li>
                  </ul>
                  <p className="text-sm text-blue-600 mt-4">
                    We monitor weather conditions closely and will notify you via
                    email and phone as early as possible if your tour needs to be cancelled.
                  </p>
                </div>
              </div>
            </Card>

            {/* Special Circumstances */}
            <Card className="p-8">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Special Circumstances
              </h2>
              <p className="text-muted-foreground mb-4">
                We understand that emergencies happen. In cases of:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                <li>Medical emergencies (with documentation)</li>
                <li>Flight cancellations or major travel disruptions</li>
                <li>Natural disasters or government-mandated restrictions</li>
              </ul>
              <p className="text-muted-foreground">
                Please contact us directly. We review these situations on a case-by-case
                basis and will do our best to accommodate your needs.
              </p>
            </Card>

            {/* How to Cancel */}
            <Card className="p-8">
              <h2 className="text-xl font-bold mb-4">How to Cancel Your Booking</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="font-semibold text-primary">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Online</h4>
                    <p className="text-sm text-muted-foreground">
                      Visit your booking confirmation page and click "Cancel Booking"
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="font-semibold text-primary">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium">By Phone</h4>
                    <p className="text-sm text-muted-foreground">
                      Call us at (555) 123-4567 during business hours
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="font-semibold text-primary">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium">By Email</h4>
                    <p className="text-sm text-muted-foreground">
                      Email us at bookings@tourpilot.com with your booking reference
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Contact */}
            <Card className="p-8 bg-muted/50 text-center">
              <Phone className="h-8 w-8 text-primary mx-auto mb-3" />
              <h2 className="text-xl font-bold mb-2">Questions?</h2>
              <p className="text-muted-foreground mb-4">
                Our team is here to help with any questions about cancellations or refunds.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/contact">
                  <Button className="gradient-primary border-0">Contact Us</Button>
                </Link>
                <Link href="/faq">
                  <Button variant="outline">View FAQ</Button>
                </Link>
              </div>
            </Card>

            {/* Last Updated */}
            <p className="text-center text-sm text-muted-foreground">
              Last updated: March 2026
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
