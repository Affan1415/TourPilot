"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";

// Mock data
const mockRevenueData = {
  total: 48750,
  previousTotal: 42300,
  bookings: 312,
  avgValue: 156.25,
  refunds: 2450,
  netRevenue: 46300,
  byTour: [
    { tour: "Sunset Cruise", revenue: 18500, bookings: 124 },
    { tour: "Morning Adventure", revenue: 15200, bookings: 98 },
    { tour: "Snorkel Experience", revenue: 10050, bookings: 62 },
    { tour: "Private Charter", revenue: 5000, bookings: 8 },
  ],
  byDay: Array.from({ length: 30 }, (_, i) => ({
    date: format(subDays(new Date(), 29 - i), "MMM d"),
    revenue: Math.floor(Math.random() * 3000) + 500,
    bookings: Math.floor(Math.random() * 15) + 5,
  })),
  paymentMethods: [
    { method: "Credit Card", count: 245, amount: 38200 },
    { method: "PayPal", count: 42, amount: 6500 },
    { method: "Apple Pay", count: 25, amount: 4050 },
  ],
};

const mockBookingData = {
  total: 312,
  confirmed: 285,
  cancelled: 27,
  cancellationRate: 8.7,
  avgLeadTime: 5.2,
  avgGroupSize: 3.4,
  byStatus: { confirmed: 245, completed: 40, cancelled: 27 },
  bySource: [
    { source: "Website", count: 198 },
    { source: "Widget", count: 64 },
    { source: "Phone", count: 32 },
    { source: "Walk-in", count: 18 },
  ],
  leadTimeDistribution: [
    { range: "Same/Next Day", count: 45 },
    { range: "2-3 Days", count: 78 },
    { range: "4-7 Days", count: 92 },
    { range: "1-2 Weeks", count: 56 },
    { range: "2-4 Weeks", count: 28 },
    { range: "1+ Month", count: 13 },
  ],
};

const mockOperationsData = {
  toursRun: 186,
  totalGuests: 1248,
  avgUtilization: 72.5,
  boats: [
    { name: "Sea Breeze", tours: 68, guests: 456, utilization: 78 },
    { name: "Ocean Spirit", tours: 54, guests: 378, utilization: 72 },
    { name: "Island Hopper", tours: 42, guests: 284, utilization: 68 },
    { name: "Sunset Runner", tours: 22, guests: 130, utilization: 65 },
  ],
  captains: [
    { name: "Captain Mike", tours: 52, guests: 348 },
    { name: "Captain Sarah", tours: 48, guests: 312 },
    { name: "Captain John", tours: 45, guests: 298 },
    { name: "Captain Lisa", tours: 41, guests: 290 },
  ],
  peakHours: [
    { hour: "9:00 AM", bookings: 42 },
    { hour: "11:00 AM", bookings: 38 },
    { hour: "2:00 PM", bookings: 35 },
    { hour: "5:30 PM", bookings: 48 },
    { hour: "7:00 PM", bookings: 23 },
  ],
  peakDays: [
    { day: "Monday", bookings: 32 },
    { day: "Tuesday", bookings: 28 },
    { day: "Wednesday", bookings: 35 },
    { day: "Thursday", bookings: 38 },
    { day: "Friday", bookings: 52 },
    { day: "Saturday", bookings: 68 },
    { day: "Sunday", bookings: 59 },
  ],
};

