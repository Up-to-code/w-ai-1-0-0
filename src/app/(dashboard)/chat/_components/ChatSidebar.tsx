"use client"

import { useQuery } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { avatarColorFromString, cn, initialsFromName } from "@/lib/utils"
import { Search, MessageSquarePlus, CircleDashed } from "lucide-react"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"

interface ChatSidebarProps {
  selectedChatId?: string
  onSelectChat: (id: string) => void
}

export function ChatSidebar({ selectedChatId, onSelectChat }: ChatSidebarProps) {
  const chats = useQuery(api.chat.listChats)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredChats = useMemo(() => {
    if (!chats) return []
    if (!searchQuery.trim()) return chats
    return chats.filter(chat =>
      chat.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.contactPhone.includes(searchQuery)
    )
  }, [chats, searchQuery])

  if (!chats) {
    return (
      <div className="w-[400px] border-l border-border bg-background flex flex-col h-full border-r items-center justify-center">
        <div className="animate-spin text-muted-foreground">
          <CircleDashed className="h-8 w-8" />
        </div>
      </div>
    )
  }

  return (
    <div className="w-[400px] bg-background flex flex-col h-full border-l border-border/10">
      {/* Header - Simplified */}
      <div className="h-[60px] px-4 bg-[#f0f2f5] dark:bg-[#202c33] flex items-center justify-between shrink-0 border-b border-border/10">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-transparent text-muted-foreground">
            <MessageSquarePlus className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>
        {/* Removed non-functional placeholder buttons as requested */}
      </div>

      {/* Search */}
      <div className="p-2 border-b border-border/40 bg-background">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث أو بدء محادثة جديدة"
            className="pr-10 bg-muted/50 border-none h-9 text-sm focus-visible:ring-0 focus-visible:bg-background transition-all"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredChats.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            لا توجد محادثات مطابقة
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredChats.map((chat) => {
              const isSelected = selectedChatId === chat._id
              const avatarSeed = `${chat.contactId}:${chat.contactName}:${chat.contactPhone}`

              return (
                <div
                  key={chat._id}
                  onClick={() => onSelectChat(chat._id)}
                  className={cn(
                    "group w-full flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors relative",
                    isSelected ? "bg-muted" : "hover:bg-muted/50"
                  )}
                >
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarFallback
                      className="text-white text-sm font-semibold"
                      style={{ backgroundColor: avatarColorFromString(avatarSeed) }}
                    >
                      {initialsFromName(chat.contactName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0 flex flex-col justify-center h-full border-b border-border/40 pb-3 group-last:border-none">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-foreground font-medium text-[16px] truncate">
                        {chat.contactName}
                      </span>
                      <span className={cn(
                        "text-[11px] font-medium min-w-fit",
                        chat.unreadCount > 0 ? "text-primary" : "text-muted-foreground"
                      )}>
                        {new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground truncate max-w-[85%] leading-5">
                        {chat.status === 'expired' ? "انتهت الجلسة" : "اضغط لعرض الرسائل"}
                      </p>
                      {chat.unreadCount > 0 && (
                        <div className="bg-primary text-primary-foreground text-[10px] font-bold h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center shadow-sm">
                          {chat.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
