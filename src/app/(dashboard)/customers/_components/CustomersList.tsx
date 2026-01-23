 "use client"
 
 import Link from "next/link"
 import { Avatar, AvatarFallback } from "@/components/ui/avatar"
 import { Badge } from "@/components/ui/badge"
 import { Button } from "@/components/ui/button"
 import { Phone, MessageSquare } from "lucide-react"
 import { avatarColorFromString, initialsFromName } from "@/lib/utils"
 
 type Contact = {
   name: string
   phone: string
   email?: string
   tags?: string[]
 }
 
 interface Props {
   contacts: Contact[]
   chatByPhone: Map<string, string>
 }
 
 export function CustomersList({ contacts, chatByPhone }: Props) {
   if (!contacts || contacts.length === 0) {
     return <div className="py-10 text-center text-muted-foreground">لا توجد نتائج مطابقة</div>
   }
 
   return (
     <div className="grid gap-2">
       {contacts.map((c) => {
         const seed = `${c.phone}:${c.name}`
         const avatarBg = avatarColorFromString(seed)
         const chatId = chatByPhone.get(c.phone)
 
         return (
           <div
             key={`${c.phone}:${c.name}`}
             className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border hover:bg-muted/50 transition-colors"
           >
             <div className="flex items-center gap-4 min-w-0">
               <Avatar className="h-11 w-11 shrink-0 ring-1 ring-border/40">
                 <AvatarFallback className="text-white text-sm font-semibold" style={{ backgroundColor: avatarBg }}>
                   {initialsFromName(c.name)}
                 </AvatarFallback>
               </Avatar>
               <div className="min-w-0">
                 <div className="flex items-center gap-2 mb-0.5">
                   <span className="font-medium text-foreground truncate max-w-[240px]">{c.name}</span>
                   {(c.tags || []).slice(0, 3).map(t => (
                     <Badge key={t} variant="outline" className="text-xs px-2 py-0 rounded-full">{t}</Badge>
                   ))}
                 </div>
                 <div className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
                   <Phone className="h-4 w-4" />
                   <span dir="ltr">{c.phone}</span>
                   {c.email && <span className="ml-2">{c.email}</span>}
                 </div>
               </div>
             </div>
 
             <div className="flex items-center gap-2 shrink-0">
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
           </div>
         )
       })}
     </div>
   )
 }
