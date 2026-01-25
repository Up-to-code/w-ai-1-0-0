import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Message {
  _id: string;
  direction: "inbound" | "outbound";
  type: "text" | "image" | "video" | "audio" | "document" | "template" | "interactive";
  content?: string;
  mediaUrl?: string;
  timestamp: number;
  status?: "sent" | "delivered" | "read" | "failed";
}

interface MessageActionsModalProps {
  visible: boolean;
  message: Message | null;
  onClose: () => void;
  onDownload: () => void;
  onForward: () => void;
  onReply: () => void;
  position?: { x: number; y: number };
}

export function MessageActionsModal({
  visible,
  message,
  onClose,
  onDownload,
  onForward,
  onReply,
  position,
}: MessageActionsModalProps) {
  if (!message) return null;

  const hasMedia = ["image", "video", "audio", "document"].includes(message.type);

  // Calculate modal position near the message bubble
  const getModalPosition = () => {
    if (!position) return {};
    
    const screenWidth = Dimensions.get("window").width;
    const screenHeight = Dimensions.get("window").height;
    const modalWidth = 180;
    const modalHeight = hasMedia ? 180 : 140; // Approximate height
    const inputSectionHeight = 200; // Approximate input section height
    const minTopMargin = 60; // Minimum distance from top
    const gap = 10; // Gap between message and modal
    
    // Try to position above message first
    let top = position.y - modalHeight - gap;
    
    // If modal would overlap with input section, position it above message instead
    const inputSectionTop = screenHeight - inputSectionHeight;
    if (top + modalHeight > inputSectionTop) {
      // Position above the message bubble
      top = position.y - modalHeight - gap;
      
      // If that would go off screen, position at same level as message
      if (top < minTopMargin) {
        top = position.y;
      }
    }
    
    // Ensure modal stays within screen bounds (not overlapping input section)
    const maxTop = inputSectionTop - modalHeight - 10; // Leave 10px gap above input
    top = Math.max(minTopMargin, Math.min(top, maxTop));
    
    // Calculate left position - center relative to message, but keep within bounds
    let left = position.x - modalWidth / 2;
    left = Math.max(12, Math.min(left, screenWidth - modalWidth - 12));
    
    return {
      position: "absolute" as const,
      top,
      left,
    };
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.container,
                getModalPosition(),
              ]}
            >
              {hasMedia && (
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => {
                    onDownload();
                    onClose();
                  }}
                  accessibilityLabel="Download"
                  accessibilityRole="button"
                >
                  <Ionicons name="download-outline" size={22} color="#007AFF" />
                  <Text style={styles.actionText}>Download</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                  onForward();
                  onClose();
                }}
                accessibilityLabel="Forward"
                accessibilityRole="button"
              >
                <Ionicons name="arrow-forward-outline" size={22} color="#007AFF" />
                <Text style={styles.actionText}>Forward</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                  onReply();
                  onClose();
                }}
                accessibilityLabel="Reply"
                accessibilityRole="button"
              >
                <Ionicons name="arrow-undo-outline" size={22} color="#007AFF" />
                <Text style={styles.actionText}>Reply</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 180,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 12,
  },
  actionText: {
    fontSize: 16,
    color: "#111B21",
    fontWeight: "500",
  },
});
