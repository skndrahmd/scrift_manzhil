# Complete WhatsApp Templates for Twilio - Greens Three BMS

This document contains **ALL** WhatsApp message templates needed for the Greens Three Building Management System. Copy and paste these directly into Twilio Console.

---

## Template 1: Welcome Message

**Template Name:** `welcome_message`  
**Category:** UTILITY  
**Language:** English

### Template Content:
```
Welcome to Greens Three! 🏢✨

Hello {{1}},

Your account has been successfully registered. 🎉

*Apartment:* 🏠 {{2}}

You can now access our services via WhatsApp:
• 📝 Register complaints
• 🏛️ Book community hall
• 💰 Check maintenance dues
• 👤 View your profile
• ✨ And more!

Simply enter "0" (Zero) to get started. 💬

- Greens Three Management
```

### Variables:
1. Resident Name (e.g., "John Doe")
2. Apartment Number (e.g., "A-101")

---

## Template 2: Booking Payment Confirmed

**Template Name:** `booking_payment_confirmed`  
**Category:** UTILITY  
**Language:** English

### Template Content:
```
✅ Payment Confirmed - Thank You!

Hello {{1}},

Your payment has been received and confirmed.

*Booking Details:*
📅 Date: {{2}}
⏰ Time: {{3}} - {{4}}
💰 Amount Paid: Rs. {{5}}
🎫 Booking ID: {{6}}

Your community hall booking is now confirmed!

📄 View Receipt: {{7}}

Thank you for your payment.

- Greens Three Management
```

### Variables:
1. Resident Name (e.g., "John Doe")
2. Booking Date (e.g., "December 15, 2024")
3. Start Time (e.g., "9:00 AM")
4. End Time (e.g., "9:00 PM")
5. Amount (e.g., "5,000")
6. Booking ID (e.g., "abc123def456")
7. Receipt Link (e.g., "https://greensthree-bms.vercel.app/booking-invoice/abc123?payment=paid")

---

## Template 3: Booking Payment Reminder

**Template Name:** `booking_payment_reminder`  
**Category:** UTILITY  
**Language:** English

### Template Content:
```
🔔 Booking Payment Reminder

Hello {{1}},

Your community hall booking for {{2}} is confirmed but payment is pending.

*Booking Details:*
📅 Date: {{3}}
⏰ Time: {{4}} - {{5}}
💰 Amount: Rs. {{6}}

⚠️ Please complete payment within {{7}} days to avoid automatic cancellation.

📄 View Invoice & Pay: {{8}}

- Greens Three Management
```

### Variables:
1. Resident Name (e.g., "John Doe")
2. Event Purpose (e.g., "Birthday Party")
3. Booking Date (e.g., "December 15, 2024")
4. Start Time (e.g., "9:00 AM")
5. End Time (e.g., "9:00 PM")
6. Booking Charges (e.g., "5000")
7. Days Remaining (e.g., "2")
8. Invoice Link (e.g., "https://greensthree-bms.vercel.app/booking-invoice/abc123")

---

## Template 4: Booking Cancelled

**Template Name:** `booking_cancelled`  
**Category:** UTILITY  
**Language:** English

### Template Content:
```
❌ Booking Cancelled

Hello {{1}},

Your community hall booking has been cancelled due to non-payment.

*Booking Details:*
📅 Date: {{2}}
⏰ Time: {{3}} - {{4}}
🎫 Booking ID: {{5}}

If you wish to rebook, please contact the management or create a new booking through WhatsApp.

📄 Cancellation Receipt: {{6}}

- Greens Three Management
```

### Variables:
1. Resident Name (e.g., "John Doe")
2. Booking Date (e.g., "December 15, 2024")
3. Start Time (e.g., "9:00 AM")
4. End Time (e.g., "9:00 PM")
5. Booking ID (e.g., "ABC12345")
6. PDF Link (e.g., "https://greensthree-bms.vercel.app/booking-invoice/abc123?snapshot=cancelled")

---

## Template 5: Complaint Registered

**Template Name:** `complaint_registered`  
**Category:** UTILITY  
**Language:** English

