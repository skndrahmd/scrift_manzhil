# Structured Logging Migration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all ~231 server-side console.log/error/warn calls with structured Pino logging, add ~230 success log statements, and add partial failure warnings to 4 API routes — with ZERO functionality changes.

**Architecture:** Single `lib/logger.ts` module using Pino with child loggers per module. 1:1 replacement of console calls. New info-level logs added as standalone lines at operation boundaries.

**Tech Stack:** Pino (structured JSON logger for Node.js)

**CRITICAL CONSTRAINT:** This migration MUST NOT change any application behavior. No conditional logic, control flow, return values, function signatures, WhatsApp messages, database queries, error handling behavior, or try/catch boundaries may be changed. The ONLY changes are: (1) replacing console.* with log.*, (2) adding new log lines, (3) adding `import` statements, (4) adding optional `warnings` array to 4 API responses. After every task, run `npm run build` to verify.

---

### Task 1: Install Pino and Create Logger Module

**Files:**
- Modify: `package.json` (add pino dependency)
- Create: `lib/logger.ts`

**Step 1: Install pino**

Run: `npm install pino`

**Step 2: Create `lib/logger.ts`**

```typescript
import pino from "pino"

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  redact: ["cnic", "*.cnic", "visitor_cnic", "*.visitor_cnic"],
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: () => `,"ts":"${new Date().toISOString()}"`,
})

export const createLogger = (module: string) => logger.child({ module })

export default logger
```

**Step 3: Verify build**

Run: `npm run build`
Expected: PASS — no errors, logger module compiles

**Step 4: Commit**

```bash
git add lib/logger.ts package.json package-lock.json
git commit -m "feat: add Pino structured logger module"
```

---

### Task 2: Migrate Service Layer (4 files)

These are the highest-priority files — where side-effect failures hide.

**Files:**
- Modify: `lib/services/maintenance.ts`
- Modify: `lib/services/booking.ts`
- Modify: `lib/services/complaint.ts`
- Modify: `lib/services/broadcast.ts`

**Replacement pattern for ALL files in this task and all subsequent tasks:**

```typescript
// ADD at top of file (after existing imports):
import { createLogger } from "@/lib/logger"
const log = createLogger("module-name")  // e.g. "maintenance", "booking", etc.

// REPLACE console.log("message", data) WITH:
log.info({ op: "operation-name", ...contextData }, "message")

// REPLACE console.error("message", error) WITH:
log.error({ op: "operation-name", ...contextData, err: error }, "message")

// REPLACE console.warn("message") WITH:
log.warn({ op: "operation-name", ...contextData }, "message")

// ADD success logs as new lines after successful operations:
log.info({ op: "operation-name", entityId }, "Operation completed successfully")
```

**For `lib/services/maintenance.ts`:**
- Add `import { createLogger } from "@/lib/logger"` and `const log = createLogger("maintenance")`
- Replace all ~7 console.log/error calls with structured log.info/error
- Add success logs after: payment status update, unit sync, WhatsApp send, transaction creation
- Add `const warnings: string[] = []` at the start of `updateMaintenancePaymentStatus`
- In each catch block that currently swallows errors, also push to warnings array
- Change the return to `return { success: true, warnings }`

**For `lib/services/booking.ts`:**
- Add `import { createLogger } from "@/lib/logger"` and `const log = createLogger("booking")`
- Replace all ~8 console.log/error calls with structured log.info/error
- Add success logs after: booking status update, transaction cleanup, WhatsApp send, transaction creation, reminder sends
- Add `const warnings: string[] = []` and push to it on side-effect failures
- Return warnings from the main update function

**For `lib/services/complaint.ts`:**
- Add `import { createLogger } from "@/lib/logger"` and `const log = createLogger("complaint")`
- Replace all ~4 console.log/error/warn calls with structured log equivalents
- Add success logs after: status update, WhatsApp send
- Add `const warnings: string[] = []` and push on notification failures
- Return warnings from the main update function

**For `lib/services/broadcast.ts`:**
- Add `import { createLogger } from "@/lib/logger"` and `const log = createLogger("broadcast")`
- Replace all ~3 console.log/error calls with structured log equivalents
- Add success logs after: batch completion, final summary

**Step: Verify build**

Run: `npm run build`
Expected: PASS

**Step: Commit**

```bash
git add lib/services/maintenance.ts lib/services/booking.ts lib/services/complaint.ts lib/services/broadcast.ts
git commit -m "feat: migrate service layer to Pino structured logging"
```

---

### Task 3: Migrate Cron Jobs (6 files)

**Files:**
- Modify: `app/api/cron/daily-reports/route.ts`
- Modify: `app/api/cron/pending-complaints/route.ts`
- Modify: `app/api/cron/maintenance-reminder/route.ts`
- Modify: `app/api/cron/maintenance-confirmation/route.ts`
- Modify: `app/api/cron/booking-reminder/route.ts`
- Modify: `app/api/cron/booking-confirmation/route.ts`

