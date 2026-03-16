"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  Navigation,
  Anchor,
  Ship,
  Play,
  Square,
  Clock,
  MapPin,
  Users,
  Gauge,
  Waves,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Home,
} from "lucide-react";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Suspense } from "react";

interface TripLog {
  id: string;
  status: "not_started" | "departed" | "in_progress" | "returning" | "docked" | "completed";
  departed_at: string | null;
  returned_at: string | null;
  docked_at: string | null;
  departure_location: { lat: number; lng: number; name?: string } | null;
  return_location: { lat: number; lng: number } | null;
  route_data: Array<{ lat: number; lng: number; timestamp: string; speed?: number }>;
  distance_nm: number | null;
  max_speed_knots: number | null;
  avg_speed_knots: number | null;
  passenger_count: number | null;
}

interface TourInfo {
  id: string;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  guest_count: number;
}

interface AssignedTour {
  availability_id: string;
  tour_name: string;
  date: string;
  start_time: string;
  end_time: string;
  booked_count: number;
  boat_name: string | null;
}

const STATUS_STEPS = [
  { value: "not_started", label: "Ready", icon: Anchor },
  { value: "departed", label: "Departed", icon: Ship },
  { value: "in_progress", label: "Cruising", icon: Navigation },
  { value: "returning", label: "Returning", icon: Home },
  { value: "docked", label: "Docked", icon: Anchor },
];

function TripContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const availabilityId = searchParams.get("availability");

  const [loading, setLoading] = useState(true);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [tourInfo, setTourInfo] = useState<TourInfo | null>(null);
  const [tripLog, setTripLog] = useState<TripLog | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
    speed?: number;
  } | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [assignedTours, setAssignedTours] = useState<AssignedTour[]>([]);

  useEffect(() => {
    if (availabilityId) {
      fetchData();
    } else {
      fetchTodaysTours();
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [availabilityId]);

  const fetchTodaysTours = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/captain-login");
        return;
      }

      // Get staff ID
      const { data: staffData } = await supabase
        .from("staff")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!staffData) {
        setLoading(false);
        return;
      }

      setStaffId(staffData.id);

      // Get today's date
      const today = format(new Date(), "yyyy-MM-dd");

      // Get assigned tours for today
      const { data: assignments } = await supabase
        .from("availability_staff")
        .select(`
          availability_id,
          availabilities (
            id,
            date,
            start_time,
            end_time,
            booked_count,
            tours (name),
            boats (name)
          )
        `)
        .eq("staff_id", staffData.id);

      if (assignments) {
        const todaysTours = assignments
          .filter((a: any) => a.availabilities?.date === today)
          .map((a: any) => ({
            availability_id: a.availability_id,
            tour_name: a.availabilities?.tours?.name || "Tour",
            date: a.availabilities?.date,
            start_time: a.availabilities?.start_time,
            end_time: a.availabilities?.end_time,
            booked_count: a.availabilities?.booked_count || 0,
            boat_name: a.availabilities?.boats?.name || null,
          }))
          .sort((a: AssignedTour, b: AssignedTour) => a.start_time.localeCompare(b.start_time));

        setAssignedTours(todaysTours);
      }
    } catch (error) {
      console.error("Error fetching tours:", error);
    } finally {
      setLoading(false);
    }
  };

  const startLocationTracking = useCallback(() => {
    if ("geolocation" in navigator) {
      const id = navigator.geolocation.watchPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            speed: position.coords.speed
              ? position.coords.speed * 1.94384
              : undefined, // Convert m/s to knots
          });
        },
        (error) => {
          console.error("Geolocation error:", error);
        },
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
      setWatchId(id);
    }
  }, []);

  const fetchData = async () => {
    try {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/captain-login");
        return;
      }

      const { data: staffData } = await supabase
        .from("staff")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (staffData) {
        setStaffId(staffData.id);
      }

      // Fetch tour info
      const { data: availability } = await supabase
        .from("availabilities")
        .select(`
          id,
          date,
          start_time,
          end_time,
          booked_count,
          tours (name)
        `)
        .eq("id", availabilityId)
        .single();

      if (availability) {
        setTourInfo({
          id: availability.id,
          name: (availability as any).tours?.name || "Tour",
          date: availability.date,
          start_time: availability.start_time,
          end_time: availability.end_time,
          guest_count: availability.booked_count || 0,
        });
      }

      // Fetch or create trip log
      let { data: existingLog } = await supabase
        .from("trip_logs")
        .select("*")
        .eq("availability_id", availabilityId)
        .eq("captain_id", staffData?.id)
        .single();

      if (!existingLog) {
        // Create new trip log
        const { data: newLog, error } = await supabase
          .from("trip_logs")
          .insert({
            availability_id: availabilityId,
            captain_id: staffData?.id,
            status: "not_started",
            passenger_count: availability?.booked_count || 0,
          })
          .select()
          .single();

        if (!error && newLog) {
          existingLog = newLog;
        }
      }

      if (existingLog) {
        setTripLog(existingLog);

        // Start tracking if trip is active
        if (["departed", "in_progress", "returning"].includes(existingLog.status)) {
          startLocationTracking();
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!tripLog || !staffId) return;

    setUpdating(true);
    try {
      const supabase = createClient();

      const updates: Record<string, any> = {
        status: newStatus,
      };

      if (newStatus === "departed") {
        updates.departed_at = new Date().toISOString();
        if (currentLocation) {
          updates.departure_location = {
            lat: currentLocation.lat,
            lng: currentLocation.lng,
          };
        }
        startLocationTracking();
      } else if (newStatus === "returning") {
        // Add current location to route
      } else if (newStatus === "docked") {
        updates.docked_at = new Date().toISOString();
        if (currentLocation) {
          updates.return_location = {
            lat: currentLocation.lat,
            lng: currentLocation.lng,
          };
        }
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          setWatchId(null);
        }
      } else if (newStatus === "completed") {
        updates.returned_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("trip_logs")
        .update(updates)
        .eq("id", tripLog.id);

      if (error) throw error;

      setTripLog({ ...tripLog, ...updates });
      setShowConfirmDialog(false);
      toast.success(`Status updated: ${newStatus}`);
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const getNextStatus = () => {
    if (!tripLog) return null;
    const currentIndex = STATUS_STEPS.findIndex((s) => s.value === tripLog.status);
    if (currentIndex < STATUS_STEPS.length - 1) {
      return STATUS_STEPS[currentIndex + 1];
    }
    return null;
  };

  const getTripDuration = () => {
    if (!tripLog?.departed_at) return null;
    const startTime = parseISO(tripLog.departed_at);
    const endTime = tripLog.docked_at ? parseISO(tripLog.docked_at) : new Date();
    const minutes = differenceInMinutes(endTime, startTime);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!availabilityId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50/50 to-background dark:from-blue-950/10">
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/captain")}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Navigation className="h-5 w-5 text-blue-600" />
                Trip Tracker
              </h1>
              <p className="text-sm text-muted-foreground">
                {format(new Date(), "EEEE, MMMM d")}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 max-w-2xl mx-auto">
          {assignedTours.length === 0 ? (
            <Card className="p-8 text-center">
              <Navigation className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">No Tours Today</h2>
              <p className="text-muted-foreground mb-4">
                You don&apos;t have any tours assigned for today.
              </p>
              <Button onClick={() => router.push("/captain")}>
                Go to Dashboard
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Select a Tour to Track</h2>
              {assignedTours.map((tour) => (
                <Card
                  key={tour.availability_id}
                  className="cursor-pointer hover:border-blue-400 transition-colors"
                  onClick={() => router.push(`/captain/trip?availability=${tour.availability_id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Ship className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{tour.tour_name}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {tour.start_time?.slice(0, 5)} - {tour.end_time?.slice(0, 5)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {tour.booked_count} guests
                          </span>
                        </div>
                        {tour.boat_name && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {tour.boat_name}
                          </p>
                        )}
                      </div>
                      <ChevronLeft className="h-5 w-5 text-muted-foreground rotate-180" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const nextStatus = getNextStatus();
  const tripDuration = getTripDuration();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 to-background dark:from-blue-950/10">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/captain")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Navigation className="h-5 w-5 text-blue-600" />
              Trip Tracker
            </h1>
            <p className="text-sm text-muted-foreground">{tourInfo?.name}</p>
          </div>
          {currentLocation && (
            <Badge variant="outline" className="gap-1 text-green-600">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              GPS Active
            </Badge>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Tour Info Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Ship className="h-7 w-7 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-lg">{tourInfo?.name}</h2>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {tourInfo?.start_time?.slice(0, 5)} - {tourInfo?.end_time?.slice(0, 5)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {tourInfo?.guest_count} guests
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Trip Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="flex justify-between">
                {STATUS_STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const currentIndex = STATUS_STEPS.findIndex(
                    (s) => s.value === tripLog?.status
                  );
                  const isCompleted = index <= currentIndex;
                  const isCurrent = index === currentIndex;

                  return (
                    <div
                      key={step.value}
                      className="flex flex-col items-center relative z-10"
                    >
                      <div
                        className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center transition-all",
                          isCompleted
                            ? "bg-blue-600 text-white"
                            : "bg-slate-200 dark:bg-slate-700 text-muted-foreground",
                          isCurrent && "ring-4 ring-blue-200 dark:ring-blue-900"
                        )}
                      >
                        {isCompleted && index < currentIndex ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-xs mt-2 font-medium",
                          isCurrent ? "text-blue-600" : "text-muted-foreground"
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Progress Line */}
              <div className="absolute top-5 left-5 right-5 h-0.5 bg-slate-200 dark:bg-slate-700 -z-0">
                <div
                  className="h-full bg-blue-600 transition-all duration-500"
                  style={{
                    width: `${(STATUS_STEPS.findIndex((s) => s.value === tripLog?.status) / (STATUS_STEPS.length - 1)) * 100}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Stats */}
        {tripLog?.status !== "not_started" && tripLog?.status !== "completed" && (
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 text-center">
              <Clock className="h-6 w-6 mx-auto text-blue-600 mb-2" />
              <p className="text-2xl font-bold">{tripDuration || "--"}</p>
              <p className="text-xs text-muted-foreground">Duration</p>
            </Card>
            <Card className="p-4 text-center">
              <Gauge className="h-6 w-6 mx-auto text-blue-600 mb-2" />
              <p className="text-2xl font-bold">
                {currentLocation?.speed?.toFixed(1) || "--"}
              </p>
              <p className="text-xs text-muted-foreground">Speed (kts)</p>
            </Card>
            <Card className="p-4 text-center">
              <Waves className="h-6 w-6 mx-auto text-blue-600 mb-2" />
              <p className="text-2xl font-bold">
                {tripLog?.distance_nm?.toFixed(1) || "--"}
              </p>
              <p className="text-xs text-muted-foreground">Distance (nm)</p>
            </Card>
          </div>
        )}

        {/* Current Location */}
        {currentLocation && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Current Position</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Next Action Button */}
        {nextStatus && tripLog?.status !== "completed" && (
          <Button
            size="lg"
            className={cn(
              "w-full h-16 text-lg gap-3",
              tripLog?.status === "not_started"
                ? "bg-green-600 hover:bg-green-700"
                : tripLog?.status === "returning"
                ? "bg-indigo-600 hover:bg-indigo-700"
                : "bg-blue-600 hover:bg-blue-700"
            )}
            onClick={() => {
              setConfirmAction(nextStatus.value);
              setShowConfirmDialog(true);
            }}
          >
            {tripLog?.status === "not_started" ? (
              <>
                <Play className="h-6 w-6" />
                Start Trip - Depart
              </>
            ) : tripLog?.status === "docked" ? (
              <>
                <CheckCircle2 className="h-6 w-6" />
                Complete Trip
              </>
            ) : (
              <>
                <nextStatus.icon className="h-6 w-6" />
                {nextStatus.label}
              </>
            )}
          </Button>
        )}

        {/* Trip Completed */}
        {tripLog?.status === "completed" && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/30">
            <CardContent className="p-6 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-green-700 dark:text-green-300">
                Trip Completed
              </h2>
              <p className="text-muted-foreground mt-2">
                Duration: {tripDuration}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push("/captain")}
              >
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Timestamps */}
        {tripLog && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Trip Log
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {tripLog.departed_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Departed:</span>
                  <span className="font-medium">
                    {format(parseISO(tripLog.departed_at), "h:mm a")}
                  </span>
                </div>
              )}
              {tripLog.docked_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Docked:</span>
                  <span className="font-medium">
                    {format(parseISO(tripLog.docked_at), "h:mm a")}
                  </span>
                </div>
              )}
              {tripLog.returned_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed:</span>
                  <span className="font-medium">
                    {format(parseISO(tripLog.returned_at), "h:mm a")}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Status Update</DialogTitle>
            <DialogDescription>
              {confirmAction === "departed" && "This will mark the trip as departed and start tracking."}
              {confirmAction === "in_progress" && "This confirms you are now cruising."}
              {confirmAction === "returning" && "This indicates you are heading back."}
              {confirmAction === "docked" && "This will record that you have docked."}
              {confirmAction === "completed" && "This will complete and finalize the trip log."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowConfirmDialog(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={() => confirmAction && handleStatusUpdate(confirmAction)}
              disabled={updating}
            >
              {updating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Confirm"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TripPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    }>
      <TripContent />
    </Suspense>
  );
}
