"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Ship,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  Percent,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, eachDayOfInterval, subDays } from "date-fns";

interface RevenueByTour {
  name: string;
  revenue: number;
  bookings: number;
  percentage: number;
}

interface TourPerformance {
  name: string;
  bookings: number;
  revenue: number;
  rating: number;
  occupancy: number;
  trend: string;
}

interface LocationRevenue {
  id: string;
  name: string;
  revenue: number;
  bookings: number;
  guests: number;
  percentage: number;
}

interface DailyBooking {
  date: string;
  dayName: string;
  bookings: number;
  revenue: number;
  guests: number;
}

interface CapacityData {
  tourName: string;
  totalCapacity: number;
  bookedCount: number;
  utilization: number;
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("this_month");
  const [exporting, setExporting] = useState(false);

  // Stats state
  const [revenueData, setRevenueData] = useState({
    thisMonth: 0,
    lastMonth: 0,
    change: 0,
    byTour: [] as RevenueByTour[],
  });

  const [bookingStats, setBookingStats] = useState({
    total: 0,
    confirmed: 0,
    cancelled: 0,
    noShow: 0,
    conversionRate: 0,
    averageLeadTime: 0,
    averageGroupSize: 0,
  });

  const [customerStats, setCustomerStats] = useState({
    totalCustomers: 0,
    newThisMonth: 0,
    returning: 0,
    topSources: [] as { name: string; count: number; percentage: number }[],
  });

  const [tourPerformance, setTourPerformance] = useState<TourPerformance[]>([]);
  const [weeklyRevenue, setWeeklyRevenue] = useState<{ day: string; amount: number }[]>([]);
  const [locationRevenue, setLocationRevenue] = useState<LocationRevenue[]>([]);
  const [dailyBookings, setDailyBookings] = useState<DailyBooking[]>([]);
  const [capacityData, setCapacityData] = useState<CapacityData[]>([]);
  const [rawBookingsData, setRawBookingsData] = useState<any[]>([]);

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const now = new Date();

      // Calculate date ranges based on selection
      let startDate: Date;
      let endDate: Date = now;

      switch (dateRange) {
        case "today":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          endDate = new Date();
          break;
        case "this_week":
          startDate = startOfWeek(now, { weekStartsOn: 1 });
          endDate = endOfWeek(now, { weekStartsOn: 1 });
          break;
        case "this_month":
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case "last_month":
          startDate = startOfMonth(subMonths(now, 1));
          endDate = endOfMonth(subMonths(now, 1));
          break;
        case "this_year":
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = now;
          break;
        default:
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
      }

      const startDateStr = format(startDate, "yyyy-MM-dd");
      const endDateStr = format(endDate, "yyyy-MM-dd");
      const lastMonthStart = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
      const lastMonthEnd = format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd");

      // Fetch bookings with all relations
      const { data: bookings } = await supabase
        .from("bookings")
        .select(`
          *,
          customer:customers(first_name, last_name, email),
          availability:availabilities(
            date,
            start_time,
            capacity_override,
            booked_count,
            tour:tours(
              id,
              name,
              max_capacity,
              location_id,
              rating
            )
          )
        `)
        .gte("created_at", startDateStr)
        .lte("created_at", endDateStr + "T23:59:59");

      setRawBookingsData(bookings || []);

      // Fetch bookings for last month (for comparison)
      const { data: lastMonthBookings } = await supabase
        .from("bookings")
        .select("total_price")
        .gte("created_at", lastMonthStart)
        .lte("created_at", lastMonthEnd + "T23:59:59");

      // Fetch customers
      const { data: customers } = await supabase
        .from("customers")
        .select("id, created_at");

      // Fetch locations
      const { data: locations } = await supabase
        .from("locations")
        .select("id, name");

      // Fetch all availabilities for capacity utilization
      const { data: availabilities } = await supabase
        .from("availabilities")
        .select(`
          id,
          date,
          booked_count,
          capacity_override,
          tour:tours(id, name, max_capacity)
        `)
        .gte("date", startDateStr)
        .lte("date", endDateStr);

      // Calculate revenue stats
      const thisMonthRevenue = bookings?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;
      const lastMonthRevenue = lastMonthBookings?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;
      const revenueChange = lastMonthRevenue > 0
        ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0;

