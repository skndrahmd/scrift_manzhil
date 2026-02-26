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
