import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireStaff, forbiddenResponse } from "@/lib/auth/api-auth";

// GET: List widgets
export async function GET(request: NextRequest) {
  try {
    // Check staff permission
    try {
      await requireStaff();
    } catch (e: any) {
      return forbiddenResponse(e.message);
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("widgets")
      .select("*")
      .order("created_at", { ascending: false });

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

// POST: Create a new widget
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

    const { name, allowed_domains, theme, tour_ids, is_active = true } = body;

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const { data, error } = await adminClient
      .from("widgets")
      .insert([{
        name,
        allowed_domains: allowed_domains || ["*"],
        theme: theme || {
          primaryColor: "#0ea5e9",
          fontFamily: "Inter, sans-serif",
          borderRadius: "8px",
          showPrices: true,
          showAvailability: true,
          showTourImages: true,
          showDescription: true,
          requirePhone: false,
          collectNotes: true,
        },
        tour_ids: tour_ids || null,
        is_active,
      }])
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
