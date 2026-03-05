"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calendar as CalendarIcon,
  Ship,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Loader2,
  Trash2,
  Anchor,
} from "lucide-react";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  isSameDay,
  parseISO,
} from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

interface Tour {
  id: string;
  name: string;
  slug: string;
}

interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url: string | null;
}

interface Availability {
  id: string;
  tour_id: string;
  tour_name: string;
  date: string;
  start_time: string;
  end_time: string;
  booked_count: number;
  capacity: number;
  assigned_staff: Array<{
    staff_id: string;
    staff_name: string;
    role: string;
  }>;
}

function AssignStaffContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTour = searchParams.get('tour');

  const [loading, setLoading] = useState(true);
  const [tours, setTours] = useState<Tour[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [selectedTour, setSelectedTour] = useState(initialTour || "all");
  const [currentWeek, setCurrentWeek] = useState(new Date());

  // Assignment dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedAvailability, setSelectedAvailability] = useState<Availability | null>(null);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const supabase = createClient();

      // Fetch tours
      const { data: toursData } = await supabase
        .from('tours')
        .select('id, name, slug')
        .eq('status', 'active')
        .order('name');

      if (toursData) {
        setTours(toursData);
      }

      // Fetch staff (captains and guides)
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, name, email, role, avatar_url')
        .in('role', ['captain', 'guide'])
        .eq('is_active', true)
        .order('name');

      if (staffData) {
        setStaff(staffData);
      }

      // Fetch availabilities for the week
      await fetchAvailabilities();

      setLoading(false);
    };

    fetchData();
  }, []);

  useEffect(() => {
    fetchAvailabilities();
  }, [currentWeek, selectedTour]);

  const fetchAvailabilities = async () => {
    const supabase = createClient();

    let query = supabase
      .from('availabilities')
      .select(`
        id,
        tour_id,
        date,
        start_time,
        end_time,
        booked_count,
        capacity_override,
        tours!inner (
          name,
          max_capacity
        ),
        availability_staff (
          staff_id,
          role,
          staff!inner (
            name
          )
        )
      `)
      .gte('date', format(weekStart, 'yyyy-MM-dd'))
      .lte('date', format(weekEnd, 'yyyy-MM-dd'))
      .neq('status', 'cancelled')
      .order('date')
      .order('start_time');

    if (selectedTour && selectedTour !== 'all') {
      query = query.eq('tour_id', selectedTour);
    }

    const { data } = await query;

    if (data) {
      setAvailabilities(data.map((a: any) => ({
        id: a.id,
        tour_id: a.tour_id,
        tour_name: a.tours.name,
        date: a.date,
        start_time: a.start_time,
        end_time: a.end_time,
        booked_count: a.booked_count,
        capacity: a.capacity_override || a.tours.max_capacity,
        assigned_staff: (a.availability_staff || []).map((as: any) => ({
          staff_id: as.staff_id,
          staff_name: as.staff.name,
          role: as.role,
        })),
      })));
    }
  };

  const openAssignDialog = (availability: Availability) => {
    setSelectedAvailability(availability);
    setSelectedStaffIds(availability.assigned_staff.map(s => s.staff_id));
    setAssignDialogOpen(true);
  };

  const handleSaveAssignments = async () => {
    if (!selectedAvailability) return;

    setSaving(true);
    try {
      const supabase = createClient();

      // Delete existing assignments
      await supabase
        .from('availability_staff')
        .delete()
        .eq('availability_id', selectedAvailability.id);

      // Insert new assignments
      if (selectedStaffIds.length > 0) {
        const assignments = selectedStaffIds.map(staffId => {
          const staffMember = staff.find(s => s.id === staffId);
          return {
            availability_id: selectedAvailability.id,
            staff_id: staffId,
            role: staffMember?.role || 'guide',
          };
        });

        await supabase
          .from('availability_staff')
          .insert(assignments);
      }

      // Update local state
      setAvailabilities(prev => prev.map(a => {
        if (a.id !== selectedAvailability.id) return a;
        return {
          ...a,
          assigned_staff: selectedStaffIds.map(staffId => {
            const staffMember = staff.find(s => s.id === staffId);
            return {
              staff_id: staffId,
              staff_name: staffMember?.name || '',
              role: staffMember?.role || 'guide',
            };
          }),
        };
      }));

      toast.success("Staff assignments updated");
      setAssignDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update assignments");
    } finally {
      setSaving(false);
    }
  };

  const removeStaffFromSlot = async (availabilityId: string, staffId: string) => {
    try {
      const supabase = createClient();

      await supabase
        .from('availability_staff')
        .delete()
        .eq('availability_id', availabilityId)
        .eq('staff_id', staffId);

      setAvailabilities(prev => prev.map(a => {
        if (a.id !== availabilityId) return a;
        return {
          ...a,
          assigned_staff: a.assigned_staff.filter(s => s.staff_id !== staffId),
        };
      }));

      toast.success("Staff removed from slot");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove staff");
    }
  };

  const getAvailabilitiesForDay = (day: Date) => {
    return availabilities.filter(a => isSameDay(parseISO(a.date), day));
  };

  const captains = staff.filter(s => s.role === 'captain');
  const guides = staff.filter(s => s.role === 'guide');

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="h-96 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            Staff Assignments
          </h1>
          <p className="text-muted-foreground">
            Assign captains and guides to tour time slots
          </p>
        </div>

        <Link href="/dashboard/tours">
          <Button variant="outline" className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back to Tours
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <Select value={selectedTour} onValueChange={setSelectedTour}>
          <SelectTrigger className="w-[250px]">
            <Ship className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Tours" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tours</SelectItem>
            {tours.map(tour => (
              <SelectItem key={tour.id} value={tour.id}>{tour.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="px-4 py-2 bg-muted rounded-lg font-medium">
            {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeek(new Date())}
          >
            Today
          </Button>
        </div>
      </div>

      {/* Staff Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Anchor className="h-4 w-4" />
              Captains
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {captains.length === 0 ? (
                <p className="text-sm text-muted-foreground">No captains available</p>
              ) : (
                captains.map(captain => (
                  <Badge key={captain.id} variant="outline" className="py-1">
                    {captain.name}
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Guides
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {guides.length === 0 ? (
                <p className="text-sm text-muted-foreground">No guides available</p>
              ) : (
                guides.map(guide => (
                  <Badge key={guide.id} variant="outline" className="py-1">
                    {guide.name}
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Week View */}
      <Card>
        <div className="overflow-x-auto">
          <div className="grid grid-cols-7 min-w-[800px]">
            {weekDays.map(day => {
              const dayAvailabilities = getAvailabilitiesForDay(day);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "border-r last:border-r-0 min-h-[300px]",
                    isToday && "bg-primary/5"
                  )}
                >
                  {/* Day Header */}
                  <div className={cn(
                    "p-3 border-b text-center",
                    isToday && "bg-primary/10"
                  )}>
                    <p className="text-xs text-muted-foreground">{format(day, "EEE")}</p>
                    <p className={cn(
                      "text-lg font-semibold",
                      isToday && "text-primary"
                    )}>
                      {format(day, "d")}
                    </p>
                  </div>

                  {/* Slots */}
                  <div className="p-2 space-y-2">
                    {dayAvailabilities.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No tours
                      </p>
                    ) : (
                      dayAvailabilities.map(availability => (
                        <div
                          key={availability.id}
                          className={cn(
                            "p-2 rounded-lg border text-xs cursor-pointer hover:shadow-md transition-shadow",
                            availability.assigned_staff.length === 0
                              ? "bg-orange-50 border-orange-200"
                              : "bg-green-50 border-green-200"
                          )}
                          onClick={() => openAssignDialog(availability)}
                        >
                          <p className="font-medium truncate">{availability.tour_name}</p>
                          <p className="text-muted-foreground">
                            {availability.start_time.slice(0, 5)}
                          </p>
                          <div className="mt-1">
                            {availability.assigned_staff.length === 0 ? (
                              <Badge variant="outline" className="text-xs bg-orange-100">
                                Unassigned
                              </Badge>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {availability.assigned_staff.map(s => (
                                  <Badge
                                    key={s.staff_id}
                                    variant="outline"
                                    className={cn(
                                      "text-xs",
                                      s.role === 'captain'
                                        ? "bg-indigo-100 text-indigo-800"
                                        : "bg-purple-100 text-purple-800"
                                    )}
                                  >
                                    {s.staff_name.split(' ')[0]}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Staff</DialogTitle>
          </DialogHeader>

          {selectedAvailability && (
            <div className="space-y-4">
              {/* Slot Info */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedAvailability.tour_name}</p>
                <p className="text-sm text-muted-foreground">
                  {format(parseISO(selectedAvailability.date), "EEEE, MMM d")} at {selectedAvailability.start_time.slice(0, 5)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedAvailability.booked_count}/{selectedAvailability.capacity} guests booked
                </p>
              </div>

              {/* Captains */}
              {captains.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Captains</Label>
                  <div className="mt-2 space-y-2">
                    {captains.map(captain => (
                      <div
                        key={captain.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                        onClick={() => {
                          if (selectedStaffIds.includes(captain.id)) {
                            setSelectedStaffIds(prev => prev.filter(id => id !== captain.id));
                          } else {
                            setSelectedStaffIds(prev => [...prev, captain.id]);
                          }
                        }}
                      >
                        <Checkbox
                          checked={selectedStaffIds.includes(captain.id)}
                          onCheckedChange={() => {}}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={captain.avatar_url || undefined} />
                          <AvatarFallback className="bg-indigo-100 text-indigo-800 text-xs">
                            {captain.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{captain.name}</p>
                          <p className="text-xs text-muted-foreground">{captain.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Guides */}
              {guides.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Guides</Label>
                  <div className="mt-2 space-y-2">
                    {guides.map(guide => (
                      <div
                        key={guide.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                        onClick={() => {
                          if (selectedStaffIds.includes(guide.id)) {
                            setSelectedStaffIds(prev => prev.filter(id => id !== guide.id));
                          } else {
                            setSelectedStaffIds(prev => [...prev, guide.id]);
                          }
                        }}
                      >
                        <Checkbox
                          checked={selectedStaffIds.includes(guide.id)}
                          onCheckedChange={() => {}}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={guide.avatar_url || undefined} />
                          <AvatarFallback className="bg-purple-100 text-purple-800 text-xs">
                            {guide.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{guide.name}</p>
                          <p className="text-xs text-muted-foreground">{guide.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {staff.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No captains or guides available</p>
                  <Link href="/dashboard/staff">
                    <Button variant="link" size="sm">Add Staff Members</Button>
                  </Link>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveAssignments}
              disabled={saving}
              className="gradient-primary border-0"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Assignments"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AssignStaffPage() {
  return (
    <Suspense fallback={
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="h-96 bg-muted rounded-lg" />
        </div>
      </div>
    }>
      <AssignStaffContent />
    </Suspense>
  );
}
