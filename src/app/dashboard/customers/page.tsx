"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Users,
  MoreHorizontal,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Tag,
  ExternalLink,
  MessageSquare,
  FileText,
  TrendingUp,
  UserPlus,
  Download,
  Filter,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  totalBookings: number;
  totalSpent: number;
  tags: string[];
  lastBooking: string | null;
  createdAt: string;
  bookings: any[];
  notes: string | null;
}

const tagColors: Record<string, string> = {
  VIP: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  Repeat: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  Corporate: "bg-green-100 text-green-800 hover:bg-green-100",
  Family: "bg-orange-100 text-orange-800 hover:bg-orange-100",
};

export default function CustomersPage() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from('customers')
          .select(`
            *,
            bookings(id, booking_reference, total_price, status, created_at, availabilities(tours(name)))
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching customers:', error);
          return;
        }

        if (data) {
          setCustomers(data.map(c => {
            const bookings = c.bookings || [];
            const totalSpent = bookings.reduce((sum: number, b: any) => sum + (b.total_price || 0), 0);
            const lastBooking = bookings.length > 0
              ? bookings.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at
              : null;

            // Use tags from database or determine based on behavior
            const tags: string[] = c.tags || [];
            if (tags.length === 0) {
              if (bookings.length >= 5) tags.push('VIP');
              if (bookings.length >= 2) tags.push('Repeat');
            }

            return {
              id: c.id,
              email: c.email || '',
              firstName: c.first_name || '',
              lastName: c.last_name || '',
              phone: c.phone || '',
              totalBookings: c.total_bookings || bookings.length,
              totalSpent: c.total_spent || totalSpent,
              tags,
              lastBooking,
              createdAt: c.created_at,
              bookings: bookings.map((b: any) => ({
                id: b.booking_reference,
                tour: b.availabilities?.tours?.name || 'Unknown Tour',
                date: b.created_at,
                amount: b.total_price || 0,
                status: b.status,
              })),
              notes: c.notes || null,
            };
          }));
        }
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery)
  );

  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((acc, c) => acc + c.totalSpent, 0);
  const vipCustomers = customers.filter((c) => c.tags.includes("VIP")).length;

  const exportCustomers = () => {
    const headers = ["Name", "Email", "Phone", "Total Bookings", "Total Spent", "Tags", "Last Booking", "Customer Since"];
    const csvContent = [
      headers.join(","),
      ...filteredCustomers.map(c => [
        `"${c.firstName} ${c.lastName}"`,
        c.email,
        c.phone || "",
        c.totalBookings,
        c.totalSpent,
        `"${c.tags.join("; ")}"`,
        c.lastBooking ? format(new Date(c.lastBooking), "yyyy-MM-dd") : "",
        format(new Date(c.createdAt), "yyyy-MM-dd")
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `customers-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("Exported", { description: "Customer list exported to CSV file." });
  };

  const handleAddCustomer = () => {
    window.location.href = "/dashboard/customers/new";
  };

  const sendMessageToCustomer = async (customer: Customer) => {
    if (!customer.email) {
      toast.error("No email address", { description: "Customer doesn't have an email address." });
      return;
    }

    setSendingMessage(true);
    // Open email client as a simple solution
    window.open(`mailto:${customer.email}`, '_blank');
    setSendingMessage(false);
    toast.info("Email client opened", { description: `Compose email to ${customer.email}` });
  };

  const newBookingForCustomer = (customer: Customer) => {
    window.location.href = `/dashboard/bookings/new?customer=${customer.id}`;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-lg" />
            ))}
          </div>
          <div className="h-96 bg-muted rounded-lg" />
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
            <Users className="h-6 w-6 text-primary" />
            Customer CRM
          </h1>
          <p className="text-muted-foreground">
            Manage customer relationships and booking history
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2" onClick={exportCustomers}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button className="gap-2 gradient-primary border-0" onClick={handleAddCustomer}>
            <UserPlus className="h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold">{totalCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">VIP Customers</p>
                <p className="text-2xl font-bold">{vipCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => toast.info("Filters", { description: "Filter functionality coming soon." })}
        >
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Customer Table */}
      <Card>
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No customers found</p>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "Try adjusting your search"
                : "Customers will appear here when they make bookings"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Bookings</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Last Booking</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {customer.firstName[0] || '?'}
                          {customer.lastName[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {customer.firstName} {customer.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Customer since {format(new Date(customer.createdAt), "MMM yyyy")}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {customer.email}
                      </p>
                      <p className="text-sm flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {customer.phone || '-'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{customer.totalBookings}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-green-600">
                      ${customer.totalSpent.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {customer.tags.map((tag) => (
                        <Badge
                          key={tag}
                          className={cn("text-xs", tagColors[tag] || "bg-gray-100 text-gray-800")}
                        >
                          {tag}
                        </Badge>
                      ))}
                      {customer.tags.length === 0 && (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {customer.lastBooking
                        ? format(new Date(customer.lastBooking), "MMM d, yyyy")
                        : '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedCustomer(customer)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                                {customer.firstName[0] || '?'}
                                {customer.lastName[0] || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p>
                                {customer.firstName} {customer.lastName}
                              </p>
                              <div className="flex gap-1 mt-1">
                                {customer.tags.map((tag) => (
                                  <Badge
                                    key={tag}
                                    className={cn("text-xs", tagColors[tag])}
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </DialogTitle>
                        </DialogHeader>

                        <Tabs defaultValue="overview" className="mt-4">
                          <TabsList>
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="bookings">Bookings</TabsTrigger>
                            <TabsTrigger value="communications">Communications</TabsTrigger>
                          </TabsList>

                          <TabsContent value="overview" className="mt-4 space-y-4">
                            {/* Contact Info */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">Email</p>
                                <a
                                  href={`mailto:${customer.email}`}
                                  className="font-medium hover:text-primary"
                                >
                                  {customer.email}
                                </a>
                              </div>
                              <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">Phone</p>
                                <a
                                  href={`tel:${customer.phone}`}
                                  className="font-medium hover:text-primary"
                                >
                                  {customer.phone || '-'}
                                </a>
                              </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4">
                              <div className="p-4 bg-muted rounded-lg text-center">
                                <p className="text-2xl font-bold">{customer.totalBookings}</p>
                                <p className="text-sm text-muted-foreground">Total Bookings</p>
                              </div>
                              <div className="p-4 bg-muted rounded-lg text-center">
                                <p className="text-2xl font-bold text-green-600">
                                  ${customer.totalSpent}
                                </p>
                                <p className="text-sm text-muted-foreground">Total Spent</p>
                              </div>
                              <div className="p-4 bg-muted rounded-lg text-center">
                                <p className="text-2xl font-bold">
                                  ${customer.totalBookings > 0 ? Math.round(customer.totalSpent / customer.totalBookings) : 0}
                                </p>
                                <p className="text-sm text-muted-foreground">Avg. Booking</p>
                              </div>
                            </div>

                            {/* Notes */}
                            {customer.notes && (
                              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm font-medium text-yellow-800 mb-1">Notes</p>
                                <p className="text-sm text-yellow-900">{customer.notes}</p>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3">
                              <Button
                                className="flex-1 gap-2"
                                onClick={() => sendMessageToCustomer(customer)}
                                disabled={sendingMessage}
                              >
                                {sendingMessage ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MessageSquare className="h-4 w-4" />
                                )}
                                Send Message
                              </Button>
                              <Button
                                variant="outline"
                                className="flex-1 gap-2"
                                onClick={() => newBookingForCustomer(customer)}
                              >
                                <Calendar className="h-4 w-4" />
                                New Booking
                              </Button>
                            </div>
                          </TabsContent>

                          <TabsContent value="bookings" className="mt-4">
                            {customer.bookings.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">
                                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p>No bookings yet</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {customer.bookings.map((booking: any) => (
                                  <div
                                    key={booking.id}
                                    className="flex items-center justify-between p-4 bg-muted rounded-lg"
                                  >
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className="font-medium">{booking.tour}</p>
                                        <Badge variant="outline" className="text-xs font-mono">
                                          {booking.id}
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        {format(new Date(booking.date), "MMMM d, yyyy")}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-semibold">${booking.amount}</p>
                                      <Badge
                                        className={
                                          booking.status === "completed"
                                            ? "bg-green-100 text-green-800"
                                            : booking.status === "confirmed"
                                            ? "bg-blue-100 text-blue-800"
                                            : "bg-yellow-100 text-yellow-800"
                                        }
                                      >
                                        {booking.status}
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </TabsContent>

                          <TabsContent value="communications" className="mt-4">
                            <div className="text-center py-8 text-muted-foreground">
                              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                              <p>Communication history will appear here</p>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
