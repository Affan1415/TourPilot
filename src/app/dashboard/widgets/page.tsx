"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Widget {
  id: string;
  name: string;
  widgetKey: string;
  allowedDomains: string[];
  theme: {
    primaryColor: string;
    borderRadius: string;
    showPrices: boolean;
    showAvailability: boolean;
  };
  isActive: boolean;
  embedCount: number;
  bookingCount: number;
  createdAt: string;
}

const mockWidgets: Widget[] = [
  {
    id: "1",
    name: "Main Website Widget",
    widgetKey: "wgt_abc123def456",
    allowedDomains: ["example.com", "www.example.com"],
    theme: {
      primaryColor: "#0ea5e9",
      borderRadius: "8px",
      showPrices: true,
      showAvailability: true,
    },
    isActive: true,
    embedCount: 1250,
    bookingCount: 89,
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "2",
    name: "Partner Hotel Widget",
    widgetKey: "wgt_xyz789ghi012",
    allowedDomains: ["hotelpartner.com"],
    theme: {
      primaryColor: "#8b5cf6",
      borderRadius: "12px",
      showPrices: true,
      showAvailability: false,
    },
    isActive: true,
    embedCount: 456,
    bookingCount: 23,
    createdAt: "2024-02-01T14:30:00Z",
  },
];

export default function WidgetsPage() {
  const [loading, setLoading] = useState(true);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newWidgetName, setNewWidgetName] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setTimeout(() => {
      setWidgets(mockWidgets);
      setLoading(false);
    }, 500);
  }, []);

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
    await new Promise((r) => setTimeout(r, 1000));

    const newWidget: Widget = {
      id: Date.now().toString(),
      name: newWidgetName,
      widgetKey: `wgt_${Math.random().toString(36).substring(2, 15)}`,
      allowedDomains: ["*"],
      theme: {
        primaryColor: "#0ea5e9",
        borderRadius: "8px",
        showPrices: true,
        showAvailability: true,
      },
      isActive: true,
      embedCount: 0,
      bookingCount: 0,
      createdAt: new Date().toISOString(),
    };

    setWidgets((prev) => [...prev, newWidget]);
    setNewWidgetName("");
    setShowCreateDialog(false);
    setCreating(false);
    toast.success("Widget created", { description: "Your new widget is ready to embed." });
  };

  const handleToggleActive = (widgetId: string) => {
    setWidgets((prev) =>
      prev.map((w) =>
        w.id === widgetId ? { ...w, isActive: !w.isActive } : w
      )
    );
  };

  const handleDeleteWidget = (widgetId: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== widgetId));
    toast.success("Widget deleted");
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
              {widgets.reduce((sum, w) => sum + w.embedCount, 0).toLocaleString()}
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
                          {widget.embedCount.toLocaleString()} views
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
                      onCheckedChange={() => handleToggleActive(widget.id)}
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
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
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
                      readOnly
                    />
                    <Input
                      value={selectedWidget.theme.primaryColor}
                      className="font-mono"
                      readOnly
                    />
                  </div>
                </div>

                <div>
                  <Label>Allowed Domains</Label>
                  <Input
                    value={selectedWidget.allowedDomains.join(", ")}
                    placeholder="example.com, partner.com"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use * to allow all domains. Separate multiple domains with commas.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Show Prices</Label>
                    <Switch checked={selectedWidget.theme.showPrices} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Show Availability</Label>
                    <Switch checked={selectedWidget.theme.showAvailability} />
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
