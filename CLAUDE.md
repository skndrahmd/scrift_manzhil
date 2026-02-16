# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **Manzhil by Scrift**, a comprehensive Building Management System (BMS) for apartment complexes. It manages units, residents, hall bookings, maintenance payments, complaints, visitor passes, parcel tracking, and accounting operations. The system integrates with Twilio for WhatsApp notifications (including a conversational webhook bot) and Supabase for data management.

**Key Features:**
- **Unit-centric data model** — units are first-class entities; residents link to units via `unit_id`
- Admin RBAC (Role-Based Access Control) with granular permissions
- WhatsApp conversational bot (webhook-driven resident self-service)
- Broadcast messaging system with rate limiting
- Visitor pass management with CNIC verification
- Parcel & delivery tracking with image uploads
- Bulk import for both units and residents via CSV
- Enhanced analytics dashboard with PDF & CSV reports
- Configurable per-admin notification preferences

**Tech Stack:**
- **Framework:** Next.js 14 (App Router, SSR)
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL with RLS)
- **UI:** React + Radix UI + Tailwind CSS + Recharts
- **Messaging:** Twilio WhatsApp Business API
- **PDF Generation:** jsPDF + jspdf-autotable
- **CSV Parsing:** PapaParse
- **Deployment:** Vercel (primary) or Hostinger VPS + Docker

## Development Commands

### Essential Commands
```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Linting
npm run lint
```

### Testing API Endpoints
```bash
# Health check
curl http://localhost:3000/api/ping

# Test WhatsApp templates
curl http://localhost:3000/api/test-twilio

# Manually trigger cron jobs (for testing)
# Include x-cron-key header if CRON_SECRET is set in .env
curl -X POST http://localhost:3000/api/cron/daily-reports -H "x-cron-key: $CRON_SECRET"
curl -X POST http://localhost:3000/api/cron/maintenance-reminder -H "x-cron-key: $CRON_SECRET"
curl -X POST http://localhost:3000/api/cron/pending-complaints -H "x-cron-key: $CRON_SECRET"
```

## Architecture Overview

