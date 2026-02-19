import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { ConvexProvider, useQuery } from "convex/react";
import { convexClient, hasConvexUrl } from "../lib/convex";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { LocaleProvider } from "../contexts/LocaleContext";
import { WorkspaceProvider, useWorkspace } from "../contexts/WorkspaceContext";
import { ActivityIndicator, View, I18nManager, Text, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import { AccessDenied } from "../components/AccessDenied";
import { AuthErrorBoundary } from "../components/AuthErrorBoundary";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  useFonts,
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
} from "@expo-google-fonts/cairo";
import { setupNotificationHandlers } from "../lib/notifications";

// Keep native splash visible until we explicitly hide it
SplashScreen.preventAutoHideAsync().catch(() => {});

function AuthGuard() {
  const { isAuthenticated, isAdmin, loading, userId, setRole, logout } = useAuth();
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
    } else if (isAuthenticated && !inAuthGroup && user === null) {
      // Stale local auth state: backend no longer has this user/session.
      void logout();
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, loading, segments, user, logout, router]);

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
  const effectiveIsAdmin = user?.role ? user.role === "admin" : isAdmin;
  if (isAuthenticated && !inAuthGroup && user && !effectiveIsAdmin) {
    return <AccessDenied />;
  }

  return (
    <WorkspaceProvider>
      <NotificationHandlerSetup />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="customers" />
        <Stack.Screen name="users/index" />
      </Stack>
    </WorkspaceProvider>
  );
}

function NotificationHandlerSetup() {
  const { setActivePhoneNumberId } = useWorkspace();
  useEffect(() => {
    const cleanup = setupNotificationHandlers((id) => setActivePhoneNumberId(id));
    return cleanup;
  }, [setActivePhoneNumberId]);
  return null;
}

const FONT_LOAD_TIMEOUT_MS = 5000;

export default function RootLayout() {
  const [fontTimeoutElapsed, setFontTimeoutElapsed] = useState(false);

  // Load Cairo font for Arabic - may hang on Android release; use timeout fallback
  const [fontsLoaded, fontError] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });

  // Fallback: proceed after timeout if fonts hang (known Android EAS build issue)
  useEffect(() => {
    const t = setTimeout(() => setFontTimeoutElapsed(true), FONT_LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  const canProceed = fontsLoaded || !!fontError || fontTimeoutElapsed;

  // Enable RTL by default for Arabic
  useEffect(() => {
    I18nManager.allowRTL(true);
  }, []);

  // Hide splash when we're ready to render
  useEffect(() => {
    if (canProceed) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [canProceed]);

  if (!canProceed) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!hasConvexUrl) {
    return (
      <View style={styles.errorRoot}>
        <Text style={styles.errorTitle}>Configuration Error</Text>
        <Text style={styles.errorText}>
          EXPO_PUBLIC_CONVEX_URL is not set. For EAS builds, run: eas secret:create
          --name EXPO_PUBLIC_CONVEX_URL --value https://YOUR-DEPLOYMENT.convex.cloud
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <LocaleProvider>
          <AuthProvider>
            <ConvexProvider client={convexClient}>
              <AuthErrorBoundary>
                <AuthGuard />
              </AuthErrorBoundary>
            </ConvexProvider>
          </AuthProvider>
        </LocaleProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  loadingRoot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  errorRoot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 24,
  },
  errorTitle: { fontSize: 18, fontWeight: "600", marginBottom: 12, color: "#333" },
  errorText: { fontSize: 14, color: "#666", textAlign: "center" },
});
