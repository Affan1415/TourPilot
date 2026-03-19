import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/affiliates/[id] - Get affiliate details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const { data, error } = await supabase
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
        ),
        referrals:affiliate_referrals (
          id,
          booking_id,
          booking_amount,
          discount_given,
          commission_amount,
          status,
          created_at,
          booking:booking_id (
            booking_reference,
            guest_count
          ),
          customer:customer_id (
            first_name,
            last_name,
            email
          )
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });
    }

    // Location managers can only view affiliates from their location
    if (staffData.role === "location_manager" && staffData.location_id !== data.location_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error fetching affiliate:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/affiliates/[id] - Update affiliate
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Get existing affiliate to check permissions
    const { data: existingAffiliate } = await supabase
      .from("affiliate_profiles")
      .select("location_id")
      .eq("id", id)
      .single();

    if (!existingAffiliate) {
      return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });
    }

    // Location managers can only update affiliates from their location
    if (staffData.role === "location_manager" && staffData.location_id !== existingAffiliate.location_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      commission_type,
      commission_rate,
      discount_type,
      discount_value,
      is_active,
    } = body;

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (commission_type !== undefined) updateData.commission_type = commission_type;
    if (commission_rate !== undefined) updateData.commission_rate = commission_rate;
    if (discount_type !== undefined) updateData.discount_type = discount_type;
    if (discount_value !== undefined) updateData.discount_value = discount_value;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await adminClient
      .from("affiliate_profiles")
      .update(updateData)
      .eq("id", id)
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error updating affiliate:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/affiliates/[id] - Deactivate affiliate
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Get existing affiliate to check permissions
    const { data: existingAffiliate } = await supabase
      .from("affiliate_profiles")
      .select("location_id")
      .eq("id", id)
      .single();

    if (!existingAffiliate) {
      return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });
    }

    // Location managers can only deactivate affiliates from their location
    if (staffData.role === "location_manager" && staffData.location_id !== existingAffiliate.location_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft delete by setting is_active to false
    const { error } = await adminClient
      .from("affiliate_profiles")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deactivating affiliate:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
