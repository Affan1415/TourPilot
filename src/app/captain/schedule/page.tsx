"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Ship,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  parseISO,
} from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ScheduledTour {
  availability_id: string;
  date: string;
  start_time: string;
  end_time: string;
  tour_name: string;
  tour_slug: string;
  location: string;
  booked_count: number;
  capacity: number;
}

export default function CaptainSchedulePage() {
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [scheduleData, setScheduleData] = useState<ScheduledTour[]>([]);
  const [staffId, setStaffId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true);
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

      // Get schedule for the current month view
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      const { data: assignments } = await supabase
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
              max_capacity
            )
          )
        `)
        .eq('staff_id', staffData.id)
        .gte('availabilities.date', format(monthStart, 'yyyy-MM-dd'))
        .lte('availabilities.date', format(monthEnd, 'yyyy-MM-dd'))
        .neq('availabilities.status', 'cancelled');

      if (assignments) {
        const schedule: ScheduledTour[] = assignments.map((a: any) => ({
          availability_id: a.availabilities.id,
          date: a.availabilities.date,
          start_time: a.availabilities.start_time,
          end_time: a.availabilities.end_time,
          tour_name: a.availabilities.tours.name,
          tour_slug: a.availabilities.tours.slug,
          location: a.availabilities.tours.location,
          booked_count: a.availabilities.booked_count,
          capacity: a.availabilities.capacity_override || a.availabilities.tours.max_capacity,
        }));

        setScheduleData(schedule);
      }

      setLoading(false);
    };

    fetchSchedule();
  }, [currentMonth]);

  const daysWithTours = scheduleData.map(t => t.date);

  const toursOnSelectedDate = selectedDate
    ? scheduleData.filter(t => isSameDay(parseISO(t.date), selectedDate))
    : [];

  const monthStats = {
    totalTours: scheduleData.length,
    totalGuests: scheduleData.reduce((sum, t) => sum + t.booked_count, 0),
    daysWorking: new Set(scheduleData.map(t => t.date)).size,
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid md:grid-cols-2 gap-6">
            <div className="h-80 bg-muted rounded-lg" />
            <div className="h-80 bg-muted rounded-lg" />
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
          <CalendarIcon className="h-6 w-6 text-indigo-600" />
          My Schedule
        </h1>
        <p className="text-muted-foreground">
          View your upcoming tour assignments
        </p>
      </div>

      {/* Month Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Tours This Month</p>
          <p className="text-2xl font-bold text-indigo-600">{monthStats.totalTours}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Days Working</p>
          <p className="text-2xl font-bold">{monthStats.daysWorking}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Total Guests</p>
          <p className="text-2xl font-bold">{monthStats.totalGuests}</p>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Calendar */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">{format(currentMonth, "MMMM yyyy")}</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            modifiers={{
              hasTour: (date) => daysWithTours.some(d => isSameDay(parseISO(d), date)),
            }}
            modifiersStyles={{
              hasTour: {
                fontWeight: "bold",
                backgroundColor: "rgb(99 102 241 / 0.1)",
                color: "rgb(99 102 241)",
              },
            }}
            className="w-full"
          />

          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-indigo-100" />
              <span>Has tours</span>
            </div>
          </div>
        </Card>

        {/* Selected Day Tours */}
        <Card className="p-4">
          <h2 className="font-semibold mb-4">
            {selectedDate ? format(selectedDate, "EEEE, MMMM d") : "Select a date"}
            {selectedDate && isToday(selectedDate) && (
              <Badge className="ml-2 bg-indigo-100 text-indigo-800">Today</Badge>
            )}
          </h2>

          {toursOnSelectedDate.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Ship className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No tours scheduled for this day</p>
            </div>
          ) : (
            <div className="space-y-3">
              {toursOnSelectedDate.map((tour) => (
                <Link
                  key={tour.availability_id}
                  href={`/captain/manifest?date=${tour.date}&availability=${tour.availability_id}`}
                >
                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-indigo-500">
                    <h3 className="font-semibold">{tour.tour_name}</h3>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {tour.start_time.slice(0, 5)} - {tour.end_time.slice(0, 5)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {tour.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {tour.booked_count}/{tour.capacity}
                      </span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Upcoming Tours List */}
      <Card className="p-4">
        <h2 className="font-semibold mb-4">All Tours This Month</h2>

        {scheduleData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No tours scheduled this month</p>
          </div>
        ) : (
          <div className="space-y-2">
            {scheduleData
              .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))
              .map((tour) => (
                <Link
                  key={tour.availability_id}
                  href={`/captain/manifest?date=${tour.date}&availability=${tour.availability_id}`}
                >
                  <div
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors",
                      isToday(parseISO(tour.date)) && "bg-indigo-50"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[60px]">
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(tour.date), "EEE")}
                        </p>
                        <p className="text-lg font-bold">
                          {format(parseISO(tour.date), "d")}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">{tour.tour_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {tour.start_time.slice(0, 5)} - {tour.end_time.slice(0, 5)} • {tour.location}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {tour.booked_count}/{tour.capacity} guests
                    </Badge>
                  </div>
                </Link>
              ))}
          </div>
        )}
      </Card>
    </div>
  );
}
