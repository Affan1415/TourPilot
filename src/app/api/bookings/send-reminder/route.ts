import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { format } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId } = body;

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
        guest_count,
        customer_id,
        customer:customers(first_name, last_name, email),
        availability:availabilities(
          date,
          start_time,
          tour:tours(name, meeting_point)
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

    const customer = booking.customer as any;
    const availability = booking.availability as any;

    if (!customer?.email) {
      return NextResponse.json(
        { error: 'Customer email not found' },
        { status: 400 }
      );
    }

    // Check waiver status for this booking
    const { data: waivers } = await supabase
      .from('waivers')
      .select('status')
      .eq('booking_id', bookingId);

    const allWaiversSigned = waivers && waivers.length > 0 && waivers.every(w => w.status === 'signed');

    // Format date for email
    const tourDate = availability?.date
      ? format(new Date(availability.date), 'EEEE, MMMM d, yyyy')
      : 'Your tour date';

    const tourTime = availability?.start_time?.substring(0, 5) || '';

    // Send reminder email
    const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/tour-reminder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerEmail: customer.email,
        customerName: customer.first_name,
        bookingReference: booking.booking_reference,
        tourName: availability?.tour?.name || 'Your Tour',
        tourDate,
        tourTime,
        guestCount: booking.guest_count,
        meetingPoint: availability?.tour?.meeting_point || 'See booking details',
        waiverSigned: allWaiversSigned,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error('Email send error:', errorData);
      return NextResponse.json(
        { error: errorData.error || 'Failed to send reminder email' },
        { status: 500 }
      );
    }

    // Log communication
    await supabase.from('communications').insert({
      booking_id: bookingId,
      customer_id: booking.customer_id,
      type: 'email',
      template_type: 'tour_reminder',
      subject: `Reminder: ${availability?.tour?.name || 'Your Tour'} is coming up!`,
      content: `Tour reminder sent to ${customer.email}`,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `Reminder sent to ${customer.email}`,
    });
  } catch (error: any) {
    console.error('Error in send-reminder API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send reminder' },
      { status: 500 }
    );
  }
}
