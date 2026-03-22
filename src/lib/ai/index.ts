/**
 * AI Module Exports
 */

export { BookingAgent, getBookingAgent } from "./agent";
export { getAIConfig, DEFAULT_AI_CONFIG, type AIConfig, type AIProvider } from "./config";
export { BOOKING_TOOLS, getOpenAITools, getAnthropicTools } from "./tools";
export { executeTool } from "./tool-executor";
export {
  BOOKING_AGENT_SYSTEM_PROMPT,
  SENTIMENT_ANALYSIS_PROMPT,
  MESSAGE_CLASSIFICATION_PROMPT,
  SMART_REPLY_PROMPT,
  buildSystemPrompt,
} from "./prompts";
export type {
  ChatMessage,
  ConversationContext,
  AIAgentResponse,
  AIToolDefinition,
  ToolExecutionResult,
  TourSearchParams,
  BookingCreateParams,
  BookingModifyParams,
} from "./types";
