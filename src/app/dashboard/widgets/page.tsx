"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Code,
  Copy,
  ExternalLink,
  Plus,
  Settings,
  Trash2,
  Eye,
  BarChart3,
  Palette,
  Globe,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Widget {
  id: string;
  name: string;
  widgetKey: string;
  allowedDomains: string[];
  tourIds: string[] | null;
  theme: {
    primaryColor: string;
    borderRadius: string;
    showPrices: boolean;
    showAvailability: boolean;
  };
  isActive: boolean;
  viewCount: number;
  bookingCount: number;
  createdAt: string;
}

interface ApiWidget {
  id: string;
  name: string;
  widget_key: string;
  allowed_domains: string[] | null;
  tour_ids: string[] | null;
  theme: {
    primaryColor?: string;
    borderRadius?: string;
    showPrices?: boolean;
    showAvailability?: boolean;
  } | null;
  is_active: boolean;
  created_at: string;
  view_count?: number;
  booking_count?: number;
}

function transformWidget(apiWidget: ApiWidget): Widget {
  return {
    id: apiWidget.id,
    name: apiWidget.name,
    widgetKey: apiWidget.widget_key,
    allowedDomains: apiWidget.allowed_domains || ["*"],
    tourIds: apiWidget.tour_ids,
    theme: {
      primaryColor: apiWidget.theme?.primaryColor || "#0ea5e9",
      borderRadius: apiWidget.theme?.borderRadius || "8px",
      showPrices: apiWidget.theme?.showPrices ?? true,
      showAvailability: apiWidget.theme?.showAvailability ?? true,
    },
    isActive: apiWidget.is_active,
    viewCount: apiWidget.view_count || 0,
    bookingCount: apiWidget.booking_count || 0,
    createdAt: apiWidget.created_at,
  };
}

