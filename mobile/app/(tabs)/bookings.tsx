import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { Booking } from "@/types";

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "today" | "upcoming">("today");

  const fetchBookings = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      let query = supabase
        .from("bookings")
        .select(`
          *,
          customer:customers(first_name, last_name, email, phone),
          availability:availabilities(
            date,
            start_time,
            tour:tours(name)
          )
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (filter === "today") {
        query = query.eq("availability.date", today);
      } else if (filter === "upcoming") {
        query = query.gte("availability.date", today);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter by availability date for today/upcoming
      let filteredData = data || [];
      if (filter === "today") {
        filteredData = filteredData.filter(
          (b: any) => b.availability?.date === today
        );
      } else if (filter === "upcoming") {
        filteredData = filteredData.filter(
          (b: any) => b.availability?.date >= today
        );
      }

      setBookings(filteredData);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
  };

  const filteredBookings = bookings.filter((booking: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const customerName =
      `${booking.customer?.first_name} ${booking.customer?.last_name}`.toLowerCase();
    const reference = booking.booking_reference?.toLowerCase();
    return customerName.includes(query) || reference.includes(query);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      case "completed":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <View className="flex-1 bg-background">
      {/* Search & Filters */}
      <View className="p-4 bg-card border-b border-border">
        <View className="flex-row items-center bg-muted rounded-xl px-4">
          <Ionicons name="search" size={20} color="#64748b" />
          <TextInput
            className="flex-1 py-3 px-2 text-foreground"
            placeholder="Search by name or reference..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        <View className="flex-row mt-3">
          {(["today", "upcoming", "all"] as const).map((f) => (
            <TouchableOpacity
              key={f}
              className={`px-4 py-2 rounded-full mr-2 ${
                filter === f ? "bg-primary" : "bg-muted"
              }`}
              onPress={() => setFilter(f)}
            >
              <Text
                className={`font-medium capitalize ${
                  filter === f ? "text-white" : "text-muted-foreground"
                }`}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Bookings List */}
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="p-4">
          {loading ? (
            <View className="items-center py-20">
              <Text className="text-muted-foreground">Loading bookings...</Text>
            </View>
          ) : filteredBookings.length === 0 ? (
            <View className="items-center py-20">
              <Ionicons name="calendar-outline" size={60} color="#94a3b8" />
              <Text className="text-muted-foreground text-lg mt-4">
                No bookings found
              </Text>
            </View>
          ) : (
            filteredBookings.map((booking: any) => (
              <TouchableOpacity
                key={booking.id}
                className="bg-card border border-border rounded-xl p-4 mb-3"
                onPress={() => {
                  // Could navigate to booking detail
                }}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text className="font-semibold text-foreground">
                        {booking.customer?.first_name} {booking.customer?.last_name}
                      </Text>
                      <View
                        className={`ml-2 px-2 py-0.5 rounded-full ${getStatusColor(
                          booking.status
                        )}`}
                      >
                        <Text className="text-xs font-medium capitalize">
                          {booking.status}
                        </Text>
                      </View>
                    </View>

                    <Text className="text-muted-foreground text-sm mt-1">
                      {booking.availability?.tour?.name}
                    </Text>

                    <View className="flex-row items-center mt-2">
                      <Ionicons name="calendar-outline" size={14} color="#64748b" />
                      <Text className="text-muted-foreground text-sm ml-1">
                        {booking.availability?.date &&
                          format(new Date(booking.availability.date), "MMM d, yyyy")}
                      </Text>
                      <Text className="text-muted-foreground mx-2">•</Text>
                      <Ionicons name="time-outline" size={14} color="#64748b" />
                      <Text className="text-muted-foreground text-sm ml-1">
                        {booking.availability?.start_time?.slice(0, 5)}
                      </Text>
                    </View>
                  </View>

                  <View className="items-end">
                    <Text className="text-xs text-muted-foreground font-mono">
                      {booking.booking_reference}
                    </Text>
                    <View className="flex-row items-center mt-2">
                      <Ionicons name="people" size={14} color="#64748b" />
                      <Text className="text-foreground font-medium ml-1">
                        {booking.guest_count}
                      </Text>
                    </View>
                    <Text className="text-primary font-semibold mt-1">
                      ${booking.total_price}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
