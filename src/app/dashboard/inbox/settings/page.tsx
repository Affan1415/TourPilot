"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  Phone,
  Instagram,
  Settings,
  Plus,
  Check,
  X,
  ExternalLink,
  Loader2,
  Trash2,
  RefreshCw,
  AlertCircle,
  Key,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ConnectedAccount {
  id: string;
  channel: string;
  accountName: string;
  accountId: string;
  isActive: boolean;
  connectedAt: string;
}

const channelConfigs = [
  {
    id: "email",
    name: "Email",
    description: "Connect Gmail or Outlook to send and receive emails",
    icon: Mail,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    providers: [
      { id: "gmail", name: "Gmail", icon: "/icons/gmail.svg" },
      { id: "outlook", name: "Outlook", icon: "/icons/outlook.svg" },
    ],
    features: ["Send & receive emails", "Auto-link to bookings", "Email templates", "Signature support"],
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Connect WhatsApp Business API for messaging",
    icon: MessageSquare,
    color: "text-green-500",
    bgColor: "bg-green-50",
    features: ["Send & receive messages", "Template messages", "Media support", "Quick replies"],
    requiresBusinessAccount: true,
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Connect Instagram to manage DMs and comments",
    icon: Instagram,
    color: "text-pink-500",
    bgColor: "bg-pink-50",
    features: ["Reply to DMs", "Manage comments", "Story mentions", "Auto-response"],
    requiresBusinessAccount: true,
  },
  {
    id: "sms",
    name: "SMS",
    description: "Send and receive text messages via Twilio",
    icon: Phone,
    color: "text-purple-500",
    bgColor: "bg-purple-50",
    features: ["Send & receive SMS", "MMS support", "Delivery tracking", "Short codes"],
    requiresApiKey: true,
  },
  {
    id: "messenger",
    name: "Facebook Messenger",
    description: "Connect your Facebook Page for Messenger",
    icon: MessageSquare,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    features: ["Reply to messages", "Automated responses", "Rich messages", "Quick replies"],
    requiresBusinessAccount: true,
  },
];

// Mock connected accounts
const mockConnectedAccounts: ConnectedAccount[] = [
  {
    id: "1",
    channel: "email",
    accountName: "bookings@tourpilot.com",
    accountId: "gmail_123",
    isActive: true,
    connectedAt: "2024-01-15T10:00:00Z",
  },
];

