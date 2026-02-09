"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, Phone, KeyRound, ArrowLeft, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

const OTP_COOLDOWN_SECONDS = 180 // 3 minutes

export default function LoginPage() {
  const [step, setStep] = useState<"phone" | "otp">("phone")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otp, setOtp] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const router = useRouter()
  const { toast } = useToast()

  // Countdown timer for OTP resend
  useEffect(() => {
    if (cooldownSeconds <= 0) return
    const timer = setTimeout(() => setCooldownSeconds(s => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldownSeconds])

  const formatCooldown = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }, [])

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phoneNumber }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || "Failed to send OTP")
        return
      }

      setStep("otp")
      setCooldownSeconds(OTP_COOLDOWN_SECONDS)
      toast({
        title: "OTP Sent",
        description: "Check your WhatsApp for the login code",
      })
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phoneNumber, otp }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || "Verification failed")
        return
      }

      toast({
        title: "Success",
        description: "Logged in successfully",
      })

      router.push(result.redirectTo)
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    setStep("phone")
    setOtp("")
    setError("")
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
                  unoptimized
                  priority
                />
              </div>
            </div>

            {/* Branding */}
            <div className="text-center space-y-1">
              <h1 className="text-3xl font-bold text-manzhil-dark">Welcome Back</h1>
              <p className="text-sm text-gray-500">
                {step === "phone"
                  ? "Enter your phone number to receive a login code"
                  : "Enter the code sent to your WhatsApp"}
              </p>
            </div>
          </CardHeader>

          <CardContent className="pb-8">
            {step === "phone" ? (
              <form onSubmit={handleSendOtp} className="space-y-5">
                {error && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium text-manzhil-dark">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+923001234567"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={isLoading}
                      required
                      className="pl-10 border-gray-200 focus:border-manzhil-teal focus:ring-manzhil-teal"
                    />
                  </div>
                  <p className="text-xs text-gray-400">Include country code (e.g., +92 for Pakistan)</p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-manzhil-dark to-manzhil-teal hover:from-manzhil-teal hover:to-manzhil-dark text-white shadow-lg shadow-manzhil-teal/30 transition-all duration-300 h-11 text-base font-medium"
                  disabled={isLoading || !phoneNumber}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    "Send OTP"
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                {error && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <label htmlFor="otp" className="text-sm font-medium text-manzhil-dark">
                    Login Code
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      placeholder="Enter 6-digit code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      disabled={isLoading}
                      required
                      className="pl-10 border-gray-200 focus:border-manzhil-teal focus:ring-manzhil-teal text-center text-lg tracking-widest"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    Sent to {phoneNumber} via WhatsApp
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-manzhil-dark to-manzhil-teal hover:from-manzhil-teal hover:to-manzhil-dark text-white shadow-lg shadow-manzhil-teal/30 transition-all duration-300 h-11 text-base font-medium"
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Sign In"
                  )}
                </Button>

                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    className="text-gray-500 hover:text-manzhil-dark"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Change Number
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSendOtp()}
                    disabled={cooldownSeconds > 0 || isLoading}
                    className="text-manzhil-teal hover:text-manzhil-dark"
                  >
                    {cooldownSeconds > 0
                      ? `Resend in ${formatCooldown(cooldownSeconds)}`
                      : "Resend OTP"}
                  </Button>
                </div>
              </form>
            )}

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
