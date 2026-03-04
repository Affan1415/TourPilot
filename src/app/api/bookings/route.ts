import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

    // 2. Create booking
    const { data: booking, error: bookingError } = await adminClient
      .from("bookings")
      .insert([{
        customer_id: customerId,
        availability_id,
        guest_count,
        total_price,
        notes,
        status: "pending",
        payment_status: "pending",
      }])
      .select()
      .single();

    if (bookingError) {
      return NextResponse.json({ error: bookingError.message }, { status: 500 });
    }

    // 3. Create booking guests
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

    // 4. Create waivers for each guest
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

    return NextResponse.json({
      data: {
        ...booking,
        guests: createdGuests,
      }
    }, { status: 201 });
  } catch (error) {
    console.error("Booking creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
