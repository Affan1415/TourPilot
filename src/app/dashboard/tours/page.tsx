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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { format, addDays } from "date-fns";

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
}

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-green-100 text-green-800" },
  draft: { label: "Draft", color: "bg-yellow-100 text-yellow-800" },
  archived: { label: "Archived", color: "bg-gray-100 text-gray-800" },
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
  }>>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [savingSlot, setSavingSlot] = useState(false);
  const [newSlot, setNewSlot] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "09:00",
    endTime: "11:00",
    capacityOverride: "",
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

      const { data, error } = await supabase
        .from('availabilities')
        .select('id, date, start_time, end_time, capacity_override, booked_count')
        .eq('tour_id', tour.id)
        .gte('date', today)
        .order('date')
        .order('start_time');

      if (error) throw error;
      setAvailabilitySlots(data || []);
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

      const { data, error } = await supabase
        .from('availabilities')
        .insert({
          tour_id: selectedTourForAvailability.id,
          date: newSlot.date,
          start_time: newSlot.startTime,
          end_time: newSlot.endTime,
          capacity_override: newSlot.capacityOverride ? parseInt(newSlot.capacityOverride) : null,
          status: 'available',
          booked_count: 0,
        })
        .select()
        .single();

      if (error) throw error;

      setAvailabilitySlots(prev => [...prev, data].sort((a, b) =>
        `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`)
      ));

      // Reset form
      setNewSlot({
        date: format(addDays(new Date(newSlot.date), 1), "yyyy-MM-dd"),
        startTime: newSlot.startTime,
        endTime: newSlot.endTime,
        capacityOverride: "",
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
  const handleEditTour = (tour: Tour) => {
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
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-lg" />
            ))}
          </div>
          <div className="h-96 bg-muted rounded-lg" />
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
            <Ship className="h-6 w-6 text-primary" />
            Tours Management
          </h1>
          <p className="text-muted-foreground">
            Create and manage your tour offerings
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 gradient-primary border-0">
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Ship className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Tours</p>
                <p className="text-xl font-bold">{stats.totalTours}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Eye className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-xl font-bold">{stats.activeTours}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bookings (Month)</p>
                <p className="text-xl font-bold">{stats.totalBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue (Month)</p>
                <p className="text-xl font-bold">${stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tours..."
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
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tours Table */}
      <Card>
        {filteredTours.length === 0 ? (
          <div className="text-center py-16">
            <Ship className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No tours found</p>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "Try a different search term" : "Create your first tour to get started"}
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Tour
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tour</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>This Month</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTours.map((tour) => (
                <TableRow key={tour.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {tour.image ? (
                        <img
                          src={tour.image}
                          alt={tour.name}
                          className="h-12 w-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-12 w-16 rounded-lg bg-muted flex items-center justify-center">
                          <Ship className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{tour.name}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {tour.location || '-'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">${tour.price}</span>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {tour.duration > 0 ? `${tour.duration / 60}h` : '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {tour.maxCapacity}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{tour.bookingsThisMonth} bookings</p>
                      <p className="text-sm text-green-600">${tour.revenue}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{tour.rating || '-'}</span>
                      <span className="text-muted-foreground text-sm">({tour.reviews})</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusConfig[tour.status]?.color}>
                      {statusConfig[tour.status]?.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/tours/${tour.slug}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Tour
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditTour(tour)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleManageAvailability(tour)}>
                          <Calendar className="h-4 w-4 mr-2" />
                          Manage Availability
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/tours/assign-staff?tour=${tour.id}`)}>
                          <Users className="h-4 w-4 mr-2" />
                          Assign Staff
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/reports?tour=${tour.id}`)}>
                          <BarChart3 className="h-4 w-4 mr-2" />
                          View Analytics
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicateTour(tour)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleArchiveTour(tour)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Manage Availability Dialog */}
      <Dialog open={isAvailabilityOpen} onOpenChange={setIsAvailabilityOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Availability - {selectedTourForAvailability?.name}</DialogTitle>
            <DialogDescription>
              Add or remove time slots for this tour
            </DialogDescription>
          </DialogHeader>

          {/* Add new slot form */}
          <div className="border rounded-lg p-4 bg-muted/50">
            <h3 className="font-medium mb-3">Add New Time Slot</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                <Label htmlFor="slot-capacity">Capacity (optional)</Label>
                <Input
                  id="slot-capacity"
                  type="number"
                  placeholder={selectedTourForAvailability?.maxCapacity?.toString() || "Default"}
                  value={newSlot.capacityOverride}
                  onChange={(e) => setNewSlot({ ...newSlot, capacityOverride: e.target.value })}
                />
              </div>
            </div>
            <Button
              className="mt-3 gap-2"
              onClick={handleAddSlot}
              disabled={savingSlot}
            >
              {savingSlot ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Slot
            </Button>
          </div>

          {/* Existing slots */}
          <div className="flex-1 overflow-auto">
            <h3 className="font-medium mb-3">Upcoming Time Slots</h3>
            {loadingSlots ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availabilitySlots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No time slots scheduled</p>
                <p className="text-sm">Add slots above to make this tour available for booking</p>
              </div>
            ) : (
              <div className="space-y-2">
                {availabilitySlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <p className="font-medium">
                          {format(new Date(slot.date), "EEE, MMM d, yyyy")}
                        </p>
                        <p className="text-muted-foreground">
                          {slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}
                        </p>
                      </div>
                      {slot.capacity_override && (
                        <Badge variant="outline">
                          <Users className="h-3 w-3 mr-1" />
                          {slot.capacity_override}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteSlot(slot.id)}
                      className="text-destructive hover:text-destructive"
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Tour</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
            <div className="flex justify-end gap-3 mt-4">
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
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
