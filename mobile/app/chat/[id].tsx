import { useLocalSearchParams } from "expo-router";
import { ChatWindow } from "../../components/chat/ChatWindow";
import { ScreenErrorBoundary } from "../../components/ScreenErrorBoundary";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return null;
  }

  return (
    <ScreenErrorBoundary screenName="chat">
      <ChatWindow chatId={id} />
    </ScreenErrorBoundary>
  );
}
