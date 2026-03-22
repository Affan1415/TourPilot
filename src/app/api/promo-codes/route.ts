import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireStaff, forbiddenResponse } from "@/lib/auth/api-auth";

export async function GET(request: NextRequest) {
  try {
    await requireStaff();

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get("active_only") === "true";
    const search = searchParams.get("search");

    let query = supabase
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    if (search) {
      query = query.ilike("code", `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized") || error.message?.includes("permission")) {
      return forbiddenResponse(error.message);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const supabase = await createClient();
    const body = await request.json();

    const {
      code,
      description,
      discount_type,
      discount_value,
      min_booking_value,
      max_discount,
      tour_ids,
      max_uses,
      max_uses_per_customer,
      is_active,
      valid_from,
      valid_until,
    } = body;

    if (!code || !discount_type || discount_value === undefined) {
      return NextResponse.json(
        { error: "code, discount_type, and discount_value are required" },
        { status: 400 }
      );
    }

    if (!["percentage", "fixed"].includes(discount_type)) {
      return NextResponse.json(
        { error: "discount_type must be 'percentage' or 'fixed'" },
        { status: 400 }
      );
    }

    // Check if code already exists
    const { data: existing } = await supabase
      .from("promo_codes")
      .select("id")
      .ilike("code", code)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "A promo code with this code already exists" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("promo_codes")
      .insert([{
        code: code.toUpperCase(),
        description,
        discount_type,
        discount_value,
        min_booking_value: min_booking_value || null,
        max_discount: max_discount || null,
        tour_ids: tour_ids || [],
        max_uses: max_uses || null,
        max_uses_per_customer: max_uses_per_customer || 1,
        is_active: is_active ?? true,
        valid_from: valid_from || new Date().toISOString(),
        valid_until: valid_until || null,
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized") || error.message?.includes("permission")) {
      return forbiddenResponse(error.message);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
