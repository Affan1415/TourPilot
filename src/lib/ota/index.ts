/**
 * OTA (Online Travel Agency) Integration Module
 * Unified interface for Viator, GetYourGuide, Airbnb Experiences
 */

import { ViatorClient } from "./viator-client";
import { GetYourGuideClient } from "./getyourguide-client";
import { AirbnbClient } from "./airbnb-client";
import { TripAdvisorClient } from "./tripadvisor-client";
import { BaseOTAClient } from "./base-client";
import type { OTAProvider, OTAConfig, OTAConnection, OTABooking, OTASyncResult } from "./types";

export * from "./types";
export * from "./base-client";
export { ViatorClient } from "./viator-client";
export { GetYourGuideClient } from "./getyourguide-client";
export { AirbnbClient } from "./airbnb-client";
export { TripAdvisorClient } from "./tripadvisor-client";

/**
 * Create an OTA client based on provider type
 */
export function createOTAClient(config: OTAConfig): BaseOTAClient {
  switch (config.provider) {
    case "viator":
      return new ViatorClient(config);
    case "getyourguide":
      return new GetYourGuideClient(config);
    case "airbnb":
      return new AirbnbClient(config);
    case "tripadvisor":
      return new TripAdvisorClient(config);
    default:
      throw new Error(`Unsupported OTA provider: ${config.provider}`);
  }
}

/**
 * OTA Manager - handles multiple connections
 */
export class OTAManager {
  private clients: Map<string, BaseOTAClient> = new Map();

  /**
   * Register an OTA connection
   */
  registerConnection(connection: OTAConnection): void {
    const config: OTAConfig = {
      provider: connection.provider,
      apiKey: connection.credentials.apiKey,
      apiSecret: connection.credentials.apiSecret,
      supplierId: connection.supplierId,
      environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
    };

    const client = createOTAClient(config);
    this.clients.set(connection.id, client);
  }

  /**
   * Get client for a connection
   */
  getClient(connectionId: string): BaseOTAClient | undefined {
    return this.clients.get(connectionId);
  }

  /**
   * Remove a connection
   */
  removeConnection(connectionId: string): void {
    this.clients.delete(connectionId);
  }

  /**
   * Sync all connections
   */
  async syncAll(): Promise<Map<string, OTASyncResult>> {
    const results = new Map<string, OTASyncResult>();

    for (const [connectionId, client] of this.clients.entries()) {
      try {
        // Fetch bookings for each connection
        const bookings = await client.fetchBookings();
        results.set(connectionId, {
          success: true,
          provider: client.provider,
          syncedCount: bookings.length,
          errorCount: 0,
          errors: [],
          syncedAt: new Date().toISOString(),
        });
      } catch (error) {
        results.set(connectionId, {
          success: false,
          provider: client.provider,
          syncedCount: 0,
          errorCount: 1,
          errors: [
            {
              type: "booking",
              itemId: connectionId,
              error: String(error),
              recoverable: true,
            },
          ],
          syncedAt: new Date().toISOString(),
        });
      }
    }

    return results;
  }
}

// Singleton manager instance
let managerInstance: OTAManager | null = null;

export function getOTAManager(): OTAManager {
  if (!managerInstance) {
    managerInstance = new OTAManager();
  }
  return managerInstance;
}

/**
 * Normalize OTA booking to internal booking format
 */
export function normalizeOTABooking(otaBooking: OTABooking) {
  return {
    // Maps to internal booking structure
    externalReference: otaBooking.otaBookingId,
    source: `ota_${otaBooking.provider}`,
    guestCount: otaBooking.guestCount,
    totalAmount: otaBooking.totalPrice,
    currency: otaBooking.currency,
    status: mapOTAStatusToInternal(otaBooking.status),
    customer: {
      firstName: otaBooking.customer.firstName,
      lastName: otaBooking.customer.lastName,
      email: otaBooking.customer.email,
      phone: otaBooking.customer.phone,
    },
    guests: otaBooking.guests.map((g) => ({
      firstName: g.firstName,
      lastName: g.lastName,
      guestType: g.type,
      age: g.age,
    })),
    notes: otaBooking.specialRequests,
    metadata: {
      otaProvider: otaBooking.provider,
      otaBookingId: otaBooking.otaBookingId,
      otaConfirmationCode: otaBooking.otaConfirmationCode,
      commission: otaBooking.commission,
      netPrice: otaBooking.netPrice,
    },
  };
}

function mapOTAStatusToInternal(otaStatus: OTABooking["status"]): string {
  switch (otaStatus) {
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
    case "refunded":
      return "cancelled";
    default:
      return "pending";
  }
}
