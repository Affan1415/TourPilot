"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { EarningsChart } from "@/components/affiliate/AffiliateStats";

interface EarningsData {
  total_earnings: number;
  total_bookings: number;
  earnings_this_month: number;
  earnings_last_month: number;
  growth_percentage: number;
  pending_earnings: number;
  confirmed_earnings: number;
  paid_earnings: number;
  referrals_this_month: number;
  referrals_last_month: number;
  monthly_breakdown: Array<{
    month: string;
    year: number;
    earnings: number;
    referrals: number;
  }>;
}

export default function AffiliateEarningsPage() {
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState<EarningsData | null>(null);

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const res = await fetch("/api/affiliates/me/earnings");
        if (res.ok) {
          const { data } = await res.json();
          setEarnings(data);
        }
      } catch (error) {
        console.error("Error fetching earnings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEarnings();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-lg" />
            ))}
          </div>
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (!earnings) {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <DollarSign className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Earnings Data</h2>
          <p className="text-muted-foreground">
            Start referring customers to see your earnings here.
          </p>
        </Card>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Earnings",
      value: `$${earnings.total_earnings.toFixed(2)}`,
      icon: Wallet,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
      description: `${earnings.total_bookings} total referrals`,
    },
    {
      label: "This Month",
      value: `$${earnings.earnings_this_month.toFixed(2)}`,
      icon: earnings.growth_percentage >= 0 ? TrendingUp : TrendingDown,
      color: earnings.growth_percentage >= 0 ? "text-green-600" : "text-red-600",
      bgColor: earnings.growth_percentage >= 0 ? "bg-green-100" : "bg-red-100",
      description: `${earnings.growth_percentage >= 0 ? "+" : ""}${earnings.growth_percentage}% vs last month`,
    },
    {
      label: "Pending Payout",
      value: `$${earnings.pending_earnings.toFixed(2)}`,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
      description: "Awaiting confirmation",
    },
    {
      label: "Confirmed",
      value: `$${earnings.confirmed_earnings.toFixed(2)}`,
      icon: CheckCircle,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      description: "Ready for payout",
    },
  ];

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
            <DollarSign className="h-6 w-6 text-primary" />
            Earnings
          </h1>
          <p className="text-muted-foreground">
            Track your commission earnings and payouts
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </div>
              <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Earnings Chart */}
      <EarningsChart monthlyBreakdown={earnings.monthly_breakdown} />

      {/* Monthly Breakdown Table */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Monthly Breakdown</h3>
        <div className="space-y-3">
          {earnings.monthly_breakdown.map((month, index) => (
            <div
              key={`${month.month}-${month.year}`}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg",
                index === earnings.monthly_breakdown.length - 1
                  ? "bg-primary/5 border border-primary/20"
                  : "bg-muted/50"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    index === earnings.monthly_breakdown.length - 1
                      ? "bg-primary"
                      : "bg-muted-foreground/30"
                  )}
                />
                <div>
                  <p className="font-medium">
                    {month.month} {month.year}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {month.referrals} referrals
                  </p>
                </div>
              </div>
              <p className="font-semibold text-emerald-600">
                ${month.earnings.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Payout Info */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <h3 className="font-semibold mb-2">Payout Information</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Commissions are paid out monthly after bookings are confirmed and completed.
          Contact your administrator for payout details.
        </p>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <span>Pending - Awaiting booking completion</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-400" />
            <span>Confirmed - Ready for payout</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span>Paid - Commission paid</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
