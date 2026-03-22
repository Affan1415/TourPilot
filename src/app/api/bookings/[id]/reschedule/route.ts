import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, forbiddenResponse } from "@/lib/auth/api-auth";
import { resend, FROM_EMAIL, COMPANY_NAME, APP_URL } from "@/lib/email/resend";

// POST: Reschedule a booking to a new availability
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check staff permission
    try {
      await requireStaff();
    } catch (e: any) {
      return forbiddenResponse(e.message);
    }

    const { id } = await params;
    const body = await request.json();
    const { new_availability_id, notify_customer = true } = body;

    if (!new_availability_id) {
      return NextResponse.json(
        { error: "new_availability_id is required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Get current booking
    const { data: booking, error: bookingError } = await adminClient
      .from("bookings")
      .select(`
        *,
        customer:customers(id, email, first_name, last_name),
        availability:availabilities(
          id,
          date,
          start_time,
          booked_count,
          tour_id,
          tour:tours(name, max_capacity)
        )
      `)
      .eq("id", id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot reschedule a cancelled booking" },
        { status: 400 }
      );
    }

    if (booking.status === "completed" || booking.status === "checked_in") {
      return NextResponse.json(
        { error: "Cannot reschedule a completed or checked-in booking" },
        { status: 400 }
      );
    }

    // Get new availability
    const { data: newAvailability, error: availError } = await adminClient
      .from("availabilities")
      .select(`
        *,
        tour:tours(name, max_capacity, meeting_point)
      `)
      .eq("id", new_availability_id)
      .single();

    if (availError || !newAvailability) {
      return NextResponse.json(
        { error: "New availability not found" },
        { status: 404 }
      );
    }

    // Check if same tour
    const oldTourId = (booking.availability as any)?.tour_id;
    if (newAvailability.tour_id !== oldTourId) {
      return NextResponse.json(
        { error: "Can only reschedule to same tour. For different tours, cancel and create new booking." },
        { status: 400 }
      );
    }

    // Check capacity
    const maxCapacity = newAvailability.capacity_override || (newAvailability.tour as any)?.max_capacity || 10;
    const availableSpots = maxCapacity - newAvailability.booked_count;

    if (booking.guest_count > availableSpots) {
      return NextResponse.json(
        { error: `Only ${availableSpots} spots available for new time slot` },
        { status: 400 }
      );
    }

    if (newAvailability.status !== "available") {
      return NextResponse.json(
        { error: "Selected time slot is not available" },
        { status: 400 }
      );
    }

    // Start transaction-like operations
    const oldAvailabilityId = booking.availability_id;

    // 1. Update booking to new availability
    const { data: updatedBooking, error: updateError } = await adminClient
      .from("bookings")
      .update({
        availability_id: new_availability_id,
        rescheduled_from: oldAvailabilityId,
        rescheduled_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(`
        *,
        customer:customers(*),
        availability:availabilities(
          *,
          tour:tours(*)
        ),
        guests:booking_guests(*)
      `)
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 2. Update old availability booked count (decrease)
    await adminClient
      .from("availabilities")
      .update({
        booked_count: Math.max(0, (booking.availability as any).booked_count - booking.guest_count),
      })
      .eq("id", oldAvailabilityId);

    // 3. Update new availability booked count (increase)
    const newBookedCount = newAvailability.booked_count + booking.guest_count;
    await adminClient
      .from("availabilities")
      .update({
        booked_count: newBookedCount,
        status: newBookedCount >= maxCapacity ? "full" : "available",
      })
      .eq("id", new_availability_id);

    // 4. Send notification email if requested
    if (notify_customer && booking.customer) {
      const customer = booking.customer as any;
      const oldAvail = booking.availability as any;
      const tour = newAvailability.tour as any;

      try {
        await resend.emails.send({
          from: `${COMPANY_NAME} <${FROM_EMAIL}>`,
          to: [customer.email],
          subject: `Your Booking Has Been Rescheduled - ${booking.booking_reference}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Booking Rescheduled</h2>
              <p>Hi ${customer.first_name},</p>
              <p>Your booking for <strong>${tour?.name || 'your tour'}</strong> has been rescheduled.</p>

              <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0;"><strong>Previous Date:</strong> ${oldAvail.date} at ${oldAvail.start_time?.slice(0, 5)}</p>
                <p style="margin: 0;"><strong>New Date:</strong> ${newAvailability.date} at ${newAvailability.start_time?.slice(0, 5)}</p>
              </div>

              <p><strong>Booking Reference:</strong> ${booking.booking_reference}</p>
              <p><strong>Guests:</strong> ${booking.guest_count}</p>
              ${tour?.meeting_point ? `<p><strong>Meeting Point:</strong> ${tour.meeting_point}</p>` : ''}

              <p style="margin-top: 24px;">
                <a href="${APP_URL}/booking/${booking.booking_reference}"
                   style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                  View Booking Details
                </a>
              </p>

              <p style="margin-top: 24px; color: #666;">
                If you have any questions, please contact us.
              </p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send reschedule email:", emailError);
      }
    }

    return NextResponse.json({
      data: updatedBooking,
      message: "Booking rescheduled successfully",
      old_date: (booking.availability as any).date,
      new_date: newAvailability.date,
    });
  } catch (error) {
    console.error("Reschedule booking error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
