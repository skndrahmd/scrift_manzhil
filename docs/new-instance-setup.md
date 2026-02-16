# New Instance Setup Guide — Manzhil by Scrift

Step-by-step guide for deploying a new client instance of the Manzhil Building Management System.

---

## 1. Prerequisites

Before starting, ensure you have access to:

- **Supabase** account (free tier works for small buildings) — [supabase.com](https://supabase.com)
- **Twilio** account with WhatsApp Business API access — [twilio.com](https://twilio.com)
- **Vercel** account (recommended) or a VPS with Docker — [vercel.com](https://vercel.com)
- **GitHub** repository access to the Manzhil codebase
- A dedicated **phone number** for WhatsApp Business (via Twilio)

---

## 2. Supabase Setup

### 2.1 Create Project

1. Log in to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Choose organization, set project name (e.g., `manzhil-clientname`)
4. Set a strong database password (save it — you won't see it again)
5. Select region closest to your users (for Pakistan: **Mumbai** or **Singapore**)
6. Wait for project to provision (~2 minutes)

### 2.2 Run Database Schema

1. Go to **SQL Editor** in Supabase Dashboard
2. Open `database-complete-schema.sql` from the repo
3. Paste the entire contents and click **Run**
4. This creates all 20 tables, RLS policies, indexes, and triggers

### 2.3 Run Seed Data

Run these SQL files in order in the SQL Editor:

1. `database-seed-bot-messages.sql` — Seeds ~115 bot message templates
2. `database-seed-whatsapp-templates.sql` — Seeds 20 WhatsApp template records

Both use `ON CONFLICT DO NOTHING`, so they're safe to re-run.

### 2.4 Create Storage Buckets

Go to **Storage** in Supabase Dashboard and create these buckets:

| Bucket Name | Public | Purpose |
|-------------|--------|---------|
| `cnic-images` | No | Resident CNIC document images |
| `parcel-images` | Yes | Parcel/delivery photos |
| `parcels` | Yes | Parcel upload images (used by upload API) |
| `policies` | Yes | Building policies PDF |

For the `policies` bucket:
1. Upload the building's event/policies PDF
2. Generate a signed URL (or use public URL)
3. Save this URL for `POLICIES_PDF_URL` env var

### 2.5 Collect Supabase Credentials

Go to **Settings > API** and collect:

- `NEXT_PUBLIC_SUPABASE_URL` — Project URL (e.g., `https://xxxx.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — service_role key (keep secret!)

---

## 3. Twilio Setup

### 3.1 WhatsApp Business API

1. Log in to [Twilio Console](https://console.twilio.com)
2. Navigate to **Messaging > Try it out > Send a WhatsApp message**
3. Set up your WhatsApp Business sender (phone number)
4. Note your `TWILIO_WHATSAPP_NUMBER` (format: `whatsapp:+1234567890`)

### 3.2 Collect Twilio Credentials

From the Twilio Console dashboard:

- `TWILIO_ACCOUNT_SID` — starts with `AC`
- `TWILIO_AUTH_TOKEN` — your auth token

### 3.3 Create WhatsApp Templates

Create 20 content templates in Twilio Console at:
**Messaging > Content Template Builder**

Each template returns an `HX` SID. You need templates for:

| Template | Env Var | Variables |
|----------|---------|-----------|
| Welcome Message | `TWILIO_WELCOME_TEMPLATE_SID` | `resident_name`, `apartment_number` |
| Booking Payment Confirmed | `TWILIO_BOOKING_PAYMENT_CONFIRMED_TEMPLATE_SID` | `resident_name`, `booking_date`, `hall_type`, `amount`, `time_slot` |
| Booking Payment Reminder | `TWILIO_BOOKING_PAYMENT_REMINDER_TEMPLATE_SID` | `resident_name`, `booking_date`, `amount` |
| Booking Cancelled | `TWILIO_BOOKING_CANCELLED_TEMPLATE_SID` | `resident_name`, `booking_date` |
| Complaint Registered | `TWILIO_COMPLAINT_REGISTERED_TEMPLATE_SID` | `resident_name`, `complaint_id`, `category` |
| Complaint In Progress | `TWILIO_COMPLAINT_IN_PROGRESS_TEMPLATE_SID` | `resident_name`, `complaint_id`, `status` |
| Complaint Completed | `TWILIO_COMPLAINT_COMPLETED_TEMPLATE_SID` | `resident_name`, `complaint_id` |
| Complaint Rejected | `TWILIO_COMPLAINT_REJECTED_TEMPLATE_SID` | `resident_name`, `complaint_id` |
| Maintenance Invoice | `TWILIO_MAINTENANCE_INVOICE_TEMPLATE_SID` | `resident_name`, `amount`, `due_date`, `apartment_number` |
| Maintenance Reminder | `TWILIO_MAINTENANCE_PAYMENT_REMINDER_TEMPLATE_SID` | `resident_name`, `amount`, `apartment_number` |
| Maintenance Confirmed | `TWILIO_MAINTENANCE_PAYMENT_CONFIRMED_TEMPLATE_SID` | `resident_name`, `amount`, `apartment_number` |
| Account Blocked | `TWILIO_ACCOUNT_BLOCKED_TEMPLATE_SID` | `resident_name` |
| Account Reactivated | `TWILIO_ACCOUNT_REACTIVATED_TEMPLATE_SID` | `resident_name` |
| New Complaint (Admin) | `TWILIO_NEW_COMPLAINT_TEMPLATE_SID` | `complaint_id`, `category`, `resident_name` |
| Pending Complaint (Admin) | `TWILIO_PENDING_COMPLAINT_TEMPLATE_SID` | `complaint_id`, `category` |
| Daily Report (Admin) | `TWILIO_DAILY_REPORT_TEMPLATE_SID` | `date`, `summary` |
| Parcel Arrival | `TWILIO_PARCEL_ARRIVAL_TEMPLATE_SID` | `resident_name`, `apartment_number`, `description`, `sender_name` |
| Visitor Arrival | `TWILIO_VISITOR_ARRIVAL_TEMPLATE_SID` | `resident_name`, `apartment_number`, `visit_date` |
| Broadcast Announcement | `TWILIO_BROADCAST_ANNOUNCEMENT_TEMPLATE_SID` | `variable1`, `variable2` |
| OTP Code | `TWILIO_OTP_TEMPLATE_SID` | `otp_code` |
| Staff Invitation | `TWILIO_STAFF_INVITATION_TEMPLATE_SID` | `name`, `login_url` |

> **Note:** Templates must be approved by Meta before they can be used. This can take 1-24 hours.

### 3.4 Configure Webhook

After deployment, configure the webhook URL in Twilio:
1. Go to **Messaging > Settings > WhatsApp Sandbox** (or your production sender)
2. Set the webhook URL: `https://your-app.vercel.app/api/webhook`
3. Method: POST

---

## 4. Vercel Deployment

### 4.1 Import Repository

1. Log in to [Vercel](https://vercel.com)
2. Click **Add New > Project**
3. Import the GitHub repository
4. Framework: **Next.js** (auto-detected)

### 4.2 Set Environment Variables

Add all environment variables in **Settings > Environment Variables**:

**Supabase:**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # REQUIRED — middleware blocks all admin access without this
```

**Twilio:**
```
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890
```

**All 20 template SIDs** (see Section 3.3 above):
```
TWILIO_WELCOME_TEMPLATE_SID=HXxxxx
TWILIO_BOOKING_PAYMENT_CONFIRMED_TEMPLATE_SID=HXxxxx
... (all 20)
```

**App:**
```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
POLICIES_PDF_URL=https://xxxx.supabase.co/storage/v1/object/sign/policies/policy.pdf?token=xxx
CRON_SECRET=your_random_secret_here
```

### 4.3 Deploy

1. Click **Deploy**
2. Wait for build to complete
3. Verify the deployment URL is accessible

### 4.4 Cron Jobs

Cron jobs are automatically configured via `vercel.json`:

| Job | Schedule | Description |
|-----|----------|-------------|
| `/api/cron/daily-reports` | `0 5 * * *` | Daily at 5 AM UTC |
| `/api/cron/maintenance-reminder` | `0 2 * * *` | Daily at 2 AM UTC |
| `/api/cron/pending-complaints` | `0 */6 * * *` | Every 6 hours |
| `/api/ping` | `*/5 * * * *` | Every 5 minutes (keep-alive) |

> **Note:** Vercel Cron is available on Pro and Enterprise plans. On Hobby plan, use an external cron service (e.g., cron-job.org) to call these endpoints.

---

## 5. First Admin User

### 5.1 Create Auth User

1. Go to Supabase Dashboard > **Authentication > Users**
2. Click **Add User > Create New User**
3. Enter the admin's email and a temporary password
4. Check "Auto Confirm User"

### 5.2 Create Admin Record

Run this SQL in the SQL Editor (replace values):

```sql
INSERT INTO admin_users (
  auth_user_id,
  email,
  name,
  phone_number,
  role,
  is_active,
  receive_complaint_notifications,
  receive_reminder_notifications,
  receive_daily_reports
) VALUES (
  'AUTH_USER_UUID_HERE',  -- Copy from Authentication > Users
  'admin@example.com',
  'Admin Name',
  '+92XXXXXXXXXX',        -- WhatsApp number with country code
  'super_admin',
  true,
  true,
  true,
  true
);
```

### 5.3 Verify Login

1. Navigate to `https://your-app.vercel.app/login`
2. Log in with the email and password from step 5.1
3. You should see the admin dashboard

---

## 6. Per-Instance Configuration

These settings are instance-specific and should be customized for each client.

### 6.1 Emergency Contacts

**File:** `lib/webhook/config.ts` (lines 128-135)

Update the `EMERGENCY_CONTACTS` array with the building's actual contact numbers:

```ts
export const EMERGENCY_CONTACTS = [
  { name: "Security Office", number: "+92-3XX-XXXXXXX" },
  { name: "Maintenance", number: "+92-3XX-XXXXXXX" },
  { name: "Management", number: "+92-3XX-XXXXXXX" },
  { name: "Fire Emergency", number: "16" },
  { name: "Police", number: "15" },
  { name: "Ambulance", number: "115" },
]
```

### 6.2 Building Towers

**File:** `lib/webhook/config.ts` (lines 70-75)

Update `BUILDING_TOWERS` to match the building's tower/block structure:

```ts
export const BUILDING_TOWERS = [
  { key: "A", label: "Tower A" },
  { key: "B", label: "Tower B" },
  // Add or remove as needed
]
```

### 6.3 Complaint Categories

**File:** `lib/webhook/config.ts` (lines 35-65)

Customize `COMPLAINT_CATEGORIES` to match the building's amenities:

- **apartment.subcategories**: Issues within individual apartments
- **building.subcategories**: Common area / amenity issues

Add or remove subcategories as applicable (e.g., remove `snooker_room` if the building doesn't have one).

### 6.4 Bot Messages

**Admin UI:** `/admin/settings/bot-messages` (super admin only)

All ~115 WhatsApp bot messages can be customized through the admin panel without code changes. Messages are organized by flow group (Main Menu, Complaints, Bookings, etc.).

### 6.5 WhatsApp Templates

**Admin UI:** `/admin/settings/whatsapp-templates` (super admin only)

Template SIDs can be managed through the admin panel. The system falls back to env vars if no DB entry exists.

### 6.6 Hall Booking Settings

Update the `booking_settings` table in Supabase to match the building's hall configuration:

```sql
UPDATE booking_settings SET
  booking_charges = 5000,          -- Hall booking fee
  advance_booking_days = 30,       -- How far in advance bookings are allowed
  slot_duration_hours = 4,         -- Duration of each time slot
  first_slot_start = '08:00',      -- First slot start time
  last_slot_start = '20:00'        -- Last slot start time
WHERE id = 1;                       -- Update the default record
```

---

## 7. Post-Deployment Verification

Run through this checklist after deployment:

### Authentication
- [ ] Admin can log in at `/login`
- [ ] Dashboard loads correctly
- [ ] Unauthorized users are redirected to `/login`

### Database
- [ ] Units page (`/admin/units`) loads
- [ ] Residents page loads
- [ ] Can create a test unit
- [ ] Can create a test resident linked to the unit

### WhatsApp Integration
- [ ] Webhook is receiving messages (check Twilio logs)
- [ ] Bot responds to "hi" with main menu
- [ ] Welcome message sends when adding a resident
- [ ] Template messages render correctly (test via `/admin/settings/whatsapp-templates`)

### Cron Jobs
- [ ] `/api/ping` returns `{"status":"ok",...}`
- [ ] Manual trigger: `curl -X POST https://your-app.vercel.app/api/cron/daily-reports -H "x-cron-key: YOUR_CRON_SECRET"`
- [ ] Check Vercel cron dashboard for scheduled runs

### Admin Features
- [ ] Can add staff member (Settings page)
- [ ] RBAC works (staff user can't access restricted pages)
- [ ] Broadcast messaging works
- [ ] Analytics dashboard loads
- [ ] Accounting module loads

### Bot Flows
- [ ] Register a complaint through the bot
- [ ] Check complaint status
- [ ] Book the community hall
- [ ] Request visitor entry pass
- [ ] Submit feedback

---

## 8. Troubleshooting

### Common Issues

**"Not authenticated" errors on API calls**
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Check that the admin user exists in `admin_users` table with `is_active = true`
- Clear browser cookies and re-login

**WhatsApp messages not sending**
- Verify `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_WHATSAPP_NUMBER` are correct
- Check Twilio Console > Messaging > Logs for errors
- Ensure templates are approved by Meta
- Verify phone numbers include country code (e.g., `+923001234567`)

**Bot not responding**
- Verify webhook URL is configured in Twilio: `https://your-app.vercel.app/api/webhook`
- Check Vercel function logs for errors
- Ensure the resident's phone number exists in `profiles` table

**Cron jobs not running or returning 401**
- Vercel Hobby plan doesn't support cron — upgrade to Pro or use external cron
- All 3 cron routes validate the `x-cron-key` request header against the `CRON_SECRET` env var. Requests without a matching header are rejected with 401.
- When using an external cron service, add the header `x-cron-key: YOUR_CRON_SECRET` to each request

**Policies page returns 500**
- Set the `POLICIES_PDF_URL` environment variable
- Upload a PDF to Supabase Storage and generate a signed URL

**Permission denied for staff user**
- Check `admin_permissions` table for the staff user's page access
- Ensure `can_access = true` for the required page key

### Debug Tools

```bash
# Health check
curl https://your-app.vercel.app/api/ping

# Check Vercel function logs
vercel logs --follow

# Test WhatsApp template (requires auth)
# Use the admin UI at /admin/settings/whatsapp-templates
```

---

## Appendix A: Complete Environment Variables Reference

```env
# ============================================
# SUPABASE
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ============================================
# TWILIO
# ============================================
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890

# ============================================
# APP
# ============================================
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
POLICIES_PDF_URL=https://xxxx.supabase.co/storage/...
CRON_SECRET=random_secret_string

# ============================================
# TWILIO TEMPLATE SIDs (20 total)
# ============================================
TWILIO_WELCOME_TEMPLATE_SID=HXxxxx
TWILIO_BOOKING_PAYMENT_CONFIRMED_TEMPLATE_SID=HXxxxx
TWILIO_BOOKING_PAYMENT_REMINDER_TEMPLATE_SID=HXxxxx
TWILIO_BOOKING_CANCELLED_TEMPLATE_SID=HXxxxx
TWILIO_COMPLAINT_REGISTERED_TEMPLATE_SID=HXxxxx
TWILIO_COMPLAINT_IN_PROGRESS_TEMPLATE_SID=HXxxxx
TWILIO_COMPLAINT_COMPLETED_TEMPLATE_SID=HXxxxx
TWILIO_COMPLAINT_REJECTED_TEMPLATE_SID=HXxxxx
TWILIO_MAINTENANCE_INVOICE_TEMPLATE_SID=HXxxxx
TWILIO_MAINTENANCE_PAYMENT_REMINDER_TEMPLATE_SID=HXxxxx
TWILIO_MAINTENANCE_PAYMENT_CONFIRMED_TEMPLATE_SID=HXxxxx
TWILIO_ACCOUNT_BLOCKED_TEMPLATE_SID=HXxxxx
TWILIO_ACCOUNT_REACTIVATED_TEMPLATE_SID=HXxxxx
TWILIO_NEW_COMPLAINT_TEMPLATE_SID=HXxxxx
TWILIO_PENDING_COMPLAINT_TEMPLATE_SID=HXxxxx
TWILIO_DAILY_REPORT_TEMPLATE_SID=HXxxxx
TWILIO_PARCEL_ARRIVAL_TEMPLATE_SID=HXxxxx
TWILIO_VISITOR_ARRIVAL_TEMPLATE_SID=HXxxxx
TWILIO_BROADCAST_ANNOUNCEMENT_TEMPLATE_SID=HXxxxx
TWILIO_OTP_TEMPLATE_SID=HXxxxx
TWILIO_STAFF_INVITATION_TEMPLATE_SID=HXxxxx
```

---

## Appendix B: Database Schema Quick Reference

| # | Table | Purpose |
|---|-------|---------|
| 1 | `units` | Apartment units with maintenance tracking |
| 2 | `profiles` | Residents linked to units via `unit_id` |
| 3 | `maintenance_payments` | Monthly maintenance fee records |
| 4 | `bookings` | Hall booking records |
| 5 | `booking_settings` | Hall configuration (timings, charges) |
| 6 | `complaints` | Complaint tracking |
| 7 | `feedback` | Resident feedback |
| 8 | `staff` | Building staff records |
| 9 | `daily_reports` | Generated PDF reports |
| 10 | `admin_users` | Admin accounts with roles |
| 11 | `admin_permissions` | Page-level access control |
| 12 | `visitor_passes` | Visitor tracking with CNIC |
| 13 | `parcels` | Parcel/delivery tracking |
| 14 | `broadcast_logs` | Broadcast message history |
| 15 | `transactions` | Unified income/expense tracking |
| 16 | `expenses` | Detailed expense records |
| 17 | `expense_categories` | Category definitions |
| 18 | `bot_messages` | Customizable bot messages |
| 19 | `whatsapp_templates` | Twilio template SID management |
| 20 | `admin_otp` | WhatsApp OTP codes |

---

## Appendix C: Quick Start Checklist

For experienced developers, here's the condensed version:

1. [ ] Create Supabase project, run `database-complete-schema.sql`
2. [ ] Run `database-seed-bot-messages.sql` and `database-seed-whatsapp-templates.sql`
3. [ ] Create storage buckets: `cnic-images`, `parcel-images`, `parcels`, `policies`
4. [ ] Upload policies PDF, get signed URL
5. [ ] Set up Twilio WhatsApp sender, create 20 templates, collect SIDs
6. [ ] Import repo to Vercel, set all env vars (see Appendix A)
7. [ ] Deploy and verify at `/api/ping`
8. [ ] Create first admin user (Supabase Auth + `admin_users` table)
9. [ ] Configure Twilio webhook to `https://your-app.vercel.app/api/webhook`
10. [ ] Customize `lib/webhook/config.ts` (emergency contacts, towers, categories)
11. [ ] Customize bot messages via admin UI at `/admin/settings/bot-messages`
12. [ ] Run through verification checklist (Section 7)
