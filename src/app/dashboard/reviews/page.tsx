"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Filter,
  MoreVertical,
  Send,
  RefreshCw,
  ThumbsUp,
  Flag,
  Eye,
  EyeOff,
  Loader2,
  ChevronDown,
  Calendar,
  MapPin,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
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
  authorName: string;
  authorAvatar?: string;
  rating: number;
  title?: string;
  content: string;
  reviewDate: string;
  tourName?: string;
  response?: string;
  responseDate?: string;
  externalUrl?: string;
  status: string;
}

// Mock data
const mockReviews: Review[] = [
  {
    id: "1",
    source: "tripadvisor",
    authorName: "Sarah M.",
    rating: 5,
    title: "Best sunset tour ever!",
    content: "We had an absolutely amazing time on the sunset cruise. Captain Mike was knowledgeable, friendly, and made sure everyone was comfortable. The views were breathtaking and we even saw dolphins! Highly recommend booking this tour.",
    reviewDate: new Date(Date.now() - 86400000).toISOString(),
    tourName: "Sunset Cruise",
    externalUrl: "https://tripadvisor.com/review/123",
    status: "published",
  },
  {
    id: "2",
    source: "google",
    authorName: "John D.",
    authorAvatar: "https://lh3.googleusercontent.com/a-/example",
    rating: 4,
    content: "Great experience overall. The boat was clean and well-maintained. Only minor complaint was we had to wait about 15 minutes past our scheduled departure time. But once we got going, it was fantastic!",
    reviewDate: new Date(Date.now() - 172800000).toISOString(),
    tourName: "Morning Adventure",
    response: "Thank you for your feedback, John! We apologize for the delay and have addressed this with our team. We're glad you enjoyed the tour despite the wait!",
    responseDate: new Date(Date.now() - 86400000).toISOString(),
    externalUrl: "https://google.com/maps/review/456",
    status: "published",
  },
  {
    id: "3",
    source: "yelp",
    authorName: "Emily R.",
    rating: 5,
    title: "Perfect for families!",
    content: "Took my kids (ages 8 and 11) and they had the time of their lives. The crew was patient and made sure everyone felt safe. The snorkeling spot was beautiful with lots of fish to see. Will definitely be back!",
    reviewDate: new Date(Date.now() - 259200000).toISOString(),
    tourName: "Family Snorkel Adventure",
    status: "published",
  },
  {
    id: "4",
    source: "internal",
    authorName: "Michael T.",
    rating: 3,
    content: "The tour itself was nice but I felt it was a bit overpriced for what we got. The boat was smaller than expected.",
    reviewDate: new Date(Date.now() - 432000000).toISOString(),
    tourName: "Sunset Cruise",
    status: "published",
  },
  {
    id: "5",
    source: "google",
    authorName: "Anonymous",
    rating: 2,
    content: "Tour was cancelled last minute due to weather. I understand safety first, but the refund process took over a week.",
    reviewDate: new Date(Date.now() - 604800000).toISOString(),
    status: "flagged",
  },
];

const mockStats = {
  avgRating: 4.3,
  totalReviews: 247,
  thisMonth: 18,
  responseRate: 85,
  distribution: { 5: 156, 4: 52, 3: 21, 2: 12, 1: 6 },
  trend: +0.2,
};

export default function ReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState(mockStats);
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [responseText, setResponseText] = useState("");
  const [responding, setResponding] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setReviews(mockReviews);
      setLoading(false);
    }, 500);
  }, []);

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      review.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.title?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSource = sourceFilter === "all" || review.source === sourceFilter;
    const matchesRating = ratingFilter === null || review.rating === ratingFilter;

    return matchesSearch && matchesSource && matchesRating;
  });

  const handleSync = async () => {
    setSyncing(true);
    await new Promise((r) => setTimeout(r, 2000));
    setSyncing(false);
    toast.success("Reviews synced", { description: "Fetched 3 new reviews from connected platforms." });
  };

  const handleRespond = async () => {
    if (!selectedReview || !responseText.trim()) return;

    setResponding(true);
    await new Promise((r) => setTimeout(r, 1500));

    setReviews((prev) =>
      prev.map((r) =>
        r.id === selectedReview.id
          ? { ...r, response: responseText, responseDate: new Date().toISOString() }
          : r
      )
    );

    setResponding(false);
    setResponseText("");
    setSelectedReview(null);
    toast.success("Response posted", {
      description: selectedReview.source === "internal"
        ? "Response saved."
        : `Response will be posted to ${platformConfig[selectedReview.source]?.name}.`,
    });
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Rating</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-3xl font-bold">{stats.avgRating}</span>
                  <div className="flex items-center gap-1 text-sm">
                    {stats.trend > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className={stats.trend > 0 ? "text-green-600" : "text-red-600"}>
                      {stats.trend > 0 ? "+" : ""}{stats.trend}
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
                const count = stats.distribution[rating as keyof typeof stats.distribution];
                const percentage = (count / stats.totalReviews) * 100;
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
        {filteredReviews.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No reviews found</p>
              <p className="text-muted-foreground">
                {searchQuery || sourceFilter !== "all" || ratingFilter
                  ? "Try adjusting your filters"
                  : "Reviews will appear here once synced"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredReviews.map((review) => {
            const platform = platformConfig[review.source];
            return (
              <Card key={review.id} className={cn(review.status === "flagged" && "border-red-200")}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={review.authorAvatar} />
                      <AvatarFallback>
                        {review.authorName.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{review.authorName}</span>
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
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {renderStars(review.rating)}
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(review.reviewDate), { addSuffix: true })}
                            </span>
                            {review.tourName && (
                              <>
                                <span className="text-muted-foreground">-</span>
                                <span className="text-sm text-primary">{review.tourName}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {review.externalUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => window.open(review.externalUrl, "_blank")}
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
                              <DropdownMenuItem>
                                <Flag className="h-4 w-4 mr-2" />
                                Flag Review
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <EyeOff className="h-4 w-4 mr-2" />
                                Hide Review
                              </DropdownMenuItem>
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
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(review.responseDate!), { addSuffix: true })}
                            </span>
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
                  <span className="font-medium">{selectedReview.authorName}</span>
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
