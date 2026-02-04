import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { supabaseAdmin } from "@/lib/supabase"
import type { AdminUser, PageKey } from "@/lib/supabase"

interface VerifyAdminResult {
  authenticated: boolean
  adminUser: AdminUser | null
  error: string | null
}

/**
 * Verify admin access for API routes
 * @param pageKey - Optional page key to check specific permission
 * @returns Authentication result with admin user data
 */
export async function verifyAdminAccess(pageKey?: PageKey): Promise<VerifyAdminResult> {
  try {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Get session
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        authenticated: false,
        adminUser: null,
        error: "Not authenticated",
      }
    }

    // Fetch admin user using service role (bypasses RLS)
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from("admin_users")
      .select("*")
      .eq("auth_user_id", user.id)
      .single()

    if (adminError || !adminUser) {
      return {
        authenticated: false,
        adminUser: null,
        error: "User is not an authorized admin",
      }
    }

    // Check if active
    if (!adminUser.is_active) {
      return {
        authenticated: false,
        adminUser: null,
        error: "Admin account is deactivated",
      }
    }

    // Super admins bypass permission checks
    if (adminUser.role === "super_admin") {
      return {
        authenticated: true,
        adminUser: adminUser as AdminUser,
        error: null,
      }
    }

    // If no specific page key requested, just verify admin status
    if (!pageKey) {
      return {
        authenticated: true,
        adminUser: adminUser as AdminUser,
        error: null,
      }
    }

    // Check specific permission for staff
    const { data: permission, error: permError } = await supabaseAdmin
      .from("admin_permissions")
      .select("can_access")
      .eq("admin_user_id", adminUser.id)
      .eq("page_key", pageKey)
      .single()

    if (permError || !permission?.can_access) {
      return {
        authenticated: false,
        adminUser: adminUser as AdminUser,
        error: `Access denied for ${pageKey}`,
      }
    }

    return {
      authenticated: true,
      adminUser: adminUser as AdminUser,
      error: null,
    }
  } catch (error) {
    console.error("verifyAdminAccess error:", error)
    return {
      authenticated: false,
      adminUser: null,
      error: "Authentication error",
    }
  }
}

/**
 * Check if user is a super admin
 */
export async function isSuperAdmin(): Promise<boolean> {
  const result = await verifyAdminAccess()
  return result.authenticated && result.adminUser?.role === "super_admin"
}
