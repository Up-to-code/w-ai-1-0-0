import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "../../contexts/AuthContext";
import { useLocale } from "../../contexts/LocaleContext";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { Header } from "../../components/Header";
import { Id } from "../../../convex/_generated/dataModel";

export default function SettingsScreen() {
  const { userId, logout } = useAuth();
  const { t, locale, direction, isRTL, setLocale, setDirection } = useLocale();
  
  const user = useQuery(
    api.auth.getUser, 
    userId ? { userId: userId as Id<"users"> } : "skip"
  );
  
  const updateUser = useMutation(api.auth.updateUser);
  const changePassword = useMutation(api.auth.changePassword);

  // Profile state
  const [name, setName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);

  // Password state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

  const handleSaveName = async () => {
    if (!name.trim()) {
      Alert.alert(t("error"), t("fill_all_fields"));
      return;
    }

    setSavingName(true);
    try {
      await updateUser({ 
        userId: userId as Id<"users">, 
        name: name.trim() 
      });
      Alert.alert(t("success"), t("profile_updated"));
      setIsEditingName(false);
    } catch (error: any) {
      Alert.alert(t("error"), error.message);
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(t("error"), t("fill_all_fields"));
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(t("error"), t("password_min_length"));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t("error"), t("password_mismatch"));
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword({
        userId: userId as Id<"users">,
        currentPassword,
        newPassword,
      });
      Alert.alert(t("success"), t("password_changed"));
      setShowPasswordSection(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      Alert.alert(t("error"), error.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLanguageChange = async (newLocale: "ar" | "en") => {
    await setLocale(newLocale);
  };

  const handleDirectionChange = async (newDirection: "rtl" | "ltr") => {
    Alert.alert(
      t("confirm"),
      locale === "ar" ? "سيتم إعادة تشغيل التطبيق لتطبيق التغييرات" : "App will restart to apply changes",
      [
        { text: t("cancel"), style: "cancel" },
        { text: t("confirm"), onPress: () => setDirection(newDirection) },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      t("sign_out"),
      locale === "ar" ? "هل أنت متأكد من تسجيل الخروج؟" : "Are you sure you want to sign out?",
      [
        { text: t("cancel"), style: "cancel" },
        { text: t("sign_out"), style: "destructive", onPress: logout },
      ]
    );
  };

  const rtlRow = isRTL ? styles.rowReverse : styles.row;
  const rtlText = isRTL ? styles.textRight : styles.textLeft;

  return (
    <ScreenWrapper edges={["top"]}>
      <Header title={t("settings")} />
      
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, rtlText, styles.cairoFont]}>
            {t("profile")}
          </Text>
          
          <View style={styles.card}>
            {/* Name */}
            <View style={[styles.settingRow, rtlRow]}>
              <View style={[styles.settingLabel, rtlRow]}>
                <Ionicons name="person-outline" size={20} color="#666" />
                <Text style={[styles.settingText, styles.cairoFont]}>{t("name")}</Text>
              </View>
              
              {isEditingName ? (
                <View style={[styles.editRow, rtlRow]}>
                  <TextInput
                    style={[styles.editInput, rtlText, styles.cairoFont]}
                    value={name}
                    onChangeText={setName}
                    autoFocus
                  />
                  <TouchableOpacity 
                    onPress={handleSaveName}
                    disabled={savingName}
                    style={styles.saveButton}
                  >
                    {savingName ? (
                      <ActivityIndicator size="small" color="#007AFF" />
                    ) : (
                      <Ionicons name="checkmark" size={20} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => {
                      setIsEditingName(false);
                      setName(user?.name || "");
                    }}
                    style={styles.cancelButton}
                  >
                    <Ionicons name="close" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={[styles.valueRow, rtlRow]}
                  onPress={() => setIsEditingName(true)}
                >
                  <Text style={[styles.valueText, styles.cairoFont]}>{user?.name || "-"}</Text>
                  <Ionicons name="pencil" size={16} color="#007AFF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Email */}
            <View style={[styles.settingRow, rtlRow]}>
              <View style={[styles.settingLabel, rtlRow]}>
                <Ionicons name="mail-outline" size={20} color="#666" />
                <Text style={[styles.settingText, styles.cairoFont]}>{t("email")}</Text>
              </View>
              <Text style={[styles.valueText, styles.cairoFont]}>{user?.email || user?.phone || "-"}</Text>
            </View>
          </View>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, rtlText, styles.cairoFont]}>
            {t("appearance")}
          </Text>
          
          <View style={styles.card}>
            {/* Language */}
            <View style={[styles.settingRow, rtlRow]}>
              <View style={[styles.settingLabel, rtlRow]}>
                <Ionicons name="language-outline" size={20} color="#666" />
                <Text style={[styles.settingText, styles.cairoFont]}>{t("language")}</Text>
              </View>
              
              <View style={[styles.toggleGroup, rtlRow]}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    locale === "ar" && styles.toggleButtonActive,
                  ]}
                  onPress={() => handleLanguageChange("ar")}
                >
                  <Text style={[
                    styles.toggleText,
                    styles.cairoFont,
                    locale === "ar" && styles.toggleTextActive,
                  ]}>
                    {t("arabic")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    locale === "en" && styles.toggleButtonActive,
                  ]}
                  onPress={() => handleLanguageChange("en")}
                >
                  <Text style={[
                    styles.toggleText,
                    styles.cairoFont,
                    locale === "en" && styles.toggleTextActive,
                  ]}>
                    {t("english")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Direction */}
            <View style={[styles.settingRow, rtlRow]}>
              <View style={[styles.settingLabel, rtlRow]}>
                <Ionicons name="swap-horizontal-outline" size={20} color="#666" />
                <Text style={[styles.settingText, styles.cairoFont]}>{t("direction")}</Text>
              </View>
              
              <View style={[styles.toggleGroup, rtlRow]}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    direction === "rtl" && styles.toggleButtonActive,
                  ]}
                  onPress={() => handleDirectionChange("rtl")}
                >
                  <Text style={[
                    styles.toggleText,
                    styles.cairoFont,
                    direction === "rtl" && styles.toggleTextActive,
                  ]}>
                    {t("rtl")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    direction === "ltr" && styles.toggleButtonActive,
                  ]}
                  onPress={() => handleDirectionChange("ltr")}
                >
                  <Text style={[
                    styles.toggleText,
                    styles.cairoFont,
                    direction === "ltr" && styles.toggleTextActive,
                  ]}>
                    {t("ltr")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, rtlText, styles.cairoFont]}>
            {t("account")}
          </Text>
          
          <View style={styles.card}>
            {/* Change Password */}
            <TouchableOpacity 
              style={[styles.settingRow, rtlRow]}
              onPress={() => setShowPasswordSection(!showPasswordSection)}
            >
              <View style={[styles.settingLabel, rtlRow]}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" />
                <Text style={[styles.settingText, styles.cairoFont]}>{t("change_password")}</Text>
              </View>
              <Ionicons 
                name={showPasswordSection ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#999" 
              />
            </TouchableOpacity>

            {showPasswordSection && (
              <View style={styles.passwordSection}>
                <TextInput
                  style={[styles.passwordInput, rtlText, styles.cairoFont]}
                  placeholder={t("current_password")}
                  placeholderTextColor="#999"
                  secureTextEntry
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                />
                <TextInput
                  style={[styles.passwordInput, rtlText, styles.cairoFont]}
                  placeholder={t("new_password")}
                  placeholderTextColor="#999"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TextInput
                  style={[styles.passwordInput, rtlText, styles.cairoFont]}
                  placeholder={t("confirm_password")}
                  placeholderTextColor="#999"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity
                  style={[styles.savePasswordButton, savingPassword && styles.buttonDisabled]}
                  onPress={handleChangePassword}
                  disabled={savingPassword}
                >
                  {savingPassword ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={[styles.savePasswordText, styles.cairoFont]}>{t("save")}</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          <Text style={[styles.logoutText, styles.cairoFont]}>{t("sign_out")}</Text>
        </TouchableOpacity>

        <View style={styles.spacer} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
    marginHorizontal: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  row: {
    flexDirection: "row",
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  textLeft: {
    textAlign: "left",
  },
  textRight: {
    textAlign: "right",
  },
  settingLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingText: {
    fontSize: 15,
    color: "#000",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  valueText: {
    fontSize: 15,
    color: "#666",
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    marginLeft: 16,
  },
  editInput: {
    flex: 1,
    fontSize: 15,
    color: "#000",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveButton: {
    padding: 8,
  },
  cancelButton: {
    padding: 8,
  },
  toggleGroup: {
    flexDirection: "row",
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: "#007AFF",
  },
  toggleText: {
    fontSize: 13,
    color: "#666",
  },
  toggleTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  passwordSection: {
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  passwordInput: {
    fontSize: 15,
    color: "#000",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FAFAFA",
  },
  savePasswordButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  savePasswordText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  logoutText: {
    color: "#FF3B30",
    fontSize: 16,
    fontWeight: "600",
  },
  spacer: {
    height: 40,
  },
  cairoFont: {
    fontFamily: "Cairo_400Regular",
  },
});
