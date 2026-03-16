"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Ship,
  Search,
  Users,
  Clock,
  GripVertical,
  Anchor,
  X,
  ArrowLeft,
  Loader2,
  CalendarIcon,
  AlertTriangle,
  CheckCircle2,
  Ban,
  Copy,
  CopyPlus,
  ChevronRight,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { format, addDays, subDays, isSameDay, getDay } from "date-fns";
import type { Boat, Tour, TourDefaultSlot, TourBlackout, BoatBlackout, SlotBoatAssignment } from "@/types";

interface SlotWithTour extends TourDefaultSlot {
  tour: Tour;
  assignedBoats: (SlotBoatAssignment & { boat: Boat })[];
  isBlackedOut?: boolean;
  blackoutReason?: string;
}

export default function AssignBoatsPage() {
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<SlotWithTour[]>([]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [boatBlackouts, setBoatBlackouts] = useState<BoatBlackout[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [draggedBoat, setDraggedBoat] = useState<Boat | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const dayOfWeek = getDay(selectedDate); // 0-6, Sunday-Saturday

      // Fetch default slots for this day of week with tour info
      const slotsResult = await supabase
        .from("tour_default_slots")
        .select("*, tour:tours(*)")
        .eq("is_active", true)
        .contains("days_of_week", [dayOfWeek])
        .order("start_time");

      // Fetch tour blackouts for this date
      const tourBlackoutsResult = await supabase
        .from("tour_blackouts")
        .select("*")
        .eq("date", dateStr);

      // Fetch boat blackouts for this date
      const boatBlackoutsResult = await supabase
        .from("boat_blackouts")
        .select("*")
        .eq("date", dateStr);

      // Fetch existing slot boat assignments for this date (multiple boats per slot)
      const assignmentsResult = await supabase
        .from("slot_boat_assignments")
        .select("*, boat:boats(*)")
        .eq("date", dateStr);

      // Fetch all active boats
      const boatsResult = await supabase
        .from("boats")
        .select("*")
        .eq("status", "active")
        .order("name");

      if (slotsResult.error) throw slotsResult.error;
      if (tourBlackoutsResult.error) throw tourBlackoutsResult.error;
      if (boatBlackoutsResult.error) throw boatBlackoutsResult.error;
      if (assignmentsResult.error) throw assignmentsResult.error;
      if (boatsResult.error) throw boatsResult.error;

      // Create a map of tour blackouts
      const tourBlackoutMap = new Map<string, TourBlackout>();
      (tourBlackoutsResult.data || []).forEach((b) => {
        tourBlackoutMap.set(b.tour_id, b);
      });

      // Group assignments by slot ID (multiple boats per slot)
      const assignmentsBySlot = new Map<string, (SlotBoatAssignment & { boat: Boat })[]>();
      (assignmentsResult.data || []).forEach((a) => {
        const existing = assignmentsBySlot.get(a.default_slot_id) || [];
        existing.push(a);
        assignmentsBySlot.set(a.default_slot_id, existing);
      });

      // Process slots with blackouts and assignments
      const processedSlots: SlotWithTour[] = (slotsResult.data || [])
        .filter((slot) => slot.tour?.status === "active") // Only active tours
        .map((slot) => {
          const blackout = tourBlackoutMap.get(slot.tour_id);
          const assignments = assignmentsBySlot.get(slot.id) || [];

          return {
            ...slot,
            isBlackedOut: !!blackout,
            blackoutReason: blackout?.reason || undefined,
            assignedBoats: assignments,
          };
        });

      setSlots(processedSlots);
      setBoats(boatsResult.data || []);
      setBoatBlackouts(boatBlackoutsResult.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Check if a boat is blacked out for this date
  const isBoatBlackedOut = (boatId: string): boolean => {
    return boatBlackouts.some((b) => b.boat_id === boatId);
  };

  // Check if a boat is already assigned to a slot
  const isBoatAssignedToSlot = (boatId: string, slotId: string): boolean => {
    const slot = slots.find((s) => s.id === slotId);
    return slot?.assignedBoats?.some((a) => a.boat_id === boatId) || false;
  };

  // Check if a boat has a time conflict with a slot
  const hasTimeConflict = (boatId: string, slotId: string, startTime: string, endTime: string): boolean => {
    // Check all other slots
    for (const slot of slots) {
      if (slot.id === slotId) continue; // Skip the target slot

      // Check if boat is assigned to this other slot
      const isAssigned = slot.assignedBoats?.some((a) => a.boat_id === boatId);
      if (!isAssigned) continue;

      // Check time overlap
      const slotStart = slot.start_time;
      const slotEnd = slot.end_time;

      // Times overlap if: startA < endB AND endA > startB
      if (startTime < slotEnd && endTime > slotStart) {
        return true; // Conflict found
      }
    }

    return false;
  };

  // Get conflicting slot info for a boat
  const getConflictingSlot = (boatId: string, startTime: string, endTime: string): SlotWithTour | null => {
    for (const slot of slots) {
      const isAssigned = slot.assignedBoats?.some((a) => a.boat_id === boatId);
      if (!isAssigned) continue;

      const slotStart = slot.start_time;
      const slotEnd = slot.end_time;

      if (startTime < slotEnd && endTime > slotStart) {
        return slot;
      }
    }
    return null;
  };

  // Get boat availability status for display
  const getBoatStatus = (boat: Boat) => {
    if (isBoatBlackedOut(boat.id)) {
      return { status: "blackout", label: "Unavailable today", slots: [] as SlotWithTour[] };
    }

    const assignedSlots = slots.filter((s) =>
      s.assignedBoats?.some((a) => a.boat_id === boat.id)
    );
    if (assignedSlots.length === 0) {
      return { status: "available", label: "Available all day", slots: [] as SlotWithTour[] };
    }
    return {
      status: "partial",
      label: `${assignedSlots.length} slot${assignedSlots.length !== 1 ? "s" : ""}`,
      slots: assignedSlots,
    };
  };

  // Filter slots by search (exclude blacked out tours from display)
  const filteredSlots = slots.filter(
    (slot) =>
      !slot.isBlackedOut &&
      slot.tour?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group slots by time
  const slotsByTime = useMemo(() => {
    const groups: Record<string, SlotWithTour[]> = {};
    filteredSlots.forEach((slot) => {
      const timeKey = `${slot.start_time}-${slot.end_time}`;
      if (!groups[timeKey]) groups[timeKey] = [];
      groups[timeKey].push(slot);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredSlots]);

  // Drag handlers
  const handleBoatDragStart = (e: React.DragEvent, boat: Boat) => {
    if (isBoatBlackedOut(boat.id)) {
      e.preventDefault();
      return;
    }
    setDraggedBoat(boat);
    e.dataTransfer.effectAllowed = "copy";
    setTimeout(() => {
      (e.target as HTMLElement).style.opacity = "0.5";
    }, 0);
  };

  const handleBoatDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = "1";
    setDraggedBoat(null);
    setDragOverSlot(null);
  };

  const handleDragOverSlot = (e: React.DragEvent, slotId: string) => {
    if (!draggedBoat) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOverSlot(slotId);
  };

  const handleDragLeaveSlot = () => {
    setDragOverSlot(null);
  };

  const handleDropBoatOnSlot = async (e: React.DragEvent, slotId: string) => {
    e.preventDefault();
    setDragOverSlot(null);

    if (!draggedBoat) return;

    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return;

    // Check if already assigned to this slot
    if (isBoatAssignedToSlot(draggedBoat.id, slotId)) {
      toast.info("Already assigned", {
        description: `${draggedBoat.name} is already on this slot`,
      });
      setDraggedBoat(null);
      return;
    }

    // Check for time conflicts with other slots
    if (hasTimeConflict(draggedBoat.id, slotId, slot.start_time, slot.end_time)) {
      const conflictingSlot = getConflictingSlot(draggedBoat.id, slot.start_time, slot.end_time);
      toast.error("Time conflict!", {
        description: `${draggedBoat.name} is already assigned to ${conflictingSlot?.tour?.name} at ${conflictingSlot?.start_time.substring(0, 5)}-${conflictingSlot?.end_time.substring(0, 5)}`,
        icon: <AlertTriangle className="h-4 w-4" />,
      });
      setDraggedBoat(null);
      return;
    }

    try {
      const supabase = createClient();
      const dateStr = format(selectedDate, "yyyy-MM-dd");

      // Insert new assignment (multiple boats per slot allowed)
      const { error } = await supabase
        .from("slot_boat_assignments")
        .insert({
          default_slot_id: slotId,
          date: dateStr,
          boat_id: draggedBoat.id,
        });

      if (error) throw error;

      // Refresh data
      await fetchData();

      toast.success("Boat assigned!", {
        description: `${draggedBoat.name} -> ${slot.tour?.name} (${slot.start_time.substring(0, 5)}-${slot.end_time.substring(0, 5)})`,
        icon: <Ship className="h-4 w-4" />,
      });
    } catch (error: any) {
      console.error("Error assigning boat:", error);
      toast.error("Failed to assign boat", { description: error.message });
    }

    setDraggedBoat(null);
  };

  const handleRemoveBoatFromSlot = async (assignmentId: string, boatName: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("slot_boat_assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;

      await fetchData();

      toast.success(`${boatName} removed`);
    } catch (error: any) {
      console.error("Error removing boat:", error);
      toast.error("Failed to remove boat");
    }
  };

  // Copy slot assignments from previous day to this slot
  const handleCopySlotFromPreviousDay = async (slot: SlotWithTour) => {
    setCopying(true);
    try {
      const supabase = createClient();
      const previousDay = subDays(selectedDate, 1);
      const previousDateStr = format(previousDay, "yyyy-MM-dd");
      const currentDateStr = format(selectedDate, "yyyy-MM-dd");

      // Fetch assignments for this slot from previous day
      const { data: previousAssignments, error: fetchError } = await supabase
        .from("slot_boat_assignments")
        .select("boat_id")
        .eq("default_slot_id", slot.id)
        .eq("date", previousDateStr);

      if (fetchError) throw fetchError;

      if (!previousAssignments || previousAssignments.length === 0) {
        toast.info("No assignments to copy", {
          description: `This slot had no boats assigned on ${format(previousDay, "EEE, MMM d")}`,
        });
        return;
      }

      // Get boat IDs already assigned to this slot today
      const existingBoatIds = new Set((slot.assignedBoats || []).map((a) => a.boat_id));

      // Filter out boats already assigned
      const newAssignments = previousAssignments.filter(
        (a) => !existingBoatIds.has(a.boat_id)
      );

      if (newAssignments.length === 0) {
        toast.info("All boats already assigned", {
          description: "All boats from yesterday are already on this slot",
        });
        return;
      }

      // Insert new assignments
      const toInsert = newAssignments.map((a) => ({
        default_slot_id: slot.id,
        date: currentDateStr,
        boat_id: a.boat_id,
      }));

      const { error: insertError } = await supabase
        .from("slot_boat_assignments")
        .insert(toInsert);

      if (insertError) throw insertError;

      await fetchData();

      toast.success("Boats copied!", {
        description: `Added ${newAssignments.length} boat${newAssignments.length !== 1 ? "s" : ""} from ${format(previousDay, "EEE")}`,
      });
    } catch (error: any) {
      console.error("Error copying slot:", error);
      toast.error("Failed to copy boats", { description: error.message });
    } finally {
      setCopying(false);
    }
  };

  // Copy this slot's assignments to next week
  const handleCopySlotToNextWeek = async (slot: SlotWithTour) => {
    if (!slot.assignedBoats || slot.assignedBoats.length === 0) {
      toast.info("No boats to copy", {
        description: "Assign boats to this slot first",
      });
      return;
    }

    setCopying(true);
    try {
      const supabase = createClient();
      const nextWeek = addDays(selectedDate, 7);
      const nextWeekDateStr = format(nextWeek, "yyyy-MM-dd");

      // Check what's already assigned next week
      const { data: existingAssignments } = await supabase
        .from("slot_boat_assignments")
        .select("boat_id")
        .eq("default_slot_id", slot.id)
        .eq("date", nextWeekDateStr);

      const existingBoatIds = new Set((existingAssignments || []).map((a) => a.boat_id));

      // Filter to only new boats
      const newAssignments = (slot.assignedBoats || []).filter(
        (a) => !existingBoatIds.has(a.boat_id)
      );

      if (newAssignments.length === 0) {
        toast.info("All boats already assigned", {
          description: `All boats are already assigned to this slot on ${format(nextWeek, "EEE, MMM d")}`,
        });
        return;
      }

      // Insert new assignments
      const toInsert = newAssignments.map((a) => ({
        default_slot_id: slot.id,
        date: nextWeekDateStr,
        boat_id: a.boat_id,
      }));

      const { error: insertError } = await supabase
        .from("slot_boat_assignments")
        .insert(toInsert);

      if (insertError) throw insertError;

      toast.success("Copied to next week!", {
        description: `${newAssignments.length} boat${newAssignments.length !== 1 ? "s" : ""} copied to ${format(nextWeek, "EEE, MMM d")}`,
        action: {
          label: "Go there",
          onClick: () => setSelectedDate(nextWeek),
        },
      });
    } catch (error: any) {
      console.error("Error copying to next week:", error);
      toast.error("Failed to copy to next week", { description: error.message });
    } finally {
      setCopying(false);
    }
  };

  // Clear all boats from a slot
  const handleClearSlot = async (slot: SlotWithTour) => {
    if (!slot.assignedBoats || slot.assignedBoats.length === 0) return;

    try {
      const supabase = createClient();
      const dateStr = format(selectedDate, "yyyy-MM-dd");

      const { error } = await supabase
        .from("slot_boat_assignments")
        .delete()
        .eq("default_slot_id", slot.id)
        .eq("date", dateStr);

      if (error) throw error;

      await fetchData();

      toast.success("Slot cleared", {
        description: `Removed ${slot.assignedBoats.length} boat${slot.assignedBoats.length !== 1 ? "s" : ""}`,
      });
    } catch (error: any) {
      console.error("Error clearing slot:", error);
      toast.error("Failed to clear slot");
    }
  };

  // Bulk copy all assignments from previous day
  const handleCopyAllFromPreviousDay = async () => {
    setCopying(true);
    try {
      const supabase = createClient();
      const previousDay = subDays(selectedDate, 1);
      const previousDateStr = format(previousDay, "yyyy-MM-dd");
      const currentDateStr = format(selectedDate, "yyyy-MM-dd");

      // Fetch all assignments from previous day
      const { data: previousAssignments, error: fetchError } = await supabase
        .from("slot_boat_assignments")
        .select("default_slot_id, boat_id")
        .eq("date", previousDateStr);

      if (fetchError) throw fetchError;

      if (!previousAssignments || previousAssignments.length === 0) {
        toast.info("No assignments found", {
          description: `No boat assignments on ${format(previousDay, "EEE, MMM d")}`,
        });
        return;
      }

      // Get current slot IDs
      const currentSlotIds = new Set(slots.map((s) => s.id));

      // Get existing assignments for today
      const existingAssignments = new Set(
        slots.flatMap((s) =>
          (s.assignedBoats || []).map((a) => `${s.id}-${a.boat_id}`)
        )
      );

      // Filter to valid and new assignments
      const newAssignments = previousAssignments.filter(
        (a) =>
          currentSlotIds.has(a.default_slot_id) &&
          !existingAssignments.has(`${a.default_slot_id}-${a.boat_id}`)
      );

      if (newAssignments.length === 0) {
        toast.info("No new assignments", {
          description: "All applicable boats are already assigned",
        });
        return;
      }

      // Insert new assignments
      const toInsert = newAssignments.map((a) => ({
        default_slot_id: a.default_slot_id,
        date: currentDateStr,
        boat_id: a.boat_id,
      }));

      const { error: insertError } = await supabase
        .from("slot_boat_assignments")
        .insert(toInsert);

      if (insertError) throw insertError;

      await fetchData();

      toast.success("Assignments copied!", {
        description: `Added ${newAssignments.length} assignment${newAssignments.length !== 1 ? "s" : ""} from ${format(previousDay, "EEE, MMM d")}`,
      });
    } catch (error: any) {
      console.error("Error copying assignments:", error);
      toast.error("Failed to copy assignments", { description: error.message });
    } finally {
      setCopying(false);
    }
  };

  // Clear all assignments for current day
  const handleClearAllAssignments = async () => {
    const totalAssignments = slots.reduce((sum, s) => sum + (s.assignedBoats?.length || 0), 0);
    if (totalAssignments === 0) {
      toast.info("No assignments to clear");
      return;
    }

    setCopying(true);
    try {
      const supabase = createClient();
      const dateStr = format(selectedDate, "yyyy-MM-dd");

      const { error } = await supabase
        .from("slot_boat_assignments")
        .delete()
        .eq("date", dateStr);

      if (error) throw error;

      await fetchData();

      toast.success("Assignments cleared", {
        description: `Removed ${totalAssignments} assignment${totalAssignments !== 1 ? "s" : ""}`,
      });
    } catch (error: any) {
      console.error("Error clearing assignments:", error);
      toast.error("Failed to clear assignments");
    } finally {
      setCopying(false);
    }
  };

  const getBoatEmoji = (type: string | null) => {
    const emojis: Record<string, string> = {
      pontoon: "🚤",
      speedboat: "🏎️",
      catamaran: "⛵",
      yacht: "🛥️",
      sailboat: "⛵",
      fishing: "🎣",
      kayak: "🛶",
      jetski: "🌊",
    };
    return emojis[type || ""] || "🚤";
  };

  const formatTime = (time: string) => time.substring(0, 5);

  // Boat card component
  const BoatCard = ({ boat }: { boat: Boat }) => {
    const status = getBoatStatus(boat);
    const isBlackedOut = status.status === "blackout";

    return (
      <div
        draggable={!isBlackedOut}
        onDragStart={(e) => handleBoatDragStart(e, boat)}
        onDragEnd={handleBoatDragEnd}
        className={cn(
          "group relative rounded-xl border-2 shadow-sm p-3 transition-all duration-200",
          isBlackedOut
            ? "bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed"
            : "bg-white border-transparent cursor-grab active:cursor-grabbing hover:shadow-md hover:border-sky-300 hover:scale-[1.02]",
          draggedBoat?.id === boat.id && "opacity-50 scale-95"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl shrink-0">{getBoatEmoji(boat.boat_type)}</div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{boat.name}</h4>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              {boat.capacity} pax
            </p>
          </div>
          {isBlackedOut && (
            <Ban className="h-4 w-4 text-slate-400" />
          )}
        </div>

        {/* Assigned slots indicator */}
        {status.slots.length > 0 && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-[10px] text-muted-foreground mb-1">Assigned today:</p>
            <div className="flex flex-wrap gap-1">
              {status.slots.map((slot) => (
                <Badge
                  key={slot.id}
                  variant="secondary"
                  className="text-[9px] px-1.5 py-0 h-4"
                >
                  {formatTime(slot.start_time)}-{formatTime(slot.end_time)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {!isBlackedOut && (
          <div className="absolute left-1 top-3 opacity-0 group-hover:opacity-40 transition-opacity">
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </div>
        )}
      </div>
    );
  };

  // Slot card component
  const SlotCard = ({ slot }: { slot: SlotWithTour }) => {
    const isDropTarget = dragOverSlot === slot.id;
    const hasBoats = (slot.assignedBoats?.length || 0) > 0;

    // Check if dragged boat would conflict or is already assigned
    const wouldConflict =
      draggedBoat &&
      (isBoatAssignedToSlot(draggedBoat.id, slot.id) ||
        hasTimeConflict(draggedBoat.id, slot.id, slot.start_time, slot.end_time) ||
        isBoatBlackedOut(draggedBoat.id));

    return (
      <div
        onDragOver={(e) => handleDragOverSlot(e, slot.id)}
        onDragLeave={handleDragLeaveSlot}
        onDrop={(e) => handleDropBoatOnSlot(e, slot.id)}
        className={cn(
          "rounded-xl border-2 shadow-sm transition-all duration-200 p-3",
          "bg-white",
          isDropTarget && !wouldConflict
            ? "border-sky-500 bg-sky-50 scale-[1.02]"
            : isDropTarget && wouldConflict
            ? "border-red-400 bg-red-50"
            : "border-transparent hover:border-slate-200"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0">
            <Ship className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{slot.tour?.name}</h4>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {slot.capacity_override || slot.tour?.max_capacity}
              </span>
            </p>
          </div>

          {/* Slot actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleCopySlotFromPreviousDay(slot)}
                disabled={copying}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy from {format(subDays(selectedDate, 1), "EEE")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleCopySlotToNextWeek(slot)}
                disabled={copying || (slot.assignedBoats?.length || 0) === 0}
              >
                <CopyPlus className="h-4 w-4 mr-2" />
                Copy to next {format(selectedDate, "EEE")}
              </DropdownMenuItem>
              {hasBoats && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleClearSlot(slot)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear all boats
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Assigned boats area */}
        <div className="mt-2 space-y-1.5">
          {hasBoats ? (
            <>
              {(slot.assignedBoats || []).map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center gap-2 bg-gradient-to-r from-sky-50 to-blue-50 rounded-lg p-2 border border-sky-200"
                >
                  <span className="text-lg">{getBoatEmoji(assignment.boat?.boat_type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{assignment.boat?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {assignment.boat?.capacity} passengers
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveBoatFromSlot(assignment.id, assignment.boat?.name || "Boat")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {/* Drop zone for additional boats */}
              <div
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg p-1.5 border-2 border-dashed transition-colors",
                  isDropTarget && !wouldConflict
                    ? "border-sky-500 bg-sky-100"
                    : isDropTarget && wouldConflict
                    ? "border-red-400 bg-red-100"
                    : "border-muted-foreground/10"
                )}
              >
                {isDropTarget && wouldConflict ? (
                  <>
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                    <span className="text-[10px] text-red-600 font-medium">Can't add this boat</span>
                  </>
                ) : (
                  <span className="text-[10px] text-muted-foreground">
                    {isDropTarget ? "Drop to add" : "+ Add boat"}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg p-3 border-2 border-dashed transition-colors",
                isDropTarget && !wouldConflict
                  ? "border-sky-500 bg-sky-100"
                  : isDropTarget && wouldConflict
                  ? "border-red-400 bg-red-100"
                  : "border-muted-foreground/20"
              )}
            >
              {isDropTarget && wouldConflict ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-xs text-red-600 font-medium">Can't add this boat</span>
                </>
              ) : (
                <>
                  <Anchor className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {isDropTarget ? "Drop boat here!" : "Drag boats here"}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading slots and boats...</p>
        </div>
      </div>
    );
  }

  const totalAssignments = slots.reduce((sum, s) => sum + (s.assignedBoats?.length || 0), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/tours">
              <Button variant="ghost" size="sm" className="gap-1 -ml-2">
                <ArrowLeft className="h-4 w-4" />
                Tours
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Ship className="h-6 w-6 text-primary" />
            Assign Boats to Time Slots
          </h1>
          <p className="text-muted-foreground">
            Drag boats to time slots. Multiple boats can be assigned per slot.
          </p>
        </div>

        {/* Date picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2 min-w-[200px]">
              <CalendarIcon className="h-4 w-4" />
              {format(selectedDate, "EEE, MMM d, yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Quick date navigation */}
      <div className="flex gap-2 flex-wrap">
        {[-1, 0, 1, 2, 3, 4, 5, 6].map((offset) => {
          const date = addDays(new Date(), offset);
          const isSelected = isSameDay(date, selectedDate);
          return (
            <Button
              key={offset}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDate(date)}
              className={cn(
                "min-w-[80px]",
                isSelected && "gradient-primary border-0"
              )}
            >
              {offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : format(date, "EEE d")}
            </Button>
          );
        })}
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tours..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Bulk Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyAllFromPreviousDay}
            disabled={copying || loading}
            className="gap-1.5"
          >
            {copying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            Copy all from {format(subDays(selectedDate, 1), "EEE")}
          </Button>
          {totalAssignments > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAllAssignments}
              disabled={copying || loading}
              className="gap-1.5 text-muted-foreground hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
              Clear all ({totalAssignments})
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Boats sidebar */}
        <div className="lg:col-span-1">
          <Card className="p-4 bg-gradient-to-br from-sky-50 to-blue-50 border-sky-200 sticky top-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-sky-500 flex items-center justify-center">
                <Anchor className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Boats</h3>
                <p className="text-xs text-muted-foreground">{boats.length} active</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
              <GripVertical className="h-3 w-3" />
              Drag boats to slots
            </p>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {boats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No active boats found
                </p>
              ) : (
                boats.map((boat) => <BoatCard key={boat.id} boat={boat} />)
              )}
            </div>
          </Card>
        </div>

        {/* Slots by time */}
        <div className="lg:col-span-3">
          {slots.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium mb-2">No time slots for this day</p>
                <p className="text-muted-foreground mb-4">
                  This could be because no tours run on {format(selectedDate, "EEEE")}s,
                  or there are no active default time slots configured.
                </p>
                <Link href="/dashboard/tours">
                  <Button variant="outline">Go to Tours</Button>
                </Link>
              </div>
            </Card>
          ) : filteredSlots.length === 0 && searchQuery ? (
            <Card className="p-12">
              <div className="text-center">
                <Search className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium">No matching tours</p>
                <p className="text-muted-foreground">Try a different search term</p>
              </div>
            </Card>
          ) : filteredSlots.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <Ban className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium mb-2">All tours are blacked out</p>
                <p className="text-muted-foreground">
                  All tours scheduled for this day have been marked as unavailable.
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              {slotsByTime.map(([timeKey, timeSlots]) => {
                const [start, end] = timeKey.split("-");
                return (
                  <div key={timeKey}>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className="text-sm font-semibold px-3 py-1">
                        <Clock className="h-3 w-3 mr-1.5" />
                        {formatTime(start)} - {formatTime(end)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {timeSlots.length} tour{timeSlots.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {timeSlots.map((slot) => (
                        <SlotCard key={slot.id} slot={slot} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <Card className="p-4 bg-slate-50">
        <h4 className="font-medium text-sm mb-2">How it works:</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            Multiple boats can be assigned to each time slot
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            A boat can be used in multiple slots if times don't overlap
          </li>
          <li className="flex items-center gap-2">
            <MoreHorizontal className="h-3 w-3 text-blue-500" />
            Use the menu on each slot to copy from yesterday or to next week
          </li>
          <li className="flex items-center gap-2">
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            Blacked out tours or boats won't appear in the assignment list
          </li>
        </ul>
      </Card>
    </div>
  );
}
