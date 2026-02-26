# Manzhil Intro Video — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a 30-second product demo reel video for Manzhil using Remotion, with logo reveal, feature showcase, dashboard mockup, and call-to-action scenes.

**Architecture:** Standalone Remotion project in `video/` directory, completely separate from the Next.js app. Five scene components orchestrated by a main composition using Sequence. Copies the logo from the main project's `public/` into the video project's `public/`.

**Tech Stack:** Remotion 4, React 18, TypeScript, @remotion/google-fonts (DM Sans)

**CRITICAL CONSTRAINT:** This is a standalone project in `video/`. It MUST NOT modify any files outside `video/` except copying the logo asset. No changes to the main Next.js app.

---

### Task 1: Scaffold Remotion Project

**Files:**
- Create: `video/package.json`
- Create: `video/tsconfig.json`
- Create: `video/remotion.config.ts`
- Create: `video/src/index.ts`
- Create: `video/src/Root.tsx`
- Create: `video/src/ManzhilIntro.tsx` (placeholder)
- Copy: `public/manzhil_logo-no_bg.png` -> `video/public/manzhil_logo.png`

**Step 1: Create directory structure**

Run:
```bash
mkdir -p video/src/scenes video/src/components video/public
```

**Step 2: Copy logo asset**

Run:
```bash
cp public/manzhil_logo-no_bg.png video/public/manzhil_logo.png
```

**Step 3: Create `video/package.json`**

```json
{
  "name": "manzhil-intro-video",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "studio": "remotion studio",
    "render": "remotion render src/index.ts ManzhilIntro out/ManzhilIntro.mp4 --codec h264 --crf 18"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "remotion": "^4.0.0",
    "@remotion/cli": "^4.0.0",
    "@remotion/google-fonts": "^4.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  }
}
```

**Step 4: Create `video/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "baseUrl": ".",
    "paths": {}
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules"]
}
```

**Step 5: Create `video/remotion.config.ts`**

```typescript
import { Config } from "@remotion/cli/config"

Config.setCodec("h264")
Config.setCrf(18)
Config.setVideoImageFormat("jpeg")
Config.setEntryPoint("./src/index.ts")
```

**Step 6: Create `video/src/index.ts`**

```typescript
import { registerRoot } from "remotion"
import { RemotionRoot } from "./Root"

registerRoot(RemotionRoot)
```

**Step 7: Create `video/src/Root.tsx`**

```tsx
import React from "react"
import { Composition } from "remotion"
import { ManzhilIntro } from "./ManzhilIntro"

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ManzhilIntro"
        component={ManzhilIntro}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  )
}
```

**Step 8: Create placeholder `video/src/ManzhilIntro.tsx`**

```tsx
import React from "react"
import { AbsoluteFill } from "remotion"

export const ManzhilIntro: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#075E54", justifyContent: "center", alignItems: "center" }}>
      <h1 style={{ color: "white", fontSize: 80, fontFamily: "sans-serif" }}>Manzhil</h1>
    </AbsoluteFill>
  )
}
```

**Step 9: Install dependencies**

Run:
```bash
cd video && npm install
```

**Step 10: Verify studio launches**

Run:
```bash
cd video && npx remotion studio --port 3001
```
Expected: Studio opens at localhost:3001 showing "Manzhil" on teal background. Stop with Ctrl+C.

**Step 11: Commit**

```bash
git add video/
git commit -m "feat: scaffold Remotion video project for Manzhil intro"
```

---

### Task 2: Create Shared Theme Constants and AnimatedText Component

**Files:**
- Create: `video/src/theme.ts`
- Create: `video/src/components/AnimatedText.tsx`

**Step 1: Create `video/src/theme.ts`**

```typescript
import { loadFont } from "@remotion/google-fonts/DMSans"

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
})

export const FONT = fontFamily

export const COLORS = {
  dark: "#075E54",
  teal: "#128C7E",
  light: "#25D366",
  white: "#FFFFFF",
  textPrimary: "#111827",
  bgSubtle: "#F9FAFB",
  bgHighlight: "#F0FDF9",
} as const

export const SCENES = {
  logoReveal: { from: 0, duration: 150 },
  problem: { from: 150, duration: 120 },
  features: { from: 270, duration: 420 },
  dashboard: { from: 690, duration: 120 },
  cta: { from: 810, duration: 90 },
} as const
```

