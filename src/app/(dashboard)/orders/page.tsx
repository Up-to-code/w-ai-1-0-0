"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"
import { ShoppingBag, Loader2 } from "lucide-react"

export default function OrdersPage() {
    const orders = useQuery(api.orders.list)
    const updateStatus = useMutation(api.orders.updateStatus)
    const [updatingId, setUpdatingId] = useState<string | null>(null)

    const handleStatusChange = async (id: string, newStatus: any) => {
        setUpdatingId(id)
        try {
            await updateStatus({ id: id as any, status: newStatus })
        } finally {
            setUpdatingId(null)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed": return "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20"
            case "processing": return "bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20"
            case "cancelled": return "bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20"
            default: return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20"
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "completed": return "مكتمل"
            case "processing": return "قيد المعالجة"
            case "cancelled": return "ملغي"
            case "refunded": return "مسترجع"
            case "pending": return "قيد الانتظار"
            default: return status
        }
    }

    if (orders === undefined) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">الطلبات</h1>
                    <p className="text-muted-foreground mt-2">إدارة ومتابعة طلبات العملاء</p>
                </div>
                <Button>
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    طلب جديد
                </Button>
            </div>

            <Card className="border-border/50 shadow-sm">
                <CardHeader>
                    <CardTitle>جميع الطلبات</CardTitle>
                </CardHeader>
                <CardContent>
                    {orders.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            لا توجد طلبات حتى الآن
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right">رقم الطلب</TableHead>
                                    <TableHead className="text-right">العميل</TableHead>
                                    <TableHead className="text-right">التاريخ</TableHead>
                                    <TableHead className="text-right">المبلغ</TableHead>
                                    <TableHead className="text-right">الحالة</TableHead>
                                    <TableHead className="text-right">الإجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.map((order) => (
                                    <TableRow key={order._id}>
                                        <TableCell className="font-medium">#{order.orderNumber}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span>{order.customerName}</span>
                                                <span className="text-xs text-muted-foreground">{order.customerPhone}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(order.createdAt).toLocaleDateString('ar-SA')}
                                        </TableCell>
                                        <TableCell>
                                            {order.amount} {order.currency}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className={getStatusColor(order.status)}>
                                                {getStatusLabel(order.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                defaultValue={order.status}
                                                onValueChange={(val) => handleStatusChange(order._id, val)}
                                                disabled={updatingId === order._id}
                                            >
                                                <SelectTrigger className="w-[140px] h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="pending">قيد الانتظار</SelectItem>
                                                    <SelectItem value="processing">قيد المعالجة</SelectItem>
                                                    <SelectItem value="completed">مكتمل</SelectItem>
                                                    <SelectItem value="cancelled">ملغي</SelectItem>
                                                    <SelectItem value="refunded">مسترجع</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
