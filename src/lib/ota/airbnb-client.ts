/**
 * Airbnb Experiences API Client
 * Integration with Airbnb Experiences Partner API
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

export class AirbnbClient extends BaseOTAClient {
  get provider(): OTAProvider {
    return "airbnb";
  }

  protected getBaseUrl(): string {
    return this.config.environment === "production"
      ? "https://api.airbnb.com/v2"
      : "https://api-sandbox.airbnb.com/v2";
  }

  protected getAuthHeaders(): Record<string, string> {
    return {
      "X-Airbnb-API-Key": this.config.apiKey,
      "X-Airbnb-Oauth-Token": this.config.accessToken || "",
      Accept: "application/json",
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.request<{ user: any }>("/users/me");
      return { success: true, message: "Connected to Airbnb Experiences API" };
    } catch (error) {
      if (error instanceof OTAApiError) {
        return { success: false, message: error.message };
      }
      return { success: false, message: String(error) };
    }
  }

  async getProducts(): Promise<OTAProduct[]> {
    const response = await this.request<{ experiences: AirbnbExperience[] }>(
      `/hosting/experiences?host_id=${this.config.supplierId}`
    );

    return response.experiences.map((e) => this.mapProduct(e));
  }

  async pushAvailability(
    productId: string,
    availability: OTAAvailability[]
  ): Promise<OTASyncResult> {
    const errors: { type: "availability"; itemId: string; error: string; recoverable: boolean }[] = [];
    let syncedCount = 0;

    // Airbnb expects availability as instances
    const instances = availability.map((a) => ({
      start_date: a.date,
      start_time: a.startTime,
      end_time: a.endTime,
      seats_available: a.spotsAvailable,
      price_per_person: {
        amount: a.price,
        currency: a.currency,
      },
      status: "available",
    }));

    try {
      await this.request(`/hosting/experiences/${productId}/instances`, {
        method: "PUT",
        body: JSON.stringify({ instances }),
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
      provider: "airbnb",
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

    const response = await this.request<{ reservations: AirbnbReservation[] }>(
      `/hosting/reservations?${params}`
    );

    return response.reservations
      .filter((r) => r.listing_type === "experience")
      .map((r) => this.mapBooking(r));
  }

  async confirmBooking(
    bookingId: string
  ): Promise<{ success: boolean; confirmationCode?: string }> {
    try {
      const response = await this.request<{ confirmation_code: string }>(
        `/hosting/reservations/${bookingId}/accept`,
        { method: "POST" }
      );
      return { success: true, confirmationCode: response.confirmation_code };
    } catch (error) {
      return { success: false };
    }
  }

  async cancelBooking(
    bookingId: string,
    reason?: string
  ): Promise<{ success: boolean; refundAmount?: number }> {
    try {
      const response = await this.request<{ refund: { amount: number } }>(
        `/hosting/reservations/${bookingId}/cancel`,
        {
          method: "POST",
          body: JSON.stringify({
            cancellation_reason: reason || "host_other",
          }),
        }
      );
      return { success: true, refundAmount: response.refund?.amount };
    } catch (error) {
      return { success: false };
    }
  }

  async updateProduct(
    productId: string,
    updates: Partial<OTAProductUpdate>
  ): Promise<{ success: boolean }> {
    try {
      await this.request(`/hosting/experiences/${productId}`, {
        method: "PUT",
        body: JSON.stringify({
          name: updates.name,
          description: updates.description,
          duration_minutes: updates.duration,
          max_group_size: updates.maxCapacity,
          status: updates.status === "active" ? "listed" : "unlisted",
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

    return signature === `sha256=${expectedSignature}`;
  }

  // Airbnb-specific: Update instant book settings
  async updateInstantBook(
    productId: string,
    enabled: boolean
  ): Promise<{ success: boolean }> {
    try {
      await this.request(`/hosting/experiences/${productId}/instant_book`, {
        method: "PUT",
        body: JSON.stringify({ enabled }),
      });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  private mapProduct(experience: AirbnbExperience): OTAProduct {
    return {
      id: experience.id.toString(),
      code: experience.listing_key,
      name: experience.name,
      description: experience.summary,
      category: experience.category?.name,
      status: experience.status === "listed" ? "active" : "inactive",
      pricing: experience.price
        ? {
            adult: experience.price.amount,
            currency: experience.price.currency,
          }
        : undefined,
    };
  }

  private mapBooking(reservation: AirbnbReservation): OTABooking {
    const guest = reservation.guest;

    const customer: OTACustomer = {
      firstName: guest?.first_name || "",
      lastName: guest?.last_name || "",
      email: guest?.email || "",
      phone: guest?.phone,
      country: guest?.country_code,
      language: reservation.preferred_locale,
    };

    const guests: OTAGuest[] = Array(reservation.number_of_guests || 1)
      .fill(null)
      .map((_, i) => ({
        firstName: i === 0 ? (guest?.first_name || "Guest 1") : `Guest ${i + 1}`,
        lastName: i === 0 ? (guest?.last_name || "") : "",
        type: "adult" as const,
      }));

    return {
      otaBookingId: reservation.confirmation_code,
      otaConfirmationCode: reservation.confirmation_code,
      provider: "airbnb",
      productId: reservation.listing_id?.toString() || "",
      productName: reservation.listing?.name || "",
      bookingDate: reservation.start_date,
      startTime: reservation.start_time || "00:00",
      guestCount: reservation.number_of_guests || 1,
      totalPrice: reservation.expected_payout?.amount || 0,
      currency: reservation.expected_payout?.currency || "USD",
      commission: this.calculateCommission(reservation),
      netPrice: reservation.host_payout?.amount || 0,
      status: this.mapStatus(reservation.status),
      customer,
      guests,
      specialRequests: reservation.guest_message,
      bookedAt: reservation.booked_at,
      cancelledAt: reservation.cancelled_at,
      cancellationReason: reservation.cancellation_reason,
      rawData: reservation,
    };
  }

  private mapStatus(status: string): OTABooking["status"] {
    switch (status?.toLowerCase()) {
      case "accepted":
      case "confirmed":
        return "confirmed";
      case "pending":
      case "pending_payment":
        return "pending";
      case "cancelled":
      case "denied":
        return "cancelled";
      case "completed":
        return "completed";
      default:
        return "pending";
    }
  }

  private calculateCommission(reservation: AirbnbReservation): number {
    // Airbnb takes ~20% service fee from hosts
    const totalPrice = reservation.expected_payout?.amount || 0;
    const hostPayout = reservation.host_payout?.amount || 0;
    return totalPrice - hostPayout;
  }
}

// Airbnb-specific types
interface AirbnbExperience {
  id: number;
  listing_key?: string;
  name: string;
  summary?: string;
  category?: { name: string };
  status: string;
  price?: {
    amount: number;
    currency: string;
  };
}

interface AirbnbReservation {
  confirmation_code: string;
  listing_id?: number;
  listing_type: string;
  listing?: { name: string };
  start_date: string;
  start_time?: string;
  number_of_guests?: number;
  expected_payout?: { amount: number; currency: string };
  host_payout?: { amount: number; currency: string };
  status: string;
  preferred_locale?: string;
  guest?: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    country_code?: string;
  };
  guest_message?: string;
  booked_at: string;
  cancelled_at?: string;
  cancellation_reason?: string;
}
