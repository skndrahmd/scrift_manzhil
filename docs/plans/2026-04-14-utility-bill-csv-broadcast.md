# Utility Bill CSV Broadcast

**Date:** 2026-04-14  
**Status:** Awaiting approval

---

## Context

Admins need to send individualized utility bill images to residents via WhatsApp. Each resident gets their own unique bill image. The admin provides a CSV mapping house numbers and phone numbers to image filenames, plus the actual bill image files. The system uploads images to Supabase storage, generates public URLs, and sends each resident a WhatsApp message with the link to their bill.

This is distinct from the existing broadcast feature — that sends one message to many; this sends a *different* image to each recipient.

---

## Flow

1. Admin clicks **"Utility Bills"** tab on the Broadcast page
2. A dedicated modal opens with 3 steps:
   - **Step 1 — Upload**: Admin uploads the CSV file and selects all bill image files (multi-file picker)
   - **Step 2 — Preview**: Table shows each row (house no., phone, image filename, matched ✓/✗)
   - **Step 3 — Send**: Progress dialog with per-recipient status (reuses existing broadcast progress UX)

---

## CSV Format

**Required columns** (flexible header matching, same approach as existing bulk importers):

| Column | Aliases |
|--------|---------|
| `house_no` | `apartment`, `unit`, `flat`, `apartment_number` |
| `phone_number` | `phone`, `mobile`, `contact`, `whatsapp` |
| `image_filename` | `invoice`, `invoice_link`, `bill`, `image`, `file` |

Example CSV:
```
house_no,phone_number,image_filename
A-101,+923001234567,A-101-march.jpg
B-202,+923009876543,B-202-march.jpg
```

The admin names their image files to match what they put in `image_filename`. Unmatched rows (no uploaded file with that filename) are shown as errors in the preview and excluded from sending.

---

## Architecture

### New Files

**`lib/bulk-import-utility-bills/parser.ts`**
- Parses CSV using PapaParse (same library as existing importers)
- Flexible header matching (same pattern as `lib/bulk-import/parser.ts`)
- Returns array of `{ houseNo, phone, imageFilename, rowNumber }`
- Validates phone format (Pakistani format: `+923XXXXXXXXX`)
- Cross-references parsed rows against uploaded `File[]` objects by filename
- Returns `{ matched: ParsedBill[], unmatched: ParsedBill[] }`

**`lib/bulk-import-utility-bills/index.ts`**  
- Barrel export

**`app/api/utility-bills/upload/route.ts`**
- `POST` — accepts `multipart/form-data` with multiple image files
- Auth: `verifyAdminAccess("broadcast")`
- For each file: validates it's an image, uploads to Supabase `utility-bills` bucket
- Storage path: `{year}-{month}/{apartment}_{timestamp}.{ext}`
- Returns `{ filename → publicUrl }` map
- Handles partial failures (returns per-file success/error)

**`app/api/utility-bills/send/route.ts`**
- `POST` — accepts `{ recipients: Array<{ phone, houseNo, billUrl }> }`
- Auth: `verifyAdminAccess("broadcast")`
- Checks daily limit against `BROADCAST_LIMITS.DAILY_MESSAGE_LIMIT` (counts toward the 250/day cap shared with regular broadcasts)
- Loops through recipients with same 3s delay + 20-message batch pausing as existing broadcast
- Calls `sendUtilityBillMessage()` for each recipient
- Logs to `broadcast_logs` table (title: `"Utility Bills"`, body: date/count summary)
- Returns `{ success, results: [{houseNo, phone, success, error}], summary }`

**`components/admin/utility-bill-broadcast-modal.tsx`**
- Dialog modal triggered from the Broadcast page
- **Step 1**: Two upload areas — CSV file picker + image files multi-picker. Parse CSV client-side with PapaParse. Match filenames immediately client-side (no API call yet). Show match count: "X of Y bills matched".
- **Step 2**: Preview table — columns: House No., Phone, Image File, Status (matched ✓ / unmatched ✗). Unmatched rows shown in red. Admin can proceed only if ≥ 1 row is matched. Shows total recipient count with soft/hard limit warnings (same thresholds: 50 soft, 100 hard).
- **Step 3**: On confirm, POST images to `/api/utility-bills/upload`, then POST to `/api/utility-bills/send`. Shows same progress dialog pattern as existing `BroadcastForm` (per-recipient status list, summary on completion).

### Modified Files

**`app/admin/broadcast/page.tsx`**
- Add tabs: "Announcements" (existing BroadcastForm) and "Utility Bills" (new modal trigger button)
- Minimal change — wrap existing `<BroadcastForm />` in a tab, add a "Send Utility Bills" button that opens the modal

**`lib/twilio/notifications/broadcast.ts`**
- Add `sendUtilityBillMessage({ phone, houseNo, billUrl })` function
- Reuses the existing `broadcast_announcement` Twilio template:
  - `variable1`: `"Utility Bill - ${houseNo}"`
  - `variable2`: `"Your bill is ready. Tap to view: ${billUrl}"`
- Falls back to freeform message (same pattern as `sendBroadcastAnnouncement`)

---

## Supabase Storage

- **New bucket**: `utility-bills` (must be public — URLs must be accessible by WhatsApp)
- **Path**: `{YYYY-MM}/{apartmentNumber}_{timestamp}.{ext}`
- **File types**: image/* only (jpg, jpeg, png, webp)
- **Setup required**: Admin creates `utility-bills` as a public bucket in Supabase dashboard once before using this feature

---

## Rate Limiting

- Utility bill sends count toward the shared 250/day broadcast limit
- Usage tracked via existing `broadcast_logs` table (no schema change needed)
- Same 3s per-message delay and 30s per-20-batch pause apply
- Soft limit warning at 50, hard confirmation at 100

---

## WhatsApp Message Format

Reuses existing `broadcast_announcement` Twilio template (no new template approval required):

```
[variable1]: Utility Bill - A-101
[variable2]: Your bill is ready. Tap to view: https://...supabase.../utility-bills/2026-04/A-101_1713099600000.jpg
```

The Supabase public URL appears as a tappable link in WhatsApp. Residents tap it to view their bill image in the browser.

---

## Files Summary

| Action | File |
|--------|------|
| Create | `lib/bulk-import-utility-bills/parser.ts` |
| Create | `lib/bulk-import-utility-bills/index.ts` |
| Create | `app/api/utility-bills/upload/route.ts` |
| Create | `app/api/utility-bills/send/route.ts` |
| Create | `components/admin/utility-bill-broadcast-modal.tsx` |
| Modify | `app/admin/broadcast/page.tsx` |
| Modify | `lib/twilio/notifications/broadcast.ts` |

No database schema changes. No new Twilio template required.

---

## Verification

1. Create a test CSV with 2-3 rows pointing to real image filenames
2. Upload the CSV + images in the modal — confirm Step 2 preview shows correct matches
3. Send to test phone numbers — confirm WhatsApp message arrives with a tappable URL
4. Open the URL — confirm the image loads from Supabase storage
5. Check `broadcast_logs` — confirm the send is logged and counts toward daily limit
6. Test an unmatched row (CSV row with no corresponding image) — confirm it's excluded and shown in red
7. Test invalid phone format — confirm error shown in preview
