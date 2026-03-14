import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

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
    console.log("WhatsApp webhook verified");
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// POST - Receive incoming messages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Log webhook event for debugging
    await supabase.from("webhook_events").insert({
      channel: "whatsapp",
      event_type: body.object || "unknown",
      payload: body,
      processed: false,
    });

    // Process the webhook
    if (body.object === "whatsapp_business_account") {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === "messages") {
            await processMessages(change.value);
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function processMessages(value: any) {
  const { messages, contacts, metadata } = value;

  if (!messages || messages.length === 0) return;

  const phoneNumberId = metadata?.phone_number_id;

  // Find the connected account for this phone number
  const { data: connectedAccount } = await supabase
    .from("connected_accounts")
    .select("*")
    .eq("channel", "whatsapp")
    .eq("metadata->phone_number_id", phoneNumberId)
    .single();

  if (!connectedAccount) {
    console.warn("No connected account found for phone number:", phoneNumberId);
    return;
  }

  for (const message of messages) {
    const senderPhone = message.from;
    const senderName = contacts?.find((c: any) => c.wa_id === senderPhone)?.profile?.name || senderPhone;

    // Find or create customer
    let { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", senderPhone)
      .single();

    if (!customer) {
      // Create new customer
      const { data: newCustomer, error } = await supabase
        .from("customers")
        .insert({
          phone: senderPhone,
          first_name: senderName.split(" ")[0] || "Unknown",
          last_name: senderName.split(" ").slice(1).join(" ") || "",
        })
        .select("id")
        .single();

      if (error) {
        console.error("Error creating customer:", error);
        continue;
      }
      customer = newCustomer;
    }

    // Find or create conversation
    let { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("location_id", connectedAccount.location_id)
      .eq("customer_id", customer.id)
      .eq("channel", "whatsapp")
      .eq("status", "open")
      .single();

    if (!conversation) {
      const { data: newConv, error } = await supabase
        .from("conversations")
        .insert({
          location_id: connectedAccount.location_id,
          customer_id: customer.id,
          channel: "whatsapp",
          external_thread_id: senderPhone,
          status: "open",
        })
        .select("id")
        .single();

      if (error) {
        console.error("Error creating conversation:", error);
        continue;
      }
      conversation = newConv;
    }

    // Determine content type and extract content
    let content = "";
    let contentType = "text";
    let attachments: any[] = [];

    if (message.type === "text") {
      content = message.text?.body || "";
    } else if (message.type === "image") {
      contentType = "image";
      content = message.image?.caption || "[Image]";
      attachments = [{ type: "image", id: message.image?.id }];
    } else if (message.type === "document") {
      contentType = "file";
      content = message.document?.caption || `[Document: ${message.document?.filename}]`;
      attachments = [{ type: "document", id: message.document?.id, filename: message.document?.filename }];
    } else if (message.type === "audio") {
      contentType = "audio";
      content = "[Voice message]";
      attachments = [{ type: "audio", id: message.audio?.id }];
    } else if (message.type === "video") {
      contentType = "video";
      content = message.video?.caption || "[Video]";
      attachments = [{ type: "video", id: message.video?.id }];
    } else if (message.type === "location") {
      contentType = "text";
      content = `[Location: ${message.location?.latitude}, ${message.location?.longitude}]`;
    } else {
      content = `[${message.type} message]`;
    }

    // Insert message
    await supabase.from("messages").insert({
      conversation_id: conversation.id,
      external_message_id: message.id,
      direction: "inbound",
      status: "delivered",
      sender_type: "customer",
      sender_name: senderName,
      sender_phone: senderPhone,
      content,
      content_type: contentType,
      attachments,
      metadata: { timestamp: message.timestamp },
      sent_at: new Date(parseInt(message.timestamp) * 1000).toISOString(),
    });
  }

  // Mark webhook as processed
  await supabase
    .from("webhook_events")
    .update({ processed: true })
    .eq("payload->entry[0]->id", value.metadata?.phone_number_id);
}
