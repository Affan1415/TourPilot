"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Ship,
  ChevronRight,
  TrendingUp,
  Award,
  CalendarDays,
  DollarSign,
  Star,
  Compass,
  FileText,
  AlertCircle,
} from "lucide-react";
import { format, parseISO, isFuture, differenceInDays, startOfMonth, endOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface CustomerStats {
  totalBookings: number;
  totalSpent: number;
  totalGuests: number;
  upcomingBookings: number;
  completedTours: number;
  pendingWaivers: number;
}

interface NextTour {
  id: string;
  bookingReference: string;
  tourName: string;
  tourSlug: string;
  date: string;
  startTime: string;
  location: string;
  meetingPoint: string;
  guestCount: number;
  daysUntil: number;
}

interface RecentActivity {
  id: string;
  type: 'booking' | 'waiver' | 'completed';
  title: string;
  description: string;
  date: string;
  link?: string;
}

interface CustomerProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  memberSince: string;
}

export default function CustomerDashboard() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [stats, setStats] = useState<CustomerStats>({
    totalBookings: 0,
    totalSpent: 0,
    totalGuests: 0,
    upcomingBookings: 0,
    completedTours: 0,
    pendingWaivers: 0,
  });
  const [nextTour, setNextTour] = useState<NextTour | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get customer profile
      const { data: customerData } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!customerData) {
        setLoading(false);
        return;
      }

      setProfile({
        id: customerData.id,
        firstName: customerData.first_name,
        lastName: customerData.last_name,
        email: customerData.email,
        avatarUrl: customerData.avatar_url,
        memberSince: customerData.created_at,
      });

      // Get all bookings with details
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_reference,
          guest_count,
          total_price,
          status,
          created_at,
          availabilities!inner (
            date,
            start_time,
            tours!inner (
              name,
              slug,
              location,
              meeting_point
            )
          ),
          booking_guests (
            id,
            waivers (
              status
            )
          )
        `)
        .eq('customer_id', customerData.id)
        .order('created_at', { ascending: false });

      if (bookingsData) {
        const now = new Date();
        let totalGuests = 0;
        let upcomingCount = 0;
        let completedCount = 0;
        let pendingWaivers = 0;
        let upcomingTours: NextTour[] = [];
        const activities: RecentActivity[] = [];

        bookingsData.forEach((b: any) => {
          const tourDate = parseISO(b.availabilities.date);
          const isUpcoming = isFuture(tourDate) && b.status !== 'cancelled';
          const isCompleted = b.status === 'completed';

          totalGuests += b.guest_count;

          if (isUpcoming) {
            upcomingCount++;
            const daysUntil = differenceInDays(tourDate, now);
            upcomingTours.push({
              id: b.id,
              bookingReference: b.booking_reference,
              tourName: b.availabilities.tours.name,
              tourSlug: b.availabilities.tours.slug,
              date: b.availabilities.date,
              startTime: b.availabilities.start_time,
              location: b.availabilities.tours.location,
              meetingPoint: b.availabilities.tours.meeting_point,
              guestCount: b.guest_count,
              daysUntil,
            });

            // Count pending waivers
            const guestWaivers = b.booking_guests?.flatMap((g: any) => g.waivers || []) || [];
            const unsigned = guestWaivers.filter((w: any) => w.status !== 'signed').length;
            pendingWaivers += unsigned;
          }

          if (isCompleted) {
            completedCount++;
          }

          // Add to recent activity
          if (activities.length < 5) {
            activities.push({
              id: b.id,
              type: isCompleted ? 'completed' : 'booking',
              title: isCompleted ? `Completed: ${b.availabilities.tours.name}` : `Booked: ${b.availabilities.tours.name}`,
              description: `${b.guest_count} guest${b.guest_count !== 1 ? 's' : ''} - $${b.total_price}`,
              date: b.created_at,
              link: `/booking/${b.booking_reference}`,
            });
          }
        });

        // Sort upcoming tours by date and get the next one
        upcomingTours.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setNextTour(upcomingTours[0] || null);

        setStats({
          totalBookings: customerData.total_bookings || bookingsData.length,
          totalSpent: customerData.total_spent || bookingsData.reduce((sum: number, b: any) => sum + b.total_price, 0),
          totalGuests,
          upcomingBookings: upcomingCount,
          completedTours: completedCount,
          pendingWaivers,
        });

        setRecentActivity(activities);
      }

      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  const userInitials = profile
    ? `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase()
    : "??";

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-muted rounded-lg" />
            <div className="h-64 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Welcome Header */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                <AvatarImage src={profile?.avatarUrl || undefined} />
                <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">
                  Welcome back, {profile?.firstName}!
                </h1>
                <p className="text-muted-foreground">
                  {stats.upcomingBookings > 0
                    ? `You have ${stats.upcomingBookings} upcoming tour${stats.upcomingBookings !== 1 ? 's' : ''}`
                    : "Ready for your next adventure?"}
                </p>
              </div>
            </div>
            <Link href="/tours">
              <Button className="gradient-primary border-0 gap-2">
                <Compass className="h-4 w-4" />
                Explore Tours
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold">{stats.upcomingBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{stats.completedTours}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Guests</p>
                <p className="text-2xl font-bold">{stats.totalGuests}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold">${stats.totalSpent.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Waivers Alert */}
      {stats.pendingWaivers > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-200 text-orange-600">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-orange-800">
                    {stats.pendingWaivers} Waiver{stats.pendingWaivers !== 1 ? 's' : ''} Pending
                  </p>
                  <p className="text-sm text-orange-600">
                    Sign before your tour to ensure a smooth check-in
                  </p>
                </div>
              </div>
              <Link href="/account">
                <Button variant="outline" size="sm" className="border-orange-300 text-orange-700 hover:bg-orange-100">
                  View Bookings
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Tour */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ship className="h-5 w-5 text-primary" />
              Your Next Adventure
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextTour ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{nextTour.tourName}</h3>
                    <p className="text-sm text-muted-foreground font-mono">
                      {nextTour.bookingReference}
                    </p>
                  </div>
                  <Badge variant={nextTour.daysUntil <= 3 ? "default" : "secondary"}>
                    {nextTour.daysUntil === 0
                      ? "Today!"
                      : nextTour.daysUntil === 1
                      ? "Tomorrow"
                      : `${nextTour.daysUntil} days`}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {format(parseISO(nextTour.date), "EEE, MMM d")}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {nextTour.startTime.slice(0, 5)}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {nextTour.location}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {nextTour.guestCount} guest{nextTour.guestCount !== 1 ? 's' : ''}
                  </div>
                </div>

                {nextTour.meetingPoint && (
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    <span className="font-medium">Meeting Point:</span> {nextTour.meetingPoint}
                  </div>
                )}

                <Link href={`/booking/${nextTour.bookingReference}`}>
                  <Button className="w-full" variant="outline">
                    View Booking Details
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-8">
                <Ship className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">
                  No upcoming tours booked
                </p>
                <Link href="/tours">
                  <Button className="gradient-primary border-0">
                    Browse Tours
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0"
                  >
                    <div className={cn(
                      "p-2 rounded-lg",
                      activity.type === 'completed'
                        ? "bg-green-100 text-green-600"
                        : activity.type === 'waiver'
                        ? "bg-blue-100 text-blue-600"
                        : "bg-primary/10 text-primary"
                    )}>
                      {activity.type === 'completed' ? (
                        <Award className="h-4 w-4" />
                      ) : activity.type === 'waiver' ? (
                        <FileText className="h-4 w-4" />
                      ) : (
                        <CalendarDays className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(parseISO(activity.date), "MMM d, yyyy")}
                      </p>
                    </div>
                    {activity.link && (
                      <Link href={activity.link}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No recent activity
                </p>
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
            <Link href="/account">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <CalendarDays className="h-5 w-5" />
                <span className="text-sm">My Bookings</span>
              </Button>
            </Link>
            <Link href="/account/settings">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <Users className="h-5 w-5" />
                <span className="text-sm">Edit Profile</span>
              </Button>
            </Link>
            <Link href="/tours">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <Compass className="h-5 w-5" />
                <span className="text-sm">Browse Tours</span>
              </Button>
            </Link>
            <Link href="/booking/lookup">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <FileText className="h-5 w-5" />
                <span className="text-sm">Look Up Booking</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Membership Info */}
      {profile && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="h-4 w-4" />
                <span>Member since {format(parseISO(profile.memberSince), "MMMM yyyy")}</span>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Award className="h-3 w-3" />
                {stats.completedTours >= 10 ? "Gold" : stats.completedTours >= 5 ? "Silver" : "Bronze"} Member
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
