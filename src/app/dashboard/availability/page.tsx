'use client';

import { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
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
  tour_name: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  price: number;
  status: 'available' | 'full' | 'cancelled';
}

interface RecurringSchedule {
  id: string;
  tour_id: string;
  tour_name: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  capacity: number | null;
  price_override: number | null;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
}

// Mock data
const mockTours: Tour[] = [
  { id: '1', name: 'Sunset Sailing Tour', duration_minutes: 120, base_price: 89, max_capacity: 12 },
  { id: '2', name: 'Morning Dolphin Watch', duration_minutes: 90, base_price: 65, max_capacity: 20 },
  { id: '3', name: 'Private Charter', duration_minutes: 180, base_price: 450, max_capacity: 6 },
  { id: '4', name: 'Snorkeling Adventure', duration_minutes: 150, base_price: 95, max_capacity: 15 },
];

const generateMockSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const today = new Date();

  for (let i = 0; i < 14; i++) {
    const date = addDays(today, i);
    const dateStr = format(date, 'yyyy-MM-dd');

    // Morning Dolphin Watch - every day at 8am
    slots.push({
      id: `slot-${i}-1`,
      tour_id: '2',
      tour_name: 'Morning Dolphin Watch',
      date: dateStr,
      start_time: '08:00',
      end_time: '09:30',
      capacity: 20,
      booked_count: Math.floor(Math.random() * 15),
      price: 65,
      status: 'available',
    });

    // Sunset Sailing - every day at 5pm
    slots.push({
      id: `slot-${i}-2`,
      tour_id: '1',
      tour_name: 'Sunset Sailing Tour',
      date: dateStr,
      start_time: '17:00',
      end_time: '19:00',
      capacity: 12,
      booked_count: Math.floor(Math.random() * 12),
      price: 89,
      status: Math.random() > 0.8 ? 'full' : 'available',
    });

    // Snorkeling - weekends only
    if (date.getDay() === 0 || date.getDay() === 6) {
      slots.push({
        id: `slot-${i}-3`,
        tour_id: '4',
        tour_name: 'Snorkeling Adventure',
        date: dateStr,
        start_time: '10:00',
        end_time: '12:30',
        capacity: 15,
        booked_count: Math.floor(Math.random() * 10),
        price: 95,
        status: 'available',
      });
    }
  }

  return slots;
};

