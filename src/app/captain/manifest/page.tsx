"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Separator } from "@/components/ui/separator";
import {
  Calendar as CalendarIcon,
  Search,
  Users,
  Ship,
  Clock,
  MapPin,
  Phone,
  FileText,
  CheckCircle2,
  AlertCircle,
  Printer,
  Download,
  RefreshCw,
  Send,
  UserPlus,
  Loader2,
  ChevronDown,
  Anchor,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  waiverSigned: boolean;
  checkedIn: boolean;
}

interface Booking {
  id: string;
  bookingId: string;
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  };
  guests: Guest[];
  notes: string | null;
  totalPrice: number;
}

interface ManifestTour {
  id: string;
  availabilityId: string;
  name: string;
  time: string;
  endTime: string;
  location: string;
  meetingPoint: string;
  capacity: number;
  bookings: Booking[];
}

function CaptainManifestContent() {
  const searchParams = useSearchParams();
  const initialDate = searchParams.get('date');
  const initialAvailability = searchParams.get('availability');

  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(
    initialDate ? parseISO(initialDate) : new Date()
  );
  const [selectedTour, setSelectedTour] = useState(initialAvailability || "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [manifestData, setManifestData] = useState<ManifestTour[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingWaiver, setSendingWaiver] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);

  const fetchManifest = async () => {
    setLoading(true);
    try {
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
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // Fetch only assigned availabilities for this captain
      const { data: assignments } = await supabase
        .from('availability_staff')
        .select(`
          availability_id,
          availabilities!inner (
            id,
            date,
            start_time,
            end_time,
            capacity_override,
            status,
            tours!inner (
              id,
              name,
              location,
              meeting_point,
              max_capacity
            )
          )
        `)
        .eq('staff_id', staffData.id)
        .eq('availabilities.date', dateStr)
        .neq('availabilities.status', 'cancelled');

      if (!assignments || assignments.length === 0) {
        setManifestData([]);
        setLoading(false);
        return;
      }

      // Build manifest for each assigned tour
      const manifest: ManifestTour[] = await Promise.all(
        assignments.map(async (assignment: any) => {
          const availability = assignment.availabilities;
          const tour = availability.tours;

          // Fetch bookings with guests and waivers
          const { data: bookings } = await supabase
            .from('bookings')
            .select(`
              id,
              booking_reference,
              notes,
              total_price,
              customers!inner (
                first_name,
                last_name,
                email,
                phone
              ),
              booking_guests (
                id,
                first_name,
                last_name,
                email,
                checked_in,
                waivers (
                  status
                )
              )
            `)
            .eq('availability_id', availability.id)
            .in('status', ['confirmed', 'pending']);

          return {
            id: tour.id,
            availabilityId: availability.id,
            name: tour.name,
            time: availability.start_time?.substring(0, 5) || '',
            endTime: availability.end_time?.substring(0, 5) || '',
            location: tour.location || '',
            meetingPoint: tour.meeting_point || 'See tour details',
            capacity: availability.capacity_override || tour.max_capacity || 10,
            bookings: (bookings || []).map((b: any) => ({
              id: b.booking_reference || b.id,
              bookingId: b.id,
              customer: {
                firstName: b.customers?.first_name || '',
                lastName: b.customers?.last_name || '',
                phone: b.customers?.phone || '',
                email: b.customers?.email || '',
              },
              guests: (b.booking_guests || []).map((g: any) => ({
                id: g.id,
                firstName: g.first_name || '',
                lastName: g.last_name || '',
                email: g.email || null,
                waiverSigned: g.waivers?.some((w: any) => w.status === 'signed') || false,
                checkedIn: g.checked_in || false,
              })),
              notes: b.notes || null,
              totalPrice: b.total_price || 0,
            })),
          };
        })
      );

      setManifestData(manifest);

      // Auto-select if only one tour or if specific availability requested
      if (initialAvailability && manifest.some(m => m.availabilityId === initialAvailability)) {
        setSelectedTour(initialAvailability);
      } else if (manifest.length === 1) {
        setSelectedTour(manifest[0].availabilityId);
      }
    } catch (error) {
      console.error('Error fetching manifest:', error);
      toast.error("Failed to load manifest");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchManifest();
  }, [selectedDate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchManifest();
    toast.success("Manifest updated");
  };

  const handlePrint = () => {
    window.print();
  };

  const exportManifest = () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const headers = ["Tour", "Time", "Booking Ref", "Customer", "Guest Name", "Email", "Waiver Signed", "Checked In"];
    const rows: string[][] = [];

    filteredManifest.forEach(tour => {
      tour.bookings.forEach(booking => {
        booking.guests.forEach(guest => {
          rows.push([
            tour.name,
            `${tour.time} - ${tour.endTime}`,
            booking.id,
            `${booking.customer.firstName} ${booking.customer.lastName}`,
            `${guest.firstName} ${guest.lastName}`,
            guest.email || '',
            guest.waiverSigned ? "Yes" : "No",
            guest.checkedIn ? "Yes" : "No"
          ]);
        });
      });
    });

    const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `captain-manifest-${dateStr}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("Manifest exported");
  };

  const sendWaiverToGuest = async (guestId: string, bookingId: string) => {
    setSendingWaiver(guestId);
    try {
      const response = await fetch('/api/waivers/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestId, bookingId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send waiver');
      }

      toast.success("Waiver sent to guest");
    } catch (err: any) {
      toast.error(err.message || 'Failed to send waiver');
    } finally {
      setSendingWaiver(null);
    }
  };

  const openSignOnDevice = (guestId: string, bookingId: string) => {
    window.open(`/waiver/${bookingId}?guest=${guestId}`, '_blank');
  };

  const filteredManifest = manifestData
    .filter((tour) => selectedTour === "all" || tour.availabilityId === selectedTour)
    .map((tour) => ({
      ...tour,
      bookings: tour.bookings.filter(
        (booking) =>
          booking.customer.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          booking.customer.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          booking.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          booking.guests.some(g =>
            g.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            g.lastName.toLowerCase().includes(searchQuery.toLowerCase())
          )
      ),
    }))
    .filter((tour) => tour.bookings.length > 0 || searchQuery === "");

  const toggleGuestCheckIn = async (tourId: string, bookingId: string, guestId: string) => {
    const tour = manifestData.find(t => t.id === tourId);
    const booking = tour?.bookings.find(b => b.id === bookingId);
    const guest = booking?.guests.find(g => g.id === guestId);

    if (!guest) return;

    const newCheckedIn = !guest.checkedIn;

    // Optimistic update
    setManifestData((prev) =>
      prev.map((t) => {
        if (t.id !== tourId) return t;
        return {
          ...t,
          bookings: t.bookings.map((b) => {
            if (b.id !== bookingId) return b;
            return {
              ...b,
              guests: b.guests.map((g) => {
                if (g.id !== guestId) return g;
                return { ...g, checkedIn: newCheckedIn };
              }),
            };
          }),
        };
      })
    );

    try {
      const supabase = createClient();
      await supabase
        .from('booking_guests')
        .update({ checked_in: newCheckedIn })
        .eq('id', guestId);

      toast.success(newCheckedIn ? "Guest checked in" : "Check-in removed");
    } catch (error) {
      // Revert on error
      setManifestData((prev) =>
        prev.map((t) => {
          if (t.id !== tourId) return t;
          return {
            ...t,
            bookings: t.bookings.map((b) => {
              if (b.id !== bookingId) return b;
              return {
                ...b,
                guests: b.guests.map((g) => {
                  if (g.id !== guestId) return g;
                  return { ...g, checkedIn: !newCheckedIn };
                }),
              };
            }),
          };
        })
      );
      toast.error("Failed to update check-in");
    }
  };

  const getWaiverStatus = (guests: Guest[]) => {
    const signedCount = guests.filter((g) => g.waiverSigned).length;
    if (signedCount === guests.length) return "all_signed";
    if (signedCount > 0) return "partial";
    return "none";
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="flex gap-4">
            <div className="h-10 bg-muted rounded w-48" />
            <div className="h-10 bg-muted rounded w-48" />
            <div className="h-10 bg-muted rounded flex-1" />
          </div>
          <div className="h-64 bg-muted rounded-lg" />
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
              <Anchor className="h-6 w-6 text-indigo-600" />
              My Manifest
            </h1>
            <p className="text-muted-foreground">
              Check-in guests for your assigned tours
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button variant="outline" className="gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" className="gap-2" onClick={exportManifest}>
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mt-6">
          {/* Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[200px] justify-start gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(selectedDate, "EEEE, MMM d")}
                <ChevronDown className="h-4 w-4 ml-auto" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
              />
            </PopoverContent>
          </Popover>

          {/* Tour Filter */}
          {manifestData.length > 1 && (
            <Select value={selectedTour} onValueChange={setSelectedTour}>
              <SelectTrigger className="w-[200px]">
                <Ship className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Tours" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All My Tours</SelectItem>
                {manifestData.map((tour) => (
                  <SelectItem key={tour.availabilityId} value={tour.availabilityId}>
                    {tour.name} ({tour.time})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search guests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Manifest Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {manifestData.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <Anchor className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">No Tours Assigned</p>
                <p className="text-muted-foreground mb-4">
                  You don&apos;t have any tours assigned for {format(selectedDate, "MMMM d, yyyy")}
                </p>
                <Button variant="outline" onClick={() => setSelectedDate(new Date())}>
                  Go to Today
                </Button>
              </div>
            </Card>
          ) : (
            filteredManifest.map((tour) => {
              const totalGuests = tour.bookings.reduce((acc, b) => acc + b.guests.length, 0);
              const checkedInGuests = tour.bookings.reduce(
                (acc, b) => acc + b.guests.filter((g) => g.checkedIn).length,
                0
              );
              const pendingWaivers = tour.bookings.reduce(
                (acc, b) => acc + b.guests.filter((g) => !g.waiverSigned).length,
                0
              );

              return (
                <Card key={tour.availabilityId} className="overflow-hidden">
                  {/* Tour Header */}
                  <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-indigo-500/5 border-b">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-xl bg-indigo-100 flex items-center justify-center">
                          <Ship className="h-7 w-7 text-indigo-600" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">{tour.name}</CardTitle>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {tour.time} - {tour.endTime}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {tour.meetingPoint}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-indigo-600">{checkedInGuests}/{totalGuests}</p>
                          <p className="text-xs text-muted-foreground">Checked In</p>
                        </div>
                        <Separator orientation="vertical" className="h-12" />
                        <div className="text-center">
                          <p className="text-2xl font-bold">{totalGuests}/{tour.capacity}</p>
                          <p className="text-xs text-muted-foreground">Capacity</p>
                        </div>
                        {pendingWaivers > 0 && (
                          <>
                            <Separator orientation="vertical" className="h-12" />
                            <div className="text-center">
                              <p className="text-2xl font-bold text-orange-600">{pendingWaivers}</p>
                              <p className="text-xs text-muted-foreground">Pending Waivers</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    {tour.bookings.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No bookings for this tour</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {tour.bookings.map((booking) => {
                          const waiverStatus = getWaiverStatus(booking.guests);
                          const checkedIn = booking.guests.filter((g) => g.checkedIn).length;

                          return (
                            <div key={booking.id} className="p-4 hover:bg-muted/30 transition-colors">
                              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                {/* Booking Info */}
                                <div className="flex items-start gap-4">
                                  <div
                                    className={cn(
                                      "h-12 w-12 rounded-xl flex items-center justify-center",
                                      waiverStatus === "all_signed"
                                        ? "bg-green-100"
                                        : waiverStatus === "partial"
                                        ? "bg-orange-100"
                                        : "bg-red-100"
                                    )}
                                  >
                                    {waiverStatus === "all_signed" ? (
                                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                                    ) : (
                                      <AlertCircle
                                        className={cn(
                                          "h-6 w-6",
                                          waiverStatus === "partial" ? "text-orange-600" : "text-red-600"
                                        )}
                                      />
                                    )}
                                  </div>

                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-semibold">
                                        {booking.customer.firstName} {booking.customer.lastName}
                                      </p>
                                      <Badge variant="outline" className="font-mono text-xs">
                                        {booking.id}
                                      </Badge>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        {booking.guests.length} guests ({checkedIn} in)
                                      </span>
                                      {booking.customer.phone && (
                                        <a
                                          href={`tel:${booking.customer.phone}`}
                                          className="flex items-center gap-1 hover:text-indigo-600"
                                        >
                                          <Phone className="h-3 w-3" />
                                          {booking.customer.phone}
                                        </a>
                                      )}
                                    </div>

                                    {booking.notes && (
                                      <p className="text-sm text-indigo-600 mt-1">
                                        Note: {booking.notes}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Guest Check-in */}
                                <div className="flex flex-wrap gap-2">
                                  {booking.guests.map((guest) => (
                                    <Dialog key={guest.id}>
                                      <DialogTrigger asChild>
                                        <button
                                          className={cn(
                                            "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
                                            guest.checkedIn
                                              ? "bg-green-50 border-green-300 text-green-800"
                                              : guest.waiverSigned
                                              ? "bg-white border-gray-200 hover:border-indigo-300"
                                              : "bg-red-50 border-red-200 text-red-800"
                                          )}
                                        >
                                          <Checkbox
                                            checked={guest.checkedIn}
                                            onCheckedChange={() =>
                                              toggleGuestCheckIn(tour.id, booking.id, guest.id)
                                            }
                                            onClick={(e) => e.stopPropagation()}
                                            className={cn(
                                              guest.checkedIn && "bg-green-600 border-green-600"
                                            )}
                                          />
                                          <span className="text-sm font-medium">
                                            {guest.firstName} {guest.lastName[0]}.
                                          </span>
                                          {!guest.waiverSigned && (
                                            <AlertCircle className="h-4 w-4 text-red-600" />
                                          )}
                                        </button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>
                                            {guest.firstName} {guest.lastName}
                                          </DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-muted rounded-lg">
                                              <p className="text-sm text-muted-foreground">Waiver</p>
                                              <Badge
                                                className={cn(
                                                  "mt-1",
                                                  guest.waiverSigned
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-red-100 text-red-800"
                                                )}
                                              >
                                                {guest.waiverSigned ? "Signed" : "Not Signed"}
                                              </Badge>
                                            </div>
                                            <div className="p-4 bg-muted rounded-lg">
                                              <p className="text-sm text-muted-foreground">Check-in</p>
                                              <Badge
                                                className={cn(
                                                  "mt-1",
                                                  guest.checkedIn
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-gray-100 text-gray-800"
                                                )}
                                              >
                                                {guest.checkedIn ? "Checked In" : "Not Checked In"}
                                              </Badge>
                                            </div>
                                          </div>

                                          {guest.email && (
                                            <div className="text-sm text-muted-foreground">
                                              Email: {guest.email}
                                            </div>
                                          )}

                                          {!guest.waiverSigned && (
                                            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                                              <p className="text-sm text-orange-800 mb-3">
                                                Waiver not signed yet
                                              </p>
                                              <div className="flex gap-2">
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="gap-2"
                                                  onClick={() => sendWaiverToGuest(guest.id, booking.bookingId)}
                                                  disabled={sendingWaiver === guest.id}
                                                >
                                                  {sendingWaiver === guest.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                  ) : (
                                                    <Send className="h-4 w-4" />
                                                  )}
                                                  Send Link
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                                                  onClick={() => openSignOnDevice(guest.id, booking.bookingId)}
                                                >
                                                  <FileText className="h-4 w-4" />
                                                  Sign Here
                                                </Button>
                                              </div>
                                            </div>
                                          )}

                                          <Button
                                            className={cn(
                                              "w-full",
                                              guest.checkedIn
                                                ? "bg-gray-500 hover:bg-gray-600"
                                                : "bg-indigo-600 hover:bg-indigo-700"
                                            )}
                                            onClick={() => toggleGuestCheckIn(tour.id, booking.id, guest.id)}
                                          >
                                            {guest.checkedIn ? "Undo Check-in" : "Check In Guest"}
                                          </Button>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default function CaptainManifestPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex flex-col p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="flex gap-4">
            <div className="h-10 bg-muted rounded w-48" />
            <div className="h-10 bg-muted rounded w-48" />
            <div className="h-10 bg-muted rounded flex-1" />
          </div>
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    }>
      <CaptainManifestContent />
    </Suspense>
  );
}
