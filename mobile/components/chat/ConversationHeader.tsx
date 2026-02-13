import { View, Text, StyleSheet, TouchableOpacity, I18nManager, Switch } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { avatarColorFromString, initialsFromName } from "../../lib/utils";

interface ConversationHeaderProps {
  chatId: string;
}

export function ConversationHeader({ chatId }: ConversationHeaderProps) {
  const router = useRouter();
  const chat = useQuery(api.chat.getChat, { chatId: chatId as any });
  const toggleAi = useMutation(api.chat.toggleAiMode);

  if (!chat) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const avatarSeed = `${chat.contactPhone}:${chat.contactName}`;
  const avatarColor = avatarColorFromString(avatarSeed);
  const initials = initialsFromName(chat.contactName);
  const aiMode = chat.aiMode ?? false;

  const handleAiToggle = (enabled: boolean) => {
    toggleAi({ chatId: chat._id, enabled });
  };

  const isRTL = I18nManager.isRTL;
  return (
    <View style={[styles.container, isRTL && styles.containerRTL]}>
      <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, isRTL && styles.backButtonRTL]}>
        <Ionicons
          name={isRTL ? "arrow-forward" : "arrow-back"}
          size={24}
          color="#000"
        />
      </TouchableOpacity>

      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {chat.contactName}
        </Text>
        <Text style={styles.phone} numberOfLines={1}>
          {chat.contactPhone}
        </Text>
      </View>

      <View style={[styles.aiToggle, isRTL && styles.aiToggleRTL]}>
        <Ionicons
          name={aiMode ? "sparkles" : "person"}
          size={18}
          color={aiMode ? "#007AFF" : "#666"}
          style={styles.aiIcon}
        />
        <Text style={[styles.aiLabel, !aiMode && styles.aiLabelOff]}>
          {aiMode ? "AI" : "إنسان"}
        </Text>
        <Switch
          value={aiMode}
          onValueChange={handleAiToggle}
          trackColor={{ false: "#E5E5E5", true: "#007AFF" }}
          thumbColor="#FFFFFF"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  backButton: {
    marginRight: 12,
  },
  backButtonRTL: {
    marginRight: 0,
    marginLeft: 12,
  },
  containerRTL: {
    flexDirection: "row-reverse",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  // RTL: avatar margin handled by container flexDirection row-reverse
  avatarText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  phone: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  loadingText: {
    color: "#666",
    fontSize: 14,
  },
  aiToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#F0F0F0",
    borderRadius: 10,
    marginLeft: 12,
  },
  aiToggleRTL: {
    marginLeft: 0,
    marginRight: 12,
  },
  aiIcon: {
    marginBottom: 2,
  },
  aiLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#007AFF",
  },
  aiLabelOff: {
    color: "#666",
  },
});
