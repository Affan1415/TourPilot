import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const updateConnectionSchema = z.object({
  is_active: z.boolean().optional(),
  settings: z.object({
    auto_sync: z.boolean().optional(),
    sync_interval_minutes: z.number().min(5).max(1440).optional(),
    auto_confirm_bookings: z.boolean().optional(),
  }).optional(),
  credentials: z.object({
    api_key: z.string().optional(),
    api_secret: z.string().optional(),
    webhook_secret: z.string().optional(),
  }).optional(),
});

// GET - Get single connection details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: connection, error } = await supabase
      .from("ota_connections")
      .select(`
        *,
        mappings:ota_product_mappings(count)
      `)
      .eq("id", id)
      .single();

    if (error || !connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    // Get booking stats
    const { count: bookingCount } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("source", `ota_${connection.provider}`);

    // Get revenue
    const { data: revenueData } = await supabase
      .from("bookings")
      .select("total_amount")
      .eq("source", `ota_${connection.provider}`)
      .eq("status", "confirmed");

    const revenue = revenueData?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;

    // Get product mapping count
    const { count: mappingCount } = await supabase
      .from("ota_product_mappings")
      .select("*", { count: "exact", head: true })
      .eq("connection_id", id)
      .eq("is_active", true);

    return NextResponse.json({
      connection: {
        ...connection,
        stats: {
          total_bookings: bookingCount || 0,
          revenue,
          products_linked: mappingCount || 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching connection:", error);
    return NextResponse.json({ error: "Failed to fetch connection" }, { status: 500 });
  }
}

// PATCH - Update connection
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = updateConnectionSchema.parse(body);

    // Get existing connection
    const { data: existing, error: fetchError } = await supabase
      .from("ota_connections")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (validated.is_active !== undefined) {
      updates.is_active = validated.is_active;
    }

    if (validated.settings) {
      updates.settings = {
        ...existing.settings,
        ...validated.settings,
      };
    }

    if (validated.credentials) {
      updates.credentials = {
        ...existing.credentials,
        ...validated.credentials,
      };
    }

    const { data: connection, error } = await supabase
      .from("ota_connections")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating connection:", error);
      return NextResponse.json({ error: "Failed to update connection" }, { status: 500 });
    }

    return NextResponse.json({ connection });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error updating connection:", error);
    return NextResponse.json({ error: "Failed to update connection" }, { status: 500 });
  }
}

// DELETE - Remove connection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First, delete all product mappings
    await supabase
      .from("ota_product_mappings")
      .delete()
      .eq("connection_id", id);

    // Then delete the connection
    const { error } = await supabase
      .from("ota_connections")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting connection:", error);
      return NextResponse.json({ error: "Failed to delete connection" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting connection:", error);
    return NextResponse.json({ error: "Failed to delete connection" }, { status: 500 });
  }
}
