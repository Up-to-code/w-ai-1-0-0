import { useState, useEffect } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { ConversationHeader } from "./ConversationHeader";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { NewContactFlow } from "./NewContactFlow";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "../../contexts/AuthContext";

interface ChatWindowProps {
  chatId: string;
}

interface Message {
  _id: string;
  direction: "inbound" | "outbound";
  type: string;
  content?: string;
  mediaUrl?: string;
  timestamp: number;
  status?: string;
}

export function ChatWindow({ chatId }: ChatWindowProps) {
  const chat = useQuery(api.chat.getChat, { chatId: chatId as any });
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const { userId } = useAuth();
  const setActiveChat = useMutation(api.chat.setActiveChat);
  const clearActiveChat = useMutation(api.chat.clearActiveChat);
  
  // Check if this is a new contact (no messages yet)
  const isNewContact = chat && chat.messageCount === 0;

  // Set active chat when component mounts or chatId changes
  useEffect(() => {
    if (userId && chatId) {
      setActiveChat({ 
        chatId: chatId as any, 
        userId: userId as any 
      }).catch(console.error);
    }

    // Clear active chat when component unmounts or chatId changes
    return () => {
      if (userId) {
        clearActiveChat({ userId: userId as any }).catch(console.error);
      }
    };
  }, [chatId, userId, setActiveChat, clearActiveChat]);

  const handleReply = (message: Message) => {
    setReplyTo(message);
  };

  const handleReplyCancel = () => {
    setReplyTo(null);
  };

  if (!chat) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ConversationHeader chatId={chatId} />
        
        {isNewContact ? (
          <NewContactFlow 
            chatId={chatId} 
            contactName={chat.contactName || "this contact"} 
          />
        ) : (
          <>
            <MessageList chatId={chatId} onReply={handleReply} />
            <ChatInput 
              chatId={chatId} 
              replyTo={replyTo}
              onReplyCancel={handleReplyCancel}
            />
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EFEAE2",
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
