"use client";

import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Users, Clock, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AffiliateStatsProps {
  totalEarnings: number;
  earningsThisMonth: number;
  pendingEarnings: number;
  totalBookings: number;
  referralsThisMonth: number;
  growthPercentage?: number;
}

export function AffiliateStats({
  totalEarnings,
  earningsThisMonth,
  pendingEarnings,
  totalBookings,
  referralsThisMonth,
  growthPercentage = 0,
}: AffiliateStatsProps) {
  const stats = [
    {
      label: "Total Earned",
      value: `$${totalEarnings.toFixed(2)}`,
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
    {
      label: "This Month",
      value: `$${earningsThisMonth.toFixed(2)}`,
      icon: growthPercentage >= 0 ? TrendingUp : TrendingDown,
      color: growthPercentage >= 0 ? "text-green-600" : "text-red-600",
      bgColor: growthPercentage >= 0 ? "bg-green-100" : "bg-red-100",
      change: growthPercentage,
    },
    {
      label: "Pending",
      value: `$${pendingEarnings.toFixed(2)}`,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
    },
    {
      label: "Total Referrals",
      value: totalBookings.toString(),
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      subtext: `${referralsThisMonth} this month`,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
              {stat.change !== undefined && (
                <p
                  className={cn(
                    "text-xs font-medium mt-1",
                    stat.change >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {stat.change >= 0 ? "+" : ""}
                  {stat.change.toFixed(1)}% vs last month
                </p>
              )}
              {stat.subtext && (
                <p className="text-xs text-muted-foreground mt-1">{stat.subtext}</p>
              )}
            </div>
            <div className={cn("p-2 rounded-lg", stat.bgColor)}>
              <stat.icon className={cn("h-5 w-5", stat.color)} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

interface EarningsChartProps {
  monthlyBreakdown: Array<{
    month: string;
    year: number;
    earnings: number;
    referrals: number;
  }>;
}

export function EarningsChart({ monthlyBreakdown }: EarningsChartProps) {
  const maxEarnings = Math.max(...monthlyBreakdown.map((m) => m.earnings), 1);

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Earnings Overview</h3>
      <div className="flex items-end gap-2 h-40">
        {monthlyBreakdown.map((month, index) => {
          const height = (month.earnings / maxEarnings) * 100;
          return (
            <div
              key={`${month.month}-${month.year}`}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <span className="text-xs text-muted-foreground">
                ${month.earnings.toFixed(0)}
              </span>
              <div
                className={cn(
                  "w-full rounded-t-md transition-all",
                  index === monthlyBreakdown.length - 1
                    ? "bg-primary"
                    : "bg-primary/30"
                )}
                style={{ height: `${Math.max(height, 4)}%` }}
              />
              <span className="text-xs text-muted-foreground">{month.month}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
