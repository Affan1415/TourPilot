"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  Camera,
  Ship,
  Clock,
  MapPin,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Shield,
  FileCheck,
  Send,
  Anchor,
  Check,
  X,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { ChecklistItem } from "@/types";

interface TourInfo {
  id: string;
  availabilityId: string;
  name: string;
  date: string;
  time: string;
  endTime: string;
  location: string;
  meetingPoint: string;
  guestCount: number;
  capacity: number;
}

interface ChecklistState {
  [itemId: string]: {
    checked: boolean;
    photoUrl?: string;
    note?: string;
    textValue?: string;
  };
}

interface AvailableTour {
  availability_id: string;
  date: string;
  start_time: string;
  tour_name: string;
  guest_count: number;
}

function CaptainChecklistContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const availabilityId = searchParams.get('availability');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tourInfo, setTourInfo] = useState<TourInfo | null>(null);
  const [template, setTemplate] = useState<{
    id: string;
    name: string;
    description: string | null;
    items: ChecklistItem[];
  } | null>(null);
  const [checklistState, setChecklistState] = useState<ChecklistState>({});
  const [notes, setNotes] = useState("");
  const [staffId, setStaffId] = useState<string | null>(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [availableTours, setAvailableTours] = useState<AvailableTour[]>([]);

  useEffect(() => {
    if (availabilityId) {
      fetchData();
    } else {
      fetchAvailableTours();
    }
  }, [availabilityId]);

  const fetchAvailableTours = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/captain-login');
        return;
      }

      const { data: staffData } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!staffData) {
        setLoading(false);
        return;
      }

      setStaffId(staffData.id);

      // Fetch today's assigned tours
      const today = format(new Date(), 'yyyy-MM-dd');

      const { data: assignedTours } = await supabase
        .from('availability_staff')
        .select(`
          availability_id,
          availabilities!inner (
            id,
            date,
            start_time,
            booked_count,
            tours!inner (
              name
            )
          )
        `)
        .eq('staff_id', staffData.id)
        .eq('availabilities.date', today);

      if (assignedTours && assignedTours.length > 0) {
        const tours: AvailableTour[] = assignedTours.map((a: any) => ({
          availability_id: a.availabilities.id,
          date: a.availabilities.date,
          start_time: a.availabilities.start_time,
          tour_name: a.availabilities.tours.name,
          guest_count: a.availabilities.booked_count || 0,
        }));
        setAvailableTours(tours);
      }
    } catch (error) {
      console.error('Error fetching available tours:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Get current user's staff ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/captain-login');
        return;
      }

      const { data: staffData } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!staffData) {
        toast.error("Staff record not found");
        return;
      }

      setStaffId(staffData.id);

      // Fetch availability and tour info
      const { data: availability } = await supabase
        .from('availabilities')
        .select(`
          id,
          date,
          start_time,
          end_time,
          booked_count,
          capacity_override,
          tours!inner (
            id,
            name,
            location,
            meeting_point,
            max_capacity
          )
        `)
        .eq('id', availabilityId)
        .single();

      if (!availability) {
        toast.error("Tour not found");
        return;
      }

      const tour = (availability as any).tours;
      setTourInfo({
        id: tour.id,
        availabilityId: availability.id,
        name: tour.name,
        date: availability.date,
        time: availability.start_time?.substring(0, 5) || '',
        endTime: availability.end_time?.substring(0, 5) || '',
        location: tour.location || '',
        meetingPoint: tour.meeting_point || 'See tour details',
        guestCount: availability.booked_count || 0,
        capacity: availability.capacity_override || tour.max_capacity || 10,
      });

      // Fetch checklist template (tour-specific or default)
      const { data: templates } = await supabase
        .from('checklist_templates')
        .select('*')
        .eq('is_active', true)
        .or(`tour_id.eq.${tour.id},tour_id.is.null`)
        .order('tour_id', { ascending: false, nullsFirst: false })
        .limit(1);

      if (templates && templates.length > 0) {
        const tmpl = templates[0];
        setTemplate({
          id: tmpl.id,
          name: tmpl.name,
          description: tmpl.description,
          items: tmpl.items as ChecklistItem[],
        });

        // Initialize checklist state
        const initialState: ChecklistState = {};
        (tmpl.items as ChecklistItem[]).forEach((item) => {
          initialState[item.id] = { checked: false };
        });
        setChecklistState(initialState);
      }

      // Check if already completed
      const { data: existing } = await supabase
        .from('checklist_completions')
        .select('id')
        .eq('availability_id', availabilityId)
        .eq('captain_id', staffData.id)
        .single();

      if (existing) {
        setAlreadyCompleted(true);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error("Failed to load checklist");
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (itemId: string) => {
    setChecklistState((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        checked: !prev[itemId]?.checked,
      },
    }));
  };

  const updateTextValue = (itemId: string, textValue: string) => {
    setChecklistState((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        textValue,
      },
    }));
  };

  const getCompletionStats = () => {
    if (!template) return { completed: 0, total: 0, required: 0, requiredComplete: 0 };

    const total = template.items.length;
    const completed = Object.values(checklistState).filter((s) => s.checked).length;
    const requiredItems = template.items.filter((i) => i.required);
    const requiredComplete = requiredItems.filter((i) => checklistState[i.id]?.checked).length;

    return { completed, total, required: requiredItems.length, requiredComplete };
  };

  const canSubmit = () => {
    if (!template) return false;
    const requiredItems = template.items.filter((i) => i.required);
    const allRequiredChecked = requiredItems.every((item) => checklistState[item.id]?.checked);

    // Also check that all items requiring text have a value
    const textItems = template.items.filter((i) => i.requiresText);
    const allTextFilled = textItems.every((item) => {
      const state = checklistState[item.id];
      return state?.textValue && state.textValue.trim().length > 0;
    });

    return allRequiredChecked && allTextFilled;
  };

  const handleSubmit = async () => {
    if (!canSubmit() || !template || !staffId || !availabilityId) return;

    setSubmitting(true);
    try {
      const supabase = createClient();

      const completedItems = Object.entries(checklistState).map(([itemId, state]) => ({
        itemId,
        checked: state.checked,
        photoUrl: state.photoUrl,
        note: state.note,
        textValue: state.textValue,
      }));

      const { error } = await supabase
        .from('checklist_completions')
        .insert({
          checklist_template_id: template.id,
          availability_id: availabilityId,
          captain_id: staffId,
          completed_items: completedItems,
          notes: notes || null,
          completed_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success("Checklist completed successfully!");
      setShowConfirmDialog(false);

      // Navigate to manifest
      router.push(`/captain/manifest?availability=${availabilityId}&date=${tourInfo?.date}`);
    } catch (error: any) {
      console.error('Error submitting checklist:', error);
      toast.error(error.message || "Failed to submit checklist");
    } finally {
      setSubmitting(false);
    }
  };

  const stats = getCompletionStats();
  const progress = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading checklist...</p>
        </div>
      </div>
    );
  }

  if (!availabilityId) {
    return (
      <div className="h-full p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/captain')}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <Shield className="h-5 w-5 md:h-6 md:w-6 text-indigo-600" />
                Pre-Departure Checklist
              </h1>
              <p className="text-sm text-muted-foreground">
                Select a tour to complete the safety checklist
              </p>
            </div>
          </div>

          {availableTours.length > 0 ? (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">Today's Tours</h2>
              {availableTours.map((tour) => (
                <Card
                  key={tour.availability_id}
                  className="p-4 cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all"
                  onClick={() => router.push(`/captain/checklist?availability=${tour.availability_id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{tour.tour_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {tour.start_time.slice(0, 5)} • {tour.guest_count} guests
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">No Tours Today</h2>
              <p className="text-muted-foreground mb-4">
                You don't have any tours assigned for today.
              </p>
              <Button onClick={() => router.push('/captain')}>
                Go to Dashboard
              </Button>
            </Card>
          )}
        </div>
      </div>
    );
  }

  if (alreadyCompleted) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="max-w-md p-8 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Checklist Complete</h2>
          <p className="text-muted-foreground mb-4">
            You've already completed the pre-departure checklist for this tour.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => router.push('/captain')}>
              Dashboard
            </Button>
            <Button onClick={() => router.push(`/captain/manifest?availability=${availabilityId}&date=${tourInfo?.date}`)}>
              View Manifest
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="max-w-md p-8 text-center">
          <AlertTriangle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">No Checklist Available</h2>
          <p className="text-muted-foreground mb-4">
            There's no safety checklist configured for this tour. Contact your administrator.
          </p>
          <Button onClick={() => router.push('/captain')}>
            Go to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-indigo-50/50 to-background dark:from-indigo-950/20">
      {/* Header */}
      <div className="p-4 md:p-6 border-b bg-card">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/captain')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Shield className="h-5 w-5 md:h-6 md:w-6 text-indigo-600" />
              Pre-Departure Checklist
            </h1>
            <p className="text-sm text-muted-foreground">
              Complete all required items before departure
            </p>
          </div>
        </div>

        {/* Tour Info */}
        {tourInfo && (
          <Card className="bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center flex-shrink-0">
                  <Ship className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{tourInfo.name}</p>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(parseISO(tourInfo.date), "MMM d")} at {tourInfo.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {tourInfo.meetingPoint}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-indigo-600">{tourInfo.guestCount}</p>
                  <p className="text-xs text-muted-foreground">guests</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              {stats.completed} of {stats.total} items completed
            </span>
            <span className={cn(
              "font-medium",
              stats.requiredComplete === stats.required ? "text-green-600" : "text-orange-600"
            )}>
              {stats.requiredComplete}/{stats.required} required
            </span>
          </div>
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300 rounded-full",
                progress === 100 ? "bg-green-500" : "bg-indigo-500"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Checklist Items */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-2xl mx-auto space-y-3">
          {template.items.map((item, index) => {
            const isChecked = checklistState[item.id]?.checked || false;
            const textValue = checklistState[item.id]?.textValue || "";

            return (
              <div
                key={item.id}
                className={cn(
                  "w-full rounded-xl border-2 transition-all",
                  isChecked
                    ? "bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                )}
              >
                <button
                  onClick={() => toggleItem(item.id)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors"
                >
                  <div
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                      isChecked
                        ? "bg-green-500 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                    )}
                  >
                    {isChecked ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-medium",
                      isChecked && "text-green-800 dark:text-green-200"
                    )}>
                      {item.label}
                    </p>
                    {item.required && !isChecked && (
                      <p className="text-xs text-orange-600 mt-0.5">Required</p>
                    )}
                    {item.requiresText && !textValue && (
                      <p className="text-xs text-orange-600 mt-0.5">Text input required</p>
                    )}
                  </div>

                  {item.requiresPhoto && (
                    <div className="flex-shrink-0">
                      <Camera className="h-5 w-5 text-slate-400" />
                    </div>
                  )}
                </button>

                {item.requiresText && (
                  <div className="px-4 pb-4">
                    <Input
                      placeholder={item.textPlaceholder || "Enter value..."}
                      value={textValue}
                      onChange={(e) => updateTextValue(item.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        "mt-1",
                        textValue && "border-green-300 dark:border-green-700"
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Notes Section */}
          <div className="pt-4">
            <label className="block text-sm font-medium mb-2">
              Additional Notes (Optional)
            </label>
            <Textarea
              placeholder="Any notes or observations before departure..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="p-4 md:p-6 border-t bg-card">
        <div className="max-w-2xl mx-auto">
          <Button
            className={cn(
              "w-full h-14 text-lg gap-2",
              canSubmit()
                ? "bg-green-600 hover:bg-green-700"
                : "bg-slate-400 cursor-not-allowed"
            )}
            disabled={!canSubmit() || submitting}
            onClick={() => setShowConfirmDialog(true)}
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Submitting...
              </>
            ) : canSubmit() ? (
              <>
                <FileCheck className="h-5 w-5" />
                Complete Checklist
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5" />
                Complete All Required Items
              </>
            )}
          </Button>

          {!canSubmit() && (
            <p className="text-center text-sm text-orange-600 mt-2">
              {stats.required - stats.requiredComplete} required items remaining
            </p>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Confirm Checklist Completion
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-muted-foreground">
              You are about to confirm that all pre-departure safety checks have been completed for:
            </p>

            {tourInfo && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="font-semibold">{tourInfo.name}</p>
                <p className="text-sm text-muted-foreground">
                  {format(parseISO(tourInfo.date), "EEEE, MMMM d")} at {tourInfo.time}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-green-800 dark:text-green-200">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">
                All {stats.required} required items have been checked
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowConfirmDialog(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Confirm & Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CaptainChecklistPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    }>
      <CaptainChecklistContent />
    </Suspense>
  );
}