export default function WidgetsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newWidgetName, setNewWidgetName] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchWidgets = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/widgets");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch widgets");
      }

      const transformedWidgets = (result.data || []).map(transformWidget);
      setWidgets(transformedWidgets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load widgets");
      console.error("Error fetching widgets:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWidgets();
  }, [fetchWidgets]);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const generateEmbedCode = (widget: Widget) => {
    return `<!-- TourPilot Booking Widget -->
<div id="tourpilot-widget"></div>
<script>
  (function() {
    var iframe = document.createElement('iframe');
    iframe.src = '${baseUrl}/embed/${widget.widgetKey}';
    iframe.style.width = '100%';
    iframe.style.minHeight = '600px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '${widget.theme.borderRadius}';
    document.getElementById('tourpilot-widget').appendChild(iframe);
  })();
</script>`;
  };

  const copyToClipboard = async (text: string, widgetId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(widgetId);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateWidget = async () => {
    if (!newWidgetName.trim()) return;

    setCreating(true);
    try {
      const response = await fetch("/api/widgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newWidgetName,
          theme: {
            primaryColor: "#0ea5e9",
            borderRadius: "8px",
            showPrices: true,
            showAvailability: true,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create widget");
      }

      const newWidget = transformWidget(result.data);
      setWidgets((prev) => [...prev, newWidget]);
      setNewWidgetName("");
      setShowCreateDialog(false);
      toast.success("Widget created", { description: "Your new widget is ready to embed." });
    } catch (err) {
      toast.error("Failed to create widget", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (widgetId: string, currentState: boolean) => {
    setToggling(widgetId);
    try {
      const response = await fetch(`/api/widgets/${widgetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentState }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update widget");
      }

      setWidgets((prev) =>
        prev.map((w) =>
          w.id === widgetId ? { ...w, isActive: !currentState } : w
        )
      );
      toast.success(`Widget ${!currentState ? "activated" : "deactivated"}`);
    } catch (err) {
      toast.error("Failed to update widget", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setToggling(null);
    }
  };

  const handleDeleteWidget = async (widgetId: string) => {
    setDeleting(widgetId);
    try {
      const response = await fetch(`/api/widgets/${widgetId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to delete widget");
      }

      setWidgets((prev) => prev.filter((w) => w.id !== widgetId));
      toast.success("Widget deleted");
    } catch (err) {
      toast.error("Failed to delete widget", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleUpdateWidgetSettings = async (
    widgetId: string,
    updates: Partial<{
      theme: Widget["theme"];
      allowed_domains: string[];
    }>
  ) => {
    try {
      const response = await fetch(`/api/widgets/${widgetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update widget");
      }

      const updatedWidget = transformWidget(result.data);
      setWidgets((prev) =>
        prev.map((w) => (w.id === widgetId ? updatedWidget : w))
      );
      setSelectedWidget(updatedWidget);
      toast.success("Widget settings updated");
    } catch (err) {
      toast.error("Failed to update settings", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">Failed to load widgets</p>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchWidgets}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Code className="h-6 w-6 text-primary" />
            Booking Widgets
          </h1>
          <p className="text-muted-foreground">
            Create embeddable booking widgets for your website and partners
          </p>
        </div>

        <Button className="gap-2 gradient-primary border-0" onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4" />
          Create Widget
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Active Widgets</p>
            <p className="text-3xl font-bold mt-1">
              {widgets.filter((w) => w.isActive).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Views</p>
            <p className="text-3xl font-bold mt-1">
              {widgets.reduce((sum, w) => sum + w.viewCount, 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Widget Bookings</p>
            <p className="text-3xl font-bold mt-1">
              {widgets.reduce((sum, w) => sum + w.bookingCount, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Widgets List */}
      {widgets.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Code className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No widgets yet</p>
            <p className="text-muted-foreground mb-4">
              Create your first widget to embed on your website
            </p>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Widget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {widgets.map((widget) => (
            <Card key={widget.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className="h-12 w-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${widget.theme.primaryColor}20` }}
                    >
                      <Code className="h-6 w-6" style={{ color: widget.theme.primaryColor }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{widget.name}</h3>
                        <Badge variant={widget.isActive ? "default" : "secondary"}>
                          {widget.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 font-mono">
                        {widget.widgetKey}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {widget.viewCount.toLocaleString()} views
                        </span>
                        <span className="flex items-center gap-1">
                          <BarChart3 className="h-4 w-4" />
                          {widget.bookingCount} bookings
                        </span>
                        <span className="flex items-center gap-1">
                          <Globe className="h-4 w-4" />
                          {widget.allowedDomains.length === 1 && widget.allowedDomains[0] === "*"
                            ? "All domains"
                            : `${widget.allowedDomains.length} domain(s)`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={widget.isActive}
                      onCheckedChange={() => handleToggleActive(widget.id, widget.isActive)}
                      disabled={toggling === widget.id}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => window.open(`/embed/${widget.widgetKey}`, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => setSelectedWidget(widget)}
                    >
                      <Code className="h-4 w-4" />
                      Get Code
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteWidget(widget.id)}
                      disabled={deleting === widget.id}
                    >
                      {deleting === widget.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Widget Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Widget</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Widget Name</Label>
              <Input
                placeholder="e.g., Main Website Widget"
                value={newWidgetName}
                onChange={(e) => setNewWidgetName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateWidget}
              disabled={!newWidgetName.trim() || creating}
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Widget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Embed Code Dialog */}
      <Dialog open={!!selectedWidget} onOpenChange={() => setSelectedWidget(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Embed Code - {selectedWidget?.name}</DialogTitle>
          </DialogHeader>

          {selectedWidget && (
            <Tabs defaultValue="embed">
              <TabsList>
                <TabsTrigger value="embed">Embed Code</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="embed" className="space-y-4">
                <div>
                  <Label className="mb-2 block">Copy this code to your website</Label>
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                      <code>{generateEmbedCode(selectedWidget)}</code>
                    </pre>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute top-2 right-2 gap-2"
                      onClick={() =>
                        copyToClipboard(generateEmbedCode(selectedWidget), selectedWidget.id)
                      }
                    >
                      {copiedId === selectedWidget.id ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      Copy
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Direct Link</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={`${baseUrl}/embed/${selectedWidget.widgetKey}`}
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      onClick={() =>
                        copyToClipboard(
                          `${baseUrl}/embed/${selectedWidget.widgetKey}`,
                          `${selectedWidget.id}-link`
                        )
                      }
                    >
                      {copiedId === `${selectedWidget.id}-link` ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <div>
                  <Label>Primary Color</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="color"
                      value={selectedWidget.theme.primaryColor}
                      className="w-12 h-10 p-1"
                      onChange={(e) => {
                        handleUpdateWidgetSettings(selectedWidget.id, {
                          theme: { ...selectedWidget.theme, primaryColor: e.target.value },
                        });
                      }}
                    />
                    <Input
                      value={selectedWidget.theme.primaryColor}
                      className="font-mono"
                      onChange={(e) => {
                        if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                          handleUpdateWidgetSettings(selectedWidget.id, {
                            theme: { ...selectedWidget.theme, primaryColor: e.target.value },
                          });
                        }
                      }}
                    />
                  </div>
                </div>

                <div>
                  <Label>Allowed Domains</Label>
                  <Input
                    value={selectedWidget.allowedDomains.join(", ")}
                    placeholder="example.com, partner.com"
                    className="mt-1"
                    onBlur={(e) => {
                      const domains = e.target.value
                        .split(",")
                        .map((d) => d.trim())
                        .filter(Boolean);
                      if (domains.length > 0) {
                        handleUpdateWidgetSettings(selectedWidget.id, {
                          allowed_domains: domains,
                        });
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use * to allow all domains. Separate multiple domains with commas.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Show Prices</Label>
                    <Switch
                      checked={selectedWidget.theme.showPrices}
                      onCheckedChange={(checked) => {
                        handleUpdateWidgetSettings(selectedWidget.id, {
                          theme: { ...selectedWidget.theme, showPrices: checked },
                        });
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Show Availability</Label>
                    <Switch
                      checked={selectedWidget.theme.showAvailability}
                      onCheckedChange={(checked) => {
                        handleUpdateWidgetSettings(selectedWidget.id, {
                          theme: { ...selectedWidget.theme, showAvailability: checked },
                        });
                      }}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedWidget(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
