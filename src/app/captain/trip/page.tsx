"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  ChevronRight,
  Navigation,
  Anchor,
  Ship,
  Play,
  Clock,
  MapPin,
  Users,
  Gauge,
  Waves,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Home,
  Shield,
  FileText,
  UserCheck,
  UserX,
  Send,
  Check,
  Phone,
  Mail,
  Info,
  Timer,
  Flag,
  Clipboard,
} from "lucide-react";
import { format, parseISO, differenceInMinutes, differenceInSeconds } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { SwipeableGuestCard } from "@/components/captain/swipeable-guest-card";
import { SignaturePad } from "@/components/captain/signature-pad";
import type { ChecklistItem } from "@/types";

// Types
interface TripLog {
  id: string;
  status: "not_started" | "boarding" | "pre_checklist" | "departed" | "in_progress" | "returning" | "docked" | "post_checklist" | "completed";
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

interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  waiverSigned: boolean;
  checkedIn: boolean;
}

interface Booking {
  id: string;
  bookingId: string;
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  };
  guests: Guest[];
  notes: string | null;
}

interface TourInfo {
  id: string;
  availabilityId: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  meetingPoint: string;
  guestCount: number;
  capacity: number;
  bookings: Booking[];
}

interface AssignedTour {
  availability_id: string;
  tour_name: string;
  date: string;
  start_time: string;
  end_time: string;
  booked_count: number;
  boat_name: string | null;
  checked_in_count: number;
  waiver_status: "none" | "partial" | "complete";
}

interface ChecklistState {
  [itemId: string]: {
    checked: boolean;
    photoUrl?: string;
    note?: string;
  };
}

// Trip workflow steps
const TRIP_STEPS = [
  { id: "pre_checklist", label: "Pre-Check", icon: Shield, description: "Complete safety checklist" },
  { id: "boarding", label: "Check-in", icon: Users, description: "Check in guests & sign waivers" },
  { id: "sailing", label: "Sailing", icon: Navigation, description: "Trip in progress" },
  { id: "post_checklist", label: "Post-Check", icon: Clipboard, description: "Post-arrival checklist" },
  { id: "completed", label: "Done", icon: Flag, description: "Trip completed" },
];

function TripWorkflowContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const availabilityId = searchParams.get("availability");

  // Core state
  const [loading, setLoading] = useState(true);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [tourInfo, setTourInfo] = useState<TourInfo | null>(null);
  const [tripLog, setTripLog] = useState<TripLog | null>(null);
  const [assignedTours, setAssignedTours] = useState<AssignedTour[]>([]);

  // Current step tracking
  const [currentStep, setCurrentStep] = useState<string>("pre_checklist");

  // Location tracking
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
    speed?: number;
  } | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  // Trip timer
  const [tripDuration, setTripDuration] = useState<number>(0);

  // Checklist state
  const [checklistTemplate, setChecklistTemplate] = useState<{
    id: string;
    name: string;
    items: ChecklistItem[];
    type: "pre" | "post";
  } | null>(null);
  const [checklistState, setChecklistState] = useState<ChecklistState>({});
  const [checklistNotes, setChecklistNotes] = useState("");

  // Guest management
  const [selectedGuest, setSelectedGuest] = useState<{
    guest: Guest;
    booking: Booking;
  } | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [savingSignature, setSavingSignature] = useState(false);
  const [sendingWaiver, setSendingWaiver] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // Fetch today's tours (when no availability selected)
  const fetchTodaysTours = async () => {
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

      if (!staffData) {
        setLoading(false);
        return;
      }

      setStaffId(staffData.id);
      const today = format(new Date(), "yyyy-MM-dd");

      const { data: assignments } = await supabase
        .from("availability_staff")
        .select(`
          availability_id,
          availabilities!inner (
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
        const todaysTours = await Promise.all(
          assignments
            .filter((a: any) => a.availabilities?.date === today)
            .map(async (a: any) => {
              // Get check-in and waiver stats
              const { data: bookings } = await supabase
                .from("bookings")
                .select(`
                  booking_guests (
                    checked_in,
                    waivers (status)
                  )
                `)
                .eq("availability_id", a.availability_id)
                .in("status", ["confirmed", "pending"]);

              let checkedInCount = 0;
              let signedWaivers = 0;
              let totalGuests = 0;

              bookings?.forEach((b: any) => {
                b.booking_guests?.forEach((g: any) => {
                  totalGuests++;
                  if (g.checked_in) checkedInCount++;
                  if (g.waivers?.some((w: any) => w.status === "signed")) signedWaivers++;
                });
              });

              const waiverStatus = totalGuests === 0 ? "none" :
                signedWaivers === totalGuests ? "complete" :
                signedWaivers > 0 ? "partial" : "none";

              return {
                availability_id: a.availability_id,
                tour_name: a.availabilities?.tours?.name || "Tour",
                date: a.availabilities?.date,
                start_time: a.availabilities?.start_time,
                end_time: a.availabilities?.end_time,
                booked_count: a.availabilities?.booked_count || 0,
                boat_name: a.availabilities?.boats?.name || null,
                checked_in_count: checkedInCount,
                waiver_status: waiverStatus as "none" | "partial" | "complete",
              };
            })
        );

        setAssignedTours(
          todaysTours.sort((a, b) => a.start_time.localeCompare(b.start_time))
        );
      }
    } catch (error) {
      console.error("Error fetching tours:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch full trip data
  const fetchTripData = async () => {
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

      if (!staffData) {
        toast.error("Staff record not found");
        return;
      }

      setStaffId(staffData.id);

      // Fetch availability and tour info
      const { data: availability } = await supabase
        .from("availabilities")
        .select(`
          id,
          date,
          start_time,
          end_time,
          booked_count,
          capacity_override,
          tours!inner (
            id,
            name,
            location,
            meeting_point,
            max_capacity
          )
        `)
        .eq("id", availabilityId)
        .single();

      if (!availability) {
        toast.error("Tour not found");
        return;
      }

      // Fetch bookings with guests
      const { data: bookings } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_reference,
          notes,
          customers!inner (
            first_name,
            last_name,
            email,
            phone
          ),
          booking_guests (
            id,
            first_name,
            last_name,
            email,
            checked_in,
            waivers (status)
          )
        `)
        .eq("availability_id", availabilityId)
        .in("status", ["confirmed", "pending"]);

      const tour = (availability as any).tours;
      const guestCount = bookings?.reduce((acc, b: any) => acc + (b.booking_guests?.length || 0), 0) || 0;

      setTourInfo({
        id: tour.id,
        availabilityId: availability.id,
        name: tour.name,
        date: availability.date,
        startTime: availability.start_time?.substring(0, 5) || "",
        endTime: availability.end_time?.substring(0, 5) || "",
        location: tour.location || "",
        meetingPoint: tour.meeting_point || "See tour details",
        guestCount,
        capacity: availability.capacity_override || tour.max_capacity || 10,
        bookings: (bookings || []).map((b: any) => ({
          id: b.booking_reference || b.id,
          bookingId: b.id,
          customer: {
            firstName: b.customers?.first_name || "",
            lastName: b.customers?.last_name || "",
            phone: b.customers?.phone || "",
            email: b.customers?.email || "",
          },
          guests: (b.booking_guests || []).map((g: any) => ({
            id: g.id,
            firstName: g.first_name || "",
            lastName: g.last_name || "",
            email: g.email || null,
            waiverSigned: g.waivers?.some((w: any) => w.status === "signed") || false,
            checkedIn: g.checked_in || false,
          })),
          notes: b.notes || null,
        })),
      });

      // Fetch or create trip log
      let { data: existingLog } = await supabase
        .from("trip_logs")
        .select("*")
        .eq("availability_id", availabilityId)
        .eq("captain_id", staffData.id)
        .single();

      if (!existingLog) {
        const { data: newLog, error } = await supabase
          .from("trip_logs")
          .insert({
            availability_id: availabilityId,
            captain_id: staffData.id,
            status: "not_started",
            passenger_count: guestCount,
          })
          .select()
          .single();

        if (!error && newLog) {
          existingLog = newLog;
        }
      }

      if (existingLog) {
        setTripLog(existingLog);

        // Map status to step
        const statusToStep: Record<string, string> = {
          "not_started": "pre_checklist",
          "pre_checklist": "pre_checklist",
          "boarding": "boarding",
          "departed": "sailing",
          "in_progress": "sailing",
          "returning": "sailing",
          "docked": "post_checklist",
          "post_checklist": "post_checklist",
          "completed": "completed",
        };
        setCurrentStep(statusToStep[existingLog.status] || "pre_checklist");

        // Start tracking if trip is active
        if (["departed", "in_progress", "returning"].includes(existingLog.status)) {
          startLocationTracking();
        }
      }

      // Load checklist template
      await loadChecklistTemplate(tour.id, "pre");

    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load trip data");
    } finally {
      setLoading(false);
    }
  };

  // Load checklist template
  const loadChecklistTemplate = async (tourId: string, type: "pre" | "post") => {
    try {
      const supabase = createClient();

      // Fetch template - tour-specific or default
      const { data: templates } = await supabase
        .from("checklist_templates")
        .select("*")
        .eq("is_active", true)
        .eq("checklist_type", type)
        .or(`tour_id.eq.${tourId},tour_id.is.null`)
        .order("tour_id", { ascending: false, nullsFirst: false })
        .limit(1);

      if (templates && templates.length > 0) {
        const tmpl = templates[0];
        setChecklistTemplate({
          id: tmpl.id,
          name: tmpl.name,
          items: tmpl.items as ChecklistItem[],
          type,
        });

        // Initialize state
        const initialState: ChecklistState = {};
        (tmpl.items as ChecklistItem[]).forEach((item) => {
          initialState[item.id] = { checked: false };
        });
        setChecklistState(initialState);
      }
    } catch (error) {
      console.error("Error loading checklist:", error);
    }
  };

  // Start location tracking
  const startLocationTracking = useCallback(() => {
    if ("geolocation" in navigator) {
      const id = navigator.geolocation.watchPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            speed: position.coords.speed
              ? position.coords.speed * 1.94384 // Convert m/s to knots
              : undefined,
          });
        },
        (error) => console.error("Geolocation error:", error),
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
      setWatchId(id);
    }
  }, []);

  // Stop location tracking
  const stopLocationTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [watchId]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (tripLog?.departed_at && !tripLog?.docked_at && currentStep === "sailing") {
      interval = setInterval(() => {
        const start = parseISO(tripLog.departed_at!);
        const seconds = differenceInSeconds(new Date(), start);
        setTripDuration(seconds);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [tripLog?.departed_at, tripLog?.docked_at, currentStep]);

  // Initial load
  useEffect(() => {
    if (availabilityId) {
      fetchTripData();
    } else {
      fetchTodaysTours();
    }

    return () => {
      stopLocationTracking();
    };
  }, [availabilityId]);

  // Toggle guest check-in
  const toggleGuestCheckIn = async (bookingId: string, guestId: string) => {
    if (!tourInfo) return;

    const booking = tourInfo.bookings.find(b => b.bookingId === bookingId);
    const guest = booking?.guests.find(g => g.id === guestId);
    if (!guest) return;

    const newCheckedIn = !guest.checkedIn;

    // Optimistic update
    setTourInfo(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        bookings: prev.bookings.map(b => {
          if (b.bookingId !== bookingId) return b;
          return {
            ...b,
            guests: b.guests.map(g => {
              if (g.id !== guestId) return g;
              return { ...g, checkedIn: newCheckedIn };
            }),
          };
        }),
      };
    });

    // Update selected guest if open
    if (selectedGuest?.guest.id === guestId) {
      setSelectedGuest(prev => prev ? {
        ...prev,
        guest: { ...prev.guest, checkedIn: newCheckedIn }
      } : null);
    }

    try {
      const supabase = createClient();
      await supabase
        .from("booking_guests")
        .update({ checked_in: newCheckedIn })
        .eq("id", guestId);

      toast.success(newCheckedIn ? "Guest checked in" : "Check-in removed");
    } catch (error) {
      // Revert on error
      setTourInfo(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          bookings: prev.bookings.map(b => {
            if (b.bookingId !== bookingId) return b;
            return {
              ...b,
              guests: b.guests.map(g => {
                if (g.id !== guestId) return g;
                return { ...g, checkedIn: !newCheckedIn };
              }),
            };
          }),
        };
      });
      toast.error("Failed to update check-in");
    }
  };

  // Handle signature capture
  const handleSignatureCapture = async (signatureDataUrl: string) => {
    if (!selectedGuest || !staffId) return;

    setSavingSignature(true);
    try {
      const response = await fetch("/api/waivers/sign-on-spot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId: selectedGuest.guest.id,
          bookingId: selectedGuest.booking.bookingId,
          signatureDataUrl,
          captainId: staffId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save signature");
      }

      // Update local state
      setTourInfo(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          bookings: prev.bookings.map(b => {
            if (b.bookingId !== selectedGuest.booking.bookingId) return b;
            return {
              ...b,
              guests: b.guests.map(g => {
                if (g.id !== selectedGuest.guest.id) return g;
                return { ...g, waiverSigned: true };
              }),
            };
          }),
        };
      });

      setSelectedGuest(prev => prev ? {
        ...prev,
        guest: { ...prev.guest, waiverSigned: true }
      } : null);

      setShowSignaturePad(false);
      toast.success("Waiver signed successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save signature");
    } finally {
      setSavingSignature(false);
    }
  };

  // Send waiver email
  const sendWaiverToGuest = async (guestId: string, bookingId: string) => {
    setSendingWaiver(guestId);
    try {
      const response = await fetch("/api/waivers/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId, bookingId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send waiver");
      }

      toast.success("Waiver sent to guest");
    } catch (err: any) {
      toast.error(err.message || "Failed to send waiver");
    } finally {
      setSendingWaiver(null);
    }
  };

  // Checklist functions
  const toggleChecklistItem = (itemId: string) => {
    setChecklistState(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], checked: !prev[itemId]?.checked },
    }));
  };

  const getChecklistStats = () => {
    if (!checklistTemplate) return { completed: 0, total: 0, required: 0, requiredComplete: 0 };

    const total = checklistTemplate.items.length;
    const completed = Object.values(checklistState).filter(s => s.checked).length;
    const requiredItems = checklistTemplate.items.filter(i => i.required);
    const requiredComplete = requiredItems.filter(i => checklistState[i.id]?.checked).length;

    return { completed, total, required: requiredItems.length, requiredComplete };
  };

  const canProceedFromChecklist = () => {
    if (!checklistTemplate) return false;
    const requiredItems = checklistTemplate.items.filter(i => i.required);
    return requiredItems.every(item => checklistState[item.id]?.checked);
  };

  // Submit pre-departure checklist (moves to boarding/check-in step)
  const submitPreChecklist = async () => {
    if (!canProceedFromChecklist() || !checklistTemplate || !staffId || !availabilityId) return;

    setUpdating(true);
    try {
      const supabase = createClient();

      const completedItems = Object.entries(checklistState).map(([itemId, state]) => ({
        itemId,
        checked: state.checked,
        photoUrl: state.photoUrl,
        note: state.note,
      }));

      await supabase.from("checklist_completions").insert({
        checklist_template_id: checklistTemplate.id,
        availability_id: availabilityId,
        captain_id: staffId,
        completed_items: completedItems,
        notes: checklistNotes || null,
        completed_at: new Date().toISOString(),
      });

      toast.success("Pre-departure checklist completed!");

      // Move to boarding/check-in step
      await updateTripStatus("boarding");
    } catch (error: any) {
      console.error("Error submitting checklist:", error);
      toast.error("Failed to submit checklist");
    } finally {
      setUpdating(false);
    }
  };

  // Submit post-arrival checklist
  const submitChecklist = async () => {
    if (!canProceedFromChecklist() || !checklistTemplate || !staffId || !availabilityId) return;

    setUpdating(true);
    try {
      const supabase = createClient();

      const completedItems = Object.entries(checklistState).map(([itemId, state]) => ({
        itemId,
        checked: state.checked,
        photoUrl: state.photoUrl,
        note: state.note,
      }));

      await supabase.from("checklist_completions").insert({
        checklist_template_id: checklistTemplate.id,
        availability_id: availabilityId,
        captain_id: staffId,
        completed_items: completedItems,
        notes: checklistNotes || null,
        completed_at: new Date().toISOString(),
      });

      toast.success("Post-arrival checklist completed!");

      // Complete the trip
      await updateTripStatus("completed");
    } catch (error: any) {
      console.error("Error submitting checklist:", error);
      toast.error("Failed to submit checklist");
    } finally {
      setUpdating(false);
    }
  };

  // Update trip status
  const updateTripStatus = async (newStatus: string) => {
    if (!tripLog || !staffId) return;

    setUpdating(true);
    try {
      const supabase = createClient();

      const updates: Record<string, any> = { status: newStatus };

      if (newStatus === "departed") {
        updates.departed_at = new Date().toISOString();
        if (currentLocation) {
          updates.departure_location = { lat: currentLocation.lat, lng: currentLocation.lng };
        }
        startLocationTracking();
        setCurrentStep("sailing");
      } else if (newStatus === "docked") {
        updates.docked_at = new Date().toISOString();
        if (currentLocation) {
          updates.return_location = { lat: currentLocation.lat, lng: currentLocation.lng };
        }
        stopLocationTracking();
        // Load post-arrival checklist
        if (tourInfo) {
          await loadChecklistTemplate(tourInfo.id, "post");
        }
        setCurrentStep("post_checklist");
      } else if (newStatus === "completed") {
        updates.returned_at = new Date().toISOString();
        setCurrentStep("completed");
      } else if (newStatus === "boarding") {
        setCurrentStep("boarding");
      } else if (newStatus === "pre_checklist") {
        setCurrentStep("pre_checklist");
      }

      const { error } = await supabase
        .from("trip_logs")
        .update(updates)
        .eq("id", tripLog.id);

      if (error) throw error;

      setTripLog({ ...tripLog, ...updates });
      setShowConfirmDialog(false);
      toast.success("Trip status updated");
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  // Move to next step in workflow
  const proceedToNextStep = async () => {
    if (currentStep === "pre_checklist") {
      await submitPreChecklist();
    } else if (currentStep === "boarding") {
      await updateTripStatus("departed");
    } else if (currentStep === "sailing") {
      setConfirmAction("dock");
      setShowConfirmDialog(true);
    } else if (currentStep === "post_checklist") {
      await submitChecklist();
    }
  };

  // Get guest stats
  const getGuestStats = () => {
    if (!tourInfo) return { total: 0, checkedIn: 0, waiversSigned: 0 };

    let total = 0;
    let checkedIn = 0;
    let waiversSigned = 0;

    tourInfo.bookings.forEach(b => {
      b.guests.forEach(g => {
        total++;
        if (g.checkedIn) checkedIn++;
        if (g.waiverSigned) waiversSigned++;
      });
    });

    return { total, checkedIn, waiversSigned };
  };

  // Filter bookings by search
  const filteredBookings = tourInfo?.bookings.filter(booking =>
    booking.customer.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    booking.customer.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    booking.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    booking.guests.some(g =>
      g.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.lastName.toLowerCase().includes(searchQuery.toLowerCase())
    )
  ) || [];

  // Format duration
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Tour selection screen
  if (!availabilityId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50/50 to-background dark:from-blue-950/10">
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/captain")}>
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
              <Button onClick={() => router.push("/captain")}>Go to Dashboard</Button>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Select a Trip</h2>
              {assignedTours.map((tour) => (
                <Card
                  key={tour.availability_id}
                  className="cursor-pointer hover:border-blue-400 transition-colors"
                  onClick={() => router.push(`/captain/trip?availability=${tour.availability_id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Ship className="h-7 w-7 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{tour.tour_name}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {tour.start_time?.slice(0, 5)} - {tour.end_time?.slice(0, 5)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {tour.checked_in_count}/{tour.booked_count} checked in
                          </span>
                        </div>
                        {tour.boat_name && (
                          <p className="text-xs text-muted-foreground mt-1">{tour.boat_name}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            tour.waiver_status === "complete" && "bg-green-100 text-green-700 border-green-300",
                            tour.waiver_status === "partial" && "bg-orange-100 text-orange-700 border-orange-300",
                            tour.waiver_status === "none" && "bg-slate-100 text-slate-700"
                          )}
                        >
                          {tour.waiver_status === "complete" && "All Waivers"}
                          {tour.waiver_status === "partial" && "Pending Waivers"}
                          {tour.waiver_status === "none" && "No Waivers"}
                        </Badge>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
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

  // Get current step info
  const guestStats = getGuestStats();
  const checklistStats = getChecklistStats();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 to-background dark:from-blue-950/10 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/captain/trip")}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{tourInfo?.name}</h1>
            <p className="text-sm text-muted-foreground">
              {tourInfo?.startTime} - {tourInfo?.endTime} • {tourInfo?.guestCount} guests
            </p>
          </div>
          {currentLocation && currentStep === "sailing" && (
            <Badge variant="outline" className="gap-1 text-green-600 flex-shrink-0">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              GPS
            </Badge>
          )}
        </div>

        {/* Step Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            {TRIP_STEPS.map((step, index) => {
              const stepIndex = TRIP_STEPS.findIndex(s => s.id === currentStep);
              const isCompleted = index < stepIndex;
              const isCurrent = step.id === currentStep;
              const Icon = step.icon;

              return (
                <div key={step.id} className="flex flex-col items-center flex-1">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center transition-all",
                      isCompleted && "bg-green-500 text-white",
                      isCurrent && "bg-blue-600 text-white ring-4 ring-blue-200 dark:ring-blue-900",
                      !isCompleted && !isCurrent && "bg-slate-200 dark:bg-slate-700 text-muted-foreground"
                    )}
                  >
                    {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span className={cn(
                    "text-xs mt-1 text-center hidden sm:block",
                    isCurrent ? "text-blue-600 font-medium" : "text-muted-foreground"
                  )}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Progress line */}
          <div className="relative h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden -mt-6 mx-5">
            <div
              className="h-full bg-blue-600 transition-all duration-500"
              style={{ width: `${(TRIP_STEPS.findIndex(s => s.id === currentStep) / (TRIP_STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-2xl mx-auto space-y-4">

          {/* Step 1: Pre-departure Checklist */}
          {currentStep === "pre_checklist" && checklistTemplate && (
            <>
              <Card className="p-4 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-indigo-600" />
                  <div className="flex-1">
                    <h3 className="font-semibold">Pre-Departure Safety Check</h3>
                    <p className="text-sm text-muted-foreground">
                      Complete all required items before departing
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span>{checklistStats.completed}/{checklistStats.total} items</span>
                    <span className={cn(
                      "font-medium",
                      checklistStats.requiredComplete === checklistStats.required ? "text-green-600" : "text-orange-600"
                    )}>
                      {checklistStats.requiredComplete}/{checklistStats.required} required
                    </span>
                  </div>
                  <Progress
                    value={(checklistStats.completed / checklistStats.total) * 100}
                    className="h-2"
                  />
                </div>
              </Card>

              <div className="space-y-2">
                {checklistTemplate.items.map((item, index) => {
                  const isChecked = checklistState[item.id]?.checked || false;

                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleChecklistItem(item.id)}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                        isChecked
                          ? "bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                      )}
                    >
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                        isChecked ? "bg-green-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                      )}>
                        {isChecked ? <Check className="h-5 w-5" /> : <span className="text-sm font-medium">{index + 1}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("font-medium", isChecked && "text-green-800 dark:text-green-200")}>
                          {item.label}
                        </p>
                        {item.required && !isChecked && (
                          <p className="text-xs text-orange-600 mt-0.5">Required</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <Textarea
                placeholder="Additional notes (optional)..."
                value={checklistNotes}
                onChange={(e) => setChecklistNotes(e.target.value)}
                rows={2}
              />
            </>
          )}

          {/* Step 2: Waiver & Check-in */}
          {currentStep === "boarding" && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-3 text-center">
                  <UserCheck className="h-5 w-5 mx-auto text-green-600 mb-1" />
                  <p className="text-xl font-bold">{guestStats.checkedIn}/{guestStats.total}</p>
                  <p className="text-xs text-muted-foreground">Checked In</p>
                </Card>
                <Card className="p-3 text-center">
                  <FileText className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                  <p className="text-xl font-bold">{guestStats.waiversSigned}/{guestStats.total}</p>
                  <p className="text-xs text-muted-foreground">Waivers</p>
                </Card>
                <Card className="p-3 text-center">
                  <Users className="h-5 w-5 mx-auto text-indigo-600 mb-1" />
                  <p className="text-xl font-bold">{guestStats.total}/{tourInfo?.capacity}</p>
                  <p className="text-xs text-muted-foreground">Capacity</p>
                </Card>
              </div>

              {/* Search */}
              <div className="relative">
                <Input
                  placeholder="Search guests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>

              {/* Guest List */}
              <div className="space-y-4">
                {filteredBookings.map((booking) => {
                  const allSigned = booking.guests.every(g => g.waiverSigned);
                  const checkedIn = booking.guests.filter(g => g.checkedIn).length;

                  return (
                    <Card key={booking.id} className="overflow-hidden">
                      <div className="p-4 border-b bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "h-10 w-10 rounded-lg flex items-center justify-center",
                              allSigned ? "bg-green-100" : "bg-orange-100"
                            )}>
                              {allSigned ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-orange-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold">
                                {booking.customer.firstName} {booking.customer.lastName}
                              </p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="outline" className="font-mono text-xs">
                                  {booking.id}
                                </Badge>
                                <span>{checkedIn}/{booking.guests.length} in</span>
                              </div>
                            </div>
                          </div>
                          {booking.customer.phone && (
                            <a href={`tel:${booking.customer.phone}`}>
                              <Button variant="ghost" size="icon">
                                <Phone className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                        </div>
                        {booking.notes && (
                          <p className="text-sm text-indigo-600 mt-2 flex items-center gap-1">
                            <Info className="h-3 w-3" />
                            {booking.notes}
                          </p>
                        )}
                      </div>
                      <div className="divide-y">
                        {booking.guests.map((guest) => (
                          <SwipeableGuestCard
                            key={guest.id}
                            guest={guest}
                            onCheckIn={() => toggleGuestCheckIn(booking.bookingId, guest.id)}
                            onTap={() => setSelectedGuest({ guest, booking })}
                          />
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}

          {/* Step 3: Sailing / Active Trip */}
          {currentStep === "sailing" && (
            <>
              {/* Trip Timer */}
              <Card className="p-6 text-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <Timer className="h-6 w-6" />
                  <span className="text-lg font-medium">Trip Duration</span>
                </div>
                <p className="text-4xl font-bold tracking-wider">
                  {formatDuration(tripDuration)}
                </p>
                <p className="text-sm text-blue-100 mt-2">
                  Departed at {tripLog?.departed_at ? format(parseISO(tripLog.departed_at), "h:mm a") : "--:--"}
                </p>
              </Card>

              {/* Live Stats */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-4 text-center">
                  <Gauge className="h-6 w-6 mx-auto text-blue-600 mb-2" />
                  <p className="text-2xl font-bold">{currentLocation?.speed?.toFixed(1) || "--"}</p>
                  <p className="text-xs text-muted-foreground">Speed (kts)</p>
                </Card>
                <Card className="p-4 text-center">
                  <Waves className="h-6 w-6 mx-auto text-blue-600 mb-2" />
                  <p className="text-2xl font-bold">{tripLog?.distance_nm?.toFixed(1) || "--"}</p>
                  <p className="text-xs text-muted-foreground">Distance (nm)</p>
                </Card>
                <Card className="p-4 text-center">
                  <Users className="h-6 w-6 mx-auto text-blue-600 mb-2" />
                  <p className="text-2xl font-bold">{guestStats.checkedIn}</p>
                  <p className="text-xs text-muted-foreground">Passengers</p>
                </Card>
              </div>

              {/* Current Location */}
              {currentLocation && (
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Current Position</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Trip Status */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">Trip Status</span>
                  <Badge className={cn(
                    tripLog?.status === "departed" && "bg-green-100 text-green-700",
                    tripLog?.status === "in_progress" && "bg-blue-100 text-blue-700",
                    tripLog?.status === "returning" && "bg-indigo-100 text-indigo-700"
                  )}>
                    {tripLog?.status === "departed" && "Just Departed"}
                    {tripLog?.status === "in_progress" && "Cruising"}
                    {tripLog?.status === "returning" && "Returning"}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  {tripLog?.status === "departed" && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => updateTripStatus("in_progress")}
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Cruising
                    </Button>
                  )}
                  {tripLog?.status === "in_progress" && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => updateTripStatus("returning")}
                    >
                      <Home className="h-4 w-4 mr-2" />
                      Returning
                    </Button>
                  )}
                </div>
              </Card>
            </>
          )}

          {/* Step 4: Post-arrival Checklist */}
          {currentStep === "post_checklist" && checklistTemplate && (
            <>
              <Card className="p-4 bg-green-50 dark:bg-green-950/30 border-green-200">
                <div className="flex items-center gap-3">
                  <Anchor className="h-6 w-6 text-green-600" />
                  <div className="flex-1">
                    <h3 className="font-semibold">Post-Arrival Checklist</h3>
                    <p className="text-sm text-muted-foreground">
                      Docked at {tripLog?.docked_at ? format(parseISO(tripLog.docked_at), "h:mm a") : "--:--"}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span>{checklistStats.completed}/{checklistStats.total} items</span>
                    <span className={cn(
                      "font-medium",
                      checklistStats.requiredComplete === checklistStats.required ? "text-green-600" : "text-orange-600"
                    )}>
                      {checklistStats.requiredComplete}/{checklistStats.required} required
                    </span>
                  </div>
                  <Progress
                    value={(checklistStats.completed / checklistStats.total) * 100}
                    className="h-2"
                  />
                </div>
              </Card>

              <div className="space-y-2">
                {checklistTemplate.items.map((item, index) => {
                  const isChecked = checklistState[item.id]?.checked || false;

                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleChecklistItem(item.id)}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                        isChecked
                          ? "bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-green-300"
                      )}
                    >
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                        isChecked ? "bg-green-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                      )}>
                        {isChecked ? <Check className="h-5 w-5" /> : <span className="text-sm font-medium">{index + 1}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("font-medium", isChecked && "text-green-800 dark:text-green-200")}>
                          {item.label}
                        </p>
                        {item.required && !isChecked && (
                          <p className="text-xs text-orange-600 mt-0.5">Required</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <Textarea
                placeholder="Additional notes (optional)..."
                value={checklistNotes}
                onChange={(e) => setChecklistNotes(e.target.value)}
                rows={2}
              />
            </>
          )}

          {/* Step 5: Completed */}
          {currentStep === "completed" && (
            <Card className="p-8 text-center border-green-200 bg-green-50 dark:bg-green-950/30">
              <CheckCircle2 className="h-20 w-20 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-700 dark:text-green-300 mb-2">
                Trip Completed!
              </h2>
              <p className="text-muted-foreground mb-4">
                Great job, Captain! Your trip has been logged successfully.
              </p>

              {/* Trip Summary */}
              <div className="grid grid-cols-2 gap-4 mt-6 text-left">
                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-semibold">
                    {tripLog?.departed_at && tripLog?.docked_at
                      ? formatDuration(differenceInSeconds(parseISO(tripLog.docked_at), parseISO(tripLog.departed_at)))
                      : "--"}
                  </p>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
                  <p className="text-xs text-muted-foreground">Passengers</p>
                  <p className="font-semibold">{guestStats.checkedIn}</p>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
                  <p className="text-xs text-muted-foreground">Departed</p>
                  <p className="font-semibold">
                    {tripLog?.departed_at ? format(parseISO(tripLog.departed_at), "h:mm a") : "--"}
                  </p>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
                  <p className="text-xs text-muted-foreground">Docked</p>
                  <p className="font-semibold">
                    {tripLog?.docked_at ? format(parseISO(tripLog.docked_at), "h:mm a") : "--"}
                  </p>
                </div>
              </div>

              <Button
                className="mt-6"
                variant="outline"
                onClick={() => router.push("/captain")}
              >
                Back to Dashboard
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* Bottom Action Button */}
      {currentStep !== "completed" && (
        <div className="sticky bottom-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t">
          <div className="max-w-2xl mx-auto">
            {currentStep === "pre_checklist" && (
              <Button
                size="lg"
                className={cn(
                  "w-full h-14 text-lg gap-2",
                  canProceedFromChecklist()
                    ? "bg-indigo-600 hover:bg-indigo-700"
                    : "bg-slate-400 cursor-not-allowed"
                )}
                onClick={proceedToNextStep}
                disabled={!canProceedFromChecklist() || updating}
              >
                {updating ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : canProceedFromChecklist() ? (
                  <>
                    <Users className="h-5 w-5" />
                    Proceed to Waiver & Check-in
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5" />
                    Complete Required Items ({checklistStats.required - checklistStats.requiredComplete} left)
                  </>
                )}
              </Button>
            )}

            {currentStep === "boarding" && (
              <Button
                size="lg"
                className="w-full h-14 text-lg gap-2 bg-green-600 hover:bg-green-700"
                onClick={proceedToNextStep}
                disabled={updating}
              >
                {updating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
                Start Trip
              </Button>
            )}

            {currentStep === "sailing" && (
              <Button
                size="lg"
                className="w-full h-14 text-lg gap-2 bg-blue-600 hover:bg-blue-700"
                onClick={proceedToNextStep}
                disabled={updating}
              >
                {updating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Anchor className="h-5 w-5" />}
                Dock & End Trip
              </Button>
            )}

            {currentStep === "post_checklist" && (
              <Button
                size="lg"
                className={cn(
                  "w-full h-14 text-lg gap-2",
                  canProceedFromChecklist()
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-slate-400 cursor-not-allowed"
                )}
                onClick={proceedToNextStep}
                disabled={!canProceedFromChecklist() || updating}
              >
                {updating ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : canProceedFromChecklist() ? (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    Complete Trip
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5" />
                    Complete Required Items ({checklistStats.required - checklistStats.requiredComplete} left)
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Guest Detail Dialog */}
      <Dialog open={!!selectedGuest && !showSignaturePad} onOpenChange={(open) => {
        if (!open) setSelectedGuest(null);
      }}>
        <DialogContent className="sm:max-w-md">
          {selectedGuest && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center",
                    selectedGuest.guest.checkedIn ? "bg-green-100" : "bg-slate-100"
                  )}>
                    {selectedGuest.guest.checkedIn ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Users className="h-5 w-5 text-slate-600" />
                    )}
                  </div>
                  {selectedGuest.guest.firstName} {selectedGuest.guest.lastName}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Waiver</p>
                    <Badge className={cn(
                      selectedGuest.guest.waiverSigned
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    )}>
                      {selectedGuest.guest.waiverSigned ? "Signed" : "Not Signed"}
                    </Badge>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <Badge className={cn(
                      selectedGuest.guest.checkedIn
                        ? "bg-green-100 text-green-800"
                        : "bg-slate-100 text-slate-800"
                    )}>
                      {selectedGuest.guest.checkedIn ? "Checked In" : "Not Checked In"}
                    </Badge>
                  </div>
                </div>

                {selectedGuest.guest.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {selectedGuest.guest.email}
                  </div>
                )}

                {!selectedGuest.guest.waiverSigned && (
                  <div className="p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <p className="text-sm text-orange-800 dark:text-orange-200 mb-3 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Waiver not signed yet
                    </p>
                    <Button
                      size="sm"
                      className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700"
                      onClick={() => setShowSignaturePad(true)}
                    >
                      <FileText className="h-4 w-4" />
                      Sign Waiver Now
                    </Button>
                  </div>
                )}

                <Button
                  className={cn(
                    "w-full h-12 text-base",
                    selectedGuest.guest.checkedIn
                      ? "bg-slate-600 hover:bg-slate-700"
                      : "bg-green-600 hover:bg-green-700"
                  )}
                  onClick={() => {
                    toggleGuestCheckIn(selectedGuest.booking.bookingId, selectedGuest.guest.id);
                  }}
                >
                  {selectedGuest.guest.checkedIn ? (
                    <>
                      <UserX className="h-5 w-5 mr-2" />
                      Undo Check-in
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-5 w-5 mr-2" />
                      Check In Guest
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Signature Pad Dialog */}
      <Dialog open={showSignaturePad} onOpenChange={setShowSignaturePad}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden">
          {selectedGuest && (
            <SignaturePad
              guestName={`${selectedGuest.guest.firstName} ${selectedGuest.guest.lastName}`}
              bookingId={selectedGuest.booking.bookingId}
              onSave={handleSignatureCapture}
              onCancel={() => setShowSignaturePad(false)}
              saving={savingSignature}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dock Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Anchor className="h-5 w-5 text-blue-600" />
              Confirm Docking
            </DialogTitle>
            <DialogDescription>
              This will mark the trip as docked and proceed to the post-arrival checklist.
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
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={() => updateTripStatus("docked")}
              disabled={updating}
            >
              {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Dock"}
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
      <TripWorkflowContent />
    </Suspense>
  );
}
