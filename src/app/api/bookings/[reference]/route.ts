import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const { reference } = await params;

    if (!reference) {
      return NextResponse.json(
        { error: 'Booking reference is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_reference,
        guest_count,
        total_price,
        status,
        payment_status,
        created_at,
        customers (
          first_name,
          last_name,
          email,
          phone
        ),
        availabilities (
          date,
          start_time,
          tours (
            name,
            short_description,
            duration_minutes,
            images,
            location,
            meeting_point
          )
        ),
        booking_guests (
          id,
          first_name,
          last_name,
          waivers (
            status
          )
        )
      `)
      .eq('booking_reference', reference)
      .single();

    if (error) {
      console.error('Error fetching booking:', error);
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in booking API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
