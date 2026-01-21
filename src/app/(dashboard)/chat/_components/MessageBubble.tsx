"use client"

import { cn } from "@/lib/utils"
import { Check, CheckCheck } from "lucide-react"
import { AudioPlayer } from "@/components/AudioPlayer"

interface MessageBubbleProps {
  message: {
    _id: string
    direction: "inbound" | "outbound"
    type: "text" | "image" | "video" | "audio" | "document" | "template"
    content?: string
    mediaUrl?: string
    timestamp: number
    status?: "sent" | "delivered" | "read" | "failed"
    mediaId?: string
  }
}

function renderTextWithLinks(text: string) {
  // Regex to match URLs and *Bold* text
  const regex = /((?:https?:\/\/[^\s]+|www\.[^\s]+))|(\*[^*]+\*)/g
  const parts: Array<{ type: "text" | "link" | "bold"; value: string }> = []
  let lastIndex = 0

  for (const match of text.matchAll(regex)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, index) })
    }

    const fullMatch = match[0]
    if (match[1]) { // URL Group
      parts.push({ type: "link", value: fullMatch })
    } else if (match[2]) { // Bold Group
      parts.push({ type: "bold", value: fullMatch.slice(1, -1) }) // Strip asterisks
    }

    lastIndex = index + fullMatch.length
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) })
  }

  return parts.map((p, idx) => {
    if (p.type === "link") {
      const href = p.value.startsWith("http") ? p.value : `https://${p.value}`
      return (
        <a
          key={idx}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 dark:text-blue-400 underline break-all"
        >
          {p.value}
        </a>
      )
    }
    if (p.type === "bold") {
      return <strong key={idx} className="font-bold">{p.value}</strong>
    }
    return <span key={idx}>{p.value}</span>
  })
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === "outbound"
  const caption =
    message.type === "text"
      ? message.content || ""
      : message.content && message.content.trim() && message.content !== message.mediaId
        ? message.content
        : ""

  return (
    <div className={cn("flex w-full mb-1", isOutbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "relative max-w-[65%] rounded-lg p-2 shadow-sm",
          isOutbound
            ? "bg-[#d9fdd3] dark:bg-[#005c4b] rounded-tr-none text-[#111b21] dark:text-[#e9edef]"
            : "bg-white dark:bg-[#202c33] rounded-tl-none text-[#111b21] dark:text-[#e9edef]"
        )}
      >
        {/* Media Rendering */}
        {message.type === "image" && message.mediaUrl && (
          <div className="mb-1 rounded-lg overflow-hidden bg-black/10 min-h-[100px] min-w-[200px]">
            <img src={message.mediaUrl} alt="Image" className="w-full h-auto object-cover max-h-[400px]" loading="lazy" />
          </div>
        )}

        {message.type === "video" && message.mediaUrl && (
          <div className="mb-1 rounded-lg overflow-hidden min-w-[250px]">
            <video controls className="w-full rounded-lg bg-black">
              <source src={message.mediaUrl} />
            </video>
          </div>
        )}

        {message.type === "audio" && message.mediaUrl && (
          <div className="min-w-[280px] p-1">
            <AudioPlayer src={message.mediaUrl} isOutbound={isOutbound} />
          </div>
        )}

        {message.type === "template" && (
          <div className="text-xs font-medium text-muted-foreground px-1 pb-1">
            قالب: {message.content || "Template"}
          </div>
        )}

        {message.type === "document" && (
          <div className="px-1 pb-1">
            {message.mediaUrl ? (
              <a
                href={message.mediaUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm underline break-all"
              >
                فتح المستند
              </a>
            ) : (
              <span className="text-sm text-muted-foreground">مستند</span>
            )}
          </div>
        )}

        {caption && (
          <p className="whitespace-pre-wrap break-words text-[14.2px] leading-[19px] px-1 pb-1">
            {renderTextWithLinks(caption)}
          </p>
        )}

        {/* Timestamp & Status */}
        <div className={cn(
          "flex items-center justify-end gap-1 text-[11px] h-4",
          isOutbound ? "text-[#54656f] dark:text-[#8696a0]" : "text-[#54656f] dark:text-[#8696a0]"
        )}>
          <span>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isOutbound && (
            <span className={cn(
              message.status === "read" ? "text-[#53bdeb]" : "text-[#8696a0]"
            )}>
              {message.status === "read" ? <CheckCheck className="h-4 w-4" /> :
                message.status === "delivered" ? <CheckCheck className="h-4 w-4" /> :
                  <Check className="h-3 w-3" />}
            </span>
          )}
        </div>

        {/* Tail SVG (Optional polish) */}
      </div>
    </div>
  )
}
