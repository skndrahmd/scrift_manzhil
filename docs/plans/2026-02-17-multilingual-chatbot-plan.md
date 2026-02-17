# Multilingual WhatsApp Chatbot — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add multilingual support to the WhatsApp chatbot so residents can choose their language on every "0" command, with translations managed by the super admin via a new settings page.

**Architecture:** Two new database tables (`enabled_languages`, `bot_message_translations`) store language configs and translations. Google Cloud Translation API provides bulk translations when a language is added. The `getMessage()` function gains a `language` parameter that checks translations before falling back to English. The router intercepts "0" to show a language menu when any language is enabled.

**Tech Stack:** Next.js 14 API routes, Supabase (PostgreSQL), Google Cloud Translation API v2, React + Radix UI + Tailwind CSS

---

## Task 1: Database Schema — Create new tables

**Files:**
- Create: `sql/database-multilingual-schema.sql`

**Step 1: Write the SQL migration file**

```sql
-- Multilingual chatbot support tables
-- Run in Supabase SQL Editor

-- Table: enabled_languages
CREATE TABLE IF NOT EXISTS enabled_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code VARCHAR(10) NOT NULL UNIQUE,
  language_name VARCHAR(100) NOT NULL,
  native_name VARCHAR(100),
  is_enabled BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: bot_message_translations
CREATE TABLE IF NOT EXISTS bot_message_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_key VARCHAR(100) NOT NULL REFERENCES bot_messages(message_key) ON DELETE CASCADE,
  language_code VARCHAR(10) NOT NULL REFERENCES enabled_languages(language_code) ON DELETE CASCADE,
  translated_text TEXT NOT NULL,
  is_auto_translated BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES admin_users(id),
  UNIQUE(message_key, language_code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_translations_language ON bot_message_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_translations_key ON bot_message_translations(message_key);
CREATE INDEX IF NOT EXISTS idx_enabled_languages_enabled ON enabled_languages(is_enabled);

-- RLS policies
ALTER TABLE enabled_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_message_translations ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (admin operations bypass RLS via supabaseAdmin)
CREATE POLICY "Service role full access on enabled_languages"
  ON enabled_languages FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on bot_message_translations"
  ON bot_message_translations FOR ALL
  USING (auth.role() = 'service_role');
```

**Step 2: Commit**

```bash
git add sql/database-multilingual-schema.sql
git commit -m "feat: add database schema for multilingual chatbot support"
```

---

## Task 2: Google Translate utility module

**Files:**
- Create: `lib/google-translate.ts`

**Step 1: Install the Google Cloud Translate package**

```bash
npm install @google-cloud/translate
```

Note: If the v2 API with just an API key is simpler, use the REST API directly via fetch instead. The v2 REST endpoint is `https://translation.googleapis.com/language/translate/v2`. This avoids adding a heavy dependency. Decide at implementation time — prefer the lighter approach (raw fetch).

**Step 2: Write the translation utility**

```typescript
/**
 * Google Cloud Translation API v2 utility
 * Uses the REST API directly to avoid heavy SDK dependency.
 */

const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY
const BASE_URL = "https://translation.googleapis.com/language/translate/v2"

interface TranslateResult {
  translatedText: string
  detectedSourceLanguage?: string
}

/**
 * Translate a single text string to the target language.
 */
export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage: string = "en"
): Promise<string> {
  if (!GOOGLE_TRANSLATE_API_KEY) {
    throw new Error("GOOGLE_TRANSLATE_API_KEY is not set")
  }

  const response = await fetch(`${BASE_URL}?key=${GOOGLE_TRANSLATE_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: text,
      source: sourceLanguage,
      target: targetLanguage,
      format: "text",
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Google Translate API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.data.translations[0].translatedText
}

/**
 * Translate multiple texts in a single API call (batch).
 * Google Translate v2 supports up to 128 texts per request.
 */
