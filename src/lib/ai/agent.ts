/**
 * AI Booking Agent - Main agent service with OpenAI/Anthropic support
 */

import { getAIConfig, AIConfig } from "./config";
import { ChatMessage, ConversationContext, AIAgentResponse } from "./types";
import { getOpenAITools } from "./tools";
import { executeTool } from "./tool-executor";
import { buildSystemPrompt, SENTIMENT_ANALYSIS_PROMPT, MESSAGE_CLASSIFICATION_PROMPT, SMART_REPLY_PROMPT } from "./prompts";

// OpenAI client setup
async function callOpenAI(
  messages: Array<{ role: string; content: string; name?: string }>,
  config: AIConfig,
  tools?: any[]
): Promise<any> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      tools: tools,
      tool_choice: tools ? "auto" : undefined,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "OpenAI API error");
  }

  return response.json();
}

// Anthropic client setup
async function callAnthropic(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  config: AIConfig,
  tools?: any[]
): Promise<any> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens,
      system: systemPrompt,
      messages: messages.filter((m) => m.role !== "system"),
      tools: tools,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Anthropic API error");
  }

  return response.json();
}

// Main agent class
export class BookingAgent {
  private config: AIConfig;
  private conversationHistory: Map<string, ChatMessage[]> = new Map();

  constructor(config?: Partial<AIConfig>) {
    this.config = { ...getAIConfig(), ...config };
  }

  // Get or initialize conversation history
  private getHistory(conversationId: string): ChatMessage[] {
    if (!this.conversationHistory.has(conversationId)) {
      this.conversationHistory.set(conversationId, []);
    }
    return this.conversationHistory.get(conversationId)!;
  }

