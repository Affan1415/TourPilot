import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, requireAdmin, forbiddenResponse } from "@/lib/auth/api-auth";

// GET: List availabilities with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const tourId = searchParams.get("tour_id");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const status = searchParams.get("status");
    const boatId = searchParams.get("boat_id");

    let query = supabase
      .from("availabilities")
      .select(`
        *,
        tour:tours(id, name, slug, base_price, duration_minutes, max_capacity),
        boat:boats(id, name, capacity)
      `)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (tourId) {
      query = query.eq("tour_id", tourId);
    }

    if (startDate) {
      query = query.gte("date", startDate);
    }

    if (endDate) {
      query = query.lte("date", endDate);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (boatId) {
      query = query.eq("boat_id", boatId);
    }

    const { data, error } = await query;

    if (error) {
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

// POST: Create availability (single or bulk)
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

    // Check if bulk creation
    if (body.bulk) {
      const { tour_id, boat_id, start_date, end_date, days_of_week, time_slots, capacity_override, price_override } = body;

      if (!tour_id || !start_date || !end_date || !time_slots?.length) {
        return NextResponse.json(
          { error: "tour_id, start_date, end_date, and time_slots are required for bulk creation" },
          { status: 400 }
        );
      }

      const availabilities: any[] = [];
      const start = new Date(start_date);
      const end = new Date(end_date);

      // Generate availabilities for each day in range
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

        // Skip if days_of_week is specified and this day isn't included
        if (days_of_week && days_of_week.length > 0 && !days_of_week.includes(dayOfWeek)) {
          continue;
        }

        const dateStr = date.toISOString().split("T")[0];

        for (const slot of time_slots) {
          availabilities.push({
            tour_id,
            boat_id: boat_id || null,
            date: dateStr,
            start_time: slot.start_time,
            end_time: slot.end_time,
            capacity_override: capacity_override || null,
            price_override: price_override || null,
            status: "available",
          });
        }
      }

      if (availabilities.length === 0) {
        return NextResponse.json(
          { error: "No availabilities to create with given parameters" },
          { status: 400 }
        );
      }

      // Insert with upsert to handle existing entries
      const { data, error } = await adminClient
        .from("availabilities")
        .upsert(availabilities, {
          onConflict: "tour_id,date,start_time",
          ignoreDuplicates: true,
        })
        .select();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        data,
        message: `Created ${data?.length || 0} availabilities`,
      }, { status: 201 });
    }

    // Single availability creation
    const { tour_id, boat_id, date, start_time, end_time, capacity_override, price_override } = body;

    if (!tour_id || !date || !start_time || !end_time) {
      return NextResponse.json(
        { error: "tour_id, date, start_time, and end_time are required" },
        { status: 400 }
      );
    }

    const { data, error } = await adminClient
      .from("availabilities")
      .insert([{
        tour_id,
        boat_id: boat_id || null,
        date,
        start_time,
        end_time,
        capacity_override: capacity_override || null,
        price_override: price_override || null,
        status: "available",
      }])
      .select(`
        *,
        tour:tours(id, name),
        boat:boats(id, name)
      `)
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Availability already exists for this tour/date/time" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
