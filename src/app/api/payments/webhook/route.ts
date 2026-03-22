import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Check if event was already processed (idempotency)
async function isEventProcessed(supabase: any, eventId: string): Promise<boolean> {
  const { data } = await supabase
    .from('payment_events')
    .select('id')
    .eq('stripe_event_id', eventId)
    .single();
  return !!data;
}

// Record processed event
async function recordEvent(
  supabase: any,
  eventId: string,
  eventType: string,
  bookingId: string | null,
  payload: any
): Promise<void> {
  await supabase.from('payment_events').insert({
    stripe_event_id: eventId,
    event_type: eventType,
    booking_id: bookingId,
    payload,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature || !webhookSecret) {
      return NextResponse.json(
        { error: 'Missing signature or webhook secret' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS for webhook processing
    const adminClient = createAdminClient();

    // Check idempotency - skip if already processed
    const alreadyProcessed = await isEventProcessed(adminClient, event.id);
    if (alreadyProcessed) {
      console.log(`Event ${event.id} already processed, skipping`);
      return NextResponse.json({ received: true, skipped: true });
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const bookingId = paymentIntent.metadata.booking_id;

        if (bookingId) {
          // Update booking payment status
          await adminClient
            .from('bookings')
            .update({
              payment_status: 'paid',
              status: 'confirmed',
              payment_intent_id: paymentIntent.id,
            })
            .eq('id', bookingId);

          // Record the event for idempotency
          await recordEvent(adminClient, event.id, event.type, bookingId, {
            payment_intent_id: paymentIntent.id,
            amount: paymentIntent.amount,
          });

          console.log(`Payment succeeded for booking ${bookingId}`);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const bookingId = paymentIntent.metadata.booking_id;

        if (bookingId) {
          await adminClient
            .from('bookings')
            .update({
              payment_status: 'failed',
            })
            .eq('id', bookingId);

          await recordEvent(adminClient, event.id, event.type, bookingId, {
            payment_intent_id: paymentIntent.id,
            error: paymentIntent.last_payment_error?.message,
          });

          console.log(`Payment failed for booking ${bookingId}`);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent as string;

        if (paymentIntentId) {
          // Find booking by payment intent ID
          const { data: booking } = await adminClient
            .from('bookings')
            .select('id, guest_count, availability_id')
            .eq('payment_intent_id', paymentIntentId)
            .single();

          if (booking) {
            await adminClient
              .from('bookings')
              .update({
                payment_status: 'refunded',
                status: 'cancelled',
              })
              .eq('id', booking.id);

            // Release capacity when refunded
            if (booking.availability_id && booking.guest_count) {
              await adminClient.rpc('release_availability_capacity', {
                p_availability_id: booking.availability_id,
                p_guest_count: booking.guest_count
              });
            }

            await recordEvent(adminClient, event.id, event.type, booking.id, {
              charge_id: charge.id,
              amount_refunded: charge.amount_refunded,
            });

            console.log(`Refund processed for booking ${booking.id}`);
          }
        }
        break;
      }

      default:
        // Record unhandled events too for debugging
        await recordEvent(adminClient, event.id, event.type, null, event.data.object);
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
