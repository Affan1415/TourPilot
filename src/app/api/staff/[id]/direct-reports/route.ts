import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireManager, forbiddenResponse } from "@/lib/auth/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireManager();
    const { id } = await params;
    const supabase = await createClient();

    // Get the manager first to verify access
    const { data: manager, error: managerError } = await supabase
      .from("staff")
      .select("id, location_id, role")
      .eq("id", id)
      .single();

    if (managerError || !manager) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    // Non-admin users can only view their location's staff
    if (auth.role !== "admin" && manager.location_id !== auth.locationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get direct reports
    const { data, error } = await supabase
      .from("staff")
      .select(`
        id,
        name,
        email,
        phone,
        role,
        is_active,
        avatar_url,
        created_at,
        location:locations(id, name)
      `)
      .eq("reports_to", id)
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      manager: {
        id: manager.id,
        role: manager.role,
      }
    });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized") || error.message?.includes("permission") || error.message?.includes("Forbidden")) {
      return forbiddenResponse(error.message);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
