import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useQuery } from "convex/react";
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

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#000" />
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
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
});
