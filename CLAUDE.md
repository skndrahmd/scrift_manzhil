# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **Manzhil by Scrift**, a Building Management System (BMS) demo for apartment complexes. It manages residents, hall bookings, maintenance payments, complaints, and accounting operations. The system integrates with Twilio for WhatsApp notifications and Supabase for data management.

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
├── admin/          # Admin dashboard pages
├── api/            # API routes
│   ├── accounting/ # Financial APIs
│   ├── bookings/   # Hall booking APIs
│   ├── complaints/ # Complaint management APIs
│   ├── cron/       # Scheduled job endpoints
│   ├── maintenance/# Maintenance payment APIs
│   ├── residents/  # Resident management APIs
│   └── twilio/     # WhatsApp webhook handlers
├── login/          # Authentication page
└── [invoice pages] # Public PDF generation pages

lib/
├── supabase.ts     # Database client & TypeScript types
├── twilio.ts       # WhatsApp notification functions
├── invoice.ts      # PDF generation utilities
├── accounting-reports.ts  # Financial report generation
├── dateUtils.ts    # Date/time formatting utilities
└── auth-*.ts       # Authentication helpers

components/
├── ui/             # Radix UI components (50+ components)
└── accounting/     # Financial dashboard components

middleware.ts       # Authentication & route protection
```

### Key Architectural Patterns

**1. Authentication Flow**
- Uses Supabase Auth with phone number authentication
- Middleware (`middleware.ts:5`) protects all routes except public endpoints
- Public routes: `/login`, `/api/*`, invoice pages, `/policies`
- Session-based authentication with cookie storage

**2. Database Architecture**
- **Row Level Security (RLS)** enabled on all tables
- Service role client (`lib/supabase.ts:17`) bypasses RLS for admin operations
- Regular client for user-facing operations
- Primary tables: `profiles`, `bookings`, `complaints`, `maintenance_payments`, `transactions`, `expenses`

**3. WhatsApp Integration**
- Uses Twilio Content Templates (HX SIDs stored in env vars)
- Template variables must match Twilio template structure exactly
- All notifications go through `lib/twilio.ts`
- Template SIDs configured in `.env` (see `.env.example` for full list)
- **Important:** All fallback messages use this format: "Hello, this is Manzhil by Scrift.\n\nHi {Resident Name}, your..." (system introduces itself in 3rd person, then addresses user in 2nd person)

**4. Cron Jobs (Automated Tasks)**
- Located in `app/api/cron/`
- Configured for both Vercel Cron (`vercel.json`) and VPS system cron
- **Vercel Cron Schedule** (see `vercel.json`):
  - `booking-reminder` - Daily at 7 AM (sends reminders for upcoming bookings)
  - `maintenance-reminder` - Daily at 7 AM (sends payment reminders for overdue maintenance)
  - `daily-reports` - Daily at 5 AM (generates 24-hour and open complaints reports)
  - `pending-complaints` - Every 6 hours (notifies admins of pending complaints)
  - `ping` - Every 5 minutes (health check)
- **VPS Setup:** Use `setup-cron.sh` script (archived in `docs-archive/`)

**5. PDF Generation**
- Uses jsPDF for server-side PDF rendering
- Invoice generation: `lib/invoice.ts`
- Daily reports: `app/api/cron/daily-reports/`
- Public routes for PDF access (no auth required)

**6. Accounting Module**
- Unified transaction tracking system
- Types: booking income, maintenance income, expenses, refunds
- Financial summaries and reports in `lib/accounting-reports.ts`
- Expense categories with icons and colors

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

### WhatsApp Template Guidelines

1. **Template SIDs must be in env vars** - Never hardcode them
2. **Variable names are case-sensitive** - Must match Twilio template exactly
3. **Use the helper functions** in `lib/twilio.ts` - Don't call Twilio API directly
4. **Test templates** at `/api/test-twilio` before deploying

Common template variables:
- Booking: `resident_name`, `booking_date`, `hall_type`, `amount`, `time_slot`
- Maintenance: `resident_name`, `amount`, `due_date`, `apartment_number`
- Complaints: `resident_name`, `complaint_id`, `category`, `status`

### Date and Time Handling

**CRITICAL:** This system uses **PST (Pakistan Standard Time, UTC+5)**
- All date conversions in `lib/dateUtils.ts` and `lib/time-utils.ts`
- Always use `formatDateTimePK()` for display formatting
- Database stores timestamps in UTC, convert for Pakistan timezone when displaying
- Booking slots calculated in local time (`lib/dateUtils.ts:40-60`)

### Realtime Features

Supabase Realtime is configured for:
- Complaints dashboard (live status updates)
- Booking availability (live slot updates)
- Resident profile changes

Configuration in `lib/supabase.ts:8`:
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
- 15+ template SIDs (see `.env.example:33-66`)

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
3. Welcome WhatsApp message sent via `lib/twilio.ts:sendWelcomeMessage()`

### Creating a New Twilio Template
1. Create template in Twilio Console
2. Copy HX SID to `.env`
3. Add function in `lib/twilio.ts`
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

## Additional Documentation

- `DEPLOYMENT.md` - Full deployment guide with Dockploy
- `QUICKSTART.md` - 30-minute deployment quick start
- `docs-archive/` - Setup guides, troubleshooting, template examples
- `database-complete-schema.sql` - Complete database setup

## Common Pitfalls

❌ **Don't:**
- Use regular `supabase` client for admin operations that bypass RLS
- Hardcode Twilio template SIDs
- Format dates without timezone conversion utilities
- Create API routes without proper error handling
- Modify RLS policies without testing both anon and service_role

✅ **Do:**
- Use `supabaseAdmin` for operations that need to bypass RLS
- Store all template SIDs in environment variables
- Use `formatDateTimePK()` for all user-facing date displays
- Always check `error` response from Supabase queries
- Test RLS policies with both authenticated and unauthenticated requests
