import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET: Get availabilities for a tour on a specific date
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ widgetKey: string }> }
) {
  try {
    const { widgetKey } = await params;
    const searchParams = request.nextUrl.searchParams;
    const tourId = searchParams.get("tour_id");
    const date = searchParams.get("date");

    if (!tourId || !date) {
      return NextResponse.json(
        { error: "tour_id and date are required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Verify widget exists and is active
    const { data: widget } = await adminClient
      .from("widgets")
      .select("id, tour_ids")
      .eq("widget_key", widgetKey)
      .eq("is_active", true)
      .single();

    if (!widget) {
      return NextResponse.json({ error: "Widget not found" }, { status: 404 });
    }

    // Check if tour is allowed for this widget
    if (widget.tour_ids && widget.tour_ids.length > 0) {
      if (!widget.tour_ids.includes(tourId)) {
        return NextResponse.json(
          { error: "Tour not available for this widget" },
          { status: 403 }
        );
      }
    }

    // Get availabilities for the tour on the date
    const { data: availabilities, error } = await adminClient
      .from("availabilities")
      .select(`
        id,
        date,
        start_time,
        end_time,
        price_override,
        capacity_override,
        booked_count,
        status,
        tour:tours(base_price, max_capacity)
      `)
      .eq("tour_id", tourId)
      .eq("date", date)
      .eq("status", "available")
      .order("start_time");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format for widget
    const slots = availabilities?.map((avail: any) => {
      const maxCapacity = avail.capacity_override || avail.tour?.max_capacity || 10;
      const available = maxCapacity - avail.booked_count;
      const price = avail.price_override || avail.tour?.base_price || 0;

      return {
        id: avail.id,
        time: avail.start_time?.slice(0, 5), // HH:MM format
        end_time: avail.end_time?.slice(0, 5),
        available,
        price,
      };
    }).filter((slot: any) => slot.available > 0) || [];

    return NextResponse.json({ slots });
  } catch (error) {
    console.error("Availabilities API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
