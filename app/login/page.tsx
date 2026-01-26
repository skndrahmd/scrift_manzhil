"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { createClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, Lock, Mail } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        return
      }

      if (data.user) {
        toast({
          title: "Success",
          description: "Logged in successfully",
        })

        router.push("/admin")
      }
    } catch (err) {
      setError("An unexpected error occurred")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-manzhil-teal/5 p-4">
      <div className="w-full max-w-md">
        <Card className="w-full border-t-4 border-t-manzhil-teal shadow-2xl shadow-manzhil-teal/20 rounded-2xl overflow-hidden">
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

            {/* Branding */}
            <div className="text-center space-y-1">
              <h1 className="text-3xl font-bold text-manzhil-dark">Welcome Back</h1>
              <p className="text-sm text-gray-500">Sign in to access your admin panel</p>
            </div>
          </CardHeader>

          <CardContent className="pb-8">
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-manzhil-dark">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@manzhil.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    className="pl-10 border-gray-200 focus:border-manzhil-teal focus:ring-manzhil-teal"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-manzhil-dark">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    className="pl-10 border-gray-200 focus:border-manzhil-teal focus:ring-manzhil-teal"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-manzhil-dark to-manzhil-teal hover:from-manzhil-teal hover:to-manzhil-dark text-white shadow-lg shadow-manzhil-teal/30 transition-all duration-300 h-11 text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

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
