# Environment Variables Changes for Greens Three Rebranding

This document outlines all environment variable changes required after rebranding from Com-3 to Greens Three.

## Required Environment Variable Updates

### 1. Application URL
**Variable:** `NEXT_PUBLIC_APP_URL`

**Old Value:** `https://com3-bms.vercel.app`  
**New Value:** `https://greensthree-bms.vercel.app`

**Where to Update:**
- Vercel Dashboard → Project Settings → Environment Variables
- Update for all environments (Production, Preview, Development)

---

## Twilio WhatsApp Template SIDs

All Twilio WhatsApp templates need to be **recreated** with the new "Greens Three" branding instead of "Com-3" and "Nova". After creating new templates in the Twilio Console, update these environment variables with the new Template SIDs.

### Templates That Need Recreation:

#### 1. Welcome Message Template
**Variable:** `TWILIO_WELCOME_TEMPLATE_SID`  
**Template Name:** `welcome_message`  
**Changes Required:**
- Remove "Nova" references
- Change "Com-3" to "Greens Three"
- Use professional third-person tone

---

#### 2. New Complaint Notification Template
**Variable:** `TWILIO_NEW_COMPLAINT_TEMPLATE_SID`  
**Template Name:** `new_complaint_notification`  
**Changes Required:**
- Update admin panel URL from `com3-bms.vercel.app` to `greensthree-bms.vercel.app`
- Review message tone for professionalism

**Documentation:** See `whatsapp-templates/new-complaint-template.md`

---

#### 3. Pending Complaint Reminder Template
**Variable:** `TWILIO_PENDING_COMPLAINT_TEMPLATE_SID`  
**Template Name:** `pending_complaint_reminder`  
**Changes Required:**
- Update admin panel URL from `com3-bms.vercel.app` to `greensthree-bms.vercel.app`
- Review message tone for professionalism

**Documentation:** See `whatsapp-templates/pending-complaint-reminder.md`

---

#### 4. Complaint Status Updated Template
**Variable:** `TWILIO_COMPLAINT_STATUS_UPDATED_TEMPLATE_SID`  
**Template Name:** `complaint_status_updated`  
**Changes Required:**
- Remove "Nova" persona
- Change signature from "Nova, Your Building Manager 🏢" to "Greens Three Management"
- Use professional third-person tone

---

#### 5. Booking Payment Reminder Template
**Variable:** `TWILIO_BOOKING_PAYMENT_REMINDER_TEMPLATE_SID`  
**Template Name:** `booking_payment_reminder`  
**Changes Required:**
- Update invoice URLs from `com3-bms.vercel.app` to `greensthree-bms.vercel.app`
- Change signature from "Com-3" to "Greens Three Management"

---

#### 6. Booking Cancelled Template
**Variable:** `TWILIO_BOOKING_CANCELLED_TEMPLATE_SID`  
**Template Name:** `booking_cancelled`  
**Changes Required:**
- Update invoice URLs from `com3-bms.vercel.app` to `greensthree-bms.vercel.app`
- Change signature from "Com-3" to "Greens Three Management"

---

#### 7. Maintenance Invoice Template
**Variable:** `TWILIO_MAINTENANCE_INVOICE_TEMPLATE_SID`  
**Template Name:** `maintenance_invoice`  
**Changes Required:**
- Update invoice URLs from `com3-bms.vercel.app` to `greensthree-bms.vercel.app`
- Change signature from "Com-3" to "Greens Three Management"

---

#### 8. Maintenance Payment Reminder Template
**Variable:** `TWILIO_MAINTENANCE_PAYMENT_REMINDER_TEMPLATE_SID`  
**Template Name:** `maintenance_payment_reminder`  
**Changes Required:**
- Update invoice URLs from `com3-bms.vercel.app` to `greensthree-bms.vercel.app`
- Change signature from "Com-3" to "Greens Three Management"

---

#### 9. Maintenance Payment Confirmed Template
**Variable:** `TWILIO_MAINTENANCE_PAYMENT_CONFIRMED_TEMPLATE_SID`  
**Template Name:** `maintenance_payment_confirmed`  
**Changes Required:**
- Update invoice URLs from `com3-bms.vercel.app` to `greensthree-bms.vercel.app`
- Change signature from "Com-3" to "Greens Three Management"

---

#### 10. Daily Report Template
**Variable:** `TWILIO_DAILY_REPORT_TEMPLATE_SID`  
**Template Name:** `daily_report`  
**Changes Required:**
- Update report URLs from `com3-bms.vercel.app` to `greensthree-bms.vercel.app`
- Change signature from "Nova, Your Building Manager 🏢" to "Greens Three Management"

**Documentation:** See `DAILY_REPORTS_IMPLEMENTATION.md`

---

## Other Environment Variables (No Changes Required)

The following environment variables do **NOT** need to be changed:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_NUMBER`

---

## Steps to Update Environment Variables

### In Vercel Dashboard:
1. Go to your project in Vercel
2. Navigate to **Settings** → **Environment Variables**
3. Find `NEXT_PUBLIC_APP_URL`
4. Click **Edit** and update the value
5. Save changes
6. **Redeploy** your application for changes to take effect

### For Twilio Templates:
1. Go to **Twilio Console** → **Messaging** → **Content Templates**
2. Create new templates with updated branding
3. Get the new Template SIDs
4. Update the corresponding environment variables in Vercel
5. **Redeploy** your application

---

## Verification Checklist

After updating environment variables:
- [ ] Verify `NEXT_PUBLIC_APP_URL` is updated in all environments
- [ ] All 10 Twilio template SIDs are updated
- [ ] Application has been redeployed
- [ ] Test WhatsApp messages to verify new branding appears
- [ ] Test invoice generation to verify URLs are correct
- [ ] Test daily reports to verify URLs and signatures are correct

---

## Important Notes

1. **Fallback Messages:** The code includes fallback freeform messages if template SIDs are not configured. These have already been updated in the codebase with "Greens Three Management" branding.

2. **Template Approval:** New WhatsApp templates need to be approved by Meta/WhatsApp before they can be used. This may take 24-48 hours.

3. **Testing:** Use the fallback messages for immediate testing while waiting for template approval.

4. **Supabase Storage:** Don't forget to update the policy PDF file in Supabase Storage (see `app/policies/route.ts` for instructions).
