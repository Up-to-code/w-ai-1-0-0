import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { Ionicons } from "@expo/vector-icons";

interface Message {
  _id: string;
  direction: "inbound" | "outbound";
  type: "text" | "image" | "video" | "audio" | "document" | "template" | "interactive";
  content?: string;
  mediaId?: string;
  storageId?: string;
}

interface ForwardMessageModalProps {
  visible: boolean;
  message: Message | null;
  currentChatId: string;
  onClose: () => void;
  onForwardComplete?: () => void;
}

export function ForwardMessageModal({
  visible,
  message,
  currentChatId,
  onClose,
  onForwardComplete,
}: ForwardMessageModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [forwarding, setForwarding] = useState(false);
  const { activePhoneNumberId } = useWorkspace();

  const chats = useQuery(api.chat.listChats, {
    phoneNumberId: activePhoneNumberId ?? undefined,
  });
  const sendMessage = useMutation(api.chat.sendMessage);

  const filteredChats = useMemo(() => {
    if (!chats) return [];
    
    // Filter out current chat
    const availableChats = chats.filter((chat) => chat._id !== currentChatId);
    
    if (!searchQuery.trim()) return availableChats;

    const query = searchQuery.toLowerCase();
    return availableChats.filter(
      (chat) =>
        chat.contactName?.toLowerCase().includes(query) ||
        chat.contactPhone?.includes(query)
    );
  }, [chats, currentChatId, searchQuery]);

  const handleForward = async (targetChatId: string) => {
    if (!message || forwarding) return;

    try {
      setForwarding(true);

      await sendMessage({
        chatId: targetChatId as any,
        type: message.type,
        content: message.content || "",
        mediaId: message.mediaId,
        storageId: message.storageId,
      });

      if (onForwardComplete) {
        onForwardComplete();
      }
      onClose();
    } catch (error) {
      console.error("Failed to forward message:", error);
    } finally {
      setForwarding(false);
    }
  };

  const renderChatItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => handleForward(item._id)}
      disabled={forwarding}
      accessibilityLabel={`Forward to ${item.contactName || item.contactPhone}`}
      accessibilityRole="button"
    >
      <View style={styles.chatAvatar}>
        <Text style={styles.chatAvatarText}>
          {(item.contactName || item.contactPhone || "?")[0].toUpperCase()}
        </Text>
      </View>
      <View style={styles.chatInfo}>
        <Text style={styles.chatName} numberOfLines={1}>
          {item.contactName || item.contactPhone || "Unknown"}
        </Text>
        {item.contactName && (
          <Text style={styles.chatPhone} numberOfLines={1}>
            {item.contactPhone}
          </Text>
        )}
      </View>
      {forwarding && (
        <ActivityIndicator size="small" color="#007AFF" style={styles.forwardingIndicator} />
      )}
    </TouchableOpacity>
  );

  if (!message) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={24} color="#111B21" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Forward Message</Text>
          <View style={styles.closeButton} />
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search chats..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Chat List */}
        {!chats ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : filteredChats.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? "No chats found" : "No other chats available"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredChats}
            renderItem={renderChatItem}
            keyExtractor={(item) => item._id}
            {...({ style: styles.list } as object)}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111B21",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    gap: 8,
  },
  searchIcon: {
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111B21",
  },
  list: {
    flex: 1,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    gap: 12,
  },
  chatAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  chatAvatarText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111B21",
  },
  chatPhone: {
    fontSize: 14,
    color: "#667781",
    marginTop: 2,
  },
  forwardingIndicator: {
    marginLeft: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#667781",
  },
});
