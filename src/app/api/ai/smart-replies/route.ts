import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getBookingAgent, ChatMessage } from "@/lib/ai";

const smartRepliesRequestSchema = z.object({
  message: z.string().min(1, "Message is required"),
  conversation_history: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string(),
  })).optional().default([]),
});

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const validation = smartRepliesRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const agent = getBookingAgent();
    const replies = await agent.generateSmartReplies(
      validation.data.conversation_history as ChatMessage[],
      validation.data.message
    );

    return NextResponse.json({
      success: true,
      replies,
    });
  } catch (error: any) {
    console.error("Smart replies error:", error);
    return NextResponse.json(
      { error: "Failed to generate replies", details: error.message },
      { status: 500 }
    );
  }
}