### Application Structure
```
app/
├── admin/                  # Admin dashboard pages
│   ├── layout.tsx          # Admin layout with sidebar
│   ├── loading.tsx         # Loading skeleton
│   ├── page.tsx            # Residents management (root admin page)
│   ├── dashboard/          # Main dashboard
│   ├── units/              # Unit management (V3)
│   │   ├── page.tsx        # Units listing
│   │   └── [id]/page.tsx   # Unit detail page (with invoice download buttons)
│   ├── residents/
│   │   └── [id]/page.tsx   # Resident detail page
│   ├── bookings/           # Hall booking management
│   ├── complaints/         # Complaint management
│   ├── visitors/           # Visitor pass management
│   ├── parcels/            # Parcel tracking
│   ├── broadcast/          # Broadcast messaging
│   ├── analytics/          # Analytics dashboard
│   ├── accounting/         # Financial management
│   ├── feedback/           # Resident feedback
│   ├── settings/           # Admin settings & RBAC (super_admin only)
│   │   ├── bot-messages/   # Bot message customization editor page
│   │   └── whatsapp-templates/ # WhatsApp template manager page
│   └── unauthorized/       # Access denied page
├── api/
│   ├── auth/               # OTP authentication
│   │   ├── send-otp/       # Send OTP to resident phone
│   │   └── verify-otp/     # Verify OTP code
│   ├── units/              # Unit management APIs (V3)
│   │   ├── route.ts        # CRUD operations
│   │   ├── bulk-import/    # Bulk import units from CSV
│   │   ├── check-duplicates/ # Duplicate unit detection
│   │   └── toggle-primary/ # Toggle primary resident flag
│   ├── residents/          # Resident management APIs
│   │   ├── bulk-import/    # Bulk import residents from CSV
│   │   ├── check-duplicates/ # Duplicate phone detection
│   │   └── welcome-message/ # Send welcome WhatsApp
│   ├── admin/staff/        # Staff CRUD & permissions
│   │   ├── route.ts
│   │   └── [id]/
│   │       ├── route.ts
│   │       └── permissions/route.ts
│   ├── bookings/           # Booking APIs
│   │   ├── send-reminder/
│   │   └── update-payment-status/
│   ├── broadcast/          # Broadcast messaging APIs
│   │   ├── send/
│   │   └── usage/
│   ├── complaints/         # Complaint APIs
│   │   └── update-status/
│   ├── maintenance/        # Maintenance payment APIs
│   │   ├── update-status/
│   │   ├── bulk-reminder/
│   │   └── ensure-months/
│   ├── accounting/         # Financial APIs
│   │   ├── categories/
│   │   ├── expenses/
│   │   ├── summary/
│   │   └── transactions/
│   ├── parcels/            # Parcel tracking APIs
│   │   ├── list/
│   │   ├── upload/
│   │   ├── notify/
│   │   └── update-status/
│   ├── visitors/           # Visitor APIs
│   │   └── notify-arrival/
│   ├── cron/               # Scheduled job endpoints
│   │   ├── daily-reports/
│   │   ├── maintenance-reminder/
│   │   ├── pending-complaints/
│   │   └── utils.ts
│   ├── bot-messages/        # Bot message customization API
│   │   ├── route.ts         # GET all messages (super_admin)
│   │   └── [key]/route.ts   # PATCH update custom_text
│   ├── whatsapp-templates/  # WhatsApp template management API
│   │   ├── route.ts         # GET list all, POST create draft
│   │   ├── [key]/route.ts   # PATCH update, DELETE draft
│   │   └── test-send/route.ts # POST test send template
│   ├── webhook/route.ts    # WhatsApp conversational bot endpoint
│   ├── twilio/             # WhatsApp template sender
│   │   └── send-template/
│   ├── ping/route.ts       # Health check
│   └── test-twilio/        # Template testing
├── booking-invoice/[id]/   # Public booking invoice PDF
├── maintenance-invoice/[id]/ # Public maintenance invoice PDF
├── daily-report/[id]/      # Public daily report PDF
├── login/                  # Authentication page
└── policies/               # Privacy/terms route

lib/
├── supabase.ts             # Database clients, types & constants
├── api-auth.ts             # API route authentication helpers
├── auth-server.ts          # Server-side auth utilities
├── auth-client.ts          # Client-side auth utilities
├── auth-context.tsx        # Auth React context provider
├── middleware-cache.ts     # HMAC-signed permission cookie cache
├── twilio/                 # Twilio WhatsApp integration
│   ├── client.ts           # Twilio client singleton
│   ├── send.ts             # Message sending logic
│   ├── templates.ts        # Template SID registry
│   ├── formatters.ts       # Message formatting
│   ├── types.ts            # Twilio-specific types
│   ├── index.ts            # Re-exports
│   └── notifications/      # Category-specific notification modules
│       ├── account.ts      # Welcome, block, reactivate
│       ├── booking.ts      # Booking confirmations & reminders
│       ├── broadcast.ts    # Broadcast announcements
│       ├── complaint.ts    # Complaint status updates
│       ├── maintenance.ts  # Invoice & payment confirmations
│       ├── parcel.ts       # Parcel arrival notifications
│       ├── visitor.ts      # Visitor arrival notifications
│       └── index.ts        # Re-exports
├── webhook/                # WhatsApp conversational bot system
│   ├── index.ts            # Module re-exports
│   ├── router.ts           # Message routing logic
│   ├── state.ts            # Conversation state management
│   ├── menu.ts             # Menu display builders
│   ├── profile.ts          # Profile lookup & data queries
│   ├── config.ts           # Bot configuration & constants
│   ├── types.ts            # Webhook-specific types
│   ├── utils.ts            # Formatting & validation helpers
│   ├── messages.ts         # DB-backed message loader with 5-min cache
│   ├── message-keys.ts     # TypeScript constants for all ~115 message keys
│   ├── message-defaults.ts # Hardcoded fallback defaults for all messages
│   └── handlers/           # Conversation flow handlers
│       ├── index.ts
│       ├── booking.ts      # Hall booking flow
│       ├── complaint.ts    # Complaint registration flow
│       ├── feedback.ts     # Feedback submission flow
│       ├── hall.ts         # Hall info & availability
│       ├── staff.ts        # Staff management flow
│       ├── status.ts       # Status check flow
│       └── visitor.ts      # Visitor pass flow
├── admin/
│   └── notifications.ts    # Dynamic admin notification recipients
├── bulk-import/            # Resident CSV import logic
│   ├── index.ts
│   ├── parser.ts
│   └── validation.ts
├── bulk-import-units/      # Unit CSV import logic
│   ├── index.ts
│   ├── parser.ts
│   └── validation.ts
├── accounting-reports.ts   # PDF report generation (5 report types)
├── csv-export.ts           # CSV export for all report types
├── reporting.ts            # Period filtering (all, daily, weekly, monthly, yearly)
├── pdf-theme.ts            # Shared PDF styling & helpers
├── pdf.ts                  # PDF utility functions
├── invoice.ts              # Invoice PDF generation
├── dateUtils.ts            # Date/time formatting (Pakistan timezone)
├── time-utils.ts           # Additional time utilities
└── utils.ts                # General utility functions

components/
├── ui/                     # Radix UI components (50+ components)
├── admin/                  # Admin-specific components
│   ├── sidebar.tsx
│   ├── analytics-dashboard.tsx
│   ├── bookings-table.tsx
│   ├── broadcast-form.tsx
│   ├── bulk-import-modal.tsx         # Resident CSV import modal
│   ├── bulk-import-units-modal.tsx   # Unit CSV import modal
│   ├── complaints-table.tsx
│   ├── feedback-list.tsx
│   ├── parcels-table.tsx
│   ├── residents-table.tsx
│   ├── settings-form.tsx
│   ├── staff-management.tsx
│   ├── visitors-table.tsx
│   ├── bot-messages-editor.tsx  # Bot message customization editor
│   └── whatsapp-template-manager.tsx # WhatsApp template management UI
├── accounting/             # Financial dashboard components
│   ├── accounting-tab.tsx
│   ├── expenses-manager.tsx
│   ├── financial-summary-cards.tsx
│   ├── revenue-charts.tsx
│   ├── transactions-table.tsx  # Includes invoice view buttons for income rows
│   └── index.ts
├── auth-provider.tsx
├── mobile-nav.tsx
├── settings-dialog.tsx
├── theme-provider.tsx
└── user-menu.tsx

middleware.ts               # Authentication & RBAC route protection
```

