"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  FileCheck,
  ChevronRight,
  Ship,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { format, isToday, isTomorrow, parseISO, addDays } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface AssignedTour {
  availability_id: string;
  date: string;
  start_time: string;
  end_time: string;
  tour_name: string;
  tour_slug: string;
  location: string;
  meeting_point: string;
  booked_count: number;
  capacity: number;
  checked_in_count: number;
  total_guests: number;
  waiver_status: 'none' | 'partial' | 'complete';
}

export default function CaptainDashboard() {
  const [loading, setLoading] = useState(true);
  const [tours, setTours] = useState<AssignedTour[]>([]);
  const [staffId, setStaffId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      // Get current user's staff ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: staffData } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!staffData) {
        setLoading(false);
        return;
      }

      setStaffId(staffData.id);

      // Fetch assigned tours for the next 7 days
      const today = new Date();
      const endDate = addDays(today, 7);

      const { data: assignedTours } = await supabase
        .from('availability_staff')
        .select(`
          availability_id,
          availabilities!inner (
            id,
            date,
            start_time,
            end_time,
            booked_count,
            capacity_override,
            status,
            tours!inner (
              name,
              slug,
              location,
              meeting_point,
              max_capacity
            )
          )
        `)
        .eq('staff_id', staffData.id)
        .gte('availabilities.date', format(today, 'yyyy-MM-dd'))
        .lte('availabilities.date', format(endDate, 'yyyy-MM-dd'))
        .neq('availabilities.status', 'cancelled')
        .order('date', { referencedTable: 'availabilities', ascending: true });

      if (assignedTours) {
        // Get booking/waiver details for each availability
        const toursWithDetails = await Promise.all(
          assignedTours.map(async (assignment: any) => {
            const availability = assignment.availabilities;
            const tour = availability.tours;

            // Get guest counts
            const { data: bookings } = await supabase
              .from('bookings')
              .select(`
                id,
                guest_count,
                booking_guests (
                  id,
                  checked_in,
                  waivers (
                    status
                  )
                )
              `)
              .eq('availability_id', availability.id)
              .neq('status', 'cancelled');

            let totalGuests = 0;
            let checkedInCount = 0;
            let signedWaivers = 0;
            let totalWaivers = 0;

            if (bookings) {
              bookings.forEach((booking: any) => {
                if (booking.booking_guests) {
                  booking.booking_guests.forEach((guest: any) => {
                    totalGuests++;
                    if (guest.checked_in) checkedInCount++;
                    if (guest.waivers && guest.waivers.length > 0) {
                      totalWaivers++;
                      if (guest.waivers[0].status === 'signed') {
                        signedWaivers++;
                      }
                    }
                  });
                }
              });
            }

            let waiverStatus: 'none' | 'partial' | 'complete' = 'none';
            if (totalWaivers > 0) {
              if (signedWaivers === totalWaivers) {
                waiverStatus = 'complete';
              } else if (signedWaivers > 0) {
                waiverStatus = 'partial';
              }
            }

            return {
              availability_id: availability.id,
              date: availability.date,
              start_time: availability.start_time,
              end_time: availability.end_time,
              tour_name: tour.name,
              tour_slug: tour.slug,
              location: tour.location,
              meeting_point: tour.meeting_point,
              booked_count: availability.booked_count,
              capacity: availability.capacity_override || tour.max_capacity,
              checked_in_count: checkedInCount,
              total_guests: totalGuests,
              waiver_status: waiverStatus,
            };
          })
        );

        setTours(toursWithDetails);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const todayTours = tours.filter(t => isToday(parseISO(t.date)));
  const tomorrowTours = tours.filter(t => isTomorrow(parseISO(t.date)));
  const upcomingTours = tours.filter(t => !isToday(parseISO(t.date)) && !isTomorrow(parseISO(t.date)));

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEEE, MMM d");
  };

  const getWaiverBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" /> All Signed</Badge>;
      case 'partial':
        return <Badge className="bg-orange-100 text-orange-800"><AlertCircle className="h-3 w-3 mr-1" /> Partial</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">No Waivers</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Ship className="h-6 w-6 text-indigo-600" />
          My Assigned Tours
        </h1>
        <p className="text-muted-foreground">
          View your upcoming tour assignments and manage check-ins
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Today's Tours</p>
          <p className="text-2xl font-bold text-indigo-600">{todayTours.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Today's Guests</p>
          <p className="text-2xl font-bold">{todayTours.reduce((sum, t) => sum + t.total_guests, 0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">This Week</p>
          <p className="text-2xl font-bold">{tours.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Guests</p>
          <p className="text-2xl font-bold">{tours.reduce((sum, t) => sum + t.total_guests, 0)}</p>
        </Card>
      </div>

      {/* Today's Tours */}
      {todayTours.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Tours
          </h2>
          <div className="grid gap-4">
            {todayTours.map((tour) => (
              <TourCard key={tour.availability_id} tour={tour} />
            ))}
          </div>
        </div>
      )}

      {/* Tomorrow's Tours */}
      {tomorrowTours.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Tomorrow</h2>
          <div className="grid gap-4">
            {tomorrowTours.map((tour) => (
              <TourCard key={tour.availability_id} tour={tour} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Tours */}
      {upcomingTours.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Upcoming</h2>
          <div className="grid gap-4">
            {upcomingTours.map((tour) => (
              <TourCard key={tour.availability_id} tour={tour} showDate />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {tours.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <Ship className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">No Tours Assigned</p>
            <p className="text-muted-foreground">
              You don't have any tours assigned for the next 7 days.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

function TourCard({ tour, showDate = false }: { tour: AssignedTour; showDate?: boolean }) {
  const getWaiverBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" /> All Signed</Badge>;
      case 'partial':
        return <Badge className="bg-orange-100 text-orange-800"><AlertCircle className="h-3 w-3 mr-1" /> Partial</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">No Waivers</Badge>;
    }
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{tour.tour_name}</h3>
            {showDate && (
              <Badge variant="outline">
                {format(parseISO(tour.date), "MMM d")}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {tour.start_time.slice(0, 5)} - {tour.end_time.slice(0, 5)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {tour.location}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {tour.checked_in_count}/{tour.total_guests} checked in
            </span>
          </div>

          <div className="flex items-center gap-2">
            {getWaiverBadge(tour.waiver_status)}
            <Badge variant="outline">
              {tour.booked_count}/{tour.capacity} booked
            </Badge>
          </div>
        </div>

        <div className="flex gap-2">
          <Link href={`/captain/manifest?date=${tour.date}&availability=${tour.availability_id}`}>
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              <FileCheck className="h-4 w-4" />
              View Manifest
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
