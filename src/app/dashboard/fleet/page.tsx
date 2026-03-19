"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Ship,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Wrench,
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Anchor,
  Sparkles,
  UserCircle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Boat, BoatStatus, Staff, Tour, TourBoat } from "@/types";
import { useLocation } from "@/lib/location/context";
import { MapPin, Route } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const statusConfig: Record<BoatStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  active: {
    label: "Active",
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
    icon: <CheckCircle2 className="h-3 w-3" />
  },
  maintenance: {
    label: "Maintenance",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    icon: <AlertTriangle className="h-3 w-3" />
  },
  retired: {
    label: "Retired",
    color: "text-slate-500",
    bgColor: "bg-slate-100",
    icon: <XCircle className="h-3 w-3" />
  },
};

const boatTypes = [
  { value: "pontoon", label: "Pontoon", emoji: "🚤" },
  { value: "speedboat", label: "Speedboat", emoji: "🏎️" },
  { value: "catamaran", label: "Catamaran", emoji: "⛵" },
  { value: "yacht", label: "Yacht", emoji: "🛥️" },
  { value: "sailboat", label: "Sailboat", emoji: "⛵" },
  { value: "fishing", label: "Fishing Boat", emoji: "🎣" },
  { value: "kayak", label: "Kayak", emoji: "🛶" },
  { value: "jetski", label: "Jet Ski", emoji: "🌊" },
  { value: "other", label: "Other", emoji: "🚢" },
];

interface BoatFormData {
  name: string;
  registration_number: string;
  boat_type: string;
  capacity: number;
  description: string;
  features: string;
  status: BoatStatus;
  maintenance_notes: string;
  assigned_captain_id: string;
}

const defaultFormData: BoatFormData = {
  name: "",
  registration_number: "",
  boat_type: "pontoon",
  capacity: 10,
  description: "",
  features: "",
  status: "active",
  maintenance_notes: "",
  assigned_captain_id: "",
};

