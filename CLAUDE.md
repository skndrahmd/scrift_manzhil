# CLAUDE.md

## IMPORTANT: Start Here

**Before reading any files, read the knowledge graph at `graphify-out/graph.json`.** Use it to understand codebase structure, file locations, and relationships. Only read individual files when explicitly asked. Do not browse the file tree unless the user asks.

---

## Project Overview

**Manzhil by Scrift** — Building Management System for apartment complexes. Manages units, residents, hall bookings, maintenance payments, complaints, visitor passes, parcel tracking, and accounting. Integrates Twilio (WhatsApp notifications + conversational bot) and Supabase.

**Tech Stack:** Next.js 14 (App Router) · TypeScript · Supabase (PostgreSQL + RLS) · Radix UI + Tailwind + Recharts · Twilio WhatsApp API · jsPDF · PapaParse · Zod + React Hook Form · Google Cloud Translate v2 · Vitest · Vercel

---

## Dev Commands

```bash
npm run dev          # development server
npm run build        # production build
npm run lint         # lint
npm run test         # run tests once
npm run test:watch   # watch mode
npm run test:coverage

# Test API endpoints
curl http://localhost:3000/api/ping
curl -X POST http://localhost:3000/api/cron/daily-reports -H "x-cron-key: $CRON_SECRET"
curl -X POST http://localhost:3000/api/cron/maintenance-reminder -H "x-cron-key: $CRON_SECRET"
curl -X POST http://localhost:3000/api/cron/pending-complaints -H "x-cron-key: $CRON_SECRET"
```

---

## Critical Rules

### Supabase Clients
```typescript
import { supabase, supabaseAdmin } from '@/lib/supabase'
// supabase      → user-facing ops (respects RLS)
// supabaseAdmin → admin ops (bypasses RLS) — required for most API routes
```
Always handle errors: `const { data, error } = await supabase.from(...); if (error) { ... }`

### API Route Auth
```typescript
import { verifyAdminAccess, isSuperAdmin } from '@/lib/auth'
const { authenticated, error } = await verifyAdminAccess('bookings') // use correct page key
if (!authenticated) return NextResponse.json({ error }, { status: 401 })
// Super-admin only: if (!(await isSuperAdmin())) return 403
```
Page keys (13): `dashboard` `residents` `units` `bookings` `complaints` `visitors` `parcels` `analytics` `feedback` `accounting` `broadcast` `settings` `amenities` — `settings` is super_admin only.

### Timezone — CRITICAL
Always use `getPakistanTime()` / `formatDateTimePK()` from `@/lib/date`. **Never use `new Date()`** for date comparisons or "today" calculations — Vercel runs UTC, Pakistan is UTC+5.

### WhatsApp Bot Messages
- **Never hardcode bot response strings** — use `getMessage(MSG.KEY, variables?, language?)` from `lib/webhook/messages.ts`
- **Never hardcode menu labels** — use `getLabels(MSG.LABELS_KEY, language?)` from `lib/webhook/messages.ts`
- Use `{variable}` interpolation syntax. Use `{max_option}` not hardcoded `Reply 1-N`.
- 5-min in-memory cache; call `clearMessageCache()` after admin saves.

### Twilio Templates
- **Never hardcode template SIDs** — always in env vars. Use `getTemplateSid()` from `lib/twilio/templates.ts`.
- Use helper functions in `lib/twilio/notifications/` — don't call Twilio API directly.

### Database Schema
- **Always update `database-complete-schema.sql`** when adding tables, columns, indexes, RLS policies, triggers, or seed data — it's the single source of truth for new instance setup.
- Use `unit_id` when creating maintenance payments or profiles.

### Cron Routes
All cron routes validate `CRON_SECRET` via `x-cron-key` header — never skip this.

### Broadcast Limits
250 messages/day · soft limit 50 recipients (warning) · hard limit 100 (confirmation required). Constants in `lib/supabase/constants.ts → BROADCAST_LIMITS`.

### Imports
Use barrel imports: `@/lib/supabase`, `@/lib/auth`, `@/lib/date`, `@/lib/twilio`, etc. Path alias `@/*` = project root.

---

## Do / Don't

**Don't:**
- Use `supabase` (anon) for admin operations — use `supabaseAdmin`
- Hardcode Twilio template SIDs or bot response strings
- Use `new Date()` for date comparisons — use `getPakistanTime()`
- Use `getSession()` for server-side auth — use `getUser()`
- Skip `verifyAdminAccess()` on any admin API route
- Create cron routes without `CRON_SECRET` validation
- Add new DB tables without updating `database-complete-schema.sql`
- Hardcode `Reply 1-N` in bot messages — use `{max_option}`
- Add flow groups to `bot-messages-editor.tsx` without also adding to `translation-editor.tsx`
- Strip `{variable}` placeholders when translating — `lib/google-translate.ts` preserves them automatically
- Exceed broadcast rate limits (WhatsApp ban risk)

**Do:**
- Use `supabaseAdmin` to bypass RLS in API routes
- Always check `error` from Supabase queries
- Use `formatDateTimePK()` for all user-facing date displays
- Use `getMessage()` / `getLabels()` with `language` param for multilingual support
- Store new translatable menu labels as `\n`-delimited strings with `labels.` prefix key
- Test permissions with both `super_admin` and `staff` roles

---

## Key File References

| What | Where |
|------|-------|
| Complete DB schema (source of truth) | `database-complete-schema.sql` |
| Bot message defaults | `lib/webhook/message-defaults.ts` |
| Bot message keys | `lib/webhook/message-keys.ts` |
| Twilio template SIDs | `lib/twilio/templates.ts` |
| Broadcast rate limit constants | `lib/supabase/constants.ts` |
| Pakistan timezone utils | `lib/date/formatting.ts` |
| Admin notification recipients | `lib/admin/notifications.ts` |
| Service layer (business logic) | `lib/services/` |
| Env var reference | `.env.example` |
| Developer docs | `docs/` |
| Knowledge graph (read first!) | `graphify-out/graph.json` |
