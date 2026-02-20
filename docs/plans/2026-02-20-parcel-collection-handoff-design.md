# Parcel Collection Handoff — Design Doc
**Date:** 2026-02-20
**Status:** Approved

## Overview

Add a **collector verification flow** to the parcel/delivery section. When someone arrives to collect a parcel, the admin records the collector's identity (name, phone, CNIC), notifies the parcel owner via WhatsApp, and marks the parcel as collected — all in one action.

---

## Full Parcel Lifecycle

| Step | Action | Who | Result |
|------|--------|-----|--------|
| 1 | Register Parcel | Admin | Auto-sends arrival WhatsApp to resident. Status: `pending`. *(unchanged)* |
| 2 | Notify (reminder) | Admin | Re-sends arrival WhatsApp ("your parcel is at reception"). Status stays `pending`. *(unchanged)* |
| 3 | Collect & Notify | Admin | Opens collector modal → sends collection WhatsApp to resident → status: `collected`. *(new)* |

---

## Database

Add 3 nullable columns to the `parcels` table:

```sql
ALTER TABLE parcels
  ADD COLUMN collector_name TEXT,
  ADD COLUMN collector_phone TEXT,
  ADD COLUMN collector_cnic TEXT;
```

- All nullable — only populated when parcel is collected via the "Collect & Notify" flow.
- `collected_at` and `status = 'collected'` set at the same time.

Update `Parcel` type in `lib/supabase.ts`:
```typescript
collector_name: string | null
collector_phone: string | null
collector_cnic: string | null
```

---

## API

### New route: `POST /api/parcels/collect`

Dedicated endpoint for the collection handoff. Accepts:

```json
{
  "parcel_id": "uuid",
  "collector_name": "string (required)",
  "collector_phone": "string (required)",
  "collector_cnic": "string (required)"
}
```

Actions (in order):
1. Validate admin access (`verifyAdminAccess("parcels")`)
2. Fetch parcel with resident profile (name, phone, apartment)
3. Update parcel: `status = 'collected'`, `collected_at = now()`, store 3 collector fields
4. Send collection WhatsApp to resident via `sendParcelCollectionNotification()`
5. Return updated parcel

### Existing routes — unchanged:
- `POST /api/parcels/notify` — resend arrival reminder (keeps current behavior)
- `POST /api/parcels/update-status` — status updates for `returned` (no change)
- `POST /api/parcels/upload` — register new parcel (no change)
- `GET /api/parcels/list` — list parcels (no change)

---

## WhatsApp Notification

New function `sendParcelCollectionNotification()` in `lib/twilio/notifications/parcel.ts`.

New template key: `parcel_collection` (added to `whatsapp_templates` seed SQL).

**Fallback message** (used when no Twilio template is configured):

```
📦 *Parcel Collected*

Hi {residentName}, your parcel has been collected by:

Name: {collectorName}
Phone: {collectorPhone}
CNIC: {collectorCnic}

— Manzhil
```

**Suggested Twilio template body:**
```
Hello, this is Manzhil by Scrift.

Hi {{1}}, your parcel has been collected by {{2}} (CNIC: {{3}}, Phone: {{4}}).
```

Template variables: `1` = resident name, `2` = collector name, `3` = collector CNIC, `4` = collector phone.

---

## UI Changes (`components/admin/parcels-table.tsx`)

### Pending parcel action buttons — before vs after:

| Before | After |
|--------|-------|
| View Details | View Details *(unchanged)* |
| Notify (resend arrival) | Notify *(unchanged)* |
| Mark as Collected | **Collect & Notify** *(replaces)* |

### New "Collect & Notify" modal:

- Triggered by the "Collect & Notify" button on any pending parcel
- Three required fields: **Collector Name**, **Collector Phone**, **Collector CNIC**
- Submit button calls `POST /api/parcels/collect`
- On success: parcel moves to `collected` status in local state (removed from pending list)
- On error: toast notification with error message
- Cancel button closes modal without action

### Rationale for removing "Mark as Collected":
Collection is enforced to always record who collected the parcel. This ensures accountability and provides an audit trail for security purposes.

---

## Files to Change

| File | Change |
|------|--------|
| `lib/supabase.ts` | Add 3 fields to `Parcel` type |
| `lib/twilio/notifications/parcel.ts` | Add `sendParcelCollectionNotification()` |
| `app/api/parcels/collect/route.ts` | New API route (create file) |
| `components/admin/parcels-table.tsx` | Replace "Mark as Collected" with "Collect & Notify" + modal |
| `database-seed-whatsapp-templates.sql` | Add `parcel_collection` template entry |
