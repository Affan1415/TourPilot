"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Globe,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  MoreVertical,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  Link2,
  Unlink,
  Calendar,
  Loader2,
  TrendingUp,
  Users,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

interface OTAConnection {
  id: string;
  provider: "viator" | "getyourguide" | "airbnb" | "tripadvisor";
  supplier_id: string;
  is_active: boolean;
  sync_status: "synced" | "syncing" | "error" | "needs_sync";
  last_synced_at: string | null;
  settings: {
    auto_sync: boolean;
    sync_interval_minutes: number;
    auto_confirm_bookings: boolean;
  };
  stats?: {
    total_bookings: number;
    revenue: number;
    products_linked: number;
  };
}

interface ProductMapping {
  id: string;
  connection_id: string;
  tour_id: string;
  tour_name: string;
  ota_product_id: string;
  ota_product_name: string;
  is_active: boolean;
}

const OTA_PROVIDERS = {
  viator: {
    name: "Viator",
    description: "Connect to Viator Partner API for tour distribution",
    logo: "🎫",
    color: "bg-orange-500",
  },
  getyourguide: {
    name: "GetYourGuide",
    description: "Sync tours and availability with GetYourGuide",
    logo: "🎒",
    color: "bg-blue-500",
  },
  airbnb: {
    name: "Airbnb Experiences",
    description: "List your experiences on Airbnb platform",
    logo: "🏠",
    color: "bg-rose-500",
  },
  tripadvisor: {
    name: "TripAdvisor",
    description: "Connect with TripAdvisor Experiences API",
    logo: "🦉",
    color: "bg-green-500",
  },
};

