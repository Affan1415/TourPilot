/**
 * OTA (Online Travel Agency) Integration Types
 * Shared types for Viator, GetYourGuide, Airbnb Experiences, TripAdvisor
 */

export type OTAProvider = "viator" | "getyourguide" | "airbnb" | "tripadvisor";

export interface OTAConfig {
  provider: OTAProvider;
  apiKey: string;
  apiSecret?: string;
  accessToken?: string;
  supplierId?: string;
  environment: "sandbox" | "production";
  webhookSecret?: string;
}

export interface OTAConnection {
  id: string;
  locationId: string;
  provider: OTAProvider;
  supplierId: string;
  supplierName?: string;
  isActive: boolean;
  lastSyncAt?: string;
  syncStatus: "idle" | "syncing" | "error";
  syncError?: string;
  credentials: OTACredentials;
  settings: OTAConnectionSettings;
  createdAt: string;
  updatedAt: string;
}

export interface OTACredentials {
  apiKey: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
}

export interface OTAConnectionSettings {
  autoSync: boolean;
  syncInterval: number; // minutes
  priceMarkup: number; // percentage
  autoAcceptBookings: boolean;
  syncAvailability: boolean;
  syncPricing: boolean;
}

// Product/Tour mapping
export interface OTAProductMapping {
  id: string;
  connectionId: string;
  tourId: string;
  otaProductId: string;
  otaProductCode?: string;
  otaProductName: string;
  status: "active" | "inactive" | "pending";
  lastSyncAt?: string;
  syncError?: string;
}

// Standardized availability format
export interface OTAAvailability {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime?: string;
  spotsAvailable: number;
  price: number;
  currency: string;
  productOptionId?: string;
}

// Standardized booking format (normalized across OTAs)
export interface OTABooking {
  otaBookingId: string;
  otaConfirmationCode: string;
  provider: OTAProvider;
  productId: string;
  productName: string;
  bookingDate: string;
  startTime: string;
  guestCount: number;
  totalPrice: number;
  currency: string;
  commission: number;
  netPrice: number;
  status: OTABookingStatus;
  customer: OTACustomer;
  guests: OTAGuest[];
  specialRequests?: string;
  pickupLocation?: OTAPickup;
  bookedAt: string;
  cancelledAt?: string;
  cancellationReason?: string;
  rawData: Record<string, any>;
}

export type OTABookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show"
  | "refunded";

export interface OTACustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country?: string;
  language?: string;
}

export interface OTAGuest {
  firstName: string;
  lastName: string;
  type: "adult" | "child" | "infant" | "senior";
  age?: number;
}

export interface OTAPickup {
  type: "hotel" | "airport" | "location";
  name: string;
  address?: string;
  time?: string;
  notes?: string;
}

// Webhook events
export type OTAWebhookEvent =
  | "booking.created"
  | "booking.confirmed"
  | "booking.cancelled"
  | "booking.modified"
  | "booking.completed"
  | "availability.requested"
  | "product.updated";

export interface OTAWebhookPayload {
  event: OTAWebhookEvent;
  provider: OTAProvider;
  timestamp: string;
  data: OTABooking | OTAAvailability[] | any;
  signature?: string;
}

// API response wrappers
export interface OTASyncResult {
  success: boolean;
  provider: OTAProvider;
  syncedCount: number;
  errorCount: number;
  errors: OTASyncError[];
  syncedAt: string;
}

export interface OTASyncError {
  type: "availability" | "booking" | "product";
  itemId: string;
  error: string;
  recoverable: boolean;
}

// Commission tracking
export interface OTACommission {
  provider: OTAProvider;
  bookingId: string;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
  currency: string;
  settlementStatus: "pending" | "settled" | "disputed";
  settlementDate?: string;
}