**Step 2: Create `video/src/components/AnimatedText.tsx`**

```tsx
import React from "react"
import { interpolate, useCurrentFrame } from "remotion"
import { FONT } from "../theme"

type Props = {
  text: string
  fontSize?: number
  color?: string
  fontWeight?: number
  delay?: number
  slideFrom?: "bottom" | "right" | "none"
}

export const AnimatedText: React.FC<Props> = ({
  text,
  fontSize = 48,
  color = "#FFFFFF",
  fontWeight = 600,
  delay = 0,
  slideFrom = "bottom",
}) => {
  const frame = useCurrentFrame()
  const adjustedFrame = frame - delay

  const opacity = interpolate(adjustedFrame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  let translateX = 0
  let translateY = 0

  if (slideFrom === "bottom") {
    translateY = interpolate(adjustedFrame, [0, 20], [40, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  } else if (slideFrom === "right") {
    translateX = interpolate(adjustedFrame, [0, 20], [60, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  }

  return (
    <div
      style={{
        opacity,
        transform: `translate(${translateX}px, ${translateY}px)`,
        fontSize,
        color,
        fontWeight,
        fontFamily: FONT,
        lineHeight: 1.2,
      }}
    >
      {text}
    </div>
  )
}
```

**Step 3: Verify build**

Run:
```bash
cd video && npx remotion studio --port 3001
```
Expected: Still shows placeholder. Stop with Ctrl+C.

**Step 4: Commit**

```bash
git add video/src/theme.ts video/src/components/AnimatedText.tsx
git commit -m "feat: add theme constants and AnimatedText component"
```

---

### Task 3: Create LogoReveal Scene (0s–5s)

**Files:**
- Create: `video/src/scenes/LogoReveal.tsx`

**Step 1: Create `video/src/scenes/LogoReveal.tsx`**

```tsx
import React from "react"
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion"
import { COLORS, FONT } from "../theme"

export const LogoReveal: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Logo scales in with spring
  const logoScale = spring({
    frame,
    fps,
    from: 0.3,
    to: 1,
    durationInFrames: 40,
    config: { damping: 12, stiffness: 80 },
  })

  const logoOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  })

  // "Manzhil" text slides up after logo
  const titleOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const titleY = interpolate(frame, [30, 50], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // "by Scrift" appears after title
  const subtitleOpacity = interpolate(frame, [50, 65], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // Tagline fades in last
  const taglineOpacity = interpolate(frame, [75, 95], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const taglineY = interpolate(frame, [75, 95], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // Fade out at end of scene
  const fadeOut = interpolate(frame, [130, 150], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.dark,
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      {/* Logo */}
      <div style={{ opacity: logoOpacity, transform: `scale(${logoScale})` }}>
        <Img
          src={staticFile("manzhil_logo.png")}
          style={{ width: 180, height: 180 }}
        />
      </div>

      {/* Title */}
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          marginTop: 24,
          display: "flex",
          alignItems: "baseline",
          gap: 12,
        }}
      >
        <span
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.white,
            fontFamily: FONT,
          }}
        >
          Manzhil
        </span>
        <span
          style={{
            fontSize: 28,
            fontWeight: 400,
            color: COLORS.light,
            fontFamily: FONT,
            opacity: subtitleOpacity,
          }}
        >
          by Scrift
        </span>
      </div>

      {/* Tagline */}
      <div
        style={{
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
          marginTop: 16,
          fontSize: 32,
          fontWeight: 400,
          color: "rgba(255,255,255,0.8)",
          fontFamily: FONT,
          letterSpacing: 1,
        }}
      >
        Building Management, Simplified.
      </div>
    </AbsoluteFill>
  )
}
```

**Step 2: Wire it into ManzhilIntro**

Update `video/src/ManzhilIntro.tsx`:

```tsx
import React from "react"
import { AbsoluteFill, Sequence } from "remotion"
import { COLORS, SCENES } from "./theme"
import { LogoReveal } from "./scenes/LogoReveal"

export const ManzhilIntro: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.dark }}>
      <Sequence from={SCENES.logoReveal.from} durationInFrames={SCENES.logoReveal.duration} name="Logo Reveal">
        <LogoReveal />
      </Sequence>
    </AbsoluteFill>
  )
}
```

