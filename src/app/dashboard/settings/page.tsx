"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  Building2,
  CreditCard,
  Bell,
  Mail,
  Shield,
  Globe,
  Palette,
  Save,
  Upload,
  Key,
  Smartphone,
  MessageCircle,
  FileText,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Settings saved", { description: "Your changes have been saved successfully." });
    }, 1000);
  };

  const handleUploadLogo = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        toast.success("Logo selected", { description: `${file.name} - Upload functionality will be implemented.` });
      }
    };
    input.click();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your business settings and preferences
          </p>
        </div>

        <Button className="gap-2 gradient-primary border-0" onClick={handleSave}>
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="business" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-2">
          <TabsTrigger value="business" className="gap-2">
            <Building2 className="h-4 w-4" />
            Business
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Key className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="waivers" className="gap-2">
            <FileText className="h-4 w-4" />
            Waivers
          </TabsTrigger>
        </TabsList>

        {/* Business Settings */}
        <TabsContent value="business" className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Business Information
            </h3>
            <div className="grid gap-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input id="businessName" defaultValue="TourPilot" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="businessEmail">Business Email</Label>
                  <Input id="businessEmail" type="email" defaultValue="info@tourpilot.com" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" defaultValue="+1 555-123-4567" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" defaultValue="https://tourpilot.com" />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  defaultValue="123 Marina Drive, Suite 100&#10;Coastal City, FL 33139"
                  rows={2}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="logo">Business Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center">
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <Button variant="outline" className="gap-2" onClick={handleUploadLogo}>
                    <Upload className="h-4 w-4" />
                    Upload Logo
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Regional Settings
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select defaultValue="america_new_york">
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="america_new_york">Eastern Time (ET)</SelectItem>
                    <SelectItem value="america_chicago">Central Time (CT)</SelectItem>
                    <SelectItem value="america_denver">Mountain Time (MT)</SelectItem>
                    <SelectItem value="america_los_angeles">Pacific Time (PT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Select defaultValue="usd">
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usd">USD ($)</SelectItem>
                    <SelectItem value="eur">EUR (€)</SelectItem>
                    <SelectItem value="gbp">GBP (£)</SelectItem>
                    <SelectItem value="cad">CAD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dateFormat">Date Format</Label>
                <Select defaultValue="mdy">
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                    <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                    <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payments" className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Stripe Configuration
            </h3>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="stripePublic">Publishable Key</Label>
                <Input
                  id="stripePublic"
                  defaultValue="pk_test_••••••••••••••••••••••••"
                  type="password"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="stripeSecret">Secret Key</Label>
                <Input
                  id="stripeSecret"
                  defaultValue="sk_test_••••••••••••••••••••••••"
                  type="password"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="stripeWebhook">Webhook Secret</Label>
                <Input
                  id="stripeWebhook"
                  defaultValue="whsec_••••••••••••••••••••••••"
                  type="password"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Test Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Use Stripe test environment for development
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Payment Options</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Full Payment</Label>
                  <p className="text-sm text-muted-foreground">
                    Require full payment at time of booking
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Deposits</Label>
                  <p className="text-sm text-muted-foreground">
                    Accept partial payment deposits
                  </p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-refund Cancellations</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically process refunds for cancelled bookings
                  </p>
                </div>
                <Switch />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Notifications
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Booking Confirmations</Label>
                  <p className="text-sm text-muted-foreground">
                    Send confirmation email after booking
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Tour Reminders (24h)</Label>
                  <p className="text-sm text-muted-foreground">
                    Send reminder 24 hours before tour
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Waiver Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Remind guests to sign waivers
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Review Requests</Label>
                  <p className="text-sm text-muted-foreground">
                    Ask for reviews after tour completion
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              SMS Notifications
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable SMS</Label>
                  <p className="text-sm text-muted-foreground">
                    Send SMS notifications to customers
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Tour Reminder SMS</Label>
                  <p className="text-sm text-muted-foreground">
                    Send SMS reminder before tour
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              WhatsApp Notifications
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable WhatsApp</Label>
                  <p className="text-sm text-muted-foreground">
                    Send WhatsApp messages to customers
                  </p>
                </div>
                <Switch />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations" className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Resend (Email)
            </h3>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="resendKey">API Key</Label>
                <Input
                  id="resendKey"
                  defaultValue="re_••••••••••••••••••••••••"
                  type="password"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fromEmail">From Email</Label>
                <Input id="fromEmail" defaultValue="bookings@tourpilot.com" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Twilio (SMS & WhatsApp)
            </h3>
            <div className="grid gap-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="twilioSid">Account SID</Label>
                  <Input
                    id="twilioSid"
                    defaultValue="AC••••••••••••••••••••••••"
                    type="password"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="twilioToken">Auth Token</Label>
                  <Input
                    id="twilioToken"
                    defaultValue="••••••••••••••••••••••••"
                    type="password"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="twilioPhone">Phone Number</Label>
                  <Input id="twilioPhone" defaultValue="+1 555-000-0000" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="twilioWhatsapp">WhatsApp Number</Label>
                  <Input id="twilioWhatsapp" defaultValue="+1 555-000-0001" />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5" />
              TripAdvisor
            </h3>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tripAdvisorUrl">Business Profile URL</Label>
                <Input
                  id="tripAdvisorUrl"
                  placeholder="https://www.tripadvisor.com/..."
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Include Review Link in Emails</Label>
                  <p className="text-sm text-muted-foreground">
                    Add TripAdvisor review link to post-tour emails
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Waiver Settings */}
        <TabsContent value="waivers" className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Waiver Configuration
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Waivers</Label>
                  <p className="text-sm text-muted-foreground">
                    Require all guests to sign waivers before tour
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Check-in Without Waiver</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow guests to check-in even if waiver is pending
                  </p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Send Waiver Immediately</Label>
                  <p className="text-sm text-muted-foreground">
                    Send waiver link right after booking confirmation
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="grid gap-2">
                <Label>Waiver Reminder Schedule</Label>
                <Select defaultValue="48h">
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select timing" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">24 hours before</SelectItem>
                    <SelectItem value="48h">48 hours before</SelectItem>
                    <SelectItem value="72h">72 hours before</SelectItem>
                    <SelectItem value="1week">1 week before</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Default Waiver Template</h3>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="waiverTitle">Waiver Title</Label>
                <Input id="waiverTitle" defaultValue="Liability Waiver and Release Form" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="waiverContent">Waiver Content</Label>
                <Textarea
                  id="waiverContent"
                  rows={8}
                  defaultValue={`I, the undersigned, acknowledge that I am voluntarily participating in activities provided by TourPilot. I understand that these activities involve inherent risks, including but not limited to...

By signing this waiver, I agree to release, indemnify, and hold harmless TourPilot, its owners, employees, and agents from any and all claims, damages, or liabilities arising from my participation in these activities.

I confirm that I am physically fit to participate and have disclosed any medical conditions that may affect my ability to safely participate.`}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch defaultChecked />
                <Label>Require signature for each guest</Label>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
