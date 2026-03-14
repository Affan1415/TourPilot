import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + "/api/integrations/gmail/callback";

// GET - Start OAuth flow
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");

  if (action === "connect") {
    // Generate OAuth URL
    const state = crypto.randomUUID();

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID || "",
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" "),
      access_type: "offline",
      prompt: "consent",
      state,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return NextResponse.redirect(authUrl);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// POST - Exchange code for tokens (callback handler uses this)
export async function POST(request: NextRequest) {
  try {
    const { code, locationId } = await request.json();

    if (!code) {
      return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID || "",
        client_secret: GOOGLE_CLIENT_SECRET || "",
        code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      return NextResponse.json({ error: tokens.error_description }, { status: 400 });
    }

    // Get user info to get email
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );
    const userInfo = await userInfoResponse.json();

    // Store in database
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get staff's location if not provided
    let finalLocationId = locationId;
    if (!finalLocationId) {
      const { data: staff } = await supabase
        .from("staff")
        .select("location_id")
        .eq("user_id", user.id)
        .single();
      finalLocationId = staff?.location_id;
    }

    // Save connected account
    const { error: insertError } = await supabase.from("connected_accounts").upsert({
      location_id: finalLocationId,
      channel: "email",
      account_name: userInfo.email,
      account_id: userInfo.id,
      access_token: tokens.access_token, // In production, encrypt this
      refresh_token: tokens.refresh_token, // In production, encrypt this
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      metadata: { provider: "gmail" },
      connected_by: user.id,
      is_active: true,
    }, {
      onConflict: "location_id,channel,account_id",
    });

    if (insertError) {
      console.error("Error saving connected account:", insertError);
      return NextResponse.json({ error: "Failed to save account" }, { status: 500 });
    }

    return NextResponse.json({ success: true, email: userInfo.email });
  } catch (error) {
    console.error("Gmail OAuth error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
