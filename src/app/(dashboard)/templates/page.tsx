"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useQuery, useAction } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Plus,
    Search,
    FileText,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Edit,
    Eye,
    Image,
    Video,
    ShoppingBag,
    RefreshCw,
    Trash2,
    Link2,
    Phone
} from "lucide-react"

export default function TemplatesPage() {
    const templates = useQuery(api.templates.list) || []
    const syncFromMeta = useAction(api.templates.syncFromMeta)
    const deleteFromMeta = useAction(api.whatsapp.deleteTemplate)
    const removeFromDB = useAction(api.templates.remove as any)

    const [search, setSearch] = useState("")
    const [activeTab, setActiveTab] = useState("all")
    const [previewTemplate, setPreviewTemplate] = useState<any>(null)
    const [deleteTemplate, setDeleteTemplate] = useState<any>(null)
    const [isSyncing, setIsSyncing] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

    const showToast = (type: "success" | "error", message: string) => {
        setToast({ type, message })
        setTimeout(() => setToast(null), 3000)
    }

    const handleSync = async () => {
        setIsSyncing(true)
        try {
            const count = await syncFromMeta({})
            showToast("success", `تم مزامنة ${count} قالب بنجاح`)
        } catch (error) {
            console.error("Sync failed:", error)
            showToast("error", "فشل في المزامنة")
        } finally {
            setIsSyncing(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteTemplate) return
        setIsDeleting(true)
        try {
            // Delete from Meta API
            await deleteFromMeta({ name: deleteTemplate.name })
            // Delete from local DB
            await removeFromDB({ name: deleteTemplate.name })
            showToast("success", `تم حذف القالب "${deleteTemplate.name}" بنجاح`)
            setDeleteTemplate(null)
        } catch (error) {
            console.error("Delete failed:", error)
            showToast("error", "فشل في حذف القالب")
        } finally {
            setIsDeleting(false)
        }
    }

    const filteredTemplates = templates.filter(t => {
        const matchesSearch = t.name.includes(search) || (t.content && t.content.includes(search))
        const matchesTab = activeTab === "all" || t.status.toLowerCase() === activeTab
        return matchesSearch && matchesTab
    })

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "APPROVED":
                return <Badge className="bg-success text-success-foreground gap-1"><CheckCircle2 className="w-3 h-3" /> معتمد</Badge>
            case "PENDING":
                return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> قيد المراجعة</Badge>
            case "REJECTED":
                return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" /> مرفوض</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    const getMediaIcon = (components: any[]) => {
        const header = components?.find((c: any) => c.type === "HEADER")
        if (!header) return <FileText className="h-4 w-4 text-muted-foreground" />

        switch (header.format) {
            case "IMAGE": return <Image className="h-4 w-4 text-info" />
            case "VIDEO": return <Video className="h-4 w-4 text-warning" />
            default: return <FileText className="h-4 w-4 text-muted-foreground" />
        }
    }

    const getBodyText = (components: any[]) => {
        const body = components?.find((c: any) => c.type === "BODY")
        return body?.text || ""
    }

    const stats = {
        total: templates.length,
        approved: templates.filter(t => t.status === "APPROVED").length,
        pending: templates.filter(t => t.status === "PENDING").length,
        rejected: templates.filter(t => t.status === "REJECTED").length,
    }

    return (
        <div className="space-y-6 p-4 sm:p-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">قوالب الرسائل</h1>
                    <p className="text-muted-foreground text-sm mt-1">إنشاء وإدارة قوالب WhatsApp</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2" onClick={handleSync} disabled={isSyncing}>
                        <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        مزامنة من Meta
                    </Button>
                    <Link href="/templates/new">
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            قالب جديد
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-2xl font-bold">{stats.total}</p>
                        <p className="text-sm text-muted-foreground">إجمالي القوالب</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-2xl font-bold text-success">{stats.approved}</p>
                        <p className="text-sm text-muted-foreground">معتمدة</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-2xl font-bold text-warning">{stats.pending}</p>
                        <p className="text-sm text-muted-foreground">قيد المراجعة</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-2xl font-bold text-destructive">{stats.rejected}</p>
                        <p className="text-sm text-muted-foreground">مرفوضة</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search & Filter */}
            <div className="flex gap-4 items-center flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="بحث في القوالب..."
                        className="pr-10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                        <TabsTrigger value="all">الكل</TabsTrigger>
                        <TabsTrigger value="approved">معتمد</TabsTrigger>
                        <TabsTrigger value="pending">قيد المراجعة</TabsTrigger>
                        <TabsTrigger value="rejected">مرفوض</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Templates Grid */}
            {templates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">لا توجد قوالب</p>
                    <p className="text-sm mt-1">انقر على "مزامنة من Meta" لجلب القوالب أو "قالب جديد" لإنشاء واحد</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTemplates.map((template) => (
                        <Card key={template._id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        {getMediaIcon(template.components)}
                                        <CardTitle className="text-base">{template.name}</CardTitle>
                                    </div>
                                    {getStatusBadge(template.status)}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">{template.category}</Badge>
                                    <span className="text-xs text-muted-foreground">{template.language === 'ar' ? 'العربية' : template.language}</span>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                    {getBodyText(template.components) || template.content || "لا يوجد محتوى"}
                                </p>

                                <div className="flex gap-2 pt-2">
                                    <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => setPreviewTemplate(template)}>
                                        <Eye className="h-4 w-4" />
                                        معاينة
                                    </Button>
                                    <Link href={`/templates/new?edit=${template.name}`}>
                                        <Button variant="ghost" size="sm" className="gap-1">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                    <Button variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive" onClick={() => setDeleteTemplate(template)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Preview Modal */}
            <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>معاينة القالب: {previewTemplate?.name}</DialogTitle>
                    </DialogHeader>
                    {previewTemplate && (
                        <div className="space-y-4">
                            {/* WhatsApp-style message bubble */}
                            <div className="bg-[#DCF8C6] dark:bg-[#056162] rounded-2xl p-4 space-y-3">
                                {/* Header */}
                                {previewTemplate.components?.find((c: any) => c.type === "HEADER") && (
                                    <div className="font-semibold text-sm">
                                        {previewTemplate.components.find((c: any) => c.type === "HEADER")?.format === "TEXT"
                                            ? previewTemplate.components.find((c: any) => c.type === "HEADER")?.text
                                            : <div className="bg-gray-300 dark:bg-gray-600 rounded-lg h-32 flex items-center justify-center">
                                                <Image className="h-8 w-8 text-gray-500" />
                                            </div>
                                        }
                                    </div>
                                )}

                                {/* Body */}
                                <p className="text-sm whitespace-pre-wrap">
                                    {previewTemplate.components?.find((c: any) => c.type === "BODY")?.text || previewTemplate.content || "لا يوجد محتوى"}
                                </p>

                                {/* Footer */}
                                {previewTemplate.components?.find((c: any) => c.type === "FOOTER") && (
                                    <p className="text-xs text-muted-foreground">
                                        {previewTemplate.components.find((c: any) => c.type === "FOOTER")?.text}
                                    </p>
                                )}
                            </div>

                            {/* Buttons */}
                            {previewTemplate.components?.find((c: any) => c.type === "BUTTONS") && (
                                <div className="space-y-2">
                                    {previewTemplate.components.find((c: any) => c.type === "BUTTONS")?.buttons?.map((btn: any, i: number) => (
                                        <Button key={i} variant="outline" className="w-full justify-center gap-2" disabled>
                                            {btn.type === "URL" && <Link2 className="h-4 w-4" />}
                                            {btn.type === "PHONE_NUMBER" && <Phone className="h-4 w-4" />}
                                            {btn.text}
                                        </Button>
                                    ))}
                                </div>
                            )}

                            {/* Status & Info */}
                            <div className="flex items-center justify-between pt-2 border-t">
                                {getStatusBadge(previewTemplate.status)}
                                <div className="flex gap-2 text-xs text-muted-foreground">
                                    <Badge variant="outline">{previewTemplate.category}</Badge>
                                    <span>{previewTemplate.language}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteTemplate} onOpenChange={(open) => !open && setDeleteTemplate(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>حذف القالب</DialogTitle>
                    </DialogHeader>
                    {deleteTemplate && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                هل أنت متأكد من حذف القالب <strong>"{deleteTemplate.name}"</strong>؟
                                <br />
                                سيتم حذفه من Meta أيضاً ولا يمكن التراجع عن هذا الإجراء.
                            </p>
                            <div className="flex gap-2 justify-end">
                                <Button variant="outline" onClick={() => setDeleteTemplate(null)}>إلغاء</Button>
                                <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                                    {isDeleting ? "جاري الحذف..." : "حذف"}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 p-4 rounded-lg shadow-lg z-50 ${toast.type === "success" ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"
                    }`}>
                    {toast.message}
                </div>
            )}
        </div>
    )
}
