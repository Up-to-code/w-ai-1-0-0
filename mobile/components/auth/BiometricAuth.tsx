import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { storage } from "../../lib/storage";

interface BiometricAuthProps {
  onSuccess: () => void;
  onFallback: () => void;
}

export function BiometricAuth({ onSuccess, onFallback }: BiometricAuthProps) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        setIsAvailable(false);
        setLoading(false);
        return;
      }

      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!isEnrolled) {
        setIsAvailable(false);
        setLoading(false);
        return;
      }

      setIsAvailable(true);
      
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType("Face ID");
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
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
      const result = await LocalAuthentication.authenticateAsync({
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
