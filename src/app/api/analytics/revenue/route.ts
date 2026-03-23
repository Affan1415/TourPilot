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

    // Get bookings in date range with payment info (including refunded)
    let query = supabase
      .from("bookings")
      .select(`
        id,
        total_price,
        original_price,
        discount_amount,
        payment_status,
        status,
        created_at,
        source,
        availability:availabilities(
          date,
          tour:tours(id, name)
        )
      `)
      .in("status", ["confirmed", "completed", "cancelled"])
      .in("payment_status", ["paid", "refunded"]);

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
    const paidBookings = bookings?.filter(b => b.payment_status === "paid") || [];
    const refundedBookings = bookings?.filter(b => b.payment_status === "refunded") || [];

    const grossRevenue = paidBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
    const totalRefunds = refundedBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
    const totalDiscounts = bookings?.reduce((sum, b) => sum + (b.discount_amount || 0), 0) || 0;
    const totalRevenue = grossRevenue - totalRefunds; // Net revenue
    const bookingCount = paidBookings.length;
    const averageBookingValue = bookingCount > 0 ? grossRevenue / bookingCount : 0;

    // Source breakdown
    const sourceBreakdown: Record<string, { count: number; revenue: number }> = {};
    paidBookings.forEach(booking => {
      const source = (booking as any).source || "direct";
      if (!sourceBreakdown[source]) {
        sourceBreakdown[source] = { count: 0, revenue: 0 };
      }
      sourceBreakdown[source].count += 1;
      sourceBreakdown[source].revenue += booking.total_price || 0;
    });

    // Daily breakdown (only paid bookings)
    const dailyRevenue: Record<string, { revenue: number; bookings: number }> = {};
    paidBookings.forEach(booking => {
      const date = booking.created_at.split("T")[0];
      if (!dailyRevenue[date]) {
        dailyRevenue[date] = { revenue: 0, bookings: 0 };
      }
      dailyRevenue[date].revenue += booking.total_price || 0;
      dailyRevenue[date].bookings += 1;
    });

    // Revenue by tour (only paid bookings)
    const revenueByTour: Record<string, { name: string; revenue: number; bookings: number }> = {};
    paidBookings.forEach(booking => {
      const tour = (booking.availability as any)?.tour;
      if (tour) {
        if (!revenueByTour[tour.id]) {
          revenueByTour[tour.id] = { name: tour.name, revenue: 0, bookings: 0 };
        }
        revenueByTour[tour.id].revenue += booking.total_price || 0;
        revenueByTour[tour.id].bookings += 1;
      }
    });

    return NextResponse.json({
      data: {
        grossRevenue,
        totalRefunds,
        totalRevenue, // Net revenue (gross - refunds)
        totalDiscounts,
        bookingCount,
        refundCount: refundedBookings.length,
        averageBookingValue,
        sourceBreakdown: Object.entries(sourceBreakdown)
          .map(([source, data]) => ({ source, ...data }))
          .sort((a, b) => b.revenue - a.revenue),
        dailyRevenue: Object.entries(dailyRevenue)
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => a.date.localeCompare(b.date)),
        revenueByTour: Object.values(revenueByTour).sort((a, b) => b.revenue - a.revenue),
      },
    });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized") || error.message?.includes("permission")) {
      return forbiddenResponse(error.message);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
