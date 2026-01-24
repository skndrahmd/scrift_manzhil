"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/auth-client"
import { useRouter, usePathname } from "next/navigation"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isChecking, setIsChecking] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      // Define public routes that don't require authentication
      const publicRoutes = [
        "/login",
        "/booking-invoice",
        "/maintenance-invoice",
        "/daily-report",
        "/policies"
      ]

      // Check if current path is a public route
      const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

      // Skip auth check for public routes
      if (isPublicRoute) {
        setIsChecking(false)
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
      }
      setIsChecking(false)
    }

    checkAuth()
  }, [router, pathname, supabase])

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
