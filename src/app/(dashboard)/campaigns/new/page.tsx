"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
    ArrowRight,
    Users,
    MessageSquare,
    Calendar,
    CheckCircle2,
    Search,
    Clock,
    UserPlus,
    Tag
} from "lucide-react"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

export default function NewCampaignPage() {
    const router = useRouter()

    // Steps: 0=Details, 1=Audience, 2=Content, 3=Review
    const [currentStep, setCurrentStep] = useState(0)

    // Form Data
    const [name, setName] = useState("")
    const [scheduledAt, setScheduledAt] = useState<string>("") // ISO string for input
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
    const [targetAudience, setTargetAudience] = useState<"all" | "tags">("all")
    const [selectedTags, setSelectedTags] = useState<string[]>([])

    // Queries
    const templates = useQuery(api.templates.list)
    const contacts = useQuery(api.contacts.list, { limit: 1000 }) // TODO: optimize fetch

    const createCampaign = useMutation(api.campaigns.create)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Derived Stats
    const filteredContacts = contacts?.filter(c => {
        if (targetAudience === 'all') return true
        return c.tags?.some(t => selectedTags.includes(t))
    }) || []

    const uniqueTags = Array.from(new Set(contacts?.flatMap(c => c.tags || []) || []))

    const handleSubmit = async () => {
        setIsSubmitting(true)
        try {
            await createCampaign({
                name,
                templateId: selectedTemplate._id,
                templateName: selectedTemplate.name,
                targetTags: targetAudience === 'tags' ? selectedTags : undefined,
                scheduledAt: scheduledAt ? new Date(scheduledAt).getTime() : Date.now()
            })
            router.push("/campaigns?success=true")
        } catch (error) {
            console.error("Failed to create campaign:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4 sm:p-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={() => router.push("/campaigns")}>
                    <ArrowRight className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">إنشاء حملة جديدة</h1>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <span className={currentStep >= 0 ? "text-primary font-medium" : ""}>1. التفاصيل</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className={currentStep >= 1 ? "text-primary font-medium" : ""}>2. الجمهور</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className={currentStep >= 2 ? "text-primary font-medium" : ""}>3. المحتوى</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className={currentStep >= 3 ? "text-primary font-medium" : ""}>4. مراجعة</span>
                    </div>
                </div>
            </div>

            {/* Step 1: Details */}
            {currentStep === 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>تفاصيل الحملة</CardTitle>
                        <CardDescription>أدخل اسم ووقت الحملة</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>اسم الحملة</Label>
                            <Input
                                placeholder="مثال: عروض الجمعة البيضاء"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>وقت الإرسال</Label>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer bg-muted/20" onClick={() => setScheduledAt("")}>
                                    <div className={`w-4 h-4 rounded-full border ${!scheduledAt ? 'bg-primary border-primary' : ''}`} />
                                    <span>إرسال فوري</span>
                                </div>
                                <div className="flex items-center gap-2 p-3 border rounded-lg">
                                    <div className={`w-4 h-4 rounded-full border ${scheduledAt ? 'bg-primary border-primary' : ''}`} />
                                    <Input
                                        type="datetime-local"
                                        className="border-0 p-0 h-auto focus-visible:ring-0"
                                        value={scheduledAt}
                                        onChange={e => setScheduledAt(e.target.value)}
                                        min={new Date().toISOString().slice(0, 16)}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end pt-4">
                            <Button onClick={() => setCurrentStep(1)} disabled={!name}>
                                متابعة <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 2: Audience */}
            {currentStep === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle>الجمهور المستهدف</CardTitle>
                        <CardDescription>اختر من سترسل لهم هذه الحملة</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div
                                className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${targetAudience === 'all' ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                                onClick={() => setTargetAudience('all')}
                            >
                                <Users className="h-6 w-6 mb-2 text-primary" />
                                <div className="font-semibold">جميع العملاء</div>
                                <div className="text-sm text-muted-foreground">{contacts?.length || 0} عميل</div>
                            </div>
                            <div
                                className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${targetAudience === 'tags' ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                                onClick={() => setTargetAudience('tags')}
                            >
                                <Tag className="h-6 w-6 mb-2 text-primary" />
                                <div className="font-semibold">حسب التصنيفات/Tags</div>
                                <div className="text-sm text-muted-foreground">اختر فئات محددة</div>
                            </div>
                        </div>

                        {targetAudience === 'tags' && (
                            <div className="space-y-2 animate-in slide-in-from-top-2">
                                <Label>اختر التصنيفات</Label>
                                <div className="flex flex-wrap gap-2">
                                    {uniqueTags.map(tag => (
                                        <Badge
                                            key={tag}
                                            variant={selectedTags.includes(tag) ? "default" : "outline"}
                                            className="cursor-pointer gap-1 py-1.5 px-3"
                                            onClick={() => {
                                                if (selectedTags.includes(tag)) {
                                                    setSelectedTags(selectedTags.filter(t => t !== tag))
                                                } else {
                                                    setSelectedTags([...selectedTags, tag])
                                                }
                                            }}
                                        >
                                            {selectedTags.includes(tag) && <CheckCircle2 className="h-3 w-3" />}
                                            {tag}
                                        </Badge>
                                    ))}
                                    {uniqueTags.length === 0 && <div className="text-muted-foreground text-sm">لا توجد تصنيفات متاحة</div>}
                                </div>
                            </div>
                        )}

                        <div className="bg-muted p-4 rounded-lg flex items-center justify-between">
                            <span className="text-sm font-medium">العدد المتوقع للمستلمين:</span>
                            <Badge variant="secondary" className="text-lg px-3">{filteredContacts.length}</Badge>
                        </div>

                        <div className="flex justify-between pt-4">
                            <Button variant="outline" onClick={() => setCurrentStep(0)}>رجوع</Button>
                            <Button onClick={() => setCurrentStep(2)} disabled={filteredContacts.length === 0}>
                                متابعة <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 3: Content */}
            {currentStep === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle>محتوى الحملة</CardTitle>
                        <CardDescription>اختر القالب الذي تريد إرساله</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>قوالب WhatsApp المعتمدة</Label>
                            {!templates ? (
                                <div className="h-10 bg-muted animate-pulse rounded-md" />
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto p-1">
                                    {templates.filter(t => t.status === 'APPROVED').map(template => (
                                        <div
                                            key={template._id}
                                            className={`p-3 border rounded-lg cursor-pointer transition-all flex items-start justify-between ${selectedTemplate?._id === template._id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-primary/50'}`}
                                            onClick={() => setSelectedTemplate(template)}
                                        >
                                            <div className="space-y-1">
                                                <div className="font-medium flex items-center gap-2">
                                                    {template.name}
                                                    <Badge variant="outline" className="text-[10px]">{template.category}</Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-2">
                                                    {template.components?.find((c: any) => c.type === 'BODY')?.text || template.content}
                                                </p>
                                            </div>
                                            {selectedTemplate?._id === template._id && <CheckCircle2 className="h-5 w-5 text-primary" />}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedTemplate && (
                            <div className="bg-muted/30 p-4 rounded-xl space-y-2 border">
                                <Label className="text-muted-foreground text-xs">معاينة نص الرسالة:</Label>
                                <p className="text-sm whitespace-pre-wrap">
                                    {selectedTemplate.components?.find((c: any) => c.type === 'BODY')?.text || selectedTemplate.content}
                                </p>
                            </div>
                        )}

                        <div className="flex justify-between pt-4">
                            <Button variant="outline" onClick={() => setCurrentStep(1)}>رجوع</Button>
                            <Button onClick={() => setCurrentStep(3)} disabled={!selectedTemplate}>
                                متابعة <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 4: Review */}
            {currentStep === 3 && (
                <Card>
                    <CardHeader>
                        <CardTitle>مراجعة وإرسال</CardTitle>
                        <CardDescription>تأكد من التفاصيل قبل جدولة الحملة</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-muted-foreground text-xs">اسم الحملة</Label>
                                    <div className="font-medium text-lg">{name}</div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-xs">وقت الإرسال</Label>
                                    <div className="font-medium flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-primary" />
                                        {scheduledAt ? format(new Date(scheduledAt), "PPP p", { locale: ar }) : "فوري (الآن)"}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-xs">الجمهور المستهدف</Label>
                                    <div className="font-medium flex items-center gap-2">
                                        <Users className="h-4 w-4 text-primary" />
                                        {filteredContacts.length} عميل
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {targetAudience === 'all' ? 'جميع العملاء' : `التصنيفات: ${selectedTags.join(', ')}`}
                                    </div>
                                </div>
                            </div>

                            <div className="border rounded-xl p-4 bg-muted/10">
                                <Label className="text-muted-foreground text-xs mb-2 block">القالب المختار</Label>
                                <div className="bg-white dark:bg-black border rounded-lg p-3 text-sm">
                                    {selectedTemplate?.components?.find((c: any) => c.type === 'BODY')?.text || selectedTemplate?.content}
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 p-4 rounded-lg flex gap-3 text-yellow-800 dark:text-yellow-200 text-sm">
                            <CheckCircle2 className="h-5 w-5 shrink-0" />
                            <p>
                                سيتم إرسال الرسائل تدريجيًا لضمان استقرار الخدمة وتجنب الحظر.
                                يمكن متابعة تقدم الحملة في صفحة الحملات.
                            </p>
                        </div>

                        <div className="flex justify-between pt-4">
                            <Button variant="outline" onClick={() => setCurrentStep(2)}>رجوع</Button>
                            <Button
                                onClick={handleSubmit}
                                className="bg-[#004D3D] hover:bg-[#003D2D] gap-2 px-8"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "جاري الإنشاء..." : scheduledAt ? "جدولة الحملة" : "إرسال الحملة الآن"}
                                {!isSubmitting && <CheckCircle2 className="h-4 w-4" />}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
