# Multilingual WhatsApp Chatbot — Design Document

**Date:** 2026-02-17
**Status:** Approved

## Overview

Add multilingual support to the WhatsApp chatbot. Super admins can enable up to 5 languages from the admin settings. When any language is enabled, users are prompted to select their language every time they send "0" before seeing the main menu. The entire bot flow then executes in the selected language.

English is always available as the default. If no languages are toggled on, the bot behaves exactly as it does today.

## Key Decisions

- **Translation source:** Google Cloud Translation API (bulk-translate all ~115 messages when a language is added)
- **Language persistence:** None — user selects language every time they send "0"
- **Language list:** Full Google Translate supported languages (~130), searchable in admin UI
- **Max enabled:** 5 languages at a time (enforced in API)
- **Admin editing:** Auto-translated messages can be manually corrected by the super admin
- **Toggle behavior:** Toggling off sets `is_enabled = false`; translations remain in DB. Toggling back on reuses them with no re-translation cost.

## Database Design

### New table: `enabled_languages`

```sql
CREATE TABLE enabled_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code VARCHAR(10) NOT NULL UNIQUE,
  language_name VARCHAR(100) NOT NULL,
  native_name VARCHAR(100),
  is_enabled BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### New table: `bot_message_translations`

```sql
CREATE TABLE bot_message_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_key VARCHAR(100) NOT NULL REFERENCES bot_messages(message_key),
  language_code VARCHAR(10) NOT NULL REFERENCES enabled_languages(language_code),
  translated_text TEXT NOT NULL,
  is_auto_translated BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES admin_users(id),
  UNIQUE(message_key, language_code)
);
```

## Admin UI

### Language Settings Page (`/admin/settings/languages`)

- Linked from a new "Languages" tab in the settings form (same pattern as Bot Messages and WA Templates)
- Super admin only

**Add Language section:**
- Searchable combobox querying Google Translate's supported languages
- "Add & Translate" button triggers bulk translation of all ~115 messages
- Loading state during translation

**Enabled Languages section:**
- List of added languages with toggle switch, "Edit Translations" button, "Remove" button
- Toggle enforces max-5 enabled limit
- Remove deletes language + all translations (with confirmation)

**Translations Editor (per language):**
- Same tabbed layout as bot-messages editor (Main Menu, Complaints, Bookings, etc.)
- Each card shows English original (read-only) + translated text (editable)
- "Auto-translated" badge for unedited translations
- Save, Re-translate (single message) buttons

## API Routes

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| GET | `/api/languages` | List all added languages | `verifyAdminAccess('settings')` |
| POST | `/api/languages` | Add language + bulk translate | `isSuperAdmin()` |
| PATCH | `/api/languages/[code]` | Toggle enabled status | `isSuperAdmin()` |
| DELETE | `/api/languages/[code]` | Remove language + translations | `isSuperAdmin()` |
| GET | `/api/languages/[code]/translations` | Get translations for a language | `isSuperAdmin()` |
| PATCH | `/api/languages/[code]/translations/[key]` | Update single translation | `isSuperAdmin()` |
| POST | `/api/languages/[code]/translations/[key]/retranslate` | Re-translate single message | `isSuperAdmin()` |
| GET | `/api/languages/supported` | Fetch Google Translate language list | `isSuperAdmin()` |

## Webhook Bot Flow Changes

### Current flow (no languages enabled):
```
User sends "0" → Clear state → Show main menu
```

### New flow (1+ languages enabled):
```
User sends "0" → Clear state → Show language selection → User picks number → Show main menu in selected language → Entire flow in that language
```

### Language selection message (auto-generated):
```
Select your language:

1. English
2. اردو (Urdu)
3. العربية (Arabic)

Reply 1-3
```

### Language carries through the flow via conversation state:
- `UserState.language` field added (e.g., `"ur"`, `"ar"`, or `undefined` for English)
- Every `getMessage()` call passes the language from state
- Language persists in state until user sends "0" again

## Changes to Existing Code

### `lib/webhook/messages.ts`
- `getMessage(key, variables?, language?)` — add optional third parameter
- If language provided, query `bot_message_translations` for that key + language
- Fall back to English if translation not found
- Cache translations with same 5-min TTL

### `lib/webhook/state.ts`
- Add `language?: string` to `UserState` interface

### `lib/webhook/router.ts`
- On "0": check if any languages are enabled (cached query)
  - If yes: set state to `{ step: "language_selection" }`, return language menu
  - If no: return main menu directly (unchanged)
- On `step === "language_selection"`: map number to language code, set in state, return main menu in that language

### `lib/webhook/menu.ts`
- `getMainMenu(name, language?)` — pass language to `getMessage()`

### All handler files (`lib/webhook/handlers/*.ts`)
- Thread `userState.language` through every `getMessage()` call (~50-60 call sites across 7 files)

### `components/admin/settings-form.tsx`
- Add 5th tab: "Languages" with card + link to `/admin/settings/languages`

### Environment
- Add `GOOGLE_TRANSLATE_API_KEY` to `.env`

## Cost

- Google Cloud Translation: ~$0.60 per language for all ~115 messages (one-time per language)
- No per-user-interaction cost — translations are served from DB
