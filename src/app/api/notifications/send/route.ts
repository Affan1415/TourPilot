import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface SendNotificationRequest {
  user_ids?: string[];
  role?: string;
  location_id?: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Check if user is authenticated and has admin role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: staffMember } = await supabase
      .from("staff")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!staffMember || !["super_admin", "admin", "location_admin"].includes(staffMember.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: SendNotificationRequest = await request.json();
    const { user_ids, role, location_id, title, body: notificationBody, data } = body;

    if (!title || !notificationBody) {
      return NextResponse.json(
        { error: "Title and body are required" },
        { status: 400 }
      );
    }

    // Build query to get push tokens
    let tokenQuery = adminClient
      .from("push_tokens")
      .select("token, user_id");

    if (user_ids && user_ids.length > 0) {
      tokenQuery = tokenQuery.in("user_id", user_ids);
    } else if (role || location_id) {
      // Get staff members matching criteria
      let staffQuery = adminClient.from("staff").select("user_id");

      if (role) {
        staffQuery = staffQuery.eq("role", role);
      }
      if (location_id) {
        staffQuery = staffQuery.eq("location_id", location_id);
      }

      const { data: staffMembers } = await staffQuery;
      const staffUserIds = staffMembers?.map((s: any) => s.user_id) || [];

      if (staffUserIds.length === 0) {
        return NextResponse.json({ message: "No recipients found", sent: 0 });
      }

      tokenQuery = tokenQuery.in("user_id", staffUserIds);
    }

    const { data: tokens, error: tokenError } = await tokenQuery;

    if (tokenError) {
      console.error("Error fetching tokens:", tokenError);
      return NextResponse.json({ error: "Failed to fetch tokens" }, { status: 500 });
    }

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ message: "No push tokens found", sent: 0 });
    }

    // Send notifications via Expo Push Notification Service
    const messages = tokens.map((t: any) => ({
      to: t.token,
      sound: "default",
      title,
      body: notificationBody,
      data: data || {},
    }));

    // Expo push notification API
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();

    // Log notifications
    const logEntries = tokens.map((t: any) => ({
      user_id: t.user_id,
      type: data?.type || "general",
      title,
      body: notificationBody,
      data,
      status: "sent",
      sent_at: new Date().toISOString(),
    }));

    await adminClient.from("notification_logs").insert(logEntries);

    return NextResponse.json({
      message: "Notifications sent",
      sent: tokens.length,
      result,
    });
  } catch (error) {
    console.error("Notification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
