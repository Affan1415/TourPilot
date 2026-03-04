import { NextRequest, NextResponse } from 'next/server';
import { resend, FROM_EMAIL, COMPANY_NAME } from '@/lib/email/resend';
import { ReviewRequestEmail } from '@/lib/email/templates/review-request';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      customerEmail,
      customerName,
      tourName,
      tourDate,
      tripAdvisorUrl,
      googleReviewUrl,
    } = body;

    // Validate required fields
    if (!customerEmail || !customerName || !tourName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await resend.emails.send({
      from: `${COMPANY_NAME} <${FROM_EMAIL}>`,
      to: [customerEmail],
      subject: `How was your ${tourName} experience? ⭐`,
      react: ReviewRequestEmail({
        customerName,
        tourName,
        tourDate,
        tripAdvisorUrl,
        googleReviewUrl,
        companyName: COMPANY_NAME,
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
