"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ProductTourProps {
  userId: string | null
  isLoggedIn: boolean
  onComplete: () => void
}

type TourStep = {
  id: number
  targetSelector: string
  title: string
  description: string
  position: "right" | "left" | "top" | "bottom"
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 1,
    targetSelector: '[data-tour="login"]',
    title: "1단계",
    description: "이 버튼을 눌러 진에어 계정으로 로그인해주세요.",
    position: "right",
  },
  {
    id: 2,
    targetSelector: '[data-tour="record"]',
    title: "2단계",
    description: "이 버튼을 눌러 녹음을 진행해주세요.",
    position: "right",
  },
]

export default function ProductTour({ userId, isLoggedIn, onComplete }: ProductTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    // 로그인된 상태라면 투어를 표시하지 않음
    if (isLoggedIn) {
      return
    }

    // 유저별로 투어 완료 여부 확인 (로그아웃 상태에서만)
    const tourKey = userId ? `product-tour-completed-${userId}` : 'product-tour-completed-anonymous'
    const tourCompleted = localStorage.getItem(tourKey)
    
    if (!tourCompleted) {
      // 약간의 딜레이를 주고 투어 시작
      setTimeout(() => {
        setIsVisible(true)
      }, 500)
    }
  }, [userId, isLoggedIn])

  useEffect(() => {
    if (!isVisible) return

    const updatePosition = () => {
      const step = TOUR_STEPS[currentStep]
      const element = document.querySelector(step.targetSelector) as HTMLElement

      if (element) {
        const rect = element.getBoundingClientRect()
        setHighlightRect(rect)

        // 툴팁 위치 계산
        let top = 0
        let left = 0

        switch (step.position) {
          case "right":
            // LOGIN 버튼(1단계)일 때는 밑단을 맞추고, Record(2단계)는 중앙 정렬
            if (currentStep === 0) {
              top = rect.bottom  // 버튼의 밑단에 위치
              left = rect.right + 20
            } else {
              top = rect.top + rect.height / 2
              left = rect.right + 20
            }
            break
          case "left":
            top = rect.top + rect.height / 2
            left = rect.left - 20
            break
          case "top":
            top = rect.top - 20
            left = rect.left + rect.width / 2
            break
          case "bottom":
            top = rect.bottom + 20
            left = rect.left + rect.width / 2
            break
        }

        setTooltipPosition({ top, left })
      }
    }

    updatePosition()
    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition)

    return () => {
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition)
    }
  }, [isVisible, currentStep])

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleSkip = () => {
    handleComplete()
  }

  const handleComplete = () => {
    setIsVisible(false)
    // 유저별로 투어 완료 상태 저장
    const tourKey = userId ? `product-tour-completed-${userId}` : 'product-tour-completed-anonymous'
    localStorage.setItem(tourKey, "true")
    onComplete()
  }

  if (!isVisible || isLoggedIn) {
    return null
  }

  const step = TOUR_STEPS[currentStep]

  return (
    <>
      {/* 하이라이트된 요소를 위한 투명 구멍 */}
      {highlightRect && (
        <>
          {/* 하이라이트 박스 - 완전히 밝게 */}
          <div
            className="fixed z-[9999] pointer-events-none"
            style={{
              top: highlightRect.top - 8,
              left: highlightRect.left - 8,
              width: highlightRect.width + 16,
              height: highlightRect.height + 16,
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
              borderRadius: "12px",
              transition: "all 0.3s ease-in-out",
            }}
          />
          
          {/* 하이라이트 부분을 밝게 하는 흰색 레이어 */}
          <div
            className="fixed z-[9999] pointer-events-none bg-white"
            style={{
              top: highlightRect.top - 8,
              left: highlightRect.left - 8,
              width: highlightRect.width + 16,
              height: highlightRect.height + 16,
              borderRadius: "12px",
              transition: "all 0.3s ease-in-out",
              opacity: 0.3,
            }}
          />

          {/* 하이라이트 테두리 - 펄스 애니메이션 */}
          <div
            className="fixed z-[10000] pointer-events-none border-4 border-blue-400"
            style={{
              top: highlightRect.top - 8,
              left: highlightRect.left - 8,
              width: highlightRect.width + 16,
              height: highlightRect.height + 16,
              borderRadius: "12px",
              transition: "all 0.3s ease-in-out",
              animation: "strongPulse 1.5s ease-in-out infinite",
              boxShadow: "0 0 20px rgba(59, 130, 246, 0.6), 0 0 40px rgba(59, 130, 246, 0.4)",
            }}
          />
        </>
      )}

      {/* 설명 박스 */}
      <div
        className="fixed z-[10001] bg-white rounded-lg shadow-2xl p-6 max-w-sm transition-all duration-300"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          transform:
            step.position === "right"
              ? currentStep === 0 ? "translateY(-100%)" : "translateY(-50%)"
              : step.position === "left"
              ? "translate(-100%, -50%)"
              : step.position === "top"
              ? "translate(-50%, -100%)"
              : "translate(-50%, 0)",
        }}
      >
        {/* 닫기 버튼 */}
        <button
          onClick={handleSkip}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 제목 */}
        <div className="mb-3">
          <h3 className="text-lg font-bold text-gray-900">{step.title}</h3>
        </div>

        {/* 설명 */}
        <p className="text-sm text-gray-600 mb-4">{step.description}</p>

        {/* 진행 상황 표시 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1">
            {TOUR_STEPS.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? "w-6 bg-blue-600"
                    : index < currentStep
                    ? "w-1.5 bg-blue-400"
                    : "w-1.5 bg-gray-300"
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500">
            {currentStep + 1} / {TOUR_STEPS.length}
          </span>
        </div>

        {/* 버튼 */}
        <div className="flex gap-2">
          <Button
            onClick={handleSkip}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            건너뛰기
          </Button>
          <Button onClick={handleNext} size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700">
            {currentStep < TOUR_STEPS.length - 1 ? "다음" : "완료"}
          </Button>
        </div>
      </div>

      {/* 강렬한 펄스 애니메이션을 위한 스타일 */}
      <style jsx>{`
        @keyframes strongPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.6), 0 0 40px rgba(59, 130, 246, 0.4);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.02);
            box-shadow: 0 0 30px rgba(59, 130, 246, 0.8), 0 0 60px rgba(59, 130, 246, 0.6);
          }
        }
      `}</style>
    </>
  )
}

