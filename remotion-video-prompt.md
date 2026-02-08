# Remotion Prompt — Manzhil by Scrift Intro Video

Create a 45–55 second intro video using **Remotion** (React-based video framework) for **Manzhil by Scrift**, a Building Management System for apartment complexes. The video should feel **modern, minimal, smooth, and professional** on a **light theme**.

**Key Concept:** Manzhil has two sides — **residents** interact entirely through a **WhatsApp chatbot** (no app download needed), while **admins** manage everything through a **web dashboard**. This dual experience should be a central highlight of the video.

---

## Brand Assets

**Logo:** `/public/manzhil_logo-no_bg.png` — A teal building silhouette inside a speech-bubble shape, transparent background.

**Color Palette:**
- **Primary Dark:** `#075E54` (deep teal) — use for headings, logo tint, strong accents
- **Primary Teal:** `#128C7E` (medium teal) — use for icons, borders, UI elements
- **Accent Green:** `#25D366` (bright green) — use for highlights, progress indicators, success states
- **Success:** `#34B27B` — use for checkmarks, completion animations
- **Background:** `#FFFFFF` (white) with subtle `#F8FAFB` sections
- **Text:** `#1A1A1A` for headings, `#6B7280` for secondary text

**Typography:** Use Inter or a clean geometric sans-serif. Headings bold, body regular.

---

## Video Structure (30 FPS, ~1500 frames)

### Scene 1: Logo Reveal (0s–4s, frames 0–120)
- White background with a very faint radial gradient (white to `#F0F9F7` at edges)
- Logo starts invisible, scales from `0.8` to `1.0` with a spring animation (`spring({ damping: 12, mass: 0.5 })`)
- As logo settles, a subtle teal glow (`#128C7E` at 10% opacity, blur 40px) fades in behind it
- Text **"Manzhil"** fades up below the logo using `interpolate()` on opacity and translateY (from +20px to 0)
- 0.3s later, subtitle **"by Scrift"** fades in below in `#6B7280`, smaller font

### Scene 2: Tagline (4s–6s, frames 120–180)
- Logo scales down slightly and moves up
- Tagline text animates in letter-by-letter or word-by-word: **"Smart Building Management"**
- Use `#075E54` color, medium weight
- A thin horizontal line (`#25D366`, 2px) grows from center outward beneath the tagline

### Scene 3: Feature Cards (6s–26s, frames 180–780)
Each feature gets ~3.3 seconds. Cards slide in from the right with staggered children.

**Card Layout:** Left side has a large icon (thin-line style, `#128C7E`), right side has title + one-line description. Cards have white background, subtle `border: 1px solid #E5E7EB`, `border-radius: 12px`, light shadow.

Feature sequence:

1. **Residents** — Building/people icon
   - Title: "Resident Management"
   - Description: "Complete profiles, apartments & maintenance tracking"

2. **Maintenance** — Wallet/payment icon
   - Title: "Maintenance Payments"
   - Description: "Automated reminders & payment tracking"

3. **Hall Bookings** — Calendar icon
   - Title: "Hall Bookings"
   - Description: "Seamless booking with time slot management"

4. **Complaints** — Chat/support icon
   - Title: "Complaint Resolution"
   - Description: "Real-time tracking from submission to resolution"

5. **Visitor Passes** — Shield/ID icon
   - Title: "Visitor Management"
   - Description: "CNIC verification & arrival notifications"

6. **Parcel Tracking** — Package icon
   - Title: "Parcel & Delivery"
   - Description: "Log, notify & track every delivery"

**Card Animation Pattern:**
- Card enters with `translateX(100px)` → `0` and `opacity: 0` → `1` using spring animation
- Icon inside the card does a subtle scale-in (`0.5` → `1`) with a 5-frame delay
- As one card exits (fading left + scaling to `0.95`), the next card enters
- A small `#25D366` progress bar at the bottom of the screen advances with each card

### Scene 4: The Two Sides — Intro (26s–29s, frames 780–870)
- Clean transition: all cards fade out
- A thin vertical divider line (`#E5E7EB`, 1px) draws from top to bottom at screen center
- Left side label fades in: **"Residents"** in `#075E54`, with a WhatsApp icon beside it
- Right side label fades in: **"Admins"** in `#075E54`, with a monitor/dashboard icon beside it
- Below the labels, subtitle fades in across full width: **"Two experiences. One platform."** in `#6B7280`

