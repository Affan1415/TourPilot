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
  Users,
  QrCode,
  DollarSign,
  TrendingUp,
  Clock,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { AffiliateQRCode } from "@/components/affiliate/AffiliateQRCode";
import { AffiliateStats } from "@/components/affiliate/AffiliateStats";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface AffiliateData {
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
    name: string;
    email: string;
  };
  location: {
    name: string;
  };
  stats: {
    earnings_this_month: number;
    referrals_this_month: number;
    pending_earnings: number;
  };
}

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
  };
  booking: {
    booking_reference: string;
  };
}

export default function AffiliateDashboard() {
  const [loading, setLoading] = useState(true);
  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null);
  const [recentReferrals, setRecentReferrals] = useState<Referral[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch affiliate data
        const affiliateRes = await fetch("/api/affiliates/me");
        if (affiliateRes.ok) {
          const { data } = await affiliateRes.json();
          setAffiliateData(data);
        }

        // Fetch recent referrals
        const referralsRes = await fetch("/api/affiliates/me/referrals?limit=5");
        if (referralsRes.ok) {
          const { data } = await referralsRes.json();
          setRecentReferrals(data || []);
        }
      } catch (error) {
        console.error("Error fetching affiliate data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-lg" />
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="h-80 bg-muted rounded-lg" />
            <div className="h-80 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!affiliateData) {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Affiliate Profile Found</h2>
          <p className="text-muted-foreground">
            Your affiliate profile hasn't been set up yet. Please contact your administrator.
          </p>
        </Card>
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
            Welcome back, {affiliateData.staff.name.split(" ")[0]}!
          </h1>
          <p className="text-muted-foreground">
            Track your referrals and earnings for {affiliateData.location.name}
          </p>
        </div>

        <Badge className="bg-teal-100 text-teal-800 text-sm px-3 py-1">
          Code: {affiliateData.affiliate_code}
        </Badge>
      </div>

      {/* Stats */}
      <AffiliateStats
        totalEarnings={affiliateData.total_earnings}
        earningsThisMonth={affiliateData.stats.earnings_this_month}
        pendingEarnings={affiliateData.stats.pending_earnings}
        totalBookings={affiliateData.total_bookings}
        referralsThisMonth={affiliateData.stats.referrals_this_month}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* QR Code */}
        <AffiliateQRCode
          affiliateCode={affiliateData.affiliate_code}
          locationName={affiliateData.location.name}
          discountValue={affiliateData.discount_value}
          discountType={affiliateData.discount_type}
        />

        {/* Recent Referrals */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent Referrals</h3>
            <Link href="/dashboard/affiliate/referrals">
              <Button variant="ghost" size="sm" className="gap-1">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {recentReferrals.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No referrals yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Share your QR code to start earning!
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentReferrals.map((referral) => (
                  <TableRow key={referral.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {referral.customer?.first_name} {referral.customer?.last_name?.[0]}.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(referral.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${referral.commission_amount?.toFixed(2)}
                    </TableCell>
                    <TableCell>{getStatusBadge(referral.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/dashboard/affiliate/qr-code">
          <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
            <QrCode className="h-8 w-8 text-primary mb-2" />
            <p className="font-medium">QR Code</p>
            <p className="text-sm text-muted-foreground">View & print</p>
          </Card>
        </Link>
        <Link href="/dashboard/affiliate/referrals">
          <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
            <Users className="h-8 w-8 text-blue-600 mb-2" />
            <p className="font-medium">All Referrals</p>
            <p className="text-sm text-muted-foreground">View history</p>
          </Card>
        </Link>
        <Link href="/dashboard/affiliate/earnings">
          <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
            <DollarSign className="h-8 w-8 text-emerald-600 mb-2" />
            <p className="font-medium">Earnings</p>
            <p className="text-sm text-muted-foreground">Detailed breakdown</p>
          </Card>
        </Link>
        <Card className="p-4 bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-200">
          <TrendingUp className="h-8 w-8 text-teal-600 mb-2" />
          <p className="font-medium">Your Rate</p>
          <p className="text-sm text-teal-700">
            {affiliateData.commission_rate}
            {affiliateData.commission_type === "percentage" ? "%" : "$"} per booking
          </p>
        </Card>
      </div>
    </div>
  );
}
