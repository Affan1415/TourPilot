"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DialogTrigger,
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
  UserCog,
  Plus,
  Search,
  MoreHorizontal,
  Mail,
  Phone,
  Calendar,
  Shield,
  Edit,
  Trash2,
  Clock,
  CheckCircle2,
  Loader2,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useLocation } from "@/lib/location/context";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  certifications: string[];
  rating: number | null;
  avatar: string | null;
  location_id: string | null;
}

const roleConfig: Record<string, { label: string; color: string }> = {
  admin: { label: "Admin", color: "bg-red-100 text-red-800" },
  location_manager: { label: "Location Manager", color: "bg-amber-100 text-amber-800" },
  captain: { label: "Captain", color: "bg-blue-100 text-blue-800" },
  front_desk: { label: "Front Desk", color: "bg-emerald-100 text-emerald-800" },
  // Legacy roles for backwards compatibility
  manager: { label: "Manager", color: "bg-amber-100 text-amber-800" },
  guide: { label: "Guide", color: "bg-purple-100 text-purple-800" },
};

export default function StaffPage() {
  const { selectedLocation } = useLocation();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: "",
    email: "",
    phone: "",
    role: "front_desk",
  });
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient();

        // Fetch staff from staff table - filtered by selected location
        let staffQuery = supabase
          .from('staff')
          .select('*')
          .order('created_at', { ascending: false });

        // Filter by location if one is selected
        if (selectedLocation?.id) {
          staffQuery = staffQuery.eq('location_id', selectedLocation.id);
        }

        const { data: staffData } = await staffQuery;

        if (staffData) {
          setStaffMembers(staffData.map((s: any) => ({
            id: s.id,
            name: s.name || 'Unknown',
            email: s.email || '',
            phone: s.phone || '',
            role: s.role || 'guide',
            status: s.is_active ? 'active' : 'inactive',
            certifications: [],
            rating: null,
            avatar: s.avatar_url || null,
            location_id: s.location_id || null,
          })));
        }
      } catch (error) {
        console.error('Error fetching staff:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedLocation]);

  const filteredStaff = staffMembers.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: staffMembers.length,
    active: staffMembers.filter((s) => s.status === "active").length,
    captains: staffMembers.filter((s) => s.role === "captain").length,
    frontDesk: staffMembers.filter((s) => s.role === "front_desk").length,
  };

  const handleAddStaff = async () => {
    if (!newStaff.name || !newStaff.email) {
      toast.error("Missing fields", { description: "Please fill in name and email." });
      return;
    }

    if (!selectedLocation?.id) {
      toast.error("No location selected", { description: "Please select a location first." });
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('staff')
        .insert({
          name: newStaff.name,
          email: newStaff.email,
          phone: newStaff.phone || null,
          role: newStaff.role,
          is_active: true,
          location_id: selectedLocation.id,
        })
        .select()
        .single();

      if (error) throw error;

      setStaffMembers(prev => [{
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        role: data.role,
        status: 'active',
        certifications: [],
        rating: null,
        avatar: null,
        location_id: data.location_id,
      }, ...prev]);

      setNewStaff({ name: "", email: "", phone: "", role: "front_desk" });
      setIsAddDialogOpen(false);
      toast.success("Staff member added", { description: `${data.name} has been added to the team.` });
    } catch (error: any) {
      console.error('Error adding staff:', error);
      toast.error("Failed to add staff", { description: error.message || 'An error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditStaff = (member: StaffMember) => {
    setEditingStaff(member);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingStaff) return;

    setIsSubmitting(true);
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('staff')
        .update({
          name: editingStaff.name,
          email: editingStaff.email,
          phone: editingStaff.phone || null,
          role: editingStaff.role,
          is_active: editingStaff.status === 'active',
        })
        .eq('id', editingStaff.id);

      if (error) throw error;

      setStaffMembers(prev => prev.map(s =>
        s.id === editingStaff.id ? editingStaff : s
      ));

      setIsEditDialogOpen(false);
      setEditingStaff(null);
      toast.success("Staff updated", { description: `${editingStaff.name}'s details have been updated.` });
    } catch (error: any) {
      console.error('Error updating staff:', error);
      toast.error("Failed to update staff", { description: error.message || 'An error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewSchedule = (member: StaffMember) => {
    window.location.href = `/dashboard/calendar?staff=${member.id}`;
  };

  const handleViewCertifications = (member: StaffMember) => {
    toast.info("Certifications", { description: `${member.name}'s certifications - Feature coming soon.` });
  };

  const handleRemoveStaff = async (member: StaffMember) => {
    if (!confirm(`Are you sure you want to remove ${member.name} from the staff?`)) return;

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('staff')
        .update({ is_active: false })
        .eq('id', member.id);

      if (error) throw error;

      setStaffMembers(prev => prev.map(s =>
        s.id === member.id ? { ...s, status: 'inactive' } : s
      ));

      toast.success("Staff member removed", { description: `${member.name} has been deactivated.` });
    } catch (error: any) {
      console.error('Error removing staff:', error);
      toast.error("Failed to remove staff", { description: error.message || 'An error occurred' });
    }
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
          <div className="h-10 bg-muted rounded" />
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
            <UserCog className="h-6 w-6 text-primary" />
            Staff Management
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            {selectedLocation ? (
              <>
                <MapPin className="h-4 w-4" />
                {selectedLocation.name}
              </>
            ) : (
              "Manage your team members and their assignments"
            )}
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 gradient-primary border-0">
              <Plus className="h-4 w-4" />
              Add Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Staff Member</DialogTitle>
              <DialogDescription>
                Add a new team member to your staff roster.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter full name"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="+1 555-000-0000"
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={newStaff.role}
                  onValueChange={(value) => setNewStaff({ ...newStaff, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="location_manager">Location Manager</SelectItem>
                    <SelectItem value="front_desk">Front Desk</SelectItem>
                    <SelectItem value="captain">Captain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button className="gradient-primary border-0" onClick={handleAddStaff} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Staff Member"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Staff Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Staff Member</DialogTitle>
              <DialogDescription>
                Update staff details and role assignments.
              </DialogDescription>
            </DialogHeader>
            {editingStaff && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input
                    id="edit-name"
                    value={editingStaff.name}
                    onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editingStaff.email}
                      onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input
                      id="edit-phone"
                      value={editingStaff.phone}
                      onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-role">Role</Label>
                    <Select
                      value={editingStaff.role}
                      onValueChange={(value) => setEditingStaff({ ...editingStaff, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="location_manager">Location Manager</SelectItem>
                        <SelectItem value="front_desk">Front Desk</SelectItem>
                        <SelectItem value="captain">Captain</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-status">Status</Label>
                    <Select
                      value={editingStaff.status}
                      onValueChange={(value) => setEditingStaff({ ...editingStaff, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
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

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Staff</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Captains</p>
          <p className="text-2xl font-bold text-blue-600">{stats.captains}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Front Desk</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.frontDesk}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="location_manager">Location Manager</SelectItem>
            <SelectItem value="front_desk">Front Desk</SelectItem>
            <SelectItem value="captain">Captain</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Staff Table */}
      {staffMembers.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <UserCog className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">No staff members yet</p>
            <p className="text-muted-foreground mb-4">
              Add your first team member to get started with staff management.
            </p>
            <Button className="gap-2 gradient-primary border-0" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Staff Member
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-muted-foreground">No staff members match your search</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStaff.map((member) => (
                  <TableRow key={member.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {member.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          {member.rating && (
                            <p className="text-sm text-muted-foreground">
                              ⭐ {member.rating} rating
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={roleConfig[member.role]?.color || "bg-gray-100 text-gray-800"}>
                        {roleConfig[member.role]?.label || member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm flex items-center gap-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {member.email}
                        </p>
                        {member.phone && (
                          <p className="text-sm flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {member.phone}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          member.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        )}
                      >
                        {member.status === "active" ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : (
                          <Clock className="h-3 w-3 mr-1" />
                        )}
                        {member.status === "active" ? "Active" : "Inactive"}
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
                          <DropdownMenuItem onClick={() => handleEditStaff(member)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewSchedule(member)}>
                            <Calendar className="h-4 w-4 mr-2" />
                            View Schedule
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewCertifications(member)}>
                            <Shield className="h-4 w-4 mr-2" />
                            Certifications
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleRemoveStaff(member)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove Staff
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
    </div>
  );
}
