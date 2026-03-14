"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Search,
  Users,
  Mail,
  Phone,
  DollarSign,
  ExternalLink,
  TrendingUp,
  UserPlus,
  Download,
  Filter,
  X,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { StatCard } from "@/components/ui/stat-card";
import { IconBox } from "@/components/ui/icon-box";

interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  totalBookings: number;
  totalSpent: number;
  tags: string[];
  lastBooking: string | null;
  createdAt: string;
  bookings: any[];
  notes: string | null;
}

// V6 Pastel tag colors
const tagColors: Record<string, string> = {
  VIP: "bg-lavender text-lavender-dark hover:bg-lavender",
  Repeat: "bg-sky text-sky-dark hover:bg-sky",
  Corporate: "bg-mint text-mint-dark hover:bg-mint",
  Family: "bg-peach text-peach-dark hover:bg-peach",
};

const availableTags = ["VIP", "Repeat", "Corporate", "Family"];

interface Filters {
  tags: string[];
  minBookings: number;
  maxBookings: number;
  minSpent: number;
  maxSpent: number;
  hasEmail: boolean | null;
  hasPhone: boolean | null;
}

export default function CustomersPage() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    tags: [],
    minBookings: 0,
    maxBookings: 100,
    minSpent: 0,
    maxSpent: 10000,
    hasEmail: null,
    hasPhone: null,
  });
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from('customers')
          .select(`
            *,
            bookings(id, booking_reference, total_price, status, created_at, availabilities(tours(name)))
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching customers:', error);
          return;
        }

        if (data) {
          setCustomers(data.map(c => {
            const bookings = c.bookings || [];
            const totalSpent = bookings.reduce((sum: number, b: any) => sum + (b.total_price || 0), 0);
            const lastBooking = bookings.length > 0
              ? bookings.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at
              : null;

            // Use tags from database or determine based on behavior
            const tags: string[] = c.tags || [];
            if (tags.length === 0) {
              if (bookings.length >= 5) tags.push('VIP');
              if (bookings.length >= 2) tags.push('Repeat');
            }

            return {
              id: c.id,
              email: c.email || '',
              firstName: c.first_name || '',
              lastName: c.last_name || '',
              phone: c.phone || '',
              totalBookings: c.total_bookings || bookings.length,
              totalSpent: c.total_spent || totalSpent,
              tags,
              lastBooking,
              createdAt: c.created_at,
              bookings: bookings.map((b: any) => ({
                id: b.booking_reference,
                tour: b.availabilities?.tours?.name || 'Unknown Tour',
                date: b.created_at,
                amount: b.total_price || 0,
                status: b.status,
              })),
              notes: c.notes || null,
            };
          }));
        }
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // Calculate active filter count
  useEffect(() => {
    let count = 0;
    if (filters.tags.length > 0) count++;
    if (filters.minBookings > 0 || filters.maxBookings < 100) count++;
    if (filters.minSpent > 0 || filters.maxSpent < 10000) count++;
    if (filters.hasEmail !== null) count++;
    if (filters.hasPhone !== null) count++;
    setActiveFilterCount(count);
  }, [filters]);

  const filteredCustomers = customers.filter((customer) => {
    // Text search
    const matchesSearch =
      customer.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery);

    if (!matchesSearch) return false;

    // Tag filter
    if (filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some((tag) =>
        customer.tags.includes(tag)
      );
      if (!hasMatchingTag) return false;
    }

    // Bookings range filter
    if (
      customer.totalBookings < filters.minBookings ||
      customer.totalBookings > filters.maxBookings
    ) {
      return false;
    }

    // Spent range filter
    if (
      customer.totalSpent < filters.minSpent ||
      customer.totalSpent > filters.maxSpent
    ) {
      return false;
    }

    // Has email filter
    if (filters.hasEmail === true && !customer.email) return false;
    if (filters.hasEmail === false && customer.email) return false;

    // Has phone filter
    if (filters.hasPhone === true && !customer.phone) return false;
    if (filters.hasPhone === false && customer.phone) return false;

    return true;
  });

  const clearFilters = () => {
    setFilters({
      tags: [],
      minBookings: 0,
      maxBookings: 100,
      minSpent: 0,
      maxSpent: 10000,
      hasEmail: null,
      hasPhone: null,
    });
  };

  const toggleTag = (tag: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((acc, c) => acc + c.totalSpent, 0);
  const vipCustomers = customers.filter((c) => c.tags.includes("VIP")).length;

  const exportCustomers = () => {
    const headers = ["Name", "Email", "Phone", "Total Bookings", "Total Spent", "Tags", "Last Booking", "Customer Since"];
    const csvContent = [
      headers.join(","),
      ...filteredCustomers.map(c => [
        `"${c.firstName} ${c.lastName}"`,
        c.email,
        c.phone || "",
        c.totalBookings,
        c.totalSpent,
        `"${c.tags.join("; ")}"`,
        c.lastBooking ? format(new Date(c.lastBooking), "yyyy-MM-dd") : "",
        format(new Date(c.createdAt), "yyyy-MM-dd")
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `customers-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("Exported", { description: "Customer list exported to CSV file." });
  };

  const handleAddCustomer = () => {
    window.location.href = "/dashboard/customers/new";
  };

  const sendMessageToCustomer = async (customer: Customer) => {
    if (!customer.email) {
      toast.error("No email address", { description: "Customer doesn't have an email address." });
      return;
    }

    // Open email client as a simple solution
    window.open(`mailto:${customer.email}`, '_blank');
    toast.info("Email client opened", { description: `Compose email to ${customer.email}` });
  };

  const newBookingForCustomer = (customer: Customer) => {
    window.location.href = `/dashboard/bookings/new?customer=${customer.id}`;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded-xl w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-2xl" />
            ))}
          </div>
          <div className="h-96 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Customer CRM</h1>
          <p className="text-muted-foreground">
            Manage customer relationships and booking history
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 rounded-xl" onClick={exportCustomers}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button className="gap-2 gradient-primary border-0 rounded-xl shadow-lg shadow-primary/30" onClick={handleAddCustomer}>
            <UserPlus className="h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* V6 Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Total Customers"
          value={totalCustomers}
          icon={<Users className="h-5 w-5" />}
          color="sky"
          className="animate-fade-in-up stagger-1"
        />
        <StatCard
          title="Total Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5" />}
          color="mint"
          className="animate-fade-in-up stagger-2"
        />
        <StatCard
          title="VIP Customers"
          value={vipCustomers}
          icon={<TrendingUp className="h-5 w-5" />}
          color="lavender"
          className="animate-fade-in-up stagger-3"
        />
      </div>

      {/* V6 Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl border-border focus:border-primary"
          />
        </div>
        <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2 rounded-xl">
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center bg-primary text-primary-foreground rounded-full">
                  {activeFilterCount}
                </Badge>
              )}
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filters</h4>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-8 px-2 text-muted-foreground"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear all
                  </Button>
                )}
              </div>

              {/* Tags Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={filters.tags.includes(tag) ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer transition-colors",
                        filters.tags.includes(tag)
                          ? "bg-primary"
                          : tagColors[tag] || "hover:bg-muted"
                      )}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Bookings Range */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Bookings</Label>
                  <span className="text-xs text-muted-foreground">
                    {filters.minBookings} - {filters.maxBookings === 100 ? "100+" : filters.maxBookings}
                  </span>
                </div>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    min={0}
                    max={filters.maxBookings}
                    value={filters.minBookings}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        minBookings: Math.max(0, parseInt(e.target.value) || 0),
                      }))
                    }
                    className="w-20 h-8"
                    placeholder="Min"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="number"
                    min={filters.minBookings}
                    value={filters.maxBookings}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        maxBookings: Math.max(prev.minBookings, parseInt(e.target.value) || 100),
                      }))
                    }
                    className="w-20 h-8"
                    placeholder="Max"
                  />
                </div>
              </div>

              {/* Spending Range */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Total Spent ($)</Label>
                  <span className="text-xs text-muted-foreground">
                    ${filters.minSpent.toLocaleString()} - ${filters.maxSpent === 10000 ? "10k+" : filters.maxSpent.toLocaleString()}
                  </span>
                </div>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    min={0}
                    max={filters.maxSpent}
                    value={filters.minSpent}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        minSpent: Math.max(0, parseInt(e.target.value) || 0),
                      }))
                    }
                    className="w-24 h-8"
                    placeholder="Min"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="number"
                    min={filters.minSpent}
                    value={filters.maxSpent}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        maxSpent: Math.max(prev.minSpent, parseInt(e.target.value) || 10000),
                      }))
                    }
                    className="w-24 h-8"
                    placeholder="Max"
                  />
                </div>
              </div>

              {/* Contact Info Filters */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Contact Info</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="hasEmail"
                      checked={filters.hasEmail === true}
                      onCheckedChange={(checked) =>
                        setFilters((prev) => ({
                          ...prev,
                          hasEmail: checked ? true : null,
                        }))
                      }
                    />
                    <label htmlFor="hasEmail" className="text-sm cursor-pointer">
                      Has email address
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="hasPhone"
                      checked={filters.hasPhone === true}
                      onCheckedChange={(checked) =>
                        setFilters((prev) => ({
                          ...prev,
                          hasPhone: checked ? true : null,
                        }))
                      }
                    />
                    <label htmlFor="hasPhone" className="text-sm cursor-pointer">
                      Has phone number
                    </label>
                  </div>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => setFiltersOpen(false)}
              >
                Apply Filters
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="gap-1 cursor-pointer"
              onClick={() => toggleTag(tag)}
            >
              {tag}
              <X className="h-3 w-3" />
            </Badge>
          ))}
          {(filters.minBookings > 0 || filters.maxBookings < 100) && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer"
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  minBookings: 0,
                  maxBookings: 100,
                }))
              }
            >
              {filters.minBookings}-{filters.maxBookings} bookings
              <X className="h-3 w-3" />
            </Badge>
          )}
          {(filters.minSpent > 0 || filters.maxSpent < 10000) && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer"
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  minSpent: 0,
                  maxSpent: 10000,
                }))
              }
            >
              ${filters.minSpent.toLocaleString()}-${filters.maxSpent.toLocaleString()} spent
              <X className="h-3 w-3" />
            </Badge>
          )}
          {filters.hasEmail === true && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer"
              onClick={() =>
                setFilters((prev) => ({ ...prev, hasEmail: null }))
              }
            >
              Has email
              <X className="h-3 w-3" />
            </Badge>
          )}
          {filters.hasPhone === true && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer"
              onClick={() =>
                setFilters((prev) => ({ ...prev, hasPhone: null }))
              }
            >
              Has phone
              <X className="h-3 w-3" />
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-6 px-2 text-xs"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Results Count */}
      {(searchQuery || activeFilterCount > 0) && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredCustomers.length} of {customers.length} customers
        </p>
      )}

      {/* V6 Customer Table */}
      <Card className="rounded-2xl border shadow-sm animate-fade-in-up stagger-4">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg font-medium">No customers found</p>
            <p className="text-muted-foreground mb-4">
              {searchQuery || activeFilterCount > 0
                ? "Try adjusting your search or filters"
                : "Customers will appear here when they make bookings"}
            </p>
            {activeFilterCount > 0 && (
              <Button variant="outline" onClick={clearFilters} className="rounded-xl">
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-v6 w-full">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Bookings</th>
                  <th>Revenue</th>
                  <th>Tags</th>
                  <th>Last Booking</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="cursor-pointer">
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 rounded-xl">
                          <AvatarFallback className="rounded-xl bg-gradient-to-br from-sky to-lavender text-sky-dark font-semibold">
                            {customer.firstName[0] || '?'}
                            {customer.lastName[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {customer.firstName} {customer.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Customer since {format(new Date(customer.createdAt), "MMM yyyy")}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="space-y-1">
                        <p className="text-xs flex items-center gap-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {customer.email}
                        </p>
                        <p className="text-xs flex items-center gap-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {customer.phone || '-'}
                        </p>
                      </div>
                    </td>
                    <td>
                      <span className="font-medium text-sm">{customer.totalBookings}</span>
                    </td>
                    <td>
                      <span className="font-medium text-sm text-mint-dark">
                        ${customer.totalSpent.toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {customer.tags.map((tag) => (
                          <Badge
                            key={tag}
                            className={cn("text-xs", tagColors[tag] || "bg-secondary text-secondary-foreground")}
                          >
                            {tag}
                          </Badge>
                        ))}
                        {customer.tags.length === 0 && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="text-xs">
                        {customer.lastBooking
                          ? format(new Date(customer.lastBooking), "MMM d, yyyy")
                          : '-'}
                      </span>
                    </td>
                    <td>
                      <Link href={`/dashboard/customers/${customer.id}`}>
                        <Button variant="ghost" size="icon" className="rounded-lg">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
