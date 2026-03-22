import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET: Get widget config and tours for embed
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ widgetKey: string }> }
) {
  try {
    const { widgetKey } = await params;
    const adminClient = createAdminClient();

    // Get widget config
    const { data: widget, error: widgetError } = await adminClient
      .from("widgets")
      .select("*")
      .eq("widget_key", widgetKey)
      .eq("is_active", true)
      .single();

    if (widgetError || !widget) {
      return NextResponse.json({ error: "Widget not found" }, { status: 404 });
    }

    // Check referrer domain if restricted
    const referer = request.headers.get("referer");
    if (widget.allowed_domains && !widget.allowed_domains.includes("*")) {
      if (referer) {
        try {
          const refererHost = new URL(referer).hostname;
          const isAllowed = widget.allowed_domains.some((domain: string) =>
            refererHost === domain || refererHost.endsWith(`.${domain}`)
          );
          if (!isAllowed) {
            return NextResponse.json(
              { error: "Domain not allowed for this widget" },
              { status: 403 }
            );
          }
        } catch {
          // Invalid referer URL, allow anyway
        }
      }
    }

    // Get tours - either specific ones or all active
    let toursQuery = adminClient
      .from("tours")
      .select(`
        id,
        name,
        slug,
        description,
        short_description,
        duration_minutes,
        base_price,
        max_capacity,
        images,
        location,
        meeting_point,
        requires_waiver
      `)
      .eq("status", "active")
      .order("name");

    if (widget.tour_ids && widget.tour_ids.length > 0) {
      toursQuery = toursQuery.in("id", widget.tour_ids);
    }

    const { data: tours, error: toursError } = await toursQuery;

    if (toursError) {
      return NextResponse.json({ error: toursError.message }, { status: 500 });
    }

    // Track widget view
    await adminClient
      .from("widget_analytics")
      .insert({
        widget_id: widget.id,
        event_type: "view",
        referrer: referer || null,
        user_agent: request.headers.get("user-agent") || null,
      });

    // Increment embed count
    await adminClient
      .from("widgets")
      .update({ embed_count: widget.embed_count + 1 })
      .eq("id", widget.id);

    return NextResponse.json({
      widget: {
        id: widget.id,
        name: widget.name,
        theme: widget.theme,
      },
      tours,
    });
  } catch (error) {
    console.error("Embed API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
