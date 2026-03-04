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

    // If guestId provided, check in specific guest
    if (guestId) {
      const { error: guestError } = await supabase
        .from('booking_guests')
        .update({ checked_in: true })
        .eq('id', guestId)
        .eq('booking_id', bookingId);

      if (guestError) {
        console.error('Error checking in guest:', guestError);
        return NextResponse.json(
          { error: 'Failed to check in guest' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Guest checked in successfully',
      });
    }

    // Check in all guests for the booking
    const { error: guestsError } = await supabase
      .from('booking_guests')
      .update({ checked_in: true })
      .eq('booking_id', bookingId);

    if (guestsError) {
      console.error('Error checking in guests:', guestsError);
      return NextResponse.json(
        { error: 'Failed to check in guests' },
        { status: 500 }
      );
    }

    // Update booking status to checked_in
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({
        status: 'checked_in',
        checked_in: true,
        checked_in_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (bookingError) {
      console.error('Error updating booking status:', bookingError);
      return NextResponse.json(
        { error: 'Failed to update booking status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'All guests checked in successfully',
    });
  } catch (error: any) {
    console.error('Error in check-in API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check in' },
      { status: 500 }
    );
  }
}