**Step 3: Preview in studio**

Run:
```bash
cd video && npx remotion studio --port 3001
```
Expected: Logo bounces in, "Manzhil by Scrift" slides up, tagline fades in, scene fades out. Stop with Ctrl+C.

**Step 4: Commit**

```bash
git add video/src/scenes/LogoReveal.tsx video/src/ManzhilIntro.tsx
git commit -m "feat: add LogoReveal scene with spring animation"
```

---

### Task 4: Create ProblemStatement Scene (5s–9s)

**Files:**
- Create: `video/src/scenes/ProblemStatement.tsx`

**Step 1: Create `video/src/scenes/ProblemStatement.tsx`**

```tsx
import React from "react"
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion"
import { COLORS, FONT } from "../theme"

const FLOATING_ICONS = [
  { emoji: "🔑", x: 15, y: 20, delay: 0 },
  { emoji: "📄", x: 75, y: 15, delay: 5 },
  { emoji: "📱", x: 25, y: 70, delay: 10 },
  { emoji: "💰", x: 80, y: 65, delay: 8 },
  { emoji: "🏠", x: 50, y: 25, delay: 3 },
  { emoji: "📞", x: 60, y: 75, delay: 12 },
]

export const ProblemStatement: React.FC = () => {
  const frame = useCurrentFrame()

  // Main text fade in
  const textOpacity = interpolate(frame, [0, 25], [0, 1], {
    extrapolateRight: "clamp",
  })
  const textScale = interpolate(frame, [0, 25], [0.9, 1], {
    extrapolateRight: "clamp",
  })

  // Fade out
  const fadeOut = interpolate(frame, [100, 120], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      {/* Gradient background */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(135deg, ${COLORS.dark} 0%, ${COLORS.teal} 100%)`,
        }}
      />

      {/* Floating icons */}
      {FLOATING_ICONS.map((icon, i) => {
        const iconOpacity = interpolate(frame, [icon.delay, icon.delay + 20], [0, 0.25], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
        const floatY = interpolate(frame, [0, 120], [0, -15], {
          extrapolateRight: "clamp",
        })
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${icon.x}%`,
              top: `${icon.y}%`,
              fontSize: 64,
              opacity: iconOpacity,
              transform: `translateY(${floatY}px)`,
            }}
          >
            {icon.emoji}
          </div>
        )
      })}

      {/* Center text */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            opacity: textOpacity,
            transform: `scale(${textScale})`,
            textAlign: "center",
            padding: "0 120px",
          }}
        >
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: COLORS.white,
              fontFamily: FONT,
              lineHeight: 1.3,
            }}
          >
            Managing apartments is complex.
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 400,
              color: "rgba(255,255,255,0.7)",
              fontFamily: FONT,
              marginTop: 20,
              opacity: interpolate(frame, [25, 45], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            It doesn't have to be.
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
```

**Step 2: Add to ManzhilIntro**

Update `video/src/ManzhilIntro.tsx` — add ProblemStatement import and Sequence:

```tsx
import React from "react"
import { AbsoluteFill, Sequence } from "remotion"
import { COLORS, SCENES } from "./theme"
import { LogoReveal } from "./scenes/LogoReveal"
import { ProblemStatement } from "./scenes/ProblemStatement"

export const ManzhilIntro: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.dark }}>
      <Sequence from={SCENES.logoReveal.from} durationInFrames={SCENES.logoReveal.duration} name="Logo Reveal">
        <LogoReveal />
      </Sequence>
      <Sequence from={SCENES.problem.from} durationInFrames={SCENES.problem.duration} name="Problem Statement">
        <ProblemStatement />
      </Sequence>
    </AbsoluteFill>
  )
}
```

**Step 3: Preview**

Run:
```bash
cd video && npx remotion studio --port 3001
```
Expected: After logo fades out, gradient with floating icons and "Managing apartments is complex" text appears. Stop with Ctrl+C.

**Step 4: Commit**

```bash
git add video/src/scenes/ProblemStatement.tsx video/src/ManzhilIntro.tsx
git commit -m "feat: add ProblemStatement scene with floating icons"
```

---

### Task 5: Create FeatureCard Component and FeatureShowcase Scene (9s–23s)

**Files:**
- Create: `video/src/components/FeatureCard.tsx`
- Create: `video/src/scenes/FeatureShowcase.tsx`

**Step 1: Create `video/src/components/FeatureCard.tsx`**

```tsx
import React from "react"
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { COLORS, FONT } from "../theme"

type Props = {
  icon: string
  title: string
  description: string
  index: number
}

export const FeatureCard: React.FC<Props> = ({ icon, title, description, index }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Each card animates in from the right
  const slideX = spring({
    frame,
    fps,
    from: 80,
    to: 0,
    durationInFrames: 25,
    config: { damping: 15, stiffness: 80 },
  })

  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  })

  // Icon bounce
  const iconScale = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    delay: 8,
    durationInFrames: 20,
    config: { damping: 8, stiffness: 120 },
  })

  // Determine if card should be on left or right
  const isLeft = index % 2 === 0

  return (
    <AbsoluteFillCenter>
      <div
        style={{
          opacity,
          transform: `translateX(${isLeft ? -slideX : slideX}px)`,
          display: "flex",
          alignItems: "center",
          gap: 40,
          flexDirection: isLeft ? "row" : "row-reverse",
        }}
      >
        {/* Icon circle */}
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: "rgba(255,255,255,0.1)",
            border: `3px solid ${COLORS.light}`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: 56,
            transform: `scale(${iconScale})`,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>

        {/* Text */}
        <div style={{ textAlign: isLeft ? "left" : "right" }}>
          <div
            style={{
              fontSize: 44,
              fontWeight: 700,
              color: COLORS.white,
              fontFamily: FONT,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 400,
              color: "rgba(255,255,255,0.7)",
              fontFamily: FONT,
              marginTop: 8,
            }}
          >
            {description}
          </div>
        </div>
      </div>
    </AbsoluteFillCenter>
  )
}

const AbsoluteFillCenter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "0 160px",
    }}
  >
    {children}
  </div>
)
```

**Step 2: Create `video/src/scenes/FeatureShowcase.tsx`**

```tsx
import React from "react"
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion"
import { COLORS, FONT } from "../theme"
import { FeatureCard } from "../components/FeatureCard"

const FEATURES = [
  { icon: "🏢", title: "Units & Residents", description: "Manage apartments and tenants effortlessly" },
  { icon: "💰", title: "Maintenance Payments", description: "Track dues, send invoices via WhatsApp" },
  { icon: "🏛️", title: "Hall Bookings", description: "Community hall scheduling with payments" },
  { icon: "📝", title: "Complaints", description: "Register, track, and resolve issues" },
  { icon: "💬", title: "WhatsApp Bot", description: "Resident self-service in multiple languages" },
  { icon: "📊", title: "Analytics Dashboard", description: "Real-time insights and PDF reports" },
]

const CARD_DURATION = 70 // ~2.3 seconds per card

export const FeatureShowcase: React.FC = () => {
  const frame = useCurrentFrame()

  // Progress dots at bottom
  const currentIndex = Math.min(Math.floor(frame / CARD_DURATION), FEATURES.length - 1)

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.dark} 0%, #064E47 100%)`,
      }}
    >
      {/* Feature title bar */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 24,
          fontWeight: 500,
          color: COLORS.light,
          fontFamily: FONT,
          letterSpacing: 3,
          textTransform: "uppercase",
        }}
      >
        What Manzhil Does
      </div>

      {/* Feature cards as sequences */}
      {FEATURES.map((feature, i) => (
        <Sequence key={i} from={i * CARD_DURATION} durationInFrames={CARD_DURATION} name={feature.title}>
          <FeatureCard
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
            index={i}
          />
        </Sequence>
      ))}

      {/* Progress dots */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 16,
        }}
      >
        {FEATURES.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === currentIndex ? 32 : 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: i === currentIndex ? COLORS.light : "rgba(255,255,255,0.3)",
              transition: "all 0.3s",
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  )
}
```

**Step 3: Add to ManzhilIntro**

Update `video/src/ManzhilIntro.tsx` — add FeatureShowcase import and Sequence:

```tsx
import React from "react"
import { AbsoluteFill, Sequence } from "remotion"
import { COLORS, SCENES } from "./theme"
import { LogoReveal } from "./scenes/LogoReveal"
import { ProblemStatement } from "./scenes/ProblemStatement"
import { FeatureShowcase } from "./scenes/FeatureShowcase"