  // Add message to history
  private addToHistory(conversationId: string, message: ChatMessage): void {
    const history = this.getHistory(conversationId);
    history.push(message);

    // Keep history manageable (last 20 messages)
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }
  }

  // Clear conversation history
  clearHistory(conversationId: string): void {
    this.conversationHistory.delete(conversationId);
  }

  // Main chat method
  async chat(
    userMessage: string,
    context: ConversationContext
  ): Promise<AIAgentResponse> {
    const { conversationId, customerName } = context;

    // Build system prompt with context
    const systemPrompt = buildSystemPrompt({
      customerName,
      locationName: context.metadata?.locationName,
    });

    // Get conversation history
    const history = this.getHistory(conversationId);

    // Add user message to history
    this.addToHistory(conversationId, {
      role: "user",
      content: userMessage,
    });

    // Prepare messages for API
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ];

    try {
      let response: AIAgentResponse;

      if (this.config.provider === "openai") {
        response = await this.processOpenAI(messages, context);
      } else {
        response = await this.processAnthropic(messages, systemPrompt, context);
      }

      // Add assistant response to history
      this.addToHistory(conversationId, {
        role: "assistant",
        content: response.message,
      });

      return response;
    } catch (error) {
      console.error("AI Agent error:", error);
      return {
        message: "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment, or I can connect you with a team member.",
        shouldEscalate: true,
        escalationReason: "AI processing error",
      };
    }
  }

  // Process with OpenAI
  private async processOpenAI(
    messages: Array<{ role: string; content: string }>,
    context: ConversationContext
  ): Promise<AIAgentResponse> {
    const tools = getOpenAITools();
    const toolCalls: AIAgentResponse["toolCalls"] = [];

    let completion = await callOpenAI(messages, this.config, tools);
    let assistantMessage = completion.choices[0].message;

    // Handle tool calls
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      // Execute each tool
      for (const toolCall of assistantMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await executeTool(toolCall.function.name, args);

        toolCalls.push({
          name: toolCall.function.name,
          arguments: args,
          result: result.data || result.error,
        });

        // Add tool result to messages
        messages.push({
          role: "assistant",
          content: JSON.stringify(assistantMessage),
        });
        messages.push({
          role: "function" as any,
          content: JSON.stringify(result),
          name: toolCall.function.name,
        } as any);
      }

      // Get next response
      completion = await callOpenAI(messages, this.config, tools);
      assistantMessage = completion.choices[0].message;
    }

    return {
      message: assistantMessage.content || "I'm not sure how to help with that.",
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }

  // Process with Anthropic
  private async processAnthropic(
    messages: Array<{ role: string; content: string }>,
    systemPrompt: string,
    context: ConversationContext
  ): Promise<AIAgentResponse> {
    // Anthropic has different tool calling format - simplified for now
    const completion = await callAnthropic(
      messages,
      systemPrompt,
      this.config
    );

    const content = completion.content[0];

    return {
      message: content.type === "text" ? content.text : "I'm not sure how to help with that.",
    };
  }

  // Analyze sentiment of a message
  async analyzeSentiment(message: string): Promise<{
    sentiment: "positive" | "neutral" | "negative" | "urgent";
    confidence: number;
    topics: string[];
    shouldEscalate: boolean;
    escalationReason?: string;
  }> {
    try {
      const messages = [
        { role: "system", content: "You are a sentiment analysis assistant. Always respond with valid JSON only." },
        { role: "user", content: `${SENTIMENT_ANALYSIS_PROMPT}\n\n"${message}"` },
      ];

      const completion = await callOpenAI(
        messages,
        { ...this.config, temperature: 0.3 }
      );

      const response = completion.choices[0].message.content;
      return JSON.parse(response);
    } catch (error) {
      console.error("Sentiment analysis error:", error);
      return {
        sentiment: "neutral",
        confidence: 0.5,
        topics: [],
        shouldEscalate: false,
      };
    }
  }

  // Classify a message
  async classifyMessage(message: string): Promise<{
    primaryCategory: string;
    subCategory: string;
    intent: string;
    urgency: "low" | "medium" | "high";
    requiredAction: string;
    suggestedTeam: string;
  }> {
    try {
      const messages = [
        { role: "system", content: "You are a message classification assistant. Always respond with valid JSON only." },
        { role: "user", content: `${MESSAGE_CLASSIFICATION_PROMPT}\n\nMessage: "${message}"` },
      ];

      const completion = await callOpenAI(
        messages,
        { ...this.config, temperature: 0.3 }
      );

      const response = completion.choices[0].message.content;
      return JSON.parse(response);
    } catch (error) {
      console.error("Message classification error:", error);
      return {
        primaryCategory: "other",
        subCategory: "unknown",
        intent: "unknown",
        urgency: "medium",
        requiredAction: "Review manually",
        suggestedTeam: "support",
      };
    }
  }

  // Generate smart reply suggestions
  async generateSmartReplies(
    conversationHistory: ChatMessage[],
    lastMessage: string
  ): Promise<string[]> {
    try {
      const contextSummary = conversationHistory
        .slice(-5)
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");

      const messages = [
        { role: "system", content: "You are a customer service assistant. Generate professional reply suggestions. Always respond with a JSON array of 3 strings." },
        {
          role: "user",
          content: `${SMART_REPLY_PROMPT}\n\nConversation context:\n${contextSummary}\n\nCustomer's last message: "${lastMessage}"`,
        },
      ];

      const completion = await callOpenAI(
        messages,
        { ...this.config, temperature: 0.7 }
      );

      const response = completion.choices[0].message.content;
      return JSON.parse(response);
    } catch (error) {
      console.error("Smart reply generation error:", error);
      return [
        "Thank you for your message. Let me look into this for you.",
        "I understand your concern. I'll check on this right away.",
        "Thank you for reaching out. How can I assist you further?",
      ];
    }
  }
}

// Singleton instance
let agentInstance: BookingAgent | null = null;

export function getBookingAgent(): BookingAgent {
  if (!agentInstance) {
    agentInstance = new BookingAgent();
  }
  return agentInstance;
}
