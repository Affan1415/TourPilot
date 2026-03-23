'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocation } from '@/lib/location/context';
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
  MapPin,
  Loader2,
  AlertCircle,
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
  tour?: { id: string; name: string } | null;
  adjustment_type: 'percentage' | 'fixed';
  adjustment_value: number;
  conditions: Record<string, unknown>;
  priority: number;
  is_stackable: boolean;
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
  max_discount: number | null;
  max_uses: number | null;
  current_uses: number;
  tour_ids: string[] | null;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
}

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
  const { selectedLocation } = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [isAddPromoOpen, setIsAddPromoOpen] = useState(false);
  const [savingRule, setSavingRule] = useState(false);
  const [savingPromo, setSavingPromo] = useState(false);

  const [newRule, setNewRule] = useState({
    name: '',
    type: '' as PricingRule['type'] | '',
    tour_id: 'all',
    adjustment_type: 'percentage' as 'percentage' | 'fixed',
    adjustment_value: '',
    priority: '10',
    is_stackable: false,
    conditions: {} as Record<string, unknown>,
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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [toursRes, rulesRes, promosRes] = await Promise.all([
        fetch('/api/tours'),
        fetch('/api/pricing-rules'),
        fetch('/api/promo-codes'),
      ]);

      if (!toursRes.ok || !rulesRes.ok || !promosRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [toursData, rulesData, promosData] = await Promise.all([
        toursRes.json(),
        rulesRes.json(),
        promosRes.json(),
      ]);

      setTours(toursData.data || []);
      setPricingRules(rulesData.data || []);
      setPromoCodes(promosData.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error fetching pricing data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddRule = async () => {
    if (!newRule.name || !newRule.type || !newRule.adjustment_value) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSavingRule(true);
    try {
      const response = await fetch('/api/pricing-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRule.name,
          type: newRule.type,
          tour_id: newRule.tour_id !== 'all' ? newRule.tour_id : null,
          adjustment_type: newRule.adjustment_type,
          adjustment_value: parseFloat(newRule.adjustment_value),
          priority: parseInt(newRule.priority),
          conditions: newRule.conditions,
          is_stackable: newRule.is_stackable,
          is_active: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create rule');
      }

      setPricingRules([...pricingRules, result.data]);
      setIsAddRuleOpen(false);
      setNewRule({
        name: '',
        type: '',
        tour_id: 'all',
        adjustment_type: 'percentage',
        adjustment_value: '',
        priority: '10',
        is_stackable: false,
        conditions: {},
      });
      toast.success('Pricing rule created');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create rule');
    } finally {
      setSavingRule(false);
    }
  };

  const handleAddPromo = async () => {
    if (!newPromo.code || !newPromo.discount_value) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSavingPromo(true);
    try {
      const response = await fetch('/api/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newPromo.code.toUpperCase(),
          description: newPromo.description,
          discount_type: newPromo.discount_type,
          discount_value: parseFloat(newPromo.discount_value),
          min_booking_value: newPromo.min_booking_value ? parseFloat(newPromo.min_booking_value) : null,
          max_uses: newPromo.max_uses ? parseInt(newPromo.max_uses) : null,
          valid_from: format(newPromo.valid_from, 'yyyy-MM-dd'),
          valid_until: newPromo.valid_until ? format(newPromo.valid_until, 'yyyy-MM-dd') : null,
          is_active: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create promo code');
      }

      setPromoCodes([...promoCodes, result.data]);
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create promo code');
    } finally {
      setSavingPromo(false);
    }
  };

  const handleToggleRule = async (id: string, currentState: boolean) => {
    try {
      const response = await fetch(`/api/pricing-rules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentState }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update rule');
      }

      setPricingRules(rules => rules.map(r => r.id === id ? { ...r, is_active: !currentState } : r));
      toast.success('Rule updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update rule');
    }
  };

  const handleTogglePromo = async (id: string, currentState: boolean) => {
    try {
      const response = await fetch(`/api/promo-codes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentState }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update promo code');
      }

      setPromoCodes(codes => codes.map(c => c.id === id ? { ...c, is_active: !currentState } : c));
      toast.success('Promo code updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update promo code');
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      const response = await fetch(`/api/pricing-rules/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete rule');
      }

      setPricingRules(rules => rules.filter(r => r.id !== id));
      toast.success('Rule deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete rule');
    }
  };

  const handleDeletePromo = async (id: string) => {
    try {
      const response = await fetch(`/api/promo-codes/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete promo code');
      }

      setPromoCodes(codes => codes.filter(c => c.id !== id));
      toast.success('Promo code deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete promo code');
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const activeRules = pricingRules.filter(r => r.is_active).length;
  const activeCodes = promoCodes.filter(c => c.is_active).length;
  const totalRedemptions = promoCodes.reduce((acc, c) => acc + c.current_uses, 0);

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
        <p className="text-lg font-medium">Failed to load pricing data</p>
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
          <h1 className="text-3xl font-bold">Pricing Rules</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            {selectedLocation ? (
              <>
                <MapPin className="h-4 w-4" />
                {selectedLocation.name}
              </>
            ) : (
              "Configure dynamic pricing and promotional codes"
            )}
          </p>
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
                <p className="text-sm text-muted-foreground">Total Tours</p>
                <p className="text-2xl font-bold">{tours.length}</p>
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
                        {tours.map(tour => (
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Priority (lower = higher priority)</Label>
                      <Input
                        type="number"
                        value={newRule.priority}
                        onChange={(e) => setNewRule({ ...newRule, priority: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Stackable</Label>
                      <div className="flex items-center gap-2 pt-2">
                        <Switch
                          checked={newRule.is_stackable}
                          onCheckedChange={(checked) => setNewRule({ ...newRule, is_stackable: checked })}
                        />
                        <span className="text-sm text-muted-foreground">
                          Can combine with other rules
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Day of Week conditions */}
                  {newRule.type === 'day_of_week' && (
                    <div className="space-y-2">
                      <Label>Apply on days</Label>
                      <div className="flex flex-wrap gap-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                          <Button
                            key={day}
                            type="button"
                            variant={(newRule.conditions.days as number[] || []).includes(idx) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              const currentDays = (newRule.conditions.days as number[]) || [];
                              const newDays = currentDays.includes(idx)
                                ? currentDays.filter(d => d !== idx)
                                : [...currentDays, idx];
                              setNewRule({
                                ...newRule,
                                conditions: { ...newRule.conditions, days: newDays }
                              });
                            }}
                          >
                            {day}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Group conditions */}
                  {newRule.type === 'group' && (
                    <div className="space-y-2">
                      <Label>Minimum guests</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 6"
                        value={(newRule.conditions.min_guests as number) || ''}
                        onChange={(e) => setNewRule({
                          ...newRule,
                          conditions: { ...newRule.conditions, min_guests: parseInt(e.target.value) || 0 }
                        })}
                      />
                    </div>
                  )}

                  {/* Early bird conditions */}
                  {newRule.type === 'early_bird' && (
                    <div className="space-y-2">
                      <Label>Days before departure</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 14"
                        value={(newRule.conditions.days_before as number) || ''}
                        onChange={(e) => setNewRule({
                          ...newRule,
                          conditions: { ...newRule.conditions, days_before: parseInt(e.target.value) || 0 }
                        })}
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddRuleOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddRule} disabled={savingRule}>
                    {savingRule && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Rule
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {pricingRules.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">No pricing rules yet</p>
                <p className="text-muted-foreground mb-4">Create your first rule to set up dynamic pricing</p>
                <Button onClick={() => setIsAddRuleOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </CardContent>
            </Card>
          ) : (
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
                            {rule.tour?.name ? `Applies to: ${rule.tour.name}` : 'Applies to: All Tours'}
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
                            onCheckedChange={() => handleToggleRule(rule.id, rule.is_active)}
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
          )}
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
                      <Button onClick={handleAddPromo} disabled={savingPromo}>
                        {savingPromo && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Create Code
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {promoCodes.length === 0 ? (
                <div className="text-center py-12">
                  <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">No promo codes yet</p>
                  <p className="text-muted-foreground">Create your first promo code</p>
                </div>
              ) : (
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
                        <TableCell className="text-muted-foreground">{promo.description || '-'}</TableCell>
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
                            onCheckedChange={() => handleTogglePromo(promo.id, promo.is_active)}
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
                              <DropdownMenuItem onClick={() => copyToClipboard(promo.code)}>
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
              )}
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
              {tours.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">No tours found</p>
                  <p className="text-muted-foreground">Create tours to configure base pricing</p>
                </div>
              ) : (
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
                    {tours.map((tour) => {
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
