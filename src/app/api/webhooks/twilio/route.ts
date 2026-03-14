import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase with service role for webhook processing
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Receive incoming SMS
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Parse Twilio webhook payload
    const payload: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      payload[key] = value.toString();
    }

    // Log webhook event
    await supabase.from("webhook_events").insert({
      channel: "sms",
      event_type: "incoming_message",
      payload,
      processed: false,
    });

    const {
      From: fromNumber,
      To: toNumber,
      Body: body,
      MessageSid: messageSid,
      NumMedia: numMedia,
    } = payload;

    // Find the connected account for this phone number
    const { data: connectedAccount } = await supabase
      .from("connected_accounts")
      .select("*")
      .eq("channel", "sms")
      .eq("account_name", toNumber)
      .single();

    if (!connectedAccount) {
      console.warn("No connected account found for number:", toNumber);
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Find or create customer
    let { data: customer } = await supabase
      .from("customers")
      .select("id, first_name, last_name")
      .eq("phone", fromNumber)
      .single();

    if (!customer) {
      const { data: newCustomer, error } = await supabase
        .from("customers")
        .insert({
          phone: fromNumber,
          first_name: "SMS",
          last_name: "Customer",
        })
        .select("id, first_name, last_name")
        .single();

      if (error) {
        console.error("Error creating customer:", error);
        return new NextResponse(
          '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
          { headers: { "Content-Type": "text/xml" } }
        );
      }
      customer = newCustomer;
    }

    // Find or create conversation
    let { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("location_id", connectedAccount.location_id)
      .eq("customer_id", customer.id)
      .eq("channel", "sms")
      .eq("status", "open")
      .single();

    if (!conversation) {
      const { data: newConv, error } = await supabase
        .from("conversations")
        .insert({
          location_id: connectedAccount.location_id,
          customer_id: customer.id,
          channel: "sms",
          external_thread_id: fromNumber,
          status: "open",
        })
        .select("id")
        .single();

      if (error) {
        console.error("Error creating conversation:", error);
        return new NextResponse(
          '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
          { headers: { "Content-Type": "text/xml" } }
        );
      }
      conversation = newConv;
    }

    // Handle media attachments (MMS)
    const attachments: any[] = [];
    const mediaCount = parseInt(numMedia) || 0;
    for (let i = 0; i < mediaCount; i++) {
      attachments.push({
        url: payload[`MediaUrl${i}`],
        type: payload[`MediaContentType${i}`],
      });
    }

    // Insert message
    await supabase.from("messages").insert({
      conversation_id: conversation.id,
      external_message_id: messageSid,
      direction: "inbound",
      status: "delivered",
      sender_type: "customer",
      sender_name: `${customer.first_name} ${customer.last_name}`,
      sender_phone: fromNumber,
      content: body || (attachments.length > 0 ? "[Media message]" : "[Empty message]"),
      content_type: attachments.length > 0 ? "mms" : "text",
      attachments,
      metadata: payload,
    });

    // Mark webhook as processed
    await supabase
      .from("webhook_events")
      .update({ processed: true })
      .eq("payload->MessageSid", messageSid);

    // Return empty TwiML response
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { "Content-Type": "text/xml" } }
    );
  } catch (error) {
    console.error("Twilio webhook error:", error);
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { "Content-Type": "text/xml" } }
    );
  }
}
