"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
    Clock,
    Tag,
    Smartphone,
    LayoutTemplate,
    ChevronRight,
    Play
} from "lucide-react"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Id } from "../../../../../convex/_generated/dataModel"

export default function NewCampaignPage() {
    const router = useRouter()
    const [currentStep, setCurrentStep] = useState(0)

    // Form Data
    const [name, setName] = useState("")
    const [scheduledAt, setScheduledAt] = useState<string>("")
    const [recurrenceCronSpec, setRecurrenceCronSpec] = useState<string>("")
    const [selectedTemplate, setSelectedTemplate] = useState<{ _id: string; name: string; components?: { type?: string; text?: string }[]; content?: string } | null>(null)
    const [targetAudience, setTargetAudience] = useState<"all" | "tags">("all")
    const [selectedTags, setSelectedTags] = useState<string[]>([])

    // Queries
    const templates = useQuery(api.templates.list)
    const contacts = useQuery(api.contacts.list, { limit: 1000 })

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
                templateId: selectedTemplate?._id as Id<"templates">,
                templateName: selectedTemplate?.name || "",
                targetTags: targetAudience === 'tags' ? selectedTags : undefined,
                scheduledAt: scheduledAt ? new Date(scheduledAt).getTime() : Date.now(),
                recurrenceCronSpec: recurrenceCronSpec || undefined
            })
            router.push("/campaigns?success=true")
        } catch (error) {
            console.error("Failed to create campaign:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const steps = [
        { id: 0, title: "التفاصيل", icon: <LayoutTemplate className="h-4 w-4" /> },
        { id: 1, title: "الجمهور", icon: <Users className="h-4 w-4" /> },
        { id: 2, title: "المحتوى", icon: <MessageSquare className="h-4 w-4" /> },
        { id: 3, title: "المراجعة", icon: <CheckCircle2 className="h-4 w-4" /> },
    ]

    return (
        <div className="max-w-6xl mx-auto p-6 sm:p-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={() => router.push("/campaigns")} className="rounded-xl">
                    <ArrowRight className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">إنشاء حملة جديدة</h1>
                    <p className="text-muted-foreground">قم بإعداد حملتك في 4 خطوات بسيطة</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Steps Sidebar */}
                <div className="lg:col-span-3 space-y-2">
                    {steps.map((step) => (
                        <div
                            key={step.id}
                            className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                                currentStep === step.id 
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                                    : currentStep > step.id 
                                        ? "bg-muted text-foreground"
                                        : "text-muted-foreground"
                            }`}
                        >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                currentStep === step.id ? "bg-white/20" : "bg-muted-foreground/10"
                            }`}>
                                {currentStep > step.id ? <CheckCircle2 className="h-5 w-5" /> : step.icon}
                            </div>
                            <span className="font-medium">{step.title}</span>
                            {currentStep === step.id && <ChevronRight className="h-4 w-4 mr-auto animate-pulse" />}
                        </div>
                    ))}
                </div>

                {/* Main Form Area */}
                <div className="lg:col-span-9">
                    <Card className="border-none shadow-none ring-1 ring-border/50 bg-card/50 backdrop-blur-sm min-h-[500px]">
                        <CardContent className="p-8">
                            {/* Step 1: Details */}
                            {currentStep === 0 && (
                                <div className="space-y-6 max-w-2xl animate-in slide-in-from-bottom-4 duration-500">
                                    <div className="space-y-2">
                                        <Label className="text-base">اسم الحملة</Label>
                                        <Input
                                            placeholder="مثال: عروض الجمعة البيضاء"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            className="h-12 text-lg"
                                            autoFocus
                                        />
                                    </div>
                                    
                                    <div className="space-y-4 pt-4">
                                        <Label className="text-base">وقت الإرسال</Label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div 
                                                className={`p-4 border rounded-xl cursor-pointer transition-all ${!scheduledAt ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-primary/50'}`}
                                                onClick={() => setScheduledAt("")}
                                            >
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${!scheduledAt ? 'border-primary' : 'border-muted-foreground'}`}>
                                                        {!scheduledAt && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                                    </div>
                                                    <span className="font-semibold">إرسال فوري</span>
                                                </div>
                                                <p className="text-sm text-muted-foreground mr-8">سيتم بدء الحملة فور الانتهاء من الإعداد</p>
                                            </div>

                                            <div 
                                                className={`p-4 border rounded-xl cursor-pointer transition-all ${scheduledAt ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-primary/50'}`}
                                                onClick={() => !scheduledAt && setScheduledAt(new Date().toISOString().slice(0, 16))}
                                            >
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${scheduledAt ? 'border-primary' : 'border-muted-foreground'}`}>
                                                        {scheduledAt && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                                    </div>
                                                    <span className="font-semibold">جدولة لوقت لاحق</span>
                                                </div>
                                                <Input
                                                    type="datetime-local"
                                                    className="mt-2 h-9 text-sm"
                                                    value={scheduledAt}
                                                    onChange={e => setScheduledAt(e.target.value)}
                                                    min={new Date().toISOString().slice(0, 16)}
                                                    disabled={!scheduledAt}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-4">
                                        <Label>تكرار دوري (اختياري)</Label>
                                        <Input
                                            placeholder="0 9 * * 1 (كل إثنين 9 صباحاً)"
                                            value={recurrenceCronSpec}
                                            onChange={e => setRecurrenceCronSpec(e.target.value)}
                                            className="font-mono text-sm"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            اترك الحقل فارغاً للإرسال مرة واحدة فقط.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Audience */}
                            {currentStep === 1 && (
                                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div
                                            className={`relative p-6 border rounded-2xl cursor-pointer transition-all overflow-hidden ${targetAudience === 'all' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-primary/50'}`}
                                            onClick={() => setTargetAudience('all')}
                                        >
                                            <div className="relative z-10">
                                                <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center mb-4 shadow-sm">
                                                    <Users className="h-6 w-6 text-primary" />
                                                </div>
                                                <h3 className="text-lg font-bold mb-1">جميع العملاء</h3>
                                                <p className="text-muted-foreground text-sm">إرسال لجميع جهات الاتصال المسجلة</p>
                                                <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-background text-sm font-medium shadow-sm">
                                                    {contacts?.length || 0} عميل
                                                </div>
                                            </div>
                                            {targetAudience === 'all' && <div className="absolute top-4 left-4 text-primary"><CheckCircle2 className="h-6 w-6" /></div>}
                                        </div>

                                        <div
                                            className={`relative p-6 border rounded-2xl cursor-pointer transition-all overflow-hidden ${targetAudience === 'tags' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-primary/50'}`}
                                            onClick={() => setTargetAudience('tags')}
                                        >
                                            <div className="relative z-10">
                                                <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center mb-4 shadow-sm">
                                                    <Tag className="h-6 w-6 text-primary" />
                                                </div>
                                                <h3 className="text-lg font-bold mb-1">تحديد فئات</h3>
                                                <p className="text-muted-foreground text-sm">استهداف مجموعة محددة حسب التصنيفات</p>
                                            </div>
                                            {targetAudience === 'tags' && <div className="absolute top-4 left-4 text-primary"><CheckCircle2 className="h-6 w-6" /></div>}
                                        </div>
                                    </div>

                                    {targetAudience === 'tags' && (
                                        <div className="space-y-4 bg-muted/30 p-6 rounded-2xl border animate-in fade-in zoom-in-95">
                                            <Label className="text-base">اختر التصنيفات المستهدفة</Label>
                                            <div className="flex flex-wrap gap-2">
                                                {uniqueTags.map(tag => (
                                                    <Badge
                                                        key={tag}
                                                        variant={selectedTags.includes(tag) ? "default" : "outline"}
                                                        className={`text-sm py-2 px-4 cursor-pointer hover:bg-primary/90 transition-all ${selectedTags.includes(tag) ? 'shadow-md shadow-primary/20' : 'bg-background hover:text-foreground'}`}
                                                        onClick={() => {
                                                            if (selectedTags.includes(tag)) {
                                                                setSelectedTags(selectedTags.filter(t => t !== tag))
                                                            } else {
                                                                setSelectedTags([...selectedTags, tag])
                                                            }
                                                        }}
                                                    >
                                                        {tag}
                                                        {selectedTags.includes(tag) && <CheckCircle2 className="h-3.5 w-3.5 mr-2" />}
                                                    </Badge>
                                                ))}
                                                {uniqueTags.length === 0 && <p className="text-muted-foreground text-sm">لا توجد تصنيفات متاحة</p>}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 text-blue-800 dark:text-blue-300">
                                        <span className="font-medium flex items-center gap-2">
                                            <Users className="h-5 w-5" />
                                            إجمالي المستلمين المتوقع:
                                        </span>
                                        <span className="text-xl font-bold">{filteredContacts.length}</span>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Content */}
                            {currentStep === 2 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-500">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-base">اختر القالب</Label>
                                            <Badge variant="outline" className="font-normal">{templates?.filter(t => t.status === 'APPROVED').length || 0} قوالب متاحة</Badge>
                                        </div>
                                        
                                        <ScrollArea className="h-[400px] pr-4">
                                            <div className="space-y-3">
                                                {!templates ? (
                                                    [1,2,3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)
                                                ) : (
                                                    templates.filter(t => t.status === 'APPROVED').map(template => (
                                                        <div
                                                            key={template._id}
                                                            className={`p-4 border rounded-xl cursor-pointer transition-all hover:shadow-sm ${selectedTemplate?._id === template._id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-primary/50'}`}
                                                            onClick={() => setSelectedTemplate(template)}
                                                        >
                                                            <div className="flex justify-between items-start mb-2">
                                                                <h4 className="font-semibold">{template.name}</h4>
                                                                {selectedTemplate?._id === template._id && <CheckCircle2 className="h-5 w-5 text-primary" />}
                                                            </div>
                                                            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                                                {(template.components as { type?: string; text?: string }[] | undefined)?.find(c => c.type === 'BODY')?.text || template.content}
                                                            </p>
                                                            <div className="mt-3 flex gap-2">
                                                                <Badge variant="secondary" className="text-[10px]">{template.category}</Badge>
                                                                <Badge variant="outline" className="text-[10px]">{template.language}</Badge>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </div>

                                    {/* Phone Preview */}
                                    <div className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-900 border-[14px] rounded-[2.5rem] h-[500px] w-[300px] shadow-xl">
                                        <div className="w-[148px] h-[18px] bg-gray-800 top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute"></div>
                                        <div className="h-[32px] w-[3px] bg-gray-800 absolute -left-[17px] top-[72px] rounded-l-lg"></div>
                                        <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[124px] rounded-l-lg"></div>
                                        <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[178px] rounded-l-lg"></div>
                                        <div className="h-[64px] w-[3px] bg-gray-800 absolute -right-[17px] top-[142px] rounded-r-lg"></div>
                                        <div className="rounded-[2rem] overflow-hidden w-full h-full bg-[#E5DDD5] dark:bg-[#111b21] relative flex flex-col">
                                            {/* WhatsApp Header */}
                                            <div className="bg-[#008069] dark:bg-[#202c33] p-3 pt-8 flex items-center gap-2 text-white">
                                                <ChevronRight className="h-5 w-5 rotate-180" />
                                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                                    <Smartphone className="h-4 w-4" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-sm font-semibold">W-AI Demo</div>
                                                </div>
                                            </div>
                                            
                                            {/* Message Area */}
                                            <div className="flex-1 p-3 overflow-y-auto bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat opacity-90">
                                                {selectedTemplate ? (
                                                    <div className="bg-white dark:bg-[#202c33] p-2 rounded-lg rounded-tl-none shadow-sm max-w-[85%] mb-2">
                                                        <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-100 whitespace-pre-wrap">
                                                            {(selectedTemplate.components as { type?: string; text?: string }[] | undefined)?.find(c => c.type === 'BODY')?.text || selectedTemplate.content}
                                                        </p>
                                                        <div className="text-[10px] text-gray-400 text-right mt-1">
                                                            {format(new Date(), "p", { locale: ar })}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex h-full items-center justify-center text-gray-500 text-xs">
                                                        اختر قالباً للمعاينة
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Review */}
                            {currentStep === 3 && (
                                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-muted/30 border rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <div>
                                                <Label className="text-muted-foreground text-xs uppercase tracking-wider">الحملة</Label>
                                                <div className="text-xl font-bold mt-1">{name}</div>
                                            </div>
                                            <div>
                                                <Label className="text-muted-foreground text-xs uppercase tracking-wider">التوقيت</Label>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Clock className="h-5 w-5 text-primary" />
                                                    <span className="text-lg font-medium">
                                                        {scheduledAt ? format(new Date(scheduledAt), "PPP p", { locale: ar }) : "إرسال فوري"}
                                                    </span>
                                                </div>
                                                {recurrenceCronSpec && (
                                                    <Badge variant="outline" className="mt-2">تكرار: {recurrenceCronSpec}</Badge>
                                                )}
                                            </div>
                                            <div>
                                                <Label className="text-muted-foreground text-xs uppercase tracking-wider">الجمهور</Label>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Users className="h-5 w-5 text-primary" />
                                                    <span className="text-lg font-medium">{filteredContacts.length} مستلم</span>
                                                </div>
                                                <div className="text-sm text-muted-foreground mt-1">
                                                    {targetAudience === 'all' ? 'جميع جهات الاتصال' : `التصنيفات: ${selectedTags.join(', ')}`}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-card border rounded-xl p-4 shadow-sm">
                                            <Label className="text-muted-foreground text-xs mb-3 block">محتوى الرسالة</Label>
                                            <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                                {(selectedTemplate?.components as { type?: string; text?: string }[] | undefined)?.find(c => c.type === 'BODY')?.text || selectedTemplate?.content}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4 p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/20 rounded-xl text-yellow-800 dark:text-yellow-200">
                                        <Play className="h-5 w-5 mt-0.5 shrink-0" />
                                        <div className="text-sm">
                                            <p className="font-semibold mb-1">تنبيه هام</p>
                                            <p className="opacity-90">
                                                سيتم جدولة الحملة وإرسال الرسائل بشكل تدريجي (Batching) لتجنب الحظر من WhatsApp.
                                                يمكنك متابعة حالة الإرسال في لوحة التحكم.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Navigation */}
                            <div className="flex justify-between pt-8 border-t mt-8">
                                <Button
                                    variant="outline"
                                    onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                                    disabled={currentStep === 0}
                                    className="px-8"
                                >
                                    السابق
                                </Button>
                                
                                {currentStep < 3 ? (
                                    <Button
                                        onClick={() => setCurrentStep(currentStep + 1)}
                                        disabled={
                                            (currentStep === 0 && !name) ||
                                            (currentStep === 1 && filteredContacts.length === 0) ||
                                            (currentStep === 2 && !selectedTemplate)
                                        }
                                        className="px-8 gap-2"
                                    >
                                        التالي <ArrowRight className="h-4 w-4 rotate-180" />
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleSubmit}
                                        className="px-10 gap-2 bg-[#004D3D] hover:bg-[#003D2D]"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? "جاري الإنشاء..." : scheduledAt ? "تأكيد الجدولة" : "إرسال الحملة"}
                                        {!isSubmitting && <CheckCircle2 className="h-4 w-4" />}
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}