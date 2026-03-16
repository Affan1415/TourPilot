"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  ChevronLeft,
  Fuel,
  Wrench,
  Plus,
  Loader2,
  Clock,
  Ship,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Droplet,
  Camera,
  Send,
  ChevronRight,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Suspense } from "react";

interface FuelLog {
  id: string;
  boat_name: string;
  log_type: string;
  fuel_level_percentage: number;
  engine_hours: number | null;
  oil_level: string | null;
  notes: string | null;
  created_at: string;
}

interface MaintenanceIssue {
  id: string;
  boat_name: string;
  title: string;
  category: string;
  severity: string;
  status: string;
  reported_at: string;
}

interface Boat {
  id: string;
  name: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  parts_ordered: "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
  wont_fix: "bg-slate-100 text-slate-700",
};

function LogsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [maintenanceIssues, setMaintenanceIssues] = useState<MaintenanceIssue[]>([]);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "fuel");

  // Fuel Log Dialog
  const [showFuelDialog, setShowFuelDialog] = useState(false);
  const [submittingFuel, setSubmittingFuel] = useState(false);
  const [fuelForm, setFuelForm] = useState({
    boat_id: "",
    log_type: "pre_trip",
    fuel_level_percentage: 50,
    engine_hours: "",
    oil_level: "normal",
    notes: "",
  });

  // Maintenance Dialog
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
  const [submittingMaintenance, setSubmittingMaintenance] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({
    boat_id: "",
    title: "",
    description: "",
    category: "other",
    severity: "medium",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/captain-login");
        return;
      }

      const { data: staffData } = await supabase
        .from("staff")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (staffData) {
        setStaffId(staffData.id);
      }

      // Fetch boats
      const { data: boatsData } = await supabase
        .from("boats")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (boatsData) {
        setBoats(boatsData);
      }

      // Fetch fuel logs
      const { data: fuelData } = await supabase
        .from("fuel_logs")
        .select(`
          id,
          log_type,
          fuel_level_percentage,
          engine_hours,
          oil_level,
          notes,
          created_at,
          boats (name)
        `)
        .eq("captain_id", staffData?.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (fuelData) {
        setFuelLogs(
          fuelData.map((log: any) => ({
            ...log,
            boat_name: log.boats?.name || "Unknown Boat",
          }))
        );
      }

      // Fetch maintenance issues
      const { data: maintenanceData } = await supabase
        .from("maintenance_issues")
        .select(`
          id,
          title,
          category,
          severity,
          status,
          reported_at,
          boats (name)
        `)
        .eq("reported_by", staffData?.id)
        .order("reported_at", { ascending: false })
        .limit(20);

      if (maintenanceData) {
        setMaintenanceIssues(
          maintenanceData.map((issue: any) => ({
            ...issue,
            boat_name: issue.boats?.name || "Unknown Boat",
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFuelLog = async () => {
    if (!fuelForm.boat_id) {
      toast.error("Please select a boat");
      return;
    }

    setSubmittingFuel(true);
    try {
      const supabase = createClient();

      const { error } = await supabase.from("fuel_logs").insert({
        boat_id: fuelForm.boat_id,
        captain_id: staffId,
        log_type: fuelForm.log_type,
        fuel_level_percentage: fuelForm.fuel_level_percentage,
        engine_hours: fuelForm.engine_hours ? parseFloat(fuelForm.engine_hours) : null,
        oil_level: fuelForm.oil_level,
        notes: fuelForm.notes || null,
      });

      if (error) throw error;

      toast.success("Fuel log saved");
      setShowFuelDialog(false);
      setFuelForm({
        boat_id: "",
        log_type: "pre_trip",
        fuel_level_percentage: 50,
        engine_hours: "",
        oil_level: "normal",
        notes: "",
      });
      fetchData();
    } catch (error: any) {
      console.error("Error saving fuel log:", error);
      toast.error(error.message || "Failed to save fuel log");
    } finally {
      setSubmittingFuel(false);
    }
  };

  const handleSubmitMaintenance = async () => {
    if (!maintenanceForm.boat_id || !maintenanceForm.title) {
      toast.error("Please fill in required fields");
      return;
    }

    setSubmittingMaintenance(true);
    try {
      const supabase = createClient();

      const { error } = await supabase.from("maintenance_issues").insert({
        boat_id: maintenanceForm.boat_id,
        reported_by: staffId,
        title: maintenanceForm.title,
        description: maintenanceForm.description || null,
        category: maintenanceForm.category,
        severity: maintenanceForm.severity,
      });

      if (error) throw error;

      toast.success("Maintenance issue reported");
      setShowMaintenanceDialog(false);
      setMaintenanceForm({
        boat_id: "",
        title: "",
        description: "",
        category: "other",
        severity: "medium",
      });
      fetchData();
    } catch (error: any) {
      console.error("Error reporting issue:", error);
      toast.error(error.message || "Failed to report issue");
    } finally {
      setSubmittingMaintenance(false);
    }
  };

  const getFuelLevelColor = (level: number) => {
    if (level >= 70) return "bg-green-500";
    if (level >= 40) return "bg-yellow-500";
    if (level >= 20) return "bg-orange-500";
    return "bg-red-500";
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50/50 to-background dark:from-slate-950/10">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/captain")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Gauge className="h-5 w-5 text-indigo-600" />
              Logs & Maintenance
            </h1>
            <p className="text-sm text-muted-foreground">
              Fuel, engine hours & issues
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fuel" className="gap-2">
              <Fuel className="h-4 w-4" />
              Fuel Logs
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="gap-2">
              <Wrench className="h-4 w-4" />
              Maintenance
            </TabsTrigger>
          </TabsList>

          {/* Fuel Logs Tab */}
          <TabsContent value="fuel" className="space-y-4 mt-4">
            <Button
              className="w-full gap-2"
              onClick={() => setShowFuelDialog(true)}
            >
              <Plus className="h-4 w-4" />
              Log Fuel Level
            </Button>

            {fuelLogs.length === 0 ? (
              <Card className="p-8 text-center">
                <Fuel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No fuel logs yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Log your pre-trip and post-trip fuel levels
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {fuelLogs.map((log) => (
                  <Card key={log.id} className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <div
                          className={cn(
                            "h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold",
                            getFuelLevelColor(log.fuel_level_percentage)
                          )}
                        >
                          {log.fuel_level_percentage}%
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{log.boat_name}</p>
                          <Badge variant="outline" className="text-xs">
                            {log.log_type.replace("_", " ")}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(parseISO(log.created_at), "MMM d, h:mm a")}
                          </span>
                          {log.engine_hours && (
                            <span className="flex items-center gap-1">
                              <Gauge className="h-3 w-3" />
                              {log.engine_hours} hrs
                            </span>
                          )}
                          {log.oil_level && (
                            <span className="flex items-center gap-1">
                              <Droplet className="h-3 w-3" />
                              Oil: {log.oil_level}
                            </span>
                          )}
                        </div>
                        {log.notes && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {log.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance" className="space-y-4 mt-4">
            <Button
              className="w-full gap-2"
              variant="outline"
              onClick={() => setShowMaintenanceDialog(true)}
            >
              <AlertTriangle className="h-4 w-4" />
              Report Issue
            </Button>

            {maintenanceIssues.length === 0 ? (
              <Card className="p-8 text-center">
                <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No maintenance issues</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Report any equipment issues you encounter
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {maintenanceIssues.map((issue) => (
                  <Card key={issue.id} className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <div
                          className={cn(
                            "h-10 w-10 rounded-lg flex items-center justify-center",
                            issue.severity === "critical" || issue.severity === "high"
                              ? "bg-red-100 text-red-600"
                              : "bg-orange-100 text-orange-600"
                          )}
                        >
                          <Wrench className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{issue.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={cn("text-xs", SEVERITY_COLORS[issue.severity])}>
                            {issue.severity}
                          </Badge>
                          <Badge className={cn("text-xs", STATUS_COLORS[issue.status])}>
                            {issue.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Ship className="h-3 w-3" />
                            {issue.boat_name}
                          </span>
                          <span>
                            {format(parseISO(issue.reported_at), "MMM d")}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Fuel Log Dialog */}
      <Dialog open={showFuelDialog} onOpenChange={setShowFuelDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fuel className="h-5 w-5 text-indigo-600" />
              Log Fuel Level
            </DialogTitle>
            <DialogDescription>
              Record fuel level and engine status
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Boat *</label>
              <Select
                value={fuelForm.boat_id}
                onValueChange={(value) => setFuelForm({ ...fuelForm, boat_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select boat..." />
                </SelectTrigger>
                <SelectContent>
                  {boats.map((boat) => (
                    <SelectItem key={boat.id} value={boat.id}>
                      {boat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Log Type</label>
              <div className="flex gap-2">
                {["pre_trip", "post_trip", "refuel"].map((type) => (
                  <Button
                    key={type}
                    type="button"
                    variant={fuelForm.log_type === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFuelForm({ ...fuelForm, log_type: type })}
                  >
                    {type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Fuel Level: {fuelForm.fuel_level_percentage}%
              </label>
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "h-10 w-16 rounded flex items-center justify-center text-white font-bold",
                    getFuelLevelColor(fuelForm.fuel_level_percentage)
                  )}
                >
                  {fuelForm.fuel_level_percentage}%
                </div>
                <Slider
                  value={[fuelForm.fuel_level_percentage]}
                  onValueChange={([value]) =>
                    setFuelForm({ ...fuelForm, fuel_level_percentage: value })
                  }
                  max={100}
                  step={5}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Engine Hours</label>
                <Input
                  type="number"
                  placeholder="e.g., 1234.5"
                  value={fuelForm.engine_hours}
                  onChange={(e) =>
                    setFuelForm({ ...fuelForm, engine_hours: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Oil Level</label>
                <Select
                  value={fuelForm.oil_level}
                  onValueChange={(value) =>
                    setFuelForm({ ...fuelForm, oil_level: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="full">Full</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Notes</label>
              <Textarea
                placeholder="Any observations..."
                rows={2}
                value={fuelForm.notes}
                onChange={(e) => setFuelForm({ ...fuelForm, notes: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowFuelDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleSubmitFuelLog}
                disabled={submittingFuel}
              >
                {submittingFuel ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Save Log
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Maintenance Issue Dialog */}
      <Dialog open={showMaintenanceDialog} onOpenChange={setShowMaintenanceDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-orange-600" />
              Report Maintenance Issue
            </DialogTitle>
            <DialogDescription>
              Document equipment issues or needed repairs
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Boat *</label>
              <Select
                value={maintenanceForm.boat_id}
                onValueChange={(value) =>
                  setMaintenanceForm({ ...maintenanceForm, boat_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select boat..." />
                </SelectTrigger>
                <SelectContent>
                  {boats.map((boat) => (
                    <SelectItem key={boat.id} value={boat.id}>
                      {boat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Issue Title *</label>
              <Input
                placeholder="Brief description of the issue"
                value={maintenanceForm.title}
                onChange={(e) =>
                  setMaintenanceForm({ ...maintenanceForm, title: e.target.value })
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select
                value={maintenanceForm.category}
                onValueChange={(value) =>
                  setMaintenanceForm({ ...maintenanceForm, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="engine">Engine</SelectItem>
                  <SelectItem value="electrical">Electrical</SelectItem>
                  <SelectItem value="hull">Hull</SelectItem>
                  <SelectItem value="safety_equipment">Safety Equipment</SelectItem>
                  <SelectItem value="navigation">Navigation</SelectItem>
                  <SelectItem value="comfort">Comfort/Amenities</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Severity</label>
              <div className="flex gap-2">
                {["low", "medium", "high", "critical"].map((sev) => (
                  <Button
                    key={sev}
                    type="button"
                    variant={maintenanceForm.severity === sev ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      maintenanceForm.severity === sev &&
                        sev === "critical" &&
                        "bg-red-600 hover:bg-red-700",
                      maintenanceForm.severity === sev &&
                        sev === "high" &&
                        "bg-orange-600 hover:bg-orange-700"
                    )}
                    onClick={() =>
                      setMaintenanceForm({ ...maintenanceForm, severity: sev })
                    }
                  >
                    {sev.charAt(0).toUpperCase() + sev.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Details</label>
              <Textarea
                placeholder="Describe the issue in detail..."
                rows={3}
                value={maintenanceForm.description}
                onChange={(e) =>
                  setMaintenanceForm({ ...maintenanceForm, description: e.target.value })
                }
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowMaintenanceDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2 bg-orange-600 hover:bg-orange-700"
                onClick={handleSubmitMaintenance}
                disabled={submittingMaintenance}
              >
                {submittingMaintenance ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Report Issue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LogsPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    }>
      <LogsContent />
    </Suspense>
  );
}
