"use client";

import { useState, useRef, useCallback } from "react";
import { CheckCircle2, AlertCircle, ChevronRight, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwipeableGuestCardProps {
  guest: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    waiverSigned: boolean;
    checkedIn: boolean;
  };
  onCheckIn: () => void;
  onTap: () => void;
  disabled?: boolean;
}

const SWIPE_THRESHOLD = 80;

export function SwipeableGuestCard({
  guest,
  onCheckIn,
  onTap,
  disabled = false,
}: SwipeableGuestCardProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || guest.checkedIn) return;
    startX.current = e.touches[0].clientX;
    currentX.current = e.touches[0].clientX;
    setIsSwiping(true);
  }, [disabled, guest.checkedIn]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping || disabled || guest.checkedIn) return;
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    // Only allow right swipe (positive diff)
    if (diff > 0) {
      setTranslateX(Math.min(diff, SWIPE_THRESHOLD + 20));
    }
  }, [isSwiping, disabled, guest.checkedIn]);

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping) return;
    setIsSwiping(false);

    if (translateX >= SWIPE_THRESHOLD && !guest.checkedIn) {
      // Trigger check-in
      onCheckIn();
      // Animate back
      setTranslateX(0);
    } else {
      // Snap back
      setTranslateX(0);
    }
  }, [isSwiping, translateX, guest.checkedIn, onCheckIn]);

  const handleClick = useCallback(() => {
    if (!isSwiping && translateX === 0) {
      onTap();
    }
  }, [isSwiping, translateX, onTap]);

  const swipeProgress = Math.min(translateX / SWIPE_THRESHOLD, 1);

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Background layer - check-in indicator */}
      <div
        className={cn(
          "absolute inset-0 flex items-center pl-4 transition-colors",
          swipeProgress > 0.8 ? "bg-green-500" : "bg-green-400"
        )}
      >
        <div
          className="flex items-center gap-2 text-white font-medium"
          style={{ opacity: swipeProgress }}
        >
          <CheckCircle2 className="h-6 w-6" />
          <span>Check In</span>
        </div>
      </div>

      {/* Foreground card */}
      <div
        ref={containerRef}
        className={cn(
          "relative flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border transition-all cursor-pointer select-none",
          guest.checkedIn
            ? "border-green-300 bg-green-50 dark:bg-green-950/30"
            : guest.waiverSigned
            ? "border-slate-200 dark:border-slate-700 hover:border-indigo-300"
            : "border-orange-300 bg-orange-50 dark:bg-orange-950/30",
          isSwiping ? "transition-none" : "transition-transform duration-200"
        )}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        {/* Status indicator */}
        <div
          className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
            guest.checkedIn
              ? "bg-green-500 text-white"
              : guest.waiverSigned
              ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              : "bg-orange-100 text-orange-600"
          )}
        >
          {guest.checkedIn ? (
            <CheckCircle2 className="h-6 w-6" />
          ) : (
            <User className="h-6 w-6" />
          )}
        </div>

        {/* Guest info */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            "font-semibold truncate",
            guest.checkedIn && "text-green-800 dark:text-green-200"
          )}>
            {guest.firstName} {guest.lastName}
          </p>
          <div className="flex items-center gap-2 text-sm">
            {guest.checkedIn ? (
              <span className="text-green-600 dark:text-green-400 font-medium">Checked In</span>
            ) : !guest.waiverSigned ? (
              <span className="text-orange-600 dark:text-orange-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Waiver pending
              </span>
            ) : (
              <span className="text-slate-500">Ready to check in</span>
            )}
          </div>
        </div>

        {/* Swipe hint or chevron */}
        {!guest.checkedIn && (
          <div className="flex items-center text-slate-400">
            {translateX === 0 ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <span className="text-xs font-medium text-green-600">
                {Math.round(swipeProgress * 100)}%
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