**For each file:**
- Add `import { createLogger } from "@/lib/logger"` and `const log = createLogger("cron")`
- Replace all console.log/error/warn calls with structured equivalents
- Add `log.info({ op: "cron-start", job: "job-name" }, "Cron job started")` at the start of each POST handler
- Add `log.info({ op: "cron-complete", job: "job-name", ...counts }, "Cron job completed")` before the success response
- Use context like `{ job: "daily-reports", recipientCount, sentCount, failedCount }` for cron completion logs
- For per-item loops, log each item's success/failure with its ID

**Step: Verify build**

Run: `npm run build`
Expected: PASS

**Step: Commit**

```bash
git add app/api/cron/
git commit -m "feat: migrate cron jobs to Pino structured logging"
```

---

### Task 4: Migrate Twilio/Messaging (3 files)

**Files:**
- Modify: `lib/twilio/send.ts`
- Modify: `lib/twilio/client.ts`
- Modify: `app/api/twilio/send-template/route.ts`

**For each file:**
- Add `import { createLogger } from "@/lib/logger"` and `const log = createLogger("twilio")`
- Replace all ~17 console.log/error/warn calls with structured equivalents
- Include `phone`, `sid`, `errorCode` in context where available
- Add success log after each successful message send with the Twilio SID

**Step: Verify build**

Run: `npm run build`
Expected: PASS

**Step: Commit**

```bash
git add lib/twilio/send.ts lib/twilio/client.ts app/api/twilio/send-template/route.ts
git commit -m "feat: migrate Twilio messaging to Pino structured logging"
```

---

### Task 5: Migrate Webhook Core (5 files)

**Files:**
- Modify: `app/api/webhook/route.ts`
- Modify: `lib/webhook/profile.ts`
- Modify: `lib/webhook/router.ts`
- Modify: `lib/webhook/messages.ts`
- Modify: `lib/webhook/menu.ts`

**For each file:**
- Add `import { createLogger } from "@/lib/logger"` and `const log = createLogger("webhook")`
- Replace all console.log/error/warn calls with structured equivalents
- Include `phone`, `step`, `messageType` in context where available
- Add success logs for: profile found, message routed, cache loaded
- **CRITICAL: Do NOT change any message text, routing logic, menu construction, or state management. Only replace/add log lines.**

**Step: Verify build**

Run: `npm run build`
Expected: PASS

**Step: Commit**

```bash
git add app/api/webhook/route.ts lib/webhook/profile.ts lib/webhook/router.ts lib/webhook/messages.ts lib/webhook/menu.ts
git commit -m "feat: migrate webhook core to Pino structured logging"
```

---

### Task 6: Migrate Webhook Handlers (8 files)

**Files:**
- Modify: `lib/webhook/handlers/complaint.ts`
- Modify: `lib/webhook/handlers/staff.ts`
- Modify: `lib/webhook/handlers/booking.ts`
- Modify: `lib/webhook/handlers/hall.ts`
- Modify: `lib/webhook/handlers/visitor.ts`
- Modify: `lib/webhook/handlers/feedback.ts`
- Modify: `lib/webhook/handlers/payment.ts`
- Modify: `lib/webhook/handlers/status.ts`

**For each file:**
- Add `import { createLogger } from "@/lib/logger"` and `const log = createLogger("webhook")` (same module as core)
- Replace all ~39 console.log/error/warn calls with structured equivalents
- Include handler-specific context: `complaintId`, `bookingId`, `visitorId`, `staffId`, `phone`
- Add success logs for: complaint created, booking confirmed, visitor pass saved, staff added, feedback submitted, payment receipt uploaded
- **CRITICAL: Do NOT change any flow logic, message responses, state transitions, or user-facing text. Only replace/add log lines.**

**Step: Verify build**

Run: `npm run build`
Expected: PASS

**Step: Commit**

```bash
git add lib/webhook/handlers/
git commit -m "feat: migrate webhook handlers to Pino structured logging"
```

---

### Task 7: Migrate Unit & Resident API Routes (7 files)

**Files:**
- Modify: `app/api/units/toggle-primary/route.ts`
- Modify: `app/api/units/route.ts`
- Modify: `app/api/units/check-duplicates/route.ts`
- Modify: `app/api/units/bulk-import/route.ts`
- Modify: `app/api/residents/bulk-import/route.ts`
- Modify: `app/api/residents/check-duplicates/route.ts`
- Modify: `app/api/residents/welcome-message/route.ts`

**For each file:**
- Add `import { createLogger } from "@/lib/logger"` and `const log = createLogger("units")` or `createLogger("residents")`
- Replace all console.log/error calls with structured equivalents
- Include `unitId`, `profileId`, `apartmentNumber`, `phone` in context where available
- Add success logs for: unit created/updated, resident imported, primary toggled, welcome message sent

