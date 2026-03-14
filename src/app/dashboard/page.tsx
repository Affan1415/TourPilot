"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { CapacityBar } from "@/components/ui/capacity-bar";
import { DateBadge } from "@/components/ui/date-badge";
import { IconBox } from "@/components/ui/icon-box";
import {
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  Ship,
  FileText,
  ChevronRight,
  Plus,
  Star,
  MapPin,
  UserPlus,
  BarChart3,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayBookings: 0,
    todayRevenue: 0,
    todayGuests: 0,
    pendingWaivers: 0,
    avgRating: 4.8,
  });
  const [todayTours, setTodayTours] = useState<any[]>([]);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient();
        const today = new Date().toISOString().split('T')[0];

        const { data: bookings } = await supabase
          .from('bookings')
          .select('*, customers(first_name, last_name), availabilities(tours(name), start_time, date)')
          .gte('created_at', today)
          .order('created_at', { ascending: false })
          .limit(5);

        if (bookings) {
          setRecentBookings(bookings.map(b => ({
            id: b.booking_reference,
            customer: `${b.customers?.first_name || ''} ${b.customers?.last_name || ''}`.trim() || 'Unknown',
            tour: b.availabilities?.tours?.name || 'Unknown Tour',
            time: b.availabilities?.start_time?.substring(0, 5) || '',
            date: b.availabilities?.date,
            guests: b.guest_count,
            total: b.total_price,
            status: b.status,
          })));

          setStats({
            todayBookings: bookings.length,
            todayRevenue: bookings.reduce((sum, b) => sum + (b.total_price || 0), 0),
            todayGuests: bookings.reduce((sum, b) => sum + (b.guest_count || 0), 0),
            pendingWaivers: 0,
            avgRating: 4.8,
          });
        }

        const { data: availabilities } = await supabase
          .from('availabilities')
          .select('*, tours(name, location, max_capacity)')
          .eq('date', today)
          .order('start_time', { ascending: true });

        if (availabilities) {
          setTodayTours(availabilities.map(a => ({
            id: a.id,
            name: a.tours?.name || 'Unknown Tour',
            time: a.start_time?.substring(0, 5) || '',
            date: new Date(a.date),
            guests: a.booked_count || 0,
            capacity: a.capacity_override || a.tours?.max_capacity || 10,
            location: a.tours?.location || 'Unknown',
          })));
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-80 bg-muted rounded-2xl" />
            <div className="h-80 bg-muted rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Overview</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s what&apos;s happening today.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/manifest">
            <Button variant="outline" className="gap-2 rounded-xl">
              <FileText className="h-4 w-4" />
              Today&apos;s Manifest
            </Button>
          </Link>
          <Link href="/dashboard/bookings/new">
            <Button className="gap-2 gradient-primary border-0 rounded-xl shadow-lg shadow-primary/30">
              <Plus className="h-4 w-4" />
              New Booking
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid - V6 Pastel Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Bookings"
          value={stats.todayBookings}
          icon={<Calendar className="h-5 w-5" />}
          color="mint"
          trend={{ value: 12, isPositive: true }}
          className="animate-fade-in-up stagger-1"
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${stats.todayRevenue.toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5" />}
          color="lavender"
          trend={{ value: 8, isPositive: true }}
          className="animate-fade-in-up stagger-2"
        />
        <StatCard
          title="Active Customers"
          value={stats.todayGuests}
          icon={<Users className="h-5 w-5" />}
          color="peach"
          trend={{ value: 23, isPositive: true }}
          className="animate-fade-in-up stagger-3"
        />
        <StatCard
          title="Average Rating"
          value={stats.avgRating}
          icon={<Star className="h-5 w-5" />}
          color="sky"
          trend={{ value: 2, isPositive: false }}
          className="animate-fade-in-up stagger-4"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Bookings Table */}
        <Card className="lg:col-span-2 rounded-2xl border shadow-sm animate-fade-in-up stagger-5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Recent Bookings</CardTitle>
            <Link href="/dashboard/bookings">
              <Button variant="ghost" size="sm" className="gap-1 text-primary hover:text-primary">
                View All
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentBookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No bookings yet</p>
                <Link href="/dashboard/bookings/new">
                  <Button variant="link" size="sm" className="mt-2">
                    Create First Booking
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-v6 w-full">
                  <thead>
                    <tr>
                      <th>Tour</th>
                      <th>Customer</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map((booking) => (
                      <tr key={booking.id} className="cursor-pointer">
                        <td>
                          <div className="flex items-center gap-3">
                            <IconBox
                              icon={<Ship className="h-4 w-4" />}
                              color="mint"
                              size="sm"
                            />
                            <div>
                              <div className="font-medium text-sm">{booking.tour}</div>
                              <div className="text-xs text-muted-foreground">{booking.time}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-sm">{booking.customer}</td>
                        <td className="text-sm text-muted-foreground">
                          {booking.date ? format(new Date(booking.date), "MMM d, yyyy") : "N/A"}
                        </td>
                        <td className="font-semibold text-sm">${booking.total}</td>
                        <td>
                          <Badge
                            variant={
                              booking.status === "confirmed"
                                ? "success"
                                : booking.status === "pending"
                                ? "warning"
                                : booking.status === "cancelled"
                                ? "error"
                                : "secondary"
                            }
                          >
                            {booking.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Tours */}
          <Card className="rounded-2xl border shadow-sm animate-fade-in-up stagger-5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Upcoming Tours</CardTitle>
              <Link href="/dashboard/calendar">
                <span className="text-sm text-primary font-medium cursor-pointer hover:underline">
                  Schedule
                </span>
              </Link>
            </CardHeader>
            <CardContent className="space-y-1 p-2">
              {todayTours.length === 0 ? (
                <div className="text-center py-8">
                  <Ship className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No tours scheduled</p>
                </div>
              ) : (
                todayTours.slice(0, 3).map((tour) => (
                  <div
                    key={tour.id}
                    className="flex gap-3.5 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <DateBadge date={tour.date || new Date()} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm mb-1">{tour.name}</div>
                      <div className="flex gap-3 text-xs text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {tour.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {tour.location}
                        </span>
                      </div>
                      <CapacityBar current={tour.guests} max={tour.capacity} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="rounded-2xl border shadow-sm animate-fade-in-up stagger-5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <Link href="/dashboard/bookings/new">
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-muted/30 hover:bg-card hover:border-primary hover:shadow-md transition-all cursor-pointer group">
                    <IconBox
                      icon={<Plus className="h-5 w-5" />}
                      color="sky"
                      className="group-hover:scale-110 transition-transform"
                    />
                    <span className="text-xs font-medium text-muted-foreground">New Booking</span>
                  </div>
                </Link>
                <Link href="/dashboard/customers/new">
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-muted/30 hover:bg-card hover:border-primary hover:shadow-md transition-all cursor-pointer group">
                    <IconBox
                      icon={<UserPlus className="h-5 w-5" />}
                      color="mint"
                      className="group-hover:scale-110 transition-transform"
                    />
                    <span className="text-xs font-medium text-muted-foreground">Add Customer</span>
                  </div>
                </Link>
                <Link href="/dashboard/calendar">
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-muted/30 hover:bg-card hover:border-primary hover:shadow-md transition-all cursor-pointer group">
                    <IconBox
                      icon={<Calendar className="h-5 w-5" />}
                      color="lavender"
                      className="group-hover:scale-110 transition-transform"
                    />
                    <span className="text-xs font-medium text-muted-foreground">Schedule Tour</span>
                  </div>
                </Link>
                <Link href="/dashboard/analytics">
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-muted/30 hover:bg-card hover:border-primary hover:shadow-md transition-all cursor-pointer group">
                    <IconBox
                      icon={<BarChart3 className="h-5 w-5" />}
                      color="peach"
                      className="group-hover:scale-110 transition-transform"
                    />
                    <span className="text-xs font-medium text-muted-foreground">View Reports</span>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Promo Card */}
      <Card className="rounded-2xl bg-sidebar text-white overflow-hidden relative animate-fade-in-up">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/4" />
        <CardContent className="p-6 relative">
          <Badge className="bg-mint-dark/20 text-mint-dark border-0 mb-3">New Feature</Badge>
          <h3 className="text-xl font-bold mb-2">Earn more with TourPilot Pro!</h3>
          <p className="text-sm text-sidebar-foreground mb-4 max-w-md">
            Unlock advanced analytics, automated reminders, and priority support to grow your business.
          </p>
          <Button className="gradient-primary border-0 rounded-xl shadow-lg gap-2">
            Learn More
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