### Template Content:
```
✅ Complaint Registered Successfully

Hello {{1}},

Your complaint has been registered and assigned ID: {{2}}

*Complaint Details:*
📋 Category: {{3}}
🔖 Type: {{4}}
📝 Description: {{5}}
📅 Registered: {{6}}

The maintenance team has been notified and will address this matter shortly.

You can check your complaint status anytime by entering "2" in the main menu.

- Greens Three Management
```

### Variables:
1. Resident Name (e.g., "John Doe")
2. Complaint ID (e.g., "COM-20241208-001")
3. Category (e.g., "Building Complaint")
4. Subcategory/Type (e.g., "Lift/Elevator")
5. Description (e.g., "Lift stuck on 3rd floor")
6. Registration Date & Time (e.g., "December 8, 2024 at 2:30 PM")

---

## Template 6: Complaint In Progress

**Template Name:** `complaint_in_progress`  
**Category:** UTILITY  
**Language:** English

### Template Content:
```
🔄 Complaint Status Update

Hello {{1}},

Your {{2}} complaint ({{3}}) registered on {{4}} is now in progress.

The maintenance team is actively working to resolve this matter.

You can check the status anytime by entering "2" in the main menu.

- Greens Three Management
```

### Variables:
1. Resident Name (e.g., "John Doe")
2. Subcategory (e.g., "Plumbing")
3. Complaint ID (e.g., "COM-20241208-001")
4. Registration Date & Time (e.g., "December 8, 2024 at 2:30 PM")

---

## Template 7: Complaint Completed

**Template Name:** `complaint_completed`  
**Category:** UTILITY  
**Language:** English

### Template Content:
```
✅ Complaint Resolved

Hello {{1}},

Your {{2}} complaint ({{3}}) registered on {{4}} has been resolved at {{5}}.

If you require further assistance, please contact the management.

Thank you for your patience.

- Greens Three Management
```

### Variables:
1. Resident Name (e.g., "John Doe")
2. Subcategory (e.g., "Plumbing")
3. Complaint ID (e.g., "COM-20241208-001")
4. Registration Date & Time (e.g., "December 8, 2024 at 2:30 PM")
5. Resolution Date & Time (e.g., "December 9, 2024 at 10:15 AM")

---

## Template 8: Complaint Rejected/Cancelled

**Template Name:** `complaint_rejected`  
**Category:** UTILITY  
**Language:** English

### Template Content:
```
❌ Complaint Cancelled

Hello {{1}},

Your {{2}} complaint ({{3}}) registered on {{4}} has been cancelled.

If this was unexpected or you require further assistance, please contact the management.

- Greens Three Management
```

### Variables:
1. Resident Name (e.g., "John Doe")
2. Subcategory (e.g., "Plumbing")
3. Complaint ID (e.g., "COM-20241208-001")
4. Registration Date & Time (e.g., "December 8, 2024 at 2:30 PM")

---

## Template 9: Maintenance Invoice

**Template Name:** `maintenance_invoice`  
**Category:** UTILITY  
**Language:** English

### Template Content:
```
💳 Maintenance Invoice - {{1}} {{2}}

Hello {{3}},

Your maintenance invoice for {{4}} {{5}} is now available.

*Invoice Details:*
🏠 Apartment: {{6}}
💰 Amount: Rs. {{7}}
📅 Due Date: {{8}}

Please ensure timely payment to avoid service disruptions.

📄 View Invoice: {{9}}

- Greens Three Management
```

### Variables:
1. Month Name (e.g., "December")
2. Year (e.g., "2024")
3. Resident Name (e.g., "John Doe")
4. Month Name (e.g., "December")
5. Year (e.g., "2024")
6. Apartment Number (e.g., "A-101")
7. Amount (e.g., "5000")
8. Due Date (e.g., "December 31, 2024")
9. Invoice Link (e.g., "https://greensthree-bms.vercel.app/maintenance-invoice/abc123")

---

## Template 10: Maintenance Payment Reminder

**Template Name:** `maintenance_payment_reminder`  
**Category:** UTILITY  
**Language:** English

