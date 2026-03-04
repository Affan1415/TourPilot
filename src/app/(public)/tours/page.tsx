"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  Star,
  Search,
  SlidersHorizontal,
  Users,
  MapPin,
  Ship,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Tour {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  duration: number;
  price: number;
  image: string | null;
  rating: number;
  reviews: number;
  category: string;
  maxCapacity: number;
  location: string;
}

export default function ToursPage() {
  const [loading, setLoading] = useState(true);
  const [tours, setTours] = useState<Tour[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("popular");

  useEffect(() => {
    const fetchTours = async () => {
      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from('tours')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching tours:', error);
          return;
        }

        if (data) {
          setTours(data.map(t => ({
            id: t.id,
            slug: t.slug || t.id,
            name: t.name || '',
            shortDescription: t.short_description || '',
            duration: t.duration_minutes || 0,
            price: t.base_price || 0,
            image: t.images?.[0] || null,
            rating: 0,
            reviews: 0,
            category: 'Tours',
            maxCapacity: t.max_capacity || 0,
            location: t.meeting_point || '',
          })));
        }
      } catch (error) {
        console.error('Error fetching tours:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTours();
  }, []);

  // Get unique categories from tours
  const categories = ["All", ...new Set(tours.map(t => t.category).filter(Boolean))];

  const filteredTours = tours
    .filter((tour) => {
      const matchesSearch = tour.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tour.shortDescription.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "All" || tour.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "rating":
          return b.rating - a.rating;
        case "duration":
          return a.duration - b.duration;
        default:
          return b.reviews - a.reviews;
      }
    });

  if (loading) {
    return (
      <div className="py-8">
        <div className="container mx-auto px-4">
          <div className="animate-pulse space-y-8">
            <div className="h-10 bg-muted rounded w-64" />
            <div className="flex gap-4">
              <div className="h-10 bg-muted rounded flex-1" />
              <div className="h-10 bg-muted rounded w-32" />
              <div className="h-10 bg-muted rounded w-32" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-96 bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Explore Our Tours</h1>
          <p className="text-muted-foreground">
            Discover unforgettable experiences tailored just for you
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tours..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-3">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[150px]">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="duration">Duration</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Category Pills */}
        {categories.length > 1 && (
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={selectedCategory === category ? "gradient-primary border-0" : ""}
              >
                {category}
              </Button>
            ))}
          </div>
        )}

        {/* Results count */}
        <p className="text-sm text-muted-foreground mb-6">
          Showing {filteredTours.length} tour{filteredTours.length !== 1 ? "s" : ""}
        </p>

        {/* Tours Grid */}
        {filteredTours.length === 0 ? (
          <div className="text-center py-16">
            <Ship className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">No tours available</p>
            <p className="text-muted-foreground mb-4">
              {searchQuery || selectedCategory !== "All"
                ? "Try adjusting your filters"
                : "Check back soon for new tour offerings"}
            </p>
            {(searchQuery || selectedCategory !== "All") && (
              <Button variant="outline" onClick={() => {
                setSearchQuery("");
                setSelectedCategory("All");
              }}>
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTours.map((tour, index) => (
              <Link
                key={tour.id}
                href={`/tours/${tour.slug}`}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Card className="group overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full">
                  <div className="relative h-52 overflow-hidden">
                    {tour.image ? (
                      <img
                        src={tour.image}
                        alt={tour.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <Ship className="h-16 w-16 text-primary/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    {tour.category && (
                      <Badge className="absolute top-3 left-3 bg-white/90 text-foreground hover:bg-white">
                        {tour.category}
                      </Badge>
                    )}
                    {tour.rating > 0 && (
                      <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{tour.rating}</span>
                        <span className="text-white/80 text-sm">({tour.reviews})</span>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                      {tour.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {tour.shortDescription || "An unforgettable experience awaits you."}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                      {tour.duration > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {tour.duration / 60}h
                        </span>
                      )}
                      {tour.maxCapacity > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          Max {tour.maxCapacity}
                        </span>
                      )}
                      {tour.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {tour.location}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div>
                        <span className="text-sm text-muted-foreground">From</span>
                        <p className="text-2xl font-bold text-primary">${tour.price}</p>
                      </div>
                      <Button className="gradient-primary border-0 shadow-md shadow-primary/20">
                        Book Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
