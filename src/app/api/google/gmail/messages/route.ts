import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { fetchInbox, fetchSent, getMessage, searchMessages, refreshAccessToken } from '@/lib/google/gmail';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const folder = searchParams.get('folder') || 'inbox';
  const messageId = searchParams.get('id');
  const query = searchParams.get('q');
  const maxResults = parseInt(searchParams.get('maxResults') || '20');
  const pageToken = searchParams.get('pageToken') || undefined;

  try {
    const cookieStore = await cookies();
    let accessToken = cookieStore.get('gmail_access_token')?.value;
    const refreshToken = cookieStore.get('gmail_refresh_token')?.value;

    if (!accessToken) {
      // Try to refresh if we have a refresh token
      if (refreshToken) {
        try {
          const newTokens = await refreshAccessToken(refreshToken);
          accessToken = newTokens.access_token!;

          // Update the access token cookie
          cookieStore.set('gmail_access_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: newTokens.expiry_date ? Math.floor((newTokens.expiry_date - Date.now()) / 1000) : 3600,
            path: '/',
          });
        } catch (refreshError) {
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

    // If requesting a specific message
    if (messageId) {
      const message = await getMessage(accessToken, messageId, refreshToken);
      return NextResponse.json({ message });
    }

    // If searching
    if (query) {
      const results = await searchMessages(accessToken, query, maxResults, refreshToken);

      // Fetch details for each message
      const messagesWithDetails = await Promise.all(
        results.messages.slice(0, 10).map(async (msg: any) => {
          try {
            return await getMessage(accessToken!, msg.id, refreshToken);
          } catch {
            return null;
          }
        })
      );

      return NextResponse.json({
        messages: messagesWithDetails.filter(Boolean),
        nextPageToken: results.nextPageToken,
        total: results.resultSizeEstimate,
      });
    }

    // Fetch messages based on folder
    let result;
    if (folder === 'sent') {
      result = await fetchSent(accessToken, refreshToken, maxResults, pageToken);
    } else {
      result = await fetchInbox(accessToken, refreshToken, maxResults, pageToken);
    }

    // Fetch details for each message
    const messagesWithDetails = await Promise.all(
      result.messages.map(async (msg: any) => {
        try {
          return await getMessage(accessToken!, msg.id, refreshToken);
        } catch {
          return null;
        }
      })
    );

    return NextResponse.json({
      messages: messagesWithDetails.filter(Boolean),
      nextPageToken: result.nextPageToken,
      total: result.resultSizeEstimate,
    });
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });

    // Check if it's an auth error
    if (error.code === 401 || error.message?.includes('invalid_grant')) {
      return NextResponse.json(
        { error: 'Session expired. Please reconnect your Gmail.' },
        { status: 401 }
      );
    }

    // Check if Gmail API is not enabled
    if (error.message?.includes('Gmail API has not been used') ||
        error.message?.includes('accessNotConfigured') ||
        error.code === 403) {
      return NextResponse.json(
        { error: 'Gmail API is not enabled. Please enable it in Google Cloud Console.' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
