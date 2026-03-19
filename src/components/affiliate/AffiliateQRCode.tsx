"use client";

import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Printer, Download, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface AffiliateQRCodeProps {
  affiliateCode: string;
  locationName?: string;
  discountValue?: number;
  discountType?: "percentage" | "fixed";
  baseUrl?: string;
}

export function AffiliateQRCode({
  affiliateCode,
  locationName,
  discountValue = 5,
  discountType = "percentage",
  baseUrl = typeof window !== "undefined" ? window.location.origin : "",
}: AffiliateQRCodeProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const referralUrl = `${baseUrl}/book?ref=${affiliateCode}`;

  const discountText =
    discountType === "percentage"
      ? `${discountValue}% off`
      : `$${discountValue} off`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print");
      return;
    }

    const qrSvg = qrRef.current?.querySelector("svg");
    if (!qrSvg) return;

    const svgData = new XMLSerializer().serializeToString(qrSvg);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Affiliate QR Code - ${affiliateCode}</title>
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 40px;
              box-sizing: border-box;
            }
            .container {
              text-align: center;
              max-width: 400px;
            }
            .location {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 20px;
              color: #333;
            }
            .qr-container {
              background: white;
              padding: 20px;
              border-radius: 16px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              display: inline-block;
              margin-bottom: 20px;
            }
            .qr-container svg {
              display: block;
            }
            .discount {
              font-size: 28px;
              font-weight: bold;
              color: #059669;
              margin: 20px 0;
            }
            .code {
              font-size: 20px;
              color: #666;
              margin-bottom: 10px;
              font-family: monospace;
              background: #f5f5f5;
              padding: 8px 16px;
              border-radius: 8px;
              display: inline-block;
            }
            .cta {
              font-size: 16px;
              color: #888;
              margin-top: 20px;
            }
            .url {
              font-size: 12px;
              color: #999;
              word-break: break-all;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            ${locationName ? `<div class="location">${locationName}</div>` : ""}
            <div class="qr-container">
              ${svgData}
            </div>
            <div class="discount">Scan for ${discountText}!</div>
            <div class="code">${affiliateCode}</div>
            <div class="cta">Book your adventure today</div>
            <div class="url">${referralUrl}</div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleDownload = () => {
    const qrSvg = qrRef.current?.querySelector("svg");
    if (!qrSvg) return;

    const svgData = new XMLSerializer().serializeToString(qrSvg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);

      const link = document.createElement("a");
      link.download = `qr-code-${affiliateCode}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("QR code downloaded!");
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Card className="p-6">
      <div className="text-center">
        {locationName && (
          <h3 className="text-lg font-semibold mb-4">{locationName}</h3>
        )}

        <div
          ref={qrRef}
          className="inline-block bg-white p-4 rounded-xl shadow-sm border mb-4"
        >
          <QRCodeSVG
            value={referralUrl}
            size={200}
            level="H"
            includeMargin
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>

        <div className="mb-4">
          <p className="text-2xl font-bold text-emerald-600 mb-2">
            Scan for {discountText}!
          </p>
          <p className="text-sm text-muted-foreground mb-2">Your Referral Code</p>
          <p className="font-mono text-lg bg-muted px-4 py-2 rounded-lg inline-block">
            {affiliateCode}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <Button variant="outline" className="gap-2" onClick={handleCopyLink}>
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "Copied!" : "Copy Link"}
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleDownload}>
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Button className="gap-2 gradient-primary border-0" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-4 break-all">
          {referralUrl}
        </p>
      </div>
    </Card>
  );
}