**For `toggle-primary/route.ts` specifically:**
- Add `const warnings: string[] = []` at the start
- In the reassignment catch block, push to warnings: `warnings.push("Failed to reassign maintenance payments")`
- Change the success response to include warnings: `{ success: true, warnings }`
- Log each step: unset old primary, set new primary, reassign payments

**Step: Verify build**

Run: `npm run build`
Expected: PASS

**Step: Commit**

```bash
git add app/api/units/ app/api/residents/
git commit -m "feat: migrate unit and resident routes to Pino structured logging"
```

---

### Task 8: Migrate Auth & Admin Routes (6 files)

**Files:**
- Modify: `app/api/auth/send-otp/route.ts`
- Modify: `app/api/auth/verify-otp/route.ts`
- Modify: `app/api/admin/staff/route.ts`
- Modify: `app/api/admin/staff/[id]/route.ts`
- Modify: `app/api/admin/staff/[id]/permissions/route.ts`
- Modify: `app/api/admin/payment-methods/route.ts`

**For each file:**
- Add `import { createLogger } from "@/lib/logger"` and `const log = createLogger("auth")` or `createLogger("admin")`
- Replace all ~25 console.log/error calls with structured equivalents
- Include `phone`, `email`, `adminId`, `staffId` in context where available
- Add success logs for: OTP sent, OTP verified, staff created/updated/deleted, permissions updated

**Step: Verify build**

Run: `npm run build`
Expected: PASS

**Step: Commit**

```bash
git add app/api/auth/ app/api/admin/
git commit -m "feat: migrate auth and admin routes to Pino structured logging"
```

---

### Task 9: Migrate Accounting & Parcel Routes (8 files)

**Files:**
- Modify: `app/api/accounting/categories/route.ts`
- Modify: `app/api/accounting/expenses/route.ts`
- Modify: `app/api/accounting/transactions/route.ts`
- Modify: `app/api/accounting/summary/route.ts`
- Modify: `app/api/parcels/upload/route.ts`
- Modify: `app/api/parcels/collect/route.ts`
- Modify: `app/api/parcels/notify/route.ts`
- Modify: `app/api/parcels/list/route.ts`
- Modify: `app/api/parcels/update-status/route.ts`

**For each file:**
- Add `import { createLogger } from "@/lib/logger"` and `const log = createLogger("accounting")` or `createLogger("parcels")`
- Replace all console.log/error calls with structured equivalents
- Include `categoryId`, `expenseId`, `transactionId`, `parcelId`, `residentId` in context where available
- Add success logs for: category CRUD, expense CRUD, transaction CRUD, parcel uploaded/collected/notified

**Step: Verify build**

Run: `npm run build`
Expected: PASS

**Step: Commit**

```bash
git add app/api/accounting/ app/api/parcels/
git commit -m "feat: migrate accounting and parcel routes to Pino structured logging"
```

---

### Task 10: Migrate Bot Messages, Templates, Visitors & Remaining API Routes (10+ files)

**Files:**
- Modify: `app/api/bot-messages/route.ts`
- Modify: `app/api/bot-messages/[key]/route.ts`
- Modify: `app/api/whatsapp-templates/route.ts`
- Modify: `app/api/whatsapp-templates/[key]/route.ts`
- Modify: `app/api/whatsapp-templates/test-send/route.ts`
- Modify: `app/api/visitors/notify-arrival/route.ts`
- Modify: `app/api/broadcast/send/route.ts`
- Modify: `app/api/broadcast/usage/route.ts`
- Modify: `app/api/complaints/update-status/route.ts`
- Modify: `app/api/maintenance/update-status/route.ts`
- Modify: `app/api/maintenance/ensure-months/route.ts`
- Modify: `app/api/bookings/update-payment-status/route.ts`
- Modify: `app/api/bookings/send-reminder/route.ts`
- Modify: `app/api/payment-methods/route.ts`
- Modify: `app/api/payment-verifications/route.ts`
- Modify: `app/api/payment-verifications/[id]/route.ts`

**For each file:**
- Add appropriate `import { createLogger }` and child logger
- Replace all console.log/error calls with structured equivalents
- Add success logs at each operation boundary

**For the 3 status-update wrapper routes** (`complaints/update-status`, `maintenance/update-status`, `bookings/update-payment-status`):
- These call the service layer functions that now return `warnings`
- Pass the warnings through in the JSON response: `return NextResponse.json({ ...result, warnings })`
- If the service functions don't return warnings in their type, destructure safely: `const { success, warnings = [] } = result`

**Step: Verify build**

Run: `npm run build`
Expected: PASS

**Step: Commit**

