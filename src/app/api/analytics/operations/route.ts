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

    // Get boats
    const { data: boats } = await supabase
      .from("boats")
      .select("id, name, status");

    // Get tours
    const { data: tours } = await supabase
      .from("tours")
      .select("id, name, status");

    // Get staff (captains)
    const { data: staff } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, role")
      .in("role", ["captain", "admin"]);

    // Get availabilities in date range
    let availQuery = supabase
      .from("availabilities")
      .select(`
        id,
        date,
        start_time,
        booked_count,
        capacity_override,
        status,
        tour:tours(id, name, max_capacity)
      `);

    if (startDate) {
      availQuery = availQuery.gte("date", startDate);
    }
    if (endDate) {
      availQuery = availQuery.lte("date", endDate);
    }

    const { data: availabilities } = await availQuery;

    // Calculate utilization
    let totalCapacity = 0;
    let totalBooked = 0;
    const utilizationByTour: Record<string, { name: string; capacity: number; booked: number }> = {};

    availabilities?.forEach(a => {
      const tour = a.tour as any;
      const capacity = a.capacity_override || tour?.max_capacity || 10;
      totalCapacity += capacity;
      totalBooked += a.booked_count;

      if (tour) {
        if (!utilizationByTour[tour.id]) {
          utilizationByTour[tour.id] = { name: tour.name, capacity: 0, booked: 0 };
        }
        utilizationByTour[tour.id].capacity += capacity;
        utilizationByTour[tour.id].booked += a.booked_count;
      }
    });

    // Peak hours analysis
    const hourlyBookings: number[] = Array(24).fill(0);
    availabilities?.forEach(a => {
      if (a.start_time && a.booked_count > 0) {
        const hour = parseInt(a.start_time.split(":")[0]);
        hourlyBookings[hour] += a.booked_count;
      }
    });

    // Find peak hours
    const peakHours = hourlyBookings
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .filter(h => h.count > 0);

    // Peak days
    const dayBookings: number[] = [0, 0, 0, 0, 0, 0, 0];
    availabilities?.forEach(a => {
      if (a.date && a.booked_count > 0) {
        const day = new Date(a.date).getDay();
        dayBookings[day] += a.booked_count;
      }
    });

    const peakDays = dayBookings
      .map((count, day) => ({ day, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      data: {
        boats: {
          total: boats?.length || 0,
          active: boats?.filter(b => b.status === "active").length || 0,
          byStatus: boats?.reduce((acc, b) => {
            acc[b.status] = (acc[b.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>) || {},
        },
        tours: {
          total: tours?.length || 0,
          active: tours?.filter(t => t.status === "active").length || 0,
        },
        staff: {
          total: staff?.length || 0,
          captains: staff?.filter(s => s.role === "captain").length || 0,
        },
        utilization: {
          overall: totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0,
          totalCapacity,
          totalBooked,
          byTour: Object.values(utilizationByTour).map(t => ({
            ...t,
            utilization: t.capacity > 0 ? Math.round((t.booked / t.capacity) * 100) : 0,
          })),
        },
        peakHours,
        peakDays,
        totalSlots: availabilities?.length || 0,
        availableSlots: availabilities?.filter(a => a.status === "available").length || 0,
        fullSlots: availabilities?.filter(a => a.status === "full").length || 0,
      },
    });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized") || error.message?.includes("permission")) {
      return forbiddenResponse(error.message);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
