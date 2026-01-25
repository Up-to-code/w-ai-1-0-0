import { View, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { ConversationHeader } from "./ConversationHeader";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { NewContactFlow } from "./NewContactFlow";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface ChatWindowProps {
  chatId: string;
}

export function ChatWindow({ chatId }: ChatWindowProps) {
  const chat = useQuery(api.chat.getChat, { chatId: chatId as any });
  
  // Check if this is a new contact (no messages yet)
  const isNewContact = chat && chat.messageCount === 0;

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
            <MessageList chatId={chatId} />
            <ChatInput chatId={chatId} />
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
