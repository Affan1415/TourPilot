import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, forbiddenResponse } from "@/lib/auth/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaff();
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const channel = searchParams.get("channel");
    const status = searchParams.get("status");
    const assignedTo = searchParams.get("assigned_to");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("conversations")
      .select(`
        id,
        channel,
        subject,
        status,
        priority,
        last_message_at,
        last_message_preview,
        unread_count,
        tags,
        created_at,
        customer:customers(id, first_name, last_name, email, phone, avatar_url),
        assigned:staff!assigned_to(id, name, avatar_url)
      `)
      .order("last_message_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by location for non-admins
    if (auth.role !== "admin" && auth.locationId) {
      query = query.eq("location_id", auth.locationId);
    }

    if (channel && channel !== "all") {
      query = query.eq("channel", channel);
    }

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (assignedTo === "me" && auth.staffId) {
      query = query.eq("assigned_to", auth.staffId);
    } else if (assignedTo === "unassigned") {
      query = query.is("assigned_to", null);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform data for frontend
    const conversations = data?.map((conv: any) => ({
      id: conv.id,
      channel: conv.channel,
      subject: conv.subject,
      status: conv.status,
      priority: conv.priority,
      lastMessageAt: conv.last_message_at,
      lastMessagePreview: conv.last_message_preview,
      unreadCount: conv.unread_count,
      tags: conv.tags,
      createdAt: conv.created_at,
      customer: conv.customer ? {
        id: conv.customer.id,
        name: `${conv.customer.first_name} ${conv.customer.last_name}`,
        email: conv.customer.email,
        phone: conv.customer.phone,
        avatar: conv.customer.avatar_url,
      } : null,
      assignedTo: conv.assigned ? {
        id: conv.assigned.id,
        name: conv.assigned.name,
        avatar: conv.assigned.avatar_url,
      } : null,
    }));

    return NextResponse.json({
      data: conversations,
      pagination: {
        offset,
        limit,
        total: count,
      },
    });
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

    const { channel, customerId, subject } = body;

    if (!channel || !customerId) {
      return NextResponse.json(
        { error: "Channel and customer ID are required" },
        { status: 400 }
      );
    }

    // Create new conversation
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        location_id: auth.locationId,
        customer_id: customerId,
        channel,
        subject,
        status: "open",
      })
      .select(`
        *,
        customer:customers(id, first_name, last_name, email)
      `)
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
