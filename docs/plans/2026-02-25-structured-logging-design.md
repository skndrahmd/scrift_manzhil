# Structured Logging with Pino — Design Document

## Problem

The codebase has 311 console.log/error/warn calls across 83 files. Logging is inconsistent — some operations log detailed context, others are generic. Side-effect failures (WhatsApp sends, transaction creation, unit syncs) are caught and logged but return success to the client, making bugs like the toggle-primary issue invisible until they surface in demos.

## Goals

1. Full visibility into every server-side operation (success and failure)
2. Structured JSON output filterable in Vercel Function Logs
3. Partial failure warnings surfaced in API responses
4. CNIC redaction for security (phone numbers kept visible for Twilio debugging)

## Solution

### 1. Logger Module (`lib/logger.ts`)

Pino structured logger with child loggers per module.

- **Dependency:** `pino` npm package
- **Log levels:** `debug` in development, `info` in production
- **Redaction:** CNIC fields only (`cnic`, `*.cnic`)
- **Output:** JSON with `level`, `module`, `op`, entity IDs, `ts`
- **Child loggers:** `createLogger("maintenance")`, `createLogger("webhook")`, etc.

### 2. Server-Side Migration (~60 files, ~231 existing calls)

Replace all `console.log`, `console.error`, `console.warn` with structured Pino equivalents. Add success logging at every operation boundary.

#### Files by category:

**Service Layer (4 files, ~22 calls):**
- `lib/services/maintenance.ts`
- `lib/services/booking.ts`
- `lib/services/complaint.ts`
- `lib/services/broadcast.ts`

**Cron Jobs (6 files, ~33 calls):**
- `app/api/cron/daily-reports/route.ts`
- `app/api/cron/pending-complaints/route.ts`
- `app/api/cron/maintenance-reminder/route.ts`
- `app/api/cron/maintenance-confirmation/route.ts`
- `app/api/cron/booking-reminder/route.ts`
- `app/api/cron/booking-confirmation/route.ts`

**Twilio/Messaging (3 files, ~17 calls):**
- `lib/twilio/send.ts`
- `lib/twilio/client.ts`
- `app/api/twilio/send-template/route.ts`

**Webhook/Bot (13 files, ~74 calls):**
- `app/api/webhook/route.ts`
- `lib/webhook/profile.ts`
- `lib/webhook/router.ts`
- `lib/webhook/messages.ts`
- `lib/webhook/menu.ts`
- `lib/webhook/handlers/complaint.ts`
- `lib/webhook/handlers/staff.ts`
- `lib/webhook/handlers/booking.ts`
- `lib/webhook/handlers/hall.ts`
- `lib/webhook/handlers/visitor.ts`
- `lib/webhook/handlers/feedback.ts`
- `lib/webhook/handlers/payment.ts`
- `lib/webhook/handlers/status.ts`

**API Routes (28 files, ~65 calls):**
- `app/api/units/toggle-primary/route.ts`
- `app/api/units/route.ts`
- `app/api/units/check-duplicates/route.ts`
- `app/api/units/bulk-import/route.ts`
- `app/api/residents/bulk-import/route.ts`
- `app/api/residents/check-duplicates/route.ts`
- `app/api/residents/welcome-message/route.ts`
- `app/api/auth/send-otp/route.ts`
- `app/api/auth/verify-otp/route.ts`
- `app/api/admin/staff/route.ts`
- `app/api/admin/staff/[id]/route.ts`
- `app/api/admin/staff/[id]/permissions/route.ts`
- `app/api/admin/payment-methods/route.ts`
- `app/api/accounting/categories/route.ts`
- `app/api/accounting/expenses/route.ts`
- `app/api/accounting/transactions/route.ts`
- `app/api/accounting/summary/route.ts`
- `app/api/parcels/upload/route.ts`
- `app/api/parcels/collect/route.ts`
- `app/api/parcels/notify/route.ts`
- `app/api/parcels/list/route.ts`
- `app/api/parcels/update-status/route.ts`
- `app/api/visitors/notify-arrival/route.ts`
- `app/api/bot-messages/route.ts`
- `app/api/bot-messages/[key]/route.ts`
- `app/api/whatsapp-templates/route.ts`
- `app/api/whatsapp-templates/[key]/route.ts`
- `app/api/whatsapp-templates/test-send/route.ts`

