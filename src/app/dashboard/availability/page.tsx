'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  CalendarDays,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Clock,
  Users,
  DollarSign,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Repeat,
  Loader2,
  Play,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks } from 'date-fns';

interface Tour {
  id: string;
  name: string;
  duration_minutes: number;
  base_price: number;
  max_capacity: number;
}

interface TimeSlot {
  id: string;
  tour_id: string;
  tour?: { id: string; name: string; base_price: number; max_capacity: number } | null;
  date: string;
  start_time: string;
  end_time: string;
  capacity_override: number | null;
  price_override: number | null;
  booked_count: number;
  status: 'available' | 'full' | 'cancelled';
}

interface RecurringSchedule {
  id: string;
  tour_id: string;
  tour?: { id: string; name: string; base_price: number; max_capacity: number } | null;
  name: string | null;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  capacity_override: number | null;
  price_override: number | null;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AvailabilityPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([]);
  const [selectedTour, setSelectedTour] = useState<string>('all');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [isAddSlotOpen, setIsAddSlotOpen] = useState(false);
  const [isAddScheduleOpen, setIsAddScheduleOpen] = useState(false);
  const [savingSlot, setSavingSlot] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [generatingSlots, setGeneratingSlots] = useState<string | null>(null);
  const [isBlackoutOpen, setIsBlackoutOpen] = useState(false);
  const [savingBlackout, setSavingBlackout] = useState(false);
  const [blackoutDates, setBlackoutDates] = useState({
    tour_id: 'all',
    start_date: new Date(),
    end_date: addDays(new Date(), 1),
    reason: '',
  });

  const [newSlot, setNewSlot] = useState({
    tour_id: '',
    date: new Date(),
    start_time: '09:00',
    end_time: '11:00',
    capacity: '',
    price: '',
  });

  const [newSchedule, setNewSchedule] = useState({
    tour_id: '',
    days_of_week: [] as number[],
    start_time: '09:00',
    end_time: '11:00',
    capacity: '',
    price_override: '',
    valid_from: new Date(),
    valid_until: null as Date | null,
  });

  const weekStart = useMemo(() => startOfWeek(currentWeek, { weekStartsOn: 0 }), [currentWeek]);
  const weekEnd = useMemo(() => endOfWeek(currentWeek, { weekStartsOn: 0 }), [currentWeek]);
  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(addDays(weekEnd, 14), 'yyyy-MM-dd');

      const [toursRes, slotsRes, schedulesRes] = await Promise.all([
        fetch('/api/tours'),
        fetch(`/api/availabilities?start_date=${startDate}&end_date=${endDate}`),
        fetch('/api/recurring-schedules'),
      ]);

