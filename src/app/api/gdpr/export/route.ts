import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

/**
 * GDPR Data Export API
 * Allows customers to request a full export of their personal data
 */

const exportRequestSchema = z.object({
  email: z.string().email("Valid email required"),
  // For verification, we could add additional checks
  booking_reference: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = exportRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, booking_reference } = validation.data;
    const supabase = await createClient();

    // Find customer by email
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("*")
      .eq("email", email.toLowerCase())
      .single();

    if (customerError || !customer) {
      // Don't reveal if email exists or not for privacy
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, the data export will be processed.",
      });
    }

    // If booking reference provided, verify it belongs to this customer
    if (booking_reference) {
      const { data: booking } = await supabase
        .from("bookings")
        .select("id")
        .eq("booking_reference", booking_reference)
        .eq("customer_id", customer.id)
        .single();

      if (!booking) {
        return NextResponse.json(
          { error: "Booking reference does not match this email" },
          { status: 400 }
        );
      }
    }

    // Collect all customer data
    const exportData = await collectCustomerData(supabase, customer.id);

    // Return as downloadable JSON
    const response = NextResponse.json({
      export_date: new Date().toISOString(),
      data_subject: {
        email: customer.email,
        name: `${customer.first_name} ${customer.last_name}`,
      },
      exported_data: exportData,
      data_retention_policy: "Personal data is retained for 7 years for legal compliance, then anonymized or deleted.",
      your_rights: {
        access: "You have received this data export.",
        rectification: "Contact us to correct any inaccurate data.",
        erasure: "Request data deletion at privacy@tourpilot.com",
        portability: "This export is in a machine-readable format.",
        objection: "Contact us to object to specific processing activities.",
      },
    });

    // Set headers for download
    response.headers.set("Content-Disposition", `attachment; filename="gdpr-export-${Date.now()}.json"`);

    return response;
  } catch (error: any) {
    console.error("GDPR export error:", error);
    return NextResponse.json(
      { error: "Failed to process export request" },
      { status: 500 }
    );
  }
}

async function collectCustomerData(supabase: any, customerId: string) {
  // Collect all data related to this customer

  // 1. Customer profile
  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .single();

  // 2. All bookings
  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      id, booking_reference, guest_count, total_price, status, payment_status,
      checked_in, notes, created_at, updated_at,
      availability:availabilities(
        date, start_time, end_time,
        tour:tours(name, location)
      )
    `)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  // 3. All guests registered under their bookings
  const bookingIds = bookings?.map((b: any) => b.id) || [];
  let guests: any[] = [];
  if (bookingIds.length > 0) {
    const { data: guestData } = await supabase
      .from("booking_guests")
      .select("*")
      .in("booking_id", bookingIds);
    guests = guestData || [];
  }

  // 4. All waivers
  let waivers: any[] = [];
  if (bookingIds.length > 0) {
    const { data: waiverData } = await supabase
      .from("waivers")
      .select("id, status, signed_at, ip_address, created_at")
      .in("booking_id", bookingIds);
    waivers = waiverData || [];
  }

  // 5. Communications sent
  const { data: communications } = await supabase
    .from("communications")
    .select("type, template_type, subject, status, sent_at, created_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  // 6. Reviews submitted
  const { data: reviews } = await supabase
    .from("reviews")
    .select("rating, title, content, status, created_at, updated_at")
    .eq("customer_id", customerId);

  // 7. Conversations/messages (if inbox feature is used)
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, channel, status, created_at")
    .eq("customer_id", customerId);

  let messages: any[] = [];
  if (conversations && conversations.length > 0) {
    const conversationIds = conversations.map((c: any) => c.id);
    const { data: messageData } = await supabase
      .from("messages")
      .select("direction, content, sent_at, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: true });
    messages = messageData || [];
  }

  // Anonymize sensitive fields but keep structure
  return {
    profile: {
      email: customer?.email,
      first_name: customer?.first_name,
      last_name: customer?.last_name,
      phone: customer?.phone ? "***redacted***" : null,
      country_code: customer?.country_code,
      tags: customer?.tags,
      total_bookings: customer?.total_bookings,
      total_spent: customer?.total_spent,
      created_at: customer?.created_at,
    },
    bookings: bookings?.map((b: any) => ({
      reference: b.booking_reference,
      tour: b.availability?.tour?.name,
      location: b.availability?.tour?.location,
      date: b.availability?.date,
      time: b.availability?.start_time,
      guests: b.guest_count,
      total: b.total_price,
      status: b.status,
      payment_status: b.payment_status,
      checked_in: b.checked_in,
      created_at: b.created_at,
    })) || [],
    guests: guests.map((g: any) => ({
      first_name: g.first_name,
      last_name: g.last_name,
      email: g.email,
      checked_in: g.checked_in,
    })),
    waivers: waivers.map((w: any) => ({
      status: w.status,
      signed_at: w.signed_at,
      ip_address: w.ip_address ? "***redacted***" : null,
    })),
    communications: communications || [],
    reviews: reviews || [],
    conversations: conversations?.length || 0,
    messages_count: messages.length,
  };
}
