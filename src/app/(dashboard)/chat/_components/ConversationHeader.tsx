"use client"

import { useMemo } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { avatarColorFromString, initialsFromName } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export function ConversationHeader({ chatId }: { chatId?: string }) {
  const chat = useQuery(api.chat.getChat, chatId ? { chatId: chatId as any } : "skip")

  const content = useMemo(() => {
    if (!chatId || !chat) {
      return <div className="h-full" />
    }

    const avatarSeed = `${chat.contactId}:${chat.contactName}:${chat.contactPhone}`
    const avatarBg = avatarColorFromString(avatarSeed)

    return (
      <div className="flex items-center justify-between w-full h-full px-4 py-2 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-border/10 shadow-sm z-20">
        <div className="flex items-center gap-3 cursor-pointer">
          <Avatar className="h-10 w-10 shrink-0 border border-black/5">
            <AvatarFallback className="text-white text-sm font-semibold" style={{ backgroundColor: avatarBg }}>
              {initialsFromName(chat.contactName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col justify-center">
            <div className="font-semibold text-foreground text-[15px] leading-5">{chat.contactName}</div>
            <div className="text-[12px] text-muted-foreground leading-4 mt-0.5">
              {chat.contactPhone}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[#54656f] dark:text-[#aebac1]">
          {/* Non-functional icons removed as requested */}
        </div>
      </div>
    )
  }, [chat, chatId])

  if (!chatId) return null

  return <div className="w-full h-[60px] relative z-20 shrink-0 bg-[#f0f2f5] dark:bg-[#202c33]">{content}</div>
}

