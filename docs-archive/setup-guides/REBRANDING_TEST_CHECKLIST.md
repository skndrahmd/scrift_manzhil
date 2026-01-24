# Rebranding Testing & Verification Checklist

This comprehensive checklist ensures all "Com-3" and "Nova" references have been successfully replaced with "Greens Three" and professional third-person messaging.

---

## Pre-Deployment Checklist

### Environment Variables
- [ ] `NEXT_PUBLIC_APP_URL` updated to `https://greensthree-bms.vercel.app`
- [ ] All 10 Twilio WhatsApp template SIDs updated with new templates
- [ ] Application redeployed after environment variable changes

### Supabase Storage
- [ ] Created "GreensThree" bucket in Supabase Storage
- [ ] Uploaded policy PDF with new branding
- [ ] Updated `app/policies/route.ts` with new signed URL
- [ ] Removed TODO comments from policies route

---

## Code Verification

### Core Branding
- [ ] `lib/invoice.ts` - `BRAND_NAME` constant is "Greens Three"
- [ ] `lib/invoice.ts` - Maintenance invoice footer text updated
- [ ] `lib/invoice.ts` - Booking invoice note text updated

### Application Metadata
- [ ] `app/layout.tsx` - Page title is "Greens Three BMS"
- [ ] `app/booking-invoice/[id]/page.tsx` - Footer text updated

### Database Documentation
- [ ] `database-setup-production.sql` - Header comment updated

---

## WhatsApp Bot Testing

### Authentication & Error Messages
- [ ] Test with unregistered phone number
  - Expected: "Welcome to Greens Three Building Management System"
  - No "Nova" or "Com-3" references
- [ ] Test with inactive account
  - Expected: Professional third-person message
  - No personal tone ("I'm sorry")
- [ ] Test with overdue maintenance (2+ months)
  - Expected: "Access to services is temporarily restricted"
  - No personal tone

### Main Menu
- [ ] Send any message to trigger main menu
  - Expected: "Welcome to Greens Three, [Name]"
  - Expected: "Please select a service from the menu below:"
  - No "Nova" or "Com-3" references

### Complaint Flow
- [ ] Register a new complaint (apartment)
  - Expected: Professional confirmation message
  - Expected: "The maintenance team has been notified"
  - No "I'll make sure" or personal tone
- [ ] Register a new complaint (building)
  - Expected: "The management team has been notified"
  - No personal tone
- [ ] Check complaint status
  - Expected: Professional status display
  - No "Here's what I found for you"
- [ ] Try to cancel a complaint
  - Expected: Professional cancellation flow
  - No personal tone

### Booking Flow
- [ ] Start community hall booking
  - Expected: Professional prompts
  - No personal tone
- [ ] Try to book a closed day
  - Expected: "The community hall is closed on [Day]s"
  - No "I'm sorry, but"
- [ ] Complete a booking
  - Expected: "Payment must be received within 3 days"
  - Expected: "Unpaid bookings will be automatically cancelled"
  - No "I'll have to cancel"

### Maintenance Status
- [ ] Check maintenance dues (paid)
  - Expected: "Your maintenance payments are current"
  - No "Great! Your maintenance is all paid up!"
- [ ] Check maintenance dues (unpaid)
  - Expected: "Payment is pending. Please settle your maintenance charges"
  - No "I noticed your payment is pending"

---

## Admin Dashboard Testing

### Complaint Status Updates
- [ ] Update complaint to "Completed"
  - Check WhatsApp message sent to resident
  - Expected: "✅ Complaint Status Update"
  - Expected: "- Greens Three Management"
  - No "Nova" signature
- [ ] Update complaint to "In Progress"
  - Expected: Professional update message
  - Expected: "The maintenance team is actively working"
  - No "I'll keep you posted"
- [ ] Update complaint to "Cancelled"
  - Expected: Professional cancellation message
  - No "I'm here to help"
- [ ] Update complaint to "Pending"
  - Expected: "The management team will address this matter shortly"
  - No "I've received it"

### Maintenance Payment Updates
- [ ] Mark maintenance payment as paid
  - Check WhatsApp confirmation message
  - Expected: "- Greens Three Management"
  - No "Com-3" signature

---

## Invoice Testing

### Maintenance Invoice
- [ ] Generate maintenance invoice PDF
  - [ ] Header shows "Greens Three"
  - [ ] Footer shows "Thank you for keeping your maintenance dues up to date with Greens Three"
  - [ ] Footer shows "Greens Three · Automated invoice generated on [Date]"
  - No "Com-3" references

### Booking Invoice
- [ ] Generate booking invoice PDF
  - [ ] Header shows "Greens Three"
  - [ ] Notes section: "contact the Greens Three admin office"
  - [ ] Footer shows "Greens Three · Automated invoice generated on [Date]"
  - No "Com-3" references
- [ ] View booking invoice page
  - [ ] Footer shows "Greens Three Community Management System"
  - No "Com-3" references

---

## Cron Job Testing

