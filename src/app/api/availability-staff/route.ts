import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireStaff, forbiddenResponse } from "@/lib/auth/api-auth";
import { z } from "zod";

const assignStaffSchema = z.object({
  availability_id: z.string().uuid(),
  staff_id: z.string().uuid(),
  role: z.enum(["captain", "crew", "guide"]).optional().default("captain"),
});

export async function GET(request: NextRequest) {
  try {
    await requireStaff();

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const availabilityId = searchParams.get("availability_id");
    const staffId = searchParams.get("staff_id");

    let query = supabase
      .from("availability_staff")
      .select(`
        *,
        staff:staff(id, name, email, role, avatar_url),
        availability:availabilities(
          id,
          date,
          start_time,
          end_time,
          tour:tours(id, name, slug)
        )
      `)
      .order("created_at", { ascending: false });

    if (availabilityId) {
      query = query.eq("availability_id", availabilityId);
    }

    if (staffId) {
      query = query.eq("staff_id", staffId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized") || error.message?.includes("permission")) {
      return forbiddenResponse(error.message);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const supabase = await createClient();
    const body = await request.json();

    const validation = assignStaffSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { availability_id, staff_id, role } = validation.data;

    // Verify the availability exists
    const { data: availability, error: availError } = await supabase
      .from("availabilities")
      .select("id")
      .eq("id", availability_id)
      .single();

    if (availError || !availability) {
      return NextResponse.json({ error: "Availability not found" }, { status: 404 });
    }

    // Verify the staff member exists and has appropriate role
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("id, role, is_active")
      .eq("id", staff_id)
      .single();

    if (staffError || !staff) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    if (!staff.is_active) {
      return NextResponse.json({ error: "Staff member is inactive" }, { status: 400 });
    }

    // Only captains can be assigned as captains
    if (role === "captain" && staff.role !== "captain") {
      return NextResponse.json(
        { error: "Only staff with 'captain' role can be assigned as captain" },
        { status: 400 }
      );
    }

    // Check if assignment already exists
    const { data: existingAssignment } = await supabase
      .from("availability_staff")
      .select("id")
      .eq("availability_id", availability_id)
      .eq("staff_id", staff_id)
      .single();

    if (existingAssignment) {
      return NextResponse.json(
        { error: "Staff member is already assigned to this availability" },
        { status: 400 }
      );
    }

    // Create the assignment
    const { data, error } = await supabase
      .from("availability_staff")
      .insert([{ availability_id, staff_id, role }])
      .select(`
        *,
        staff:staff(id, name, email, role),
        availability:availabilities(id, date, start_time, tour:tours(name))
      `)
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

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const availabilityId = searchParams.get("availability_id");
    const staffId = searchParams.get("staff_id");

    if (!availabilityId || !staffId) {
      return NextResponse.json(
        { error: "Both availability_id and staff_id are required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("availability_staff")
      .delete()
      .eq("availability_id", availabilityId)
      .eq("staff_id", staffId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Staff assignment removed" });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized") || error.message?.includes("permission")) {
      return forbiddenResponse(error.message);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
