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
  BookOpen,
  Search,
  Calendar,
  Loader2,
  RefreshCw,
  Ship,
  ChevronRight,
  Clock,
  Fuel,
  Cloud,
  Waves,
  Users,
  Camera,
  FileText,
  AlertTriangle,
  Sparkles,
  MapPin,
  Anchor,
  User,
} from "lucide-react";
import { format, subDays, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useLocation } from "@/lib/location/context";
import type { TourLog, Staff, Boat } from "@/types";

interface TourLogWithRelations extends Omit<TourLog, 'availability' | 'captain'> {
  availability: {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    boat_id: string | null;
    tour: {
      id: string;
      name: string;
    };
    boat?: {
      id: string;
      name: string;
    };
  };
  captain: {
    id: string;
    name: string;
  };
}

interface LogStats {
  totalLogs: number;
  totalFuelUsed: number;
  averageTripDuration: number;
  issuesReported: number;
}

export default function LogBookPage() {
  const { selectedLocation } = useLocation();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<TourLogWithRelations[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [captains, setCaptains] = useState<Staff[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("30");
  const [boatFilter, setBoatFilter] = useState("all");
  const [captainFilter, setCaptainFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<TourLogWithRelations | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const supabase = createClient();
      const startDate = subDays(new Date(), parseInt(dateFilter));

      // Fetch tour logs with relations
      let query = supabase
        .from('tour_logs')
        .select(`
          *,
          captain:staff!tour_logs_captain_id_fkey (id, name),
          availability:availabilities!tour_logs_availability_id_fkey (
            id,
            date,
            start_time,
            end_time,
            boat_id,
            tour:tours!inner (id, name),
            boat:boats (id, name)
          )
        `)
        .gte('created_at', format(startDate, 'yyyy-MM-dd'))
        .order('created_at', { ascending: false });

      if (boatFilter !== "all") {
        query = query.eq('availability.boat_id', boatFilter);
      }

      if (captainFilter !== "all") {
        query = query.eq('captain_id', captainFilter);
      }

      const { data: logsData, error } = await query;

      if (error) {
        console.error('Error fetching logs:', error);
      } else if (logsData) {
        // Filter out logs where availability is null (happens with inner join filter)
        const validLogs = logsData.filter(log => log.availability !== null) as TourLogWithRelations[];
        setLogs(validLogs);

        // Calculate stats
        const totalFuel = validLogs.reduce((sum, log) => sum + (log.fuel_used || 0), 0);
        const issuesCount = validLogs.filter(log => log.issues && log.issues.trim().length > 0).length;

        // Calculate average trip duration
        let totalDuration = 0;
        let tripCount = 0;
        validLogs.forEach(log => {
          if (log.actual_departure && log.actual_return) {
            const departure = new Date(log.actual_departure);
            const returnTime = new Date(log.actual_return);
            const durationMinutes = (returnTime.getTime() - departure.getTime()) / (1000 * 60);
            if (durationMinutes > 0 && durationMinutes < 1440) { // Valid trip under 24 hours
              totalDuration += durationMinutes;
              tripCount++;
            }
          }
        });

        setStats({
          totalLogs: validLogs.length,
          totalFuelUsed: totalFuel,
          averageTripDuration: tripCount > 0 ? Math.round(totalDuration / tripCount) : 0,
          issuesReported: issuesCount,
        });
      }

      // Fetch boats for filter
      const { data: boatsData } = await supabase
        .from('boats')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (boatsData) {
        setBoats(boatsData as Boat[]);
      }

      // Fetch captains for filter
      const { data: captainsData } = await supabase
        .from('staff')
        .select('id, name')
        .eq('role', 'captain')
        .eq('is_active', true)
        .order('name');

      if (captainsData) {
        setCaptains(captainsData as Staff[]);
      }

    } catch (error) {
      console.error('Error fetching log book data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateFilter, boatFilter, captainFilter, selectedLocation]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const filteredLogs = logs.filter((log) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      log.captain?.name?.toLowerCase().includes(searchLower) ||
      log.availability?.tour?.name?.toLowerCase().includes(searchLower) ||
      log.availability?.boat?.name?.toLowerCase().includes(searchLower) ||
      log.notes?.toLowerCase().includes(searchLower) ||
      log.highlights?.toLowerCase().includes(searchLower)
    );
  });

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const getWeatherBadgeColor = (conditions: string | null) => {
    if (!conditions) return "bg-gray-100 text-gray-600";
    const lower = conditions.toLowerCase();
    if (lower.includes("sunny") || lower.includes("clear")) return "bg-yellow-100 text-yellow-700";
    if (lower.includes("cloudy") || lower.includes("overcast")) return "bg-gray-100 text-gray-600";
    if (lower.includes("rain") || lower.includes("storm")) return "bg-blue-100 text-blue-700";
    return "bg-gray-100 text-gray-600";
  };

  const getSeaBadgeColor = (conditions: string | null) => {
    if (!conditions) return "bg-gray-100 text-gray-600";
    const lower = conditions.toLowerCase();
    if (lower.includes("calm") || lower.includes("flat")) return "bg-green-100 text-green-700";
    if (lower.includes("moderate") || lower.includes("choppy")) return "bg-yellow-100 text-yellow-700";
    if (lower.includes("rough") || lower.includes("heavy")) return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-600";
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading log book...</p>
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
            <BookOpen className="h-6 w-6 text-primary" />
            Log Book
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            {selectedLocation ? (
              <>
                <MapPin className="h-4 w-4" />
                {selectedLocation.name}
              </>
            ) : (
              "Boat journey records for compliance tracking"
            )}
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
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Logs</p>
                <p className="text-2xl font-bold">{stats?.totalLogs || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Fuel className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Fuel</p>
                <p className="text-2xl font-bold">{stats?.totalFuelUsed?.toFixed(1) || 0} gal</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Duration</p>
                <p className="text-2xl font-bold">
                  {stats?.averageTripDuration ? formatDuration(stats.averageTripDuration) : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Issues Reported</p>
                <p className="text-2xl font-bold">{stats?.issuesReported || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search captain, tour, boat..."
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
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
        <Select value={boatFilter} onValueChange={setBoatFilter}>
          <SelectTrigger className="w-[180px]">
            <Anchor className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Boats" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Boats</SelectItem>
            {boats.map((boat) => (
              <SelectItem key={boat.id} value={boat.id}>{boat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={captainFilter} onValueChange={setCaptainFilter}>
          <SelectTrigger className="w-[180px]">
            <User className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Captains" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Captains</SelectItem>
            {captains.map((captain) => (
              <SelectItem key={captain.id} value={captain.id}>{captain.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Journey Records</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No journey logs found in this period</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Captain</TableHead>
                  <TableHead>Tour</TableHead>
                  <TableHead>Boat</TableHead>
                  <TableHead>Departure</TableHead>
                  <TableHead>Return</TableHead>
                  <TableHead>Fuel</TableHead>
                  <TableHead>Conditions</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {log.availability?.date
                        ? format(parseISO(log.availability.date), "MMM d, yyyy")
                        : '-'}
                    </TableCell>
                    <TableCell>{log.captain?.name || 'Unknown'}</TableCell>
                    <TableCell>{log.availability?.tour?.name || '-'}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <Ship className="h-3 w-3 text-muted-foreground" />
                        {log.availability?.boat?.name || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {log.actual_departure
                        ? format(parseISO(log.actual_departure), "h:mm a")
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {log.actual_return
                        ? format(parseISO(log.actual_return), "h:mm a")
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {log.fuel_used ? `${log.fuel_used} ${log.fuel_unit || 'gal'}` : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {log.weather_conditions && (
                          <Badge variant="outline" className={cn("text-xs", getWeatherBadgeColor(log.weather_conditions))}>
                            <Cloud className="h-3 w-3 mr-1" />
                            {log.weather_conditions}
                          </Badge>
                        )}
                        {log.sea_conditions && (
                          <Badge variant="outline" className={cn("text-xs", getSeaBadgeColor(log.sea_conditions))}>
                            <Waves className="h-3 w-3 mr-1" />
                            {log.sea_conditions}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
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
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Journey Log Details
            </DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              {/* Basic Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Date
                  </p>
                  <p className="font-medium">
                    {selectedLog.availability?.date
                      ? format(parseISO(selectedLog.availability.date), "MMM d, yyyy")
                      : '-'}
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" /> Captain
                  </p>
                  <p className="font-medium">{selectedLog.captain?.name || 'Unknown'}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Ship className="h-3 w-3" /> Tour
                  </p>
                  <p className="font-medium">{selectedLog.availability?.tour?.name || '-'}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Anchor className="h-3 w-3" /> Boat
                  </p>
                  <p className="font-medium">{selectedLog.availability?.boat?.name || '-'}</p>
                </div>
              </div>

              {/* Time and Fuel */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Departure
                  </p>
                  <p className="font-medium">
                    {selectedLog.actual_departure
                      ? format(parseISO(selectedLog.actual_departure), "h:mm a")
                      : '-'}
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Return
                  </p>
                  <p className="font-medium">
                    {selectedLog.actual_return
                      ? format(parseISO(selectedLog.actual_return), "h:mm a")
                      : '-'}
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Fuel className="h-3 w-3" /> Fuel Used
                  </p>
                  <p className="font-medium">
                    {selectedLog.fuel_used
                      ? `${selectedLog.fuel_used} ${selectedLog.fuel_unit || 'gallons'}`
                      : '-'}
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" /> Guests
                  </p>
                  <p className="font-medium">{selectedLog.guest_count || '-'}</p>
                </div>
              </div>

              {/* Conditions */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                    <Cloud className="h-3 w-3" /> Weather Conditions
                  </p>
                  {selectedLog.weather_conditions ? (
                    <Badge variant="outline" className={getWeatherBadgeColor(selectedLog.weather_conditions)}>
                      {selectedLog.weather_conditions}
                    </Badge>
                  ) : (
                    <p className="text-muted-foreground text-sm">Not recorded</p>
                  )}
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                    <Waves className="h-3 w-3" /> Sea Conditions
                  </p>
                  {selectedLog.sea_conditions ? (
                    <Badge variant="outline" className={getSeaBadgeColor(selectedLog.sea_conditions)}>
                      {selectedLog.sea_conditions}
                    </Badge>
                  ) : (
                    <p className="text-muted-foreground text-sm">Not recorded</p>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedLog.notes && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <FileText className="h-3 w-3" /> Notes
                  </p>
                  <p className="text-sm">{selectedLog.notes}</p>
                </div>
              )}

              {/* Highlights */}
              {selectedLog.highlights && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <Sparkles className="h-3 w-3" /> Highlights
                  </p>
                  <p className="text-sm">{selectedLog.highlights}</p>
                </div>
              )}

              {/* Issues */}
              {selectedLog.issues && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <AlertTriangle className="h-3 w-3" /> Issues
                  </p>
                  <p className="text-sm">{selectedLog.issues}</p>
                </div>
              )}

              {/* Photos */}
              {selectedLog.photos && selectedLog.photos.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                    <Camera className="h-3 w-3" /> Photos ({selectedLog.photos.length})
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedLog.photos.map((photo, index) => (
                      <a
                        key={index}
                        href={photo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block aspect-video bg-muted rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                      >
                        <img
                          src={photo}
                          alt={`Journey photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className="text-xs text-muted-foreground text-right pt-2 border-t">
                Log created: {format(parseISO(selectedLog.created_at), "MMM d, yyyy h:mm a")}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
