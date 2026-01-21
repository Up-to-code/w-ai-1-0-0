"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Link2,
    Check,
    ExternalLink,
    RefreshCw,
    Package,
    AlertCircle,
    ShoppingBag,
    ArrowLeft,
    CheckCircle2,
    XCircle
} from "lucide-react"

export default function IntegrationsPage() {
    const searchParams = useSearchParams()
    const success = searchParams.get("success")
    const error = searchParams.get("error")

    const connection = useQuery(api.salla.getConnection)
    const disconnect = useMutation(api.salla.disconnect)

    const [isConnecting, setIsConnecting] = useState(false)
    const [showNotification, setShowNotification] = useState(!!success || !!error)

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
        </div>
    )
}
