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
