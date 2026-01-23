"use client"

import { useEffect } from "react"
import { useMutation } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import { MessageList } from "./MessageList"
import { ConversationHeader } from "./ConversationHeader"
import { ChatInput } from "./ChatInput"

interface ChatWindowProps {
  chatId: string
}

export function ChatWindow({ chatId }: ChatWindowProps) {
  const markAsRead = useMutation(api.chat.markAsRead)

  // Instant Read Effect
  useEffect(() => {
    if (chatId) {
      markAsRead({ chatId: chatId as any }).catch(console.error)
    }
  }, [chatId, markAsRead])

  return (
    <div className="flex flex-col h-full bg-[#efeae2] dark:bg-[#0b141a] relative">
      {/* Header */}
      <ConversationHeader chatId={chatId} />

      {/* Messages */}
      <MessageList chatId={chatId} />

      {/* Input Area */}
      <ChatInput chatId={chatId} />
    </div>
  )
}
