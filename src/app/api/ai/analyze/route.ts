import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getBookingAgent } from "@/lib/ai";

const analyzeRequestSchema = z.object({
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
    const validation = analyzeRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const agent = getBookingAgent();
    const sentiment = await agent.analyzeSentiment(validation.data.message);

    return NextResponse.json({
      success: true,
      ...sentiment,
    });
  } catch (error: any) {
    console.error("Sentiment analysis error:", error);
    return NextResponse.json(
      { error: "Analysis failed", details: error.message },
      { status: 500 }
    );
  }
}
