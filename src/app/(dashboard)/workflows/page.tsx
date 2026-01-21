"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
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
    ChevronDown
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
    { value: "keyword", label: "كلمة مفتاحية", icon: Tag },
    { value: "tag_added", label: "إضافة وسم", icon: Tag },
]

const ACTIONS = [
    { value: "send_template", label: "إرسال قالب", icon: Send },
    { value: "add_tag", label: "إضافة وسم", icon: Tag },
    { value: "notify", label: "إرسال تنبيه", icon: Bell },
]

export default function WorkflowsPage() {
    const workflows = useQuery(api.workflows.list) || []
    const createWorkflow = useMutation(api.workflows.create)
    const toggleWorkflowMutation = useMutation(api.workflows.toggle)
    const deleteWorkflow = useMutation(api.workflows.remove)

    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [name, setName] = useState("")
    const [selectedTrigger, setSelectedTrigger] = useState("")
    const [triggerConfig, setTriggerConfig] = useState<any>({})
    const [selectedAction, setSelectedAction] = useState("")
    const [actionConfig, setActionConfig] = useState<any>({})

    const toggleWorkflow = async (id: string) => {
        await toggleWorkflowMutation({ id: id as any })
    }

    const handleSave = async () => {
        try {
            await createWorkflow({
                name: name || "قاعدة جديدة",
                trigger: selectedTrigger,
                triggerConfig,
                action: selectedAction,
                actionConfig,
            })
            setIsCreateOpen(false)
            resetForm()
        } catch (error) {
            console.error("Failed to create workflow", error)
        }
    }

    const resetForm = () => {
        setName("")
        setSelectedTrigger("")
        setTriggerConfig({})
        setSelectedAction("")
        setActionConfig({})
    }

    return (
        <div className="space-y-6">
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
                            <DialogTitle>إنشاء قاعدة أتمتة</DialogTitle>
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
                                                className={`border rounded-xl p-4 cursor-pointer transition-all ${selectedTrigger === trigger.value ? 'border-primary bg-primary/5 shadow-sm' : 'hover:border-primary/50'}`}
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
                                                className={`border rounded-xl p-4 cursor-pointer transition-all ${selectedAction === action.value ? 'border-primary bg-primary/5 shadow-sm' : 'hover:border-primary/50'}`}
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
                                        <Select onValueChange={(v) => setActionConfig({ ...actionConfig, template: v })}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="اختر قالب..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="welcome">رسالة ترحيب</SelectItem>
                                                <SelectItem value="promo">عرض ترويجي</SelectItem>
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

            <div className="space-y-4">
                {workflows.map((workflow) => (
                    <Card key={workflow._id} className={!workflow.enabled ? 'opacity-60' : ''}>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${workflow.enabled ? 'bg-primary/10' : 'bg-muted'}`}>
                                        <Zap className={`h-5 w-5 ${workflow.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-foreground">{workflow.name}</h3>
                                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                            <span className="bg-warning/10 text-warning px-2 py-0.5 rounded text-xs">
                                                {workflow.trigger}{workflow.triggerConfig?.keyword ? `: ${workflow.triggerConfig.keyword}` : ''}
                                            </span>
                                            <ArrowRight className="h-3 w-3" />
                                            <span className="bg-success/10 text-success px-2 py-0.5 rounded text-xs">
                                                {workflow.action}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-left">
                                        <p className="text-sm font-medium">{workflow.stats?.runs || 0}</p>
                                        <p className="text-xs text-muted-foreground">تنفيذ</p>
                                    </div>
                                    <Switch
                                        checked={workflow.enabled}
                                        onCheckedChange={() => toggleWorkflow(workflow._id)}
                                    />
                                    <Button variant="ghost" size="icon">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
