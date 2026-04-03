/**
 * @module middleware
 * Next.js Edge Middleware for authentication and RBAC route protection.
 * Validates Supabase sessions, checks admin permissions with HMAC-signed
 * cookie caching, and redirects unauthorized users.
 * Includes request ID tracking and logging.
 */

import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { ADMIN_CACHE_COOKIE } from "@/lib/auth/cache"
import { generateRequestId, createModuleLogger } from "@/lib/logger"

// Create a lightweight logger for middleware (Edge-compatible)
const log = createModuleLogger("middleware")

// Page key mapping for route -> permission check
const ROUTE_TO_PAGE_KEY: Record<string, string> = {
  "/admin/dashboard": "dashboard",
  "/admin": "residents",
  "/admin/units": "units",
  "/admin/bookings": "bookings",
  "/admin/complaints": "complaints",
  "/admin/visitors": "visitors",
  "/admin/parcels": "parcels",
  "/admin/analytics": "analytics",
  "/admin/feedback": "feedback",
  "/admin/accounting": "accounting",
  "/admin/broadcast": "broadcast",
  "/admin/settings": "settings",
}

function getPageKeyFromPath(pathname: string): string | null {
  // Exact match first
  if (ROUTE_TO_PAGE_KEY[pathname]) {
    return ROUTE_TO_PAGE_KEY[pathname]
  }

  // Check if path starts with any of the routes
  for (const [route, pageKey] of Object.entries(ROUTE_TO_PAGE_KEY)) {
    if (route !== "/admin" && pathname.startsWith(route)) {
      return pageKey
    }
  }

  // Special case for /admin root (residents page)
  if (pathname === "/admin" || pathname === "/admin/") {
    return "residents"
  }

  return null
}

/**
 * Next.js middleware that authenticates requests and enforces RBAC.
 * Checks Supabase auth, resolves admin role/permissions (always from DB),
 * and redirects unauthorized users to login or the first permitted page.
 * Adds request ID for distributed tracing.
 * @param request - Incoming Next.js request
 * @returns NextResponse (pass-through, redirect, or with updated cache cookie)
 */
