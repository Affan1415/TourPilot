"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  FileText,
  Mail,
  Hash,
  AlertCircle,
  ArrowRight,
  Ship,
} from "lucide-react";

export default function BookingLookupPage() {
  const router = useRouter();
  const [bookingRef, setBookingRef] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRefLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!bookingRef.trim()) {
      setError("Please enter a booking reference");
      setLoading(false);
      return;
    }

    // Simulate lookup - in production, this would verify the booking exists
    setTimeout(() => {
      setLoading(false);
      router.push(`/booking/${bookingRef.trim().toUpperCase()}`);
    }, 500);
  };

  const handleEmailLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email.trim()) {
      setError("Please enter your email address");
      setLoading(false);
      return;
    }

    // Simulate lookup - in production, this would send an email with bookings
    setTimeout(() => {
      setLoading(false);
      setError("We've sent an email with your booking details. Please check your inbox.");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Ship className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold">TourBooking</span>
          </Link>
        </div>

        <Card className="p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
              <Search className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Find Your Booking</h1>
            <p className="text-muted-foreground mt-1">
              Look up your booking details and manage your reservation
            </p>
          </div>

          {error && (
            <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
              error.includes("sent")
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-destructive/10 border border-destructive/20 text-destructive"
            }`}>
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <Tabs defaultValue="reference" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="reference" className="gap-2">
                <Hash className="h-4 w-4" />
                Reference
              </TabsTrigger>
              <TabsTrigger value="email" className="gap-2">
                <Mail className="h-4 w-4" />
                Email
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reference">
              <form onSubmit={handleRefLookup} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="bookingRef">Booking Reference</Label>
                  <Input
                    id="bookingRef"
                    type="text"
                    placeholder="e.g., BK26030412"
                    value={bookingRef}
                    onChange={(e) => setBookingRef(e.target.value.toUpperCase())}
                    className="font-mono text-lg tracking-wider"
                  />
                  <p className="text-xs text-muted-foreground">
                    Find this in your confirmation email
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full gap-2 gradient-primary border-0"
                  disabled={loading}
                >
                  {loading ? "Looking up..." : "Find Booking"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="email">
              <form onSubmit={handleEmailLookup} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    We'll send your booking details to this email
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full gap-2 gradient-primary border-0"
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Booking Details"}
                  <Mail className="h-4 w-4" />
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-8 pt-6 border-t text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Need to make a new booking?
            </p>
            <Link href="/tours">
              <Button variant="outline" className="gap-2">
                <Ship className="h-4 w-4" />
                Browse Tours
              </Button>
            </Link>
          </div>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Need help?{" "}
          <Link href="/contact" className="text-primary hover:underline">
            Contact us
          </Link>
        </p>
      </div>
    </div>
  );
}
