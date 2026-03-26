"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Wallet,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Loader2,
  RefreshCw,
  MoreHorizontal,
  User,
  FileText,
  CreditCard,
  Building,
  Receipt,
  TrendingUp,
  MapPin,
  XCircle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useLocation } from "@/lib/location/context";
import { toast } from "sonner";

interface AffiliateProfile {
  id: string;
  staff_id: string | null;
  customer_id: string | null;
  affiliate_code: string;
  commission_type: "percentage" | "fixed";
  commission_rate: number;
  total_earnings: number;
  total_bookings: number;
  pending_balance: number;
  paid_balance: number;
  is_active: boolean;
  staff?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    avatar_url?: string;
  } | null;
  customer?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  } | null;
  location: {
    id: string;
    name: string;
  };
}

// Helper to get affiliate display info
function getAffiliateInfo(affiliate: AffiliateProfile) {
  if (affiliate.staff) {
    return {
      name: affiliate.staff.name,
      email: affiliate.staff.email,
      avatar_url: affiliate.staff.avatar_url,
      type: 'staff' as const,
    };
  }
  if (affiliate.customer) {
    return {
      name: `${affiliate.customer.first_name} ${affiliate.customer.last_name}`,
      email: affiliate.customer.email,
      avatar_url: undefined,
      type: 'customer' as const,
    };
  }
  return {
    name: 'Unknown',
    email: '',
    avatar_url: undefined,
    type: 'unknown' as const,
  };
}

