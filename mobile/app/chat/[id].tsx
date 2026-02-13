import { useLocalSearchParams } from "expo-router";
import { ChatWindow } from "../../components/chat/ChatWindow";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return null;
  }

  return <ChatWindow chatId={id} />;
}