### Key Architectural Patterns

**1. Units as First-Class Entities**
- The `units` table represents apartments; `profiles` (residents) link via `unit_id`
- Multiple residents per unit with `is_primary_resident` flag
- `maintenance_payments` also link to `unit_id`
- Admin pages: `/admin/units` (listing) and `/admin/units/[id]` (detail)
- API routes: `/api/units/` (CRUD, bulk-import, check-duplicates, toggle-primary)
- Page key `"units"` added to RBAC system

**2. Authentication Flow**
- Uses Supabase Auth with email authentication (admins) and phone/OTP authentication (residents)
- OTP routes: `/api/auth/send-otp` and `/api/auth/verify-otp`
- Middleware (`middleware.ts`) protects all routes except public endpoints
- Public routes: `/login`, `/api/*`, invoice pages, `/policies`, `/admin/unauthorized`
- Uses `getUser()` (not `getSession()`) for secure server-side authentication

**3. Admin RBAC**
- Two roles: `super_admin` (full access) and `staff` (permission-based)
- Permissions stored in `admin_permissions` table per page
- API routes use `verifyAdminAccess(pageKey)` from `lib/api-auth.ts`
- Page keys (12 total):
  ```typescript
  PageKey = "dashboard" | "residents" | "units" | "bookings" | "complaints" |
            "visitors" | "parcels" | "analytics" | "feedback" | "accounting" |
            "broadcast" | "settings"
  ```
- Settings page restricted to super admins only

**4. Middleware Permission Caching**
- Permission results are cached in an HMAC-signed cookie (`x-admin-cache`) with 5-minute TTL
- Uses Web Crypto API (Edge Runtime compatible)
- Cookie payload: `{ userId, role, isActive, adminId, permissionKeys, expiresAt }`
- Signed with `SUPABASE_SERVICE_ROLE_KEY` as HMAC secret
- On cache miss or expiry, middleware queries DB and sets a fresh cookie
- On permission denial, middleware re-verifies from DB before redirecting (handles stale cache)

**5. Database Architecture**
- **Row Level Security (RLS)** enabled on all tables
- Service role client (`supabaseAdmin` from `lib/supabase.ts`) bypasses RLS for admin operations
- Regular client (`supabase`) for user-facing operations

