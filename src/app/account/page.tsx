"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Ship,
  ChevronRight,
  FileText,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { format, parseISO, isPast, isFuture, isToday } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface BookingGuest {
  id: string;
  first_name: string;
  last_name: string;
  waiver_signed: boolean;
}

interface Booking {
  id: string;
  booking_reference: string;
  guest_count: number;
  total_price: number;
  status: string;
  payment_status: string;
  created_at: string;
  tour_date: string;
  start_time: string;
  end_time: string;
  tour_name: string;
  tour_slug: string;
  location: string;
  meeting_point: string;
  guests: BookingGuest[];
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "Confirmed", color: "bg-green-100 text-green-800" },
  checked_in: { label: "Checked In", color: "bg-blue-100 text-blue-800" },
  completed: { label: "Completed", color: "bg-gray-100 text-gray-800" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800" },
  no_show: { label: "No Show", color: "bg-red-100 text-red-800" },
};

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customerName, setCustomerName] = useState("");

  useEffect(() => {
    const fetchBookings = async () => {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get customer
      const { data: customerData } = await supabase
        .from('customers')
        .select('id, first_name, last_name')
        .eq('user_id', user.id)
        .single();

      if (!customerData) {
        setLoading(false);
        return;
      }

      setCustomerName(`${customerData.first_name} ${customerData.last_name}`);

      // Get bookings with all related data
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_reference,
          guest_count,
          total_price,
          status,
          payment_status,
          created_at,
          availabilities!inner (
            date,
            start_time,
            end_time,
            tours!inner (
              name,
              slug,
              location,
              meeting_point
            )
          ),
          booking_guests (
            id,
            first_name,
            last_name,
            waivers (
              status
            )
          )
        `)
        .eq('customer_id', customerData.id)
        .order('created_at', { ascending: false });

      if (bookingsData) {
        const formattedBookings: Booking[] = bookingsData.map((b: any) => ({
          id: b.id,
          booking_reference: b.booking_reference,
          guest_count: b.guest_count,
          total_price: b.total_price,
          status: b.status,
          payment_status: b.payment_status,
          created_at: b.created_at,
          tour_date: b.availabilities.date,
          start_time: b.availabilities.start_time,
          end_time: b.availabilities.end_time,
          tour_name: b.availabilities.tours.name,
          tour_slug: b.availabilities.tours.slug,
          location: b.availabilities.tours.location,
          meeting_point: b.availabilities.tours.meeting_point,
          guests: (b.booking_guests || []).map((g: any) => ({
            id: g.id,
            first_name: g.first_name,
            last_name: g.last_name,
            waiver_signed: g.waivers?.some((w: any) => w.status === 'signed') || false,
          })),
        }));

        setBookings(formattedBookings);
      }

      setLoading(false);
    };

    fetchBookings();
  }, []);

  const upcomingBookings = bookings.filter(
    b => !isPast(parseISO(b.tour_date)) && b.status !== 'cancelled'
  );
  const pastBookings = bookings.filter(
    b => isPast(parseISO(b.tour_date)) || b.status === 'cancelled'
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-32 bg-muted rounded-lg" />
          <div className="h-32 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {customerName.split(' ')[0]}!</h1>
        <p className="text-muted-foreground">
          Manage your bookings and view your tour history
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Upcoming</p>
          <p className="text-2xl font-bold text-primary">{upcomingBookings.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Total Bookings</p>
          <p className="text-2xl font-bold">{bookings.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Total Guests</p>
          <p className="text-2xl font-bold">{bookings.reduce((sum, b) => sum + b.guest_count, 0)}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Total Spent</p>
          <p className="text-2xl font-bold">${bookings.reduce((sum, b) => sum + b.total_price, 0).toFixed(0)}</p>
        </Card>
      </div>

      {/* Bookings Tabs */}
      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({pastBookings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingBookings.length === 0 ? (
            <Card className="p-12 text-center">
              <Ship className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Upcoming Bookings</h3>
              <p className="text-muted-foreground mb-4">
                Ready for your next adventure?
              </p>
              <Link href="/tours">
                <Button className="gradient-primary border-0">
                  Browse Tours
                </Button>
              </Link>
            </Card>
          ) : (
            upcomingBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastBookings.length === 0 ? (
            <Card className="p-12 text-center">
              <Ship className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Past Bookings</h3>
              <p className="text-muted-foreground">
                Your completed tours will appear here
              </p>
            </Card>
          ) : (
            pastBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} isPast />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BookingCard({ booking, isPast = false }: { booking: Booking; isPast?: boolean }) {
  const tourDate = parseISO(booking.tour_date);
  const isTourToday = isToday(tourDate);
  const pendingWaivers = booking.guests.filter(g => !g.waiver_signed).length;
  const status = statusConfig[booking.status] || statusConfig.pending;

  return (
    <Card className={cn(
      "overflow-hidden",
      isTourToday && "ring-2 ring-primary"
    )}>
      {isTourToday && (
        <div className="bg-primary text-primary-foreground text-center py-1 text-sm font-medium">
          Your tour is TODAY!
        </div>
      )}

      <div className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          {/* Tour Info */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg">{booking.tour_name}</h3>
                <Badge className={status.color}>{status.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground font-mono">
                Booking: {booking.booking_reference}
              </p>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(tourDate, "EEEE, MMMM d, yyyy")}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {booking.start_time.slice(0, 5)}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {booking.location}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {booking.guest_count} guests
              </span>
            </div>

            {/* Meeting Point */}
            {!isPast && booking.meeting_point && (
              <div className="bg-muted p-3 rounded-lg text-sm">
                <span className="font-medium">Meeting Point:</span> {booking.meeting_point}
              </div>
            )}

            {/* Waiver Status */}
            {!isPast && pendingWaivers > 0 && (
              <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-orange-800">
                    {pendingWaivers} waiver{pendingWaivers > 1 ? 's' : ''} need signing
                  </p>
                  <p className="text-xs text-orange-600">
                    All guests must sign before the tour
                  </p>
                </div>
              </div>
            )}

            {/* Guests */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Guests:</p>
              <div className="flex flex-wrap gap-2">
                {booking.guests.map((guest) => (
                  <div
                    key={guest.id}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
                      guest.waiver_signed
                        ? "bg-green-100 text-green-800"
                        : "bg-orange-100 text-orange-800"
                    )}
                  >
                    {guest.waiver_signed ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    {guest.first_name} {guest.last_name}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 md:items-end">
            <p className="text-xl font-bold">${booking.total_price.toFixed(2)}</p>

            {!isPast && (
              <>
                <Link href={`/booking/${booking.booking_reference}`}>
                  <Button variant="outline" size="sm" className="gap-2 w-full md:w-auto">
                    <ExternalLink className="h-4 w-4" />
                    View Details
                  </Button>
                </Link>

                {pendingWaivers > 0 && (
                  <Link href={`/waiver/${booking.booking_reference}`}>
                    <Button size="sm" className="gap-2 w-full md:w-auto gradient-primary border-0">
                      <FileText className="h-4 w-4" />
                      Sign Waivers
                    </Button>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
