import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, forbiddenResponse } from "@/lib/auth/api-auth";

// GET: List customers with pagination and search
export async function GET(request: NextRequest) {
  try {
    // Check staff permission
    try {
      await requireStaff();
    } catch (e: any) {
      return forbiddenResponse(e.message);
    }

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sort_by") || "created_at";
    const sortOrder = searchParams.get("sort_order") || "desc";
    const tags = searchParams.get("tags")?.split(",").filter(Boolean) || [];

    const offset = (page - 1) * limit;

    let query = supabase
      .from("customers")
      .select("*", { count: "exact" });

    // Search by name or email
    if (search) {
      query = query.or(
        `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
      );
    }

    // Filter by tags
    if (tags.length > 0) {
      query = query.contains("tags", tags);
    }

    // Sorting
    const ascending = sortOrder === "asc";
    query = query.order(sortBy, { ascending });

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Create a new customer
export async function POST(request: NextRequest) {
  try {
    // Check staff permission
    try {
      await requireStaff();
    } catch (e: any) {
      return forbiddenResponse(e.message);
    }

    const adminClient = createAdminClient();
    const body = await request.json();

    const { email, first_name, last_name, phone, country_code, notes, tags } = body;

    if (!email || !first_name || !last_name) {
      return NextResponse.json(
        { error: "email, first_name, and last_name are required" },
        { status: 400 }
      );
    }

    // Check if customer already exists
    const { data: existing } = await adminClient
      .from("customers")
      .select("id")
      .eq("email", email.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Customer with this email already exists" },
        { status: 409 }
      );
    }

    const { data, error } = await adminClient
      .from("customers")
      .insert([{
        email: email.toLowerCase(),
        first_name,
        last_name,
        phone,
        country_code: country_code || "+1",
        notes,
        tags: tags || [],
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
