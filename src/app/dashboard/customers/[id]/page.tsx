"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Tag,
  MessageSquare,
  Clock,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Pin,
  PinOff,
  Bell,
  CheckCircle2,
  XCircle,
  Ship,
  FileText,
  User,
  Activity,
  Star,
  TrendingUp,
  MapPin,
  Globe,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface CustomerDetail {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  country_code: string | null;
  total_bookings: number;
  total_spent: number;
  lifetime_value: number;
  average_booking_value: number;
  first_booking_date: string | null;
  last_booking_date: string | null;
  source: string | null;
  notes: string | null;
  created_at: string;
}

interface CustomerTag {
  id: string;
  name: string;
  color: string;
}

interface CustomerNote {
  id: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  staff?: { first_name: string; last_name: string };
}

interface CustomerActivity {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  metadata: any;
  created_at: string;
}

interface Booking {
  id: string;
  booking_reference: string;
  total_price: number;
  guest_count: number;
  status: string;
  created_at: string;
  availability?: {
    date: string;
    start_time: string;
    tour?: { name: string };
  };
}

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  status: string;
}

const tagColors: Record<string, string> = {
  purple: "bg-purple-100 text-purple-800 border-purple-200",
  blue: "bg-blue-100 text-blue-800 border-blue-200",
  green: "bg-green-100 text-green-800 border-green-200",
  cyan: "bg-cyan-100 text-cyan-800 border-cyan-200",
  orange: "bg-orange-100 text-orange-800 border-orange-200",
  teal: "bg-teal-100 text-teal-800 border-teal-200",
  pink: "bg-pink-100 text-pink-800 border-pink-200",
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  gray: "bg-gray-100 text-gray-800 border-gray-200",
};

