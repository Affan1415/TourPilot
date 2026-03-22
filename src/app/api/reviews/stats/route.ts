import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, forbiddenResponse } from "@/lib/auth/api-auth";

export async function GET(request: NextRequest) {
  try {
    await requireStaff();

    const supabase = await createClient();

    // Get overall stats
    const { data: reviews, error: reviewsError } = await supabase
      .from("reviews")
      .select("rating, response, review_date, status")
      .eq("status", "published");

    if (reviewsError) {
      return NextResponse.json({ error: reviewsError.message }, { status: 500 });
    }

    const totalReviews = reviews?.length || 0;
    const avgRating = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

    const withResponse = reviews?.filter(r => r.response)?.length || 0;
    const responseRate = totalReviews > 0 ? Math.round((withResponse / totalReviews) * 100) : 0;

    // Calculate distribution
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews?.forEach(r => {
      distribution[r.rating as keyof typeof distribution]++;
    });

    // Calculate this month's reviews
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = reviews?.filter(r => new Date(r.review_date) >= monthStart)?.length || 0;

    // Calculate trend (compare this month vs last month)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthReviews = reviews?.filter(r => {
      const date = new Date(r.review_date);
      return date >= lastMonthStart && date <= lastMonthEnd;
    });

    const lastMonthAvg = lastMonthReviews && lastMonthReviews.length > 0
      ? lastMonthReviews.reduce((sum, r) => sum + r.rating, 0) / lastMonthReviews.length
      : avgRating;

    const trend = Math.round((avgRating - lastMonthAvg) * 10) / 10;

    // Get reviews by source
    const { data: sourceData } = await supabase
      .from("reviews")
      .select("source")
      .eq("status", "published");

    const bySource: Record<string, number> = {};
    sourceData?.forEach(r => {
      bySource[r.source] = (bySource[r.source] || 0) + 1;
    });

    return NextResponse.json({
      data: {
        avgRating: Math.round(avgRating * 10) / 10,
        totalReviews,
        thisMonth,
        responseRate,
        distribution,
        trend,
        bySource,
      },
    });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized") || error.message?.includes("permission")) {
      return forbiddenResponse(error.message);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
