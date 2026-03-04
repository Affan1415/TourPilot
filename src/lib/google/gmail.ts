import { google } from 'googleapis';

// Google OAuth2 client configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`
);

// Scopes for Gmail access
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

// Generate authorization URL
export function getAuthUrl(): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}

// Exchange code for tokens
export async function getTokensFromCode(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Set credentials on client
export function setCredentials(tokens: any) {
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
}

// Refresh tokens if needed
export async function refreshAccessToken(refreshToken: string) {
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
}

// Get user profile
export async function getUserProfile(accessToken: string) {
  oauth2Client.setCredentials({ access_token: accessToken });
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  return data;
}

// Gmail API functions
export async function getGmailClient(accessToken: string, refreshToken?: string) {
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken
  });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

// Fetch inbox messages
export async function fetchInbox(accessToken: string, refreshToken?: string, maxResults = 20, pageToken?: string) {
  const gmail = await getGmailClient(accessToken, refreshToken);

  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    pageToken,
    labelIds: ['INBOX'],
  });

  return {
    messages: response.data.messages || [],
    nextPageToken: response.data.nextPageToken,
    resultSizeEstimate: response.data.resultSizeEstimate,
  };
}

// Fetch sent messages
export async function fetchSent(accessToken: string, refreshToken?: string, maxResults = 20, pageToken?: string) {
  const gmail = await getGmailClient(accessToken, refreshToken);

  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    pageToken,
    labelIds: ['SENT'],
  });

  return {
    messages: response.data.messages || [],
    nextPageToken: response.data.nextPageToken,
    resultSizeEstimate: response.data.resultSizeEstimate,
  };
}

// Get message details
export async function getMessage(accessToken: string, messageId: string, refreshToken?: string) {
  const gmail = await getGmailClient(accessToken, refreshToken);

  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  const message = response.data;
  const headers = message.payload?.headers || [];

  const getHeader = (name: string) =>
    headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  // Extract body
  let body = '';
  let htmlBody = '';

  if (message.payload?.body?.data) {
    body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
  } else if (message.payload?.parts) {
    for (const part of message.payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        body = Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.mimeType === 'text/html' && part.body?.data) {
        htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      // Handle nested parts (multipart)
      if (part.parts) {
        for (const nestedPart of part.parts) {
          if (nestedPart.mimeType === 'text/plain' && nestedPart.body?.data) {
            body = Buffer.from(nestedPart.body.data, 'base64').toString('utf-8');
          }
          if (nestedPart.mimeType === 'text/html' && nestedPart.body?.data) {
            htmlBody = Buffer.from(nestedPart.body.data, 'base64').toString('utf-8');
          }
        }
      }
    }
  }

  return {
    id: message.id,
    threadId: message.threadId,
    labelIds: message.labelIds,
    snippet: message.snippet,
    subject: getHeader('Subject'),
    from: getHeader('From'),
    to: getHeader('To'),
    date: getHeader('Date'),
    body,
    htmlBody,
    isUnread: message.labelIds?.includes('UNREAD'),
    isStarred: message.labelIds?.includes('STARRED'),
  };
}

// Send email
export async function sendEmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  refreshToken?: string
) {
  const gmail = await getGmailClient(accessToken, refreshToken);

  // Create email in RFC 2822 format
  const emailLines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    body,
  ];

  const email = emailLines.join('\r\n');
  const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedEmail,
    },
  });

  return response.data;
}

// Mark as read
export async function markAsRead(accessToken: string, messageId: string, refreshToken?: string) {
  const gmail = await getGmailClient(accessToken, refreshToken);

  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      removeLabelIds: ['UNREAD'],
    },
  });
}

// Mark as unread
export async function markAsUnread(accessToken: string, messageId: string, refreshToken?: string) {
  const gmail = await getGmailClient(accessToken, refreshToken);

  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      addLabelIds: ['UNREAD'],
    },
  });
}

// Star/Unstar message
export async function toggleStar(accessToken: string, messageId: string, starred: boolean, refreshToken?: string) {
  const gmail = await getGmailClient(accessToken, refreshToken);

  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: starred
      ? { addLabelIds: ['STARRED'] }
      : { removeLabelIds: ['STARRED'] },
  });
}

// Delete message (move to trash)
export async function deleteMessage(accessToken: string, messageId: string, refreshToken?: string) {
  const gmail = await getGmailClient(accessToken, refreshToken);

  await gmail.users.messages.trash({
    userId: 'me',
    id: messageId,
  });
}

// Search messages
export async function searchMessages(accessToken: string, query: string, maxResults = 20, refreshToken?: string) {
  const gmail = await getGmailClient(accessToken, refreshToken);

  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    q: query,
  });

  return {
    messages: response.data.messages || [],
    nextPageToken: response.data.nextPageToken,
    resultSizeEstimate: response.data.resultSizeEstimate,
  };
}

export { oauth2Client };
