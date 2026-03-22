import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, forbiddenResponse } from "@/lib/auth/api-auth";

// GET: Get a single customer with booking history
export async function GET(
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
      .from("customers")
      .select(`
        *,
        bookings(
          id,
          booking_reference,
          guest_count,
          total_price,
          status,
          payment_status,
          created_at,
          availability:availabilities(
            date,
            start_time,
            tour:tours(name)
          )
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Sort bookings by date descending
    if (data.bookings) {
      data.bookings.sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT: Update a customer
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
    const allowedFields = ["first_name", "last_name", "phone", "country_code", "notes", "tags"];
    const updateData: Record<string, any> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Handle email separately (needs uniqueness check)
    if (body.email) {
      const adminClient = createAdminClient();
      const { data: existing } = await adminClient
        .from("customers")
        .select("id")
        .eq("email", body.email.toLowerCase())
        .neq("id", id)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: "Another customer with this email already exists" },
          { status: 409 }
        );
      }
      updateData.email = body.email.toLowerCase();
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("customers")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 });
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

// DELETE: Archive a customer (soft delete)
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

    // Check for active bookings
    const { data: activeBookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("customer_id", id)
      .in("status", ["pending", "confirmed"])
      .limit(1);

    if (activeBookings && activeBookings.length > 0) {
      return NextResponse.json(
        { error: "Cannot archive customer with active bookings" },
        { status: 400 }
      );
    }

    // Soft delete by adding "archived" tag
    const { data: customer } = await supabase
      .from("customers")
      .select("tags, notes")
      .eq("id", id)
      .single();

    const currentTags = (customer?.tags as string[]) || [];
    if (!currentTags.includes("archived")) {
      currentTags.push("archived");
    }

    const { data, error } = await supabase
      .from("customers")
      .update({
        tags: currentTags,
        notes: `[ARCHIVED] ${customer?.notes || ""}`.trim(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, message: "Customer archived successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
