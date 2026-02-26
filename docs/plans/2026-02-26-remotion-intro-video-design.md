# Manzhil Intro Video — Design Document

## Purpose

30-second product demo reel for showing to potential clients/apartment complexes considering Manzhil. Highlights features and professionalism.

## Format

- **Duration:** 30 seconds at 30fps (900 frames)
- **Resolution:** 1920x1080 (Full HD)
- **Output:** MP4, silent
- **Tech:** Remotion (React-based video framework)
- **Visual Style:** Mixed — logo intro + feature highlights with icons/text + simplified dashboard mockup

## Branding

- **Colors:** Deep Teal (#075E54), Medium Teal (#128C7E), Bright Green (#25D366)
- **Font:** DM Sans (400, 500, 600, 700)
- **Logo:** `public/manzhil_logo-no_bg.png` (transparent background)
- **App Name:** "Manzhil by Scrift"

## Scene Breakdown

### Scene 1 — Logo Reveal (0s–5s, frames 0–150)

Manzhil logo fades in and scales up on deep teal (#075E54) background. "Manzhil" text animates in below with "by Scrift" subtitle. Tagline fades in: "Building Management, Simplified."

### Scene 2 — Problem Statement (5s–9s, frames 150–270)

Quick kinetic text: "Managing apartments is complex." with subtle icons (keys, documents, phones) floating in the background. Transitions to a teal gradient.

### Scene 3 — Feature Showcase (9s–23s, frames 270–690)

Six features appear one by one (~2.3s each), each with:
- Feature icon (emoji or Lucide icon)
- Feature name in bold DM Sans
- One-line description
- Subtle slide-in animation from the right

Features:
1. Units & Residents — "Manage apartments and tenants effortlessly"
2. Maintenance Payments — "Track dues, send invoices via WhatsApp"
3. Hall Bookings — "Community hall scheduling with payments"
4. Complaints — "Register, track, and resolve issues"
5. WhatsApp Bot — "Resident self-service in multiple languages"
6. Analytics Dashboard — "Real-time insights and PDF reports"

### Scene 4 — Dashboard Mockup (23s–27s, frames 690–810)

A simplified, animated mockup of the admin dashboard fades in — showing a sidebar with feature icons and a main content area with sample cards/charts using the Manzhil color palette.

### Scene 5 — Call to Action (27s–30s, frames 810–900)

Logo returns, text: "Manzhil by Scrift" with a subtle glow. Fade to teal.

## Project Structure

```
video/
├── src/
│   ├── Root.tsx              # Remotion composition config
│   ├── ManzhilIntro.tsx      # Main video component (scene orchestrator)
│   ├── scenes/
│   │   ├── LogoReveal.tsx
│   │   ├── ProblemStatement.tsx
│   │   ├── FeatureShowcase.tsx
│   │   ├── DashboardMockup.tsx
│   │   └── CallToAction.tsx
│   └── components/
│       ├── FeatureCard.tsx
│       └── AnimatedText.tsx
├── remotion.config.ts
└── package.json              # Separate from main project
```

Lives in `video/` directory — completely separate from the Next.js app.

## Audio

Silent — no background music. Can be added in post-production.

## What We're NOT Building

- No screen recordings of the actual app
- No voiceover or narration
- No interactive elements
- No changes to the main Next.js project
