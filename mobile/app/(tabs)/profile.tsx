import { View, Text, TouchableOpacity, Alert, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "@/stores/auth";
import { useOfflineStore } from "@/stores/offline";

export default function ProfileScreen() {
  const { user, profile, signOut, loading } = useAuthStore();
  const { clearCache, lastSyncTime, pendingCheckIns, isOnline } = useOfflineStore();

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const handleClearCache = () => {
    if (pendingCheckIns.length > 0) {
      Alert.alert(
        "Pending Changes",
        "You have unsynced changes. Clearing cache will lose these changes. Are you sure?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Clear Anyway",
            style: "destructive",
            onPress: clearCache,
          },
        ]
      );
    } else {
      Alert.alert("Clear Cache", "This will remove all cached manifest data.", [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: clearCache },
      ]);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-amber-100 text-amber-700";
      case "admin":
        return "bg-blue-100 text-blue-700";
      case "location_admin":
        return "bg-purple-100 text-purple-700";
      case "captain":
        return "bg-cyan-100 text-cyan-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "super_admin":
        return "Super Admin";
      case "location_admin":
        return "Location Admin";
      default:
        return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-4">
        {/* Profile Card */}
        <View className="bg-card border border-border rounded-xl p-6 items-center">
          <View className="w-20 h-20 bg-primary/10 rounded-full items-center justify-center">
            <Text className="text-primary text-2xl font-bold">
              {profile?.first_name?.[0]}
              {profile?.last_name?.[0]}
            </Text>
          </View>
          <Text className="text-xl font-bold text-foreground mt-4">
            {profile?.first_name} {profile?.last_name}
          </Text>
          <Text className="text-muted-foreground mt-1">{user?.email}</Text>
          {profile?.role && (
            <View className={`mt-3 px-4 py-1 rounded-full ${getRoleBadgeColor(profile.role)}`}>
              <Text className="font-medium">
                {getRoleLabel(profile.role)}
              </Text>
            </View>
          )}
        </View>

        {/* Connection Status */}
        <View className="bg-card border border-border rounded-xl p-4 mt-4">
          <Text className="font-semibold text-foreground mb-3">Status</Text>

          <View className="flex-row items-center justify-between py-2">
            <View className="flex-row items-center">
              <Ionicons
                name={isOnline ? "cloud-done" : "cloud-offline"}
                size={20}
                color={isOnline ? "#16a34a" : "#ea580c"}
              />
              <Text className="text-foreground ml-2">Connection</Text>
            </View>
            <Text className={isOnline ? "text-green-600" : "text-orange-600"}>
              {isOnline ? "Online" : "Offline"}
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-2 border-t border-border">
            <View className="flex-row items-center">
              <Ionicons name="sync" size={20} color="#64748b" />
              <Text className="text-foreground ml-2">Last Sync</Text>
            </View>
            <Text className="text-muted-foreground">
              {lastSyncTime
                ? new Date(lastSyncTime).toLocaleTimeString()
                : "Never"}
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-2 border-t border-border">
            <View className="flex-row items-center">
              <Ionicons name="hourglass" size={20} color="#64748b" />
              <Text className="text-foreground ml-2">Pending Changes</Text>
            </View>
            <Text
              className={
                pendingCheckIns.length > 0
                  ? "text-yellow-600 font-medium"
                  : "text-muted-foreground"
              }
            >
              {pendingCheckIns.length}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View className="bg-card border border-border rounded-xl mt-4 overflow-hidden">
          <TouchableOpacity
            className="flex-row items-center justify-between p-4 border-b border-border"
            onPress={handleClearCache}
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-muted rounded-lg items-center justify-center">
                <Ionicons name="trash-outline" size={20} color="#64748b" />
              </View>
              <View className="ml-3">
                <Text className="text-foreground font-medium">Clear Cache</Text>
                <Text className="text-muted-foreground text-sm">
                  Remove cached manifest data
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center justify-between p-4 border-b border-border"
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-muted rounded-lg items-center justify-center">
                <Ionicons name="notifications-outline" size={20} color="#64748b" />
              </View>
              <View className="ml-3">
                <Text className="text-foreground font-medium">Notifications</Text>
                <Text className="text-muted-foreground text-sm">
                  Manage push notifications
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center justify-between p-4"
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-muted rounded-lg items-center justify-center">
                <Ionicons name="help-circle-outline" size={20} color="#64748b" />
              </View>
              <View className="ml-3">
                <Text className="text-foreground font-medium">Help & Support</Text>
                <Text className="text-muted-foreground text-sm">
                  Get help with the app
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          className="bg-red-50 border border-red-200 rounded-xl p-4 mt-4 flex-row items-center justify-center"
          onPress={handleSignOut}
          disabled={loading}
        >
          <Ionicons name="log-out-outline" size={20} color="#dc2626" />
          <Text className="text-red-600 font-semibold ml-2">
            {loading ? "Signing out..." : "Sign Out"}
          </Text>
        </TouchableOpacity>

        {/* Version */}
        <Text className="text-center text-muted-foreground text-sm mt-6">
          TourPilot Mobile v1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}
