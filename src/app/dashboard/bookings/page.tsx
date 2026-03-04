"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface Booking {
  id: string;
  uuid: string; // actual database ID
  booking_reference: string;
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

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-800", icon: CheckCircle2 },
  checked_in: { label: "Checked In", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  completed: { label: "Completed", color: "bg-gray-100 text-gray-800", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800", icon: XCircle },
  no_show: { label: "No Show", color: "bg-orange-100 text-orange-800", icon: AlertCircle },
};

export default function BookingsPage() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sendingWaiver, setSendingWaiver] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = async () => {
      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from('bookings')
          .select(`
            *,
            customers(first_name, last_name, email, phone),
            availabilities(date, start_time, tours(name))
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching bookings:', error);
          return;
        }

        if (data) {
          setBookings(data.map(b => ({
            id: b.booking_reference,
            uuid: b.id,
            booking_reference: b.booking_reference,
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
    fetchBookings();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBookings();
    toast.success("Refreshed", { description: "Bookings list has been updated." });
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
    toast.success("Exported", { description: "Bookings exported to CSV file." });
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

      toast.success("Email sent", { description: `Confirmation sent to ${booking.customer.email}` });
    } catch (err: any) {
      console.error('Error sending email:', err);
      toast.error("Failed to send email", { description: err.message || 'An error occurred' });
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

      toast.success("Booking cancelled", { description: `Booking ${booking.booking_reference} has been cancelled.` });
    } catch (err: any) {
      console.error('Error cancelling booking:', err);
      toast.error("Failed to cancel booking", { description: err.message || 'An error occurred' });
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

    return matchesSearch && matchesStatus;
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

      toast.success("Waivers sent", {
        description: data.message,
      });
    } catch (err: any) {
      console.error('Error sending waivers:', err);
      toast.error("Failed to send waivers", {
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
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-lg" />
            ))}
          </div>
          <div className="h-96 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Bookings
          </h1>
          <p className="text-muted-foreground">
            Manage and track all tour bookings
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
          <Button variant="outline" className="gap-2" onClick={exportBookings}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Link href="/dashboard/bookings/new">
            <Button className="gap-2 gradient-primary border-0">
              <Plus className="h-4 w-4" />
              New Booking
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Bookings</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Confirmed</p>
          <p className="text-2xl font-bold text-blue-600">{stats.confirmed}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Pending Payment</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Pending Waivers</p>
          <p className="text-2xl font-bold text-orange-600">{stats.pendingWaivers}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by booking ID, customer, or tour..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="checked_in">Checked In</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[150px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Dates</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="tomorrow">Tomorrow</SelectItem>
            <SelectItem value="this_week">This Week</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bookings Table */}
      <Card>
        {filteredBookings.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No bookings found</p>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Create your first booking to get started"}
            </p>
            <Link href="/dashboard/bookings/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Booking
              </Button>
            </Link>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Tour</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Guests</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Waiver</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((booking) => {
                const StatusIcon = statusConfig[booking.status]?.icon || Clock;

                return (
                  <TableRow key={booking.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Link
                        href={`/dashboard/bookings/${booking.id}`}
                        className="font-mono text-sm font-medium hover:text-primary"
                      >
                        {booking.id}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(booking.createdAt), "MMM d, h:mm a")}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">
                        {booking.customer.first_name} {booking.customer.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">{booking.customer.email}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{booking.tour}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{booking.date ? format(new Date(booking.date), "MMM d, yyyy") : '-'}</p>
                      <p className="text-sm text-muted-foreground">{booking.time || '-'}</p>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {booking.guests}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold">${booking.total}</p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          booking.paymentStatus === "paid"
                            ? "text-green-600"
                            : booking.paymentStatus === "refunded"
                            ? "text-gray-600"
                            : "text-yellow-600"
                        )}
                      >
                        {booking.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig[booking.status]?.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig[booking.status]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "text-xs",
                          booking.waiverStatus === "all_signed"
                            ? "waiver-signed"
                            : booking.waiverStatus === "partial"
                            ? "waiver-partial"
                            : "waiver-pending"
                        )}
                      >
                        {booking.waiverStatus === "all_signed"
                          ? "Signed"
                          : booking.waiverStatus === "partial"
                          ? "Partial"
                          : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/bookings/${booking.id}`}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => sendWaiverForBooking(booking)}
                            disabled={sendingWaiver === booking.uuid}
                          >
                            {sendingWaiver === booking.uuid ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <FileText className="h-4 w-4 mr-2" />
                            )}
                            Send Waiver
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => sendEmailForBooking(booking)}>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Email
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => callCustomer(booking)}>
                            <Phone className="h-4 w-4 mr-2" />
                            Call Customer
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => cancelBooking(booking)}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancel Booking
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
