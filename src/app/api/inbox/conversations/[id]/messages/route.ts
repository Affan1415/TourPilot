import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, forbiddenResponse } from "@/lib/auth/api-auth";
import { sendMessage } from "@/lib/messaging";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaff();
    const { id } = await params;
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const limit = parseInt(searchParams.get("limit") || "50");
    const before = searchParams.get("before"); // Cursor for pagination

    let query = supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform for frontend
    const messages = data?.map((msg: any) => ({
      id: msg.id,
      direction: msg.direction,
      status: msg.status,
      senderType: msg.sender_type,
      senderId: msg.sender_id,
      senderName: msg.sender_name,
      content: msg.content,
      contentType: msg.content_type,
      attachments: msg.attachments,
      sentAt: msg.sent_at,
      deliveredAt: msg.delivered_at,
      readAt: msg.read_at,
      createdAt: msg.created_at,
    })).reverse(); // Return in chronological order

    // Mark conversation as read
    await supabase
      .from("conversations")
      .update({ unread_count: 0 })
      .eq("id", id);

    return NextResponse.json({
      data: messages,
      hasMore: data?.length === limit,
    });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized") || error.message?.includes("permission")) {
      return forbiddenResponse(error.message);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaff();
    const { id: conversationId } = await params;
    const body = await request.json();

    const { content, attachments } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    // Send through messaging service
    const result = await sendMessage({
      conversationId,
      content,
      staffId: auth.staffId,
      attachments,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      externalId: result.externalId,
    }, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized") || error.message?.includes("permission")) {
      return forbiddenResponse(error.message);
    }
    console.error("Send message error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
