"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Ship,
  Anchor,
  Clock,
  Download,
  FileText,
  RefreshCw,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  PieChart,
  Activity,
  AlertCircle,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";

interface RevenueData {
  totalRevenue: number;
  totalDiscounts: number;
  bookingCount: number;
  averageBookingValue: number;
  dailyRevenue: { date: string; revenue: number; bookings: number }[];
  revenueByTour: { name: string; revenue: number; bookings: number }[];
}

interface BookingData {
  totalBookings: number;
  totalGuests: number;
  averageGroupSize: number;
  statusCounts: Record<string, number>;
  sourceBreakdown: { widget: number; affiliate: number; direct: number };
  dayOfWeekCounts: number[];
  hourCounts: number[];
  bookingsByTour: { name: string; count: number; guests: number }[];
  slotDistribution: { time: string; count: number }[];
}

interface OperationsData {
  boats: { total: number; active: number; byStatus: Record<string, number> };
  tours: { total: number; active: number };
  staff: { total: number; captains: number };
  utilization: {
    overall: number;
    totalCapacity: number;
    totalBooked: number;
    byTour: { name: string; capacity: number; booked: number; utilization: number }[];
  };
  peakHours: { hour: number; count: number }[];
  peakDays: { day: number; count: number }[];
  totalSlots: number;
  availableSlots: number;
  fullSlots: number;
}

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("30");
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [operationsData, setOperationsData] = useState<OperationsData | null>(null);
  const [exporting, setExporting] = useState(false);

  const getDateRange = useCallback(() => {
    const endDate = new Date();
    let startDate: Date;

    switch (dateRange) {
      case "7":
        startDate = subDays(endDate, 7);
        break;
      case "30":
        startDate = subDays(endDate, 30);
        break;
      case "90":
        startDate = subDays(endDate, 90);
        break;
      case "month":
        startDate = startOfMonth(endDate);
        break;
      case "lastMonth":
        startDate = startOfMonth(subMonths(endDate, 1));
        break;
      default:
        startDate = subDays(endDate, 30);
    }

    return {
      start: format(startDate, "yyyy-MM-dd"),
      end: format(endDate, "yyyy-MM-dd"),
    };
  }, [dateRange]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { start, end } = getDateRange();

      const [revenueRes, bookingRes, opsRes] = await Promise.all([
        fetch(`/api/analytics/revenue?start_date=${start}&end_date=${end}`),
        fetch(`/api/analytics/bookings?start_date=${start}&end_date=${end}`),
        fetch(`/api/analytics/operations?start_date=${start}&end_date=${end}`),
      ]);

      if (!revenueRes.ok || !bookingRes.ok || !opsRes.ok) {
        throw new Error("Failed to fetch analytics data");
      }

      const [revenueResult, bookingResult, opsResult] = await Promise.all([
        revenueRes.json(),
        bookingRes.json(),
        opsRes.json(),
      ]);

      setRevenueData(revenueResult.data);
      setBookingData(bookingResult.data);
      setOperationsData(opsResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
      console.error("Error fetching analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async (format: "csv" | "pdf") => {
    setExporting(true);
    try {
      // In a real implementation, call an API to generate the export
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success(`Analytics exported as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">Failed to load analytics</p>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchData}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Revenue</h1>
          <p className="text-muted-foreground">
            Revenue tracking, business insights, and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="lastMonth">Last Month</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={exporting}>
                {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Export
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport("csv")}>
                <FileText className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("pdf")}>
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(revenueData?.totalRevenue || 0)}
          icon={DollarSign}
          description={`${revenueData?.bookingCount || 0} bookings`}
        />
        <StatCard
          title="Total Bookings"
          value={bookingData?.totalBookings?.toLocaleString() || "0"}
          icon={Calendar}
          description={`${bookingData?.totalGuests || 0} total guests`}
        />
        <StatCard
          title="Avg Booking Value"
          value={formatCurrency(revenueData?.averageBookingValue || 0)}
          icon={TrendingUp}
        />
        <StatCard
          title="Capacity Utilization"
          value={`${operationsData?.utilization?.overall || 0}%`}
          icon={Activity}
          description={`${operationsData?.utilization?.totalBooked || 0} of ${operationsData?.utilization?.totalCapacity || 0} spots`}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Tour</CardTitle>
                <CardDescription>Performance breakdown by tour type</CardDescription>
              </CardHeader>
              <CardContent>
                {revenueData?.revenueByTour && revenueData.revenueByTour.length > 0 ? (
                  <div className="space-y-4">
                    {revenueData.revenueByTour.slice(0, 5).map((tour, i) => {
                      const maxRevenue = revenueData.revenueByTour[0]?.revenue || 1;
                      const percentage = (tour.revenue / maxRevenue) * 100;
                      return (
                        <div key={i} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium truncate">{tour.name}</span>
                            <span className="text-muted-foreground">
                              {formatCurrency(tour.revenue)} ({tour.bookings} bookings)
                            </span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No revenue data for this period
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Daily Revenue Trend</CardTitle>
                <CardDescription>Revenue over time</CardDescription>
              </CardHeader>
              <CardContent>
                {revenueData?.dailyRevenue && revenueData.dailyRevenue.length > 0 ? (
                  <div className="space-y-2">
                    {revenueData.dailyRevenue.slice(-7).map((day, i) => {
                      const maxRevenue = Math.max(...revenueData.dailyRevenue.map(d => d.revenue)) || 1;
                      const percentage = (day.revenue / maxRevenue) * 100;
                      return (
                        <div key={i} className="flex items-center gap-4">
                          <span className="text-sm w-20 text-muted-foreground">
                            {format(new Date(day.date), "MMM d")}
                          </span>
                          <div className="flex-1">
                            <Progress value={percentage} className="h-4" />
                          </div>
                          <span className="text-sm font-medium w-20 text-right">
                            {formatCurrency(day.revenue)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No daily data for this period
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-3xl font-bold text-green-600">
                    {formatCurrency(revenueData?.totalRevenue || 0)}
                  </p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Discounts Given</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {formatCurrency(revenueData?.totalDiscounts || 0)}
                  </p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Avg Booking Value</p>
                  <p className="text-3xl font-bold">
                    {formatCurrency(revenueData?.averageBookingValue || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Booking Sources</CardTitle>
                <CardDescription>Where bookings come from</CardDescription>
              </CardHeader>
              <CardContent>
                {bookingData?.sourceBreakdown ? (
                  <div className="space-y-4">
                    {[
                      { label: "Direct", count: bookingData.sourceBreakdown.direct, color: "bg-blue-500" },
                      { label: "Widget", count: bookingData.sourceBreakdown.widget, color: "bg-green-500" },
                      { label: "Affiliate", count: bookingData.sourceBreakdown.affiliate, color: "bg-purple-500" },
                    ].map((source, i) => {
                      const total = bookingData.sourceBreakdown.direct + bookingData.sourceBreakdown.widget + bookingData.sourceBreakdown.affiliate;
                      const percentage = total > 0 ? (source.count / total) * 100 : 0;
                      return (
                        <div key={i} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{source.label}</span>
                            <span className="text-muted-foreground">
                              {source.count} ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", source.color)}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No booking source data
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Booking Status</CardTitle>
                <CardDescription>Current booking statuses</CardDescription>
              </CardHeader>
              <CardContent>
                {bookingData?.statusCounts ? (
                  <div className="space-y-4">
                    {Object.entries(bookingData.statusCounts).map(([status, count], i) => {
                      const total = Object.values(bookingData.statusCounts).reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? (count / total) * 100 : 0;
                      const colors: Record<string, string> = {
                        pending: "bg-yellow-500",
                        confirmed: "bg-green-500",
                        completed: "bg-blue-500",
                        cancelled: "bg-red-500",
                      };
                      return (
                        <div key={i} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium capitalize">{status}</span>
                            <span className="text-muted-foreground">
                              {count} ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", colors[status] || "bg-gray-500")}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No status data
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Bookings by Day of Week</CardTitle>
              <CardDescription>When customers book most frequently</CardDescription>
            </CardHeader>
            <CardContent>
              {bookingData?.dayOfWeekCounts ? (
                <div className="grid grid-cols-7 gap-2">
                  {bookingData.dayOfWeekCounts.map((count, i) => {
                    const max = Math.max(...bookingData.dayOfWeekCounts) || 1;
                    const percentage = (count / max) * 100;
                    return (
                      <div key={i} className="text-center">
                        <div className="mb-2 h-24 flex items-end justify-center">
                          <div
                            className="w-8 bg-primary rounded-t"
                            style={{ height: `${Math.max(percentage, 5)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">{dayNames[i]}</p>
                        <p className="text-sm font-medium">{count}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Ship className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Boats</p>
                    <p className="text-2xl font-bold">
                      {operationsData?.boats?.active || 0} / {operationsData?.boats?.total || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-full">
                    <Anchor className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Tours</p>
                    <p className="text-2xl font-bold">
                      {operationsData?.tours?.active || 0} / {operationsData?.tours?.total || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Captains</p>
                    <p className="text-2xl font-bold">
                      {operationsData?.staff?.captains || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Tour Utilization</CardTitle>
                <CardDescription>Capacity usage by tour</CardDescription>
              </CardHeader>
              <CardContent>
                {operationsData?.utilization?.byTour && operationsData.utilization.byTour.length > 0 ? (
                  <div className="space-y-4">
                    {operationsData.utilization.byTour.slice(0, 5).map((tour, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium truncate">{tour.name}</span>
                          <span className="text-muted-foreground">
                            {tour.utilization}% ({tour.booked}/{tour.capacity})
                          </span>
                        </div>
                        <Progress value={tour.utilization} className="h-2" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No utilization data
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Peak Hours</CardTitle>
                <CardDescription>Most popular booking times</CardDescription>
              </CardHeader>
              <CardContent>
                {operationsData?.peakHours && operationsData.peakHours.length > 0 ? (
                  <div className="space-y-3">
                    {operationsData.peakHours.map((item, i) => {
                      const maxCount = operationsData.peakHours[0]?.count || 1;
                      const percentage = (item.count / maxCount) * 100;
                      return (
                        <div key={i} className="flex items-center gap-4">
                          <div className="flex items-center gap-2 w-20">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {item.hour.toString().padStart(2, "0")}:00
                            </span>
                          </div>
                          <div className="flex-1">
                            <Progress value={percentage} className="h-3" />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">
                            {item.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No peak hour data
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Slot Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Slots</p>
                  <p className="text-3xl font-bold">{operationsData?.totalSlots || 0}</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">Available</p>
                  <p className="text-3xl font-bold text-green-600">
                    {operationsData?.availableSlots || 0}
                  </p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-600">Full</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {operationsData?.fullSlots || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
