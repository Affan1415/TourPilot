import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, forbiddenResponse } from "@/lib/auth/api-auth";

export async function GET(request: NextRequest) {
  try {
    await requireStaff();

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const status = searchParams.get("status");
    const channel = searchParams.get("channel");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("review_requests")
      .select(`
        *,
        booking:bookings(id, reference_number, tour:availabilities(tour:tours(name))),
        customer:customers(id, first_name, last_name, email),
        review:reviews(id, rating)
      `)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (channel && channel !== "all") {
      query = query.eq("channel", channel);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, count });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized") || error.message?.includes("permission")) {
      return forbiddenResponse(error.message);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireStaff();

    const supabase = await createClient();
    const body = await request.json();

    const {
      booking_id,
      customer_id,
      channel,
      target_platform,
    } = body;

    if (!booking_id || !customer_id || !channel) {
      return NextResponse.json(
        { error: "booking_id, customer_id, and channel are required" },
        { status: 400 }
      );
    }

    // Get location from booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, availability:availabilities(tour:tours(location_id))")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("review_requests")
      .insert([{
        location_id: (booking.availability as any)?.tour?.location_id || null,
        booking_id,
        customer_id,
        channel,
        target_platform: target_platform || "google",
        status: "pending",
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
