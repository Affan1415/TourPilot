import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireStaff, forbiddenResponse, errorResponse } from "@/lib/auth/api-auth";

// GET: Get a single tour by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tours")
      .select(`
        *,
        boat:boats(*),
        availabilities(
          id,
          date,
          start_time,
          end_time,
          price_override,
          capacity_override,
          booked_count,
          status
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Tour not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Non-staff can only see active tours
    if (data.status !== "active") {
      try {
        await requireStaff();
      } catch {
        return NextResponse.json({ error: "Tour not found" }, { status: 404 });
      }
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT: Update a tour
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin permission
    try {
      await requireAdmin();
    } catch (e: any) {
      return forbiddenResponse(e.message);
    }

    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Remove fields that shouldn't be updated directly
    const { id: _, created_at, updated_at, ...updateData } = body;

    const { data, error } = await supabase
      .from("tours")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Tour not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a tour (soft delete by changing status to archived)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin permission
    try {
      await requireAdmin();
    } catch (e: any) {
      return forbiddenResponse(e.message);
    }

    const { id } = await params;
    const supabase = await createClient();

    // Check if tour has future bookings
    const { data: bookings } = await supabase
      .from("bookings")
      .select(`
        id,
        availability:availabilities!inner(
          tour_id,
          date
        )
      `)
      .eq("availability.tour_id", id)
      .gte("availability.date", new Date().toISOString().split("T")[0])
      .in("status", ["pending", "confirmed"])
      .limit(1);

    if (bookings && bookings.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete tour with upcoming bookings. Cancel bookings first or archive the tour." },
        { status: 400 }
      );
    }

    // Soft delete by setting status to archived
    const { data, error } = await supabase
      .from("tours")
      .update({ status: "archived" })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Tour not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, message: "Tour archived successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH: Toggle tour status or partial update
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin permission
    try {
      await requireAdmin();
    } catch (e: any) {
      return forbiddenResponse(e.message);
    }

    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Only allow specific fields for PATCH
    const allowedFields = ["status", "name", "description", "base_price", "max_capacity", "requires_waiver"];
    const updateData: Record<string, any> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("tours")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Tour not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
