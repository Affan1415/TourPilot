import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useAuthStore } from "@/stores/auth";
import { useOfflineStore } from "@/stores/offline";
import {
  registerForPushNotificationsAsync,
  savePushToken,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
} from "@/lib/notifications";
import "../global.css";

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { initialize, initialized, user } = useAuthStore();
  const { loadCachedData, downloadTodayManifest } = useOfflineStore();

  useEffect(() => {
    const init = async () => {
      await initialize();
      await loadCachedData();
      await SplashScreen.hideAsync();
    };

    init();
  }, []);

  useEffect(() => {
    if (user) {
      // Register for push notifications
      registerForPushNotificationsAsync().then((token) => {
        if (token) {
          savePushToken(user.id, token);
        }
      });

      // Download today's manifest
      downloadTodayManifest();

      // Set up notification listeners
      const receivedSubscription = addNotificationReceivedListener((notification) => {
        console.log("Notification received:", notification);
      });

      const responseSubscription = addNotificationResponseReceivedListener((response) => {
        console.log("Notification response:", response);
        // Handle navigation based on notification data
      });

      return () => {
        receivedSubscription.remove();
        responseSubscription.remove();
      };
    }
  }, [user]);

  if (!initialized) {
    return null;
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
