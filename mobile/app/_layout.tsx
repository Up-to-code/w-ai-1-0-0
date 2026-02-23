import React, { ErrorInfo, useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { ConvexProvider, useQuery } from "convex/react";
import { convexClient, convexInitError, convexUrl, hasConvexUrl } from "../lib/convex";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { LocaleProvider } from "../contexts/LocaleContext";
import { WorkspaceProvider, useWorkspace } from "../contexts/WorkspaceContext";
import { ActivityIndicator, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { AccessDenied } from "../components/AccessDenied";
import { AuthErrorBoundary } from "../components/AuthErrorBoundary";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  clearStartupCrash,
  getUnrecoveredStartupCrash,
  markStartupPhase,
  markStartupReady,
  type StartupCrashInfo,
} from "../lib/startupDiagnostics";
import { flushQueuedRuntimeEvents, reportRuntimeEvent } from "../lib/runtimeTelemetry";

// Keep native splash visible until we explicitly hide it
SplashScreen.preventAutoHideAsync().catch(() => {});

function AuthGuard() {
  const { isAuthenticated, isAdmin, loading, userId, setRole, logout } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    void markStartupPhase("auth_provider_mount");
  }, []);

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
      <NotificationHandlerSetup isAuthenticated={!!isAuthenticated} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="customers" />
        <Stack.Screen name="users/index" />
      </Stack>
    </WorkspaceProvider>
  );
}

