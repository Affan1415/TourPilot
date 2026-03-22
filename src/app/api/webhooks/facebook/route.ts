import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;

// Initialize Supabase with service role for webhook processing
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Webhook verification (required by Meta)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Facebook webhook verified");
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// POST - Receive incoming messages from Messenger and Instagram
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Log webhook event for debugging
    await supabase.from("webhook_events").insert({
      channel: body.object === "instagram" ? "instagram" : "messenger",
      event_type: body.object || "unknown",
      payload: body,
      processed: false,
    });

    // Process page/instagram messaging events
    if (body.object === "page" || body.object === "instagram") {
      for (const entry of body.entry || []) {
        // Handle messaging events
        for (const messagingEvent of entry.messaging || []) {
          await processMessagingEvent(messagingEvent, body.object, entry.id);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Facebook webhook error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function processMessagingEvent(
  event: any,
  platform: "page" | "instagram",
  pageId: string
) {
  const channel = platform === "instagram" ? "instagram" : "messenger";
  const senderId = event.sender?.id;
  const recipientId = event.recipient?.id;
  const timestamp = event.timestamp;

  if (!senderId || senderId === recipientId) {
    // Ignore echo messages (messages we sent)
    return;
  }

  // Handle incoming message
  if (event.message) {
    await handleIncomingMessage(event.message, senderId, pageId, channel, timestamp);
  }

  // Handle message read receipt
  if (event.read) {
    await handleReadReceipt(event.read, senderId, channel);
  }

  // Handle message delivery receipt
  if (event.delivery) {
    await handleDeliveryReceipt(event.delivery, senderId, channel);
  }

  // Handle postback (button clicks)
  if (event.postback) {
    await handlePostback(event.postback, senderId, pageId, channel, timestamp);
  }
}

async function handleIncomingMessage(
  message: any,
  senderId: string,
  pageId: string,
  channel: "messenger" | "instagram",
  timestamp: number
) {
  // Find the connected account for this page
  const { data: connectedAccount } = await supabase
    .from("connected_accounts")
    .select("*")
    .eq("channel", channel)
    .eq("metadata->page_id", pageId)
    .single();

  if (!connectedAccount) {
    console.warn(`No connected ${channel} account found for page:`, pageId);
    return;
  }

  // Get sender profile
  const senderProfile = await getSenderProfile(senderId, connectedAccount.access_token, channel);
  const senderName = senderProfile?.name || senderId;

  // Find or create customer
  let { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq(`metadata->>${channel}_id`, senderId)
    .single();

  if (!customer) {
    // Create new customer
    const { data: newCustomer, error } = await supabase
      .from("customers")
      .insert({
        first_name: senderProfile?.first_name || senderName.split(" ")[0] || "Unknown",
        last_name: senderProfile?.last_name || senderName.split(" ").slice(1).join(" ") || "",
        email: senderProfile?.email,
        metadata: { [`${channel}_id`]: senderId },
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating customer:", error);
      return;
    }
    customer = newCustomer;
  }

  // Find or create conversation
  let { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("location_id", connectedAccount.location_id)
    .eq("customer_id", customer.id)
    .eq("channel", channel)
    .eq("status", "open")
    .single();

  if (!conversation) {
    const { data: newConv, error } = await supabase
      .from("conversations")
      .insert({
        location_id: connectedAccount.location_id,
        customer_id: customer.id,
        channel,
        external_thread_id: senderId,
        status: "open",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating conversation:", error);
      return;
    }
    conversation = newConv;
  }

  // Parse message content
  let content = "";
  let contentType = "text";
  const attachments: any[] = [];

  if (message.text) {
    content = message.text;
  }

  // Handle attachments
  if (message.attachments && message.attachments.length > 0) {
    for (const attachment of message.attachments) {
      const attachmentData: any = {
        type: attachment.type,
        url: attachment.payload?.url,
      };

      switch (attachment.type) {
        case "image":
          contentType = attachments.length === 0 && !message.text ? "image" : "mixed";
          attachments.push({ ...attachmentData, name: "Image" });
          if (!content) content = "[Image]";
          break;
        case "video":
          contentType = attachments.length === 0 && !message.text ? "video" : "mixed";
          attachments.push({ ...attachmentData, name: "Video" });
          if (!content) content = "[Video]";
          break;
        case "audio":
          contentType = attachments.length === 0 && !message.text ? "audio" : "mixed";
          attachments.push({ ...attachmentData, name: "Voice message" });
          if (!content) content = "[Voice message]";
          break;
        case "file":
          contentType = attachments.length === 0 && !message.text ? "file" : "mixed";
          attachments.push({ ...attachmentData, name: attachment.payload?.name || "File" });
          if (!content) content = `[File: ${attachment.payload?.name || "attachment"}]`;
          break;
        case "location":
          content = `[Location: ${attachment.payload?.coordinates?.lat}, ${attachment.payload?.coordinates?.long}]`;
          break;
        case "fallback":
          content = attachment.payload?.title || attachment.title || "[Shared content]";
          break;
        default:
          if (!content) content = `[${attachment.type}]`;
      }
    }
  }

  // Handle stickers (Instagram specific)
  if (message.sticker_id) {
    content = "[Sticker]";
    contentType = "sticker";
  }

  // Handle story replies/mentions (Instagram specific)
  if (message.reply_to?.story) {
    content = `[Reply to story: ${message.reply_to.story.url}]\n${content}`;
  }

  // Insert message
  await supabase.from("messages").insert({
    conversation_id: conversation.id,
    external_message_id: message.mid,
    direction: "inbound",
    status: "delivered",
    sender_type: "customer",
    sender_name: senderName,
    content: content || "[Message]",
    content_type: contentType,
    attachments: attachments.length > 0 ? attachments : undefined,
    metadata: {
      timestamp,
      is_echo: message.is_echo,
      quick_reply: message.quick_reply?.payload,
    },
    sent_at: new Date(timestamp).toISOString(),
  });

  // Update conversation timestamp
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversation.id);
}

async function getSenderProfile(
  userId: string,
  accessToken: string,
  channel: "messenger" | "instagram"
): Promise<any> {
  try {
    const fields = channel === "instagram"
      ? "id,name,username,profile_pic"
      : "id,name,first_name,last_name,profile_pic,email";

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${userId}?fields=${fields}&access_token=${accessToken}`
    );

    if (!response.ok) {
      console.warn("Failed to get sender profile:", await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching sender profile:", error);
    return null;
  }
}

async function handleReadReceipt(readEvent: any, senderId: string, channel: string) {
  const watermark = readEvent.watermark;

  // Mark messages as read that were sent before the watermark
  await supabase
    .from("messages")
    .update({ status: "read", read_at: new Date(watermark).toISOString() })
    .lte("sent_at", new Date(watermark).toISOString())
    .eq("direction", "outbound")
    .eq("status", "delivered");
}

async function handleDeliveryReceipt(deliveryEvent: any, senderId: string, channel: string) {
  const messageIds = deliveryEvent.mids || [];

  // Mark specific messages as delivered
  for (const mid of messageIds) {
    await supabase
      .from("messages")
      .update({ status: "delivered", delivered_at: new Date().toISOString() })
      .eq("external_message_id", mid)
      .eq("status", "sent");
  }
}

async function handlePostback(
  postback: any,
  senderId: string,
  pageId: string,
  channel: "messenger" | "instagram",
  timestamp: number
) {
  // Handle button/quick reply clicks
  const payload = postback.payload;
  const title = postback.title;

  // Log the postback as a message
  const { data: connectedAccount } = await supabase
    .from("connected_accounts")
    .select("*")
    .eq("channel", channel)
    .eq("metadata->page_id", pageId)
    .single();

  if (!connectedAccount) return;

  // Find the conversation
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("location_id", connectedAccount.location_id)
    .eq("external_thread_id", senderId)
    .eq("channel", channel)
    .eq("status", "open")
    .single();

  if (!conversation) return;

  // Insert postback as a message
  await supabase.from("messages").insert({
    conversation_id: conversation.id,
    direction: "inbound",
    status: "delivered",
    sender_type: "customer",
    content: title || payload,
    content_type: "postback",
    metadata: { payload, title, timestamp },
    sent_at: new Date(timestamp).toISOString(),
  });
}
