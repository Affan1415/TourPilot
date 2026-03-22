"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Star,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Search,
  MoreVertical,
  Send,
  RefreshCw,
  Flag,
  Eye,
  EyeOff,
  Loader2,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Platform configs
const platformConfig: Record<string, { name: string; color: string; icon: string }> = {
  tripadvisor: { name: "TripAdvisor", color: "bg-green-500", icon: "🦉" },
  google: { name: "Google", color: "bg-blue-500", icon: "G" },
  yelp: { name: "Yelp", color: "bg-red-500", icon: "Y" },
  facebook: { name: "Facebook", color: "bg-blue-600", icon: "f" },
  internal: { name: "Direct", color: "bg-purple-500", icon: "✓" },
};

interface Review {
  id: string;
  source: string;
  author_name: string;
  author_avatar_url?: string;
  rating: number;
  title?: string;
  content: string;
  review_date: string;
  external_url?: string;
  status: string;
  response?: string;
  response_date?: string;
  tour?: { id: string; name: string };
}

interface ReviewStats {
  avgRating: number;
  totalReviews: number;
  thisMonth: number;
  responseRate: number;
  distribution: Record<number, number>;
  trend: number;
  bySource: Record<string, number>;
}

export default function ReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [responseText, setResponseText] = useState("");
  const [responding, setResponding] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (sourceFilter !== "all") params.set("source", sourceFilter);
      if (ratingFilter) params.set("rating", ratingFilter.toString());
      if (searchQuery) params.set("search", searchQuery);

      const [reviewsRes, statsRes] = await Promise.all([
        fetch(`/api/reviews?${params}`),
        fetch("/api/reviews/stats"),
      ]);

      if (!reviewsRes.ok || !statsRes.ok) {
        throw new Error("Failed to fetch reviews data");
      }

      const [reviewsData, statsData] = await Promise.all([
        reviewsRes.json(),
        statsRes.json(),
      ]);

      setReviews(reviewsData.data || []);
      setStats(statsData.data || null);
    } catch (err) {
      console.error("Error fetching reviews:", err);
      setError(err instanceof Error ? err.message : "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [sourceFilter, ratingFilter, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    await new Promise((r) => setTimeout(r, 2000));
    await fetchData();
    setSyncing(false);
    toast.success("Reviews synced", { description: "Fetched latest reviews from connected platforms." });
  };

  const handleRespond = async () => {
    if (!selectedReview || !responseText.trim()) return;

    setResponding(true);
    try {
      const res = await fetch(`/api/reviews/${selectedReview.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: responseText }),
      });

      if (!res.ok) {
        throw new Error("Failed to post response");
      }

      const { data } = await res.json();

      setReviews((prev) =>
        prev.map((r) =>
          r.id === selectedReview.id
            ? { ...r, response: data.response, response_date: data.response_date }
            : r
        )
      );

      setResponseText("");
      setSelectedReview(null);
      toast.success("Response posted", {
        description: selectedReview.source === "internal"
          ? "Response saved."
          : `Response will be posted to ${platformConfig[selectedReview.source]?.name}.`,
      });
    } catch (err) {
      toast.error("Failed to post response");
    } finally {
      setResponding(false);
    }
  };

  const handleUpdateStatus = async (reviewId: string, status: string) => {
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, status } : r))
      );

      toast.success(`Review ${status}`);
    } catch (err) {
      toast.error("Failed to update review status");
    }
  };

  const renderStars = (rating: number, size = "h-4 w-4") => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              size,
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            )}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">Failed to load reviews</p>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchData}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
            Reviews
          </h1>
          <p className="text-muted-foreground">
            Monitor and respond to customer reviews across all platforms
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={handleSync} disabled={syncing}>
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sync Reviews
          </Button>
          <Button className="gap-2 gradient-primary border-0">
            <Send className="h-4 w-4" />
            Request Reviews
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Average Rating</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-3xl font-bold">{stats.avgRating}</span>
                    <div className="flex items-center gap-1 text-sm">
                      {stats.trend >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className={stats.trend >= 0 ? "text-green-600" : "text-red-600"}>
                        {stats.trend >= 0 ? "+" : ""}{stats.trend}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Total Reviews</p>
              <p className="text-3xl font-bold mt-1">{stats.totalReviews}</p>
              <p className="text-sm text-muted-foreground mt-1">
                +{stats.thisMonth} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Response Rate</p>
              <p className="text-3xl font-bold mt-1">{stats.responseRate}%</p>
              <Progress value={stats.responseRate} className="mt-2 h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">Rating Distribution</p>
              <div className="space-y-1">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = stats.distribution[rating] || 0;
                  const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                  return (
                    <div key={rating} className="flex items-center gap-2 text-xs">
                      <span className="w-3">{rating}</span>
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-muted-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reviews..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              {sourceFilter === "all" ? "All Platforms" : platformConfig[sourceFilter]?.name}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setSourceFilter("all")}>
              All Platforms
            </DropdownMenuItem>
            {Object.entries(platformConfig).map(([key, config]) => (
              <DropdownMenuItem key={key} onClick={() => setSourceFilter(key)}>
                <span className="mr-2">{config.icon}</span>
                {config.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              {ratingFilter ? `${ratingFilter} Stars` : "All Ratings"}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setRatingFilter(null)}>
              All Ratings
            </DropdownMenuItem>
            {[5, 4, 3, 2, 1].map((rating) => (
              <DropdownMenuItem key={rating} onClick={() => setRatingFilter(rating)}>
                {renderStars(rating, "h-3 w-3")}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No reviews found</p>
              <p className="text-muted-foreground">
                {searchQuery || sourceFilter !== "all" || ratingFilter
                  ? "Try adjusting your filters"
                  : "Reviews will appear here once customers submit them"}
              </p>
            </CardContent>
          </Card>
        ) : (
          reviews.map((review) => {
            const platform = platformConfig[review.source];
            return (
              <Card key={review.id} className={cn(review.status === "flagged" && "border-red-200")}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={review.author_avatar_url} />
                      <AvatarFallback>
                        {review.author_name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{review.author_name}</span>
                            <Badge
                              variant="secondary"
                              className={cn("text-xs text-white", platform?.color)}
                            >
                              {platform?.icon} {platform?.name}
                            </Badge>
                            {review.status === "flagged" && (
                              <Badge variant="destructive" className="text-xs">
                                <Flag className="h-3 w-3 mr-1" />
                                Flagged
                              </Badge>
                            )}
                            {review.status === "hidden" && (
                              <Badge variant="outline" className="text-xs">
                                <EyeOff className="h-3 w-3 mr-1" />
                                Hidden
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {renderStars(review.rating)}
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(review.review_date), { addSuffix: true })}
                            </span>
                            {review.tour && (
                              <>
                                <span className="text-muted-foreground">-</span>
                                <span className="text-sm text-primary">{review.tour.name}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {review.external_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => window.open(review.external_url, "_blank")}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedReview(review)}>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Respond
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(review.id, "flagged")}>
                                <Flag className="h-4 w-4 mr-2" />
                                Flag Review
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(review.id, "hidden")}>
                                <EyeOff className="h-4 w-4 mr-2" />
                                Hide Review
                              </DropdownMenuItem>
                              {review.status !== "published" && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(review.id, "published")}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Publish Review
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {review.title && (
                        <p className="font-medium mt-3">{review.title}</p>
                      )}
                      <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                        {review.content}
                      </p>

                      {review.response && (
                        <div className="mt-4 p-4 bg-muted rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              <MessageSquare className="h-3 w-3 mr-1" />
                              Business Response
                            </Badge>
                            {review.response_date && (
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(review.response_date), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                          <p className="text-sm">{review.response}</p>
                        </div>
                      )}

                      {!review.response && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-3 gap-2"
                          onClick={() => setSelectedReview(review)}
                        >
                          <MessageSquare className="h-4 w-4" />
                          Respond to review
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Response Dialog */}
      <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Respond to Review</DialogTitle>
          </DialogHeader>

          {selectedReview && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">{selectedReview.author_name}</span>
                  {renderStars(selectedReview.rating, "h-3 w-3")}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {selectedReview.content}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Your Response</label>
                <Textarea
                  placeholder="Write a thoughtful response..."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  rows={5}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedReview.source !== "internal"
                    ? `This response will be posted to ${platformConfig[selectedReview.source]?.name}.`
                    : "This response will be saved internally."}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReview(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleRespond}
              disabled={!responseText.trim() || responding}
              className="gap-2"
            >
              {responding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Post Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