export async function translateBatch(
  texts: string[],
  targetLanguage: string,
  sourceLanguage: string = "en"
): Promise<string[]> {
  if (!GOOGLE_TRANSLATE_API_KEY) {
    throw new Error("GOOGLE_TRANSLATE_API_KEY is not set")
  }

  // Google Translate v2 supports up to 128 segments per request
  const BATCH_SIZE = 128
  const results: string[] = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)

    const response = await fetch(`${BASE_URL}?key=${GOOGLE_TRANSLATE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: batch,
        source: sourceLanguage,
        target: targetLanguage,
        format: "text",
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Google Translate API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    const translated = data.data.translations.map(
      (t: TranslateResult) => t.translatedText
    )
    results.push(...translated)
  }

  return results
}

/**
 * Fetch the list of supported languages from Google Translate.
 */
export async function getSupportedLanguages(): Promise<
  { language: string; name: string }[]
> {
  if (!GOOGLE_TRANSLATE_API_KEY) {
    throw new Error("GOOGLE_TRANSLATE_API_KEY is not set")
  }

  const response = await fetch(
    `${BASE_URL}/languages?key=${GOOGLE_TRANSLATE_API_KEY}&target=en`,
    { method: "GET" }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Google Translate API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.data.languages
}
```

**Step 3: Commit**

```bash
git add lib/google-translate.ts package.json package-lock.json
git commit -m "feat: add Google Translate API utility module"
```

---

## Task 3: API routes — Language CRUD

**Files:**
- Create: `app/api/languages/route.ts` (GET list, POST add)
- Create: `app/api/languages/[code]/route.ts` (PATCH toggle, DELETE remove)
- Create: `app/api/languages/supported/route.ts` (GET supported list)

**Step 1: Write `app/api/languages/route.ts`**

```typescript
/**
 * GET /api/languages — List all added languages
 * POST /api/languages — Add a new language + bulk translate all bot messages
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isSuperAdmin } from "@/lib/auth/api-auth"
import { supabaseAdmin } from "@/lib/supabase"
import { translateBatch } from "@/lib/google-translate"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Super admin required" }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from("enabled_languages")
      .select("*")
      .order("sort_order")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ languages: data })
  } catch (error) {
    console.error("[Languages API] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Super admin required" }, { status: 403 })
    }

    const body = await request.json()
    const { language_code, language_name, native_name } = body

    if (!language_code || !language_name) {
      return NextResponse.json(
        { error: "language_code and language_name are required" },
        { status: 400 }
      )
    }

    // Check if language already exists
    const { data: existing } = await supabaseAdmin
      .from("enabled_languages")
      .select("id")
      .eq("language_code", language_code)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: "Language already added" },
        { status: 409 }
      )
    }

    // Check max 5 enabled
    const { count } = await supabaseAdmin
      .from("enabled_languages")
      .select("id", { count: "exact", head: true })
      .eq("is_enabled", true)

    if ((count ?? 0) >= 5) {
      return NextResponse.json(
        { error: "Maximum 5 languages can be enabled. Disable one first." },
        { status: 400 }
      )
    }

    // 1. Insert the language
    const { data: lang, error: langError } = await supabaseAdmin
      .from("enabled_languages")
      .insert({
        language_code,
        language_name,
        native_name: native_name || null,
        is_enabled: true,
      })
      .select()
      .single()

    if (langError) {
      return NextResponse.json({ error: langError.message }, { status: 500 })
    }

    // 2. Fetch all bot messages
    const { data: messages, error: msgError } = await supabaseAdmin
      .from("bot_messages")
      .select("message_key, default_text, custom_text")

    if (msgError || !messages) {
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
    }

    // 3. Translate all messages (use custom_text if set, else default_text)
    const textsToTranslate = messages.map(
      (m) => m.custom_text ?? m.default_text
    )

    const translated = await translateBatch(textsToTranslate, language_code)

    // 4. Insert translations
    const rows = messages.map((m, i) => ({
      message_key: m.message_key,
      language_code,
      translated_text: translated[i],
      is_auto_translated: true,
    }))

    const { error: insertError } = await supabaseAdmin
      .from("bot_message_translations")
      .insert(rows)

    if (insertError) {
      console.error("[Languages API] Translation insert error:", insertError)
      // Language was added but translations failed — still return success with warning
      return NextResponse.json({
        language: lang,
        warning: "Language added but some translations may have failed",
      })
    }

    return NextResponse.json({ language: lang, translations_count: rows.length })
  } catch (error) {
    console.error("[Languages API] POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

**Step 2: Write `app/api/languages/[code]/route.ts`**

```typescript
/**
 * PATCH /api/languages/[code] — Toggle language enabled status
 * DELETE /api/languages/[code] — Remove language and all translations
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isSuperAdmin } from "@/lib/auth/api-auth"
import { supabaseAdmin } from "@/lib/supabase"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Super admin required" }, { status: 403 })
    }

    const { code } = await params
    const body = await request.json()
    const { is_enabled } = body

    if (typeof is_enabled !== "boolean") {
      return NextResponse.json(
        { error: "is_enabled must be a boolean" },
        { status: 400 }
      )
    }

    // If enabling, check max 5
    if (is_enabled) {
      const { count } = await supabaseAdmin
        .from("enabled_languages")
        .select("id", { count: "exact", head: true })
        .eq("is_enabled", true)

      if ((count ?? 0) >= 5) {
        return NextResponse.json(
          { error: "Maximum 5 languages can be enabled at once" },
          { status: 400 }
        )
      }
    }

    const { data, error } = await supabaseAdmin
      .from("enabled_languages")
      .update({ is_enabled, updated_at: new Date().toISOString() })
      .eq("language_code", code)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Language not found" }, { status: 404 })
    }

    return NextResponse.json({ language: data })
  } catch (error) {
    console.error("[Languages API] PATCH error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Super admin required" }, { status: 403 })
    }

    const { code } = await params

    // Delete translations first (cascade should handle this, but be explicit)
    await supabaseAdmin
      .from("bot_message_translations")
      .delete()
      .eq("language_code", code)

    // Delete the language
    const { error } = await supabaseAdmin
      .from("enabled_languages")
      .delete()
      .eq("language_code", code)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Languages API] DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

**Step 3: Write `app/api/languages/supported/route.ts`**

```typescript
/**
 * GET /api/languages/supported — Fetch Google Translate supported languages
 */

import { NextResponse } from "next/server"
import { isSuperAdmin } from "@/lib/auth/api-auth"
import { getSupportedLanguages } from "@/lib/google-translate"

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
```

**Step 4: Commit**

```bash
git add app/api/languages/
git commit -m "feat: add language CRUD and supported languages API routes"
```

---

## Task 4: API routes — Translation CRUD

**Files:**
- Create: `app/api/languages/[code]/translations/route.ts` (GET all translations for a language)
- Create: `app/api/languages/[code]/translations/[key]/route.ts` (PATCH update translation)
- Create: `app/api/languages/[code]/translations/[key]/retranslate/route.ts` (POST re-translate)

**Step 1: Write `app/api/languages/[code]/translations/route.ts`**

```typescript
/**
 * GET /api/languages/[code]/translations
 * Returns all translations for a language, grouped by flow_group.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isSuperAdmin } from "@/lib/auth/api-auth"
import { supabaseAdmin } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Super admin required" }, { status: 403 })
    }

    const { code } = await params

    // Fetch bot messages with their translations for this language
    const { data: messages, error: msgError } = await supabaseAdmin
      .from("bot_messages")
      .select("message_key, flow_group, label, description, default_text, custom_text, variables, sort_order")
      .order("flow_group")
      .order("sort_order")

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 500 })
    }

    const { data: translations, error: transError } = await supabaseAdmin
      .from("bot_message_translations")
      .select("message_key, translated_text, is_auto_translated, updated_at")
      .eq("language_code", code)

    if (transError) {
      return NextResponse.json({ error: transError.message }, { status: 500 })
    }

    // Build a lookup map for translations
    const transMap = new Map(
      translations?.map((t) => [t.message_key, t]) || []
    )

    // Merge and group by flow_group
    const grouped: Record<string, any[]> = {}
    for (const msg of messages || []) {
      const trans = transMap.get(msg.message_key)
      const entry = {
        ...msg,
        english_text: msg.custom_text ?? msg.default_text,
        translated_text: trans?.translated_text || "",
        is_auto_translated: trans?.is_auto_translated ?? true,
        translation_updated_at: trans?.updated_at || null,
      }

      if (!grouped[msg.flow_group]) {
        grouped[msg.flow_group] = []
      }
      grouped[msg.flow_group].push(entry)
    }

    return NextResponse.json({ translations: grouped })
  } catch (error) {
    console.error("[Translations API] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

**Step 2: Write `app/api/languages/[code]/translations/[key]/route.ts`**

```typescript
/**
 * PATCH /api/languages/[code]/translations/[key]
 * Update the translated_text for a specific message in a specific language.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isSuperAdmin, verifyAdminAccess } from "@/lib/auth/api-auth"
import { supabaseAdmin } from "@/lib/supabase"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; key: string }> }
) {
  try {
    const { authenticated, adminUser } = await verifyAdminAccess()

    if (!authenticated || adminUser?.role !== "super_admin") {
      return NextResponse.json({ error: "Super admin required" }, { status: 403 })
    }

    const { code, key } = await params
    const body = await request.json()
    const { translated_text } = body

    if (typeof translated_text !== "string") {
      return NextResponse.json(
        { error: "translated_text must be a string" },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("bot_message_translations")
      .update({
        translated_text,
        is_auto_translated: false,
        updated_at: new Date().toISOString(),
        updated_by: adminUser!.id,
      })
      .eq("message_key", key)
      .eq("language_code", code)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Translation not found" }, { status: 404 })
    }

    return NextResponse.json({ translation: data })
  } catch (error) {
    console.error("[Translations API] PATCH error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

**Step 3: Write `app/api/languages/[code]/translations/[key]/retranslate/route.ts`**

```typescript
/**
 * POST /api/languages/[code]/translations/[key]/retranslate
 * Re-translate a single message from English using Google Translate.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isSuperAdmin } from "@/lib/auth/api-auth"
import { supabaseAdmin } from "@/lib/supabase"
import { translateText } from "@/lib/google-translate"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; key: string }> }
) {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Super admin required" }, { status: 403 })
    }

    const { code, key } = await params

    // Get the English text
    const { data: msg, error: msgError } = await supabaseAdmin
      .from("bot_messages")
      .select("default_text, custom_text")
      .eq("message_key", key)
      .single()

    if (msgError || !msg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    const englishText = msg.custom_text ?? msg.default_text
    const translated = await translateText(englishText, code)

    // Upsert the translation
    const { data, error } = await supabaseAdmin
      .from("bot_message_translations")
      .upsert(
        {
          message_key: key,
          language_code: code,
          translated_text: translated,
          is_auto_translated: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "message_key,language_code" }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ translation: data })
  } catch (error) {
    console.error("[Translations API] Retranslate error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

**Step 4: Commit**

```bash
git add app/api/languages/
git commit -m "feat: add translation CRUD and retranslate API routes"
```

---

## Task 5: Modify `getMessage()` to support languages

**Files:**
- Modify: `lib/webhook/messages.ts:54-81` (the `getMessage` function)

**Step 1: Update the `getMessage` function**

Add a third `language?` parameter. When a language is provided and isn't `undefined`, query `bot_message_translations` for the translated text. Fall back to English if not found.

```typescript
/**
 * Get a message by key with variable interpolation and optional language.
 * Priority:
 *   1. If language provided: bot_message_translations for that language
 *   2. custom_text (from bot_messages)
 *   3. default_text (from bot_messages)
 *   4. Hardcoded MESSAGE_DEFAULTS fallback
 *
 * @param key - The message key (use MSG constants)
 * @param variables - Optional key-value pairs for {variable} interpolation
 * @param language - Optional language code (e.g., "ur", "ar"). Undefined = English.
 * @returns The resolved message string
 */
export async function getMessage(
  key: MessageKey,
  variables?: Record<string, string | number | undefined>,
  language?: string
): Promise<string> {
  let text: string | undefined

  // If a non-English language is requested, try the translations table
  if (language) {
    try {
      const { data } = await supabaseAdmin
        .from("bot_message_translations")
        .select("translated_text")
        .eq("message_key", key)
        .eq("language_code", language)
        .single()

      if (data?.translated_text) {
        text = data.translated_text
      }
    } catch {
      // Fall through to English
    }
  }

  // Fall back to English (existing logic)
  if (!text) {
    const cache = await loadMessages()
    const cached = cache.get(key)

    if (cached) {
      text = cached.custom_text ?? cached.default_text
    } else {
      text = MESSAGE_DEFAULTS[key] ?? key
    }
  }

  // Interpolate variables
  if (variables) {
    for (const [varName, value] of Object.entries(variables)) {
      text = text.replace(
        new RegExp(`\\{${varName}\\}`, "g"),
        String(value ?? "")
      )
    }
  }

  return text
}
```

**Important:** The `supabaseAdmin` import already exists in this file (line 7). No new import needed.

**Step 2: Commit**

```bash
git add lib/webhook/messages.ts
git commit -m "feat: add language parameter to getMessage for multilingual support"
```

---

## Task 6: Add `language` to conversation state

**Files:**
- Modify: `lib/webhook/types.ts:69-82` (UserState interface)

**Step 1: Add `language` field to `UserState`**

Add `language?: string` to the `UserState` interface at `lib/webhook/types.ts:82` (before the closing brace):

```typescript
export interface UserState {
  step: string
  type?: FlowType
  date?: string
  slots?: TimeSlot[]
  complaint?: ComplaintData
  cancelItems?: any[]
  statusItems?: any[]
  staff?: StaffData
  staffList?: any[]
  booking?: any
  bookingList?: any[]
  visitor?: VisitorData
  language?: string
}
```

**Step 2: Commit**

```bash
git add lib/webhook/types.ts
git commit -m "feat: add language field to UserState for multilingual flow"
```

---

## Task 7: Add language selection to the router

**Files:**
- Modify: `lib/webhook/router.ts` (the main routing logic)

**Step 1: Add helper to fetch enabled languages**

Add a cached query at the top of `router.ts` (after imports) to check if any languages are enabled:

```typescript
import { supabaseAdmin } from "@/lib/supabase"

/**
 * Get enabled languages. Returns empty array if none enabled.
 */
async function getEnabledLanguages(): Promise<
  { language_code: string; language_name: string; native_name: string | null }[]
> {
  try {
    const { data } = await supabaseAdmin
      .from("enabled_languages")
      .select("language_code, language_name, native_name")
      .eq("is_enabled", true)
      .order("sort_order")

    return data || []
  } catch {
    return []
  }
}
```

**Step 2: Modify the "0" command handler in `processMessage`**

Replace lines 62-66 in `router.ts`:

```typescript
// OLD:
if (isMainMenuCommand(trimmedMessage)) {
  clearState(phoneNumber)
  return await getMainMenu(profile.name)
}

// NEW:
if (isMainMenuCommand(trimmedMessage)) {
  clearState(phoneNumber)

  // Check if any languages are enabled
  const enabledLanguages = await getEnabledLanguages()

  if (enabledLanguages.length > 0) {
    // Build language selection menu
    const options = [
      "1. English",
      ...enabledLanguages.map(
        (lang, i) =>
          `${i + 2}. ${lang.native_name || lang.language_name} (${lang.language_name})`
      ),
    ].join("\n")

    setState(phoneNumber, { step: "language_selection" })

    return `🌐 *Select your language:*\n\n${options}\n\nReply 1-${enabledLanguages.length + 1}`
  }

  return await getMainMenu(profile.name)
}
```

**Step 3: Add language selection handling in the state routing block**

After the existing check at line 69 (`if (userState.step === "initial" || userState.step === "main_menu")`), add a new block before it:

```typescript
// Handle language selection
if (userState.step === "language_selection") {
  const enabledLanguages = await getEnabledLanguages()
  const choice = parseInt(trimmedMessage, 10)

  if (choice === 1) {
    // English selected — no language in state
    clearState(phoneNumber)
    return await getMainMenu(profile.name)
  }

  const langIndex = choice - 2
  if (langIndex >= 0 && langIndex < enabledLanguages.length) {
    const selectedLang = enabledLanguages[langIndex]
    setState(phoneNumber, {
      step: "initial",
      language: selectedLang.language_code,
    })
    return await getMainMenu(profile.name, selectedLang.language_code)
  }

  // Invalid choice
  return `Please reply with a number between 1 and ${enabledLanguages.length + 1}`
}
```

**Step 4: Thread language through all handleMainMenu calls**

Update `handleMainMenu` to accept and pass `language`:

```typescript
async function handleMainMenu(
  message: string,
  profile: Profile,
  phoneNumber: string,
  language?: string
): Promise<string> {
  // ... existing switch cases, but pass language to every function call
}
```

And update the call in `processMessage` (line 70):

```typescript
// OLD:
return await handleMainMenu(trimmedMessage, profile, phoneNumber)

// NEW:
return await handleMainMenu(trimmedMessage, profile, phoneNumber, userState.language)
```

**Step 5: Thread language through the flow handler switch**

Pass `language` from `userState.language` through to each handler in the switch block. The handlers already receive `userState`, so they can access `userState.language` directly. No change needed here — handlers will read `userState.language` internally.

However, update the `handleBackCommand` to also thread language through `getMainMenu`:

```typescript
// In handleBackCommand, line 236:
// OLD:
return await getMainMenu(profile.name)

// NEW:
return await getMainMenu(profile.name, userState.language)
```

Also update the `getMessage` calls in `handleBackCommand` to pass language:

```typescript
// Line 231:
return await getMessage(nav.messageKey, undefined, userState.language)

// Lines 223-228 (complaint category back):
return await getMessage(MSG.COMPLAINT_CATEGORY_MENU, {
  apartment_emoji: COMPLAINT_CATEGORIES.apartment.emoji,
  apartment_label: COMPLAINT_CATEGORIES.apartment.label,
  building_emoji: COMPLAINT_CATEGORIES.building.emoji,
  building_label: COMPLAINT_CATEGORIES.building.label,
}, userState.language)
```

And the error catch at line 96:

```typescript
// OLD:
return await getMessage(MSG.ERROR_GENERIC)

// NEW:
return await getMessage(MSG.ERROR_GENERIC, undefined, userState?.language)
```

And the invalid menu at line 143:

```typescript
// OLD:
return await getMessage(MSG.INVALID_MAIN_MENU, { menu })

// NEW:
return await getMessage(MSG.INVALID_MAIN_MENU, { menu }, language)
```

**Step 6: Commit**

```bash
git add lib/webhook/router.ts
git commit -m "feat: add language selection flow and threading in webhook router"
```

---

## Task 8: Update `getMainMenu` and menu functions

**Files:**
- Modify: `lib/webhook/menu.ts`

**Step 1: Add `language` parameter to all menu functions**

Update each function that calls `getMessage()` to accept and pass an optional `language` parameter:

```typescript
export async function getMainMenu(name: string, language?: string): Promise<string> {
  const options = MAIN_MENU_OPTIONS.map(
    (opt) => `${opt.key}. ${opt.emoji} ${opt.label}`
  ).join("\n")

  return await getMessage(MSG.MAIN_MENU, { name, options }, language)
}

export async function getProfileInfo(profile: Profile, language?: string): Promise<string> {
  // ... same body, add language as 3rd arg to getMessage
  return await getMessage(MSG.PROFILE_INFO, { /* vars */ }, language)
}

export async function getMaintenanceStatus(profile: Profile, language?: string): Promise<string> {
  // ... same body
  let statusMessage = await getMessage(MSG.MAINTENANCE_STATUS, { /* vars */ }, language)
  if (!profile.maintenance_paid) {
    statusMessage += "\n\n" + await getMessage(MSG.MAINTENANCE_PAYMENT_DUE, undefined, language)
  }
  statusMessage += "\n\nReply *0* for menu"
  return statusMessage
}

export async function getEmergencyContacts(language?: string): Promise<string> {
  // ... same body, add language to getMessage
  return await getMessage(MSG.EMERGENCY_CONTACTS, { contacts }, language)
}

export async function getHallMenu(language?: string): Promise<string> {
  // ... same, add language
  return await getMessage(MSG.HALL_MENU, { options }, language)
}

export async function getStaffMenu(language?: string): Promise<string> {
  // ... same, add language
  return await getMessage(MSG.STAFF_MENU, { options }, language)
}

export async function getComplaintCategoryMenu(language?: string): Promise<string> {
  return await getMessage(MSG.COMPLAINT_CATEGORY_MENU, { /* vars */ }, language)
}

export async function getApartmentSubcategoryMenu(language?: string): Promise<string> {
  return await getMessage(MSG.COMPLAINT_APARTMENT_SUBCATEGORY, { /* vars */ }, language)
}

export async function getBuildingSubcategoryMenu(language?: string): Promise<string> {
  return await getMessage(MSG.COMPLAINT_BUILDING_SUBCATEGORY, { /* vars */ }, language)
}

export async function getStaffRoleMenu(language?: string): Promise<string> {
  return await getMessage(MSG.STAFF_ADD_ROLE, { /* vars */ }, language)
}
```

**Step 2: Commit**

```bash
git add lib/webhook/menu.ts
git commit -m "feat: add language parameter to all menu functions"
```

---

## Task 9: Thread language through all handler files

**Files:**
- Modify: `lib/webhook/handlers/complaint.ts` (~11 getMessage calls)
- Modify: `lib/webhook/handlers/booking.ts` (~15 getMessage calls)
- Modify: `lib/webhook/handlers/staff.ts` (~45 getMessage calls)
- Modify: `lib/webhook/handlers/hall.ts` (~38 getMessage calls)
- Modify: `lib/webhook/handlers/feedback.ts` (~5 getMessage calls)
- Modify: `lib/webhook/handlers/visitor.ts` (~12 getMessage calls)
- Modify: `lib/webhook/handlers/status.ts` (~14 getMessage calls)

**The pattern is the same for every file:**

1. Every function that calls `getMessage()` needs access to `userState.language`
2. For exported handler functions (e.g., `handleComplaintFlow`), they already receive `userState` — extract `const language = userState.language`
3. For exported initializer functions (e.g., `initializeComplaintFlow`), they don't have language context since they're called at menu selection time — add an optional `language?: string` parameter
4. Pass `language` as the third argument to every `getMessage(MSG.KEY, variables, language)` call

**Example pattern for `complaint.ts`:**

```typescript
export async function initializeComplaintFlow(
  phoneNumber: string,
  language?: string
): Promise<string> {
  setState(phoneNumber, {
    step: "complaint_category",
    type: "complaint",
    complaint: {},
    language,
  })

  return await getMessage(MSG.COMPLAINT_CATEGORY_MENU, {
    apartment_emoji: "🏠",
    apartment_label: "My Apartment Complaint",
    building_emoji: "🏢",
    building_label: "Building Complaint",
  }, language)
}

export async function handleComplaintFlow(
  message: string,
  profile: Profile,
  phoneNumber: string,
  userState: UserState
): Promise<string> {
  const choice = message.trim()
  const language = userState.language

  switch (userState.step) {
    case "complaint_category":
      return await handleCategorySelection(choice, phoneNumber, userState, language)
    // ... etc, pass language to all internal helpers
  }
}
```

**For each private helper function in each handler file**, add `language?: string` as a parameter and pass it to every `getMessage()` call.

**Update the router's `handleMainMenu` to pass language to all initializer calls:**

```typescript
case "1":
  return await initializeComplaintFlow(phoneNumber, language)
case "2":
  return await initializeStatusFlow(profile, phoneNumber, language)
// ... etc for all 10 menu options
```

**This is the most mechanical task — it's ~156 getMessage calls across 10 files.** Work through each file systematically, adding the language parameter.

**Step 1: Update `complaint.ts`**

Thread `language` through all `getMessage` calls. Don't change the `sendWhatsAppTemplate` calls (templates are always in their own language).

**Step 2: Update `booking.ts`**

Same pattern.

**Step 3: Update `staff.ts`**

Same pattern. This is the largest file (~45 calls).

**Step 4: Update `hall.ts`**

Same pattern (~38 calls).

**Step 5: Update `feedback.ts`**

Same pattern (~5 calls).

**Step 6: Update `visitor.ts`**

Same pattern (~12 calls).

**Step 7: Update `status.ts`**

Same pattern (~14 calls).

**Step 8: Commit**

```bash
git add lib/webhook/handlers/
git commit -m "feat: thread language parameter through all webhook handler getMessage calls"
```

---

## Task 10: Update the router to pass language to all handler initializers

**Files:**
- Modify: `lib/webhook/router.ts:103-145` (handleMainMenu function)

**Step 1: Update all initializer calls in handleMainMenu**

```typescript
async function handleMainMenu(
  message: string,
  profile: Profile,
  phoneNumber: string,
  language?: string
): Promise<string> {
  const choice = message.trim()

  switch (choice) {
    case "1":
      return await initializeComplaintFlow(phoneNumber, language)
    case "2":
      return await initializeStatusFlow(profile, phoneNumber, language)
    case "3":
      return await initializeCancelFlow(profile, phoneNumber, language)
    case "4":
      return await initializeStaffFlow(phoneNumber, language)
    case "5":
      return await getMaintenanceStatus(profile, language)
    case "6":
      return await initializeHallFlow(phoneNumber, language)
    case "7":
      return await initializeVisitorFlow(phoneNumber, language)
    case "8":
      return await getProfileInfo(profile, language)
    case "9":
      return await initializeFeedbackFlow(phoneNumber, language)
    case "10":
      return await getEmergencyContacts(language)
    default:
      const menu = await getMainMenu(profile.name, language)
      return await getMessage(MSG.INVALID_MAIN_MENU, { menu }, language)
  }
}
```

**Step 2: Update imports for menu functions that now have language param**

The imports at the top of router.ts (lines 11-15) already import `getMainMenu`, `getProfileInfo`, `getMaintenanceStatus`, `getEmergencyContacts` — no change needed, just the call sites.

**Step 3: Commit**

```bash
git add lib/webhook/router.ts
git commit -m "feat: pass language from state to all handler initializers in router"
```

---

## Task 11: Admin UI — Add "Languages" tab to Settings

**Files:**
- Modify: `components/admin/settings-form.tsx`

**Step 1: Add the Languages tab**

Add a `Globe` icon import from lucide-react (line 12):

```typescript
import { Settings, Save, Users, Calendar, MessageSquare, Send, Globe } from "lucide-react"
```

Change the TabsList grid from `grid-cols-4` to `grid-cols-5` (line 81):

```typescript
<TabsList className="grid w-full max-w-3xl grid-cols-5">
```

Add the new tab trigger after the WA Templates trigger (after line 97):

```typescript
<TabsTrigger value="languages" className="flex items-center gap-2">
    <Globe className="h-4 w-4" />
    Languages
</TabsTrigger>
```

Add the new tab content after the templates TabsContent (after line 151):

```typescript
<TabsContent value="languages" className="mt-6">
    <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
        <CardHeader>
            <CardTitle className="text-lg">Bot Languages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
                Enable multilingual support for the WhatsApp chatbot. When any language is enabled, residents will be prompted to select their language each time they access the main menu. Maximum 5 languages.
            </p>
            <Link href="/admin/settings/languages">
                <Button className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal hover:shadow-lg hover:shadow-manzhil-teal/30 transition-all">
                    <Globe className="h-4 w-4 mr-2" />
                    Open Language Settings
                </Button>
            </Link>
        </CardContent>
    </Card>
</TabsContent>
```

**Step 2: Commit**

```bash
git add components/admin/settings-form.tsx
git commit -m "feat: add Languages tab to admin settings form"
```

---

## Task 12: Admin UI — Language Settings Page

**Files:**
- Create: `app/admin/settings/languages/page.tsx`
- Create: `components/admin/language-settings.tsx`

**Step 1: Create the page wrapper**

`app/admin/settings/languages/page.tsx`:

```typescript
"use client"

import { LanguageSettings } from "@/components/admin/language-settings"

export default function LanguagesPage() {
  return <LanguageSettings />
}
```

**Step 2: Create the `LanguageSettings` component**

`components/admin/language-settings.tsx` — This is a substantial component. Key sections:

1. **Header** with back button (same as bot-messages-editor)
2. **Add Language section**: Combobox that searches `/api/languages/supported`, "Add & Translate" button
3. **Languages list**: Cards for each added language showing name, native name, toggle, Edit Translations link, Remove button
4. **Loading/translating states**

The component should:
- Fetch languages from `GET /api/languages` on mount
- Fetch supported languages from `GET /api/languages/supported` for the combobox
- Call `POST /api/languages` to add + translate
- Call `PATCH /api/languages/[code]` to toggle
- Call `DELETE /api/languages/[code]` to remove (with confirmation dialog)

Follow the same styling patterns as `bot-messages-editor.tsx`: manzhil-teal gradients, shadow cards, Loader2 spinners, toast notifications.

**Step 3: Commit**

```bash
git add app/admin/settings/languages/ components/admin/language-settings.tsx
git commit -m "feat: add language settings admin page with add, toggle, and remove"
```

---

## Task 13: Admin UI — Translation Editor Page

**Files:**
- Create: `app/admin/settings/languages/[code]/page.tsx`
- Create: `components/admin/translation-editor.tsx`

**Step 1: Create the page wrapper**

`app/admin/settings/languages/[code]/page.tsx`:

```typescript
"use client"

import { use } from "react"
import { TranslationEditor } from "@/components/admin/translation-editor"

export default function TranslationEditorPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = use(params)
  return <TranslationEditor languageCode={code} />
}
```

**Step 2: Create the `TranslationEditor` component**

`components/admin/translation-editor.tsx` — Modeled after `bot-messages-editor.tsx` but with two text areas per card:

1. **English original** (read-only, for reference, lighter background)
2. **Translated text** (editable textarea)
3. **"Auto-translated" badge** if `is_auto_translated === true`
4. **Variable chips** (same as bot-messages editor)
5. **Save button** → `PATCH /api/languages/[code]/translations/[key]`
6. **Re-translate button** → `POST /api/languages/[code]/translations/[key]/retranslate`

Same tabbed layout with flow groups (Main Menu, Complaints, Bookings, etc.).

Data source: `GET /api/languages/[code]/translations`

**Step 3: Commit**

```bash
git add app/admin/settings/languages/[code]/ components/admin/translation-editor.tsx
git commit -m "feat: add translation editor page for per-language message editing"
```

---

## Task 14: Build verification

**Step 1: Run the build**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors.

**Step 2: Fix any type errors**

Common issues to watch for:
- Missing `language` parameter in handler function signatures
- Type mismatch on `getMessage` calls (variables param may need explicit `undefined` when only passing language)

**Step 3: Commit any fixes**

```bash
git add .
git commit -m "fix: resolve build errors from multilingual feature"
```

---

## Task 15: Manual testing checklist

**Step 1: Set up environment**

- Add `GOOGLE_TRANSLATE_API_KEY` to `.env`
- Run the SQL schema from `sql/database-multilingual-schema.sql` in Supabase SQL Editor

**Step 2: Test admin UI**

- [ ] Navigate to `/admin/settings` → see "Languages" tab
- [ ] Click "Open Language Settings" → see language settings page
- [ ] Search for "Urdu" → see it in dropdown
- [ ] Click "Add & Translate" → see loading state → language appears with toggle ON
- [ ] Verify ~115 translations were created in the database
- [ ] Toggle off → toggle on → translations still exist (no re-translation)
- [ ] Click "Edit Translations" → see translation editor with English + translated text
- [ ] Edit a translation → save → verify `is_auto_translated` is false
- [ ] Click "Re-translate" on edited message → verify it resets to auto-translated
- [ ] Add 5 languages → try to add 6th → see error
- [ ] Remove a language → confirm → verify translations deleted

**Step 3: Test WhatsApp bot flow**

- [ ] With 0 languages enabled: send "0" → see main menu directly (no language prompt)
- [ ] Enable Urdu: send "0" → see language selection menu (English + Urdu)
- [ ] Select "1" (English) → see main menu in English
- [ ] Send "0" again → see language selection again
- [ ] Select "2" (Urdu) → see main menu in Urdu
- [ ] Register a complaint in Urdu → all prompts should be in Urdu
- [ ] Send "0" mid-flow → should clear state and show language selection again

**Step 4: Commit**

```bash
git add .
git commit -m "feat: complete multilingual WhatsApp chatbot implementation"
```

---

## Summary of all files changed/created

**New files (10):**
- `sql/database-multilingual-schema.sql`
- `lib/google-translate.ts`
- `app/api/languages/route.ts`
- `app/api/languages/[code]/route.ts`
- `app/api/languages/supported/route.ts`
- `app/api/languages/[code]/translations/route.ts`
- `app/api/languages/[code]/translations/[key]/route.ts`
- `app/api/languages/[code]/translations/[key]/retranslate/route.ts`
- `app/admin/settings/languages/page.tsx`
- `app/admin/settings/languages/[code]/page.tsx`
- `components/admin/language-settings.tsx`
- `components/admin/translation-editor.tsx`

**Modified files (12):**
- `lib/webhook/messages.ts` (add language param to getMessage)
- `lib/webhook/types.ts` (add language to UserState)
- `lib/webhook/router.ts` (language selection flow + threading)
- `lib/webhook/menu.ts` (add language param to all functions)
- `lib/webhook/handlers/complaint.ts` (thread language)
- `lib/webhook/handlers/booking.ts` (thread language)
- `lib/webhook/handlers/staff.ts` (thread language)
- `lib/webhook/handlers/hall.ts` (thread language)
- `lib/webhook/handlers/feedback.ts` (thread language)
- `lib/webhook/handlers/visitor.ts` (thread language)
- `lib/webhook/handlers/status.ts` (thread language)
- `components/admin/settings-form.tsx` (add Languages tab)

**Environment:**
- Add `GOOGLE_TRANSLATE_API_KEY` to `.env`
