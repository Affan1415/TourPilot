import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, forbiddenResponse } from "@/lib/auth/api-auth";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// POST: Cancel a booking with optional refund
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
    const body = await request.json().catch(() => ({}));
    const { refund = false, refund_amount, reason } = body;

    const adminClient = createAdminClient();

    // Get booking details
    const { data: booking, error: bookingError } = await adminClient
      .from("bookings")
      .select(`
        *,
        customer:customers(email, first_name, last_name),
        availability:availabilities(
          date,
          start_time,
          tour:tours(name)
        )
      `)
      .eq("id", id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status === "cancelled") {
      return NextResponse.json(
        { error: "Booking is already cancelled" },
        { status: 400 }
      );
    }

    let refundResult = null;

    // Process refund if requested and payment exists
    if (refund && booking.payment_intent_id && booking.payment_status === "paid") {
      try {
        const refundOptions: Stripe.RefundCreateParams = {
          payment_intent: booking.payment_intent_id,
        };

        // If specific amount requested, use it (in cents)
        if (refund_amount && refund_amount > 0) {
          refundOptions.amount = Math.round(refund_amount * 100);
        }

        if (reason) {
          refundOptions.reason = "requested_by_customer";
          refundOptions.metadata = { cancellation_reason: reason };
        }

        refundResult = await stripe.refunds.create(refundOptions);
      } catch (stripeError: any) {
        console.error("Stripe refund error:", stripeError);
        return NextResponse.json(
          { error: `Refund failed: ${stripeError.message}` },
          { status: 400 }
        );
      }
    }

    // Update booking status
    const updateData: Record<string, any> = {
      status: "cancelled",
      cancellation_reason: reason || null,
      cancelled_at: new Date().toISOString(),
    };

    if (refundResult) {
      updateData.payment_status = "refunded";
      updateData.refund_id = refundResult.id;
      updateData.refund_amount = refundResult.amount / 100;
    }

    const { data: updatedBooking, error: updateError } = await adminClient
      .from("bookings")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Update affiliate referral status if applicable
    if (booking.affiliate_id) {
      await adminClient
        .from("affiliate_referrals")
        .update({ status: "cancelled" })
        .eq("booking_id", id);
    }

    return NextResponse.json({
      data: updatedBooking,
      refund: refundResult ? {
        id: refundResult.id,
        amount: refundResult.amount / 100,
        status: refundResult.status,
      } : null,
      message: refundResult
        ? "Booking cancelled and refund processed"
        : "Booking cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel booking error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
