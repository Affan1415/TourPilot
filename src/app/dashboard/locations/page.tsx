"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Switch } from "@/components/ui/switch";
import {
  MapPin,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Clock,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Loader2,
  Star,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Location } from "@/types";

const timezones = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
];

interface LocationFormData {
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  timezone: string;
  phone: string;
  email: string;
  description: string;
  parking_info: string;
  is_active: boolean;
  is_primary: boolean;
}

const defaultFormData: LocationFormData = {
  name: "",
  slug: "",
  address: "",
  city: "",
  state: "",
  country: "USA",
  postal_code: "",
  timezone: "America/New_York",
  phone: "",
  email: "",
  description: "",
  parking_info: "",
  is_active: true,
  is_primary: false,
};

export default function LocationsPage() {
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<LocationFormData>(defaultFormData);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .order("is_primary", { ascending: false })
        .order("name", { ascending: true });

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error("Error fetching locations:", error);
      toast.error("Failed to load locations");
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const filteredLocations = locations.filter((location) =>
    location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    location.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    location.state?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: locations.length,
    active: locations.filter((l) => l.is_active).length,
    primary: locations.find((l) => l.is_primary)?.name || "None",
  };

  const handleAddLocation = async () => {
    if (!formData.name) {
      toast.error("Location name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const slug = formData.slug || generateSlug(formData.name);

      // If setting as primary, unset other primaries first
      if (formData.is_primary) {
        await supabase
          .from("locations")
          .update({ is_primary: false })
          .eq("is_primary", true);
      }

      const { data, error } = await supabase
        .from("locations")
        .insert({
          name: formData.name,
          slug,
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || null,
          country: formData.country,
          postal_code: formData.postal_code || null,
          timezone: formData.timezone,
          phone: formData.phone || null,
          email: formData.email || null,
          description: formData.description || null,
          parking_info: formData.parking_info || null,
          is_active: formData.is_active,
          is_primary: formData.is_primary,
        })
        .select()
        .single();

      if (error) throw error;

      setLocations((prev) => {
        const updated = formData.is_primary
          ? prev.map((l) => ({ ...l, is_primary: false }))
          : prev;
        return [data, ...updated];
      });

      setFormData(defaultFormData);
      setIsAddDialogOpen(false);
      toast.success("Location added", { description: `${data.name} has been added.` });
    } catch (error: any) {
      console.error("Error adding location:", error);
      toast.error("Failed to add location", { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      slug: location.slug,
      address: location.address || "",
      city: location.city || "",
      state: location.state || "",
      country: location.country,
      postal_code: location.postal_code || "",
      timezone: location.timezone,
      phone: location.phone || "",
      email: location.email || "",
      description: location.description || "",
      parking_info: location.parking_info || "",
      is_active: location.is_active,
      is_primary: location.is_primary,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingLocation) return;

    setIsSubmitting(true);
    try {
      const supabase = createClient();

      // If setting as primary, unset other primaries first
      if (formData.is_primary && !editingLocation.is_primary) {
        await supabase
          .from("locations")
          .update({ is_primary: false })
          .eq("is_primary", true);
      }

      const { error } = await supabase
        .from("locations")
        .update({
          name: formData.name,
          slug: formData.slug,
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || null,
          country: formData.country,
          postal_code: formData.postal_code || null,
          timezone: formData.timezone,
          phone: formData.phone || null,
          email: formData.email || null,
          description: formData.description || null,
          parking_info: formData.parking_info || null,
          is_active: formData.is_active,
          is_primary: formData.is_primary,
        })
        .eq("id", editingLocation.id);

      if (error) throw error;

      setLocations((prev) =>
        prev.map((l) => {
          if (l.id === editingLocation.id) {
            return { ...l, ...formData };
          }
          if (formData.is_primary && l.is_primary) {
            return { ...l, is_primary: false };
          }
          return l;
        })
      );

      setIsEditDialogOpen(false);
      setEditingLocation(null);
      setFormData(defaultFormData);
      toast.success("Location updated", { description: `${formData.name} has been updated.` });
    } catch (error: any) {
      console.error("Error updating location:", error);
      toast.error("Failed to update location", { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLocation = async (location: Location) => {
    if (location.is_primary) {
      toast.error("Cannot delete primary location", {
        description: "Set another location as primary first.",
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete ${location.name}?`)) {
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.from("locations").delete().eq("id", location.id);

      if (error) throw error;

      setLocations((prev) => prev.filter((l) => l.id !== location.id));
      toast.success("Location deleted", { description: `${location.name} has been removed.` });
    } catch (error: any) {
      console.error("Error deleting location:", error);
      toast.error("Failed to delete location", { description: error.message });
    }
  };

  const renderLocationForm = () => (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Location Name *</Label>
          <Input
            id="name"
            placeholder="e.g., Downtown Marina"
            value={formData.name}
            onChange={(e) => {
              setFormData({
                ...formData,
                name: e.target.value,
                slug: generateSlug(e.target.value),
              });
            }}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="slug">URL Slug</Label>
          <Input
            id="slug"
            placeholder="downtown-marina"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="address">Street Address</Label>
        <Input
          id="address"
          placeholder="123 Harbor Drive"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            placeholder="Miami"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            placeholder="FL"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="postal_code">Postal Code</Label>
          <Input
            id="postal_code"
            placeholder="33101"
            value={formData.postal_code}
            onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select
            value={formData.timezone}
            onValueChange={(value) => setFormData({ ...formData, timezone: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {timezones.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            placeholder="USA"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            placeholder="+1 (555) 123-4567"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="marina@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe this location..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="parking_info">Parking Information</Label>
        <Textarea
          id="parking_info"
          placeholder="Free parking available in lot A..."
          value={formData.parking_info}
          onChange={(e) => setFormData({ ...formData, parking_info: e.target.value })}
          rows={2}
        />
      </div>

      <div className="flex items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-3">
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
          <Label htmlFor="is_active">Active</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            id="is_primary"
            checked={formData.is_primary}
            onCheckedChange={(checked) => setFormData({ ...formData, is_primary: checked })}
          />
          <Label htmlFor="is_primary">Primary Location</Label>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-lg" />
            ))}
          </div>
          <div className="h-64 bg-muted rounded-lg" />
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
            <Globe className="h-6 w-6 text-primary" />
            Locations
          </h1>
          <p className="text-muted-foreground">
            Manage your business locations
          </p>
        </div>

        <Button
          className="gap-2 gradient-primary border-0"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Location
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Locations</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Primary Location</p>
          <p className="text-lg font-semibold truncate">{stats.primary}</p>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search locations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Locations Table */}
      {locations.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">No locations yet</p>
            <p className="text-muted-foreground mb-4">
              Add your first business location to get started.
            </p>
            <Button
              className="gap-2 gradient-primary border-0"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Location
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Timezone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLocations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground">No locations match your search</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLocations.map((location) => (
                  <TableRow key={location.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{location.name}</p>
                            {location.is_primary && (
                              <Badge className="bg-yellow-100 text-yellow-800 gap-1">
                                <Star className="h-3 w-3" />
                                Primary
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{location.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {location.city && location.state ? (
                        <span>{location.city}, {location.state}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {location.phone && (
                          <p className="text-sm flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {location.phone}
                          </p>
                        )}
                        {location.email && (
                          <p className="text-sm flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {location.email}
                          </p>
                        )}
                        {!location.phone && !location.email && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {timezones.find((tz) => tz.value === location.timezone)?.label || location.timezone}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "gap-1",
                          location.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        )}
                      >
                        {location.is_active ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {location.is_active ? "Active" : "Inactive"}
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
                          <DropdownMenuItem onClick={() => handleEditLocation(location)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteLocation(location)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Location
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add Location Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Location</DialogTitle>
            <DialogDescription>Add a new business location.</DialogDescription>
          </DialogHeader>
          {renderLocationForm()}
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
            <Button className="gradient-primary border-0" onClick={handleAddLocation} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Add Location"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Location Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
            <DialogDescription>Update location details.</DialogDescription>
          </DialogHeader>
          {renderLocationForm()}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setFormData(defaultFormData);
                setEditingLocation(null);
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
