import React from "react"
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion"
import { COLORS, FONT } from "../theme"
import { useIsMobile } from "../hooks"

export const CallToAction: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const mobile = useIsMobile()

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
      <div
        style={{
          position: "absolute",
          width: mobile ? 320 : 300,
          height: mobile ? 320 : 300,
          borderRadius: mobile ? 160 : 150,
          background: `radial-gradient(circle, ${COLORS.light}40 0%, transparent 70%)`,
          opacity: glowOpacity,
        }}
      />

      <div style={{ transform: `scale(${logoScale})` }}>
        <Img
          src={staticFile("manzhil_logo_white.png")}
          style={{ width: mobile ? 160 : 140, height: mobile ? 160 : 140 }}
        />
      </div>

      <div
        style={{
          marginTop: 24,
          display: "flex",
          flexDirection: mobile ? "column" : "row",
          alignItems: mobile ? "center" : "baseline",
          gap: mobile ? 4 : 10,
        }}
      >
        <span
          style={{
            fontSize: mobile ? 68 : 60,
            fontWeight: 700,
            color: COLORS.white,
            fontFamily: FONT,
          }}
        >
          Manzhil
        </span>
        <span
          style={{
            fontSize: mobile ? 28 : 24,
            fontWeight: 400,
            color: COLORS.light,
            fontFamily: FONT,
          }}
        >
          by Scrift
        </span>
      </div>

      {/* CTA */}
      <div
        style={{
          marginTop: mobile ? 32 : 28,
          fontSize: mobile ? 30 : 26,
          fontWeight: 600,
          color: COLORS.light,
          fontFamily: FONT,
          letterSpacing: 1,
        }}
      >
        Book a free demo now!
      </div>

      <div
        style={{
          position: "absolute",
          bottom: mobile ? 120 : 80,
          fontSize: mobile ? 24 : 20,
          fontWeight: 400,
          color: "rgba(255,255,255,0.5)",
          fontFamily: FONT,
          letterSpacing: 2,
        }}
      >
        www.manzhil.com
      </div>
    </AbsoluteFill>
  )
}