### Scene 5: Resident Side — WhatsApp Chatbot (29s–37s, frames 870–1110)
- Divider and labels slide away. Focus shifts to the left/center of screen
- A phone mockup (minimal outline, rounded corners, `#E5E7EB` border) fades in at center
- Inside the phone, a WhatsApp-style chat interface animates:
  - WhatsApp green header bar (`#075E54`) with "Manzhil by Scrift" as the contact name and the Manzhil logo as profile picture
  - Chat bubbles appear one by one with typing indicator animation (three bouncing dots) before each message:
    1. **Bot (left, white bubble):** "Hi Ahmed! How can I help you today?"
    2. **Bot (left, white bubble):** Quick-reply buttons appear below: "Book Hall" / "Pay Maintenance" / "File Complaint" / "My Visitors"
    3. **User (right, green `#25D366` bubble):** "Book Hall"
    4. **Bot (left, white bubble):** "Hall booked for Dec 15, 7-10 PM. Confirmation sent!"
  - Each bubble slides up with a subtle spring animation, staggered by ~20 frames
- Below the phone, text fades in: **"No app download. Just WhatsApp."** in `#128C7E`
- Small icons animate in below: checkmark + "Book Halls" / checkmark + "Pay Maintenance" / checkmark + "File Complaints" / checkmark + "Track Visitors"

### Scene 6: Admin Side — Web Dashboard (37s–45s, frames 1110–1350)
- Phone mockup slides left and fades out
- A browser/laptop mockup (minimal outline) slides in from the right
- Inside the browser, a stylized admin dashboard builds itself piece by piece:
  - **Top bar:** Manzhil logo + "Admin Dashboard" text fades in
  - **Stat cards row:** 4 cards animate in with stagger (slide up + fade):
    - "156 Residents" with people icon
    - "42 Bookings" with calendar icon
    - "12 Open Complaints" with alert icon
    - "Rs. 2.4M Collected" with money icon
  - **Chart area:** A bar chart grows upward (bars in `#128C7E`, `#25D366`, `#34B27B`)
  - **Side panel:** A donut chart draws itself using stroke-dashoffset animation
  - **Notification toast:** A small toast slides in from top-right: "New complaint from Apt 4B" with a bell icon
- Below the browser, text fades in: **"Complete control. Real-time insights."** in `#128C7E`
- Small icons animate in below: checkmark + "Manage Residents" / checkmark + "Track Payments" / checkmark + "Broadcast Messages" / checkmark + "Analytics & Reports"

### Scene 7: Split Screen Finale (45s–48s, frames 1350–1440)
- Both mockups return — phone on the left, browser on the right — sliding in simultaneously
- The vertical divider line reappears between them
- A subtle animated connection line (dotted, `#25D366`) pulses between the phone and the browser, showing they're connected
- Text appears centered below both: **"Residents on WhatsApp. Admins on the web. Everything in sync."** in `#075E54`

### Scene 8: Closing (48s–53s, frames 1440–1590)
- Both mockups and text fade to white
- Logo returns to center, same spring animation as Scene 1 but faster
- Below logo: **"Manzhil by Scrift"** in `#075E54`, bold
- Below that: **"Building Management, Simplified."** in `#128C7E`
- A subtle shimmer/shine passes across the logo (a diagonal white gradient mask moving left to right)
- Final 1.5s is a static hold on the logo + tagline

---

## Animation Guidelines

- **Easing:** Use Remotion's `spring()` for entrances, `interpolate()` with `Easing.bezier(0.25, 0.1, 0.25, 1)` for smooth transitions
- **No hard cuts** — every transition should use opacity + transform
- **Stagger pattern:** When multiple elements appear, stagger by 5–8 frames each
- **Consistent direction:** Elements generally enter from right/bottom, exit to left/top
- **White space:** Don't crowd the frame. Keep generous padding (80px+ from edges)
- **Shadows:** Use very subtle box-shadows (`0 2px 8px rgba(0,0,0,0.06)`)

---

## Remotion Project Structure

```
src/
├── Root.tsx              # Composition registration
├── IntroVideo.tsx        # Main sequence component
├── scenes/
│   ├── LogoReveal.tsx
│   ├── Tagline.tsx
│   ├── FeatureCards.tsx
│   ├── TwoSidesIntro.tsx
│   ├── ResidentChatbot.tsx
│   ├── AdminDashboard.tsx
│   ├── SplitScreenFinale.tsx
│   └── Closing.tsx
├── components/
│   ├── FeatureCard.tsx
│   ├── AnimatedText.tsx
│   ├── ProgressBar.tsx
│   ├── PhoneMockup.tsx
│   ├── BrowserMockup.tsx
│   ├── ChatBubble.tsx
│   ├── StatCard.tsx
│   ├── BarChart.tsx
│   ├── DonutChart.tsx
│   └── Logo.tsx
├── styles/
│   └── colors.ts         # Color constants
└── assets/
    └── manzhil_logo.png
```

---

## Audio

Add a soft, ambient background track. Minimal electronic/corporate — think Epidemic Sound "Technology" category. Volume should be subtle (30–40%). Optional: soft whoosh sound effects on card transitions.
