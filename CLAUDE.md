# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **Manzhil V2 by Scrift**, a comprehensive Building Management System (BMS) for apartment complexes. It manages residents, hall bookings, maintenance payments, complaints, visitor passes, parcel tracking, and accounting operations. The system integrates with Twilio for WhatsApp notifications and Supabase for data management.

**Key V2 Features:**
- Admin RBAC (Role-Based Access Control) with granular permissions
- Broadcast messaging system with rate limiting
- Visitor pass management with CNIC verification
- Parcel & delivery tracking with image uploads
- Bulk resident import via CSV
- Enhanced analytics dashboard
- Configurable daily report recipients

**Tech Stack:**
- **Framework:** Next.js 14 (App Router, SSR)
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL with RLS)
- **UI:** React + Radix UI + Tailwind CSS
- **Messaging:** Twilio WhatsApp Business API
- **PDF Generation:** jsPDF + jspdf-autotable
- **Deployment:** Hostinger VPS + Docker

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
curl -X POST http://localhost:3000/api/cron/booking-reminder
curl -X POST http://localhost:3000/api/cron/maintenance-reminder
curl -X POST http://localhost:3000/api/cron/pending-complaints
curl -X POST http://localhost:3000/api/cron/daily-reports
```

## Architecture Overview

### Application Structure
```
app/
├── admin/              # Admin dashboard pages
│   ├── dashboard/      # Main dashboard
│   ├── bookings/       # Hall booking management
│   ├── complaints/     # Complaint management
│   ├── visitors/       # Visitor pass management (V2)
│   ├── parcels/        # Parcel tracking (V2)
│   ├── broadcast/      # Broadcast messaging (V2)
│   ├── analytics/      # Analytics dashboard (V2)
│   ├── accounting/     # Financial management
│   ├── feedback/       # Resident feedback
│   ├── settings/       # Admin settings & RBAC (V2)
│   └── unauthorized/   # Access denied page (V2)
├── api/                # API routes
│   ├── accounting/     # Financial APIs
│   ├── admin/          # Admin management APIs (V2)
│   │   └── staff/      # Staff CRUD & permissions
│   ├── bookings/       # Hall booking APIs
│   ├── broadcast/      # Broadcast messaging APIs (V2)
│   ├── complaints/     # Complaint management APIs
│   ├── cron/           # Scheduled job endpoints
│   ├── maintenance/    # Maintenance payment APIs
│   ├── parcels/        # Parcel tracking APIs (V2)
│   ├── residents/      # Resident management APIs
│   │   └── bulk-import # Bulk import endpoint (V2)
│   ├── twilio/         # WhatsApp webhook handlers
│   └── visitors/       # Visitor management APIs (V2)
├── login/              # Authentication page
└── [invoice pages]     # Public PDF generation pages

lib/
├── supabase.ts         # Database client, types & constants
├── api-auth.ts         # API authentication helpers (V2)
├── twilio.ts           # WhatsApp notification functions
├── twilio/             # Organized notification modules
│   └── notifications/  # Category-specific notifications
├── invoice.ts          # PDF generation utilities
├── accounting-reports.ts  # Financial report generation
├── dateUtils.ts        # Date/time formatting utilities
└── auth-*.ts           # Authentication helpers

components/
├── ui/                 # Radix UI components (50+ components)
├── admin/              # Admin-specific components (V2)
│   ├── staff-management.tsx    # Staff RBAC management
│   └── bulk-import-modal.tsx   # CSV bulk import
└── accounting/         # Financial dashboard components

