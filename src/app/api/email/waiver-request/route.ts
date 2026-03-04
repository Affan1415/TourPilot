import { NextRequest, NextResponse } from 'next/server';
import { resend, FROM_EMAIL, COMPANY_NAME, APP_URL } from '@/lib/email/resend';
import { WaiverRequestEmail } from '@/lib/email/templates/waiver-request';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      guestEmail,
      guestName,
      customerName,
      tourName,
      tourDate,
      tourTime,
      waiverToken,
    } = body;

    // Validate required fields
    if (!guestEmail || !guestName || !tourName || !waiverToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const waiverUrl = `${APP_URL}/waiver/${waiverToken}`;

    const { data, error } = await resend.emails.send({
      from: `${COMPANY_NAME} <${FROM_EMAIL}>`,
      to: [guestEmail],
      subject: `Please Sign Your Waiver for ${tourName}`,
      react: WaiverRequestEmail({
        guestName,
        customerName: customerName || 'Your host',
        tourName,
        tourDate,
        tourTime,
        waiverUrl,
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
