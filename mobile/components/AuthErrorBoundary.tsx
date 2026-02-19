import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../contexts/AuthContext";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/** Catches Convex auth errors (e.g. invalid userId from corrupted storage) and recovers by clearing auth. */
export class AuthErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("[AuthErrorBoundary]", error.message, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const msg = this.state.error.message || "";
      const isInvalidUserId =
        msg.includes("does not match the table name") &&
        msg.includes("users") &&
        (msg.includes("chats") || msg.includes("validator"));

      if (isInvalidUserId) {
        return <AuthRecoveryFallback onRecovered={this.reset} />;
      }
      return <GeneralRecoveryFallback errorMessage={msg} onRecovered={this.reset} />;
    }
    return this.props.children;
  }
}

function AuthRecoveryFallback({ onRecovered }: { onRecovered: () => void }) {
  const { logout } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      await logout();
      if (mounted) {
        router.replace("/(auth)/login");
        onRecovered();
      }
    })();
    return () => {
      mounted = false;
    };
  }, [logout, onRecovered, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.text}>جاري إعادة التوجيه...</Text>
      <Text style={styles.hint}>تم مسح بيانات تسجيل الدخول غير الصالحة</Text>
    </View>
  );
}

function GeneralRecoveryFallback({
  errorMessage,
  onRecovered,
}: {
  errorMessage: string;
  onRecovered: () => void;
}) {
  const { logout } = useAuth();
  const router = useRouter();
  const [working, setWorking] = React.useState(false);

  const safeLogoutAndRedirect = async () => {
    setWorking(true);
    try {
      await logout();
      router.replace("/(auth)/login");
      onRecovered();
    } finally {
      setWorking(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>حدث خطأ أثناء تشغيل التطبيق</Text>
      <Text style={styles.hint}>Unexpected startup error occurred.</Text>
      {errorMessage ? (
        <Text style={styles.errorDetail} numberOfLines={3}>
          {errorMessage}
        </Text>
      ) : null}
      <TouchableOpacity
        disabled={working}
        onPress={safeLogoutAndRedirect}
        style={[styles.retryButton, working && styles.retryButtonDisabled]}
      >
        {working ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.retryButtonText}>إعادة المحاولة</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 24,
  },
  text: {
    fontSize: 16,
    color: "#333",
    marginTop: 16,
    fontFamily: "Cairo_400Regular",
  },
  hint: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
    fontFamily: "Cairo_400Regular",
  },
  errorDetail: {
    fontSize: 11,
    color: "#444",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  retryButton: {
    marginTop: 18,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 140,
    alignItems: "center",
  },
  retryButtonDisabled: {
    opacity: 0.7,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
  },
});
