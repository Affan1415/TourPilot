"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Clock,
  ChevronRight,
  ChevronLeft,
  Calendar as CalendarIcon,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Tour {
  id: string;
  name: string;
  description: string;
  short_description: string;
  duration_minutes: number;
  base_price: number;
  images?: string[];
  location?: string;
}

interface TimeSlot {
  id: string;
  time: string;
  end_time: string;
  available: number;
  price: number;
}

interface WidgetConfig {
  primaryColor: string;
  fontFamily: string;
  borderRadius: string;
  showPrices: boolean;
  showAvailability: boolean;
  showTourImages: boolean;
  showDescription: boolean;
  requirePhone: boolean;
  collectNotes: boolean;
}

interface Guest {
  first_name: string;
  last_name: string;
  email?: string;
  type: "adult" | "child";
}

type Step = "tours" | "date" | "guests" | "details" | "confirm";

const defaultConfig: WidgetConfig = {
  primaryColor: "#0ea5e9",
  fontFamily: "Inter, sans-serif",
  borderRadius: "8px",
  showPrices: true,
  showAvailability: true,
  showTourImages: true,
  showDescription: true,
  requirePhone: false,
  collectNotes: true,
};

export default function EmbedWidget() {
  const params = useParams();
  const widgetKey = params.widgetKey as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<WidgetConfig>(defaultConfig);
  const [step, setStep] = useState<Step>("tours");
  const [tours, setTours] = useState<Tour[]>([]);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [guestCounts, setGuestCounts] = useState({ adults: 2, children: 0 });
  const [guestDetails, setGuestDetails] = useState<Guest[]>([]);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingRef, setBookingRef] = useState("");

  // Fetch widget config and tours
  useEffect(() => {
    async function loadWidget() {
      try {
        const res = await fetch(`/api/embed/${widgetKey}`);
        if (!res.ok) {
          throw new Error("Widget not found or inactive");
        }
        const data = await res.json();
        setConfig({ ...defaultConfig, ...data.widget.theme });
        setTours(data.tours || []);
      } catch (err: any) {
        setError(err.message || "Failed to load widget");
      } finally {
        setLoading(false);
      }
    }
    loadWidget();
  }, [widgetKey]);

  // Fetch availabilities when date changes
  const loadSlots = useCallback(async () => {
    if (!selectedTour || !selectedDate) return;

    setLoadingSlots(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const res = await fetch(
        `/api/embed/${widgetKey}/availabilities?tour_id=${selectedTour.id}&date=${dateStr}`
      );
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || []);
      }
    } catch (err) {
      console.error("Failed to load slots:", err);
    } finally {
      setLoadingSlots(false);
    }
  }, [widgetKey, selectedTour, selectedDate]);

  useEffect(() => {
    if (selectedDate && selectedTour) {
      loadSlots();
    }
  }, [selectedDate, selectedTour, loadSlots]);

  // Initialize guest details when guest counts change
  useEffect(() => {
    const details: Guest[] = [];
    for (let i = 0; i < guestCounts.adults; i++) {
      details.push({
        first_name: i === 0 ? formData.firstName : "",
        last_name: i === 0 ? formData.lastName : "",
        email: i === 0 ? formData.email : "",
        type: "adult",
      });
    }
    for (let i = 0; i < guestCounts.children; i++) {
      details.push({ first_name: "", last_name: "", type: "child" });
    }
    setGuestDetails(details);
  }, [guestCounts, formData.firstName, formData.lastName, formData.email]);

  const handleSelectTour = (tour: Tour) => {
    setSelectedTour(tour);
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setSlots([]);
    setStep("date");
  };

  const handleSelectDate = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleSelectSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setStep("guests");
  };

  const handleGuestChange = (type: "adults" | "children", delta: number) => {
    setGuestCounts((prev) => ({
      ...prev,
      [type]: Math.max(type === "adults" ? 1 : 0, prev[type] + delta),
    }));
  };

  const handleSubmit = async () => {
    if (!selectedSlot) return;

    setSubmitting(true);
    try {
      // Build guest list
      const guests = guestDetails.map((g, i) => ({
        first_name: i === 0 ? formData.firstName : g.first_name || `Guest ${i + 1}`,
        last_name: i === 0 ? formData.lastName : g.last_name || "",
        email: i === 0 ? formData.email : g.email,
        type: g.type,
      }));

      const res = await fetch(`/api/embed/${widgetKey}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availability_id: selectedSlot.id,
          customer: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            phone: formData.phone,
          },
          guests,
          notes: formData.notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Booking failed");
      }

      setBookingRef(data.booking_reference);
      setBookingComplete(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalPrice = selectedSlot
    ? selectedSlot.price * guestCounts.adults + selectedSlot.price * 0.5 * guestCounts.children
    : 0;

  const canProceedFromGuests = guestCounts.adults >= 1 && selectedSlot && guestCounts.adults + guestCounts.children <= selectedSlot.available;
  const canProceedFromDetails =
    formData.firstName &&
    formData.lastName &&
    formData.email &&
    (!config.requirePhone || formData.phone);

  if (loading) {
    return (
      <div
        className="min-h-[400px] flex items-center justify-center"
        style={{ fontFamily: config.fontFamily }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !bookingComplete) {
    return (
      <div
        className="min-h-[400px] flex items-center justify-center p-6"
        style={{ fontFamily: config.fontFamily }}
      >
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-medium">{error}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (bookingComplete) {
    return (
      <div
        className="min-h-[400px] flex items-center justify-center p-6"
        style={{ fontFamily: config.fontFamily }}
      >
        <div className="text-center">
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${config.primaryColor}20` }}
          >
            <Check className="h-8 w-8" style={{ color: config.primaryColor }} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
          <p className="text-muted-foreground mb-4">
            Your reference number is <strong>{bookingRef}</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Check your email for confirmation details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-[400px] bg-background"
      style={{ fontFamily: config.fontFamily }}
    >
      {/* Progress Steps */}
      <div className="flex items-center justify-center p-4 border-b">
        {["tours", "date", "guests", "details"].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium",
                step === s || ["tours", "date", "guests", "details"].indexOf(step) > i
                  ? "text-white"
                  : "bg-muted text-muted-foreground"
              )}
              style={{
                backgroundColor:
                  step === s || ["tours", "date", "guests", "details"].indexOf(step) > i
                    ? config.primaryColor
                    : undefined,
              }}
            >
              {i + 1}
            </div>
            {i < 3 && (
              <div
                className={cn(
                  "w-8 h-0.5 mx-1",
                  ["tours", "date", "guests", "details"].indexOf(step) > i
                    ? ""
                    : "bg-muted"
                )}
                style={{
                  backgroundColor:
                    ["tours", "date", "guests", "details"].indexOf(step) > i
                      ? config.primaryColor
                      : undefined,
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="p-4">
        {/* Step 1: Select Tour */}
        {step === "tours" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Select a Tour</h3>
            {tours.length === 0 ? (
              <p className="text-muted-foreground">No tours available.</p>
            ) : (
              <div className="space-y-3">
                {tours.map((tour) => (
                  <Card
                    key={tour.id}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handleSelectTour(tour)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <h4 className="font-semibold">{tour.name}</h4>
                          {config.showDescription && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {tour.short_description || tour.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {Math.floor(tour.duration_minutes / 60)}h{" "}
                              {tour.duration_minutes % 60 > 0 ? `${tour.duration_minutes % 60}m` : ""}
                            </span>
                          </div>
                        </div>
                        {config.showPrices && (
                          <div className="text-right">
                            <p className="text-lg font-bold" style={{ color: config.primaryColor }}>
                              ${tour.base_price}
                            </p>
                            <p className="text-xs text-muted-foreground">per person</p>
                          </div>
                        )}
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Date & Time */}
        {step === "date" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setStep("tours")}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h3 className="text-lg font-semibold">Select Date & Time</h3>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleSelectDate}
                    disabled={(date) => date < new Date()}
                    className="w-full"
                  />
                </CardContent>
              </Card>

              <div className="space-y-3">
                {selectedDate ? (
                  <>
                    <p className="text-sm font-medium">
                      Available times for {format(selectedDate, "MMMM d, yyyy")}
                    </p>
                    {loadingSlots ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : slots.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        No available times for this date. Please select another date.
                      </p>
                    ) : (
                      slots.map((slot) => (
                        <Card
                          key={slot.id}
                          className={cn(
                            "cursor-pointer transition-colors",
                            selectedSlot?.id === slot.id
                              ? "border-2"
                              : "hover:border-primary"
                          )}
                          style={{
                            borderColor:
                              selectedSlot?.id === slot.id ? config.primaryColor : undefined,
                          }}
                          onClick={() => handleSelectSlot(slot)}
                        >
                          <CardContent className="p-3 flex items-center justify-between">
                            <div>
                              <p className="font-medium">{slot.time}</p>
                              {config.showAvailability && (
                                <p className="text-xs text-muted-foreground">
                                  {slot.available} spots left
                                </p>
                              )}
                            </div>
                            {config.showPrices && (
                              <p className="font-semibold" style={{ color: config.primaryColor }}>
                                ${slot.price}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground py-8">
                    <CalendarIcon className="h-8 w-8 mr-2" />
                    <span>Select a date to see available times</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Guest Count */}
        {step === "guests" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setStep("date")}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h3 className="text-lg font-semibold">Number of Guests</h3>
            </div>

            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Adults</p>
                    <p className="text-sm text-muted-foreground">Age 13+</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleGuestChange("adults", -1)}
                      disabled={guestCounts.adults <= 1}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center font-medium">{guestCounts.adults}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleGuestChange("adults", 1)}
                      disabled={!!(selectedSlot && guestCounts.adults + guestCounts.children >= selectedSlot.available)}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Children</p>
                    <p className="text-sm text-muted-foreground">Ages 4-12 (50% off)</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleGuestChange("children", -1)}
                      disabled={guestCounts.children <= 0}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center font-medium">{guestCounts.children}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleGuestChange("children", 1)}
                      disabled={!!(selectedSlot && guestCounts.adults + guestCounts.children >= selectedSlot.available)}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {config.showPrices && selectedSlot && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between text-sm">
                    <span>{guestCounts.adults} Adult(s) x ${selectedSlot.price}</span>
                    <span>${selectedSlot.price * guestCounts.adults}</span>
                  </div>
                  {guestCounts.children > 0 && (
                    <div className="flex justify-between text-sm mt-1">
                      <span>{guestCounts.children} Child(ren) x ${selectedSlot.price * 0.5}</span>
                      <span>${selectedSlot.price * 0.5 * guestCounts.children}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold mt-3 pt-3 border-t">
                    <span>Total</span>
                    <span style={{ color: config.primaryColor }}>${totalPrice}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button
              className="w-full"
              style={{ backgroundColor: config.primaryColor }}
              disabled={!canProceedFromGuests}
              onClick={() => setStep("details")}
            >
              Continue
            </Button>
          </div>
        )}

        {/* Step 4: Contact Details */}
        {step === "details" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setStep("guests")}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h3 className="text-lg font-semibold">Your Details</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name *</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData((p) => ({ ...p, firstName: e.target.value }))}
                  placeholder="John"
                />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))}
                  placeholder="Smith"
                />
              </div>
            </div>

            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                placeholder="john@example.com"
              />
            </div>

            <div>
              <Label>Phone {config.requirePhone ? "*" : "(optional)"}</Label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            {config.collectNotes && (
              <div>
                <Label>Special Requests (optional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Any dietary requirements, accessibility needs, or special occasions?"
                  rows={3}
                />
              </div>
            )}

            {/* Booking Summary */}
            <Card className="bg-muted/50">
              <CardContent className="p-4 space-y-2 text-sm">
                <p className="font-semibold">{selectedTour?.name}</p>
                <p>
                  {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")} at {selectedSlot?.time}
                </p>
                <p>
                  {guestCounts.adults} Adult(s)
                  {guestCounts.children > 0 ? `, ${guestCounts.children} Child(ren)` : ""}
                </p>
                {config.showPrices && (
                  <p className="font-bold text-lg" style={{ color: config.primaryColor }}>
                    Total: ${totalPrice}
                  </p>
                )}
              </CardContent>
            </Card>

            <Button
              className="w-full"
              style={{ backgroundColor: config.primaryColor }}
              disabled={!canProceedFromDetails || submitting}
              onClick={handleSubmit}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                `Complete Booking${config.showPrices ? ` - $${totalPrice}` : ""}`
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Powered By Footer */}
      <div className="text-center py-3 border-t text-xs text-muted-foreground">
        Powered by <span className="font-semibold">TourPilot</span>
      </div>
    </div>
  );
}
