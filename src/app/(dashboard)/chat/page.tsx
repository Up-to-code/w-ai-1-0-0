"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { ChatSidebar } from "./_components/ChatSidebar"
import { ChatWindow } from "./_components/ChatWindow"
import { MessageSquare } from "lucide-react"

export default function ChatPage() {
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>()
  const markAsRead = useMutation(api.chat.markAsRead)
  const [readError, setReadError] = useState<string | null>(null)

  const onSelectChat = async (id: string) => {
    setSelectedChatId(id)
    setReadError(null)
    try {
      await markAsRead({ chatId: id as any })
    } catch {
      setReadError("تعذر تحديث حالة القراءة. حاول مرة أخرى.")
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] font-sans bg-background overflow-hidden">
      <ChatSidebar
        selectedChatId={selectedChatId}
        onSelectChat={onSelectChat}
      />

      {selectedChatId ? (
        <div className="flex-1 flex flex-col min-w-0 bg-[#efeae2] dark:bg-[#0b141a]">
          {readError ? (
            <div className="px-4 py-2 text-sm bg-destructive/10 text-destructive border-b border-border">
              {readError}
            </div>
          ) : null}
          <ChatWindow chatId={selectedChatId} />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-[#f0f2f5] dark:bg-[#202c33] border-b-[6px] border-[#25d366]/40">
          {/* WhatsApp Web-style placeholder */}
          <div className="text-center max-w-md px-6">
            <div className="mb-8">
              {/* Illustration could go here */}
              <MessageSquare className="h-24 w-24 text-[#e9edef] dark:text-[#384147] mx-auto" />
            </div>
            <h3 className="text-3xl font-light text-[#41525d] dark:text-[#d1d7db] mb-4">ChatCB Web</h3>
            <p className="text-[#667781] dark:text-[#8696a0] text-sm leading-6">
              أرسل واستقبل الرسائل دون الحاجة لإبقاء هاتفك متصلاً. استخدم ChatCB على ما يصل إلى 4 أجهزة وحاتف واحد في نفس الوقت.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
