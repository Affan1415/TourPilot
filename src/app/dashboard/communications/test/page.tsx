"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

export default function EmailTestPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { success: boolean; message: string }>>({});

  // Form states
  const [testEmail, setTestEmail] = useState("");

  const sendTestEmail = async (type: string, endpoint: string, payload: any) => {
    if (!testEmail) {
      setResults((prev) => ({
        ...prev,
        [type]: { success: false, message: "Please enter a test email address" },
      }));
      return;
    }

    setLoading(type);
    setResults((prev) => ({ ...prev, [type]: undefined as any }));

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setResults((prev) => ({
          ...prev,
          [type]: { success: true, message: `Email sent! ID: ${data.messageId}` },
        }));
      } else {
        setResults((prev) => ({
          ...prev,
          [type]: { success: false, message: data.error || "Failed to send" },
        }));
      }
    } catch (error) {
      setResults((prev) => ({
        ...prev,
        [type]: { success: false, message: "Network error" },
      }));
    } finally {
      setLoading(null);
    }
  };

  const emailTypes = [
    {
      id: "booking-confirmation",
      name: "Booking Confirmation",
      description: "Sent when a booking is completed",
      endpoint: "/api/email/booking-confirmation",
      getPayload: () => ({
        customerEmail: testEmail,
        customerName: "Test Customer",
        bookingReference: "BK26030412",
        tourName: "Sunset Sailing Cruise",
        tourDate: "March 10, 2026",
        tourTime: "4:00 PM",
        guestCount: 2,
        totalAmount: 198,
        meetingPoint: "123 Marina Drive, Dock B",
      }),
    },
    {
      id: "tour-reminder",
      name: "Tour Reminder",
      description: "Sent 24 hours before the tour",
      endpoint: "/api/email/tour-reminder",
      getPayload: () => ({
        customerEmail: testEmail,
        customerName: "Test Customer",
        bookingReference: "BK26030412",
        tourName: "Sunset Sailing Cruise",
        tourDate: "Tomorrow, March 10",
        tourTime: "4:00 PM",
        guestCount: 2,
        meetingPoint: "123 Marina Drive, Dock B",
        waiverSigned: false,
      }),
    },
    {
      id: "waiver-request",
      name: "Waiver Request",
      description: "Sent to guests who need to sign a waiver",
      endpoint: "/api/email/waiver-request",
      getPayload: () => ({
        guestEmail: testEmail,
        guestName: "Test Guest",
        customerName: "John Smith",
        tourName: "Sunset Sailing Cruise",
        tourDate: "March 10, 2026",
        tourTime: "4:00 PM",
        waiverToken: "test-waiver-token-123",
      }),
    },
    {
      id: "review-request",
      name: "Review Request",
      description: "Sent after the tour is completed",
      endpoint: "/api/email/review-request",
      getPayload: () => ({
        customerEmail: testEmail,
        customerName: "Test Customer",
        tourName: "Sunset Sailing Cruise",
        tourDate: "March 10, 2026",
        tripAdvisorUrl: "https://tripadvisor.com/review",
        googleReviewUrl: "https://google.com/review",
      }),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/communications">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Test Email Templates
          </h1>
          <p className="text-muted-foreground">
            Send test emails to preview templates
          </p>
        </div>
      </div>

      {/* Test Email Input */}
      <Card className="p-6">
        <div className="grid gap-2 max-w-md">
          <Label htmlFor="testEmail">Test Email Address</Label>
          <Input
            id="testEmail"
            type="email"
            placeholder="your@email.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            All test emails will be sent to this address
          </p>
        </div>
      </Card>

      {/* Email Types */}
      <div className="grid md:grid-cols-2 gap-4">
        {emailTypes.map((email) => (
          <Card key={email.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold">{email.name}</h3>
                <p className="text-sm text-muted-foreground">{email.description}</p>
              </div>
              <Badge variant="outline">{email.id}</Badge>
            </div>

            {results[email.id] && (
              <div
                className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
                  results[email.id].success
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {results[email.id].success ? (
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 flex-shrink-0" />
                )}
                <span className="truncate">{results[email.id].message}</span>
              </div>
            )}

            <Button
              onClick={() => sendTestEmail(email.id, email.endpoint, email.getPayload())}
              disabled={loading === email.id || !testEmail}
              className="w-full gap-2"
            >
              {loading === email.id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Test Email
                </>
              )}
            </Button>
          </Card>
        ))}
      </div>

      {/* Info */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">About Email Testing</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Emails are sent via Resend using your configured API key</li>
          <li>• Make sure RESEND_API_KEY is set in your environment variables</li>
          <li>• For production, verify your sending domain in Resend dashboard</li>
          <li>• Test emails use placeholder data to demonstrate the template</li>
        </ul>
      </Card>
    </div>
  );
}
