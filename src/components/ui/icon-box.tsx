"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type ColorVariant = "mint" | "lavender" | "peach" | "sky" | "rose";

interface IconBoxProps {
  icon: ReactNode;
  color?: ColorVariant;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 rounded-lg",
  md: "w-10 h-10 rounded-[10px]",
  lg: "w-12 h-12 rounded-xl",
};

const colorClasses: Record<ColorVariant, string> = {
  mint: "bg-mint text-mint-dark",
  lavender: "bg-lavender text-lavender-dark",
  peach: "bg-peach text-peach-dark",
  sky: "bg-sky text-sky-dark",
  rose: "bg-rose text-rose-dark",
};

export function IconBox({
  icon,
  color = "sky",
  size = "md",
  className,
}: IconBoxProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        sizeClasses[size],
        colorClasses[color],
        className
      )}
    >
      {icon}
    </div>
  );
}