**6. WhatsApp Integration**
- **Outbound notifications:** Uses Twilio Content Templates (HX SIDs stored in env vars) via `lib/twilio/` modules
- **Inbound webhook bot:** `lib/webhook/` handles resident conversations via WhatsApp
  - Menu-driven interaction (reply 1-10 for main menu options)
  - Conversation state management with flow handlers for complaints, bookings, visitors, parcels, feedback, staff
  - Processes incoming messages at `/api/webhook/` route
- Template SIDs configured in `.env` (see `.env.example` for full list)
- **Important:** All fallback messages use this format: "Hello, this is Manzhil by Scrift.\n\nHi {Resident Name}, your..." (system introduces itself in 3rd person, then addresses user in 2nd person)

**7. Broadcast Messaging System**
- Located in `app/api/broadcast/`
- Rate limiting constants in `BROADCAST_LIMITS` object in `lib/supabase.ts`:
  - `DAILY_MESSAGE_LIMIT`: 250 messages/day
  - `MESSAGE_DELAY_MS`: 3 seconds between messages
  - `BATCH_SIZE`: 20 messages per batch
  - `BATCH_DELAY_MS`: 30 seconds between batches
  - `MIN_BROADCAST_INTERVAL_MS`: 0 (cooldown disabled)
  - `SOFT_RECIPIENT_LIMIT`: 50 (show warning above this)
  - `HARD_RECIPIENT_LIMIT`: 100 (require confirmation above this)
- Usage tracked in `broadcast_logs` table
- Supports recipient selection (all, by block, individual)

**8. Cron Jobs (Automated Tasks)**
- Located in `app/api/cron/`
- **All 3 cron routes validate `CRON_SECRET`** via the `x-cron-key` request header. If `CRON_SECRET` env var is set, requests without a matching header return 401.
- **Vercel Cron Schedule** (from `vercel.json`):
  - `daily-reports` — Daily at 5 AM (`0 5 * * *`)
  - `maintenance-reminder` — Daily at 2 AM (`0 2 * * *`); on 1st of month creates invoices
  - `pending-complaints` — Every 6 hours (`0 */6 * * *`)
  - `ping` — Every 5 minutes (`*/5 * * * *`)
- **Inline confirmations** (sent directly when admin updates payment status, not via cron):
  - Maintenance confirmations are sent inline by `api/maintenance/update-status`
  - Booking confirmations are sent inline by `api/bookings/update-payment-status`
- Daily reports sent only to admins with `receive_daily_reports = true`

**9. Dynamic Admin Notification Recipients**
- `lib/admin/notifications.ts` provides three fetcher functions:
  - `getComplaintNotificationRecipients()` — admins with `receive_complaint_notifications = true`
  - `getReminderRecipients()` — admins with `receive_reminder_notifications = true`
  - `getAllNotificationRecipients()` — union of both above
- All functions query `admin_users` for active admins with non-null phone numbers
- Returns empty array if no recipients are configured

**10. PDF Generation & Reports**
- Uses jsPDF for server-side PDF rendering with shared theme (`lib/pdf-theme.ts`)
- `lib/accounting-reports.ts` — 5 PDF report types:
  - Income Statement
  - Collection Report
  - Expense Report
  - Outstanding Dues Report
  - Annual Summary
- `lib/csv-export.ts` — CSV export for all report types
- `lib/reporting.ts` — Period filtering: `"all" | "daily" | "weekly" | "monthly" | "yearly"`
- Invoice generation: `lib/pdf/invoice.ts`
  - `generateMaintenanceInvoicePdf(payment, summary?)` — returns `{ blob, fileName }`
  - `generateBookingInvoicePdf(booking)` — returns `{ blob, fileName }`
- Daily reports: `app/api/cron/daily-reports/`
- Public routes for PDF access (no auth required)
- **Admin inline downloads:** Unit detail page (`/admin/units/[id]`) has download buttons for maintenance and booking invoices (client-side PDF generation via `lib/pdf/invoice.ts`)

**11. Accounting Module**
- Unified transaction tracking system
- Types: booking income, maintenance income, other income, expenses, refunds
- Financial summaries and reports in `lib/accounting-reports.ts`
- Expense categories with icons and colors
- CSV export functionality for all report types
- Transactions table includes an Invoice column — for `booking_income` and `maintenance_income` rows with a `reference_id`, a button opens the public invoice page (`/maintenance-invoice/[id]` or `/booking-invoice/[id]`) in a new tab

