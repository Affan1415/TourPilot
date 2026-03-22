/**
 * AI Agent Types
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "function";
  content: string;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
}

export interface ConversationContext {
  conversationId: string;
  customerId?: string;
  bookingId?: string;
  locationId?: string;
  channel: "chat" | "whatsapp" | "sms" | "email";
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  previousMessages: ChatMessage[];
  metadata?: Record<string, any>;
}

export interface AIToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

export interface AIAgentResponse {
  message: string;
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, any>;
    result?: any;
  }>;
  sentiment?: "positive" | "neutral" | "negative" | "urgent";
  category?: string;
  suggestedActions?: string[];
  shouldEscalate?: boolean;
  escalationReason?: string;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

// Booking-specific types
export interface TourSearchParams {
  date?: string;
  guestCount?: number;
  tourType?: string;
  timePreference?: "morning" | "afternoon" | "evening";
}

export interface BookingCreateParams {
  availabilityId: string;
  guestCount: number;
  customerEmail: string;
  customerFirstName: string;
  customerLastName: string;
  customerPhone?: string;
  guests?: Array<{
    firstName: string;
    lastName: string;
    email?: string;
  }>;
}

export interface BookingModifyParams {
  bookingReference: string;
  action: "reschedule" | "add_guests" | "remove_guests" | "cancel";
  newAvailabilityId?: string;
  newGuestCount?: number;
}
