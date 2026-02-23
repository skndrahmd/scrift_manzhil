# Design: Online Payment Receipts + CLI Setup Wizard

**Date:** 2026-02-23
**Status:** Approved

---

## Initiative 1: Online Payment Receipt System

### Problem

Residents currently pay maintenance and booking fees via cash or manual bank transfer, with admins tracking payments manually. There's no digital receipt submission or verification workflow.

### Solution

A structured payment receipt upload flow via the WhatsApp bot, with admin verification in the dashboard. Supports multiple configurable payment methods (JazzCash, EasyPaisa, bank transfer).

### Database Schema

#### `payment_methods` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| type | text NOT NULL | 'jazzcash', 'easypaisa', 'bank_transfer' |
| account_title | text NOT NULL | e.g. "Scrift Properties" |
| account_number | text NOT NULL | Phone number or bank account |
| bank_name | text | Only for bank_transfer type |
| is_enabled | boolean DEFAULT true | Toggle per method |
| sort_order | integer DEFAULT 0 | Display ordering |
| created_at | timestamptz DEFAULT now() | |
| updated_at | timestamptz DEFAULT now() | |

#### `payment_verifications` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| payment_type | text NOT NULL | 'maintenance' or 'booking' |
| maintenance_payment_id | uuid FK | Nullable, references maintenance_payments(id) |
| booking_id | uuid FK | Nullable, references bookings(id) |
| unit_id | uuid FK NOT NULL | References units(id) |
| resident_id | uuid FK NOT NULL | References profiles(id) |
| payment_method_id | uuid FK | References payment_methods(id) |
| amount | decimal NOT NULL | |
| receipt_image_url | text NOT NULL | Supabase Storage path |
| status | text DEFAULT 'pending' | 'pending', 'approved', 'rejected' |
| rejection_reason | text | Optional, set by admin on reject |
| reviewed_by | uuid FK | References admin_users(id) |
| reviewed_at | timestamptz | |
| created_at | timestamptz DEFAULT now() | |

#### Supabase Storage

New `payment-receipts` bucket. Upload via service role, admin read access.

### WhatsApp Bot Flow

New main menu option: **"Submit Payment"**

```
Resident selects "Submit Payment"
  -> Check if any payment methods enabled
    -> None: "Online payment is not available. Please contact your building admin."
    -> Yes: "What are you paying for?\n1. Maintenance\n2. Hall Booking"

Resident picks type (maintenance or booking)
  -> Fetch pending payments of that type for resident's unit
    -> None: "No pending payments found!"
    -> One: Auto-select, show details
    -> Multiple: List them, resident picks by number

Resident picks a payment
  -> Check no existing 'pending' verification for this payment
    -> Exists: "You already submitted a receipt for this. It's being verified."
  -> Show all enabled payment methods:
    "Please send PKR {amount} to one of these:
     1. JazzCash — {title} — {number}
     2. EasyPaisa — {title} — {number}
     After payment, send a screenshot of your receipt."
  -> Enter payment_receipt_upload state

Resident sends image
  -> Upload to payment-receipts Storage bucket
  -> Create payment_verifications record (status: pending)
  -> "Receipt received for {description}! We'll verify shortly."
  -> Notify admin(s) via WhatsApp
  -> Return to main menu

Resident sends non-image in upload state
  -> "Please send a photo/screenshot of your payment receipt."
  -> Stay in upload state
```

#### Conversation states

- `payment_type_selection` — asking maintenance or booking
- `payment_selection` — listing pending payments
- `payment_receipt_upload` — waiting for image

#### New bot messages (bot_messages table)

- `payment_menu` — "What are you paying for?"
- `payment_no_methods` — "Online payment is not available..."
- `payment_no_pending` — "No pending payments found!"
- `payment_already_submitted` — "You already submitted a receipt..."
- `payment_methods_list` — "Please send PKR {amount} to one of these:..."
- `payment_receipt_received` — "Receipt received for {description}!"
- `payment_send_image` — "Please send a photo/screenshot..."
- `payment_approved` — "Your payment for {description} has been verified!"
- `payment_rejected` — "Your receipt for {description} was not accepted. Reason: {reason}"
- `labels.payment_menu_options` — "Maintenance\nHall Booking"

### Admin Dashboard

#### Payment Verification Tab (in Accounting page)

- Table: Resident, Unit, Type, Amount, Submitted, Receipt thumbnail, Status, Actions
- Click thumbnail -> modal with full-size zoomable image
- Actions: Approve / Reject (reject shows reason dialog)
- Filters: Status (Pending/Approved/Rejected), Type (All/Maintenance/Booking)
- Sidebar badge showing pending count

