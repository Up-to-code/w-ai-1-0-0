import React, { memo, useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { avatarColorFromString, initialsFromName } from "../../lib/utils";
import { format } from "date-fns";

interface ChatItemProps {
  chat: {
    _id: string;
    contactName: string;
    contactPhone: string;
    lastMessageTime: number;
    unreadCount: number;
    status?: "active" | "expired";
  };
}

function ChatItemComponent({ chat }: ChatItemProps) {
  const router = useRouter();
  
  const avatarSeed = useMemo(() => 
    `${chat.contactPhone}:${chat.contactName}`, 
    [chat.contactPhone, chat.contactName]
  );
  const avatarColor = useMemo(() => avatarColorFromString(avatarSeed), [avatarSeed]);
  const initials = useMemo(() => initialsFromName(chat.contactName), [chat.contactName]);
  const formattedTime = useMemo(() => 
    format(new Date(chat.lastMessageTime), "HH:mm"), 
    [chat.lastMessageTime]
  );

  const handlePress = useCallback(() => {
    router.push(`/chat/${chat._id}`);
  }, [router, chat._id]);

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {chat.contactName}
          </Text>
          <Text style={styles.time}>
            {formattedTime}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.preview} numberOfLines={1}>
            {chat.status === "expired" ? "Session expired" : "Tap to view messages"}
          </Text>
          {chat.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{chat.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    backgroundColor: "#FFFFFF",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: "#999",
    marginLeft: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  preview: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  badge: {
    backgroundColor: "#007AFF",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
});

export const ChatItem = memo(ChatItemComponent);
