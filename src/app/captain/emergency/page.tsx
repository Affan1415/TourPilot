"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import {
  AlertTriangle,
  Phone,
  MapPin,
  ChevronLeft,
  Shield,
  Loader2,
  AlertCircle,
  Heart,
  Anchor,
  Ship,
  Flame,
  Users,
  FileText,
  Send,
  Navigation,
  Radio,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  type: string;
  priority: number;
  description: string | null;
}

interface IncidentReport {
  incident_type: string;
  severity: string;
  title: string;
  description: string;
  location_lat: number | null;
  location_lng: number | null;
  location_description: string;
}

const INCIDENT_TYPES = [
  { value: "medical", label: "Medical Emergency", icon: Heart },
  { value: "equipment", label: "Equipment Failure", icon: Anchor },
  { value: "weather", label: "Weather Issue", icon: AlertTriangle },
  { value: "safety", label: "Safety Concern", icon: Shield },
  { value: "passenger", label: "Passenger Issue", icon: Users },
  { value: "collision", label: "Collision", icon: Ship },
  { value: "grounding", label: "Grounding", icon: AlertCircle },
  { value: "other", label: "Other", icon: FileText },
];

const EMERGENCY_PROTOCOLS = [
  {
    title: "Man Overboard",
    icon: Users,
    color: "bg-red-500",
    steps: [
      "Shout 'MAN OVERBOARD' and point at person",
      "Throw life ring/flotation device immediately",
      "Assign someone to watch and point continuously",
      "Turn vessel around - Williamson Turn",
      "Call Coast Guard on VHF Channel 16",
      "Approach from downwind, stop engines near person",
      "Use rescue equipment to retrieve person",
    ],
  },
  {
    title: "Fire Emergency",
    icon: Flame,
    color: "bg-orange-500",
    steps: [
      "Sound fire alarm - alert all passengers",
      "Identify fire location and type",
      "If safe, use appropriate fire extinguisher",
      "Never use water on electrical/fuel fires",
      "Evacuate passengers to safe area",
      "Call Coast Guard on VHF Channel 16",
      "Prepare to abandon ship if necessary",
    ],
  },
  {
    title: "Medical Emergency",
    icon: Heart,
    color: "bg-pink-500",
    steps: [
      "Assess the situation - is it safe?",
      "Check responsiveness of patient",
      "Call Coast Guard for medical advice",
      "Locate and use first aid kit",
      "Begin CPR if no pulse (30:2 ratio)",
      "Use AED if available",
      "Document all actions taken",
    ],
  },
  {
    title: "Taking on Water",
    icon: Ship,
    color: "bg-blue-500",
    steps: [
      "Identify source of water entry",
      "Activate all bilge pumps",
      "Attempt to plug/stop the leak",
      "Have passengers put on life jackets",
      "Call MAYDAY on VHF Channel 16",
      "Prepare life rafts and emergency equipment",
      "Head for nearest shore if possible",
    ],
  },
];

