import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, forbiddenResponse } from "@/lib/auth/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaff();
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const category = searchParams.get("category");
    const channel = searchParams.get("channel");

    let query = supabase
      .from("message_templates")
      .select("*")
      .eq("is_active", true)
      .order("use_count", { ascending: false });

    // Filter by location for non-admins, or include global (null location_id)
    if (auth.role !== "admin" && auth.locationId) {
      query = query.or(`location_id.eq.${auth.locationId},location_id.is.null`);
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (channel) {
      query = query.contains("channels", [channel]);
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
    const auth = await requireStaff();
    const supabase = await createClient();
    const body = await request.json();

    const { name, category, channels, subject, content, variables } = body;

    if (!name || !content) {
      return NextResponse.json(
        { error: "Name and content are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("message_templates")
      .insert({
        location_id: auth.locationId,
        name,
        category,
        channels: channels || ["email", "whatsapp", "sms"],
        subject,
        content,
        variables: variables || [],
        created_by: auth.staffId,
      })
      .select()
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
