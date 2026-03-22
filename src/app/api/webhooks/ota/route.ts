import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createOTAClient } from "@/lib/ota";
import type { OTAProvider, OTAConfig, OTAWebhookEvent } from "@/lib/ota";

// Initialize Supabase with service role for webhook processing
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Receive OTA webhook notifications
export async function POST(request: NextRequest) {
  try {
    const provider = request.headers.get("x-ota-provider") as OTAProvider;
    const signature = request.headers.get("x-webhook-signature") || "";
    const rawBody = await request.text();

    // Log webhook for debugging
    await supabase.from("webhook_events").insert({
      channel: `ota_${provider}`,
      event_type: "webhook",
      payload: JSON.parse(rawBody),
      processed: false,
    });

    // Find connection and verify signature
    const { data: connection } = await supabase
      .from("ota_connections")
      .select("*")
      .eq("provider", provider)
      .eq("is_active", true)
      .single();

    if (!connection) {
      console.warn(`No active ${provider} connection found`);
      return NextResponse.json({ received: true });
    }

    // Verify webhook signature
    const config: OTAConfig = {
      provider: connection.provider,
      apiKey: connection.credentials.api_key,
      apiSecret: connection.credentials.api_secret,
      supplierId: connection.supplier_id,
      environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
      webhookSecret: connection.credentials.webhook_secret,
    };

    const client = createOTAClient(config);

    if (connection.credentials.webhook_secret) {
      const isValid = client.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.error("Invalid webhook signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    // Parse and process webhook
    const payload = JSON.parse(rawBody);
    await processWebhook(connection, payload);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("OTA webhook error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function processWebhook(connection: any, payload: any) {
  const event = detectEvent(connection.provider, payload);

  switch (event) {
    case "booking.created":
    case "booking.confirmed":
      await handleNewBooking(connection, payload);
      break;

    case "booking.cancelled":
      await handleCancelledBooking(connection, payload);
      break;

    case "booking.modified":
      await handleModifiedBooking(connection, payload);
      break;

    case "availability.requested":
      await handleAvailabilityRequest(connection, payload);
      break;

    default:
      console.log(`Unhandled OTA event: ${event}`);
  }
}

function detectEvent(provider: OTAProvider, payload: any): OTAWebhookEvent {
  // Each OTA has different event formats
  switch (provider) {
    case "viator":
      return payload.eventType || "booking.created";

    case "getyourguide":
      return payload.event || "booking.created";

    case "airbnb":
      if (payload.reservation_status === "accepted") return "booking.confirmed";
      if (payload.reservation_status === "cancelled") return "booking.cancelled";
      return "booking.created";

    default:
      return "booking.created";
  }
}

async function handleNewBooking(connection: any, payload: any) {
  // Extract booking ID based on provider
  let otaBookingId: string;
  let otaProductId: string;

  switch (connection.provider) {
    case "viator":
      otaBookingId = payload.bookingRef;
      otaProductId = payload.productCode;
      break;
    case "getyourguide":
      otaBookingId = payload.booking_id?.toString();
      otaProductId = payload.tour_id?.toString();
      break;
    case "airbnb":
      otaBookingId = payload.confirmation_code;
      otaProductId = payload.listing_id?.toString();
      break;
    default:
      return;
  }

  // Check if already processed
  const { data: existing } = await supabase
    .from("bookings")
    .select("id")
    .eq("external_reference", otaBookingId)
    .single();

  if (existing) {
    console.log(`Booking ${otaBookingId} already exists`);
    return;
  }

  // Get product mapping
  const { data: mapping } = await supabase
    .from("ota_product_mappings")
    .select("tour_id")
    .eq("connection_id", connection.id)
    .eq("ota_product_id", otaProductId)
    .single();

  if (!mapping) {
    console.error(`No mapping found for OTA product ${otaProductId}`);
    return;
  }

  // Create booking (simplified - would need full sync for complete data)
  const referenceNumber = `OTA-${connection.provider.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  await supabase.from("bookings").insert({
    reference_number: referenceNumber,
    source: `ota_${connection.provider}`,
    external_reference: otaBookingId,
    status: "pending",
    payment_status: "pending",
    metadata: {
      ota_provider: connection.provider,
      needs_full_sync: true,
      webhook_payload: payload,
    },
  });

  // Trigger full sync to get complete booking details
  await supabase.from("ota_connections").update({
    sync_status: "needs_sync",
  }).eq("id", connection.id);
}

async function handleCancelledBooking(connection: any, payload: any) {
  let otaBookingId: string;

  switch (connection.provider) {
    case "viator":
      otaBookingId = payload.bookingRef;
      break;
    case "getyourguide":
      otaBookingId = payload.booking_id?.toString();
      break;
    case "airbnb":
      otaBookingId = payload.confirmation_code;
      break;
    default:
      return;
  }

  // Update booking status
  await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: payload.cancellation_reason || "Cancelled via OTA",
    })
    .eq("external_reference", otaBookingId)
    .eq("source", `ota_${connection.provider}`);

  // Restore availability
  const { data: booking } = await supabase
    .from("bookings")
    .select("availability_id, guest_count")
    .eq("external_reference", otaBookingId)
    .single();

  if (booking?.availability_id) {
    await supabase.rpc("restore_availability_spots", {
      p_availability_id: booking.availability_id,
      p_spots: booking.guest_count,
    });
  }
}

async function handleModifiedBooking(connection: any, payload: any) {
  // Mark booking as needing sync
  let otaBookingId: string;

  switch (connection.provider) {
    case "viator":
      otaBookingId = payload.bookingRef;
      break;
    case "getyourguide":
      otaBookingId = payload.booking_id?.toString();
      break;
    case "airbnb":
      otaBookingId = payload.confirmation_code;
      break;
    default:
      return;
  }

  // Get current metadata and update
  const { data: booking } = await supabase
    .from("bookings")
    .select("metadata")
    .eq("external_reference", otaBookingId)
    .single();

  await supabase
    .from("bookings")
    .update({
      metadata: { ...(booking?.metadata || {}), needs_full_sync: true },
    })
    .eq("external_reference", otaBookingId);

  // Trigger sync
  await supabase.from("ota_connections").update({
    sync_status: "needs_sync",
  }).eq("id", connection.id);
}

async function handleAvailabilityRequest(connection: any, payload: any) {
  // Some OTAs request real-time availability checks
  // This would trigger an immediate availability push
  console.log("Availability request received:", payload);
}
