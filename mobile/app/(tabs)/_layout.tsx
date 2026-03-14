import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth";
import { View, Text } from "react-native";
import { useOfflineStore } from "@/stores/offline";

export default function TabLayout() {
  const { session, profile } = useAuthStore();
  const { isOnline, pendingCheckIns } = useOfflineStore();

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  const isCaptain = profile?.role === "captain";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#0ea5e9",
        tabBarInactiveTintColor: "#64748b",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#e2e8f0",
          paddingTop: 8,
          paddingBottom: 8,
          height: 80,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
        headerStyle: {
          backgroundColor: "#ffffff",
        },
        headerTitleStyle: {
          fontWeight: "600",
        },
        headerRight: () => (
          <View className="flex-row items-center mr-4">
            {!isOnline && (
              <View className="bg-orange-100 px-2 py-1 rounded-full mr-2">
                <Text className="text-orange-600 text-xs font-medium">Offline</Text>
              </View>
            )}
            {pendingCheckIns.length > 0 && (
              <View className="bg-yellow-100 px-2 py-1 rounded-full">
                <Text className="text-yellow-600 text-xs font-medium">
                  {pendingCheckIns.length} pending
                </Text>
              </View>
            )}
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="manifest"
        options={{
          title: "Manifest",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      {!isCaptain && (
        <Tabs.Screen
          name="bookings"
          options={{
            title: "Bookings",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar" size={size} color={color} />
            ),
          }}
        />
      )}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
