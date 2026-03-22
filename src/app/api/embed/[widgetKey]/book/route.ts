import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { nanoid } from "nanoid";
import { resend, FROM_EMAIL, COMPANY_NAME, APP_URL } from "@/lib/email/resend";
import { BookingConfirmationEmail } from "@/lib/email/templates/booking-confirmation";

function generateBookingReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = nanoid(4).toUpperCase();
  return `BK${timestamp}${random}`;
}

// POST: Create a booking from widget
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ widgetKey: string }> }
) {
  try {
    const { widgetKey } = await params;
    const body = await request.json();

    const {
      availability_id,
      customer,
      guests,
      notes,
    } = body;

    if (!availability_id || !customer || !guests || !guests.length) {
      return NextResponse.json(
        { error: "availability_id, customer, and guests are required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Verify widget exists and is active
    const { data: widget } = await adminClient
      .from("widgets")
      .select("id, tour_ids")
      .eq("widget_key", widgetKey)
      .eq("is_active", true)
      .single();

    if (!widget) {
      return NextResponse.json({ error: "Widget not found" }, { status: 404 });
    }

    // Get availability with tour info
    const { data: availability, error: availError } = await adminClient
      .from("availabilities")
      .select(`
        id,
        date,
        start_time,
        booked_count,
        capacity_override,
        price_override,
        status,
        tour_id,
        tours (
          id,
          name,
          max_capacity,
          base_price,
          meeting_point,
          requires_waiver
        )
      `)
      .eq("id", availability_id)
      .single();

    if (availError || !availability) {
      return NextResponse.json({ error: "Availability not found" }, { status: 404 });
    }

    // Check if tour is allowed for this widget
    if (widget.tour_ids && widget.tour_ids.length > 0) {
      if (!widget.tour_ids.includes(availability.tour_id)) {
        return NextResponse.json(
          { error: "Tour not available for this widget" },
          { status: 403 }
        );
      }
    }

    const tourData = availability.tours as any;
    const maxCapacity = availability.capacity_override || tourData?.max_capacity || 10;
    const availableSpots = maxCapacity - availability.booked_count;
    const guestCount = guests.length;

    if (guestCount > availableSpots) {
      return NextResponse.json(
        { error: `Only ${availableSpots} spots available` },
        { status: 400 }
      );
    }

    if (availability.status !== "available") {
      return NextResponse.json(
        { error: "This time slot is no longer available" },
        { status: 400 }
      );
    }

    // Calculate price
    const basePrice = availability.price_override || tourData?.base_price || 0;
    let totalPrice = 0;
    for (const guest of guests) {
      if (guest.type === "child") {
        totalPrice += basePrice * 0.5;
      } else {
        totalPrice += basePrice;
      }
    }

    // Create or get customer
    let customerId: string;

    const { data: existingCustomer } = await adminClient
      .from("customers")
      .select("id")
      .eq("email", customer.email.toLowerCase())
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      await adminClient
        .from("customers")
        .update({
          first_name: customer.first_name,
          last_name: customer.last_name,
          phone: customer.phone,
          country_code: customer.country_code || "+1",
        })
        .eq("id", customerId);
    } else {
      const { data: newCustomer, error: customerError } = await adminClient
        .from("customers")
        .insert([{
          email: customer.email.toLowerCase(),
          first_name: customer.first_name,
          last_name: customer.last_name,
          phone: customer.phone,
          country_code: customer.country_code || "+1",
        }])
        .select()
        .single();

      if (customerError) {
        return NextResponse.json({ error: customerError.message }, { status: 500 });
      }
      customerId = newCustomer.id;
    }

    // Create booking
    const bookingReference = generateBookingReference();
    const { data: booking, error: bookingError } = await adminClient
      .from("bookings")
      .insert([{
        booking_reference: bookingReference,
        customer_id: customerId,
        availability_id,
        guest_count: guestCount,
        total_price: totalPrice,
        notes,
        status: "pending",
        payment_status: "pending",
        widget_id: widget.id,
      }])
      .select()
      .single();

    if (bookingError) {
      return NextResponse.json({ error: bookingError.message }, { status: 500 });
    }

    // Create booking guests
    const guestRecords = guests.map((guest: any, index: number) => ({
      booking_id: booking.id,
      first_name: guest.first_name,
      last_name: guest.last_name,
      email: guest.email || null,
      is_primary: index === 0,
    }));

    const { data: createdGuests, error: guestsError } = await adminClient
      .from("booking_guests")
      .insert(guestRecords)
      .select();

    if (guestsError) {
      return NextResponse.json({ error: guestsError.message }, { status: 500 });
    }

    // Create waivers if required
    if (tourData?.requires_waiver && createdGuests) {
      const { data: tourWaivers } = await adminClient
        .from("tour_waivers")
        .select("waiver_template_id")
        .eq("tour_id", tourData.id);

      let waiverTemplateIds: string[] = [];

      if (tourWaivers && tourWaivers.length > 0) {
        waiverTemplateIds = tourWaivers.map((tw: any) => tw.waiver_template_id);
      } else {
        const { data: activeWaiver } = await adminClient
          .from("waiver_templates")
          .select("id")
          .eq("is_active", true)
          .limit(1)
          .single();

        if (activeWaiver) {
          waiverTemplateIds = [activeWaiver.id];
        }
      }

      if (waiverTemplateIds.length > 0) {
        const waiverRecords = createdGuests.flatMap((guest: any) =>
          waiverTemplateIds.map((templateId) => ({
            booking_id: booking.id,
            guest_id: guest.id,
            waiver_template_id: templateId,
            status: "pending",
          }))
        );

        await adminClient.from("waivers").insert(waiverRecords);
      }
    }

    // Update availability booked count
    const newBookedCount = availability.booked_count + guestCount;
    await adminClient
      .from("availabilities")
      .update({
        booked_count: newBookedCount,
        status: newBookedCount >= maxCapacity ? "full" : "available",
      })
      .eq("id", availability_id);

    // Track booking event
    await adminClient
      .from("widget_analytics")
      .insert({
        widget_id: widget.id,
        event_type: "booking_completed",
        referrer: request.headers.get("referer") || null,
        user_agent: request.headers.get("user-agent") || null,
      });

    // Send confirmation email
    try {
      const waiverUrl = `${APP_URL}/waiver/${booking.booking_reference}`;
      const bookingUrl = `${APP_URL}/booking/${booking.booking_reference}`;

      await resend.emails.send({
        from: `${COMPANY_NAME} <${FROM_EMAIL}>`,
        to: [customer.email],
        subject: `Booking Confirmed! ${tourData?.name || 'Your Tour'} - ${booking.booking_reference}`,
        react: BookingConfirmationEmail({
          customerName: `${customer.first_name} ${customer.last_name}`,
          bookingReference: booking.booking_reference,
          tourName: tourData?.name || 'Your Tour',
          tourDate: availability.date,
          tourTime: availability.start_time?.slice(0, 5) || '',
          guestCount,
          totalAmount: totalPrice,
          meetingPoint: tourData?.meeting_point || '',
          waiverUrl,
          bookingUrl,
          companyName: COMPANY_NAME,
        }),
      });
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
    }

    return NextResponse.json({
      booking_reference: booking.booking_reference,
      booking_id: booking.id,
      total_price: totalPrice,
      message: "Booking created successfully",
    }, { status: 201 });
  } catch (error) {
    console.error("Widget booking error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
