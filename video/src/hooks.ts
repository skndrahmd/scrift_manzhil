import { useVideoConfig } from "remotion"

export const useIsMobile = () => {
  const { width, height } = useVideoConfig()
  return height > width
}
