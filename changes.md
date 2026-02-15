# Codebase Cleanup & Reorganization — Change Log

## Phase 1: Delete Unused Files

**Deleted 13 unused UI components** (zero imports found):
- `components/ui/aspect-ratio.tsx`
- `components/ui/carousel.tsx`
- `components/ui/context-menu.tsx`
- `components/ui/drawer.tsx`
- `components/ui/hover-card.tsx`
- `components/ui/menubar.tsx`
- `components/ui/navigation-menu.tsx`
- `components/ui/resizable.tsx`
- `components/ui/breadcrumb.tsx`
- `components/ui/accordion.tsx`
- `components/ui/input-otp.tsx`
- `components/ui/calendar.tsx`
- `components/ui/chart.tsx`

> Note: `pagination.tsx` was kept — it's imported by 3 admin table components.

**Deleted unused public assets:**
- `public/placeholder-logo.svg`
- `public/placeholder-logo.png`
- `public/placeholder.jpg`
- `public/placeholder.svg`

> `public/placeholder-user.jpg` kept (potential avatar fallback).

**Deleted superseded SQL files:**
- `sql-archive/create-tables.sql`
- `sql-archive/create-tables-v2.sql`
- `sql-archive/database-setup-production.sql`

**Other cleanup:**
- Deleted `pnpm-lock.yaml` (project uses npm)
- Deleted empty `lib/logger/` directory
- Moved `remotion-video-prompt.md` → `docs-archive/remotion-video-prompt.md`

---

## Phase 2: Fix Folder Structure

### 2a. Cron route cleanup (`app/api/cron/`)

| Route | Action | Reason |
|-------|--------|--------|
| `cron/booking-confirmation/` | **Deleted** | Dead stub — returns a static message |
| `cron/maintenance-confirmation/` | **Moved** → `api/maintenance/confirmation/` | Not a scheduled cron job |
| `cron/booking-reminder/` | **Moved** → `api/bookings/reminder/` | Not a scheduled cron job |

### 2b. Auth module (`lib/auth/`)

Grouped 5 scattered auth files into `lib/auth/`:

| Old Path | New Path |
|----------|----------|
| `lib/auth-client.ts` | `lib/auth/client.ts` |
| `lib/auth-server.ts` | `lib/auth/server.ts` |
| `lib/auth-context.tsx` | `lib/auth/context.tsx` |
| `lib/api-auth.ts` | `lib/auth/api-auth.ts` |
| `lib/middleware-cache.ts` | `lib/auth/cache.ts` |

Created `lib/auth/index.ts` barrel export.

**Updated imports in 11 files:**
- `components/settings-dialog.tsx`
- `components/auth-provider.tsx`
- `components/user-menu.tsx`
- `app/admin/unauthorized/page.tsx`
- `app/admin/layout.tsx`
- `app/api/admin/staff/route.ts`
- `app/api/admin/staff/[id]/route.ts`
- `app/api/admin/staff/[id]/permissions/route.ts`
- `middleware.ts`

### 2c. PDF module (`lib/pdf/`)

Grouped 6 scattered PDF/report files into `lib/pdf/`:

| Old Path | New Path |
|----------|----------|
| `lib/pdf-theme.ts` | `lib/pdf/theme.ts` |
| `lib/pdf.ts` | `lib/pdf/utils.ts` |
| `lib/invoice.ts` | `lib/pdf/invoice.ts` |
| `lib/accounting-reports.ts` | `lib/pdf/reports.ts` |
| `lib/csv-export.ts` | `lib/pdf/csv-export.ts` |
| `lib/reporting.ts` | `lib/pdf/reporting.ts` |

Created `lib/pdf/index.ts` barrel export.

**Updated imports in 3 files** (bookings-table, accounting-tab, invoice pages). Internal relative imports updated from `./pdf-theme` to `./theme`.

> Note: `@/lib/pdf` imports in 4 consumer files resolved automatically via the barrel.

---

## Phase 3: Split `lib/supabase.ts` God File

Split the 359-line monolith into 3 focused modules:

| New File | Contents |
|----------|----------|
| `lib/supabase/client.ts` | `supabase` and `supabaseAdmin` client instances |
| `lib/supabase/types.ts` | 20+ type definitions organized by domain |
| `lib/supabase/constants.ts` | `PAGE_KEYS`, `PageKey`, `BROADCAST_LIMITS`, `BroadcastLog` |
| `lib/supabase/index.ts` | Barrel re-export — all existing imports work unchanged |

Deleted `lib/supabase.ts`. Zero import changes required.

---

## Phase 4: Consolidate Date/Time Utilities

