import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getBookingAgent } from "@/lib/ai";

const classifyRequestSchema = z.object({
  message: z.string().min(1, "Message is required"),
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
    const validation = classifyRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const agent = getBookingAgent();
    const classification = await agent.classifyMessage(validation.data.message);

    return NextResponse.json({
      success: true,
      ...classification,
    });
  } catch (error: any) {
    console.error("Message classification error:", error);
    return NextResponse.json(
      { error: "Classification failed", details: error.message },
      { status: 500 }
    );
  }
}