**12. Realtime Features**
- Supabase Realtime configured for:
  - Complaints dashboard (live status updates)
  - Booking availability (live slot updates)
  - Resident profile changes
- Configuration in `lib/supabase.ts`: `eventsPerSecond: 10`

**13. Bot Message Customization**
- All ~115 WhatsApp bot messages are stored in the `bot_messages` database table
- Admin UI at `/admin/settings/bot-messages` (super_admin only) allows editing all messages without code changes
- Core module: `lib/webhook/messages.ts` with `getMessage(key, variables?)` function
- Messages use `{variable}` interpolation syntax (e.g., `{name}`, `{date}`, `{options}`)
- 5-minute in-memory cache (matches `SETTINGS_CACHE_DURATION`), cleared on admin save
- Falls back to hardcoded defaults in `lib/webhook/message-defaults.ts` if DB is unavailable
- Message keys defined as TypeScript constants in `lib/webhook/message-keys.ts` (`MSG.MAIN_MENU`, `MSG.HALL_BOOKING_DATE`, etc.)
- Flow groups (tabs in admin UI): `main_menu`, `complaint`, `booking`, `hall`, `staff`, `visitor`, `feedback`, `status`, `errors`, `navigation`
- API routes: `GET /api/bot-messages` (list all), `PATCH /api/bot-messages/[key]` (update/reset)
- Seed data: `database-seed-bot-messages.sql` (idempotent, uses `ON CONFLICT DO NOTHING`)

**14. WhatsApp Template Management**
- All 20 Twilio Content Template SIDs are managed via the `whatsapp_templates` database table
- Admin UI at `/admin/settings/whatsapp-templates` (super_admin only) — view triggers, edit SIDs, test send, create drafts
- `getTemplateSid()` in `lib/twilio/templates.ts` queries DB first, falls back to env vars
- Categories (tabs in UI): `account`, `maintenance`, `booking`, `complaint`, `parcel`, `visitor`, `broadcast`, `auth`, `admin`
- Each template stores: SID, env var name (fallback), JSONB variables metadata, trigger description, source file
- Draft templates (`is_draft = true`) can be created for future Twilio submission
- API routes: `GET/POST /api/whatsapp-templates`, `PATCH/DELETE /api/whatsapp-templates/[key]`, `POST /api/whatsapp-templates/test-send`
- Seed data: `database-seed-whatsapp-templates.sql` (idempotent, uses `ON CONFLICT DO NOTHING`)

## Important Development Guidelines

### Working with Supabase

**Always use the correct client:**
```typescript
// For user-facing operations (respects RLS)
import { supabase } from '@/lib/supabase'

// For admin operations (bypasses RLS)
import { supabaseAdmin } from '@/lib/supabase'
```

**Query patterns:**
```typescript
// Always include error handling
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)

if (error) {
  console.error('Error:', error)
  return NextResponse.json({ error: error.message }, { status: 500 })
}
```

### API Route Authentication

**For protected admin routes:**
```typescript
import { verifyAdminAccess, isSuperAdmin } from '@/lib/api-auth'

export async function GET() {
  // Check page-specific access
  const { authenticated, adminUser, error } = await verifyAdminAccess('bookings')

  if (!authenticated) {
    return NextResponse.json({ error }, { status: 401 })
  }

  // For super-admin only operations
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: 'Super admin required' }, { status: 403 })
  }

  // Proceed with operation...
}
```

### WhatsApp Template Guidelines

1. **Template SIDs must be in env vars** — Never hardcode them
2. **Variable names are case-sensitive** — Must match Twilio template exactly
3. **Use the helper functions** in `lib/twilio/` — Don't call Twilio API directly
4. **Test templates** at `/api/test-twilio` before deploying

Common template variables:
- Booking: `resident_name`, `booking_date`, `hall_type`, `amount`, `time_slot`
- Maintenance: `resident_name`, `amount`, `due_date`, `apartment_number`
- Complaints: `resident_name`, `complaint_id`, `category`, `status`
- Visitor: `resident_name`, `apartment_number`, `visit_date`
- Parcel: `resident_name`, `apartment_number`, `description`, `sender_name`
- Broadcast: `variable1`, `variable2` (title and body)

### Date and Time Handling

