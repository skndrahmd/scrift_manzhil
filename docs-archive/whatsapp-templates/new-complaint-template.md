# WhatsApp Template: New Complaint Notification

## Template Name
`new_complaint_notification`

## Category
UTILITY

## Language
English (en)

## Template Content

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

## Variables
1. Complaint ID (e.g., "COM-20241208-001")
2. Resident Name (e.g., "John Doe")
3. Apartment Number (e.g., "A-101")
4. Category (e.g., "Building Complaint")
5. Subcategory/Type (e.g., "Lift/Elevator")
6. Description (e.g., "Lift stuck on 3rd floor")
7. Date (e.g., "December 8, 2024")
8. Time (e.g., "1:30 PM")
9. Admin Panel Link (e.g., "https://greensthree-bms.vercel.app/admin")

## Sample Message
```
🆕 New Complaint Registered

🎫 Complaint ID: COM-20241208-001
👤 Resident: John Doe
🏠 Apartment: A-101
📋 Category: Building Complaint
🔖 Type: Lift/Elevator
📝 Description: Lift stuck on 3rd floor
📅 Date: December 8, 2024
⏰ Time: 1:30 PM

Please review and take necessary action.

🔗 View Details: https://greensthree-bms.vercel.app/admin
```

## Instructions for Twilio Console
1. Go to Twilio Console > Messaging > Content Templates
2. Click "Create new template"
3. Select "WhatsApp" as channel
4. Enter template name: `new_complaint_notification`
5. Select category: "UTILITY"
6. Select language: "English"
7. Paste the template content above
8. Add 9 variables as shown
9. Submit for approval
