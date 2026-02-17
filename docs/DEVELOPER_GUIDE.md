# Developer Guide — Manzhil by Scrift

A hands-on guide for developers joining the Manzhil codebase. Jump to any section — each one is self-contained.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Getting Started](#2-getting-started)
3. [Folder Structure Overview](#3-folder-structure-overview)
4. [Pages & API Routes (`app/`)](#4-pages--api-routes-app)
5. [Business Logic & Utilities (`lib/`)](#5-business-logic--utilities-lib)
6. [UI Components (`components/`)](#6-ui-components-components)
7. [Middleware — Auth & RBAC](#7-middleware--auth--rbac)
8. [How Key Features Work (End-to-End)](#8-how-key-features-work-end-to-end)
9. [Database](#9-database)
10. [Key Patterns & Conventions](#10-key-patterns--conventions)

---

## 1. Project Overview

**Manzhil** is a Building Management System (BMS) for apartment complexes. It handles:

- **Units & Residents** — apartment management with multiple residents per unit
- **Hall Bookings** — reserving shared spaces with payment tracking
- **Maintenance Payments** — monthly fee invoicing, reminders, and confirmations
- **Complaints & Feedback** — resident issue tracking with status workflows
- **Visitor Passes** — visitor registration with CNIC verification
- **Parcel Tracking** — delivery tracking with image uploads
- **Broadcast Messaging** — bulk WhatsApp announcements with rate limiting
- **Accounting** — income/expense tracking with PDF and CSV reports
- **WhatsApp Bot** — resident self-service via conversational webhook
- **Multilingual Translations** — bot messages translatable into multiple languages via Google Translate

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, SSR) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL with Row Level Security) |
| UI | React + Radix UI + Tailwind CSS |
| Charts | Recharts |
| Messaging | Twilio WhatsApp Business API |
| PDF | jsPDF + jspdf-autotable |
| CSV | PapaParse |
| Validation | Zod + React Hook Form |
| Deployment | Vercel (primary) or Docker on VPS |

### Core Concept: Units Are First-Class

The most important architectural decision: **units (apartments) are the primary entity**, not residents. A unit can have multiple residents, and one is marked as the primary resident. Maintenance payments, staff assignments, and other records link to units. Residents link to their unit via `unit_id`.

```
units (apartment)
  ├── profiles (residents) — linked via unit_id, one is is_primary_resident
  ├── maintenance_payments — linked via unit_id AND profile_id
  └── staff — building staff assigned to a unit
```

---

## 2. Getting Started

### Prerequisites

- Node.js 18+
- npm
- A Supabase project (free tier works)
- A Twilio account with WhatsApp Business API access

### Install and Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Lint the codebase
npm run lint
```

The dev server runs at `http://localhost:3000`.

### Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

**Supabase** (required):
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (safe for client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only, bypasses RLS). **Required** — middleware blocks all admin access without this. |

**Twilio** (required for WhatsApp features):
| Variable | Description |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_WHATSAPP_NUMBER` | Your Twilio WhatsApp number (format: `whatsapp:+1234567890`) |
| `TWILIO_*_TEMPLATE_SID` | 20+ template SIDs — see `.env.example` for the full list |

**App** (required):
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Your app's public URL (used for generating invoice links) |
| `CRON_SECRET` | Secret key to authenticate cron job requests. All 3 cron routes validate the `x-cron-key` request header against this value. |

**Google Translate** (required for multilingual features):
| Variable | Description |
|----------|-------------|
| `GOOGLE_TRANSLATE_API_KEY` | Google Cloud Translation API v2 key. Used to auto-translate bot messages when a new language is added. |

### Database Setup

1. Open the Supabase SQL Editor for your project
2. Paste the entire contents of `database-complete-schema.sql`
3. Run it — this creates all 22 tables, RLS policies, indexes, triggers, and default data
4. Optionally run `database-seed-bot-messages.sql` to populate bot messages
5. Optionally run `database-seed-whatsapp-templates.sql` to populate WhatsApp template metadata
6. Optionally run `sql/database-seed-label-messages.sql` to populate translatable label message keys
7. Optionally run `sql/database-multilingual-schema.sql` if it is not already included in the complete schema

### Supabase Storage Buckets

Create these buckets in Supabase Storage (Dashboard > Storage):

- **`parcels`** — stores parcel/delivery images
- **`visitor_passes`** — stores visitor CNIC images

### Verify It Works

```bash
# Health check
curl http://localhost:3000/api/ping
```

---

## 3. Folder Structure Overview

```
scriftmanzhil/
├── app/                    # Next.js pages and API routes
│   ├── admin/              #   Admin dashboard (12 page groups)
│   │   └── settings/       #     Admin settings & RBAC (super_admin only)
│   │       ├── bot-messages/       # Bot message editor page
│   │       ├── whatsapp-templates/ # Template manager page
│   │       └── languages/          # Language management & translation editor
│   │           └── [code]/         # Per-language translation editor page
│   ├── api/                #   Backend API routes (40+ endpoints)
│   │   ├── bot-messages/   #     Bot message CRUD
│   │   ├── whatsapp-templates/ #  Template management + test-send
│   │   └── languages/      #     Language management & translations
│   ├── login/              #   Authentication page
│   ├── booking-invoice/    #   Public invoice PDFs
│   ├── maintenance-invoice/#   Public invoice PDFs
│   ├── daily-report/       #   Public daily report PDFs
│   └── layout.tsx          #   Root layout
├── components/             # React components
│   ├── ui/                 #   50+ Radix UI primitives (button, dialog, table, etc.)
│   ├── admin/              #   Feature-specific admin components
│   │   ├── bot-messages-editor.tsx        # Bot message customization
│   │   ├── whatsapp-template-manager.tsx  # WhatsApp template management
│   │   ├── language-settings.tsx          # Language management UI
│   │   └── translation-editor.tsx         # Per-language translation editor
│   ├── accounting/         #   Financial dashboard components
│   └── *.tsx               #   Root-level shared components
├── hooks/                  # React custom hooks
│   ├── use-mobile.tsx      #   Mobile viewport detection
│   └── use-toast.ts        #   Toast notification hook
├── lib/                    # Business logic, services, and utilities
│   ├── supabase/           #   DB clients, types, constants
│   ├── auth/               #   Authentication helpers
│   ├── twilio/             #   WhatsApp messaging
│   ├── webhook/            #   WhatsApp conversational bot
│   ├── services/           #   Shared business logic (booking, complaint, etc.)
│   ├── pdf/                #   PDF generation and CSV export
│   ├── date/               #   Pakistan timezone utilities
│   ├── admin/              #   Notification recipient fetchers
│   ├── bulk-import/        #   Resident CSV import
│   ├── bulk-import-units/  #   Unit CSV import
│   ├── google-translate.ts #   Google Translate API v2 utility
│   └── utils.ts            #   Tailwind cn() helper
├── public/                 # Static assets
├── styles/                 # Global styles
├── middleware.ts           # Auth & RBAC route protection
├── database-complete-schema.sql  # Full DB schema (22 tables)
├── database-seed-bot-messages.sql       # Bot message seed data (~115 messages)
├── database-seed-whatsapp-templates.sql # WhatsApp template seed data (20 templates)
├── sql/
│   ├── database-seed-label-messages.sql     # 10 translatable label message keys
│   └── database-multilingual-schema.sql     # Schema for multilingual tables
├── vercel.json             # Cron job schedules
├── tailwind.config.ts      # Tailwind configuration
├── tsconfig.json           # TypeScript config (@ path alias)
├── next.config.mjs         # Next.js configuration
├── Dockerfile              # Docker build for VPS deployment
├── CLAUDE.md               # AI assistant instructions
└── package.json            # Dependencies and scripts
```

---

## 4. Pages & API Routes (`app/`)

### 4a. Admin Pages (`app/admin/`)

All admin pages are protected by the middleware. Access depends on the admin's role (`super_admin` or `staff`) and their page-level permissions.

| Page | Route | What It Does |
|------|-------|-------------|
| **Dashboard** | `/admin/dashboard` | Overview cards with counts, recent activity, and quick stats |
| **Residents** | `/admin` (root) | List all residents, search/filter, add/edit/delete, bulk import via CSV, send welcome WhatsApp |
| **Resident Detail** | `/admin/residents/[id]` | Single resident profile, linked unit, maintenance history, complaints, bookings |
| **Units** | `/admin/units` | List all apartment units, add/edit/delete, bulk import via CSV |
| **Unit Detail** | `/admin/units/[id]` | Single unit profile, linked residents, toggle primary resident, maintenance records, invoice download buttons for maintenance payments and bookings |
| **Bookings** | `/admin/bookings` | Hall booking management, approve/reject, payment status, send reminders |
| **Complaints** | `/admin/complaints` | View/update complaint statuses (pending → in_progress → completed/rejected), real-time updates |
| **Visitors** | `/admin/visitors` | Visitor pass management, CNIC verification, arrival notifications |
| **Parcels** | `/admin/parcels` | Parcel tracking, image uploads, delivery notifications |
| **Analytics** | `/admin/analytics` | Charts and statistics — collections, complaints, bookings, occupancy |
| **Accounting** | `/admin/accounting` | Income/expense tracking, financial summaries, PDF and CSV reports, invoice view links for income transactions |
| **Broadcast** | `/admin/broadcast` | Send bulk WhatsApp messages with rate limiting (250/day), recipient selection |
| **Feedback** | `/admin/feedback` | View resident feedback submissions |
| **Settings** | `/admin/settings` | **Super admin only.** Booking Settings, Staff Management, Bot Messages, WhatsApp Templates |
| **Bot Messages** | `/admin/settings/bot-messages` | **Super admin only.** Customize WhatsApp bot response messages |
| **WhatsApp Templates** | `/admin/settings/whatsapp-templates` | **Super admin only.** Manage Twilio content template SIDs, test send, create drafts |
| **Languages** | `/admin/settings/languages` | **Super admin only.** Add, toggle, and remove enabled languages; trigger bulk retranslation |
| **Translation Editor** | `/admin/settings/languages/[code]` | **Super admin only.** Edit individual translated messages for a specific language |
| **Unauthorized** | `/admin/unauthorized` | Access denied landing page |

The admin layout (`app/admin/layout.tsx`) wraps all admin pages with a sidebar navigation and top bar. A loading skeleton (`app/admin/loading.tsx`) shows while pages are server-rendering.

### 4b. Public Pages

These pages require no authentication:

| Page | Route | What It Does |
|------|-------|-------------|
| **Login** | `/login` | Phone-based OTP authentication for admins |
| **Booking Invoice** | `/booking-invoice/[id]` | Public PDF view of a booking invoice |
| **Maintenance Invoice** | `/maintenance-invoice/[id]` | Public PDF view of a maintenance invoice |
| **Daily Report** | `/daily-report/[id]` | Public PDF view of a daily report |
| **Policies** | `/policies` | Privacy policy and terms of service |

### 4c. API Routes (`app/api/`)

All API routes are in `app/api/`. Protected admin routes use `verifyAdminAccess(pageKey)` to check permissions before processing.

#### Authentication

| Route | Method | What It Does | Tables |
|-------|--------|-------------|--------|
| `/api/auth/send-otp` | POST | Sends a WhatsApp OTP to the admin's phone number | `admin_users`, `admin_otp` |
| `/api/auth/verify-otp` | POST | Verifies the OTP code and creates a Supabase session | `admin_otp` |

#### Units

| Route | Method | What It Does | Tables |
|-------|--------|-------------|--------|
| `/api/units` | GET | List all units with resident counts | `units`, `profiles` |
| `/api/units` | POST | Create a new unit | `units` |
| `/api/units` | PUT | Update an existing unit | `units` |
| `/api/units` | DELETE | Delete a unit | `units` |
| `/api/units/bulk-import` | POST | Import units from CSV file | `units` |
| `/api/units/check-duplicates` | POST | Check if apartment numbers already exist | `units` |
| `/api/units/toggle-primary` | POST | Toggle which resident is the primary for a unit | `profiles` |

#### Residents

| Route | Method | What It Does | Tables |
|-------|--------|-------------|--------|
| `/api/residents/bulk-import` | POST | Import residents from CSV, optionally send welcome messages | `profiles`, `units` |
| `/api/residents/check-duplicates` | POST | Check for duplicate phone numbers | `profiles` |
| `/api/residents/welcome-message` | POST | Send a welcome WhatsApp message to a resident | `profiles` |

#### Bookings

| Route | Method | What It Does | Tables |
|-------|--------|-------------|--------|
| `/api/bookings/update-payment-status` | POST | Update booking payment status and send WhatsApp confirmation | `bookings`, `transactions` |
| `/api/bookings/send-reminder` | POST | Send booking payment reminders (single or bulk "Remind All Unpaid") | `bookings`, `profiles` |

#### Maintenance

| Route | Method | What It Does | Tables |
|-------|--------|-------------|--------|
| `/api/maintenance/update-status` | POST | Update maintenance payment status and send confirmation | `maintenance_payments`, `transactions` |
| `/api/maintenance/bulk-reminder` | POST | Send payment reminders to all residents with pending payments | `maintenance_payments`, `profiles` |
| `/api/maintenance/ensure-months` | POST | Create missing monthly maintenance records | `maintenance_payments`, `units` |

#### Complaints

| Route | Method | What It Does | Tables |
|-------|--------|-------------|--------|
| `/api/complaints/update-status` | POST | Update complaint status and notify resident via WhatsApp | `complaints`, `profiles` |

#### Broadcast

| Route | Method | What It Does | Tables |
|-------|--------|-------------|--------|
| `/api/broadcast/send` | POST | Send a broadcast message to selected residents (rate-limited) | `broadcast_logs`, `profiles` |
| `/api/broadcast/usage` | GET | Get today's broadcast usage stats | `broadcast_logs` |

#### Visitors

| Route | Method | What It Does | Tables |
|-------|--------|-------------|--------|
| `/api/visitors/notify-arrival` | POST | Notify a resident that their visitor has arrived | `visitor_passes`, `profiles` |

#### Parcels

| Route | Method | What It Does | Tables |
|-------|--------|-------------|--------|
| `/api/parcels/list` | GET | List all parcels with filtering | `parcels` |
| `/api/parcels/upload` | POST | Upload a parcel record with optional image | `parcels` |
| `/api/parcels/notify` | POST | Notify a resident about a parcel arrival | `parcels`, `profiles` |
| `/api/parcels/update-status` | POST | Update parcel delivery status | `parcels` |

#### Admin Staff

| Route | Method | What It Does | Tables |
|-------|--------|-------------|--------|
| `/api/admin/staff` | GET | List all admin/staff users | `admin_users` |
| `/api/admin/staff` | POST | Create a new staff account | `admin_users`, `admin_permissions` |
| `/api/admin/staff/[id]` | PUT | Update a staff member's details | `admin_users` |
| `/api/admin/staff/[id]` | DELETE | Deactivate a staff account | `admin_users` |
| `/api/admin/staff/[id]/permissions` | GET/PUT | Get or update page-level permissions | `admin_permissions` |

#### Bot Messages

| Route | Method | What It Does | Tables |
|-------|--------|-------------|--------|
| `/api/bot-messages` | GET | List all bot messages grouped by flow | `bot_messages` |
| `/api/bot-messages/[key]` | PATCH | Update custom text for a bot message | `bot_messages` |

#### WhatsApp Templates

| Route | Method | What It Does | Tables |
|-------|--------|-------------|--------|
| `/api/whatsapp-templates` | GET | List all templates grouped by category | `whatsapp_templates` |
| `/api/whatsapp-templates` | POST | Create a new template draft | `whatsapp_templates` |
| `/api/whatsapp-templates/[key]` | PATCH | Update template fields (SID, variables, etc.) | `whatsapp_templates` |
| `/api/whatsapp-templates/[key]` | DELETE | Delete a draft template | `whatsapp_templates` |
| `/api/whatsapp-templates/test-send` | POST | Test send a template to a phone number | `whatsapp_templates` |

#### Languages & Translations

| Route | Method | What It Does | Tables |
|-------|--------|-------------|--------|
| `/api/languages` | GET | List all enabled languages | `enabled_languages` |
| `/api/languages` | POST | Add a language and auto-translate all bot messages | `enabled_languages`, `bot_message_translations`, `bot_messages` |
| `/api/languages/supported` | GET | List languages supported by Google Translate | — (external API) |
| `/api/languages/[code]` | PATCH | Toggle a language enabled/disabled | `enabled_languages` |
| `/api/languages/[code]` | DELETE | Remove a language and all its translations | `enabled_languages`, `bot_message_translations` |
| `/api/languages/[code]/translations` | GET | Get all translations for a language | `bot_message_translations`, `bot_messages` |
| `/api/languages/[code]/translations/[key]` | PATCH | Update a single translation | `bot_message_translations` |
| `/api/languages/[code]/translations/[key]/retranslate` | POST | Re-translate a single message via Google Translate | `bot_message_translations`, `bot_messages` |
| `/api/languages/[code]/retranslate-all` | POST | Re-translate all messages for a language | `bot_message_translations`, `bot_messages` |

#### Accounting

| Route | Method | What It Does | Tables |
|-------|--------|-------------|--------|
| `/api/accounting/categories` | GET/POST/PUT/DELETE | List, create, update, or soft-delete expense categories | `expense_categories` |
| `/api/accounting/expenses` | GET/POST/PUT/DELETE | List, create, update, or delete expense records (also manages linked transactions) | `expenses`, `transactions` |
| `/api/accounting/summary` | GET | Get financial summary for a period | `transactions`, `expenses` |
| `/api/accounting/transactions` | GET/POST/DELETE | List, create, or delete transactions | `transactions` |

#### Cron Jobs

All 3 cron routes validate `CRON_SECRET` via the `x-cron-key` request header. If the env var is set, requests without a matching header return 401.

| Route | Schedule | What It Does | Tables |
|-------|----------|-------------|--------|
| `/api/cron/daily-reports` | Daily 5 AM | Generate and send daily report PDFs to opted-in admins | `daily_reports`, `admin_users` |
| `/api/cron/maintenance-reminder` | Daily 2 AM | Send maintenance payment reminders; on the 1st of each month, create new invoices | `maintenance_payments`, `profiles`, `units` |
| `/api/cron/pending-complaints` | Every 6 hours | Notify admins about unresolved complaints | `complaints`, `admin_users` |
| `/api/ping` | Every 5 min | Health check to keep Vercel warm | — |

#### WhatsApp Webhook

| Route | Method | What It Does |
|-------|--------|-------------|
| `/api/webhook` | POST | Receives incoming WhatsApp messages from Twilio and routes them through the conversational bot |

#### Other

| Route | Method | What It Does |
|-------|--------|-------------|
| `/api/ping` | GET | Health check endpoint |
| `/api/test-twilio` | GET | Test WhatsApp template sending |
| `/api/twilio/send-template` | POST | Send a specific Twilio template message |

---

## 5. Business Logic & Utilities (`lib/`)

### `lib/supabase/` — Database Clients & Constants

This is the foundation module. Everything that talks to the database imports from here.

**Files:**
- **`client.ts`** — Creates two Supabase clients:
  - `supabase` — uses the anon key, respects Row Level Security. Use for user-facing operations.
  - `supabaseAdmin` — uses the service role key, bypasses RLS. Use for admin operations.
- **`types.ts`** — Full TypeScript type definitions generated from the database schema.
- **`constants.ts`** — Exports `PAGE_KEYS` (the 12 admin page definitions with routes), `BROADCAST_LIMITS` (rate limiting constants).
- **`index.ts`** — Re-exports everything for convenient imports.

```typescript
// Always import from the barrel
import { supabase, supabaseAdmin, PAGE_KEYS, BROADCAST_LIMITS } from '@/lib/supabase'
```

**Broadcast rate limits:**
```
DAILY_MESSAGE_LIMIT: 250     // Max messages per day
MESSAGE_DELAY_MS: 3000       // 3s between messages
BATCH_SIZE: 20               // Messages per batch
BATCH_DELAY_MS: 30000        // 30s between batches
SOFT_RECIPIENT_LIMIT: 50     // Warning threshold
HARD_RECIPIENT_LIMIT: 100    // Confirmation required
```

### `lib/auth/` — Authentication & Authorization

**Files:**
- **`api-auth.ts`** — The main auth guard for API routes. Exports:
  - `verifyAdminAccess(pageKey)` — checks if the current user is an active admin with access to the given page. Returns `{ authenticated, adminUser, error }`.
  - `isSuperAdmin()` — checks if the current user is a super admin.
- **`server.ts`** — Server-side auth utilities. Uses `getUser()` (not `getSession()`) for secure verification.
- **`client.ts`** — Client-side auth utilities for browser-side operations.
- **`cache.ts`** — HMAC-signed cookie encoding/decoding for the permission cache (used by middleware).
- **`context.tsx`** — React context provider that makes the current user and admin info available throughout the component tree.
- **`index.ts`** — Re-exports.

```typescript
// In an API route:
import { verifyAdminAccess } from '@/lib/auth'

export async function GET() {
  const { authenticated, adminUser, error } = await verifyAdminAccess('bookings')
  if (!authenticated) {
    return NextResponse.json({ error }, { status: 401 })
  }
  // proceed...
}
```

### `lib/twilio/` — WhatsApp Messaging

Handles all outbound WhatsApp messages via Twilio's Content Template API.

**Files:**
- **`client.ts`** — Twilio client singleton (initialized once, reused across requests).
- **`templates.ts`** — Template SID resolver. Queries the `whatsapp_templates` DB table first, falls back to env vars. Also exports the static `TEMPLATE_SIDS` map as a last resort.
- **`send.ts`** — Core message sending logic — takes a phone number, template SID, and variables.
- **`formatters.ts`** — Helper functions to format dates, times, and currency for WhatsApp messages.
- **`types.ts`** — TypeScript types for Twilio-specific data.
- **`index.ts`** — Re-exports.

**`notifications/`** — One module per feature, each exporting functions that compose a template + variables and call `send()`:
- **`account.ts`** — Welcome message, account blocked, account reactivated
- **`booking.ts`** — Booking confirmation, payment confirmed, cancellation, reminder
- **`maintenance.ts`** — Invoice sent, payment reminder, payment confirmed
- **`complaint.ts`** — Complaint registered, in progress, completed, rejected (+ admin notification)
- **`parcel.ts`** — Parcel arrival notification
- **`visitor.ts`** — Visitor arrival notification
- **`broadcast.ts`** — Broadcast announcement message

```typescript
// Send a booking confirmation:
import { sendBookingConfirmation } from '@/lib/twilio'
await sendBookingConfirmation(phoneNumber, { resident_name, booking_date, hall_type, amount, time_slot })
```

### `lib/webhook/` — WhatsApp Conversational Bot

Handles **inbound** WhatsApp messages from residents. When a resident texts the Twilio number, the message hits `/api/webhook`, which hands it off to this module.

**Files:**
- **`router.ts`** — Main message router. Determines what the resident is trying to do based on their input and current conversation state, then dispatches to the appropriate handler.
- **`state.ts`** — Conversation state management. Tracks where each user is in a multi-step flow (e.g., halfway through registering a complaint).
- **`menu.ts`** — Builds the main menu and sub-menus that are sent as WhatsApp text responses. All menu builders accept an optional `language` parameter and use `getLabels()` for translated labels.
- **`messages.ts`** — DB-backed message loader with 5-min cache. Also exports `getLabels(key, language?)` for retrieving `\n`-delimited label messages split into arrays.
- **`message-keys.ts`** — TypeScript constants for all message keys, including 10 label keys for translatable menu labels.
- **`message-defaults.ts`** — Hardcoded fallback defaults for all messages.
- **`profile.ts`** — Looks up resident profiles and fetches related data (bookings, complaints, maintenance status).
- **`config.ts`** — Bot configuration constants (menu options, timeouts, etc.).
- **`types.ts`** — Webhook-specific TypeScript types.
- **`utils.ts`** — Formatting and validation helpers for the bot.
- **`index.ts`** — Re-exports.

**`handlers/`** — Each file handles one conversational flow:
- **`booking.ts`** — Walk the resident through booking a hall (date, time, confirmation)
- **`complaint.ts`** — Register a new complaint (category, description, confirmation)
- **`feedback.ts`** — Submit feedback
- **`hall.ts`** — Check hall availability and information
- **`staff.ts`** — Staff management queries
- **`status.ts`** — Check status of existing complaints, bookings, or maintenance
- **`visitor.ts`** — Request a visitor pass

### `lib/services/` — Shared Business Logic

Service-layer modules used by both API routes and cron jobs. These encapsulate complex operations that involve multiple DB queries and notifications.

- **`booking.ts`** — Booking payment status updates, WhatsApp confirmations, transaction creation
- **`broadcast.ts`** — Broadcast message sending with rate limiting
- **`complaint.ts`** — Complaint status updates and notifications; exports `ServiceError` class
- **`maintenance.ts`** — Maintenance payment processing and confirmations

### `lib/pdf/` — PDF & CSV Reports

**Files:**
- **`theme.ts`** — Shared PDF styling: colors, fonts, margins, header/footer templates used across all PDFs.
- **`utils.ts`** — Low-level PDF utility functions.
- **`invoice.ts`** — Invoice PDF generation for bookings and maintenance payments. Exports `generateMaintenanceInvoicePdf(payment, summary?)` and `generateBookingInvoicePdf(booking)` — both return `{ blob, fileName }`. Used client-side on the unit detail page for inline invoice downloads.
- **`reports.ts`** — Five PDF report types:
  1. **Income Statement** — Revenue summary by category
  2. **Collection Report** — Payment collection details
  3. **Expense Report** — Expense breakdown by category
  4. **Outstanding Dues Report** — Unpaid maintenance and bookings
  5. **Annual Summary** — Year-over-year financial overview
- **`csv-export.ts`** — CSV export for all the same report types (uses PapaParse).
- **`reporting.ts`** — Period filtering logic (`"all" | "daily" | "weekly" | "monthly" | "yearly"`).
- **`index.ts`** — Re-exports.

### `lib/date/` — Pakistan Timezone Utilities

All dates in the system must be displayed in Pakistan Standard Time (PST, UTC+5). This module handles all timezone conversions.

**Files:**
- **`constants.ts`** — PST timezone constant and locale settings.
- **`formatting.ts`** — `formatDateTimePK()`, `getPakistanTime()`, and related formatting functions. Always use these instead of raw `new Date()` for display and date comparisons.
- **`parsing.ts`** — Date parsing utilities for converting strings to Date objects in PST. Uses `getPakistanTime()` internally for "today"/"tomorrow" resolution.
- **`time-slots.ts`** — Generates available booking time slots based on hall settings.
- **`index.ts`** — Re-exports.

**Critical:** Use `getPakistanTime()` instead of `new Date()` for any "today" calculations or date comparisons. `new Date()` returns UTC on Vercel, which is 5 hours behind Pakistan time and causes wrong date validation.

```typescript
import { formatDateTimePK, getPakistanTime } from '@/lib/date'

const display = formatDateTimePK(someDate)  // "15 Feb 2026, 3:30 PM"
const today = getPakistanTime()             // Current time in Pakistan
```

### `lib/admin/` — Notification Recipients

**`notifications.ts`** — Three functions that query `admin_users` to find which admins should receive specific notification types:

- `getComplaintNotificationRecipients()` — admins with `receive_complaint_notifications = true`
- `getReminderRecipients()` — admins with `receive_reminder_notifications = true`
- `getAllNotificationRecipients()` — union of both

All return an array of admin phone numbers (or empty array if none configured).

### `lib/google-translate.ts` — Google Translate API

A utility module for translating text via the Google Cloud Translation API v2. Key behaviors:

- Wraps `{variable}` placeholders in `<span translate="no">` tags to protect them from translation
- Converts `\n` to `<br>` before translation and reverses it after, preserving newline formatting
- Decodes HTML entities (`&amp;`, `&#39;`, etc.) in the translated output
- Uses HTML mode (`format=html`) for the API call
- Exports a single `translateText(text, targetLanguage)` function

```typescript
import { translateText } from '@/lib/google-translate'

const translated = await translateText(
  'Hello {name}, your complaint #{id} has been registered.',
  'ur' // Urdu
)
// Placeholders {name} and {id} are preserved as-is in the output
```

### `lib/bulk-import/` — Resident CSV Import

- **`parser.ts`** — Parses CSV files using PapaParse, handles encoding and delimiter detection.
- **`validation.ts`** — Validates each row: required fields (name, phone), phone number format, apartment number exists in units table.
- **`index.ts`** — Orchestrates the import: parse → validate → check duplicates → insert into `profiles`.

### `lib/bulk-import-units/` — Unit CSV Import

Same structure as resident import but for units:

- **`parser.ts`** — Parses unit CSV files.
- **`validation.ts`** — Validates: required `apartment_number`, optional `floor_number`, `unit_type`, `maintenance_charges`.
- **`index.ts`** — Orchestrates: parse → validate → check duplicates → insert into `units`.

### `lib/utils.ts` — Tailwind Helper

A single utility function used across all components:

```typescript
import { cn } from '@/lib/utils'

// Merges Tailwind classes with conflict resolution
<div className={cn("text-red-500", isActive && "text-blue-500")} />
```

---

## 6. UI Components (`components/`)

### `components/ui/` — Radix UI Primitives

50+ pre-built, accessible UI components based on [Radix UI](https://www.radix-ui.com/). These are the building blocks used throughout the admin interface. You rarely need to modify these.

Key components: `accordion`, `alert-dialog`, `avatar`, `badge`, `button`, `card`, `checkbox`, `command`, `dialog`, `dropdown-menu`, `form`, `input`, `label`, `pagination`, `popover`, `progress`, `select`, `sheet`, `skeleton`, `switch`, `table`, `tabs`, `textarea`, `toast`, `tooltip`.

Also includes two utility hooks:
- `use-mobile.tsx` — Detects mobile viewport
- `use-toast.ts` — Toast notification management

### `components/admin/` — Feature-Specific Admin Components

These are the main UI components for each admin page. Each one typically includes a data table, filters, action buttons, and modals.

| Component | Used By | What It Does |
|-----------|---------|-------------|
| `sidebar.tsx` | Admin layout | Navigation sidebar with page links and role-based visibility |
| `residents-table.tsx` | `/admin` | Resident listing with search, filter, add/edit/delete actions |
| `bookings-table.tsx` | `/admin/bookings` | Booking management with status updates and payment tracking |
| `complaints-table.tsx` | `/admin/complaints` | Complaint list with status workflow and real-time updates |
| `visitors-table.tsx` | `/admin/visitors` | Visitor pass management with CNIC display |
| `parcels-table.tsx` | `/admin/parcels` | Parcel tracking with image previews |
| `broadcast-form.tsx` | `/admin/broadcast` | Broadcast message composer with recipient selection and usage stats |
| `analytics-dashboard.tsx` | `/admin/analytics` | Charts and statistics (Recharts) |
| `feedback-list.tsx` | `/admin/feedback` | Feedback submissions viewer |
| `settings-form.tsx` | `/admin/settings` | Admin settings editor |
| `staff-management.tsx` | `/admin/settings` | Staff account and permission management |
| `bulk-import-modal.tsx` | `/admin` | CSV upload modal for resident bulk import |
| `bulk-import-units-modal.tsx` | `/admin/units` | CSV upload modal for unit bulk import |
| `bot-messages-editor.tsx` | `/admin/settings/bot-messages` | Editable bot message cards grouped by flow, with save/reset |
| `whatsapp-template-manager.tsx` | `/admin/settings/whatsapp-templates` | Template cards with SID editing, test send, create/edit dialogs |
| `language-settings.tsx` | `/admin/settings/languages` | Language management with add, toggle, remove, and retranslate-all |
| `translation-editor.tsx` | `/admin/settings/languages/[code]` | Per-language translation editor with search, edit, and retranslate per message |

### `components/accounting/` — Financial Dashboard

| Component | What It Does |
|-----------|-------------|
| `accounting-tab.tsx` | Main tab container for the accounting page |
| `financial-summary-cards.tsx` | Summary cards showing income, expenses, net balance |
| `revenue-charts.tsx` | Revenue visualization using Recharts |
| `transactions-table.tsx` | Transaction listing with filters and invoice view buttons for booking/maintenance income rows |
| `expenses-manager.tsx` | Expense creation and management |

### Root-Level Components

| Component | What It Does |
|-----------|-------------|
| `auth-provider.tsx` | Wraps the app with authentication context |
| `theme-provider.tsx` | Dark/light theme management (next-themes) |
| `user-menu.tsx` | User avatar dropdown with logout |
| `mobile-nav.tsx` | Mobile-responsive navigation menu |
| `settings-dialog.tsx` | Quick settings popup |

---

## 7. Middleware — Auth & RBAC

`middleware.ts` runs on every request before it reaches a page. It handles authentication and role-based access control.

### What's Public (No Auth)

These routes skip all middleware checks:
- `/login`
- `/api/*` (API routes handle their own auth)
- `/booking-invoice/*`, `/maintenance-invoice/*`, `/daily-report/*`
- `/policies`
- `/admin/unauthorized`

### How It Works

1. **Check session** — Uses Supabase `getUser()` to verify the JWT. If no valid session, redirect to `/login`. If `SUPABASE_SERVICE_ROLE_KEY` is not set, redirect to `/admin/unauthorized` (this env var is required for RBAC).

2. **Check cache** — Looks for an `x-admin-cache` cookie. This is an HMAC-signed JSON payload containing the admin's role and permissions, with a 5-minute TTL.

3. **Cache hit** — If valid and not expired, use the cached role and permissions. Skip database queries.

4. **Cache miss** — Query the `admin_users` table to get the user's role and active status. Query `admin_permissions` for their page access rights. Write a new cache cookie.

5. **Authorize** — Map the current URL to a page key (e.g., `/admin/bookings` → `"bookings"`):
   - **Super admin**: Access everything.
   - **Staff**: Check if the page key is in their permission list.
   - **Settings page**: Always super admin only, regardless of permissions.

6. **Denied** — If staff lacks access, re-verify from DB (cache might be stale). If still denied, redirect to their first permitted page, or `/admin/unauthorized` if they have no permissions at all.

### The Cache Cookie

The `x-admin-cache` cookie stores:
```json
{
  "userId": "uuid",
  "role": "super_admin" | "staff",
  "isActive": true,
  "adminId": "uuid",
  "permissionKeys": ["dashboard", "bookings", "complaints"],
  "expiresAt": 1708000000000
}
```

This payload is HMAC-signed with the `SUPABASE_SERVICE_ROLE_KEY` to prevent tampering. The cookie is `httpOnly`, `secure` (in production), and `sameSite: "lax"`.

---

## 8. How Key Features Work (End-to-End)

### Authentication Flow

```
User visits /login
  → Enters phone number
  → Frontend calls POST /api/auth/send-otp
    → Checks phone exists in admin_users
    → Generates 6-digit OTP, stores in admin_otp table
    → Sends OTP via WhatsApp (Twilio template)
  → User enters OTP
  → Frontend calls POST /api/auth/verify-otp
    → Validates OTP against admin_otp table
    → Creates Supabase auth session
    → Redirects to /admin/dashboard
  → Middleware sets HMAC permission cache cookie
```

### Adding a Resident

```
Admin visits /admin (residents page)
  → Clicks "Add Resident"
  → Fills form: name, phone, apartment number, CNIC
  → Frontend inserts into profiles table (via supabaseAdmin)
    → Links to unit via unit_id
    → Sets is_primary_resident flag if first resident in unit
  → Optionally sends welcome WhatsApp
    → POST /api/residents/welcome-message
    → lib/twilio/notifications/account.ts → sendWelcomeMessage()
```

### Booking Flow

```
Admin visits /admin/bookings
  → Creates booking: resident, date, hall type, time slot
  → Frontend inserts into bookings table
  → When payment received:
    → POST /api/bookings/update-payment-status
    → lib/services/booking.ts → updateBookingPaymentStatus()
      → Updates bookings table (payment_status = "paid")
      → Creates transaction record in transactions table
      → Sends WhatsApp confirmation via lib/twilio/notifications/booking.ts
      → Returns updated booking with invoice link
```

### WhatsApp Bot

```
Resident sends WhatsApp message to Twilio number
  → Twilio forwards to POST /api/webhook
  → lib/webhook/router.ts matches the message:
    → New conversation? Show main menu (reply 1-10)
    → In a flow? Resume the handler
  → lib/webhook/state.ts tracks conversation state
  → Handler (e.g., handlers/complaint.ts) runs:
    → Asks follow-up questions one at a time
    → Validates responses
    → Writes to database (complaints, bookings, etc.)
    → Sends confirmation response
  → Response sent back through Twilio to resident's WhatsApp
```

### Cron Jobs

```
Vercel triggers cron on schedule (vercel.json)
  → POST /api/cron/daily-reports (daily at 5 AM)
    → Queries day's data: bookings, complaints, maintenance
    → Generates PDF report (lib/pdf/)
    → Stores in daily_reports table
    → Sends WhatsApp notification to opted-in admins
      → lib/admin/notifications.ts → getReminderRecipients()
      → lib/twilio/notifications/ → sends template with report link

  → POST /api/cron/maintenance-reminder (daily at 2 AM)
    → On 1st of month: creates maintenance_payments records for all units
    → Sends invoice reminders to residents with pending payments

  → POST /api/cron/pending-complaints (every 6 hours)
    → Queries complaints with status "pending" older than threshold
    → Notifies admins with complaint notification preference enabled
```

### Broadcast Messaging

```
Admin visits /admin/broadcast
  → Checks usage: GET /api/broadcast/usage
    → Queries broadcast_logs for today's count
    → Returns remaining quota (250 - sent today)
  → Selects recipients: all, by building block, or individual
  → Enters title + body text
  → POST /api/broadcast/send
    → lib/services/broadcast.ts handles rate limiting:
      → 20 messages per batch
      → 3 seconds between messages
      → 30 seconds between batches
    → Sends via lib/twilio/notifications/broadcast.ts
    → Logs results in broadcast_logs table
    → Returns success/failure summary
```

### Multilingual Translation System

The bot supports multiple languages for its conversational messages. Residents can select their preferred language via menu option "0" in the WhatsApp bot.

```
Admin visits /admin/settings/languages
  → Sees currently enabled languages (max 5)
  → Clicks "Add Language"
    → Fetches supported languages: GET /api/languages/supported
    → Selects a language (e.g., Urdu)
    → POST /api/languages
      → Creates row in enabled_languages
      → Auto-translates all ~115+ bot messages via Google Translate API v2
      → Stores translations in bot_message_translations
  → Can toggle language enabled/disabled: PATCH /api/languages/[code]
  → Can remove language and all translations: DELETE /api/languages/[code]
  → Can retranslate all messages: POST /api/languages/[code]/retranslate-all

Admin visits /admin/settings/languages/[code]
  → Sees all messages with original English and translated text
  → Can manually edit any translation: PATCH /api/languages/[code]/translations/[key]
  → Can retranslate a single message: POST /api/languages/[code]/translations/[key]/retranslate

Resident sends "0" to WhatsApp bot
  → Bot shows language selection menu
  → Resident picks a language
  → All subsequent bot messages use translated versions
  → Menu labels retrieved via getLabels(key, language) from lib/webhook/messages.ts
```

**Architecture details:**
- `lib/google-translate.ts` — wraps Google Translate API v2, protects `{variable}` placeholders with `<span translate="no">`, preserves `\n` via `<br>` conversion
- `lib/webhook/messages.ts` — `getMessage(key, variables, language?)` resolves translations from `bot_message_translations`; `getLabels(key, language?)` splits `\n`-delimited label messages into arrays
- `lib/webhook/menu.ts` — all menu builders accept optional `language` parameter
- Menu labels are stored as `\n`-delimited values in `bot_messages` (10 label keys), split into arrays at runtime

---

## 9. Database

### Setup

Run `database-complete-schema.sql` in the Supabase SQL Editor. This single file creates all 22 tables, RLS policies, indexes, triggers, and default data.

### Table Groups

**Core Domain (11 tables):**

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `units` | Apartment units | Parent of profiles, maintenance_payments, staff |
| `profiles` | Residents | Belongs to a unit (`unit_id`); parent of bookings, complaints, visitor_passes, parcels |
| `maintenance_payments` | Monthly fees | Links to both `profile_id` and `unit_id` |
| `bookings` | Hall reservations | Belongs to a profile |
| `booking_settings` | Hall config | Defines slots, timings, charges |
| `complaints` | Issue tracking | Belongs to a profile |
| `feedback` | Resident feedback | Belongs to a profile |
| `staff` | Building staff | Linked to a unit |
| `visitor_passes` | Visitor records | Belongs to a profile |
| `parcels` | Delivery tracking | Belongs to a profile |
| `daily_reports` | Generated PDFs | Standalone; PDF stored as base64 |

**Admin & RBAC (3 tables):**

| Table | Purpose |
|-------|---------|
| `admin_users` | Admin accounts with role (`super_admin`/`staff`) and notification preferences |
| `admin_permissions` | Page-level access control — one row per admin per permitted page |
| `admin_otp` | Temporary OTP codes for WhatsApp-based login |

**Accounting (3 tables):**

| Table | Purpose |
|-------|---------|
| `transactions` | Unified ledger — booking income, maintenance income, other income, expenses, refunds |
| `expenses` | Detailed expense records with amounts and descriptions |
| `expense_categories` | Category definitions with icons and colors |

**Broadcast (1 table):**

| Table | Purpose |
|-------|---------|
| `broadcast_logs` | Message history — recipient count, success/fail counts, message content |

**Bot Customization (1 table):**

| Table | Purpose |
|-------|---------|
| `bot_messages` | Customizable WhatsApp bot conversation messages with default/custom text and variable interpolation |

**Template Management (1 table):**

| Table | Purpose |
|-------|---------|
| `whatsapp_templates` | Twilio content template SIDs, variables metadata, trigger info, and draft management |

**Multilingual Translation (2 tables):**

| Table | Purpose |
|-------|---------|
| `enabled_languages` | Available languages — `language_code` (PK), `language_name`, `native_name`, `is_enabled`, `sort_order`. Max 5 enabled at once. |
| `bot_message_translations` | Translated bot messages — links `message_key` (FK to `bot_messages`) and `language_code` (FK to `enabled_languages`). Stores `translated_text`, `is_auto_translated` flag, and `updated_by`. Unique constraint on `(message_key, language_code)`. |

### Key Relationships

```
units
 ├─< profiles (unit_id)         — many residents per unit
 ├─< maintenance_payments (unit_id)
 └─< staff (unit_id)

profiles
 ├─< bookings (profile_id)
 ├─< complaints (profile_id)
 ├─< maintenance_payments (profile_id)
 ├─< visitor_passes (profile_id)
 ├─< parcels (profile_id)
 └─< feedback (profile_id)

admin_users
 ├─< admin_permissions (admin_id)
 ├─< bot_messages (updated_by)
 └─< whatsapp_templates (updated_by)

bot_messages
 └─< bot_message_translations (message_key)

enabled_languages
 └─< bot_message_translations (language_code)
```

### Row Level Security (RLS)

All tables have RLS enabled. Two clients exist for different use cases:

- **`supabase`** (anon key) — respects RLS. Used for user-facing operations where the logged-in user should only see their own data.
- **`supabaseAdmin`** (service role key) — bypasses RLS. Used in API routes and cron jobs where you need to read/write any data.

If your query returns empty results when you know data exists, you're likely using the wrong client.

---

## 10. Key Patterns & Conventions

### Import Path Alias

All imports use the `@/` alias which maps to the project root:

```typescript
import { supabaseAdmin } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { verifyAdminAccess } from '@/lib/auth'
import { formatDateTimePK } from '@/lib/date'
```

### Database Client Selection

```typescript
// User-facing operations (respects RLS):
import { supabase } from '@/lib/supabase'

// Admin operations (bypasses RLS):
import { supabaseAdmin } from '@/lib/supabase'
```

Rule of thumb: if the code runs in an API route or cron job and needs to access any data regardless of who's logged in, use `supabaseAdmin`.

### API Route Auth Guard

Every protected admin API route should start with this guard — on **every** HTTP method handler (GET, POST, PUT, DELETE):

```typescript
import { verifyAdminAccess } from '@/lib/auth'

export async function POST(req: Request) {
  const { authenticated, adminUser, error } = await verifyAdminAccess('bookings')
  if (!authenticated) {
    return NextResponse.json({ error }, { status: 401 })
  }
  // ... handle request
}
```

The page key (e.g., `'bookings'`) must match one of the 12 defined page keys.

### Error Handling with Supabase

Always check for errors after every Supabase query:

```typescript
const { data, error } = await supabaseAdmin
  .from('profiles')
  .select('*')
  .eq('unit_id', unitId)

if (error) {
  console.error('Failed to fetch profiles:', error)
  return NextResponse.json({ error: error.message }, { status: 500 })
}
```

### Date and Time

All user-facing dates must use Pakistan Standard Time (UTC+5):

```typescript
import { formatDateTimePK, getPakistanTime } from '@/lib/date'

// Correct — shows "15 Feb 2026, 3:30 PM" in PST
const display = formatDateTimePK(record.created_at)

// Correct — gets "today" in Pakistan time for date comparisons
const today = getPakistanTime()

// Wrong — shows UTC time, which is 5 hours behind Pakistan
const display = new Date(record.created_at).toLocaleString()

// Wrong — "today" will be wrong on Vercel (UTC server)
const today = new Date()
```

### Twilio Templates

Template SIDs are resolved from the database first, with env var fallback:

```typescript
// In lib/twilio/templates.ts — queries whatsapp_templates DB table, falls back to env vars
// In lib/twilio/notifications/*.ts — uses the resolver

// To add a new template:
// 1. Create template in Twilio Console
// 2. Option A: Add SID via admin UI at /admin/settings/whatsapp-templates
// 3. Option B: Add SID to .env (env var fallback still works)
// 4. Template SIDs resolve: DB → env var → static fallback
// 5. Test via the "Test Send" button in the template manager UI
```

### WhatsApp Message Format

All outbound messages follow this format — the system introduces itself in third person, then addresses the resident in second person:

```
Hello, this is Manzhil by Scrift.

Hi {Resident Name}, your maintenance payment of Rs. 5,000 for February 2026 has been confirmed.
```

### Component Patterns

Admin page components typically follow this structure:

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

### File Naming

- Pages: `page.tsx` (Next.js convention)
- API routes: `route.ts` (Next.js convention)
- Components: `kebab-case.tsx` (e.g., `bookings-table.tsx`)
- Library modules: `kebab-case.ts` (e.g., `api-auth.ts`)
- Barrel exports: `index.ts` in each folder

---

## Quick Reference

### Useful Commands

```bash
npm run dev                    # Start dev server
npm run build                  # Production build
npm run lint                   # Run linter
curl localhost:3000/api/ping   # Health check
```

### Key Files to Read First

1. `middleware.ts` — Understand auth and RBAC
2. `lib/supabase/client.ts` — The two database clients
3. `lib/auth/api-auth.ts` — How API routes are protected
4. `app/admin/layout.tsx` — Admin shell structure
5. `database-complete-schema.sql` — Full data model

### 12 Page Keys (RBAC)

```
dashboard, residents, units, bookings, complaints,
visitors, parcels, analytics, feedback, accounting,
broadcast, settings
```

### Adding a New Language

1. Ensure `GOOGLE_TRANSLATE_API_KEY` is set in `.env.local`
2. Navigate to Admin > Settings > Languages (super admin only)
3. Click "Add Language" and select from the supported languages list
4. All bot messages are auto-translated via Google Translate API v2
5. Review and manually edit translations at `/admin/settings/languages/[code]`
6. Use "Retranslate All" to regenerate translations after bot message changes
7. Maximum 5 languages can be enabled simultaneously

### Admin Roles

- **`super_admin`** — Full access to everything
- **`staff`** — Access only to pages listed in their `admin_permissions` rows
