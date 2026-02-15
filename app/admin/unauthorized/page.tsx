"use client"

import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ShieldX, ArrowLeft, LogOut } from "lucide-react"
import { createClient } from "@/lib/auth/client"

export default function UnauthorizedPage() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const handleGoBack = () => {
    router.back()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-manzhil-teal/5 p-4">
      <div className="w-full max-w-md">
        <Card className="w-full border-t-4 border-t-red-500 shadow-2xl shadow-red-500/10 rounded-2xl overflow-hidden">
          <CardHeader className="space-y-4 pb-6 pt-8">
            {/* Logo */}
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg shadow-manzhil-teal/30">
                <Image
                  src="/manzhil_logo-no_bg.png"
                  alt="Manzhil"
                  width={80}
                  height={80}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Icon */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <ShieldX className="w-8 h-8 text-red-500" />
              </div>
            </div>

            {/* Title */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-manzhil-dark">Access Denied</h1>
              <p className="text-sm text-gray-500">
                You don&apos;t have permission to access this page.
              </p>
            </div>
          </CardHeader>

          <CardContent className="pb-8 space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">
                If you believe this is an error, please contact your administrator
                to request access to this section.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleGoBack}
                variant="outline"
                className="w-full border-manzhil-teal/30 text-manzhil-teal hover:bg-manzhil-teal/5"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>

              <Button
                onClick={handleLogout}
                variant="ghost"
                className="w-full text-gray-500 hover:text-red-500 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>

            {/* Footer branding */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-400">
                Powered by <span className="text-manzhil-teal font-semibold">Scrift</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
