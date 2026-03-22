import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireStaff, forbiddenResponse } from "@/lib/auth/api-auth";

export async function GET(request: NextRequest) {
  try {
    await requireStaff();

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const tourId = searchParams.get("tour_id");
    const type = searchParams.get("type");
    const activeOnly = searchParams.get("active_only") === "true";

    let query = supabase
      .from("pricing_rules")
      .select(`
        *,
        tour:tours(id, name)
      `)
      .order("priority", { ascending: true });

    if (tourId) {
      query = query.or(`tour_id.eq.${tourId},tour_id.is.null`);
    }

    if (type) {
      query = query.eq("type", type);
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
      name,
      description,
      type,
      tour_id,
      adjustment_type,
      adjustment_value,
      conditions,
      priority,
      is_stackable,
      is_active,
      valid_from,
      valid_until,
    } = body;

    if (!name || !type || !adjustment_type || adjustment_value === undefined) {
      return NextResponse.json(
        { error: "name, type, adjustment_type, and adjustment_value are required" },
        { status: 400 }
      );
    }

    const validTypes = ["seasonal", "day_of_week", "time_of_day", "capacity", "early_bird", "last_minute", "group"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    if (!["percentage", "fixed"].includes(adjustment_type)) {
      return NextResponse.json(
        { error: "adjustment_type must be 'percentage' or 'fixed'" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("pricing_rules")
      .insert([{
        name,
        description,
        type,
        tour_id: tour_id || null,
        adjustment_type,
        adjustment_value,
        conditions: conditions || {},
        priority: priority || 10,
        is_stackable: is_stackable ?? false,
        is_active: is_active ?? true,
        valid_from: valid_from || null,
        valid_until: valid_until || null,
      }])
      .select(`
        *,
        tour:tours(id, name)
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
