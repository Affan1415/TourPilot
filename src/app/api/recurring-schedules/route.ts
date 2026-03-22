import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireStaff, forbiddenResponse } from "@/lib/auth/api-auth";

export async function GET(request: NextRequest) {
  try {
    await requireStaff();

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const tourId = searchParams.get("tour_id");
    const activeOnly = searchParams.get("active_only") === "true";

    let query = supabase
      .from("recurring_schedules")
      .select(`
        *,
        tour:tours(id, name, base_price, max_capacity),
        boat:boats(id, name)
      `)
      .order("created_at", { ascending: false });

    if (tourId) {
      query = query.eq("tour_id", tourId);
    }

    if (activeOnly) {
      query = query.eq("is_active", true);
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
      tour_id,
      boat_id,
      name,
      days_of_week,
      start_time,
      end_time,
      capacity_override,
      price_override,
      auto_assign_staff,
      staff_ids,
      is_active,
      valid_from,
      valid_until,
      exclude_dates,
    } = body;

    if (!tour_id || !days_of_week || !start_time || !end_time) {
      return NextResponse.json(
        { error: "tour_id, days_of_week, start_time, and end_time are required" },
        { status: 400 }
      );
    }

    // Validate days_of_week (should be array of 0-6)
    if (!Array.isArray(days_of_week) || days_of_week.length === 0) {
      return NextResponse.json(
        { error: "days_of_week must be a non-empty array of day numbers (0-6)" },
        { status: 400 }
      );
    }

    for (const day of days_of_week) {
      if (typeof day !== "number" || day < 0 || day > 6) {
        return NextResponse.json(
          { error: "days_of_week must contain numbers 0-6 (Sunday-Saturday)" },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from("recurring_schedules")
      .insert([{
        tour_id,
        boat_id: boat_id || null,
        name: name || null,
        days_of_week,
        start_time,
        end_time,
        capacity_override: capacity_override || null,
        price_override: price_override || null,
        auto_assign_staff: auto_assign_staff ?? false,
        staff_ids: staff_ids || [],
        is_active: is_active ?? true,
        valid_from: valid_from || new Date().toISOString().split("T")[0],
        valid_until: valid_until || null,
        exclude_dates: exclude_dates || [],
      }])
      .select(`
        *,
        tour:tours(id, name, base_price, max_capacity),
        boat:boats(id, name)
      `)
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
