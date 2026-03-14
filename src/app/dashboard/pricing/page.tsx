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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DollarSign,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  CalendarIcon,
  Percent,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  Tag,
  Zap,
  Sun,
  Moon,
  Calendar as CalendarDays,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Tour {
  id: string;
  name: string;
  base_price: number;
}

interface PricingRule {
  id: string;
  name: string;
  type: 'seasonal' | 'day_of_week' | 'time_of_day' | 'capacity' | 'early_bird' | 'last_minute' | 'group';
  tour_id: string | null;
  tour_name: string | null;
  adjustment_type: 'percentage' | 'fixed';
  adjustment_value: number;
  conditions: Record<string, unknown>;
  priority: number;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
}

interface PromoCode {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_booking_value: number | null;
  max_uses: number | null;
  current_uses: number;
  tour_ids: string[] | null;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
}

// Mock data
const mockTours: Tour[] = [
  { id: '1', name: 'Sunset Sailing Tour', base_price: 89 },
  { id: '2', name: 'Morning Dolphin Watch', base_price: 65 },
  { id: '3', name: 'Private Charter', base_price: 450 },
  { id: '4', name: 'Snorkeling Adventure', base_price: 95 },
];

const mockPricingRules: PricingRule[] = [
  {
    id: '1',
    name: 'Peak Season Summer',
    type: 'seasonal',
    tour_id: null,
    tour_name: null,
    adjustment_type: 'percentage',
    adjustment_value: 20,
    conditions: { months: [6, 7, 8] },
    priority: 1,
    is_active: true,
    valid_from: '2024-06-01',
    valid_until: '2024-08-31',
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'Weekend Premium',
    type: 'day_of_week',
    tour_id: null,
    tour_name: null,
    adjustment_type: 'percentage',
    adjustment_value: 15,
    conditions: { days: [0, 6] },
    priority: 2,
    is_active: true,
    valid_from: null,
    valid_until: null,
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: '3',
    name: 'Sunset Tour Premium',
    type: 'time_of_day',
    tour_id: '1',
    tour_name: 'Sunset Sailing Tour',
    adjustment_type: 'fixed',
    adjustment_value: 10,
    conditions: { after_time: '17:00' },
    priority: 3,
    is_active: true,
    valid_from: null,
    valid_until: null,
    created_at: '2024-01-20T10:00:00Z',
  },
  {
    id: '4',
    name: 'Early Bird Discount',
    type: 'early_bird',
    tour_id: null,
    tour_name: null,
    adjustment_type: 'percentage',
    adjustment_value: -10,
    conditions: { days_before: 14 },
    priority: 4,
    is_active: true,
    valid_from: null,
    valid_until: null,
    created_at: '2024-02-01T10:00:00Z',
  },
  {
    id: '5',
    name: 'Last Minute Deal',
    type: 'last_minute',
    tour_id: null,
    tour_name: null,
    adjustment_type: 'percentage',
    adjustment_value: -15,
    conditions: { hours_before: 24, min_capacity_remaining: 50 },
    priority: 5,
    is_active: true,
    valid_from: null,
    valid_until: null,
    created_at: '2024-02-01T10:00:00Z',
  },
  {
    id: '6',
    name: 'Group Discount (6+)',
    type: 'group',
    tour_id: null,
    tour_name: null,
    adjustment_type: 'percentage',
    adjustment_value: -10,
    conditions: { min_guests: 6 },
    priority: 6,
    is_active: true,
    valid_from: null,
    valid_until: null,
    created_at: '2024-02-01T10:00:00Z',
  },
  {
    id: '7',
    name: 'Low Capacity Boost',
    type: 'capacity',
    tour_id: null,
    tour_name: null,
    adjustment_type: 'percentage',
    adjustment_value: -20,
    conditions: { min_capacity_remaining: 70 },
    priority: 7,
    is_active: false,
    valid_from: null,
    valid_until: null,
    created_at: '2024-02-15T10:00:00Z',
  },
];