Merged two overlapping files (`lib/dateUtils.ts` + `lib/time-utils.ts`) into `lib/date/`:

| New File | Contents |
|----------|----------|
| `lib/date/formatting.ts` | `formatDate`, `formatDateTime`, `getPakistanTime`, `getPakistanISOString`, `isWorkingDay`, `getDayName` |
| `lib/date/parsing.ts` | `isDateFormat`, `parseDate`, `parseMonthName` |
| `lib/date/time-slots.ts` | `generateTimeSlots` + private helpers |
| `lib/date/constants.ts` | `DAYS_OF_WEEK` |
| `lib/date/index.ts` | Barrel re-export |

**Duplicates resolved:**
- `isWorkingDay` existed in both files → single copy in `formatting.ts`
- `formatDateForDisplay` (time-utils) was identical to `formatDate` (dateUtils) → removed, consumers use `formatDate as formatDateForDisplay` alias

**Updated imports in 19 files** across webhook handlers, API routes, and admin components.

Deleted `lib/dateUtils.ts` and `lib/time-utils.ts`.

---

## Phase 5: Create Service Layer

Extracted business logic from API routes into reusable service functions in `lib/services/`.

### New service files:

**`lib/services/complaint.ts`**
- `updateComplaintStatus(complaintId, status)` — fetch, optimistic lock, update, send WhatsApp notification
- `ServiceError` class — shared error type with HTTP status codes

**`lib/services/maintenance.ts`**
- `updateMaintenancePaymentStatus(paymentId, isPaid)` — update payment, sync unit, handle transactions, send confirmation

**`lib/services/booking.ts`**
- `updateBookingPaymentStatus(bookingId, paymentStatus)` — update status, create transaction, send confirmation
- `sendBookingReminders(bookingIds)` — batch send reminders with timestamp update

**`lib/services/broadcast.ts`**
- `checkBroadcastUsage()` — check daily limits
- `sendBroadcast(variables, recipientIds)` — rate-limited batch sending with logging

### Refactored API routes (5 files → thin HTTP handlers):

| Route | Before | After |
|-------|--------|-------|
| `api/complaints/update-status` | 149 lines | 25 lines |
| `api/maintenance/update-status` | 175 lines | 27 lines |
| `api/bookings/update-payment-status` | 196 lines | 30 lines |
| `api/bookings/send-reminder` | 79 lines | 18 lines |
| `api/broadcast/send` | 187 lines | 17 lines |

---

## Phase 6: JSDoc Documentation

Added `@module` headers and function-level JSDoc to ~25 key files:

- **Services:** `complaint.ts`, `maintenance.ts`, `booking.ts`, `broadcast.ts`
- **Supabase:** `client.ts`, `types.ts`, `constants.ts`
- **Date:** `formatting.ts`, `parsing.ts`, `time-slots.ts`, `constants.ts`
- **Auth:** `client.ts`, `server.ts`, `api-auth.ts`, `cache.ts`
- **PDF:** `theme.ts`, `utils.ts`, `invoice.ts`, `csv-export.ts`
- **Twilio:** `client.ts`, `send.ts`, `templates.ts`
- **Webhook:** `router.ts`, `state.ts`
- **Other:** `middleware.ts`, `lib/admin/notifications.ts`

---

## Final `lib/` Structure

```
lib/
├── auth/              ← NEW: grouped auth files
│   ├── api-auth.ts
│   ├── cache.ts
│   ├── client.ts
│   ├── context.tsx
│   ├── server.ts
│   └── index.ts
├── date/              ← NEW: consolidated date utilities
│   ├── formatting.ts
│   ├── parsing.ts
│   ├── time-slots.ts
│   ├── constants.ts
│   └── index.ts
├── pdf/               ← NEW: grouped PDF/report files
│   ├── theme.ts
│   ├── utils.ts
│   ├── invoice.ts
│   ├── reports.ts
│   ├── csv-export.ts
│   ├── reporting.ts
│   └── index.ts
├── services/          ← NEW: business logic layer
│   ├── complaint.ts
│   ├── maintenance.ts
│   ├── booking.ts
│   └── broadcast.ts
├── supabase/          ← NEW: split from god file
│   ├── client.ts
│   ├── types.ts
│   ├── constants.ts
│   └── index.ts
├── twilio/            ← EXISTING (documented)
├── webhook/           ← EXISTING (documented)
├── admin/             ← EXISTING (documented)
├── bulk-import/       ← EXISTING
├── bulk-import-units/ ← EXISTING
└── utils.ts           ← STAYS: core cn() helper
```
