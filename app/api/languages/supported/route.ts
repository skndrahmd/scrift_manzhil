/**
 * GET /api/languages/supported — Fetch Google Translate supported languages
 */

import { NextResponse } from "next/server"
import { isSuperAdmin } from "@/lib/auth/api-auth"
import { getSupportedLanguages } from "@/lib/google-translate"

export const dynamic = "force-dynamic"

// Cache the supported languages list for 24 hours
let cachedLanguages: { language: string; name: string }[] | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export async function GET() {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Super admin required" }, { status: 403 })
    }

    const now = Date.now()
    if (cachedLanguages && now - cacheTimestamp < CACHE_DURATION) {
      return NextResponse.json({ languages: cachedLanguages })
    }

    const languages = await getSupportedLanguages()
    cachedLanguages = languages
    cacheTimestamp = now

    return NextResponse.json({ languages })
  } catch (error) {
    console.error("[Languages API] Supported languages error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
