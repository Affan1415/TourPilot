"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Calendar,
  Users,
  Ship,
  CreditCard,
  Save,
  Mail,
} from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";

interface Tour {
  id: string;
  name: string;
  base_price: number;
  duration_minutes: number;
}

interface Availability {
  id: string;
  start_time: string;
  end_time: string;
  booked_count: number;
  capacity_override: number | null;
  price_override: number | null;
  tour: {
    max_capacity: number;
  };
}

interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function NewBookingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [tours, setTours] = useState<Tour[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loadingTours, setLoadingTours] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Form state
  const [selectedTour, setSelectedTour] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedAvailability, setSelectedAvailability] = useState("");
  const [customerFirstName, setCustomerFirstName] = useState("");
  const [customerLastName, setCustomerLastName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [guests, setGuests] = useState<Guest[]>([]);
  const [notes, setNotes] = useState("");
  const [sendConfirmation, setSendConfirmation] = useState(true);
  const [sendWaiver, setSendWaiver] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState("pending");

  // Fetch tours on mount
  useEffect(() => {
    const fetchTours = async () => {
      const { data, error } = await supabase
        .from('tours')
        .select('id, name, base_price, duration_minutes')
        .eq('status', 'active')
        .order('name');

      if (data) setTours(data);
      setLoadingTours(false);
    };
    fetchTours();
  }, []);

  // Fetch availabilities when tour and date change
  useEffect(() => {
    const fetchAvailabilities = async () => {
      if (!selectedTour || !selectedDate) {
        setAvailabilities([]);
        return;
      }

      setLoadingSlots(true);
      const { data, error } = await supabase
        .from('availabilities')
        .select(`
          id,
          start_time,
          end_time,
          booked_count,
          capacity_override,
          price_override,
          tour:tours(max_capacity)
        `)
        .eq('tour_id', selectedTour)
        .eq('date', selectedDate)
        .eq('status', 'available')
        .order('start_time');

      if (data) {
        setAvailabilities(data as unknown as Availability[]);
      }
      setLoadingSlots(false);
    };
    fetchAvailabilities();
    setSelectedAvailability("");
  }, [selectedTour, selectedDate]);

  const selectedTourData = tours.find((t) => t.id === selectedTour);
  const selectedSlot = availabilities.find((a) => a.id === selectedAvailability);
  const totalGuests = guests.length + 1; // +1 for primary customer
  const pricePerPerson = selectedSlot?.price_override ?? selectedTourData?.base_price ?? 0;
  const subtotal = pricePerPerson * totalGuests;
  const tax = subtotal * 0.07; // 7% tax
  const total = subtotal + tax;

  const addGuest = () => {
    setGuests([
      ...guests,
      { id: Date.now().toString(), firstName: "", lastName: "", email: "" },
    ]);
  };

  const removeGuest = (id: string) => {
    setGuests(guests.filter((g) => g.id !== id));
  };

  const updateGuest = (id: string, field: keyof Guest, value: string) => {
    setGuests(
      guests.map((g) => (g.id === id ? { ...g, [field]: value } : g))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if customer already exists
      let customerId: string;
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', customerEmail)
        .single();

      if (existingCustomer) {
        customerId = existingCustomer.id;
        // Update customer info
        await supabase
          .from('customers')
          .update({
            first_name: customerFirstName,
            last_name: customerLastName,
            phone: customerPhone || null,
          })
          .eq('id', customerId);
      } else {
        // Create new customer
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            email: customerEmail,
            first_name: customerFirstName,
            last_name: customerLastName,
            phone: customerPhone || null,
          })
          .select('id')
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
      }

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          customer_id: customerId,
          availability_id: selectedAvailability,
          guest_count: totalGuests,
          total_price: total,
          status: 'confirmed',
          payment_status: paymentStatus,
          notes: notes || null,
        })
        .select('id, booking_reference')
        .single();

      if (bookingError) throw bookingError;

      // Create booking guests - primary customer first
      const guestRecords = [
        {
          booking_id: booking.id,
          first_name: customerFirstName,
          last_name: customerLastName,
          email: customerEmail,
          is_primary: true,
        },
        ...guests.map((g) => ({
          booking_id: booking.id,
          first_name: g.firstName,
          last_name: g.lastName,
          email: g.email || null,
          is_primary: false,
        })),
      ];

      const { data: guestsData, error: guestsError } = await supabase
        .from('booking_guests')
        .insert(guestRecords)
        .select('id, first_name, last_name, email');

      if (guestsError) throw guestsError;

      // Get tour and availability details for emails
      const { data: availabilityData } = await supabase
        .from('availabilities')
        .select('date, start_time, tours(name, meeting_point)')
        .eq('id', selectedAvailability)
        .single();

      const tourName = (availabilityData?.tours as any)?.name || selectedTourData?.name || 'Tour';
      const tourDate = availabilityData?.date || '';
      const tourTime = availabilityData?.start_time?.substring(0, 5) || '';
      const meetingPoint = (availabilityData?.tours as any)?.meeting_point || '';

      // Send confirmation email if enabled
      if (sendConfirmation) {
        try {
          await fetch('/api/email/booking-confirmation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerEmail,
              customerName: `${customerFirstName} ${customerLastName}`,
              bookingReference: booking.booking_reference,
              tourName,
              tourDate,
              tourTime,
              guestCount: totalGuests,
              totalAmount: total,
              meetingPoint,
            }),
          });

          // Log the communication
          await supabase.from('communications').insert({
            booking_id: booking.id,
            customer_id: customerId,
            type: 'email',
            template_type: 'booking_confirmation',
            subject: `Booking Confirmed! ${tourName} - ${booking.booking_reference}`,
            content: 'Booking confirmation email sent',
            status: 'sent',
            sent_at: new Date().toISOString(),
          });
        } catch (emailError) {
          console.error('Failed to send confirmation email:', emailError);
        }
      }

      // Get or create default waiver template
      let waiverTemplateId: string | null = null;
      const { data: waiverTemplate } = await supabase
        .from('waiver_templates')
        .select('id')
        .eq('is_active', true)
        .single();

      if (waiverTemplate) {
        waiverTemplateId = waiverTemplate.id;
      }

      // Send waiver emails to all guests if enabled
      if (sendWaiver && guestsData && waiverTemplateId) {
        for (const guest of guestsData) {
          try {
            // Create waiver record for this guest
            const { data: waiverData } = await supabase
              .from('waivers')
              .insert({
                booking_id: booking.id,
                guest_id: guest.id,
                waiver_template_id: waiverTemplateId,
                status: 'pending',
              })
              .select('id')
              .single();

            // Use waiver ID as token for the waiver URL
            const waiverToken = waiverData?.id || guest.id;

            if (guest.email) {
              await fetch('/api/email/waiver-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  guestEmail: guest.email,
                  guestName: `${guest.first_name} ${guest.last_name}`,
                  customerName: `${customerFirstName} ${customerLastName}`,
                  tourName,
                  tourDate,
                  tourTime,
                  waiverToken,
                }),
              });

              // Log the communication
              await supabase.from('communications').insert({
                booking_id: booking.id,
                customer_id: customerId,
                type: 'email',
                template_type: 'waiver_request',
                subject: `Please Sign Your Waiver for ${tourName}`,
                content: `Waiver request sent to ${guest.email}`,
                status: 'sent',
                sent_at: new Date().toISOString(),
              });
            }
          } catch (waiverError) {
            console.error('Failed to send waiver email to', guest.email, waiverError);
          }
        }
      }

      // Note: availability booked_count is updated automatically by database trigger

      router.push(`/dashboard/bookings/${booking.id}`);
    } catch (error: any) {
      console.error('Failed to create booking:', error);
      alert('Failed to create booking: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/bookings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create New Booking</h1>
          <p className="text-muted-foreground">
            Manually create a booking for walk-ins or phone orders
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tour Selection */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Ship className="h-5 w-5 text-primary" />
                Tour Details
              </h2>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="tour">Select Tour *</Label>
                  <Select value={selectedTour} onValueChange={setSelectedTour}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingTours ? "Loading tours..." : "Choose a tour"} />
                    </SelectTrigger>
                    <SelectContent>
                      {tours.map((tour) => (
                        <SelectItem key={tour.id} value={tour.id}>
                          {tour.name} - ${tour.base_price}/person ({tour.duration_minutes} min)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={format(new Date(), "yyyy-MM-dd")}
                      disabled={!selectedTour}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="time">Time Slot *</Label>
                    <Select value={selectedAvailability} onValueChange={setSelectedAvailability} disabled={!selectedDate || loadingSlots}>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingSlots ? "Loading..." : availabilities.length === 0 && selectedDate ? "No slots available" : "Select time slot"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availabilities.map((slot) => {
                          const capacity = slot.capacity_override ?? slot.tour?.max_capacity ?? 10;
                          const spotsLeft = capacity - slot.booked_count;
                          return (
                            <SelectItem key={slot.id} value={slot.id} disabled={spotsLeft < totalGuests}>
                              {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)} ({spotsLeft} spots left)
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </Card>

            {/* Customer Information */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Customer Information
              </h2>

              <div className="grid gap-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={customerFirstName}
                      onChange={(e) => setCustomerFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={customerLastName}
                      onChange={(e) => setCustomerLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Additional Guests */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Additional Guests
                </h2>
                <Button type="button" variant="outline" size="sm" onClick={addGuest}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Guest
                </Button>
              </div>

              {guests.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No additional guests. Click "Add Guest" to add more people to this booking.
                </p>
              ) : (
                <div className="space-y-4">
                  {guests.map((guest, index) => (
                    <div key={guest.id} className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium">Guest {index + 2}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeGuest(guest.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="grid md:grid-cols-3 gap-3">
                        <Input
                          placeholder="First name"
                          value={guest.firstName}
                          onChange={(e) =>
                            updateGuest(guest.id, "firstName", e.target.value)
                          }
                        />
                        <Input
                          placeholder="Last name"
                          value={guest.lastName}
                          onChange={(e) =>
                            updateGuest(guest.id, "lastName", e.target.value)
                          }
                        />
                        <Input
                          placeholder="Email (for waiver)"
                          type="email"
                          value={guest.email}
                          onChange={(e) =>
                            updateGuest(guest.id, "email", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Payment & Notes */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Payment & Notes
              </h2>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="paymentStatus">Payment Status</Label>
                  <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="partial">Partial Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Internal Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special requests or notes..."
                    rows={3}
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            <Card className="p-6 sticky top-6">
              <h2 className="text-lg font-semibold mb-4">Booking Summary</h2>

              {selectedTourData ? (
                <>
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium">{selectedTourData.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedTourData.duration_minutes} minutes
                      </p>
                    </div>

                    {selectedDate && selectedSlot && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {format(new Date(selectedDate), "MMM d, yyyy")} at {selectedSlot.start_time.slice(0, 5)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{totalGuests} {totalGuests === 1 ? "guest" : "guests"}</span>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>
                        ${pricePerPerson.toFixed(2)} × {totalGuests} guests
                      </span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax (7%)</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Select a tour to see pricing
                </p>
              )}

              <Separator className="my-4" />

              {/* Notification Options */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm">Notifications</h3>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sendConfirmation"
                    checked={sendConfirmation}
                    onCheckedChange={(checked) =>
                      setSendConfirmation(checked as boolean)
                    }
                  />
                  <label htmlFor="sendConfirmation" className="text-sm">
                    Send confirmation email
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sendWaiver"
                    checked={sendWaiver}
                    onCheckedChange={(checked) => setSendWaiver(checked as boolean)}
                  />
                  <label htmlFor="sendWaiver" className="text-sm">
                    Send waiver request
                  </label>
                </div>
              </div>

              <Separator className="my-4" />

              <Button
                type="submit"
                className="w-full gap-2 gradient-primary border-0"
                disabled={!selectedTour || !selectedDate || !selectedAvailability || loading}
              >
                {loading ? (
                  "Creating..."
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Create Booking
                  </>
                )}
              </Button>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
