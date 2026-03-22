/**
 * TripAdvisor Connectivity Partner API Client
 * Integration with TripAdvisor Experiences API
 */

import { createHmac } from "crypto";
import { BaseOTAClient, OTAProduct, OTAProductUpdate, OTAApiError } from "./base-client";
import type {
  OTAProvider,
  OTAConfig,
  OTAAvailability,
  OTABooking,
  OTASyncResult,
  OTACustomer,
  OTAGuest,
} from "./types";

export class TripAdvisorClient extends BaseOTAClient {
  get provider(): OTAProvider {
    return "tripadvisor";
  }

  protected getBaseUrl(): string {
    return this.config.environment === "production"
      ? "https://api.tripadvisor.com/api/partner/v2"
      : "https://api-sandbox.tripadvisor.com/api/partner/v2";
  }

  protected getAuthHeaders(): Record<string, string> {
    return {
      "X-TripAdvisor-API-Key": this.config.apiKey,
      Accept: "application/json",
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.request<{ data: any }>("/supplier/info");
      return { success: true, message: "Connected to TripAdvisor API" };
    } catch (error) {
      if (error instanceof OTAApiError) {
        return { success: false, message: error.message };
      }
      return { success: false, message: String(error) };
    }
  }

  async getProducts(): Promise<OTAProduct[]> {
    const response = await this.request<{ products: TAProduct[] }>(
      `/supplier/${this.config.supplierId}/products`
    );

    return response.products.map((p) => this.mapProduct(p));
  }

  async pushAvailability(
    productId: string,
    availability: OTAAvailability[]
  ): Promise<OTASyncResult> {
    const errors: { type: "availability"; itemId: string; error: string; recoverable: boolean }[] = [];
    let syncedCount = 0;

    // TripAdvisor expects availability in schedule format
    const schedules = availability.map((a) => ({
      date: a.date,
      start_time: a.startTime,
      end_time: a.endTime,
      capacity: a.spotsAvailable,
      pricing: {
        adult: {
          amount: a.price,
          currency: a.currency,
        },
      },
      status: "AVAILABLE",
    }));

    try {
      await this.request(`/products/${productId}/availability`, {
        method: "PUT",
        body: JSON.stringify({ schedules }),
      });
      syncedCount = availability.length;
    } catch (error) {
      errors.push({
        type: "availability",
        itemId: productId,
        error: String(error),
        recoverable: true,
      });
    }

    return {
      success: errors.length === 0,
      provider: "tripadvisor",
      syncedCount,
      errorCount: errors.length,
      errors,
      syncedAt: new Date().toISOString(),
    };
  }

  async fetchBookings(fromDate?: string, toDate?: string): Promise<OTABooking[]> {
    const params = new URLSearchParams();
    if (fromDate) params.set("start_date", fromDate);
    if (toDate) params.set("end_date", toDate);
    params.set("status", "confirmed,pending");

    const response = await this.request<{ bookings: TABooking[] }>(
      `/supplier/${this.config.supplierId}/bookings?${params}`
    );

    return response.bookings.map((b) => this.mapBooking(b));
  }

  async confirmBooking(
    bookingId: string
  ): Promise<{ success: boolean; confirmationCode?: string }> {
    try {
      const response = await this.request<{ confirmation_number: string }>(
        `/bookings/${bookingId}/confirm`,
        { method: "POST" }
      );
      return { success: true, confirmationCode: response.confirmation_number };
    } catch (error) {
      return { success: false };
    }
  }

  async cancelBooking(
    bookingId: string,
    reason?: string
  ): Promise<{ success: boolean; refundAmount?: number }> {
    try {
      const response = await this.request<{ refund_amount: number }>(
        `/bookings/${bookingId}/cancel`,
        {
          method: "POST",
          body: JSON.stringify({ reason: reason || "Supplier cancellation" }),
        }
      );
      return { success: true, refundAmount: response.refund_amount };
    } catch (error) {
      return { success: false };
    }
  }

