"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  MessageSquare,
  Mail,
  Phone,
  MessageCircle,
  Send,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface Communication {
  id: string;
  type: string;
  subject: string;
  recipient: {
    name: string;
    email: string;
    phone: string;
  };
  booking: string;
  status: string;
  sentAt: string;
  template: string;
  error?: string;
}

interface Template {
  id: string;
  name: string;
  type: string;
  active: boolean;
}

const typeConfig: Record<string, { label: string; icon: any; color: string }> = {
  email: { label: "Email", icon: Mail, color: "bg-blue-100 text-blue-800" },
  sms: { label: "SMS", icon: Phone, color: "bg-green-100 text-green-800" },
  whatsapp: { label: "WhatsApp", icon: MessageCircle, color: "bg-emerald-100 text-emerald-800" },
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  delivered: { label: "Delivered", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  failed: { label: "Failed", color: "bg-red-100 text-red-800", icon: XCircle },
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: Clock },
};

// Default templates - these would typically come from database/settings
const defaultTemplates: Template[] = [
  { id: "booking_confirmation", name: "Booking Confirmation", type: "email", active: true },
  { id: "tour_reminder", name: "Tour Reminder (24h)", type: "email", active: true },
  { id: "tour_reminder_sms", name: "Tour Reminder (24h)", type: "sms", active: true },
  { id: "waiver_reminder", name: "Waiver Reminder", type: "email", active: true },
  { id: "waiver_reminder_wa", name: "Waiver Reminder", type: "whatsapp", active: true },
  { id: "review_request", name: "Review Request", type: "email", active: true },
  { id: "cancellation", name: "Cancellation Notice", type: "email", active: true },
  { id: "cancellation_sms", name: "Cancellation Notice", type: "sms", active: true },
];

export default function CommunicationsPage() {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [templates] = useState<Template[]>(defaultTemplates);

  useEffect(() => {
    const fetchCommunications = async () => {
      try {
        const supabase = createClient();

        // Fetch communications/notification logs if table exists
        const { data: commsData } = await supabase
          .from('notification_logs')
          .select(`
            *,
            bookings(booking_reference),
            customers(first_name, last_name, email, phone)
          `)
          .order('created_at', { ascending: false })
          .limit(100);

        if (commsData) {
          setCommunications(commsData.map((c: any) => ({
            id: c.id,
            type: c.type || 'email',
            subject: c.subject || '',
            recipient: {
              name: `${c.customers?.first_name || ''} ${c.customers?.last_name || ''}`.trim() || 'Unknown',
              email: c.customers?.email || c.recipient_email || '',
              phone: c.customers?.phone || c.recipient_phone || '',
            },
            booking: c.bookings?.booking_reference || c.booking_reference || '',
            status: c.status || 'pending',
            sentAt: c.created_at,
            template: c.template_id || '',
            error: c.error_message,
          })));
        }
      } catch (error) {
        console.error('Error fetching communications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCommunications();
  }, []);

  const filteredComms = communications.filter((comm) => {
    const matchesSearch =
      comm.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comm.recipient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comm.recipient.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || comm.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const stats = {
    total: communications.length,
    delivered: communications.filter((c) => c.status === "delivered").length,
    failed: communications.filter((c) => c.status === "failed").length,
    today: communications.filter(
      (c) => new Date(c.sentAt).toDateString() === new Date().toDateString()
    ).length,
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-lg" />
            ))}
          </div>
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Communications
          </h1>
          <p className="text-muted-foreground">
            Manage emails, SMS, and WhatsApp messages
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 gradient-primary border-0">
                <Plus className="h-4 w-4" />
                Compose Message
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Compose Message</DialogTitle>
                <DialogDescription>
                  Send an email, SMS, or WhatsApp message to a customer.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="channel">Channel</Label>
                    <Select defaultValue="email">
                      <SelectTrigger>
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">
                          <span className="flex items-center gap-2">
                            <Mail className="h-4 w-4" /> Email
                          </span>
                        </SelectItem>
                        <SelectItem value="sms">
                          <span className="flex items-center gap-2">
                            <Phone className="h-4 w-4" /> SMS
                          </span>
                        </SelectItem>
                        <SelectItem value="whatsapp">
                          <span className="flex items-center gap-2">
                            <MessageCircle className="h-4 w-4" /> WhatsApp
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="template">Template (Optional)</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="recipient">Recipient</Label>
                  <Input id="recipient" placeholder="Search customer or enter email/phone..." />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" placeholder="Enter subject line" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Type your message here..."
                    className="min-h-[150px]"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsComposeOpen(false)}>
                  Cancel
                </Button>
                <Button className="gap-2 gradient-primary border-0">
                  <Send className="h-4 w-4" />
                  Send Message
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Sent</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Delivered</p>
          <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Failed</p>
          <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Today</p>
          <p className="text-2xl font-bold text-blue-600">{stats.today}</p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="history" className="gap-2">
            <Clock className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by subject, recipient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Communications Table */}
          <Card>
            {communications.length === 0 ? (
              <div className="p-12 text-center">
                <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">No communications yet</p>
                <p className="text-muted-foreground mb-4">
                  Communication logs will appear here when you send emails, SMS, or WhatsApp messages.
                </p>
                <Button className="gap-2 gradient-primary border-0" onClick={() => setIsComposeOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Compose Message
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Booking</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComms.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <p className="text-muted-foreground">No communications match your search</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredComms.map((comm) => {
                      const TypeIcon = typeConfig[comm.type]?.icon || Mail;
                      const StatusIcon = statusConfig[comm.status]?.icon || Clock;

                      return (
                        <TableRow key={comm.id} className="hover:bg-muted/50">
                          <TableCell>
                            <Badge className={typeConfig[comm.type]?.color || "bg-gray-100 text-gray-800"}>
                              <TypeIcon className="h-3 w-3 mr-1" />
                              {typeConfig[comm.type]?.label || comm.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{comm.subject}</p>
                            <p className="text-xs text-muted-foreground">{comm.template}</p>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{comm.recipient.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {comm.type === "email" ? comm.recipient.email : comm.recipient.phone}
                            </p>
                          </TableCell>
                          <TableCell>
                            {comm.booking ? (
                              <span className="font-mono text-sm">{comm.booking}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">
                              {format(new Date(comm.sentAt), "MMM d, yyyy")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(comm.sentAt), "h:mm a")}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusConfig[comm.status]?.color || "bg-gray-100 text-gray-800"}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig[comm.status]?.label || comm.status}
                            </Badge>
                            {comm.error && (
                              <p className="text-xs text-red-600 mt-1">{comm.error}</p>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => {
                  const TypeIcon = typeConfig[template.type]?.icon || Mail;

                  return (
                    <TableRow key={template.id} className="hover:bg-muted/50">
                      <TableCell>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {template.id}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge className={typeConfig[template.type]?.color || "bg-gray-100 text-gray-800"}>
                          <TypeIcon className="h-3 w-3 mr-1" />
                          {typeConfig[template.type]?.label || template.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            template.active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {template.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
