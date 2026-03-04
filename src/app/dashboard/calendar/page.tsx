"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Users,
  Clock,
  Plus,
  Filter,
  Ship,
} from "lucide-react";
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  addWeeks,
  subWeeks,
} from "date-fns";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface Tour {
  id: string;
  name: string;
  color: string;
}

interface Availability {
  id: string;
  tourId: string;
  tourName: string;
  date: string;
  time: string;
  endTime: string;
  booked: number;
  capacity: number;
  status: string;
  color: string;
}

const timeSlots = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00",
];

const colorPalette = [
  "bg-green-100 border-green-400 text-green-800",
  "bg-blue-100 border-blue-400 text-blue-800",
  "bg-purple-100 border-purple-400 text-purple-800",
  "bg-orange-100 border-orange-400 text-orange-800",
  "bg-pink-100 border-pink-400 text-pink-800",
  "bg-cyan-100 border-cyan-400 text-cyan-800",
];

export default function CalendarPage() {
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedTour, setSelectedTour] = useState("all");
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient();

        // Fetch tours
        const { data: toursData } = await supabase
          .from('tours')
          .select('id, name')
          .eq('status', 'active')
          .order('name');

        if (toursData) {
          setTours(toursData.map((t, index) => ({
            id: t.id,
            name: t.name,
            color: colorPalette[index % colorPalette.length].split(' ')[0].replace('bg-', ''),
          })));
        }

        // Calculate week date range
        const weekStart = format(currentWeek, 'yyyy-MM-dd');
        const weekEnd = format(addDays(currentWeek, 6), 'yyyy-MM-dd');

        // Fetch availabilities for the week
        const { data: availData } = await supabase
          .from('availabilities')
          .select('*, tours(name, max_capacity)')
          .gte('date', weekStart)
          .lte('date', weekEnd)
          .order('start_time');

        if (availData) {
          const tourColorMap: Record<string, string> = {};
          toursData?.forEach((t, index) => {
            tourColorMap[t.id] = colorPalette[index % colorPalette.length];
          });

          setAvailabilities(availData.map(a => {
            const capacity = a.capacity_override || a.tours?.max_capacity || 10;
            const bookedRatio = (a.booked_count || 0) / capacity;
            let status = "available";
            if (bookedRatio >= 1) status = "full";
            else if (bookedRatio >= 0.8) status = "limited";

            return {
              id: a.id,
              tourId: a.tour_id,
              tourName: a.tours?.name || 'Unknown Tour',
              date: a.date,
              time: a.start_time?.substring(0, 5) || '',
              endTime: a.end_time?.substring(0, 5) || '',
              booked: a.booked_count || 0,
              capacity,
              status,
              color: tourColorMap[a.tour_id] || colorPalette[0],
            };
          }));
        }
      } catch (error) {
        console.error('Error fetching calendar data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentWeek]);

  const navigateWeek = (direction: "prev" | "next") => {
    setCurrentWeek((prev) =>
      direction === "next" ? addWeeks(prev, 1) : subWeeks(prev, 1)
    );
  };

  const goToToday = () => {
    setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const getSlotForTime = (date: Date, time: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return availabilities.find(a => a.date === dateStr && a.time === time);
  };

  const calendarDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  if (loading) {
    return (
      <div className="h-full flex flex-col p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-12 bg-muted rounded" />
          <div className="flex-1 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b bg-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarIcon className="h-6 w-6 text-primary" />
              Booking Calendar
            </h1>
            <p className="text-muted-foreground">
              Manage tour availability and bookings
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Tour filter */}
            <Select value={selectedTour} onValueChange={setSelectedTour}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter tours" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tours</SelectItem>
                {tours.map((tour) => (
                  <SelectItem key={tour.id} value={tour.id}>
                    {tour.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Availability
            </Button>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateWeek("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigateWeek("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
          </div>

          <h2 className="text-lg font-semibold">
            {format(currentWeek, "MMMM d")} - {format(addDays(currentWeek, 6), "MMMM d, yyyy")}
          </h2>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              Available
            </Badge>
            <Badge variant="outline" className="gap-1">
              <div className="h-2 w-2 rounded-full bg-orange-500" />
              Limited
            </Badge>
            <Badge variant="outline" className="gap-1">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              Full
            </Badge>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto p-6">
        {availabilities.length === 0 && tours.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <CalendarIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No availability set up</p>
              <p className="text-muted-foreground mb-4">
                Create tours and add availability to see them here
              </p>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Availability
              </Button>
            </div>
          </div>
        ) : (
          <div className="min-w-[900px]">
            {/* Day Headers */}
            <div className="grid grid-cols-8 gap-1 mb-2">
              <div className="p-2 text-sm font-medium text-muted-foreground">
                Time
              </div>
              {calendarDays.map((day) => {
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "p-3 text-center rounded-lg",
                      isToday ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}
                  >
                    <p className="text-xs uppercase tracking-wide opacity-70">
                      {format(day, "EEE")}
                    </p>
                    <p className="text-lg font-bold">{format(day, "d")}</p>
                  </div>
                );
              })}
            </div>

            {/* Time Slots */}
            <div className="grid grid-cols-8 gap-1">
              {timeSlots.map((time) => (
                <React.Fragment key={time}>
                  {/* Time Label */}
                  <div
                    className="p-2 text-sm text-muted-foreground text-right pr-4"
                  >
                    {time}
                  </div>

                  {/* Day Cells */}
                  {calendarDays.map((day) => {
                    const slot = getSlotForTime(day, time);
                    const showSlot = slot && (selectedTour === "all" || selectedTour === slot.tourId);

                    return (
                      <div
                        key={`${day.toISOString()}-${time}`}
                        className="min-h-[60px] p-1 bg-card border border-border/50 rounded-lg"
                      >
                        {showSlot && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <button
                                onClick={() => setSelectedSlot({ ...slot, date: day })}
                                className={cn(
                                  "w-full p-2 rounded-lg text-left transition-all hover:shadow-md border-l-4",
                                  slot.status === "full"
                                    ? "bg-red-50 border-red-400 text-red-800"
                                    : slot.status === "limited"
                                    ? "bg-orange-50 border-orange-400 text-orange-800"
                                    : slot.color
                                )}
                              >
                                <p className="font-medium text-xs truncate">
                                  {slot.tourName}
                                </p>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs opacity-70">
                                    {slot.time}
                                  </span>
                                  <span className="text-xs font-medium">
                                    {slot.booked}/{slot.capacity}
                                  </span>
                                </div>
                              </button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <Ship className="h-5 w-5 text-primary" />
                                  {slot.tourName}
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="p-4 bg-muted rounded-lg">
                                    <p className="text-sm text-muted-foreground">Date</p>
                                    <p className="font-medium">
                                      {format(day, "EEEE, MMMM d")}
                                    </p>
                                  </div>
                                  <div className="p-4 bg-muted rounded-lg">
                                    <p className="text-sm text-muted-foreground">Time</p>
                                    <p className="font-medium">
                                      {slot.time} - {slot.endTime}
                                    </p>
                                  </div>
                                </div>

                                <div className="p-4 bg-muted rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm text-muted-foreground">Bookings</p>
                                    <Badge
                                      className={
                                        slot.status === "full"
                                          ? "bg-red-100 text-red-800"
                                          : slot.status === "limited"
                                          ? "bg-orange-100 text-orange-800"
                                          : "bg-green-100 text-green-800"
                                      }
                                    >
                                      {slot.status === "full"
                                        ? "Full"
                                        : slot.status === "limited"
                                        ? "Limited"
                                        : "Available"}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Users className="h-5 w-5 text-muted-foreground" />
                                    <div className="flex-1">
                                      <div className="flex justify-between mb-1">
                                        <span className="text-sm">
                                          {slot.booked} booked
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                          {slot.capacity - slot.booked} available
                                        </span>
                                      </div>
                                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                          className={cn(
                                            "h-full rounded-full transition-all",
                                            slot.booked / slot.capacity > 0.9
                                              ? "bg-red-500"
                                              : slot.booked / slot.capacity > 0.7
                                              ? "bg-orange-500"
                                              : "bg-green-500"
                                          )}
                                          style={{
                                            width: `${(slot.booked / slot.capacity) * 100}%`,
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex gap-3">
                                  <Button variant="outline" className="flex-1">
                                    View Bookings
                                  </Button>
                                  <Button className="flex-1 gradient-primary border-0">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Booking
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
