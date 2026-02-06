import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"

// Page key mapping for route -> permission check
const ROUTE_TO_PAGE_KEY: Record<string, string> = {
  "/admin/dashboard": "dashboard",
  "/admin": "residents",
  "/admin/bookings": "bookings",
  "/admin/complaints": "complaints",
  "/admin/visitors": "visitors",
  "/admin/parcels": "parcels",
  "/admin/analytics": "analytics",
  "/admin/feedback": "feedback",
  "/admin/accounting": "accounting",
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

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
    return NextResponse.next()
  }

  // Allow access to unauthorized page
  if (pathname === "/admin/unauthorized") {
    return NextResponse.next()
  }

  const response = NextResponse.next()

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

  // Use getUser() instead of getSession() for security
  // getUser() verifies the session with Supabase Auth server
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  // Redirect to login if no authenticated user
  if (userError || !user) {
    const loginUrl = new URL("/login", request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Use service role client to check admin status (bypasses RLS)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    // If no service key, allow access (backward compatibility)
    console.warn("[MIDDLEWARE] No service role key, skipping RBAC check")
    return response
  }

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

  // Check if RBAC is enabled by counting admin_users
  // If no admin users exist, allow access for initial setup
  const { count, error: countError } = await supabaseAdmin
    .from("admin_users")
    .select("*", { count: "exact", head: true })

  // If table doesn't exist or is empty, allow access (backward compatibility / initial setup)
  if (countError || count === null || count === 0) {
    console.log("[MIDDLEWARE] RBAC not enabled (no admin users), allowing access")
    return response
  }

  // RBAC is enabled - check if user exists in admin_users and is active
  const { data: adminUser, error: adminError } = await supabaseAdmin
    .from("admin_users")
    .select("id, role, is_active")
    .eq("auth_user_id", user.id)
    .single()

  // If no admin user found for this auth user, redirect to unauthorized
  if (adminError || !adminUser) {
    const unauthorizedUrl = new URL("/admin/unauthorized", request.url)
    return NextResponse.redirect(unauthorizedUrl)
  }

  // If admin is inactive, redirect to unauthorized
  if (!adminUser.is_active) {
    const unauthorizedUrl = new URL("/admin/unauthorized", request.url)
    return NextResponse.redirect(unauthorizedUrl)
  }

  // Super admins bypass all permission checks
  if (adminUser.role === "super_admin") {
    return response
  }

  // Get the page key for this route
  const pageKey = getPageKeyFromPath(pathname)

  // If no page key found, it might be a sub-route - allow access
  if (!pageKey) {
    return response
  }

  // Check permission for staff
  const { data: permission, error: permError } = await supabaseAdmin
    .from("admin_permissions")
    .select("can_access")
    .eq("admin_user_id", adminUser.id)
    .eq("page_key", pageKey)
    .single()

  // Settings is super_admin only, or staff lacks permission for current page
  if (pageKey === "settings" || permError || !permission?.can_access) {
    // Fetch all permissions for this user to find first permitted page
    const { data: allPerms } = await supabaseAdmin
      .from("admin_permissions")
      .select("page_key")
      .eq("admin_user_id", adminUser.id)
      .eq("can_access", true)

    if (allPerms && allPerms.length > 0) {
      // Page order for determining first permitted page
      const PAGE_ORDER = ["dashboard", "residents", "bookings", "complaints", "visitors", "parcels", "analytics", "feedback", "accounting"]
      const PAGE_KEY_TO_ROUTE: Record<string, string> = {
        dashboard: "/admin/dashboard",
        residents: "/admin",
        bookings: "/admin/bookings",
        complaints: "/admin/complaints",
        visitors: "/admin/visitors",
        parcels: "/admin/parcels",
        analytics: "/admin/analytics",
        feedback: "/admin/feedback",
        accounting: "/admin/accounting",
      }

      const permittedKeys = new Set(allPerms.map(p => p.page_key))
      const firstPermittedKey = PAGE_ORDER.find(key => permittedKeys.has(key))

      if (firstPermittedKey) {
        const redirectUrl = new URL(PAGE_KEY_TO_ROUTE[firstPermittedKey], request.url)
        return NextResponse.redirect(redirectUrl)
      }
    }

    // No permissions at all - show unauthorized
    const unauthorizedUrl = new URL("/admin/unauthorized", request.url)
    return NextResponse.redirect(unauthorizedUrl)
  }

  return response
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|daily-report|booking-invoice|maintenance-invoice|policies).*)"],
}
