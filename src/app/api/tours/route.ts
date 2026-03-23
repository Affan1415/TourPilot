import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireStaff, forbiddenResponse, errorResponse, getAuthUser } from "@/lib/auth/api-auth";

// GET: Public can view active tours, staff can view all
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || "active";
    const locationId = searchParams.get("location_id");

    let query = supabase
      .from("tours")
      .select("*")
      .order("created_at", { ascending: false });

    // Check if user is staff
    let auth = null;
    try {
      auth = await getAuthUser();
    } catch {
      // Not authenticated - public access
    }

    // Only staff can view non-active tours
    if (status !== "active") {
      if (!auth?.authenticated || !auth?.role) {
        // Non-staff can only see active tours
        query = query.eq("status", "active");
      }
    }

    if (status !== "all") {
      query = query.eq("status", status);
    }

    // Location-based filtering for non-admin staff
    if (auth?.authenticated && auth?.role && auth.role !== "admin") {
      // Non-admin staff only see their location's tours
      if (auth.locationId) {
        query = query.eq("location_id", auth.locationId);
      }
    } else if (locationId) {
      // Admin can filter by specific location
      query = query.eq("location_id", locationId);
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

// POST: Only admin/manager can create tours
export async function POST(request: NextRequest) {
  try {
    // Check admin permission
    try {
      await requireAdmin();
    } catch (e: any) {
      return forbiddenResponse(e.message);
    }

    const supabase = await createClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("tours")
      .insert([body])
      .select()
      .single();

    if (error) {
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
