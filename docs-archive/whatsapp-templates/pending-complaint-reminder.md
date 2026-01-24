# WhatsApp Template: Pending Complaint Reminder

## Template Name
`pending_complaint_reminder`

## Category
UTILITY

## Language
English (en)

## Template Content

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

## Variables
1. Complaint ID (e.g., "COM-20241207-005")
2. Resident Name (e.g., "Jane Smith")
3. Apartment Number (e.g., "B-205")
4. Category (e.g., "Apartment Complaint")
5. Subcategory/Type (e.g., "Plumbing")
6. Description (e.g., "Water leakage in bathroom")
7. Registration Date (e.g., "December 7, 2024")
8. Hours Pending (e.g., "26")
9. Admin Panel Link (e.g., "https://greensthree-bms.vercel.app/admin")

## Sample Message
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

🔗 View Details: https://greensthree-bms.vercel.app/admin
```

## Instructions for Twilio Console
1. Go to Twilio Console > Messaging > Content Templates
2. Click "Create new template"
3. Select "WhatsApp" as channel
4. Enter template name: `pending_complaint_reminder`
5. Select category: "UTILITY"
6. Select language: "English"
7. Paste the template content above
8. Add 9 variables as shown
9. Submit for approval