const mockRecurringSchedules: RecurringSchedule[] = [
  {
    id: '1',
    tour_id: '2',
    tour_name: 'Morning Dolphin Watch',
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    start_time: '08:00',
    end_time: '09:30',
    capacity: null,
    price_override: null,
    is_active: true,
    valid_from: '2024-01-01',
    valid_until: null,
  },
  {
    id: '2',
    tour_id: '1',
    tour_name: 'Sunset Sailing Tour',
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    start_time: '17:00',
    end_time: '19:00',
    capacity: null,
    price_override: null,
    is_active: true,
    valid_from: '2024-01-01',
    valid_until: null,
  },
  {
    id: '3',
    tour_id: '4',
    tour_name: 'Snorkeling Adventure',
    days_of_week: [0, 6],
    start_time: '10:00',
    end_time: '12:30',
    capacity: null,
    price_override: null,
    is_active: true,
    valid_from: '2024-03-01',
    valid_until: '2024-09-30',
  },
];

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AvailabilityPage() {
  const [slots, setSlots] = useState<TimeSlot[]>(generateMockSlots());
  const [schedules, setSchedules] = useState<RecurringSchedule[]>(mockRecurringSchedules);
  const [selectedTour, setSelectedTour] = useState<string>('all');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [isAddSlotOpen, setIsAddSlotOpen] = useState(false);
  const [isAddScheduleOpen, setIsAddScheduleOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

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

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const filteredSlots = slots.filter(slot =>
    selectedTour === 'all' || slot.tour_id === selectedTour
  );

  const getSlotsByDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return filteredSlots.filter(slot => slot.date === dateStr);
  };

  const handleAddSlot = () => {
    const tour = mockTours.find(t => t.id === newSlot.tour_id);
    if (!tour) {
      toast.error('Please select a tour');
      return;
    }

    const slot: TimeSlot = {
      id: Date.now().toString(),
      tour_id: newSlot.tour_id,
      tour_name: tour.name,
      date: format(newSlot.date, 'yyyy-MM-dd'),
      start_time: newSlot.start_time,
      end_time: newSlot.end_time,
      capacity: parseInt(newSlot.capacity) || tour.max_capacity,
      booked_count: 0,
      price: parseFloat(newSlot.price) || tour.base_price,
      status: 'available',
    };

    setSlots([...slots, slot]);
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
  };

  const handleAddSchedule = () => {
    const tour = mockTours.find(t => t.id === newSchedule.tour_id);
    if (!tour) {
      toast.error('Please select a tour');
      return;
    }
    if (newSchedule.days_of_week.length === 0) {
      toast.error('Please select at least one day');
      return;
    }

    const schedule: RecurringSchedule = {
      id: Date.now().toString(),
      tour_id: newSchedule.tour_id,
      tour_name: tour.name,
      days_of_week: newSchedule.days_of_week,
      start_time: newSchedule.start_time,
      end_time: newSchedule.end_time,
      capacity: newSchedule.capacity ? parseInt(newSchedule.capacity) : null,
      price_override: newSchedule.price_override ? parseFloat(newSchedule.price_override) : null,
      is_active: true,
      valid_from: format(newSchedule.valid_from, 'yyyy-MM-dd'),
      valid_until: newSchedule.valid_until ? format(newSchedule.valid_until, 'yyyy-MM-dd') : null,
    };

    setSchedules([...schedules, schedule]);
    setIsAddScheduleOpen(false);
    toast.success('Recurring schedule created');
  };

  const handleDeleteSlot = (id: string) => {
    setSlots(slots.filter(s => s.id !== id));
    toast.success('Time slot deleted');
  };

  const handleCancelSlot = (id: string) => {
    setSlots(slots.map(s => s.id === id ? { ...s, status: 'cancelled' as const } : s));
    toast.success('Time slot cancelled');
  };

  const handleToggleSchedule = (id: string) => {
    setSchedules(schedules.map(s => s.id === id ? { ...s, is_active: !s.is_active } : s));
    toast.success('Schedule updated');
  };

  const getStatusBadge = (slot: TimeSlot) => {
    if (slot.status === 'cancelled') {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
    }
    if (slot.status === 'full' || slot.booked_count >= slot.capacity) {
      return <Badge className="bg-orange-100 text-orange-800"><AlertCircle className="h-3 w-3 mr-1" />Full</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Available</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Availability</h1>
          <p className="text-muted-foreground">Manage time slots and recurring schedules</p>
        </div>
        <div className="flex items-center gap-2">
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
                      {mockTours.map(tour => (
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
                <Button onClick={handleAddSchedule}>Create Schedule</Button>
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
                      {mockTours.map(tour => (
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
                <Button onClick={handleAddSlot}>Add Slot</Button>
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
              {mockTours.map(tour => (
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
                        {daySlots.map((slot) => (
                          <div
                            key={slot.id}
                            className={`text-xs p-2 rounded cursor-pointer hover:opacity-80 ${
                              slot.status === 'cancelled'
                                ? 'bg-red-100 text-red-800 line-through'
                                : slot.booked_count >= slot.capacity
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                            onClick={() => {
                              setSelectedDate(day);
                            }}
                          >
                            <div className="font-medium truncate">{slot.tour_name}</div>
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3" />
                              {slot.start_time}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {slot.booked_count}/{slot.capacity}
                            </div>
                          </div>
                        ))}
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
                    .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))
                    .slice(0, 20)
                    .map((slot) => (
                    <TableRow key={slot.id}>
                      <TableCell>
                        {format(new Date(slot.date), 'EEE, MMM d')}
                      </TableCell>
                      <TableCell className="font-medium">{slot.tour_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {slot.start_time} - {slot.end_time}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {slot.booked_count}/{slot.capacity}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          {slot.price}
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
                            <DropdownMenuItem>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
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
              <div className="space-y-4">
                {schedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className={`border rounded-lg p-4 ${!schedule.is_active ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{schedule.tour_name}</h3>
                          {schedule.is_active ? (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {schedule.start_time} - {schedule.end_time}
                          </div>
                          <div className="flex items-center gap-1">
                            <CalendarDays className="h-4 w-4" />
                            {schedule.days_of_week.map(d => dayNames[d]).join(', ')}
                          </div>
                        </div>
                        <div className="flex gap-4 text-sm">
                          {schedule.capacity && (
                            <span>Capacity: {schedule.capacity}</span>
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
                        <Switch
                          checked={schedule.is_active}
                          onCheckedChange={() => handleToggleSchedule(schedule.id)}
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
                            <DropdownMenuItem>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
