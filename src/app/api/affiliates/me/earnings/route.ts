import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/affiliates/me/earnings - Get current affiliate's earnings summary
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get staff record
    const { data: staffData } = await supabase
      .from("staff")
      .select("id, role, is_active")
      .eq("user_id", user.id)
      .single();

    if (!staffData || !staffData.is_active || staffData.role !== "affiliate") {
      return NextResponse.json({ error: "Not an affiliate" }, { status: 403 });
    }

    // Get affiliate profile
    const { data: affiliateProfile } = await supabase
      .from("affiliate_profiles")
      .select("id, total_earnings, total_bookings")
      .eq("staff_id", staffData.id)
      .single();

    if (!affiliateProfile) {
      return NextResponse.json({ error: "Affiliate profile not found" }, { status: 404 });
    }

    // Get all referrals for detailed stats
    const { data: referrals } = await supabase
      .from("affiliate_referrals")
      .select("commission_amount, status, created_at")
      .eq("affiliate_id", affiliateProfile.id);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Calculate stats
    const allReferrals = referrals || [];

    const thisMonthReferrals = allReferrals.filter(
      (r) => new Date(r.created_at) >= startOfMonth && r.status !== "cancelled"
    );

    const lastMonthReferrals = allReferrals.filter(
      (r) =>
        new Date(r.created_at) >= startOfLastMonth &&
        new Date(r.created_at) <= endOfLastMonth &&
        r.status !== "cancelled"
    );

    const pendingReferrals = allReferrals.filter((r) => r.status === "pending");
    const confirmedReferrals = allReferrals.filter((r) => r.status === "confirmed");
    const paidReferrals = allReferrals.filter((r) => r.status === "paid");

    const earningsThisMonth = thisMonthReferrals.reduce(
      (sum, r) => sum + (r.commission_amount || 0),
      0
    );

    const earningsLastMonth = lastMonthReferrals.reduce(
      (sum, r) => sum + (r.commission_amount || 0),
      0
    );

    const pendingEarnings = pendingReferrals.reduce(
      (sum, r) => sum + (r.commission_amount || 0),
      0
    );

    const confirmedEarnings = confirmedReferrals.reduce(
      (sum, r) => sum + (r.commission_amount || 0),
      0
    );

    const paidEarnings = paidReferrals.reduce(
      (sum, r) => sum + (r.commission_amount || 0),
      0
    );

    // Calculate month-over-month growth
    const growthPercentage =
      earningsLastMonth > 0
        ? ((earningsThisMonth - earningsLastMonth) / earningsLastMonth) * 100
        : earningsThisMonth > 0
        ? 100
        : 0;

    // Get monthly breakdown for the last 6 months
    const monthlyBreakdown = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const monthReferrals = allReferrals.filter(
        (r) =>
          new Date(r.created_at) >= monthStart &&
          new Date(r.created_at) <= monthEnd &&
          r.status !== "cancelled"
      );

      monthlyBreakdown.push({
        month: monthStart.toLocaleString("default", { month: "short" }),
        year: monthStart.getFullYear(),
        earnings: monthReferrals.reduce((sum, r) => sum + (r.commission_amount || 0), 0),
        referrals: monthReferrals.length,
      });
    }

    return NextResponse.json({
      data: {
        total_earnings: affiliateProfile.total_earnings,
        total_bookings: affiliateProfile.total_bookings,
        earnings_this_month: earningsThisMonth,
        earnings_last_month: earningsLastMonth,
        growth_percentage: Math.round(growthPercentage * 10) / 10,
        pending_earnings: pendingEarnings,
        confirmed_earnings: confirmedEarnings,
        paid_earnings: paidEarnings,
        referrals_this_month: thisMonthReferrals.length,
        referrals_last_month: lastMonthReferrals.length,
        monthly_breakdown: monthlyBreakdown,
      },
    });
  } catch (error) {
    console.error("Error fetching earnings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