      // Calculate revenue by tour
      const tourRevenueMap: Record<string, { name: string; revenue: number; bookings: number }> = {};
      bookings?.forEach((b) => {
        const tourName = b.availability?.tour?.name || "Unknown Tour";
        if (!tourRevenueMap[tourName]) {
          tourRevenueMap[tourName] = { name: tourName, revenue: 0, bookings: 0 };
        }
        tourRevenueMap[tourName].revenue += b.total_price || 0;
        tourRevenueMap[tourName].bookings += 1;
      });

      const tourRevenueArray = Object.values(tourRevenueMap)
        .sort((a, b) => b.revenue - a.revenue)
        .map((tour) => ({
          ...tour,
          percentage: thisMonthRevenue > 0 ? Math.round((tour.revenue / thisMonthRevenue) * 100) : 0,
        }));

      setRevenueData({
        thisMonth: thisMonthRevenue,
        lastMonth: lastMonthRevenue,
        change: Math.round(revenueChange * 10) / 10,
        byTour: tourRevenueArray,
      });

      // Calculate booking stats
      const confirmed = bookings?.filter((b) => b.status === "confirmed").length || 0;
      const cancelled = bookings?.filter((b) => b.status === "cancelled").length || 0;
      const noShow = bookings?.filter((b) => b.status === "no_show").length || 0;
      const totalGuests = bookings?.reduce((sum, b) => sum + (b.guest_count || 0), 0) || 0;
      const avgGroupSize = (bookings?.length ?? 0) > 0 ? totalGuests / (bookings?.length ?? 1) : 0;

      setBookingStats({
        total: bookings?.length || 0,
        confirmed,
        cancelled,
        noShow,
        conversionRate: 0,
        averageLeadTime: 0,
        averageGroupSize: Math.round(avgGroupSize * 10) / 10,
      });

      // Calculate customer stats
      const newCustomersThisPeriod = customers?.filter((c) => {
        const createdAt = new Date(c.created_at);
        return createdAt >= startDate && createdAt <= endDate;
      }).length || 0;

      setCustomerStats({
        totalCustomers: customers?.length || 0,
        newThisMonth: newCustomersThisPeriod,
        returning: 0,
        topSources: [],
      });

      // Calculate tour performance with occupancy
      const tourPerformanceMap: Record<string, TourPerformance> = {};
      bookings?.forEach((b) => {
        const tour = b.availability?.tour;
        if (!tour) return;

        if (!tourPerformanceMap[tour.id]) {
          tourPerformanceMap[tour.id] = {
            name: tour.name,
            bookings: 0,
            revenue: 0,
            rating: tour.rating || 0,
            occupancy: 0,
            trend: "stable",
          };
        }
        tourPerformanceMap[tour.id].bookings += 1;
        tourPerformanceMap[tour.id].revenue += b.total_price || 0;
      });

      setTourPerformance(
        Object.values(tourPerformanceMap).sort((a, b) => b.revenue - a.revenue)
      );

      // Calculate weekly/daily revenue
      const days = eachDayOfInterval({ start: subDays(now, 6), end: now });
      const dailyRevenueMap: Record<string, number> = {};

      bookings?.forEach((b) => {
        const dateKey = format(new Date(b.created_at), "yyyy-MM-dd");
        dailyRevenueMap[dateKey] = (dailyRevenueMap[dateKey] || 0) + (b.total_price || 0);
      });

      const weeklyData = days.map((day) => ({
        day: format(day, "EEE"),
        amount: dailyRevenueMap[format(day, "yyyy-MM-dd")] || 0,
      }));
      setWeeklyRevenue(weeklyData);

      // Calculate revenue by location
      const locationRevenueMap: Record<string, LocationRevenue> = {};
      locations?.forEach((loc) => {
        locationRevenueMap[loc.id] = {
          id: loc.id,
          name: loc.name,
          revenue: 0,
          bookings: 0,
          guests: 0,
          percentage: 0,
        };
      });

      bookings?.forEach((b) => {
        const locationId = b.availability?.tour?.location_id;
        if (locationId && locationRevenueMap[locationId]) {
          locationRevenueMap[locationId].revenue += b.total_price || 0;
          locationRevenueMap[locationId].bookings += 1;
          locationRevenueMap[locationId].guests += b.guest_count || 0;
        }
      });

