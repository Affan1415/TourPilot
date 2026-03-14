"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Ship,
  Clock,
  Users,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  Calendar as CalendarIcon,
  Loader2,
  Check,
  Star,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";

interface Tour {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  image?: string;
  rating?: number;
  reviewCount?: number;
}

interface TimeSlot {
  time: string;
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

// Mock data
const mockTours: Tour[] = [
  {
    id: "1",
    name: "Sunset Cruise",
    description: "Experience a breathtaking sunset on the water with complimentary drinks.",
    duration: 120,
    price: 89,
    rating: 4.8,
    reviewCount: 156,
  },
  {
    id: "2",
    name: "Morning Adventure",
    description: "Start your day with an exciting boat adventure and dolphin watching.",
    duration: 180,
    price: 129,
    rating: 4.9,
    reviewCount: 89,
  },
  {
    id: "3",
    name: "Snorkel Experience",
    description: "Discover underwater wonders at the best snorkeling spots.",
    duration: 240,
    price: 149,
    rating: 4.7,
    reviewCount: 234,
  },
];

const mockSlots: TimeSlot[] = [
  { time: "09:00 AM", available: 8, price: 129 },
  { time: "11:00 AM", available: 4, price: 129 },
  { time: "02:00 PM", available: 12, price: 119 },
  { time: "05:30 PM", available: 2, price: 149 },
];

type Step = "tours" | "date" | "guests" | "details" | "confirm";

export default function EmbedWidget() {
  const params = useParams();
  const searchParams = useSearchParams();
  const widgetKey = params.widgetKey as string;

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<WidgetConfig>({
    primaryColor: "#0ea5e9",
    fontFamily: "Inter, sans-serif",
    borderRadius: "8px",
    showPrices: true,
    showAvailability: true,
    showTourImages: true,
    showDescription: true,
    requirePhone: false,
    collectNotes: true,
  });
  const [step, setStep] = useState<Step>("tours");
  const [tours, setTours] = useState<Tour[]>([]);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [guests, setGuests] = useState({ adults: 2, children: 0 });
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

  useEffect(() => {
    // Simulate loading widget config and tours
    setTimeout(() => {
      setTours(mockTours);
      setLoading(false);
    }, 500);
  }, [widgetKey]);

  useEffect(() => {
    if (selectedDate) {
      setSlots(mockSlots);
    }
  }, [selectedDate]);

  const handleSelectTour = (tour: Tour) => {
    setSelectedTour(tour);
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
    setGuests((prev) => ({
      ...prev,
      [type]: Math.max(type === "adults" ? 1 : 0, prev[type] + delta),
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    // Simulate API call
    await new Promise((r) => setTimeout(r, 2000));

    setBookingRef(`BK-${Date.now().toString(36).toUpperCase()}`);
    setBookingComplete(true);
    setSubmitting(false);
  };

  const totalPrice = selectedSlot
    ? selectedSlot.price * guests.adults + selectedSlot.price * 0.5 * guests.children
    : 0;

  const canProceedFromGuests = guests.adults >= 1;
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
            <div className="space-y-3">
              {tours.map((tour) => (
                <Card
                  key={tour.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleSelectTour(tour)}
                  style={
                    {
                      "--border-radius": config.borderRadius,
                    } as React.CSSProperties
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold">{tour.name}</h4>
                        {config.showDescription && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {tour.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {Math.floor(tour.duration / 60)}h {tour.duration % 60}m
                          </span>
                          {tour.rating && (
                            <span className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              {tour.rating} ({tour.reviewCount})
                            </span>
                          )}
                        </div>
                      </div>
                      {config.showPrices && (
                        <div className="text-right">
                          <p className="text-lg font-bold" style={{ color: config.primaryColor }}>
                            ${tour.price}
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
                    {slots.map((slot) => (
                      <Card
                        key={slot.time}
                        className={cn(
                          "cursor-pointer transition-colors",
                          selectedSlot?.time === slot.time
                            ? "border-2"
                            : "hover:border-primary"
                        )}
                        style={{
                          borderColor:
                            selectedSlot?.time === slot.time ? config.primaryColor : undefined,
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
                    ))}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
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
                      disabled={guests.adults <= 1}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center font-medium">{guests.adults}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleGuestChange("adults", 1)}
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
                      disabled={guests.children <= 0}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center font-medium">{guests.children}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleGuestChange("children", 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {config.showPrices && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between text-sm">
                    <span>{guests.adults} Adult(s) x ${selectedSlot?.price}</span>
                    <span>${(selectedSlot?.price || 0) * guests.adults}</span>
                  </div>
                  {guests.children > 0 && (
                    <div className="flex justify-between text-sm mt-1">
                      <span>{guests.children} Child(ren) x ${(selectedSlot?.price || 0) * 0.5}</span>
                      <span>${(selectedSlot?.price || 0) * 0.5 * guests.children}</span>
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
                <p>{format(selectedDate!, "EEEE, MMMM d, yyyy")} at {selectedSlot?.time}</p>
                <p>{guests.adults} Adult(s){guests.children > 0 ? `, ${guests.children} Child(ren)` : ""}</p>
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
