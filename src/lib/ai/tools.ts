/**
 * AI Agent Tools - Function definitions for booking actions
 */

import { AIToolDefinition } from "./types";

// Tool definitions for OpenAI function calling
export const BOOKING_TOOLS: AIToolDefinition[] = [
  {
    name: "search_tours",
    description: "Search for available tours based on criteria like date, guest count, or tour type",
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date to search for (YYYY-MM-DD format)",
        },
        guest_count: {
          type: "number",
          description: "Number of guests",
        },
        tour_type: {
          type: "string",
          description: "Type or name of tour to search for",
        },
        time_preference: {
          type: "string",
          description: "Preferred time of day",
          enum: ["morning", "afternoon", "evening", "any"],
        },
      },
    },
  },
  {
    name: "check_availability",
    description: "Check availability for a specific tour on a specific date",
    parameters: {
      type: "object",
      properties: {
        tour_id: {
          type: "string",
          description: "The UUID of the tour",
        },
        date: {
          type: "string",
          description: "Date to check (YYYY-MM-DD format)",
        },
        guest_count: {
          type: "number",
          description: "Number of guests to check capacity for",
        },
      },
      required: ["tour_id", "date"],
    },
  },
  {
    name: "create_booking",
    description: "Create a new booking for a customer",
    parameters: {
      type: "object",
      properties: {
        availability_id: {
          type: "string",
          description: "The UUID of the availability slot",
        },
        guest_count: {
          type: "number",
          description: "Number of guests",
        },
        customer_email: {
          type: "string",
          description: "Customer email address",
        },
        customer_first_name: {
          type: "string",
          description: "Customer first name",
        },
        customer_last_name: {
          type: "string",
          description: "Customer last name",
        },
        customer_phone: {
          type: "string",
          description: "Customer phone number (optional)",
        },
      },
      required: ["availability_id", "guest_count", "customer_email", "customer_first_name", "customer_last_name"],
    },
  },
  {
    name: "lookup_booking",
    description: "Look up an existing booking by reference number or customer email",
    parameters: {
      type: "object",
      properties: {
        booking_reference: {
          type: "string",
          description: "The booking reference number (e.g., BK240315xxxx)",
        },
        customer_email: {
          type: "string",
          description: "Customer email to search bookings for",
        },
      },
    },
  },
  {
    name: "modify_booking",
    description: "Modify an existing booking (reschedule, change guest count)",
    parameters: {
      type: "object",
      properties: {
        booking_reference: {
          type: "string",
          description: "The booking reference number",
        },
        action: {
          type: "string",
          description: "Type of modification",
          enum: ["reschedule", "change_guests"],
        },
        new_availability_id: {
          type: "string",
          description: "New availability ID for rescheduling",
        },
        new_guest_count: {
          type: "number",
          description: "New number of guests",
        },
      },
      required: ["booking_reference", "action"],
    },
  },
  {
    name: "cancel_booking",
    description: "Cancel an existing booking",
    parameters: {
      type: "object",
      properties: {
        booking_reference: {
          type: "string",
          description: "The booking reference number",
        },
        reason: {
          type: "string",
          description: "Reason for cancellation",
        },
      },
      required: ["booking_reference"],
    },
  },
  {
    name: "check_waiver_status",
    description: "Check the waiver signing status for a booking",
    parameters: {
      type: "object",
      properties: {
        booking_reference: {
          type: "string",
          description: "The booking reference number",
        },
      },
      required: ["booking_reference"],
    },
  },
  {
    name: "send_waiver_reminder",
    description: "Send a waiver signing reminder to guests who haven't signed",
    parameters: {
      type: "object",
      properties: {
        booking_reference: {
          type: "string",
          description: "The booking reference number",
        },
      },
      required: ["booking_reference"],
    },
  },
  {
    name: "get_tour_info",
    description: "Get detailed information about a specific tour including what to bring, policies, and FAQs",
    parameters: {
      type: "object",
      properties: {
        tour_id: {
          type: "string",
          description: "The UUID of the tour",
        },
        tour_name: {
          type: "string",
          description: "Name of the tour to search for",
        },
      },
    },
  },
  {
    name: "recommend_tours",
    description: "Get tour recommendations based on customer preferences",
    parameters: {
      type: "object",
      properties: {
        preferences: {
          type: "string",
          description: "Customer preferences or interests (e.g., 'family friendly', 'adventure', 'sunset')",
        },
        group_size: {
          type: "number",
          description: "Size of the group",
        },
        date: {
          type: "string",
          description: "Preferred date",
        },
      },
    },
  },
];

// Convert to OpenAI format
export function getOpenAITools() {
  return BOOKING_TOOLS.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

// Convert to Anthropic format
export function getAnthropicTools() {
  return BOOKING_TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters,
  }));
}