#### On Approve

1. Update `payment_verifications.status` -> 'approved', set reviewed_by/at
2. Update `maintenance_payments` or `bookings` payment status -> 'paid'
3. Send WhatsApp confirmation to resident
4. Create accounting `transaction` record

#### On Reject

1. Update `payment_verifications.status` -> 'rejected' with reason
2. Send WhatsApp to resident with rejection reason
3. Resident can re-upload for the same payment

#### Unit Detail Page

- Maintenance/booking rows with verification requests show receipt icon
- Clicking opens the same receipt modal

#### Payment Methods Settings (in /admin/settings)

- New "Payment Methods" tab (super_admin only)
- CRUD for payment methods: type, account title, account number, bank name, enabled toggle
- Multiple methods supported, drag-to-reorder
- If no methods enabled, "Submit Payment" hidden from bot menu

### API Routes

```
GET    /api/payment-methods              — List enabled methods (bot)
GET    /api/admin/payment-methods        — List all methods (admin)
POST   /api/admin/payment-methods        — Create method
PATCH  /api/admin/payment-methods/[id]   — Update method
DELETE /api/admin/payment-methods/[id]   — Delete method

POST   /api/payment-verifications/upload — Upload receipt (bot)
GET    /api/payment-verifications        — List verifications (admin)
PATCH  /api/payment-verifications/[id]   — Approve/reject (admin)
```

### WhatsApp Templates (new Twilio content templates)

- `payment_receipt_received` — Confirmation to resident after upload
- `payment_receipt_verified` — Approval/rejection notification to resident
- `payment_receipt_admin_alert` — New receipt notification to admin

---

## Initiative 2: CLI Setup Wizard

### Problem

Setting up a new Manzhil instance requires manually running SQL schemas, configuring 30+ env vars, creating Twilio templates, and touching many config files. Error-prone and time-consuming.

### Solution

Interactive `npm run setup` CLI wizard that walks through the entire provisioning process step-by-step with validation.

### Technical Approach

- Entry point: `scripts/setup.ts` via `npx tsx scripts/setup.ts`
- npm script: `"setup": "tsx scripts/setup.ts"`
- Interactive prompts: `@inquirer/prompts` package
- Idempotent: safe to re-run, detects existing state

### Setup Steps

#### Step 1: Supabase Connection
- Prompt for URL, anon key, service role key
- Validate by testing connection
- Store for later steps

#### Step 2: Database Setup
- Read SQL files from `sql/` directory
- Execute schema migration (22 tables)
- Seed bot messages (125 messages)
- Seed WhatsApp templates (20 templates)
- Seed multilingual schema
- Check if tables exist to avoid re-running

#### Step 3: Building Configuration
- Building name, address
- Number of floors
- Hall names
- Default maintenance charge
- Store in building_settings / booking_settings

#### Step 4: Twilio WhatsApp
- Account SID, auth token, WhatsApp number
- Validate connection
- Optional: configure template SIDs now or later

#### Step 5: Google Translate (Optional)
- API key for multilingual bot
- Validate with test translation
- Skip if not needed

#### Step 6: Admin Account
- Email, password, display name, phone
- Create auth user via supabaseAdmin
- Insert into admin_users as super_admin

#### Step 7: App Configuration
- App URL for public links
- Auto-generate CRON_SECRET
- Generate `.env.local` with all values

### Safety Features

- **Idempotent** — detects existing tables/data, skips safely
- **Backup prompt** — asks before overwriting existing .env.local
- **Validation** — bad credentials fail immediately with clear errors
- **Dry run** — `npm run setup -- --dry-run` mode
- **Partial recovery** — re-running picks up from last successful step

### File Structure

```
scripts/
├── setup.ts           — Main wizard entry point & step orchestration
├── setup/
│   ├── supabase.ts    — Database connection & migration
│   ├── building.ts    — Building configuration prompts
│   ├── twilio.ts      — Twilio validation & setup
│   ├── admin.ts       — Admin account creation
│   ├── env.ts         — .env.local file generation
│   └── utils.ts       — Shared helpers (spinner, validation, colors)
```

### New Dependency

```json
"devDependencies": {
  "@inquirer/prompts": "^7.0.0"
}
```

---

## Implementation Priority

1. **Payment Methods Settings** (admin) — foundation for payment flow
2. **Payment Receipt Bot Flow** — resident-facing feature
3. **Payment Verification Dashboard** — admin approval workflow
4. **CLI Setup Wizard** — developer experience improvement
