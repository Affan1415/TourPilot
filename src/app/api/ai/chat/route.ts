import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getBookingAgent } from "@/lib/ai";

const chatRequestSchema = z.object({
  message: z.string().min(1, "Message is required"),
  conversation_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  customer_name: z.string().optional(),
  customer_email: z.string().email().optional(),
  customer_phone: z.string().optional(),
  channel: z.enum(["chat", "whatsapp", "sms", "email"]).default("chat"),
  location_id: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Check for API key
    if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "AI service not configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const validation = chatRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      message,
      conversation_id,
      customer_id,
      customer_name,
      customer_email,
      customer_phone,
      channel,
      location_id,
      metadata,
    } = validation.data;

    // Generate conversation ID if not provided
    const conversationId = conversation_id || crypto.randomUUID();

    const agent = getBookingAgent();

    const response = await agent.chat(message, {
      conversationId,
      customerId: customer_id,
      customerName: customer_name,
      customerEmail: customer_email,
      customerPhone: customer_phone,
      channel,
      locationId: location_id,
      previousMessages: [],
      metadata,
    });

    return NextResponse.json({
      success: true,
      conversation_id: conversationId,
      message: response.message,
      tool_calls: response.toolCalls,
      sentiment: response.sentiment,
      category: response.category,
      suggested_actions: response.suggestedActions,
      should_escalate: response.shouldEscalate,
      escalation_reason: response.escalationReason,
    });
  } catch (error: any) {
    console.error("AI Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process message", details: error.message },
      { status: 500 }
    );
  }
}
