import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, forbiddenResponse } from "@/lib/auth/api-auth";

export async function GET(request: NextRequest) {
  try {
    // Only admins can view audit logs
    await requireAdmin();

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");
    const entityType = searchParams.get("entity_type");
    const userId = searchParams.get("user_id");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("audit_logs")
      .select(`
        *,
        user:staff(id, name, email)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (action) {
      query = query.eq("action", action);
    }

    if (entityType) {
      query = query.eq("entity_type", entityType);
    }

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (startDate) {
      query = query.gte("created_at", `${startDate}T00:00:00`);
    }

    if (endDate) {
      query = query.lte("created_at", `${endDate}T23:59:59`);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get unique action types and entity types for filters
    const { data: actionTypes } = await supabase
      .from("audit_logs")
      .select("action")
      .limit(100);

    const { data: entityTypes } = await supabase
      .from("audit_logs")
      .select("entity_type")
      .limit(100);

    const uniqueActions = [...new Set(actionTypes?.map(a => a.action) || [])];
    const uniqueEntities = [...new Set(entityTypes?.map(e => e.entity_type) || [])];

    return NextResponse.json({
      data,
      count,
      filters: {
        actions: uniqueActions,
        entityTypes: uniqueEntities,
      },
    });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized") || error.message?.includes("permission") || error.message?.includes("Forbidden")) {
      return forbiddenResponse(error.message);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