```bash
git add app/api/bot-messages/ app/api/whatsapp-templates/ app/api/visitors/ app/api/broadcast/ app/api/complaints/ app/api/maintenance/ app/api/bookings/ app/api/payment-methods/ app/api/payment-verifications/
git commit -m "feat: migrate remaining API routes to Pino structured logging"
```

---

### Task 11: Migrate Languages API Routes (~7 files)

**Files:**
- Modify: `app/api/languages/route.ts`
- Modify: `app/api/languages/supported/route.ts`
- Modify: `app/api/languages/[code]/route.ts`
- Modify: `app/api/languages/[code]/retranslate-all/route.ts`
- Modify: `app/api/languages/[code]/translations/route.ts` (if exists)
- Modify: `app/api/languages/[code]/translations/[key]/route.ts`
- Modify: `app/api/languages/[code]/translations/[key]/retranslate/route.ts`

**For each file:**
- Add `import { createLogger } from "@/lib/logger"` and `const log = createLogger("languages")`
- Replace all console.error calls with structured log.error
- Add success logs for: language added, translation updated, retranslation completed

**Step: Verify build**

Run: `npm run build`
Expected: PASS

**Step: Commit**

```bash
git add app/api/languages/
git commit -m "feat: migrate languages routes to Pino structured logging"
```

---

### Task 12: Migrate Lib Utility Files (4 files)

**Files:**
- Modify: `lib/admin/notifications.ts`
- Modify: `lib/auth/api-auth.ts`
- Modify: `lib/auth/context.tsx`
- Modify: `middleware.ts`

**For `lib/admin/notifications.ts`:**
- Add `const log = createLogger("notifications")`
- Replace all ~12 console.log/error/warn calls
- Add success logs for: recipients fetched with count

**For `lib/auth/api-auth.ts`:**
- Add `const log = createLogger("auth")`
- Replace the 1 console.error call
- Add success log for: admin access verified

**For `lib/auth/context.tsx`:**
- Add `const log = createLogger("auth")`
- Replace all ~3 console.error calls
- Add success log for: auth context loaded

**For `middleware.ts`:**
- Add `const log = createLogger("middleware")`
- Replace the 1 console.error call

**Note:** `lib/auth/context.tsx` runs client-side — check if it's a server component or client component. If it has `"use client"`, keep console.error (Pino won't work in browser). If server-only, migrate to Pino.

**Step: Verify build**

Run: `npm run build`
Expected: PASS

**Step: Commit**

```bash
git add lib/admin/notifications.ts lib/auth/api-auth.ts lib/auth/context.tsx middleware.ts
git commit -m "feat: migrate lib utilities and middleware to Pino structured logging"
```

---

### Task 13: Migrate Payment Verification Service (1 file)

**Files:**
- Modify: `lib/services/payment-verification.ts`

**Steps:**
- Add `import { createLogger } from "@/lib/logger"` and `const log = createLogger("payment-verification")`
- Replace all ~3 console.error calls with structured log.error
- Add success logs for: payment approved, payment rejected, underlying payment updated

**Step: Verify build**

Run: `npm run build`
Expected: PASS

**Step: Commit**

```bash
git add lib/services/payment-verification.ts
git commit -m "feat: migrate payment verification service to Pino structured logging"
```

---

### Task 14: Final Verification — Full Build + Console Audit

**Step 1: Full build**

Run: `npm run build`
Expected: PASS with zero errors

**Step 2: Verify no remaining server-side console calls**

Run: `grep -rn "console\.\(log\|error\|warn\)" lib/ app/api/ middleware.ts --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".next"`

Expected: Zero results (all server-side console calls migrated). If any remain, they were missed — go back and fix.

**Note:** Client-side files (`components/`, `app/admin/`, public pages) are intentionally excluded from this check — they keep console.error.

**Step 3: Commit any stragglers**

If Step 2 found missed files, fix them and commit.

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete structured logging migration — all server-side files using Pino"
```

---

## Summary

| Task | Files | What |
|------|-------|------|
| 1 | 2 | Install Pino + create logger module |
| 2 | 4 | Service layer + warnings array |
| 3 | 6 | Cron jobs |
| 4 | 3 | Twilio/messaging |
| 5 | 5 | Webhook core |
| 6 | 8 | Webhook handlers |
| 7 | 7 | Unit & resident routes + toggle-primary warnings |
| 8 | 6 | Auth & admin routes |
| 9 | 9 | Accounting & parcel routes |
| 10 | 16 | Bot messages, templates, visitors, remaining routes + status-update warnings passthrough |
| 11 | 7 | Languages routes |
| 12 | 4 | Lib utilities + middleware |
| 13 | 1 | Payment verification service |
| 14 | 0 | Final verification + console audit |
| **Total** | **~78 changes** | **14 tasks, 14 commits** |
