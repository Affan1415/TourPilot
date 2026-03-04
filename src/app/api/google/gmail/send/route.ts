import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sendEmail, refreshAccessToken } from '@/lib/google/gmail';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, body: emailBody } = body;

    if (!to || !subject || !emailBody) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, body' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    let accessToken = cookieStore.get('gmail_access_token')?.value;
    const refreshToken = cookieStore.get('gmail_refresh_token')?.value;

    if (!accessToken) {
      if (refreshToken) {
        try {
          const newTokens = await refreshAccessToken(refreshToken);
          accessToken = newTokens.access_token!;

          cookieStore.set('gmail_access_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: newTokens.expiry_date ? Math.floor((newTokens.expiry_date - Date.now()) / 1000) : 3600,
            path: '/',
          });
        } catch {
          return NextResponse.json(
            { error: 'Session expired. Please reconnect your Gmail.' },
            { status: 401 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Not authenticated with Gmail' },
          { status: 401 }
        );
      }
    }

    const result = await sendEmail(accessToken, to, subject, emailBody, refreshToken);

    return NextResponse.json({
      success: true,
      messageId: result.id,
    });
  } catch (error: any) {
    console.error('Error sending email:', error);

    if (error.code === 401 || error.message?.includes('invalid_grant')) {
      return NextResponse.json(
        { error: 'Session expired. Please reconnect your Gmail.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