interface AffiliateReferral {
  id: string;
  affiliate_id: string;
  booking_id: string;
  customer_id: string;
  booking_amount: number;
  discount_given: number;
  commission_amount: number;
  status: "pending" | "confirmed" | "paid" | "cancelled";
  payout_id: string | null;
  created_at: string;
  booking?: {
    booking_reference: string;
    availability?: {
      date: string;
      tour?: {
        name: string;
      };
    };
  };
  customer?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface Payout {
  id: string;
  affiliate_id: string;
  amount: number;
  payout_method: string;
  payout_reference: string | null;
  notes: string | null;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  requested_at: string;
  processed_at: string | null;
  processed_by: string | null;
  affiliate?: AffiliateProfile;
}

interface PayoutStats {
  totalPending: number;
  totalProcessing: number;
  totalPaidThisMonth: number;
  affiliatesWithBalance: number;
}

export default function PayoutsPage() {
  const { selectedLocation } = useLocation();
  const [loading, setLoading] = useState(true);
  const [affiliates, setAffiliates] = useState<AffiliateProfile[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stats, setStats] = useState<PayoutStats | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");

  // Create payout dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<AffiliateProfile | null>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("bank_transfer");
  const [payoutReference, setPayoutReference] = useState("");
  const [payoutNotes, setPayoutNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View referrals dialog
  const [isReferralsDialogOpen, setIsReferralsDialogOpen] = useState(false);
  const [viewingAffiliate, setViewingAffiliate] = useState<AffiliateProfile | null>(null);
  const [affiliateReferrals, setAffiliateReferrals] = useState<AffiliateReferral[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);

  const fetchData = async () => {
    try {
      const supabase = createClient();

      // Fetch affiliates with balances (both staff and customer affiliates)
      let affiliatesQuery = supabase
        .from("affiliate_profiles")
        .select(`
          *,
          staff:staff_id (id, name, email, phone, avatar_url),
          customer:customer_id (id, first_name, last_name, email, phone),
          location:location_id (id, name)
        `)
        .eq("is_active", true)
        .order("pending_balance", { ascending: false });

      if (selectedLocation?.id) {
        affiliatesQuery = affiliatesQuery.eq("location_id", selectedLocation.id);
      }

      const { data: affiliatesData } = await affiliatesQuery;
      setAffiliates((affiliatesData || []) as AffiliateProfile[]);

      // Fetch payouts
      const { data: payoutsData } = await supabase
        .from("affiliate_payouts")
        .select(`
          *,
          affiliate:affiliate_id (
            id,
            affiliate_code,
            staff:staff_id (id, name, email, avatar_url),
            customer:customer_id (id, first_name, last_name, email),
            location:location_id (id, name)
          )
        `)
        .order("requested_at", { ascending: false })
        .limit(100);
      setPayouts((payoutsData || []) as Payout[]);

      // Calculate stats
      const pendingTotal = (affiliatesData || []).reduce(
        (sum: number, a: AffiliateProfile) => sum + (a.pending_balance || 0),
        0
      );
      const processingPayouts = (payoutsData || []).filter(
        (p: Payout) => p.status === "processing"
      );
      const processingTotal = processingPayouts.reduce(
        (sum: number, p: Payout) => sum + p.amount,
        0
      );

      // Paid this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const paidThisMonth = (payoutsData || [])
        .filter(
          (p: Payout) =>
            p.status === "completed" &&
            p.processed_at &&
            new Date(p.processed_at) >= startOfMonth
        )
        .reduce((sum: number, p: Payout) => sum + p.amount, 0);

      const affiliatesWithBalance = (affiliatesData || []).filter(
        (a: AffiliateProfile) => (a.pending_balance || 0) > 0
      ).length;

      setStats({
        totalPending: pendingTotal,
        totalProcessing: processingTotal,
        totalPaidThisMonth: paidThisMonth,
        affiliatesWithBalance,
      });
    } catch (error) {
      console.error("Error fetching payout data:", error);
      toast.error("Failed to load payout data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedLocation]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const fetchAffiliateReferrals = async (affiliate: AffiliateProfile) => {
    setLoadingReferrals(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("affiliate_referrals")
        .select(`
          *,
          booking:booking_id (
            booking_reference,
            availability:availability_id (
              date,
              tour:tour_id (name)
            )
          ),
          customer:customer_id (first_name, last_name, email)
        `)
        .eq("affiliate_id", affiliate.id)
        .order("created_at", { ascending: false })
        .limit(50);

      setAffiliateReferrals((data || []) as AffiliateReferral[]);
    } catch (error) {
      console.error("Error fetching referrals:", error);
    } finally {
      setLoadingReferrals(false);
    }
  };

  const handleViewReferrals = (affiliate: AffiliateProfile) => {
    setViewingAffiliate(affiliate);
    setIsReferralsDialogOpen(true);
    fetchAffiliateReferrals(affiliate);
  };

  const handleOpenCreatePayout = (affiliate: AffiliateProfile) => {
    setSelectedAffiliate(affiliate);
    setPayoutAmount(affiliate.pending_balance?.toString() || "0");
    setPayoutMethod("bank_transfer");
    setPayoutReference("");
    setPayoutNotes("");
    setIsCreateDialogOpen(true);
  };

  const handleCreatePayout = async () => {
    if (!selectedAffiliate) return;

    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid payout amount");
      return;
    }

    if (amount > (selectedAffiliate.pending_balance || 0)) {
      toast.error("Payout amount exceeds pending balance");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Get staff ID
      const { data: staffData } = await supabase
        .from("staff")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      // Create payout record
      const { data: payout, error: payoutError } = await supabase
        .from("affiliate_payouts")
        .insert({
          affiliate_id: selectedAffiliate.id,
          amount,
          payout_method: payoutMethod,
          payout_reference: payoutReference || null,
          notes: payoutNotes || null,
          status: "completed",
          processed_at: new Date().toISOString(),
          processed_by: staffData?.id,
        })
        .select()
        .single();

      if (payoutError) throw payoutError;

      // Update referrals to paid status and link to payout
      const { error: referralsError } = await supabase
        .from("affiliate_referrals")
        .update({
          status: "paid",
          payout_id: payout.id,
        })
        .eq("affiliate_id", selectedAffiliate.id)
        .eq("status", "confirmed");

      if (referralsError) {
        console.error("Error updating referrals:", referralsError);
      }

      // Update affiliate balances
      const { error: balanceError } = await supabase
        .from("affiliate_profiles")
        .update({
          pending_balance: Math.max(0, (selectedAffiliate.pending_balance || 0) - amount),
          paid_balance: (selectedAffiliate.paid_balance || 0) + amount,
        })
        .eq("id", selectedAffiliate.id);

      if (balanceError) {
        console.error("Error updating balance:", balanceError);
      }

      const affiliateInfo = getAffiliateInfo(selectedAffiliate);
      toast.success("Payout completed", {
        description: `$${amount.toFixed(2)} paid to ${affiliateInfo.name}`,
      });

      setIsCreateDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error creating payout:", error);
      toast.error("Failed to create payout", { description: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReferral = async (referral: AffiliateReferral) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("affiliate_referrals")
        .update({ status: "confirmed" })
        .eq("id", referral.id);

      if (error) throw error;

      toast.success("Referral confirmed");
      if (viewingAffiliate) {
        fetchAffiliateReferrals(viewingAffiliate);
      }
      fetchData();
    } catch {
      toast.error("Failed to confirm referral");
    }
  };

  const handleCancelReferral = async (referral: AffiliateReferral) => {
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("affiliate_referrals")
        .update({ status: "cancelled" })
        .eq("id", referral.id);

      if (updateError) throw updateError;

      toast.success("Referral cancelled");
      if (viewingAffiliate) {
        fetchAffiliateReferrals(viewingAffiliate);
      }
      fetchData();
    } catch {
      toast.error("Failed to cancel referral");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "confirmed":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><CheckCircle2 className="h-3 w-3 mr-1" />Confirmed</Badge>;
      case "processing":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case "completed":
      case "paid":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Paid</Badge>;
      case "failed":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredAffiliates = affiliates.filter((affiliate) => {
    const searchLower = searchQuery.toLowerCase();
    const info = getAffiliateInfo(affiliate);
    const matchesSearch =
      info.name.toLowerCase().includes(searchLower) ||
      info.email.toLowerCase().includes(searchLower) ||
      affiliate.affiliate_code.toLowerCase().includes(searchLower);

    if (activeTab === "pending") {
      return matchesSearch && (affiliate.pending_balance || 0) > 0;
    }
    return matchesSearch;
  });

  const filteredPayouts = payouts.filter((payout) => {
    if (statusFilter !== "all" && payout.status !== statusFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading payouts...</p>
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
            <Wallet className="h-6 w-6 text-primary" />
            Affiliate Payouts
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            {selectedLocation ? (
              <>
                <MapPin className="h-4 w-4" />
                {selectedLocation.name}
              </>
            ) : (
              "Manage affiliate commission payouts"
            )}
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">${stats?.totalPending?.toFixed(2) || "0.00"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Loader2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Processing</p>
                <p className="text-2xl font-bold">${stats?.totalProcessing?.toFixed(2) || "0.00"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paid This Month</p>
                <p className="text-2xl font-bold">${stats?.totalPaidThisMonth?.toFixed(2) || "0.00"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Awaiting Payout</p>
                <p className="text-2xl font-bold">{stats?.affiliatesWithBalance || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending Payouts
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              <User className="h-4 w-4" />
              All Affiliates
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Receipt className="h-4 w-4" />
              Payout History
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search affiliates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Pending Payouts Tab */}
        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Affiliates with Pending Balance</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredAffiliates.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">No pending payouts</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Affiliate</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Total Bookings</TableHead>
                      <TableHead>Pending</TableHead>
                      <TableHead>Total Paid</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAffiliates.map((affiliate) => {
                      const info = getAffiliateInfo(affiliate);
                      return (
                      <TableRow key={affiliate.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={info.avatar_url} />
                              <AvatarFallback>
                                {info.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{info.name}</p>
                              <p className="text-xs text-muted-foreground">{info.email}</p>
                            </div>
                            {info.type === 'customer' && (
                              <Badge variant="secondary" className="text-xs">Customer</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{affiliate.affiliate_code}</Badge>
                        </TableCell>
                        <TableCell>
                          {affiliate.commission_rate}
                          {affiliate.commission_type === "percentage" ? "%" : " fixed"}
                        </TableCell>
                        <TableCell>{affiliate.total_bookings}</TableCell>
                        <TableCell>
                          <span className="font-semibold text-yellow-600">
                            ${(affiliate.pending_balance || 0).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-green-600">
                            ${(affiliate.paid_balance || 0).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleOpenCreatePayout(affiliate)}
                              className="gap-1"
                            >
                              <DollarSign className="h-3 w-3" />
                              Pay
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewReferrals(affiliate)}
                            >
                              View
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Affiliates Tab */}
        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">All Affiliates</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Affiliate</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Bookings</TableHead>
                    <TableHead>Total Earnings</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {affiliates.map((affiliate) => {
                    const info = getAffiliateInfo(affiliate);
                    return (
                    <TableRow key={affiliate.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={info.avatar_url} />
                            <AvatarFallback>
                              {info.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{info.name}</p>
                            <p className="text-xs text-muted-foreground">{info.email}</p>
                          </div>
                          {info.type === 'customer' && (
                            <Badge variant="secondary" className="text-xs">Customer</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{affiliate.affiliate_code}</Badge>
                      </TableCell>
                      <TableCell>{affiliate.location?.name || "-"}</TableCell>
                      <TableCell>
                        {affiliate.commission_rate}
                        {affiliate.commission_type === "percentage" ? "%" : " fixed"}
                      </TableCell>
                      <TableCell>{affiliate.total_bookings}</TableCell>
                      <TableCell>${(affiliate.total_earnings || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        {(affiliate.pending_balance || 0) > 0 ? (
                          <span className="font-semibold text-yellow-600">
                            ${affiliate.pending_balance?.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">$0.00</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewReferrals(affiliate)}>
                              <FileText className="h-4 w-4 mr-2" />
                              View Referrals
                            </DropdownMenuItem>
                            {(affiliate.pending_balance || 0) > 0 && (
                              <DropdownMenuItem onClick={() => handleOpenCreatePayout(affiliate)}>
                                <DollarSign className="h-4 w-4 mr-2" />
                                Create Payout
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payout History Tab */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Payout History</CardTitle>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {filteredPayouts.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No payout history</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Affiliate</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell>
                          {format(parseISO(payout.requested_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          {(payout.affiliate as AffiliateProfile | undefined)?.staff?.name || "Unknown"}
                        </TableCell>
                        <TableCell className="font-semibold">
                          ${payout.amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="capitalize">
                          {payout.payout_method.replace("_", " ")}
                        </TableCell>
                        <TableCell>
                          {payout.payout_reference || "-"}
                        </TableCell>
                        <TableCell>{getStatusBadge(payout.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Payout Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Create Payout
            </DialogTitle>
            <DialogDescription>
              Process commission payout for {selectedAffiliate?.staff.name}
            </DialogDescription>
          </DialogHeader>

          {selectedAffiliate && (() => {
            const selectedInfo = getAffiliateInfo(selectedAffiliate);
            return (
            <div className="space-y-4">
              {/* Affiliate Info */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={selectedInfo.avatar_url} />
                    <AvatarFallback>
                      {selectedInfo.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{selectedInfo.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedInfo.email}</p>
                    {selectedInfo.type === 'customer' && (
                      <Badge variant="secondary" className="text-xs mt-1">Customer Affiliate</Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Pending Balance</p>
                    <p className="font-bold text-lg text-yellow-600">
                      ${selectedAffiliate.pending_balance?.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payout Amount */}
              <div className="grid gap-2">
                <Label>Payout Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={selectedAffiliate.pending_balance || 0}
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Payout Method */}
              <div className="grid gap-2">
                <Label>Payment Method</Label>
                <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">
                      <span className="flex items-center gap-2">
                        <Building className="h-4 w-4" /> Bank Transfer
                      </span>
                    </SelectItem>
                    <SelectItem value="paypal">
                      <span className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" /> PayPal
                      </span>
                    </SelectItem>
                    <SelectItem value="check">
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Check
                      </span>
                    </SelectItem>
                    <SelectItem value="cash">
                      <span className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" /> Cash
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reference Number */}
              <div className="grid gap-2">
                <Label>Reference Number (optional)</Label>
                <Input
                  placeholder="Transaction ID, check number, etc."
                  value={payoutReference}
                  onChange={(e) => setPayoutReference(e.target.value)}
                />
              </div>

              {/* Notes */}
              <div className="grid gap-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="Add any notes about this payout..."
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          );
          })()}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePayout}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Complete Payout
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Referrals Dialog */}
      <Dialog open={isReferralsDialogOpen} onOpenChange={setIsReferralsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Referrals - {viewingAffiliate ? getAffiliateInfo(viewingAffiliate).name : ''}
            </DialogTitle>
            <DialogDescription>
              Commission: {viewingAffiliate?.commission_rate}
              {viewingAffiliate?.commission_type === "percentage" ? "%" : " fixed"} per booking
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {loadingReferrals ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : affiliateReferrals.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No referrals yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Booking</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {affiliateReferrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell>
                        {format(parseISO(referral.created_at), "MMM d")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">
                            {referral.booking?.booking_reference || "-"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {referral.booking?.availability?.tour?.name || "-"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {referral.customer
                          ? `${referral.customer.first_name} ${referral.customer.last_name}`
                          : "-"}
                      </TableCell>
                      <TableCell>${referral.booking_amount?.toFixed(2)}</TableCell>
                      <TableCell className="font-semibold">
                        ${referral.commission_amount?.toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(referral.status)}</TableCell>
                      <TableCell>
                        {referral.status === "pending" && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleConfirmReferral(referral)}
                              className="h-7 px-2"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelReferral(referral)}
                              className="h-7 px-2 text-destructive"
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
