"use client"

import React from "react"
import { Loader2, RefreshCw, Sparkles } from "lucide-react"

interface FullscreenLoadingOverlayProps {
  isVisible: boolean
  message?: string
  subMessage?: string
  showSync?: boolean
}

export function FullscreenLoadingOverlay({ 
  isVisible, 
  message = "시스템을 준비 중입니다...", 
  subMessage,
  showSync = false
}: FullscreenLoadingOverlayProps) {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-100 via-sky-200 to-purple-200/80 backdrop-blur-sm z-[9999] flex items-center justify-center">
      <div className="bg-white/90 rounded-3xl shadow-2xl p-10 max-w-md w-full mx-4 border-2 border-blue-200 flex flex-col items-center">
        <div className="relative mb-6">
          <div className="w-28 h-28 flex items-center justify-center mx-auto relative">
            {/* 외부 원 */}
            <div className="absolute inset-0 border-8 border-blue-200 rounded-full"></div>
            {/* 회전하는 원 */}
            <div className="absolute inset-0 border-8 border-transparent border-t-blue-600 rounded-full animate-spin" style={{ animationDuration: '1.2s' }}></div>
            {/* 중앙 아이콘 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-12 h-12 text-blue-500 animate-pulse" />
            </div>
          </div>
        </div>
        <h2 className="text-2xl font-extrabold text-blue-700 mb-2 tracking-tight drop-shadow">JVOICE 시스템 로딩 중</h2>
        <p className="text-base text-gray-700 mb-2 font-medium animate-pulse">{message}</p>
        {subMessage && <p className="text-xs text-gray-500 mb-4">{subMessage}</p>}
        {showSync && (
          <div className="flex flex-col items-center gap-1 mt-2 animate-fade-in">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mb-1" />
            <span className="text-xs text-blue-700 font-semibold">최신 문안 동기화 중...</span>
          </div>
        )}
        <div className="mt-6 text-xs text-gray-400">© Jin Air Crew Voice System</div>
      </div>
    </div>
  )
}
