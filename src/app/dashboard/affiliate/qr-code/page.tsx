"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Users, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AffiliateQRCode } from "@/components/affiliate/AffiliateQRCode";

interface AffiliateData {
  affiliate_code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  location: {
    name: string;
  };
}

export default function AffiliateQRCodePage() {
  const [loading, setLoading] = useState(true);
  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/affiliates/me");
        if (res.ok) {
          const { data } = await res.json();
          setAffiliateData(data);
        }
      } catch (error) {
        console.error("Error fetching affiliate data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="max-w-md mx-auto h-96 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (!affiliateData) {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Affiliate Profile Found</h2>
          <p className="text-muted-foreground">
            Your affiliate profile hasn't been set up yet.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/affiliate">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Your QR Code</h1>
          <p className="text-muted-foreground">
            Print or share your QR code to earn commissions
          </p>
        </div>
      </div>

      {/* QR Code */}
      <div className="max-w-md mx-auto">
        <AffiliateQRCode
          affiliateCode={affiliateData.affiliate_code}
          locationName={affiliateData.location.name}
          discountValue={affiliateData.discount_value}
          discountType={affiliateData.discount_type}
        />
      </div>

      {/* Tips */}
      <Card className="p-6 max-w-md mx-auto">
        <h3 className="font-semibold mb-3">Tips for Success</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            Print your QR code and display it in visible locations
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            Share your referral link on social media
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            Tell customers about the discount they'll receive
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            Track your referrals in the dashboard
          </li>
        </ul>
      </Card>
    </div>
  );
}
