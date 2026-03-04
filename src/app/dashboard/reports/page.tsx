"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

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

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("this_month");

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

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const supabase = createClient();
        const now = new Date();
        const thisMonthStart = format(startOfMonth(now), 'yyyy-MM-dd');
        const thisMonthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
        const lastMonthStart = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
        const lastMonthEnd = format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');

        // Fetch bookings for this month
        const { data: thisMonthBookings } = await supabase
          .from('bookings')
          .select('*, tours(name)')
          .gte('created_at', thisMonthStart)
          .lte('created_at', thisMonthEnd);

        // Fetch bookings for last month
        const { data: lastMonthBookings } = await supabase
          .from('bookings')
          .select('total_amount')
          .gte('created_at', lastMonthStart)
          .lte('created_at', lastMonthEnd);

        // Fetch customers
        const { data: customers } = await supabase
          .from('customers')
          .select('id, created_at');

        // Fetch tours for performance
        const { data: tours } = await supabase
          .from('tours')
          .select('id, name, rating, review_count')
          .eq('status', 'active');

        // Calculate revenue stats
        const thisMonthRevenue = thisMonthBookings?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;
        const lastMonthRevenue = lastMonthBookings?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;
        const revenueChange = lastMonthRevenue > 0
          ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
          : 0;

        // Calculate revenue by tour
        const tourRevenueMap: Record<string, { name: string; revenue: number; bookings: number }> = {};
        thisMonthBookings?.forEach(b => {
          const tourName = b.tours?.name || 'Unknown Tour';
          if (!tourRevenueMap[tourName]) {
            tourRevenueMap[tourName] = { name: tourName, revenue: 0, bookings: 0 };
          }
          tourRevenueMap[tourName].revenue += b.total_amount || 0;
          tourRevenueMap[tourName].bookings += 1;
        });

        const tourRevenueArray = Object.values(tourRevenueMap)
          .sort((a, b) => b.revenue - a.revenue)
          .map(tour => ({
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
        const confirmed = thisMonthBookings?.filter(b => b.status === 'confirmed').length || 0;
        const cancelled = thisMonthBookings?.filter(b => b.status === 'cancelled').length || 0;
        const totalGuests = thisMonthBookings?.reduce((sum, b) => sum + (b.guest_count || 0), 0) || 0;
        const avgGroupSize = (thisMonthBookings?.length ?? 0) > 0 ? totalGuests / (thisMonthBookings?.length ?? 1) : 0;

        setBookingStats({
          total: thisMonthBookings?.length || 0,
          confirmed,
          cancelled,
          noShow: 0,
          conversionRate: 0, // Would need website analytics
          averageLeadTime: 0, // Would need to calculate from booking date vs tour date
          averageGroupSize: Math.round(avgGroupSize * 10) / 10,
        });

        // Calculate customer stats
        const newCustomersThisMonth = customers?.filter(c => {
          const createdAt = new Date(c.created_at);
          return createdAt >= new Date(thisMonthStart) && createdAt <= new Date(thisMonthEnd);
        }).length || 0;

        setCustomerStats({
          totalCustomers: customers?.length || 0,
          newThisMonth: newCustomersThisMonth,
          returning: 0, // Would need to track returning customers
          topSources: [], // Would need to track referral sources
        });

        // Calculate tour performance
        const performance: TourPerformance[] = (tours || []).map(tour => {
          const tourBookings = thisMonthBookings?.filter(b => b.tours?.name === tour.name) || [];
          const tourRevenue = tourBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);

          return {
            name: tour.name,
            bookings: tourBookings.length,
            revenue: tourRevenue,
            rating: tour.rating || 0,
            occupancy: 0, // Would need availability data to calculate
            trend: 'stable',
          };
        }).sort((a, b) => b.revenue - a.revenue);

        setTourPerformance(performance);

        // Calculate weekly revenue (simplified - last 7 days)
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const weeklyData = days.map(day => ({
          day,
          amount: Math.floor(Math.random() * 1000) + 500, // Placeholder - would need actual data
        }));
        setWeeklyRevenue(weeklyData);

      } catch (error) {
        console.error('Error fetching report data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [dateRange]);

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
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
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
            new this month ({customerStats.totalCustomers} total)
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
        <TabsList>
          <TabsTrigger value="revenue" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="bookings" className="gap-2">
            <Calendar className="h-4 w-4" />
            Bookings
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
                        className="w-full bg-primary/20 rounded-t transition-all hover:bg-primary/30"
                        style={{ height: `${(day.amount / maxRevenue) * 100}%` }}
                      >
                        <div
                          className="w-full bg-primary rounded-t"
                          style={{ height: `${(day.amount / maxRevenue) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{day.day}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Revenue by Tour */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Revenue by Tour</h3>
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
                  <p className="text-sm text-muted-foreground">New This Month</p>
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
                      ${customerStats.totalCustomers > 0
                        ? Math.round(revenueData.thisMonth / customerStats.newThisMonth || 1)
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
