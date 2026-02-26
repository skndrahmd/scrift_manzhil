import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { COLORS, FONT } from "../theme"
import { useIsMobile } from "../hooks"

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
  const mobile = useIsMobile()

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

  const fadeOut = interpolate(frame, [100, 120], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  if (mobile) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: COLORS.dark,
          justifyContent: "center",
          alignItems: "center",
          opacity: fadeOut,
        }}
      >
        {/* Phone mockup frame */}
        <div
          style={{
            opacity: mockupOpacity,
            transform: `translateY(${mockupY}px)`,
            width: 520,
            height: 1050,
            borderRadius: 40,
            overflow: "hidden",
            boxShadow: "0 40px 80px rgba(0,0,0,0.5)",
            border: "4px solid #374151",
            display: "flex",
            flexDirection: "column",
            backgroundColor: COLORS.bgSubtle,
          }}
        >
          {/* Phone status bar */}
          <div
            style={{
              height: 44,
              backgroundColor: COLORS.dark,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              color: COLORS.white,
              fontFamily: FONT,
              fontWeight: 600,
            }}
          >
            Manzhil
          </div>

          {/* Stat cards - 2x2 grid */}
          <div style={{ padding: 16, display: "flex", flexWrap: "wrap", gap: 12 }}>
            {STAT_CARDS.map((card, i) => {
              const cardScale = spring({
                frame,
                fps,
                from: 0.8,
                to: 1,
                delay: 15 + i * 5,
                durationInFrames: 20,
                config: { damping: 12 },
              })
              const cardOpacity = interpolate(frame, [15 + i * 5, 25 + i * 5], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })
              return (
                <div
                  key={i}
                  style={{
                    width: "calc(50% - 6px)",
                    opacity: cardOpacity,
                    transform: `scale(${cardScale})`,
                    backgroundColor: "#FFFFFF",
                    borderRadius: 12,
                    padding: "14px 16px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    borderLeft: `3px solid ${card.color}`,
                  }}
                >
                  <div style={{ fontSize: 14, color: "#6B7280", fontFamily: FONT, fontWeight: 500 }}>
                    {card.label}
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: COLORS.textPrimary, fontFamily: FONT, marginTop: 4 }}>
                    {card.value}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Chart area */}
          <div
            style={{
              margin: "0 16px",
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: 16,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              flex: 1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.textPrimary, fontFamily: FONT, marginBottom: 12 }}>
              Monthly Revenue
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 8, paddingBottom: 4 }}>
              {[65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88, 92].map((h, i) => {
                const barHeight = interpolate(frame, [25 + i * 3, 40 + i * 3], [0, h], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${barHeight}%`,
                      borderRadius: 3,
                      background: `linear-gradient(180deg, ${COLORS.light} 0%, ${COLORS.teal} 100%)`,
                    }}
                  />
                )
              })}
            </div>
          </div>

          {/* Bottom nav bar */}
          <div
            style={{
              height: 60,
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #E5E7EB",
              display: "flex",
              justifyContent: "space-around",
              alignItems: "center",
              padding: "0 8px",
            }}
          >
            {SIDEBAR_ITEMS.slice(0, 5).map((item, i) => {
              const itemOpacity = interpolate(frame, [20 + i * 3, 30 + i * 3], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })
              const isActive = i === 0
              return (
                <div
                  key={i}
                  style={{
                    opacity: itemOpacity,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                    fontSize: 9,
                    fontFamily: FONT,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? COLORS.dark : "#9CA3AF",
                  }}
                >
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </AbsoluteFill>
    )
  }

  // Desktop layout (unchanged)
  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.dark,
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
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

        <div style={{ flex: 1, display: "flex", backgroundColor: COLORS.bgSubtle }}>
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

          <div style={{ flex: 1, padding: 32 }}>
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
                    <div style={{ fontSize: 13, color: "#6B7280", fontFamily: FONT, fontWeight: 500 }}>
                      {card.label}
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.textPrimary, fontFamily: FONT, marginTop: 8 }}>
                      {card.value}
                    </div>
                  </div>
                )
              })}
            </div>
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
              <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.textPrimary, fontFamily: FONT, marginBottom: 20 }}>
                Monthly Revenue
              </div>
              <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 24, paddingBottom: 8 }}>
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
