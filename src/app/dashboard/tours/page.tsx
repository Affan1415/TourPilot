"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Ship,
  Plus,
  MoreHorizontal,
  Edit,
  Copy,
  Trash2,
  Eye,
  Clock,
  Users,
  DollarSign,
  Calendar,
  MapPin,
  Star,
  BarChart3,
  Settings,
  Image as ImageIcon,
  Loader2,
  X,
  Anchor,
  GripVertical,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { format, addDays } from "date-fns";
import { StatCard } from "@/components/ui/stat-card";
import { IconBox } from "@/components/ui/icon-box";
import type { Boat, TourBoat, TourDefaultSlot } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Tour {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  duration: number;
  price: number;
  maxCapacity: number;
  image: string | null;
  status: string;
  bookingsThisMonth: number;
  revenue: number;
  rating: number;
  reviews: number;
  location: string;
  boatCount: number;
}

// V6 Pastel status variants
const statusConfig: Record<string, { label: string; variant: "mint" | "peach" | "secondary" }> = {
  active: { label: "Active", variant: "mint" },
  draft: { label: "Draft", variant: "peach" },
  archived: { label: "Archived", variant: "secondary" },
};

export default function ToursPage() {
  const [loading, setLoading] = useState(true);
  const [tours, setTours] = useState<Tour[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for new tour
  const [newTour, setNewTour] = useState({
    name: "",
    slug: "",
    description: "",
    price: "",
    duration: "",
    capacity: "",
    location: "",
    status: "draft",
  });

  // State for availability management
  const [selectedTourForAvailability, setSelectedTourForAvailability] = useState<Tour | null>(null);
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);
  const [availabilitySlots, setAvailabilitySlots] = useState<Array<{
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    capacity_override: number | null;
    price_override: number | null;
    boat_id: string | null;
    boat?: Boat | null;
  }>>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [savingSlot, setSavingSlot] = useState(false);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [newSlot, setNewSlot] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "09:00",
    endTime: "11:00",
    capacityOverride: "",
    priceOverride: "",
    boatId: "",
  });

  // State for edit dialog
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    slug: "",
    description: "",
    price: "",
    duration: "",
    capacity: "",
    location: "",
    status: "draft",
  });
  const [editBoats, setEditBoats] = useState<Boat[]>([]); // All available boats
  const [assignedBoatIds, setAssignedBoatIds] = useState<Set<string>>(new Set());
  const [primaryBoatId, setPrimaryBoatId] = useState<string | null>(null);
  const [editSlots, setEditSlots] = useState<TourDefaultSlot[]>([]);
  const [loadingEditData, setLoadingEditData] = useState(false);
  const [newDefaultSlot, setNewDefaultSlot] = useState({
    startTime: "09:00",
    endTime: "11:00",
    priceOverride: "",
    capacityOverride: "",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6] as number[],
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const router = useRouter();

  useEffect(() => {
    const fetchTours = async () => {
      try {
        const supabase = createClient();

        // Fetch tours
        const { data, error } = await supabase
          .from('tours')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching tours:', error);
          return;
        }

        if (data) {
          // Fetch booking stats for each tour through availabilities
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

          const tourIds = data.map(t => t.id);

          // Get availabilities for these tours
          const { data: availData } = await supabase
            .from('availabilities')
            .select('id, tour_id')
            .in('tour_id', tourIds);

          // Get bookings for this month
          const availIds = availData?.map(a => a.id) || [];
          let bookingsByTour: Record<string, { count: number; revenue: number }> = {};

          if (availIds.length > 0) {
            const { data: bookingsData } = await supabase
              .from('bookings')
              .select('availability_id, total_price, created_at')
              .in('availability_id', availIds)
              .gte('created_at', startOfMonth);

            // Map bookings to tours
            const availToTour: Record<string, string> = {};
            availData?.forEach(a => {
              availToTour[a.id] = a.tour_id;
            });

            bookingsData?.forEach(b => {
              const tourId = availToTour[b.availability_id];
              if (tourId) {
                if (!bookingsByTour[tourId]) {
                  bookingsByTour[tourId] = { count: 0, revenue: 0 };
                }
                bookingsByTour[tourId].count++;
                bookingsByTour[tourId].revenue += b.total_price || 0;
              }
            });
          }

          // Try to get boat counts (will fail gracefully if table doesn't exist)
          let boatCounts: Record<string, number> = {};
          try {
            const { data: tourBoatsData } = await supabase
              .from('tour_boats')
              .select('tour_id');
            if (tourBoatsData) {
              tourBoatsData.forEach(tb => {
                boatCounts[tb.tour_id] = (boatCounts[tb.tour_id] || 0) + 1;
              });
            }
          } catch {
            // Table might not exist yet
          }

          setTours(data.map(t => ({
            id: t.id,
            name: t.name || '',
            slug: t.slug || '',
            shortDescription: t.short_description || '',
            duration: t.duration_minutes || 0,
            price: t.base_price || 0,
            maxCapacity: t.max_capacity || 0,
            image: t.images?.[0] || null,
            status: t.status || 'draft',
            bookingsThisMonth: bookingsByTour[t.id]?.count || 0,
            revenue: bookingsByTour[t.id]?.revenue || 0,
            rating: 0,
            reviews: 0,
            location: t.meeting_point || '',
            boatCount: boatCounts[t.id] || 0,
          })));
        }
      } catch (error) {
        console.error('Error fetching tours:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTours();
  }, []);

  const handleCreateTour = async () => {
    if (!newTour.name || !newTour.price) {
      alert("Please fill in at least the tour name and price.");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();

      // Generate slug from name if not provided
      const slug = newTour.slug || newTour.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      const { data, error } = await supabase
        .from('tours')
        .insert({
          name: newTour.name,
          slug: slug,
          short_description: newTour.description,
          base_price: parseFloat(newTour.price) || 0,
          duration_minutes: parseInt(newTour.duration) || 60,
          max_capacity: parseInt(newTour.capacity) || 10,
          meeting_point: newTour.location,
          status: newTour.status,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating tour:', error);
        alert('Failed to create tour: ' + error.message);
        return;
      }

      // Add the new tour to the list
      if (data) {
        setTours(prev => [{
          id: data.id,
          name: data.name,
          slug: data.slug,
          shortDescription: data.short_description || '',
          duration: data.duration_minutes || 0,
          price: data.base_price || 0,
          maxCapacity: data.max_capacity || 0,
          image: data.images?.[0] || null,
          status: data.status || 'draft',
          bookingsThisMonth: 0,
          revenue: 0,
          rating: 0,
          reviews: 0,
          location: data.meeting_point || '',
          boatCount: 0,
        }, ...prev]);
      }

      // Reset form and close dialog
      setNewTour({
        name: "",
        slug: "",
        description: "",
        price: "",
        duration: "",
        capacity: "",
        location: "",
        status: "draft",
      });
      setIsCreateOpen(false);
    } catch (error) {
      console.error('Error creating tour:', error);
      alert('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open availability management
  const handleManageAvailability = async (tour: Tour) => {
    setSelectedTourForAvailability(tour);
    setIsAvailabilityOpen(true);
    setLoadingSlots(true);

    try {
      const supabase = createClient();
      const today = format(new Date(), 'yyyy-MM-dd');

      // Fetch boats and slots in parallel
      const [slotsResult, boatsResult] = await Promise.all([
        supabase
          .from('availabilities')
          .select('id, date, start_time, end_time, capacity_override, price_override, boat_id, booked_count, boat:boats(*)')
          .eq('tour_id', tour.id)
          .gte('date', today)
          .order('date')
          .order('start_time'),
        supabase
          .from('boats')
          .select('*')
          .eq('status', 'active')
          .order('name'),
      ]);

      if (slotsResult.error) throw slotsResult.error;
      // Handle the nested boat relation - Supabase returns object, not array
      const slotsWithBoat = (slotsResult.data || []).map(slot => ({
        ...slot,
        boat: Array.isArray(slot.boat) ? slot.boat[0] || null : slot.boat,
      }));
      setAvailabilitySlots(slotsWithBoat);
      setBoats(boatsResult.data || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Add new availability slot
  const handleAddSlot = async () => {
    if (!selectedTourForAvailability) return;

    setSavingSlot(true);
    try {
      const supabase = createClient();

      const insertData: Record<string, unknown> = {
        tour_id: selectedTourForAvailability.id,
        date: newSlot.date,
        start_time: newSlot.startTime,
        end_time: newSlot.endTime,
        capacity_override: newSlot.capacityOverride ? parseInt(newSlot.capacityOverride) : null,
        price_override: newSlot.priceOverride ? parseFloat(newSlot.priceOverride) : null,
        boat_id: newSlot.boatId || null,
        status: 'available',
        booked_count: 0,
      };

      const { data, error } = await supabase
        .from('availabilities')
        .insert(insertData)
        .select('*, boat:boats(*)')
        .single();

      if (error) throw error;

      setAvailabilitySlots(prev => [...prev, data].sort((a, b) =>
        `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`)
      ));

      // Reset form but keep some values
      setNewSlot({
        date: format(addDays(new Date(newSlot.date), 1), "yyyy-MM-dd"),
        startTime: newSlot.startTime,
        endTime: newSlot.endTime,
        capacityOverride: "",
        priceOverride: newSlot.priceOverride, // Keep price for convenience
        boatId: newSlot.boatId, // Keep boat for convenience
      });
    } catch (error: any) {
      console.error('Error adding slot:', error);
      alert('Failed to add slot: ' + error.message);
    } finally {
      setSavingSlot(false);
    }
  };

  // Delete availability slot
  const handleDeleteSlot = async (slotId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('availabilities')
        .delete()
        .eq('id', slotId);

      if (error) throw error;
      setAvailabilitySlots(prev => prev.filter(s => s.id !== slotId));
    } catch (error: any) {
      console.error('Error deleting slot:', error);
      alert('Failed to delete slot: ' + error.message);
    }
  };

  // Open edit dialog
  const handleEditTour = async (tour: Tour) => {
    setEditingTour(tour);
    setEditForm({
      name: tour.name,
      slug: tour.slug,
      description: tour.shortDescription,
      price: tour.price.toString(),
      duration: tour.duration.toString(),
      capacity: tour.maxCapacity.toString(),
      location: tour.location,
      status: tour.status,
    });
    setIsEditOpen(true);
    setLoadingEditData(true);

    try {
      const supabase = createClient();

      // Fetch boats, assigned boats, and default slots in parallel
      const [boatsResult, tourBoatsResult, slotsResult] = await Promise.all([
        supabase.from('boats').select('*').eq('status', 'active').order('name'),
        supabase.from('tour_boats').select('*, boat:boats(*)').eq('tour_id', tour.id),
        supabase.from('tour_default_slots').select('*').eq('tour_id', tour.id).eq('is_active', true).order('start_time'),
      ]);

      setEditBoats(boatsResult.data || []);

      // Set assigned boats
      const assigned = new Set<string>();
      let primary: string | null = null;
      (tourBoatsResult.data || []).forEach((tb: TourBoat) => {
        assigned.add(tb.boat_id);
        if (tb.is_primary) primary = tb.boat_id;
      });
      setAssignedBoatIds(assigned);
      setPrimaryBoatId(primary);

      // Set default slots
      setEditSlots(slotsResult.data || []);
    } catch (error) {
      console.error('Error loading edit data:', error);
      // Still allow editing basic info
    } finally {
      setLoadingEditData(false);
    }
  };

  // Toggle boat assignment
  const handleToggleBoat = async (boatId: string) => {
    if (!editingTour) return;

    const supabase = createClient();
    const isAssigned = assignedBoatIds.has(boatId);

    try {
      if (isAssigned) {
        // Remove assignment
        await supabase.from('tour_boats').delete().eq('tour_id', editingTour.id).eq('boat_id', boatId);
        setAssignedBoatIds(prev => {
          const next = new Set(prev);
          next.delete(boatId);
          return next;
        });
        if (primaryBoatId === boatId) setPrimaryBoatId(null);
      } else {
        // Add assignment
        const isPrimary = assignedBoatIds.size === 0; // First boat is primary
        await supabase.from('tour_boats').insert({
          tour_id: editingTour.id,
          boat_id: boatId,
          is_primary: isPrimary,
        });
        setAssignedBoatIds(prev => new Set([...prev, boatId]));
        if (isPrimary) setPrimaryBoatId(boatId);
      }
    } catch (error: any) {
      console.error('Error toggling boat:', error);
      // If table doesn't exist, show helpful message
      if (error.code === '42P01') {
        alert('Please run the migration to create the tour_boats table first.');
      }
    }
  };

  // Set primary boat
  const handleSetPrimaryBoat = async (boatId: string) => {
    if (!editingTour || !assignedBoatIds.has(boatId)) return;

    const supabase = createClient();
    try {
      // Remove primary from all
      await supabase.from('tour_boats').update({ is_primary: false }).eq('tour_id', editingTour.id);
      // Set new primary
      await supabase.from('tour_boats').update({ is_primary: true }).eq('tour_id', editingTour.id).eq('boat_id', boatId);
      setPrimaryBoatId(boatId);
    } catch (error) {
      console.error('Error setting primary boat:', error);
    }
  };

  // Add default slot
  const handleAddDefaultSlot = async () => {
    if (!editingTour) return;

    const supabase = createClient();
    try {
      const { data, error } = await supabase.from('tour_default_slots').insert({
        tour_id: editingTour.id,
        start_time: newDefaultSlot.startTime,
        end_time: newDefaultSlot.endTime,
        price_override: newDefaultSlot.priceOverride ? parseFloat(newDefaultSlot.priceOverride) : null,
        capacity_override: newDefaultSlot.capacityOverride ? parseInt(newDefaultSlot.capacityOverride) : null,
        days_of_week: newDefaultSlot.daysOfWeek,
        is_active: true,
      }).select().single();

      if (error) throw error;
      setEditSlots(prev => [...prev, data]);
      setNewDefaultSlot({ startTime: "09:00", endTime: "11:00", priceOverride: "", capacityOverride: "", daysOfWeek: [0, 1, 2, 3, 4, 5, 6] });
    } catch (error: any) {
      console.error('Error adding slot:', error);
      if (error.code === '42P01') {
        alert('Please run the migration to create the tour_default_slots table first.');
      }
    }
  };

  // Delete default slot
  const handleDeleteDefaultSlot = async (slotId: string) => {
    const supabase = createClient();
    try {
      await supabase.from('tour_default_slots').delete().eq('id', slotId);
      setEditSlots(prev => prev.filter(s => s.id !== slotId));
    } catch (error) {
      console.error('Error deleting slot:', error);
    }
  };

  // Toggle day for slot
  const toggleDayForNewSlot = (day: number) => {
    setNewDefaultSlot(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day].sort(),
    }));
  };

  // Save edited tour
  const handleSaveEdit = async () => {
    if (!editingTour) return;

    setIsSubmitting(true);
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('tours')
        .update({
          name: editForm.name,
          slug: editForm.slug,
          short_description: editForm.description,
          base_price: parseFloat(editForm.price) || 0,
          duration_minutes: parseInt(editForm.duration) || 60,
          max_capacity: parseInt(editForm.capacity) || 10,
          meeting_point: editForm.location,
          status: editForm.status,
        })
        .eq('id', editingTour.id);

      if (error) throw error;

      // Update local state
      setTours(prev => prev.map(t =>
        t.id === editingTour.id
          ? {
              ...t,
              name: editForm.name,
              slug: editForm.slug,
              shortDescription: editForm.description,
              price: parseFloat(editForm.price) || 0,
              duration: parseInt(editForm.duration) || 60,
              maxCapacity: parseInt(editForm.capacity) || 10,
              location: editForm.location,
              status: editForm.status,
            }
          : t
      ));

      setIsEditOpen(false);
    } catch (error: any) {
      console.error('Error updating tour:', error);
      alert('Failed to update tour: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Duplicate tour
  const handleDuplicateTour = async (tour: Tour) => {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('tours')
        .insert({
          name: `${tour.name} (Copy)`,
          slug: `${tour.slug}-copy-${Date.now()}`,
          short_description: tour.shortDescription,
          base_price: tour.price,
          duration_minutes: tour.duration,
          max_capacity: tour.maxCapacity,
          meeting_point: tour.location,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      // Add to list
      setTours(prev => [{
        id: data.id,
        name: data.name,
        slug: data.slug,
        shortDescription: data.short_description || '',
        duration: data.duration_minutes || 0,
        price: data.base_price || 0,
        maxCapacity: data.max_capacity || 0,
        image: null,
        status: data.status || 'draft',
        bookingsThisMonth: 0,
        revenue: 0,
        rating: 0,
        reviews: 0,
        location: data.meeting_point || '',
        boatCount: 0,
      }, ...prev]);
    } catch (error: any) {
      console.error('Error duplicating tour:', error);
      alert('Failed to duplicate tour: ' + error.message);
    }
  };

  // Archive tour
  const handleArchiveTour = async (tour: Tour) => {
    if (!confirm(`Are you sure you want to archive "${tour.name}"?`)) return;

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('tours')
        .update({ status: 'archived' })
        .eq('id', tour.id);

      if (error) throw error;

      setTours(prev => prev.map(t =>
        t.id === tour.id ? { ...t, status: 'archived' } : t
      ));
    } catch (error: any) {
      console.error('Error archiving tour:', error);
      alert('Failed to archive tour: ' + error.message);
    }
  };

  const filteredTours = tours.filter((tour) => {
    const matchesSearch =
      tour.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tour.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || tour.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalTours: tours.length,
    activeTours: tours.filter((t) => t.status === "active").length,
    totalRevenue: tours.reduce((acc, t) => acc + t.revenue, 0),
    totalBookings: tours.reduce((acc, t) => acc + t.bookingsThisMonth, 0),
  };

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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tours Management</h1>
          <p className="text-muted-foreground">
            Create and manage your tour offerings
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 gradient-primary border-0 rounded-xl shadow-lg shadow-primary/30">
              <Plus className="h-4 w-4" />
              Create Tour
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Tour</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tour Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Sunset Sailing Cruise"
                    value={newTour.name}
                    onChange={(e) => setNewTour({ ...newTour, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    placeholder="sunset-sailing-cruise"
                    value={newTour.slug}
                    onChange={(e) => setNewTour({ ...newTour, slug: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Short Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description for tour cards..."
                  rows={2}
                  value={newTour.description}
                  onChange={(e) => setNewTour({ ...newTour, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($) *</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="99"
                    value={newTour.price}
                    onChange={(e) => setNewTour({ ...newTour, price: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (min)</Label>
                  <Input
                    id="duration"
                    type="number"
                    placeholder="120"
                    value={newTour.duration}
                    onChange={(e) => setNewTour({ ...newTour, duration: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">Max Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    placeholder="20"
                    value={newTour.capacity}
                    onChange={(e) => setNewTour({ ...newTour, capacity: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Meeting Point</Label>
                  <Input
                    id="location"
                    placeholder="Marina Bay"
                    value={newTour.location}
                    onChange={(e) => setNewTour({ ...newTour, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={newTour.status}
                    onValueChange={(value) => setNewTour({ ...newTour, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tour Image</Label>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Drag and drop an image, or click to browse
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button
                  className="gradient-primary border-0"
                  onClick={handleCreateTour}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create Tour"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* V6 Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <StatCard
          title="Total Tours"
          value={stats.totalTours}
          icon={<Ship className="h-5 w-5" />}
          color="sky"
          className="animate-fade-in-up stagger-1"
        />
        <StatCard
          title="Active"
          value={stats.activeTours}
          icon={<Eye className="h-5 w-5" />}
          color="mint"
          className="animate-fade-in-up stagger-2"
        />
        <StatCard
          title="Bookings (Month)"
          value={stats.totalBookings}
          icon={<Calendar className="h-5 w-5" />}
          color="lavender"
          className="animate-fade-in-up stagger-3"
        />
        <StatCard
          title="Revenue (Month)"
          value={`$${stats.totalRevenue.toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5" />}
          color="peach"
          className="animate-fade-in-up stagger-4"
        />
      </div>

      {/* V6 Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tours..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl border-border focus:border-primary"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] rounded-xl">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* V6 Tours Table */}
      <Card className="rounded-2xl border shadow-sm animate-fade-in-up stagger-5">
        {filteredTours.length === 0 ? (
          <div className="text-center py-16">
            <Ship className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium">No tours found</p>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "Try a different search term" : "Create your first tour to get started"}
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2 gradient-primary border-0 rounded-xl">
              <Plus className="h-4 w-4" />
              Create Tour
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-v6 w-full">
              <thead>
                <tr>
                  <th>Tour</th>
                  <th>Price</th>
                  <th>Duration</th>
                  <th>Capacity</th>
                  <th>Boats</th>
                  <th>This Month</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredTours.map((tour) => (
                  <tr key={tour.id} className="cursor-pointer">
                    <td>
                      <div className="flex items-center gap-3">
                        {tour.image ? (
                          <img
                            src={tour.image}
                            alt={tour.name}
                            className="h-12 w-16 rounded-xl object-cover"
                          />
                        ) : (
                          <IconBox
                            icon={<Ship className="h-5 w-5" />}
                            color="sky"
                            size="lg"
                          />
                        )}
                        <div>
                          <p className="font-medium text-sm">{tour.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {tour.location || '-'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="font-semibold text-sm">${tour.price}</span>
                    </td>
                    <td>
                      <span className="flex items-center gap-1 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {tour.duration > 0 ? `${tour.duration / 60}h` : '-'}
                      </span>
                    </td>
                    <td>
                      <span className="flex items-center gap-1 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {tour.maxCapacity}
                      </span>
                    </td>
                    <td>
                      {tour.boatCount > 0 ? (
                        <Badge variant="secondary" className="gap-1">
                          <Ship className="h-3 w-3" />
                          {tour.boatCount}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </td>
                    <td>
                      <div>
                        <p className="font-medium text-sm">{tour.bookingsThisMonth} bookings</p>
                        <p className="text-xs text-mint-dark">${tour.revenue}</p>
                      </div>
                    </td>
                    <td>
                      <Badge variant={statusConfig[tour.status]?.variant || "secondary"}>
                        {statusConfig[tour.status]?.label}
                      </Badge>
                    </td>
                    <td>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-lg">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem onClick={() => router.push(`/tours/${tour.slug}`)} className="rounded-lg">
                            <Eye className="h-4 w-4 mr-2" />
                            View Tour
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditTour(tour)} className="rounded-lg">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleManageAvailability(tour)} className="rounded-lg">
                            <Calendar className="h-4 w-4 mr-2" />
                            Manage Availability
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/tours/assign-staff?tour=${tour.id}`)} className="rounded-lg">
                            <Users className="h-4 w-4 mr-2" />
                            Assign Staff
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/reports?tour=${tour.id}`)} className="rounded-lg">
                            <BarChart3 className="h-4 w-4 mr-2" />
                            View Analytics
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateTour(tour)} className="rounded-lg">
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive rounded-lg" onClick={() => handleArchiveTour(tour)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Manage Availability Dialog */}
      <Dialog open={isAvailabilityOpen} onOpenChange={setIsAvailabilityOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Manage Time Slots - {selectedTourForAvailability?.name}
            </DialogTitle>
            <DialogDescription>
              Add time slots with custom pricing and boat assignments
            </DialogDescription>
          </DialogHeader>

          {/* Add new slot form */}
          <div className="border rounded-xl p-4 bg-gradient-to-br from-primary/5 to-primary/10">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New Time Slot
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="slot-date">Date</Label>
                <Input
                  id="slot-date"
                  type="date"
                  value={newSlot.date}
                  onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
                  min={format(new Date(), "yyyy-MM-dd")}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="slot-start">Start Time</Label>
                <Input
                  id="slot-start"
                  type="time"
                  value={newSlot.startTime}
                  onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="slot-end">End Time</Label>
                <Input
                  id="slot-end"
                  type="time"
                  value={newSlot.endTime}
                  onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="slot-price">Price Override ($)</Label>
                <Input
                  id="slot-price"
                  type="number"
                  step="0.01"
                  placeholder={`${selectedTourForAvailability?.price || 0} (default)`}
                  value={newSlot.priceOverride}
                  onChange={(e) => setNewSlot({ ...newSlot, priceOverride: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="slot-capacity">Capacity Override</Label>
                <Input
                  id="slot-capacity"
                  type="number"
                  placeholder={`${selectedTourForAvailability?.maxCapacity || 10} (default)`}
                  value={newSlot.capacityOverride}
                  onChange={(e) => setNewSlot({ ...newSlot, capacityOverride: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="slot-boat">Assign Boat</Label>
                <Select
                  value={newSlot.boatId || "none"}
                  onValueChange={(value) => setNewSlot({ ...newSlot, boatId: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select boat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No boat assigned</SelectItem>
                    {boats.map((boat) => (
                      <SelectItem key={boat.id} value={boat.id}>
                        <span className="flex items-center gap-2">
                          <Anchor className="h-3 w-3" />
                          {boat.name} ({boat.capacity} pax)
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              className="mt-4 gap-2 gradient-primary border-0"
              onClick={handleAddSlot}
              disabled={savingSlot}
            >
              {savingSlot ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Time Slot
            </Button>
          </div>

          {/* Existing slots */}
          <div className="flex-1 overflow-auto">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Upcoming Time Slots ({availabilitySlots.length})
            </h3>
            {loadingSlots ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availabilitySlots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl">
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="font-medium">No time slots scheduled</p>
                <p className="text-sm">Add slots above to make this tour available for booking</p>
              </div>
            ) : (
              <div className="space-y-2">
                {availabilitySlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between p-3 border rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="min-w-[140px]">
                        <p className="font-medium text-sm">
                          {format(new Date(slot.date), "EEE, MMM d, yyyy")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {slot.price_override && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
                            <DollarSign className="h-3 w-3 mr-0.5" />
                            {slot.price_override}
                          </Badge>
                        )}
                        {slot.capacity_override && (
                          <Badge variant="outline" className="border-blue-300 text-blue-700">
                            <Users className="h-3 w-3 mr-1" />
                            {slot.capacity_override}
                          </Badge>
                        )}
                        {slot.boat && (
                          <Badge className="bg-violet-100 text-violet-700 border-violet-300">
                            <Anchor className="h-3 w-3 mr-1" />
                            {slot.boat.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteSlot(slot.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAvailabilityOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tour Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Tour - {editingTour?.name}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basic" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="boats">
                Boats
                {assignedBoatIds.size > 0 && (
                  <Badge variant="secondary" className="ml-2">{assignedBoatIds.size}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="slots">
                Time Slots
                {editSlots.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{editSlots.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto py-4">
              {/* Basic Info Tab */}
              <TabsContent value="basic" className="mt-0 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Tour Name *</Label>
                    <Input
                      id="edit-name"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-slug">URL Slug</Label>
                    <Input
                      id="edit-slug"
                      value={editForm.slug}
                      onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Short Description</Label>
                  <Textarea
                    id="edit-description"
                    rows={2}
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-price">Price ($) *</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      value={editForm.price}
                      onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-duration">Duration (min)</Label>
                    <Input
                      id="edit-duration"
                      type="number"
                      value={editForm.duration}
                      onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-capacity">Max Capacity</Label>
                    <Input
                      id="edit-capacity"
                      type="number"
                      value={editForm.capacity}
                      onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-location">Meeting Point</Label>
                    <Input
                      id="edit-location"
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-status">Status</Label>
                    <Select
                      value={editForm.status}
                      onValueChange={(value) => setEditForm({ ...editForm, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              {/* Boats Tab */}
              <TabsContent value="boats" className="mt-0">
                {loadingEditData ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Click on a boat to assign/unassign it. Click the star to set as primary.
                    </p>

                    {editBoats.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed rounded-xl">
                        <Anchor className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                        <p className="font-medium">No boats available</p>
                        <p className="text-sm text-muted-foreground">Add boats in Fleet Management first</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {editBoats.map((boat) => {
                          const isAssigned = assignedBoatIds.has(boat.id);
                          const isPrimary = primaryBoatId === boat.id;

                          return (
                            <div
                              key={boat.id}
                              onClick={() => handleToggleBoat(boat.id)}
                              className={cn(
                                "p-4 rounded-xl border-2 cursor-pointer transition-all",
                                isAssigned
                                  ? "border-primary bg-primary/5 shadow-sm"
                                  : "border-border hover:border-primary/50 hover:bg-muted/50"
                              )}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "h-10 w-10 rounded-lg flex items-center justify-center",
                                    isAssigned ? "bg-primary/20" : "bg-muted"
                                  )}>
                                    <Ship className={cn(
                                      "h-5 w-5",
                                      isAssigned ? "text-primary" : "text-muted-foreground"
                                    )} />
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{boat.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {boat.capacity} passengers • {boat.boat_type || 'Boat'}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isAssigned && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSetPrimaryBoat(boat.id);
                                      }}
                                      className={cn(
                                        "p-1 rounded-full transition-colors",
                                        isPrimary
                                          ? "text-yellow-500"
                                          : "text-muted-foreground hover:text-yellow-500"
                                      )}
                                      title={isPrimary ? "Primary boat" : "Set as primary"}
                                    >
                                      <Star className={cn("h-4 w-4", isPrimary && "fill-current")} />
                                    </button>
                                  )}
                                  <div className={cn(
                                    "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                                    isAssigned ? "border-primary bg-primary" : "border-muted-foreground/30"
                                  )}>
                                    {isAssigned && <Check className="h-3 w-3 text-white" />}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {assignedBoatIds.size > 0 && (
                      <div className="pt-3 border-t">
                        <p className="text-sm font-medium mb-2">
                          Assigned: {assignedBoatIds.size} boat{assignedBoatIds.size !== 1 ? 's' : ''}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {editBoats.filter(b => assignedBoatIds.has(b.id)).map(boat => (
                            <Badge key={boat.id} variant={primaryBoatId === boat.id ? "default" : "secondary"}>
                              {primaryBoatId === boat.id && <Star className="h-3 w-3 mr-1 fill-current" />}
                              {boat.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Time Slots Tab */}
              <TabsContent value="slots" className="mt-0">
                {loadingEditData ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Add new default slot */}
                    <div className="border rounded-xl p-4 bg-gradient-to-br from-primary/5 to-primary/10">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Default Time Slot
                      </h3>
                      <p className="text-xs text-muted-foreground mb-3">
                        Default slots repeat every day. Use exceptions/blackouts for specific dates.
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label>Start Time</Label>
                          <Input
                            type="time"
                            value={newDefaultSlot.startTime}
                            onChange={(e) => setNewDefaultSlot({ ...newDefaultSlot, startTime: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>End Time</Label>
                          <Input
                            type="time"
                            value={newDefaultSlot.endTime}
                            onChange={(e) => setNewDefaultSlot({ ...newDefaultSlot, endTime: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Price Override ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder={editForm.price || "Base price"}
                            value={newDefaultSlot.priceOverride}
                            onChange={(e) => setNewDefaultSlot({ ...newDefaultSlot, priceOverride: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Capacity Override</Label>
                          <Input
                            type="number"
                            placeholder={editForm.capacity || "Max capacity"}
                            value={newDefaultSlot.capacityOverride}
                            onChange={(e) => setNewDefaultSlot({ ...newDefaultSlot, capacityOverride: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="mt-3">
                        <Label className="mb-2 block">Days of Week</Label>
                        <div className="flex gap-2">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                            <button
                              key={day}
                              onClick={() => toggleDayForNewSlot(idx)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                                newDefaultSlot.daysOfWeek.includes(idx)
                                  ? "bg-primary text-white"
                                  : "bg-muted hover:bg-muted/80"
                              )}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>

                      <Button
                        className="mt-4 gap-2 gradient-primary border-0"
                        onClick={handleAddDefaultSlot}
                        disabled={newDefaultSlot.daysOfWeek.length === 0}
                      >
                        <Plus className="h-4 w-4" />
                        Add Slot
                      </Button>
                    </div>

                    {/* Existing slots */}
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Default Slots ({editSlots.length})
                      </h3>

                      {editSlots.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed rounded-xl">
                          <Calendar className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                          <p className="font-medium">No default slots</p>
                          <p className="text-sm text-muted-foreground">Add slots above for recurring availability</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {editSlots.map((slot) => (
                            <div
                              key={slot.id}
                              className="flex items-center justify-between p-3 border rounded-xl hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-4 flex-wrap">
                                <div className="min-w-[100px]">
                                  <p className="font-medium text-sm">
                                    {slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}
                                  </p>
                                </div>
                                <div className="flex gap-1">
                                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                                    <span
                                      key={idx}
                                      className={cn(
                                        "w-6 h-6 rounded-full text-xs flex items-center justify-center",
                                        slot.days_of_week.includes(idx)
                                          ? "bg-primary text-white"
                                          : "bg-muted text-muted-foreground"
                                      )}
                                    >
                                      {day}
                                    </span>
                                  ))}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {slot.price_override && (
                                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
                                      <DollarSign className="h-3 w-3 mr-0.5" />
                                      {slot.price_override}
                                    </Badge>
                                  )}
                                  {slot.capacity_override && (
                                    <Badge variant="outline" className="border-blue-300 text-blue-700">
                                      <Users className="h-3 w-3 mr-1" />
                                      {slot.capacity_override}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteDefaultSlot(slot.id)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              className="gradient-primary border-0"
              onClick={handleSaveEdit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
