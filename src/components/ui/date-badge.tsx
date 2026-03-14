"use client";

import { cn } from "@/lib/utils";

interface DateBadgeProps {
  date: Date;
  className?: string;
}

export function DateBadge({ date, className }: DateBadgeProps) {
  const day = date.getDate();
  const month = date.toLocaleString("default", { month: "short" });

  return (
    <div className={cn("date-badge", className)}>
      <span className="day">{day}</span>
      <span className="month">{month}</span>
    </div>
  );
}
