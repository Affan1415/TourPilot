/**
 * Viator API Client
 * Integration with Viator Partner API v2
 * https://docs.viator.com/partner-api/
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

export class ViatorClient extends BaseOTAClient {
  get provider(): OTAProvider {
    return "viator";
  }

  protected getBaseUrl(): string {
    return this.config.environment === "production"
      ? "https://api.viator.com/partner"
      : "https://api.sandbox.viator.com/partner";
  }

  protected getAuthHeaders(): Record<string, string> {
    return {
      "exp-api-key": this.config.apiKey,
      Accept: "application/json;version=2.0",
      "Accept-Language": "en-US",
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.request<{ data: any }>("/products/search", {
        method: "POST",
        body: JSON.stringify({
          filtering: { destination: "684" }, // NYC as test
          pagination: { start: 1, count: 1 },
        }),
      });
      return { success: true, message: "Connected to Viator API" };
    } catch (error) {
      if (error instanceof OTAApiError) {
        return { success: false, message: error.message };
      }
      return { success: false, message: String(error) };
    }
  }

  async getProducts(): Promise<OTAProduct[]> {
    const response = await this.request<{ products: ViatorProduct[] }>(
      `/suppliers/${this.config.supplierId}/products`
    );

    return response.products.map((p) => this.mapProduct(p));
  }

  async pushAvailability(
    productId: string,
    availability: OTAAvailability[]
  ): Promise<OTASyncResult> {
    const errors: { type: "availability"; itemId: string; error: string; recoverable: boolean }[] = [];
    let syncedCount = 0;

    // Viator expects availability in their specific format
    const schedules = availability.map((a) => ({
      productCode: productId,
      startDate: a.date,
      endDate: a.date,
      startTime: a.startTime,
      pricingRecords: [
        {
          pricingType: "UNIT",
          bookingCutoffTime: "00:00:00",
          availability: {
            availabilityType: "FREESALE",
            maxTravelers: a.spotsAvailable,
          },
          pricing: [
            {
              ageBand: "ADULT",
              price: {
                original: {
                  recommendedRetailPrice: a.price,
                  currencyCode: a.currency,
                },
              },
            },
          ],
        },
      ],
    }));

    try {
      await this.request("/availability/schedules", {
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
      provider: "viator",
      syncedCount,
      errorCount: errors.length,
      errors,
      syncedAt: new Date().toISOString(),
    };
  }

  async fetchBookings(fromDate?: string, toDate?: string): Promise<OTABooking[]> {
    const params = new URLSearchParams();
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
    params.set("status", "CONFIRMED,PENDING");

    const response = await this.request<{ bookings: ViatorBooking[] }>(
      `/suppliers/${this.config.supplierId}/bookings?${params}`
    );

    return response.bookings.map((b) => this.mapBooking(b));
  }

  async confirmBooking(
    bookingId: string
  ): Promise<{ success: boolean; confirmationCode?: string }> {
    try {
      const response = await this.request<{ confirmationCode: string }>(
        `/bookings/${bookingId}/confirm`,
        { method: "POST" }
      );
      return { success: true, confirmationCode: response.confirmationCode };
    } catch (error) {
      return { success: false };
    }
  }

  async cancelBooking(
    bookingId: string,
    reason?: string
  ): Promise<{ success: boolean; refundAmount?: number }> {
    try {
      const response = await this.request<{ refundAmount: number }>(
        `/bookings/${bookingId}/cancel`,
        {
          method: "POST",
          body: JSON.stringify({ cancellationReason: reason || "Customer request" }),
        }
      );
      return { success: true, refundAmount: response.refundAmount };
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
          title: updates.name,
          description: updates.description,
          ...(updates.pricing && {
            pricing: {
              adultPrice: updates.pricing.adult,
              childPrice: updates.pricing.child,
              currency: updates.pricing.currency,
            },
          }),
          duration: updates.duration,
          maxGroupSize: updates.maxCapacity,
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

  private mapProduct(viatorProduct: ViatorProduct): OTAProduct {
    return {
      id: viatorProduct.productCode,
      code: viatorProduct.productCode,
      name: viatorProduct.title,
      description: viatorProduct.description,
      category: viatorProduct.productType,
      status: viatorProduct.status === "ACTIVE" ? "active" : "inactive",
      pricing: viatorProduct.pricing
        ? {
            adult: viatorProduct.pricing.adultPrice,
            child: viatorProduct.pricing.childPrice,
            currency: viatorProduct.pricing.currency,
          }
        : undefined,
    };
  }

  private mapBooking(viatorBooking: ViatorBooking): OTABooking {
    const travelerInfo = viatorBooking.travelerInfo;
    const leadTraveler = travelerInfo?.leadTraveler;

    const customer: OTACustomer = {
      firstName: leadTraveler?.firstName || "",
      lastName: leadTraveler?.lastName || "",
      email: leadTraveler?.email || "",
      phone: leadTraveler?.phone,
      country: leadTraveler?.countryCode,
    };

    const guests: OTAGuest[] = (travelerInfo?.travelers || []).map((t: any) => ({
      firstName: t.firstName || "",
      lastName: t.lastName || "",
      type: this.mapAgeBand(t.ageBand),
      age: t.age,
    }));

    return {
      otaBookingId: viatorBooking.bookingRef,
      otaConfirmationCode: viatorBooking.partnerConfirmationCode || viatorBooking.bookingRef,
      provider: "viator",
      productId: viatorBooking.productCode,
      productName: viatorBooking.productTitle || "",
      bookingDate: viatorBooking.travelDate,
      startTime: viatorBooking.startTime || "00:00",
      guestCount: viatorBooking.numTravelers || 1,
      totalPrice: viatorBooking.totalPrice?.amount || 0,
      currency: viatorBooking.totalPrice?.currency || "USD",
      commission: this.calculateCommission(viatorBooking.totalPrice?.amount || 0),
      netPrice: this.calculateNetPrice(viatorBooking.totalPrice?.amount || 0),
      status: this.mapStatus(viatorBooking.status),
      customer,
      guests,
      specialRequests: viatorBooking.specialRequests,
      pickupLocation: viatorBooking.pickup
        ? {
            type: "hotel",
            name: viatorBooking.pickup.hotelName || "",
            address: viatorBooking.pickup.address,
            time: viatorBooking.pickup.pickupTime,
          }
        : undefined,
      bookedAt: viatorBooking.createdAt,
      cancelledAt: viatorBooking.cancelledAt,
      cancellationReason: viatorBooking.cancellationReason,
      rawData: viatorBooking,
    };
  }

  private mapAgeBand(ageBand: string): "adult" | "child" | "infant" | "senior" {
    switch (ageBand?.toUpperCase()) {
      case "INFANT":
        return "infant";
      case "CHILD":
        return "child";
      case "SENIOR":
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
      case "REFUNDED":
        return "refunded";
      default:
        return "pending";
    }
  }

  private calculateCommission(totalPrice: number): number {
    // Viator typically takes 20-30% commission
    const commissionRate = 0.25;
    return totalPrice * commissionRate;
  }

  private calculateNetPrice(totalPrice: number): number {
    return totalPrice - this.calculateCommission(totalPrice);
  }
}

// Viator-specific types
interface ViatorProduct {
  productCode: string;
  title: string;
  description?: string;
  productType?: string;
  status: string;
  pricing?: {
    adultPrice: number;
    childPrice?: number;
    currency: string;
  };
}

interface ViatorBooking {
  bookingRef: string;
  partnerConfirmationCode?: string;
  productCode: string;
  productTitle?: string;
  travelDate: string;
  startTime?: string;
  numTravelers?: number;
  totalPrice?: { amount: number; currency: string };
  status: string;
  travelerInfo?: {
    leadTraveler?: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      countryCode?: string;
    };
    travelers?: any[];
  };
  specialRequests?: string;
  pickup?: {
    hotelName?: string;
    address?: string;
    pickupTime?: string;
  };
  createdAt: string;
  cancelledAt?: string;
  cancellationReason?: string;
}
