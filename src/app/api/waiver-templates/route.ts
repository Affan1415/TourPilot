import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireStaff, forbiddenResponse } from "@/lib/auth/api-auth";

// GET: List waiver templates
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get("active") !== "false";

    let query = supabase
      .from("waiver_templates")
      .select("*")
      .order("created_at", { ascending: false });

    // Non-staff can only see active templates
    if (activeOnly) {
      query = query.eq("is_active", true);
    } else {
      try {
        await requireStaff();
      } catch {
        query = query.eq("is_active", true);
      }
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

// POST: Create a waiver template
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

    const { name, content, is_active = true } = body;

    if (!name || !content) {
      return NextResponse.json(
        { error: "name and content are required" },
        { status: 400 }
      );
    }

    const { data, error } = await adminClient
      .from("waiver_templates")
      .insert([{
        name,
        content,
        is_active,
        version: 1,
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
