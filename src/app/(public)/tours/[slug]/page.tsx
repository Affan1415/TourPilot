"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
} from "lucide-react";
import { format, addDays } from "date-fns";

// Mock data (replace with actual data fetch)
const tour = {
  id: "1",
  slug: "sunset-sailing-cruise",
  name: "Sunset Sailing Cruise",
  description: `Experience the magic of a sunset sailing cruise along our beautiful coastline. As the day winds down, embark on a journey that combines the tranquility of the sea with the spectacular colors of the setting sun.

Our experienced captain will guide you through calm waters while you relax on our comfortable vessel. Watch as the sky transforms into a canvas of oranges, pinks, and purples, creating unforgettable memories.

This tour is perfect for couples seeking a romantic evening, families looking for a unique experience, or anyone who appreciates the natural beauty of our coastline.`,
  shortDescription: "Experience breathtaking views as the sun sets over the horizon",
  duration: 120,
  price: 89,
  images: [
    "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=80",
    "https://images.unsplash.com/photo-1500514966906-fe245eea9344?w=1200&q=80",
    "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&q=80",
  ],
  rating: 4.9,
  reviews: 124,
  category: "Sailing",
  maxCapacity: 20,
  minGuests: 1,
  location: "Marina Bay",
  meetingPoint: "Marina Bay Dock, Pier 7. Look for the blue flag near the entrance.",
  whatToBring: [
    "Comfortable clothing",
    "Light jacket (it can get breezy)",
    "Camera",
    "Sunglasses",
  ],
  includes: [
    "Professional captain and crew",
    "Complimentary drinks",
    "Light snacks",
    "Safety equipment",
    "Photo opportunities",
  ],
  requiresWaiver: true,
};

// Mock availability (replace with actual data)
const generateAvailability = () => {
  const slots = [];
  for (let i = 1; i <= 14; i++) {
    const date = addDays(new Date(), i);
    slots.push({
      id: `slot-${i}`,
      date: format(date, "yyyy-MM-dd"),
      times: [
        { time: "16:00", price: 89, available: Math.floor(Math.random() * 15) + 1 },
        { time: "17:30", price: 99, available: Math.floor(Math.random() * 20) },
        { time: "19:00", price: 109, available: Math.floor(Math.random() * 10) },
      ],
    });
  }
  return slots;
};

const availability = generateAvailability();

export default function TourDetailPage() {
  const params = useParams();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState(2);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const dayAvailability = availability.find((a) => a.date === selectedDateStr);
  const selectedSlot = dayAvailability?.times.find((t) => t.time === selectedTime);

  const totalPrice = selectedSlot ? selectedSlot.price * guestCount : tour.price * guestCount;

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
                <img
                  src={tour.images[currentImageIndex]}
                  alt={tour.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

                {/* Image navigation */}
                <button
                  onClick={() => setCurrentImageIndex((i) => (i - 1 + tour.images.length) % tour.images.length)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setCurrentImageIndex((i) => (i + 1) % tour.images.length)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                {/* Image dots */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {tour.images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentImageIndex ? "bg-white w-6" : "bg-white/60"
                      }`}
                    />
                  ))}
                </div>

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
              <div className="flex gap-3 mt-4">
                {tour.images.map((image, index) => (
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
            </div>

            {/* Tour Info */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <Badge variant="secondary" className="mb-2">{tour.category}</Badge>
                  <h1 className="text-3xl md:text-4xl font-bold mb-2">{tour.name}</h1>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium text-foreground">{tour.rating}</span>
                      <span>({tour.reviews} reviews)</span>
                    </span>
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
                  <p className="font-semibold">{tour.duration / 60} hours</p>
                </div>
                <div className="text-center">
                  <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-sm text-muted-foreground">Group Size</p>
                  <p className="font-semibold">Max {tour.maxCapacity}</p>
                </div>
                <div className="text-center">
                  <MapPin className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-semibold">{tour.location}</p>
                </div>
                <div className="text-center">
                  <Shield className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-sm text-muted-foreground">Waiver</p>
                  <p className="font-semibold">{tour.requiresWaiver ? "Required" : "Not Required"}</p>
                </div>
              </div>

              {/* Description */}
              <div className="prose prose-gray max-w-none">
                <h2 className="text-xl font-semibold mb-3">About This Tour</h2>
                <div className="text-muted-foreground whitespace-pre-line">
                  {tour.description}
                </div>
              </div>
            </div>

            {/* What's Included */}
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

            {/* What to Bring */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What to Bring</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tour.whatToBring.map((item, index) => (
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

            {/* Meeting Point */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Meeting Point
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{tour.meetingPoint}</p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Booking Widget */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card className="shadow-xl border-0">
                <CardHeader className="pb-4">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-sm text-muted-foreground">From</span>
                      <p className="text-3xl font-bold text-primary">${tour.price}</p>
                      <span className="text-sm text-muted-foreground">per person</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{tour.rating}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Date Selection */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Select Date</label>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date() || date > addDays(new Date(), 30)}
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
                            onClick={() => setSelectedTime(slot.time)}
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
                  {selectedTime && (
                    <div className="animate-fade-in">
                      <label className="text-sm font-medium mb-2 block">Number of Guests</label>
                      <Select value={guestCount.toString()} onValueChange={(v) => setGuestCount(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: Math.min(selectedSlot?.available || 10, 10) }, (_, i) => i + 1).map((num) => (
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
                        ${selectedSlot?.price || tour.price} x {guestCount} guests
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
                      selectedDate && selectedTime
                        ? `/book/${tour.slug}?date=${format(selectedDate, "yyyy-MM-dd")}&time=${selectedTime}&guests=${guestCount}`
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
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