export default function FleetPage() {
  const { selectedLocation } = useLocation();
  const [loading, setLoading] = useState(true);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [captains, setCaptains] = useState<Staff[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<BoatFormData>(defaultFormData);
  const [editingBoat, setEditingBoat] = useState<Boat | null>(null);
  const [assignedTourIds, setAssignedTourIds] = useState<Set<string>>(new Set());
  const [boatTourAssignments, setBoatTourAssignments] = useState<Map<string, string[]>>(new Map());

  useEffect(() => {
    fetchData();
  }, [selectedLocation]);

  const fetchData = async () => {
    try {
      const supabase = createClient();

      // Fetch boats with captain - filtered by location
      let boatsQuery = supabase
        .from("boats")
        .select("*, assigned_captain:staff(*)")
        .order("created_at", { ascending: false });

      if (selectedLocation?.id) {
        boatsQuery = boatsQuery.eq("location_id", selectedLocation.id);
      }

      let boatsResult = await boatsQuery;

      // If the assigned_captain column doesn't exist, fetch without it
      if (boatsResult.error?.code === "42703") {
        let fallbackQuery = supabase
          .from("boats")
          .select("*")
          .order("created_at", { ascending: false });

        if (selectedLocation?.id) {
          fallbackQuery = fallbackQuery.eq("location_id", selectedLocation.id);
        }

        boatsResult = await fallbackQuery;
      }

      // Fetch captains filtered by location
      let captainsQuery = supabase
        .from("staff")
        .select("*")
        .in("role", ["captain", "guide"])
        .eq("is_active", true)
        .order("name");

      if (selectedLocation?.id) {
        captainsQuery = captainsQuery.eq("location_id", selectedLocation.id);
      }

      const captainsResult = await captainsQuery;

      // Fetch tours filtered by location
      let toursQuery = supabase
        .from("tours")
        .select("*")
        .eq("status", "active")
        .order("name");

      if (selectedLocation?.id) {
        toursQuery = toursQuery.eq("location_id", selectedLocation.id);
      }

      const toursResult = await toursQuery;

      // Fetch tour_boats junction table to know which boats are assigned to which tours
      const tourBoatsResult = await supabase
        .from("tour_boats")
        .select("boat_id, tour_id");

      if (boatsResult.error) throw boatsResult.error;
      if (captainsResult.error) throw captainsResult.error;
      if (toursResult.error) throw toursResult.error;

      // Build a map of boat_id -> tour_ids
      const boatToTours = new Map<string, string[]>();
      (tourBoatsResult.data || []).forEach((tb: { boat_id: string; tour_id: string }) => {
        const existing = boatToTours.get(tb.boat_id) || [];
        existing.push(tb.tour_id);
        boatToTours.set(tb.boat_id, existing);
      });

      setBoats(boatsResult.data || []);
      setCaptains(captainsResult.data || []);
      setTours(toursResult.data || []);
      setBoatTourAssignments(boatToTours);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load fleet data");
    } finally {
      setLoading(false);
    }
  };

  const filteredBoats = boats.filter((boat) => {
    const matchesSearch =
      boat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (boat.registration_number?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === "all" || boat.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: boats.length,
    active: boats.filter((b) => b.status === "active").length,
    maintenance: boats.filter((b) => b.status === "maintenance").length,
    totalCapacity: boats
      .filter((b) => b.status === "active")
      .reduce((sum, b) => sum + b.capacity, 0),
  };

  const handleRemoveCaptain = async (boat: Boat) => {
    try {
      const supabase = createClient();
      const { data: updatedBoat, error } = await supabase
        .from("boats")
        .update({ assigned_captain_id: null })
        .eq("id", boat.id)
        .select("*, assigned_captain:staff(*)")
        .single();

      if (error) throw error;

      setBoats((prev) =>
        prev.map((b) => (b.id === boat.id ? updatedBoat : b))
      );

      toast.success("Captain removed", { description: boat.name });
    } catch (error: any) {
      console.error("Error removing captain:", error);
      toast.error("Failed to remove captain");
    }
  };

  const handleAddBoat = async () => {
    if (!formData.name) {
      toast.error("Boat name is required");
      return;
    }

    if (!selectedLocation?.id) {
      toast.error("Please select a location first");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const featuresArray = formData.features
        .split(",")
        .map((f) => f.trim())
        .filter((f) => f);

      const { data, error } = await supabase
        .from("boats")
        .insert({
          name: formData.name,
          registration_number: formData.registration_number || null,
          boat_type: formData.boat_type,
          capacity: formData.capacity,
          description: formData.description || null,
          features: featuresArray,
          status: formData.status,
          maintenance_notes: formData.maintenance_notes || null,
          assigned_captain_id: formData.assigned_captain_id || null,
          location_id: selectedLocation.id,
        })
        .select("*, assigned_captain:staff(*)")
        .single();

      if (error) throw error;

      // Save tour assignments for the new boat
      if (assignedTourIds.size > 0) {
        const tourBoatInserts = Array.from(assignedTourIds).map((tourId) => ({
          tour_id: tourId,
          boat_id: data.id,
          is_primary: false,
          price_modifier: 0,
        }));

        await supabase.from("tour_boats").insert(tourBoatInserts);

        // Update local boat tour assignments map
        setBoatTourAssignments((prev) => {
          const newMap = new Map(prev);
          newMap.set(data.id, Array.from(assignedTourIds));
          return newMap;
        });
      }

      setBoats((prev) => [data, ...prev]);
      setFormData(defaultFormData);
      setAssignedTourIds(new Set());
      setIsAddDialogOpen(false);
      toast.success("Boat added!", {
        description: `${data.name} has joined the fleet${assignedTourIds.size > 0 ? ` with ${assignedTourIds.size} tour(s)` : ''}`,
        icon: <Sparkles className="h-4 w-4" />,
      });
    } catch (error: any) {
      console.error("Error adding boat:", error);
      toast.error("Failed to add boat", { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditBoat = (boat: Boat) => {
    setEditingBoat(boat);
    setFormData({
      name: boat.name,
      registration_number: boat.registration_number || "",
      boat_type: boat.boat_type || "pontoon",
      capacity: boat.capacity,
      description: boat.description || "",
      features: boat.features?.join(", ") || "",
      status: boat.status,
      maintenance_notes: boat.maintenance_notes || "",
      assigned_captain_id: boat.assigned_captain_id || "",
    });
    // Load assigned tours for this boat
    const tourIds = boatTourAssignments.get(boat.id) || [];
    setAssignedTourIds(new Set(tourIds));
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingBoat) return;

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const featuresArray = formData.features
        .split(",")
        .map((f) => f.trim())
        .filter((f) => f);

      const { data: updatedBoat, error } = await supabase
        .from("boats")
        .update({
          name: formData.name,
          registration_number: formData.registration_number || null,
          boat_type: formData.boat_type,
          capacity: formData.capacity,
          description: formData.description || null,
          features: featuresArray,
          status: formData.status,
          maintenance_notes: formData.maintenance_notes || null,
          assigned_captain_id: formData.assigned_captain_id || null,
        })
        .eq("id", editingBoat.id)
        .select("*, assigned_captain:staff(*)")
        .single();

      if (error) throw error;

      // Update tour assignments for this boat
      // First delete existing assignments
      await supabase
        .from("tour_boats")
        .delete()
        .eq("boat_id", editingBoat.id);

      // Then insert new assignments
      if (assignedTourIds.size > 0) {
        const tourBoatInserts = Array.from(assignedTourIds).map((tourId) => ({
          tour_id: tourId,
          boat_id: editingBoat.id,
          is_primary: false,
          price_modifier: 0,
        }));

        const { error: tourBoatError } = await supabase
          .from("tour_boats")
          .insert(tourBoatInserts);

        if (tourBoatError) {
          console.error("Error updating tour assignments:", tourBoatError);
        }
      }

      // Update local boat tour assignments map
      setBoatTourAssignments((prev) => {
        const newMap = new Map(prev);
        newMap.set(editingBoat.id, Array.from(assignedTourIds));
        return newMap;
      });

      setBoats((prev) =>
        prev.map((b) => (b.id === editingBoat.id ? updatedBoat : b))
      );

      setIsEditDialogOpen(false);
      setEditingBoat(null);
      setFormData(defaultFormData);
      setAssignedTourIds(new Set());
      toast.success("Boat updated!", { description: formData.name });
    } catch (error: any) {
      console.error("Error updating boat:", error);
      toast.error("Failed to update boat", { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBoat = async (boat: Boat) => {
    if (!confirm(`Are you sure you want to delete ${boat.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.from("boats").delete().eq("id", boat.id);

      if (error) throw error;

      setBoats((prev) => prev.filter((b) => b.id !== boat.id));
      toast.success("Boat deleted", { description: `${boat.name} has been removed.` });
    } catch (error: any) {
      console.error("Error deleting boat:", error);
      toast.error("Failed to delete boat", { description: error.message });
    }
  };

  const handleSetMaintenance = async (boat: Boat) => {
    try {
      const supabase = createClient();
      const newStatus = boat.status === "maintenance" ? "active" : "maintenance";

      const { error } = await supabase
        .from("boats")
        .update({ status: newStatus })
        .eq("id", boat.id);

      if (error) throw error;

      setBoats((prev) =>
        prev.map((b) => (b.id === boat.id ? { ...b, status: newStatus } : b))
      );

      toast.success(
        newStatus === "maintenance" ? "Marked for maintenance" : "Back in action!",
        { description: boat.name }
      );
    } catch (error: any) {
      console.error("Error updating boat status:", error);
      toast.error("Failed to update boat status");
    }
  };

  const getBoatEmoji = (type: string | null) => {
    return boatTypes.find((t) => t.value === type)?.emoji || "🚤";
  };

  const getCaptainInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Boat card component
  const BoatCard = ({ boat }: { boat: Boat }) => {
    return (
      <div
        className={cn(
          "group relative bg-white rounded-xl border-2 shadow-sm transition-all duration-200 p-4",
          "hover:shadow-md border-transparent hover:border-primary/30"
        )}
      >
        <div className="flex items-start gap-3">
          {/* Boat emoji/icon */}
          <div className="flex items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-blue-100 text-2xl shrink-0 h-14 w-14">
            {getBoatEmoji(boat.boat_type)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold truncate text-base">
                  {boat.name}
                </h3>
                {boat.registration_number && (
                  <p className="text-xs text-muted-foreground font-mono">
                    {boat.registration_number}
                  </p>
                )}
              </div>

              {/* Actions menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleEditBoat(boat)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSetMaintenance(boat)}>
                    <Wrench className="h-4 w-4 mr-2" />
                    {boat.status === "maintenance" ? "Return to Active" : "Set Maintenance"}
                  </DropdownMenuItem>
                  {boat.assigned_captain && (
                    <DropdownMenuItem onClick={() => handleRemoveCaptain(boat)}>
                      <UserCircle className="h-4 w-4 mr-2" />
                      Remove Captain
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleDeleteBoat(boat)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Boat
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Info row */}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] px-1.5 py-0 h-5 gap-1",
                  statusConfig[boat.status]?.bgColor,
                  statusConfig[boat.status]?.color
                )}
              >
                {statusConfig[boat.status]?.icon}
                {statusConfig[boat.status]?.label}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                {boat.capacity}
              </span>
              {/* Tour count badge */}
              {(boatTourAssignments.get(boat.id)?.length || 0) > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Route className="h-3 w-3" />
                  {boatTourAssignments.get(boat.id)?.length} tour{(boatTourAssignments.get(boat.id)?.length || 0) !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Assigned tours preview */}
            {(boatTourAssignments.get(boat.id)?.length || 0) > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {boatTourAssignments.get(boat.id)?.slice(0, 2).map((tourId) => {
                  const tour = tours.find((t) => t.id === tourId);
                  return tour ? (
                    <Badge
                      key={tourId}
                      variant="outline"
                      className="text-[9px] px-1.5 py-0 h-4 bg-sky-50 text-sky-700 border-sky-200"
                    >
                      {tour.name.length > 15 ? tour.name.substring(0, 15) + "..." : tour.name}
                    </Badge>
                  ) : null;
                })}
                {(boatTourAssignments.get(boat.id)?.length || 0) > 2 && (
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1.5 py-0 h-4 bg-muted text-muted-foreground"
                  >
                    +{(boatTourAssignments.get(boat.id)?.length || 0) - 2} more
                  </Badge>
                )}
              </div>
            )}

            {/* Captain badge */}
            {boat.assigned_captain && (
              <div className="mt-2">
                <div className="flex items-center gap-2 bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg p-2 border border-violet-200">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={boat.assigned_captain.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px] bg-violet-200 text-violet-700">
                      {getCaptainInitials(boat.assigned_captain.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-violet-700 flex-1">
                    {boat.assigned_captain.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 hover:bg-violet-200"
                    onClick={() => handleRemoveCaptain(boat)}
                  >
                    <X className="h-3 w-3 text-violet-600" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderBoatForm = () => (
    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Boat Name *</Label>
          <Input
            id="name"
            placeholder="e.g., Sea Breeze"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="registration">Registration Number</Label>
          <Input
            id="registration"
            placeholder="e.g., FL-1234-AB"
            value={formData.registration_number}
            onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="boat_type">Boat Type</Label>
          <Select
            value={formData.boat_type}
            onValueChange={(value) => setFormData({ ...formData, boat_type: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {boatTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <span className="flex items-center gap-2">
                    <span>{type.emoji}</span>
                    {type.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="capacity">Capacity</Label>
          <Input
            id="capacity"
            type="number"
            min="1"
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value as BoatStatus })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">✅ Active</SelectItem>
              <SelectItem value="maintenance">🔧 Maintenance</SelectItem>
              <SelectItem value="retired">💤 Retired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="captain">Assigned Captain</Label>
        <Select
          value={formData.assigned_captain_id || "none"}
          onValueChange={(value) => setFormData({ ...formData, assigned_captain_id: value === "none" ? "" : value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select captain" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">👤 No captain</SelectItem>
            {captains.map((captain) => (
              <SelectItem key={captain.id} value={captain.id}>
                <span className="flex items-center gap-2">
                  <UserCircle className="h-3 w-3" />
                  {captain.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tour Assignments */}
      {tours.length > 0 && (
        <div className="grid gap-2">
          <Label className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            Assigned Tours
          </Label>
          <p className="text-xs text-muted-foreground">
            Select the tours this boat can operate
          </p>
          <div className="border rounded-lg p-3 space-y-2 max-h-[200px] overflow-y-auto bg-muted/30">
            {tours.map((tour) => (
              <div
                key={tour.id}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors"
              >
                <Checkbox
                  id={`tour-${tour.id}`}
                  checked={assignedTourIds.has(tour.id)}
                  onCheckedChange={(checked) => {
                    setAssignedTourIds((prev) => {
                      const newSet = new Set(prev);
                      if (checked) {
                        newSet.add(tour.id);
                      } else {
                        newSet.delete(tour.id);
                      }
                      return newSet;
                    });
                  }}
                />
                <label
                  htmlFor={`tour-${tour.id}`}
                  className="flex-1 text-sm cursor-pointer"
                >
                  {tour.name}
                </label>
                <span className="text-xs text-muted-foreground">
                  {tour.duration_minutes} min
                </span>
              </div>
            ))}
          </div>
          {assignedTourIds.size > 0 && (
            <p className="text-xs text-muted-foreground">
              {assignedTourIds.size} tour{assignedTourIds.size !== 1 ? "s" : ""} selected
            </p>
          )}
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe the boat..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="features">Features (comma-separated)</Label>
        <Input
          id="features"
          placeholder="e.g., shade cover, bluetooth speaker, cooler"
          value={formData.features}
          onChange={(e) => setFormData({ ...formData, features: e.target.value })}
        />
      </div>

      {formData.status === "maintenance" && (
        <div className="grid gap-2">
          <Label htmlFor="maintenance_notes">Maintenance Notes</Label>
          <Textarea
            id="maintenance_notes"
            placeholder="What needs to be fixed or serviced..."
            value={formData.maintenance_notes}
            onChange={(e) => setFormData({ ...formData, maintenance_notes: e.target.value })}
          />
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-2xl" />
            ))}
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
            <Anchor className="h-6 w-6 text-primary" />
            Fleet Management
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            {selectedLocation ? (
              <>
                <MapPin className="h-4 w-4" />
                {selectedLocation.name}
              </>
            ) : (
              "Manage your boats and assign captains"
            )}
          </p>
        </div>

        <Button
          className="gap-2 gradient-primary border-0"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Boat
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-200 flex items-center justify-center">
              <Ship className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Boats</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-200 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700">{stats.active}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-violet-50 to-violet-100 border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-200 flex items-center justify-center">
              <UserCircle className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-violet-700">{captains.length}</p>
              <p className="text-xs text-muted-foreground">Captains</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-sky-50 to-sky-100 border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-200 flex items-center justify-center">
              <Users className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-sky-700">{stats.totalCapacity}</p>
              <p className="text-xs text-muted-foreground">Total Capacity</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search boats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">✅ Active</SelectItem>
            <SelectItem value="maintenance">🔧 Maintenance</SelectItem>
            <SelectItem value="retired">💤 Retired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main content */}
      {boats.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <div className="text-6xl mb-4">🚤</div>
            <p className="text-lg font-medium mb-2">No boats in your fleet yet</p>
            <p className="text-muted-foreground mb-4">
              Add your first boat to start managing your fleet.
            </p>
            <Button
              className="gap-2 gradient-primary border-0"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Your First Boat
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBoats.map((boat) => (
            <BoatCard key={boat.id} boat={boat} />
          ))}
        </div>
      )}

      {/* Add Boat Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">🚤</span>
              Add New Boat
            </DialogTitle>
            <DialogDescription>Add a new boat to your fleet.</DialogDescription>
          </DialogHeader>
          {renderBoatForm()}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setFormData(defaultFormData);
                setAssignedTourIds(new Set());
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button className="gradient-primary border-0" onClick={handleAddBoat} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Add Boat
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Boat Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{editingBoat ? getBoatEmoji(editingBoat.boat_type) : "🚤"}</span>
              Edit Boat
            </DialogTitle>
            <DialogDescription>Update boat details and assignments.</DialogDescription>
          </DialogHeader>
          {renderBoatForm()}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setFormData(defaultFormData);
                setEditingBoat(null);
                setAssignedTourIds(new Set());
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button className="gradient-primary border-0" onClick={handleSaveEdit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