type DateRange = "7d" | "30d" | "90d" | "thisMonth" | "lastMonth" | "custom";

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [activeTab, setActiveTab] = useState("revenue");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case "7d": return "Last 7 days";
      case "30d": return "Last 30 days";
      case "90d": return "Last 90 days";
      case "thisMonth": return format(new Date(), "MMMM yyyy");
      case "lastMonth": return format(subMonths(new Date(), 1), "MMMM yyyy");
      default: return "Custom";
    }
  };

  const handleExport = async (format: string) => {
    setExporting(true);
    await new Promise((r) => setTimeout(r, 1500));
    setExporting(false);
    toast.success(`Report exported as ${format.toUpperCase()}`, {
      description: "Check your downloads folder.",
    });
  };

  const revenueChange = ((mockRevenueData.total - mockRevenueData.previousTotal) / mockRevenueData.previousTotal) * 100;

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded-xl w-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
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
      {/* V6 Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Track performance, identify trends, and make data-driven decisions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-40 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="thisMonth">This month</SelectItem>
              <SelectItem value="lastMonth">Last month</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 rounded-xl" disabled={exporting}>
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-xl">
              <DropdownMenuItem onClick={() => handleExport("csv")} className="rounded-lg">
                <FileText className="h-4 w-4 mr-2" />
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("pdf")} className="rounded-lg">
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("xlsx")} className="rounded-lg">
                <FileText className="h-4 w-4 mr-2" />
                Export Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* V6 Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="rounded-xl p-1">
          <TabsTrigger value="revenue" className="gap-2 rounded-lg">
            <DollarSign className="h-4 w-4" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="bookings" className="gap-2 rounded-lg">
            <Calendar className="h-4 w-4" />
            Bookings
          </TabsTrigger>
          <TabsTrigger value="operations" className="gap-2 rounded-lg">
            <Activity className="h-4 w-4" />
            Operations
          </TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          {/* V6 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Total Revenue"
              value={`$${mockRevenueData.total.toLocaleString()}`}
              icon={<DollarSign className="h-5 w-5" />}
              color="mint"
              trend={{ value: Math.abs(revenueChange), isPositive: revenueChange >= 0 }}
              className="animate-fade-in-up stagger-1"
            />
            <StatCard
              title="Total Bookings"
              value={mockRevenueData.bookings}
              icon={<Calendar className="h-5 w-5" />}
              color="sky"
              className="animate-fade-in-up stagger-2"
            />
            <StatCard
              title="Avg. Booking Value"
              value={`$${mockRevenueData.avgValue.toFixed(2)}`}
              icon={<TrendingUp className="h-5 w-5" />}
              color="lavender"
              className="animate-fade-in-up stagger-3"
            />
            <StatCard
              title="Net Revenue"
              value={`$${mockRevenueData.netRevenue.toLocaleString()}`}
              icon={<DollarSign className="h-5 w-5" />}
              color="peach"
              trend={{ value: 5, isPositive: true }}
              className="animate-fade-in-up stagger-4"
            />
          </div>

          {/* V6 Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Trend Chart */}
            <Card className="lg:col-span-2 rounded-2xl border shadow-sm animate-fade-in-up stagger-5">
              <CardHeader>
                <CardTitle className="text-lg">Revenue Trend</CardTitle>
                <CardDescription>{getDateRangeLabel()}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end gap-1.5">
                  {mockRevenueData.byDay.slice(-14).map((day, i) => {
                    const maxRevenue = Math.max(...mockRevenueData.byDay.map(d => d.revenue));
                    const height = (day.revenue / maxRevenue) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-gradient-to-t from-sky-dark to-lavender-dark rounded-t-lg hover:opacity-80 transition-opacity"
                          style={{ height: `${height}%` }}
                          title={`${day.date}: $${day.revenue}`}
                        />
                        <span className="text-xs text-muted-foreground rotate-45 origin-left whitespace-nowrap">
                          {day.date}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Revenue by Tour */}
            <Card className="rounded-2xl border shadow-sm animate-fade-in-up stagger-5">
              <CardHeader>
                <CardTitle className="text-lg">Revenue by Tour</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockRevenueData.byTour.map((tour, i) => {
                  const percentage = (tour.revenue / mockRevenueData.total) * 100;
                  const colors = ["bg-mint-dark", "bg-sky-dark", "bg-lavender-dark", "bg-peach-dark"];
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="truncate">{tour.tour}</span>
                        <span className="font-medium">${tour.revenue.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", colors[i % colors.length])}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {tour.bookings} bookings ({percentage.toFixed(1)}%)
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Payment Methods */}
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Payment Methods</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {mockRevenueData.paymentMethods.map((pm, i) => {
                  const colors = ["bg-mint", "bg-lavender", "bg-sky"];
                  const textColors = ["text-mint-dark", "text-lavender-dark", "text-sky-dark"];
                  return (
                    <div key={i} className={cn("p-4 rounded-xl", colors[i % colors.length])}>
                      <p className={cn("font-medium", textColors[i % textColors.length])}>{pm.method}</p>
                      <p className={cn("text-2xl font-bold mt-1", textColors[i % textColors.length])}>${pm.amount.toLocaleString()}</p>
                      <p className={cn("text-sm opacity-70", textColors[i % textColors.length])}>{pm.count} transactions</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="space-y-6">
          {/* V6 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Total Bookings"
              value={mockBookingData.total}
              icon={<Calendar className="h-5 w-5" />}
              color="sky"
              className="animate-fade-in-up stagger-1"
            />
            <StatCard
              title="Cancellation Rate"
              value={`${mockBookingData.cancellationRate}%`}
              icon={<TrendingDown className="h-5 w-5" />}
              color="peach"
              className="animate-fade-in-up stagger-2"
            />
            <StatCard
              title="Avg. Lead Time"
              value={`${mockBookingData.avgLeadTime} days`}
              icon={<Clock className="h-5 w-5" />}
              color="lavender"
              className="animate-fade-in-up stagger-3"
            />
            <StatCard
              title="Avg. Group Size"
              value={mockBookingData.avgGroupSize}
              icon={<Users className="h-5 w-5" />}
              color="mint"
              className="animate-fade-in-up stagger-4"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Booking Sources */}
            <Card className="rounded-2xl border shadow-sm animate-fade-in-up stagger-5">
              <CardHeader>
                <CardTitle className="text-lg">Booking Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockBookingData.bySource.map((source, i) => {
                    const percentage = (source.count / mockBookingData.total) * 100;
                    const colors = ["bg-sky-dark", "bg-mint-dark", "bg-lavender-dark", "bg-peach-dark"];
                    return (
                      <div key={i} className="flex items-center gap-4">
                        <div className="w-24 text-sm">{source.source}</div>
                        <div className="flex-1">
                          <div className="h-3 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", colors[i % colors.length])}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="w-16 text-right text-sm font-medium">
                          {source.count} ({percentage.toFixed(0)}%)
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Lead Time Distribution */}
            <Card className="rounded-2xl border shadow-sm animate-fade-in-up stagger-5">
              <CardHeader>
                <CardTitle className="text-lg">Lead Time Distribution</CardTitle>
                <CardDescription>How far in advance customers book</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockBookingData.leadTimeDistribution.map((lt, i) => {
                    const percentage = (lt.count / mockBookingData.total) * 100;
                    return (
                      <div key={i} className="flex items-center gap-4">
                        <div className="w-28 text-sm">{lt.range}</div>
                        <div className="flex-1">
                          <div className="h-3 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all bg-lavender-dark"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="w-12 text-right text-sm font-medium">
                          {lt.count}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Status */}
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Booking Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 flex-wrap">
                {Object.entries(mockBookingData.byStatus).map(([status, count]) => {
                  const statusColors: Record<string, string> = {
                    confirmed: "bg-sky",
                    completed: "bg-mint",
                    cancelled: "bg-rose"
                  };
                  const textColors: Record<string, string> = {
                    confirmed: "text-sky-dark",
                    completed: "text-mint-dark",
                    cancelled: "text-rose-dark"
                  };
                  return (
                    <div key={status} className={cn("flex items-center gap-3 p-4 rounded-xl", statusColors[status] || "bg-muted")}>
                      <div>
                        <p className={cn("text-2xl font-bold", textColors[status] || "text-foreground")}>{count}</p>
                        <p className={cn("text-sm capitalize opacity-70", textColors[status] || "text-muted-foreground")}>{status}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-6">
          {/* V6 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatCard
              title="Tours Completed"
              value={mockOperationsData.toursRun}
              icon={<Ship className="h-5 w-5" />}
              color="sky"
              className="animate-fade-in-up stagger-1"
            />
            <StatCard
              title="Total Guests"
              value={mockOperationsData.totalGuests.toLocaleString()}
              icon={<Users className="h-5 w-5" />}
              color="mint"
              className="animate-fade-in-up stagger-2"
            />
            <StatCard
              title="Avg. Utilization"
              value={`${mockOperationsData.avgUtilization}%`}
              icon={<Activity className="h-5 w-5" />}
              color="lavender"
              className="animate-fade-in-up stagger-3"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Boat Performance */}
            <Card className="rounded-2xl border shadow-sm animate-fade-in-up stagger-4">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Anchor className="h-5 w-5" />
                  Boat Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockOperationsData.boats.map((boat, i) => (
                    <div key={i} className="p-3 border rounded-xl">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{boat.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {boat.tours} tours - {boat.guests} guests
                          </p>
                        </div>
                        <Badge variant={boat.utilization >= 75 ? "mint" : boat.utilization >= 50 ? "peach" : "secondary"}>
                          {boat.utilization}% utilized
                        </Badge>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden mt-2">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            boat.utilization >= 75 ? "bg-mint-dark" : boat.utilization >= 50 ? "bg-peach-dark" : "bg-muted-foreground"
                          )}
                          style={{ width: `${boat.utilization}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Captain Performance */}
            <Card className="rounded-2xl border shadow-sm animate-fade-in-up stagger-4">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Captain Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockOperationsData.captains.map((captain, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky to-lavender flex items-center justify-center font-medium text-sky-dark">
                          {captain.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                          <p className="font-medium">{captain.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {captain.tours} tours
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{captain.guests}</p>
                        <p className="text-xs text-muted-foreground">guests served</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Peak Hours */}
            <Card className="rounded-2xl border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Peak Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-end gap-2">
                  {mockOperationsData.peakHours.map((hour, i) => {
                    const max = Math.max(...mockOperationsData.peakHours.map(h => h.bookings));
                    const height = (hour.bookings / max) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs font-medium">{hour.bookings}</span>
                        <div
                          className="w-full bg-gradient-to-t from-sky-dark to-lavender-dark rounded-t-lg"
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {hour.hour}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Peak Days */}
            <Card className="rounded-2xl border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Peak Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-end gap-2">
                  {mockOperationsData.peakDays.map((day, i) => {
                    const max = Math.max(...mockOperationsData.peakDays.map(d => d.bookings));
                    const height = (day.bookings / max) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs font-medium">{day.bookings}</span>
                        <div
                          className="w-full bg-mint-dark rounded-t-lg"
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {day.day.slice(0, 3)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
