"use client";

import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eraser, Check, RotateCcw, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignaturePadProps {
  onSave: (signatureDataUrl: string) => void;
  onCancel: () => void;
  guestName: string;
  bookingId: string;
  saving?: boolean;
}

export function SignaturePad({ onSave, onCancel, guestName, bookingId, saving }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [waiverContent, setWaiverContent] = useState<string | null>(null);
  const [waiverName, setWaiverName] = useState<string>("Liability Waiver");
  const [loadingWaiver, setLoadingWaiver] = useState(true);
  const [showFullWaiver, setShowFullWaiver] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // Fetch waiver template
  useEffect(() => {
    const fetchWaiverTemplate = async () => {
      try {
        const response = await fetch(`/api/waivers/${bookingId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.waivers?.[0]?.waiver_template) {
            setWaiverContent(data.waivers[0].waiver_template.content);
            setWaiverName(data.waivers[0].waiver_template.name || "Liability Waiver");
          }
        }
      } catch (error) {
        console.error("Failed to fetch waiver template:", error);
      } finally {
        setLoadingWaiver(false);
      }
    };

    if (bookingId) {
      fetchWaiverTemplate();
    } else {
      setLoadingWaiver(false);
    }
  }, [bookingId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set up canvas for retina displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Set drawing styles
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Fill with white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw baseline
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, rect.height - 40);
    ctx.lineTo(rect.width - 20, rect.height - 40);
    ctx.stroke();

    // Reset styles for drawing
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
  }, []);

  const getCoordinates = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    const rect = canvas.getBoundingClientRect();

    // Clear and redraw background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Redraw baseline
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, rect.height - 40);
    ctx.lineTo(rect.width - 20, rect.height - 40);
    ctx.stroke();

    // Reset styles
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;

    setHasSignature(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
  };

  if (loadingWaiver) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[80vh] overflow-y-auto">
      {/* Waiver Content */}
      {waiverContent && (
        <div className="border rounded-lg bg-slate-50 dark:bg-slate-900">
          <div className="p-3 border-b bg-slate-100 dark:bg-slate-800">
            <h4 className="font-semibold text-sm">{waiverName}</h4>
          </div>
          <div className="p-3">
            <div
              className={cn(
                "prose prose-sm max-w-none overflow-hidden transition-all text-xs",
                showFullWaiver ? "max-h-none" : "max-h-32"
              )}
            >
              <div
                dangerouslySetInnerHTML={{ __html: waiverContent }}
                className="text-muted-foreground"
              />
            </div>
            {!showFullWaiver && (
              <div className="relative -mt-8 pt-8 bg-gradient-to-t from-slate-50 dark:from-slate-900 to-transparent" />
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 gap-1 h-8 text-xs"
              onClick={() => setShowFullWaiver(!showFullWaiver)}
            >
              {showFullWaiver ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Read Full Waiver
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Agreement Checkbox */}
      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
        <Checkbox
          id="agree-waiver"
          checked={agreed}
          onCheckedChange={(checked) => setAgreed(!!checked)}
        />
        <label htmlFor="agree-waiver" className="text-sm leading-relaxed cursor-pointer">
          I, <span className="font-semibold">{guestName}</span>, have read and understand the above waiver.
          I acknowledge the risks involved and voluntarily agree to assume all risks.
        </label>
      </div>

      {/* Signature Canvas */}
      <div>
        <p className="text-sm font-medium mb-2">Signature</p>
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="w-full h-40 border-2 border-dashed border-slate-300 rounded-xl bg-white touch-none cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {!hasSignature && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-slate-400 text-sm">Sign here</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={clearSignature}
          disabled={!hasSignature || saving}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Clear
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          className={cn(
            "flex-1",
            hasSignature && agreed ? "bg-green-600 hover:bg-green-700" : ""
          )}
          disabled={!hasSignature || !agreed || saving}
          onClick={handleSave}
        >
          {saving ? (
            <span className="animate-pulse">Saving...</span>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Confirm Signature
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        By signing above, the guest acknowledges they have read and agree to the waiver terms.
      </p>
    </div>
  );
}
