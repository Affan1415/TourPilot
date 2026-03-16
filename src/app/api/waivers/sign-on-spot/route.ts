import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Verify the captain is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is a captain
    const { data: staffData } = await adminClient
      .from("staff")
      .select("id, role")
      .eq("user_id", user.id)
      .single();

    if (!staffData || !["captain", "admin", "manager"].includes(staffData.role)) {
      return NextResponse.json({ error: "Unauthorized - Must be a captain" }, { status: 403 });
    }

    const body = await request.json();
    const { guestId, bookingId, signatureDataUrl } = body;

    if (!guestId || !bookingId || !signatureDataUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get guest and booking info
    const { data: guest } = await adminClient
      .from("booking_guests")
      .select("id, first_name, last_name, booking_id")
      .eq("id", guestId)
      .single();

    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    // Get booking to find tour and waiver template
    const { data: booking } = await adminClient
      .from("bookings")
      .select(`
        id,
        availability:availabilities!inner (
          tour:tours!inner (
            id,
            requires_waiver
          )
        )
      `)
      .eq("id", bookingId)
      .single();

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Get active waiver template
    const { data: template } = await adminClient
      .from("waiver_templates")
      .select("id")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!template) {
      return NextResponse.json({ error: "No waiver template found" }, { status: 404 });
    }

    // Upload signature to storage
    const signatureBuffer = Buffer.from(
      signatureDataUrl.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );

    const fileName = `signatures/onspot_${guestId}_${Date.now()}.png`;

    const { error: uploadError } = await adminClient.storage
      .from("waivers")
      .upload(fileName, signatureBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      // Continue without storage - store signature inline
    }

    // Get public URL if upload succeeded
    let signatureUrl = signatureDataUrl; // Fallback to data URL
    if (!uploadError) {
      const { data: urlData } = adminClient.storage
        .from("waivers")
        .getPublicUrl(fileName);
      signatureUrl = urlData.publicUrl;
    }

    // Check if waiver already exists for this guest
    const { data: existingWaiver } = await adminClient
      .from("waivers")
      .select("id")
      .eq("guest_id", guestId)
      .eq("booking_id", bookingId)
      .single();

    if (existingWaiver) {
      // Update existing waiver
      const { error: updateError } = await adminClient
        .from("waivers")
        .update({
          signature_url: signatureUrl,
          signed_at: new Date().toISOString(),
          status: "signed",
          ip_address: request.headers.get("x-forwarded-for") || "on-spot",
        })
        .eq("id", existingWaiver.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      // Create new waiver record
      const { error: insertError } = await adminClient
        .from("waivers")
        .insert({
          booking_id: bookingId,
          guest_id: guestId,
          waiver_template_id: template.id,
          signature_url: signatureUrl,
          signed_at: new Date().toISOString(),
          status: "signed",
          ip_address: request.headers.get("x-forwarded-for") || "on-spot",
        });

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    // Update template signed count
    await adminClient.rpc("increment_waiver_signed_count", {
      template_id: template.id,
    });

    return NextResponse.json({
      success: true,
      message: "Waiver signed successfully"
    });
  } catch (error) {
    console.error("On-spot waiver signing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
