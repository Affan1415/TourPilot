"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  Clock,
  Calendar,
  Users,
  MapPin,
  CreditCard,
  Lock,
  Check,
  User,
  Mail,
  Phone,
  Shield,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { StripeProvider } from "@/components/payments/StripeProvider";
import { PaymentForm } from "@/components/payments/PaymentForm";
import type { Tour, Availability } from "@/types";

interface TourWithAvailability {
  tour: Tour | null;
  availability: (Availability & { price: number }) | null;
}

const countryCodes = [
  { code: "+1", country: "US/CA" },
  { code: "+44", country: "UK" },
  { code: "+61", country: "AU" },
  { code: "+971", country: "UAE" },
  { code: "+91", country: "IN" },
];

interface GuestInfo {
  firstName: string;
  lastName: string;
  email: string;
}

export default function BookingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const slug = params.slug as string;
  const date = searchParams.get("date") || "";
  const time = searchParams.get("time") || "";
  const availabilityId = searchParams.get("availability") || "";
  const guestCount = parseInt(searchParams.get("guests") || "1");

  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tourData, setTourData] = useState<TourWithAvailability>({
    tour: null,
    availability: null,
  });

  const pricePerPerson = tourData.availability?.price || 0;

  // Form state
  const [primaryGuest, setPrimaryGuest] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    countryCode: "+1",
  });

  const [additionalGuests, setAdditionalGuests] = useState<GuestInfo[]>(
    Array.from({ length: guestCount - 1 }, () => ({
      firstName: "",
      lastName: "",
      email: "",
    }))
  );

  const [notes, setNotes] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeWaiver, setAgreeWaiver] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingReference, setBookingReference] = useState<string | null>(null);

  const totalPrice = pricePerPerson * guestCount;

  // Fetch tour and availability data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();

        // Fetch tour by slug
        const { data: tour, error: tourError } = await supabase
          .from("tours")
          .select("*")
          .eq("slug", slug)
          .eq("status", "active")
          .single();

        if (tourError || !tour) {
          setError("Tour not found");
          setLoading(false);
          return;
        }

        // Fetch availability
        if (availabilityId) {
          const { data: availability, error: availError } = await supabase
            .from("availabilities")
            .select("*")
            .eq("id", availabilityId)
            .eq("tour_id", tour.id)
            .single();

          if (availError || !availability) {
            setError("Selected time slot is no longer available");
            setLoading(false);
            return;
          }

          const price = availability.price_override || tour.base_price;

          setTourData({
            tour,
            availability: { ...availability, price },
          });
        } else {
          setError("No time slot selected");
        }
      } catch (err) {
        console.error("Error fetching booking data:", err);
        setError("Failed to load booking information");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [slug, availabilityId]);

  const updateGuest = (index: number, field: keyof GuestInfo, value: string) => {
    const newGuests = [...additionalGuests];
    newGuests[index] = { ...newGuests[index], [field]: value };
    setAdditionalGuests(newGuests);
  };

  // Create booking and payment intent when moving to step 2
  const handleProceedToPayment = async () => {
    if (!tourData.availability) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Build guests array
      const allGuests = [
        {
          first_name: primaryGuest.firstName,
          last_name: primaryGuest.lastName,
          email: primaryGuest.email,
          is_primary: true,
        },
        ...additionalGuests.map((g) => ({
          first_name: g.firstName,
          last_name: g.lastName,
          email: g.email || undefined,
          is_primary: false,
        })),
      ];

      // Create booking first
      const bookingResponse = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          availability_id: tourData.availability.id,
          guest_count: guestCount,
          total_price: totalPrice,
          customer: {
            first_name: primaryGuest.firstName,
            last_name: primaryGuest.lastName,
            email: primaryGuest.email,
            phone: primaryGuest.phone,
            country_code: primaryGuest.countryCode,
          },
          guests: allGuests,
          notes: notes || undefined,
        }),
      });

      const bookingResult = await bookingResponse.json();

      if (!bookingResponse.ok) {
        throw new Error(bookingResult.error || "Failed to create booking");
      }

      setBookingId(bookingResult.booking_id);
      setBookingReference(bookingResult.booking_reference);

      // Create payment intent
      const paymentResponse = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          booking_id: bookingResult.booking_id,
          amount: totalPrice,
          customer_email: primaryGuest.email,
          customer_name: `${primaryGuest.firstName} ${primaryGuest.lastName}`,
          metadata: {
            tour_name: tourData.tour?.name,
            tour_date: tourData.availability.date,
          },
        }),
      });

      const paymentResult = await paymentResponse.json();

      if (!paymentResponse.ok) {
        throw new Error(paymentResult.error || "Failed to create payment");
      }

      setClientSecret(paymentResult.clientSecret);
      setStep(2);
    } catch (err) {
      console.error("Booking/Payment error:", err);
      setError(err instanceof Error ? err.message : "Failed to proceed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = () => {
    if (bookingReference) {
      router.push(`/booking/${bookingReference}`);
    }
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const isStep1Valid =
    primaryGuest.firstName &&
    primaryGuest.lastName &&
    primaryGuest.email &&
    primaryGuest.phone &&
    additionalGuests.every((g) => g.firstName && g.lastName);

  const isStep2Valid = agreeTerms && (tourData.tour?.requires_waiver ? agreeWaiver : true);

  // Loading state
  if (loading) {
    return (
      <div className="py-8 min-h-screen bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Loading booking details...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !tourData.tour || !tourData.availability) {
    return (
      <div className="py-8 min-h-screen bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Unable to Complete Booking</h2>
              <p className="text-muted-foreground mb-6">{error || "Tour information is not available"}</p>
              <Link href="/tours">
                <Button>Browse Tours</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { tour, availability } = tourData;

  return (
    <div className="py-8 min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto px-4">
        {/* Back link */}
        <Link
          href={`/tours/${tour.slug}`}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to tour details
        </Link>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[
            { num: 1, label: "Guest Details" },
            { num: 2, label: "Review & Pay" },
          ].map((s, index) => (
            <div key={s.num} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-colors ${
                  step >= s.num
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s.num ? <Check className="h-5 w-5" /> : s.num}
              </div>
              <span
                className={`ml-2 font-medium ${
                  step >= s.num ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
              {index < 1 && (
                <div
                  className={`w-16 h-0.5 mx-4 ${
                    step > s.num ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {step === 1 && (
              <>
                {/* Primary Guest */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      Primary Guest (Lead Booker)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          placeholder="John"
                          value={primaryGuest.firstName}
                          onChange={(e) =>
                            setPrimaryGuest({ ...primaryGuest, firstName: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          placeholder="Smith"
                          value={primaryGuest.lastName}
                          onChange={(e) =>
                            setPrimaryGuest({ ...primaryGuest, lastName: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          className="pl-10"
                          value={primaryGuest.email}
                          onChange={(e) =>
                            setPrimaryGuest({ ...primaryGuest, email: e.target.value })
                          }
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Confirmation and waiver will be sent to this email
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <div className="flex gap-2">
                        <Select
                          value={primaryGuest.countryCode}
                          onValueChange={(v) =>
                            setPrimaryGuest({ ...primaryGuest, countryCode: v })
                          }
                        >
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {countryCodes.map((c) => (
                              <SelectItem key={c.code} value={c.code}>
                                {c.code} {c.country}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="relative flex-1">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="(555) 123-4567"
                            className="pl-10"
                            value={primaryGuest.phone}
                            onChange={(e) =>
                              setPrimaryGuest({ ...primaryGuest, phone: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Guests */}
                {additionalGuests.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Additional Guests
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {additionalGuests.map((guest, index) => (
                        <div key={index}>
                          {index > 0 && <Separator className="mb-6" />}
                          <p className="font-medium mb-4">Guest {index + 2}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>First Name *</Label>
                              <Input
                                placeholder="First name"
                                value={guest.firstName}
                                onChange={(e) =>
                                  updateGuest(index, "firstName", e.target.value)
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Last Name *</Label>
                              <Input
                                placeholder="Last name"
                                value={guest.lastName}
                                onChange={(e) =>
                                  updateGuest(index, "lastName", e.target.value)
                                }
                              />
                            </div>
                          </div>
                          <div className="space-y-2 mt-4">
                            <Label>Email (Optional)</Label>
                            <Input
                              type="email"
                              placeholder="Email address"
                              value={guest.email}
                              onChange={(e) =>
                                updateGuest(index, "email", e.target.value)
                              }
                            />
                            <p className="text-xs text-muted-foreground">
                              They&apos;ll receive a separate waiver to sign
                            </p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Special Requests */}
                <Card>
                  <CardHeader>
                    <CardTitle>Special Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Any special requirements, dietary restrictions, celebrations..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </CardContent>
                </Card>

                <Button
                  className="w-full h-12 gradient-primary border-0 shadow-lg shadow-primary/25"
                  onClick={handleProceedToPayment}
                  disabled={!isStep1Valid || isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating booking...
                    </>
                  ) : (
                    "Continue to Payment"
                  )}
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                {/* Review Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Review Your Booking</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-4">
                      <img
                        src={tour.images?.[0] || "/placeholder-tour.jpg"}
                        alt={tour.name}
                        className="w-24 h-24 rounded-lg object-cover"
                      />
                      <div>
                        <h3 className="font-semibold">{tour.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {tour.short_description}
                        </p>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {availability.date && format(parseISO(availability.date), "EEE, MMM d, yyyy")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {availability.start_time}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {guestCount} guests
                          </span>
                        </div>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <p className="font-medium mb-2">Primary Guest</p>
                      <p className="text-sm text-muted-foreground">
                        {primaryGuest.firstName} {primaryGuest.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">{primaryGuest.email}</p>
                      <p className="text-sm text-muted-foreground">
                        {primaryGuest.countryCode} {primaryGuest.phone}
                      </p>
                    </div>
                    {additionalGuests.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <p className="font-medium mb-2">Additional Guests</p>
                          {additionalGuests.map((guest, index) => (
                            <p key={index} className="text-sm text-muted-foreground">
                              {guest.firstName} {guest.lastName}
                              {guest.email && ` (${guest.email})`}
                            </p>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Payment */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-primary" />
                      Payment Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {clientSecret ? (
                      <StripeProvider clientSecret={clientSecret}>
                        <PaymentForm
                          amount={totalPrice}
                          onSuccess={handlePaymentSuccess}
                          onError={handlePaymentError}
                          returnUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/booking/${bookingReference}`}
                        />
                      </StripeProvider>
                    ) : (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Terms & Info */}
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      By completing this payment, you agree to our{" "}
                      <Link href="/terms" className="text-primary hover:underline">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link href="/cancellation" className="text-primary hover:underline">
                        Cancellation Policy
                      </Link>.
                    </p>
                    {tour.requires_waiver && (
                      <p className="text-sm text-muted-foreground flex items-start gap-2">
                        <Shield className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                        All guests will receive a liability waiver to sign before the tour.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {error && (
                  <Card className="border-destructive">
                    <CardContent className="pt-6">
                      <p className="text-sm text-destructive flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                      </p>
                    </CardContent>
                  </Card>
                )}

                <Button
                  variant="outline"
                  className="w-full h-12"
                  onClick={() => {
                    setStep(1);
                    setClientSecret(null);
                    setError(null);
                  }}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back to Guest Details
                </Button>
              </>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 shadow-xl border-0">
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <img
                    src={tour.images?.[0] || "/placeholder-tour.jpg"}
                    alt={tour.name}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                  <div>
                    <h3 className="font-semibold">{tour.name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {tour.location}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{availability.date && format(parseISO(availability.date), "EEEE, MMMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{availability.start_time} ({tour.duration_minutes / 60} hours)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{guestCount} {guestCount === 1 ? "guest" : "guests"}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      ${pricePerPerson} x {guestCount} guests
                    </span>
                    <span>${totalPrice}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span className="text-primary">${totalPrice}</span>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800 flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Free cancellation up to 24 hours before
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
