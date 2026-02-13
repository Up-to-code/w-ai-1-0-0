import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
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
      throw this.state.error;
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
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.text}>جاري إعادة التوجيه...</Text>
      <Text style={styles.hint}>تم مسح بيانات تسجيل الدخول غير الصالحة</Text>
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
});