**Other Server Files (6+ files, ~20 calls):**
- `lib/admin/notifications.ts`
- `lib/auth/api-auth.ts`
- `lib/auth/context.tsx`
- `middleware.ts`
- `app/api/languages/*` (~7 files)
- `app/api/payment-verifications/*` (~2 files)
- `app/api/broadcast/send/route.ts`
- `app/api/broadcast/usage/route.ts`
- `app/api/complaints/update-status/route.ts`
- `app/api/maintenance/update-status/route.ts`
- `app/api/maintenance/ensure-months/route.ts`
- `app/api/bookings/update-payment-status/route.ts`
- `app/api/bookings/send-reminder/route.ts`
- `app/api/payment-methods/route.ts`

### 3. Success Logging Added

Every operation boundary gets info-level logging:
- DB queries: entity IDs, row count
- WhatsApp sends: recipient phone, Twilio SID
- Cron jobs: job name, start time, processed/sent/failed counts
- API requests: method, route, key params, response status
- Auth checks: admin ID, role, page
- File uploads: file size, storage path
- Payment changes: payment ID, old to new status
- Toggle primary: unit ID, old to new profile
- Transaction creation: type, amount, reference ID
- Notification lookups: recipient count
- Broadcast batches: batch number, success/fail count

### 4. Partial Failure Warnings in API Responses

Four key routes return `warnings: string[]` when side-effects fail:
- `app/api/units/toggle-primary/route.ts` — reassignment failures
- `app/api/maintenance/update-status/route.ts` — unit sync / notification failures
- `app/api/bookings/update-payment-status/route.ts` — transaction / notification failures
- `app/api/complaints/update-status/route.ts` — notification failures

Response format: `{ success: true, warnings: ["Failed to send WhatsApp confirmation"] }`

### 5. Client-Side Files (NOT migrated)

~18 files with ~54 console calls in browser components stay as `console.error`. Pino doesn't run in the browser. These are:
- `components/admin/*` (staff-management, broadcast-form, parcels-table, etc.)
- `components/accounting/*` (accounting-tab, payment-verifications-table)
- `components/user-menu.tsx`, `components/settings-dialog.tsx`
- `app/admin/units/[id]/page.tsx`, `app/admin/layout.tsx`
- Public invoice/report pages

## CRITICAL CONSTRAINT: Zero Functionality Changes

**This migration MUST NOT change any application behavior.** Only logging statements are added or replaced. Specifically:

- **DO NOT** change any conditional logic, control flow, or return values
- **DO NOT** reorder, move, or restructure any code — only add/replace log lines in place
- **DO NOT** change any function signatures, parameters, or exports
- **DO NOT** change any WhatsApp message text, bot flow logic, or menu behavior
- **DO NOT** change any database queries, filters, or write operations
- **DO NOT** change any error handling behavior (catch blocks keep the same logic, just replace console.error with log.error)
- **DO NOT** add, remove, or modify any try/catch boundaries
- **DO NOT** change any API response shapes (except adding the optional `warnings` array to the 4 specified routes)
- **EVERY change** should be a 1:1 replacement: `console.log(...)` becomes `log.info(...)`, `console.error(...)` becomes `log.error(...)`, `console.warn(...)` becomes `log.warn(...)`
- **New success logs** are added as new lines only — never replacing or wrapping existing logic

**Verification:** After migration, `npm run build` must pass and all existing behavior must be identical. The only observable difference should be structured JSON in log output instead of plain text.

## What We're NOT Building

- No DB error table
- No admin dashboard error view
- No WhatsApp error alerts
- No frontend toast changes for warnings (warnings exist in response for future use)
- No client-side logging changes

## Estimated Scope

- ~60 server-side files modified
- ~231 existing console calls replaced
- ~230 new success log statements added
- ~460 total structured log statements
- 1 new file: `lib/logger.ts`
- 1 new dependency: `pino`
