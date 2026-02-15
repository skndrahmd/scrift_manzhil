"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/auth/client"
import { useRouter, usePathname } from "next/navigation"

import Loader from "@/components/ui/loader"

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
    return <Loader fullScreen />
  }

  return <>{children}</>
}
