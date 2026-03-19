"use client";

import { useState } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  MoreHorizontal,
  Edit,
  Eye,
  Trash2,
  QrCode,
  DollarSign,
  Users,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

interface AffiliateTableProps {
  affiliates: Affiliate[];
  onEdit?: (affiliate: Affiliate) => void;
  onView?: (affiliate: Affiliate) => void;
  onDeactivate?: (affiliate: Affiliate) => void;
  onViewQR?: (affiliate: Affiliate) => void;
}

export function AffiliateTable({
  affiliates,
  onEdit,
  onView,
  onDeactivate,
  onViewQR,
}: AffiliateTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const filteredAffiliates = affiliates.filter((affiliate) => {
    const matchesSearch =
      affiliate.staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      affiliate.staff.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      affiliate.affiliate_code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && affiliate.is_active) ||
      (statusFilter === "inactive" && !affiliate.is_active);

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: affiliates.length,
    active: affiliates.filter((a) => a.is_active).length,
    totalEarnings: affiliates.reduce((sum, a) => sum + a.total_earnings, 0),
  };

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Affiliates</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Paid Out</p>
          <p className="text-2xl font-bold text-emerald-600">
            ${stats.totalEarnings.toFixed(2)}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Affiliate</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-center">Referrals</TableHead>
              <TableHead className="text-right">Earnings</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAffiliates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <p className="text-muted-foreground">No affiliates found</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredAffiliates.map((affiliate) => (
                <TableRow key={affiliate.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={affiliate.staff.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {affiliate.staff.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{affiliate.staff.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {affiliate.staff.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="bg-muted px-2 py-1 rounded text-sm">
                      {affiliate.affiliate_code}
                    </code>
                  </TableCell>
                  <TableCell>{affiliate.location.name}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {affiliate.total_bookings}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${affiliate.total_earnings.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {affiliate.commission_rate}
                      {affiliate.commission_type === "percentage" ? "%" : "$"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        affiliate.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      )}
                    >
                      {affiliate.is_active ? "Active" : "Inactive"}
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
                        <DropdownMenuItem onClick={() => onView?.(affiliate)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onViewQR?.(affiliate)}>
                          <QrCode className="h-4 w-4 mr-2" />
                          View QR Code
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit?.(affiliate)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onDeactivate?.(affiliate)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {affiliate.is_active ? "Deactivate" : "Reactivate"}
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
    </div>
  );
}

interface EditAffiliateDialogProps {
  affiliate: Affiliate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    commission_type: "percentage" | "fixed";
    commission_rate: number;
    discount_type: "percentage" | "fixed";
    discount_value: number;
  }) => Promise<void>;
}

export function EditAffiliateDialog({
  affiliate,
  open,
  onOpenChange,
  onSave,
}: EditAffiliateDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    commission_type: affiliate?.commission_type || "percentage",
    commission_rate: affiliate?.commission_rate || 10,
    discount_type: affiliate?.discount_type || "percentage",
    discount_value: affiliate?.discount_value || 5,
  });

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await onSave(formData as {
        commission_type: "percentage" | "fixed";
        commission_rate: number;
        discount_type: "percentage" | "fixed";
        discount_value: number;
      });
      onOpenChange(false);
      toast.success("Affiliate settings updated");
    } catch {
      toast.error("Failed to update affiliate");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Affiliate Settings</DialogTitle>
          <DialogDescription>
            Update commission and discount settings for {affiliate?.staff.name}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Commission Type</Label>
              <Select
                value={formData.commission_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, commission_type: value as "percentage" | "fixed" })
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
                  value={formData.commission_rate}
                  onChange={(e) =>
                    setFormData({ ...formData, commission_rate: parseFloat(e.target.value) })
                  }
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {formData.commission_type === "percentage" ? "%" : "$"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Customer Discount Type</Label>
              <Select
                value={formData.discount_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, discount_type: value as "percentage" | "fixed" })
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
                  value={formData.discount_value}
                  onChange={(e) =>
                    setFormData({ ...formData, discount_value: parseFloat(e.target.value) })
                  }
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {formData.discount_type === "percentage" ? "%" : "$"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting} className="gradient-primary border-0">
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
  );
}
