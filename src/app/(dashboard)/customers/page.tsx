"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Search, MoreVertical, Phone, MessageSquare, Tag, Clock, CheckCheck, AlertCircle } from "lucide-react"

export default function CustomersPage() {
  const customers = useQuery(api.contacts.list, {}) || []
  const [search, setSearch] = useState("")
  const [isAddOpen, setIsAddOpen] = useState(false)

  const filteredCustomers = customers.filter(c =>
    (c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search))
  )

  const createContact = useMutation(api.contacts.create)
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", tags: "" })

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createContact({
        name: newCustomer.name,
        phone: newCustomer.phone,
        tags: newCustomer.tags.split(",").map(t => t.trim()).filter(Boolean)
      })
      setIsAddOpen(false)
      setNewCustomer({ name: "", phone: "", tags: "" })
    } catch (error) {
      console.error("Failed to create contact", error)
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">العملاء</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة العملاء وسجل المحادثات</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة عميل
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة عميل جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div className="space-y-2">
                <Label>الاسم</Label>
                <Input placeholder="اسم العميل" required value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>رقم الهاتف</Label>
                <Input placeholder="9665xxxxxxxx" required value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>الوسوم</Label>
                <Input placeholder="VIP, جديد, ..." value={newCustomer.tags} onChange={e => setNewCustomer({ ...newCustomer, tags: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="submit">حفظ العميل</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{customers.length}</p>
            <p className="text-sm text-muted-foreground">إجمالي العملاء</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-success">{customers.length}</p>
            <p className="text-sm text-muted-foreground">عملاء نشطين</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            {/* Filter roughly by lastMessageTime within 24h if avail, else 0 */}
            <p className="text-2xl font-bold text-info">
              {customers.filter((c: any) => c.lastMessageTime && (Date.now() - c.lastMessageTime < 24 * 60 * 60 * 1000)).length}
            </p>
            <p className="text-sm text-muted-foreground">ضمن 24 ساعة</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">إجمالي الرسائل</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو رقم الهاتف..."
              className="pr-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">العميل</TableHead>
                <TableHead className="text-right">رقم الهاتف</TableHead>
                <TableHead className="text-right">الوسوم</TableHead>
                <TableHead className="text-right">نشاط</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    لا يوجد عملاء
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.map((customer) => (
                <TableRow key={customer._id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {(customer.name || customer.phone || "?")[0]}
                      </div>
                      <div>
                        <p>{customer.name || "بدون اسم"}</p>
                        <span className="text-xs text-muted-foreground">
                          {/* Status */}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{customer.phone}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {customer.tags?.map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {(customer as any).lastMessageTime ? new Date((customer as any).lastMessageTime).toLocaleDateString() : "-"}
                  </TableCell>
                  <TableCell>
                    {/* We need chat ID to link to chat */}
                    <Link href={`/chat`}>
                      <Button size="sm" variant="outline" className="gap-1">
                        <MessageSquare className="h-4 w-4" />
                        المحادثة
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
