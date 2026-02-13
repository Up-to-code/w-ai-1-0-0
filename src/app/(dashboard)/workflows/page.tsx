"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useWorkspace } from "@/contexts/WorkspaceContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Zap,
    Plus,
    MessageSquare,
    Tag,
    Bell,
    Send,
    Clock,
    ArrowRight,
    MoreVertical,
    Play,
    Pause,
    Trash,
    Edit,
    ChevronDown,
    Users,
    UserPlus
} from "lucide-react"

// Mock Workflows
const MOCK_WORKFLOWS = [
    {
        id: "1",
        name: "رد ترحيبي",
        trigger: "رسالة جديدة",
        triggerDetails: "كلمة: مرحبا",
        action: "إرسال رد",
        actionDetails: "قالب: رسالة ترحيب",
        enabled: true,
        runs: 245
    },
    {
        id: "2",
        name: "تصنيف VIP",
        trigger: "رسالة جديدة",
        triggerDetails: "من: عملاء مميزين",
        action: "إضافة وسم",
        actionDetails: "وسم: VIP",
        enabled: true,
        runs: 89
    },
    {
        id: "3",
        name: "تنبيه الدعم",
        trigger: "كلمة مفتاحية",
        triggerDetails: "كلمة: شكوى",
        action: "إشعار",
        actionDetails: "تنبيه فريق الدعم",
        enabled: false,
        runs: 12
    },
]

const TRIGGERS = [
    { value: "new_message", label: "رسالة جديدة", icon: MessageSquare },
    { value: "contact_created", label: "عميل جديد", icon: Users },
    { value: "keyword", label: "كلمة مفتاحية", icon: Tag },
    { value: "tag_added", label: "إضافة وسم", icon: Tag },
]

const ACTIONS = [
    { value: "send_template", label: "إرسال قالب", icon: Send },
    { value: "add_tag", label: "إضافة وسم", icon: Tag },
    { value: "remove_tag", label: "إزالة وسم", icon: Trash },
    { value: "assign_user", label: "تعيين موظف", icon: UserPlus },
    { value: "notify", label: "إرسال تنبيه", icon: Bell },
]