export async function middleware(request: NextRequest) {
  const startTime = Date.now()
  const { pathname } = request.nextUrl
  const method = request.method

  // Generate request ID for tracing
  const requestId = generateRequestId()

  // Allow unauthenticated access to public routes
  const publicRoutes = [
    "/login",
    "/api",
    "/booking-invoice",
    "/maintenance-invoice",
    "/daily-report",
    "/policies"
  ]

  // Check if the current path matches any public route
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  if (isPublicRoute) {
    const response = NextResponse.next()
    response.headers.set("x-request-id", requestId)

    // Log public route access (skip static assets)
    if (!pathname.startsWith("/_next") && !pathname.startsWith("/favicon")) {
      log.debug(`PUBLIC ${method} ${pathname}`, {
        requestId,
        method,
        path: pathname,
        duration: Date.now() - startTime,
      })
    }
    return response
  }

  // Allow access to unauthorized page
  if (pathname === "/admin/unauthorized") {
    const response = NextResponse.next()
    response.headers.set("x-request-id", requestId)
    return response
  }

  const response = NextResponse.next()
  response.headers.set("x-request-id", requestId)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Use getUser() to securely verify the session with Supabase Auth server
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  // Redirect to login if no authenticated user
  if (userError || !user) {
    log.debug(`AUTH_REDIRECT: ${pathname} → /login`, {
      requestId,
      method,
      path: pathname,
      reason: userError?.message || "no_user",
      duration: Date.now() - startTime,
    })

    const loginUrl = new URL("/login", request.url)
    const loginRedirect = NextResponse.redirect(loginUrl)
    // Clear the admin permission cache so re-login gets fresh permissions
    loginRedirect.cookies.set(ADMIN_CACHE_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    })
    loginRedirect.headers.set("x-request-id", requestId)
    return loginRedirect
  }

  // Use service role client to check admin status (bypasses RLS)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    log.error("SUPABASE_SERVICE_ROLE_KEY is required for RBAC", {
      requestId,
      path: pathname,
    })
    const redirect = NextResponse.redirect(new URL("/admin/unauthorized", request.url))
    redirect.headers.set("x-request-id", requestId)
    return redirect
  }

  // Always query DB directly — no cache
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  // Check if user exists in admin_users and is active
  const { data: adminUser, error: adminError } = await supabaseAdmin
    .from("admin_users")
    .select("id, role, is_active")
    .eq("auth_user_id", user.id)
    .single()

  // If no admin user found for this auth user, redirect to unauthorized
  if (adminError || !adminUser) {
    log.warn(`AUTH_UNAUTHORIZED: ${pathname} - no admin user found`, {
      requestId,
      path: pathname,
      userId: user.id,
    })
    const unauthorizedUrl = new URL("/admin/unauthorized", request.url)
    const redirect = NextResponse.redirect(unauthorizedUrl)
    redirect.headers.set("x-request-id", requestId)
    return redirect
  }

  const adminRole = adminUser.role
  const adminId = adminUser.id
  const isActive = adminUser.is_active

  let permissionKeys: string[]

  if (adminRole !== "super_admin") {
    const { data: allPerms } = await supabaseAdmin
      .from("admin_permissions")
      .select("page_key")
      .eq("admin_user_id", adminId)
      .eq("can_access", true)

    permissionKeys = allPerms?.map(p => p.page_key) ?? []
  } else {
    permissionKeys = []
  }

  // If admin is inactive, redirect to unauthorized
  if (!isActive) {
    log.warn(`AUTH_INACTIVE: ${pathname} - admin inactive`, {
      requestId,
      adminId,
      adminRole,
    })
    const unauthorizedUrl = new URL("/admin/unauthorized", request.url)
    const redirect = NextResponse.redirect(unauthorizedUrl)
    redirect.headers.set("x-request-id", requestId)
    return redirect
  }

  // Super admins bypass all permission checks
  if (adminRole === "super_admin") {
    log.debug(`AUTH_OK: ${method} ${pathname}`, {
      requestId,
      adminId,
      adminRole: "super_admin",
      duration: Date.now() - startTime,
    })
    return response
  }

  // Get the page key for this route
  const pageKey = getPageKeyFromPath(pathname)

  // If no page key found, it might be a sub-route - allow access
  if (!pageKey) {
    log.debug(`AUTH_OK: ${method} ${pathname} (sub-route)`, {
      requestId,
      adminId,
      duration: Date.now() - startTime,
    })
    return response
  }

  const permittedKeySet = new Set(permissionKeys)

  // Settings is super_admin only, or staff lacks permission for current page
  if (pageKey === "settings" || !permittedKeySet.has(pageKey)) {
    // Find first permitted page to redirect to
    const PAGE_ORDER = ["dashboard", "residents", "units", "bookings", "complaints", "visitors", "parcels", "analytics", "feedback", "accounting", "broadcast", "settings"]
    const PAGE_KEY_TO_ROUTE: Record<string, string> = {
      dashboard: "/admin/dashboard",
      residents: "/admin",
      units: "/admin/units",
      bookings: "/admin/bookings",
      complaints: "/admin/complaints",
      visitors: "/admin/visitors",
      parcels: "/admin/parcels",
      analytics: "/admin/analytics",
      feedback: "/admin/feedback",
      accounting: "/admin/accounting",
      broadcast: "/admin/broadcast",
      settings: "/admin/settings",
    }

    const firstPermittedKey = PAGE_ORDER.find(key => permittedKeySet.has(key))

    log.debug(`AUTH_REDIRECT: ${pathname} → /${firstPermittedKey || "unauthorized"}`, {
      requestId,
      adminId,
      requestedPage: pageKey,
      permittedPages: permissionKeys,
      duration: Date.now() - startTime,
    })

    if (firstPermittedKey) {
      const redirectUrl = new URL(PAGE_KEY_TO_ROUTE[firstPermittedKey], request.url)
      const redirect = NextResponse.redirect(redirectUrl)
      redirect.headers.set("x-request-id", requestId)
      return redirect
    }

    // No permissions at all - show unauthorized
    const unauthorizedUrl = new URL("/admin/unauthorized", request.url)
    const redirect = NextResponse.redirect(unauthorizedUrl)
    redirect.headers.set("x-request-id", requestId)
    return redirect
  }

  // Access granted
  log.debug(`AUTH_OK: ${method} ${pathname}`, {
    requestId,
    adminId,
    adminRole,
    pageKey,
    duration: Date.now() - startTime,
  })

  return response
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|daily-report|booking-invoice|maintenance-invoice|policies|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.ico$|.*\\.webp$).*)"],
}
