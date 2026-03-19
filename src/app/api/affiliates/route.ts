import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/affiliates - List all affiliates (admin/location_manager only)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify user is admin or location manager
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: staffData } = await supabase
      .from("staff")
      .select("role, location_id, is_active")
      .eq("user_id", user.id)
      .single();

    if (!staffData || !staffData.is_active || !["admin", "location_manager"].includes(staffData.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const locationId = searchParams.get("location_id");

    // Build query
    let query = supabase
      .from("affiliate_profiles")
      .select(`
        *,
        staff:staff_id (
          id,
          name,
          email,
          phone,
          avatar_url,
          is_active
        ),
        location:location_id (
          id,
          name,
          slug
        )
      `)
      .order("created_at", { ascending: false });

    // Location managers can only see affiliates for their location
    if (staffData.role === "location_manager" && staffData.location_id) {
      query = query.eq("location_id", staffData.location_id);
    } else if (locationId) {
      query = query.eq("location_id", locationId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error fetching affiliates:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/affiliates - Create new affiliate (admin/location_manager only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Verify user is admin or location manager
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: staffData } = await supabase
      .from("staff")
      .select("role, location_id, is_active")
      .eq("user_id", user.id)
      .single();

    if (!staffData || !staffData.is_active || !["admin", "location_manager"].includes(staffData.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      staff_id,
      location_id,
      commission_type = "percentage",
      commission_rate = 10,
      discount_type = "percentage",
      discount_value = 5,
    } = body;

    // Location managers can only create affiliates for their location
    if (staffData.role === "location_manager" && staffData.location_id !== location_id) {
      return NextResponse.json({ error: "You can only create affiliates for your location" }, { status: 403 });
    }

    // Verify staff exists and get their name
    const { data: affiliateStaff } = await adminClient
      .from("staff")
      .select("id, name, role")
      .eq("id", staff_id)
      .single();

    if (!affiliateStaff) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    // Update staff role to affiliate if not already
    if (affiliateStaff.role !== "affiliate") {
      await adminClient
        .from("staff")
        .update({ role: "affiliate" })
        .eq("id", staff_id);
    }

    // Get location slug for code generation
    const { data: location } = await adminClient
      .from("locations")
      .select("slug, name")
      .eq("id", location_id)
      .single();

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    // Generate affiliate code
    const { data: codeResult } = await adminClient
      .rpc("generate_affiliate_code", {
        location_slug: location.slug || location.name,
        staff_name: affiliateStaff.name,
      });

    const affiliateCode = codeResult || `AFF-${Date.now().toString(36).toUpperCase()}`;

    // Create affiliate profile
    const { data: affiliate, error } = await adminClient
      .from("affiliate_profiles")
      .insert({
        staff_id,
        location_id,
        affiliate_code: affiliateCode,
        commission_type,
        commission_rate,
        discount_type,
        discount_value,
        is_active: true,
      })
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
      .single();

    if (error) {
      console.error("Error creating affiliate:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: affiliate }, { status: 201 });
  } catch (error) {
    console.error("Error creating affiliate:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
