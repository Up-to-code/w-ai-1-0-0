"use client"

import * as React from "react"
import Link from "next/link"
import { Check, ChevronsUpDown, PlusCircle, Settings, Store, Layers } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useWorkspace } from "@/contexts/WorkspaceContext"

export function WorkspaceSwitcher() {
  const { numbers, activeWorkspace, setActivePhoneNumberId, isLoading } = useWorkspace()

  if (isLoading || numbers.length === 0) {
    return (
      <Button
        variant="ghost"
        className="w-full justify-between gap-2 px-3 py-6 border border-sidebar-border bg-sidebar-accent/30 rounded-xl"
      >
        <div className="flex items-center gap-3 text-right">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0">
            <Store className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex flex-col text-right overflow-hidden">
            <span className="text-sm text-muted-foreground">جاري التحميل...</span>
          </div>
        </div>
      </Button>
    )
  }

  const isAllSelected = !activeWorkspace
  const displayWorkspace = activeWorkspace ?? numbers[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between gap-2 px-3 py-6 hover:bg-sidebar-accent transition-all border border-sidebar-border bg-sidebar-accent/30 rounded-xl"
        >
          <div className="flex items-center gap-3 text-right">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg shrink-0 shadow-lg",
              isAllSelected ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
            )}>
              {isAllSelected ? <Layers className="h-5 w-5" /> : <Store className="h-5 w-5" />}
            </div>
            <div className="flex flex-col text-right overflow-hidden">
              <span className="text-sm font-bold text-sidebar-foreground truncate">
                {isAllSelected ? "جميع الأرقام" : displayWorkspace.name}
              </span>
              <span className="text-[10px] text-muted-foreground truncate" dir="ltr">
                {isAllSelected ? "كل المحادثات والعملاء" : displayWorkspace.phone}
              </span>
            </div>
          </div>
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[240px] p-2 rounded-xl"
        align="start"
        side="bottom"
        sideOffset={8}
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5 Arabic-Regular">
          بيئة العمل النشطة
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => setActivePhoneNumberId(null)}
          className={cn(
            "flex items-center justify-between gap-2 p-3 rounded-lg cursor-pointer focus:bg-primary/10 transition-colors",
            isAllSelected && "bg-primary/10"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md",
              isAllSelected ? "bg-primary text-primary-foreground" : "bg-sidebar-accent text-sidebar-foreground"
            )}>
              <Layers className="h-4 w-4" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">جميع الأرقام</span>
              <span className="text-[10px] text-muted-foreground truncate">كل المحادثات والعملاء</span>
            </div>
          </div>
          {isAllSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
        </DropdownMenuItem>
        {numbers.map((ws) => (
          <DropdownMenuItem
            key={ws._id}
            onClick={() => setActivePhoneNumberId(ws.businessNumberId)}
            className="flex items-center justify-between gap-2 p-3 rounded-lg cursor-pointer focus:bg-primary/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-foreground",
                  activeWorkspace?.businessNumberId === ws.businessNumberId &&
                    "bg-primary text-primary-foreground"
                )}
              >
                <Store className="h-4 w-4" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium truncate">{ws.name}</span>
                <span className="text-[10px] text-muted-foreground truncate" dir="ltr">
                  {ws.phone}
                </span>
              </div>
            </div>
            {activeWorkspace?.businessNumberId === ws.businessNumberId && (
              <Check className="h-4 w-4 text-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="my-2" />
        <DropdownMenuItem asChild>
          <Link
            href="/integrations"
            className="flex items-center gap-2 p-2 rounded-lg cursor-pointer text-primary hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            <span className="text-sm">إضافة بيئة عمل جديدة</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/integrations"
            className="flex items-center gap-2 p-2 rounded-lg cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span className="text-sm">إدارة بيئات العمل</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