export const ManzhilIntro: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.dark }}>
      <Sequence from={SCENES.logoReveal.from} durationInFrames={SCENES.logoReveal.duration} name="Logo Reveal">
        <LogoReveal />
      </Sequence>
      <Sequence from={SCENES.problem.from} durationInFrames={SCENES.problem.duration} name="Problem Statement">
        <ProblemStatement />
      </Sequence>
      <Sequence from={SCENES.features.from} durationInFrames={SCENES.features.duration} name="Feature Showcase">
        <FeatureShowcase />
      </Sequence>
    </AbsoluteFill>
  )
}
```

**Step 4: Preview**

Run:
```bash
cd video && npx remotion studio --port 3001
```
Expected: Six features appear one by one with slide-in animations, alternating left/right, with progress dots at bottom. Stop with Ctrl+C.

**Step 5: Commit**

```bash
git add video/src/components/FeatureCard.tsx video/src/scenes/FeatureShowcase.tsx video/src/ManzhilIntro.tsx
git commit -m "feat: add FeatureShowcase scene with 6 animated feature cards"
```

---

### Task 6: Create DashboardMockup Scene (23s–27s)

**Files:**
- Create: `video/src/scenes/DashboardMockup.tsx`

**Step 1: Create `video/src/scenes/DashboardMockup.tsx`**

```tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { COLORS, FONT } from "../theme"

