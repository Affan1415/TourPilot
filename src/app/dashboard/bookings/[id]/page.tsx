"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  FileText,
  Send,
  Printer,
  MoreHorizontal,
  Edit,
  XCircle,
  CheckCircle2,
  MessageSquare,
  RefreshCw,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface BookingData {
  id: string;
  booking_reference: string;
  status: string;
  payment_status: string;
  total_price: number;
  guest_count: number;
  notes: string | null;
  created_at: string;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
  };
  availability: {
    date: string;
    start_time: string;
    end_time: string;
    tour: {
      name: string;
      duration_minutes: number;
      meeting_point: string | null;
      base_price: number;
    };
  };
  guests: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    is_primary: boolean;
    checked_in: boolean;
    waiver_status?: string;
    waiver_signed_at?: string | null;
  }>;
  communications: Array<{
    id: string;
    type: string;
    template_type: string;
    subject: string | null;
    status: string;
    sent_at: string | null;
    created_at: string;
  }>;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-800" },
  checked_in: { label: "Checked In", color: "bg-green-100 text-green-800" },
  completed: { label: "Completed", color: "bg-gray-100 text-gray-800" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800" },
};

export default function BookingDetailPage() {
  const params = useParams();
  const bookingId = params.id as string;
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingWaiver, setSendingWaiver] = useState<string | null>(null); // guest id being sent
  const [checkingIn, setCheckingIn] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [editNotesOpen, setEditNotesOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const supabase = createClient();

        // Try to find by ID (UUID) or booking_reference
        let query = supabase
          .from('bookings')
          .select(`
            *,
            customer:customers(first_name, last_name, email, phone),
            availability:availabilities(
              date,
              start_time,
              end_time,
              tour:tours(name, duration_minutes, meeting_point, base_price)
            ),
            guests:booking_guests(id, first_name, last_name, email, is_primary, checked_in),
            communications(id, type, template_type, subject, status, sent_at, created_at)
          `);

        // Check if bookingId is a UUID or booking reference
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId);

        if (isUUID) {
          query = query.eq('id', bookingId);
        } else {
          query = query.eq('booking_reference', bookingId);
        }

        const { data, error: fetchError } = await query.single();

        if (fetchError) throw fetchError;

        // Fetch waiver status for each guest
        const { data: waivers } = await supabase
          .from('waivers')
          .select('guest_id, status, signed_at')
          .eq('booking_id', data.id);

        // Map waiver status to guests
        const guestsWithWaiverStatus = (data.guests || []).map((guest: any) => {
          const waiver = waivers?.find((w: any) => w.guest_id === guest.id);
          return {
            ...guest,
            waiver_status: waiver?.status || 'none',
            waiver_signed_at: waiver?.signed_at || null,
          };
        });

        setBooking({
          ...data,
          guests: guestsWithWaiverStatus,
        } as BookingData);
      } catch (err: any) {
        console.error('Error fetching booking:', err);
        setError(err.message || 'Failed to load booking');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  const sendWaiverToGuest = async (guest: { id: string; first_name: string; last_name: string; email: string | null }) => {
    if (!guest.email) {
      toast.error("No email address", {
        description: `${guest.first_name} ${guest.last_name} doesn't have an email address.`,
      });
      return;
    }

    if (!booking) return;

    setSendingWaiver(guest.id);

    try {
      const response = await fetch('/api/waivers/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          guestId: guest.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send waiver');
      }

      toast.success("Waiver sent", {
        description: `Waiver link sent to ${guest.email}`,
      });
    } catch (err: any) {
      console.error('Error sending waiver:', err);
      toast.error("Failed to send waiver", {
        description: err.message || 'An error occurred',
      });
    } finally {
      setSendingWaiver(null);
    }
  };

  const sendWaiverToAllGuests = async () => {
    if (!booking) return;

    setSendingWaiver('all');

    try {
      const response = await fetch('/api/waivers/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
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

  const checkInAllGuests = async () => {
    if (!booking) return;

    setCheckingIn(true);

    try {
      const response = await fetch('/api/bookings/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check in guests');
      }

      toast.success("Checked in", {
        description: data.message,
      });

      // Refresh booking data
      window.location.reload();
    } catch (err: any) {
      console.error('Error checking in:', err);
      toast.error("Failed to check in", {
        description: err.message || 'An error occurred',
      });
    } finally {
      setCheckingIn(false);
    }
  };

  const sendReminder = async () => {
    if (!booking) return;

    setSendingReminder(true);

    try {
      const response = await fetch('/api/bookings/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reminder');
      }

      toast.success("Reminder sent", {
        description: data.message,
      });
    } catch (err: any) {
      console.error('Error sending reminder:', err);
      toast.error("Failed to send reminder", {
        description: err.message || 'An error occurred',
      });
    } finally {
      setSendingReminder(false);
    }
  };

  const cancelBooking = async () => {
    if (!booking) return;

    const confirmed = window.confirm(
      `Are you sure you want to cancel booking ${booking.booking_reference}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setCancelling(true);

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', booking.id);

      if (updateError) throw updateError;

      toast.success("Booking cancelled", {
        description: `Booking ${booking.booking_reference} has been cancelled.`,
      });

      // Refresh the page to show updated status
      window.location.reload();
    } catch (err: any) {
      console.error('Error cancelling booking:', err);
      toast.error("Failed to cancel booking", {
        description: err.message || 'An error occurred',
      });
    } finally {
      setCancelling(false);
    }
  };

  const sendEmail = async () => {
    if (!booking?.customer?.email) {
      toast.error("No email address", {
        description: "Customer doesn't have an email address.",
      });
      return;
    }

    setSendingEmail(true);

    try {
      const response = await fetch('/api/email/booking-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: booking.customer.email,
          customerName: booking.customer.first_name,
          bookingReference: booking.booking_reference,
          tourName: booking.availability?.tour?.name || 'Your Tour',
          tourDate: booking.availability?.date || '',
          tourTime: booking.availability?.start_time?.substring(0, 5) || '',
          guestCount: booking.guest_count,
          totalAmount: booking.total_price,
          meetingPoint: booking.availability?.tour?.meeting_point || '',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      toast.success("Email sent", {
        description: `Confirmation email sent to ${booking.customer.email}`,
      });
    } catch (err: any) {
      console.error('Error sending email:', err);
      toast.error("Failed to send email", {
        description: err.message || 'An error occurred',
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const openEditNotes = () => {
    setNotes(booking?.notes || "");
    setEditNotesOpen(true);
  };

  const saveNotes = async () => {
    if (!booking) return;

    setSavingNotes(true);

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from('bookings')
        .update({ notes })
        .eq('id', booking.id);

      if (updateError) throw updateError;

      setBooking({ ...booking, notes });
      setEditNotesOpen(false);

      toast.success("Notes saved", {
        description: "Booking notes have been updated.",
      });
    } catch (err: any) {
      console.error('Error saving notes:', err);
      toast.error("Failed to save notes", {
        description: err.message || 'An error occurred',
      });
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="p-6">
        <div className="text-center py-16">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-lg font-medium">Booking not found</p>
          <p className="text-muted-foreground mb-4">{error || 'The booking you are looking for does not exist.'}</p>
          <Link href="/dashboard/bookings">
            <Button>Back to Bookings</Button>
          </Link>
        </div>
      </div>
    );
  }

  const guests = booking.guests || [];
  const signedCount = guests.filter(g => g.waiver_status === 'signed').length;
  const totalGuests = guests.length;
  const pricePerPerson = booking.availability?.tour?.base_price || 0;
  const subtotal = pricePerPerson * booking.guest_count;
  const tax = subtotal * 0.07;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/bookings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono">{booking.booking_reference}</h1>
              <Badge className={statusConfig[booking.status]?.color}>
                {statusConfig[booking.status]?.label}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Created {format(new Date(booking.created_at), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="h-4 w-4 mr-2" />
                Edit Booking
              </DropdownMenuItem>
              <DropdownMenuItem>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reschedule
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={sendEmail}>
                <Send className="h-4 w-4 mr-2" />
                Resend Confirmation
              </DropdownMenuItem>
              <DropdownMenuItem onClick={sendWaiverToAllGuests}>
                <FileText className="h-4 w-4 mr-2" />
                Resend Waiver
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={cancelBooking}>
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Booking
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tour Details */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Tour Details</h2>
            <div className="flex gap-4">
              <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-8 w-8 text-primary/50" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{booking.availability?.tour?.name || 'Unknown Tour'}</h3>
                <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{booking.availability?.date ? format(new Date(booking.availability.date), "EEEE, MMMM d, yyyy") : '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{booking.availability?.start_time?.substring(0, 5) || '-'} ({booking.availability?.tour?.duration_minutes || 0} min)</span>
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{booking.availability?.tour?.meeting_point || 'No meeting point specified'}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Guests */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Guests ({totalGuests})</h2>
              <Badge
                className={cn(
                  signedCount === totalGuests
                    ? "waiver-signed"
                    : signedCount > 0
                    ? "waiver-partial"
                    : "waiver-pending"
                )}
              >
                {signedCount}/{totalGuests} Waivers Signed
              </Badge>
            </div>

            <div className="space-y-3">
              {guests.map((guest) => {
                const name = `${guest.first_name} ${guest.last_name}`;
                const initials = `${guest.first_name?.[0] || ''}${guest.last_name?.[0] || ''}`.toUpperCase();
                return (
                  <div
                    key={guest.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-medium text-primary">
                          {initials}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">
                          {name}
                          {guest.is_primary && (
                            <span className="text-xs text-muted-foreground ml-2">(Primary)</span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {guest.email || "No email provided"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={guest.waiver_status === 'signed' ? "waiver-signed" : "waiver-pending"}>
                        {guest.waiver_status === 'signed' ? 'Signed' : 'Pending'}
                      </Badge>
                      {guest.waiver_status !== 'signed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={sendingWaiver === guest.id || !guest.email}
                          onClick={() => sendWaiverToGuest(guest)}
                          title={guest.email ? "Send waiver link" : "No email address"}
                        >
                          {sendingWaiver === guest.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Tabs for Communications & Notes */}
          <Card className="p-6">
            <Tabs defaultValue="communications">
              <TabsList>
                <TabsTrigger value="communications" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Communications
                </TabsTrigger>
                <TabsTrigger value="notes" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="communications" className="mt-4">
                {!booking.communications || booking.communications.length === 0 ? (
                  <p className="text-muted-foreground">No communications yet</p>
                ) : (
                  <div className="space-y-3">
                    {booking.communications.map((comm) => (
                      <div
                        key={comm.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{comm.subject || comm.template_type}</p>
                            <p className="text-xs text-muted-foreground">
                              {comm.sent_at ? format(new Date(comm.sent_at), "MMM d 'at' h:mm a") : format(new Date(comm.created_at), "MMM d 'at' h:mm a")}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className={comm.status === 'sent' || comm.status === 'delivered' ? "text-green-600" : "text-yellow-600"}>
                          {comm.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={sendEmail}
                    disabled={sendingEmail}
                  >
                    {sendingEmail ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                    Send Email
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      if (booking?.customer?.phone) {
                        window.open(`sms:${booking.customer.phone}`, '_blank');
                      } else {
                        toast.error("No phone number", {
                          description: "Customer doesn't have a phone number.",
                        });
                      }
                    }}
                  >
                    <Phone className="h-4 w-4" />
                    Send SMS
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="notes" className="mt-4">
                {booking.notes ? (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{booking.notes}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No notes for this booking</p>
                )}
                <Button variant="outline" size="sm" className="mt-4" onClick={openEditNotes}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Notes
                </Button>
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Customer</h2>
            <div className="space-y-3">
              <p className="font-medium text-lg">
                {booking.customer?.first_name} {booking.customer?.last_name}
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${booking.customer?.email}`}
                  className="text-primary hover:underline"
                >
                  {booking.customer?.email}
                </a>
              </div>
              {booking.customer?.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`tel:${booking.customer.phone}`}
                    className="text-primary hover:underline"
                  >
                    {booking.customer.phone}
                  </a>
                </div>
              )}
            </div>
            <Separator className="my-4" />
            <Link href={`/dashboard/customers`}>
              <Button variant="outline" size="sm" className="w-full gap-2">
                <ExternalLink className="h-4 w-4" />
                View Customer Profile
              </Button>
            </Link>
          </Card>

          {/* Payment */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Payment</h2>
              <Badge
                className={cn(
                  booking.payment_status === "paid"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                )}
              >
                {booking.payment_status === "paid" ? "Paid" : booking.payment_status}
              </Badge>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  ${pricePerPerson.toFixed(2)} × {booking.guest_count} guests
                </span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax (7%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>${booking.total_price.toFixed(2)}</span>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={checkInAllGuests}
                disabled={checkingIn || booking.status === 'checked_in'}
              >
                {checkingIn ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {booking.status === 'checked_in' ? 'Already Checked In' : 'Check In Guests'}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={sendReminder}
                disabled={sendingReminder}
              >
                {sendingReminder ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send Reminder
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={sendWaiverToAllGuests}
                disabled={sendingWaiver !== null}
              >
                {sendingWaiver !== null ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Send Waiver Link
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                onClick={cancelBooking}
                disabled={cancelling || booking.status === 'cancelled'}
              >
                {cancelling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {booking.status === 'cancelled' ? 'Already Cancelled' : 'Cancel Booking'}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Notes Dialog */}
      <Dialog open={editNotesOpen} onOpenChange={setEditNotesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Notes</DialogTitle>
            <DialogDescription>
              Add or edit notes for this booking. These notes are only visible to staff.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter booking notes..."
            rows={5}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditNotesOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveNotes} disabled={savingNotes}>
              {savingNotes ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Notes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
