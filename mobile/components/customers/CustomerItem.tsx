import React, { memo, useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { avatarColorFromString, initialsFromName } from "../../lib/utils";
import { Ionicons } from "@expo/vector-icons";

interface CustomerItemProps {
  contact: {
    _id: string;
    name: string;
    phone: string;
    email?: string;
    tags?: string[];
  };
  chatId?: string;
}

function CustomerItemComponent({ contact, chatId }: CustomerItemProps) {
  const router = useRouter();
  
  const avatarSeed = useMemo(() => 
    `${contact.phone}:${contact.name}`, 
    [contact.phone, contact.name]
  );
  const avatarColor = useMemo(() => avatarColorFromString(avatarSeed), [avatarSeed]);
  const initials = useMemo(() => initialsFromName(contact.name), [contact.name]);

  const handlePress = useCallback(() => {
    if (chatId) {
      router.push(`/chat/${chatId}`);
    }
  }, [router, chatId]);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      disabled={!chatId}
    >
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {contact.name}
          </Text>
          {contact.tags && contact.tags.length > 0 && (
            <View style={styles.tags}>
              {contact.tags.slice(0, 2).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.contactInfo}>
            <Ionicons name="call" size={14} color="#666" />
            <Text style={styles.phone}>{contact.phone}</Text>
          </View>
          {contact.email && (
            <View style={styles.contactInfo}>
              <Ionicons name="mail" size={14} color="#666" />
              <Text style={styles.email} numberOfLines={1}>
                {contact.email}
              </Text>
            </View>
          )}
        </View>
      </View>

      {chatId && (
        <Ionicons name="chevron-forward" size={20} color="#999" />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    flex: 1,
  },
  tags: {
    flexDirection: "row",
    gap: 4,
  },
  tag: {
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    color: "#666",
  },
  footer: {
    gap: 4,
  },
  contactInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  phone: {
    fontSize: 12,
    color: "#666",
  },
  email: {
    fontSize: 12,
    color: "#666",
    flex: 1,
  },
});

export const CustomerItem = memo(CustomerItemComponent);
