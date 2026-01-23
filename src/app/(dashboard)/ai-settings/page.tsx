"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useAction } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Bot, Save, RefreshCw, Play, MessageSquare } from "lucide-react"

export default function AiSettingsPage() {
    const config = useQuery(api.ai_config.getConfig)
    const updateConfig = useMutation(api.ai_config.updateConfig)
    const testAgent = useAction(api.agent.testResponse)

    const [systemPrompt, setSystemPrompt] = useState("")
    const [model, setModel] = useState("arcee-ai/trinity-mini:free")
    const [isActive, setIsActive] = useState(true)
    const [hasChanged, setHasChanged] = useState(false)
    
    // Test State
    const [testMessage, setTestMessage] = useState("")
    const [testResponse, setTestResponse] = useState("")
    const [isTesting, setIsTesting] = useState(false)

    useEffect(() => {
        if (config) {
            setSystemPrompt(config.systemPrompt)
            setModel(config.model)
            setIsActive(config.isActive)
        }
    }, [config])

    const handleSave = async () => {
        try {
            await updateConfig({
                systemPrompt,
                model,
                isActive
            })
            setHasChanged(false)
            toast.success("تم حفظ إعدادات الذكاء الاصطناعي بنجاح")
        } catch (error) {
            toast.error("فشل في حفظ الإعدادات")
            console.error(error)
        }
    }

    const handleTest = async () => {
        if (!testMessage.trim()) return;
        setIsTesting(true);
        setTestResponse("");
        try {
            const response = await testAgent({
                message: testMessage,
                systemPrompt: systemPrompt,
                model: model
            });
            setTestResponse(response);
        } catch (error) {
            toast.error("فشل اختبار الوكيل");
            setTestResponse("حدث خطأ أثناء الاتصال بالخادم.");
        } finally {
            setIsTesting(false);
        }
    }

    if (!config) {
        return <div className="p-8 flex items-center justify-center"><RefreshCw className="animate-spin" /></div>
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-primary/10 p-3 rounded-xl">
                    <Bot className="w-8 h-8 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">إعدادات المساعد الذكي</h1>
                    <p className="text-muted-foreground">تكوين سلوك وخصائص وكيل المبيعات الآلي</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Config */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>تعليمات النظام (System Prompt)</CardTitle>
                            <CardDescription>
                                هذه التعليمات تحدد شخصية وأسلوب المساعد الذكي. كن دقيقاً في وصف الدور الذي يجب أن يلعبه.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea
                                value={systemPrompt}
                                onChange={(e) => {
                                    setSystemPrompt(e.target.value)
                                    setHasChanged(true)
                                }}
                                className="min-h-[300px] font-mono text-sm leading-relaxed"
                                placeholder="أنت مساعد مبيعات ذكي..."
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Play className="w-5 h-5 text-primary" />
                                محاكي المحادثة (Test Playground)
                            </CardTitle>
                            <CardDescription>
                                جرب التعليمات الحالية قبل تفعيلها على العملاء الحقيقيين.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <Input 
                                    placeholder="اكتب رسالة تجريبية (مثلاً: ما هي الأسعار؟)" 
                                    value={testMessage}
                                    onChange={(e) => setTestMessage(e.target.value)}
                                />
                                <Button onClick={handleTest} disabled={isTesting || !testMessage}>
                                    {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                                </Button>
                            </div>
                            
                            {testResponse && (
                                <div className="bg-muted p-4 rounded-lg text-sm border-l-4 border-primary">
                                    <p className="font-semibold mb-1 text-primary">رد الوكيل:</p>
                                    <p className="whitespace-pre-wrap leading-relaxed">{testResponse}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Config */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>الإعدادات العامة</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="active-mode">تفعيل النظام</Label>
                                <Switch
                                    id="active-mode"
                                    checked={isActive}
                                    onCheckedChange={(c) => {
                                        setIsActive(c)
                                        setHasChanged(true)
                                    }}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>نموذج الذكاء الاصطناعي</Label>
                                <Input
                                    value={model}
                                    onChange={(e) => {
                                        setModel(e.target.value)
                                        setHasChanged(true)
                                    }}
                                    placeholder="مثال: openai/gpt-4o"
                                />
                                <p className="text-xs text-muted-foreground">
                                    يتم استخدام OpenRouter كمزود للخدمة.
                                </p>
                            </div>

                            <Button 
                                className="w-full" 
                                onClick={handleSave} 
                                disabled={!hasChanged}
                            >
                                <Save className="w-4 h-4 mr-2" />
                                حفظ التغييرات
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="bg-muted/30 border-dashed">
                        <CardContent className="p-6">
                            <h3 className="font-semibold mb-2 text-sm">نصائح لكتابة التعليمات:</h3>
                            <ul className="text-xs text-muted-foreground space-y-2 list-disc list-inside">
                                <li>حدد نبرة الصوت (رسمي، ودود، حماسي).</li>
                                <li>اذكر المعلومات التي يجب جمعها من العميل.</li>
                                <li>حدد متى يجب تحويل المحادثة لموظف بشري.</li>
                                <li>استخدم أمثلة للمحادثات المتوقعة.</li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
