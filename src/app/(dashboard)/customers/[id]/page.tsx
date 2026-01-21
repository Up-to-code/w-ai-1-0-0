"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    ArrowRight,
    Phone,
    MessageSquare,
    Calendar,
    Tag,
    Send,
    Check,
    CheckCheck,
    Clock,
    Paperclip,
    Smile,
    MoreVertical,
    AlertCircle
} from "lucide-react"

// Mock Data
const MOCK_CUSTOMER = {
    id: "1",
    name: "أحمد محمد",
    phone: "0501234567",
    tags: ["VIP", "متكرر"],
    status: "نشط",
    lastContact: "2024-01-21",
    messages: 156,
    lastSeen: "منذ 5 دقائق",
    isWithin24h: true
}

const MOCK_MESSAGES = [
    { id: 1, content: "مرحباً، أريد الاستفسار عن المنتج الجديد", direction: "in", time: "10:30", date: "اليوم", status: "read" },
    { id: 2, content: "أهلاً وسهلاً! بالتأكيد، المنتج متوفر الآن بخصم 20% على جميع المشتريات فوق 500 ريال.", direction: "out", time: "10:32", date: "اليوم", status: "read" },
    { id: 3, content: "ممتاز! كيف يمكنني الطلب؟", direction: "in", time: "10:35", date: "اليوم", status: "read" },
    { id: 4, content: "يمكنك الطلب من خلال الرابط التالي أو زيارة أقرب فرع لنا. سأرسل لك الرابط الآن.", direction: "out", time: "10:36", date: "اليوم", status: "read" },
    { id: 5, content: "https://shop.example.com/product/123", direction: "out", time: "10:36", date: "اليوم", status: "read" },
    { id: 6, content: "شكراً جزيلاً، سأطلب الآن", direction: "in", time: "10:40", date: "اليوم", status: "read" },
    { id: 7, content: "عفواً! نخبرك عند استلام الطلب 🙏", direction: "out", time: "10:41", date: "اليوم", status: "delivered" },
]

export default function CustomerConversationPage({ params }: { params: { id: string } }) {
    const router = useRouter()
    const [message, setMessage] = useState("")
    const customer = MOCK_CUSTOMER

    const handleSend = () => {
        if (!message.trim()) return
        // Send message logic here
        setMessage("")
    }

    return (
        <div className="flex flex-col h-[calc(100vh-7rem)]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-card">
                <div className="flex items-center gap-4">
                    <Link href="/customers">
                        <Button variant="ghost" size="icon">
                            <ArrowRight className="h-5 w-5" />
                        </Button>
                    </Link>
                    <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                            {customer.name[0]}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="font-bold text-lg">{customer.name}</h2>
                            {customer.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-mono">{customer.phone}</span>
                            <span>•</span>
                            <span className="text-success flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-success" />
                                {customer.lastSeen}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                        <Phone className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon">
                        <MoreVertical className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* 24h Window Alert */}
            {customer.isWithin24h ? (
                <div className="px-4 py-2 bg-success/10 border-b flex items-center gap-2 text-sm text-success">
                    <CheckCheck className="h-4 w-4" />
                    ضمن نافذة 24 ساعة - يمكنك إرسال رسائل حرة
                </div>
            ) : (
                <div className="px-4 py-2 bg-warning/10 border-b flex items-center gap-2 text-sm text-warning">
                    <AlertCircle className="h-4 w-4" />
                    خارج نافذة 24 ساعة - يمكنك إرسال قوالب فقط
                </div>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 max-w-3xl mx-auto">
                    {/* Date separator */}
                    <div className="flex items-center gap-4 my-4">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground bg-card px-3 py-1 rounded-full">اليوم</span>
                        <div className="flex-1 h-px bg-border" />
                    </div>

                    {MOCK_MESSAGES.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.direction === 'out' ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-[70%] rounded-2xl p-3 ${msg.direction === 'out'
                                    ? 'bg-primary text-primary-foreground rounded-bl-none'
                                    : 'bg-muted rounded-br-none'
                                }`}>
                                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                <div className={`flex items-center gap-1 mt-1 text-xs justify-end ${msg.direction === 'out' ? 'opacity-70' : 'text-muted-foreground'
                                    }`}>
                                    <span>{msg.time}</span>
                                    {msg.direction === 'out' && (
                                        msg.status === 'read' ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t bg-card">
                <div className="max-w-3xl mx-auto">
                    {customer.isWithin24h ? (
                        <div className="flex gap-2">
                            <Button variant="ghost" size="icon" className="shrink-0">
                                <Paperclip className="h-5 w-5" />
                            </Button>
                            <Input
                                placeholder="اكتب رسالتك..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                className="flex-1"
                            />
                            <Button variant="ghost" size="icon" className="shrink-0">
                                <Smile className="h-5 w-5" />
                            </Button>
                            <Button onClick={handleSend} disabled={!message.trim()} className="shrink-0 gap-2">
                                <Send className="h-4 w-4" />
                                إرسال
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground text-center">
                                لا يمكنك إرسال رسائل حرة - استخدم قالب معتمد
                            </p>
                            <div className="flex justify-center gap-2">
                                <Link href="/templates">
                                    <Button variant="outline" className="gap-2">
                                        اختر قالب
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
