import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, tour_id, booking_value, customer_email } = body;

    if (!code) {
      return NextResponse.json(
        { error: "Promo code is required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Find promo code
    const { data: promo, error: promoError } = await adminClient
      .from("promo_codes")
      .select("*")
      .ilike("code", code)
      .eq("is_active", true)
      .single();

    if (promoError || !promo) {
      return NextResponse.json(
        { valid: false, error: "Invalid promo code" },
        { status: 200 }
      );
    }

    // Check validity dates
    const now = new Date();
    if (promo.valid_from && new Date(promo.valid_from) > now) {
      return NextResponse.json(
        { valid: false, error: "Promo code is not yet active" },
        { status: 200 }
      );
    }

    if (promo.valid_until && new Date(promo.valid_until) < now) {
      return NextResponse.json(
        { valid: false, error: "Promo code has expired" },
        { status: 200 }
      );
    }

    // Check max uses
    if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
      return NextResponse.json(
        { valid: false, error: "Promo code has reached maximum uses" },
        { status: 200 }
      );
    }

    // Check if customer has used this code (if customer email provided)
    if (customer_email) {
      const { data: customer } = await adminClient
        .from("customers")
        .select("id")
        .eq("email", customer_email.toLowerCase())
        .single();

      if (customer) {
        const { data: uses } = await adminClient
          .from("promo_code_uses")
          .select("id")
          .eq("promo_code_id", promo.id)
          .eq("customer_id", customer.id);

        if (uses && uses.length >= promo.max_uses_per_customer) {
          return NextResponse.json(
            { valid: false, error: "You have already used this promo code" },
            { status: 200 }
          );
        }
      }
    }

    // Check minimum booking value
    if (booking_value && promo.min_booking_value !== null) {
      if (booking_value < promo.min_booking_value) {
        return NextResponse.json({
          valid: false,
          error: `Minimum booking value of $${promo.min_booking_value} required`
        }, { status: 200 });
      }
    }

    // Check tour eligibility
    if (tour_id && promo.tour_ids && promo.tour_ids.length > 0) {
      if (!promo.tour_ids.includes(tour_id)) {
        return NextResponse.json(
          { valid: false, error: "Promo code is not valid for this tour" },
          { status: 200 }
        );
      }
    }

    // Calculate discount
    let discountAmount = 0;
    if (booking_value) {
      if (promo.discount_type === "percentage") {
        discountAmount = (booking_value * promo.discount_value) / 100;
        if (promo.max_discount !== null && discountAmount > promo.max_discount) {
          discountAmount = promo.max_discount;
        }
      } else {
        discountAmount = promo.discount_value;
      }

      // Don't allow discount greater than booking value
      if (discountAmount > booking_value) {
        discountAmount = booking_value;
      }
    }

    return NextResponse.json({
      valid: true,
      promo_code_id: promo.id,
      code: promo.code,
      description: promo.description,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      discount_amount: discountAmount,
      max_discount: promo.max_discount,
    });
  } catch (error) {
    console.error("Promo code validation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
