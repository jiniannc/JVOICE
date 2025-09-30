"use client"

import React, { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  className?: string
  height?: string
}

export function BottomSheet({ 
  isOpen, 
  onClose, 
  children, 
  title, 
  className,
  height = "80vh"
}: BottomSheetProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  // 모달 열림/닫힘 애니메이션 처리
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // 핸들 영역에서만 작동하는 터치 이벤트 핸들러
  const handleHandleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation() // 이벤트 버블링 방지
    setIsDragging(true)
    setStartY(e.touches[0].clientY)
    setCurrentY(0)
  }

  const handleHandleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    e.stopPropagation() // 이벤트 버블링 방지
    
    const deltaY = e.touches[0].clientY - startY
    if (deltaY > 0) {
      setCurrentY(deltaY)
    }
  }

  const handleHandleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging) return
    e.stopPropagation() // 이벤트 버블링 방지
    
    setIsDragging(false)
    
    if (currentY > 100) {
      onClose()
    }
    
    setCurrentY(0)
  }

  // 백그라운드 클릭 시 모달 닫기
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isVisible) return null

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] transition-opacity duration-300 ease-out"
      style={{ 
        touchAction: 'none',
        opacity: isOpen ? 1 : 0
      }}
      onClick={handleBackgroundClick}
    >
      <div 
        ref={sheetRef}
        className={cn(
          "fixed bottom-0 left-0 right-0 w-full bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden",
          "transition-all duration-300 ease-out",
          className
        )}
        style={{
          height,
          transform: `translateY(${isDragging ? currentY : (isOpen ? '0%' : '100%')}px)`,
          touchAction: 'auto', // 컨텐츠 영역은 자유롭게 스크롤 가능
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 드래그 핸들 - 터치 이벤트는 이 영역에서만 작동 */}
        <div 
          className="flex justify-center py-3 bg-gray-50/80 rounded-t-3xl cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'pan-y' }}
          onTouchStart={handleHandleTouchStart}
          onTouchMove={handleHandleTouchMove}
          onTouchEnd={handleHandleTouchEnd}
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
        </div>

        {/* 제목 (선택사항) */}
        {title && (
          <div className="px-6 py-4 border-b border-gray-100 bg-white">
            <h2 className="text-xl font-bold text-gray-800 text-center">{title}</h2>
          </div>
        )}

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}

