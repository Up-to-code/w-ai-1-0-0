"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import type { Id } from "../../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Link2,
    Check,
    Copy,
    ExternalLink,
    RefreshCw,
    Package,
    AlertCircle,
    ShoppingBag,
    ArrowLeft,
    CheckCircle2,
    XCircle,
    MessageSquare,
    PlusCircle,
    Trash2,
    Pencil,
    Webhook
} from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog"

export default function IntegrationsPage() {
    const searchParams = useSearchParams()
    const success = searchParams.get("success")
    const error = searchParams.get("error")

    const connection = useQuery(api.salla.getConnection)
    const disconnect = useMutation(api.salla.disconnect)
    const webhookSettings = useQuery(api.webhookSettings.get)
    const setWebhookSettings = useMutation(api.webhookSettings.set)
    const numbers = useQuery(api.whatsappNumbers.list) ?? []
    const addNumber = useMutation(api.whatsappNumbers.add)
    const updateNumber = useMutation(api.whatsappNumbers.update)
    const removeNumber = useMutation(api.whatsappNumbers.remove)

    const [isConnecting, setIsConnecting] = useState(false)
    const [showNotification, setShowNotification] = useState(!!success || !!error)
    const [showAddNumber, setShowAddNumber] = useState(false)
    const [addForm, setAddForm] = useState({
        businessAccountId: "",
        businessNumberId: "",
        phone: "",
        name: "",
        accessToken: "",
    })
    const [addError, setAddError] = useState<string | null>(null)
    const [adding, setAdding] = useState(false)

    const [editingId, setEditingId] = useState<Id<"whatsapp_numbers"> | null>(null)
    const [editForm, setEditForm] = useState({ name: "", phone: "", accessToken: "" })
    const [editError, setEditError] = useState<string | null>(null)
    const [updating, setUpdating] = useState(false)

    const [webhookVerifyToken, setWebhookVerifyToken] = useState("")
    const [webhookAccessToken, setWebhookAccessToken] = useState("")
    const [webhookAppId, setWebhookAppId] = useState("")
    const [webhookSaving, setWebhookSaving] = useState(false)
    const [webhookSaved, setWebhookSaved] = useState(false)
    useEffect(() => {
        if (webhookSettings !== undefined) {
            setWebhookVerifyToken(webhookSettings.verifyToken ?? "")
            setWebhookAccessToken(webhookSettings.accessToken ?? "")
            setWebhookAppId(webhookSettings.appId ?? "")
        }
    }, [webhookSettings])

    useEffect(() => {
        if (showNotification) {
            const timer = setTimeout(() => setShowNotification(false), 5000)
            return () => clearTimeout(timer)
        }
    }, [showNotification])

    const handleConnect = () => {
        setIsConnecting(true)

        // Build Salla OAuth URL
        const clientId = process.env.NEXT_PUBLIC_SALLA_CLIENT_ID
        const redirectUri = process.env.NEXT_PUBLIC_SALLA_REDIRECT_URI

        if (!clientId || !redirectUri) {
            console.error("Missing Salla OAuth configuration")
            setIsConnecting(false)
            return
        }

        const authUrl = new URL("https://accounts.salla.sa/oauth2/auth")
        authUrl.searchParams.set("client_id", clientId)
        authUrl.searchParams.set("redirect_uri", redirectUri)
        authUrl.searchParams.set("response_type", "code")
        authUrl.searchParams.set("scope", "offline_access")

        // Generate robust state for CSRF protection
        const state = crypto.randomUUID();

        console.log("Generating Salla OAuth URL with state:", state);
        console.log("Client ID:", clientId);
        console.log("Redirect URI:", redirectUri);

        authUrl.searchParams.set("state", state);

        const finalUrl = authUrl.toString();
        console.log("Redirecting to:", finalUrl);

        window.location.href = finalUrl;
    }

    const handleDisconnect = async () => {
        await disconnect()
    }

    const handleAddNumber = async (e: React.FormEvent) => {
        e.preventDefault()
        setAddError(null)
        setAdding(true)
        try {
            await addNumber({
                businessAccountId: addForm.businessAccountId.trim(),
                businessNumberId: addForm.businessNumberId.trim(),
                phone: addForm.phone.trim(),
                name: addForm.name.trim(),
                accessToken: addForm.accessToken.trim() || undefined,
            })
            setAddForm({ businessAccountId: "", businessNumberId: "", phone: "", name: "", accessToken: "" })
            setShowAddNumber(false)
        } catch (err) {
            setAddError(err instanceof Error ? err.message : "فشل الإضافة")
        } finally {
            setAdding(false)
        }
    }

    const handleRemoveNumber = async (id: Id<"whatsapp_numbers">) => {
        if (confirm("هل تريد حذف هذا الرقم؟")) await removeNumber({ id })
    }

    const openEdit = (n: { _id: Id<"whatsapp_numbers">; name: string; phone: string }) => {
        setEditingId(n._id)
        setEditForm({ name: n.name, phone: n.phone, accessToken: "" })
        setEditError(null)
    }

    const handleUpdateNumber = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingId) return
        setEditError(null)
        setUpdating(true)
        try {
            await updateNumber({
                id: editingId,
                name: editForm.name.trim(),
                phone: editForm.phone.trim(),
                ...(editForm.accessToken.trim() ? { accessToken: editForm.accessToken.trim() } : {}),
            })
            setEditingId(null)
            setEditForm({ name: "", phone: "", accessToken: "" })
        } catch (err) {
            setEditError(err instanceof Error ? err.message : "فشل التحديث")
        } finally {
            setUpdating(false)
        }
    }

    const defaultWebhookUrl = typeof process.env.NEXT_PUBLIC_CONVEX_URL === "string"
        ? process.env.NEXT_PUBLIC_CONVEX_URL.replace(".convex.cloud", ".convex.site") + "/whatsapp/webhook"
        : ""

    const handleSaveWebhookSettings = async (e: React.FormEvent) => {
        e.preventDefault()
        setWebhookSaving(true)
        setWebhookSaved(false)
        try {
            await setWebhookSettings({
                verifyToken: webhookVerifyToken.trim() || undefined,
                accessToken: webhookAccessToken.trim() || undefined,
                appId: webhookAppId.trim() || undefined,
            })
            setWebhookSaved(true)
            setTimeout(() => setWebhookSaved(false), 3000)
        } finally {
            setWebhookSaving(false)
        }
    }

    const isConnected = !!connection

    return (
        <div className="space-y-6 p-4 sm:p-6">
            {/* Notification */}
            {showNotification && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${success ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                    }`}>
                    {success ? (
                        <>
                            <CheckCircle2 className="h-5 w-5" />
                            <span>تم ربط متجر سلة بنجاح!</span>
                        </>
                    ) : (
                        <>
                            <XCircle className="h-5 w-5" />
                            <span>فشل الربط: {error}</span>
                        </>
                    )}
                </div>
            )}

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">ربط المتجر</h1>
                <p className="text-muted-foreground text-sm mt-1">ربط متجر سلة لمزامنة المنتجات</p>
            </div>

            {/* Salla Integration Card */}
            <Card className="max-w-2xl">
                <div className="h-3 bg-[#004D3D]" />
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-[#004D3D] flex items-center justify-center">
                                <ShoppingBag className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl">سلة</CardTitle>
                                <CardDescription className="text-base">Salla E-commerce Platform</CardDescription>
                            </div>
                        </div>
                        {isConnected ? (
                            <Badge className="bg-success text-success-foreground gap-1 text-sm px-3 py-1">
                                <Check className="h-4 w-4" /> متصل
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="gap-1 text-sm px-3 py-1">
                                <AlertCircle className="h-4 w-4" /> غير متصل
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-muted-foreground">
                        اربط متجرك على سلة للوصول إلى منتجاتك واستخدامها في قوالب واتساب.
                    </p>

                    {/* Features */}
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="gap-1">
                            <Package className="h-3 w-3" /> مزامنة المنتجات
                        </Badge>
                        <Badge variant="secondary">مزامنة الأسعار</Badge>
                        <Badge variant="secondary">مزامنة المخزون</Badge>
                    </div>

                    {/* Connected State */}
                    {isConnected && connection && (
                        <div className="p-4 bg-muted/50 rounded-xl space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">اسم المتجر</p>
                                    <p className="font-medium">{connection.storeName || "غير محدد"}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">تاريخ الربط</p>
                                    <p className="text-sm font-medium">
                                        {new Date(connection.connectedAt).toLocaleDateString('ar-SA')}
                                    </p>
                                </div>
                            </div>
                            {connection.isExpired && (
                                <div className="p-2 bg-warning/10 text-warning rounded-lg text-sm flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" />
                                    انتهت صلاحية التوكن، يرجى إعادة الربط
                                </div>
                            )}
                            <Link href="/products">
                                <Button variant="outline" className="w-full gap-2">
                                    <Package className="h-4 w-4" />
                                    عرض المنتجات
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        {isConnected ? (
                            <Button
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={handleDisconnect}
                            >
                                إلغاء الربط
                            </Button>
                        ) : (
                            <Button
                                className="w-full gap-2 h-12 text-base bg-[#004D3D] hover:bg-[#003D2D]"
                                onClick={handleConnect}
                                disabled={isConnecting}
                            >
                                {isConnecting ? (
                                    <>
                                        <RefreshCw className="h-5 w-5 animate-spin" />
                                        جاري الربط...
                                    </>
                                ) : (
                                    <>
                                        <Link2 className="h-5 w-5" />
                                        ربط متجر سلة
                                    </>
                                )}
                            </Button>
                        )}
                    </div>

                    {/* Help Link */}
                    <div className="pt-4 border-t">
                        <a
                            href="https://docs.salla.dev"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ExternalLink className="h-4 w-4" />
                            وثائق Salla API
                        </a>
                    </div>
                </CardContent>
            </Card>

            {/* Webhook settings (verify token from DB, not env) */}
            <Card className="max-w-2xl">
                <div className="h-3 bg-muted-foreground/20" />
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                            <Webhook className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl">إعدادات الويب هوك</CardTitle>
                            <CardDescription className="text-base">الرابط الافتراضي ورمز التحقق ورمز الوصول ومعرف التطبيق تُحفظ في قاعدة البيانات</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {defaultWebhookUrl && (
                        <div className="grid gap-2">
                            <Label className="text-sm">رابط الويب هوك (الرابط المستخدم لتفعيل الويب هوك)</Label>
                            <div className="flex gap-2">
                                <p className="text-sm font-mono bg-muted/50 p-3 rounded-lg break-all flex-1" dir="ltr">{defaultWebhookUrl}</p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => { navigator.clipboard.writeText(defaultWebhookUrl); setWebhookSaved(true); setTimeout(() => setWebhookSaved(false), 2000); }}
                                    title="نسخ"
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                    <form onSubmit={handleSaveWebhookSettings} className="space-y-4">
                        <div className="grid gap-2">
                            <Label>رمز الوصول (Access Token) للتطبيق</Label>
                            <Input
                                type="password"
                                value={webhookAccessToken}
                                onChange={(e) => setWebhookAccessToken(e.target.value)}
                                placeholder="الرمز المُنشأ للتطبيق من لوحة Meta"
                            />
                            <p className="text-xs text-muted-foreground">رمز الوصول المُنشأ للتطبيق في لوحة Meta (للاستخدام عند عدم تعيين رمز على رقم محدد).</p>
                        </div>
                        <div className="grid gap-2">
                            <Label>رمز التحقق (Verify Token)</Label>
                            <Input
                                type="password"
                                value={webhookVerifyToken}
                                onChange={(e) => setWebhookVerifyToken(e.target.value)}
                                placeholder="أدخل نفس الرقم الذي تضعه في لوحة Meta"
                            />
                            <p className="text-xs text-muted-foreground">يُحفظ في قاعدة البيانات ويُستخدم عند طلب Meta للتحقق من الويب هوك. اتركه فارغاً لاستخدام متغير البيئة WHATSAPP_VERIFY_TOKEN.</p>
                        </div>
                        <div className="grid gap-2">
                            <Label>معرف تطبيق Meta (App ID) - لرفع وسائط القوالب</Label>
                            <Input
                                type="text"
                                value={webhookAppId}
                                onChange={(e) => setWebhookAppId(e.target.value)}
                                placeholder="معرف التطبيق من لوحة Meta"
                            />
                            <p className="text-xs text-muted-foreground">يُستخدم لرفع وسائط القوالب عند عدم تعيين WHATSAPP_APP_ID في البيئة.</p>
                        </div>
                        <Button type="submit" disabled={webhookSaving}>
                            {webhookSaving ? "جاري الحفظ..." : webhookSaved ? "تم الحفظ" : "حفظ إعدادات الويب هوك"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* WhatsApp Numbers (Workspaces) */}
            <Card className="max-w-2xl">
                <div className="h-3 bg-[#25D366]" />
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-[#25D366] flex items-center justify-center">
                                <MessageSquare className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl">أرقام واتساب للأعمال</CardTitle>
                                <CardDescription className="text-base">إضافة أرقام والتبديل بينها في الشريط الجانبي</CardDescription>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-muted-foreground text-sm">
                        استخدم نفس رابط الويب هوك لجميع الأرقام. في لوحة Meta، تأكد من إضافة الرابط لهذا التطبيق.
                    </p>

                    {numbers.length > 0 && (
                        <div className="space-y-2">
                            <Label className="text-sm">الأرقام المضافة</Label>
                            <ul className="space-y-2">
                                {numbers.map((n) => (
                                    <li
                                        key={n._id}
                                        className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border"
                                    >
                                        <div>
                                            <p className="font-medium">{n.name}</p>
                                            <p className="text-sm text-muted-foreground" dir="ltr">{n.phone}</p>
                                            <p className="text-xs text-muted-foreground">ID: {n.businessNumberId}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openEdit(n)}
                                                aria-label="تعديل"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => handleRemoveNumber(n._id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {!showAddNumber ? (
                        <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => setShowAddNumber(true)}
                        >
                            <PlusCircle className="h-4 w-4" />
                            إضافة رقم جديد
                        </Button>
                    ) : (
                        <form onSubmit={handleAddNumber} className="space-y-4 p-4 rounded-xl border bg-muted/30">
                            <div className="grid gap-2">
                                <Label>معرف حساب الأعمال (WABA)</Label>
                                <Input
                                    value={addForm.businessAccountId}
                                    onChange={(e) => setAddForm((f) => ({ ...f, businessAccountId: e.target.value }))}
                                    placeholder="معرف حساب واتساب للأعمال"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>معرف رقم الهاتف (Phone Number ID)</Label>
                                <Input
                                    value={addForm.businessNumberId}
                                    onChange={(e) => setAddForm((f) => ({ ...f, businessNumberId: e.target.value }))}
                                    placeholder="معرف الرقم من Meta"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>رقم الهاتف (للعرض)</Label>
                                <Input
                                    value={addForm.phone}
                                    onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                                    placeholder="+966501234567"
                                    dir="ltr"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>اسم الرقم (في التطبيق)</Label>
                                <Input
                                    value={addForm.name}
                                    onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                                    placeholder="مثال: خدمة العملاء"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>رمز الوصول (اختياري، وإلا يُستخدم من الإعدادات)</Label>
                                <Input
                                    type="password"
                                    value={addForm.accessToken}
                                    onChange={(e) => setAddForm((f) => ({ ...f, accessToken: e.target.value }))}
                                    placeholder="اتركه فارغاً لاستخدام المتغير من البيئة"
                                />
                            </div>
                            {addError && (
                                <p className="text-sm text-destructive">{addError}</p>
                            )}
                            <div className="flex gap-2">
                                <Button type="submit" disabled={adding}>
                                    {adding ? "جاري الإضافة..." : "إضافة"}
                                </Button>
                                <Button type="button" variant="outline" onClick={() => { setShowAddNumber(false); setAddError(null); }}>
                                    إلغاء
                                </Button>
                            </div>
                        </form>
                    )}

                    {/* Edit Number Dialog */}
                    <Dialog open={editingId !== null} onOpenChange={(open) => !open && setEditingId(null)}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>تعديل الرقم</DialogTitle>
                                <DialogDescription>
                                    تحديث الاسم أو رقم العرض أو رمز الوصول. اترك رمز الوصول فارغاً للإبقاء على القيمة الحالية.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleUpdateNumber} className="space-y-4">
                                <div className="grid gap-2">
                                    <Label>اسم الرقم (في التطبيق)</Label>
                                    <Input
                                        value={editForm.name}
                                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                        placeholder="مثال: خدمة العملاء"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>رقم الهاتف (للعرض)</Label>
                                    <Input
                                        value={editForm.phone}
                                        onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                                        placeholder="+966501234567"
                                        dir="ltr"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>رمز الوصول (اختياري)</Label>
                                    <Input
                                        type="password"
                                        value={editForm.accessToken}
                                        onChange={(e) => setEditForm((f) => ({ ...f, accessToken: e.target.value }))}
                                        placeholder="اتركه فارغاً للإبقاء على القيمة الحالية"
                                    />
                                </div>
                                {editError && (
                                    <p className="text-sm text-destructive">{editError}</p>
                                )}
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setEditingId(null)}>
                                        إلغاء
                                    </Button>
                                    <Button type="submit" disabled={updating}>
                                        {updating ? "جاري الحفظ..." : "حفظ"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </CardContent>
            </Card>
        </div>
    )
}
