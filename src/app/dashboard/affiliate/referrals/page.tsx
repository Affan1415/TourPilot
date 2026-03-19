"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  ArrowLeft,
  Clock,
  CheckCircle,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Referral {
  id: string;
  booking_amount: number;
  discount_given: number;
  commission_amount: number;
  status: "pending" | "confirmed" | "paid" | "cancelled";
  created_at: string;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
  };
  booking: {
    booking_reference: string;
    guest_count: number;
    availability?: {
      date: string;
      tour?: {
        name: string;
      };
    };
  };
}

export default function AffiliateReferralsPage() {
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    has_more: false,
  });

  const fetchReferrals = async (status?: string, offset = 0) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("limit", "20");
      params.set("offset", offset.toString());
      if (status && status !== "all") {
        params.set("status", status);
      }

      const res = await fetch(`/api/affiliates/me/referrals?${params}`);
      if (res.ok) {
        const { data, pagination } = await res.json();
        setReferrals(data || []);
        setPagination(pagination);
      }
    } catch (error) {
      console.error("Error fetching referrals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals(statusFilter);
  }, [statusFilter]);

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
        return (
          <Badge className="bg-gray-100 text-gray-800">Cancelled</Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Calculate stats
  const stats = {
    total: pagination.total,
    pending: referrals.filter((r) => r.status === "pending").length,
    totalCommission: referrals
      .filter((r) => r.status !== "cancelled")
      .reduce((sum, r) => sum + (r.commission_amount || 0), 0),
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/affiliate">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            All Referrals
          </h1>
          <p className="text-muted-foreground">
            View all bookings made through your referral code
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Referrals</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Commission</p>
          <p className="text-2xl font-bold text-emerald-600">
            ${stats.totalCommission.toFixed(2)}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Referrals Table */}
      <Card>
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : referrals.length === 0 ? (
          <div className="p-12 text-center">
            <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No referrals found</h3>
            <p className="text-muted-foreground">
              {statusFilter !== "all"
                ? "Try changing the filter"
                : "Share your QR code to start earning!"}
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Booking Amount</TableHead>
                  <TableHead className="text-right">Discount Given</TableHead>
                  <TableHead className="text-right">Your Commission</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrals.map((referral) => (
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
                      <div>
                        <p className="font-mono text-sm">
                          {referral.booking?.booking_reference}
                        </p>
                        {referral.booking?.availability?.tour?.name && (
                          <p className="text-xs text-muted-foreground">
                            {referral.booking.availability.tour.name}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(referral.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      ${referral.booking_amount?.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      -${referral.discount_given?.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-emerald-600">
                      +${referral.commission_amount?.toFixed(2)}
                    </TableCell>
                    <TableCell>{getStatusBadge(referral.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {(pagination.has_more || pagination.offset > 0) && (
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {pagination.offset + 1} to{" "}
                  {Math.min(pagination.offset + pagination.limit, pagination.total)} of{" "}
                  {pagination.total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchReferrals(statusFilter, pagination.offset - pagination.limit)}
                    disabled={pagination.offset === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchReferrals(statusFilter, pagination.offset + pagination.limit)}
                    disabled={!pagination.has_more}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
