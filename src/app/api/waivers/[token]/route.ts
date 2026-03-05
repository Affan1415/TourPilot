import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if token is a booking reference (starts with BK) or a waiver UUID
    const isBookingReference = token.startsWith('BK');

    if (isBookingReference) {
      // Fetch booking by reference
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_reference,
          guest_count,
          availabilities (
            date,
            start_time,
            tours (
              name
            )
          )
        `)
        .eq('booking_reference', token)
        .single();

      if (bookingError || !booking) {
        console.error('Error fetching booking:', bookingError);
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        );
      }

      // Fetch all waivers for this booking
      const { data: waivers, error: waiversError } = await supabase
        .from('waivers')
        .select(`
          id,
          status,
          signed_at,
          booking_id,
          booking_guests (
            id,
            first_name,
            last_name
          ),
          waiver_templates (
            name,
            content
          )
        `)
        .eq('booking_id', booking.id);

      if (waiversError) {
        console.error('Error fetching waivers:', waiversError);
        return NextResponse.json(
          { error: 'Failed to fetch waivers' },
          { status: 500 }
        );
      }

      // Return booking info even if no waivers exist (tour may not require waivers)
      return NextResponse.json({
        booking: {
          id: booking.id,
          booking_reference: booking.booking_reference,
          guest_count: booking.guest_count,
          availability: booking.availabilities,
        },
        waivers: (waivers || []).map((w: any) => ({
          id: w.id,
          status: w.status,
          signed_at: w.signed_at,
          guest: w.booking_guests,
          waiver_template: w.waiver_templates,
        })),
        noWaiversRequired: !waivers || waivers.length === 0,
      });
    } else {
      // Fetch waiver by UUID
      const { data: waiver, error: waiverError } = await supabase
        .from('waivers')
        .select(`
          id,
          status,
          signed_at,
          booking_id,
          booking_guests (
            id,
            first_name,
            last_name
          ),
          bookings (
            id,
            booking_reference,
            guest_count,
            availabilities (
              date,
              start_time,
              tours (
                name
              )
            )
          ),
          waiver_templates (
            name,
            content
          )
        `)
        .eq('id', token)
        .single();

      if (waiverError || !waiver) {
        console.error('Error fetching waiver:', waiverError);
        return NextResponse.json(
          { error: 'Waiver not found' },
          { status: 404 }
        );
      }

      // Also fetch all waivers for this booking
      const { data: allWaivers } = await supabase
        .from('waivers')
        .select(`
          id,
          status,
          signed_at,
          booking_guests (
            id,
            first_name,
            last_name
          )
        `)
        .eq('booking_id', waiver.booking_id);

      return NextResponse.json({
        booking: {
          id: (waiver as any).bookings?.id,
          booking_reference: (waiver as any).bookings?.booking_reference,
          guest_count: (waiver as any).bookings?.guest_count,
          availability: (waiver as any).bookings?.availabilities,
        },
        waivers: (allWaivers || [waiver]).map((w: any) => ({
          id: w.id,
          status: w.status,
          signed_at: w.signed_at,
          guest: w.booking_guests,
          waiver_template: (waiver as any).waiver_templates,
        })),
        currentWaiver: {
          id: waiver.id,
          status: waiver.status,
          signed_at: waiver.signed_at,
          guest: (waiver as any).booking_guests,
          waiver_template: (waiver as any).waiver_templates,
        },
      });
    }
  } catch (error) {
    console.error('Error in waiver API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
