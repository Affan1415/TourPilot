"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  Star,
  Users,
  MapPin,
  Check,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Info,
  Shield,
  Heart,
  Share2,
  Ship,
  Loader2,
} from "lucide-react";
import { format, addDays, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";

interface Tour {
  id: string;
  slug: string;
  name: string;
  description: string;
  short_description: string;
  duration_minutes: number;
  base_price: number;
  max_capacity: number;
  min_guests: number;
  images: string[];
  location: string;
  meeting_point: string;
  what_to_bring: string[];
  includes: string[];
  requires_waiver: boolean;
  status: string;
}

interface TimeSlot {
  id: string;
  time: string;
  price: number;
  available: number;
}

interface DayAvailability {
  date: string;
  times: TimeSlot[];
}

export default function TourDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [tour, setTour] = useState<Tour | null>(null);
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedAvailabilityId, setSelectedAvailabilityId] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState(2);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchTour = async () => {
      const supabase = createClient();

      // Fetch tour details
      const { data: tourData, error: tourError } = await supabase
        .from('tours')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'active')
        .single();

      if (tourError || !tourData) {
        console.error('Error fetching tour:', tourError);
        setLoading(false);
        return;
      }

      setTour(tourData);

      // Fetch availability for the next 30 days
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysLater = addDays(new Date(), 30).toISOString().split('T')[0];

      const { data: availData, error: availError } = await supabase
        .from('availabilities')
        .select('*')
        .eq('tour_id', tourData.id)
        .gte('date', today)
        .lte('date', thirtyDaysLater)
        .eq('status', 'available')
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (availError) {
        console.error('Error fetching availability:', availError);
      }

      if (availData) {
        // Group by date
        const grouped: Record<string, TimeSlot[]> = {};
        availData.forEach((slot) => {
          const date = slot.date;
          if (!grouped[date]) {
            grouped[date] = [];
          }
          const price = slot.price_override || tourData.base_price;
          const capacity = slot.capacity_override || tourData.max_capacity;
          const available = capacity - slot.booked_count;

          grouped[date].push({
            id: slot.id,
            time: slot.start_time.slice(0, 5),
            price,
            available: Math.max(0, available),
          });
        });

        const availabilityList: DayAvailability[] = Object.entries(grouped).map(([date, times]) => ({
          date,
          times,
        }));

        setAvailability(availabilityList);

        // Auto-select first available date
        if (availabilityList.length > 0) {
          setSelectedDate(parseISO(availabilityList[0].date));
        }
      }

      setLoading(false);
    };

    fetchTour();
  }, [slug]);

  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const dayAvailability = availability.find((a) => a.date === selectedDateStr);
  const selectedSlot = dayAvailability?.times.find((t) => t.time === selectedTime);

  const totalPrice = selectedSlot ? selectedSlot.price * guestCount : (tour?.base_price || 0) * guestCount;

  // Get available dates for calendar
  const availableDates = availability.map(a => parseISO(a.date));

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    const slot = dayAvailability?.times.find(t => t.time === time);
    if (slot) {
      setSelectedAvailabilityId(slot.id);
    }
  };

  if (loading) {
    return (
      <div className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="py-8">
        <div className="container mx-auto px-4">
          <div className="text-center py-16">
            <Ship className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Tour Not Found</h1>
            <p className="text-muted-foreground mb-4">
              The tour you're looking for doesn't exist or is no longer available.
            </p>
            <Link href="/tours">
              <Button>Browse Tours</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const images = tour.images?.length > 0 ? tour.images : [];

  return (
    <div className="py-8">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/tours" className="hover:text-foreground transition-colors">
            Tours
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{tour.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Tour Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Gallery */}
            <div className="relative">
              <div className="relative h-[400px] md:h-[500px] rounded-2xl overflow-hidden">
                {images.length > 0 ? (
                  <img
                    src={images[currentImageIndex]}
                    alt={tour.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <Ship className="h-24 w-24 text-primary/40" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

                {/* Image navigation */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex((i) => (i - 1 + images.length) % images.length)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex((i) => (i + 1) % images.length)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>

                    {/* Image dots */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {images.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            index === currentImageIndex ? "bg-white w-6" : "bg-white/60"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* Actions */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <button className="h-10 w-10 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors shadow-lg">
                    <Heart className="h-5 w-5" />
                  </button>
                  <button className="h-10 w-10 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors shadow-lg">
                    <Share2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-3 mt-4">
                  {images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`relative h-20 w-24 rounded-lg overflow-hidden transition-all ${
                        index === currentImageIndex ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={image} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tour Info */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-2">{tour.name}</h1>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {tour.location}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-xl mb-6">
                <div className="text-center">
                  <Clock className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-semibold">{tour.duration_minutes / 60} hours</p>
                </div>
                <div className="text-center">
                  <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-sm text-muted-foreground">Group Size</p>
                  <p className="font-semibold">Max {tour.max_capacity}</p>
                </div>
                <div className="text-center">
                  <MapPin className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-semibold">{tour.location}</p>
                </div>
                <div className="text-center">
                  <Shield className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-sm text-muted-foreground">Waiver</p>
                  <p className="font-semibold">{tour.requires_waiver ? "Required" : "Not Required"}</p>
                </div>
              </div>

              {/* Description */}
              <div className="prose prose-gray max-w-none">
                <h2 className="text-xl font-semibold mb-3">About This Tour</h2>
                <div className="text-muted-foreground whitespace-pre-line">
                  {tour.description || tour.short_description}
                </div>
              </div>
            </div>

            {/* What's Included */}
            {tour.includes && tour.includes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">What&apos;s Included</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {tour.includes.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center">
                          <Check className="h-3 w-3 text-green-600" />
                        </div>
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* What to Bring */}
            {tour.what_to_bring && tour.what_to_bring.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">What to Bring</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {tour.what_to_bring.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
                          <Info className="h-3 w-3 text-blue-600" />
                        </div>
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Meeting Point */}
            {tour.meeting_point && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Meeting Point
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{tour.meeting_point}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Booking Widget */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card className="shadow-xl border-0">
                <CardHeader className="pb-4">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-sm text-muted-foreground">From</span>
                      <p className="text-3xl font-bold text-primary">${tour.base_price}</p>
                      <span className="text-sm text-muted-foreground">per person</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {availability.length === 0 ? (
                    <div className="text-center py-8">
                      <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="font-medium mb-1">No Availability</p>
                      <p className="text-sm text-muted-foreground">
                        There are no available dates for this tour at the moment.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Date Selection */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">Select Date</label>
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => {
                            setSelectedDate(date);
                            setSelectedTime(null);
                            setSelectedAvailabilityId(null);
                          }}
                          disabled={(date) => {
                            const dateStr = format(date, "yyyy-MM-dd");
                            return !availability.some(a => a.date === dateStr);
                          }}
                          className="rounded-lg border"
                        />
                      </div>

                      {/* Time Selection */}
                      {selectedDate && dayAvailability && (
                        <div className="animate-fade-in">
                          <label className="text-sm font-medium mb-2 block">Select Time</label>
                          <div className="grid grid-cols-1 gap-2">
                            {dayAvailability.times.map((slot) => (
                              <button
                                key={slot.time}
                                onClick={() => handleTimeSelect(slot.time)}
                                disabled={slot.available === 0}
                                className={`p-3 rounded-lg border text-left transition-all ${
                                  selectedTime === slot.time
                                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                                    : slot.available === 0
                                    ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                                    : "border-gray-200 hover:border-primary/50"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">{slot.time}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {slot.available === 0 ? "Sold out" : `${slot.available} spots left`}
                                    </p>
                                  </div>
                                  <p className="font-semibold">${slot.price}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Guest Count */}
                      {selectedTime && selectedSlot && (
                        <div className="animate-fade-in">
                          <label className="text-sm font-medium mb-2 block">Number of Guests</label>
                          <Select value={guestCount.toString()} onValueChange={(v) => setGuestCount(parseInt(v))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: Math.min(selectedSlot.available, 10) }, (_, i) => i + 1).map((num) => (
                                <SelectItem key={num} value={num.toString()}>
                                  {num} {num === 1 ? "Guest" : "Guests"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <Separator />

                      {/* Price Summary */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            ${selectedSlot?.price || tour.base_price} x {guestCount} guests
                          </span>
                          <span>${totalPrice}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-lg">
                          <span>Total</span>
                          <span className="text-primary">${totalPrice}</span>
                        </div>
                      </div>

                      {/* Book Button */}
                      <Link
                        href={
                          selectedDate && selectedTime && selectedAvailabilityId
                            ? `/book/${tour.slug}?availability=${selectedAvailabilityId}&guests=${guestCount}`
                            : "#"
                        }
                        className={!selectedDate || !selectedTime ? "pointer-events-none" : ""}
                      >
                        <Button
                          className="w-full h-12 text-base gradient-primary border-0 shadow-lg shadow-primary/25"
                          disabled={!selectedDate || !selectedTime}
                        >
                          {!selectedDate
                            ? "Select a Date"
                            : !selectedTime
                            ? "Select a Time"
                            : "Book Now"}
                        </Button>
                      </Link>

                      <p className="text-xs text-center text-muted-foreground">
                        Free cancellation up to 24 hours before the tour
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
