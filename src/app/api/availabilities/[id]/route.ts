import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, forbiddenResponse } from "@/lib/auth/api-auth";

// GET: Get a single availability with bookings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("availabilities")
      .select(`
        *,
        tour:tours(*),
        boat:boats(*),
        bookings(
          id,
          booking_reference,
          guest_count,
          status,
          customer:customers(first_name, last_name, email, phone)
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Availability not found" }, { status: 404 });
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

// PUT: Update an availability
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
    const adminClient = createAdminClient();
    const body = await request.json();

    // Check if availability has bookings before allowing certain updates
    const { data: availability } = await adminClient
      .from("availabilities")
      .select("booked_count")
      .eq("id", id)
      .single();

    if (availability && availability.booked_count > 0) {
      // Can't change date/time if bookings exist
      if (body.date || body.start_time || body.end_time) {
        return NextResponse.json(
          { error: "Cannot change date/time for availability with existing bookings" },
          { status: 400 }
        );
      }

      // Can't reduce capacity below booked count
      if (body.capacity_override && body.capacity_override < availability.booked_count) {
        return NextResponse.json(
          { error: `Cannot set capacity below current bookings (${availability.booked_count})` },
          { status: 400 }
        );
      }
    }

    const allowedFields = ["boat_id", "date", "start_time", "end_time", "price_override", "capacity_override", "status"];
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

    const { data, error } = await adminClient
      .from("availabilities")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        tour:tours(id, name),
        boat:boats(id, name)
      `)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Availability not found" }, { status: 404 });
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

// DELETE: Delete an availability
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
    const adminClient = createAdminClient();

    // Check for active bookings
    const { data: bookings } = await adminClient
      .from("bookings")
      .select("id")
      .eq("availability_id", id)
      .in("status", ["pending", "confirmed"])
      .limit(1);

    if (bookings && bookings.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete availability with active bookings" },
        { status: 400 }
      );
    }

    const { error } = await adminClient
      .from("availabilities")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Availability deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
