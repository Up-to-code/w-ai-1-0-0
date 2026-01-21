"use client"

import { useEffect, useRef } from "react"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { useSearchParams, usePathname } from "next/navigation"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageSquare } from "lucide-react"

// Simple "Ting" Sound (Base64 MP3)
const NOTIFICATION_SOUND = "data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq"
// Note: The above is a dummy placeholder. I will replace it with a real short bell sound link or a valid base64 in the actual file if user provided, 
// for now using a standard verified sound URL is safer than a broken base64 string.
// iOS-like "Note" Sound (Short & Clean)
const SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3" // Simple Notification

export function GlobalNotification() {
    const latestMessage = useQuery(api.chat.getLatestGlobalMessage)
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const lastMessageIdRef = useRef<string | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const isFirstRun = useRef(true)

    // Initialize Audio
    useEffect(() => {
        audioRef.current = new Audio(SOUND_URL)
        audioRef.current.volume = 0.6
    }, [])

    useEffect(() => {
        if (!latestMessage) return

        // 1. Initial Load Handling
        if (isFirstRun.current) {
            lastMessageIdRef.current = latestMessage.messageId
            isFirstRun.current = false
            return
        }

        // 2. Check for NEW messages only
        if (lastMessageIdRef.current === latestMessage.messageId) return

        // Update Ref (It is new)
        lastMessageIdRef.current = latestMessage.messageId

        // 3. Suppression Logic (Active Chat)
        // "If I am in the same chat window, don't make the sound"
        const activeChatId = searchParams?.get("chatId")
        const isChatOpen = pathname?.includes("/chat") && activeChatId === latestMessage.chatId

        if (isChatOpen) return

        // 4. Play Sound & Show Notification
        audioRef.current?.play().catch(e => console.error("Audio play failed", e))

        toast.custom((t) => (
            <div
                className="ios-notification w-[360px] cursor-pointer" // iOS standard width ~360px
                onClick={() => {
                    toast.dismiss(t)
                    window.location.href = `/chat?chatId=${latestMessage.chatId}`
                }}
            >
                {/* Real iOS Blur & Shadow Specs */}
                <div className="relative overflow-hidden rounded-[22px] bg-white/75 dark:bg-[#1C1C1E]/80 backdrop-blur-[50px] shadow-sm border border-white/40 dark:border-white/10 p-[14px] transition-all hover:brightness-105 active:scale-[0.98] group">

                    {/* Header: Icon + App Name + Time */}
                    <div className="flex items-center justify-between mb-2.5 pl-0.5">
                        <div className="flex items-center gap-2">
                            {/* iOS Green Message Icon */}
                            <div className="w-[18px] h-[18px] rounded-[4px] bg-[#4ADE80] flex items-center justify-center shadow-sm">
                                <MessageSquare className="w-2.5 h-2.5 text-white fill-current" />
                            </div>
                            <span className="text-[11px] font-semibold tracking-wide text-black/60 dark:text-white/60 uppercase">
                                MESSAGES
                            </span>
                        </div>
                        <span className="text-[11px] font-normal text-black/40 dark:text-white/40">
                            now
                        </span>
                    </div>

                    {/* Content */}
                    <div className="flex items-start gap-3.5">
                        <Avatar className="h-[42px] w-[42px] rounded-full shrink-0 border border-black/5 dark:border-white/10">
                            <AvatarImage src="" />
                            <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-200 text-sm font-semibold">
                                {latestMessage.contactName.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0 flex flex-col justify-center h-[42px]">
                            <h4 className="text-[15px] font-semibold text-black dark:text-white leading-tight mb-0.5 truncate pr-2">
                                {latestMessage.contactName}
                            </h4>
                            <p className="text-[15px] text-black/90 dark:text-white/90 leading-snug line-clamp-2">
                                {latestMessage.type === "image" ? "Sent an image" :
                                    latestMessage.type === "audio" ? "Sent a voice message" :
                                        latestMessage.content}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        ), {
            duration: 5000,
            position: "top-right",
            className: "p-0 bg-transparent border-0 shadow-none !bg-transparent !p-0 !m-0", // Rigid reset
        })

    }, [latestMessage, pathname, searchParams])

    return null
}
