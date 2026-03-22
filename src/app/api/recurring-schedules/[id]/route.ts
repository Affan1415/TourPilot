import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireStaff, forbiddenResponse } from "@/lib/auth/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaff();

    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("recurring_schedules")
      .select(`
        *,
        tour:tours(id, name, base_price, max_capacity),
        boat:boats(id, name)
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
      }
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const { id: _, created_at, updated_at, ...updateData } = body;

    // Validate days_of_week if provided
    if (updateData.days_of_week) {
      if (!Array.isArray(updateData.days_of_week) || updateData.days_of_week.length === 0) {
        return NextResponse.json(
          { error: "days_of_week must be a non-empty array" },
          { status: 400 }
        );
      }
      for (const day of updateData.days_of_week) {
        if (typeof day !== "number" || day < 0 || day > 6) {
          return NextResponse.json(
            { error: "days_of_week must contain numbers 0-6" },
            { status: 400 }
          );
        }
      }
    }

    const { data, error } = await supabase
      .from("recurring_schedules")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        tour:tours(id, name, base_price, max_capacity),
        boat:boats(id, name)
      `)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
      }
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const supabase = await createClient();

    const { error } = await supabase
      .from("recurring_schedules")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Schedule deleted" });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized") || error.message?.includes("permission")) {
      return forbiddenResponse(error.message);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const allowedFields = [
      "tour_id", "boat_id", "name", "days_of_week", "start_time",
      "end_time", "capacity_override", "price_override", "auto_assign_staff",
      "staff_ids", "is_active", "valid_from", "valid_until", "exclude_dates"
    ];
    const updateData: Record<string, any> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("recurring_schedules")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        tour:tours(id, name, base_price, max_capacity),
        boat:boats(id, name)
      `)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
      }
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
