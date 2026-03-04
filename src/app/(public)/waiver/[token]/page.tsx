"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertCircle,
  FileText,
  Eraser,
  Send,
  Shield,
  Calendar,
  Clock,
  Users,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";

interface WaiverData {
  id: string;
  status: string;
  signed_at: string | null;
  guest: {
    id: string;
    first_name: string;
    last_name: string;
  };
  booking: {
    booking_reference: string;
    guest_count: number;
    availability: {
      date: string;
      start_time: string;
      tour: {
        name: string;
      };
    };
  };
  waiver_template: {
    name: string;
    content: string;
  };
}

interface GuestWaiver {
  id: string;
  guestId: string;
  firstName: string;
  lastName: string;
  status: string;
  signedAt: string | null;
}

export default function WaiverSigningPage() {
  const params = useParams();
  const token = params.token as string;
  const sigCanvas = useRef<SignatureCanvas | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [waiverData, setWaiverData] = useState<WaiverData | null>(null);
  const [allGuestWaivers, setAllGuestWaivers] = useState<GuestWaiver[]>([]);
  const [selectedWaiverId, setSelectedWaiverId] = useState<string | null>(null);
  const [showFullWaiver, setShowFullWaiver] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  useEffect(() => {
    const fetchWaiverData = async () => {
      try {
        const supabase = createClient();

        // Fetch the waiver by ID (token)
        const { data: waiver, error: waiverError } = await supabase
          .from('waivers')
          .select(`
            id,
            status,
            signed_at,
            guest:booking_guests(id, first_name, last_name),
            booking:bookings(
              booking_reference,
              guest_count,
              availability:availabilities(
                date,
                start_time,
                tour:tours(name)
              )
            ),
            waiver_template:waiver_templates(name, content)
          `)
          .eq('id', token)
          .single();

        if (waiverError) {
          console.error('Error fetching waiver:', waiverError);
          setError('Waiver not found or has expired.');
          setLoading(false);
          return;
        }

        setWaiverData(waiver as unknown as WaiverData);

        // Also fetch all waivers for this booking to show status
        const bookingId = (waiver as any).booking?.id;
        if (bookingId) {
          const { data: allWaivers } = await supabase
            .from('waivers')
            .select(`
              id,
              status,
              signed_at,
              guest:booking_guests(id, first_name, last_name)
            `)
            .eq('booking_id', bookingId);

          if (allWaivers) {
            setAllGuestWaivers(allWaivers.map((w: any) => ({
              id: w.id,
              guestId: w.guest?.id,
              firstName: w.guest?.first_name,
              lastName: w.guest?.last_name,
              status: w.status,
              signedAt: w.signed_at,
            })));
          }
        } else {
          // If we can't get all waivers, just use the current one
          setAllGuestWaivers([{
            id: waiver.id,
            guestId: (waiver as any).guest?.id,
            firstName: (waiver as any).guest?.first_name,
            lastName: (waiver as any).guest?.last_name,
            status: waiver.status,
            signedAt: waiver.signed_at,
          }]);
        }

        // Set the current waiver as selected if not already signed
        if (waiver.status !== 'signed') {
          setSelectedWaiverId(waiver.id);
        }

      } catch (err: any) {
        console.error('Error:', err);
        setError('Failed to load waiver data.');
      } finally {
        setLoading(false);
      }
    };

    fetchWaiverData();
  }, [token]);

  const selectedWaiver = allGuestWaivers.find((w) => w.id === selectedWaiverId);
  const signedCount = allGuestWaivers.filter((w) => w.status === 'signed').length;
  const allSigned = allGuestWaivers.length > 0 && allGuestWaivers.every((w) => w.status === 'signed');

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  const handleSubmitWaiver = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty() || !selectedWaiverId || !agreed) {
      return;
    }

    setIsSigning(true);

    try {
      // Get signature as base64
      const signatureData = sigCanvas.current.toDataURL('image/png');

      // Get IP address (will be captured server-side, but we can try client-side too)
      let ipAddress = 'unknown';
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        ipAddress = ipData.ip;
      } catch {
        // Ignore IP fetch errors
      }

      // Submit to API
      const response = await fetch('/api/waivers/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          waiver_id: selectedWaiverId,
          signature_data: signatureData,
          ip_address: ipAddress,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit signature');
      }

      // Update local state
      setAllGuestWaivers((prev) =>
        prev.map((w) =>
          w.id === selectedWaiverId
            ? { ...w, status: 'signed', signedAt: new Date().toISOString() }
            : w
        )
      );

      // Find next unsigned waiver
      const nextUnsigned = allGuestWaivers.find(
        (w) => w.status !== 'signed' && w.id !== selectedWaiverId
      );

      setSelectedWaiverId(nextUnsigned?.id || null);
      setAgreed(false);
      sigCanvas.current?.clear();

    } catch (err: any) {
      console.error('Error submitting waiver:', err);
      alert(err.message || 'Failed to submit signature. Please try again.');
    } finally {
      setIsSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading waiver...</p>
        </div>
      </div>
    );
  }

  if (error || !waiverData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Waiver Not Found</h2>
            <p className="text-muted-foreground">
              {error || 'This waiver link may have expired or is invalid.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tourName = waiverData.booking?.availability?.tour?.name || 'Your Tour';
  const tourDate = waiverData.booking?.availability?.date;
  const tourTime = waiverData.booking?.availability?.start_time;
  const bookingRef = waiverData.booking?.booking_reference || '';
  const guestCount = waiverData.booking?.guest_count || allGuestWaivers.length;
  const waiverTemplate = waiverData.waiver_template;

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Sign Your Waiver</h1>
          <p className="text-muted-foreground">
            All guests must sign the liability waiver before the tour
          </p>
        </div>

        {/* Booking Info */}
        <Card className="mb-6 bg-gradient-to-r from-primary/5 to-primary/10 border-0">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <p className="font-semibold text-lg">{tourName}</p>
                <div className="flex flex-wrap gap-4 mt-1 text-sm text-muted-foreground">
                  {tourDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(tourDate), "MMM d, yyyy")}
                    </span>
                  )}
                  {tourTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {tourTime.substring(0, 5)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {guestCount} guests
                  </span>
                </div>
              </div>
              {bookingRef && (
                <Badge variant="outline" className="font-mono">
                  {bookingRef}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* All Signed Success */}
        {allSigned && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="py-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h2 className="text-xl font-semibold text-green-900 mb-2">
                All Waivers Signed!
              </h2>
              <p className="text-green-800">
                All {allGuestWaivers.length} guests have signed the waiver. You&apos;re all set for your adventure!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Guest Status List */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Guest Waiver Status</span>
              <Badge variant="secondary">
                {signedCount}/{allGuestWaivers.length} signed
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allGuestWaivers.map((guest) => {
                const isSigned = guest.status === 'signed';
                const isSelected = selectedWaiverId === guest.id;

                return (
                  <button
                    key={guest.id}
                    onClick={() => !isSigned && setSelectedWaiverId(guest.id)}
                    disabled={isSigned}
                    className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                      isSelected
                        ? "bg-primary/10 border-2 border-primary"
                        : isSigned
                        ? "bg-green-50 border border-green-200"
                        : "bg-muted/50 border border-transparent hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          isSigned
                            ? "bg-green-100 text-green-600"
                            : isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isSigned ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <span className="font-medium">
                            {guest.firstName?.[0] || ''}
                            {guest.lastName?.[0] || ''}
                          </span>
                        )}
                      </div>
                      <div className="text-left">
                        <p className="font-medium">
                          {guest.firstName} {guest.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {isSigned
                            ? `Signed ${guest.signedAt ? format(new Date(guest.signedAt), "MMM d, h:mm a") : "just now"}`
                            : isSelected
                            ? "Ready to sign"
                            : "Click to sign"}
                        </p>
                      </div>
                    </div>
                    <Badge className={isSigned ? "waiver-signed" : "waiver-pending"}>
                      {isSigned ? "Signed" : "Pending"}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Signing Section - Only show if there are unsigned guests */}
        {!allSigned && selectedWaiver && selectedWaiver.status !== 'signed' && (
          <>
            {/* Waiver Content */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  {waiverTemplate?.name || 'Liability Waiver'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`prose prose-sm max-w-none overflow-hidden transition-all ${
                    showFullWaiver ? "max-h-none" : "max-h-64"
                  }`}
                >
                  <div
                    dangerouslySetInnerHTML={{ __html: waiverTemplate?.content || '' }}
                    className="text-sm text-muted-foreground"
                  />
                </div>
                {!showFullWaiver && (
                  <div className="relative -mt-12 pt-12 bg-gradient-to-t from-card to-transparent" />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 gap-2"
                  onClick={() => setShowFullWaiver(!showFullWaiver)}
                >
                  {showFullWaiver ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Read Full Waiver
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Signature Section */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>
                  Sign for: {selectedWaiver.firstName} {selectedWaiver.lastName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Agreement Checkbox */}
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl">
                  <Checkbox
                    id="agree"
                    checked={agreed}
                    onCheckedChange={(checked) => setAgreed(!!checked)}
                  />
                  <label htmlFor="agree" className="text-sm leading-relaxed cursor-pointer">
                    I, <span className="font-semibold">{selectedWaiver.firstName} {selectedWaiver.lastName}</span>,
                    have read and understand the above waiver. I acknowledge the risks involved and
                    voluntarily agree to assume all risks and release the tour operator from any liability.
                  </label>
                </div>

                {/* Signature Pad */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Your Signature</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSignature}
                      className="h-8 gap-1 text-muted-foreground"
                    >
                      <Eraser className="h-4 w-4" />
                      Clear
                    </Button>
                  </div>
                  <div className="border-2 border-dashed rounded-xl bg-white relative">
                    <SignatureCanvas
                      ref={sigCanvas}
                      canvasProps={{
                        className: "w-full h-48 rounded-xl",
                        style: { width: "100%", height: "192px" },
                      }}
                      backgroundColor="white"
                    />
                    <p className="absolute bottom-2 left-4 text-xs text-muted-foreground">
                      Sign above using your mouse or finger
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  className="w-full h-12 gradient-primary border-0 shadow-lg shadow-primary/25"
                  disabled={!agreed || isSigning}
                  onClick={handleSubmitWaiver}
                >
                  {isSigning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Signed Waiver
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By submitting, you electronically sign this waiver. Your IP address and timestamp will be recorded.
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {/* Info Box */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Important</p>
                <p className="text-sm text-blue-800">
                  Each guest must sign their own waiver. If signing for a minor,
                  a parent or legal guardian must sign on their behalf.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
