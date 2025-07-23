"use client"

import { useEffect, useRef, useState } from "react"

interface TypographyAnimationProps {
  className?: string
}

export function TypographyAnimation({ className = "" }: TypographyAnimationProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (video) {
      const playVideo = async () => {
        try {
          await video.play()
          console.log("✅ Video started playing successfully")
        } catch (error) {
          console.error("❌ Failed to play video:", error)
          setVideoError("비디오 재생에 실패했습니다")
        }
      }

      if (video.readyState >= 2) {
        playVideo()
      } else {
        video.addEventListener('loadeddata', playVideo)
        return () => video.removeEventListener('loadeddata', playVideo)
      }
    }
  }, [])

  const handleVideoLoad = () => {
    setIsVideoLoaded(true)
    console.log("✅ Video loaded successfully")
  }

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error("❌ Video error:", e)
    setVideoError("비디오를 로드할 수 없습니다")
  }

  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
      {videoError ? (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center text-gray-600">
            <div className="text-4xl mb-2">🎬</div>
            <p className="text-sm">{videoError}</p>
            <p className="text-xs text-gray-500 mt-2">typography.webm 파일을 확인해주세요</p>
          </div>
        </div>
      ) : (
        <video
          ref={videoRef}
          muted
          playsInline
          loop
          autoPlay
          className="w-full h-full object-cover"
          onLoadStart={() => console.log("🔄 Video loading started")}
          onLoadedData={handleVideoLoad}
          onError={handleVideoError}
          onPlay={() => console.log("▶️ Video playing")}
          onPause={() => console.log("⏸️ Video paused")}
        >
          <source src="/typography.webm" type="video/webm" />
          <source src="/typography.mp4" type="video/mp4" />
          <source src="/typography.mov" type="video/quicktime" />
          Your browser does not support the video tag.
        </video>
      )}
      
      {!isVideoLoaded && !videoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center text-gray-600">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm">비디오 로딩 중...</p>
          </div>
        </div>
      )}
    </div>
  )
} 