export default function EmergencyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [expandedProtocol, setExpandedProtocol] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);

  const [report, setReport] = useState<IncidentReport>({
    incident_type: "",
    severity: "medium",
    title: "",
    description: "",
    location_lat: null,
    location_lng: null,
    location_description: "",
  });

  useEffect(() => {
    fetchData();
    getCurrentLocation();
  }, []);

  const fetchData = async () => {
    try {
      const supabase = createClient();

      // Get staff ID
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: staffData } = await supabase
          .from("staff")
          .select("id")
          .eq("user_id", user.id)
          .single();
        if (staffData) {
          setStaffId(staffData.id);
        }
      }

      // Fetch emergency contacts
      const { data: contactsData } = await supabase
        .from("emergency_contacts")
        .select("*")
        .eq("is_active", true)
        .order("priority", { ascending: true });

      if (contactsData) {
        setContacts(contactsData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setReport((prev) => ({
            ...prev,
            location_lat: position.coords.latitude,
            location_lng: position.coords.longitude,
          }));
        },
        (error) => {
          console.error("Geolocation error:", error);
        },
        { enableHighAccuracy: true }
      );
    }
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone.replace(/[^0-9+]/g, "")}`;
  };

  const handleSubmitReport = async () => {
    if (!report.incident_type || !report.title) {
      toast.error("Please fill in required fields");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();

      const { error } = await supabase.from("incident_reports").insert({
        captain_id: staffId,
        incident_type: report.incident_type,
        severity: report.severity,
        title: report.title,
        description: report.description,
        location_lat: report.location_lat,
        location_lng: report.location_lng,
        location_description: report.location_description,
      });

      if (error) throw error;

      toast.success("Incident report submitted");
      setShowReportDialog(false);
      setReport({
        incident_type: "",
        severity: "medium",
        title: "",
        description: "",
        location_lat: currentLocation?.lat || null,
        location_lng: currentLocation?.lng || null,
        location_description: "",
      });
    } catch (error: any) {
      console.error("Error submitting report:", error);
      toast.error(error.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  const getContactIcon = (type: string) => {
    switch (type) {
      case "coast_guard":
        return <Anchor className="h-5 w-5" />;
      case "port_authority":
        return <Ship className="h-5 w-5" />;
      case "hospital":
        return <Heart className="h-5 w-5" />;
      case "police":
        return <Shield className="h-5 w-5" />;
      default:
        return <Phone className="h-5 w-5" />;
    }
  };

  const getContactColor = (type: string) => {
    switch (type) {
      case "coast_guard":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "port_authority":
        return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300";
      case "hospital":
        return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300";
      case "police":
        return "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300";
      default:
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50/50 to-background dark:from-red-950/10">
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
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Emergency
            </h1>
            <p className="text-sm text-muted-foreground">
              Contacts & Protocols
            </p>
          </div>
          {currentLocation && (
            <Badge variant="outline" className="gap-1">
              <Navigation className="h-3 w-3" />
              GPS Active
            </Badge>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-4xl mx-auto">
        {/* SOS Button */}
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
          <CardContent className="p-4">
            <a
              href="tel:911"
              className="block w-full"
            >
              <Button
                size="lg"
                className="w-full h-20 text-xl bg-red-600 hover:bg-red-700 gap-3"
              >
                <Phone className="h-8 w-8" />
                Call 911 - Emergency
              </Button>
            </a>
            <p className="text-center text-sm text-red-700 dark:text-red-300 mt-3">
              For life-threatening emergencies, call 911 immediately
            </p>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-16 flex-col gap-1 border-orange-300 text-orange-700 hover:bg-orange-50"
            onClick={() => setShowReportDialog(true)}
          >
            <FileText className="h-5 w-5" />
            <span className="text-sm">Report Incident</span>
          </Button>
          <a href="tel:1-800-368-5647" className="block">
            <Button
              variant="outline"
              className="w-full h-16 flex-col gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <Radio className="h-5 w-5" />
              <span className="text-sm">Coast Guard</span>
            </Button>
          </a>
        </div>

        {/* Emergency Contacts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Phone className="h-5 w-5 text-indigo-600" />
              Emergency Contacts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {contacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => handleCall(contact.phone)}
                className="w-full flex items-center gap-4 p-4 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
              >
                <div
                  className={cn(
                    "h-12 w-12 rounded-full flex items-center justify-center",
                    getContactColor(contact.type)
                  )}
                >
                  {getContactIcon(contact.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{contact.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {contact.description || contact.phone}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-semibold text-indigo-600">
                    {contact.phone}
                  </p>
                  <p className="text-xs text-muted-foreground">Tap to call</p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Emergency Protocols */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-600" />
              Emergency Protocols
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {EMERGENCY_PROTOCOLS.map((protocol) => {
              const Icon = protocol.icon;
              const isExpanded = expandedProtocol === protocol.title;

              return (
                <div
                  key={protocol.title}
                  className="border rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedProtocol(isExpanded ? null : protocol.title)
                    }
                    className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <div
                      className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center text-white",
                        protocol.color
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-semibold flex-1">{protocol.title}</span>
                    <ChevronLeft
                      className={cn(
                        "h-5 w-5 text-muted-foreground transition-transform",
                        isExpanded ? "-rotate-90" : "rotate-180"
                      )}
                    />
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t bg-slate-50/50 dark:bg-slate-800/50">
                      <ol className="mt-4 space-y-3">
                        {protocol.steps.map((step, index) => (
                          <li key={index} className="flex gap-3">
                            <span
                              className={cn(
                                "flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white",
                                protocol.color
                              )}
                            >
                              {index + 1}
                            </span>
                            <span className="text-sm pt-0.5">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Location Info */}
        {currentLocation && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-semibold">Current Location</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  onClick={getCurrentLocation}
                >
                  Update
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Incident Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-600" />
              Report Incident
            </DialogTitle>
            <DialogDescription>
              Document any incidents or safety concerns
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Incident Type *
              </label>
              <Select
                value={report.incident_type}
                onValueChange={(value) =>
                  setReport({ ...report, incident_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {INCIDENT_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    );
                  })}
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
                    variant={report.severity === sev ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      report.severity === sev &&
                        sev === "critical" &&
                        "bg-red-600 hover:bg-red-700",
                      report.severity === sev &&
                        sev === "high" &&
                        "bg-orange-600 hover:bg-orange-700",
                      report.severity === sev &&
                        sev === "medium" &&
                        "bg-yellow-600 hover:bg-yellow-700"
                    )}
                    onClick={() => setReport({ ...report, severity: sev })}
                  >
                    {sev.charAt(0).toUpperCase() + sev.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Title *</label>
              <Input
                placeholder="Brief description of incident"
                value={report.title}
                onChange={(e) => setReport({ ...report, title: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Details</label>
              <Textarea
                placeholder="Describe what happened, who was involved, and any actions taken..."
                rows={4}
                value={report.description}
                onChange={(e) =>
                  setReport({ ...report, description: e.target.value })
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Location Description
              </label>
              <Input
                placeholder="e.g., Near buoy marker 5, 2 miles offshore"
                value={report.location_description}
                onChange={(e) =>
                  setReport({ ...report, location_description: e.target.value })
                }
              />
              {currentLocation && (
                <p className="text-xs text-muted-foreground mt-1">
                  GPS: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowReportDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2 bg-orange-600 hover:bg-orange-700"
                onClick={handleSubmitReport}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
