import React from "react"
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { COLORS, FONT } from "../theme"
import { useIsMobile } from "../hooks"

type Props = {
  icon: React.ReactNode
  title: string
  description: string
  index: number
}

export const FeatureCard: React.FC<Props> = ({ icon, title, description, index }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const mobile = useIsMobile()

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

  const iconScale = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    delay: 8,
    durationInFrames: 20,
    config: { damping: 8, stiffness: 120 },
  })

  const isLeft = index % 2 === 0

  if (mobile) {
    // Stacked vertical layout for mobile
    const slideY = spring({
      frame,
      fps,
      from: 60,
      to: 0,
      durationInFrames: 25,
      config: { damping: 15, stiffness: 80 },
    })

    return (
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
          padding: "0 60px",
        }}
      >
        <div
          style={{
            opacity,
            transform: `translateY(${slideY}px)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: "rgba(255,255,255,0.1)",
              border: `3px solid ${COLORS.light}`,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: 64,
              transform: `scale(${iconScale})`,
            }}
          >
            {icon}
          </div>
          <div>
            <div
              style={{
                fontSize: 48,
                fontWeight: 700,
                color: COLORS.white,
                fontFamily: FONT,
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 30,
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
      </div>
    )
  }

  // Desktop horizontal layout
  return (
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
    </div>
  )
}
