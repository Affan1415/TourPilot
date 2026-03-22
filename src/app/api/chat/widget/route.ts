import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// Initialize Supabase with service role for public chat
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const startChatSchema = z.object({
  widget_key: z.string().min(1),
  visitor_id: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  initial_message: z.string().optional(),
  page_url: z.string().url().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const sendMessageSchema = z.object({
  conversation_id: z.string().uuid(),
  visitor_id: z.string().min(1),
  content: z.string().min(1),
});

// POST - Start a new chat session or send a message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || "start";

    if (action === "start") {
      return startChat(body);
    } else if (action === "message") {
      return sendMessage(body);
    } else if (action === "end") {
      return endChat(body);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Chat widget error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET - Get chat history or widget config
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const conversationId = searchParams.get("conversation_id");
  const visitorId = searchParams.get("visitor_id");
  const widgetKey = searchParams.get("widget_key");

  if (widgetKey && !conversationId) {
    // Return widget configuration
    return getWidgetConfig(widgetKey);
  }

  if (conversationId && visitorId) {
    // Return chat history
    return getChatHistory(conversationId, visitorId);
  }

  return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
}

async function startChat(body: any) {
  const validation = startChatSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid request", details: validation.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { widget_key, visitor_id, name, email, initial_message, page_url, metadata } = validation.data;

  // Get widget configuration
  const { data: widget, error: widgetError } = await supabase
    .from("booking_widgets")
    .select("*, location:locations(id, name, timezone)")
    .eq("widget_key", widget_key)
    .eq("is_active", true)
    .single();

  if (widgetError || !widget) {
    return NextResponse.json({ error: "Widget not found or inactive" }, { status: 404 });
  }

  const locationId = widget.location_id;

  // Generate or use visitor ID
  const finalVisitorId = visitor_id || `visitor_${crypto.randomUUID()}`;

  // Find or create customer
  let customerId: string | null = null;

  if (email) {
    // Try to find existing customer by email
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("email", email)
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    }
  }

  if (!customerId) {
    // Create anonymous customer
    const { data: newCustomer, error: customerError } = await supabase
      .from("customers")
      .insert({
        email: email || null,
        first_name: name?.split(" ")[0] || "Visitor",
        last_name: name?.split(" ").slice(1).join(" ") || "",
        metadata: {
          visitor_id: finalVisitorId,
          is_anonymous: !email,
        },
      })
      .select("id")
      .single();

    if (customerError) {
      console.error("Error creating customer:", customerError);
      return NextResponse.json({ error: "Failed to create chat session" }, { status: 500 });
    }
    customerId = newCustomer.id;
  }

  // Create conversation
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .insert({
      location_id: locationId,
      customer_id: customerId,
      channel: "chat",
      external_thread_id: finalVisitorId,
      status: "open",
      subject: initial_message?.slice(0, 100) || "Live chat",
      metadata: {
        visitor_id: finalVisitorId,
        page_url,
        widget_key,
        ...metadata,
      },
    })
    .select("id")
    .single();

  if (convError) {
    console.error("Error creating conversation:", convError);
    return NextResponse.json({ error: "Failed to create chat session" }, { status: 500 });
  }

  // If there's an initial message, add it
  if (initial_message) {
    await supabase.from("messages").insert({
      conversation_id: conversation.id,
      direction: "inbound",
      status: "delivered",
      sender_type: "customer",
      sender_name: name || "Visitor",
      content: initial_message,
      content_type: "text",
      sent_at: new Date().toISOString(),
    });
  }

  // Get auto-reply if configured
  let welcomeMessage = null;
  const widgetConfig = widget.config || {};

  if (widgetConfig.welcome_message) {
    // Insert welcome message from bot/system
    const { data: welcomeMsg } = await supabase.from("messages").insert({
      conversation_id: conversation.id,
      direction: "outbound",
      status: "delivered",
      sender_type: "system",
      sender_name: widgetConfig.bot_name || "Support Bot",
      content: widgetConfig.welcome_message,
      content_type: "text",
      sent_at: new Date().toISOString(),
    }).select("*").single();

    welcomeMessage = welcomeMsg;
  }

  return NextResponse.json({
    success: true,
    conversation_id: conversation.id,
    visitor_id: finalVisitorId,
    welcome_message: welcomeMessage,
    config: {
      bot_name: widgetConfig.bot_name || "Support",
      primary_color: widgetConfig.primary_color || "#6366f1",
      position: widgetConfig.position || "bottom-right",
      greeting: widgetConfig.greeting || "Hi! How can we help you today?",
    },
  });
}

async function sendMessage(body: any) {
  const validation = sendMessageSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid request", details: validation.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { conversation_id, visitor_id, content } = validation.data;

  // Verify the visitor owns this conversation
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("id, status, metadata, customer:customers!inner(id, first_name)")
    .eq("id", conversation_id)
    .eq("external_thread_id", visitor_id)
    .eq("channel", "chat")
    .single();

  if (convError || !conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  if (conversation.status === "closed") {
    return NextResponse.json({ error: "Conversation is closed" }, { status: 400 });
  }

  // Get customer name (handle both array and single object from join)
  const customer = Array.isArray(conversation.customer)
    ? conversation.customer[0]
    : conversation.customer;

  // Insert message
  const { data: message, error: msgError } = await supabase
    .from("messages")
    .insert({
      conversation_id,
      direction: "inbound",
      status: "delivered",
      sender_type: "customer",
      sender_name: customer?.first_name || "Visitor",
      content,
      content_type: "text",
      sent_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (msgError) {
    console.error("Error sending message:", msgError);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }

  // Update conversation timestamp
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversation_id);

  return NextResponse.json({
    success: true,
    message,
  });
}

async function endChat(body: any) {
  const { conversation_id, visitor_id } = body;

  if (!conversation_id || !visitor_id) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  // Verify and close conversation
  const { data, error } = await supabase
    .from("conversations")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", conversation_id)
    .eq("external_thread_id", visitor_id)
    .eq("channel", "chat")
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

async function getWidgetConfig(widgetKey: string) {
  const { data: widget, error } = await supabase
    .from("booking_widgets")
    .select("config, location:locations(name)")
    .eq("widget_key", widgetKey)
    .eq("is_active", true)
    .single();

  if (error || !widget) {
    return NextResponse.json({ error: "Widget not found" }, { status: 404 });
  }

  const config = widget.config || {};

  // Handle location being array or single object from join
  const location = Array.isArray(widget.location)
    ? widget.location[0]
    : widget.location;

  return NextResponse.json({
    bot_name: config.bot_name || "Support",
    primary_color: config.primary_color || "#6366f1",
    position: config.position || "bottom-right",
    greeting: config.greeting || "Hi! How can we help you today?",
    company_name: location?.name || "Support",
    offline_message: config.offline_message || "We're currently offline. Leave a message and we'll get back to you!",
  });
}

async function getChatHistory(conversationId: string, visitorId: string) {
  // Verify the visitor owns this conversation
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("id, status")
    .eq("id", conversationId)
    .eq("external_thread_id", visitorId)
    .eq("channel", "chat")
    .single();

  if (convError || !conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  // Get messages
  const { data: messages, error: msgError } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("sent_at", { ascending: true });

  if (msgError) {
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }

  return NextResponse.json({
    conversation_id: conversationId,
    status: conversation.status,
    messages,
  });
}
