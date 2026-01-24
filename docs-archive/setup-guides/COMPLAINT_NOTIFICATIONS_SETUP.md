# Complaint Notification System Setup Guide

## Overview
This system sends WhatsApp notifications for:
1. **New Complaints** - Instant notification when a complaint is registered
2. **Pending Complaints** - Reminder for complaints pending for 24+ hours

---

## Step 1: Create WhatsApp Templates in Twilio

### Template 1: New Complaint Notification

1. Go to **Twilio Console** → **Messaging** → **Content Templates**
2. Click **"Create new template"**
3. Fill in the details:

**Template Name:** `new_complaint_notification`  
**Category:** `UTILITY`  
**Language:** `English`

**Template Content:**
```
🆕 New Complaint Registered

🎫 Complaint ID: {{1}}
👤 Resident: {{2}}
🏠 Apartment: {{3}}
📋 Category: {{4}}
🔖 Type: {{5}}
📝 Description: {{6}}
📅 Date: {{7}}
⏰ Time: {{8}}

Please review and take necessary action.

🔗 View Details: {{9}}
```

4. Submit for approval
5. **Copy the Template SID** (starts with `HX...`)

---

### Template 2: Pending Complaint Reminder

1. Click **"Create new template"** again
2. Fill in the details:

**Template Name:** `pending_complaint_reminder`  
**Category:** `UTILITY`  
**Language:** `English`

**Template Content:**
```
⚠️ Complaint Pending for 24+ Hours

🎫 Complaint ID: {{1}}
👤 Resident: {{2}}
🏠 Apartment: {{3}}
📋 Category: {{4}}
🔖 Type: {{5}}
📝 Description: {{6}}
📅 Registered: {{7}}
⏱️ Pending Since: {{8}} hours

⚡ Action Required: Please review and update status.

🔗 View Details: {{9}}
```

3. Submit for approval
4. **Copy the Template SID** (starts with `HX...`)

---

## Step 2: Update Environment Variables

Add these to your `.env.local` file:

