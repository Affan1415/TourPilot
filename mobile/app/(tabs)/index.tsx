import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth";
import { useOfflineStore } from "@/stores/offline";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

interface DashboardStats {
  todayBookings: number;
  todayGuests: number;
  todayRevenue: number;
  pendingWaivers: number;
}

export default function DashboardScreen() {
  const { profile } = useAuthStore();
  const { manifests, isOnline, lastSyncTime, downloadTodayManifest, isSyncing } =
    useOfflineStore();
  const [stats, setStats] = useState<DashboardStats>({
    todayBookings: 0,
    todayGuests: 0,
    todayRevenue: 0,
    pendingWaivers: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  const isCaptain = profile?.role === "captain";

  useEffect(() => {
    // Calculate stats from manifests
    const totalBookings = manifests.reduce((sum, m) => sum + m.bookings.length, 0);
    const totalGuests = manifests.reduce(
      (sum, m) => sum + m.bookings.reduce((s, b) => s + b.guest_count, 0),
      0
    );

    setStats({
      todayBookings: totalBookings,
      todayGuests: totalGuests,
      todayRevenue: 0, // Not shown to captains
      pendingWaivers: 0,
    });
  }, [manifests]);

  const onRefresh = async () => {
    setRefreshing(true);
    await downloadTodayManifest();
    setRefreshing(false);
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      refreshControl={
        <RefreshControl refreshing={refreshing || isSyncing} onRefresh={onRefresh} />
      }
    >
      <View className="p-4">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-muted-foreground">
            {greeting()}, {profile?.first_name}
          </Text>
          <Text className="text-2xl font-bold text-foreground mt-1">
            {format(new Date(), "EEEE, MMMM d")}
          </Text>
        </View>

        {/* Connection Status */}
        {!isOnline && (
          <View className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
            <View className="flex-row items-center">
              <Ionicons name="cloud-offline" size={20} color="#ea580c" />
              <Text className="text-orange-700 font-medium ml-2">
                You're offline
              </Text>
            </View>
            <Text className="text-orange-600 text-sm mt-1">
              Changes will sync when you're back online
            </Text>
          </View>
        )}

        {/* Stats Grid */}
        <View className="flex-row flex-wrap -mx-2">
          <View className="w-1/2 px-2 mb-4">
            <View className="bg-card border border-border rounded-xl p-4">
              <View className="flex-row items-center justify-between">
                <View className="w-10 h-10 bg-primary/10 rounded-lg items-center justify-center">
                  <Ionicons name="boat" size={20} color="#0ea5e9" />
                </View>
              </View>
              <Text className="text-2xl font-bold text-foreground mt-3">
                {manifests.length}
              </Text>
              <Text className="text-muted-foreground text-sm">Tours Today</Text>
            </View>
          </View>

          <View className="w-1/2 px-2 mb-4">
            <View className="bg-card border border-border rounded-xl p-4">
              <View className="flex-row items-center justify-between">
                <View className="w-10 h-10 bg-purple-100 rounded-lg items-center justify-center">
                  <Ionicons name="people" size={20} color="#9333ea" />
                </View>
              </View>
              <Text className="text-2xl font-bold text-foreground mt-3">
                {stats.todayGuests}
              </Text>
              <Text className="text-muted-foreground text-sm">Total Guests</Text>
            </View>
          </View>

          <View className="w-1/2 px-2 mb-4">
            <View className="bg-card border border-border rounded-xl p-4">
              <View className="flex-row items-center justify-between">
                <View className="w-10 h-10 bg-green-100 rounded-lg items-center justify-center">
                  <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                </View>
              </View>
              <Text className="text-2xl font-bold text-foreground mt-3">
                {manifests.reduce(
                  (sum, m) => sum + m.bookings.filter((b) => b.checked_in).length,
                  0
                )}
              </Text>
              <Text className="text-muted-foreground text-sm">Checked In</Text>
            </View>
          </View>

          <View className="w-1/2 px-2 mb-4">
            <View className="bg-card border border-border rounded-xl p-4">
              <View className="flex-row items-center justify-between">
                <View className="w-10 h-10 bg-orange-100 rounded-lg items-center justify-center">
                  <Ionicons name="time" size={20} color="#ea580c" />
                </View>
              </View>
              <Text className="text-2xl font-bold text-foreground mt-3">
                {manifests.reduce(
                  (sum, m) => sum + m.bookings.filter((b) => !b.checked_in).length,
                  0
                )}
              </Text>
              <Text className="text-muted-foreground text-sm">Pending</Text>
            </View>
          </View>
        </View>

        {/* Today's Tours */}
        <View className="mt-4">
          <Text className="text-lg font-semibold text-foreground mb-3">
            Today's Tours
          </Text>

          {manifests.length === 0 ? (
            <View className="bg-muted rounded-xl p-6 items-center">
              <Ionicons name="calendar-outline" size={40} color="#94a3b8" />
              <Text className="text-muted-foreground mt-2">
                No tours scheduled for today
              </Text>
            </View>
          ) : (
            manifests.map((manifest) => (
              <TouchableOpacity
                key={manifest.id}
                className="bg-card border border-border rounded-xl p-4 mb-3"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">
                      {manifest.tour_name}
                    </Text>
                    <View className="flex-row items-center mt-1">
                      <Ionicons name="time-outline" size={14} color="#64748b" />
                      <Text className="text-muted-foreground text-sm ml-1">
                        {manifest.start_time?.slice(0, 5)}
                      </Text>
                      {manifest.boat_name && (
                        <>
                          <Text className="text-muted-foreground mx-2">•</Text>
                          <Ionicons name="boat-outline" size={14} color="#64748b" />
                          <Text className="text-muted-foreground text-sm ml-1">
                            {manifest.boat_name}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                  <View className="items-end">
                    <View className="flex-row items-center">
                      <Ionicons name="people" size={16} color="#64748b" />
                      <Text className="text-foreground font-semibold ml-1">
                        {manifest.booked_count}/{manifest.capacity}
                      </Text>
                    </View>
                    <Text className="text-muted-foreground text-xs mt-1">
                      {manifest.bookings.filter((b) => b.checked_in).length} checked in
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Last Sync */}
        {lastSyncTime && (
          <Text className="text-center text-muted-foreground text-xs mt-4">
            Last synced: {format(new Date(lastSyncTime), "h:mm a")}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
