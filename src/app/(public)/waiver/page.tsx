"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileText,
  ArrowRight,
  Ship,
  AlertCircle,
} from "lucide-react";

export default function WaiverLookupPage() {
  const router = useRouter();
  const [bookingRef, setBookingRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!bookingRef.trim()) {
      setError("Please enter a booking reference or waiver token");
      setLoading(false);
      return;
    }

    // Navigate to the waiver signing page
    setTimeout(() => {
      setLoading(false);
      router.push(`/waiver/${bookingRef.trim()}`);
    }, 500);
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
              <FileText className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Sign Your Waiver</h1>
            <p className="text-muted-foreground mt-1">
              Enter your booking reference or waiver token to sign your digital waiver
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3 text-destructive">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="bookingRef">Booking Reference or Waiver Token</Label>
              <Input
                id="bookingRef"
                type="text"
                placeholder="e.g., BK26030412 or waiver-abc123"
                value={bookingRef}
                onChange={(e) => setBookingRef(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                This was sent to you via email when your booking was confirmed
              </p>
            </div>

            <Button
              type="submit"
              className="w-full gap-2 gradient-primary border-0"
              disabled={loading}
            >
              {loading ? "Loading..." : "Continue to Waiver"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t">
            <h3 className="font-semibold mb-3">Why sign a waiver?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Required for all water-based activities
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Acknowledges inherent risks and safety guidelines
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                All guests must sign before boarding
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Takes less than 2 minutes to complete
              </li>
            </ul>
          </div>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Don't have a booking?{" "}
          <Link href="/tours" className="text-primary hover:underline">
            Book a tour
          </Link>
        </p>
      </div>
    </div>
  );
}