const mockPromoCodes: PromoCode[] = [
  {
    id: '1',
    code: 'SUMMER24',
    description: 'Summer 2024 promotion',
    discount_type: 'percentage',
    discount_value: 15,
    min_booking_value: 100,
    max_uses: 500,
    current_uses: 234,
    tour_ids: null,
    is_active: true,
    valid_from: '2024-06-01',
    valid_until: '2024-08-31',
  },
  {
    id: '2',
    code: 'WELCOME10',
    description: 'First-time customer discount',
    discount_type: 'percentage',
    discount_value: 10,
    min_booking_value: null,
    max_uses: null,
    current_uses: 1250,
    tour_ids: null,
    is_active: true,
    valid_from: '2024-01-01',
    valid_until: null,
  },
  {
    id: '3',
    code: 'DOLPHIN20',
    description: '$20 off Dolphin Watch tours',
    discount_type: 'fixed',
    discount_value: 20,
    min_booking_value: 65,
    max_uses: 100,
    current_uses: 45,
    tour_ids: ['2'],
    is_active: true,
    valid_from: '2024-03-01',
    valid_until: '2024-04-30',
  },
  {
    id: '4',
    code: 'VIP50',
    description: 'VIP customer exclusive',
    discount_type: 'fixed',
    discount_value: 50,
    min_booking_value: 200,
    max_uses: 50,
    current_uses: 12,
    tour_ids: null,
    is_active: true,
    valid_from: '2024-01-01',
    valid_until: '2024-12-31',
  },
  {
    id: '5',
    code: 'EXPIRED2023',
    description: 'Old promotion',
    discount_type: 'percentage',
    discount_value: 25,
    min_booking_value: null,
    max_uses: 100,
    current_uses: 100,
    tour_ids: null,
    is_active: false,
    valid_from: '2023-11-01',
    valid_until: '2023-12-31',
  },
];

const ruleTypeIcons: Record<string, React.ReactNode> = {
  seasonal: <Sun className="h-4 w-4" />,
  day_of_week: <CalendarDays className="h-4 w-4" />,
  time_of_day: <Clock className="h-4 w-4" />,
  capacity: <TrendingUp className="h-4 w-4" />,
  early_bird: <Zap className="h-4 w-4" />,
  last_minute: <Moon className="h-4 w-4" />,
  group: <Users className="h-4 w-4" />,
};

const ruleTypeLabels: Record<string, string> = {
  seasonal: 'Seasonal',
  day_of_week: 'Day of Week',
  time_of_day: 'Time of Day',
  capacity: 'Capacity Based',
  early_bird: 'Early Bird',
  last_minute: 'Last Minute',
  group: 'Group Size',
};