      if (!toursRes.ok || !slotsRes.ok || !schedulesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [toursData, slotsData, schedulesData] = await Promise.all([
        toursRes.json(),
        slotsRes.json(),
        schedulesRes.json(),
      ]);

      setTours(toursData.data || []);
      setSlots(slotsData.data || []);
      setSchedules(schedulesData.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error fetching availability data:', err);
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredSlots = slots.filter(slot =>
    selectedTour === 'all' || slot.tour_id === selectedTour
  );

  const getSlotsByDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return filteredSlots.filter(slot => slot.date === dateStr);
  };

  const getTourName = (slot: TimeSlot) => slot.tour?.name || 'Unknown Tour';
  const getCapacity = (slot: TimeSlot) => slot.capacity_override || slot.tour?.max_capacity || 10;
  const getPrice = (slot: TimeSlot) => slot.price_override || slot.tour?.base_price || 0;

  const handleAddSlot = async () => {
    const tour = tours.find(t => t.id === newSlot.tour_id);
    if (!tour) {
      toast.error('Please select a tour');
      return;
    }

    setSavingSlot(true);
    try {
      const response = await fetch('/api/availabilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tour_id: newSlot.tour_id,
          date: format(newSlot.date, 'yyyy-MM-dd'),
          start_time: newSlot.start_time,
          end_time: newSlot.end_time,
          capacity_override: newSlot.capacity ? parseInt(newSlot.capacity) : null,
          price_override: newSlot.price ? parseFloat(newSlot.price) : null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create time slot');
      }

      setSlots([...slots, result.data]);
      setIsAddSlotOpen(false);
      setNewSlot({
        tour_id: '',
        date: new Date(),
        start_time: '09:00',
        end_time: '11:00',
        capacity: '',
        price: '',
      });
      toast.success('Time slot added');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create time slot');
    } finally {
      setSavingSlot(false);
    }
  };

  const handleAddSchedule = async () => {
    const tour = tours.find(t => t.id === newSchedule.tour_id);
    if (!tour) {
      toast.error('Please select a tour');
      return;
    }
    if (newSchedule.days_of_week.length === 0) {
      toast.error('Please select at least one day');
      return;
    }

    setSavingSchedule(true);
    try {
      const response = await fetch('/api/recurring-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tour_id: newSchedule.tour_id,
          days_of_week: newSchedule.days_of_week,
          start_time: newSchedule.start_time,
          end_time: newSchedule.end_time,
          capacity_override: newSchedule.capacity ? parseInt(newSchedule.capacity) : null,
          price_override: newSchedule.price_override ? parseFloat(newSchedule.price_override) : null,
          valid_from: format(newSchedule.valid_from, 'yyyy-MM-dd'),
          valid_until: newSchedule.valid_until ? format(newSchedule.valid_until, 'yyyy-MM-dd') : null,
          is_active: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create schedule');
      }

      setSchedules([...schedules, result.data]);
      setIsAddScheduleOpen(false);
      setNewSchedule({
        tour_id: '',
        days_of_week: [],
        start_time: '09:00',
        end_time: '11:00',
        capacity: '',
        price_override: '',
        valid_from: new Date(),
        valid_until: null,
      });
      toast.success('Recurring schedule created');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create schedule');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    try {
      const response = await fetch(`/api/availabilities/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete slot');
      }

      setSlots(slots.filter(s => s.id !== id));
      toast.success('Time slot deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete slot');
    }
  };

  const handleCancelSlot = async (id: string) => {
    try {
      const response = await fetch(`/api/availabilities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to cancel slot');
      }

      setSlots(slots.map(s => s.id === id ? { ...s, status: 'cancelled' as const } : s));
      toast.success('Time slot cancelled');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel slot');
    }
  };

  const handleToggleSchedule = async (id: string, currentState: boolean) => {
    try {
      const response = await fetch(`/api/recurring-schedules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentState }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update schedule');
      }

      setSchedules(schedules.map(s => s.id === id ? { ...s, is_active: !currentState } : s));
      toast.success('Schedule updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update schedule');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      const response = await fetch(`/api/recurring-schedules/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete schedule');
      }

      setSchedules(schedules.filter(s => s.id !== id));
      toast.success('Schedule deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete schedule');
    }
  };

  const handleGenerateSlots = async (scheduleId: string) => {
    setGeneratingSlots(scheduleId);
    try {
      const startDate = format(new Date(), 'yyyy-MM-dd');
      const endDate = format(addDays(new Date(), 30), 'yyyy-MM-dd');

      const response = await fetch(`/api/recurring-schedules/${scheduleId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: startDate, end_date: endDate }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate slots');
      }

      toast.success(`Generated ${result.count} time slots`);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate slots');
    } finally {
      setGeneratingSlots(null);
    }
  };

  const handleCreateBlackout = async () => {
    setSavingBlackout(true);
    try {
      const response = await fetch('/api/availabilities/blackout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tour_id: blackoutDates.tour_id === 'all' ? null : blackoutDates.tour_id,
          start_date: format(blackoutDates.start_date, 'yyyy-MM-dd'),
          end_date: format(blackoutDates.end_date, 'yyyy-MM-dd'),
          reason: blackoutDates.reason || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create blackout');
      }

      if (result.warning) {
        toast.warning(result.warning, { description: result.message });
      } else {
        toast.success(result.message);
      }

      setIsBlackoutOpen(false);
      setBlackoutDates({
        tour_id: 'all',
        start_date: new Date(),
        end_date: addDays(new Date(), 1),
        reason: '',
      });
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create blackout');
    } finally {
      setSavingBlackout(false);
    }
  };

  const getStatusBadge = (slot: TimeSlot) => {
    if (slot.status === 'cancelled') {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
    }
    const capacity = getCapacity(slot);
    if (slot.status === 'full' || slot.booked_count >= capacity) {
      return <Badge className="bg-orange-100 text-orange-800"><AlertCircle className="h-3 w-3 mr-1" />Full</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Available</Badge>;
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
        <p className="text-lg font-medium">Failed to load availability data</p>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchData}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Availability</h1>
          <p className="text-muted-foreground">Manage time slots and recurring schedules</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isBlackoutOpen} onOpenChange={setIsBlackoutOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="text-destructive border-destructive/50 hover:bg-destructive/10">
                <XCircle className="h-4 w-4 mr-2" />
                Blackout Dates
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Blackout Dates</DialogTitle>
                <DialogDescription>
                  Cancel all availability slots within a date range
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tour (optional)</Label>
                  <Select
                    value={blackoutDates.tour_id}
                    onValueChange={(v) => setBlackoutDates({ ...blackoutDates, tour_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All tours" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tours</SelectItem>
                      {tours.map(tour => (
                        <SelectItem key={tour.id} value={tour.id}>{tour.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {format(blackoutDates.start_date, 'MMM d, yyyy')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={blackoutDates.start_date}
                          onSelect={(d) => d && setBlackoutDates({ ...blackoutDates, start_date: d })}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {format(blackoutDates.end_date, 'MMM d, yyyy')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={blackoutDates.end_date}
                          onSelect={(d) => d && setBlackoutDates({ ...blackoutDates, end_date: d })}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Reason (optional)</Label>
                  <Input
                    placeholder="e.g., Holiday closure, Maintenance"
                    value={blackoutDates.reason}
                    onChange={(e) => setBlackoutDates({ ...blackoutDates, reason: e.target.value })}
                  />
                </div>

                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <p className="text-sm text-destructive flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    This will cancel all matching availability slots. Existing bookings will need to be rescheduled or cancelled separately.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsBlackoutOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleCreateBlackout} disabled={savingBlackout}>
                  {savingBlackout && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Blackout
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddScheduleOpen} onOpenChange={setIsAddScheduleOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Repeat className="h-4 w-4 mr-2" />
                Add Recurring
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Recurring Schedule</DialogTitle>
                <DialogDescription>
                  Set up automatic time slots that repeat weekly
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tour</Label>
                  <Select
                    value={newSchedule.tour_id}
                    onValueChange={(v) => setNewSchedule({ ...newSchedule, tour_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tour" />
                    </SelectTrigger>
                    <SelectContent>
                      {tours.map(tour => (
                        <SelectItem key={tour.id} value={tour.id}>{tour.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Days of Week</Label>
                  <div className="flex flex-wrap gap-2">
                    {dayNames.map((day, index) => (
                      <label
                        key={day}
                        className={`flex items-center justify-center w-10 h-10 rounded-full cursor-pointer border-2 transition-colors ${
                          newSchedule.days_of_week.includes(index)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border hover:border-primary'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={newSchedule.days_of_week.includes(index)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewSchedule({ ...newSchedule, days_of_week: [...newSchedule.days_of_week, index].sort() });
                            } else {
                              setNewSchedule({ ...newSchedule, days_of_week: newSchedule.days_of_week.filter(d => d !== index) });
                            }
                          }}
                        />
                        <span className="text-xs font-medium">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={newSchedule.start_time}
                      onChange={(e) => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={newSchedule.end_time}
                      onChange={(e) => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Capacity Override</Label>
                    <Input
                      type="number"
                      placeholder="Default"
                      value={newSchedule.capacity}
                      onChange={(e) => setNewSchedule({ ...newSchedule, capacity: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Price Override</Label>
                    <Input
                      type="number"
                      placeholder="Default"
                      value={newSchedule.price_override}
                      onChange={(e) => setNewSchedule({ ...newSchedule, price_override: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Valid From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {format(newSchedule.valid_from, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newSchedule.valid_from}
                        onSelect={(d) => d && setNewSchedule({ ...newSchedule, valid_from: d })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddScheduleOpen(false)}>Cancel</Button>
                <Button onClick={handleAddSchedule} disabled={savingSchedule}>
                  {savingSchedule && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Schedule
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddSlotOpen} onOpenChange={setIsAddSlotOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Time Slot
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Time Slot</DialogTitle>
                <DialogDescription>
                  Create a one-time availability slot
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tour</Label>
                  <Select
                    value={newSlot.tour_id}
                    onValueChange={(v) => setNewSlot({ ...newSlot, tour_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tour" />
                    </SelectTrigger>
                    <SelectContent>
                      {tours.map(tour => (
                        <SelectItem key={tour.id} value={tour.id}>{tour.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {format(newSlot.date, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newSlot.date}
                        onSelect={(d) => d && setNewSlot({ ...newSlot, date: d })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={newSlot.start_time}
                      onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={newSlot.end_time}
                      onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Capacity</Label>
                    <Input
                      type="number"
                      placeholder="Use tour default"
                      value={newSlot.capacity}
                      onChange={(e) => setNewSlot({ ...newSlot, capacity: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Price ($)</Label>
                    <Input
                      type="number"
                      placeholder="Use tour default"
                      value={newSlot.price}
                      onChange={(e) => setNewSlot({ ...newSlot, price: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddSlotOpen(false)}>Cancel</Button>
                <Button onClick={handleAddSlot} disabled={savingSlot}>
                  {savingSlot && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Slot
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="calendar" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="recurring">Recurring Schedules</TabsTrigger>
          </TabsList>

          <Select value={selectedTour} onValueChange={setSelectedTour}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by tour" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tours</SelectItem>
              {tours.map(tour => (
                <SelectItem key={tour.id} value={tour.id}>{tour.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>Week of {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => setCurrentWeek(new Date())}>Today</Button>
                  <Button variant="outline" size="icon" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => {
                  const daySlots = getSlotsByDate(day);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-[200px] border rounded-lg p-2 ${
                        isToday ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      <div className={`text-sm font-medium mb-2 ${isToday ? 'text-primary' : ''}`}>
                        {format(day, 'EEE d')}
                      </div>
                      <div className="space-y-1">
                        {daySlots.map((slot) => {
                          const capacity = getCapacity(slot);
                          return (
                            <div
                              key={slot.id}
                              className={`text-xs p-2 rounded cursor-pointer hover:opacity-80 ${
                                slot.status === 'cancelled'
                                  ? 'bg-red-100 text-red-800 line-through'
                                  : slot.booked_count >= capacity
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              <div className="font-medium truncate">{getTourName(slot)}</div>
                              <div className="flex items-center gap-1 mt-1">
                                <Clock className="h-3 w-3" />
                                {slot.start_time?.slice(0, 5)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {slot.booked_count}/{capacity}
                              </div>
                            </div>
                          );
                        })}
                        {daySlots.length === 0 && (
                          <div className="text-xs text-muted-foreground text-center py-4">
                            No slots
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>All Time Slots</CardTitle>
              <CardDescription>View and manage individual availability slots</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredSlots.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">No time slots found</p>
                  <p className="text-muted-foreground">Create a time slot or set up recurring schedules</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Tour</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSlots
                      .sort((a, b) => a.date.localeCompare(b.date) || (a.start_time || '').localeCompare(b.start_time || ''))
                      .slice(0, 20)
                      .map((slot) => (
                      <TableRow key={slot.id}>
                        <TableCell>
                          {format(new Date(slot.date), 'EEE, MMM d')}
                        </TableCell>
                        <TableCell className="font-medium">{getTourName(slot)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {slot.booked_count}/{getCapacity(slot)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            {getPrice(slot)}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(slot)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              {slot.status !== 'cancelled' && (
                                <DropdownMenuItem onClick={() => handleCancelSlot(slot.id)}>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Cancel Slot
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteSlot(slot.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recurring">
          <Card>
            <CardHeader>
              <CardTitle>Recurring Schedules</CardTitle>
              <CardDescription>
                Recurring schedules automatically generate time slots on specified days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {schedules.length === 0 ? (
                <div className="text-center py-12">
                  <Repeat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">No recurring schedules</p>
                  <p className="text-muted-foreground">Create a schedule to auto-generate time slots</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className={`border rounded-lg p-4 ${!schedule.is_active ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{schedule.tour?.name || 'Unknown Tour'}</h3>
                            {schedule.is_active ? (
                              <Badge className="bg-green-100 text-green-800">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {schedule.start_time?.slice(0, 5)} - {schedule.end_time?.slice(0, 5)}
                            </div>
                            <div className="flex items-center gap-1">
                              <CalendarDays className="h-4 w-4" />
                              {schedule.days_of_week.map(d => dayNames[d]).join(', ')}
                            </div>
                          </div>
                          <div className="flex gap-4 text-sm">
                            {schedule.capacity_override && (
                              <span>Capacity: {schedule.capacity_override}</span>
                            )}
                            {schedule.price_override && (
                              <span>Price: ${schedule.price_override}</span>
                            )}
                            <span>
                              Valid: {format(new Date(schedule.valid_from), 'MMM d, yyyy')}
                              {schedule.valid_until && ` - ${format(new Date(schedule.valid_until), 'MMM d, yyyy')}`}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateSlots(schedule.id)}
                            disabled={generatingSlots === schedule.id || !schedule.is_active}
                          >
                            {generatingSlots === schedule.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4 mr-2" />
                            )}
                            Generate 30 Days
                          </Button>
                          <Switch
                            checked={schedule.is_active}
                            onCheckedChange={() => handleToggleSchedule(schedule.id, schedule.is_active)}
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteSchedule(schedule.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