function NotificationHandlerSetup({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  const { setActivePhoneNumberId } = useWorkspace();
  useEffect(() => {
    if (!isAuthenticated) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      try {
        const notifications = await import("../lib/notifications");
        if (cancelled) return;
        notifications.configureNotificationHandler();
        cleanup = notifications.setupNotificationHandlers((id) =>
          setActivePhoneNumberId(id)
        );
      } catch (error) {
        console.warn("[Startup] failed to initialize notifications", error);
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [isAuthenticated, setActivePhoneNumberId]);
  return null;
}

const FONT_LOAD_TIMEOUT_MS = 1200;
const SPLASH_HIDE_WATCHDOG_MS = 1800;

function StartupConfigError({
  error,
  value,
}: {
  error: string;
  value: string;
}) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const Updates = await import("expo-updates").catch(() => null);
      if (Updates?.reloadAsync) {
        await Updates.reloadAsync();
      }
    } catch (e) {
      console.warn("[Startup] retry failed", e);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <View style={styles.errorRoot}>
      <Text style={styles.errorTitle}>Startup Configuration Error</Text>
      <Text style={styles.errorText}>
        تعذر تشغيل التطبيق بسبب إعدادات الاتصال بالخادم.
      </Text>
      <Text style={styles.errorDetail}>Reason: {error}</Text>
      <Text style={styles.errorDetail}>
        EXPO_PUBLIC_CONVEX_URL: {value || "(not set)"}
      </Text>
      <Text style={styles.errorHint}>
        Configure EAS env variable EXPO_PUBLIC_CONVEX_URL to an absolute https://...convex.cloud URL.
      </Text>
      <TouchableOpacity
        onPress={handleRetry}
        disabled={retrying}
        style={[styles.retryButton, retrying && styles.retryButtonDisabled]}
      >
        {retrying ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.retryButtonText}>Retry / إعادة المحاولة</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function StartupCrashRecovery({
  crash,
  onRecovered,
}: {
  crash: StartupCrashInfo;
  onRecovered: () => void;
}) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await clearStartupCrash();
      onRecovered();
      const Updates = await import("expo-updates").catch(() => null);
      if (Updates?.reloadAsync) {
        await Updates.reloadAsync();
      }
    } catch (error) {
      console.warn("[Startup] crash recovery retry failed", error);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <View style={styles.errorRoot}>
      <Text style={styles.errorTitle}>Startup Recovery Mode</Text>
      <Text style={styles.errorText}>
        حدث خطأ عند بدء التطبيق في المحاولة السابقة.
      </Text>
      <Text style={styles.errorDetail}>Phase: {crash.phase}</Text>
      <Text style={styles.errorDetail}>Source: {crash.source}</Text>
      <Text style={styles.errorDetail}>Fatal: {crash.isFatal ? "yes" : "no"}</Text>
      <Text style={styles.errorDetail}>
        Time: {new Date(crash.timestamp).toLocaleString()}
      </Text>
      <Text style={styles.errorHint}>Last error: {crash.message}</Text>
      <TouchableOpacity
        onPress={handleRetry}
        disabled={retrying}
        style={[styles.retryButton, retrying && styles.retryButtonDisabled]}
      >
        {retrying ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.retryButtonText}>Retry Startup / إعادة المحاولة</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

type RootFatalBoundaryProps = {
  children: React.ReactNode;
};

type RootFatalBoundaryState = {
  hasError: boolean;
  message: string;
};

class RootFatalBoundary extends React.Component<
  RootFatalBoundaryProps,
  RootFatalBoundaryState
> {
  state: RootFatalBoundaryState = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: unknown): RootFatalBoundaryState {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, _errorInfo: ErrorInfo): void {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[RootFatalBoundary] startup render error", message);
    void reportRuntimeEvent({
      eventName: "root_render_error",
      severity: "fatal",
      message,
    });
  }

  reset = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={styles.errorRoot}>
        <Text style={styles.errorTitle}>Startup Error</Text>
        <Text style={styles.errorText}>
          حدث خطأ أثناء تحميل التطبيق.
        </Text>
        <Text style={styles.errorDetail}>{this.state.message}</Text>
        <TouchableOpacity
          onPress={this.reset}
          style={[styles.retryButton, { marginTop: 18 }]}
        >
          <Text style={styles.retryButtonText}>إعادة المحاولة</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

export default function RootLayout() {
  const [fontTimeoutElapsed, setFontTimeoutElapsed] = useState(false);
  const [startupCrash, setStartupCrash] = useState<StartupCrashInfo | null>(null);

  useEffect(() => {
    void markStartupPhase("app_boot_start");
    void reportRuntimeEvent({
      eventName: "app_boot_start",
      severity: "info",
      phase: "app_boot_start",
    });
    void flushQueuedRuntimeEvents();
  }, []);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync("#FFFFFF").catch(() => {});
  }, []);

  useEffect(() => {
    void markStartupPhase("fonts_init");
  }, []);

  useEffect(() => {
    const phase = hasConvexUrl && convexClient ? "convex_bootstrap_ok" : "convex_bootstrap_failed";
    void markStartupPhase(phase);
    void reportRuntimeEvent({
      eventName: phase,
      severity: phase === "convex_bootstrap_ok" ? "info" : "error",
      phase,
      message: phase === "convex_bootstrap_ok" ? "Convex client initialized." : convexInitError ?? "Convex init failed",
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const crash = await getUnrecoveredStartupCrash();
      if (!cancelled) {
        setStartupCrash(crash);
        if (crash) {
          void reportRuntimeEvent({
            eventName: "startup_crash_recovered",
            severity: crash.isFatal ? "fatal" : "error",
            message: crash.message,
            phase: crash.phase,
            metadata: { source: crash.source, timestamp: crash.timestamp },
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fallback: proceed after timeout if fonts hang (known Android EAS build issue)
  useEffect(() => {
    const t = setTimeout(() => setFontTimeoutElapsed(true), FONT_LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  const canProceed = fontTimeoutElapsed;

  // Hide splash when we're ready to render
  useEffect(() => {
    if (canProceed) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [canProceed]);

  useEffect(() => {
    const watchdog = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, SPLASH_HIDE_WATCHDOG_MS);
    return () => clearTimeout(watchdog);
  }, []);

  useEffect(() => {
    if (canProceed && hasConvexUrl && convexClient) {
      void markStartupReady();
    }
  }, [canProceed, convexClient]);

  if (!canProceed) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (startupCrash) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <StartupCrashRecovery
            crash={startupCrash}
            onRecovered={() => setStartupCrash(null)}
          />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (!hasConvexUrl || !convexClient) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <StartupConfigError
            error={convexInitError ?? "Unknown Convex bootstrap error"}
            value={convexUrl}
          />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <RootFatalBoundary>
          <LocaleProvider>
            <AuthProvider>
              <ConvexProvider client={convexClient}>
                <AuthErrorBoundary>
                  <AuthGuard />
                </AuthErrorBoundary>
              </ConvexProvider>
            </AuthProvider>
          </LocaleProvider>
        </RootFatalBoundary>
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
  errorDetail: {
    fontSize: 12,
    color: "#444",
    textAlign: "center",
    marginTop: 6,
  },
  errorHint: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 18,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 220,
    alignItems: "center",
  },
  retryButtonDisabled: {
    opacity: 0.7,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
