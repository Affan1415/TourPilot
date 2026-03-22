import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, forbiddenResponse } from "@/lib/auth/api-auth";
import { createOTAClient, normalizeOTABooking } from "@/lib/ota";
import type { OTAConfig, OTABooking, OTASyncResult } from "@/lib/ota";

// POST - Trigger sync for OTA connections
export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaff();
    const supabase = await createClient();
    const body = await request.json();

    const { connection_id, sync_type = "bookings" } = body;

    // Get connection(s) to sync
    let query = supabase
      .from("ota_connections")
      .select("*")
      .eq("is_active", true);

    if (connection_id) {
      query = query.eq("id", connection_id);
    }

    if (auth.role !== "admin" && auth.locationId) {
      query = query.eq("location_id", auth.locationId);
    }

    const { data: connections, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!connections || connections.length === 0) {
      return NextResponse.json({ error: "No connections found" }, { status: 404 });
    }

    const results: Array<{
      connectionId: string;
      provider: string;
      result: OTASyncResult;
    }> = [];

    for (const conn of connections) {
      // Update status to syncing
      await supabase
        .from("ota_connections")
        .update({ sync_status: "syncing" })
        .eq("id", conn.id);

      try {
        const config: OTAConfig = {
          provider: conn.provider,
          apiKey: conn.credentials.api_key,
          apiSecret: conn.credentials.api_secret,
          supplierId: conn.supplier_id,
          environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
        };

        const client = createOTAClient(config);

        let syncResult: OTASyncResult;

        if (sync_type === "bookings") {
          // Sync bookings
          const bookings = await client.fetchBookings();
          syncResult = await processOTABookings(supabase, conn, bookings);
        } else if (sync_type === "availability") {
          // Push availability to OTA
          syncResult = await pushAvailabilityToOTA(supabase, conn, client);
        } else {
          throw new Error(`Invalid sync type: ${sync_type}`);
        }

        // Update connection with sync result
        await supabase.from("ota_connections").update({
          sync_status: syncResult.success ? "idle" : "error",
          last_sync_at: new Date().toISOString(),
          sync_error: syncResult.success ? null : syncResult.errors[0]?.error,
        }).eq("id", conn.id);

        results.push({
          connectionId: conn.id,
          provider: conn.provider,
          result: syncResult,
        });
      } catch (error) {
        await supabase.from("ota_connections").update({
          sync_status: "error",
          sync_error: String(error),
        }).eq("id", conn.id);

        results.push({
          connectionId: conn.id,
          provider: conn.provider,
          result: {
            success: false,
            provider: conn.provider,
            syncedCount: 0,
            errorCount: 1,
            errors: [{ type: "booking", itemId: conn.id, error: String(error), recoverable: true }],
            syncedAt: new Date().toISOString(),
          },
        });
      }
    }

    return NextResponse.json({
      success: results.every((r) => r.result.success),
      results,
    });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized") || error.message?.includes("permission")) {
      return forbiddenResponse(error.message);
    }
    console.error("OTA sync error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function processOTABookings(
  supabase: any,
  connection: any,
  otaBookings: OTABooking[]
): Promise<OTASyncResult> {
  const errors: OTASyncResult["errors"] = [];
  let syncedCount = 0;

  for (const otaBooking of otaBookings) {
    try {
      // Check if booking already exists
      const { data: existing } = await supabase
        .from("bookings")
        .select("id")
        .eq("external_reference", otaBooking.otaBookingId)
        .eq("source", `ota_${otaBooking.provider}`)
        .single();

      if (existing) {
        // Update existing booking status if changed
        await supabase
          .from("bookings")
          .update({
            status: mapOTAStatus(otaBooking.status),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        // Find or create customer
        let customerId: string | null = null;

        const { data: existingCustomer } = await supabase
          .from("customers")
          .select("id")
          .eq("email", otaBooking.customer.email)
          .single();

        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          const { data: newCustomer } = await supabase
            .from("customers")
            .insert({
              email: otaBooking.customer.email,
              first_name: otaBooking.customer.firstName,
              last_name: otaBooking.customer.lastName,
              phone: otaBooking.customer.phone,
              country: otaBooking.customer.country,
            })
            .select("id")
            .single();

          customerId = newCustomer?.id;
        }

        // Find product mapping to get tour/availability
        const { data: mapping } = await supabase
          .from("ota_product_mappings")
          .select("tour_id")
          .eq("connection_id", connection.id)
          .eq("ota_product_id", otaBooking.productId)
          .single();

        if (!mapping) {
          errors.push({
            type: "booking",
            itemId: otaBooking.otaBookingId,
            error: `No product mapping found for OTA product ${otaBooking.productId}`,
            recoverable: false,
          });
          continue;
        }

        // Find availability slot
        const { data: availability } = await supabase
          .from("availabilities")
          .select("id")
          .eq("tour_id", mapping.tour_id)
          .eq("date", otaBooking.bookingDate)
          .eq("start_time", otaBooking.startTime)
          .single();

        if (!availability) {
          errors.push({
            type: "booking",
            itemId: otaBooking.otaBookingId,
            error: `No availability found for ${otaBooking.bookingDate} ${otaBooking.startTime}`,
            recoverable: false,
          });
          continue;
        }

        // Create booking
        const normalized = normalizeOTABooking(otaBooking);
        const referenceNumber = `OTA-${otaBooking.provider.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

        await supabase.from("bookings").insert({
          reference_number: referenceNumber,
          customer_id: customerId,
          availability_id: availability.id,
          guest_count: otaBooking.guestCount,
          total_price: otaBooking.totalPrice,
          status: mapOTAStatus(otaBooking.status),
          payment_status: "paid", // OTA bookings are typically prepaid
          source: `ota_${otaBooking.provider}`,
          external_reference: otaBooking.otaBookingId,
          notes: otaBooking.specialRequests,
          metadata: normalized.metadata,
        });
      }

      syncedCount++;
    } catch (error) {
      errors.push({
        type: "booking",
        itemId: otaBooking.otaBookingId,
        error: String(error),
        recoverable: true,
      });
    }
  }

  return {
    success: errors.filter((e) => !e.recoverable).length === 0,
    provider: connection.provider,
    syncedCount,
    errorCount: errors.length,
    errors,
    syncedAt: new Date().toISOString(),
  };
}

async function pushAvailabilityToOTA(
  supabase: any,
  connection: any,
  client: any
): Promise<OTASyncResult> {
  const errors: OTASyncResult["errors"] = [];
  let syncedCount = 0;

  // Get product mappings
  const { data: mappings } = await supabase
    .from("ota_product_mappings")
    .select("*, tour:tours(id, name)")
    .eq("connection_id", connection.id)
    .eq("status", "active");

  if (!mappings || mappings.length === 0) {
    return {
      success: true,
      provider: connection.provider,
      syncedCount: 0,
      errorCount: 0,
      errors: [],
      syncedAt: new Date().toISOString(),
    };
  }

  // Get availability for next 30 days
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  for (const mapping of mappings) {
    try {
      const { data: slots } = await supabase
        .from("availabilities")
        .select("*")
        .eq("tour_id", mapping.tour_id)
        .gte("date", today)
        .lte("date", thirtyDaysLater)
        .eq("status", "available");

      if (!slots || slots.length === 0) continue;

      const availability = slots.map((slot: any) => ({
        date: slot.date,
        startTime: slot.start_time,
        endTime: slot.end_time,
        spotsAvailable: slot.spots_remaining,
        price: slot.price * (1 + (connection.settings?.price_markup || 0) / 100),
        currency: "USD",
      }));

      const result = await client.pushAvailability(mapping.ota_product_id, availability);
      syncedCount += result.syncedCount;
      errors.push(...result.errors);
    } catch (error) {
      errors.push({
        type: "availability",
        itemId: mapping.tour_id,
        error: String(error),
        recoverable: true,
      });
    }
  }

  return {
    success: errors.filter((e) => !e.recoverable).length === 0,
    provider: connection.provider,
    syncedCount,
    errorCount: errors.length,
    errors,
    syncedAt: new Date().toISOString(),
  };
}

function mapOTAStatus(otaStatus: OTABooking["status"]): string {
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