export default function PricingPage() {
  const [pricingRules, setPricingRules] = useState<PricingRule[]>(mockPricingRules);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>(mockPromoCodes);
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [isAddPromoOpen, setIsAddPromoOpen] = useState(false);

  const [newRule, setNewRule] = useState({
    name: '',
    type: '' as PricingRule['type'] | '',
    tour_id: 'all',
    adjustment_type: 'percentage' as 'percentage' | 'fixed',
    adjustment_value: '',
    priority: '10',
  });

  const [newPromo, setNewPromo] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '',
    min_booking_value: '',
    max_uses: '',
    valid_from: new Date(),
    valid_until: null as Date | null,
  });

  const handleAddRule = () => {
    if (!newRule.name || !newRule.type || !newRule.adjustment_value) {
      toast.error('Please fill in all required fields');
      return;
    }

    const tour = newRule.tour_id !== 'all' ? mockTours.find(t => t.id === newRule.tour_id) : null;

    const rule: PricingRule = {
      id: Date.now().toString(),
      name: newRule.name,
      type: newRule.type as PricingRule['type'],
      tour_id: tour?.id || null,
      tour_name: tour?.name || null,
      adjustment_type: newRule.adjustment_type,
      adjustment_value: parseFloat(newRule.adjustment_value),
      conditions: {},
      priority: parseInt(newRule.priority),
      is_active: true,
      valid_from: null,
      valid_until: null,
      created_at: new Date().toISOString(),
    };

    setPricingRules([...pricingRules, rule]);
    setIsAddRuleOpen(false);
    setNewRule({
      name: '',
      type: '',
      tour_id: 'all',
      adjustment_type: 'percentage',
      adjustment_value: '',
      priority: '10',
    });
    toast.success('Pricing rule created');
  };

  const handleAddPromo = () => {
    if (!newPromo.code || !newPromo.discount_value) {
      toast.error('Please fill in all required fields');
      return;
    }

    const promo: PromoCode = {
      id: Date.now().toString(),
      code: newPromo.code.toUpperCase(),
      description: newPromo.description,
      discount_type: newPromo.discount_type,
      discount_value: parseFloat(newPromo.discount_value),
      min_booking_value: newPromo.min_booking_value ? parseFloat(newPromo.min_booking_value) : null,
      max_uses: newPromo.max_uses ? parseInt(newPromo.max_uses) : null,
      current_uses: 0,
      tour_ids: null,
      is_active: true,
      valid_from: format(newPromo.valid_from, 'yyyy-MM-dd'),
      valid_until: newPromo.valid_until ? format(newPromo.valid_until, 'yyyy-MM-dd') : null,
    };

    setPromoCodes([...promoCodes, promo]);
    setIsAddPromoOpen(false);
    setNewPromo({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: '',
      min_booking_value: '',
      max_uses: '',
      valid_from: new Date(),
      valid_until: null,
    });
    toast.success('Promo code created');
  };

  const handleToggleRule = (id: string) => {
    setPricingRules(rules => rules.map(r => r.id === id ? { ...r, is_active: !r.is_active } : r));
    toast.success('Rule updated');
  };

  const handleTogglePromo = (id: string) => {
    setPromoCodes(codes => codes.map(c => c.id === id ? { ...c, is_active: !c.is_active } : c));
    toast.success('Promo code updated');
  };

  const handleDeleteRule = (id: string) => {
    setPricingRules(rules => rules.filter(r => r.id !== id));
    toast.success('Rule deleted');
  };

  const handleDeletePromo = (id: string) => {
    setPromoCodes(codes => codes.filter(c => c.id !== id));
    toast.success('Promo code deleted');
  };

  const activeRules = pricingRules.filter(r => r.is_active).length;
  const activeCodes = promoCodes.filter(c => c.is_active).length;
  const totalRedemptions = promoCodes.reduce((acc, c) => acc + c.current_uses, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pricing Rules</h1>
          <p className="text-muted-foreground">Configure dynamic pricing and promotional codes</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Rules</p>
                <p className="text-2xl font-bold">{activeRules}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <Tag className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Promo Codes</p>
                <p className="text-2xl font-bold">{activeCodes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Percent className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Redemptions</p>
                <p className="text-2xl font-bold">{totalRedemptions.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Discount</p>
                <p className="text-2xl font-bold">12%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">Dynamic Pricing Rules</TabsTrigger>
          <TabsTrigger value="promos">Promo Codes</TabsTrigger>
          <TabsTrigger value="base">Base Prices</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isAddRuleOpen} onOpenChange={setIsAddRuleOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Pricing Rule</DialogTitle>
                  <DialogDescription>
                    Set up automatic price adjustments based on conditions
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Rule Name</Label>
                    <Input
                      placeholder="e.g., Weekend Premium"
                      value={newRule.name}
                      onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Rule Type</Label>
                    <Select
                      value={newRule.type}
                      onValueChange={(v) => setNewRule({ ...newRule, type: v as PricingRule['type'] })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="seasonal">Seasonal</SelectItem>
                        <SelectItem value="day_of_week">Day of Week</SelectItem>
                        <SelectItem value="time_of_day">Time of Day</SelectItem>
                        <SelectItem value="capacity">Capacity Based</SelectItem>
                        <SelectItem value="early_bird">Early Bird</SelectItem>
                        <SelectItem value="last_minute">Last Minute</SelectItem>
                        <SelectItem value="group">Group Size</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Apply To</Label>
                    <Select
                      value={newRule.tour_id}
                      onValueChange={(v) => setNewRule({ ...newRule, tour_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select tour" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tours</SelectItem>
                        {mockTours.map(tour => (
                          <SelectItem key={tour.id} value={tour.id}>{tour.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Adjustment Type</Label>
                      <Select
                        value={newRule.adjustment_type}
                        onValueChange={(v) => setNewRule({ ...newRule, adjustment_type: v as 'percentage' | 'fixed' })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Value (use negative for discount)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 15 or -10"
                        value={newRule.adjustment_value}
                        onChange={(e) => setNewRule({ ...newRule, adjustment_value: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Priority (lower = higher priority)</Label>
                    <Input
                      type="number"
                      value={newRule.priority}
                      onChange={(e) => setNewRule({ ...newRule, priority: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddRuleOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddRule}>Create Rule</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {pricingRules
              .sort((a, b) => a.priority - b.priority)
              .map((rule) => (
              <Card key={rule.id} className={!rule.is_active ? 'opacity-60' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-full ${
                        rule.adjustment_value >= 0 ? 'bg-red-100' : 'bg-green-100'
                      }`}>
                        {rule.adjustment_value >= 0 ? (
                          <TrendingUp className={`h-5 w-5 ${rule.adjustment_value >= 0 ? 'text-red-600' : 'text-green-600'}`} />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{rule.name}</h3>
                          <Badge variant="outline" className="gap-1">
                            {ruleTypeIcons[rule.type]}
                            {ruleTypeLabels[rule.type]}
                          </Badge>
                          {rule.is_active ? (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {rule.tour_name ? `Applies to: ${rule.tour_name}` : 'Applies to: All Tours'}
                        </p>
                        <p className="text-sm font-medium">
                          {rule.adjustment_value >= 0 ? '+' : ''}
                          {rule.adjustment_value}
                          {rule.adjustment_type === 'percentage' ? '%' : '$'}
                          {rule.adjustment_value >= 0 ? ' increase' : ' discount'}
                        </p>
                        {(rule.valid_from || rule.valid_until) && (
                          <p className="text-xs text-muted-foreground">
                            Valid: {rule.valid_from ? format(new Date(rule.valid_from), 'MMM d, yyyy') : 'Any'}
                            {' - '}
                            {rule.valid_until ? format(new Date(rule.valid_until), 'MMM d, yyyy') : 'Ongoing'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 mr-2">
                        <Label htmlFor={`rule-${rule.id}`} className="text-sm">Active</Label>
                        <Switch
                          id={`rule-${rule.id}`}
                          checked={rule.is_active}
                          onCheckedChange={() => handleToggleRule(rule.id)}
                        />
                      </div>
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
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteRule(rule.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="promos">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Promo Codes</CardTitle>
                  <CardDescription>Manage discount codes for customers</CardDescription>
                </div>
                <Dialog open={isAddPromoOpen} onOpenChange={setIsAddPromoOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Code
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Promo Code</DialogTitle>
                      <DialogDescription>
                        Create a discount code for customers to use at checkout
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Code</Label>
                        <Input
                          placeholder="e.g., SUMMER24"
                          value={newPromo.code}
                          onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                          className="uppercase"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Description (internal)</Label>
                        <Input
                          placeholder="e.g., Summer promotion for email subscribers"
                          value={newPromo.description}
                          onChange={(e) => setNewPromo({ ...newPromo, description: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Discount Type</Label>
                          <Select
                            value={newPromo.discount_type}
                            onValueChange={(v) => setNewPromo({ ...newPromo, discount_type: v as 'percentage' | 'fixed' })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">Percentage (%)</SelectItem>
                              <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Discount Value</Label>
                          <Input
                            type="number"
                            placeholder="e.g., 15"
                            value={newPromo.discount_value}
                            onChange={(e) => setNewPromo({ ...newPromo, discount_value: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Min Booking Value ($)</Label>
                          <Input
                            type="number"
                            placeholder="Optional"
                            value={newPromo.min_booking_value}
                            onChange={(e) => setNewPromo({ ...newPromo, min_booking_value: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Max Uses</Label>
                          <Input
                            type="number"
                            placeholder="Unlimited"
                            value={newPromo.max_uses}
                            onChange={(e) => setNewPromo({ ...newPromo, max_uses: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Valid From</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start">
                              <CalendarIcon className="h-4 w-4 mr-2" />
                              {format(newPromo.valid_from, 'PPP')}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={newPromo.valid_from}
                              onSelect={(d) => d && setNewPromo({ ...newPromo, valid_from: d })}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddPromoOpen(false)}>Cancel</Button>
                      <Button onClick={handleAddPromo}>Create Code</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Valid Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promoCodes.map((promo) => (
                    <TableRow key={promo.id} className={!promo.is_active ? 'opacity-60' : ''}>
                      <TableCell>
                        <code className="px-2 py-1 bg-muted rounded font-mono font-bold">
                          {promo.code}
                        </code>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{promo.description}</TableCell>
                      <TableCell>
                        <span className="font-medium text-green-600">
                          {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `$${promo.discount_value}`}
                        </span>
                        {promo.min_booking_value && (
                          <span className="text-xs text-muted-foreground block">
                            Min ${promo.min_booking_value}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {promo.current_uses}
                        {promo.max_uses && (
                          <span className="text-muted-foreground">/{promo.max_uses}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(promo.valid_from), 'MMM d')}
                        {promo.valid_until && ` - ${format(new Date(promo.valid_until), 'MMM d')}`}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={promo.is_active}
                          onCheckedChange={() => handleTogglePromo(promo.id)}
                        />
                      </TableCell>
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
                              Copy Code
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeletePromo(promo.id)}
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

        <TabsContent value="base">
          <Card>
            <CardHeader>
              <CardTitle>Base Tour Prices</CardTitle>
              <CardDescription>Default pricing for each tour before any rules are applied</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tour</TableHead>
                    <TableHead>Base Price</TableHead>
                    <TableHead>Active Rules</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockTours.map((tour) => {
                    const tourRules = pricingRules.filter(
                      r => r.is_active && (r.tour_id === tour.id || r.tour_id === null)
                    );
                    return (
                      <TableRow key={tour.id}>
                        <TableCell className="font-medium">{tour.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-lg font-semibold">{tour.base_price}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {tourRules.slice(0, 3).map(rule => (
                              <Badge key={rule.id} variant="outline" className="text-xs">
                                {rule.name}
                              </Badge>
                            ))}
                            {tourRules.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{tourRules.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Pencil className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
