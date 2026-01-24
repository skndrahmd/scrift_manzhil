# Daily Reports Implementation

## Overview
Daily reports are now generated automatically and sent via WhatsApp with links to view detailed PDF reports.

## Components

### 1. Database Table (`daily_reports`)
- Stores report metadata and PDF data (base64 encoded)
- Two report types: `24_hour` (activity) and `open_complaints`
- Includes statistics: complaints count, bookings count, open complaints breakdown
- Public read access enabled for viewing via link

### 2. Report Viewing Page (`/app/daily-report/[id]/page.tsx`)
- Displays report statistics in cards
- Shows PDF preview in iframe
- Download button for PDF
- Similar UI to invoice pages

### 3. Cron Job (`/app/api/cron/daily-reports/route.ts`)
- Runs daily at 10:00 AM Pakistan time (5:00 AM UTC)
- Generates two PDF reports:
  - **24-Hour Activity Report**: Complaints and bookings from last 24 hours
  - **Open Complaints Report**: All pending and in-progress complaints
- Saves reports to database
- Sends WhatsApp message with:
  - Summary statistics
  - Links to both detailed reports
  - Timestamp

## Setup Instructions

### 1. Run Database Migration
Execute the migration file to create the `daily_reports` table:
```bash
# Apply migration in Supabase dashboard or via CLI
supabase/migrations/add_daily_reports_table.sql
```

### 2. Environment Variables
Ensure these are set in Vercel:
- `NEXT_PUBLIC_APP_URL` - Your app URL (e.g., https://greensthree-bms.vercel.app)
- Twilio credentials for WhatsApp messaging

### 3. Cron Schedule
The cron job is configured in `vercel.json`:
```json
{
  "path": "/api/cron/daily-reports",
  "schedule": "0 5 * * *"  // 10:00 AM PKT
}
```

## WhatsApp Message Format
```
📊 *Daily Report - December 5, 2025*

*Last 24 Hours:*
📋 Complaints: 2
🏛️ Bookings: 1

*Current Status:*
⚠️ Open Complaints: 4
   • Pending: 2
   • In Progress: 2

📄 *View Detailed Reports:*
• 24-Hour Activity: https://greensthree-bms.vercel.app/daily-report/[id]
• Open Complaints: https://greensthree-bms.vercel.app/daily-report/[id]

_Reports generated at 10:00 AM_

- Greens Three Management
```

## Recipients
Reports are sent to admin numbers defined in:
```typescript
const REPORT_RECIPIENTS = [
  "+923448214999",
  "+923005009071",
  "+923071288183"
]
```

## Features
- ✅ Automatic daily generation at 10 AM PKT
- ✅ PDF reports stored in database
- ✅ Shareable links (similar to invoices)
- ✅ WhatsApp notifications with summary
- ✅ Statistics breakdown
- ✅ Download capability
- ✅ Mobile-friendly viewing

## Testing
To manually trigger report generation:
```bash
# Via API
curl -X POST https://greensthree-bms.vercel.app/api/cron/daily-reports

# Or use the GET endpoint for testing
curl https://greensthree-bms.vercel.app/api/cron/daily-reports
```

## Notes
- Reports are stored permanently in the database
- PDF data is base64 encoded to avoid external storage
- Public read access allows viewing without authentication
- Each report has a unique UUID for the link
