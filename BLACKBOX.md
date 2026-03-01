# BLACKBOX.md

This file provides guidance to Blackbox AI when working with code in this repository.

## Project Overview

**Manzhil by Scrift** is a comprehensive Building Management System (BMS) for apartment complexes built with **Next.js 14 (App Router)**, **TypeScript**, **Supabase (PostgreSQL with RLS)**, and **Twilio WhatsApp Business API**.

It manages units, residents, hall bookings, maintenance payments, complaints, visitor passes, parcel tracking, broadcast messaging, accounting, amenities management, prayer times, payment verifications, and a multilingual WhatsApp conversational bot with dynamic main menu options.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, SSR) |
| Language | TypeScript (strict mode) |
| Database | Supabase (PostgreSQL with Row Level Security) |
| UI | React 18 + Radix UI + Tailwind CSS 3 + Recharts |
| Messaging | Twilio WhatsApp Business API |
| PDF | jsPDF + jspdf-autotable |
| CSV | PapaParse |
| Validation | Zod + React Hook Form |
| Translation | Google Cloud Translation API v2 |
| Testing | Vitest + Testing Library + jsdom |
| Deployment | Vercel (primary) or Docker on VPS |

### Core Architectural Concept

**Units (apartments) are the primary entity**, not residents. A unit can have multiple residents; one is marked `is_primary_resident`. Maintenance payments, staff assignments, and other records link to units. Residents link to their unit via `unit_id`.

## Building and Running

```bash
# Install dependencies
npm install

# Development server (http://localhost:3000)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Linting
npm run lint

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Health check
curl http://localhost:3000/api/ping
```

### Environment Setup

```bash
cp .env.example .env.local
```

**Required env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`, 20+ Twilio template SIDs. See `.env.example` for the full list.

**Optional:** `GOOGLE_TRANSLATE_API_KEY` (for multilingual bot features).

### Database Setup

Run `database-complete-schema.sql` in the Supabase SQL Editor to create all core tables, RLS policies, indexes, triggers, and default data. Additionally run these schema files for new features:

| File | Purpose |
|------|---------|
| `database-amenities-schema.sql` | Amenities management |
| `database-prayer-times-schema.sql` | Prayer times management (5 daily prayers) |
| `database-payment-methods.sql` | Payment method configuration |
| `database-payment-verifications.sql` | Payment receipt verification system |
| `database-menu-options-schema.sql` | Dynamic main menu options |
| `database-menu-option-translations.sql` | Menu option translations table |
| `database-multilingual-schema.sql` | Multilingual tables |
| `database-seed-bot-messages.sql` | ~125 bot messages |
| `database-seed-whatsapp-templates.sql` | 20 WhatsApp templates |
| `database-seed-label-messages.sql` | 10 translatable label keys |
| `database-seed-payment-messages.sql` | Payment receipt flow messages |

### Docker Deployment

Multi-stage Dockerfile at project root. Uses Node.js 20 Alpine, standalone Next.js output, non-root user, and a health check on `/api/ping`.

```bash
docker build -t manzhil-bms .
docker run -p 3000:3000 --env-file .env.local manzhil-bms
```

## Project Structure

```
app/
├── admin/                  # Admin dashboard (13 page groups + settings sub-pages)
│   └── settings/           # Super admin only: bot-messages, whatsapp-templates, languages, amenities, menu-options
├── api/                    # 55+ API endpoints
│   ├── auth/               # OTP authentication (send-otp, verify-otp)
│   ├── units/              # Unit CRUD, bulk-import, check-duplicates, toggle-primary
│   ├── residents/          # Bulk-import, check-duplicates, welcome-message
│   ├── bookings/           # update-payment-status, send-reminder
│   ├── maintenance/        # update-status, bulk-reminder, ensure-months
│   ├── complaints/         # update-status
│   ├── broadcast/          # send, usage
│   ├── parcels/            # list, upload, notify, update-status, collect
│   ├── visitors/           # notify-arrival
│   ├── accounting/         # categories, expenses, summary, transactions
│   ├── admin/staff/        # Staff CRUD & permissions
│   ├── admin/payment-methods/ # Payment method management
│   ├── bot-messages/       # Bot message customization API
│   ├── whatsapp-templates/ # Template management + test-send
│   ├── languages/          # Language CRUD, translations, retranslation
│   ├── amenities/          # Amenity CRUD
│   ├── prayer-times/       # Prayer times CRUD
│   ├── payment-methods/    # Public payment methods for bot
│   ├── payment-verifications/ # Payment receipt verification
│   ├── menu-options/       # Dynamic main menu options CRUD
│   │   ├── [id]/           # Single menu option CRUD
│   │   │   └── translations/ # Per-option translations
│   │   ├── retranslate/    # Retranslate all menu labels
│   │   └── translations/   # Bulk translation management
│   ├── cron/               # daily-reports, maintenance-reminder, pending-complaints
│   └── webhook/route.ts    # WhatsApp conversational bot endpoint
├── booking-invoice/        # Public invoice PDF pages
├── maintenance-invoice/
├── daily-report/
├── login/                  # Phone-based OTP auth
└── policies/

