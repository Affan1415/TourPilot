import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireManager, canManageRole, forbiddenResponse } from "@/lib/auth/api-auth";
import { z } from "zod";

const createStaffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  role: z.enum(["admin", "location_manager", "front_desk", "captain", "affiliate"]),
  location_id: z.string().uuid().optional(),
  reports_to: z.string().uuid().optional(),
});

const updateStaffSchema = createStaffSchema.partial().extend({
  is_active: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireManager();
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const locationId = searchParams.get("location_id");
    const role = searchParams.get("role");
    const isActive = searchParams.get("is_active");
    const search = searchParams.get("search");

    let query = supabase
      .from("staff")
      .select(`
        *,
        location:locations(id, name),
        manager:staff!reports_to(id, name, role)
      `)
      .order("created_at", { ascending: false });

    // Non-admin users can only see staff from their location
    if (auth.role !== "admin" && auth.locationId) {
      query = query.eq("location_id", auth.locationId);
    } else if (locationId) {
      query = query.eq("location_id", locationId);
    }

    if (role && role !== "all") {
      query = query.eq("role", role);
    }

    if (isActive !== null) {
      query = query.eq("is_active", isActive === "true");
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized") || error.message?.includes("permission") || error.message?.includes("Forbidden")) {
      return forbiddenResponse(error.message);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireManager();
    const supabase = await createClient();
    const body = await request.json();

    const validation = createStaffSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, phone, role, location_id, reports_to } = validation.data;

    // Check role hierarchy - can the current user create this role?
    if (!canManageRole(auth.role, role as any)) {
      return NextResponse.json(
        { error: `You don't have permission to create staff with role: ${role}` },
        { status: 403 }
      );
    }

    // Non-admin users can only create staff in their location
    const targetLocationId = auth.role === "admin" ? location_id : auth.locationId;

    if (!targetLocationId) {
      return NextResponse.json(
        { error: "Location is required" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const { data: existingStaff } = await supabase
      .from("staff")
      .select("id")
      .eq("email", email)
      .single();

    if (existingStaff) {
      return NextResponse.json(
        { error: "A staff member with this email already exists" },
        { status: 400 }
      );
    }

    // If reports_to is specified, verify it exists and is a valid manager
    if (reports_to) {
      const { data: manager, error: managerError } = await supabase
        .from("staff")
        .select("id, role")
        .eq("id", reports_to)
        .single();

      if (managerError || !manager) {
        return NextResponse.json(
          { error: "Manager not found" },
          { status: 400 }
        );
      }

      // Validate hierarchy (captain/front_desk can report to location_manager or admin)
      const validManagers = ["admin", "location_manager"];
      if (!validManagers.includes(manager.role)) {
        return NextResponse.json(
          { error: "Invalid manager: must be admin or location_manager" },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from("staff")
      .insert([{
        name,
        email,
        phone: phone || null,
        role,
        location_id: targetLocationId,
        reports_to: reports_to || null,
        is_active: true,
      }])
      .select(`
        *,
        location:locations(id, name),
        manager:staff!reports_to(id, name, role)
      `)
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A staff member with this email already exists" },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized") || error.message?.includes("permission") || error.message?.includes("Forbidden")) {
      return forbiddenResponse(error.message);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