const SIDEBAR_ITEMS = [
  { icon: "📊", label: "Dashboard" },
  { icon: "🏢", label: "Units" },
  { icon: "👥", label: "Residents" },
  { icon: "📅", label: "Bookings" },
  { icon: "📝", label: "Complaints" },
  { icon: "📦", label: "Parcels" },
]

const STAT_CARDS = [
  { label: "Total Units", value: "248", color: COLORS.teal },
  { label: "Active Residents", value: "412", color: COLORS.light },
  { label: "This Month Revenue", value: "PKR 1.2M", color: "#34B27B" },
  { label: "Open Complaints", value: "7", color: "#F59E0B" },
]

export const DashboardMockup: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Whole mockup slides up
  const mockupY = spring({
    frame,
    fps,
    from: 60,
    to: 0,
    durationInFrames: 30,
    config: { damping: 15 },
  })

  const mockupOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  })

  // Fade out
  const fadeOut = interpolate(frame, [100, 120], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.dark,
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      {/* Browser chrome mockup */}
      <div
        style={{
          opacity: mockupOpacity,
          transform: `translateY(${mockupY}px)`,
          width: 1600,
          height: 880,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 40px 80px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Browser bar */}
        <div
          style={{
            height: 40,
            backgroundColor: "#1F2937",
            display: "flex",
            alignItems: "center",
            paddingLeft: 16,
            gap: 8,
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#EF4444" }} />
          <div style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#F59E0B" }} />
          <div style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#22C55E" }} />
          <div
            style={{
              marginLeft: 16,
              backgroundColor: "#374151",
              borderRadius: 6,
              padding: "4px 24px",
              fontSize: 13,
              color: "#9CA3AF",
              fontFamily: FONT,
            }}
          >
            app.manzhil.com/admin/dashboard
          </div>
        </div>

        {/* App body */}
        <div style={{ flex: 1, display: "flex", backgroundColor: COLORS.bgSubtle }}>
          {/* Sidebar */}
          <div
            style={{
              width: 240,
              backgroundColor: "#FFFFFF",
              borderRight: "1px solid #E5E7EB",
              padding: "20px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {/* Brand */}
            <div
              style={{
                padding: "8px 12px",
                marginBottom: 16,
                fontSize: 22,
                fontWeight: 700,
                color: COLORS.dark,
                fontFamily: FONT,
              }}
            >
              Manzhil
            </div>

            {/* Nav items */}
            {SIDEBAR_ITEMS.map((item, i) => {
              const itemOpacity = interpolate(frame, [15 + i * 4, 25 + i * 4], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })
              const isActive = i === 0
              return (
                <div
                  key={i}
                  style={{
                    opacity: itemOpacity,
                    padding: "10px 12px",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    fontSize: 15,
                    fontFamily: FONT,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? COLORS.white : "#6B7280",
                    background: isActive
                      ? `linear-gradient(135deg, ${COLORS.dark}, ${COLORS.teal})`
                      : "transparent",
                  }}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              )
            })}
          </div>

          {/* Main content */}
          <div style={{ flex: 1, padding: 32 }}>
            {/* Header */}
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: COLORS.textPrimary,
                fontFamily: FONT,
                marginBottom: 24,
              }}
            >
              Dashboard
            </div>

            {/* Stat cards */}
            <div style={{ display: "flex", gap: 20 }}>
              {STAT_CARDS.map((card, i) => {
                const cardScale = spring({
                  frame,
                  fps,
                  from: 0.8,
                  to: 1,
                  delay: 20 + i * 6,
                  durationInFrames: 20,
                  config: { damping: 12 },
                })
                const cardOpacity = interpolate(frame, [20 + i * 6, 30 + i * 6], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      opacity: cardOpacity,
                      transform: `scale(${cardScale})`,
                      backgroundColor: "#FFFFFF",
                      borderRadius: 12,
                      padding: "20px 24px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      borderLeft: `4px solid ${card.color}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        color: "#6B7280",
                        fontFamily: FONT,
                        fontWeight: 500,
                      }}
                    >
                      {card.label}
                    </div>
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 700,
                        color: COLORS.textPrimary,
                        fontFamily: FONT,
                        marginTop: 8,
                      }}
                    >
                      {card.value}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Placeholder chart area */}
            <div
              style={{
                marginTop: 24,
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                height: 300,
                padding: 24,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                  fontFamily: FONT,
                  marginBottom: 20,
                }}
              >
                Monthly Revenue
              </div>
              {/* Simple bar chart */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 24,
                  paddingBottom: 8,
                }}
              >
                {[65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88, 92].map((h, i) => {
                  const barHeight = interpolate(frame, [30 + i * 3, 45 + i * 3], [0, h], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })
                  return (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: `${barHeight}%`,
                        borderRadius: 4,
                        background: `linear-gradient(180deg, ${COLORS.light} 0%, ${COLORS.teal} 100%)`,
                      }}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}
```

**Step 2: Add to ManzhilIntro**

Update `video/src/ManzhilIntro.tsx`:

```tsx
import React from "react"
import { AbsoluteFill, Sequence } from "remotion"
import { COLORS, SCENES } from "./theme"
import { LogoReveal } from "./scenes/LogoReveal"
import { ProblemStatement } from "./scenes/ProblemStatement"
import { FeatureShowcase } from "./scenes/FeatureShowcase"
import { DashboardMockup } from "./scenes/DashboardMockup"

export const ManzhilIntro: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.dark }}>
      <Sequence from={SCENES.logoReveal.from} durationInFrames={SCENES.logoReveal.duration} name="Logo Reveal">
        <LogoReveal />
      </Sequence>
      <Sequence from={SCENES.problem.from} durationInFrames={SCENES.problem.duration} name="Problem Statement">
        <ProblemStatement />
      </Sequence>
      <Sequence from={SCENES.features.from} durationInFrames={SCENES.features.duration} name="Feature Showcase">
        <FeatureShowcase />
      </Sequence>
      <Sequence from={SCENES.dashboard.from} durationInFrames={SCENES.dashboard.duration} name="Dashboard Mockup">
        <DashboardMockup />
      </Sequence>
    </AbsoluteFill>
  )
}
```

**Step 3: Preview**

Run:
```bash
cd video && npx remotion studio --port 3001
```
Expected: After features, a browser chrome mockup slides up showing the admin dashboard with animated stat cards and bar chart. Stop with Ctrl+C.

**Step 4: Commit**

```bash
git add video/src/scenes/DashboardMockup.tsx video/src/ManzhilIntro.tsx
git commit -m "feat: add DashboardMockup scene with animated stats and chart"
```

---

### Task 7: Create CallToAction Scene (27s–30s) and Finalize

**Files:**
- Create: `video/src/scenes/CallToAction.tsx`
- Modify: `video/src/ManzhilIntro.tsx`

**Step 1: Create `video/src/scenes/CallToAction.tsx`**

```tsx
import React from "react"
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion"
import { COLORS, FONT } from "../theme"

