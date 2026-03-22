import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireManager, requireAdmin, canManageRole, forbiddenResponse } from "@/lib/auth/api-auth";
import { z } from "zod";

const updateStaffSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  role: z.enum(["admin", "location_manager", "front_desk", "captain", "affiliate"]).optional(),
  location_id: z.string().uuid().optional().nullable(),
  reports_to: z.string().uuid().optional().nullable(),
  is_active: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireManager();
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("staff")
      .select(`
        *,
        location:locations(id, name),
        manager:staff!reports_to(id, name, role),
        direct_reports:staff!staff_reports_to_fkey(id, name, role, is_active)
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Non-admin users can only view staff from their location
    if (auth.role !== "admin" && data.location_id !== auth.locationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized") || error.message?.includes("permission") || error.message?.includes("Forbidden")) {
      return forbiddenResponse(error.message);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireManager();
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const validation = updateStaffSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Get current staff data
    const { data: existingStaff, error: fetchError } = await supabase
      .from("staff")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existingStaff) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    // Non-admin users can only edit staff from their location
    if (auth.role !== "admin" && existingStaff.location_id !== auth.locationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if user can manage this staff member's current role
    if (!canManageRole(auth.role, existingStaff.role)) {
      return NextResponse.json(
        { error: `You don't have permission to edit staff with role: ${existingStaff.role}` },
        { status: 403 }
      );
    }

    // If changing role, check if user can assign the new role
    if (validation.data.role && !canManageRole(auth.role, validation.data.role as any)) {
      return NextResponse.json(
        { error: `You don't have permission to assign role: ${validation.data.role}` },
        { status: 403 }
      );
    }

    // Prevent self-demotion for admins
    if (id === auth.staffId && validation.data.role && validation.data.role !== auth.role) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 400 }
      );
    }

    // Prevent self-deactivation
    if (id === auth.staffId && validation.data.is_active === false) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account" },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: Record<string, any> = {};
    const allowedFields = ["name", "email", "phone", "role", "location_id", "reports_to", "is_active"];

    for (const field of allowedFields) {
      if (validation.data[field as keyof typeof validation.data] !== undefined) {
        updateData[field] = validation.data[field as keyof typeof validation.data];
      }
    }

    // Non-admin users cannot change location
    if (auth.role !== "admin" && "location_id" in updateData) {
      delete updateData.location_id;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("staff")
      .update(updateData)
      .eq("id", id)
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

    return NextResponse.json({ data });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized") || error.message?.includes("permission") || error.message?.includes("Forbidden")) {
      return forbiddenResponse(error.message);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Only admins can delete staff
    const auth = await requireAdmin();
    const { id } = await params;
    const supabase = await createClient();

    // Prevent self-deletion
    if (id === auth.staffId) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    // Check if staff has direct reports
    const { data: directReports } = await supabase
      .from("staff")
      .select("id")
      .eq("reports_to", id)
      .eq("is_active", true);

    if (directReports && directReports.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete staff member with active direct reports. Reassign them first." },
        { status: 400 }
      );
    }

    // Soft delete (deactivate) instead of hard delete
    const { error } = await supabase
      .from("staff")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Staff member deactivated" });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized") || error.message?.includes("permission") || error.message?.includes("Forbidden")) {
      return forbiddenResponse(error.message);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
