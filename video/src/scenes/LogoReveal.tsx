import React from "react"
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion"
import { COLORS, FONT } from "../theme"
import { useIsMobile } from "../hooks"

export const LogoReveal: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const mobile = useIsMobile()

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

  const titleOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const titleY = interpolate(frame, [30, 50], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const subtitleOpacity = interpolate(frame, [50, 65], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const taglineOpacity = interpolate(frame, [75, 95], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const taglineY = interpolate(frame, [75, 95], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

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
      <div style={{ opacity: logoOpacity, transform: `scale(${logoScale})` }}>
        <Img
          src={staticFile("manzhil_logo_white.png")}
          style={{ width: mobile ? 200 : 180, height: mobile ? 200 : 180 }}
        />
      </div>

      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          marginTop: 24,
          display: "flex",
          flexDirection: mobile ? "column" : "row",
          alignItems: mobile ? "center" : "baseline",
          gap: mobile ? 4 : 12,
        }}
      >
        <span
          style={{
            fontSize: mobile ? 80 : 72,
            fontWeight: 700,
            color: COLORS.white,
            fontFamily: FONT,
          }}
        >
          Manzhil
        </span>
        <span
          style={{
            fontSize: mobile ? 32 : 28,
            fontWeight: 400,
            color: COLORS.light,
            fontFamily: FONT,
            opacity: subtitleOpacity,
          }}
        >
          by Scrift
        </span>
      </div>

      <div
        style={{
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
          marginTop: 16,
          fontSize: mobile ? 36 : 32,
          fontWeight: 400,
          color: "rgba(255,255,255,0.8)",
          fontFamily: FONT,
          letterSpacing: 1,
          textAlign: "center",
          padding: mobile ? "0 40px" : 0,
        }}
      >
        Building Management, Simplified.
      </div>
    </AbsoluteFill>
  )
}
