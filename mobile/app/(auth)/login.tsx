import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "../../contexts/AuthContext";
import { useLocale } from "../../contexts/LocaleContext";
import { useRouter } from "expo-router";
import { BiometricAuth } from "../../components/auth/BiometricAuth";
import { storage } from "../../lib/storage";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { registerForPushNotificationsAsync } from "../../lib/notifications";
import { Id } from "../../../convex/_generated/dataModel";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const loginMutation = useMutation(api.auth.login);
  const recordPushToken = useMutation(api.auth.recordPushNotificationToken);
  const { login } = useAuth();
  const { t, isRTL } = useLocale();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t("error"), t("fill_all_fields"));
      return;
    }

    setLoading(true);
    try {
      const userId = await loginMutation({ email, password });
      if (userId) {
        await login(userId, userId);
        
        // Register for push notifications after successful login
        try {
          const pushToken = await registerForPushNotificationsAsync();
          if (pushToken) {
            await recordPushToken({
              token: pushToken,
              userId: userId as Id<"users">,
            });
            console.log("Push token registered successfully");
          }
        } catch (error) {
          console.error("Failed to register push token:", error);
          // Don't block login if push registration fails
        }
        
        router.replace("/(tabs)");
      }
    } catch (error: any) {
      Alert.alert(t("login_failed"), error.message || t("invalid_credentials"));
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricSuccess = async () => {
    const userId = await storage.getUserId();
    if (userId) {
      await login(userId, userId);
      
      // Register for push notifications after biometric login
      try {
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) {
          await recordPushToken({
            token: pushToken,
            userId: userId as Id<"users">,
          });
          console.log("Push token registered successfully");
        }
      } catch (error) {
        console.error("Failed to register push token:", error);
      }
      
      router.replace("/(tabs)");
    } else {
      Alert.alert(t("error"), t("fill_all_fields"));
    }
  };

  const handleBiometricFallback = () => {
    // Already visible
  };

  const rtlText = isRTL ? styles.textRight : styles.textLeft;

  return (
    <ScreenWrapper withKeyboard edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={[styles.title, styles.cairoFont]}>{t("app_name")}</Text>
          <Text style={[styles.subtitle, styles.cairoFont]}>{t("sign_in_subtitle")}</Text>

          {Platform.OS === "ios" ? (
            <BiometricAuth
              onSuccess={handleBiometricSuccess}
              onFallback={handleBiometricFallback}
            />
          ) : null}

          <View style={styles.form}>
            <TextInput
              style={[styles.input, rtlText, styles.cairoFont]}
              placeholder={t("email")}
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />

            <TextInput
              style={[styles.input, rtlText, styles.cairoFont]}
              placeholder={t("password")}
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[styles.buttonText, styles.cairoFont]}>{t("sign_in")}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.push("/(auth)/register")}
            >
              <Text style={[styles.linkText, styles.cairoFont]}>
                {t("no_account")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    color: "#000",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    color: "#666",
  },
  form: {
    gap: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#F9F9F9",
    color: "#000",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  linkButton: {
    marginTop: 16,
    alignItems: "center",
  },
  linkText: {
    color: "#007AFF",
    fontSize: 14,
  },
  textLeft: {
    textAlign: "left",
  },
  textRight: {
    textAlign: "right",
  },
  cairoFont: {
    fontFamily: "Cairo_400Regular",
  },
});
