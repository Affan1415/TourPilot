import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/affiliates/me/referrals - Get current affiliate's referrals
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
      .select("id")
      .eq("staff_id", staffData.id)
      .single();

    if (!affiliateProfile) {
      return NextResponse.json({ error: "Affiliate profile not found" }, { status: 404 });
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get referrals
    let query = supabase
      .from("affiliate_referrals")
      .select(`
        *,
        booking:booking_id (
          booking_reference,
          guest_count,
          total_price,
          status,
          created_at,
          availability:availability_id (
            date,
            start_time,
            tour:tour_id (
              name
            )
          )
        ),
        customer:customer_id (
          first_name,
          last_name,
          email
        )
      `, { count: "exact" })
      .eq("affiliate_id", affiliateProfile.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error("Error fetching referrals:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
