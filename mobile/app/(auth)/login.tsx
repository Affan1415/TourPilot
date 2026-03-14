import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "@/stores/auth";
import { Ionicons } from "@expo/vector-icons";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, loading } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    const { error } = await signIn(email, password);

    if (error) {
      Alert.alert("Login Failed", error.message);
    } else {
      router.replace("/(tabs)");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background"
    >
      <View className="flex-1 justify-center px-6">
        {/* Logo */}
        <View className="items-center mb-12">
          <View className="w-20 h-20 bg-primary rounded-2xl items-center justify-center mb-4">
            <Ionicons name="boat" size={40} color="white" />
          </View>
          <Text className="text-3xl font-bold text-foreground">TourPilot</Text>
          <Text className="text-muted-foreground mt-2">Staff & Captain App</Text>
        </View>

        {/* Form */}
        <View className="space-y-4">
          <View>
            <Text className="text-sm font-medium text-foreground mb-2">Email</Text>
            <View className="flex-row items-center bg-muted rounded-xl px-4">
              <Ionicons name="mail-outline" size={20} color="#64748b" />
              <TextInput
                className="flex-1 py-4 px-3 text-foreground"
                placeholder="you@example.com"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View className="mt-4">
            <Text className="text-sm font-medium text-foreground mb-2">Password</Text>
            <View className="flex-row items-center bg-muted rounded-xl px-4">
              <Ionicons name="lock-closed-outline" size={20} color="#64748b" />
              <TextInput
                className="flex-1 py-4 px-3 text-foreground"
                placeholder="••••••••"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            className={`mt-6 py-4 rounded-xl items-center ${
              loading ? "bg-primary/50" : "bg-primary"
            }`}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text className="text-white font-semibold text-lg">
              {loading ? "Signing in..." : "Sign In"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text className="text-center text-muted-foreground mt-8 text-sm">
          Contact your administrator if you need access
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