### Template Content:
```
⚠️ Maintenance Payment Reminder

Hello {{1}},

Your maintenance payment for {{2}} {{3}} is overdue.

*Payment Details:*
🏠 Apartment: {{4}}
💰 Amount: Rs. {{5}}
📅 Due Date: {{6}}
⏰ Overdue By: {{7}} days

Please settle your payment at the earliest to avoid service restrictions.

📄 View Invoice: {{8}}

- Greens Three Management
```

### Variables:
1. Resident Name (e.g., "John Doe")
2. Month Name (e.g., "November")
3. Year (e.g., "2024")
4. Apartment Number (e.g., "A-101")
5. Amount (e.g., "5000")
6. Due Date (e.g., "November 30, 2024")
7. Days Overdue (e.g., "15")
8. Invoice Link (e.g., "https://greensthree-bms.vercel.app/maintenance-invoice/abc123")

---

## Template 11: Maintenance Payment Confirmed

**Template Name:** `maintenance_payment_confirmed`  
**Category:** UTILITY  
**Language:** English

### Template Content:
```
✅ Payment Received - Thank You!

Hello {{1}},

Your maintenance payment for {{2}} {{3}} has been received and confirmed.

*Payment Details:*
🏠 Apartment: {{4}}
💰 Amount: Rs. {{5}}
📅 Payment Date: {{6}}

Thank you for your timely payment.

📄 View Receipt: {{7}}

- Greens Three Management
```

### Variables:
1. Resident Name (e.g., "John Doe")
2. Month Name (e.g., "December")
3. Year (e.g., "2024")
4. Apartment Number (e.g., "A-101")
5. Amount (e.g., "5000")
6. Payment Date (e.g., "December 5, 2024")
7. Invoice Link (e.g., "https://greensthree-bms.vercel.app/maintenance-invoice/abc123")

---

## Template 12: Account Blocked (Maintenance Overdue)

**Template Name:** `account_blocked_maintenance`  
**Category:** UTILITY  
**Language:** English

### Template Content:
```
⚠️ Account Access Restricted

Hello {{1}},

Your account access has been temporarily restricted due to outstanding maintenance payments.

*Account Details:*
🏠 Apartment: {{2}}
💰 Total Outstanding: Rs. {{3}}
📅 Overdue Months: {{4}}

To restore full access to services, please settle your outstanding payments immediately.

For payment assistance, please contact the management office.

- Greens Three Management
```

### Variables:
1. Resident Name (e.g., "John Doe")
2. Apartment Number (e.g., "A-101")
3. Total Amount Due (e.g., "10,000")
4. Number of Overdue Months (e.g., "2")

---

## Template 13: Account Reactivated

**Template Name:** `account_reactivated`  
**Category:** UTILITY  
**Language:** English

### Template Content:
```
✅ Account Reactivated - Welcome Back!

Hello {{1}},

Your account has been reactivated. Thank you for settling your outstanding payments.

*Account Details:*
🏠 Apartment: {{2}}
💰 Payment Received: Rs. {{3}}
📅 Reactivation Date: {{4}}

You now have full access to all services:
• 📝 Register complaints
• 🏛️ Book community hall
• 💰 Check maintenance dues
• 👤 View your profile

Enter "0" to access the main menu.

- Greens Three Management
```

### Variables:
1. Resident Name (e.g., "John Doe")
2. Apartment Number (e.g., "A-101")
3. Amount Paid (e.g., "10,000")
4. Reactivation Date (e.g., "December 10, 2024")

---

## Template 14: New Complaint Notification (Admin)

**Template Name:** `new_complaint_notification`  
**Category:** UTILITY  
**Language:** English

### Template Content:
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

### Variables:
1. Complaint ID (e.g., "COM-20241208-001")
2. Resident Name (e.g., "John Doe")
3. Apartment Number (e.g., "A-101")
4. Category (e.g., "Building Complaint")
5. Subcategory/Type (e.g., "Lift/Elevator")
6. Description (e.g., "Lift stuck on 3rd floor")
7. Date (e.g., "December 8, 2024")
8. Time (e.g., "1:30 PM")
9. Admin Panel Link (e.g., "https://greensthree-bms.vercel.app/admin")

---

## Template 15: Pending Complaint Reminder (Admin)

**Template Name:** `pending_complaint_reminder`  
**Category:** UTILITY  
**Language:** English

### Template Content:
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

