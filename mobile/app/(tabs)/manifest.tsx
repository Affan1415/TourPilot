import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useOfflineStore } from "@/stores/offline";

export default function ManifestScreen() {
  const {
    manifests,
    isOnline,
    downloadTodayManifest,
    checkInBooking,
    isSyncing,
    pendingCheckIns,
  } = useOfflineStore();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedTour, setExpandedTour] = useState<string | null>(
    manifests[0]?.id || null
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await downloadTodayManifest();
    setRefreshing(false);
  };

  const handleCheckIn = async (bookingId: string, currentStatus: boolean) => {
    const action = currentStatus ? "undo check-in for" : "check in";
    Alert.alert(
      currentStatus ? "Undo Check-in" : "Check In Guest",
      `Are you sure you want to ${action} this booking?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: currentStatus ? "Undo" : "Check In",
          style: currentStatus ? "destructive" : "default",
          onPress: () => checkInBooking(bookingId, !currentStatus),
        },
      ]
    );
  };

  const callGuest = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const isPending = (bookingId: string) => {
    return pendingCheckIns.some((p) => p.booking_id === bookingId && !p.synced);
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      refreshControl={
        <RefreshControl refreshing={refreshing || isSyncing} onRefresh={onRefresh} />
      }
    >
      <View className="p-4">
        {/* Offline Banner */}
        {!isOnline && (
          <View className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
            <View className="flex-row items-center">
              <Ionicons name="cloud-offline" size={20} color="#ea580c" />
              <Text className="text-orange-700 font-medium ml-2">
                Offline Mode
              </Text>
            </View>
            <Text className="text-orange-600 text-sm mt-1">
              Check-ins will sync when you're back online
            </Text>
          </View>
        )}

        {manifests.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Ionicons name="document-text-outline" size={60} color="#94a3b8" />
            <Text className="text-muted-foreground text-lg mt-4">
              No tours today
            </Text>
            <Text className="text-muted-foreground text-center mt-2">
              Pull down to refresh or check back later
            </Text>
          </View>
        ) : (
          manifests.map((manifest) => (
            <View
              key={manifest.id}
              className="bg-card border border-border rounded-xl mb-4 overflow-hidden"
            >
              {/* Tour Header */}
              <TouchableOpacity
                className="p-4 bg-muted/50"
                onPress={() =>
                  setExpandedTour(expandedTour === manifest.id ? null : manifest.id)
                }
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="font-bold text-foreground text-lg">
                      {manifest.tour_name}
                    </Text>
                    <View className="flex-row items-center mt-1">
                      <Ionicons name="time-outline" size={14} color="#64748b" />
                      <Text className="text-muted-foreground ml-1">
                        {manifest.start_time?.slice(0, 5)}
                      </Text>
                      {manifest.boat_name && (
                        <>
                          <Text className="text-muted-foreground mx-2">•</Text>
                          <Ionicons name="boat-outline" size={14} color="#64748b" />
                          <Text className="text-muted-foreground ml-1">
                            {manifest.boat_name}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                  <View className="items-end">
                    <View className="bg-primary/10 px-3 py-1 rounded-full">
                      <Text className="text-primary font-semibold">
                        {manifest.booked_count}/{manifest.capacity}
                      </Text>
                    </View>
                    <Ionicons
                      name={expandedTour === manifest.id ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#64748b"
                      style={{ marginTop: 4 }}
                    />
                  </View>
                </View>

                {/* Progress Bar */}
                <View className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                  <View
                    className="h-full bg-green-500"
                    style={{
                      width: `${
                        manifest.bookings.length > 0
                          ? (manifest.bookings.filter((b) => b.checked_in).length /
                              manifest.bookings.length) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </View>
                <Text className="text-muted-foreground text-xs mt-1">
                  {manifest.bookings.filter((b) => b.checked_in).length} of{" "}
                  {manifest.bookings.length} checked in
                </Text>
              </TouchableOpacity>

              {/* Bookings List */}
              {expandedTour === manifest.id && (
                <View className="border-t border-border">
                  {manifest.bookings.length === 0 ? (
                    <View className="p-6 items-center">
                      <Text className="text-muted-foreground">
                        No bookings for this tour
                      </Text>
                    </View>
                  ) : (
                    manifest.bookings.map((booking, index) => (
                      <View
                        key={booking.id}
                        className={`p-4 ${
                          index < manifest.bookings.length - 1
                            ? "border-b border-border"
                            : ""
                        }`}
                      >
                        <View className="flex-row items-start justify-between">
                          <View className="flex-1">
                            <View className="flex-row items-center">
                              <Text className="font-semibold text-foreground">
                                {booking.customer.first_name}{" "}
                                {booking.customer.last_name}
                              </Text>
                              {isPending(booking.id) && (
                                <View className="bg-yellow-100 px-2 py-0.5 rounded-full ml-2">
                                  <Text className="text-yellow-700 text-xs">
                                    Syncing...
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text className="text-muted-foreground text-sm">
                              {booking.booking_reference} • {booking.guest_count}{" "}
                              guest{booking.guest_count > 1 ? "s" : ""}
                            </Text>

                            {/* Guest List */}
                            <View className="mt-2">
                              {booking.guests.map((guest) => (
                                <View
                                  key={guest.id}
                                  className="flex-row items-center py-1"
                                >
                                  <Ionicons
                                    name={
                                      guest.waiver_signed
                                        ? "checkmark-circle"
                                        : "alert-circle"
                                    }
                                    size={14}
                                    color={guest.waiver_signed ? "#16a34a" : "#ea580c"}
                                  />
                                  <Text className="text-muted-foreground text-sm ml-2">
                                    {guest.first_name} {guest.last_name}
                                  </Text>
                                  {!guest.waiver_signed && (
                                    <Text className="text-orange-600 text-xs ml-2">
                                      Waiver pending
                                    </Text>
                                  )}
                                </View>
                              ))}
                            </View>

                            {booking.notes && (
                              <View className="mt-2 bg-muted/50 p-2 rounded">
                                <Text className="text-muted-foreground text-sm">
                                  📝 {booking.notes}
                                </Text>
                              </View>
                            )}
                          </View>

                          <View className="items-end ml-4">
                            {/* Check-in Button */}
                            <TouchableOpacity
                              className={`px-4 py-2 rounded-lg ${
                                booking.checked_in ? "bg-green-500" : "bg-primary"
                              }`}
                              onPress={() =>
                                handleCheckIn(booking.id, booking.checked_in)
                              }
                            >
                              <View className="flex-row items-center">
                                <Ionicons
                                  name={
                                    booking.checked_in
                                      ? "checkmark-circle"
                                      : "enter-outline"
                                  }
                                  size={18}
                                  color="white"
                                />
                                <Text className="text-white font-medium ml-1">
                                  {booking.checked_in ? "Done" : "Check In"}
                                </Text>
                              </View>
                            </TouchableOpacity>

                            {/* Call Button */}
                            {booking.customer.phone && (
                              <TouchableOpacity
                                className="mt-2 flex-row items-center"
                                onPress={() => callGuest(booking.customer.phone!)}
                              >
                                <Ionicons name="call-outline" size={16} color="#0ea5e9" />
                                <Text className="text-primary text-sm ml-1">Call</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
