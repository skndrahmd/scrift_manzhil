# WhatsApp Template: Staff Invitation

## Template Name
`staff_invitation`

## Category
UTILITY

## Language
English (en)

## Template Content

```
Hello {{1}},

You have been added as an admin on Manzhil by Scrift.

You can now log in to the admin panel using your phone number.

Login here: {{2}}

If you did not expect this message, please ignore it.
```

## Variables
1. Staff Name (e.g., "Ahmed Khan")
2. Login URL (e.g., "https://manzhil.scrift.com/login")

## Sample Message
```
Hello Ahmed Khan,

You have been added as an admin on Manzhil by Scrift.

You can now log in to the admin panel using your phone number.

Login here: https://manzhil.scrift.com/login

If you did not expect this message, please ignore it.
```

## Instructions for Twilio Console
1. Go to Twilio Console > Messaging > Content Templates
2. Click "Create new template"
3. Select "WhatsApp" as channel
4. Enter template name: `staff_invitation`
5. Select category: "UTILITY"
6. Select language: "English"
7. Paste the template content above
8. Add 2 variables as shown
9. Submit for approval
10. Once approved, copy the Content SID (HX...) and set it as `TWILIO_STAFF_INVITATION_TEMPLATE_SID` in `.env`
