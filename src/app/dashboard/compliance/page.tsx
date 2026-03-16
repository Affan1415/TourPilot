"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/dialog";
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  Search,
  Calendar,
  Users,
  FileText,
  Clock,
  Loader2,
  RefreshCw,
  Ship,
  ChevronRight,
  AlertCircle,
  ClipboardCheck,
} from "lucide-react";
import { format, subDays, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface ChecklistCompletion {
  id: string;
  completed_at: string;
  notes: string | null;
  captain: {
    name: string;
  };
  availability: {
    date: string;
    start_time: string;
    tour: {
      name: string;
    };
  };
  template: {
    name: string;
    items: any[];
  };
  completed_items: any[];
}

interface ComplianceStats {
  totalToursToday: number;
  checklistsCompletedToday: number;
  complianceRateToday: number;
  totalToursWeek: number;
  checklistsCompletedWeek: number;
  complianceRateWeek: number;
}

export default function ComplianceDashboard() {
  const [loading, setLoading] = useState(true);
  const [completions, setCompletions] = useState<ChecklistCompletion[]>([]);
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("7");
  const [selectedCompletion, setSelectedCompletion] = useState<ChecklistCompletion | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const supabase = createClient();
      const startDate = subDays(new Date(), parseInt(dateFilter));

      // Fetch completions
      const { data: completionsData } = await supabase
        .from('checklist_completions')
        .select(`
          id,
          completed_at,
          notes,
          completed_items,
          captain:staff!checklist_completions_captain_id_fkey (name),
          availability:availabilities!checklist_completions_availability_id_fkey (
            date,
            start_time,
            tour:tours!inner (name)
          ),
          template:checklist_templates!checklist_completions_checklist_template_id_fkey (
            name,
            items
          )
        `)
        .gte('completed_at', format(startDate, 'yyyy-MM-dd'))
        .order('completed_at', { ascending: false });

      if (completionsData) {
        setCompletions(completionsData as any);
      }

      // Calculate stats
      const today = format(new Date(), 'yyyy-MM-dd');
      const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');

      // Tours today with assigned captains
      const { count: toursToday } = await supabase
        .from('availability_staff')
        .select('id', { count: 'exact' })
        .eq('availabilities.date', today);

      // Checklists completed today
      const { count: checklistsToday } = await supabase
        .from('checklist_completions')
        .select('id', { count: 'exact' })
        .gte('completed_at', `${today}T00:00:00`)
        .lte('completed_at', `${today}T23:59:59`);

      // Tours this week
      const { count: toursWeek } = await supabase
        .from('availability_staff')
        .select('id', { count: 'exact' })
        .gte('availabilities.date', weekAgo)
        .lte('availabilities.date', today);

      // Checklists this week
      const { count: checklistsWeek } = await supabase
        .from('checklist_completions')
        .select('id', { count: 'exact' })
        .gte('completed_at', `${weekAgo}T00:00:00`);

      setStats({
        totalToursToday: toursToday || 0,
        checklistsCompletedToday: checklistsToday || 0,
        complianceRateToday: toursToday ? Math.round(((checklistsToday || 0) / toursToday) * 100) : 0,
        totalToursWeek: toursWeek || 0,
        checklistsCompletedWeek: checklistsWeek || 0,
        complianceRateWeek: toursWeek ? Math.round(((checklistsWeek || 0) / toursWeek) * 100) : 0,
      });
    } catch (error) {
      console.error('Error fetching compliance data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const filteredCompletions = completions.filter((c) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      c.captain?.name?.toLowerCase().includes(searchLower) ||
      c.availability?.tour?.name?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading compliance data...</p>
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
            <Shield className="h-6 w-6 text-primary" />
            Safety Compliance
          </h1>
          <p className="text-muted-foreground">
            Monitor captain safety checklist compliance
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today's Rate</p>
                <p className={cn(
                  "text-2xl font-bold",
                  (stats?.complianceRateToday || 0) >= 90 ? "text-green-600" :
                    (stats?.complianceRateToday || 0) >= 70 ? "text-orange-600" : "text-red-600"
                )}>
                  {stats?.complianceRateToday || 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <ClipboardCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-2xl font-bold">
                  {stats?.checklistsCompletedToday || 0}/{stats?.totalToursToday || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">
                  {stats?.checklistsCompletedWeek || 0}/{stats?.totalToursWeek || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Week Rate</p>
                <p className={cn(
                  "text-2xl font-bold",
                  (stats?.complianceRateWeek || 0) >= 90 ? "text-green-600" :
                    (stats?.complianceRateWeek || 0) >= 70 ? "text-orange-600" : "text-red-600"
                )}>
                  {stats?.complianceRateWeek || 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search captain or tour..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Today</SelectItem>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Completions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Completed Checklists</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCompletions.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No checklists completed in this period</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Captain</TableHead>
                  <TableHead>Tour</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Completed At</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompletions.map((completion) => (
                  <TableRow key={completion.id}>
                    <TableCell className="font-medium">
                      {completion.captain?.name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {completion.availability?.tour?.name || 'Unknown Tour'}
                    </TableCell>
                    <TableCell>
                      {completion.availability?.date ? format(parseISO(completion.availability.date), "MMM d, yyyy") : '-'}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(parseISO(completion.completed_at), "h:mm a")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50">
                        <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                        {completion.completed_items?.filter((i: any) => i.checked).length || 0}/
                        {completion.template?.items?.length || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCompletion(completion)}
                      >
                        View
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedCompletion} onOpenChange={(open) => !open && setSelectedCompletion(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Checklist Details
            </DialogTitle>
          </DialogHeader>

          {selectedCompletion && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Captain</p>
                  <p className="font-medium">{selectedCompletion.captain?.name || 'Unknown'}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Tour</p>
                  <p className="font-medium">{selectedCompletion.availability?.tour?.name || 'Unknown'}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {selectedCompletion.availability?.date ?
                      format(parseISO(selectedCompletion.availability.date), "MMM d, yyyy") : '-'}
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Completed At</p>
                  <p className="font-medium">
                    {format(parseISO(selectedCompletion.completed_at), "h:mm a")}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Checklist Items</p>
                <div className="space-y-2 max-h-[300px] overflow-auto">
                  {selectedCompletion.template?.items?.map((item: any, index: number) => {
                    const completed = selectedCompletion.completed_items?.find((c: any) => c.itemId === item.id);
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border",
                          completed?.checked ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                        )}
                      >
                        {completed?.checked ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                        )}
                        <span className="text-sm">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedCompletion.notes && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Captain Notes</p>
                  <p className="text-sm">{selectedCompletion.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