export default function OTAPage() {
  const [connections, setConnections] = useState<OTAConnection[]>([]);
  const [mappings, setMappings] = useState<ProductMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<OTAConnection | null>(null);
  const [newConnection, setNewConnection] = useState({
    provider: "" as OTAConnection["provider"] | "",
    apiKey: "",
    apiSecret: "",
    supplierId: "",
    webhookSecret: "",
  });

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const res = await fetch("/api/ota/connections");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setConnections(data.connections || []);
    } catch (error) {
      console.error("Error fetching connections:", error);
      toast.error("Failed to load OTA connections");
    } finally {
      setLoading(false);
    }
  };

  const handleAddConnection = async () => {
    if (!newConnection.provider || !newConnection.apiKey) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      const res = await fetch("/api/ota/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: newConnection.provider,
          credentials: {
            api_key: newConnection.apiKey,
            api_secret: newConnection.apiSecret,
            webhook_secret: newConnection.webhookSecret,
          },
          supplier_id: newConnection.supplierId,
        }),
      });

      if (!res.ok) throw new Error("Failed to create connection");

      toast.success("Connection added", {
        description: `${OTA_PROVIDERS[newConnection.provider as keyof typeof OTA_PROVIDERS].name} connected successfully`,
      });

      setShowAddDialog(false);
      setNewConnection({
        provider: "",
        apiKey: "",
        apiSecret: "",
        supplierId: "",
        webhookSecret: "",
      });
      fetchConnections();
    } catch (error) {
      toast.error("Failed to add connection");
    }
  };

  const handleSync = async (connectionId: string) => {
    setSyncing(connectionId);
    try {
      const res = await fetch("/api/ota/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId,
          syncType: "full",
        }),
      });

      if (!res.ok) throw new Error("Sync failed");

      const result = await res.json();
      toast.success("Sync completed", {
        description: `Synced ${result.syncedCount} items`,
      });

      fetchConnections();
    } catch (error) {
      toast.error("Sync failed");
    } finally {
      setSyncing(null);
    }
  };

  const handleToggleConnection = async (connection: OTAConnection) => {
    try {
      const res = await fetch(`/api/ota/connections/${connection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_active: !connection.is_active,
        }),
      });

      if (!res.ok) throw new Error("Failed to update");

      toast.success(connection.is_active ? "Connection disabled" : "Connection enabled");
      fetchConnections();
    } catch (error) {
      toast.error("Failed to update connection");
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    if (!confirm("Are you sure you want to delete this connection?")) return;

    try {
      const res = await fetch(`/api/ota/connections/${connectionId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      toast.success("Connection deleted");
      fetchConnections();
    } catch (error) {
      toast.error("Failed to delete connection");
    }
  };

  const getStatusBadge = (status: OTAConnection["sync_status"]) => {
    switch (status) {
      case "synced":
        return <Badge variant="default" className="bg-green-500">Synced</Badge>;
      case "syncing":
        return <Badge variant="secondary" className="bg-blue-500 text-white">Syncing...</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      case "needs_sync":
        return <Badge variant="outline">Needs Sync</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            OTA Connections
          </h1>
          <p className="text-muted-foreground">
            Manage your Online Travel Agency integrations
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => connections.forEach(c => handleSync(c.id))}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync All
          </Button>
          <Button className="gap-2 gradient-primary border-0" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4" />
            Add Connection
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Link2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Connections</p>
              <p className="text-2xl font-bold">
                {connections.filter(c => c.is_active).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Calendar className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">OTA Bookings</p>
              <p className="text-2xl font-bold">
                {connections.reduce((sum, c) => sum + (c.stats?.total_bookings || 0), 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Products Linked</p>
              <p className="text-2xl font-bold">
                {connections.reduce((sum, c) => sum + (c.stats?.products_linked || 0), 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <DollarSign className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">OTA Revenue</p>
              <p className="text-2xl font-bold">
                ${connections.reduce((sum, c) => sum + (c.stats?.revenue || 0), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Connections List */}
      {connections.length === 0 ? (
        <Card className="p-12 text-center">
          <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No OTA Connections</h3>
          <p className="text-muted-foreground mb-4">
            Connect your tours to online travel agencies to reach more customers
          </p>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Connection
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {connections.map((connection) => {
            const provider = OTA_PROVIDERS[connection.provider];
            return (
              <Card key={connection.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-lg ${provider.color} flex items-center justify-center text-2xl text-white`}>
                      {provider.logo}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{provider.name}</h3>
                        {getStatusBadge(connection.sync_status)}
                        {!connection.is_active && (
                          <Badge variant="outline" className="text-muted-foreground">
                            Disabled
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Supplier ID: {connection.supplier_id}
                      </p>
                      {connection.last_synced_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Last synced: {formatDistanceToNow(new Date(connection.last_synced_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={connection.is_active}
                      onCheckedChange={() => handleToggleConnection(connection)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSync(connection.id)}
                      disabled={syncing === connection.id}
                    >
                      {syncing === connection.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setSelectedConnection(connection);
                          setShowMappingDialog(true);
                        }}>
                          <Link2 className="h-4 w-4 mr-2" />
                          Manage Product Mappings
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Settings className="h-4 w-4 mr-2" />
                          Connection Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteConnection(connection.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Connection
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Connection Stats */}
                {connection.stats && (
                  <>
                    <Separator className="my-4" />
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Bookings</p>
                        <p className="text-xl font-semibold">{connection.stats.total_bookings}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Products Linked</p>
                        <p className="text-xl font-semibold">{connection.stats.products_linked}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Revenue</p>
                        <p className="text-xl font-semibold">${connection.stats.revenue.toLocaleString()}</p>
                      </div>
                    </div>
                  </>
                )}

                {/* Sync Settings */}
                <Separator className="my-4" />
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Auto-sync:</span>
                      {connection.settings?.auto_sync ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Auto-confirm:</span>
                      {connection.settings?.auto_confirm_bookings ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    {connection.settings?.auto_sync && (
                      <span className="text-muted-foreground">
                        Every {connection.settings.sync_interval_minutes} minutes
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Connection Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add OTA Connection</DialogTitle>
            <DialogDescription>
              Connect to an Online Travel Agency to sync your tours and bookings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={newConnection.provider}
                onValueChange={(value) =>
                  setNewConnection({ ...newConnection, provider: value as OTAConnection["provider"] })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select OTA provider" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(OTA_PROVIDERS).map(([key, provider]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span>{provider.logo}</span>
                        <span>{provider.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newConnection.provider && (
              <>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">
                    {OTA_PROVIDERS[newConnection.provider as keyof typeof OTA_PROVIDERS].description}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key *</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={newConnection.apiKey}
                    onChange={(e) =>
                      setNewConnection({ ...newConnection, apiKey: e.target.value })
                    }
                    placeholder="Enter your API key"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiSecret">API Secret</Label>
                  <Input
                    id="apiSecret"
                    type="password"
                    value={newConnection.apiSecret}
                    onChange={(e) =>
                      setNewConnection({ ...newConnection, apiSecret: e.target.value })
                    }
                    placeholder="Enter API secret (if required)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplierId">Supplier / Partner ID</Label>
                  <Input
                    id="supplierId"
                    value={newConnection.supplierId}
                    onChange={(e) =>
                      setNewConnection({ ...newConnection, supplierId: e.target.value })
                    }
                    placeholder="Your supplier ID on this platform"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhookSecret">Webhook Secret</Label>
                  <Input
                    id="webhookSecret"
                    type="password"
                    value={newConnection.webhookSecret}
                    onChange={(e) =>
                      setNewConnection({ ...newConnection, webhookSecret: e.target.value })
                    }
                    placeholder="For verifying webhook requests"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddConnection} disabled={!newConnection.provider || !newConnection.apiKey}>
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Mapping Dialog */}
      <Dialog open={showMappingDialog} onOpenChange={setShowMappingDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Product Mappings</DialogTitle>
            <DialogDescription>
              Link your tours to products on {selectedConnection && OTA_PROVIDERS[selectedConnection.provider].name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Map your local tours to OTA products for availability sync
              </p>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Mapping
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Your Tour</TableHead>
                  <TableHead>OTA Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No product mappings yet. Add one to start syncing availability.
                    </TableCell>
                  </TableRow>
                ) : (
                  mappings.map((mapping) => (
                    <TableRow key={mapping.id}>
                      <TableCell className="font-medium">{mapping.tour_name}</TableCell>
                      <TableCell>{mapping.ota_product_name}</TableCell>
                      <TableCell>
                        {mapping.is_active ? (
                          <Badge variant="default" className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Unlink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMappingDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