middleware.ts           # Authentication & route protection
```

### Key Architectural Patterns

**1. Authentication Flow**
- Uses Supabase Auth with email authentication (admins) and phone authentication (residents)
- Middleware (`middleware.ts`) protects all routes except public endpoints
- Public routes: `/login`, `/api/*`, invoice pages, `/policies`
- **V2 Security:** Uses `getUser()` instead of `getSession()` for secure server-side authentication

**2. Admin RBAC (V2)**
- Two roles: `super_admin` (full access) and `staff` (permission-based)
- Permissions stored in `admin_permissions` table per page
- API routes use `verifyAdminAccess(pageKey)` from `lib/api-auth.ts`
- Page keys: `dashboard`, `residents`, `bookings`, `complaints`, `visitors`, `parcels`, `analytics`, `feedback`, `accounting`, `broadcast`, `settings`
- Settings page restricted to super admins only

**3. Database Architecture**
- **Row Level Security (RLS)** enabled on all tables
- Service role client (`lib/supabase.ts`) bypasses RLS for admin operations
- Regular client for user-facing operations
- Primary tables: `profiles`, `bookings`, `complaints`, `maintenance_payments`, `transactions`, `expenses`
- **V2 tables:** `admin_users`, `admin_permissions`, `visitor_passes`, `parcels`, `broadcast_logs`

**4. WhatsApp Integration**
- Uses Twilio Content Templates (HX SIDs stored in env vars)
- Template variables must match Twilio template structure exactly
- All notifications go through `lib/twilio/` modules
- Template SIDs configured in `.env` (see `.env.example` for full list)
- **Important:** All fallback messages use this format: "Hello, this is Manzhil by Scrift.\n\nHi {Resident Name}, your..." (system introduces itself in 3rd person, then addresses user in 2nd person)

**5. Broadcast Messaging System (V2)**
- Located in `app/api/broadcast/`
- Rate limiting constants in `lib/supabase.ts`:
  - `DAILY_MESSAGE_LIMIT`: 250 messages/day
  - `MESSAGE_DELAY_MS`: 3 seconds between messages
  - `BATCH_SIZE`: 20 messages per batch
  - `BATCH_DELAY_MS`: 30 seconds between batches
  - `MIN_BROADCAST_INTERVAL_MS`: 15 minutes cooldown
- Usage tracked in `broadcast_logs` table
- Supports recipient selection (all, by block, individual)

**6. Cron Jobs (Automated Tasks)**
- Located in `app/api/cron/`
- Configured for both Vercel Cron (`vercel.json`) and VPS system cron
- **Vercel Cron Schedule** (see `vercel.json`):
  - `booking-reminder` - Daily at 7 AM (sends reminders for upcoming bookings)
  - `maintenance-reminder` - Daily at 7 AM (sends payment reminders for overdue maintenance)
  - `daily-reports` - Daily at 5 AM (generates 24-hour and open complaints reports)
  - `pending-complaints` - Every 6 hours (notifies admins of pending complaints)
  - `ping` - Every 5 minutes (health check)
- **V2:** Daily reports sent only to admins with `receive_daily_reports = true`
- **VPS Setup:** Use `setup-cron.sh` script (archived in `docs-archive/`)

**7. PDF Generation**
- Uses jsPDF for server-side PDF rendering
- Invoice generation: `lib/invoice.ts`
- Daily reports: `app/api/cron/daily-reports/`
- Public routes for PDF access (no auth required)

**8. Accounting Module**
- Unified transaction tracking system
- Types: booking income, maintenance income, expenses, refunds
- Financial summaries and reports in `lib/accounting-reports.ts`
- Expense categories with icons and colors
- **V2:** CSV export functionality, multiple report types

## V2 Feature Details

### Broadcast Messaging
- **Admin Page:** `app/admin/broadcast/page.tsx`
- **API Routes:** `/api/broadcast/send`, `/api/broadcast/usage`
- **Database:** `broadcast_logs` table tracks all broadcasts
- **Features:**
  - Select recipients: all residents, by building block, or individual
  - Two template variables (title and body)
  - Real-time usage tracking and limits display
  - Automatic rate limiting to prevent WhatsApp bans

### Admin RBAC
- **Component:** `components/admin/staff-management.tsx`
- **API Routes:** `/api/admin/staff`, `/api/admin/staff/[id]`, `/api/admin/staff/[id]/permissions`
- **Database:** `admin_users` (admin profiles), `admin_permissions` (page access)
- **Features:**
  - Create/edit/deactivate staff accounts
  - Granular page-level permissions
  - Notification preferences per admin
  - Super admin management restricted to super admins

### Bulk Resident Import
- **Component:** `components/admin/bulk-import-modal.tsx`
- **API Routes:** `/api/residents/bulk-import`, `/api/residents/check-duplicates`
- **Features:**
  - CSV file upload with validation
  - Duplicate phone number detection
  - Optional welcome message sending
  - Import summary with success/skip/fail counts

### Visitor Pass Management
- **Admin Page:** `app/admin/visitors/page.tsx`
- **API Routes:** `/api/visitors/notify-arrival`
- **Database:** `visitor_passes` table
- **Features:**
  - Create visitor passes with expected date
  - CNIC image upload to Supabase storage
  - Mark arrival and notify resident via WhatsApp
  - Status tracking: pending, arrived, expired

### Parcel & Delivery Tracking
- **Admin Page:** `app/admin/parcels/page.tsx`
- **API Routes:** `/api/parcels/list`, `/api/parcels/upload`, `/api/parcels/notify`, `/api/parcels/update-status`
- **Database:** `parcels` table
- **Features:**
  - Log incoming parcels with sender/courier info
  - Image upload for parcel photos
  - WhatsApp notification to resident
  - Status tracking: pending, notified, collected

### Analytics Dashboard
- **Admin Page:** `app/admin/analytics/page.tsx`
- **Features:**
  - Visual charts and graphs
  - Trend analysis
  - Real-time data visualization
  - Key metrics overview

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

### API Route Authentication (V2)

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

1. **Template SIDs must be in env vars** - Never hardcode them
2. **Variable names are case-sensitive** - Must match Twilio template exactly
3. **Use the helper functions** in `lib/twilio/` - Don't call Twilio API directly
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

### Realtime Features

Supabase Realtime is configured for:
- Complaints dashboard (live status updates)
- Booking availability (live slot updates)
- Resident profile changes

Configuration in `lib/supabase.ts`:
```typescript
realtime: {
  params: {
    eventsPerSecond: 10,
  },
}
```

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
- 15+ template SIDs (see `.env.example`)
- `TWILIO_BROADCAST_SID` (V2 - for broadcast messages)

**App:**
- `NEXT_PUBLIC_APP_URL` (used for generating public links)
- `NODE_ENV` (development/production)

## Database Schema

Complete schema in `database-complete-schema.sql`. Key tables:

**Core Tables:**
- `profiles` - Resident information with maintenance tracking
- `maintenance_payments` - Monthly maintenance fee records
- `bookings` - Hall booking records with payment tracking
- `complaints` - Complaint tracking with grouping support
- `staff` - Building staff records

**V2 Admin Tables:**
- `admin_users` - Admin accounts with roles and notification preferences
- `admin_permissions` - Page-level access control per admin

**V2 Feature Tables:**
- `visitor_passes` - Visitor tracking with CNIC storage
- `parcels` - Parcel/delivery tracking with images
- `broadcast_logs` - Broadcast message history and usage tracking

**Accounting Tables:**
- `transactions` - Unified income/expense tracking
- `expenses` - Detailed expense records
- `expense_categories` - Category definitions with icons

**System Tables:**
- `booking_settings` - Hall configuration (timings, slots)
- `daily_reports` - Generated PDF reports (stored as base64)
- `feedback` - Resident feedback collection

## Deployment

The application supports **two deployment options:**

**Option 1: Vercel (Serverless)**
- Cron jobs configured in `vercel.json` (Vercel Cron)
- Automatic deployments from git push
- Zero server management
- See `vercel.json` for cron schedules

**Option 2: Hostinger VPS + Docker**
- Deployment guide: `DEPLOYMENT.md` (comprehensive)
- Quick start: `QUICKSTART.md` (30-minute setup)
- GitHub Actions CI/CD configured (`.github/workflows/deploy.yml`)
- SSL via Let's Encrypt
- Cron jobs via system crontab (use `setup-cron.sh`)

**Docker:**
```bash
# Build and run (see docker-compose.yml in docs-archive/)
docker-compose up -d --build

# View logs
docker-compose logs -f app

# Restart
docker-compose restart
```

## Common Tasks

### Adding a New Resident
1. Create profile in database via admin panel
2. System automatically generates maintenance payment records
3. Welcome WhatsApp message sent via `lib/twilio/notifications/account.ts`

### Bulk Import Residents (V2)
1. Prepare CSV with columns: `name`, `phone_number`, `apartment_number`, `cnic` (optional), `building_block` (optional), `maintenance_charges` (optional)
2. Use the bulk import button in admin residents page
3. Upload CSV and preview data
4. Toggle welcome messages on/off
5. Confirm import - duplicates are skipped automatically

### Sending Broadcast Messages (V2)
1. Navigate to Admin > Broadcast
2. Check daily usage limit (250 messages/day)
3. Select recipients (all, by block, or individual)
4. Enter title and body text
5. Send - messages are rate-limited automatically
6. View results summary after completion

### Managing Staff Permissions (V2)
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

### Generating Financial Reports
```typescript
import { generateMonthlyReport } from '@/lib/accounting-reports'

const report = await generateMonthlyReport(year, month)
```

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

1. **Dual deployment setup** - Configured for both Vercel (with Vercel Cron in `vercel.json`) and VPS (with system cron)
2. **WhatsApp template approval** - Templates must be approved by Meta before use
3. **RLS policies** - Be careful when modifying, test thoroughly with both clients
4. **Timezone handling** - Always use utility functions, never `new Date()` directly for display
5. **PDF generation** - Memory-intensive, may need optimization for large reports
6. **Broadcast rate limits** - 250 messages/day, 15-min cooldown between broadcasts
7. **RBAC cache** - Permission changes take effect on next login/page refresh
8. **Supabase storage** - CNIC and parcel images stored in Supabase Storage buckets

## Additional Documentation

- `DEPLOYMENT.md` - Full deployment guide with Dockploy
- `QUICKSTART.md` - 30-minute deployment quick start
- `docs-archive/` - Setup guides, troubleshooting, template examples
- `database-complete-schema.sql` - Complete database setup

## Common Pitfalls

**Don't:**
- Use regular `supabase` client for admin operations that bypass RLS
- Hardcode Twilio template SIDs
- Format dates without timezone conversion utilities
- Create API routes without proper error handling
- Modify RLS policies without testing both anon and service_role
- Use `getSession()` for server-side auth (use `getUser()` instead)
- Exceed broadcast rate limits (can result in WhatsApp bans)
- Skip permission checks in admin API routes

**Do:**
- Use `supabaseAdmin` for operations that need to bypass RLS
- Store all template SIDs in environment variables
- Use `formatDateTimePK()` for all user-facing date displays
- Always check `error` response from Supabase queries
- Test RLS policies with both authenticated and unauthenticated requests
- Use `verifyAdminAccess(pageKey)` for all protected admin API routes
- Respect broadcast rate limits and cooldown periods
- Test permission-based access with both super_admin and staff roles
