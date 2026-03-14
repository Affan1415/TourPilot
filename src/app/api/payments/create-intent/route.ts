import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      booking_id,
      amount,
      currency = 'usd',
      customer_email,
      customer_name,
      metadata = {}
    } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Create or retrieve Stripe customer
    let stripeCustomerId: string | undefined;

    if (customer_email) {
      const existingCustomers = await stripe.customers.list({
        email: customer_email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        stripeCustomerId = existingCustomers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: customer_email,
          name: customer_name,
          metadata: {
            booking_id,
          },
        });
        stripeCustomerId = customer.id;
      }
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      customer: stripeCustomerId,
      metadata: {
        booking_id,
        ...metadata,
      },
      automatic_payment_methods: {
        enabled: true,
      },
      description: `TourPilot Booking ${booking_id || ''}`.trim(),
    });

    // Update booking with payment intent ID if booking_id provided
    if (booking_id) {
      const supabase = await createClient();
      await supabase
        .from('bookings')
        .update({
          payment_intent_id: paymentIntent.id,
        })
        .eq('id', booking_id);
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error('Payment intent creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
