"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BottomSheet } from "@/components/ui/bottom-sheet"
import { CustomDialog } from "@/components/ui/custom-dialog"
import { useCustomDialog } from "@/hooks/use-custom-dialog"
import { 
  Calendar,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mic
} from "lucide-react"
import { employeeDB } from "@/lib/employee-database"

interface AuthenticatedUser {
  email: string
  name: string
  picture: string
  role: string
  broadcastCode: string
  teamNumber: string
  broadcastGrade: string
  isInstructor?: boolean
  isAdmin?: boolean
  employee?: {
    name: string
    employeeId: string
    department: string
  }
}

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
  department?: string
  position?: string
}

interface MobileRecordingCalendarProps {
  isOpen: boolean
  onClose: () => void
  authenticatedUser: AuthenticatedUser
  userInfo: UserInfo
}

export function MobileRecordingCalendar({ isOpen, onClose, authenticatedUser, userInfo }: MobileRecordingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedDaySchedules, setSelectedDaySchedules] = useState<any[]>([])
  const [showLanguageSelection, setShowLanguageSelection] = useState(false)
  const [selectedRecordingSlot, setSelectedRecordingSlot] = useState<{date: string, slot: number} | null>(null)
  const [availabilityCache, setAvailabilityCache] = useState<Map<string, any>>(new Map())
  const [userLanguageRestrictions, setUserLanguageRestrictions] = useState<Record<string, boolean>>({})
  const [myRequests, setMyRequests] = useState<any[]>([])

  const recordingDialogHook = useCustomDialog()
  const { isOpen: recordingDialogOpen, config: recordingDialogConfig, close: recordingDialogClose, showAlert } = recordingDialogHook

  // 모바일 최적화된 간결한 녹음 안내사항 생성 함수
  const getRecordingGuidance = (): string => {
    return `⏰ 신청 취소
• 녹음일 기준 2일 전 14:00까지 가능

📍 녹음 당일
• ID 카드 지참하여 10분 전 Show Up
• JRF: 비행 준하는 용모 복장

📧 미참석 시 연락처: 객실기내방송(selufst_annc@jinair.com)`
  }

  // 드래그 관련 상태는 BottomSheet 컴포넌트에서 처리

  // 터치 이벤트는 BottomSheet 컴포넌트에서 처리

  // 스케줄 로드 - 단독 페이지와 동일한 로직
  const loadSchedules = async () => {
    setLoading(true)
    try {
      const month = currentDate.getMonth() + 1
      const year = currentDate.getFullYear()
      const monthStr = `${year}-${month.toString().padStart(2, '0')}`
      
      console.log('📅 [Mobile Recording Calendar] 스케줄 로드:', monthStr)
      
      const response = await fetch(`/api/schedules?month=${monthStr}`)
      if (response.ok) {
        const scheduleData = await response.json()
        console.log('📊 [Mobile Recording Calendar] API 응답:', scheduleData)
        
        const scheduleSlots: any[] = []
        
        if (scheduleData.data && Array.isArray(scheduleData.data.days)) {
          scheduleData.data.days.forEach((day: any) => {
            const date = day.date
            
            if (day.recording) {
              if (typeof day.recording === 'object' && day.recording.slots) {
                console.log('✅ [Mobile Recording Calendar] 녹음 데이터 추가:', date, 'slots:', day.recording.slots)
                scheduleSlots.push({
                  id: `${date}`,
                  date: date,
                  recording: day.recording,
                  classroomInfo: day.classroomInfo,
                  resultAnnouncement: day.resultAnnouncement
                })
              } else {
                console.log('❌ [Mobile Recording Calendar] 예상하지 못한 녹음 데이터 형태:', typeof day.recording, day.recording)
              }
            }
          })
        } else {
          console.log('❌ [Mobile Recording Calendar] scheduleData.data.days가 배열이 아님:', scheduleData.data)
        }
        
        console.log('📅 [Mobile Recording Calendar] 최종 스케줄:', scheduleSlots)
        setSchedules(scheduleSlots)
      } else {
        console.warn('스케줄 로드 실패:', response.status)
        setSchedules([])
      }
    } catch (error) {
      console.error('스케줄 로드 오류:', error)
      setSchedules([])
    } finally {
      setLoading(false)
    }
  }

  // 내 신청 내역 로드 - 데스크톱과 동일한 로직
  const loadMyRequests = async () => {
    if (!authenticatedUser) return
    
    try {
      const employeeId = userInfo.employeeId || 
                         authenticatedUser.email?.split('@')[0] || 
                         authenticatedUser.email?.split('@')[0] || 
                         'TEMP001'
      console.log('🔍 [Mobile Recording Calendar] 신청 내역 조회 - employeeId:', employeeId)
      
      // Database API 우선 시도 (GET 방식)
      const res = await fetch(`/api/requests/database?employeeId=${employeeId}`)
      const data = await res.json()
      console.log('📄 [Mobile Recording Calendar] 신청 내역 응답:', data)
      
      if (data.success && data.items) {
        const recordingItems = data.items.filter((item: any) => item.type === 'recording')
        setMyRequests(recordingItems)
        console.log('✅ [Mobile Recording Calendar] 신청 내역 로드 완료:', recordingItems.length, '개')
      } else {
        console.log('⚠️ [Mobile Recording Calendar] Database API 실패, Dropbox 시도')
        // Dropbox 폴백
        const dropboxRes = await fetch(`/api/requests/dropbox?employeeId=${employeeId}`)
        const dropboxData = await dropboxRes.json()
        
        if (dropboxData.success && dropboxData.items) {
          const recordingItems = dropboxData.items.filter((item: any) => item.type === 'recording')
          setMyRequests(recordingItems)
          console.log('✅ [Mobile Recording Calendar] Dropbox 신청 내역 로드 완료:', recordingItems.length, '개')
        }
      }
    } catch (error) {
      console.error('❌ [Mobile Recording Calendar] 신청 내역 로드 오류:', error)
    }
  }

  useEffect(() => {
    if (isOpen && authenticatedUser?.email) {
      console.log('🔄 [Mobile Recording Calendar] 모달 열림, 스케줄 로드 시작')
      loadSchedules()
    }
  }, [isOpen, currentDate, authenticatedUser?.email])

  // userInfo가 로드되면 신청 내역 로드
  useEffect(() => {
    if (isOpen && authenticatedUser && userInfo.employeeId) {
      loadMyRequests()
    }
  }, [isOpen, authenticatedUser, userInfo.employeeId])


  // 녹음 슬롯 가용성 확인 - recording-availability API 응답 우선 활용
  const isRecordingSlotAvailable = (date: string, slot: number, language: string) => {
    // 신청 기한 체크 - 기한이 지나면 무조건 비활성화
    const scheduleDate = new Date(date)
    const twoDaysBefore = new Date(scheduleDate)
    twoDaysBefore.setDate(twoDaysBefore.getDate() - 2)
    twoDaysBefore.setHours(14, 0, 0, 0)
    const now = new Date()
    
    if (now > twoDaysBefore) {
      console.log('❌ [Mobile Recording] 신청 기한 경과로 비활성화:', { date, slot, language })
      return false
    }
    
    // recording-availability API 응답을 우선적으로 활용 (전체 신청 현황 기반)
    const availabilityData = availabilityCache.get(date)
    if (availabilityData?.recordingSlotAvailability) {
      const slotInfo = availabilityData.recordingSlotAvailability.find((s: any) => s.slot === slot)
      
      if (slotInfo) {
        console.log('🔍 [Mobile Recording] recording-availability API 기반 가용성:', { date, slot, available: slotInfo.available, currentCount: slotInfo.currentCount, maxCount: slotInfo.maxCount })
        
        // 사용자가 이미 해당 날짜에 녹음 신청했는지 확인
        if (availabilityData.recordingHasExistingApplication) {
          console.log('❌ [Mobile Recording] 사용자가 이미 해당 날짜에 녹음 신청함')
          return false
        }
        
        return slotInfo.available
      }
    }
    
    // recording-availability API 응답이 없으면 기존 로직 사용 (fallback)
    if (!myRequests || myRequests.length === 0) {
      console.log('🔍 [Mobile Recording] isRecordingSlotAvailable: 신청 내역 없음, 모든 차수 활성화')
      return true // 신청 내역이 없으면 모든 차수 활성화
    }
    
    console.log('🔍 [Mobile Recording] isRecordingSlotAvailable 호출 (fallback):', { date, slot, language })
    
    // 해당 날짜, 언어에 대한 신청이 있는지 확인 (언어별 한 차수만 신청 가능)
    const hasExistingApplication = myRequests.some((request: any) => {
      return request.date === date && 
             request.details?.language === language &&
             request.type === 'recording' &&
             request.status === 'ACTIVE'
    })
    
    if (hasExistingApplication) {
      console.log('❌ [Mobile Recording] 녹음 신청된 언어 발견:', language)
      return false // 이미 해당 언어로 신청했으면 비활성화
    }
    
    // 해당 차수의 현재 신청 인원 확인 (8명 제한)
    const currentApplicants = myRequests.filter((request: any) => {
      return request.date === date && 
             request.slot === slot &&
             request.type === 'recording' &&
             request.status === 'ACTIVE'
    }).length
    
    console.log('🔍 [Mobile Recording] 현재 신청 인원:', currentApplicants, '/ 8')
    return currentApplicants < 8
  }

  // 현재 신청자 수 확인 - recording-availability API 응답 우선 활용
  const getRecordingCurrentApplicants = (date: string, slot: number): number => {
    // recording-availability API 응답을 우선적으로 활용 (전체 신청 현황 기반)
    const availabilityData = availabilityCache.get(date)
    if (availabilityData?.recordingSlotAvailability) {
      const slotInfo = availabilityData.recordingSlotAvailability.find((s: any) => s.slot === slot)
      
      if (slotInfo) {
        console.log('🔍 [Mobile Recording] recording-availability API 기반 신청자 수:', { date, slot, currentCount: slotInfo.currentCount })
        return slotInfo.currentCount
      }
    }
    
    // recording-availability API 응답이 없으면 기존 로직 사용 (fallback)
    if (!myRequests || myRequests.length === 0) {
      return 0
    }
    
    return myRequests.filter((request: any) => {
      return request.date === date && 
             request.slot === slot &&
             request.type === 'recording' &&
             request.status === 'ACTIVE'
    }).length
  }

  // 슬롯 시간 가져오기 - 데스크톱 녹음 캘린더와 완전히 동일
  const getSlotTime = (slot: number) => {
    const times: Record<number, string> = {
      1: '08:30-09:20', 2: '09:30-10:20', 3: '10:30-11:20', 4: '11:30-12:20',
      5: '13:40-14:30', 6: '14:40-15:30', 7: '15:40-16:30', 8: '16:40-17:30'
    }
    return times[slot] || '시간 미정'
  }

  // 녹음 슬롯 시간 가져오기 - 기존 page와 완전히 동일
  const getRecordingSlotTime = (slot: number) => {
    return getSlotTime(slot)
  }

  // 녹음 신청 처리 - 기존 page와 완전히 동일
  const handleRecordingApplication = async (date: string, slot: number, lang?: "korean-english"|"japanese"|"chinese" | "language-select") => {
    if (!authenticatedUser) {
      showAlert({
        title: '로그인 필요',
        message: '로그인이 필요합니다.',
        type: 'warning'
      })
      return
    }

    // 언어 선택이 필요한 경우 (데스크톱과 동일)
    if (!lang || lang === 'language-select') {
      setSelectedRecordingSlot({ date, slot })
      setShowLanguageSelection(true)
      return
    }
    
    console.log('👤 [Mobile Recording] 녹음 신청:', { date, slot, lang })
    
    try {
      const requestData = { 
        employeeId: userInfo.employeeId || 'TEMP001',
        email: authenticatedUser.email,
        name: userInfo.name || authenticatedUser.name,
        department: userInfo.department || '승무원',
        type: 'recording',
        date, 
        slot, 
        details: {
          recordingLanguage: lang
        }
      }
      
      console.log('📝 [Mobile Recording] Database 신청 데이터:', requestData)
      
      const response = await fetch("/api/requests/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      })
      
      console.log('📝 [Mobile Recording] 응답 상태:', response.status, response.statusText)
      
      // Database API 응답 처리 (데스크톱과 동일)
      const result = await response.json()
      console.log('📝 [Mobile Recording] 서버 응답:', result)
      
      if (result.success) {
        const guidance = getRecordingGuidance()
        showAlert({
          title: '🎉 녹음 신청 완료!',
          message: `녹음 신청이 성공적으로 완료되었습니다!

${guidance}`,
          type: 'success'
        })
        
        // 상태 초기화 (데스크톱과 동일)
        setSelectedDate(null)
        setSelectedDaySchedules([])
        setShowLanguageSelection(false)
        setSelectedRecordingSlot(null)
        
        // 신청 내역 즉시 새로고침하여 UI 업데이트
        loadMyRequests()
        
        // 가용성 캐시 전체 클리어 (다른 사용자들도 업데이트된 정보를 보도록)
        setAvailabilityCache(new Map())
        
        // 스케줄 새로고침하여 가용성 반영
        loadSchedules()
      } else {
        console.error('❌ [Mobile Recording] Database 신청 실패:', result.error)
        
        if (result.error?.includes('신청기간만료')) {
          showAlert({
            title: '신청 기간 만료',
            message: '신청 기간이 만료되었습니다.',
            type: 'warning'
          })
        } else if (result.error?.includes('이미 신청하셨습니다') || result.error?.includes('이미 이번 달에 신청하셨습니다') || result.error?.includes('언어별로 한 달에 한 번만 신청 가능')) {
          showAlert({
            title: '중복 신청',
            message: '이미 신청하셨습니다. 언어별로 한 달에 한 번만 신청 가능합니다.',
            type: 'warning'
          })
        } else if (result.error?.includes('정원 마감')) {
          showAlert({
            title: '정원 마감',
            message: '정원이 마감되었습니다.',
            type: 'error'
          })
        } else {
          // Dropbox API 폴백
          console.log('🔄 [Mobile Recording] Dropbox API 폴백 시도')
          const dropboxResponse = await fetch('/api/requests/dropbox', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
          })

          if (dropboxResponse.ok) {
            const dropboxResult = await dropboxResponse.json()
            console.log('✅ [Mobile Recording] Dropbox 신청 성공:', dropboxResult)
            showAlert({
              title: '신청 완료',
              message: '녹음 신청이 완료되었습니다!',
              type: 'success'
            })
            
            // 상태 초기화
            setSelectedDate(null)
            setSelectedDaySchedules([])
            setShowLanguageSelection(false)
            setSelectedRecordingSlot(null)
            
            // 신청 내역 즉시 새로고침하여 UI 업데이트
            loadMyRequests()
            
            // 가용성 캐시 전체 클리어 (다른 사용자들도 업데이트된 정보를 보도록)
            setAvailabilityCache(new Map())
            
            // 스케줄 새로고침하여 가용성 반영
            loadSchedules()
          } else {
            const dropboxError = await dropboxResponse.text()
            console.error('❌ [Mobile Recording] Dropbox 신청 실패:', dropboxError)
            showAlert({
              title: '신청 실패',
              message: '신청 처리 중 오류가 발생했습니다.',
              type: 'error'
            })
          }
        }
      }
    } catch (error) {
      console.error('❌ [Mobile Recording] 신청 오류:', error)
      showAlert({
        title: '신청 실패',
        message: '신청 처리 중 오류가 발생했습니다.',
        type: 'error'
      })
    }
  }

  // 언어 선택 후 신청 처리 - 기존 page와 완전히 동일
  const submitRecordingApplication = async (language: string) => {
    if (!selectedRecordingSlot) return
    
    setShowLanguageSelection(false)
    await handleRecordingApplication(
      selectedRecordingSlot.date, 
      selectedRecordingSlot.slot, 
      language as "korean-english"|"japanese"|"chinese"
    )
    setSelectedRecordingSlot(null)
  }

  // 가용성 확인 - 녹음 전역 가용성(DB) 사용
  const checkAvailability = async (date: string) => {
    if (!authenticatedUser) return null
    
    const cacheKey = date
    if (availabilityCache.has(cacheKey)) {
      console.log(`📋 ${date} 가용성 캐시 사용`)
      return availabilityCache.get(cacheKey)
    }
    
    try {
      // userInfo에서 employeeId 우선 사용
      const employeeId = userInfo.employeeId || 
                         authenticatedUser.email?.split('@')[0] || 
                         'TEMP001'
      
      // 녹음 가용성 API 호출 (DB 기반)
      const recordingResponse = await fetch(`/api/requests/recording-availability?date=${date}&employeeId=${employeeId}`)
      if (!recordingResponse.ok) {
        console.warn('⚠️ [모바일 녹음] recording-availability 응답 오류:', recordingResponse.status)
        return null
      }
      const recordingData = await recordingResponse.json()
      console.log(`🔍 ${date} 녹음 가용성(DB):`, recordingData)
      
      const combinedData = {
        success: true,
        date,
        recordingSlotAvailability: recordingData.slotAvailability,
        recordingHasExistingApplication: recordingData.hasExistingApplication,
        totalApplications: recordingData.totalApplications || 0
      }
      
      setAvailabilityCache(prev => {
        const newCache = new Map(prev)
        newCache.set(cacheKey, combinedData)
        return newCache
      })
      
      return combinedData
    } catch (error) {
      console.error('가용성 확인 실패:', error)
      return null
    }
  }

  // 월 단위 가용성 미리 로드 (Bulk API)
  const preloadMonthAvailability = async () => {
    if (!authenticatedUser) return
    try {
      const employeeId = userInfo.employeeId || authenticatedUser.email?.split('@')[0] || 'TEMP001'
      const res = await fetch(`/api/requests/bulk-availability?employeeId=${employeeId}`)
      if (!res.ok) {
        console.warn('⚠️ [모바일 녹음] Bulk API 실패, 건너뜀')
        return
      }
      const bulkData = await res.json()
      if (bulkData.success && bulkData.data) {
        const newCache = new Map(availabilityCache)
        Object.entries(bulkData.data as Record<string, any>).forEach(([date, dateData]: [string, any]) => {
          newCache.set(date, {
            recordingSlotAvailability: dateData.recording?.slots || [],
            recordingHasExistingApplication: dateData.recording?.hasExistingApplication || false,
            fromBulkApi: true,
            lastUpdated: dateData.lastUpdated
          })
        })
        setAvailabilityCache(newCache)
        console.log('💾 [모바일 녹음] Bulk 데이터 캐시 저장 완료')
      }
    } catch (e) {
      console.warn('⚠️ [모바일 녹음] Bulk API 에러, 건너뜀', e)
    }
  }

  // 캘린더 생성 (useMemo로 최적화)
  const calendarDays = useMemo(() => {
    console.log('📅 [Mobile Recording Calendar] 캘린더 생성, 스케줄 수:', schedules.length)
    
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days = []
    const current = new Date(startDate)

    for (let i = 0; i < 42; i++) {
      const dateStr = `${current.getFullYear()}-${(current.getMonth() + 1).toString().padStart(2, '0')}-${current.getDate().toString().padStart(2, '0')}`
      const hasSchedule = schedules.some(schedule => {
        const scheduleHasRecording = schedule.date === dateStr && schedule.recording && schedule.recording.slots && schedule.recording.slots.length > 0
        if (scheduleHasRecording) {
          console.log('📅 [Mobile Recording Calendar] 스케줄 발견:', dateStr, schedule.recording)
        }
        return scheduleHasRecording
      })
      const availableCount = hasSchedule ? 1 : 0

      days.push({
        date: current.getDate(),
        fullDate: dateStr,
        isCurrentMonth: current.getMonth() === month,
        isToday: current.toDateString() === new Date().toDateString(),
        availableCount,
        hasSchedule
      })

      current.setDate(current.getDate() + 1)
    }

    console.log('📅 [Mobile Recording Calendar] 생성된 캘린더 일수:', days.length, '스케줄 있는 날:', days.filter(d => d.hasSchedule).length)
    return days
  }, [currentDate, schedules])

  // 날짜 선택
  const handleDateClick = async (day: any) => {
    console.log('🖱️ [Mobile Recording Calendar] 날짜 클릭:', {
      date: day.fullDate,
      hasSchedule: day.hasSchedule,
      isCurrentMonth: day.isCurrentMonth,
      schedulesCount: schedules.length
    })
    
    if (!day.hasSchedule || !day.isCurrentMonth) {
      console.log('❌ [Mobile Recording Calendar] 클릭 차단:', { hasSchedule: day.hasSchedule, isCurrentMonth: day.isCurrentMonth })
      return
    }
    
    console.log('🔍 [Mobile Recording Calendar] 날짜 매칭 디버그:', {
      'day.fullDate': day.fullDate,
      'schedules.length': schedules.length,
      'schedules[0]?.date': schedules[0]?.date
    })
    
    const daySchedules = schedules.filter(schedule => schedule.date === day.fullDate)
    console.log('📅 [Mobile Recording Calendar] 해당 날짜 스케줄:', daySchedules)
    
    setSelectedDate(day.fullDate)
    setSelectedDaySchedules(daySchedules)
    
    // 가용성 확인
    await checkAvailability(day.fullDate)
  }

  // 캘린더 생성 - 기존 page와 완전히 동일
  const generateCalendar = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days = []
    const current = new Date(startDate)
    
    for (let i = 0; i < 42; i++) {
      // 데스크톱과 동일하게 타임존 문제 해결
      const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`
      const hasSchedule = schedules.some(s => s.date === dateStr)
      // 단순히 스케줄이 있으면 녹색, 없으면 회색으로 표시 (가용성은 클릭 후 확인)
      const availableCount = hasSchedule ? 1 : 0  
      const isCurrentMonth = current.getMonth() === month
      const isToday = current.toDateString() === new Date().toDateString()
      
      days.push({
        date: new Date(current),
        dateStr,
        hasSchedule,
        availableCount,
        isCurrentMonth,
        isToday
      })
      
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }


  return (
    <BottomSheet 
      isOpen={isOpen} 
      onClose={onClose}
      height="80vh"
      className="overflow-hidden"
    >
          {/* 헤더 */}
          <div className="bg-white px-6 py-6 border-b border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 group"
              >
                <ChevronLeft className="w-6 h-6 text-gray-600 group-hover:text-gray-900" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Mic className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">녹음 신청</h1>
              </div>
              
              <div className="w-10"></div>
            </div>
            
            <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
              <button 
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                className="p-2 hover:bg-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md group"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 group-hover:text-gray-900" />
              </button>
              
              <h2 className="text-lg font-bold text-gray-900">
                {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
              </h2>
              
              <button 
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                className="p-2 hover:bg-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md group"
              >
                <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-gray-900" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-3 text-gray-600">스케줄을 불러오는 중...</span>
              </div>
            ) : (
              <>
                {/* 캘린더 */}
                <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-3xl shadow-xl p-6 mb-6 border border-blue-100/50">
                  <div className="grid grid-cols-7 gap-2 mb-6">
                    {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                      <div key={day} className="text-center text-sm font-bold text-gray-600 py-3">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-2">
                    {calendarDays.map((day, index) => (
                      <button
                        key={index}
                        onClick={() => handleDateClick(day)}
                        className={`
                          aspect-square flex flex-col items-center justify-center text-sm relative rounded-2xl transition-all duration-300 transform
                          ${!day.isCurrentMonth ? 'text-gray-300 cursor-not-allowed opacity-50' :
                            day.isToday ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold shadow-lg scale-105' :
                            day.hasSchedule ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white hover:shadow-lg hover:scale-105 cursor-pointer font-semibold' :
                            'text-gray-500 hover:bg-gray-50 cursor-not-allowed'}
                        `}
                        disabled={!day.hasSchedule || !day.isCurrentMonth}
                      >
                        <span className="relative z-10">{day.date}</span>
                        {day.hasSchedule && day.isCurrentMonth && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white shadow-sm animate-pulse"></div>
                        )}
                        {day.isToday && (
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-400/20 to-indigo-500/20 animate-pulse"></div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

            {/* 기존 page에서 복사한 완벽한 모달 */}
            {selectedDate && selectedDaySchedules.length > 0 && (
              <div 
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                style={{ touchAction: 'none' }}
              >
                <div 
                  className="fixed bottom-0 left-0 right-0 w-full bg-white rounded-t-3xl shadow-2xl transition-all duration-500 ease-out h-[80vh] flex flex-col overflow-hidden"
                  style={{
                    transform: (selectedDate && selectedDaySchedules.length > 0) ? 'translateY(0%)' : 'translateY(100%)',
                    touchAction: 'pan-y',
                  }}
                >
                  {/* 드래그 핸들 */}
                  <div className="flex justify-center py-3">
                    <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
                  </div>
                  
                  <div className="flex-1 overflow-hidden">
                  {/* 모달 헤더 - 데스크톱과 동일 */}
                  <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white px-6 py-8">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
                    <div className="absolute top-4 right-4 w-16 h-16 bg-white rounded-full blur-xl opacity-20"></div>
                    <div className="absolute bottom-4 left-4 w-24 h-24 bg-white rounded-full blur-2xl"></div>
                    
                    <div className="flex items-start justify-between relative z-10">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                            <Calendar className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
                              {new Date(selectedDate!).toLocaleDateString("ko-KR", {
                                month: "long", 
                                day: "numeric"
                              })}
                            </h3>
                            <p className="text-white/80 text-sm md:text-base">
                              {new Date(selectedDate!).toLocaleDateString("ko-KR", {
                                year: "numeric",
                                weekday: "long"
                              })}
                            </p>
                          </div>
                        </div>
                        <p className="text-white/70 text-sm font-medium">
                          녹음 상세 일정 및 신청
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedDate(null)
                          setSelectedDaySchedules([])
                        }}
                        className="p-3 hover:bg-white/20 rounded-2xl transition-all duration-200 hover:scale-110 group"
                      >
                        <svg className="w-6 h-6 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* 모달 내용 - 데스크톱과 동일 */}
                  <div className="p-6 md:p-8 overflow-y-auto max-h-[60vh] space-y-6">
                    {selectedDaySchedules[0]?.recording?.slots?.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Mic className="w-5 h-5 text-blue-600" />
                          녹음 가능 차수
                        </h4>
                        <div className="space-y-3">
                          {selectedDaySchedules[0].recording.slots.map((slot: number) => (
                            <div key={`modal-rec-${slot}`} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 font-semibold">
                                    {slot}차수
                                  </Badge>
                                  <span className="text-sm font-medium text-gray-600">
                                    {getRecordingSlotTime(slot)}
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-3">
                                {/* 전체 신청 현황 표시 */}
                                <div className="text-center py-2 bg-blue-50 rounded-lg">
                                  <div className="text-sm font-medium text-blue-800">
                                    전체 신청 현황: {getRecordingCurrentApplicants(selectedDate!, slot)}/8명
                                  </div>
                                </div>
                                
                                {/* 통합 신청 버튼 */}
                                <button
                                  onClick={() => {
                                    const currentApplicants = getRecordingCurrentApplicants(selectedDate!, slot)
                                    const canApply = currentApplicants < 8 && !userLanguageRestrictions.recording
                                    
                                    if (canApply) {
                                      handleRecordingApplication(selectedDate!, slot)
                                    }
                                  }}
                                  className={`w-full px-6 py-4 rounded-lg font-medium transition-colors ${
                                    getRecordingCurrentApplicants(selectedDate!, slot) < 8 && !userLanguageRestrictions.recording
                                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                                      : 'text-gray-400 bg-gray-200 cursor-not-allowed opacity-60'
                                  }`}
                                  disabled={getRecordingCurrentApplicants(selectedDate!, slot) >= 8 || userLanguageRestrictions.recording}
                                >
                                  <div className="flex items-center justify-center gap-2">
                                    <Mic className="w-5 h-5" />
                                    <span>녹음 신청하기</span>
                                  </div>
                                  {getRecordingCurrentApplicants(selectedDate!, slot) >= 8 && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      정원 마감
                                    </div>
                                  )}
                                  {userLanguageRestrictions.recording && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      이미 이번 달에 녹음 신청하셨습니다
                                    </div>
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(!selectedDaySchedules[0]?.recording?.slots?.length && !selectedDaySchedules[0]?.resultAnnouncement) && (
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>이 날짜에는 예정된 일정이 없습니다.</p>
                      </div>
                    )}
                  </div>
                  </div>
                </div>
              </div>
            )}
              </>
            )}
          </div>

      {/* 언어 선택 모달 */}
      {showLanguageSelection && selectedRecordingSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4 text-center">평가 언어 선택</h3>
            <p className="text-gray-600 text-center mb-6">
              {selectedRecordingSlot.date} {selectedRecordingSlot.slot}차수 녹음 평가
            </p>
            <div className="space-y-3 mb-6">
              {['korean-english', 'japanese', 'chinese'].map(lang => (
                <button
                  key={lang}
                  onClick={() => submitRecordingApplication(lang)}
                  className={`w-full px-6 py-4 rounded-lg font-medium transition-colors text-white ${
                    lang === 'korean-english' ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700' :
                    lang === 'japanese' ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700' :
                    'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700'
                  }`}
                >
                  {lang === 'korean-english' ? '🇰🇷🇺🇸 한국어/영어' : 
                   lang === 'japanese' ? '🇯🇵 일본어' : 
                   '🇨🇳 중국어'} 선택
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setShowLanguageSelection(false)
                setSelectedRecordingSlot(null)
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 커스텀 다이얼로그 */}
      {recordingDialogOpen && (
        <CustomDialog
          isOpen={recordingDialogOpen}
          onClose={recordingDialogClose}
          title={recordingDialogConfig.title}
          message={recordingDialogConfig.message}
          type={recordingDialogConfig.type}
          showCancel={recordingDialogConfig.showCancel}
          confirmText={recordingDialogConfig.confirmText}
          cancelText={recordingDialogConfig.cancelText}
          onConfirm={recordingDialogConfig.onConfirm}
          onCancel={recordingDialogConfig.onCancel}
        />
      )}
    </BottomSheet>
  )
}
