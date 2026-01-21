"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useAction } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
    ArrowRight,
    Image,
    Video,
    FileText,
    Upload,
    X,
    Send,
    Smartphone,
    Link2,
    Phone,
    MessageSquare,
    Layers,
    Package,
    RefreshCw,
    AlertCircle
} from "lucide-react"

export default function NewTemplatePage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const sallaProductId = searchParams.get("salla_product_id")

    // Convex Actions
    const fetchSallaProducts = useAction(api.salla.fetchProducts)
    const getSallaProduct = useAction(api.salla.getProduct)

    // State
    const [templateType, setTemplateType] = useState<"standard" | "carousel">("standard")
    const [name, setName] = useState("")
    const [language, setLanguage] = useState("ar")
    const [category, setCategory] = useState("")
    const [mediaType, setMediaType] = useState<string | null>(null)
    const [content, setContent] = useState("")
    const [headerText, setHeaderText] = useState("")
    const [footerText, setFooterText] = useState("")
    const [buttons, setButtons] = useState<{ type: string; text: string; value?: string }[]>([])

    // Product Integration State
    const [availableProducts, setAvailableProducts] = useState<any[]>([])
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
    const [isLoadingProducts, setIsLoadingProducts] = useState(false)
    const [isFetchingSingle, setIsFetchingSingle] = useState(false)

    const editTemplateName = searchParams.get("edit")
    const getTemplate = useAction(api.whatsapp.getTemplate)
    const [isFetchingTemplate, setIsFetchingTemplate] = useState(false)

    // Initial Load - Fetch Products
    useEffect(() => {
        const loadProducts = async () => {
            setIsLoadingProducts(true)
            try {
                // Fetch list for carousel selection
                const result = await fetchSallaProducts({ page: 1, perPage: 20 })
                if (result.connected) {
                    setAvailableProducts(result.products)
                }
            } catch (error) {
                console.error("Failed to fetch products:", error)
            } finally {
                setIsLoadingProducts(false)
            }
        }
        loadProducts()
    }, [fetchSallaProducts])

    // Initial Load - Handle Edit Mode or Salla Product
    useEffect(() => {
        const initializeForm = async () => {
            // Case 1: Edit Mode
            if (editTemplateName) {
                setIsFetchingTemplate(true)
                try {
                    const template = await getTemplate({ name: editTemplateName })
                    if (template) {
                        setName(template.name)
                        setCategory(template.category)
                        setLanguage(template.language)

                        const components = template.components || []

                        // Header
                        const header = components.find((c: any) => c.type === "HEADER")
                        if (header) {
                            if (header.format === "TEXT") {
                                setHeaderText(header.text)
                            } else {
                                setMediaType(header.format.toLowerCase())
                            }
                        }

                        // Body
                        const body = components.find((c: any) => c.type === "BODY")
                        if (body) setContent(body.text)

                        // Footer
                        const footer = components.find((c: any) => c.type === "FOOTER")
                        if (footer) setFooterText(footer.text)

                        // Buttons
                        const buttonsComp = components.find((c: any) => c.type === "BUTTONS")
                        if (buttonsComp?.buttons) {
                            setButtons(buttonsComp.buttons.map((b: any) => ({
                                type: b.type === "QUICK_REPLY" ? "quick_reply" : b.type === "URL" ? "url" : "phone",
                                text: b.text,
                                value: b.url || b.phone_number || ""
                            })))
                        }
                    }
                } catch (error) {
                    console.error("Failed to fetch template:", error)
                } finally {
                    setIsFetchingTemplate(false)
                }
            }
            // Case 2: Salla Product Pre-fill
            else if (sallaProductId) {
                setIsFetchingSingle(true)
                try {
                    const product = await getSallaProduct({ id: sallaProductId })
                    if (product) {
                        setName(`offer_${product.sku}`.toLowerCase().replace(/[^a-z0-9_]/g, '_'))
                        setCategory("MARKETING")
                        setHeaderText("🔥 عرض خاص")

                        let message = `مرحباً! 👋\n\n`
                        message += `تحقق من منتجنا الجديد: *${product.name}*\n\n`
                        message += `السعر: ${product.price} ${product.currency}\n`
                        if (product.originalPrice > product.price) {
                            message += `(بدلاً من ${product.originalPrice} ${product.currency})\n`
                        }
                        message += `\n${product.description?.replace(/<[^>]*>/g, '').substring(0, 100)}...\n\n`
                        message += `اطلب الآن قبل نفاد الكمية! 📦`

                        setContent(message)

                        if (product.url) {
                            setButtons([{ type: "url", text: "عرض المنتج", value: product.url }])
                        }
                        setSelectedProductIds([product.id])
                    }
                } catch (error) {
                    console.error("Failed to fetch pre-selected product:", error)
                } finally {
                    setIsFetchingSingle(false)
                }
            }
        }

        initializeForm()
    }, [editTemplateName, sallaProductId, getTemplate, getSallaProduct])

    const addButton = (type: string) => {
        if (buttons.length < 3) {
            setButtons([...buttons, { type, text: "", value: "" }])
        }
    }

    const removeButton = (index: number) => {
        setButtons(buttons.filter((_, i) => i !== index))
    }

    const updateButton = (index: number, field: string, value: string) => {
        setButtons(buttons.map((b, i) => i === index ? { ...b, [field]: value } : b))
    }

    const toggleProduct = (id: string) => {
        setSelectedProductIds(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        )
    }

    const createTemplate = useAction(api.whatsapp.createTemplate)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async () => {
        if (!name || !category || !content) return

        setIsSubmitting(true)
        try {
            const components: any[] = []

            // 1. Header
            if (headerText || mediaType) {
                const headerComponent: any = { type: "HEADER" }
                if (mediaType) {
                    headerComponent.format = mediaType.toUpperCase()
                } else {
                    headerComponent.format = "TEXT"
                    headerComponent.text = headerText
                }
                components.push(headerComponent)
            }

            // 2. Body
            components.push({
                type: "BODY",
                text: content
            })

            // 3. Footer
            if (footerText) {
                components.push({
                    type: "FOOTER",
                    text: footerText
                })
            }

            // 4. Buttons
            if (buttons.length > 0) {
                const buttonsComponent = {
                    type: "BUTTONS",
                    buttons: buttons.map(btn => {
                        if (btn.type === "quick_reply") {
                            return { type: "QUICK_REPLY", text: btn.text }
                        } else if (btn.type === "url") {
                            return { type: "URL", text: btn.text, url: btn.value }
                        } else if (btn.type === "phone") {
                            return { type: "PHONE_NUMBER", text: btn.text, phone_number: btn.value } // Note: API expects phone_number key
                        }
                        return null
                    }).filter(Boolean)
                }
                components.push(buttonsComponent)
            }

            await createTemplate({
                name,
                category,
                language,
                components
            })

            router.push("/templates?success=true")
        } catch (error) {
            console.error("Failed to create template:", error)
            alert("Failed to create template. Check console for details.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/templates">
                        <Button variant="ghost" size="icon">
                            <ArrowRight className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">إنشاء قالب جديد</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            {sallaProductId ? "جاري إنشاء قالب للمنتج المحدد" : "سيتم إرسال القالب لمراجعة Meta"}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.push("/templates")}>إلغاء</Button>
                    <Button
                        onClick={handleSubmit}
                        className="gap-2 bg-[#004D3D] hover:bg-[#003D2D]"
                        disabled={isSubmitting || !name || !category || (!content && templateType === "standard") || (templateType === "carousel" && selectedProductIds.length === 0)}
                    >
                        <Send className="h-4 w-4" />
                        {isSubmitting ? "جاري الإرسال..." : "إرسال للمراجعة"}
                    </Button>
                </div>
            </div>

            {/* Template Type Selection */}
            <Card>
                <CardHeader>
                    <CardTitle>نوع القالب</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div
                            className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${templateType === 'standard' ? 'border-[#004D3D] bg-[#004D3D]/5' : 'border-border hover:border-[#004D3D]/30'}`}
                            onClick={() => setTemplateType('standard')}
                        >
                            <FileText className="h-8 w-8 mb-3 text-[#004D3D]" />
                            <p className="font-semibold text-lg">قالب عادي</p>
                            <p className="text-sm text-muted-foreground mt-1">رسالة نصية مع صورة أو فيديو اختياري</p>
                        </div>
                        <div
                            className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${templateType === 'carousel' ? 'border-[#004D3D] bg-[#004D3D]/5' : 'border-border hover:border-[#004D3D]/30'}`}
                            onClick={() => setTemplateType('carousel')}
                        >
                            <Layers className="h-8 w-8 mb-3 text-success" />
                            <p className="font-semibold text-lg">كاروسيل منتجات</p>
                            <p className="text-sm text-muted-foreground mt-1">عرض منتجات متعددة مع أسعار وعروض</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>المعلومات الأساسية</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>اسم القالب *</Label>
                                    <Input
                                        placeholder="promotional_offer"
                                        className="font-mono"
                                        value={name}
                                        onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>اللغة *</Label>
                                    <Select value={language} onValueChange={setLanguage}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ar">العربية</SelectItem>
                                            <SelectItem value="en">English</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Category */}
                    <Card>
                        <CardHeader>
                            <CardTitle>الفئة *</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { value: "MARKETING", label: "تسويق", desc: "عروض وخصومات", icon: "📢" },
                                    { value: "UTILITY", label: "خدمي", desc: "تأكيد وتحديثات", icon: "🔔" },
                                    { value: "AUTHENTICATION", label: "تحقق", desc: "رموز OTP", icon: "🔐" },
                                ].map(cat => (
                                    <div
                                        key={cat.value}
                                        className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${category === cat.value ? 'border-[#004D3D] bg-[#004D3D]/5' : 'border-border hover:border-[#004D3D]/30'}`}
                                        onClick={() => setCategory(cat.value)}
                                    >
                                        <div className="text-2xl mb-2">{cat.icon}</div>
                                        <p className="font-semibold">{cat.label}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{cat.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Standard Template Content */}
                    {templateType === "standard" && (
                        <>
                            {/* Media */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>الوسائط (اختياري)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-4 gap-3 mb-4">
                                        {[
                                            { value: null, label: "بدون", icon: FileText },
                                            { value: "image", label: "صورة", icon: Image },
                                            { value: "video", label: "فيديو", icon: Video },
                                            { value: "document", label: "مستند", icon: FileText },
                                        ].map(media => {
                                            const Icon = media.icon
                                            return (
                                                <div
                                                    key={media.value || "none"}
                                                    className={`border-2 rounded-xl p-4 cursor-pointer transition-all text-center ${mediaType === media.value ? 'border-[#004D3D] bg-[#004D3D]/5' : 'border-border hover:border-[#004D3D]/30'}`}
                                                    onClick={() => setMediaType(media.value)}
                                                >
                                                    <Icon className="h-6 w-6 mx-auto mb-2" />
                                                    <p className="text-sm font-medium">{media.label}</p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    {mediaType && (
                                        <div className="border-2 border-dashed rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer bg-muted/30">
                                            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                                            <p className="font-medium">اسحب الملف هنا أو انقر للاختيار</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Content */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>محتوى الرسالة *</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {isFetchingSingle && (
                                        <div className="text-sm text-[#004D3D] flex items-center gap-2 mb-2 animate-pulse">
                                            <RefreshCw className="h-3 w-3 animate-spin" />
                                            جاري جلب بيانات المنتج...
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Label>العنوان (اختياري)</Label>
                                        <Input value={headerText} onChange={(e) => setHeaderText(e.target.value)} placeholder="عرض خاص!" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>نص الرسالة *</Label>
                                        <Textarea
                                            placeholder="مرحباً {{1}}، شكراً لتسجيلك..."
                                            className="h-32 resize-none"
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>التذييل (اختياري)</Label>
                                        <Input value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="شكراً لثقتكم" />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Buttons */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>الأزرار (اختياري)</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex gap-2 flex-wrap">
                                        <Button variant="outline" size="sm" onClick={() => addButton("quick_reply")} disabled={buttons.length >= 3}>
                                            <MessageSquare className="h-4 w-4 mr-2" /> رد سريع
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => addButton("url")} disabled={buttons.length >= 3}>
                                            <Link2 className="h-4 w-4 mr-2" /> رابط
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => addButton("phone")} disabled={buttons.length >= 3}>
                                            <Phone className="h-4 w-4 mr-2" /> اتصال
                                        </Button>
                                    </div>
                                    {buttons.map((btn, i) => (
                                        <div key={i} className="flex gap-3 items-start p-3 border rounded-xl bg-muted/30">
                                            <div className="flex-1 space-y-2">
                                                <Badge variant="secondary" className="text-xs">
                                                    {btn.type === "quick_reply" && "رد سريع"}
                                                    {btn.type === "url" && "رابط"}
                                                    {btn.type === "phone" && "اتصال"}
                                                </Badge>
                                                <Input placeholder="نص الزر" value={btn.text} onChange={(e) => updateButton(i, "text", e.target.value)} />
                                                {btn.type !== "quick_reply" && (
                                                    <Input placeholder={btn.type === "url" ? "https://..." : "+966..."} value={btn.value} onChange={(e) => updateButton(i, "value", e.target.value)} />
                                                )}
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => removeButton(i)}><X className="h-4 w-4" /></Button>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </>
                    )}

                    {/* Carousel Template Content */}
                    {templateType === "carousel" && (
                        <>
                            {/* Intro Message */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>رسالة المقدمة</CardTitle>
                                    <CardDescription>النص الذي يظهر قبل كاروسيل المنتجات</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>العنوان</Label>
                                        <Input value={headerText} onChange={(e) => setHeaderText(e.target.value)} placeholder="🔥 عروض حصرية!" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>الوصف</Label>
                                        <Textarea
                                            placeholder="تصفح أفضل منتجاتنا بخصومات تصل إلى 50%..."
                                            className="h-20 resize-none"
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Product Selection */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>المنتجات</CardTitle>
                                            <CardDescription>اختر حتى 10 منتجات للكاروسيل من متجر سلة</CardDescription>
                                        </div>
                                        <Badge variant="secondary">{selectedProductIds.length}/10</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {isLoadingProducts ? (
                                        <div className="flex justify-center py-6">
                                            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : availableProducts.length === 0 ? (
                                        <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-xl">
                                            لم يتم العثور على منتجات. تأكد من ربط متجر سلة.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2">
                                            {availableProducts.map(product => (
                                                <div
                                                    key={product.id}
                                                    className={`flex items-center gap-4 p-3 border-2 rounded-xl cursor-pointer transition-all ${selectedProductIds.includes(product.id) ? 'border-[#004D3D] bg-[#004D3D]/5' : 'border-border hover:border-[#004D3D]/30'
                                                        }`}
                                                    onClick={() => toggleProduct(product.id)}
                                                >
                                                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                                                        {product.image ? (
                                                            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Package className="h-6 w-6 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium truncate text-sm">{product.name}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="font-bold text-[#004D3D] text-xs">{product.price} {product.currency}</span>
                                                            {product.originalPrice > product.price && (
                                                                <Badge className="bg-destructive/10 text-destructive text-[10px] h-5 px-1">
                                                                    -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {selectedProductIds.includes(product.id) && (
                                                        <div className="w-6 h-6 rounded-full bg-[#004D3D] flex items-center justify-center shrink-0">
                                                            <span className="text-xs text-white font-bold">
                                                                {selectedProductIds.indexOf(product.id) + 1}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* CTA Button */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>زر الإجراء</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="space-y-2">
                                        <Label>نص الزر</Label>
                                        <Input placeholder="تسوق الآن" defaultValue="عرض التفاصيل" />
                                    </div>
                                    <p className="text-xs text-muted-foreground">يظهر هذا الزر أسفل كل منتج في الكاروسيل</p>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>

                {/* Preview */}
                <div className="lg:col-span-1">
                    <div className="sticky top-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Smartphone className="h-5 w-5" />
                                    معاينة
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-[#E5DDD5] rounded-2xl p-4 min-h-[400px]">
                                    {templateType === "standard" ? (
                                        <>
                                            <div className="bg-white rounded-xl p-3 shadow-sm max-w-[85%] space-y-2">
                                                {mediaType === "image" && (
                                                    <div className="bg-gray-200 rounded-lg h-32 flex items-center justify-center">
                                                        <Image className="h-8 w-8 text-gray-400" />
                                                    </div>
                                                )}
                                                {headerText && <p className="font-bold text-sm">{headerText}</p>}
                                                <p className="text-sm text-gray-800 whitespace-pre-wrap">{content || "محتوى الرسالة..."}</p>
                                                {footerText && <p className="text-xs text-gray-500">{footerText}</p>}
                                                <p className="text-[10px] text-gray-400 text-left">12:30 ✓✓</p>
                                            </div>
                                            {buttons.length > 0 && (
                                                <div className="mt-2 space-y-1 max-w-[85%]">
                                                    {buttons.map((btn, i) => (
                                                        <div key={i} className="bg-white rounded-lg p-2 text-center text-sm text-[#00a884] font-medium shadow-sm cursor-pointer">
                                                            {btn.text || "نص الزر"}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {/* Intro Message */}
                                            <div className="bg-white rounded-xl p-3 shadow-sm space-y-2 mb-3">
                                                {headerText && <p className="font-bold text-sm">{headerText}</p>}
                                                <p className="text-sm text-gray-800 whitespace-pre-wrap">{content || "تصفح منتجاتنا..."}</p>
                                                <p className="text-[10px] text-gray-400 text-left">12:30 ✓✓</p>
                                            </div>

                                            {/* Product Cards Carousel */}
                                            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                                                {selectedProductIds.length > 0 ? (
                                                    selectedProductIds.map(id => {
                                                        const product = availableProducts.find(p => p.id === id) || (sallaProductId === id ? { name: "المنتج المحدد", price: 0 } : null)
                                                        if (!product) return null
                                                        return (
                                                            <div key={id} className="bg-white rounded-xl shadow-sm shrink-0 w-[140px] overflow-hidden flex flex-col">
                                                                <div className="h-24 bg-gray-200 flex items-center justify-center relative">
                                                                    {product.image ? (
                                                                        <img src={product.image} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <Package className="h-8 w-8 text-gray-400" />
                                                                    )}
                                                                </div>
                                                                <div className="p-2 flex-1 flex flex-col">
                                                                    <p className="text-xs font-medium truncate mb-1">{product.name}</p>
                                                                    <p className="text-xs font-bold text-gray-900 mt-auto">{product.price} {product.currency}</p>
                                                                    <div className="mt-2 text-[#00a884] text-center py-1 border-t text-[10px] font-medium">
                                                                        عرض التفاصيل
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    })
                                                ) : (
                                                    <div className="text-center py-8 text-muted-foreground text-sm w-full bg-white/50 rounded-xl">
                                                        اختر منتجات لعرض المعاينة
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="mt-4 p-3 bg-muted/50 rounded-xl">
                                    <p className="text-xs text-muted-foreground mb-2">حالة القالب:</p>
                                    <Badge variant="secondary" className="gap-1">
                                        <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                                        قيد المراجعة
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
