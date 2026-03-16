"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WifiOff, RefreshCw, Ship } from "lucide-react";

export default function CaptainOfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-indigo-50 to-background dark:from-indigo-950/20">
      <Card className="max-w-md p-8 text-center">
        <div className="h-20 w-20 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-6">
          <WifiOff className="h-10 w-10 text-orange-600 dark:text-orange-400" />
        </div>

        <h1 className="text-2xl font-bold mb-2">You're Offline</h1>
        <p className="text-muted-foreground mb-6">
          No internet connection detected. Some features may be limited.
        </p>

        <div className="space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-left">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Ship className="h-4 w-4 text-indigo-600" />
              Available Offline
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• View cached tour manifest</li>
              <li>• Check-in guests (syncs when online)</li>
              <li>• Access emergency contacts</li>
              <li>• View safety checklists</li>
            </ul>
          </div>

          <Button onClick={handleRetry} className="w-full gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>

          <p className="text-xs text-muted-foreground">
            Your actions will be automatically synced when you're back online.
          </p>
        </div>
      </Card>
    </div>
  );
}