export const CallToAction: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Logo scale in
  const logoScale = spring({
    frame,
    fps,
    from: 0.5,
    to: 1,
    durationInFrames: 30,
    config: { damping: 12, stiffness: 80 },
  })

  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  })

  // Glow pulse
  const glowOpacity = interpolate(frame, [30, 50, 70, 90], [0.3, 0.6, 0.3, 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.dark,
        justifyContent: "center",
        alignItems: "center",
        opacity,
      }}
    >
      {/* Glow behind logo */}
      <div
        style={{
          position: "absolute",
          width: 300,
          height: 300,
          borderRadius: 150,
          background: `radial-gradient(circle, ${COLORS.light}40 0%, transparent 70%)`,
          opacity: glowOpacity,
        }}
      />

      {/* Logo */}
      <div style={{ transform: `scale(${logoScale})` }}>
        <Img
          src={staticFile("manzhil_logo.png")}
          style={{ width: 140, height: 140 }}
        />
      </div>

      {/* Brand name */}
      <div
        style={{
          marginTop: 24,
          display: "flex",
          alignItems: "baseline",
          gap: 10,
        }}
      >
        <span
          style={{
            fontSize: 60,
            fontWeight: 700,
            color: COLORS.white,
            fontFamily: FONT,
          }}
        >
          Manzhil
        </span>
        <span
          style={{
            fontSize: 24,
            fontWeight: 400,
            color: COLORS.light,
            fontFamily: FONT,
          }}
        >
          by Scrift
        </span>
      </div>

      {/* Bottom line */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          fontSize: 20,
          fontWeight: 400,
          color: "rgba(255,255,255,0.5)",
          fontFamily: FONT,
          letterSpacing: 2,
        }}
      >
        www.scrift.com
      </div>
    </AbsoluteFill>
  )
}
```

**Step 2: Final ManzhilIntro with all 5 scenes**

Update `video/src/ManzhilIntro.tsx`:

```tsx
import React from "react"
import { AbsoluteFill, Sequence } from "remotion"
import { COLORS, SCENES } from "./theme"
import { LogoReveal } from "./scenes/LogoReveal"
import { ProblemStatement } from "./scenes/ProblemStatement"
import { FeatureShowcase } from "./scenes/FeatureShowcase"
import { DashboardMockup } from "./scenes/DashboardMockup"
import { CallToAction } from "./scenes/CallToAction"

