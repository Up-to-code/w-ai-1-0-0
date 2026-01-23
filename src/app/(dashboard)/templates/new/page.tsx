"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAction, useQuery, useMutation } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
    ArrowRight,
    LayoutTemplate,
    FileText,
    Image as ImageIcon,
    Video,
    Type,
    MousePointerClick,
    Plus,
    X,
    CheckCircle2,
    Smartphone,
    Link2,
    Phone,
    AlertCircle,
    Copy,
    ShoppingBag,
    Layers,
    Upload,
    Loader2
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { ProductPicker } from "../../chat/_components/ProductPicker"

interface CarouselCard {
    headerType: "IMAGE" | "VIDEO"
    headerHandle?: string // Meta Handle
    headerUrl?: string // Preview URL
    bodyText: string
    buttons: ButtonConfig[]
}

interface ButtonConfig {
    type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER" | "COPY_CODE" | "CATALOG"
    text: string
    url?: string
    phone_number?: string
    example?: string // For COPY_CODE
}

export default function NewTemplatePage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const editName = searchParams?.get("edit")
    
    const createTemplate = useAction(api.templates.createTemplate)
    const existingTemplate = useQuery(api.templates.getByName, editName ? { name: editName } : "skip")
    const uploadTemplateMedia = useAction(api.whatsapp.uploadTemplateMedia)
    const uploadExternalMedia = useAction(api.whatsapp.uploadExternalTemplateMedia)
    const generateUploadUrl = useMutation(api.files.generateUploadUrl)

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [uploadingMedia, setUploadingMedia] = useState(false)

    // Form State
    const [name, setName] = useState("")
    const [category, setCategory] = useState("MARKETING")
    const [language, setLanguage] = useState("ar")
    const [templateType, setTemplateType] = useState<"STANDARD" | "CAROUSEL">("STANDARD")
    
    // Standard Components State
    const [headerType, setHeaderType] = useState<"NONE" | "TEXT" | "IMAGE" | "VIDEO">("NONE")
    const [headerText, setHeaderText] = useState("")
    const [headerHandle, setHeaderHandle] = useState("")
    const [headerPreviewUrl, setHeaderPreviewUrl] = useState("")
    
    const [bodyText, setBodyText] = useState("")
    const [footerText, setFooterText] = useState("")
    const [buttons, setButtons] = useState<ButtonConfig[]>([])

    // Carousel State
    const [carouselHeaderType, setCarouselHeaderType] = useState<"IMAGE" | "VIDEO">("IMAGE")
    const [carouselCards, setCarouselCards] = useState<CarouselCard[]>([
        { headerType: "IMAGE", bodyText: "", buttons: [{ type: "URL", text: "View Details", url: "https://example.com" }] },
        { headerType: "IMAGE", bodyText: "", buttons: [{ type: "URL", text: "View Details", url: "https://example.com" }] }
    ])

    const fileInputRef = useRef<HTMLInputElement>(null)
    const [activeUploadField, setActiveUploadField] = useState<"HEADER" | number | null>(null) // HEADER or Card Index

    // Pre-fill form if editing
    useEffect(() => {
        if (existingTemplate && !name) { // Only fill once
            setName(existingTemplate.name + "_copy") // Suggest new name
            setCategory(existingTemplate.category)
            setLanguage(existingTemplate.language)
            
            const components = existingTemplate.components || []
            
            // Detect Type
            const carousel = components.find((c: any) => c.type === "CAROUSEL")
            if (carousel) {
                setTemplateType("CAROUSEL")
                // TODO: Parse carousel cards
            } else {
                setTemplateType("STANDARD")
                // Header
                const header = components.find((c: any) => c.type === "HEADER")
                if (header) {
                    setHeaderType(header.format)
                    if (header.format === "TEXT") setHeaderText(header.text || "")
                    // Note: Handles are not usually retrievable for editing, need re-upload
                }
                
                // Body
                const body = components.find((c: any) => c.type === "BODY")
                if (body) setBodyText(body.text || "")
                
                // Footer
                const footer = components.find((c: any) => c.type === "FOOTER")
                if (footer) setFooterText(footer.text || "")
                
                // Buttons
                const btns = components.find((c: any) => c.type === "BUTTONS")
                if (btns && btns.buttons) {
                    setButtons(btns.buttons.map((b: any) => ({
                        type: b.type,
                        text: b.text,
                        url: b.url,
                        phone_number: b.phone_number,
                        example: b.example
                    })))
                }
            }
        }
    }, [existingTemplate])

    // --- Media Upload Logic ---
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadingMedia(true)
        try {
            // 1. Upload to Convex Storage first (to get a URL for the server to read)
            const postUrl = await generateUploadUrl()
            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            })
            const { storageId } = await result.json()

            // 2. Upload to Meta via Server Action
            const handle = await uploadTemplateMedia({
                storageId,
                type: file.type
            })

            const previewUrl = URL.createObjectURL(file)

            if (activeUploadField === "HEADER") {
                setHeaderHandle(handle)
                setHeaderPreviewUrl(previewUrl)
            } else if (typeof activeUploadField === "number") {
                // Update Carousel Card
                const newCards = [...carouselCards]
                newCards[activeUploadField].headerHandle = handle
                newCards[activeUploadField].headerUrl = previewUrl
                setCarouselCards(newCards)
            }

        } catch (error) {
            console.error("Upload failed:", error)
            alert("فشل رفع الملف. تأكد من إعدادات Meta.")
        } finally {
            setUploadingMedia(false)
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    const triggerUpload = (field: "HEADER" | number) => {
        setActiveUploadField(field)
        fileInputRef.current?.click()
    }

    const handleSallaProductSelect = async (product: any, field: "HEADER" | number) => {
        if (!product.image) {
            alert("هذا المنتج لا يحتوي على صورة")
            return
        }

        setUploadingMedia(true)
        try {
            // 1. Update Preview Immediately
            if (field === "HEADER") {
                setHeaderType("IMAGE")
                setHeaderPreviewUrl(product.image)
                if (!bodyText) setBodyText(`${product.name}\n${product.price} ${product.currency}`)
            } else if (typeof field === "number") {
                if (carouselHeaderType !== "IMAGE") {
                     setCarouselHeaderType("IMAGE")
                     const newCards = carouselCards.map(c => ({ ...c, headerType: "IMAGE" as const }))
                     setCarouselCards(newCards)
                }
                
                const newCards = [...carouselCards]
                newCards[field].headerUrl = product.image
                newCards[field].bodyText = `${product.name}\n${product.price} ${product.currency}`
                setCarouselCards(newCards)
            }

            // 2. Upload to Meta (Backend handles fetch -> upload)
            const handle = await uploadExternalMedia({
                url: product.image,
                type: "image/jpeg" // Salla images are usually JPEGs/PNGs
            })

            // 3. Update Handle
            if (field === "HEADER") {
                setHeaderHandle(handle)
            } else if (typeof field === "number") {
                const newCards = [...carouselCards]
                newCards[field].headerHandle = handle
                // Re-update body/url just in case (though already done)
                newCards[field].headerUrl = product.image 
                newCards[field].bodyText = `${product.name}\n${product.price} ${product.currency}`
                
                // Add button if missing or update URL
                if (product.url) {
                    const hasUrlBtn = newCards[field].buttons.some(b => b.type === "URL")
                    if (!hasUrlBtn) {
                        // Check if we can add a button (limit 2 usually for mixed, or just 3)
                        if (newCards[field].buttons.length < 2) {
                             newCards[field].buttons.push({
                                 type: "URL",
                                 text: "عرض المنتج",
                                 url: product.url
                             })
                        }
                    } else {
                        // Update existing URL button? Maybe safer to leave user choice, 
                        // but let's try to update empty ones
                        newCards[field].buttons = newCards[field].buttons.map(b => 
                            b.type === "URL" && (!b.url || b.url === "https://example.com") 
                                ? { ...b, url: product.url, text: b.text === "View Details" ? "عرض المنتج" : b.text } 
                                : b
                        )
                    }
                }

                setCarouselCards(newCards)
            }

        } catch (error) {
            console.error("Salla import failed:", error)
            alert("فشل استيراد الصورة من سلة. " + String(error))
        } finally {
            setUploadingMedia(false)
        }
    }

    // --- Button Logic ---
    const handleAddButton = (type: ButtonConfig["type"], targetCards?: boolean, cardIndex?: number) => {
        if (targetCards) {
             // For Carousel: All cards must have same button structure
             // We update the schema for ALL cards
             const newCards = carouselCards.map(card => ({
                 ...card,
                 buttons: [...card.buttons, { type, text: "", url: "", phone_number: "" }]
             }))
             setCarouselCards(newCards)
        } else {
            if (buttons.length >= 3) return // Max 3 for standard mixed, max 10 for quick replies? Meta rules are complex.
            // Simplified: Max 3 general buttons
            setButtons([...buttons, { type, text: "", url: "", phone_number: "" }])
        }
    }

    const handleRemoveButton = (index: number, targetCards?: boolean) => {
        if (targetCards) {
            const newCards = carouselCards.map(card => ({
                ...card,
                buttons: card.buttons.filter((_, i) => i !== index)
            }))
            setCarouselCards(newCards)
        } else {
            setButtons(buttons.filter((_, i) => i !== index))
        }
    }

    const handleButtonChange = (index: number, field: string, value: string, targetCards?: boolean) => {
        if (targetCards) {
             // Updates validation/schema, but text might be unique per card? 
             // NO, Meta Carousel buttons must be SAME type, but text can be different?
             // Actually for Quick Replies yes. For URL/Phone, usually same type.
             // Meta Rule: "The buttons in each card must be the same type and in the same order."
             // "Button parameters (text, url, payload) can be different."
             // So we update ALL cards if it's type change. If text change, only that card?
             // To simplify UI: We will define the Button Structure globally for the carousel, 
             // and allow editing text per card.
             // WAIT: This is getting complex.
             // Let's implement: "Global Button Definition" for Carousel.
             // Actually, let's keep it simple: 
             // Update logic: if changing TYPE, change for all. If changing text, change for all (template default).
             // User can override text in specific card if needed? 
             // For now, let's assume buttons are identical across cards for simplicity, 
             // as most catalogs work that way.
             
             const newCards = carouselCards.map(card => {
                 const newBtns = [...card.buttons]
                 newBtns[index] = { ...newBtns[index], [field]: value }
                 return { ...card, buttons: newBtns }
             })
             setCarouselCards(newCards)
        } else {
            const newButtons = [...buttons]
            newButtons[index] = { ...newButtons[index], [field]: value }
            setButtons(newButtons)
        }
    }

    // --- Carousel Logic ---
    const handleCarouselTypeChange = (type: "IMAGE" | "VIDEO") => {
        setCarouselHeaderType(type)
        const newCards = carouselCards.map(card => ({ ...card, headerType: type }))
        setCarouselCards(newCards)
    }

    const addCard = () => {
        if (carouselCards.length >= 10) return
        // Copy structure of first card
        const templateCard = carouselCards[0]
        setCarouselCards([...carouselCards, { 
            headerType: carouselHeaderType, 
            bodyText: "", 
            buttons: templateCard.buttons.map(b => ({...b, text: b.text})) 
        }])
    }

    const removeCard = (index: number) => {
        if (carouselCards.length <= 1) return
        setCarouselCards(carouselCards.filter((_, i) => i !== index))
    }

    const updateCard = (index: number, field: keyof CarouselCard, value: any) => {
        const newCards = [...carouselCards]
        newCards[index] = { ...newCards[index], [field]: value }
        setCarouselCards(newCards)
    }


    const handleSubmit = async () => {
        if (!name) return
        
        setIsSubmitting(true)
        try {
            const components: any[] = []

            if (templateType === "STANDARD") {
                // Header
                if (headerType !== "NONE") {
                    components.push({
                        type: "HEADER",
                        format: headerType,
                        text: headerType === "TEXT" ? headerText : undefined,
                        example: (headerType === "IMAGE" || headerType === "VIDEO") && headerHandle ? {
                            header_handle: [headerHandle]
                        } : undefined
                    })
                }

                // Body
                components.push({ type: "BODY", text: bodyText })

                // Footer
                if (footerText) components.push({ type: "FOOTER", text: footerText })

                // Buttons
                if (buttons.length > 0) {
                    components.push({
                        type: "BUTTONS",
                        buttons: buttons.map(b => ({
                            type: b.type,
                            text: b.text,
                            url: b.type === "URL" ? b.url : undefined,
                            phone_number: b.type === "PHONE_NUMBER" ? b.phone_number : undefined,
                            example: b.type === "COPY_CODE" ? b.example : undefined
                        }))
                    })
                }
            } else {
                // CAROUSEL
                components.push({ type: "BODY", text: bodyText || "Carousel Message" }) // Main body is required? Meta says "Body is required for the message bubble that contains the carousel"
                
                const cards = carouselCards.map(card => {
                    const cardComponents: any[] = [
                        {
                            type: "HEADER",
                            format: card.headerType,
                            example: card.headerHandle ? { header_handle: [card.headerHandle] } : undefined
                        },
                        { type: "BODY", text: card.bodyText }
                    ]

                    if (card.buttons.length > 0) {
                        cardComponents.push({
                            type: "BUTTONS",
                            buttons: card.buttons.map(b => ({
                                type: b.type,
                                text: b.text,
                                url: b.type === "URL" ? b.url : undefined,
                                phone_number: b.type === "PHONE_NUMBER" ? b.phone_number : undefined
                            }))
                        })
                    }

                    return {
                        components: cardComponents
                    }
                })

                components.push({
                    type: "CAROUSEL",
                    cards: cards
                })
            }

            if (templateType === "CAROUSEL") {
                const invalidCardIndex = carouselCards.findIndex(c => c.buttons.length === 0)
                if (invalidCardIndex !== -1) {
                    alert(`البطاقة رقم ${invalidCardIndex + 1} يجب أن تحتوي على زر واحد على الأقل.`)
                    setIsSubmitting(false)
                    return
                }
            }

            await createTemplate({
                name: name.toLowerCase().replace(/\s+/g, '_'),
                category,
                language,
                components
            })

            router.push("/templates?success=true")
        } catch (error) {
            console.error("Failed to create template:", error)
            alert("فشل إنشاء القالب. " + String(error))
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="max-w-6xl mx-auto p-6 sm:p-8 animate-in fade-in duration-500">
            {/* Hidden File Input */}
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileUpload} 
                accept="image/*,video/*"
            />

            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={() => router.push("/templates")} className="rounded-xl">
                    <ArrowRight className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">{editName ? "نسخ وتعديل قالب" : "إنشاء قالب جديد"}</h1>
                    <p className="text-muted-foreground">صمم رسالة WhatsApp تفاعلية وجذابة</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Editor Column */}
                <div className="lg:col-span-8 space-y-6">
                    <Card className="border-none shadow-sm">
                        <CardContent className="p-6 space-y-8">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>اسم القالب (بالإنجليزي فقط)</Label>
                                    <Input 
                                        placeholder="مثال: welcome_message" 
                                        value={name} 
                                        onChange={e => setName(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
                                        className="font-mono"
                                    />
                                    <p className="text-xs text-muted-foreground">يجب أن يكون فريداً، أحرف صغيرة وشرطة سفلية فقط.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>الفئة</Label>
                                    <Select value={category} onValueChange={setCategory}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="MARKETING">تسويق (Marketing)</SelectItem>
                                            <SelectItem value="UTILITY">خدمي (Utility)</SelectItem>
                                            <SelectItem value="AUTHENTICATION">توثيق (Auth)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>نوع القالب</Label>
                                    <div className="flex gap-2">
                                        <div 
                                            onClick={() => setTemplateType("STANDARD")}
                                            className={`flex-1 border rounded-xl p-3 cursor-pointer transition-all flex items-center justify-center gap-2 ${templateType === 'STANDARD' ? 'border-primary bg-primary/5 text-primary font-bold' : 'hover:bg-muted'}`}
                                        >
                                            <FileText className="h-4 w-4" />
                                            قياسي
                                        </div>
                                        <div 
                                            onClick={() => setTemplateType("CAROUSEL")}
                                            className={`flex-1 border rounded-xl p-3 cursor-pointer transition-all flex items-center justify-center gap-2 ${templateType === 'CAROUSEL' ? 'border-primary bg-primary/5 text-primary font-bold' : 'hover:bg-muted'}`}
                                        >
                                            <Layers className="h-4 w-4" />
                                            كاروسيل (Carousel)
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {templateType === "STANDARD" ? (
                                // --- STANDARD EDITOR ---
                                <>
                                    {/* Header Section */}
                                    <div className="space-y-4">
                                        <Label className="flex items-center gap-2">
                                            <LayoutTemplate className="h-4 w-4" />
                                            رأس الرسالة (Header) <span className="text-muted-foreground font-normal text-xs">(اختياري)</span>
                                        </Label>
                                        <RadioGroup 
                                            value={headerType} 
                                            onValueChange={(v: any) => setHeaderType(v)}
                                            className="flex flex-wrap gap-4"
                                        >
                                            <div className={`flex items-center gap-2 border rounded-xl p-3 cursor-pointer transition-all ${headerType === 'NONE' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}>
                                                <RadioGroupItem value="NONE" id="h-none" />
                                                <Label htmlFor="h-none" className="cursor-pointer">بدون</Label>
                                            </div>
                                            <div className={`flex items-center gap-2 border rounded-xl p-3 cursor-pointer transition-all ${headerType === 'TEXT' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}>
                                                <RadioGroupItem value="TEXT" id="h-text" />
                                                <Label htmlFor="h-text" className="cursor-pointer flex items-center gap-2"><Type className="h-4 w-4" /> نص</Label>
                                            </div>
                                            <div className={`flex items-center gap-2 border rounded-xl p-3 cursor-pointer transition-all ${headerType === 'IMAGE' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}>
                                                <RadioGroupItem value="IMAGE" id="h-image" />
                                                <Label htmlFor="h-image" className="cursor-pointer flex items-center gap-2"><ImageIcon className="h-4 w-4" /> صورة</Label>
                                            </div>
                                            <div className={`flex items-center gap-2 border rounded-xl p-3 cursor-pointer transition-all ${headerType === 'VIDEO' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}>
                                                <RadioGroupItem value="VIDEO" id="h-video" />
                                                <Label htmlFor="h-video" className="cursor-pointer flex items-center gap-2"><Video className="h-4 w-4" /> فيديو</Label>
                                            </div>
                                        </RadioGroup>

                                        {headerType === "TEXT" && (
                                            <Input 
                                                placeholder="عنوان الرسالة..." 
                                                value={headerText} 
                                                onChange={e => setHeaderText(e.target.value)} 
                                                maxLength={60}
                                            />
                                        )}

                                        {(headerType === "IMAGE" || headerType === "VIDEO") && (
                                            <div className="flex gap-4 items-center border rounded-xl p-4 bg-muted/20">
                                                <div className="h-20 w-20 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                                                    {headerPreviewUrl ? (
                                                        <img src={headerPreviewUrl} className="h-full w-full object-cover" alt="Preview" />
                                                    ) : (
                                                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-sm mb-1">عينة الوسائط</h4>
                                                    <p className="text-xs text-muted-foreground mb-3">مطلوب من Meta لمراجعة القالب. لن يتم إرسالها للمستخدمين.</p>
                                                    <Button size="sm" variant="outline" onClick={() => triggerUpload("HEADER")} disabled={uploadingMedia}>
                                                        {uploadingMedia ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                                                        رفع ملف
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Body Section */}
                                    <div className="space-y-4">
                                        <Label className="flex items-center gap-2">
                                            <FileText className="h-4 w-4" />
                                            نص الرسالة (Body) <span className="text-red-500">*</span>
                                        </Label>
                                        <Textarea 
                                            placeholder="اكتب محتوى رسالتك هنا... يمكنك استخدام المتغيرات مثل {{1}}"
                                            value={bodyText}
                                            onChange={e => setBodyText(e.target.value)}
                                            className="min-h-[120px] text-base"
                                        />
                                        <p className="text-xs text-muted-foreground">استخدم {"{{1}}"}, {"{{2}}"} لإضافة متغيرات ديناميكية.</p>
                                    </div>

                                    {/* Footer Section */}
                                    <div className="space-y-4">
                                        <Label className="flex items-center gap-2">
                                            <LayoutTemplate className="h-4 w-4 rotate-180" />
                                            تذييل (Footer) <span className="text-muted-foreground font-normal text-xs">(اختياري)</span>
                                        </Label>
                                        <Input 
                                            placeholder="نص صغير أسفل الرسالة..." 
                                            value={footerText}
                                            onChange={e => setFooterText(e.target.value)}
                                            maxLength={60}
                                        />
                                    </div>

                                    {/* Buttons Section */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label className="flex items-center gap-2">
                                                <MousePointerClick className="h-4 w-4" />
                                                الأزرار (Buttons) <span className="text-muted-foreground font-normal text-xs">(اختياري، حد أقصى 3)</span>
                                            </Label>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" size="sm" className="gap-2" disabled={buttons.length >= 3}>
                                                        <Plus className="h-4 w-4" /> إضافة زر
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onClick={() => handleAddButton("QUICK_REPLY")}>رد سريع</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleAddButton("URL")}>رابط</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleAddButton("PHONE_NUMBER")}>اتصال</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleAddButton("COPY_CODE")}>نسخ كود</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleAddButton("CATALOG")}>كاتالوج (منتجات)</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        <div className="space-y-3">
                                            {buttons.map((btn, idx) => (
                                                <div key={idx} className="flex flex-col gap-3 bg-muted/30 p-3 rounded-xl border animate-in slide-in-from-top-2">
                                                    <div className="flex gap-3">
                                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background border text-xs font-bold shrink-0">
                                                            {idx + 1}
                                                        </div>
                                                        <Select 
                                                            value={btn.type} 
                                                            onValueChange={(v: any) => handleButtonChange(idx, "type", v)}
                                                            disabled
                                                        >
                                                            <SelectTrigger className="w-[140px]">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="QUICK_REPLY">رد سريع</SelectItem>
                                                                <SelectItem value="URL">رابط</SelectItem>
                                                                <SelectItem value="PHONE_NUMBER">اتصال</SelectItem>
                                                                <SelectItem value="COPY_CODE">نسخ كود</SelectItem>
                                                                <SelectItem value="CATALOG">كاتالوج</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <Input 
                                                            placeholder="نص الزر" 
                                                            value={btn.text} 
                                                            onChange={e => handleButtonChange(idx, "text", e.target.value)}
                                                            maxLength={25}
                                                        />
                                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveButton(idx)} className="text-muted-foreground hover:text-destructive">
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                    {btn.type === "URL" && (
                                                        <Input 
                                                            placeholder="https://example.com" 
                                                            value={btn.url} 
                                                            onChange={e => handleButtonChange(idx, "url", e.target.value)}
                                                            className="ml-11"
                                                        />
                                                    )}
                                                    {btn.type === "PHONE_NUMBER" && (
                                                        <Input 
                                                            placeholder="+966..." 
                                                            value={btn.phone_number} 
                                                            onChange={e => handleButtonChange(idx, "phone_number", e.target.value)}
                                                            className="ml-11"
                                                        />
                                                    )}
                                                    {btn.type === "COPY_CODE" && (
                                                        <Input 
                                                            placeholder="مثال للكود: SAVE20" 
                                                            value={btn.example} 
                                                            onChange={e => handleButtonChange(idx, "example", e.target.value)}
                                                            className="ml-11"
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                            {buttons.length === 0 && (
                                                <div className="text-center py-4 border-2 border-dashed rounded-xl text-muted-foreground text-sm">
                                                    لا توجد أزرار مضافة
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                // --- CAROUSEL EDITOR ---
                                <div className="space-y-8">
                                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl text-sm text-blue-800 dark:text-blue-300">
                                        تتيح لك قوالب الكاروسيل إرسال حتى 10 بطاقات قابلة للتمرير. يجب أن تحتوي جميع البطاقات على نفس هيكل الأزرار ونوع الوسائط.
                                    </div>

                                    <div className="space-y-4">
                                        <Label>نوع الوسائط في البطاقات</Label>
                                        <RadioGroup 
                                            value={carouselHeaderType} 
                                            onValueChange={(v: "IMAGE" | "VIDEO") => handleCarouselTypeChange(v)}
                                            className="flex gap-4"
                                        >
                                            <div className={`flex items-center gap-2 border rounded-xl p-3 cursor-pointer transition-all ${carouselHeaderType === 'IMAGE' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}>
                                                <RadioGroupItem value="IMAGE" id="c-image" />
                                                <Label htmlFor="c-image" className="cursor-pointer flex items-center gap-2"><ImageIcon className="h-4 w-4" /> صورة</Label>
                                            </div>
                                            <div className={`flex items-center gap-2 border rounded-xl p-3 cursor-pointer transition-all ${carouselHeaderType === 'VIDEO' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}>
                                                <RadioGroupItem value="VIDEO" id="c-video" />
                                                <Label htmlFor="c-video" className="cursor-pointer flex items-center gap-2"><Video className="h-4 w-4" /> فيديو</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    {/* Main Body */}
                                    <div className="space-y-4">
                                        <Label>نص الرسالة الرئيسي (يظهر فوق الكاروسيل)</Label>
                                        <Textarea 
                                            placeholder="اكتب مقدمة للكاروسيل..."
                                            value={bodyText}
                                            onChange={e => setBodyText(e.target.value)}
                                            className="min-h-[80px]"
                                        />
                                    </div>

                                    {/* Cards Editor */}
                                    <div className="space-y-4">
                                        <Label className="flex items-center justify-between">
                                            <span>البطاقات ({carouselCards.length}/10)</span>
                                            <Button size="sm" variant="outline" onClick={addCard} disabled={carouselCards.length >= 10}>
                                                <Plus className="h-4 w-4 mr-2" /> إضافة بطاقة
                                            </Button>
                                        </Label>
                                        
                                        <Tabs defaultValue="card-0" className="w-full">
                                            <TabsList className="w-full justify-start overflow-x-auto h-auto p-2 bg-muted/50 rounded-xl gap-2">
                                                {carouselCards.map((_, i) => (
                                                    <TabsTrigger key={i} value={`card-${i}`} className="rounded-lg px-4 py-2">
                                                        بطاقة {i + 1}
                                                    </TabsTrigger>
                                                ))}
                                            </TabsList>
                                            
                                            {carouselCards.map((card, i) => (
                                                <TabsContent key={i} value={`card-${i}`} className="space-y-6 border rounded-xl p-4 mt-4 animate-in fade-in-50">
                                                    <div className="flex justify-between items-center">
                                                        <h4 className="font-bold text-lg">محتوى البطاقة {i + 1}</h4>
                                                        {carouselCards.length > 1 && (
                                                            <Button size="sm" variant="destructive" onClick={() => removeCard(i)}>
                                                                <X className="h-4 w-4 mr-2" /> حذف البطاقة
                                                            </Button>
                                                        )}
                                                    </div>

                                                    {/* Card Header Media */}
                                                    <div className="space-y-2">
                                                        <Label>صورة/فيديو البطاقة</Label>
                                                        <div className="flex gap-4 items-center border rounded-xl p-4 bg-muted/20">
                                                            <div className="h-24 w-24 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                                                                {card.headerUrl ? (
                                                                    <img src={card.headerUrl} className="h-full w-full object-cover" alt="Preview" />
                                                                ) : (
                                                                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex gap-2 flex-wrap">
                                                                    <Button size="sm" variant="outline" onClick={() => triggerUpload(i)} disabled={uploadingMedia}>
                                                                        {uploadingMedia ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                                                                        رفع
                                                                    </Button>
                                                                    <ProductPicker 
                                                                        onSelect={(p) => handleSallaProductSelect(p, i)}
                                                                        trigger={
                                                                            <Button size="sm" variant="outline" disabled={uploadingMedia} className="text-purple-600 border-purple-200 hover:bg-purple-50">
                                                                                <ShoppingBag className="h-4 w-4 mr-2" />
                                                                                سلة
                                                                            </Button>
                                                                        }
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Card Body */}
                                                    <div className="space-y-2">
                                                        <Label>نص البطاقة</Label>
                                                        <Input 
                                                            value={card.bodyText} 
                                                            onChange={e => updateCard(i, "bodyText", e.target.value)}
                                                            placeholder="وصف المنتج أو العرض..."
                                                        />
                                                    </div>

                                                    {/* Card Buttons (Global for now in UI logic simplified) */}
                                                    <div className="space-y-2">
                                                        <Label>أزرار البطاقة (تنطبق على جميع البطاقات)</Label>
                                                        {card.buttons.map((btn, btnIdx) => (
                                                            <div key={btnIdx} className="flex gap-2 mb-2">
                                                                <Input value={btn.text} onChange={e => handleButtonChange(btnIdx, "text", e.target.value, true)} />
                                                                {btn.type === "URL" && <Input value={btn.url} onChange={e => handleButtonChange(btnIdx, "url", e.target.value, true)} placeholder="URL" />}
                                                                <Button size="icon" variant="ghost" onClick={() => handleRemoveButton(btnIdx, true)}><X className="h-4 w-4" /></Button>
                                                            </div>
                                                        ))}
                                                        {card.buttons.length < 2 && (
                                                             <div className="flex gap-2">
                                                                 <Button size="sm" variant="outline" onClick={() => handleAddButton("QUICK_REPLY", true)}>+ رد سريع</Button>
                                                                 <Button size="sm" variant="outline" onClick={() => handleAddButton("URL", true)}>+ رابط</Button>
                                                             </div>
                                                        )}
                                                    </div>
                                                </TabsContent>
                                            ))}
                                        </Tabs>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-4">
                        <Button variant="outline" onClick={() => router.push("/templates")}>إلغاء</Button>
                        <Button 
                            onClick={handleSubmit} 
                            className="bg-[#004D3D] hover:bg-[#003D2D] min-w-[150px]"
                            disabled={isSubmitting || !name || !bodyText}
                        >
                            {isSubmitting ? "جاري الإرسال..." : "إرسال للمراجعة"}
                        </Button>
                    </div>
                </div>

                {/* Preview Column */}
                <div className="lg:col-span-4">
                    <div className="sticky top-8">
                        <div className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-900 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-2xl flex flex-col">
                            {/* ... (Same frame elements) ... */}
                            <div className="w-[148px] h-[18px] bg-gray-800 top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute z-20"></div>
                            
                            {/* WhatsApp Header */}
                            <div className="bg-[#008069] dark:bg-[#202c33] p-3 pt-8 flex items-center gap-2 text-white z-10 rounded-t-[2rem]">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                    <Smartphone className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-semibold">معاينة مباشرة</div>
                                </div>
                            </div>
                            
                            {/* Message Area */}
                            <div className="flex-1 p-3 overflow-y-auto bg-[#E5DDD5] dark:bg-[#111b21] bg-opacity-90 relative rounded-b-[2rem] flex flex-col">
                                {templateType === "STANDARD" ? (
                                    <div className="bg-white dark:bg-[#202c33] p-2 rounded-lg rounded-tl-none shadow-sm max-w-[90%] mb-2">
                                        {/* Standard Preview */}
                                        {headerType !== "NONE" && (
                                            <div className="mb-2">
                                                {headerType === "TEXT" && <p className="font-bold text-sm">{headerText || "عنوان الرسالة"}</p>}
                                                {(headerType === "IMAGE" || headerType === "VIDEO") && (
                                                    <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-32 flex items-center justify-center overflow-hidden">
                                                        {headerPreviewUrl ? (
                                                            <img src={headerPreviewUrl} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <p className="text-sm whitespace-pre-wrap">{bodyText || "نص الرسالة..."}</p>
                                        {footerText && <p className="text-[10px] text-gray-500 mt-2">{footerText}</p>}
                                        
                                        {/* Standard Buttons */}
                                        <div className="border-t mt-2 pt-2 space-y-1">
                                            {buttons.map((btn, i) => (
                                                <div key={i} className="text-center text-sm text-[#00a884] font-medium py-1">{btn.text || "زر"}</div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="bg-white dark:bg-[#202c33] p-2 rounded-lg rounded-tl-none shadow-sm max-w-[90%]">
                                            <p className="text-sm whitespace-pre-wrap">{bodyText || "مقدمة الكاروسيل..."}</p>
                                        </div>
                                        {/* Carousel Cards Preview (Horizontal Scroll) */}
                                        <div className="flex overflow-x-auto gap-2 pb-2 -mx-3 px-3">
                                            {carouselCards.map((card, i) => (
                                                <div key={i} className="bg-white dark:bg-[#202c33] rounded-lg shadow-sm min-w-[200px] max-w-[200px] overflow-hidden shrink-0">
                                                    <div className="h-24 bg-gray-200 flex items-center justify-center overflow-hidden">
                                                         {card.headerUrl ? <img src={card.headerUrl} className="w-full h-full object-cover" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
                                                    </div>
                                                    <div className="p-2">
                                                        <p className="text-sm font-medium">{card.bodyText || "وصف البطاقة..."}</p>
                                                        <div className="mt-2 space-y-1">
                                                            {card.buttons.map((btn, bI) => (
                                                                <div key={bI} className="bg-gray-50 p-1 text-center text-xs text-[#00a884] rounded border">{btn.text || "زر"}</div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}