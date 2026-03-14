"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Users,
  Clock,
  Plus,
  Filter,
  Ship,
  Anchor,
  MapPin,
  List,
  Grid3X3,
  CalendarDays,
  Eye,
  X,
  ChevronDown,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  addWeeks,
  subWeeks,
  isToday,
  isPast,
  startOfDay,
} from "date-fns";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface Tour {
  id: string;
  name: string;
  location: string;
  color: string;
}

interface Boat {
  id: string;
  name: string;
  capacity: number;
  boat_type: string;
}

interface Availability {
  id: string;
  tourId: string;
  tourName: string;
  tourLocation: string;
  boatId: string | null;
  boatName: string | null;
  date: string;
  time: string;
  endTime: string;
  booked: number;
  capacity: number;
  status: string;
  color: string;
  staffName?: string;
}

type ViewMode = "week" | "day" | "agenda";

const timeSlots = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00",
];

// V6 Pastel color palette
const colorPalette = [
  "bg-mint border-mint-dark text-mint-dark",
  "bg-sky border-sky-dark text-sky-dark",
  "bg-lavender border-lavender-dark text-lavender-dark",
  "bg-peach border-peach-dark text-peach-dark",
  "bg-rose border-rose-dark text-rose-dark",
];

export default function CalendarPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");

  // Filters
  const [selectedTour, setSelectedTour] = useState("all");
  const [selectedBoat, setSelectedBoat] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Data
  const [tours, setTours] = useState<Tour[]>([]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Availability | null>(null);

  // Derived data
  const locations = useMemo(() => {
    const locs = [...new Set(tours.map(t => t.location).filter(Boolean))];
    return locs.sort();
  }, [tours]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedTour !== "all") count++;
    if (selectedBoat !== "all") count++;
    if (selectedLocation !== "all") count++;
    return count;
  }, [selectedTour, selectedBoat, selectedLocation]);

  const filteredAvailabilities = useMemo(() => {
    return availabilities.filter(a => {
      if (selectedTour !== "all" && a.tourId !== selectedTour) return false;
      if (selectedBoat !== "all" && a.boatId !== selectedBoat) return false;
      if (selectedLocation !== "all" && a.tourLocation !== selectedLocation) return false;
      return true;
    });
  }, [availabilities, selectedTour, selectedBoat, selectedLocation]);

  // Stats
  const stats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todaySlots = filteredAvailabilities.filter(a => a.date === today);
    const totalGuests = todaySlots.reduce((sum, a) => sum + a.booked, 0);
    const totalCapacity = todaySlots.reduce((sum, a) => sum + a.capacity, 0);
    const fullSlots = filteredAvailabilities.filter(a => a.status === 'full').length;

    return {
      todaySlots: todaySlots.length,
      todayGuests: totalGuests,
      todayCapacity: totalCapacity,
      utilization: totalCapacity > 0 ? Math.round((totalGuests / totalCapacity) * 100) : 0,
      fullSlots,
      totalSlots: filteredAvailabilities.length,
    };
  }, [filteredAvailabilities]);

  const fetchData = async () => {
    try {
      const supabase = createClient();

      // Fetch tours with location
      const { data: toursData } = await supabase
        .from('tours')
        .select('id, name, location')
        .eq('status', 'active')
        .order('name');

      if (toursData) {
        setTours(toursData.map((t, index) => ({
          id: t.id,
          name: t.name,
          location: t.location || 'Unknown',
          color: colorPalette[index % colorPalette.length],
        })));
      }

      // Fetch boats
      const { data: boatsData } = await supabase
        .from('boats')
        .select('id, name, capacity, boat_type')
        .eq('status', 'active')
        .order('name');

      if (boatsData) {
        setBoats(boatsData);
      }

      // Calculate date range based on view mode
      let startDate: string;
      let endDate: string;

      if (viewMode === 'day') {
        startDate = format(selectedDay, 'yyyy-MM-dd');
        endDate = startDate;
      } else if (viewMode === 'agenda') {
        startDate = format(new Date(), 'yyyy-MM-dd');
        endDate = format(addDays(new Date(), 13), 'yyyy-MM-dd');
      } else {
        startDate = format(currentWeek, 'yyyy-MM-dd');
        endDate = format(addDays(currentWeek, 6), 'yyyy-MM-dd');
      }

      // Fetch availabilities with boat and staff info
      const { data: availData } = await supabase
        .from('availabilities')
        .select(`
          *,
          tours(name, location, max_capacity),
          boats(name),
          availability_staff(staff(name))
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date')
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

          const staffAssignment = a.availability_staff?.[0]?.staff;

          return {
            id: a.id,
            tourId: a.tour_id,
            tourName: a.tours?.name || 'Unknown Tour',
            tourLocation: a.tours?.location || 'Unknown',
            boatId: a.boat_id,
            boatName: a.boats?.name || null,
            date: a.date,
            time: a.start_time?.substring(0, 5) || '',
            endTime: a.end_time?.substring(0, 5) || '',
            booked: a.booked_count || 0,
            capacity,
            status,
            color: tourColorMap[a.tour_id] || colorPalette[0],
            staffName: staffAssignment?.name || undefined,
          };
        }));
      }
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentWeek, selectedDay, viewMode]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const navigateWeek = (direction: "prev" | "next") => {
    setCurrentWeek((prev) =>
      direction === "next" ? addWeeks(prev, 1) : subWeeks(prev, 1)
    );
  };

  const navigateDay = (direction: "prev" | "next") => {
    setSelectedDay((prev) =>
      direction === "next" ? addDays(prev, 1) : addDays(prev, -1)
    );
  };

  const goToToday = () => {
    setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));
    setSelectedDay(new Date());
  };

  const clearFilters = () => {
    setSelectedTour("all");
    setSelectedBoat("all");
    setSelectedLocation("all");
  };

  const getSlotsForTime = (date: Date, time: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return filteredAvailabilities.filter(a => a.date === dateStr && a.time === time);
  };

  const getSlotsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return filteredAvailabilities
      .filter(a => a.date === dateStr)
      .sort((a, b) => a.time.localeCompare(b.time));
  };

  const calendarDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  // Slot Card Component
  const SlotCard = ({ slot, compact = false }: { slot: Availability; compact?: boolean }) => {
    const slotDate = new Date(slot.date);
    const isPastSlot = isPast(startOfDay(slotDate)) && !isToday(slotDate);

    return (
      <Dialog>
        <DialogTrigger asChild>
          <button
            onClick={() => setSelectedSlot(slot)}
            className={cn(
              "w-full p-2 rounded-lg text-left transition-all hover:shadow-md border-l-4",
              isPastSlot && "opacity-60",
              slot.status === "full"
                ? "bg-rose border-rose-dark text-rose-dark"
                : slot.status === "limited"
                ? "bg-peach border-peach-dark text-peach-dark"
                : slot.color
            )}
          >
            <p className="font-medium text-xs truncate">
              {slot.tourName}
            </p>
            {!compact && (
              <>
                <div className="flex items-center gap-1 mt-1">
                  {slot.boatName && (
                    <span className="text-[10px] opacity-70 flex items-center gap-0.5">
                      <Anchor className="h-2.5 w-2.5" />
                      {slot.boatName}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs opacity-70">
                    {slot.time}
                  </span>
                  <span className="text-xs font-medium">
                    {slot.booked}/{slot.capacity}
                  </span>
                </div>
              </>
            )}
            {compact && (
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[10px] opacity-70">{slot.time}</span>
                <span className="text-[10px] font-medium">{slot.booked}/{slot.capacity}</span>
              </div>
            )}
          </button>
        </DialogTrigger>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ship className="h-5 w-5 text-primary" />
              {slot.tourName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-sky rounded-xl">
                <p className="text-sm text-sky-dark/70">Date</p>
                <p className="font-medium text-sky-dark">
                  {format(new Date(slot.date), "EEEE, MMMM d")}
                </p>
              </div>
              <div className="p-4 bg-lavender rounded-xl">
                <p className="text-sm text-lavender-dark/70">Time</p>
                <p className="font-medium text-lavender-dark">
                  {slot.time} - {slot.endTime}
                </p>
              </div>
            </div>

            {/* Location & Boat */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-mint rounded-xl">
                <p className="text-sm text-mint-dark/70 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Location
                </p>
                <p className="font-medium text-mint-dark">
                  {slot.tourLocation}
                </p>
              </div>
              <div className="p-4 bg-peach rounded-xl">
                <p className="text-sm text-peach-dark/70 flex items-center gap-1">
                  <Anchor className="h-3 w-3" /> Boat
                </p>
                <p className="font-medium text-peach-dark">
                  {slot.boatName || 'Not assigned'}
                </p>
              </div>
            </div>

            {/* Staff */}
            {slot.staffName && (
              <div className="p-3 border rounded-xl flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky to-lavender flex items-center justify-center font-medium text-sky-dark">
                  {slot.staffName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Assigned Captain/Guide</p>
                  <p className="font-medium">{slot.staffName}</p>
                </div>
              </div>
            )}

            {/* Bookings */}
            <div className="p-4 bg-muted rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Bookings</p>
                <Badge
                  variant={
                    slot.status === "full"
                      ? "rose"
                      : slot.status === "limited"
                      ? "peach"
                      : "mint"
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
                  <div className="h-2 bg-background rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        slot.booked / slot.capacity > 0.9
                          ? "bg-rose-dark"
                          : slot.booked / slot.capacity > 0.7
                          ? "bg-peach-dark"
                          : "bg-mint-dark"
                      )}
                      style={{
                        width: `${(slot.booked / slot.capacity) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Link href={`/dashboard/bookings?availability=${slot.id}`} className="flex-1">
                <Button variant="outline" className="w-full rounded-xl">
                  <Eye className="h-4 w-4 mr-2" />
                  View Bookings
                </Button>
              </Link>
              <Link href={`/dashboard/bookings/new?availability=${slot.id}`} className="flex-1">
                <Button className="w-full gradient-primary border-0 rounded-xl shadow-lg shadow-primary/30">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Booking
                </Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded-xl w-48" />
          <div className="h-12 bg-muted rounded-xl" />
          <div className="flex-1 bg-muted rounded-2xl" />
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
            <h1 className="text-2xl font-bold">Booking Calendar</h1>
            <p className="text-muted-foreground">
              Manage tour availability and bookings
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="hidden md:block">
              <TabsList className="rounded-xl">
                <TabsTrigger value="week" className="rounded-lg gap-1.5">
                  <Grid3X3 className="h-4 w-4" />
                  Week
                </TabsTrigger>
                <TabsTrigger value="day" className="rounded-lg gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  Day
                </TabsTrigger>
                <TabsTrigger value="agenda" className="rounded-lg gap-1.5">
                  <List className="h-4 w-4" />
                  Agenda
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Filters */}
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 rounded-xl">
                  <Filter className="h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center bg-primary text-primary-foreground rounded-full">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 rounded-xl" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filters</h4>
                    {activeFilterCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                        Clear all
                      </Button>
                    )}
                  </div>

                  {/* Location Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      Location
                    </label>
                    <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="All Locations" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all">All Locations</SelectItem>
                        {locations.map((loc) => (
                          <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Boat Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Anchor className="h-4 w-4 text-muted-foreground" />
                      Boat
                    </label>
                    <Select value={selectedBoat} onValueChange={setSelectedBoat}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="All Boats" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all">All Boats</SelectItem>
                        {boats.map((boat) => (
                          <SelectItem key={boat.id} value={boat.id}>
                            {boat.name} ({boat.capacity} pax)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tour Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Ship className="h-4 w-4 text-muted-foreground" />
                      Tour
                    </label>
                    <Select value={selectedTour} onValueChange={setSelectedTour}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="All Tours" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all">All Tours</SelectItem>
                        {tours.map((tour) => (
                          <SelectItem key={tour.id} value={tour.id}>{tour.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing} className="rounded-xl">
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>

            <Link href="/dashboard/availability">
              <Button className="gap-2 gradient-primary border-0 rounded-xl shadow-lg shadow-primary/30">
                <Plus className="h-4 w-4" />
                Add Availability
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="p-3 bg-sky rounded-xl">
            <p className="text-xs text-sky-dark/70">Today's Tours</p>
            <p className="text-xl font-bold text-sky-dark">{stats.todaySlots}</p>
          </div>
          <div className="p-3 bg-mint rounded-xl">
            <p className="text-xs text-mint-dark/70">Today's Guests</p>
            <p className="text-xl font-bold text-mint-dark">{stats.todayGuests}</p>
          </div>
          <div className="p-3 bg-lavender rounded-xl">
            <p className="text-xs text-lavender-dark/70">Utilization</p>
            <p className="text-xl font-bold text-lavender-dark">{stats.utilization}%</p>
          </div>
          <div className="p-3 bg-peach rounded-xl">
            <p className="text-xs text-peach-dark/70">Full Slots</p>
            <p className="text-xl font-bold text-peach-dark">{stats.fullSlots}/{stats.totalSlots}</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => viewMode === 'day' ? navigateDay('prev') : navigateWeek('prev')}
              className="rounded-xl"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => viewMode === 'day' ? navigateDay('next') : navigateWeek('next')}
              className="rounded-xl"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday} className="rounded-xl">
              Today
            </Button>
          </div>

          <h2 className="text-lg font-semibold">
            {viewMode === 'day'
              ? format(selectedDay, "EEEE, MMMM d, yyyy")
              : viewMode === 'agenda'
              ? `Next 14 Days`
              : `${format(currentWeek, "MMMM d")} - ${format(addDays(currentWeek, 6), "MMMM d, yyyy")}`
            }
          </h2>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 rounded-lg">
              <div className="h-2 w-2 rounded-full bg-mint-dark" />
              Available
            </Badge>
            <Badge variant="outline" className="gap-1 rounded-lg">
              <div className="h-2 w-2 rounded-full bg-peach-dark" />
              Limited
            </Badge>
            <Badge variant="outline" className="gap-1 rounded-lg">
              <div className="h-2 w-2 rounded-full bg-rose-dark" />
              Full
            </Badge>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-auto p-6">
        {filteredAvailabilities.length === 0 && tours.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <CalendarIcon className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No availability set up</p>
              <p className="text-muted-foreground mb-4">
                Create tours and add availability to see them here
              </p>
              <Link href="/dashboard/availability">
                <Button className="gap-2 gradient-primary border-0 rounded-xl shadow-lg shadow-primary/30">
                  <Plus className="h-4 w-4" />
                  Add Availability
                </Button>
              </Link>
            </div>
          </div>
        ) : viewMode === 'agenda' ? (
          /* Agenda View */
          <div className="space-y-6">
            {Array.from({ length: 14 }, (_, i) => addDays(new Date(), i)).map(day => {
              const daySlots = getSlotsForDay(day);
              if (daySlots.length === 0) return null;

              return (
                <div key={day.toISOString()}>
                  <div className={cn(
                    "sticky top-0 z-10 py-2 px-3 mb-3 rounded-xl font-medium",
                    isToday(day)
                      ? "bg-gradient-to-r from-sky to-lavender text-sky-dark"
                      : "bg-muted"
                  )}>
                    {format(day, "EEEE, MMMM d")}
                    {isToday(day) && <Badge className="ml-2 bg-sky-dark text-white">Today</Badge>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {daySlots.map(slot => (
                      <Card key={slot.id} className="rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold">{slot.tourName}</h3>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {slot.time} - {slot.endTime}
                              </p>
                            </div>
                            <Badge
                              variant={
                                slot.status === "full" ? "rose" :
                                slot.status === "limited" ? "peach" : "mint"
                              }
                            >
                              {slot.booked}/{slot.capacity}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {slot.tourLocation}
                            </span>
                            {slot.boatName && (
                              <span className="flex items-center gap-1">
                                <Anchor className="h-3 w-3" />
                                {slot.boatName}
                              </span>
                            )}
                          </div>

                          <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                slot.status === "full" ? "bg-rose-dark" :
                                slot.status === "limited" ? "bg-peach-dark" : "bg-mint-dark"
                              )}
                              style={{ width: `${(slot.booked / slot.capacity) * 100}%` }}
                            />
                          </div>

                          <div className="flex gap-2">
                            <Link href={`/dashboard/bookings?availability=${slot.id}`} className="flex-1">
                              <Button variant="outline" size="sm" className="w-full rounded-lg">
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            </Link>
                            <Link href={`/dashboard/bookings/new?availability=${slot.id}`} className="flex-1">
                              <Button size="sm" className="w-full gradient-primary border-0 rounded-lg">
                                <Plus className="h-3 w-3 mr-1" />
                                Book
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === 'day' ? (
          /* Day View */
          <div className="max-w-3xl mx-auto">
            <div className="space-y-2">
              {timeSlots.map(time => {
                const slots = getSlotsForTime(selectedDay, time);

                return (
                  <div key={time} className="flex gap-4">
                    <div className="w-16 text-sm text-muted-foreground text-right pt-2 shrink-0">
                      {time}
                    </div>
                    <div className="flex-1 min-h-[70px] p-2 bg-card border border-border/50 rounded-xl">
                      {slots.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {slots.map(slot => (
                            <SlotCard key={slot.id} slot={slot} />
                          ))}
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground/50 text-sm">
                          No tours scheduled
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Week View */
          <div className="min-w-[900px]">
            {/* Day Headers */}
            <div className="grid grid-cols-8 gap-1.5 mb-2">
              <div className="p-2 text-sm font-medium text-muted-foreground">
                Time
              </div>
              {calendarDays.map((day) => {
                const dayIsToday = isSameDay(day, new Date());
                const daySlots = getSlotsForDay(day);
                const dayGuests = daySlots.reduce((sum, s) => sum + s.booked, 0);

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "p-3 text-center rounded-xl cursor-pointer transition-all hover:ring-2 hover:ring-primary/20",
                      dayIsToday ? "bg-gradient-to-br from-sky to-lavender text-sky-dark" : "bg-muted"
                    )}
                    onClick={() => {
                      setSelectedDay(day);
                      setViewMode('day');
                    }}
                  >
                    <p className="text-xs uppercase tracking-wide opacity-70">
                      {format(day, "EEE")}
                    </p>
                    <p className="text-lg font-bold">{format(day, "d")}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {daySlots.length} tours • {dayGuests} guests
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Time Slots */}
            <div className="grid grid-cols-8 gap-1.5">
              {timeSlots.map((time) => (
                <React.Fragment key={time}>
                  {/* Time Label */}
                  <div className="p-2 text-sm text-muted-foreground text-right pr-4">
                    {time}
                  </div>

                  {/* Day Cells */}
                  {calendarDays.map((day) => {
                    const slots = getSlotsForTime(day, time);

                    return (
                      <div
                        key={`${day.toISOString()}-${time}`}
                        className="min-h-[60px] p-1 bg-card border border-border/50 rounded-xl"
                      >
                        {slots.length > 0 && (
                          <div className="space-y-1">
                            {slots.slice(0, 2).map(slot => (
                              <SlotCard key={slot.id} slot={slot} compact={slots.length > 1} />
                            ))}
                            {slots.length > 2 && (
                              <p className="text-xs text-center text-muted-foreground">
                                +{slots.length - 2} more
                              </p>
                            )}
                          </div>
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
