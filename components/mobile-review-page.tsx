"use client"

import React from "react"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import MyRecordingsTable from "@/components/my-recordings-table"

interface UserInfo {
  name: string
  employeeId: string
  language: string
  category: string
  email?: string
  broadcastCode?: string
  teamNumber?: string
  role?: string
  broadcastGrade?: string
  isInstructor?: boolean
  isAdmin?: boolean
  roles?: string[]
}

interface MobileReviewPageProps {
  userInfo: UserInfo
  onBack: () => void
}

export function MobileReviewPage({ userInfo, onBack }: MobileReviewPageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b px-4 py-3 flex items-center gap-3">
        <Button
          onClick={onBack}
          variant="ghost"
          size="sm"
          className="p-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">내 응시 내역</h1>
      </div>

      {/* 컨텐츠 */}
      <div className="p-4">
        <MyRecordingsTable 
          employeeId={userInfo.employeeId || userInfo.broadcastCode || ""} 
          hideHeader={true}
        />
      </div>
    </div>
  )
}
