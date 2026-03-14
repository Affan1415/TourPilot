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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  MapPin,
  Waves,
  GripVertical,
  LayoutGrid,
  List,
  Sparkles,
  UserCircle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Boat, BoatStatus, Location, Staff } from "@/types";

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

const locationColors = [
  { bg: "from-sky-400/20 to-blue-500/20", border: "border-sky-300", accent: "bg-sky-500" },
  { bg: "from-emerald-400/20 to-teal-500/20", border: "border-emerald-300", accent: "bg-emerald-500" },
  { bg: "from-violet-400/20 to-purple-500/20", border: "border-violet-300", accent: "bg-violet-500" },
  { bg: "from-amber-400/20 to-orange-500/20", border: "border-amber-300", accent: "bg-amber-500" },
  { bg: "from-rose-400/20 to-pink-500/20", border: "border-rose-300", accent: "bg-rose-500" },
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
  location_id: string;
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
  location_id: "",
  assigned_captain_id: "",
};

export default function FleetPage() {
  const [loading, setLoading] = useState(true);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [captains, setCaptains] = useState<Staff[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<BoatFormData>(defaultFormData);
  const [editingBoat, setEditingBoat] = useState<Boat | null>(null);
  const [viewMode, setViewMode] = useState<"marina" | "captains">("marina");
  const [draggedBoat, setDraggedBoat] = useState<Boat | null>(null);
  const [draggedCaptain, setDraggedCaptain] = useState<Staff | null>(null);
  const [dragOverLocation, setDragOverLocation] = useState<string | null>(null);
  const [dragOverBoat, setDragOverBoat] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const supabase = createClient();

      // Try with captain join first, fallback to without if column doesn't exist
      let boatsResult = await supabase
        .from("boats")
        .select("*, location:locations(*), assigned_captain:staff(*)")
        .order("created_at", { ascending: false });

      // If the assigned_captain column doesn't exist, fetch without it
      if (boatsResult.error?.code === "42703") {
        boatsResult = await supabase
          .from("boats")
          .select("*, location:locations(*)")
          .order("created_at", { ascending: false });
      }

      const [locationsResult, captainsResult] = await Promise.all([
        supabase
          .from("locations")
          .select("*")
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("staff")
          .select("*")
          .in("role", ["captain", "guide"])
          .eq("is_active", true)
          .order("name"),
      ]);

      if (boatsResult.error) throw boatsResult.error;
      if (locationsResult.error) throw locationsResult.error;
      if (captainsResult.error) throw captainsResult.error;

      setBoats(boatsResult.data || []);
      setLocations(locationsResult.data || []);
      setCaptains(captainsResult.data || []);
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

  // Boat drag handlers (for location assignment)
  const handleBoatDragStart = (e: React.DragEvent, boat: Boat) => {
    setDraggedBoat(boat);
    setDraggedCaptain(null);
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => {
      (e.target as HTMLElement).style.opacity = "0.5";
    }, 0);
  };

  const handleBoatDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = "1";
    setDraggedBoat(null);
    setDragOverLocation(null);
  };

  // Captain drag handlers
  const handleCaptainDragStart = (e: React.DragEvent, captain: Staff) => {
    setDraggedCaptain(captain);
    setDraggedBoat(null);
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => {
      (e.target as HTMLElement).style.opacity = "0.5";
    }, 0);
  };

  const handleCaptainDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = "1";
    setDraggedCaptain(null);
    setDragOverBoat(null);
  };

  const handleDragOverLocation = (e: React.DragEvent, locationId: string | null) => {
    if (!draggedBoat) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverLocation(locationId);
  };

  const handleDragOverBoat = (e: React.DragEvent, boatId: string) => {
    if (!draggedCaptain) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverBoat(boatId);
  };

  const handleDragLeaveLocation = () => {
    setDragOverLocation(null);
  };

  const handleDragLeaveBoat = () => {
    setDragOverBoat(null);
  };

  const handleDropOnLocation = async (e: React.DragEvent, locationId: string | null) => {
    e.preventDefault();
    setDragOverLocation(null);

    if (!draggedBoat) return;
    if (draggedBoat.location_id === locationId) {
      setDraggedBoat(null);
      return;
    }

    try {
      const supabase = createClient();
      const { data: updatedBoat, error } = await supabase
        .from("boats")
        .update({ location_id: locationId })
        .eq("id", draggedBoat.id)
        .select("*, location:locations(*), assigned_captain:staff(*)")
        .single();

      if (error) throw error;

      setBoats((prev) =>
        prev.map((b) => (b.id === draggedBoat.id ? updatedBoat : b))
      );

      const locationName = locationId
        ? locations.find((l) => l.id === locationId)?.name
        : "Unassigned";

      toast.success("Boat moved!", {
        description: `${draggedBoat.name} → ${locationName}`,
        icon: <Ship className="h-4 w-4" />,
      });
    } catch (error: any) {
      console.error("Error moving boat:", error);
      toast.error("Failed to move boat");
    }

    setDraggedBoat(null);
  };

  const handleDropCaptainOnBoat = async (e: React.DragEvent, boatId: string) => {
    e.preventDefault();
    setDragOverBoat(null);

    if (!draggedCaptain) return;

    const boat = boats.find((b) => b.id === boatId);
    if (!boat) return;

    // Already assigned to this boat
    if (boat.assigned_captain_id === draggedCaptain.id) {
      setDraggedCaptain(null);
      return;
    }

    // Check if captain is already assigned to another boat
    const existingAssignment = boats.find((b) => b.assigned_captain_id === draggedCaptain.id);
    if (existingAssignment) {
      toast.error("Captain already assigned", {
        description: `${draggedCaptain.name} is already on ${existingAssignment.name}. Remove them first.`,
      });
      setDraggedCaptain(null);
      return;
    }

    try {
      const supabase = createClient();
      const { data: updatedBoat, error } = await supabase
        .from("boats")
        .update({ assigned_captain_id: draggedCaptain.id })
        .eq("id", boatId)
        .select("*, location:locations(*), assigned_captain:staff(*)")
        .single();

      if (error) {
        // Handle unique constraint violation
        if (error.code === "23505") {
          toast.error("Captain already assigned", {
            description: `${draggedCaptain.name} can only be assigned to one boat.`,
          });
          setDraggedCaptain(null);
          return;
        }
        throw error;
      }

      setBoats((prev) =>
        prev.map((b) => (b.id === boatId ? updatedBoat : b))
      );

      toast.success("Captain assigned!", {
        description: `${draggedCaptain.name} → ${boat.name}`,
        icon: <UserCircle className="h-4 w-4" />,
      });
    } catch (error: any) {
      console.error("Error assigning captain:", error);
      toast.error("Failed to assign captain", { description: error.message });
    }

    setDraggedCaptain(null);
  };

  const handleRemoveCaptain = async (boat: Boat) => {
    try {
      const supabase = createClient();
      const { data: updatedBoat, error } = await supabase
        .from("boats")
        .update({ assigned_captain_id: null })
        .eq("id", boat.id)
        .select("*, location:locations(*), assigned_captain:staff(*)")
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
          location_id: formData.location_id || null,
          assigned_captain_id: formData.assigned_captain_id || null,
        })
        .select("*, location:locations(*), assigned_captain:staff(*)")
        .single();

      if (error) throw error;

      setBoats((prev) => [data, ...prev]);
      setFormData(defaultFormData);
      setIsAddDialogOpen(false);
      toast.success("Boat added!", {
        description: `${data.name} has joined the fleet`,
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
      location_id: boat.location_id || "",
      assigned_captain_id: boat.assigned_captain_id || "",
    });
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
          location_id: formData.location_id || null,
          assigned_captain_id: formData.assigned_captain_id || null,
        })
        .eq("id", editingBoat.id)
        .select("*, location:locations(*), assigned_captain:staff(*)")
        .single();

      if (error) throw error;

      setBoats((prev) =>
        prev.map((b) => (b.id === editingBoat.id ? updatedBoat : b))
      );

      setIsEditDialogOpen(false);
      setEditingBoat(null);
      setFormData(defaultFormData);
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

  // Boat card component for drag and drop
  const BoatCard = ({ boat, compact = false, showCaptainDrop = false }: { boat: Boat; compact?: boolean; showCaptainDrop?: boolean }) => {
    const isDropTarget = dragOverBoat === boat.id;

    return (
      <div
        draggable={!showCaptainDrop}
        onDragStart={(e) => !showCaptainDrop && handleBoatDragStart(e, boat)}
        onDragEnd={handleBoatDragEnd}
        onDragOver={(e) => showCaptainDrop && handleDragOverBoat(e, boat.id)}
        onDragLeave={handleDragLeaveBoat}
        onDrop={(e) => showCaptainDrop && handleDropCaptainOnBoat(e, boat.id)}
        className={cn(
          "group relative bg-white rounded-xl border-2 shadow-sm transition-all duration-200",
          showCaptainDrop ? "cursor-default" : "cursor-grab active:cursor-grabbing",
          "hover:shadow-md hover:scale-[1.02]",
          draggedBoat?.id === boat.id && "opacity-50 scale-95",
          isDropTarget ? "border-violet-500 bg-violet-50 scale-[1.02]" : "border-transparent hover:border-primary/30",
          compact ? "p-3" : "p-4"
        )}
      >
        {/* Drag handle indicator */}
        {!showCaptainDrop && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 transition-opacity">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        )}

        <div className={cn("flex items-start gap-3", compact && "items-center")}>
          {/* Boat emoji/icon */}
          <div className={cn(
            "flex items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-blue-100 text-2xl shrink-0",
            compact ? "h-10 w-10" : "h-14 w-14"
          )}>
            {getBoatEmoji(boat.boat_type)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className={cn("font-semibold truncate", compact ? "text-sm" : "text-base")}>
                  {boat.name}
                </h3>
                {!compact && boat.registration_number && (
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
            <div className={cn("flex items-center gap-2 mt-1.5 flex-wrap", compact && "mt-1")}>
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
            </div>

            {/* Captain badge */}
            {showCaptainDrop && (
              <div className="mt-2">
                {boat.assigned_captain ? (
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
                ) : (
                  <div className={cn(
                    "flex items-center justify-center gap-2 rounded-lg p-2 border-2 border-dashed transition-colors",
                    isDropTarget ? "border-violet-500 bg-violet-100" : "border-muted-foreground/20"
                  )}>
                    <UserCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {isDropTarget ? "Drop captain here!" : "Drag captain here"}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Captain card component
  const CaptainCard = ({ captain }: { captain: Staff }) => {
    const assignedBoat = boats.find((b) => b.assigned_captain_id === captain.id);
    const isAssigned = !!assignedBoat;

    return (
      <div
        draggable={!isAssigned}
        onDragStart={(e) => !isAssigned && handleCaptainDragStart(e, captain)}
        onDragEnd={handleCaptainDragEnd}
        className={cn(
          "group relative rounded-xl border-2 shadow-sm p-3 transition-all duration-200",
          isAssigned
            ? "bg-emerald-50 border-emerald-200 cursor-default"
            : "bg-white border-transparent cursor-grab active:cursor-grabbing hover:shadow-md hover:border-violet-300 hover:scale-[1.02]",
          draggedCaptain?.id === captain.id && "opacity-50 scale-95"
        )}
      >
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={captain.avatar_url || undefined} />
            <AvatarFallback className={cn(
              "font-semibold",
              isAssigned
                ? "bg-emerald-500 text-white"
                : "bg-gradient-to-br from-violet-400 to-purple-500 text-white"
            )}>
              {getCaptainInitials(captain.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{captain.name}</h4>
            <p className="text-xs text-muted-foreground capitalize">{captain.role}</p>
            {isAssigned && (
              <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                On {assignedBoat.name}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            {isAssigned ? (
              <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-300">
                Assigned
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-violet-600 border-violet-300">
                Available
              </Badge>
            )}
          </div>
        </div>
        {/* Drag handle - only show for available captains */}
        {!isAssigned && (
          <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 transition-opacity">
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </div>
        )}
      </div>
    );
  };

  // Location drop zone component
  const LocationZone = ({ location, index }: { location: Location | null; index: number }) => {
    const colorScheme = locationColors[index % locationColors.length];
    const locationId = location?.id || null;
    const boatsInLocation = filteredBoats.filter((b) =>
      location ? b.location_id === location.id : !b.location_id
    );
    const isOver = dragOverLocation === (location?.id || "unassigned");

    return (
      <div
        onDragOver={(e) => handleDragOverLocation(e, locationId)}
        onDragLeave={handleDragLeaveLocation}
        onDrop={(e) => handleDropOnLocation(e, locationId)}
        className={cn(
          "relative rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden",
          location ? colorScheme.border : "border-slate-300",
          isOver && "border-primary border-solid scale-[1.01] shadow-lg",
          !isOver && "hover:border-opacity-70"
        )}
      >
        {/* Background gradient */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-50 transition-opacity",
          location ? colorScheme.bg : "from-slate-100 to-slate-200",
          isOver && "opacity-80"
        )} />

        {/* Water wave animation when dragging over */}
        {isOver && (
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-primary/10 to-transparent animate-pulse" />
          </div>
        )}

        <div className="relative p-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-sm",
              location ? colorScheme.accent : "bg-slate-400"
            )}>
              {location ? <MapPin className="h-5 w-5" /> : <Waves className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-semibold text-base">
                {location?.name || "Unassigned Boats"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {location?.city ? `${location.city}, ${location.state}` : "No location set"}
                {" · "}
                <span className="font-medium">{boatsInLocation.length} boats</span>
              </p>
            </div>
          </div>

          {/* Boats grid */}
          {boatsInLocation.length === 0 ? (
            <div className={cn(
              "py-8 text-center rounded-xl border-2 border-dashed transition-colors",
              isOver ? "border-primary bg-primary/5" : "border-muted-foreground/20"
            )}>
              <Ship className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {isOver ? "Drop boat here!" : "Drag boats here"}
              </p>
            </div>
          ) : (
            <div className="grid gap-2">
              {boatsInLocation.map((boat) => (
                <BoatCard key={boat.id} boat={boat} compact />
              ))}
            </div>
          )}
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

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="location">Home Location</Label>
          <Select
            value={formData.location_id || "none"}
            onValueChange={(value) => setFormData({ ...formData, location_id: value === "none" ? "" : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">🌊 No location</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  <span className="flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    {location.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      </div>

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
              <div key={i} className="h-64 bg-muted rounded-2xl" />
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
          <p className="text-muted-foreground">
            Drag boats to locations or captains to boats
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center border rounded-lg p-1 bg-muted/30">
            <Button
              variant={viewMode === "marina" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("marina")}
              className="gap-1.5"
            >
              <LayoutGrid className="h-4 w-4" />
              Locations
            </Button>
            <Button
              variant={viewMode === "captains" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("captains")}
              className="gap-1.5"
            >
              <UserCircle className="h-4 w-4" />
              Captains
            </Button>
          </div>

          <Button
            className="gap-2 gradient-primary border-0"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Boat
          </Button>
        </div>
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
      ) : viewMode === "marina" ? (
        /* Marina View - Drag boats to locations */
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <GripVertical className="h-4 w-4" />
            Drag boats between locations to reassign them
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Unassigned boats zone */}
            <LocationZone location={null} index={-1} />

            {/* Location zones */}
            {locations.map((location, index) => (
              <LocationZone key={location.id} location={location} index={index} />
            ))}
          </div>
        </div>
      ) : (
        /* Captains View - Drag captains to boats */
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <GripVertical className="h-4 w-4" />
            Drag captains to boats to assign them
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Captains sidebar */}
            <div className="lg:col-span-1">
              <Card className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-violet-500 flex items-center justify-center">
                    <UserCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Captains</h3>
                    <p className="text-xs text-muted-foreground">{captains.length} available</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {captains.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No captains found
                    </p>
                  ) : (
                    captains.map((captain) => (
                      <CaptainCard key={captain.id} captain={captain} />
                    ))
                  )}
                </div>
              </Card>
            </div>

            {/* Boats grid */}
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredBoats.map((boat) => (
                  <BoatCard key={boat.id} boat={boat} showCaptainDrop />
                ))}
              </div>
            </div>
          </div>
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