export const ManzhilIntro: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.dark }}>
      <Sequence from={SCENES.logoReveal.from} durationInFrames={SCENES.logoReveal.duration} name="Logo Reveal">
        <LogoReveal />
      </Sequence>
      <Sequence from={SCENES.problem.from} durationInFrames={SCENES.problem.duration} name="Problem Statement">
        <ProblemStatement />
      </Sequence>
      <Sequence from={SCENES.features.from} durationInFrames={SCENES.features.duration} name="Feature Showcase">
        <FeatureShowcase />
      </Sequence>
      <Sequence from={SCENES.dashboard.from} durationInFrames={SCENES.dashboard.duration} name="Dashboard Mockup">
        <DashboardMockup />
      </Sequence>
      <Sequence from={SCENES.cta.from} durationInFrames={SCENES.cta.duration} name="Call to Action">
        <CallToAction />
      </Sequence>
    </AbsoluteFill>
  )
}
```

**Step 3: Preview full video**

Run:
```bash
cd video && npx remotion studio --port 3001
```
Expected: Full 30-second video plays through all 5 scenes smoothly. Stop with Ctrl+C.

**Step 4: Render to MP4**

Run:
```bash
cd video && npm run render
```
Expected: Renders `video/out/ManzhilIntro.mp4` — 30 seconds, 1920x1080, H.264.

**Step 5: Commit**

```bash
git add video/src/scenes/CallToAction.tsx video/src/ManzhilIntro.tsx
git commit -m "feat: add CallToAction scene and finalize 30-second intro video"
```

---

## Summary

| Task | Files | What |
|------|-------|------|
| 1 | 7 | Scaffold Remotion project, config, placeholder |
| 2 | 2 | Theme constants + AnimatedText component |
| 3 | 2 | LogoReveal scene (logo spring + text animations) |
| 4 | 2 | ProblemStatement scene (floating icons + kinetic text) |
| 5 | 3 | FeatureCard component + FeatureShowcase scene (6 features) |
| 6 | 2 | DashboardMockup scene (browser chrome + stats + chart) |
| 7 | 2 | CallToAction scene + final wiring + render |
| **Total** | **~20 files** | **7 tasks, 7 commits** |
