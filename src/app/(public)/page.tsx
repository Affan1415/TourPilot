import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Ship,
  Calendar,
  Clock,
  Users,
  Star,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Shield,
  Smartphone,
  Mail,
} from "lucide-react";

// Mock data for tours (replace with actual data fetch)
const featuredTours = [
  {
    id: "1",
    slug: "sunset-sailing-cruise",
    name: "Sunset Sailing Cruise",
    shortDescription: "Experience breathtaking views as the sun sets over the horizon",
    duration: 120,
    price: 89,
    image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80",
    rating: 4.9,
    reviews: 124,
    category: "Sailing",
  },
  {
    id: "2",
    slug: "dolphin-watch-adventure",
    name: "Dolphin Watch Adventure",
    shortDescription: "Get up close with playful dolphins in their natural habitat",
    duration: 180,
    price: 129,
    image: "https://images.unsplash.com/photo-1564758866811-4780b1a0f4c8?w=800&q=80",
    rating: 4.8,
    reviews: 89,
    category: "Wildlife",
  },
  {
    id: "3",
    slug: "private-fishing-charter",
    name: "Private Fishing Charter",
    shortDescription: "Expert-guided deep sea fishing experience for all skill levels",
    duration: 240,
    price: 299,
    image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80",
    rating: 5.0,
    reviews: 56,
    category: "Fishing",
  },
];

const features = [
  {
    icon: Calendar,
    title: "Instant Booking",
    description: "Book your tour in seconds with real-time availability",
  },
  {
    icon: Shield,
    title: "Digital Waivers",
    description: "Sign waivers electronically before you arrive",
  },
  {
    icon: Smartphone,
    title: "Mobile Check-in",
    description: "Skip the line with quick mobile check-in",
  },
  {
    icon: Mail,
    title: "Automated Reminders",
    description: "Get timely reminders via email, SMS, or WhatsApp",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10 py-20 lg:py-32">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4 gap-2">
              <Sparkles className="h-3 w-3" />
              Book with confidence
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Unforgettable{" "}
              <span className="text-primary">Adventures</span>{" "}
              Await You
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Book tours and activities with ease. Digital waivers, instant confirmations,
              and seamless check-in make your experience unforgettable.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/tours">
                <Button size="lg" className="gap-2 gradient-primary border-0 shadow-lg shadow-primary/25 w-full sm:w-auto">
                  <Ship className="h-5 w-5" />
                  Explore Tours
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/booking/lookup">
                <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                  Find My Booking
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-1/2 -right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -top-1/2 -left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </section>

      {/* Features Section */}
      <section className="py-16 bg-card border-y">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex flex-col items-center text-center p-6 rounded-2xl bg-background hover:shadow-lg transition-shadow"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Tours Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
            <div>
              <h2 className="text-3xl font-bold mb-2">Featured Tours</h2>
              <p className="text-muted-foreground">Discover our most popular experiences</p>
            </div>
            <Link href="/tours">
              <Button variant="ghost" className="gap-2 mt-4 md:mt-0">
                View All Tours
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredTours.map((tour) => (
              <Link key={tour.id} href={`/tours/${tour.slug}`}>
                <Card className="group overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={tour.image}
                      alt={tour.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <Badge className="absolute top-3 left-3 bg-white/90 text-foreground hover:bg-white">
                      {tour.category}
                    </Badge>
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{tour.rating}</span>
                      <span className="text-white/80 text-sm">({tour.reviews})</span>
                    </div>
                  </div>
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                      {tour.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {tour.shortDescription}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {tour.duration / 60}h
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-muted-foreground">From</span>
                        <p className="text-xl font-bold text-primary">${tour.price}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Book your perfect tour in just a few simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: "1",
                title: "Choose Your Tour",
                description: "Browse our selection of amazing tours and pick your favorite",
              },
              {
                step: "2",
                title: "Book & Sign Waiver",
                description: "Select your date, complete payment, and sign the waiver digitally",
              },
              {
                step: "3",
                title: "Enjoy Your Adventure",
                description: "Show up and have an unforgettable experience",
              },
            ].map((item, index) => (
              <div key={index} className="relative text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/25">
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
                {index < 2 && (
                  <ArrowRight className="hidden md:block absolute top-8 -right-4 h-6 w-6 text-muted-foreground/30" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary to-primary/80 p-8 md:p-12 lg:p-16 text-center">
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready for Your Next Adventure?
              </h2>
              <p className="text-white/80 max-w-2xl mx-auto mb-8">
                Join thousands of happy customers who have experienced unforgettable moments with us.
              </p>
              <Link href="/tours">
                <Button size="lg" variant="secondary" className="gap-2 shadow-lg">
                  <Calendar className="h-5 w-5" />
                  Book Your Tour Today
                </Button>
              </Link>
            </div>
            <div className="absolute inset-0 bg-grid-pattern opacity-10" />
            <div className="absolute -bottom-1/2 -right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          </div>
        </div>
      </section>
    </div>
  );
}
