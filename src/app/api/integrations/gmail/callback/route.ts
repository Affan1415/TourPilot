import { NextRequest, NextResponse } from "next/server";

// Handle OAuth callback
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/inbox/settings?error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/inbox/settings?error=no_code`
    );
  }

  // Redirect to a page that will complete the OAuth flow
  // The page will call the POST endpoint to exchange the code
  return NextResponse.redirect(
    `${baseUrl}/dashboard/inbox/settings?code=${encodeURIComponent(code)}&provider=gmail`
  );
}
