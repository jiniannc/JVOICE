"use client"

import { useEffect, useRef } from "react"

interface LottieLogoProps {
  className?: string
}

export function LottieLogo({ className = "" }: LottieLogoProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let animationInstance: any = null

    const loadLottie = async () => {
      try {
        // Dynamic import of lottie-web
        const lottie = (await import("lottie-web")).default

        if (containerRef.current) {
          animationInstance = lottie.loadAnimation({
            container: containerRef.current,
            renderer: "svg",
            loop: true,
            autoplay: true,
            path: "/animations/logo-animation.json",
          })
        }
      } catch (error) {
        console.error("Failed to load Lottie animation:", error)
      }
    }

    loadLottie()

    return () => {
      if (animationInstance) {
        animationInstance.destroy()
      }
    }
  }, [])

  return (
    <div ref={containerRef} className={`w-full h-full ${className}`} style={{ maxWidth: "200px", maxHeight: "80px" }} />
  )
}
