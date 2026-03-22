import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, forbiddenResponse } from "@/lib/auth/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaff();
    const supabase = await createClient();

    let query = supabase
      .from("quick_replies")
      .select("*")
      .order("shortcut");

    // Filter by location for non-admins, or include global (null location_id)
    if (auth.role !== "admin" && auth.locationId) {
      query = query.or(`location_id.eq.${auth.locationId},location_id.is.null`);
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

    const { shortcut, content, channels } = body;

    if (!shortcut || !content) {
      return NextResponse.json(
        { error: "Shortcut and content are required" },
        { status: 400 }
      );
    }

    // Ensure shortcut starts with /
    const normalizedShortcut = shortcut.startsWith("/") ? shortcut : `/${shortcut}`;

    const { data, error } = await supabase
      .from("quick_replies")
      .insert({
        location_id: auth.locationId,
        shortcut: normalizedShortcut,
        content,
        channels: channels || ["email", "whatsapp", "sms", "instagram", "messenger"],
        created_by: auth.staffId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") { // Unique violation
        return NextResponse.json(
          { error: "A quick reply with this shortcut already exists" },
          { status: 400 }
        );
      }
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
