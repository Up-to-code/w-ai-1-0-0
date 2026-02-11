"use client"

import { useState, useRef } from "react"
import { useMutation } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Upload, Loader2, FileSpreadsheet, XCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import * as XLSX from "xlsx"
import { toast } from "sonner"

export function ImportButton() {
    const [isOpen, setIsOpen] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const [progress, setProgress] = useState(0)
    const [globalTags, setGlobalTags] = useState("")
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const bulkCreate = useMutation(api.contacts.bulkCreate)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedFile(file)
        }
    }

    const handleStartImport = async () => {
        if (!selectedFile) return

        setIsImporting(true)
        setProgress(10)
        const reader = new FileReader()

        reader.onload = async (event) => {
            try {
                const data = event.target?.result
                const workbook = XLSX.read(data, { type: "binary" })
                const sheetName = workbook.SheetNames[0]
                const sheet = workbook.Sheets[sheetName]
                const jsonData = XLSX.utils.sheet_to_json(sheet) as any[]

                setProgress(30)

                const gTags = globalTags
                    .split(",")
                    .map(t => t.trim())
                    .filter(Boolean)

                const contacts = jsonData.map(row => {
                    const name = row["الاسم"] || row["Name"] || "عميل بدون اسم"
                    const phone = String(row["رقم الهاتف"] || row["Number"] || row["Phone"] || "").replace(/[^0-9]/g, "")
                    const email = row["البريد الإلكتروني"] || row["Email"]
                    const rowTags = (row["الوسوم"] || row["Tags"] || "")
                        .split(",")
                        .map((t: string) => t.trim())
                        .filter(Boolean)

                    const stage = row["المرحلة"] || row["Stage"]

                    // Merge global tags with row tags
                    const mergedTags = Array.from(new Set([...rowTags, ...gTags]))

                    return { name, phone, email, tags: mergedTags, stage }
                }).filter(c => c.phone.length > 5)

                setProgress(50)

                if (contacts.length === 0) {
                    toast.error("لم يتم العثور على بيانات صالحة في الملف")
                    setIsImporting(false)
                    return
                }

                // Process in chunks if large, for smoother UI
                const chunkSize = 50
                let successCount = 0

                for (let i = 0; i < contacts.length; i += chunkSize) {
                    const chunk = contacts.slice(i, i + chunkSize)
                    const count = await bulkCreate({ contacts: chunk })
                    successCount += count
                    const currentProgress = Math.min(50 + Math.floor(((i + chunkSize) / contacts.length) * 50), 100)
                    setProgress(currentProgress)
                }

                toast.success(`تم استيراد ${successCount} عميل بنجاح`)
                setIsOpen(false)
                resetState()
            } catch (error) {
                console.error("Import error:", error)
                toast.error("حدث خطأ أثناء استيراد البيانات")
            } finally {
                setIsImporting(false)
            }
        }

        reader.readAsBinaryString(selectedFile)
    }

    const resetState = () => {
        setSelectedFile(null)
        setGlobalTags("")
        setProgress(0)
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    return (
        <Dialog open={isOpen} onOpenChange={(v) => {
            setIsOpen(v)
            if (!v) resetState()
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Upload className="h-4 w-4" />
                    استيراد Excel
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>استيراد عملاء من Excel</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                    <div className="space-y-2">
                        <Label>اختر الملف (.xlsx, .xls, .csv)</Label>
                        <div
                            onClick={() => !isImporting && fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer ${selectedFile ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"
                                } ${isImporting ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                            <input
                                type="file"
                                accept=".xlsx, .xls, .csv"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                disabled={isImporting}
                            />
                            {selectedFile ? (
                                <>
                                    <FileSpreadsheet className="h-10 w-10 text-primary" />
                                    <div className="text-center">
                                        <p className="text-sm font-medium">{selectedFile.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {(selectedFile.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Upload className="h-10 w-10 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground text-center">
                                        اسحب الملف هنا أو انقر للاختيار
                                    </p>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="globalTags">وسوم إضافية لجميع العملاء</Label>
                        <Input
                            id="globalTags"
                            value={globalTags}
                            onChange={(e) => setGlobalTags(e.target.value)}
                            placeholder="مثال: حملة رمضان, 2024"
                            disabled={isImporting}
                        />
                        <p className="text-[10px] text-muted-foreground">افصل بين الوسوم بفاصلة (,)</p>
                    </div>

                    {isImporting && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs mb-1">
                                <span>جاري المعالجة...</span>
                                <span>{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            variant="ghost"
                            onClick={() => setIsOpen(false)}
                            disabled={isImporting}
                        >
                            إلغاء
                        </Button>
                        <Button
                            onClick={handleStartImport}
                            disabled={!selectedFile || isImporting}
                            className="gap-2 min-w-[120px]"
                        >
                            {isImporting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    جاري الرفع
                                </>
                            ) : (
                                "بدء الاستيراد"
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
