# Broadcast Announcement Template - Twilio Submission

Copy and paste the values below into Twilio Console.

---

## Step 1: Basic Info

**Template Name:**
```
broadcast_announcement
```

**Category:**
```
UTILITY
```

**Language:**
```
English (en)
```

---

## Step 2: Template Content

### Option A: With Header (Recommended)

**Header Type:** Text

**Header Content:**
```
{{1}}
```

**Body:**
```
{{2}}

{{3}}

For questions, please contact building management.

— Manzhil Building Management
```

**Footer:**
```
Reply STOP to unsubscribe
```

---

### Option B: Body Only (Simpler)

**Body:**
```
*{{1}}*

{{2}}

{{3}}

For questions, please contact building management.

— Manzhil Building Management
```

**Footer:**
```
Reply STOP to unsubscribe
```

---

## Step 3: Sample Values

When prompted for sample values, use these:

**{{1}} Sample:**
```
Building Maintenance Notice
```

**{{2}} Sample:**
```
Water supply will be temporarily unavailable on January 15, 2025, from 10:00 AM to 2:00 PM for scheduled tank cleaning and maintenance.
```

**{{3}} Sample:**
```
Please store water in advance. We apologize for any inconvenience.
```

---

## Step 4: Template Description

When asked to describe the template purpose:

```
This template is used to send important building announcements and notices to residents of our residential complex. Messages include maintenance schedules, safety notices, community updates, and other building-related information that residents need to be aware of.
```

---

## After Approval

1. Copy the Template SID (starts with HX...)
2. Add to your `.env` file:

```
TWILIO_BROADCAST_ANNOUNCEMENT_TEMPLATE_SID=HXxxxxxxxxxxxxxxxxxx
```

3. Restart your application

---

## Notes

- Approval typically takes 24-48 hours
- If rejected, try removing the header and using Option B
- UTILITY category has higher approval rates than MARKETING
