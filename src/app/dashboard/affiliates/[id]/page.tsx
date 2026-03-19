"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Users,
  ArrowLeft,
  Mail,
  Phone,
  DollarSign,
  Clock,
  CheckCircle,
  QrCode,
  Edit,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { AffiliateQRCode } from "@/components/affiliate/AffiliateQRCode";
import { EditAffiliateDialog } from "@/components/affiliate/AffiliateTable";

interface AffiliateDetails {
  id: string;
  affiliate_code: string;
  commission_type: "percentage" | "fixed";
  commission_rate: number;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  total_earnings: number;
  total_bookings: number;
  is_active: boolean;
  created_at: string;
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
  referrals: Array<{
    id: string;
    booking_amount: number;
    discount_given: number;
    commission_amount: number;
    status: string;
    created_at: string;
    booking?: {
      booking_reference: string;
      guest_count: number;
    };
    customer?: {
      first_name: string;
      last_name: string;
      email: string;
    };
  }>;
}

export default function AffiliateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [affiliate, setAffiliate] = useState<AffiliateDetails | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    const fetchAffiliate = async () => {
      try {
        const res = await fetch(`/api/affiliates/${id}`);
        if (res.ok) {
          const { data } = await res.json();
          setAffiliate(data);
        }
      } catch (error) {
        console.error("Error fetching affiliate:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAffiliate();
  }, [id]);

  const handleSaveEdit = async (data: {
    commission_type: "percentage" | "fixed";
    commission_rate: number;
    discount_type: "percentage" | "fixed";
    discount_value: number;
  }) => {
    const res = await fetch(`/api/affiliates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      throw new Error("Failed to update affiliate");
    }

    const { data: updatedAffiliate } = await res.json();
    setAffiliate((prev) =>
      prev ? { ...prev, ...updatedAffiliate } : null
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "confirmed":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Confirmed
          </Badge>
        );
      case "paid":
        return (
          <Badge className="bg-green-100 text-green-800">
            <DollarSign className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        );
      case "cancelled":
        return <Badge className="bg-gray-100 text-gray-800">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="h-48 bg-muted rounded-lg" />
            <div className="lg:col-span-2 h-48 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Affiliate Not Found</h2>
          <Link href="/dashboard/affiliates">
            <Button variant="outline">Back to Affiliates</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const stats = {
    totalReferrals: affiliate.referrals?.length || 0,
    pendingCommission: affiliate.referrals
      ?.filter((r) => r.status === "pending")
      .reduce((sum, r) => sum + (r.commission_amount || 0), 0) || 0,
    confirmedCommission: affiliate.referrals
      ?.filter((r) => r.status === "confirmed")
      .reduce((sum, r) => sum + (r.commission_amount || 0), 0) || 0,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/affiliates">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Affiliate Details</h1>
          <p className="text-muted-foreground">{affiliate.affiliate_code}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setShowQR(!showQR)}>
            <QrCode className="h-4 w-4" />
            {showQR ? "Hide" : "Show"} QR Code
          </Button>
          <Button className="gap-2" onClick={() => setIsEditDialogOpen(true)}>
            <Edit className="h-4 w-4" />
            Edit Settings
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="p-6">
          <div className="text-center mb-4">
            <Avatar className="h-20 w-20 mx-auto mb-3">
              <AvatarImage src={affiliate.staff.avatar_url} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {affiliate.staff.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-xl font-semibold">{affiliate.staff.name}</h3>
            <Badge
              className={cn(
                "mt-2",
                affiliate.is_active
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              )}
            >
              {affiliate.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              {affiliate.staff.email}
            </div>
            {affiliate.staff.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {affiliate.staff.phone}
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location</span>
              <span>{affiliate.location.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Commission</span>
              <span>
                {affiliate.commission_rate}
                {affiliate.commission_type === "percentage" ? "%" : "$"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer Discount</span>
              <span>
                {affiliate.discount_value}
                {affiliate.discount_type === "percentage" ? "%" : "$"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Joined</span>
              <span>{format(new Date(affiliate.created_at), "MMM d, yyyy")}</span>
            </div>
          </div>
        </Card>

        {/* Stats & QR */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Total Earnings</p>
              <p className="text-2xl font-bold text-emerald-600">
                ${affiliate.total_earnings.toFixed(2)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Total Referrals</p>
              <p className="text-2xl font-bold">{affiliate.total_bookings}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-amber-600">
                ${stats.pendingCommission.toFixed(2)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Confirmed</p>
              <p className="text-2xl font-bold text-blue-600">
                ${stats.confirmedCommission.toFixed(2)}
              </p>
            </Card>
          </div>

          {/* QR Code (collapsible) */}
          {showQR && (
            <AffiliateQRCode
              affiliateCode={affiliate.affiliate_code}
              locationName={affiliate.location.name}
              discountValue={affiliate.discount_value}
              discountType={affiliate.discount_type}
            />
          )}
        </div>
      </div>

      {/* Referrals Table */}
      <Card>
        <div className="p-4 border-b">
          <h3 className="font-semibold">Referral History</h3>
        </div>
        {!affiliate.referrals || affiliate.referrals.length === 0 ? (
          <div className="p-12 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No referrals yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Booking</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {affiliate.referrals.map((referral) => (
                <TableRow key={referral.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {referral.customer?.first_name} {referral.customer?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {referral.customer?.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="bg-muted px-2 py-1 rounded text-sm">
                      {referral.booking?.booking_reference}
                    </code>
                  </TableCell>
                  <TableCell>
                    {format(new Date(referral.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    ${referral.booking_amount?.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-emerald-600">
                    +${referral.commission_amount?.toFixed(2)}
                  </TableCell>
                  <TableCell>{getStatusBadge(referral.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Edit Dialog */}
      <EditAffiliateDialog
        affiliate={affiliate}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
