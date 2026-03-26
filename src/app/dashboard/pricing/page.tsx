'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocation } from '@/lib/location/context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  CalendarIcon,
  Percent,
  Tag,
  MapPin,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

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

export default function PromoCodesPage() {
  const { selectedLocation } = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [isAddPromoOpen, setIsAddPromoOpen] = useState(false);
  const [savingPromo, setSavingPromo] = useState(false);

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

      const response = await fetch('/api/promo-codes');

      if (!response.ok) {
        throw new Error('Failed to fetch promo codes');
      }

      const data = await response.json();
      setPromoCodes(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error fetching promo codes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        <p className="text-lg font-medium">Failed to load promo codes</p>
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
          <h1 className="text-3xl font-bold">Promo Codes</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            {selectedLocation ? (
              <>
                <MapPin className="h-4 w-4" />
                {selectedLocation.name}
              </>
            ) : (
              "Create and manage discount codes for customers"
            )}
          </p>
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <Tag className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Codes</p>
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
                <Tag className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Codes</p>
                <p className="text-2xl font-bold">{promoCodes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Promo Codes Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Promo Codes</CardTitle>
          <CardDescription>Manage discount codes for customers</CardDescription>
        </CardHeader>
        <CardContent>
          {promoCodes.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No promo codes yet</p>
              <p className="text-muted-foreground mb-4">Create your first promo code to offer discounts</p>
              <Button onClick={() => setIsAddPromoOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Code
              </Button>
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
    </div>
  );
}
