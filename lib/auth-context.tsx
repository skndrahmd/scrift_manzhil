"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { createClient } from "@/lib/auth-client"
import type { AdminUser, AdminPermission, PageKey } from "@/lib/supabase"

interface AuthContextType {
  adminUser: AdminUser | null
  permissions: Map<PageKey, boolean>
  role: "super_admin" | "staff" | null
  isLoading: boolean
  hasPermission: (pageKey: PageKey) => boolean
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
  initialAdminUser?: AdminUser | null
  initialPermissions?: AdminPermission[]
}

export function AuthProvider({
  children,
  initialAdminUser = null,
  initialPermissions = []
}: AuthProviderProps) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(initialAdminUser)
  const [permissions, setPermissions] = useState<Map<PageKey, boolean>>(() => {
    const map = new Map<PageKey, boolean>()
    initialPermissions.forEach(p => {
      map.set(p.page_key as PageKey, p.can_access)
    })
    return map
  })
  const [isLoading, setIsLoading] = useState(!initialAdminUser)
  const supabase = createClient()

  const fetchAuthData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setAdminUser(null)
        setPermissions(new Map())
        return
      }

      // Check if RBAC is enabled (any admin users exist)
      const { count, error: countError } = await supabase
        .from("admin_users")
        .select("*", { count: "exact", head: true })

      // If RBAC not enabled, don't set admin user (will show all tabs)
      if (countError || count === null || count === 0) {
        setAdminUser(null)
        setPermissions(new Map())
        return
      }

      // Fetch admin user record
      const { data: adminData, error: adminError } = await supabase
        .from("admin_users")
        .select("*")
        .eq("auth_user_id", user.id)
        .single()

      if (adminError || !adminData) {
        // User authenticated but not in admin_users - shouldn't happen if middleware works
        console.error("Failed to fetch admin user:", adminError)
        setAdminUser(null)
        setPermissions(new Map())
        return
      }

      setAdminUser(adminData as AdminUser)

      // If super_admin, they have all permissions
      if (adminData.role === "super_admin") {
        const allPermissions = new Map<PageKey, boolean>()
        const pageKeys: PageKey[] = [
          "dashboard", "residents", "bookings", "complaints",
          "visitors", "parcels", "analytics", "feedback",
          "accounting", "settings"
        ]
        pageKeys.forEach(key => allPermissions.set(key, true))
        setPermissions(allPermissions)
        return
      }

      // Fetch permissions for staff
      const { data: permData, error: permError } = await supabase
        .from("admin_permissions")
        .select("*")
        .eq("admin_user_id", adminData.id)

      if (permError) {
        console.error("Failed to fetch permissions:", permError)
        setPermissions(new Map())
        return
      }

      const permMap = new Map<PageKey, boolean>()
      permData?.forEach(p => {
        permMap.set(p.page_key as PageKey, p.can_access)
      })
      setPermissions(permMap)
    } catch (error) {
      console.error("Auth fetch error:", error)
      setAdminUser(null)
      setPermissions(new Map())
    }
  }, [supabase])

  const refreshAuth = useCallback(async () => {
    setIsLoading(true)
    await fetchAuthData()
    setIsLoading(false)
  }, [fetchAuthData])

  useEffect(() => {
    if (!initialAdminUser) {
      refreshAuth()
    }
  }, [initialAdminUser, refreshAuth])

  const hasPermission = useCallback((pageKey: PageKey): boolean => {
    // Super admins have all permissions
    if (adminUser?.role === "super_admin") {
      return true
    }
    // Check specific permission
    return permissions.get(pageKey) ?? false
  }, [adminUser?.role, permissions])

  const role = adminUser?.role ?? null

  return (
    <AuthContext.Provider value={{
      adminUser,
      permissions,
      role,
      isLoading,
      hasPermission,
      refreshAuth,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
