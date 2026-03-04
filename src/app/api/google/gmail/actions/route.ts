import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { markAsRead, markAsUnread, toggleStar, deleteMessage, refreshAccessToken } from '@/lib/google/gmail';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, messageId, starred } = body;

    if (!action || !messageId) {
      return NextResponse.json(
        { error: 'Missing required fields: action, messageId' },
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

    switch (action) {
      case 'markRead':
        await markAsRead(accessToken, messageId, refreshToken);
        break;
      case 'markUnread':
        await markAsUnread(accessToken, messageId, refreshToken);
        break;
      case 'star':
        await toggleStar(accessToken, messageId, starred, refreshToken);
        break;
      case 'delete':
        await deleteMessage(accessToken, messageId, refreshToken);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error performing action:', error);

    if (error.code === 401 || error.message?.includes('invalid_grant')) {
      return NextResponse.json(
        { error: 'Session expired. Please reconnect your Gmail.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}
