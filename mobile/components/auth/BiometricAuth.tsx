import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { storage } from "../../lib/storage";

interface BiometricAuthProps {
  onSuccess: () => void;
  onFallback: () => void;
}

export function BiometricAuth({ onSuccess, onFallback }: BiometricAuthProps) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [authModule, setAuthModule] = useState<{
    hasHardwareAsync: () => Promise<boolean>;
    supportedAuthenticationTypesAsync: () => Promise<number[]>;
    isEnrolledAsync: () => Promise<boolean>;
    authenticateAsync: (options: {
      promptMessage: string;
      cancelLabel: string;
      fallbackLabel: string;
      disableDeviceFallback: boolean;
    }) => Promise<{ success: boolean; error?: string }>;
    AuthenticationType: {
      FACIAL_RECOGNITION: number;
      FINGERPRINT: number;
    };
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const moduleNamespace = await import("expo-local-authentication");
        if (cancelled) return;
        setAuthModule(moduleNamespace);
      } catch (error) {
        console.error("Failed to load biometric module:", error);
        if (!cancelled) {
          setIsAvailable(false);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authModule) return;
    void checkBiometricAvailability(authModule);
  }, [authModule]);

  const checkBiometricAvailability = async (localAuth: NonNullable<typeof authModule>) => {
    try {
      const compatible = await localAuth.hasHardwareAsync();
      if (!compatible) {
        setIsAvailable(false);
        setLoading(false);
        return;
      }

      const types = await localAuth.supportedAuthenticationTypesAsync();
      const isEnrolled = await localAuth.isEnrolledAsync();

      if (!isEnrolled) {
        setIsAvailable(false);
        setLoading(false);
        return;
      }

      setIsAvailable(true);
      
      if (types.includes(localAuth.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType("Face ID");
      } else if (types.includes(localAuth.AuthenticationType.FINGERPRINT)) {
        setBiometricType("Touch ID");
      } else {
        setBiometricType("Biometric");
      }
    } catch (error) {
      console.error("Error checking biometric availability:", error);
      setIsAvailable(false);
    } finally {
      setLoading(false);
    }
  };

  const authenticate = async () => {
    try {
      if (!authModule) {
        onFallback();
        return;
      }

      const result = await authModule.authenticateAsync({
        promptMessage: "Authenticate to access W-AI",
        cancelLabel: "Cancel",
        fallbackLabel: "Use Password",
        disableDeviceFallback: false,
      });

      if (result.success) {
        const biometricEnabled = await storage.getBiometricEnabled();
        if (!biometricEnabled) {
          await storage.setBiometricEnabled(true);
        }
        onSuccess();
      } else if (result.error === "user_cancel") {
        // User cancelled, show fallback
        onFallback();
      } else if (result.error === "user_fallback") {
        // User chose fallback
        onFallback();
      }
    } catch (error) {
      console.error("Biometric authentication error:", error);
      Alert.alert("Error", "Biometric authentication failed. Please try again.");
      onFallback();
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Checking authentication...</Text>
      </View>
    );
  }

  if (!isAvailable) {
    return null; // Don't show biometric option if not available
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={authenticate}>
        <Text style={styles.buttonText}>
          {Platform.OS === "ios" && biometricType === "Face ID"
            ? "🔒 Use Face ID"
            : Platform.OS === "ios" && biometricType === "Touch ID"
            ? "🔒 Use Touch ID"
            : "🔒 Use Biometric"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 200,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingText: {
    color: "#666",
    fontSize: 14,
  },
});
