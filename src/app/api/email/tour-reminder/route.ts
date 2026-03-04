import { NextRequest, NextResponse } from 'next/server';
import { resend, FROM_EMAIL, COMPANY_NAME, APP_URL } from '@/lib/email/resend';
import { TourReminderEmail } from '@/lib/email/templates/tour-reminder';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      customerEmail,
      customerName,
      bookingReference,
      tourName,
      tourDate,
      tourTime,
      guestCount,
      meetingPoint,
      waiverSigned,
    } = body;

    // Validate required fields
    if (!customerEmail || !customerName || !bookingReference || !tourName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const waiverUrl = `${APP_URL}/waiver/${bookingReference}`;
    const bookingUrl = `${APP_URL}/booking/${bookingReference}`;

    const { data, error } = await resend.emails.send({
      from: `${COMPANY_NAME} <${FROM_EMAIL}>`,
      to: [customerEmail],
      subject: `Reminder: ${tourName} is Tomorrow! 🎉`,
      react: TourReminderEmail({
        customerName,
        bookingReference,
        tourName,
        tourDate,
        tourTime,
        guestCount,
        meetingPoint,
        waiverSigned: waiverSigned ?? false,
        waiverUrl,
        bookingUrl,
        companyName: COMPANY_NAME,
        companyPhone: '(555) 123-4567',
      }),
    });

    if (error) {
      console.error('Email error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messageId: data?.id,
    });
  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
