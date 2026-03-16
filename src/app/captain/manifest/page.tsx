"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Loader2,
  ChevronDown,
  Anchor,
  MoreVertical,
  UserCheck,
  UserX,
  Mail,
  FileDown,
  Info,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { SwipeableGuestCard } from "@/components/captain/swipeable-guest-card";
import { SignaturePad } from "@/components/captain/signature-pad";
import { printManifest, downloadManifestPDF } from "@/lib/pdf/manifest-pdf";

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
  const [selectedGuest, setSelectedGuest] = useState<{
    guest: Guest;
    booking: Booking;
    tourId: string;
  } | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [savingSignature, setSavingSignature] = useState(false);

  const fetchManifest = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

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

      const manifest: ManifestTour[] = await Promise.all(
        assignments.map(async (assignment: any) => {
          const availability = assignment.availabilities;
          const tour = availability.tours;

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
    const dateStr = format(selectedDate, "EEEE, MMMM d, yyyy");
    printManifest(filteredManifest, dateStr);
  };

  const handleDownloadPDF = () => {
    const dateStr = format(selectedDate, "EEEE, MMMM d, yyyy");
    downloadManifestPDF(filteredManifest, dateStr);
    toast.success("Opening print dialog - select 'Save as PDF'");
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
    toast.success("Manifest exported as CSV");
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

  const handleSignatureCapture = async (signatureDataUrl: string) => {
    if (!selectedGuest) return;

    setSavingSignature(true);
    try {
      const response = await fetch('/api/waivers/sign-on-spot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestId: selectedGuest.guest.id,
          bookingId: selectedGuest.booking.bookingId,
          signatureDataUrl,
          captainId: staffId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save signature');
      }

      // Update local state
      setManifestData((prev) =>
        prev.map((t) => {
          if (t.id !== selectedGuest.tourId) return t;
          return {
            ...t,
            bookings: t.bookings.map((b) => {
              if (b.id !== selectedGuest.booking.id) return b;
              return {
                ...b,
                guests: b.guests.map((g) => {
                  if (g.id !== selectedGuest.guest.id) return g;
                  return { ...g, waiverSigned: true };
                }),
              };
            }),
          };
        })
      );

      // Update selected guest state
      setSelectedGuest(prev => prev ? {
        ...prev,
        guest: { ...prev.guest, waiverSigned: true }
      } : null);

      setShowSignaturePad(false);
      toast.success("Waiver signed successfully!");
    } catch (err: any) {
      toast.error(err.message || 'Failed to save signature');
    } finally {
      setSavingSignature(false);
    }
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

  const toggleGuestCheckIn = useCallback(async (tourId: string, bookingId: string, guestId: string) => {
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

    // Also update selectedGuest if open
    if (selectedGuest?.guest.id === guestId) {
      setSelectedGuest(prev => prev ? {
        ...prev,
        guest: { ...prev.guest, checkedIn: newCheckedIn }
      } : null);
    }

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

      if (selectedGuest?.guest.id === guestId) {
        setSelectedGuest(prev => prev ? {
          ...prev,
          guest: { ...prev.guest, checkedIn: !newCheckedIn }
        } : null);
      }

      toast.error("Failed to update check-in");
    }
  }, [manifestData, selectedGuest]);

  const bulkCheckIn = async (tourId: string, checkIn: boolean) => {
    const tour = manifestData.find(t => t.id === tourId);
    if (!tour) return;

    setBulkActionLoading(true);

    const guestIds = tour.bookings.flatMap(b =>
      b.guests.filter(g => g.checkedIn !== checkIn).map(g => g.id)
    );

    if (guestIds.length === 0) {
      toast.info(checkIn ? "All guests already checked in" : "No guests to uncheck");
      setBulkActionLoading(false);
      return;
    }

    // Optimistic update
    setManifestData((prev) =>
      prev.map((t) => {
        if (t.id !== tourId) return t;
        return {
          ...t,
          bookings: t.bookings.map((b) => ({
            ...b,
            guests: b.guests.map((g) => ({ ...g, checkedIn: checkIn })),
          })),
        };
      })
    );

    try {
      const supabase = createClient();
      await supabase
        .from('booking_guests')
        .update({ checked_in: checkIn })
        .in('id', guestIds);

      toast.success(checkIn ? `${guestIds.length} guests checked in` : `${guestIds.length} check-ins removed`);
    } catch (error) {
      // Revert
      await fetchManifest();
      toast.error("Failed to update check-ins");
    } finally {
      setBulkActionLoading(false);
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
      <div className="h-full flex flex-col p-4 md:p-6">
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
      <div className="p-4 md:p-6 border-b bg-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Anchor className="h-5 w-5 md:h-6 md:w-6 text-indigo-600" />
              My Manifest
            </h1>
            <p className="text-sm text-muted-foreground">
              Swipe right on guests to check them in
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>

            {/* Actions dropdown for mobile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Manifest
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadPDF}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Save as PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={exportManifest}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          {/* Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-[200px] justify-start gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(selectedDate, "EEE, MMM d")}
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
              <SelectTrigger className="w-full sm:w-[200px]">
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
          <div className="relative flex-1">
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
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="space-y-6">
          {manifestData.length === 0 ? (
            <Card className="p-8 md:p-12">
              <div className="text-center">
                <Anchor className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mx-auto mb-4" />
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
                  <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-indigo-500/5 border-b p-4">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <Ship className="h-6 w-6 text-indigo-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{tour.name}</CardTitle>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {tour.time} - {tour.endTime}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {tour.meetingPoint}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Bulk actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={bulkActionLoading}>
                              {bulkActionLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreVertical className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => bulkCheckIn(tour.id, true)}>
                              <UserCheck className="h-4 w-4 mr-2" />
                              Check In All
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => bulkCheckIn(tour.id, false)}>
                              <UserX className="h-4 w-4 mr-2" />
                              Uncheck All
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                            <UserCheck className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-green-600">{checkedInGuests}/{totalGuests}</p>
                            <p className="text-xs text-muted-foreground">Checked In</p>
                          </div>
                        </div>
                        <Separator orientation="vertical" className="h-8" />
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Users className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold">{totalGuests}/{tour.capacity}</p>
                            <p className="text-xs text-muted-foreground">Capacity</p>
                          </div>
                        </div>
                        {pendingWaivers > 0 && (
                          <>
                            <Separator orientation="vertical" className="h-8" />
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center">
                                <AlertCircle className="h-4 w-4 text-orange-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-orange-600">{pendingWaivers}</p>
                                <p className="text-xs text-muted-foreground">Pending</p>
                              </div>
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
                            <div key={booking.id} className="p-4">
                              {/* Booking header */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-start gap-3">
                                  <div
                                    className={cn(
                                      "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                                      waiverStatus === "all_signed"
                                        ? "bg-green-100"
                                        : waiverStatus === "partial"
                                        ? "bg-orange-100"
                                        : "bg-red-100"
                                    )}
                                  >
                                    {waiverStatus === "all_signed" ? (
                                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    ) : (
                                      <AlertCircle
                                        className={cn(
                                          "h-5 w-5",
                                          waiverStatus === "partial" ? "text-orange-600" : "text-red-600"
                                        )}
                                      />
                                    )}
                                  </div>

                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-semibold">
                                        {booking.customer.firstName} {booking.customer.lastName}
                                      </p>
                                      <Badge variant="outline" className="font-mono text-xs">
                                        {booking.id}
                                      </Badge>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
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
                                      <p className="text-sm text-indigo-600 mt-1 flex items-center gap-1">
                                        <Info className="h-3 w-3" />
                                        {booking.notes}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Guest list - swipeable on mobile */}
                              <div className="space-y-2 ml-0 md:ml-13">
                                {booking.guests.map((guest) => (
                                  <SwipeableGuestCard
                                    key={guest.id}
                                    guest={guest}
                                    onCheckIn={() => toggleGuestCheckIn(tour.id, booking.id, guest.id)}
                                    onTap={() => setSelectedGuest({ guest, booking, tourId: tour.id })}
                                  />
                                ))}
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

      {/* Guest detail dialog */}
      <Dialog open={!!selectedGuest} onOpenChange={(open) => {
        if (!open) {
          setSelectedGuest(null);
          setShowSignaturePad(false);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          {selectedGuest && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center",
                    selectedGuest.guest.checkedIn
                      ? "bg-green-100"
                      : "bg-slate-100"
                  )}>
                    {selectedGuest.guest.checkedIn ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Users className="h-5 w-5 text-slate-600" />
                    )}
                  </div>
                  {selectedGuest.guest.firstName} {selectedGuest.guest.lastName}
                </DialogTitle>
              </DialogHeader>

              {showSignaturePad ? (
                <SignaturePad
                  guestName={`${selectedGuest.guest.firstName} ${selectedGuest.guest.lastName}`}
                  onSave={handleSignatureCapture}
                  onCancel={() => setShowSignaturePad(false)}
                  saving={savingSignature}
                />
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Waiver</p>
                      <Badge
                        className={cn(
                          selectedGuest.guest.waiverSigned
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        )}
                      >
                        {selectedGuest.guest.waiverSigned ? "Signed" : "Not Signed"}
                      </Badge>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      <Badge
                        className={cn(
                          selectedGuest.guest.checkedIn
                            ? "bg-green-100 text-green-800"
                            : "bg-slate-100 text-slate-800"
                        )}
                      >
                        {selectedGuest.guest.checkedIn ? "Checked In" : "Not Checked In"}
                      </Badge>
                    </div>
                  </div>

                  {selectedGuest.guest.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {selectedGuest.guest.email}
                    </div>
                  )}

                  {!selectedGuest.guest.waiverSigned && (
                    <div className="p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <p className="text-sm text-orange-800 dark:text-orange-200 mb-3 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Waiver not signed yet
                      </p>
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700"
                          onClick={() => setShowSignaturePad(true)}
                        >
                          <FileText className="h-4 w-4" />
                          Sign Waiver Now
                        </Button>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 gap-2"
                            onClick={() => sendWaiverToGuest(selectedGuest.guest.id, selectedGuest.booking.bookingId)}
                            disabled={sendingWaiver === selectedGuest.guest.id}
                          >
                            {sendingWaiver === selectedGuest.guest.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                            Email Link
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 gap-2"
                            onClick={() => openSignOnDevice(selectedGuest.guest.id, selectedGuest.booking.bookingId)}
                          >
                            <FileText className="h-4 w-4" />
                            Open Form
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    className={cn(
                      "w-full h-12 text-base",
                      selectedGuest.guest.checkedIn
                        ? "bg-slate-600 hover:bg-slate-700"
                        : "bg-green-600 hover:bg-green-700"
                    )}
                    onClick={() => {
                      toggleGuestCheckIn(selectedGuest.tourId, selectedGuest.booking.id, selectedGuest.guest.id);
                    }}
                  >
                    {selectedGuest.guest.checkedIn ? (
                      <>
                        <UserX className="h-5 w-5 mr-2" />
                        Undo Check-in
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-5 w-5 mr-2" />
                        Check In Guest
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CaptainManifestPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex flex-col p-4 md:p-6">
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
