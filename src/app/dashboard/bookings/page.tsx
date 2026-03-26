"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  MoreHorizontal,
  Calendar,
  Users,
  FileText,
  Mail,
  Phone,
  ExternalLink,
  RefreshCw,
  Download,
  Plus,
  ClipboardList,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
  CalendarClock,
  Ship,
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { StatCard } from "@/components/ui/stat-card";
import { IconBox } from "@/components/ui/icon-box";
import { useLocation } from "@/lib/location/context";
import { MapPin } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useTranslation } from "@/lib/i18n/context";

interface Booking {
  id: string;
  uuid: string; // actual database ID
  booking_reference: string;
  availability_id?: string;
  tour_id?: string;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  tour: string;
  date: string;
  time: string;
  guests: number;
  total: number;
  status: string;
  paymentStatus: string;
  waiverStatus: string;
  createdAt: string;
}

interface AvailableSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  booked_count: number;
  capacity_override: number | null;
  price_override: number | null;
  tour: {
    name: string;
    max_capacity: number;
    base_price: number;
  } | null;
}

// V6 Pastel status colors
const statusConfig: Record<string, { label: string; variant: "mint" | "lavender" | "peach" | "sky" | "rose" | "secondary"; icon: any }> = {
  pending: { label: "Pending", variant: "peach", icon: Clock },
  confirmed: { label: "Confirmed", variant: "sky", icon: CheckCircle2 },
  checked_in: { label: "Checked In", variant: "mint", icon: CheckCircle2 },
  completed: { label: "Completed", variant: "secondary", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", variant: "rose", icon: XCircle },
  no_show: { label: "No Show", variant: "peach", icon: AlertCircle },
};

interface Tour {
  id: string;
  name: string;
}

function BookingsContent() {
  const { t } = useTranslation();
  const { selectedLocation } = useLocation();
  const searchParams = useSearchParams();
  const tourIdFromUrl = searchParams.get("tour");
  const dateFromUrl = searchParams.get("date");

  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState(dateFromUrl || "all");
  const [tourFilter, setTourFilter] = useState(tourIdFromUrl || "all");
  const [sendingWaiver, setSendingWaiver] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Reschedule state
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  const fetchData = async () => {
      try {
        const supabase = createClient();

        // Fetch tours for filter dropdown
        let toursQuery = supabase
          .from('tours')
          .select('id, name')
          .eq('is_active', true)
          .order('name');

        if (selectedLocation?.id) {
          toursQuery = toursQuery.eq('location_id', selectedLocation.id);
        }

        const { data: toursData } = await toursQuery;
        setTours(toursData || []);

        // Fetch bookings with tour location info for filtering
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            *,
            customers(first_name, last_name, email, phone),
            availabilities(date, start_time, tour_id, tours(id, name, location_id))
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching bookings:', error);
          return;
        }

        // Filter by location on client side (since we need nested join filtering)
        let filteredData = data || [];
        if (selectedLocation?.id) {
          filteredData = filteredData.filter(
            b => b.availabilities?.tours?.location_id === selectedLocation.id
          );
        }

        if (filteredData) {
          setBookings(filteredData.map(b => ({
            id: b.booking_reference,
            uuid: b.id,
            booking_reference: b.booking_reference,
            availability_id: b.availability_id,
            tour_id: b.availabilities?.tour_id || b.availabilities?.tours?.id,
            customer: {
              first_name: b.customers?.first_name || '',
              last_name: b.customers?.last_name || '',
              email: b.customers?.email || '',
              phone: b.customers?.phone || '',
            },
            tour: b.availabilities?.tours?.name || 'Unknown Tour',
            date: b.availabilities?.date || b.created_at?.split('T')[0],
            time: b.availabilities?.start_time?.substring(0, 5) || '',
            guests: b.guest_count || 0,
            total: b.total_price || 0,
            status: b.status || 'pending',
            paymentStatus: b.payment_status || 'pending',
            waiverStatus: 'none', // Would need to calculate from booking_guests
            createdAt: b.created_at,
          })));
        }
      } catch (error) {
        console.error('Error fetching bookings:', error);
      } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedLocation]);

  // Update tour filter when URL param changes
  useEffect(() => {
    if (tourIdFromUrl) {
      setTourFilter(tourIdFromUrl);
    }
  }, [tourIdFromUrl]);

  // Update date filter when URL param changes
  useEffect(() => {
    if (dateFromUrl) {
      setDateFilter(dateFromUrl);
    }
  }, [dateFromUrl]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    toast.success(t('notifications.refreshed'), { description: t('notifications.bookingsUpdated') });
  };

  const exportBookings = () => {
    const headers = ["Booking ID", "Customer", "Email", "Phone", "Tour", "Date", "Time", "Guests", "Total", "Status", "Payment Status"];
    const csvContent = [
      headers.join(","),
      ...filteredBookings.map(b => [
        b.booking_reference,
        `"${b.customer.first_name} ${b.customer.last_name}"`,
        b.customer.email,
        b.customer.phone || "",
        `"${b.tour}"`,
        b.date,
        b.time,
        b.guests,
        b.total,
        b.status,
        b.paymentStatus
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `bookings-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success(t('notifications.exported'), { description: t('notifications.exportedToCsv') });
  };

  const sendEmailForBooking = async (booking: Booking) => {
    if (!booking.customer.email) {
      toast.error("No email address", { description: "Customer doesn't have an email address." });
      return;
    }

    try {
      const response = await fetch('/api/email/booking-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: booking.customer.email,
          customerName: booking.customer.first_name,
          bookingReference: booking.booking_reference,
          tourName: booking.tour,
          tourDate: booking.date,
          tourTime: booking.time,
          guestCount: booking.guests,
          totalAmount: booking.total,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      toast.success(t('notifications.emailSent'), { description: t('notifications.confirmationSent', { email: booking.customer.email }) });
    } catch (err: any) {
      console.error('Error sending email:', err);
      toast.error(t('notifications.failedToSendEmail'), { description: err.message || 'An error occurred' });
    }
  };

  const callCustomer = (booking: Booking) => {
    if (!booking.customer.phone) {
      toast.error("No phone number", { description: "Customer doesn't have a phone number." });
      return;
    }
    window.open(`tel:${booking.customer.phone}`, '_blank');
  };

  const cancelBooking = async (booking: Booking) => {
    const confirmed = window.confirm(
      `Are you sure you want to cancel booking ${booking.booking_reference}? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', booking.uuid);

      if (updateError) throw updateError;

      // Update local state
      setBookings(prev => prev.map(b =>
        b.uuid === booking.uuid ? { ...b, status: 'cancelled' } : b
      ));

      toast.success(t('notifications.bookingCancelled'), { description: t('notifications.bookingCancelledDesc', { reference: booking.booking_reference }) });
    } catch (err: any) {
      console.error('Error cancelling booking:', err);
      toast.error(t('notifications.failedToCancelBooking'), { description: err.message || 'An error occurred' });
    }
  };

  // Reschedule functions
  const openRescheduleDialog = (booking: Booking) => {
    setRescheduleBooking(booking);
    setSelectedDate(booking.date ? parseISO(booking.date) : new Date());
    setSelectedSlotId(null);
    setAvailableSlots([]);
    setRescheduleDialogOpen(true);
  };

  const fetchAvailableSlots = async (date: Date) => {
    if (!rescheduleBooking?.tour_id) return;

    setLoadingSlots(true);
    try {
      const supabase = createClient();
      const dateStr = format(date, 'yyyy-MM-dd');

      // Fetch availabilities for this tour on the selected date
      const { data, error } = await supabase
        .from('availabilities')
        .select(`
          id,
          date,
          start_time,
          end_time,
          booked_count,
          capacity_override,
          price_override,
          tour:tours(name, max_capacity, base_price)
        `)
        .eq('tour_id', rescheduleBooking.tour_id)
        .eq('date', dateStr)
        .eq('status', 'available')
        .order('start_time');

      if (error) throw error;

      // Filter out slots without enough capacity
      const slotsWithCapacity = (data || []).filter((slot: any) => {
        const capacity = slot.capacity_override || slot.tour?.max_capacity || 0;
        const available = capacity - (slot.booked_count || 0);
        return available >= rescheduleBooking.guests;
      });

      // Map to expected format (Supabase returns tour as object, not array, due to single relation)
      const mappedSlots = slotsWithCapacity.map((slot: any) => ({
        ...slot,
        tour: slot.tour || null, // Ensure tour is properly typed
      }));
      setAvailableSlots(mappedSlots as AvailableSlot[]);
    } catch (err) {
      console.error('Error fetching available slots:', err);
      toast.error(t('notifications.failedToLoadSlots'));
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (selectedDate && rescheduleDialogOpen && rescheduleBooking) {
      fetchAvailableSlots(selectedDate);
    }
  }, [selectedDate, rescheduleDialogOpen]);

  const handleReschedule = async () => {
    if (!rescheduleBooking || !selectedSlotId) return;

    setRescheduling(true);
    try {
      const supabase = createClient();

      // Get the old availability to decrement its booked_count
      const oldAvailabilityId = rescheduleBooking.availability_id;

      // Update the booking with new availability_id
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ availability_id: selectedSlotId })
        .eq('id', rescheduleBooking.uuid);

      if (updateError) throw updateError;

      // Decrement booked_count on old availability
      if (oldAvailabilityId) {
        await supabase.rpc('decrement_booking_count', { availability_id: oldAvailabilityId });
      }

      // Increment booked_count on new availability
      await supabase.rpc('increment_booking_count', { availability_id: selectedSlotId });

      // Find the new slot info
      const newSlot = availableSlots.find(s => s.id === selectedSlotId);

      // Update local state
      setBookings(prev => prev.map(b =>
        b.uuid === rescheduleBooking.uuid
          ? {
              ...b,
              availability_id: selectedSlotId,
              date: newSlot?.date || b.date,
              time: newSlot?.start_time?.substring(0, 5) || b.time,
            }
          : b
      ));

      setRescheduleDialogOpen(false);
      setRescheduleBooking(null);
      toast.success(t('notifications.bookingRescheduled'), {
        description: t('notifications.movedTo', { date: newSlot?.date ? format(parseISO(newSlot.date), 'MMM d, yyyy') : '', time: newSlot?.start_time?.substring(0, 5) || '' }),
      });
    } catch (err: any) {
      console.error('Error rescheduling booking:', err);
      toast.error(t('notifications.failedToReschedule'), { description: err.message || 'An error occurred' });
    } finally {
      setRescheduling(false);
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    const customerName = `${booking.customer.first_name} ${booking.customer.last_name}`.toLowerCase();
    const matchesSearch =
      booking.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customerName.includes(searchQuery.toLowerCase()) ||
      booking.customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.tour.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    const matchesTour = tourFilter === "all" || booking.tour_id === tourFilter;

    // Date filtering
    let matchesDate = true;
    if (dateFilter !== "all") {
      const bookingDate = booking.date;
      const today = format(new Date(), 'yyyy-MM-dd');
      const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

      if (dateFilter === "today") {
        matchesDate = bookingDate === today;
      } else if (dateFilter === "tomorrow") {
        matchesDate = bookingDate === tomorrow;
      } else if (dateFilter === "this_week") {
        const weekEnd = format(addDays(new Date(), 7), 'yyyy-MM-dd');
        matchesDate = bookingDate >= today && bookingDate <= weekEnd;
      } else if (dateFilter === "this_month") {
        const monthEnd = format(addDays(new Date(), 30), 'yyyy-MM-dd');
        matchesDate = bookingDate >= today && bookingDate <= monthEnd;
      } else {
        // Specific date from URL (format: yyyy-MM-dd)
        matchesDate = bookingDate === dateFilter;
      }
    }

    return matchesSearch && matchesStatus && matchesTour && matchesDate;
  });

  const sendWaiverForBooking = async (booking: Booking) => {
    setSendingWaiver(booking.uuid);

    try {
      const response = await fetch('/api/waivers/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.uuid,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send waivers');
      }

      toast.success(t('notifications.waiversSent'), {
        description: data.message,
      });
    } catch (err: any) {
      console.error('Error sending waivers:', err);
      toast.error(t('notifications.failedToSendWaivers'), {
        description: err.message || 'An error occurred',
      });
    } finally {
      setSendingWaiver(null);
    }
  };

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    pending: bookings.filter((b) => b.status === "pending").length,
    pendingWaivers: bookings.filter((b) => b.waiverStatus !== "all_signed" && b.status !== "cancelled").length,
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded-xl w-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-2xl" />
            ))}
          </div>
          <div className="h-96 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('bookingsPage.title')}</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            {selectedLocation ? (
              <>
                <MapPin className="h-4 w-4" />
                {selectedLocation.name}
              </>
            ) : (
              t('bookingsPage.subtitle')
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing} className="rounded-xl">
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Button variant="outline" className="gap-2 rounded-xl" onClick={exportBookings}>
            <Download className="h-4 w-4" />
            {t('bookingsPage.export')}
          </Button>
          <Link href="/dashboard/bookings/new">
            <Button className="gap-2 gradient-primary border-0 rounded-xl shadow-lg shadow-primary/30">
              <Plus className="h-4 w-4" />
              {t('bookingsPage.newBooking')}
            </Button>
          </Link>
        </div>
      </div>

      {/* V6 Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <StatCard
          title={t('bookingsPage.totalBookings')}
          value={stats.total}
          icon={<ClipboardList className="h-5 w-5" />}
          color="sky"
          className="animate-fade-in-up stagger-1"
        />
        <StatCard
          title={t('bookingsPage.confirmed')}
          value={stats.confirmed}
          icon={<CheckCircle2 className="h-5 w-5" />}
          color="mint"
          className="animate-fade-in-up stagger-2"
        />
        <StatCard
          title={t('bookingsPage.pendingPayment')}
          value={stats.pending}
          icon={<Clock className="h-5 w-5" />}
          color="peach"
          className="animate-fade-in-up stagger-3"
        />
        <StatCard
          title={t('bookingsPage.pendingWaivers')}
          value={stats.pendingWaivers}
          icon={<FileText className="h-5 w-5" />}
          color="lavender"
          className="animate-fade-in-up stagger-4"
        />
      </div>

      {/* V6 Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('bookingsPage.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl border-border focus:border-primary"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] rounded-xl">
            <SelectValue placeholder={t('common.status')} />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">{t('bookingsPage.allStatus')}</SelectItem>
            <SelectItem value="pending">{t('bookingsPage.pending')}</SelectItem>
            <SelectItem value="confirmed">{t('bookingsPage.confirmed')}</SelectItem>
            <SelectItem value="checked_in">{t('bookingsPage.checkedIn')}</SelectItem>
            <SelectItem value="completed">{t('bookingsPage.completed')}</SelectItem>
            <SelectItem value="cancelled">{t('bookingsPage.cancelled')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[150px] rounded-xl">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue placeholder={t('bookingsPage.date')}>
              {dateFilter === "all" ? t('bookingsPage.allDates') :
               dateFilter === "today" ? t('bookingsPage.today') :
               dateFilter === "tomorrow" ? t('bookingsPage.tomorrow') :
               dateFilter === "this_week" ? t('bookingsPage.thisWeek') :
               dateFilter === "this_month" ? t('bookingsPage.thisMonth') :
               format(parseISO(dateFilter), 'MMM d, yyyy')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">{t('bookingsPage.allDates')}</SelectItem>
            <SelectItem value="today">{t('bookingsPage.today')}</SelectItem>
            <SelectItem value="tomorrow">{t('bookingsPage.tomorrow')}</SelectItem>
            <SelectItem value="this_week">{t('bookingsPage.thisWeek')}</SelectItem>
            <SelectItem value="this_month">{t('bookingsPage.thisMonth')}</SelectItem>
            {dateFilter && !["all", "today", "tomorrow", "this_week", "this_month"].includes(dateFilter) && (
              <SelectItem value={dateFilter}>{format(parseISO(dateFilter), 'MMM d, yyyy')}</SelectItem>
            )}
          </SelectContent>
        </Select>

        <Select value={tourFilter} onValueChange={setTourFilter}>
          <SelectTrigger className="w-[180px] rounded-xl">
            <Ship className="h-4 w-4 mr-2" />
            <SelectValue placeholder={t('bookingsPage.tour')} />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">{t('bookingsPage.allTours')}</SelectItem>
            {tours.map((tour) => (
              <SelectItem key={tour.id} value={tour.id}>
                {tour.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* V6 Bookings Table */}
      <Card className="rounded-2xl border shadow-sm animate-fade-in-up stagger-5">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg font-medium">{t('bookingsPage.noBookingsFound')}</p>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== "all"
                ? t('bookingsPage.tryAdjustingFilters')
                : t('bookingsPage.createFirstBooking')}
            </p>
            <Link href="/dashboard/bookings/new">
              <Button className="gap-2 gradient-primary border-0 rounded-xl">
                <Plus className="h-4 w-4" />
                {t('bookingsPage.createBooking')}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-v6 w-full">
              <thead>
                <tr>
                  <th>{t('bookingsPage.booking')}</th>
                  <th>{t('bookingsPage.customer')}</th>
                  <th>{t('bookingsPage.tour')}</th>
                  <th>{t('bookingsPage.dateTime')}</th>
                  <th>{t('bookingsPage.guests')}</th>
                  <th>{t('bookingsPage.total')}</th>
                  <th>{t('bookingsPage.status')}</th>
                  <th>{t('bookingsPage.waiver')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => {
                  const StatusIcon = statusConfig[booking.status]?.icon || Clock;

                  return (
                    <tr key={booking.id} className="cursor-pointer">
                      <td>
                        <Link
                          href={`/dashboard/bookings/${booking.id}`}
                          className="font-mono text-sm font-medium hover:text-primary"
                        >
                          {booking.id}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(booking.createdAt), "MMM d, h:mm a")}
                        </p>
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <IconBox
                            icon={<Users className="h-4 w-4" />}
                            color="lavender"
                            size="sm"
                          />
                          <div>
                            <p className="font-medium text-sm">
                              {booking.customer.first_name} {booking.customer.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">{booking.customer.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="font-medium text-sm">{booking.tour}</p>
                      </td>
                      <td>
                        <p className="font-medium text-sm">{booking.date ? format(new Date(booking.date), "MMM d, yyyy") : '-'}</p>
                        <p className="text-xs text-muted-foreground">{booking.time || '-'}</p>
                      </td>
                      <td>
                        <span className="flex items-center gap-1 text-sm">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {booking.guests}
                        </span>
                      </td>
                      <td>
                        <p className="font-semibold text-sm">${booking.total}</p>
                        <Badge
                          variant={
                            booking.paymentStatus === "paid"
                              ? "mint"
                              : booking.paymentStatus === "refunded"
                              ? "secondary"
                              : "peach"
                          }
                          className="text-xs"
                        >
                          {booking.paymentStatus}
                        </Badge>
                      </td>
                      <td>
                        <Badge variant={statusConfig[booking.status]?.variant || "secondary"}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig[booking.status]?.label}
                        </Badge>
                      </td>
                      <td>
                        <Badge
                          variant={
                            booking.waiverStatus === "all_signed"
                              ? "mint"
                              : booking.waiverStatus === "partial"
                              ? "peach"
                              : "lavender"
                          }
                          className="text-xs"
                        >
                          {booking.waiverStatus === "all_signed"
                            ? "Signed"
                            : booking.waiverStatus === "partial"
                            ? "Partial"
                            : "Pending"}
                        </Badge>
                      </td>
                      <td>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-lg">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl">
                            <DropdownMenuItem asChild className="rounded-lg">
                              <Link href={`/dashboard/bookings/${booking.id}`}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                {t('bookingsPage.viewDetails')}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => sendWaiverForBooking(booking)}
                              disabled={sendingWaiver === booking.uuid}
                              className="rounded-lg"
                            >
                              {sendingWaiver === booking.uuid ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <FileText className="h-4 w-4 mr-2" />
                              )}
                              {t('bookingsPage.sendWaiver')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => sendEmailForBooking(booking)} className="rounded-lg">
                              <Mail className="h-4 w-4 mr-2" />
                              {t('bookingsPage.sendEmail')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => callCustomer(booking)} className="rounded-lg">
                              <Phone className="h-4 w-4 mr-2" />
                              {t('bookingsPage.callCustomer')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openRescheduleDialog(booking)}
                              disabled={booking.status === "cancelled" || booking.status === "completed"}
                              className="rounded-lg"
                            >
                              <CalendarClock className="h-4 w-4 mr-2" />
                              {t('bookingsPage.reschedule')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive rounded-lg"
                              onClick={() => cancelBooking(booking)}
                              disabled={booking.status === "cancelled"}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              {t('bookingsPage.cancelBooking')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              Reschedule Booking
            </DialogTitle>
            <DialogDescription>
              Select a new date and time slot for booking {rescheduleBooking?.booking_reference}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Booking summary */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{rescheduleBooking?.tour}</p>
                  <p className="text-sm text-muted-foreground">
                    {rescheduleBooking?.customer.first_name} {rescheduleBooking?.customer.last_name} - {rescheduleBooking?.guests} guest{rescheduleBooking?.guests !== 1 ? "s" : ""}
                  </p>
                </div>
                <Badge variant="peach">
                  Current: {rescheduleBooking?.date ? format(parseISO(rescheduleBooking.date), 'MMM d') : '-'} at {rescheduleBooking?.time}
                </Badge>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Calendar */}
              <div>
                <Label className="mb-2 block">Select New Date</Label>
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setSelectedSlotId(null);
                  }}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border"
                />
              </div>

              {/* Available slots */}
              <div>
                <Label className="mb-2 block">Available Time Slots</Label>
                {loadingSlots ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      {selectedDate
                        ? "No available slots for this date"
                        : "Select a date to see available slots"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {availableSlots.map((slot) => {
                      const capacity = slot.capacity_override || slot.tour?.max_capacity || 0;
                      const available = capacity - (slot.booked_count || 0);
                      const isSelected = selectedSlotId === slot.id;

                      return (
                        <button
                          key={slot.id}
                          onClick={() => setSelectedSlotId(slot.id)}
                          className={cn(
                            "w-full p-3 rounded-lg border-2 text-left transition-all",
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {slot.start_time?.substring(0, 5)} - {slot.end_time?.substring(0, 5)}
                              </span>
                            </div>
                            <Badge variant={available > 5 ? "mint" : "peach"}>
                              {available} spot{available !== 1 ? "s" : ""} left
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            ${slot.price_override || slot.tour?.base_price || 0} per person
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRescheduleDialogOpen(false);
                setRescheduleBooking(null);
              }}
              disabled={rescheduling}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReschedule}
              disabled={!selectedSlotId || rescheduling}
              className="gradient-primary border-0"
            >
              {rescheduling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rescheduling...
                </>
              ) : (
                <>
                  <CalendarClock className="h-4 w-4 mr-2" />
                  Confirm Reschedule
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <BookingsContent />
    </Suspense>
  );
}