```env
# Complaint Notification Template SIDs
TWILIO_NEW_COMPLAINT_TEMPLATE_SID=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PENDING_COMPLAINT_TEMPLATE_SID=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Replace the `HXxxx...` with your actual Template SIDs from Step 1.

---

## Step 3: Configure Notification Recipients

The notification numbers are already configured in the code:

**New Complaint Notifications (sent to both):**
- Security: +923091335646
- Maintenance: +923075496364

**Pending Complaint Reminders (sent to):**
- Maintenance: +923075496364

To change these numbers, edit `/app/api/webhook/route.ts`:

```typescript
const COMPLAINT_NOTIFICATION_NUMBERS = [
  "+923091335646", // Security
  "+923075496364", // Maintenance
]
```

And `/app/api/cron/pending-complaints/route.ts`:

```typescript
const REMINDER_RECIPIENT = "+923075496364" // Maintenance number
```

---

## Step 4: Set Up Cron Job for Pending Complaints

### Option A: Using Vercel Cron Jobs (Recommended)

1. Create `vercel.json` in your project root (or update existing):

```json
{
  "crons": [
    {
      "path": "/api/cron/pending-complaints",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

This runs every 6 hours. Adjust schedule as needed:
- `0 */6 * * *` - Every 6 hours
- `0 9,15 * * *` - At 9 AM and 3 PM daily
- `0 10 * * *` - At 10 AM daily

2. Deploy to Vercel - cron will automatically activate

---

### Option B: Using External Cron Service

Use a service like **cron-job.org** or **EasyCron**:

1. Create a new cron job
2. URL: `https://your-domain.vercel.app/api/cron/pending-complaints`
3. Method: `POST`
4. Schedule: Every 6 hours (or as needed)
5. Add header: `Authorization: Bearer YOUR_SECRET_KEY` (optional security)

---

## Step 5: Test the System

### Test New Complaint Notification

1. Open WhatsApp and message your bot
2. Register a new complaint
3. Check if notifications are received on:
   - +923091335646 (Security)
   - +923075496364 (Maintenance)

### Test Pending Complaint Reminder

**Manual Test:**
```bash
curl -X POST https://your-domain.vercel.app/api/cron/pending-complaints
```

Or visit the URL in your browser (will trigger the check).

---

## How It Works

### New Complaint Flow
```
User registers complaint
       ↓
Complaint saved to database
       ↓
sendNewComplaintNotification() called
       ↓
WhatsApp template sent to Security & Maintenance
       ↓
Staff receives instant notification
```

### Pending Complaint Reminder Flow
```
Cron job runs (every 6 hours)
       ↓
Query complaints pending > 24 hours
       ↓
For each pending complaint:
  - Calculate hours pending
  - Send reminder template to Maintenance
       ↓
Maintenance receives reminder with details
```

---

## Notification Examples

### New Complaint Notification
```
🆕 New Complaint Registered

🎫 Complaint ID: COM-20241208-001
👤 Resident: John Doe
🏠 Apartment: A-101
📋 Category: Building Complaint
🔖 Type: Lift/Elevator
📝 Description: Lift stuck on 3rd floor
📅 Date: December 8, 2024
⏰ Time: 2:30 PM

Please review and take necessary action.

🔗 View Details: https://com3-bms.vercel.app/admin
```

### Pending Complaint Reminder
```
⚠️ Complaint Pending for 24+ Hours

🎫 Complaint ID: COM-20241207-005
👤 Resident: Jane Smith
🏠 Apartment: B-205
📋 Category: Apartment Complaint
🔖 Type: Plumbing
📝 Description: Water leakage in bathroom
📅 Registered: December 7, 2024
⏱️ Pending Since: 26 hours

⚡ Action Required: Please review and update status.

🔗 View Details: https://com3-bms.vercel.app/admin
```

---

## Monitoring & Logs

Check logs in Vercel dashboard:
- **New Complaints:** Look for `[NEW COMPLAINT]` logs
- **Pending Reminders:** Look for `[PENDING COMPLAINTS]` logs

Example log output:
```
[NEW COMPLAINT] Notification sent to +923091335646 for COM-20241208-001
[NEW COMPLAINT] Notification sent to +923075496364 for COM-20241208-001
[PENDING COMPLAINTS] Found 3 pending complaints
[PENDING COMPLAINTS] Reminder sent for COM-20241207-005 (26h pending)
[PENDING COMPLAINTS] Sent 3/3 reminders
```

---

## Troubleshooting

### Templates Not Approved
- Check Twilio Console for approval status
- Templates usually take 1-24 hours to approve
- Ensure template follows WhatsApp guidelines

### Notifications Not Sending
1. Check Template SIDs in `.env.local`
2. Verify phone numbers have WhatsApp
3. Check Twilio logs for errors
4. Ensure templates are approved

### Cron Not Running
1. Check `vercel.json` is deployed
2. Verify cron schedule syntax
3. Check Vercel dashboard → Cron Jobs
4. Test manually with curl command

---

## Cost Estimate

**Twilio WhatsApp Template Messages:**
- ~$0.005 per message (varies by country)

**Example Monthly Cost:**
- 100 complaints/month × 2 recipients = 200 messages
- 10 pending reminders/month = 10 messages
- Total: ~210 messages × $0.005 = **~$1.05/month**

---

## Security Notes

- Template SIDs are safe to commit (they're public identifiers)
- Phone numbers are hardcoded (consider moving to database for flexibility)
- Cron endpoint is public - consider adding authentication if needed
- Admin panel link requires authentication (already secured)

---

## Future Enhancements

- [ ] Add notification preferences in admin panel
- [ ] Allow customizing notification recipients per complaint type
- [ ] Add SMS fallback if WhatsApp fails
- [ ] Track notification delivery status
- [ ] Add notification history in admin panel
- [ ] Allow residents to opt-in for complaint updates

---

## Support

For issues or questions:
1. Check Twilio Console logs
2. Check Vercel deployment logs
3. Review template approval status
4. Test with manual curl commands

---

**Setup Complete!** 🎉

Your complaint notification system is now ready to keep your team informed in real-time.
