/**
 * GetYourGuide API Client
 * Integration with GetYourGuide Supplier API
 * https://supplier-api.getyourguide.com/docs
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

export class GetYourGuideClient extends BaseOTAClient {
  get provider(): OTAProvider {
    return "getyourguide";
  }

  protected getBaseUrl(): string {
    return this.config.environment === "production"
      ? "https://supplier-api.getyourguide.com/1"
      : "https://supplier-api-sandbox.getyourguide.com/1";
  }

  protected getAuthHeaders(): Record<string, string> {
    // GYG uses Basic auth with API key
    const credentials = Buffer.from(`${this.config.apiKey}:`).toString("base64");
    return {
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.request<{ data: any }>("/supplier");
      return { success: true, message: "Connected to GetYourGuide API" };
    } catch (error) {
      if (error instanceof OTAApiError) {
        return { success: false, message: error.message };
      }
      return { success: false, message: String(error) };
    }
  }

  async getProducts(): Promise<OTAProduct[]> {
    const response = await this.request<{ data: { tours: GYGTour[] } }>("/tours");

    return response.data.tours.map((t) => this.mapProduct(t));
  }

  async pushAvailability(
    productId: string,
    availability: OTAAvailability[]
  ): Promise<OTASyncResult> {
    const errors: { type: "availability"; itemId: string; error: string; recoverable: boolean }[] = [];
    let syncedCount = 0;

    // GYG expects availability per date
    for (const slot of availability) {
      try {
        await this.request(`/tours/${productId}/availabilities`, {
          method: "POST",
          body: JSON.stringify({
            date: slot.date,
            start_time: slot.startTime,
            end_time: slot.endTime,
            vacancies: slot.spotsAvailable,
            retail_price: {
              values: [
                {
                  participant_category: "adult",
                  price: slot.price,
                },
              ],
              currency: slot.currency,
            },
          }),
        });
        syncedCount++;
      } catch (error) {
        errors.push({
          type: "availability",
          itemId: `${productId}-${slot.date}-${slot.startTime}`,
          error: String(error),
          recoverable: true,
        });
      }
    }

    return {
      success: errors.length === 0,
      provider: "getyourguide",
      syncedCount,
      errorCount: errors.length,
      errors,
      syncedAt: new Date().toISOString(),
    };
  }

  async fetchBookings(fromDate?: string, toDate?: string): Promise<OTABooking[]> {
    const params = new URLSearchParams();
    if (fromDate) params.set("date_from", fromDate);
    if (toDate) params.set("date_to", toDate);
    params.set("cnt", "100");

    const response = await this.request<{ data: { bookings: GYGBooking[] } }>(
      `/bookings?${params}`
    );

    return response.data.bookings.map((b) => this.mapBooking(b));
  }

  async confirmBooking(
    bookingId: string
  ): Promise<{ success: boolean; confirmationCode?: string }> {
    try {
      const response = await this.request<{ data: { confirmation_code: string } }>(
        `/bookings/${bookingId}/confirm`,
        { method: "POST" }
      );
      return { success: true, confirmationCode: response.data.confirmation_code };
    } catch (error) {
      return { success: false };
    }
  }

  async cancelBooking(
    bookingId: string,
    reason?: string
  ): Promise<{ success: boolean; refundAmount?: number }> {
    try {
      const response = await this.request<{ data: { refund_amount: number } }>(
        `/bookings/${bookingId}/cancel`,
        {
          method: "POST",
          body: JSON.stringify({ reason: reason || "Supplier cancellation" }),
        }
      );
      return { success: true, refundAmount: response.data.refund_amount };
    } catch (error) {
      return { success: false };
    }
  }

  async updateProduct(
    productId: string,
    updates: Partial<OTAProductUpdate>
  ): Promise<{ success: boolean }> {
    try {
      await this.request(`/tours/${productId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: updates.name,
          description: updates.description,
          duration: updates.duration,
          max_participants: updates.maxCapacity,
          active: updates.status === "active",
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

    return `sha256=${expectedSignature}` === signature;
  }

  // Block off availability (close slots)
  async blockAvailability(
    productId: string,
    date: string,
    startTime: string
  ): Promise<{ success: boolean }> {
    try {
      await this.request(`/tours/${productId}/availabilities/block`, {
        method: "POST",
        body: JSON.stringify({ date, start_time: startTime }),
      });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  private mapProduct(gygTour: GYGTour): OTAProduct {
    return {
      id: gygTour.tour_id.toString(),
      code: gygTour.tour_code,
      name: gygTour.title,
      description: gygTour.abstract,
      category: gygTour.category?.name,
      status: gygTour.active ? "active" : "inactive",
      pricing: gygTour.price
        ? {
            adult: gygTour.price.values?.find((v: any) => v.category === "adult")?.amount || 0,
            child: gygTour.price.values?.find((v: any) => v.category === "child")?.amount,
            currency: gygTour.price.currency,
          }
        : undefined,
    };
  }

  private mapBooking(gygBooking: GYGBooking): OTABooking {
    const traveler = gygBooking.traveler;

    const customer: OTACustomer = {
      firstName: traveler?.first_name || "",
      lastName: traveler?.last_name || "",
      email: traveler?.email || "",
      phone: traveler?.phone_number,
      country: traveler?.country_code,
      language: gygBooking.language,
    };

    const guests: OTAGuest[] = (gygBooking.participants || []).map((p: any) => ({
      firstName: p.first_name || traveler?.first_name || "",
      lastName: p.last_name || traveler?.last_name || "",
      type: this.mapParticipantCategory(p.category),
      age: p.age,
    }));

    return {
      otaBookingId: gygBooking.booking_id.toString(),
      otaConfirmationCode: gygBooking.booking_reference,
      provider: "getyourguide",
      productId: gygBooking.tour_id?.toString() || "",
      productName: gygBooking.option_title || gygBooking.tour_title || "",
      bookingDate: gygBooking.date,
      startTime: gygBooking.start_time || "00:00",
      guestCount: gygBooking.number_of_participants || 1,
      totalPrice: gygBooking.retail_price?.amount || 0,
      currency: gygBooking.retail_price?.currency || "EUR",
      commission: this.calculateCommission(gygBooking.retail_price?.amount || 0),
      netPrice: gygBooking.net_price?.amount || 0,
      status: this.mapStatus(gygBooking.status),
      customer,
      guests,
      specialRequests: gygBooking.traveler_message,
      pickupLocation: gygBooking.hotel
        ? {
            type: "hotel",
            name: gygBooking.hotel.name || "",
            address: gygBooking.hotel.address,
            time: gygBooking.pickup_time,
          }
        : undefined,
      bookedAt: gygBooking.booking_date,
      cancelledAt: gygBooking.cancelled_at,
      cancellationReason: gygBooking.cancellation_reason,
      rawData: gygBooking,
    };
  }

  private mapParticipantCategory(category: string): "adult" | "child" | "infant" | "senior" {
    switch (category?.toLowerCase()) {
      case "infant":
        return "infant";
      case "child":
      case "youth":
        return "child";
      case "senior":
        return "senior";
      default:
        return "adult";
    }
  }

  private mapStatus(status: string): OTABooking["status"] {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return "confirmed";
      case "pending":
        return "pending";
      case "cancelled":
        return "cancelled";
      case "completed":
        return "completed";
      case "no_show":
        return "no_show";
      default:
        return "pending";
    }
  }

  private calculateCommission(totalPrice: number): number {
    // GYG typically takes 25-30% commission
    const commissionRate = 0.27;
    return totalPrice * commissionRate;
  }
}

// GetYourGuide-specific types
interface GYGTour {
  tour_id: number;
  tour_code?: string;
  title: string;
  abstract?: string;
  category?: { name: string };
  active: boolean;
  price?: {
    values: Array<{ category: string; amount: number }>;
    currency: string;
  };
}

interface GYGBooking {
  booking_id: number;
  booking_reference: string;
  tour_id?: number;
  tour_title?: string;
  option_title?: string;
  date: string;
  start_time?: string;
  number_of_participants?: number;
  retail_price?: { amount: number; currency: string };
  net_price?: { amount: number; currency: string };
  status: string;
  language?: string;
  traveler?: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number?: string;
    country_code?: string;
  };
  participants?: Array<{
    first_name?: string;
    last_name?: string;
    category: string;
    age?: number;
  }>;
  traveler_message?: string;
  hotel?: {
    name?: string;
    address?: string;
  };
  pickup_time?: string;
  booking_date: string;
  cancelled_at?: string;
  cancellation_reason?: string;
}
