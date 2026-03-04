"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HelpCircle,
  Search,
  Calendar,
  CreditCard,
  FileText,
  Ship,
  Users,
  Clock,
  MessageCircle,
} from "lucide-react";

const categories = [
  { id: "booking", label: "Booking & Reservations", icon: Calendar },
  { id: "payment", label: "Payment & Pricing", icon: CreditCard },
  { id: "waivers", label: "Waivers & Safety", icon: FileText },
  { id: "tours", label: "Tour Information", icon: Ship },
  { id: "policies", label: "Policies", icon: Clock },
];

const faqs = [
  {
    category: "booking",
    question: "How do I make a booking?",
    answer: "Making a booking is easy! Simply browse our tours, select your preferred date and time, enter guest information, and complete payment. You'll receive an instant confirmation email with all the details.",
  },
  {
    category: "booking",
    question: "Can I modify my booking after it's confirmed?",
    answer: "Yes, you can modify your booking up to 48 hours before the tour. Log in to your account or contact us directly. Changes are subject to availability.",
  },
  {
    category: "booking",
    question: "How do I find my existing booking?",
    answer: "You can look up your booking using your confirmation email or booking reference number on our Booking Lookup page. You can also check your email for the confirmation we sent.",
  },
  {
    category: "booking",
    question: "Can I book for a large group?",
    answer: "Absolutely! For groups of 10 or more, we recommend contacting us directly for special group rates and private charter options. We can customize the experience for your group.",
  },
  {
    category: "payment",
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards (Visa, Mastercard, American Express, Discover) as well as Apple Pay and Google Pay. Payment is processed securely through Stripe.",
  },
  {
    category: "payment",
    question: "When am I charged for my booking?",
    answer: "Full payment is required at the time of booking to secure your spot. For private charters, a 50% deposit may be required with the balance due before the tour.",
  },
  {
    category: "payment",
    question: "Do you offer refunds?",
    answer: "Yes, we offer full refunds for cancellations made 48+ hours before the tour. Cancellations within 48 hours may receive a 50% refund or credit. No-shows are non-refundable.",
  },
  {
    category: "payment",
    question: "Are there any hidden fees?",
    answer: "No hidden fees! The price you see includes everything. Gratuities for crew are appreciated but not required.",
  },
  {
    category: "waivers",
    question: "Why do I need to sign a waiver?",
    answer: "Waivers are required for all water-based activities for legal and safety purposes. They acknowledge the inherent risks and release us from certain liabilities. All guests must sign before boarding.",
  },
  {
    category: "waivers",
    question: "How do I sign the waiver?",
    answer: "After booking, you'll receive an email with a link to sign the digital waiver. You can sign on any device using your finger or mouse. It takes less than 2 minutes.",
  },
  {
    category: "waivers",
    question: "Can parents sign for minors?",
    answer: "Yes, parents or legal guardians can sign waivers on behalf of minors (under 18). The signing adult must be present during the tour.",
  },
  {
    category: "waivers",
    question: "What if I forget to sign the waiver?",
    answer: "We'll send reminder emails before your tour. You can also sign on arrival, but we recommend signing in advance to ensure a smooth check-in.",
  },
  {
    category: "tours",
    question: "What should I bring on the tour?",
    answer: "We recommend bringing sunscreen, sunglasses, a hat, and a light jacket. Wear comfortable clothes and non-slip shoes. We provide all safety equipment and refreshments.",
  },
  {
    category: "tours",
    question: "Is food or drink provided?",
    answer: "Most tours include complimentary water and soft drinks. Our dinner cruises include a full meal. Check your specific tour details for inclusions.",
  },
  {
    category: "tours",
    question: "Are your tours suitable for children?",
    answer: "Most of our tours are family-friendly! Check the age requirements on each tour page. We have life jackets in all sizes and crew trained in child safety.",
  },
  {
    category: "tours",
    question: "What happens if the weather is bad?",
    answer: "Safety is our priority. If we cancel due to weather, you'll receive a full refund or free rescheduling. We monitor conditions closely and will notify you as early as possible.",
  },
  {
    category: "tours",
    question: "Do you accommodate special needs?",
    answer: "We strive to accommodate all guests. Please contact us in advance to discuss specific needs, and we'll do our best to ensure a comfortable experience.",
  },
  {
    category: "policies",
    question: "What is your cancellation policy?",
    answer: "Full refund for cancellations 48+ hours before tour. 50% refund or credit for cancellations within 48 hours. No refund for no-shows. Weather cancellations receive full refund.",
  },
  {
    category: "policies",
    question: "How early should I arrive?",
    answer: "Please arrive 15-20 minutes before your scheduled departure time. This allows time for check-in, waiver verification, and boarding. Late arrivals may not be able to join.",
  },
  {
    category: "policies",
    question: "Is alcohol allowed on tours?",
    answer: "Some tours include a bar service. You may not bring your own alcohol. Guests must be 21+ to consume alcohol, and we reserve the right to refuse service.",
  },
  {
    category: "policies",
    question: "Can I bring my pet?",
    answer: "Unfortunately, pets are not allowed on most tours for safety and allergy considerations. Service animals are welcome with advance notice.",
  },
];

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <HelpCircle className="h-4 w-4" />
              Help Center
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Find answers to common questions about our tours, bookings, and policies.
            </p>

            {/* Search */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for answers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 py-6 text-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8 border-b">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              onClick={() => setSelectedCategory(null)}
              className="gap-2"
            >
              All Topics
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(category.id)}
                className="gap-2"
              >
                <category.icon className="h-4 w-4" />
                {category.label}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ List */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-12">
                <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or browse all categories.
                </p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="space-y-4">
                {filteredFaqs.map((faq, index) => (
                  <AccordionItem
                    key={index}
                    value={`item-${index}`}
                    className="border rounded-lg px-6"
                  >
                    <AccordionTrigger className="text-left hover:no-underline">
                      <span className="font-medium">{faq.question}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </div>
      </section>

      {/* Still Need Help */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <Card className="max-w-2xl mx-auto p-8 text-center">
            <MessageCircle className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Still Have Questions?</h2>
            <p className="text-muted-foreground mb-6">
              Can't find what you're looking for? Our team is here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <Button className="gradient-primary border-0">Contact Us</Button>
              </Link>
              <Button variant="outline" asChild>
                <a href="tel:+15551234567">Call (555) 123-4567</a>
              </Button>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
