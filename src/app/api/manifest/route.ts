import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const tourId = searchParams.get("tour_id");

    // Get availabilities for the date with bookings
    let query = supabase
      .from("availabilities")
      .select(`
        *,
        tour:tours(*),
        staff:availability_staff(
          *,
          staff:staff(*)
        )
      `)
      .eq("date", date)
      .neq("status", "cancelled");

    if (tourId) {
      query = query.eq("tour_id", tourId);
    }

    const { data: availabilities, error: availError } = await query;

    if (availError) {
      return NextResponse.json({ error: availError.message }, { status: 500 });
    }

    // Get bookings for these availabilities
    const availabilityIds = availabilities?.map((a) => a.id) || [];

    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(`
        *,
        customer:customers(*),
        guests:booking_guests(*),
        waivers(*)
      `)
      .in("availability_id", availabilityIds)
      .neq("status", "cancelled");

    if (bookingsError) {
      return NextResponse.json({ error: bookingsError.message }, { status: 500 });
    }

    // Build manifest structure
    const manifest = availabilities?.map((availability) => {
      const tourBookings = bookings?.filter(
        (b) => b.availability_id === availability.id
      ) || [];

      const totalGuests = tourBookings.reduce(
        (acc, b) => acc + (b.guests?.length || 0),
        0
      );

      const checkedInGuests = tourBookings.reduce(
        (acc, b) => acc + (b.guests?.filter((g: any) => g.checked_in)?.length || 0),
        0
      );

      const captain = availability.staff?.find(
        (s: any) => s.role === "captain"
      )?.staff;

      return {
        id: availability.id,
        tour: availability.tour,
        date: availability.date,
        start_time: availability.start_time,
        end_time: availability.end_time,
        capacity: availability.capacity_override || availability.tour?.max_capacity,
        captain,
        bookings: tourBookings.map((booking) => ({
          ...booking,
          waiver_status: getWaiverStatus(booking.waivers || []),
        })),
        stats: {
          total_guests: totalGuests,
          checked_in: checkedInGuests,
          pending_waivers: tourBookings.reduce(
            (acc, b) => acc + (b.waivers?.filter((w: any) => w.status !== "signed")?.length || 0),
            0
          ),
        },
      };
    });

    return NextResponse.json({ data: manifest });
  } catch (error) {
    console.error("Manifest error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function getWaiverStatus(waivers: any[]): "all_signed" | "partial" | "none" {
  if (waivers.length === 0) return "none";
  const signedCount = waivers.filter((w) => w.status === "signed").length;
  if (signedCount === waivers.length) return "all_signed";
  if (signedCount > 0) return "partial";
  return "none";
}
