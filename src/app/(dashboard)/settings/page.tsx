"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  User,
  Building2,
  Save,
  Key,
  Webhook,
  CheckCircle2,
  AlertCircle,
  Copy,
  Eye,
  EyeOff
} from "lucide-react"

export default function SettingsPage() {
  const [showToken, setShowToken] = useState(false)
  const [connected, setConnected] = useState(true)

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">الإعدادات</h1>
        <p className="text-muted-foreground text-sm mt-1">إدارة إعدادات الحساب والاتصال بـ WhatsApp</p>
      </div>

      {/* Connection Status */}
      <Card className={connected ? "border-success/50 bg-success/5" : "border-destructive/50 bg-destructive/5"}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {connected ? (
                <CheckCircle2 className="h-6 w-6 text-success" />
              ) : (
                <AlertCircle className="h-6 w-6 text-destructive" />
              )}
              <div>
                <p className="font-medium">{connected ? "متصل بـ WhatsApp Business API" : "غير متصل"}</p>
                <p className="text-sm text-muted-foreground">
                  {connected ? "جميع الخدمات تعمل بشكل طبيعي" : "تحقق من إعدادات الاتصال"}
                </p>
              </div>
            </div>
            <Badge variant={connected ? "default" : "destructive"} className={connected ? "bg-success" : ""}>
              {connected ? "نشط" : "غير نشط"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp API Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>إعدادات WhatsApp API</CardTitle>
              <CardDescription>بيانات الاتصال بـ Meta Business</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>معرف الهاتف (Phone Number ID)</Label>
            <Input defaultValue="123456789012345" className="font-mono" />
          </div>
          <div className="space-y-2">
            <Label>رمز الوصول (Access Token)</Label>
            <div className="relative">
              <Input
                type={showToken ? "text" : "password"}
                defaultValue="EAAxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="font-mono pr-20"
              />
              <div className="absolute left-2 top-1/2 -translate-y-1/2 flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>معرف حساب الأعمال (Business Account ID)</Label>
            <Input defaultValue="987654321098765" className="font-mono" />
          </div>
          <Button className="gap-2">
            <Save className="h-4 w-4" />
            حفظ الإعدادات
          </Button>
        </CardContent>
      </Card>

      {/* Webhook Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
              <Webhook className="h-5 w-5 text-info" />
            </div>
            <div>
              <CardTitle>Webhook</CardTitle>
              <CardDescription>استقبال الرسائل والتحديثات</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>رابط Webhook</Label>
            <div className="flex gap-2">
              <Input
                value="https://api.chatcb.com/webhook/your-id"
                readOnly
                className="font-mono bg-muted"
              />
              <Button variant="outline" size="icon">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">استخدم هذا الرابط في إعدادات Meta Developer</p>
          </div>
          <div className="space-y-2">
            <Label>Verify Token</Label>
            <div className="flex gap-2">
              <Input
                value="chatcb_verify_token_abc123"
                readOnly
                className="font-mono bg-muted"
              />
              <Button variant="outline" size="icon">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <User className="h-5 w-5 text-warning" />
            </div>
            <div>
              <CardTitle>الملف الشخصي</CardTitle>
              <CardDescription>معلومات الحساب</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>الاسم</Label>
              <Input defaultValue="المستخدم" />
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input defaultValue="user@mail.com" type="email" />
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
            <div>
              <p className="font-medium">الإشعارات</p>
              <p className="text-sm text-muted-foreground">استلام تنبيهات البريد الإلكتروني</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Button variant="outline" className="gap-2">
            <Save className="h-4 w-4" />
            تحديث الملف الشخصي
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}