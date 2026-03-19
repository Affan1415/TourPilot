import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/affiliates/validate - Validate an affiliate code and get discount info
export async function POST(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const body = await request.json();
    const { affiliate_code } = body;

    if (!affiliate_code) {
      return NextResponse.json({ error: "Affiliate code is required" }, { status: 400 });
    }

    // Get affiliate profile
    const { data: affiliate, error } = await adminClient
      .from("affiliate_profiles")
      .select(`
        id,
        affiliate_code,
        discount_type,
        discount_value,
        is_active,
        location:location_id (
          id,
          name
        )
      `)
      .eq("affiliate_code", affiliate_code.toUpperCase())
      .single();

    if (error || !affiliate) {
      return NextResponse.json({
        valid: false,
        error: "Invalid affiliate code"
      }, { status: 404 });
    }

    if (!affiliate.is_active) {
      return NextResponse.json({
        valid: false,
        error: "This affiliate code is no longer active"
      }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      data: {
        affiliate_id: affiliate.id,
        affiliate_code: affiliate.affiliate_code,
        discount_type: affiliate.discount_type,
        discount_value: affiliate.discount_value,
        location: affiliate.location,
      },
    });
  } catch (error) {
    console.error("Error validating affiliate code:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
