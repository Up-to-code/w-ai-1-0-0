"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import { useAuth } from "@/contexts/AuthContext"
import { Loader2 } from "lucide-react"
import { AccessDenied } from "@/components/AccessDenied"

function isAuthRoute(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login") || pathname === "/register" || pathname.startsWith("/register")
}

function isPublicRoute(pathname: string): boolean {
  return pathname === "/privacy" || pathname === "/terms" || pathname.startsWith("/privacy") || pathname.startsWith("/terms")
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, userId, setRole } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const user = useQuery(
    api.auth.getUser,
    isAuthenticated && userId ? { userId: userId as Id<"users"> } : "skip"
  )

  useEffect(() => {
    if (user?.role && setRole) {
      setRole(user.role as "admin" | "agent" | "user")
    }
  }, [user?.role, setRole])

  useEffect(() => {
    if (loading) return

    const authRoute = isAuthRoute(pathname)
    const publicRoute = isPublicRoute(pathname)

    if (!isAuthenticated && !authRoute && !publicRoute) {
      router.replace("/login")
      return
    }

    if (isAuthenticated && authRoute) {
      router.replace("/")
      return
    }
  }, [isAuthenticated, loading, pathname, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Authenticated but not on auth/public route: check admin access
  const authRoute = isAuthRoute(pathname)
  const publicRoute = isPublicRoute(pathname)
  if (isAuthenticated && !authRoute && !publicRoute) {
    // Still loading user from server
    if (user === undefined) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
    }
    // User loaded: only admins can access the web app
    if (user && user.role !== "admin") {
      return <AccessDenied />
    }
  }

  return <>{children}</>
}