  async updateProduct(
    productId: string,
    updates: Partial<OTAProductUpdate>
  ): Promise<{ success: boolean }> {
    try {
      await this.request(`/products/${productId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: updates.name,
          description: updates.description,
          duration_minutes: updates.duration,
          max_capacity: updates.maxCapacity,
          status: updates.status === "active" ? "ACTIVE" : "INACTIVE",
          photos: updates.images?.map((url) => ({ url })),
        }),
      });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.config.webhookSecret) return false;

    const expectedSignature = createHmac("sha256", this.config.webhookSecret)
      .update(payload)
      .digest("hex");

    return signature === expectedSignature;
  }

  // TripAdvisor-specific: Fetch reviews
  async fetchReviews(productId?: string): Promise<TAReview[]> {
    const url = productId
      ? `/products/${productId}/reviews`
      : `/supplier/${this.config.supplierId}/reviews`;

    const response = await this.request<{ reviews: TAReview[] }>(url);
    return response.reviews;
  }

  // TripAdvisor-specific: Respond to a review
  async respondToReview(
    reviewId: string,
    response: string
  ): Promise<{ success: boolean }> {
    try {
      await this.request(`/reviews/${reviewId}/response`, {
        method: "POST",
        body: JSON.stringify({ response_text: response }),
      });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  private mapProduct(taProduct: TAProduct): OTAProduct {
    return {
      id: taProduct.product_id,
      code: taProduct.product_code,
      name: taProduct.name,
      description: taProduct.description,
      category: taProduct.category,
      status: taProduct.status === "ACTIVE" ? "active" : "inactive",
      pricing: taProduct.pricing
        ? {
            adult: taProduct.pricing.adult?.amount || 0,
            child: taProduct.pricing.child?.amount,
            currency: taProduct.pricing.currency || "USD",
          }
        : undefined,
    };
  }

  private mapBooking(taBooking: TABooking): OTABooking {
    const traveler = taBooking.lead_traveler;

    const customer: OTACustomer = {
      firstName: traveler?.first_name || "",
      lastName: traveler?.last_name || "",
      email: traveler?.email || "",
      phone: traveler?.phone,
      country: traveler?.country,
      language: taBooking.language,
    };

    const guests: OTAGuest[] = (taBooking.travelers || []).map((t) => ({
      firstName: t.first_name || "",
      lastName: t.last_name || "",
      type: this.mapTravelerType(t.type),
      age: t.age,
    }));

    return {
      otaBookingId: taBooking.booking_id,
      otaConfirmationCode: taBooking.confirmation_number || taBooking.booking_id,
      provider: "tripadvisor",
      productId: taBooking.product_id,
      productName: taBooking.product_name || "",
      bookingDate: taBooking.travel_date,
      startTime: taBooking.start_time || "00:00",
      guestCount: taBooking.num_travelers || 1,
      totalPrice: taBooking.total_amount?.amount || 0,
      currency: taBooking.total_amount?.currency || "USD",
      commission: this.calculateCommission(taBooking.total_amount?.amount || 0),
      netPrice: taBooking.payout_amount?.amount || 0,
      status: this.mapStatus(taBooking.status),
      customer,
      guests,
      specialRequests: taBooking.special_requests,
      pickupLocation: taBooking.pickup
        ? {
            type: "hotel",
            name: taBooking.pickup.name || "",
            address: taBooking.pickup.address,
            time: taBooking.pickup.time,
          }
        : undefined,
      bookedAt: taBooking.created_at,
      cancelledAt: taBooking.cancelled_at,
      cancellationReason: taBooking.cancellation_reason,
      rawData: taBooking,
    };
  }

  private mapTravelerType(type?: string): "adult" | "child" | "infant" | "senior" {
    switch (type?.toLowerCase()) {
      case "infant":
        return "infant";
      case "child":
        return "child";
      case "senior":
        return "senior";
      default:
        return "adult";
    }
  }

  private mapStatus(status: string): OTABooking["status"] {
    switch (status?.toUpperCase()) {
      case "CONFIRMED":
        return "confirmed";
      case "PENDING":
        return "pending";
      case "CANCELLED":
        return "cancelled";
      case "COMPLETED":
        return "completed";
      case "NO_SHOW":
        return "no_show";
      default:
        return "pending";
    }
  }

  private calculateCommission(totalPrice: number): number {
    // TripAdvisor typically takes 20-25% commission
    const commissionRate = 0.22;
    return totalPrice * commissionRate;
  }
}

// TripAdvisor-specific types
interface TAProduct {
  product_id: string;
  product_code?: string;
  name: string;
  description?: string;
  category?: string;
  status: string;
  pricing?: {
    adult?: { amount: number };
    child?: { amount: number };
    currency?: string;
  };
}

interface TABooking {
  booking_id: string;
  confirmation_number?: string;
  product_id: string;
  product_name?: string;
  travel_date: string;
  start_time?: string;
  num_travelers?: number;
  total_amount?: { amount: number; currency: string };
  payout_amount?: { amount: number; currency: string };
  status: string;
  language?: string;
  lead_traveler?: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    country?: string;
  };
  travelers?: Array<{
    first_name?: string;
    last_name?: string;
    type?: string;
    age?: number;
  }>;
  special_requests?: string;
  pickup?: {
    name?: string;
    address?: string;
    time?: string;
  };
  created_at: string;
  cancelled_at?: string;
  cancellation_reason?: string;
}

interface TAReview {
  review_id: string;
  product_id: string;
  rating: number;
  title?: string;
  text: string;
  traveler_name: string;
  travel_date: string;
  created_at: string;
  response?: {
    text: string;
    created_at: string;
  };
}