### Variables:
1. Complaint ID (e.g., "COM-20241207-005")
2. Resident Name (e.g., "Jane Smith")
3. Apartment Number (e.g., "B-205")
4. Category (e.g., "Apartment Complaint")
5. Subcategory/Type (e.g., "Plumbing")
6. Description (e.g., "Water leakage in bathroom")
7. Registration Date (e.g., "December 7, 2024")
8. Hours Pending (e.g., "26")
9. Admin Panel Link (e.g., "https://greensthree-bms.vercel.app/admin")

---

## Template 16: Daily Report (Admin)

**Template Name:** `daily_report`  
**Category:** UTILITY  
**Language:** English

### Template Content:
```
📊 Daily Management Report - {{1}}

*Last 24 Hours:*
📋 Complaints: {{2}}
🏛️ Bookings: {{3}}

*Current Status:*
⚠️ Open Complaints: {{4}}
   • Pending: {{5}}
   • In Progress: {{6}}

📄 *View Detailed Reports:*
• 24-Hour Activity: {{7}}
• Open Complaints: {{8}}

_Reports generated at 10:00 AM_

- Greens Three Management
```

### Variables:
1. Date (e.g., "December 8, 2024")
2. Complaints Count (e.g., "3")
3. Bookings Count (e.g., "2")
4. Total Open Complaints (e.g., "5")
5. Pending Count (e.g., "2")
6. In Progress Count (e.g., "3")
7. Activity Report Link (e.g., "https://greensthree-bms.vercel.app/daily-report/abc123")
8. Complaints Report Link (e.g., "https://greensthree-bms.vercel.app/daily-report/def456")

---

## Instructions for Creating Templates in Twilio

### Step-by-Step Guide:

1. **Log in to Twilio Console**
   - Go to https://console.twilio.com/

2. **Navigate to Content Templates**
   - Click on **Messaging** in the left sidebar
   - Select **Content Templates**

3. **Create New Template**
   - Click **Create new template**
   - Select **WhatsApp** as the channel
   - Enter the template name (use exact names from above)
   - Select category: **UTILITY**
   - Select language: **English**

4. **Add Template Content**
   - Copy the template content from above
   - Paste into the message body field
   - Variables are denoted by `{{1}}`, `{{2}}`, etc.
   - Twilio will automatically detect and validate variables

5. **Submit for Approval**
   - Click **Submit for approval**
   - Wait for Meta/WhatsApp approval (typically 24-48 hours)

6. **Get Template SID**
   - Once approved, copy the Template SID (starts with "HX...")
   - Update the corresponding environment variable in Vercel

7. **Update Environment Variables**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Update each `TWILIO_*_TEMPLATE_SID` variable with the new SID
   - Redeploy your application

---

## Environment Variable Mapping

After creating all templates, update these environment variables in your `.env.local` and Vercel:

```bash
# General
TWILIO_WELCOME_TEMPLATE_SID=<SID from Template 1>

# Booking Templates
TWILIO_BOOKING_PAYMENT_CONFIRMED_TEMPLATE_SID=<SID from Template 2>
TWILIO_BOOKING_PAYMENT_REMINDER_TEMPLATE_SID=<SID from Template 3>
TWILIO_BOOKING_CANCELLED_TEMPLATE_SID=<SID from Template 4>

# Complaint Templates (Resident)
TWILIO_COMPLAINT_REGISTERED_TEMPLATE_SID=<SID from Template 5>
TWILIO_COMPLAINT_IN_PROGRESS_TEMPLATE_SID=<SID from Template 6>
TWILIO_COMPLAINT_COMPLETED_TEMPLATE_SID=<SID from Template 7>
TWILIO_COMPLAINT_REJECTED_TEMPLATE_SID=<SID from Template 8>

# Maintenance Templates
TWILIO_MAINTENANCE_INVOICE_TEMPLATE_SID=<SID from Template 9>
TWILIO_MAINTENANCE_PAYMENT_REMINDER_TEMPLATE_SID=<SID from Template 10>
TWILIO_MAINTENANCE_PAYMENT_CONFIRMED_TEMPLATE_SID=<SID from Template 11>

# Account Management
TWILIO_ACCOUNT_BLOCKED_TEMPLATE_SID=<SID from Template 12>
TWILIO_ACCOUNT_REACTIVATED_TEMPLATE_SID=<SID from Template 13>

# Admin Notifications
TWILIO_NEW_COMPLAINT_TEMPLATE_SID=<SID from Template 14>
TWILIO_PENDING_COMPLAINT_TEMPLATE_SID=<SID from Template 15>
TWILIO_DAILY_REPORT_TEMPLATE_SID=<SID from Template 16>
```

