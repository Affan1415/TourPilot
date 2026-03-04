"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayBookings: 0,
    todayRevenue: 0,
    todayGuests: 0,
    pendingWaivers: 0,
  });
  const [todayTours, setTodayTours] = useState<any[]>([]);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient();

        // Fetch today's bookings
        const today = new Date().toISOString().split('T')[0];

        const { data: bookings } = await supabase
          .from('bookings')
          .select('*, customers(first_name, last_name), availabilities(tours(name))')
          .gte('created_at', today)
          .order('created_at', { ascending: false })
          .limit(5);

        if (bookings) {
          setRecentBookings(bookings.map(b => ({
            id: b.booking_reference,
            customer: `${b.customers?.first_name || ''} ${b.customers?.last_name || ''}`.trim() || 'Unknown',
            tour: b.availabilities?.tours?.name || 'Unknown Tour',
            guests: b.guest_count,
            total: b.total_price,
            status: b.status,
          })));

          setStats({
            todayBookings: bookings.length,
            todayRevenue: bookings.reduce((sum, b) => sum + (b.total_price || 0), 0),
            todayGuests: bookings.reduce((sum, b) => sum + (b.guest_count || 0), 0),
            pendingWaivers: 0, // Would need to calculate from booking_guests
          });
        }

        // Fetch today's tours/availabilities
        const { data: availabilities } = await supabase
          .from('availabilities')
          .select('*, tours(name, max_capacity)')
          .eq('date', today)
          .order('start_time', { ascending: true });

        if (availabilities) {
          setTodayTours(availabilities.map(a => ({
            id: a.id,
            name: a.tours?.name || 'Unknown Tour',
            time: a.start_time?.substring(0, 5) || '',
            guests: a.booked_count || 0,
            capacity: a.capacity_override || a.tours?.max_capacity || 10,
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/manifest">
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              Today&apos;s Manifest
            </Button>
          </Link>
          <Link href="/dashboard/bookings/new">
            <Button className="gap-2 gradient-primary border-0">
              <Plus className="h-4 w-4" />
              New Booking
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Today's Bookings</p>
                <p className="text-3xl font-bold">{stats.todayBookings}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Today's Revenue</p>
                <p className="text-3xl font-bold">${stats.todayRevenue.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Guests Today</p>
                <p className="text-3xl font-bold">{stats.todayGuests}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Pending Waivers</p>
                <p className="text-3xl font-bold">{stats.pendingWaivers}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Tours */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Today&apos;s Tours
            </CardTitle>
            <Link href="/dashboard/manifest">
              <Button variant="ghost" size="sm" className="gap-1">
                View All
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {todayTours.length === 0 ? (
              <div className="text-center py-8">
                <Ship className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No tours scheduled for today</p>
                <Link href="/dashboard/tours">
                  <Button variant="link" size="sm" className="mt-2">
                    Manage Tours
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {todayTours.map((tour) => (
                  <div
                    key={tour.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Ship className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{tour.name}</p>
                        <p className="text-sm text-muted-foreground">{tour.time}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {tour.guests}/{tour.capacity}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Bookings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Recent Bookings
            </CardTitle>
            <Link href="/dashboard/bookings">
              <Button variant="ghost" size="sm" className="gap-1">
                View All
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentBookings.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No bookings yet</p>
                <Link href="/dashboard/bookings/new">
                  <Button variant="link" size="sm" className="mt-2">
                    Create First Booking
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentBookings.map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/dashboard/bookings/${booking.id}`}
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{booking.customer}</p>
                        <Badge variant="outline" className="font-mono text-xs">
                          {booking.id}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {booking.tour} • {booking.guests} guests
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">${booking.total}</p>
                      <Badge
                        variant="secondary"
                        className={
                          booking.status === "confirmed"
                            ? "bg-green-100 text-green-800"
                            : booking.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : ""
                        }
                      >
                        {booking.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/dashboard/bookings/new">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Plus className="h-5 w-5" />
                <span>New Booking</span>
              </Button>
            </Link>
            <Link href="/dashboard/manifest">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <FileText className="h-5 w-5" />
                <span>View Manifest</span>
              </Button>
            </Link>
            <Link href="/dashboard/customers">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Users className="h-5 w-5" />
                <span>Customers</span>
              </Button>
            </Link>
            <Link href="/dashboard/reports">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <TrendingUp className="h-5 w-5" />
                <span>Reports</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
