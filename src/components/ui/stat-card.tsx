"use client";

import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown } from "lucide-react";
import { ReactNode } from "react";

type ColorVariant = "mint" | "lavender" | "peach" | "sky" | "rose";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: ColorVariant;
  className?: string;
}

const colorClasses: Record<ColorVariant, { bg: string; iconBg: string; iconColor: string }> = {
  mint: {
    bg: "bg-mint",
    iconBg: "bg-white",
    iconColor: "text-mint-dark",
  },
  lavender: {
    bg: "bg-lavender",
    iconBg: "bg-white",
    iconColor: "text-lavender-dark",
  },
  peach: {
    bg: "bg-peach",
    iconBg: "bg-white",
    iconColor: "text-peach-dark",
  },
  sky: {
    bg: "bg-sky",
    iconBg: "bg-white",
    iconColor: "text-sky-dark",
  },
  rose: {
    bg: "bg-rose",
    iconBg: "bg-white",
    iconColor: "text-rose-dark",
  },
};

export function StatCard({
  title,
  value,
  icon,
  trend,
  color = "mint",
  className,
}: StatCardProps) {
  const colors = colorClasses[color];

  return (
    <div
      className={cn(
        "stat-card animate-fade-in-up",
        colors.bg,
        className
      )}
    >
      <div className="flex justify-between items-start mb-5">
        <div>
          <div className="text-xl font-bold text-foreground">{value}</div>
          <div className="text-sm text-muted-foreground mt-0.5">{title}</div>
        </div>
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="8" cy="3" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="8" cy="13" r="1.5" />
          </svg>
        </button>
      </div>

      <div className="flex justify-between items-center mt-auto">
        <div
          className={cn(
            "w-10 h-10 rounded-[10px] flex items-center justify-center",
            colors.iconBg,
            colors.iconColor
          )}
        >
          {icon}
        </div>

        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 text-sm font-medium",
              trend.isPositive ? "text-mint-dark" : "text-rose-dark"
            )}
          >
            {trend.isPositive ? (
              <ArrowUp className="w-3 h-3" />
            ) : (
              <ArrowDown className="w-3 h-3" />
            )}
            {trend.isPositive ? "+" : ""}
            {trend.value}%
          </div>
        )}
      </div>
    </div>
  );
}