### Booking Reminders
- [ ] Trigger booking payment reminder (Day 1 or 2)
  - Check WhatsApp message
  - Expected: "- Greens Three Management"
  - No "Com-3" signature
- [ ] Trigger booking cancellation (Day 3+)
  - Check WhatsApp message
  - Expected: "- Greens Three Management"
  - No "Com-3" signature

### Maintenance Reminders
- [ ] Trigger new maintenance invoice notification
  - Check WhatsApp message
  - Expected: "- Greens Three Management"
  - No "Com-3" signature
- [ ] Trigger maintenance payment reminder
  - Check WhatsApp message
  - Expected: "- Greens Three Management"
  - No "Com-3" signature

### Bulk Maintenance Reminder
- [ ] Send bulk maintenance reminder from admin panel
  - Check WhatsApp message
  - Expected: "This is a payment reminder from Greens Three Management"
  - Expected: "- Greens Three Management"
  - No "Nova" references

### Daily Reports
- [ ] Trigger daily reports generation
  - Check WhatsApp message to admins
  - Expected: "- Greens Three Management"
  - No "Nova, Your Building Manager"
- [ ] Open 24-hour activity report PDF
  - [ ] Header shows "Greens Three Building Management"
  - [ ] Footer shows "Greens Three Building Management System"
  - No "Com-3" references
- [ ] Open open complaints report PDF
  - [ ] Header shows "Greens Three Building Management"
  - [ ] Footer shows "Greens Three Building Management System"
  - No "Com-3" references

---

## URL Verification

### Application URLs
- [ ] All invoice links use `greensthree-bms.vercel.app`
- [ ] All daily report links use `greensthree-bms.vercel.app`
- [ ] Policy redirect uses correct Supabase Storage URL

### Documentation URLs
- [ ] `whatsapp-templates/new-complaint-template.md` - URLs updated
- [ ] `whatsapp-templates/pending-complaint-reminder.md` - URLs updated
- [ ] `DAILY_REPORTS_IMPLEMENTATION.md` - URLs updated

---

## Visual Verification

### Browser Tab
- [ ] Open admin dashboard
  - Expected: Tab title shows "Greens Three BMS"
  - No "Com-3 BMS"

### PDF Documents
- [ ] All PDF headers show "Greens Three"
- [ ] All PDF footers show "Greens Three"
- [ ] No "Com-3" branding visible

---

## Tone & Messaging Verification

### Professional Third-Person Tone
Review all WhatsApp messages for:
- [ ] No first-person pronouns ("I", "I'm", "I'll")
- [ ] No personal sentiments ("I'm glad", "I'm sorry")
- [ ] Professional language throughout
- [ ] Third-person references ("The management team", "The maintenance team")

### Signature Consistency
All WhatsApp messages should end with:
- [ ] "- Greens Three Management" (not "Com-3" or "Nova")
- [ ] No emoji in signature (🏢 removed)

---

## Edge Case Testing

### Error Scenarios
- [ ] Test with invalid date format in booking
  - Expected: Professional error message
  - No "I couldn't understand"
- [ ] Test with invalid complaint category
  - Expected: Professional error message
  - No personal tone
- [ ] Trigger system error (if possible)
  - Expected: "A system error has occurred"
  - No "Oops! Something went wrong on my end"

---

## Documentation Review

### Updated Files
- [ ] `REBRANDING_ENV_CHANGES.md` created with all environment variable instructions
- [ ] `REBRANDING_TEST_CHECKLIST.md` (this file) created
- [ ] All template documentation files updated
- [ ] All implementation guides updated

---

## Final Verification

### Search for Remaining References
Run these searches to ensure no references remain:
```bash
# Search for "Com-3" or "Com3"
grep -r "Com-3\|Com3" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git .

# Search for "Nova" (excluding node_modules)
grep -r "Nova" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git .

# Search for "com3-bms" URLs
grep -r "com3-bms" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git .
```

Expected results:
- [ ] No "Com-3" or "Com3" references (except in this checklist and documentation)
- [ ] No "Nova" references (except in this checklist and documentation)
- [ ] No "com3-bms.vercel.app" URLs (except in this checklist and documentation)

---

## Sign-Off

### Testing Completed By
- Name: _______________
- Date: _______________
- Signature: _______________

### Issues Found
List any issues discovered during testing:
1. _______________
2. _______________
3. _______________

### Resolution Status
- [ ] All issues resolved
- [ ] Pending issues documented
- [ ] Ready for production deployment

---

## Notes

- **Twilio Template Approval:** Remember that new WhatsApp templates need Meta/WhatsApp approval (24-48 hours)
- **Fallback Messages:** Fallback freeform messages are already updated and can be used immediately
- **Supabase Storage:** Policy PDF needs to be manually uploaded to new bucket
- **Environment Variables:** Must be updated in Vercel and application redeployed

---

## Post-Deployment Monitoring

After deploying to production:
- [ ] Monitor WhatsApp messages for first 24 hours
- [ ] Check error logs for any branding-related issues
- [ ] Verify all automated cron jobs are working correctly
- [ ] Collect feedback from admin users
- [ ] Verify resident-facing messages are professional and clear
