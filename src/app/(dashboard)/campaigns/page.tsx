"use client"

import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Plus,
  Search,
  MessageSquare,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  ArrowRight
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

export default function CampaignsPage() {
  const campaigns = useQuery(api.campaigns.list)
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="space-y-6 p-4 sm:p-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">الحملات التسويقية</h1>
          <p className="text-muted-foreground mt-1">إدارة الحملات ورسائل البث الجماعي</p>
        </div>
        <Link href="/campaigns/new">
          <Button className="gap-2 bg-[#004D3D] hover:bg-[#003D2D]">
            <Plus className="h-4 w-4" />
            حملة جديدة
          </Button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الحملات</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns ? campaigns.length : "-"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">تم إرسالها</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns ? campaigns.reduce((acc, c) => acc + (c.stats.sent || 0), 0) : "-"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معدل القراءة</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns && campaigns.length > 0
                ? Math.round((campaigns.reduce((acc, c) => acc + (c.stats.read || 0), 0) / Math.max(1, campaigns.reduce((acc, c) => acc + (c.stats.delivered || 0), 0))) * 100)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث عن حملة..."
            className="pl-4 pr-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {!campaigns ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-xl bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12 bg-muted/10 rounded-2xl border-2 border-dashed">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">لا توجد حملات بعد</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mt-2 mb-6">
              أنشئ حملتك الأولى للوصول إلى عملائك وزيادة مبيعاتك.
            </p>
            <Link href="/campaigns/new">
              <Button variant="outline">إنشاء حملة</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {campaigns
              .filter(c => c.name.includes(searchQuery))
              .map((campaign) => (
                <Link href={`/campaigns/${campaign._id}`} key={campaign._id}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">

                      {/* Info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{campaign.name}</h3>
                          <Badge variant={
                            campaign.status === 'COMPLETED' ? 'default' :
                              campaign.status === 'PROCESSING' ? 'secondary' :
                                campaign.status === 'SCHEDULED' ? 'outline' : 'destructive'
                          } className={campaign.status === 'COMPLETED' ? 'bg-success hover:bg-success/90' : ''}>
                            {campaign.status === 'COMPLETED' && 'مكتملة'}
                            {campaign.status === 'PROCESSING' && 'جاري الإرسال'}
                            {campaign.status === 'SCHEDULED' && 'مجدولة'}
                            {campaign.status === 'DRAFT' && 'مسودة'}
                            {campaign.status === 'FAILED' && 'فشلت'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(campaign.createdAt, "d MMM, yyyy", { locale: ar })}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            قالب: {campaign.templateName}
                          </span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-6 w-full md:w-auto">
                        <div className="text-center">
                          <div className="text-lg font-bold">{campaign.stats.total}</div>
                          <div className="text-xs text-muted-foreground">مستلم</div>
                        </div>
                        <div className="h-8 w-px bg-border hidden md:block" />
                        <div className="text-center">
                          <div className="text-lg font-bold text-success">
                            {Math.round((campaign.stats.read / Math.max(1, campaign.stats.delivered)) * 100)}%
                          </div>
                          <div className="text-xs text-muted-foreground">قراءة</div>
                        </div>
                        <div className="h-8 w-px bg-border hidden md:block" />
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">
                            {Math.round((campaign.stats.delivered / Math.max(1, campaign.stats.sent)) * 100)}%
                          </div>
                          <div className="text-xs text-muted-foreground">وصول</div>
                        </div>
                      </div>

                    </div>

                    {/* Progress Bar (if processing) */}
                    {campaign.status === 'PROCESSING' && (
                      <div className="h-1 w-full bg-muted mt-auto">
                        <div
                          className="h-full bg-primary transition-all duration-500"
                          style={{ width: `${(campaign.stats.sent / Math.max(1, campaign.stats.total)) * 100}%` }}
                        />
                      </div>
                    )}
                  </Card>
                </Link>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