export default function WorkflowsPage() {
    const { activePhoneNumberId } = useWorkspace()
    const effectivePhoneNumberId =
        !activePhoneNumberId || activePhoneNumberId === "__all__" ? undefined : activePhoneNumberId
    const workflows = useQuery(api.workflows.list, effectivePhoneNumberId ? { phoneNumberId: effectivePhoneNumberId } : {}) || []
    const templates = useQuery(api.templates.list, effectivePhoneNumberId ? { phoneNumberId: effectivePhoneNumberId } : {}) || []
    const users = useQuery(api.users.list) || [] // Add this query
    const createWorkflow = useMutation(api.workflows.create)
    const updateWorkflow = useMutation(api.workflows.update)
    const toggleWorkflowMutation = useMutation(api.workflows.toggle)
    const deleteWorkflow = useMutation(api.workflows.remove)

    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [name, setName] = useState("")
    const [selectedTrigger, setSelectedTrigger] = useState("")
    const [triggerConfig, setTriggerConfig] = useState<any>({})
    const [selectedAction, setSelectedAction] = useState("")
    const [actionConfig, setActionConfig] = useState<any>({})

    const toggleWorkflow = async (id: string) => {
        await toggleWorkflowMutation({ id: id as any })
    }

    const handleEdit = (workflow: any) => {
        setEditingId(workflow._id)
        setName(workflow.name)
        setSelectedTrigger(workflow.trigger)
        setTriggerConfig(workflow.triggerConfig || {})
        setSelectedAction(workflow.action)
        setActionConfig(workflow.actionConfig || {})
        setIsCreateOpen(true)
    }

    const handleSave = async () => {
        try {
            if (editingId) {
                await updateWorkflow({
                    id: editingId as any,
                    name,
                    trigger: selectedTrigger,
                    triggerConfig,
                    action: selectedAction,
                    actionConfig,
                    phoneNumberId: effectivePhoneNumberId,
                })
            } else {
                await createWorkflow({
                    name: name || "قاعدة جديدة",
                    trigger: selectedTrigger,
                    triggerConfig,
                    action: selectedAction,
                    actionConfig,
                    phoneNumberId: effectivePhoneNumberId,
                })
            }
            setIsCreateOpen(false)
            resetForm()
        } catch (error) {
            console.error("Failed to save workflow", error)
        }
    }

    const resetForm = () => {
        setEditingId(null)
        setName("")
        setSelectedTrigger("")
        setTriggerConfig({})
        setSelectedAction("")
        setActionConfig({})
    }

    return (
        <div className="space-y-6 m-16">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">الأتمتة</h1>
                    <p className="text-muted-foreground text-sm mt-1">إنشاء قواعد تلقائية للردود والإجراءات</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            قاعدة جديدة
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{editingId ? "تعديل القاعدة" : "إنشاء قاعدة أتمتة"}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                            {/* Workflow Name */}
                            <div className="space-y-2">
                                <Label>اسم القاعدة</Label>
                                <Input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: رد ترحيبي للعملاء الجدد" />
                            </div>

                            {/* Trigger */}
                            <div className="space-y-3">
                                <Label className="text-base font-semibold flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-warning/20 text-warning flex items-center justify-center">
                                        <Zap className="w-3 h-3" />
                                    </div>
                                    عندما يحدث (المشغّل)
                                </Label>
                                <div className="grid grid-cols-3 gap-3">
                                    {TRIGGERS.map(trigger => {
                                        const Icon = trigger.icon
                                        return (
                                            <div
                                                key={trigger.value}
                                                className={`border rounded-xl p-4 cursor-pointer transition-all ${selectedTrigger === trigger.value ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                                                onClick={() => setSelectedTrigger(trigger.value)}
                                            >
                                                <Icon className="h-5 w-5 mb-2 text-primary" />
                                                <p className="font-medium text-sm">{trigger.label}</p>
                                            </div>
                                        )
                                    })}
                                </div>
                                {selectedTrigger === "keyword" && (
                                    <div className="space-y-2 p-4 bg-muted/50 rounded-xl">
                                        <Label>الكلمة المفتاحية</Label>
                                        <Input
                                            placeholder="أدخل الكلمة..."
                                            value={triggerConfig.keyword || ""}
                                            onChange={e => setTriggerConfig({ ...triggerConfig, keyword: e.target.value })}
                                        />
                                    </div>
                                )}
                                {selectedTrigger === "tag_added" && (
                                    <div className="space-y-2 p-4 bg-muted/50 rounded-xl">
                                        <Label>عند إضافة وسم (اختياري)</Label>
                                        <Input
                                            placeholder="اتركه فارغاً لأي وسم، أو حدد وسماً محدداً"
                                            value={triggerConfig.tag || ""}
                                            onChange={e => setTriggerConfig({ ...triggerConfig, tag: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Arrow */}
                            <div className="flex justify-center">
                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                </div>
                            </div>

                            {/* Action */}
                            <div className="space-y-3">
                                <Label className="text-base font-semibold flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-success/20 text-success flex items-center justify-center">
                                        <Play className="w-3 h-3" />
                                    </div>
                                    نفّذ (الإجراء)
                                </Label>
                                <div className="grid grid-cols-3 gap-3">
                                    {ACTIONS.map(action => {
                                        const Icon = action.icon
                                        return (
                                            <div
                                                key={action.value}
                                                className={`border rounded-xl p-4 cursor-pointer transition-all ${selectedAction === action.value ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                                                onClick={() => setSelectedAction(action.value)}
                                            >
                                                <Icon className="h-5 w-5 mb-2 text-success" />
                                                <p className="font-medium text-sm">{action.label}</p>
                                            </div>
                                        )
                                    })}
                                </div>
                                {selectedAction === "send_template" && (
                                    <div className="space-y-2 p-4 bg-muted/50 rounded-xl">
                                        <Label>اختر القالب</Label>
                                        <Select
                                            value={actionConfig.template}
                                            onValueChange={(v) => setActionConfig({ ...actionConfig, template: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="اختر قالب..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {templates
                                                    .filter(t => t.status === "APPROVED")
                                                    .map(t => (
                                                        <SelectItem key={t._id} value={t.name}>
                                                            {t.name}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                {selectedAction === "add_tag" && (
                                    <div className="space-y-2 p-4 bg-muted/50 rounded-xl">
                                        <Label>اسم الوسم</Label>
                                        <Input
                                            placeholder="مثال: VIP"
                                            value={actionConfig.tag || ""}
                                            onChange={e => setActionConfig({ ...actionConfig, tag: e.target.value })}
                                        />
                                    </div>
                                )}
                                {selectedAction === "remove_tag" && (
                                    <div className="space-y-2 p-4 bg-muted/50 rounded-xl">
                                        <Label>اسم الوسم</Label>
                                        <Input
                                            placeholder="مثال: VIP"
                                            value={actionConfig.tag || ""}
                                            onChange={e => setActionConfig({ ...actionConfig, tag: e.target.value })}
                                        />
                                    </div>
                                )}
                                {selectedAction === "assign_user" && (
                                    <div className="space-y-2 p-4 bg-muted/50 rounded-xl">
                                        <Label>اختر الموظف</Label>
                                        <Select
                                            value={actionConfig.userId}
                                            onValueChange={(v) => setActionConfig({ ...actionConfig, userId: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="اختر موظف..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {users.map((u: any) => (
                                                    <SelectItem key={u._id} value={u._id}>
                                                        {u.name || u.email || "مستخدم غير معروف"}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                {selectedAction === "notify" && (
                                    <div className="space-y-2 p-4 bg-muted/50 rounded-xl">
                                        <Label>رسالة التنبيه</Label>
                                        <Input
                                            placeholder="مثال: تم إضافة وسم VIP لعميل"
                                            value={actionConfig.message || ""}
                                            onChange={e => setActionConfig({ ...actionConfig, message: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>إلغاء</Button>
                            <Button onClick={handleSave} disabled={!selectedTrigger || !selectedAction}>
                                حفظ القاعدة
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="flex items-center gap-4 pt-0">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Zap className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{workflows.length}</p>
                            <p className="text-sm text-muted-foreground">قواعد الأتمتة</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-4 pt-0">
                        <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                            <Play className="h-6 w-6 text-success" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{workflows.filter(w => w.enabled).length}</p>
                            <p className="text-sm text-muted-foreground">قواعد نشطة</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-4 pt-0">
                        <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
                            <Clock className="h-6 w-6 text-info" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{workflows.reduce((sum, w) => sum + (w.stats?.runs || 0), 0)}</p>
                            <p className="text-sm text-muted-foreground">إجمالي التنفيذات</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>الحالة</TableHead>
                            <TableHead>اسم القاعدة</TableHead>
                            <TableHead>المشغّل (Trigger)</TableHead>
                            <TableHead>الإجراء (Action)</TableHead>
                            <TableHead>التنفيذات</TableHead>
                            <TableHead>آخر نشاط</TableHead>
                            <TableHead className="text-left">إجراءات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {workflows.map((workflow) => (
                            <TableRow key={workflow._id} className={!workflow.enabled ? 'opacity-60 bg-muted/50' : ''}>
                                <TableCell>
                                    <Switch
                                        checked={workflow.enabled}
                                        onCheckedChange={() => toggleWorkflow(workflow._id)}
                                    />
                                </TableCell>
                                <TableCell className="font-medium">
                                    {workflow.name}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                                        {TRIGGERS.find(t => t.value === workflow.trigger)?.label || workflow.trigger}
                                        {workflow.triggerConfig?.keyword ? `: ${workflow.triggerConfig.keyword}` : ''}
                                        {workflow.triggerConfig?.tag ? `: ${workflow.triggerConfig.tag}` : ''}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                                        {ACTIONS.find(a => a.value === workflow.action)?.label || workflow.action}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {workflow.stats?.runs || 0}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                    {workflow.stats?.lastRun ? new Date(workflow.stats.lastRun).toLocaleString('en-US', {
                                        month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'
                                    }) : '-'}
                                </TableCell>
                                <TableCell className="text-left">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(workflow)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => deleteWorkflow({ id: workflow._id })} className="text-destructive hover:text-destructive">
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {workflows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                    لا توجد قواعد أتمتة حتى الآن. ابدأ بإنشاء قاعدة جديدة.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