      const locationRevenueArray = Object.values(locationRevenueMap)
        .filter((l) => l.revenue > 0 || l.bookings > 0)
        .map((loc) => ({
          ...loc,
          percentage: thisMonthRevenue > 0 ? Math.round((loc.revenue / thisMonthRevenue) * 100) : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      setLocationRevenue(locationRevenueArray);

      // Calculate daily booking summary
      const dailyBookingsMap: Record<string, DailyBooking> = {};
      bookings?.forEach((b) => {
        const dateKey = format(new Date(b.created_at), "yyyy-MM-dd");
        if (!dailyBookingsMap[dateKey]) {
          dailyBookingsMap[dateKey] = {
            date: dateKey,
            dayName: format(new Date(dateKey), "EEEE, MMM d"),
            bookings: 0,
            revenue: 0,
            guests: 0,
          };
        }
        dailyBookingsMap[dateKey].bookings += 1;
        dailyBookingsMap[dateKey].revenue += b.total_price || 0;
        dailyBookingsMap[dateKey].guests += b.guest_count || 0;
      });

      setDailyBookings(
        Object.values(dailyBookingsMap).sort((a, b) => b.date.localeCompare(a.date))
      );

      // Calculate capacity utilization
      const capacityMap: Record<string, { name: string; totalCapacity: number; booked: number }> = {};
      availabilities?.forEach((a: any) => {
        const tour = a.tour;
        if (!tour) return;

        const capacity = a.capacity_override || tour.max_capacity || 10;
        if (!capacityMap[tour.id]) {
          capacityMap[tour.id] = { name: tour.name, totalCapacity: 0, booked: 0 };
        }
        capacityMap[tour.id].totalCapacity += capacity;
        capacityMap[tour.id].booked += a.booked_count || 0;
      });

      const capacityArray: CapacityData[] = Object.values(capacityMap)
        .map((c) => ({
          tourName: c.name,
          totalCapacity: c.totalCapacity,
          bookedCount: c.booked,
          utilization: c.totalCapacity > 0 ? Math.round((c.booked / c.totalCapacity) * 100) : 0,
        }))
        .sort((a, b) => b.utilization - a.utilization);

      setCapacityData(capacityArray);
    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handleExportCSV = (type: "bookings" | "revenue" | "daily" | "capacity") => {
    setExporting(true);
    try {
      let csvContent = "";
      let filename = "";

      switch (type) {
        case "bookings":
          csvContent = "Booking Reference,Customer,Tour,Date,Guests,Total,Status\n";
          rawBookingsData.forEach((b) => {
            const customerName = `${b.customer?.first_name || ""} ${b.customer?.last_name || ""}`.trim();
            csvContent += `${b.booking_reference},${customerName},"${b.availability?.tour?.name || ""}",${b.availability?.date || ""},${b.guest_count},${b.total_price},${b.status}\n`;
          });
          filename = `bookings_${format(new Date(), "yyyy-MM-dd")}.csv`;
          break;

        case "revenue":
          csvContent = "Tour,Revenue,Bookings,Percentage\n";
          revenueData.byTour.forEach((t) => {
            csvContent += `"${t.name}",${t.revenue},${t.bookings},${t.percentage}%\n`;
          });
          filename = `revenue_by_tour_${format(new Date(), "yyyy-MM-dd")}.csv`;
          break;

        case "daily":
          csvContent = "Date,Bookings,Revenue,Guests\n";
          dailyBookings.forEach((d) => {
            csvContent += `${d.date},${d.bookings},${d.revenue},${d.guests}\n`;
          });
          filename = `daily_summary_${format(new Date(), "yyyy-MM-dd")}.csv`;
          break;

        case "capacity":
          csvContent = "Tour,Total Capacity,Booked,Utilization\n";
          capacityData.forEach((c) => {
            csvContent += `"${c.tourName}",${c.totalCapacity},${c.bookedCount},${c.utilization}%\n`;
          });
          filename = `capacity_utilization_${format(new Date(), "yyyy-MM-dd")}.csv`;
          break;
      }

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setExporting(false);
    }
  };

  const maxRevenue = Math.max(...weeklyRevenue.map((d) => d.amount), 1);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-lg" />
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="h-64 bg-muted rounded-lg" />
            <div className="h-64 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground">
            Track performance metrics and business insights
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Select onValueChange={(value) => handleExportCSV(value as any)}>
            <SelectTrigger className="w-[140px]">
              <Download className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Export CSV" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bookings">Bookings</SelectItem>
              <SelectItem value="revenue">Revenue by Tour</SelectItem>
              <SelectItem value="daily">Daily Summary</SelectItem>
              <SelectItem value="capacity">Capacity</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Revenue</p>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">${revenueData.thisMonth.toLocaleString()}</p>
          <div className="flex items-center gap-1 mt-1">
            {revenueData.change >= 0 ? (
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            )}
            <span
              className={cn(
                "text-sm font-medium",
                revenueData.change >= 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {Math.abs(revenueData.change)}%
            </span>
            <span className="text-sm text-muted-foreground">vs last month</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Bookings</p>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{bookingStats.total}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-green-600">{bookingStats.confirmed} confirmed</span>
            <span className="text-sm text-muted-foreground">•</span>
            <span className="text-sm text-red-600">{bookingStats.cancelled} cancelled</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Customers</p>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{customerStats.newThisMonth}</p>
          <p className="text-sm text-muted-foreground mt-1">
            new this period ({customerStats.totalCustomers} total)
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Avg. Group Size</p>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{bookingStats.averageGroupSize}</p>
          <p className="text-sm text-muted-foreground mt-1">guests per booking</p>
        </Card>
      </div>

      {/* Charts and Details */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="revenue" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="bookings" className="gap-2">
            <Calendar className="h-4 w-4" />
            Bookings
          </TabsTrigger>
          <TabsTrigger value="daily" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Daily Summary
          </TabsTrigger>
          <TabsTrigger value="locations" className="gap-2">
            <Building2 className="h-4 w-4" />
            By Location
          </TabsTrigger>
          <TabsTrigger value="capacity" className="gap-2">
            <Percent className="h-4 w-4" />
            Capacity
          </TabsTrigger>
          <TabsTrigger value="tours" className="gap-2">
            <Ship className="h-4 w-4" />
            Tours
          </TabsTrigger>
          <TabsTrigger value="customers" className="gap-2">
            <Users className="h-4 w-4" />
            Customers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Weekly Revenue Chart */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Weekly Revenue</h3>
              {weeklyRevenue.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground">
                  No revenue data available
                </div>
              ) : (
                <div className="flex items-end gap-2 h-48">
                  {weeklyRevenue.map((day) => (
                    <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
                      <div
                        className="w-full bg-primary/20 rounded-t transition-all hover:bg-primary/30 relative group"
                        style={{ height: `${Math.max((day.amount / maxRevenue) * 100, 5)}%` }}
                      >
                        <div
                          className="w-full bg-primary rounded-t absolute bottom-0"
                          style={{ height: "100%" }}
                        />
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          ${day.amount.toLocaleString()}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{day.day}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Revenue by Tour */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Revenue by Tour</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExportCSV("revenue")}
                  disabled={exporting}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
              {revenueData.byTour.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground">
                  No tour revenue data yet
                </div>
              ) : (
                <div className="space-y-4">
                  {revenueData.byTour.slice(0, 5).map((tour) => (
                    <div key={tour.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{tour.name}</span>
                        <span className="text-sm font-semibold">${tour.revenue.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${tour.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {tour.bookings} bookings • {tour.percentage}% of total
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Booking Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Confirmed</span>
                  </div>
                  <span className="font-semibold">{bookingStats.confirmed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm">Cancelled</span>
                  </div>
                  <span className="font-semibold">{bookingStats.cancelled}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-600" />
                    <span className="text-sm">No Show</span>
                  </div>
                  <span className="font-semibold">{bookingStats.noShow}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Booking Summary</h3>
              <div className="text-center">
                <p className="text-4xl font-bold text-primary">{bookingStats.total}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  total bookings this period
                </p>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Booking Insights</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg. Group Size</span>
                  <span className="font-semibold">{bookingStats.averageGroupSize} guests</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Revenue</span>
                  <span className="font-semibold">${revenueData.thisMonth.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg. per Booking</span>
                  <span className="font-semibold">
                    ${bookingStats.total > 0 ? Math.round(revenueData.thisMonth / bookingStats.total) : 0}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Daily Summary Tab */}
        <TabsContent value="daily" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Daily Booking Summary</h3>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleExportCSV("daily")}
                disabled={exporting}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
            {dailyBookings.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No bookings in the selected period</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Bookings</TableHead>
                    <TableHead className="text-right">Guests</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyBookings.map((day) => (
                    <TableRow key={day.date}>
                      <TableCell className="font-medium">{day.dayName}</TableCell>
                      <TableCell className="text-right">{day.bookings}</TableCell>
                      <TableCell className="text-right">{day.guests}</TableCell>
                      <TableCell className="text-right font-semibold">
                        ${day.revenue.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">
                      {dailyBookings.reduce((sum, d) => sum + d.bookings, 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {dailyBookings.reduce((sum, d) => sum + d.guests, 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${dailyBookings.reduce((sum, d) => sum + d.revenue, 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* By Location Tab */}
        <TabsContent value="locations" className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Revenue by Location</h3>
            {locationRevenue.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No location data available</p>
                <p className="text-sm mt-1">Add locations and assign tours to see revenue breakdown</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {locationRevenue.map((loc) => (
                  <Card key={loc.id} className="p-4 bg-muted/30">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{loc.name}</h4>
                        <p className="text-sm text-muted-foreground">{loc.percentage}% of total</p>
                      </div>
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Revenue</span>
                        <span className="font-semibold">${loc.revenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Bookings</span>
                        <span>{loc.bookings}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Guests</span>
                        <span>{loc.guests}</span>
                      </div>
                    </div>
                    <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${loc.percentage}%` }}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Capacity Utilization Tab */}
        <TabsContent value="capacity" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Capacity Utilization</h3>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleExportCSV("capacity")}
                disabled={exporting}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
            {capacityData.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Percent className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No capacity data available for this period</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tour</TableHead>
                    <TableHead className="text-right">Total Capacity</TableHead>
                    <TableHead className="text-right">Booked</TableHead>
                    <TableHead className="text-right">Utilization</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {capacityData.map((item) => (
                    <TableRow key={item.tourName}>
                      <TableCell className="font-medium">{item.tourName}</TableCell>
                      <TableCell className="text-right">{item.totalCapacity}</TableCell>
                      <TableCell className="text-right">{item.bookedCount}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                item.utilization >= 80
                                  ? "bg-green-500"
                                  : item.utilization >= 50
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                              )}
                              style={{ width: `${item.utilization}%` }}
                            />
                          </div>
                          <span
                            className={cn(
                              "font-semibold text-sm min-w-[3rem]",
                              item.utilization >= 80
                                ? "text-green-600"
                                : item.utilization >= 50
                                ? "text-yellow-600"
                                : "text-red-600"
                            )}
                          >
                            {item.utilization}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="tours" className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Tour Performance</h3>
            {tourPerformance.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Ship className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No tour performance data available yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Tour</th>
                      <th className="text-right py-3 px-2 font-medium">Bookings</th>
                      <th className="text-right py-3 px-2 font-medium">Revenue</th>
                      <th className="text-right py-3 px-2 font-medium">Rating</th>
                      <th className="text-right py-3 px-2 font-medium">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tourPerformance.map((tour) => (
                      <tr key={tour.name} className="border-b last:border-0">
                        <td className="py-3 px-2">
                          <span className="font-medium">{tour.name}</span>
                        </td>
                        <td className="text-right py-3 px-2">{tour.bookings}</td>
                        <td className="text-right py-3 px-2 font-semibold">
                          ${tour.revenue.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-2">
                          {tour.rating > 0 ? (
                            <span className="flex items-center justify-end gap-1">
                              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                              {tour.rating}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="text-right py-3 px-2">
                          {tour.trend === "up" ? (
                            <TrendingUp className="h-4 w-4 text-green-600 ml-auto" />
                          ) : tour.trend === "down" ? (
                            <TrendingDown className="h-4 w-4 text-red-600 ml-auto" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Customer Overview</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-3xl font-bold">{customerStats.totalCustomers}</p>
                  <p className="text-sm text-muted-foreground">Total Customers</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-3xl font-bold">{customerStats.newThisMonth}</p>
                  <p className="text-sm text-muted-foreground">New This Period</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Customer Insights</h3>
              {customerStats.totalCustomers === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No customer data available yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Growth Rate</span>
                    <span className="font-semibold">
                      {customerStats.totalCustomers > 0
                        ? Math.round((customerStats.newThisMonth / customerStats.totalCustomers) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Avg. Revenue per Customer</span>
                    <span className="font-semibold">
                      ${customerStats.newThisMonth > 0
                        ? Math.round(revenueData.thisMonth / customerStats.newThisMonth)
                        : 0}
                    </span>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
