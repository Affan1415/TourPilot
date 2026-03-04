"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Ship,
  Users,
  Award,
  Heart,
  Anchor,
  MapPin,
  Phone,
  Mail,
  Star,
  CheckCircle2,
} from "lucide-react";

const stats = [
  { label: "Years of Experience", value: "15+" },
  { label: "Happy Guests", value: "50,000+" },
  { label: "Tours Completed", value: "10,000+" },
  { label: "5-Star Reviews", value: "4,500+" },
];

const team = [
  {
    name: "Captain Mike Johnson",
    role: "Founder & Lead Captain",
    bio: "15+ years of sailing experience with USCG certification. Mike founded TourPilot to share his love of the sea.",
    image: null,
  },
  {
    name: "Sarah Martinez",
    role: "Operations Manager",
    bio: "Ensures every tour runs smoothly. Sarah brings 10 years of hospitality experience to our team.",
    image: null,
  },
  {
    name: "James Wilson",
    role: "Senior Guide",
    bio: "Marine biology enthusiast with deep knowledge of local wildlife. James makes every tour educational and fun.",
    image: null,
  },
];

const values = [
  {
    icon: Heart,
    title: "Passion for the Sea",
    description: "We live and breathe the ocean. Every tour is crafted with genuine love for maritime adventures.",
  },
  {
    icon: Users,
    title: "Guest-First Approach",
    description: "Your experience is our priority. We go above and beyond to create unforgettable memories.",
  },
  {
    icon: Award,
    title: "Safety Excellence",
    description: "USCG certified captains and crew. Your safety is never compromised.",
  },
  {
    icon: Anchor,
    title: "Local Expertise",
    description: "Born and raised on these waters. We know every hidden gem and perfect spot.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-24 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Ship className="h-4 w-4" />
              Our Story
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Bringing TourPilot to Life Since 2010
            </h1>
            <p className="text-xl text-muted-foreground">
              What started as one captain's dream has grown into the region's most
              trusted tour operator. We're passionate about sharing the beauty
              of the sea with everyone.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</p>
                <p className="text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div>
              <h2 className="text-3xl font-bold mb-6">Our Journey</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  In 2010, Captain Mike Johnson had a simple dream: share his love of the
                  ocean with others. With a single sailboat and an unwavering passion,
                  TourPilot was born.
                </p>
                <p>
                  What started as weekend sunset cruises for friends quickly grew into
                  something bigger. Word spread about the unforgettable experiences,
                  the knowledgeable crew, and the magical moments on the water.
                </p>
                <p>
                  Today, we operate a fleet of vessels and offer everything from
                  peaceful sunset cruises to thrilling dolphin watching adventures.
                  But one thing hasn't changed: our commitment to creating memories
                  that last a lifetime.
                </p>
              </div>
            </div>
            <div className="relative h-80 md:h-96 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <Ship className="h-24 w-24 text-primary/40" />
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">What We Stand For</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our values guide everything we do, from how we maintain our boats
              to how we treat our guests.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {values.map((value) => (
              <Card key={value.title} className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <value.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Meet Our Crew</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The passionate people who make every adventure special.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {team.map((member) => (
              <Card key={member.name} className="p-6 text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 mx-auto mb-4 flex items-center justify-center">
                  <Users className="h-10 w-10 text-primary/50" />
                </div>
                <h3 className="font-semibold text-lg">{member.name}</h3>
                <p className="text-sm text-primary mb-3">{member.role}</p>
                <p className="text-sm text-muted-foreground">{member.bio}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Why Choose TourPilot?</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {[
                "USCG certified captains and crew",
                "Well-maintained, modern fleet",
                "Flexible booking and cancellation",
                "Small group sizes for better experience",
                "Local knowledge and expertise",
                "Award-winning customer service",
                "Eco-friendly practices",
                "All safety equipment provided",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 p-4 bg-background rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto p-8 md:p-12 text-center bg-gradient-to-br from-primary/5 to-secondary/5">
            <h2 className="text-3xl font-bold mb-4">Ready for Your Adventure?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Join thousands of happy guests who have experienced the magic of
              the ocean with us. Book your tour today!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/tours">
                <Button size="lg" className="gradient-primary border-0">
                  Browse Tours
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline">
                  Contact Us
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
