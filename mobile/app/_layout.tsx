import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { ConvexProvider, useQuery } from "convex/react";
import { convexClient } from "../lib/convex";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { LocaleProvider, useLocale } from "../contexts/LocaleContext";
import { ActivityIndicator, View, I18nManager } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AccessDenied } from "../components/AccessDenied";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  useFonts,
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
} from "@expo-google-fonts/cairo";
import { setupNotificationHandlers } from "../lib/notifications";

function AuthGuard() {
  const { isAuthenticated, isAdmin, loading, userId, setRole } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Fetch user to get role from server
  const user = useQuery(
    api.auth.getUser, 
    userId ? { userId: userId as Id<"users"> } : "skip"
  );

  // Update role when user data is fetched
  useEffect(() => {
    if (user?.role && setRole) {
      setRole(user.role as "admin" | "agent" | "user");
    }
  }, [user?.role, setRole]);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // If authenticated but not admin, show access denied
  // Skip this check if we're still loading user data or in auth group
  const inAuthGroup = segments[0] === "(auth)";
  if (isAuthenticated && !inAuthGroup && user && !isAdmin) {
    return <AccessDenied />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="customers" />
    </Stack>
  );
}

export default function RootLayout() {
  // Load Cairo font for Arabic
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });

  // Enable RTL by default for Arabic
  useEffect(() => {
    I18nManager.allowRTL(true);
  }, []);

  // Setup notification handlers
  useEffect(() => {
    setupNotificationHandlers();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <LocaleProvider>
        <AuthProvider>
          <ConvexProvider client={convexClient}>
            <AuthGuard />
          </ConvexProvider>
        </AuthProvider>
      </LocaleProvider>
    </SafeAreaProvider>
  );
}
