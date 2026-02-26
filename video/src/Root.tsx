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
      <Composition
        id="ManzhilIntroMobile"
        component={ManzhilIntro}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  )
}