lib/
├── supabase/               # DB clients (supabase, supabaseAdmin), types, constants
├── auth/                   # verifyAdminAccess(), isSuperAdmin(), auth context
├── twilio/                 # Client, templates, send logic, notifications/
├── webhook/                # WhatsApp bot: router, state, menu, handlers/, messages
├── services/               # Shared business logic (booking, complaint, maintenance, broadcast, payment-verification, resident-type-sync)
├── pdf/                    # PDF generation, CSV export, invoice, reports, theme
├── date/                   # Pakistan timezone (PST/UTC+5) utilities
├── admin/                  # Notification recipient fetchers
├── bulk-import/            # Resident CSV import
├── bulk-import-units/      # Unit CSV import
├── google-translate.ts     # Google Translate API v2 with placeholder protection
├── validation/             # Input validation utilities
└── utils.ts                # Tailwind cn() helper

components/
├── ui/                     # 50+ Radix UI primitives
├── admin/                  # Feature-specific admin components (tables, editors, modals)
│   ├── amenities-manager.tsx
│   ├── menu-options-manager.tsx
│   ├── payment-methods-manager.tsx
│   ├── prayer-times-manager.tsx
│   └── payment-verifications-table.tsx
├── accounting/             # Financial dashboard components
└── *.tsx                   # Root-level shared components (auth-provider, theme-provider, etc.)

tests/                      # Vitest tests
├── api/                    # API route tests
├── services/               # Service layer tests
├── webhook/                # Bot handler tests
├── bulk-import/            # Import logic tests
├── date/                   # Date utility tests
├── mocks/                  # Shared test mocks
└── setup.ts                # Test setup file

sql/
├── database-complete-schema.sql     # Core schema (22 tables)
├── database-amenities-schema.sql   # Amenities management
├── database-prayer-times-schema.sql # Prayer times (5 daily prayers)
├── database-payment-methods.sql     # Payment methods
├── database-payment-verifications.sql # Payment receipt verification
├── database-menu-options-schema.sql # Dynamic menu options
├── database-menu-option-translations.sql # Menu option translations
├── database-multilingual-schema.sql # Multilingual support
├── database-seed-bot-messages.sql   # ~125 bot messages
├── database-seed-whatsapp-templates.sql # 20 WhatsApp templates
├── database-seed-label-messages.sql # 10 translatable label keys
├── database-seed-payment-messages.sql # Payment flow messages
└── seed-template-bodies.sql        # Template body references

