import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, forbiddenResponse } from "@/lib/auth/api-auth";

export async function GET(request: NextRequest) {
  try {
    await requireStaff();

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    // Get all bookings in date range
    let query = supabase
      .from("bookings")
      .select(`
        id,
        status,
        guest_count,
        created_at,
        widget_id,
        affiliate_id,
        availability:availabilities(
          date,
          start_time,
          tour:tours(id, name)
        )
      `);

    if (startDate) {
      query = query.gte("created_at", `${startDate}T00:00:00`);
    }
    if (endDate) {
      query = query.lte("created_at", `${endDate}T23:59:59`);
    }

    const { data: bookings, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate metrics
    const totalBookings = bookings?.length || 0;
    const totalGuests = bookings?.reduce((sum, b) => sum + (b.guest_count || 0), 0) || 0;

    // Status breakdown
    const statusCounts: Record<string, number> = {};
    bookings?.forEach(b => {
      statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
    });

    // Source breakdown (widget vs direct vs affiliate)
    let widgetBookings = 0;
    let affiliateBookings = 0;
    let directBookings = 0;
    bookings?.forEach(b => {
      if (b.widget_id) widgetBookings++;
      else if (b.affiliate_id) affiliateBookings++;
      else directBookings++;
    });

    // Bookings by day of week
    const dayOfWeekCounts: number[] = [0, 0, 0, 0, 0, 0, 0];
    bookings?.forEach(b => {
      const day = new Date(b.created_at).getDay();
      dayOfWeekCounts[day]++;
    });

    // Bookings by hour
    const hourCounts: number[] = Array(24).fill(0);
    bookings?.forEach(b => {
      const hour = new Date(b.created_at).getHours();
      hourCounts[hour]++;
    });

    // Bookings by tour
    const bookingsByTour: Record<string, { name: string; count: number; guests: number }> = {};
    bookings?.forEach(b => {
      const tour = (b.availability as any)?.tour;
      if (tour) {
        if (!bookingsByTour[tour.id]) {
          bookingsByTour[tour.id] = { name: tour.name, count: 0, guests: 0 };
        }
        bookingsByTour[tour.id].count++;
        bookingsByTour[tour.id].guests += b.guest_count || 0;
      }
    });

    // Conversion by time slot
    const slotDistribution: Record<string, number> = {};
    bookings?.forEach(b => {
      const time = (b.availability as any)?.start_time?.slice(0, 5);
      if (time) {
        slotDistribution[time] = (slotDistribution[time] || 0) + 1;
      }
    });

    return NextResponse.json({
      data: {
        totalBookings,
        totalGuests,
        averageGroupSize: totalBookings > 0 ? totalGuests / totalBookings : 0,
        statusCounts,
        sourceBreakdown: {
          widget: widgetBookings,
          affiliate: affiliateBookings,
          direct: directBookings,
        },
        dayOfWeekCounts,
        hourCounts,
        bookingsByTour: Object.values(bookingsByTour).sort((a, b) => b.count - a.count),
        slotDistribution: Object.entries(slotDistribution)
          .map(([time, count]) => ({ time, count }))
          .sort((a, b) => a.time.localeCompare(b.time)),
      },
    });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized") || error.message?.includes("permission")) {
      return forbiddenResponse(error.message);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
