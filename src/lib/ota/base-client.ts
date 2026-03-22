/**
 * Base OTA Client
 * Abstract class for OTA API integrations
 */

import type {
  OTAProvider,
  OTAConfig,
  OTAAvailability,
  OTABooking,
  OTASyncResult,
} from "./types";

export abstract class BaseOTAClient {
  protected config: OTAConfig;
  protected baseUrl: string;

  constructor(config: OTAConfig) {
    this.config = config;
    this.baseUrl = this.getBaseUrl();
  }

  protected abstract getBaseUrl(): string;

  abstract get provider(): OTAProvider;

  /**
   * Test connection to OTA API
   */
  abstract testConnection(): Promise<{ success: boolean; message: string }>;

  /**
   * Get list of products/tours from OTA
   */
  abstract getProducts(): Promise<OTAProduct[]>;

  /**
   * Push availability to OTA
   */
  abstract pushAvailability(
    productId: string,
    availability: OTAAvailability[]
  ): Promise<OTASyncResult>;

  /**
   * Fetch bookings from OTA
   */
  abstract fetchBookings(
    fromDate?: string,
    toDate?: string
  ): Promise<OTABooking[]>;

  /**
   * Confirm a booking
   */
  abstract confirmBooking(
    bookingId: string
  ): Promise<{ success: boolean; confirmationCode?: string }>;

  /**
   * Cancel a booking
   */
  abstract cancelBooking(
    bookingId: string,
    reason?: string
  ): Promise<{ success: boolean; refundAmount?: number }>;

  /**
   * Update product/tour on OTA
   */
  abstract updateProduct(
    productId: string,
    updates: Partial<OTAProductUpdate>
  ): Promise<{ success: boolean }>;

  /**
   * Verify webhook signature
   */
  abstract verifyWebhookSignature(
    payload: string,
    signature: string
  ): boolean;

  /**
   * Make authenticated API request
   */
  protected async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.getAuthHeaders();

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new OTAApiError(
        this.provider,
        response.status,
        `API request failed: ${response.statusText}`,
        errorBody
      );
    }

    return response.json();
  }

  /**
   * Get authentication headers for API requests
   */
  protected abstract getAuthHeaders(): Record<string, string>;

  /**
   * Format price for OTA (handle currency conversion if needed)
   */
  protected formatPrice(price: number, currency: string): number {
    // Most OTAs expect cents/minor units
    return Math.round(price * 100);
  }

  /**
   * Parse price from OTA format
   */
  protected parsePrice(price: number): number {
    return price / 100;
  }
}

export interface OTAProduct {
  id: string;
  code?: string;
  name: string;
  description?: string;
  category?: string;
  status: "active" | "inactive" | "pending";
  pricing?: {
    adult: number;
    child?: number;
    currency: string;
  };
}

export interface OTAProductUpdate {
  name: string;
  description: string;
  pricing: {
    adult: number;
    child?: number;
    currency: string;
  };
  duration: number;
  maxCapacity: number;
  images: string[];
  status: "active" | "inactive";
}

export class OTAApiError extends Error {
  constructor(
    public provider: OTAProvider,
    public statusCode: number,
    message: string,
    public responseBody?: string
  ) {
    super(`[${provider}] ${message}`);
    this.name = "OTAApiError";
  }
}
