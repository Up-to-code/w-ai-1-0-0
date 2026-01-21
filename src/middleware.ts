import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Define protected routes that require authentication
  const protectedRoutes = ["/chat", "/campaigns", "/storage", "/ai-settings", "/integrations", "/settings"]
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // Check for authentication (in a real app, you'd check for a valid session/token)
  // For now, we'll allow all requests and handle auth in the components
  if (isProtectedRoute) {
    // Add your authentication logic here
    // Example: const token = request.cookies.get('auth-token')
    // if (!token) {
    //   return NextResponse.redirect(new URL('/login', request.url))
    // }
  }

  // Handle 404 scenarios
  // Next.js App Router automatically handles 404s with not-found.tsx
  // This middleware can be extended for custom 404 logic if needed

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}