const activityIcons: Record<string, any> = {
  booking_created: Calendar,
  booking_status_changed: CheckCircle2,
  note_added: FileText,
  tag_added: Tag,
  tag_removed: Tag,
  email_sent: Mail,
  call_made: Phone,
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [allTags, setAllTags] = useState<CustomerTag[]>([]);
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [activities, setActivities] = useState<CustomerActivity[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const [showAddNote, setShowAddNote] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [showAddTag, setShowAddTag] = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [newReminder, setNewReminder] = useState({ title: "", description: "", due_date: "" });

  const fetchCustomerData = useCallback(async () => {
    try {
      const supabase = createClient();

      // Fetch customer details
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", customerId)
        .single();

      if (customerError) throw customerError;
      setCustomer(customerData);

      // Fetch customer tags
      const { data: tagAssignments } = await supabase
        .from("customer_tag_assignments")
        .select("tag:customer_tags(id, name, color)")
        .eq("customer_id", customerId);

      setTags(tagAssignments?.map((t: any) => t.tag).filter(Boolean) || []);

      // Fetch all available tags
      const { data: allTagsData } = await supabase
        .from("customer_tags")
        .select("id, name, color")
        .order("name");

      setAllTags(allTagsData || []);

      // Fetch notes
      const { data: notesData } = await supabase
        .from("customer_notes")
        .select("*, staff(first_name, last_name)")
        .eq("customer_id", customerId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      setNotes(notesData || []);

      // Fetch activities
      const { data: activitiesData } = await supabase
        .from("customer_activities")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(50);

      setActivities(activitiesData || []);

      // Fetch bookings
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_reference,
          total_price,
          guest_count,
          status,
          created_at,
          availability:availabilities(
            date,
            start_time,
            tour:tours(name)
          )
        `)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      setBookings(bookingsData || []);

      // Fetch reminders
      const { data: remindersData } = await supabase
        .from("customer_reminders")
        .select("*")
        .eq("customer_id", customerId)
        .eq("status", "pending")
        .order("due_date", { ascending: true });

      setReminders(remindersData || []);
    } catch (error) {
      console.error("Error fetching customer:", error);
      toast.error("Failed to load customer data");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchCustomerData();
  }, [fetchCustomerData]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      const supabase = createClient();
      const { error } = await supabase.from("customer_notes").insert({
        customer_id: customerId,
        content: newNote,
      });

      if (error) throw error;

      toast.success("Note added");
      setNewNote("");
      setShowAddNote(false);
      fetchCustomerData();
    } catch (error) {
      console.error("Error adding note:", error);
      toast.error("Failed to add note");
    }
  };

  const handleTogglePinNote = async (noteId: string, isPinned: boolean) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("customer_notes")
        .update({ is_pinned: !isPinned })
        .eq("id", noteId);

      if (error) throw error;
      fetchCustomerData();
    } catch (error) {
      toast.error("Failed to update note");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("customer_notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;
      toast.success("Note deleted");
      fetchCustomerData();
    } catch (error) {
      toast.error("Failed to delete note");
    }
  };

  const handleAddTag = async (tagId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from("customer_tag_assignments").insert({
        customer_id: customerId,
        tag_id: tagId,
      });

      if (error) throw error;
      toast.success("Tag added");
      setShowAddTag(false);
      fetchCustomerData();
    } catch (error: any) {
      if (error.code === "23505") {
        toast.error("Tag already assigned");
      } else {
        toast.error("Failed to add tag");
      }
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("customer_tag_assignments")
        .delete()
        .eq("customer_id", customerId)
        .eq("tag_id", tagId);

      if (error) throw error;
      toast.success("Tag removed");
      fetchCustomerData();
    } catch (error) {
      toast.error("Failed to remove tag");
    }
  };

  const handleAddReminder = async () => {
    if (!newReminder.title || !newReminder.due_date) return;

    try {
      const supabase = createClient();
      const { error } = await supabase.from("customer_reminders").insert({
        customer_id: customerId,
        title: newReminder.title,
        description: newReminder.description || null,
        due_date: new Date(newReminder.due_date).toISOString(),
      });

      if (error) throw error;
      toast.success("Reminder created");
      setNewReminder({ title: "", description: "", due_date: "" });
      setShowAddReminder(false);
      fetchCustomerData();
    } catch (error) {
      toast.error("Failed to create reminder");
    }
  };

  const handleCompleteReminder = async (reminderId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("customer_reminders")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", reminderId);

      if (error) throw error;
      toast.success("Reminder completed");
      fetchCustomerData();
    } catch (error) {
      toast.error("Failed to complete reminder");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 h-96 bg-muted rounded-lg" />
            <div className="lg:col-span-2 h-96 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6">
        <div className="text-center py-20">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium">Customer not found</p>
          <Link href="/dashboard/customers">
            <Button variant="link">Back to customers</Button>
          </Link>
        </div>
      </div>
    );
  }

  const availableTags = allTags.filter(
    (t) => !tags.some((assigned) => assigned.id === t.id)
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {customer.first_name?.[0] || "?"}
                {customer.last_name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">
                {customer.first_name} {customer.last_name}
              </h1>
              <p className="text-muted-foreground">
                Customer since {format(new Date(customer.created_at), "MMMM yyyy")}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" asChild>
            <a href={`mailto:${customer.email}`}>
              <Mail className="h-4 w-4" />
              Email
            </a>
          </Button>
          <Button className="gap-2" asChild>
            <Link href={`/dashboard/bookings/new?customer=${customer.id}`}>
              <Plus className="h-4 w-4" />
              New Booking
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Customer Info */}
        <div className="space-y-6">
          {/* Contact Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${customer.email}`} className="hover:text-primary">
                  {customer.email}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {customer.phone ? (
                  <a href={`tel:${customer.phone}`} className="hover:text-primary">
                    {customer.country_code && `+${customer.country_code} `}
                    {customer.phone}
                  </a>
                ) : (
                  <span className="text-muted-foreground">No phone</span>
                )}
              </div>
              {customer.source && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.source}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Bookings</span>
                <span className="font-semibold">{customer.total_bookings || bookings.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Spent</span>
                <span className="font-semibold text-green-600">
                  ${(customer.total_spent || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Avg. Booking</span>
                <span className="font-semibold">
                  ${(customer.average_booking_value || 0).toFixed(0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Lifetime Value</span>
                <span className="font-semibold text-primary">
                  ${(customer.lifetime_value || 0).toLocaleString()}
                </span>
              </div>
              {customer.first_booking_date && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">First Booking</span>
                  <span className="text-sm">
                    {format(new Date(customer.first_booking_date), "MMM d, yyyy")}
                  </span>
                </div>
              )}
              {customer.last_booking_date && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last Booking</span>
                  <span className="text-sm">
                    {format(new Date(customer.last_booking_date), "MMM d, yyyy")}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Tags</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowAddTag(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {tags.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tags assigned</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      className={cn("gap-1", tagColors[tag.color] || tagColors.gray)}
                    >
                      {tag.name}
                      <button
                        onClick={() => handleRemoveTag(tag.id)}
                        className="ml-1 hover:text-destructive"
                      >
                        <XCircle className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reminders */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Reminders</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowAddReminder(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {reminders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending reminders</p>
              ) : (
                <div className="space-y-3">
                  {reminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <Bell className="h-4 w-4 text-orange-500 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{reminder.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Due {format(new Date(reminder.due_date), "MMM d, yyyy")}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleCompleteReminder(reminder.id)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="bookings">
            <TabsList>
              <TabsTrigger value="bookings" className="gap-2">
                <Calendar className="h-4 w-4" />
                Bookings
              </TabsTrigger>
              <TabsTrigger value="notes" className="gap-2">
                <FileText className="h-4 w-4" />
                Notes
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2">
                <Activity className="h-4 w-4" />
                Activity
              </TabsTrigger>
            </TabsList>

            {/* Bookings Tab */}
            <TabsContent value="bookings" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  {bookings.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground">No bookings yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bookings.map((booking) => (
                        <Link
                          key={booking.id}
                          href={`/dashboard/bookings/${booking.booking_reference}`}
                          className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <Ship className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">
                                  {booking.availability?.tour?.name || "Unknown Tour"}
                                </p>
                                <Badge variant="outline" className="text-xs font-mono">
                                  {booking.booking_reference}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {booking.availability?.date &&
                                  format(new Date(booking.availability.date), "MMM d, yyyy")}{" "}
                                at {booking.availability?.start_time?.slice(0, 5)} •{" "}
                                {booking.guest_count} guest{booking.guest_count > 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">${booking.total_price}</p>
                            <Badge className={getStatusColor(booking.status)}>
                              {booking.status}
                            </Badge>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Notes</CardTitle>
                  <Button size="sm" className="gap-2" onClick={() => setShowAddNote(true)}>
                    <Plus className="h-4 w-4" />
                    Add Note
                  </Button>
                </CardHeader>
                <CardContent>
                  {notes.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground">No notes yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {notes.map((note) => (
                        <div
                          key={note.id}
                          className={cn(
                            "p-4 rounded-lg border",
                            note.is_pinned
                              ? "bg-yellow-50 border-yellow-200"
                              : "bg-muted/30 border-border"
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              {note.is_pinned && (
                                <Badge variant="outline" className="mb-2 text-xs bg-yellow-100">
                                  <Pin className="h-3 w-3 mr-1" />
                                  Pinned
                                </Badge>
                              )}
                              <p className="whitespace-pre-wrap">{note.content}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {note.staff && `${note.staff.first_name} ${note.staff.last_name} • `}
                                {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleTogglePinNote(note.id, note.is_pinned)}
                                >
                                  {note.is_pinned ? (
                                    <>
                                      <PinOff className="h-4 w-4 mr-2" />
                                      Unpin
                                    </>
                                  ) : (
                                    <>
                                      <Pin className="h-4 w-4 mr-2" />
                                      Pin
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteNote(note.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Activity Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  {activities.length === 0 ? (
                    <div className="text-center py-12">
                      <Activity className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground">No activity recorded</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                      <div className="space-y-6">
                        {activities.map((activity) => {
                          const Icon = activityIcons[activity.activity_type] || Activity;
                          return (
                            <div key={activity.id} className="relative pl-10">
                              <div className="absolute left-0 w-8 h-8 bg-background border border-border rounded-full flex items-center justify-center">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-medium">{activity.title}</p>
                                {activity.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {activity.description}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDistanceToNow(new Date(activity.created_at), {
                                    addSuffix: true,
                                  })}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Add Note Dialog */}
      <Dialog open={showAddNote} onOpenChange={setShowAddNote}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>
              Add a note about this customer for future reference.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter your note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddNote(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNote}>Add Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Tag Dialog */}
      <Dialog open={showAddTag} onOpenChange={setShowAddTag}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tag</DialogTitle>
            <DialogDescription>Select a tag to assign to this customer.</DialogDescription>
          </DialogHeader>
          {availableTags.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              All tags are already assigned
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className={cn(
                    "cursor-pointer hover:opacity-80",
                    tagColors[tag.color] || tagColors.gray
                  )}
                  onClick={() => handleAddTag(tag.id)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTag(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Reminder Dialog */}
      <Dialog open={showAddReminder} onOpenChange={setShowAddReminder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Reminder</DialogTitle>
            <DialogDescription>Create a follow-up reminder for this customer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="e.g., Follow up about group booking"
                value={newReminder.title}
                onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                placeholder="Additional details..."
                value={newReminder.description}
                onChange={(e) =>
                  setNewReminder({ ...newReminder, description: e.target.value })
                }
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Due Date</label>
              <Input
                type="datetime-local"
                value={newReminder.due_date}
                onChange={(e) => setNewReminder({ ...newReminder, due_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddReminder(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddReminder}>Create Reminder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
