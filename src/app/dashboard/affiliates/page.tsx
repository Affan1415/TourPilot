"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "@/lib/location/context";
import { AffiliateTable, EditAffiliateDialog } from "@/components/affiliate/AffiliateTable";
import { AffiliateQRCode } from "@/components/affiliate/AffiliateQRCode";
import { createClient } from "@/lib/supabase/client";

interface Affiliate {
  id: string;
  affiliate_code: string;
  commission_type: "percentage" | "fixed";
  commission_rate: number;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  total_earnings: number;
  total_bookings: number;
  is_active: boolean;
  staff: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    avatar_url?: string;
  };
  location: {
    id: string;
    name: string;
  };
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AffiliatesManagementPage() {
  const { selectedLocation } = useLocation();
  const [loading, setLoading] = useState(true);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [availableStaff, setAvailableStaff] = useState<StaffMember[]>([]);

  // Add affiliate dialog
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newAffiliate, setNewAffiliate] = useState({
    staff_id: "",
    commission_type: "percentage",
    commission_rate: 10,
    discount_type: "percentage",
    discount_value: 5,
  });

  // Edit affiliate dialog
  const [editingAffiliate, setEditingAffiliate] = useState<Affiliate | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // QR Code dialog
  const [qrAffiliate, setQrAffiliate] = useState<Affiliate | null>(null);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      // Fetch affiliates
      let url = "/api/affiliates";
      if (selectedLocation?.id) {
        url += `?location_id=${selectedLocation.id}`;
      }
      const affiliatesRes = await fetch(url);
      if (affiliatesRes.ok) {
        const { data } = await affiliatesRes.json();
        setAffiliates(data || []);
      }

      // Fetch staff who aren't already affiliates
      let staffQuery = supabase
        .from("staff")
        .select("id, name, email, role")
        .eq("is_active", true)
        .neq("role", "affiliate");

      if (selectedLocation?.id) {
        staffQuery = staffQuery.eq("location_id", selectedLocation.id);
      }

      const { data: staffData } = await staffQuery;
      setAvailableStaff(staffData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedLocation]);

  const handleAddAffiliate = async () => {
    if (!newAffiliate.staff_id) {
      toast.error("Please select a staff member");
      return;
    }

    if (!selectedLocation?.id) {
      toast.error("Please select a location");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/affiliates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newAffiliate,
          location_id: selectedLocation.id,
        }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Failed to create affiliate");
      }

      const { data } = await res.json();
      setAffiliates((prev) => [data, ...prev]);
      setIsAddDialogOpen(false);
      setNewAffiliate({
        staff_id: "",
        commission_type: "percentage",
        commission_rate: 10,
        discount_type: "percentage",
        discount_value: 5,
      });
      toast.success("Affiliate created successfully");

      // Refresh staff list
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to create affiliate");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditAffiliate = async (data: {
    commission_type: "percentage" | "fixed";
    commission_rate: number;
    discount_type: "percentage" | "fixed";
    discount_value: number;
  }) => {
    if (!editingAffiliate) return;

    const res = await fetch(`/api/affiliates/${editingAffiliate.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error || "Failed to update affiliate");
    }

    const { data: updatedAffiliate } = await res.json();
    setAffiliates((prev) =>
      prev.map((a) => (a.id === editingAffiliate.id ? updatedAffiliate : a))
    );
  };

  const handleToggleActive = async (affiliate: Affiliate) => {
    try {
      const res = await fetch(`/api/affiliates/${affiliate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !affiliate.is_active }),
      });

      if (!res.ok) {
        throw new Error("Failed to update affiliate");
      }

      setAffiliates((prev) =>
        prev.map((a) =>
          a.id === affiliate.id ? { ...a, is_active: !a.is_active } : a
        )
      );
      toast.success(
        affiliate.is_active
          ? "Affiliate deactivated"
          : "Affiliate reactivated"
      );
    } catch {
      toast.error("Failed to update affiliate status");
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-lg" />
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
            <Users className="h-6 w-6 text-primary" />
            Affiliates
          </h1>
          <p className="text-muted-foreground">
            Manage affiliate partners and their commission settings
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 gradient-primary border-0">
              <Plus className="h-4 w-4" />
              Add Affiliate
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Affiliate</DialogTitle>
              <DialogDescription>
                Create a new affiliate from an existing staff member.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Staff Member</Label>
                <Select
                  value={newAffiliate.staff_id}
                  onValueChange={(value) =>
                    setNewAffiliate({ ...newAffiliate, staff_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStaff.length === 0 ? (
                      <SelectItem value="" disabled>
                        No staff available
                      </SelectItem>
                    ) : (
                      availableStaff.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.name} ({staff.email})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Commission Type</Label>
                  <Select
                    value={newAffiliate.commission_type}
                    onValueChange={(value) =>
                      setNewAffiliate({ ...newAffiliate, commission_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Commission Rate</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={newAffiliate.commission_rate}
                      onChange={(e) =>
                        setNewAffiliate({
                          ...newAffiliate,
                          commission_rate: parseFloat(e.target.value),
                        })
                      }
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {newAffiliate.commission_type === "percentage" ? "%" : "$"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Customer Discount Type</Label>
                  <Select
                    value={newAffiliate.discount_type}
                    onValueChange={(value) =>
                      setNewAffiliate({ ...newAffiliate, discount_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Discount Value</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={newAffiliate.discount_value}
                      onChange={(e) =>
                        setNewAffiliate({
                          ...newAffiliate,
                          discount_value: parseFloat(e.target.value),
                        })
                      }
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {newAffiliate.discount_type === "percentage" ? "%" : "$"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddAffiliate}
                disabled={isSubmitting}
                className="gradient-primary border-0"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Affiliate"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Affiliates Table */}
      {affiliates.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-2">No Affiliates Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first affiliate to start the referral program.
          </p>
          <Button
            className="gap-2 gradient-primary border-0"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Affiliate
          </Button>
        </Card>
      ) : (
        <AffiliateTable
          affiliates={affiliates}
          onEdit={(affiliate) => {
            setEditingAffiliate(affiliate);
            setIsEditDialogOpen(true);
          }}
          onView={(affiliate) => {
            window.location.href = `/dashboard/affiliates/${affiliate.id}`;
          }}
          onDeactivate={handleToggleActive}
          onViewQR={(affiliate) => {
            setQrAffiliate(affiliate);
            setIsQrDialogOpen(true);
          }}
        />
      )}

      {/* Edit Dialog */}
      <EditAffiliateDialog
        affiliate={editingAffiliate}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={handleEditAffiliate}
      />

      {/* QR Code Dialog */}
      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Affiliate QR Code</DialogTitle>
            <DialogDescription>
              {qrAffiliate?.staff.name}'s referral QR code
            </DialogDescription>
          </DialogHeader>
          {qrAffiliate && (
            <AffiliateQRCode
              affiliateCode={qrAffiliate.affiliate_code}
              locationName={qrAffiliate.location.name}
              discountValue={qrAffiliate.discount_value}
              discountType={qrAffiliate.discount_type}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