export default function InboxSettingsPage() {
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>(mockConnectedAccounts);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [twilioDialogOpen, setTwilioDialogOpen] = useState(false);
  const [twilioConfig, setTwilioConfig] = useState({
    accountSid: "",
    authToken: "",
    phoneNumber: "",
  });

  const handleConnectOAuth = async (channel: string, provider?: string) => {
    setConnecting(channel);

    // Simulate OAuth flow
    toast.info("Redirecting to authorization...", {
      description: `Connecting ${provider || channel}...`,
    });

    setTimeout(() => {
      // In production, this would redirect to OAuth URL
      const newAccount: ConnectedAccount = {
        id: Date.now().toString(),
        channel,
        accountName: provider === "gmail" ? "example@gmail.com" : `${channel}_account`,
        accountId: `${channel}_${Date.now()}`,
        isActive: true,
        connectedAt: new Date().toISOString(),
      };

      setConnectedAccounts((prev) => [...prev, newAccount]);
      setConnecting(null);
      toast.success("Account connected!", {
        description: `Your ${channel} account has been connected.`,
      });
    }, 2000);
  };

  const handleConnectTwilio = () => {
    if (!twilioConfig.accountSid || !twilioConfig.authToken || !twilioConfig.phoneNumber) {
      toast.error("Please fill in all fields");
      return;
    }

    setConnecting("sms");

    setTimeout(() => {
      const newAccount: ConnectedAccount = {
        id: Date.now().toString(),
        channel: "sms",
        accountName: twilioConfig.phoneNumber,
        accountId: twilioConfig.accountSid,
        isActive: true,
        connectedAt: new Date().toISOString(),
      };

      setConnectedAccounts((prev) => [...prev, newAccount]);
      setConnecting(null);
      setTwilioDialogOpen(false);
      setTwilioConfig({ accountSid: "", authToken: "", phoneNumber: "" });
      toast.success("Twilio connected!", {
        description: "Your SMS account has been connected.",
      });
    }, 1500);
  };

  const handleDisconnect = (accountId: string) => {
    setConnectedAccounts((prev) => prev.filter((a) => a.id !== accountId));
    toast.success("Account disconnected");
  };

  const handleToggleActive = (accountId: string) => {
    setConnectedAccounts((prev) =>
      prev.map((a) =>
        a.id === accountId ? { ...a, isActive: !a.isActive } : a
      )
    );
  };

  const getAccountForChannel = (channelId: string) => {
    return connectedAccounts.find((a) => a.channel === channelId);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/inbox">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Channel Settings
          </h1>
          <p className="text-muted-foreground">
            Connect and manage your communication channels
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="channels" className="space-y-6">
        <TabsList>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="space-y-4">
          {/* Connected Channels Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Connected Channels</CardTitle>
              <CardDescription>
                {connectedAccounts.length} of {channelConfigs.length} channels connected
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {channelConfigs.map((channel) => {
                  const account = getAccountForChannel(channel.id);
                  const Icon = channel.icon;
                  return (
                    <div
                      key={channel.id}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border",
                        account
                          ? "border-green-200 bg-green-50"
                          : "border-dashed border-muted-foreground/30"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4",
                          account ? channel.color : "text-muted-foreground"
                        )}
                      />
                      <span
                        className={cn(
                          "text-sm",
                          account ? "font-medium" : "text-muted-foreground"
                        )}
                      >
                        {channel.name}
                      </span>
                      {account && <Check className="h-4 w-4 text-green-500" />}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Channel Cards */}
          <div className="grid gap-4">
            {channelConfigs.map((channel) => {
              const account = getAccountForChannel(channel.id);
              const Icon = channel.icon;

              return (
                <Card key={channel.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div
                          className={cn(
                            "h-12 w-12 rounded-lg flex items-center justify-center",
                            channel.bgColor
                          )}
                        >
                          <Icon className={cn("h-6 w-6", channel.color)} />
                        </div>
                        <div>
                          <h3 className="font-semibold flex items-center gap-2">
                            {channel.name}
                            {account && (
                              <Badge
                                variant={account.isActive ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {account.isActive ? "Active" : "Paused"}
                              </Badge>
                            )}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {channel.description}
                          </p>
                          {account && (
                            <p className="text-sm text-primary mt-1 font-medium">
                              {account.accountName}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-3">
                            {channel.features.map((feature) => (
                              <Badge
                                key={feature}
                                variant="outline"
                                className="text-xs font-normal"
                              >
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {account ? (
                          <>
                            <Switch
                              checked={account.isActive}
                              onCheckedChange={() => handleToggleActive(account.id)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDisconnect(account.id)}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                            </Button>
                          </>
                        ) : channel.id === "sms" ? (
                          <Dialog open={twilioDialogOpen} onOpenChange={setTwilioDialogOpen}>
                            <DialogTrigger asChild>
                              <Button className="gap-2">
                                <Key className="h-4 w-4" />
                                Connect API
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Connect Twilio for SMS</DialogTitle>
                                <DialogDescription>
                                  Enter your Twilio credentials to enable SMS messaging.
                                  You can find these in your Twilio Console.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>Account SID</Label>
                                  <Input
                                    placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                                    value={twilioConfig.accountSid}
                                    onChange={(e) =>
                                      setTwilioConfig((prev) => ({
                                        ...prev,
                                        accountSid: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Auth Token</Label>
                                  <Input
                                    type="password"
                                    placeholder="Your auth token"
                                    value={twilioConfig.authToken}
                                    onChange={(e) =>
                                      setTwilioConfig((prev) => ({
                                        ...prev,
                                        authToken: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Phone Number</Label>
                                  <Input
                                    placeholder="+1234567890"
                                    value={twilioConfig.phoneNumber}
                                    onChange={(e) =>
                                      setTwilioConfig((prev) => ({
                                        ...prev,
                                        phoneNumber: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => setTwilioDialogOpen(false)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={handleConnectTwilio}
                                  disabled={connecting === "sms"}
                                >
                                  {connecting === "sms" ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : null}
                                  Connect
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        ) : channel.providers ? (
                          <div className="flex gap-2">
                            {channel.providers.map((provider) => (
                              <Button
                                key={provider.id}
                                variant="outline"
                                className="gap-2"
                                onClick={() => handleConnectOAuth(channel.id, provider.id)}
                                disabled={connecting === channel.id}
                              >
                                {connecting === channel.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Plus className="h-4 w-4" />
                                )}
                                {provider.name}
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <Button
                            className="gap-2"
                            onClick={() => handleConnectOAuth(channel.id)}
                            disabled={connecting === channel.id}
                          >
                            {connecting === channel.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>

                    {(channel.requiresBusinessAccount || channel.requiresApiKey) && !account && (
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                        <p className="text-sm text-amber-800">
                          {channel.requiresBusinessAccount
                            ? `Requires a ${channel.name} Business account. `
                            : "Requires API credentials. "}
                          <a
                            href="#"
                            className="underline hover:no-underline"
                            onClick={(e) => e.preventDefault()}
                          >
                            Learn more
                          </a>
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Message Templates</CardTitle>
                  <CardDescription>
                    Create reusable templates for common messages
                  </CardDescription>
                </div>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: "Booking Confirmation", category: "Confirmation", uses: 156 },
                  { name: "Booking Reminder", category: "Reminder", uses: 89 },
                  { name: "Thank You", category: "Follow-up", uses: 67 },
                  { name: "Weather Update", category: "Notification", uses: 12 },
                ].map((template) => (
                  <div
                    key={template.name}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{template.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {template.category} - Used {template.uses} times
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    Automation Rules
                  </CardTitle>
                  <CardDescription>
                    Set up automatic responses and actions
                  </CardDescription>
                </div>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  {
                    name: "Auto-reply outside hours",
                    description: "Send automatic reply when office is closed",
                    active: true,
                  },
                  {
                    name: "Tag VIP customers",
                    description: "Auto-tag messages from VIP customers as high priority",
                    active: true,
                  },
                  {
                    name: "Booking keyword detection",
                    description: "Flag messages containing 'book', 'reserve', 'availability'",
                    active: false,
                  },
                ].map((rule) => (
                  <div
                    key={rule.name}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Switch checked={rule.active} />
                      <div>
                        <p className="font-medium">{rule.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {rule.description}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      Configure
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
