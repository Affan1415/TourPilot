import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, forbiddenResponse } from "@/lib/auth/api-auth";

export async function GET(request: NextRequest) {
  try {
    await requireStaff();

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const source = searchParams.get("source");
    const rating = searchParams.get("rating");
    const status = searchParams.get("status");
    const tourId = searchParams.get("tour_id");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("reviews")
      .select(`
        *,
        tour:tours(id, name),
        booking:bookings(id, reference_number),
        customer:customers(id, first_name, last_name, email)
      `)
      .order("review_date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (source && source !== "all") {
      query = query.eq("source", source);
    }

    if (rating) {
      query = query.eq("rating", parseInt(rating));
    }

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (tourId) {
      query = query.eq("tour_id", tourId);
    }

    if (search) {
      query = query.or(`author_name.ilike.%${search}%,content.ilike.%${search}%,title.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, count });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized") || error.message?.includes("permission")) {
      return forbiddenResponse(error.message);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireStaff();

    const supabase = await createClient();
    const body = await request.json();

    const {
      tour_id,
      booking_id,
      customer_id,
      source,
      external_id,
      external_url,
      author_name,
      author_avatar_url,
      rating,
      title,
      content,
      review_date,
      language,
      status,
      metadata,
    } = body;

    if (!source || !author_name || !rating) {
      return NextResponse.json(
        { error: "source, author_name, and rating are required" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("reviews")
      .insert([{
        tour_id: tour_id || null,
        booking_id: booking_id || null,
        customer_id: customer_id || null,
        source,
        external_id: external_id || null,
        external_url: external_url || null,
        author_name,
        author_avatar_url: author_avatar_url || null,
        rating,
        title: title || null,
        content: content || null,
        review_date: review_date || new Date().toISOString(),
        language: language || "en",
        status: status || "published",
        metadata: metadata || {},
      }])
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
