import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireStaff, forbiddenResponse } from "@/lib/auth/api-auth";
import { createOTAClient } from "@/lib/ota";
import { z } from "zod";

const createConnectionSchema = z.object({
  provider: z.enum(["viator", "getyourguide", "airbnb"]),
  supplier_id: z.string().min(1),
  supplier_name: z.string().optional(),
  api_key: z.string().min(1),
  api_secret: z.string().optional(),
  settings: z
    .object({
      auto_sync: z.boolean().default(true),
      sync_interval: z.number().min(5).max(1440).default(60),
      price_markup: z.number().min(0).max(100).default(0),
      auto_accept_bookings: z.boolean().default(false),
      sync_availability: z.boolean().default(true),
      sync_pricing: z.boolean().default(true),
    })
    .optional(),
});

// GET - List OTA connections
export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaff();
    const supabase = await createClient();

    let query = supabase
      .from("ota_connections")
      .select("*, location:locations(id, name)")
      .order("created_at", { ascending: false });

    // Filter by location for non-admins
    if (auth.role !== "admin" && auth.locationId) {
      query = query.eq("location_id", auth.locationId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Remove sensitive credentials from response
    const sanitized = data?.map((conn) => ({
      ...conn,
      credentials: {
        api_key: conn.credentials?.api_key ? "***" + conn.credentials.api_key.slice(-4) : null,
        has_secret: !!conn.credentials?.api_secret,
      },
    }));

    return NextResponse.json({ data: sanitized });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized") || error.message?.includes("permission")) {
      return forbiddenResponse(error.message);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create new OTA connection
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    const supabase = await createClient();
    const body = await request.json();

    const validation = createConnectionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { provider, supplier_id, supplier_name, api_key, api_secret, settings } = validation.data;

    // Test the connection before saving
    const testClient = createOTAClient({
      provider,
      apiKey: api_key,
      apiSecret: api_secret,
      supplierId: supplier_id,
      environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
    });

    const testResult = await testClient.testConnection();
    if (!testResult.success) {
      return NextResponse.json(
        { error: "Connection test failed", details: testResult.message },
        { status: 400 }
      );
    }

    // Create connection record
    const { data, error } = await supabase
      .from("ota_connections")
      .insert({
        location_id: auth.locationId,
        provider,
        supplier_id,
        supplier_name,
        is_active: true,
        sync_status: "idle",
        credentials: {
          api_key,
          api_secret,
        },
        settings: settings || {
          auto_sync: true,
          sync_interval: 60,
          price_markup: 0,
          auto_accept_bookings: false,
          sync_availability: true,
          sync_pricing: true,
        },
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Remove credentials from response
    const sanitized = {
      ...data,
      credentials: {
        api_key: "***" + api_key.slice(-4),
        has_secret: !!api_secret,
      },
    };

    return NextResponse.json({ data: sanitized }, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized") || error.message?.includes("permission")) {
      return forbiddenResponse(error.message);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
