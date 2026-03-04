import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();

    // Clear all Gmail-related cookies
    cookieStore.delete('gmail_access_token');
    cookieStore.delete('gmail_refresh_token');
    cookieStore.delete('gmail_user_email');
    cookieStore.delete('gmail_user_name');
    cookieStore.delete('gmail_user_picture');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Gmail:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}
