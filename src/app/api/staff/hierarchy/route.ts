import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireManager, forbiddenResponse } from "@/lib/auth/api-auth";

interface StaffNode {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  avatar_url: string | null;
  location?: { id: string; name: string } | null;
  direct_reports: StaffNode[];
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireManager();
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const locationId = searchParams.get("location_id");

    // Get all staff members
    let query = supabase
      .from("staff")
      .select(`
        id,
        name,
        email,
        role,
        is_active,
        avatar_url,
        reports_to,
        location_id,
        location:locations(id, name)
      `)
      .eq("is_active", true)
      .order("role", { ascending: true })
      .order("name", { ascending: true });

    // Non-admin users can only see their location's staff
    if (auth.role !== "admin" && auth.locationId) {
      query = query.eq("location_id", auth.locationId);
    } else if (locationId) {
      query = query.eq("location_id", locationId);
    }

    const { data: allStaff, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Build hierarchy tree
    const staffMap = new Map<string, StaffNode>();
    const rootNodes: StaffNode[] = [];

    // First pass: create all nodes
    allStaff?.forEach((staff: any) => {
      staffMap.set(staff.id, {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        is_active: staff.is_active,
        avatar_url: staff.avatar_url,
        location: staff.location,
        direct_reports: [],
      });
    });

    // Second pass: build tree structure
    allStaff?.forEach((staff: any) => {
      const node = staffMap.get(staff.id)!;
      if (staff.reports_to && staffMap.has(staff.reports_to)) {
        staffMap.get(staff.reports_to)!.direct_reports.push(node);
      } else {
        // No manager or manager not in current view - this is a root node
        rootNodes.push(node);
      }
    });

    // Sort root nodes by role priority
    const rolePriority: Record<string, number> = {
      admin: 0,
      location_manager: 1,
      front_desk: 2,
      captain: 3,
      affiliate: 4,
    };

    rootNodes.sort((a, b) => {
      const priorityDiff = (rolePriority[a.role] ?? 99) - (rolePriority[b.role] ?? 99);
      if (priorityDiff !== 0) return priorityDiff;
      return a.name.localeCompare(b.name);
    });

    // Calculate stats
    const stats = {
      total: allStaff?.length || 0,
      byRole: {
        admin: allStaff?.filter((s: any) => s.role === "admin").length || 0,
        location_manager: allStaff?.filter((s: any) => s.role === "location_manager").length || 0,
        front_desk: allStaff?.filter((s: any) => s.role === "front_desk").length || 0,
        captain: allStaff?.filter((s: any) => s.role === "captain").length || 0,
        affiliate: allStaff?.filter((s: any) => s.role === "affiliate").length || 0,
      },
    };

    return NextResponse.json({
      hierarchy: rootNodes,
      stats,
    });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized") || error.message?.includes("permission") || error.message?.includes("Forbidden")) {
      return forbiddenResponse(error.message);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
