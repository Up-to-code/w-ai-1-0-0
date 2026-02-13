import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { TemplatePicker } from "../TemplatePicker";

interface NewContactFlowProps {
  chatId: string;
  contactName: string;
}

export function NewContactFlow({ chatId, contactName }: NewContactFlowProps) {
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const sendMessage = useMutation(api.chat.sendMessage);

  const handleSendTemplate = useCallback(async (template: any) => {
    setIsSending(true);
    try {
      await sendMessage({
        chatId: chatId as any,
        type: "template",
        content: template.name,
        template: { 
          name: template.name, 
          language: template.language, 
          components: [] 
        },
      });
    } catch (error) {
      console.error("Failed to send template:", error);
      Alert.alert("Error", "Failed to send template message");
    } finally {
      setIsSending(false);
    }
  }, [chatId, sendMessage]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="chatbubbles-outline" size={48} color="#007AFF" />
        </View>
        
        <Text style={styles.title}>Start Conversation</Text>
        <Text style={styles.subtitle}>
          To message {contactName} for the first time, you must use an approved template message.
        </Text>
        <Text style={styles.hint}>
          This is required by WhatsApp's Business Policy.
        </Text>

        <TouchableOpacity
          style={[styles.button, isSending && styles.buttonDisabled]}
          onPress={() => setShowTemplatePicker(true)}
          disabled={isSending}
        >
          {isSending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="document-text" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Choose Template</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <TemplatePicker
        visible={showTemplatePicker}
        onClose={() => setShowTemplatePicker(false)}
        onSelect={handleSendTemplate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EFEAE2",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  content: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#333",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
