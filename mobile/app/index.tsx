import { Redirect } from "expo-router";
import { useAuthStore } from "@/stores/auth";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const { session, loading } = useAuthStore();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
