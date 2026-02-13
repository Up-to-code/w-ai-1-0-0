import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { Header } from "../../components/Header";
import { useLocale } from "../../contexts/LocaleContext";
import { Ionicons } from "@expo/vector-icons";

type UserRole = "admin" | "agent" | "user";

const roleLabelsAr: Record<UserRole, string> = {
  admin: "مدير",
  agent: "وكيل",
  user: "مستخدم",
};

const roleLabelsEn: Record<UserRole, string> = {
  admin: "Admin",
  agent: "Agent",
  user: "User",
};

function getInitials(name?: string, email?: string, phone?: string): string {
  if (name) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  if (email) return email.substring(0, 2).toUpperCase();
  if (phone) return phone.slice(-2);
  return "?";
}

export default function UsersScreen() {
  const { t, locale, isRTL } = useLocale();
  const users = useQuery(api.users.list) ?? [];
  const updateRole = useMutation(api.users.updateRole);

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const roleLabels = locale === "ar" ? roleLabelsAr : roleLabelsEn;
  const rtlRow = isRTL ? styles.rowReverse : styles.row;

  const handleEdit = (user: { _id: string; role: UserRole }) => {
    setEditingUserId(user._id);
    setSelectedRole(user.role);
  };

  const handleCancel = () => {
    setEditingUserId(null);
    setSelectedRole(null);
  };

  const handleSave = async (userId: string) => {
    if (!selectedRole) return;
    setIsSaving(true);
    try {
      await updateRole({
        userId: userId as Id<"users">,
        role: selectedRole,
      });
      Alert.alert(t("success"), locale === "ar" ? "تم تحديث الدور بنجاح" : "Role updated successfully");
      setEditingUserId(null);
      setSelectedRole(null);
    } catch (error: any) {
      Alert.alert(t("error"), error.message || (locale === "ar" ? "فشل تحديث الدور" : "Failed to update role"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScreenWrapper edges={["top"]}>
      <Header title={t("manage_users")} showBack />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={[styles.subtitle, isRTL && styles.textRight]}>
          {locale === "ar" ? `إجمالي: ${users.length} مستخدم` : `Total: ${users.length} users`}
        </Text>

        {users.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {locale === "ar" ? "لا يوجد مستخدمين" : "No users yet"}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {users.map((user) => {
              const isEditing = editingUserId === user._id;
              const initials = getInitials(user.name, user.email, user.phone);

              return (
                <View key={user._id} style={styles.card}>
                  <View style={[styles.cardMain, rtlRow]}>
                    <View style={[styles.avatar, { backgroundColor: "#007AFF" }]}>
                      <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                    <View style={[styles.info, isRTL && styles.infoRTL]}>
                      <Text style={[styles.name, isRTL && styles.textRight]} numberOfLines={1}>
                        {user.name || user.email || user.phone || (locale === "ar" ? "بدون اسم" : "No name")}
                      </Text>
                      {(user.email || user.phone) && (
                        <Text style={[styles.meta, isRTL && styles.textRight]} numberOfLines={1}>
                          {user.email || user.phone}
                        </Text>
                      )}
                    </View>
                  </View>

                  {isEditing ? (
                    <View style={styles.editSection}>
                      <View style={[styles.rolePicker, rtlRow]}>
                        {(["admin", "agent", "user"] as const).map((role) => (
                          <TouchableOpacity
                            key={role}
                            style={[
                              styles.roleButton,
                              selectedRole === role && styles.roleButtonActive,
                            ]}
                            onPress={() => setSelectedRole(role)}
                          >
                            <Text
                              style={[
                                styles.roleButtonText,
                                selectedRole === role && styles.roleButtonTextActive,
                              ]}
                            >
                              {roleLabels[role]}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <View style={[styles.actions, rtlRow]}>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.saveBtn]}
                          onPress={() => handleSave(user._id)}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <Text style={styles.saveBtnText}>{t("save")}</Text>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.cancelBtn]}
                          onPress={handleCancel}
                          disabled={isSaving}
                        >
                          <Text style={styles.cancelBtnText}>{t("cancel")}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={[styles.roleRow, rtlRow]}>
                      <View style={[styles.roleBadge, roleBadgeVariant(user.role)]}>
                        <Text style={styles.roleBadgeText}>{roleLabels[user.role as UserRole]}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => handleEdit(user as { _id: string; role: UserRole })}
                      >
                        <Ionicons name="pencil" size={18} color="#007AFF" />
                        <Text style={styles.editBtnText}>{t("edit")}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.spacer} />
      </ScrollView>
    </ScreenWrapper>
  );
}

function roleBadgeVariant(role: string) {
  switch (role) {
    case "admin":
      return { backgroundColor: "#007AFF" };
    case "agent":
      return { backgroundColor: "#34C759" };
    default:
      return { backgroundColor: "#8E8E93" };
  }
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  content: {
    padding: 16,
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 12,
    marginHorizontal: 4,
  },
  empty: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    color: "#999",
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  cardMain: {
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginEnd: 12,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  info: {
    flex: 1,
  },
  infoRTL: {
    alignItems: "flex-end",
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
  },
  meta: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  roleRow: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  editBtnText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
  editSection: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  rolePicker: {
    flexDirection: "row",
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  roleButtonActive: {
    backgroundColor: "#007AFF",
  },
  roleButtonText: {
    fontSize: 13,
    color: "#666",
  },
  roleButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  saveBtn: {
    backgroundColor: "#007AFF",
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  cancelBtn: {
    backgroundColor: "#F0F0F0",
  },
  cancelBtnText: {
    color: "#666",
    fontSize: 15,
  },
  row: {
    flexDirection: "row",
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  textRight: {
    textAlign: "right",
  },
  spacer: {
    height: 40,
  },
});
