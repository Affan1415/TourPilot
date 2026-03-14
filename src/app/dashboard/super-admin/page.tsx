"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Crown,
  Building2,
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  Globe,
  UserPlus,
  Settings,
  BarChart3,
  Ship,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  Eye,
  Pencil,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import type { Location } from "@/types";

interface LocationStats {
  id: string;
  name: string;
  city: string | null;
  is_primary: boolean;
  status: string;
  bookings_count: number;
  revenue: number;
  guests_count: number;
  tours_count: number;
  staff_count: number;
}

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  location_name: string | null;
  created_at: string;
  status: string;
}

export default function SuperAdminPage() {
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<LocationStats[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [globalStats, setGlobalStats] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    totalGuests: 0,
    totalLocations: 0,
    totalStaff: 0,
    revenueChange: 0,
  });
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    email: "",
    full_name: "",
    role: "location_admin",
    location_id: "",
  });
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const supabase = createClient();
      const now = new Date();
      const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");

      // Fetch locations
      const { data: locationsData } = await supabase
        .from("locations")
        .select("*")
        .order("is_primary", { ascending: false });

      setAvailableLocations(locationsData || []);

      // Fetch bookings with availability data
      const { data: bookings } = await supabase
        .from("bookings")
        .select(`
          id,
          total_price,
          guest_count,
          status,
          created_at,
          availability:availabilities(
            tour:tours(
              location_id
            )
          )
        `)
        .gte("created_at", monthStart)
        .lte("created_at", monthEnd);

      // Fetch tours by location
      const { data: tours } = await supabase
        .from("tours")
        .select("id, location_id, status");

      // Fetch staff by location
      const { data: staff } = await supabase
        .from("staff")
        .select("id, location_id, role, user_id, users(email, raw_user_meta_data)")
        .order("created_at", { ascending: false });

      // Calculate stats per location
      const locationStatsMap: Record<string, LocationStats> = {};

      (locationsData || []).forEach((loc: Location) => {
        locationStatsMap[loc.id] = {
          id: loc.id,
          name: loc.name,
          city: loc.city,
          is_primary: loc.is_primary,
          status: loc.status,
          bookings_count: 0,
          revenue: 0,
          guests_count: 0,
          tours_count: 0,
          staff_count: 0,
        };
      });

      // Count bookings and revenue per location
      (bookings || []).forEach((booking: any) => {
        const locationId = booking.availability?.tour?.location_id;
        if (locationId && locationStatsMap[locationId]) {
          locationStatsMap[locationId].bookings_count += 1;
          locationStatsMap[locationId].revenue += booking.total_price || 0;
          locationStatsMap[locationId].guests_count += booking.guest_count || 0;
        }
      });

      // Count tours per location
      (tours || []).forEach((tour: any) => {
        if (tour.location_id && locationStatsMap[tour.location_id]) {
          locationStatsMap[tour.location_id].tours_count += 1;
        }
      });

      // Count staff per location
      (staff || []).forEach((s: any) => {
        if (s.location_id && locationStatsMap[s.location_id]) {
          locationStatsMap[s.location_id].staff_count += 1;
        }
      });

      const locationStatsList = Object.values(locationStatsMap);
      setLocations(locationStatsList);

      // Calculate global stats
      const totalRevenue = locationStatsList.reduce((sum, l) => sum + l.revenue, 0);
      const totalBookings = locationStatsList.reduce((sum, l) => sum + l.bookings_count, 0);
      const totalGuests = locationStatsList.reduce((sum, l) => sum + l.guests_count, 0);
      const totalStaff = locationStatsList.reduce((sum, l) => sum + l.staff_count, 0);

      setGlobalStats({
        totalRevenue,
        totalBookings,
        totalGuests,
        totalLocations: locationStatsList.length,
        totalStaff,
        revenueChange: 12.5, // Would calculate from last month comparison
      });

      // Build admins list from staff
      const adminsList: AdminUser[] = (staff || [])
        .filter((s: any) => s.role === "admin" || s.role === "super_admin" || s.role === "location_admin")
        .map((s: any) => {
          const location = locationsData?.find((l: Location) => l.id === s.location_id);
          return {
            id: s.id,
            email: s.users?.email || "Unknown",
            full_name: s.users?.raw_user_meta_data?.full_name || s.users?.email?.split("@")[0] || "Unknown",
            role: s.role,
            location_name: location?.name || null,
            created_at: s.created_at,
            status: "active",
          };
        });

      setAdmins(adminsList);
    } catch (error) {
      console.error("Error fetching super admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    // In a real implementation, this would:
    // 1. Create/invite user via Supabase Auth
    // 2. Create staff record with appropriate role
    // For now, just close the dialog
    setShowAddAdmin(false);
    setNewAdmin({ email: "", full_name: "", role: "location_admin", location_id: "" });
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-28 bg-muted rounded-lg" />
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
              <p className="text-muted-foreground">
                Manage all locations, staff, and global settings
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/settings">
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              Global Settings
            </Button>
          </Link>
          <Button className="gap-2 gradient-primary border-0" onClick={() => setShowAddAdmin(true)}>
            <UserPlus className="h-4 w-4" />
            Add Admin
          </Button>
        </div>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${globalStats.totalRevenue.toLocaleString()}</p>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+{globalStats.revenueChange}%</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold">{globalStats.totalBookings}</p>
                <p className="text-xs text-muted-foreground">This month</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Guests</p>
                <p className="text-2xl font-bold">{globalStats.totalGuests}</p>
                <p className="text-xs text-muted-foreground">This month</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Locations</p>
                <p className="text-2xl font-bold">{globalStats.totalLocations}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Staff Members</p>
                <p className="text-2xl font-bold">{globalStats.totalStaff}</p>
                <p className="text-xs text-muted-foreground">Across all locations</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-cyan-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location Performance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Location Performance
          </CardTitle>
          <Link href="/dashboard/locations">
            <Button variant="outline" size="sm">
              Manage Locations
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {locations.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-medium text-lg mb-2">No Locations Yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first location to start managing multi-location operations.
              </p>
              <Link href="/dashboard/locations">
                <Button className="gap-2">
                  <MapPin className="h-4 w-4" />
                  Add Location
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations.map((location) => (
                <Card key={location.id} className="relative hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{location.name}</h3>
                          {location.is_primary && (
                            <Badge variant="secondary" className="text-xs">Primary</Badge>
                          )}
                        </div>
                        {location.city && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {location.city}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={location.status === "active" ? "default" : "secondary"}
                        className={cn(
                          location.status === "active" && "bg-green-100 text-green-800"
                        )}
                      >
                        {location.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Revenue</p>
                        <p className="font-semibold">${location.revenue.toLocaleString()}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Bookings</p>
                        <p className="font-semibold">{location.bookings_count}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Tours</p>
                        <p className="font-semibold">{location.tours_count}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Staff</p>
                        <p className="font-semibold">{location.staff_count}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                      <Link href={`/dashboard/reports?location=${location.id}`}>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <BarChart3 className="h-4 w-4" />
                          Reports
                        </Button>
                      </Link>
                      <Link href={`/dashboard/locations?edit=${location.id}`}>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Users */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Admin Users
          </CardTitle>
          <Button size="sm" className="gap-2" onClick={() => setShowAddAdmin(true)}>
            <UserPlus className="h-4 w-4" />
            Add Admin
          </Button>
        </CardHeader>
        <CardContent>
          {admins.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-medium text-lg mb-2">No Admin Users Yet</h3>
              <p className="text-muted-foreground mb-4">
                Add location admins to delegate management responsibilities.
              </p>
              <Button className="gap-2" onClick={() => setShowAddAdmin(true)}>
                <UserPlus className="h-4 w-4" />
                Add First Admin
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.full_name}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          admin.role === "super_admin" && "bg-amber-100 text-amber-800 border-amber-300",
                          admin.role === "admin" && "bg-blue-100 text-blue-800 border-blue-300",
                          admin.role === "location_admin" && "bg-purple-100 text-purple-800 border-purple-300"
                        )}
                      >
                        {admin.role === "super_admin"
                          ? "Super Admin"
                          : admin.role === "location_admin"
                          ? "Location Admin"
                          : "Admin"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {admin.location_name || (
                        <span className="text-muted-foreground">All Locations</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-800"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Active
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
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit Role
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/dashboard/locations">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Globe className="h-5 w-5" />
                <span>Manage Locations</span>
              </Button>
            </Link>
            <Link href="/dashboard/staff">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Users className="h-5 w-5" />
                <span>Manage Staff</span>
              </Button>
            </Link>
            <Link href="/dashboard/reports">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <BarChart3 className="h-5 w-5" />
                <span>Global Reports</span>
              </Button>
            </Link>
            <Link href="/dashboard/settings">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Settings className="h-5 w-5" />
                <span>System Settings</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Add Admin Dialog */}
      <Dialog open={showAddAdmin} onOpenChange={setShowAddAdmin}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Admin User</DialogTitle>
            <DialogDescription>
              Create a new admin user to manage locations and staff.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="admin-name">Full Name</Label>
              <Input
                id="admin-name"
                placeholder="John Doe"
                value={newAdmin.full_name}
                onChange={(e) => setNewAdmin({ ...newAdmin, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@example.com"
                value={newAdmin.email}
                onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-role">Role</Label>
              <Select
                value={newAdmin.role}
                onValueChange={(value) => setNewAdmin({ ...newAdmin, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin (All Locations)</SelectItem>
                  <SelectItem value="location_admin">Location Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newAdmin.role === "location_admin" && (
              <div className="space-y-2">
                <Label htmlFor="admin-location">Location</Label>
                <Select
                  value={newAdmin.location_id}
                  onValueChange={(value) => setNewAdmin({ ...newAdmin, location_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLocations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAdmin(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAdmin}>
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
