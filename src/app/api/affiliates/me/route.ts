import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/affiliates/me - Get current affiliate's data
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
    const { data, error } = await supabase
      .from("affiliate_profiles")
      .select(`
        *,
        staff:staff_id (
          id,
          name,
          email,
          phone,
          avatar_url
        ),
        location:location_id (
          id,
          name,
          slug
        )
      `)
      .eq("staff_id", staffData.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Affiliate profile not found" }, { status: 404 });
    }

    // Get additional stats
    const { data: monthlyStats } = await supabase
      .from("affiliate_referrals")
      .select("commission_amount, status")
      .eq("affiliate_id", data.id)
      .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

    const earningsThisMonth = monthlyStats
      ?.filter(r => r.status !== "cancelled")
      .reduce((sum, r) => sum + (r.commission_amount || 0), 0) || 0;

    const referralsThisMonth = monthlyStats?.filter(r => r.status !== "cancelled").length || 0;

    const { data: pendingReferrals } = await supabase
      .from("affiliate_referrals")
      .select("commission_amount")
      .eq("affiliate_id", data.id)
      .eq("status", "pending");

    const pendingEarnings = pendingReferrals?.reduce((sum, r) => sum + (r.commission_amount || 0), 0) || 0;

    return NextResponse.json({
      data: {
        ...data,
        stats: {
          earnings_this_month: earningsThisMonth,
          referrals_this_month: referralsThisMonth,
          pending_earnings: pendingEarnings,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching affiliate data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
