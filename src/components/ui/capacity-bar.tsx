"use client";

import { cn } from "@/lib/utils";

interface CapacityBarProps {
  current: number;
  max: number;
  showText?: boolean;
  className?: string;
}

export function CapacityBar({
  current,
  max,
  showText = true,
  className,
}: CapacityBarProps) {
  const percentage = Math.round((current / max) * 100);

  // Determine capacity level
  let level: "high" | "medium" | "low";
  if (percentage >= 70) {
    level = "high";
  } else if (percentage >= 30) {
    level = "medium";
  } else {
    level = "low";
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="capacity-bar flex-1">
        <div
          className={cn("capacity-fill", level)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showText && (
        <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
          {current}/{max}
        </span>
      )}
    </div>
  );
}
