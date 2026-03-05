"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Clock,
  Star,
  Search,
  SlidersHorizontal,
  Users,
  MapPin,
  Ship,
  X,
  Filter,
  Calendar,
  DollarSign,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useDebounce } from "@/hooks/use-debounce";

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
  availableDates: number;
}

interface FilterState {
  search: string;
  category: string;
  sortBy: string;
  priceMin: string;
  priceMax: string;
  durationMin: string;
  durationMax: string;
  location: string;
}

const initialFilters: FilterState = {
  search: "",
  category: "All",
  sortBy: "popular",
  priceMin: "",
  priceMax: "",
  durationMin: "",
  durationMax: "",
  location: "All",
};

function ToursPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [tours, setTours] = useState<Tour[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(() => ({
    search: searchParams.get("q") || "",
    category: searchParams.get("category") || "All",
    sortBy: searchParams.get("sort") || "popular",
    priceMin: searchParams.get("priceMin") || "",
    priceMax: searchParams.get("priceMax") || "",
    durationMin: searchParams.get("durationMin") || "",
    durationMax: searchParams.get("durationMax") || "",
    location: searchParams.get("location") || "All",
  }));

  const debouncedSearch = useDebounce(filters.search, 300);

  useEffect(() => {
    const fetchTours = async () => {
      try {
        const supabase = createClient();

        // Get tours with availability count
        const { data, error } = await supabase
          .from('tours')
          .select(`
            *,
            availabilities!left (
              id,
              date,
              status
            )
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching tours:', error);
          return;
        }

        if (data) {
          const today = new Date().toISOString().split('T')[0];
          setTours(data.map(t => {
            const futureAvailabilities = (t.availabilities || []).filter(
              (a: any) => a.date >= today && a.status === 'available'
            );
            return {
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
              location: t.location || t.meeting_point || '',
              availableDates: futureAvailabilities.length,
            };
          }));
        }
      } catch (error) {
        console.error('Error fetching tours:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTours();
  }, []);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (filters.category !== "All") params.set("category", filters.category);
    if (filters.sortBy !== "popular") params.set("sort", filters.sortBy);
    if (filters.priceMin) params.set("priceMin", filters.priceMin);
    if (filters.priceMax) params.set("priceMax", filters.priceMax);
    if (filters.durationMin) params.set("durationMin", filters.durationMin);
    if (filters.durationMax) params.set("durationMax", filters.durationMax);
    if (filters.location !== "All") params.set("location", filters.location);

    const queryString = params.toString();
    router.replace(queryString ? `/tours?${queryString}` : '/tours', { scroll: false });
  }, [debouncedSearch, filters.category, filters.sortBy, filters.priceMin, filters.priceMax, filters.durationMin, filters.durationMax, filters.location, router]);

  // Get unique values for filters
  const categories = ["All", ...new Set(tours.map(t => t.category).filter(Boolean))];
  const locations = ["All", ...new Set(tours.map(t => t.location).filter(Boolean))];

  // Count active filters
  const activeFilterCount = [
    filters.priceMin,
    filters.priceMax,
    filters.durationMin,
    filters.durationMax,
    filters.location !== "All" ? filters.location : "",
  ].filter(Boolean).length;

  // Apply filters
  const filteredTours = tours
    .filter((tour) => {
      // Search filter
      const searchLower = debouncedSearch.toLowerCase();
      const matchesSearch = !searchLower ||
        tour.name.toLowerCase().includes(searchLower) ||
        tour.shortDescription.toLowerCase().includes(searchLower) ||
        tour.location.toLowerCase().includes(searchLower);

      // Category filter
      const matchesCategory = filters.category === "All" || tour.category === filters.category;

      // Location filter
      const matchesLocation = filters.location === "All" || tour.location === filters.location;

      // Price filter
      const minPrice = filters.priceMin ? parseFloat(filters.priceMin) : 0;
      const maxPrice = filters.priceMax ? parseFloat(filters.priceMax) : Infinity;
      const matchesPrice = tour.price >= minPrice && tour.price <= maxPrice;

      // Duration filter (in minutes)
      const minDuration = filters.durationMin ? parseFloat(filters.durationMin) * 60 : 0;
      const maxDuration = filters.durationMax ? parseFloat(filters.durationMax) * 60 : Infinity;
      const matchesDuration = tour.duration >= minDuration && tour.duration <= maxDuration;

      return matchesSearch && matchesCategory && matchesLocation && matchesPrice && matchesDuration;
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "rating":
          return b.rating - a.rating;
        case "duration-short":
          return a.duration - b.duration;
        case "duration-long":
          return b.duration - a.duration;
        case "name-az":
          return a.name.localeCompare(b.name);
        case "name-za":
          return b.name.localeCompare(a.name);
        case "availability":
          return b.availableDates - a.availableDates;
        default: // popular
          return b.reviews - a.reviews;
      }
    });

  const clearFilters = () => {
    setFilters(initialFilters);
    setFiltersOpen(false);
  };

  const clearSearch = () => {
    setFilters({ ...filters, search: "" });
  };

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

        {/* Search and Filters Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tours by name, description, or location..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-10 pr-10"
            />
            {filters.search && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <Select value={filters.sortBy} onValueChange={(value) => setFilters({ ...filters, sortBy: value })}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="duration-short">Duration: Shortest</SelectItem>
              <SelectItem value="duration-long">Duration: Longest</SelectItem>
              <SelectItem value="name-az">Name: A to Z</SelectItem>
              <SelectItem value="name-za">Name: Z to A</SelectItem>
              <SelectItem value="availability">Most Available</SelectItem>
            </SelectContent>
          </Select>

          {/* Filters Sheet */}
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filter Tours</SheetTitle>
                <SheetDescription>
                  Narrow down tours to find your perfect experience
                </SheetDescription>
              </SheetHeader>

              <div className="py-6 space-y-6">
                {/* Location Filter */}
                {locations.length > 2 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location
                    </Label>
                    <Select
                      value={filters.location}
                      onValueChange={(value) => setFilters({ ...filters, location: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Locations" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Price Range */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Price Range
                  </Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.priceMin}
                        onChange={(e) => setFilters({ ...filters, priceMin: e.target.value })}
                        min={0}
                      />
                    </div>
                    <span className="flex items-center text-muted-foreground">to</span>
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.priceMax}
                        onChange={(e) => setFilters({ ...filters, priceMax: e.target.value })}
                        min={0}
                      />
                    </div>
                  </div>
                </div>

                {/* Duration Range */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Duration (hours)
                  </Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.durationMin}
                        onChange={(e) => setFilters({ ...filters, durationMin: e.target.value })}
                        min={0}
                        step={0.5}
                      />
                    </div>
                    <span className="flex items-center text-muted-foreground">to</span>
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.durationMax}
                        onChange={(e) => setFilters({ ...filters, durationMax: e.target.value })}
                        min={0}
                        step={0.5}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <SheetFooter className="flex gap-2">
                <Button variant="outline" onClick={clearFilters} className="flex-1">
                  Clear All
                </Button>
                <Button onClick={() => setFiltersOpen(false)} className="flex-1 gradient-primary border-0">
                  Apply Filters
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>

        {/* Active Filters Display */}
        {(debouncedSearch || activeFilterCount > 0 || filters.category !== "All") && (
          <div className="flex flex-wrap gap-2 mb-6">
            {debouncedSearch && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Search: "{debouncedSearch}"
                <button onClick={clearSearch} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.category !== "All" && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Category: {filters.category}
                <button
                  onClick={() => setFilters({ ...filters, category: "All" })}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.location !== "All" && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Location: {filters.location}
                <button
                  onClick={() => setFilters({ ...filters, location: "All" })}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {(filters.priceMin || filters.priceMax) && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Price: ${filters.priceMin || '0'} - ${filters.priceMax || '∞'}
                <button
                  onClick={() => setFilters({ ...filters, priceMin: "", priceMax: "" })}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {(filters.durationMin || filters.durationMax) && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Duration: {filters.durationMin || '0'}h - {filters.durationMax || '∞'}h
                <button
                  onClick={() => setFilters({ ...filters, durationMin: "", durationMax: "" })}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs">
              Clear all
            </Button>
          </div>
        )}

        {/* Category Pills */}
        {categories.length > 1 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={filters.category === category ? "default" : "outline"}
                size="sm"
                onClick={() => setFilters({ ...filters, category })}
                className={filters.category === category ? "gradient-primary border-0" : ""}
              >
                {category}
              </Button>
            ))}
          </div>
        )}

        {/* Results count */}
        <p className="text-sm text-muted-foreground mb-6">
          Showing {filteredTours.length} of {tours.length} tour{tours.length !== 1 ? "s" : ""}
        </p>

        {/* Tours Grid */}
        {filteredTours.length === 0 ? (
          <div className="text-center py-16">
            <Ship className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">No tours found</p>
            <p className="text-muted-foreground mb-4">
              {debouncedSearch || activeFilterCount > 0 || filters.category !== "All"
                ? "Try adjusting your search or filters"
                : "Check back soon for new tour offerings"}
            </p>
            {(debouncedSearch || activeFilterCount > 0 || filters.category !== "All") && (
              <Button variant="outline" onClick={clearFilters}>
                Clear All Filters
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
                    {tour.availableDates > 0 && (
                      <Badge className="absolute top-3 right-3 bg-green-500 text-white hover:bg-green-600">
                        <Calendar className="h-3 w-3 mr-1" />
                        {tour.availableDates} dates
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
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-1">
                      {tour.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {tour.shortDescription || "An unforgettable experience awaits you."}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4 flex-wrap">
                      {tour.duration > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {tour.duration >= 60 ? `${(tour.duration / 60).toFixed(1)}h` : `${tour.duration}m`}
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
                          <span className="truncate max-w-[120px]">{tour.location}</span>
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

function ToursPageFallback() {
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

export default function ToursPage() {
  return (
    <Suspense fallback={<ToursPageFallback />}>
      <ToursPageContent />
    </Suspense>
  );
}
