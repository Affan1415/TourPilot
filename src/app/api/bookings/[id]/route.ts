import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, forbiddenResponse } from "@/lib/auth/api-auth";

// Helper to check if string is UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// GET: Get a single booking by ID or booking reference
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminClient = createAdminClient();

    // Determine if ID is UUID or booking reference
    const isId = isUUID(id);
    const column = isId ? "id" : "booking_reference";

    const { data, error } = await adminClient
      .from("bookings")
      .select(`
        *,
        customer:customers(*),
        availability:availabilities(
          *,
          tour:tours(*)
        ),
        guests:booking_guests(
          *,
          waivers(status)
        ),
        waivers(
          *,
          waiver_template:waiver_templates(name)
        )
      `)
      .eq(column, id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
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

// PUT: Update a booking
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check staff permission
    try {
      await requireStaff();
    } catch (e: any) {
      return forbiddenResponse(e.message);
    }

    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Fields that can be updated
    const allowedFields = ["guest_count", "notes", "status", "special_requests"];
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

    // If updating guest_count, check capacity
    if (updateData.guest_count) {
      const { data: booking } = await supabase
        .from("bookings")
        .select(`
          guest_count,
          availability:availabilities(
            booked_count,
            capacity_override,
            tour:tours(max_capacity)
          )
        `)
        .eq("id", id)
        .single();

      if (booking) {
        const availability = booking.availability as any;
        const maxCapacity = availability?.capacity_override || availability?.tour?.max_capacity || 10;
        const currentBooked = availability?.booked_count || 0;
        const oldGuestCount = booking.guest_count;
        const newGuestCount = updateData.guest_count;
        const availableSpots = maxCapacity - currentBooked + oldGuestCount;

        if (newGuestCount > availableSpots) {
          return NextResponse.json(
            { error: `Only ${availableSpots} spots available` },
            { status: 400 }
          );
        }
      }
    }

    const { data, error } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        customer:customers(*),
        availability:availabilities(
          *,
          tour:tours(*)
        ),
        guests:booking_guests(*)
      `)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
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

// DELETE: Soft delete (cancel) a booking
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check staff permission
    try {
      await requireStaff();
    } catch (e: any) {
      return forbiddenResponse(e.message);
    }

    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, message: "Booking cancelled successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
