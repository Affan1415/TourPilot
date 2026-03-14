import { createClient } from "@supabase/supabase-js";

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type Channel = "email" | "whatsapp" | "instagram" | "sms" | "messenger";

export interface SendMessageOptions {
  conversationId: string;
  content: string;
  staffId?: string;
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
    size?: number;
  }>;
}

export interface MessageResult {
  success: boolean;
  messageId?: string;
  externalId?: string;
  error?: string;
}

// Main send function that routes to appropriate channel
export async function sendMessage(options: SendMessageOptions): Promise<MessageResult> {
  const { conversationId, content, staffId, attachments } = options;

  // Get conversation details
  const { data: conversation, error: convError } = await supabaseAdmin
    .from("conversations")
    .select(`
      *,
      customer:customers(id, email, phone, first_name, last_name),
      connected_account:connected_accounts!location_id(*)
    `)
    .eq("id", conversationId)
    .single();

  if (convError || !conversation) {
    return { success: false, error: "Conversation not found" };
  }

  // Get the connected account for this channel
  const { data: connectedAccount } = await supabaseAdmin
    .from("connected_accounts")
    .select("*")
    .eq("location_id", conversation.location_id)
    .eq("channel", conversation.channel)
    .eq("is_active", true)
    .single();

  if (!connectedAccount) {
    return { success: false, error: `No active ${conversation.channel} account connected` };
  }

  // Create pending message record
  const { data: message, error: msgError } = await supabaseAdmin
    .from("messages")
    .insert({
      conversation_id: conversationId,
      direction: "outbound",
      status: "pending",
      sender_type: "staff",
      sender_id: staffId,
      sender_name: "Tour Team",
      content,
      content_type: attachments?.length ? "mixed" : "text",
      attachments: attachments || [],
    })
    .select("id")
    .single();

  if (msgError || !message) {
    return { success: false, error: "Failed to create message record" };
  }

  // Route to appropriate sender
  let result: MessageResult;

  try {
    switch (conversation.channel) {
      case "email":
        result = await sendEmail(connectedAccount, conversation, content, attachments);
        break;
      case "whatsapp":
        result = await sendWhatsApp(connectedAccount, conversation, content, attachments);
        break;
      case "sms":
        result = await sendSMS(connectedAccount, conversation, content);
        break;
      case "instagram":
        result = await sendInstagram(connectedAccount, conversation, content);
        break;
      case "messenger":
        result = await sendMessenger(connectedAccount, conversation, content);
        break;
      default:
        result = { success: false, error: `Unsupported channel: ${conversation.channel}` };
    }
  } catch (error) {
    result = { success: false, error: String(error) };
  }

  // Update message status
  await supabaseAdmin
    .from("messages")
    .update({
      status: result.success ? "sent" : "failed",
      external_message_id: result.externalId,
      sent_at: result.success ? new Date().toISOString() : null,
      metadata: result.success ? {} : { error: result.error },
    })
    .eq("id", message.id);

  return { ...result, messageId: message.id };
}

// Email sender (Gmail API)
async function sendEmail(
  account: any,
  conversation: any,
  content: string,
  attachments?: any[]
): Promise<MessageResult> {
  const recipientEmail = conversation.customer?.email;
  if (!recipientEmail) {
    return { success: false, error: "Customer has no email address" };
  }

  // Refresh token if expired
  const accessToken = await refreshGmailToken(account);

  // Create email content
  const subject = conversation.subject || "Message from TourPilot";
  const email = createMimeMessage(
    account.account_name,
    recipientEmail,
    subject,
    content
  );

  // Send via Gmail API
  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: Buffer.from(email).toString("base64url"),
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    return { success: false, error: error.error?.message || "Gmail API error" };
  }

  const result = await response.json();
  return { success: true, externalId: result.id };
}

// WhatsApp sender (Cloud API)
async function sendWhatsApp(
  account: any,
  conversation: any,
  content: string,
  attachments?: any[]
): Promise<MessageResult> {
  const recipientPhone = conversation.customer?.phone;
  if (!recipientPhone) {
    return { success: false, error: "Customer has no phone number" };
  }

  const phoneNumberId = account.metadata?.phone_number_id;
  const accessToken = account.access_token;

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: recipientPhone.replace(/\D/g, ""),
        type: "text",
        text: { body: content },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    return { success: false, error: error.error?.message || "WhatsApp API error" };
  }

  const result = await response.json();
  return { success: true, externalId: result.messages?.[0]?.id };
}

// SMS sender (Twilio)
async function sendSMS(
  account: any,
  conversation: any,
  content: string
): Promise<MessageResult> {
  const recipientPhone = conversation.customer?.phone;
  if (!recipientPhone) {
    return { success: false, error: "Customer has no phone number" };
  }

  const accountSid = account.account_id;
  const authToken = account.access_token;
  const fromNumber = account.account_name;

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: recipientPhone,
        From: fromNumber,
        Body: content,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    return { success: false, error: error.message || "Twilio API error" };
  }

  const result = await response.json();
  return { success: true, externalId: result.sid };
}

// Instagram sender (Graph API)
async function sendInstagram(
  account: any,
  conversation: any,
  content: string
): Promise<MessageResult> {
  const recipientId = conversation.external_thread_id;
  if (!recipientId) {
    return { success: false, error: "No Instagram thread ID" };
  }

  const pageId = account.metadata?.page_id;
  const accessToken = account.access_token;

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${pageId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: content },
        access_token: accessToken,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    return { success: false, error: error.error?.message || "Instagram API error" };
  }

  const result = await response.json();
  return { success: true, externalId: result.message_id };
}

// Messenger sender (Graph API)
async function sendMessenger(
  account: any,
  conversation: any,
  content: string
): Promise<MessageResult> {
  const recipientId = conversation.external_thread_id;
  if (!recipientId) {
    return { success: false, error: "No Messenger thread ID" };
  }

  const pageId = account.metadata?.page_id;
  const accessToken = account.access_token;

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${pageId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: content },
        access_token: accessToken,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    return { success: false, error: error.error?.message || "Messenger API error" };
  }

  const result = await response.json();
  return { success: true, externalId: result.message_id };
}

// Helper: Refresh Gmail token if expired
async function refreshGmailToken(account: any): Promise<string> {
  const expiresAt = new Date(account.token_expires_at);
  if (expiresAt > new Date()) {
    return account.access_token;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: account.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const tokens = await response.json();

  // Update stored tokens
  await supabaseAdmin
    .from("connected_accounts")
    .update({
      access_token: tokens.access_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    .eq("id", account.id);

  return tokens.access_token;
}

// Helper: Create MIME email message
function createMimeMessage(
  from: string,
  to: string,
  subject: string,
  body: string
): string {
  const boundary = "boundary_" + Date.now();
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    body,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    `<div style="font-family: sans-serif;">${body.replace(/\n/g, "<br>")}</div>`,
    "",
    `--${boundary}--`,
  ].join("\r\n");
}

// Template variable replacement
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] || match;
  });
}
