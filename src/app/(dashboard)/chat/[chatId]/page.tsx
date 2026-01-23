"use client"

import { ChatWindow } from "../_components/ChatWindow"
import { useParams } from "next/navigation"

export default function ChatConversationPage() {
  const params = useParams()
  const chatId = params?.chatId as string

  if (!chatId) return null

  return <ChatWindow chatId={chatId} />
}
