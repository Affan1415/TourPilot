/**
 * AI Agent Configuration
 * Supports OpenAI and Anthropic models
 */

export type AIProvider = "openai" | "anthropic";

export interface AIConfig {
  provider: AIProvider;
  model: string;
  maxTokens: number;
  temperature: number;
}

// Default configuration - uses OpenAI
export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: "openai",
  model: "gpt-4o",
  maxTokens: 1024,
  temperature: 0.7,
};

// Get AI configuration from environment
export function getAIConfig(): AIConfig {
  const provider = (process.env.AI_PROVIDER as AIProvider) || "openai";

  return {
    provider,
    model: provider === "openai"
      ? process.env.OPENAI_MODEL || "gpt-4o"
      : process.env.ANTHROPIC_MODEL || "claude-3-sonnet-20240229",
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || "1024"),
    temperature: parseFloat(process.env.AI_TEMPERATURE || "0.7"),
  };
}

// Environment variable names
export const ENV_KEYS = {
  OPENAI_API_KEY: "OPENAI_API_KEY",
  ANTHROPIC_API_KEY: "ANTHROPIC_API_KEY",
  AI_PROVIDER: "AI_PROVIDER",
} as const;