middleware.ts               # Auth & RBAC route protection
```

## Development Conventions

### Path Alias

All imports use `@/*` mapped to the project root:

```typescript
import { supabaseAdmin } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { verifyAdminAccess } from '@/lib/auth'
```

### Database Client Selection

```typescript
// User-facing operations (respects RLS):
import { supabase } from '@/lib/supabase'

// Admin operations (bypasses RLS) — use in API routes and cron jobs:
import { supabaseAdmin } from '@/lib/supabase'
```

### API Route Auth Guard

Every protected admin API route must start with this guard on **every** HTTP method handler:

```typescript
import { verifyAdminAccess } from '@/lib/auth'

export async function POST(req: Request) {
  const { authenticated, adminUser, error } = await verifyAdminAccess('bookings')
  if (!authenticated) {
    return NextResponse.json({ error }, { status: 401 })
  }
  // proceed...
}
```

The 13 page keys for RBAC: `dashboard`, `residents`, `units`, `bookings`, `complaints`, `visitors`, `parcels`, `analytics`, `feedback`, `accounting`, `broadcast`, `settings`, `amenities`.

### Error Handling

Always check for errors after every Supabase query:

```typescript
const { data, error } = await supabaseAdmin.from('profiles').select('*').eq('unit_id', unitId)
if (error) {
  console.error('Failed to fetch profiles:', error)
  return NextResponse.json({ error: error.message }, { status: 500 })
}
```

### Date and Time — Pakistan Standard Time (UTC+5)

**Critical:** Always use `getPakistanTime()` from `lib/date` instead of `new Date()` for any "today" calculations or date comparisons. `new Date()` returns UTC on Vercel, which is 5 hours behind Pakistan.

```typescript
import { formatDateTimePK, getPakistanTime } from '@/lib/date'

const display = formatDateTimePK(someDate)  // "15 Feb 2026, 3:30 PM"
const today = getPakistanTime()             // Current time in Pakistan
```

### WhatsApp Bot Messages

Never hardcode bot response strings. Use `getMessage()` from `lib/webhook/messages.ts`:

```typescript
import { getMessage } from '@/lib/webhook/messages'
import { MSG } from '@/lib/webhook/message-keys'

const text = await getMessage(MSG.MAIN_MENU, { name: resident.name }, language)
```

For translatable menu labels, use `getLabels()`:

```typescript
import { getLabels } from '@/lib/webhook/messages'
const labels = await getLabels(MSG.LABELS_MAIN_MENU_OPTIONS, language)
```

### Twilio Templates

Template SIDs resolve in order: DB (`whatsapp_templates` table) → env var → static fallback. Never hardcode SIDs. Use the helper functions in `lib/twilio/notifications/`.

### Adding New WhatsApp Bot Flows

When adding a new conversational flow to the WhatsApp bot, you **must** update all of the following files:

1. **Message Keys** (`lib/webhook/message-keys.ts`):
   - Add new `MSG.YOUR_FLOW_*` constants

2. **Message Defaults** (`lib/webhook/message-defaults.ts`):
   - Add default text for each new message key

3. **Handler** (`lib/webhook/handlers/your-flow.ts`):
   - Create `initializeYourFlow()` and `handleYourFlow()` functions
   - Use `getMessage(MSG.YOUR_KEY, { variable }, language)` for all responses
   - Export both functions from `lib/webhook/handlers/index.ts`

4. **Config** (`lib/webhook/config.ts`):
   - Add to `MAIN_MENU_OPTIONS` array with key, label, and emoji
   - Add handler mapping to `FALLBACK_HANDLER_MAP`

5. **Router** (`lib/webhook/router.ts`):
   - Add to `ACTION_HANDLERS` record mapping `handler_type` to handler functions
   - The main menu routing now uses dynamic dispatch via `getMenuActionMap()`

6. **Database** (`sql/database-menu-options-schema.sql`):
   - Add INSERT statement for new menu option with unique `action_key`
   - Use `ON CONFLICT DO NOTHING` for idempotency

7. **Bot Messages Editor UI** (`components/admin/bot-messages-editor.tsx`):
   - Add to `FLOW_GROUP_LABELS`: `your_flow: "Your Flow Name"`
   - Add to `FLOW_GROUP_ORDER`: `"your_flow"` (in desired position)

8. **Translation Editor UI** (`components/admin/translation-editor.tsx`):
   - Add to `FLOW_GROUP_LABELS`: `your_flow: "Your Flow Name"`
   - Add to `FLOW_GROUP_ORDER`: `"your_flow"` (in desired position)
   - **Important:** Both editor components must have matching flow groups

**Example flow_group naming:** Use lowercase underscore format (e.g., `amenity`, `hall`, `staff`).

### Dynamic Main Menu Options

The WhatsApp bot main menu is now **database-driven** with the `menu_options` table. Each menu option has:
- `action_key` — Unique identifier (e.g., "complaint", "status", "maintenance_status")
- `label` — Display text (e.g., "Register Complaint")
- `emoji` — Icon (e.g., "📝")
- `is_enabled` — Enable/disable toggle
- `sort_order` — Display order (1 = first)
- `handler_type` — Maps to handler functions in `lib/webhook/handlers/`

**Handler Types** (12 total):
| handler_type | Handler File | Flow |
|-------------|--------------|------|
| `complaint` | handlers/complaint.ts | Complaint registration |
| `status` | handlers/status.ts | Check complaint status |
| `cancel` | handlers/cancel.ts | Cancel complaint |
| `staff` | handlers/staff.ts | Staff management |
| `maintenance_status` | handlers/booking.ts | Check maintenance dues |
| `hall` | handlers/hall.ts | Community hall bookings |
| `visitor` | handlers/visitor.ts | Visitor pass |
| `profile_info` | handlers/status.ts | View profile |
| `feedback` | handlers/feedback.ts | Submit feedback |
| `emergency_contacts` | handlers/status.ts | Emergency contacts |
| `payment` | handlers/payment.ts | Submit payment receipt |
| `amenity` | handlers/amenity.ts | Amenities & prayer times |

**Config Functions** (`lib/webhook/config.ts`):
- `getMenuOptions(language?)` — Returns enabled options only, in sort_order, with sequential keys (1, 2, 3...). Optionally translated if language is provided.
- `getAllMenuOptions()` — Returns all options for admin UI
- `getMenuActionMap()` — Returns Map of key position → handler_type for routing

**API Routes** (`app/api/menu-options/`):
- `GET /api/menu-options` — List all (super_admin)
- `PUT /api/menu-options` — Bulk update sort_order/is_enabled
- `PATCH /api/menu-options/[id]` — Update single label/emoji/is_enabled
- `GET /api/menu-options/[id]/translations` — Get translations for a menu option
- `PUT /api/menu-options/[id]/translations` — Update translation for a language
- `POST /api/menu-options/retranslate` — Retranslate all stale menu translations

**Admin UI** (`components/admin/menu-options-manager.tsx`):
- Reorder with up/down arrows
- Toggle enable/disable
- Inline edit label and emoji
- WhatsApp preview panel

### Menu Option Translations

Menu options support multilingual translations via the `menu_option_translations` table. When a new language is enabled, all menu option labels are auto-translated.

**Table Structure** (`menu_option_translations`):
- `menu_option_id` — FK to menu_options
- `language_code` — FK to enabled_languages
- `translated_label` — Translated text
- `is_stale` — True when source label changes, needs retranslation
- `is_auto_translated` — True if translated by Google Translate API

**Translation Workflow**:
1. When a menu option's `label` is updated, all its translations are marked `is_stale = true`
2. Admin can retranslate stale translations via `POST /api/menu-options/retranslate`
3. `getMenuOptions(language)` returns translated labels if available

**Trigger**: `trigger_mark_translations_stale` automatically marks translations stale when the source label changes.

### File Naming

- Pages: `page.tsx` (Next.js convention)
- API routes: `route.ts` (Next.js convention)
- Components: `kebab-case.tsx` (e.g., `bookings-table.tsx`)
- Library modules: `kebab-case.ts` (e.g., `api-auth.ts`)
- Barrel exports: `index.ts` in each module folder

### Component Patterns

Admin pages follow a server/client split:

```
page.tsx (Server Component)
  → Fetches initial data from Supabase
  → Passes data to client component

components/admin/feature-table.tsx (Client Component)
  → Receives data as props
  → Manages local state (filters, modals, selections)
  → Calls API routes for mutations
  → Uses Radix UI components from components/ui/
```

## Testing

Tests use **Vitest** with **jsdom** environment and **Testing Library**. Test files live in `tests/` and follow the pattern `tests/**/*.test.ts(x)`.

```bash
npm run test              # Run all tests once
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report (v8 provider)
```

Coverage targets `lib/**` and `app/api/**`, excluding `lib/supabase/types.ts`.

The test setup file is `tests/setup.ts`. Shared mocks are in `tests/mocks/`.

### Testing API Endpoints

```bash
# Health check
curl http://localhost:3000/api/ping

# Test WhatsApp templates
curl http://localhost:3000/api/test-twilio

# Trigger cron jobs (include x-cron-key header if CRON_SECRET is set)
curl -X POST http://localhost:3000/api/cron/daily-reports -H "x-cron-key: $CRON_SECRET"
curl -X POST http://localhost:3000/api/cron/maintenance-reminder -H "x-cron-key: $CRON_SECRET"
curl -X POST http://localhost:3000/api/cron/pending-complaints -H "x-cron-key: $CRON_SECRET"
```

## Cron Jobs (Vercel)

Configured in `vercel.json`. All 3 cron routes validate `CRON_SECRET` via the `x-cron-key` header.

| Route | Schedule | Purpose |
|-------|----------|---------|
| `/api/cron/daily-reports` | Daily at 5 AM | Generate and send daily report PDFs |
| `/api/cron/maintenance-reminder` | Daily at 2 AM | Send reminders; on 1st of month create invoices |
| `/api/cron/pending-complaints` | Every 6 hours | Notify admins about unresolved complaints |
| `/api/ping` | Every 5 min | Health check / keep warm |

## Key Do's and Don'ts

### Don't

- Use `supabase` (anon client) for admin operations that need to bypass RLS — use `supabaseAdmin`
- Hardcode Twilio template SIDs — store in env vars or DB
- Use `new Date()` for "today" calculations — use `getPakistanTime()` from `lib/date`
- Use `getSession()` for server-side auth — use `getUser()` instead
- Create API routes without `verifyAdminAccess()` permission checks
- Create cron routes without `CRON_SECRET` validation
- Hardcode WhatsApp bot response strings — use `getMessage()` from `lib/webhook/messages.ts`
- Hardcode menu labels — use `getLabels()` for translatable labels
- Hardcode `Reply 1-N` in bot messages — use `{max_option}` variable instead
- Forget `unit_id` when creating maintenance payments or profiles
- Modify RLS policies without testing both anon and service_role clients
- Add flow groups to `bot-messages-editor.tsx` without also adding to `translation-editor.tsx`
- Forget to add new menu options to all three places: config, database, and handler mapping

### Do

- Use `supabaseAdmin` for operations that bypass RLS
- Use `formatDateTimePK()` for all user-facing date displays
- Always check `error` from Supabase queries
- Use `verifyAdminAccess(pageKey)` for all protected admin API routes
- Test with both `super_admin` and `staff` roles
- Link residents and maintenance payments to units via `unit_id`
- Pass the resident's `language` parameter through to `getMessage()` and `getLabels()`
- Use barrel imports from module `index.ts` files (e.g., `@/lib/supabase`, `@/lib/auth`, `@/lib/date`)

## Additional Documentation

- `docs/DEVELOPER_GUIDE.md` — Comprehensive developer onboarding guide
- `docs/new-instance-setup.md` — Guide for setting up a new Manzhil instance
- `docs/presentation-client-deck.md` — Client presentation deck
- `docs/presentation-designer-brief.md` — Designer brief for presentations
- `docs/marketing/` — Marketing materials
- `docs/plans/` — Planning documents
- `changes.md` — Codebase cleanup and reorganization changelog
- `database-complete-schema.sql` — Full DB schema (22 tables)
- `database-seed-bot-messages.sql` — Seed data for ~125 bot messages
- `database-seed-whatsapp-templates.sql` — Seed data for 20 WhatsApp templates
- `sql/database-seed-label-messages.sql` — Seed data for 10 translatable label keys
- `sql/database-seed-payment-messages.sql` — Seed data for payment flow messages
- `sql/database-multilingual-schema.sql` — Schema for multilingual tables
- `sql/database-menu-options-schema.sql` — Dynamic main menu options
- `sql/database-menu-option-translations.sql` — Menu option translations
- `sql/database-prayer-times-schema.sql` — Prayer times management
- `.env.example` — Complete list of all environment variables
