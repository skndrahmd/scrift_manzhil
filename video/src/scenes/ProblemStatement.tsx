import React from "react"
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion"
import { COLORS, FONT } from "../theme"
import { useIsMobile } from "../hooks"

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
  const mobile = useIsMobile()

  const textOpacity = interpolate(frame, [0, 25], [0, 1], {
    extrapolateRight: "clamp",
  })
  const textScale = interpolate(frame, [0, 25], [0.9, 1], {
    extrapolateRight: "clamp",
  })

  const fadeOut = interpolate(frame, [100, 120], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <AbsoluteFill
        style={{
          background: `linear-gradient(135deg, ${COLORS.dark} 0%, ${COLORS.teal} 100%)`,
        }}
      />

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
              fontSize: mobile ? 48 : 64,
              opacity: iconOpacity,
              transform: `translateY(${floatY}px)`,
            }}
          >
            {icon.emoji}
          </div>
        )
      })}

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            opacity: textOpacity,
            transform: `scale(${textScale})`,
            textAlign: "center",
            padding: mobile ? "0 60px" : "0 120px",
          }}
        >
          <div
            style={{
              fontSize: mobile ? 64 : 56,
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
              fontSize: mobile ? 36 : 32,
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
