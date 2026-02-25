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
