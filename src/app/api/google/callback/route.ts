import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode, getUserProfile } from '@/lib/google/gmail';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard/communications?error=${error}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/dashboard/communications?error=no_code', request.url)
    );
  }

  try {
    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    // Get user profile
    const profile = await getUserProfile(tokens.access_token!);

    // Store tokens in cookies (encrypted in production)
    const cookieStore = await cookies();

    cookieStore.set('gmail_access_token', tokens.access_token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : 3600,
      path: '/',
    });

    if (tokens.refresh_token) {
      cookieStore.set('gmail_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });
    }

    cookieStore.set('gmail_user_email', profile.email || '', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    cookieStore.set('gmail_user_name', profile.name || '', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    cookieStore.set('gmail_user_picture', profile.picture || '', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return NextResponse.redirect(
      new URL('/dashboard/communications?connected=true', request.url)
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/communications?error=auth_failed', request.url)
    );
  }
}
