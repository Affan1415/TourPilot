import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { nanoid } from "nanoid";
import { resend, FROM_EMAIL, COMPANY_NAME, APP_URL } from "@/lib/email/resend";
import { BookingConfirmationEmail } from "@/lib/email/templates/booking-confirmation";

function generateBookingReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = nanoid(4).toUpperCase();
  return `BK${timestamp}${random}`;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get("date");
    const status = searchParams.get("status");
    const tourId = searchParams.get("tour_id");

    let query = supabase
      .from("bookings")
      .select(`
        *,
        customer:customers(*),
        availability:availabilities(
          *,
          tour:tours(*)
        ),
        guests:booking_guests(*),
        waivers(*)
      `)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter by date if provided
    let filteredData = data;
    if (date) {
      filteredData = data?.filter(
        (booking: any) => booking.availability?.date === date
      );
    }

    // Filter by tour if provided
    if (tourId) {
      filteredData = filteredData?.filter(
        (booking: any) => booking.availability?.tour_id === tourId
      );
    }

    return NextResponse.json({ data: filteredData });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const body = await request.json();

    const { customer, availability_id, guest_count, guests, notes, total_price } = body;

    // 1. Create or get customer
    let customerId: string;

    const { data: existingCustomer } = await adminClient
      .from("customers")
      .select("id")
      .eq("email", customer.email)
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      // Update customer info
      await adminClient
        .from("customers")
        .update({
          first_name: customer.first_name,
          last_name: customer.last_name,
          phone: customer.phone,
          country_code: customer.country_code,
        })
        .eq("id", customerId);
    } else {
      const { data: newCustomer, error: customerError } = await adminClient
        .from("customers")
        .insert([customer])
        .select()
        .single();

      if (customerError) {
        return NextResponse.json({ error: customerError.message }, { status: 500 });
      }
      customerId = newCustomer.id;
    }

    // 2. Get availability to check capacity and update booked_count
    const { data: availability, error: availabilityError } = await adminClient
      .from("availabilities")
      .select(`
        id,
        date,
        start_time,
        booked_count,
        capacity_override,
        status,
        tours (
          name,
          max_capacity,
          meeting_point,
          requires_waiver
        )
      `)
      .eq("id", availability_id)
      .single();

    if (availabilityError || !availability) {
      return NextResponse.json({ error: "Availability not found" }, { status: 404 });
    }

    // tours is a single object when using a foreign key relationship
    const tourData = availability.tours as unknown as {
      name: string;
      max_capacity: number;
      meeting_point: string;
      requires_waiver: boolean;
    } | null;
    const maxCapacity = availability.capacity_override || tourData?.max_capacity || 10;
    const availableSpots = maxCapacity - availability.booked_count;

    if (guest_count > availableSpots) {
      return NextResponse.json({ error: `Only ${availableSpots} spots available` }, { status: 400 });
    }

    if (availability.status !== "available") {
      return NextResponse.json({ error: "This time slot is no longer available" }, { status: 400 });
    }

    // 3. Create booking
    const bookingReference = generateBookingReference();
    const { data: booking, error: bookingError } = await adminClient
      .from("bookings")
      .insert([{
        booking_reference: bookingReference,
        customer_id: customerId,
        availability_id,
        guest_count,
        total_price,
        notes,
        status: "confirmed",
        payment_status: "paid",
      }])
      .select()
      .single();

    if (bookingError) {
      return NextResponse.json({ error: bookingError.message }, { status: 500 });
    }

    // 4. Create booking guests
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

    // 5. Create waivers for each guest (if tour requires waivers)
    if (tourData?.requires_waiver) {
      const { data: activeWaiver } = await adminClient
        .from("waiver_templates")
        .select("id")
        .eq("is_active", true)
        .single();

      if (activeWaiver && createdGuests) {
        const waiverRecords = createdGuests.map((guest: any) => ({
          booking_id: booking.id,
          guest_id: guest.id,
          waiver_template_id: activeWaiver.id,
          status: "pending",
        }));

        await adminClient.from("waivers").insert(waiverRecords);
      }
    }

    // 6. Update availability booked count
    const newBookedCount = availability.booked_count + guest_count;
    await adminClient
      .from("availabilities")
      .update({
        booked_count: newBookedCount,
        status: newBookedCount >= maxCapacity ? "full" : "available",
      })
      .eq("id", availability_id);

    // 7. Send confirmation email
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
          guestCount: guest_count,
          totalAmount: total_price,
          meetingPoint: tourData?.meeting_point || '',
          waiverUrl,
          bookingUrl,
          companyName: COMPANY_NAME,
        }),
      });
    } catch (emailError) {
      // Log but don't fail the booking if email fails
      console.error("Failed to send confirmation email:", emailError);
    }

    return NextResponse.json({
      data: {
        ...booking,
        guests: createdGuests,
      },
      booking_reference: booking.booking_reference,
    }, { status: 201 });
  } catch (error) {
    console.error("Booking creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
