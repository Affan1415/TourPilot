import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, forbiddenResponse } from "@/lib/auth/api-auth";

// POST: Create blackout dates (cancel availabilities in a date range)
export async function POST(request: NextRequest) {
  try {
    // Check admin permission
    try {
      await requireAdmin();
    } catch (e: any) {
      return forbiddenResponse(e.message);
    }

    const adminClient = createAdminClient();
    const body = await request.json();

    const { tour_id, start_date, end_date, reason } = body;

    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: "start_date and end_date are required" },
        { status: 400 }
      );
    }

    // Build query for availabilities to cancel
    let query = adminClient
      .from("availabilities")
      .update({
        status: "cancelled",
      })
      .gte("date", start_date)
      .lte("date", end_date);

    if (tour_id) {
      query = query.eq("tour_id", tour_id);
    }

    const { data, error } = await query.select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check if any of these have bookings that need to be handled
    const affectedIds = data?.map((a: any) => a.id) || [];

    if (affectedIds.length > 0) {
      const { data: bookings } = await adminClient
        .from("bookings")
        .select("id, booking_reference, customer:customers(email, first_name)")
        .in("availability_id", affectedIds)
        .in("status", ["pending", "confirmed"]);

      if (bookings && bookings.length > 0) {
        return NextResponse.json({
          data,
          warning: `${bookings.length} active bookings need to be handled`,
          affected_bookings: bookings.map((b: any) => ({
            id: b.id,
            reference: b.booking_reference,
            customer_email: b.customer?.email,
          })),
          message: `Cancelled ${data?.length || 0} availabilities. Please reschedule or cancel affected bookings.`,
        });
      }
    }

    return NextResponse.json({
      data,
      message: `Cancelled ${data?.length || 0} availabilities`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Remove blackout (restore availabilities)
export async function DELETE(request: NextRequest) {
  try {
    // Check admin permission
    try {
      await requireAdmin();
    } catch (e: any) {
      return forbiddenResponse(e.message);
    }

    const adminClient = createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const tourId = searchParams.get("tour_id");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "start_date and end_date are required" },
        { status: 400 }
      );
    }

    let query = adminClient
      .from("availabilities")
      .update({ status: "available" })
      .eq("status", "cancelled")
      .gte("date", startDate)
      .lte("date", endDate);

    if (tourId) {
      query = query.eq("tour_id", tourId);
    }

    const { data, error } = await query.select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      message: `Restored ${data?.length || 0} availabilities`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