---

## Quick Reference: Template Usage

| # | Template Name | Used For | Triggered By | Recipient |
|---|--------------|----------|--------------|-----------|
| 1 | welcome_message | New resident onboarding | Admin adds new user | Resident |
| 2 | booking_payment_confirmed | Payment confirmation | Admin marks booking paid | Resident |
| 3 | booking_payment_reminder | Payment reminder | Cron job (Day 1 & 2) | Resident |
| 4 | booking_cancelled | Cancellation notice | Cron job (Day 3+) or Admin | Resident |
| 5 | complaint_registered | Complaint confirmation | Resident registers complaint | Resident |
| 6 | complaint_in_progress | Status update | Admin updates to in-progress | Resident |
| 7 | complaint_completed | Resolution notice | Admin marks completed | Resident |
| 8 | complaint_rejected | Cancellation notice | Admin cancels complaint | Resident |
| 9 | maintenance_invoice | New invoice | Cron job (monthly) | Resident |
| 10 | maintenance_payment_reminder | Payment reminder | Cron job (overdue) | Resident |
| 11 | maintenance_payment_confirmed | Payment receipt | Admin marks as paid | Resident |
| 12 | account_blocked_maintenance | Access restriction | System (2+ months overdue) | Resident |
| 13 | account_reactivated | Access restored | Admin/System after payment | Resident |
| 14 | new_complaint_notification | New complaint alert | Resident registers complaint | Admin |
| 15 | pending_complaint_reminder | Pending alert | Cron job (24+ hours) | Admin |
| 16 | daily_report | Daily summary | Cron job (10:00 AM) | Admin |

---

## Template Categories

### **Resident-Facing Templates (13):**
- Welcome, Bookings (3), Complaints (4), Maintenance (3), Account (2)

### **Admin-Facing Templates (3):**
- Complaint notifications (2), Daily reports (1)

---

## Important Notes

1. **Template Approval Time:** WhatsApp/Meta typically takes 24-48 hours to approve templates. Plan accordingly.

2. **Fallback Messages:** The application has fallback freeform messages that will work immediately while waiting for template approval. These are already updated with "Greens Three Management" branding.

3. **Variable Format:** Twilio uses `{{1}}`, `{{2}}`, etc. for variables. The number corresponds to the order of variables passed in the API call.

4. **Template Categories:** All templates use the "UTILITY" category as they are transactional/informational messages.

5. **Testing:** After approval, test each template by triggering the corresponding action in your application.

6. **Modifications:** If you need to modify a template after approval, you'll need to submit it for re-approval, which takes another 24-48 hours.

7. **Character Limits:** WhatsApp templates have character limits. All templates above are within limits.

8. **Emojis:** Emojis are allowed and encouraged for better visual appeal and user engagement.

---

## Troubleshooting

### Template Rejected?
- Check for prohibited content (promotional language, etc.)
- Ensure variables are properly formatted
- Review Meta's WhatsApp Business Policy
- Contact Twilio support for specific rejection reasons

### Template Not Sending?
- Verify Template SID is correct in environment variables
- Check that template is approved (not pending)
- Ensure variables match the template definition
- Review Twilio logs for error messages

### Variables Not Populating?
- Verify variable order matches template definition
- Check that all required variables are provided
- Ensure variable values are strings (not null/undefined)

---

## Support Resources

- **Twilio WhatsApp Templates Guide:** https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates
- **Meta WhatsApp Business Policy:** https://www.whatsapp.com/legal/business-policy
- **Twilio Support:** https://support.twilio.com/

---

**Document Version:** 2.0 (Complete - All 16 Templates)  
**Last Updated:** December 23, 2024  
**Project:** Greens Three BMS Rebranding
