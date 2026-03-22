import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireManager, forbiddenResponse } from "@/lib/auth/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireManager();
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const daysAhead = parseInt(searchParams.get("days") || "30");

    // Use the database function to get expiring certifications
    const { data, error } = await supabase.rpc("get_expiring_certifications", {
      p_days_ahead: daysAhead,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter by location if not admin
    let filteredData = data;
    if (auth.role !== "admin" && auth.locationId) {
      // Need to get staff location info
      const staffIds = data?.map((cert: any) => cert.staff_id) || [];
      if (staffIds.length > 0) {
        const { data: staffData } = await supabase
          .from("staff")
          .select("id, location_id")
          .in("id", staffIds);

        const locationStaffIds = staffData
          ?.filter((s: any) => s.location_id === auth.locationId)
          .map((s: any) => s.id) || [];

        filteredData = data?.filter((cert: any) =>
          locationStaffIds.includes(cert.staff_id)
        );
      }
    }

    // Group by urgency
    const now = new Date();
    const grouped = {
      critical: [] as any[], // Expiring in 7 days or less
      warning: [] as any[],  // Expiring in 8-14 days
      upcoming: [] as any[], // Expiring in 15-30 days
    };

    filteredData?.forEach((cert: any) => {
      if (cert.days_until_expiry <= 7) {
        grouped.critical.push(cert);
      } else if (cert.days_until_expiry <= 14) {
        grouped.warning.push(cert);
      } else {
        grouped.upcoming.push(cert);
      }
    });

    return NextResponse.json({
      data: filteredData,
      grouped,
      summary: {
        total: filteredData?.length || 0,
        critical: grouped.critical.length,
        warning: grouped.warning.length,
        upcoming: grouped.upcoming.length,
      },
    });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized") || error.message?.includes("permission") || error.message?.includes("Forbidden")) {
      return forbiddenResponse(error.message);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
