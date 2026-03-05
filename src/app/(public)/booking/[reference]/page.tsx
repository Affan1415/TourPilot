"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Calendar,
  Clock,
  Users,
  MapPin,
  Mail,
  Phone,
  Download,
  Share2,
  FileText,
  AlertCircle,
  ChevronRight,
  Ship,
  Loader2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

interface BookingData {
  reference: string;
  status: string;
  paymentStatus: string;
  tour: {
    name: string;
    shortDescription: string;
    duration: number;
    image: string | null;
    location: string;
    meetingPoint: string;
  };
  date: string;
  time: string;
  guestCount: number;
  totalPrice: number;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  guests: {
    id: string;
    firstName: string;
    lastName: string;
    waiverSigned: boolean;
  }[];
  createdAt: string;
}

export default function BookingConfirmationPage() {
  const params = useParams();
  const reference = params.reference as string;

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingData | null>(null);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        // Use API route to bypass RLS - booking reference acts as the auth token
        const response = await fetch(`/api/bookings/${reference}`);

        if (!response.ok) {
          console.error('Error fetching booking:', response.statusText);
          setLoading(false);
          return;
        }

        const data = await response.json();

        const bookingData: BookingData = {
          reference: data.booking_reference,
          status: data.status,
          paymentStatus: data.payment_status,
          tour: {
            name: data.availabilities?.tours?.name || 'Tour',
            shortDescription: data.availabilities?.tours?.short_description || '',
            duration: data.availabilities?.tours?.duration_minutes || 0,
            image: data.availabilities?.tours?.images?.[0] || null,
            location: data.availabilities?.tours?.location || '',
            meetingPoint: data.availabilities?.tours?.meeting_point || '',
          },
          date: data.availabilities?.date || '',
          time: data.availabilities?.start_time?.slice(0, 5) || '',
          guestCount: data.guest_count,
          totalPrice: data.total_price,
          customer: {
            firstName: data.customers?.first_name || '',
            lastName: data.customers?.last_name || '',
            email: data.customers?.email || '',
            phone: data.customers?.phone || '',
          },
          guests: (data.booking_guests || []).map((g: any) => ({
            id: g.id,
            firstName: g.first_name,
            lastName: g.last_name,
            waiverSigned: g.waivers?.some((w: any) => w.status === 'signed') || false,
          })),
          createdAt: data.created_at,
        };

        setBooking(bookingData);
      } catch (error) {
        console.error('Error fetching booking:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [reference]);

  if (loading) {
    return (
      <div className="py-8 min-h-screen">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="py-8 min-h-screen">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center py-16">
            <Ship className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Booking Not Found</h1>
            <p className="text-muted-foreground mb-4">
              We couldn't find a booking with reference "{reference}"
            </p>
            <Link href="/booking/lookup">
              <Button>Look Up Booking</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const allWaiversSigned = booking.guests.every((g) => g.waiverSigned);
  const signedCount = booking.guests.filter((g) => g.waiverSigned).length;
  const pricePerPerson = booking.guestCount > 0 ? booking.totalPrice / booking.guestCount : 0;

  const handleDownload = () => {
    const content = `
BOOKING CONFIRMATION
====================
Reference: ${booking.reference}
Status: ${booking.status}

TOUR DETAILS
------------
Tour: ${booking.tour.name}
Date: ${format(parseISO(booking.date), "EEEE, MMMM d, yyyy")}
Time: ${booking.time}
Duration: ${booking.tour.duration / 60} hours
Guests: ${booking.guestCount} people

MEETING POINT
-------------
${booking.tour.meetingPoint}

CONTACT
-------
Email: ${booking.customer.email}
Phone: ${booking.customer.phone}

PAYMENT
-------
Total Paid: $${booking.totalPrice}

Please arrive 15 minutes early. All guests must sign waivers before the tour.
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `booking-${booking.reference}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("Downloaded", { description: "Booking confirmation downloaded." });
  };

  const handleShare = async () => {
    const shareData = {
      title: `Booking Confirmation - ${booking.reference}`,
      text: `I've booked ${booking.tour.name} on ${format(parseISO(booking.date), "MMMM d, yyyy")}!`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied", { description: "Booking link copied to clipboard." });
      }
    } catch (err) {
      console.log('Share cancelled');
    }
  };

  return (
    <div className="py-8 min-h-screen">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Booking Confirmed!</h1>
          <p className="text-muted-foreground">
            Your adventure is booked. We&apos;ve sent a confirmation email to{" "}
            <span className="font-medium text-foreground">{booking.customer.email}</span>
          </p>
        </div>

        {/* Booking Reference */}
        <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Booking Reference</p>
                <p className="text-2xl font-bold font-mono">{booking.reference}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Waiver Status Alert */}
        {!allWaiversSigned && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-900">Waivers Required</p>
                  <p className="text-sm text-orange-800 mb-3">
                    {signedCount} of {booking.guests.length} guests have signed the waiver.
                    All guests must sign before the tour.
                  </p>
                  <Link href={`/waiver/${booking.reference}`}>
                    <Button size="sm" className="gap-2 bg-orange-600 hover:bg-orange-700">
                      <FileText className="h-4 w-4" />
                      Sign Waiver Now
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tour Details */}
          <Card>
            <CardHeader>
              <CardTitle>Tour Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                {booking.tour.image ? (
                  <img
                    src={booking.tour.image}
                    alt={booking.tour.name}
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center">
                    <Ship className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold">{booking.tour.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {booking.tour.shortDescription}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {format(parseISO(booking.date), "EEEE, MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Time</p>
                    <p className="font-medium">{booking.time} ({booking.tour.duration / 60} hours)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Guests</p>
                    <p className="font-medium">{booking.guestCount} people</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Meeting Point</p>
                    <p className="font-medium">{booking.tour.meetingPoint}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Guest & Payment Info */}
          <div className="space-y-6">
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{booking.customer.email}</span>
                </div>
                {booking.customer.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{booking.customer.phone}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Guest List & Waiver Status */}
            <Card>
              <CardHeader>
                <CardTitle>Guests & Waiver Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {booking.guests.map((guest, index) => (
                    <div
                      key={guest.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">
                            {guest.firstName} {guest.lastName}
                          </p>
                          {index === 0 && (
                            <p className="text-xs text-muted-foreground">Lead booker</p>
                          )}
                        </div>
                      </div>
                      <Badge
                        className={
                          guest.waiverSigned
                            ? "bg-green-100 text-green-800 hover:bg-green-100"
                            : "bg-orange-100 text-orange-800 hover:bg-orange-100"
                        }
                      >
                        {guest.waiverSigned ? "Waiver Signed" : "Pending"}
                      </Badge>
                    </div>
                  ))}
                </div>
                {!allWaiversSigned && (
                  <Link href={`/waiver/${booking.reference}`}>
                    <Button variant="outline" className="w-full mt-4 gap-2">
                      <FileText className="h-4 w-4" />
                      Sign Pending Waivers
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            {/* Payment Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      ${pricePerPerson.toFixed(2)} x {booking.guestCount} guests
                    </span>
                    <span>${booking.totalPrice.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total Paid</span>
                    <span className="text-primary">${booking.totalPrice.toFixed(2)}</span>
                  </div>
                </div>
                <Badge className="mt-4 bg-green-100 text-green-800 hover:bg-green-100">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Payment Complete
                </Badge>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* What's Next */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>What&apos;s Next?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                  1
                </div>
                <div>
                  <p className="font-medium">Sign Waivers</p>
                  <p className="text-sm text-muted-foreground">
                    All guests must sign the liability waiver before the tour
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                  2
                </div>
                <div>
                  <p className="font-medium">Check Your Email</p>
                  <p className="text-sm text-muted-foreground">
                    We&apos;ll send a reminder 24 hours before your tour
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                  3
                </div>
                <div>
                  <p className="font-medium">Arrive on Time</p>
                  <p className="text-sm text-muted-foreground">
                    Arrive 15 minutes early at the meeting point
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8 justify-center">
          <Link href="/tours">
            <Button variant="outline" className="w-full sm:w-auto gap-2">
              Browse More Tours
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
          {!allWaiversSigned && (
            <Link href={`/waiver/${booking.reference}`}>
              <Button className="w-full sm:w-auto gap-2 gradient-primary border-0">
                <FileText className="h-4 w-4" />
                Sign Waiver Now
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
