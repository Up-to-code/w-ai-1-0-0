 "use client"
 
 import { useMemo } from "react"
 import { useParams } from "next/navigation"
 import { useQuery } from "convex/react"
 import { api } from "../../../../../convex/_generated/api"
 import type { Id } from "../../../../../convex/_generated/dataModel"
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
 import { Badge } from "@/components/ui/badge"
 import { Avatar, AvatarFallback } from "@/components/ui/avatar"
 import { Button } from "@/components/ui/button"
 import Link from "next/link"
 import { Users, Phone, Mail, MessageSquare } from "lucide-react"
 import { avatarColorFromString, initialsFromName } from "@/lib/utils"
 import { useWorkspace } from "@/contexts/WorkspaceContext"
 
 export default function CustomerDetailPage() {
   const params = useParams()
   const id = params?.id as string
   const { activePhoneNumberId } = useWorkspace()
 
   const contact = useQuery(
     api.contacts.getById,
     id ? { id: id as Id<"contacts"> } : "skip"
   )
   const chats = useQuery(api.chat.listChats, {
     phoneNumberId: activePhoneNumberId ?? undefined,
   })
 
   const chatId = useMemo(() => {
     if (!contact || !chats) return null
     const found = chats.find(c => c.contactPhone === contact.phone)
     return found ? String(found._id) : null
   }, [contact, chats])
 
   if (!id) return null
   if (!contact) {
     return <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>
   }
 
   const seed = `${contact.phone}:${contact.name}`
   const avatarBg = avatarColorFromString(seed)
 
   return (
     <div className="m-16 space-y-6">
       <div className="flex items-center gap-2">
         <Users className="h-6 w-6 text-primary" />
         <h1 className="text-2xl font-semibold">تفاصيل العميل</h1>
       </div>
 
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-3">
             <Avatar className="h-12 w-12 shrink-0 ring-1 ring-border/40">
               <AvatarFallback className="text-white text-sm font-semibold" style={{ backgroundColor: avatarBg }}>
                 {initialsFromName(contact.name)}
               </AvatarFallback>
             </Avatar>
             <span>{contact.name}</span>
           </CardTitle>
           <CardDescription>معلومات أساسية وفتح المحادثة</CardDescription>
         </CardHeader>
         <CardContent className="space-y-4">
           <div className="flex items-center gap-2 text-sm text-muted-foreground">
             <Phone className="h-4 w-4" />
             <span dir="ltr">{contact.phone}</span>
           </div>
           {contact.email && (
             <div className="flex items-center gap-2 text-sm text-muted-foreground">
               <Mail className="h-4 w-4" />
               <span>{contact.email}</span>
             </div>
           )}
 
           {contact.tags && contact.tags.length > 0 && (
             <div className="flex flex-wrap gap-2">
               {contact.tags.map(t => (
                 <Badge key={t} variant="outline" className="rounded-full">{t}</Badge>
               ))}
             </div>
           )}
 
           <div className="pt-2">
             {chatId ? (
               <Link href={`/chat/${chatId}`}>
                 <Button variant="outline" className="gap-2 rounded-full">
                   <MessageSquare className="h-4 w-4" />
                   فتح المحادثة
                 </Button>
               </Link>
             ) : (
               <Button variant="outline" className="gap-2 rounded-full" disabled>
                 <MessageSquare className="h-4 w-4" />
                 لا توجد محادثة
               </Button>
             )}
           </div>
         </CardContent>
       </Card>
     </div>
   )
 }
