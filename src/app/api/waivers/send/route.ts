import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, guestId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_reference,
        customer:customers(first_name, last_name),
        availability:availabilities(
          date,
          start_time,
          tour:tours(name)
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('Error fetching booking:', bookingError);
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Get active waiver template (most recently created one if multiple exist)
    const { data: templates, error: templateError } = await supabase
      .from('waiver_templates')
      .select('id')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (templateError || !templates || templates.length === 0) {
      console.error('Error fetching waiver template:', templateError);
      return NextResponse.json(
        { error: 'No active waiver template found. Please create a waiver template in the database.' },
        { status: 404 }
      );
    }

    const template = templates[0];

    // Get guests - either specific guest or all guests
    let guestsQuery = supabase
      .from('booking_guests')
      .select('id, first_name, last_name, email')
      .eq('booking_id', bookingId);

    if (guestId) {
      guestsQuery = guestsQuery.eq('id', guestId);
    }

    const { data: guests, error: guestsError } = await guestsQuery;

    if (guestsError || !guests || guests.length === 0) {
      console.error('Error fetching guests:', guestsError);
      return NextResponse.json(
        { error: 'No guests found for this booking' },
        { status: 404 }
      );
    }

    const guestsWithEmail = guests.filter(g => g.email);

    if (guestsWithEmail.length === 0) {
      return NextResponse.json(
        { error: 'No guests have email addresses' },
        { status: 400 }
      );
    }

    const results: { guestId: string; success: boolean; error?: string }[] = [];

    for (const guest of guestsWithEmail) {
      try {
        // Get or create waiver record
        let { data: existingWaiver } = await supabase
          .from('waivers')
          .select('id')
          .eq('booking_id', bookingId)
          .eq('guest_id', guest.id)
          .single();

        let waiverId = existingWaiver?.id;

        if (!waiverId) {
          const { data: newWaiver, error: waiverError } = await supabase
            .from('waivers')
            .insert({
              booking_id: bookingId,
              guest_id: guest.id,
              waiver_template_id: template.id,
              status: 'pending',
            })
            .select('id')
            .single();

          if (waiverError) {
            console.error('Error creating waiver:', waiverError);
            results.push({ guestId: guest.id, success: false, error: waiverError.message });
            continue;
          }
          waiverId = newWaiver.id;
        }

        // Send waiver email
        const customerName = booking.customer
          ? `${(booking.customer as any).first_name} ${(booking.customer as any).last_name}`
          : 'Your host';

        const tourName = (booking.availability as any)?.tour?.name || 'Your Tour';
        const tourDate = (booking.availability as any)?.date || '';
        const tourTime = (booking.availability as any)?.start_time?.substring(0, 5) || '';

        const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/waiver-request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guestEmail: guest.email,
            guestName: `${guest.first_name} ${guest.last_name}`,
            customerName,
            tourName,
            tourDate,
            tourTime,
            waiverToken: waiverId,
          }),
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json();
          results.push({ guestId: guest.id, success: false, error: errorData.error });
          continue;
        }

        // Log communication
        await supabase.from('communications').insert({
          booking_id: bookingId,
          customer_id: (await supabase.from('bookings').select('customer_id').eq('id', bookingId).single()).data?.customer_id,
          type: 'email',
          template_type: 'waiver_request',
          subject: `Waiver Request for ${tourName}`,
          content: `Waiver link sent to ${guest.email}`,
          status: 'sent',
          sent_at: new Date().toISOString(),
        });

        results.push({ guestId: guest.id, success: true });
      } catch (err: any) {
        console.error(`Error processing guest ${guest.id}:`, err);
        results.push({ guestId: guest.id, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: successCount > 0,
      message: `Sent ${successCount} waiver(s)${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      results,
    });
  } catch (error: any) {
    console.error('Error in send waiver API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send waivers' },
      { status: 500 }
    );
  }
}