**CRITICAL:** This system uses **PST (Pakistan Standard Time, UTC+5)**
- All date conversions in `lib/dateUtils.ts` and `lib/time-utils.ts`
- Always use `formatDateTimePK()` for display formatting
- Database stores timestamps in UTC, convert for Pakistan timezone when displaying
- Booking slots calculated in local time (`lib/dateUtils.ts:generateTimeSlots()`)

## Environment Variables

Required variables (see `.env.example` for complete list):

**Supabase:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

**Twilio:**
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_NUMBER`
- 20+ template SIDs (see `.env.example`)
- `TWILIO_BROADCAST_ANNOUNCEMENT_TEMPLATE_SID`
- `TWILIO_OTP_TEMPLATE_SID`
- `TWILIO_STAFF_INVITATION_TEMPLATE_SID`

**App:**
- `NEXT_PUBLIC_APP_URL` (used for generating public links)
- `NODE_ENV` (development/production)

## Database Schema

Complete schema in `database-complete-schema.sql` — all 20 tables, RLS policies, indexes, triggers, and default data. Run once in Supabase SQL Editor for a fresh instance.

**Core Tables:**
- `units` — Apartment units with maintenance tracking
- `profiles` — Residents linked to units via `unit_id`, with `is_primary_resident` flag
- `maintenance_payments` — Monthly maintenance fee records (linked to both `profile_id` and `unit_id`)
- `bookings` — Hall booking records with payment tracking
- `booking_settings` — Hall configuration (timings, slots, charges)
- `complaints` — Complaint tracking with grouping support
- `feedback` — Resident feedback collection
- `staff` — Building staff records (linked to units)
- `daily_reports` — Generated PDF reports (stored as base64)

**Admin Tables:**
- `admin_users` — Admin accounts with roles (`super_admin`/`staff`) and notification preferences
- `admin_permissions` — Page-level access control per admin

**Feature Tables:**
- `visitor_passes` — Visitor tracking with CNIC storage
- `parcels` — Parcel/delivery tracking with images
- `broadcast_logs` — Broadcast message history and usage tracking

**Accounting Tables:**
- `transactions` — Unified income/expense tracking
- `expenses` — Detailed expense records
- `expense_categories` — Category definitions with icons

**Bot Customization Tables:**
- `bot_messages` — Customizable WhatsApp bot messages with default/custom text, variables, and flow grouping

**Template Management Tables:**
- `whatsapp_templates` — Twilio WhatsApp content template SIDs, variables, triggers, and metadata

**Additional Tables:**
- `admin_otp` — WhatsApp OTP codes for admin authentication

## Deployment

**Primary: Vercel (Serverless)**
- Cron jobs configured in `vercel.json`
- Automatic deployments from git push
- See `vercel.json` for cron schedules

**Alternative: Hostinger VPS + Docker**
- Docker compose file archived at `docs-archive/docker-compose.yml`
- Nginx config: `docs-archive/nginx.conf`
- Cron setup script: `docs-archive/setup-cron.sh`
- Setup guides in `docs-archive/setup-guides/`

## Common Tasks

### Adding a New Unit
1. Create unit in database via admin panel (`/admin/units`)
2. Add residents to the unit (link via `unit_id`)
3. Set one resident as `is_primary_resident`
4. Maintenance charges are tracked on the unit

### Bulk Import Units
1. Prepare CSV with columns: `apartment_number`, `floor_number` (optional), `unit_type` (optional), `maintenance_charges` (optional)
2. Use the bulk import button on the units page
3. Upload CSV and preview data
4. Confirm import — duplicates are skipped automatically

### Adding a New Resident
1. Create profile in database via admin panel
2. Link to a unit via `unit_id`
3. System automatically generates maintenance payment records
4. Welcome WhatsApp message sent via `lib/twilio/notifications/account.ts`

### Bulk Import Residents
1. Prepare CSV with columns: `name`, `phone_number`, `apartment_number`, `cnic` (optional), `building_block` (optional), `maintenance_charges` (optional)
2. Use the bulk import button on the residents page
3. Upload CSV and preview data
4. Toggle welcome messages on/off
5. Confirm import — duplicates are skipped automatically

### Sending Broadcast Messages
1. Navigate to Admin > Broadcast
2. Check daily usage limit (250 messages/day)
3. Select recipients (all, by block, or individual)
4. Enter title and body text
5. Send — messages are rate-limited automatically
6. View results summary after completion

### Managing Staff Permissions
1. Navigate to Admin > Settings (super admin only)
2. Add new staff member with email/password
3. Set role: `super_admin` or `staff`
4. For staff role, configure page-level permissions
5. Set notification preferences (complaints, reminders, daily reports)

### Creating a New Twilio Template
1. Create template in Twilio Console
2. Copy HX SID to `.env`
3. Add function in appropriate `lib/twilio/notifications/` module
4. Test at `/api/test-twilio`

### Customizing Bot Messages
1. Navigate to Admin > Settings > Bot Messages (super admin only)
2. Messages are organized in tabs by flow group (Main Menu, Complaints, Bookings, etc.)
3. Edit the text in any message card — variables like `{name}` and `{date}` are shown as clickable chips
4. Click "Save" to persist — the 5-minute message cache is automatically cleared
5. Click "Reset to Default" to revert a customized message to the original text
6. Seed data: Run `database-seed-bot-messages.sql` in Supabase SQL Editor for a fresh instance
7. To add a new message key: add to `message-keys.ts`, `message-defaults.ts`, seed SQL, and use `getMessage(MSG.KEY)` in handlers

### Modifying Booking Slots
1. Update `booking_settings` table in database
2. Slot calculations automatically update (see `lib/dateUtils.ts:generateTimeSlots()`)

## Path Aliases

Using TypeScript path alias: `@/*` maps to project root
```typescript
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
```

## Known Issues & Considerations

1. **WhatsApp template approval** — Templates must be approved by Meta before use
2. **RLS policies** — Be careful when modifying, test thoroughly with both clients
3. **Timezone handling** — Always use `getPakistanTime()` from `lib/date` instead of `new Date()` for any date comparisons or "today" calculations. `new Date()` returns UTC on Vercel, which is wrong for Pakistan (UTC+5).
4. **PDF generation** — Memory-intensive, may need optimization for large reports
5. **Broadcast rate limits** — 250 messages/day, soft limit at 50 recipients, hard limit at 100
6. **Permission cache** — HMAC-signed cookie with 5-min TTL; on denial, middleware re-verifies from DB
7. **SUPABASE_SERVICE_ROLE_KEY is required** — Middleware redirects to `/admin/unauthorized` if this env var is missing. It is not optional.
8. **Supabase storage** — CNIC and parcel images stored in Supabase Storage buckets
9. **Schema completeness** — `database-complete-schema.sql` contains all 20 tables for a fresh install
10. **Bot message cache** — 5-min in-memory cache; call `clearMessageCache()` after admin updates; falls back to hardcoded defaults if DB fails

## Additional Documentation

- `docs-archive/` — Setup guides, troubleshooting, Docker configs, template examples
- `database-complete-schema.sql` — Complete database setup (all 20 tables)
- `database-seed-bot-messages.sql` — Seed data for all ~115 bot messages
- `database-seed-whatsapp-templates.sql` — Seed data for all 20 WhatsApp templates

## Common Pitfalls

**Don't:**
- Use regular `supabase` client for admin operations that bypass RLS
- Hardcode Twilio template SIDs
- Use `new Date()` for "today" calculations or date comparisons — use `getPakistanTime()` from `lib/date` instead
- Create API routes without proper error handling
- Modify RLS policies without testing both anon and service_role
- Use `getSession()` for server-side auth (use `getUser()` instead)
- Exceed broadcast rate limits (can result in WhatsApp bans)
- Skip permission checks in admin API routes (all GET/POST/PUT/DELETE handlers need `verifyAdminAccess()`)
- Create cron routes without `CRON_SECRET` validation
- Forget to add `unit_id` when creating maintenance payments or profiles
- Hardcode WhatsApp bot response strings — use `getMessage()` from `lib/webhook/messages.ts`

**Do:**
- Use `supabaseAdmin` for operations that need to bypass RLS
- Store all template SIDs in environment variables
- Use `formatDateTimePK()` for all user-facing date displays
- Always check `error` response from Supabase queries
- Test RLS policies with both authenticated and unauthenticated requests
- Use `verifyAdminAccess(pageKey)` for all protected admin API routes
- Respect broadcast rate limits and recipient limits
- Test permission-based access with both super_admin and staff roles
- Link new residents and maintenance payments to their unit via `unit_id`
- Use `getMessage(MSG.KEY, variables)` for all WhatsApp bot response strings (never hardcode)