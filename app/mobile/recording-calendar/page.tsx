"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  ArrowLeft,
  Calendar,
  Calendar as CalendarIcon,
  Clock,
  User,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
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
  isTestAccount?: boolean
}

interface UserInfo {
  name: string
  employeeId: string
  language: string
  category: string
  email?: string
  department?: string
  position?: string
}

interface ScheduleSlot {
  id: string
  date: string
  startTime: string
  endTime: string
  instructor: string
  location: string
  capacity: number
  currentBookings: number
  isAvailable: boolean
  bookedUsers?: string[]
}

export default function MobileRecordingCalendarPage() {
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null)
  const [userInfo, setUserInfo] = useState<UserInfo>({ name: "", employeeId: "", language: "", category: "" })
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [schedules, setSchedules] = useState<ScheduleSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [isBooking, setIsBooking] = useState(false)
  const [showApplicationModal, setShowApplicationModal] = useState(false)
  const [selectedDaySchedules, setSelectedDaySchedules] = useState<any[]>([])
  const [availabilityCache, setAvailabilityCache] = useState<Record<string, any>>({})
  const [userLanguageRestrictions, setUserLanguageRestrictions] = useState<Record<string, boolean>>({})
  const [myRequests, setMyRequests] = useState<any[]>([])
  const [myRequestsLoading, setMyRequestsLoading] = useState(false)
  
  // 언어 선택 모달 상태 추가 (데스크톱과 동일)
  const [showLanguageSelection, setShowLanguageSelection] = useState(false)
  const [selectedRecordingSlot, setSelectedRecordingSlot] = useState<{date: string, slot: number} | null>(null)

  // 모바일 최적화된 간결한 녹음 안내사항 생성 함수
  const getRecordingGuidance = (): string => {
    return `⏰ 신청 취소
• 녹음일 기준 2일 전 오후 2시까지 가능

📍 녹음 당일
• ID 카드 지참하여 10분 전 Show Up
• JRF: 비행 준하는 용모 복장

📧 미참석 시 연락처: 객실기내방송(selufst_annc@jinair.com)`
  }

  // 인증 상태 확인
  useEffect(() => {
    const fetchUser = async () => {
      try {
        console.log('🔍 [모바일 녹음] 사용자 인증 확인 시작')
        const res = await fetch("/api/auth/user")
        const data = await res.json()
        console.log('🔍 [모바일 녹음] 인증 응답:', data)
        
        if (data.authenticated && data.user) {
          console.log('✅ [모바일 녹음] 사용자 인증 성공:', data.user.email)
          setAuthenticatedUser(data.user)
          
          // 직원 정보 불러오기
          const employeeInfo = await employeeDB.findEmployeeByEmail(data.user.email)
          if (employeeInfo) {
            setUserInfo({
              name: employeeInfo.name,
              employeeId: employeeInfo.employeeId,
              language: (employeeInfo as any).language || "",
              category: (employeeInfo as any).category || "",
              department: employeeInfo.department,
              position: employeeInfo.position,
              email: data.user.email,
            })
          }
        } else {
          // 로그인되지 않은 경우 모바일 메인으로 리다이렉트
          window.location.href = '/mobile'
        }
      } catch (error) {
        console.error("사용자 정보 로드 실패:", error)
        window.location.href = '/mobile'
      }
    }
    fetchUser()
  }, [])

  // 데스크톱과 동일한 스케줄 로딩 로직 사용
  const loadSchedules = async (year: number, month: number) => {
    setLoading(true)
    try {
      // month는 0부터 시작하므로 +1 필요
      const monthStr = `${year}-${(month + 1).toString().padStart(2, '0')}`
      console.log('📅 [모바일] 스케줄 로드:', monthStr)
      
      // 1. 데스크톱과 동일한 스케줄 API 사용
      const scheduleResponse = await fetch(`/api/schedules?month=${monthStr}`)
      if (!scheduleResponse.ok) {
        console.error(`❌ [모바일 녹음] API 오류: ${scheduleResponse.status} ${scheduleResponse.statusText}`)
        
        // 500 에러인 경우 해당 월에 스케줄이 없는 것으로 처리
        if (scheduleResponse.status === 500) {
          console.log(`⚠️ [모바일 녹음] ${monthStr} 스케줄 없음 (서버 오류)`)
          setSchedules([])
          return
        }
        
        throw new Error(`스케줄 데이터를 가져올 수 없습니다. (${scheduleResponse.status})`)
      }
      
      const scheduleData = await scheduleResponse.json()
      console.log('📅 [모바일] 스케줄 응답:', scheduleData)
      
      // 스케줄이 없으면 빈 배열 설정
      if (!scheduleData.success || !scheduleData.data?.days) {
        console.log('📅 [모바일] 스케줄 없음')
        setSchedules([])
        return
      }
      
      // 2. 스케줄 데이터를 모바일용 형태로 변환
      const scheduleSlots: ScheduleSlot[] = []
      
      console.log('🔍 [모바일] 스케줄 데이터 구조 확인:', scheduleData.data)
      
      if (scheduleData.data?.days && Array.isArray(scheduleData.data.days)) {
        scheduleData.data.days.forEach((day: any) => {
          const date = day.date || `${year}-${(month + 1).toString().padStart(2, '0')}-${day.day.toString().padStart(2, '0')}`
          
          console.log('🔍 [모바일] 날짜 처리:', date, '원본 day:', day)
          
          // 녹음 스케줄만 처리
          if (day.recording) {
            console.log('🔍 [모바일] 녹음 스케줄 발견:', day.recording)
            
            // recording이 배열인지 객체인지 확인
            if (Array.isArray(day.recording)) {
              day.recording.forEach((slot: any, index: number) => {
                if (slot && slot.instructor) {
                  console.log('✅ [모바일] 슬롯 추가:', index + 1, slot)
                  scheduleSlots.push({
                    id: `${date}-${index + 1}`,
                    date: date,
                    startTime: slot.startTime || '09:00',
                    endTime: slot.endTime || '10:00',
                    instructor: slot.instructor,
                    location: slot.location || '훈련실',
                    capacity: 4,
                    currentBookings: 0,
                    isAvailable: true,
                    bookedUsers: []
                  })
                }
              })
            } else if (typeof day.recording === 'object' && day.recording.slots) {
              // recording이 {slots: Array} 형태인 경우
              console.log('🔍 [모바일] 녹음 slots 배열 처리:', day.recording.slots)
              // 데스크톱과 동일하게 처리: slots를 그대로 전달
              console.log('✅ [모바일] 녹음 데이터 추가:', date, 'slots:', day.recording.slots)
              scheduleSlots.push({
                id: `${date}`,
                date: date,
                recording: day.recording, // 전체 recording 데이터 그대로 전달
                classroomInfo: day.classroomInfo,
                resultAnnouncement: day.resultAnnouncement,
                currentBookings: 0,
                isAvailable: true
              } as any)
            } else {
              console.log('❌ [모바일] 예상하지 못한 녹음 데이터 형태:', typeof day.recording, day.recording)
            }
          }
        })
      } else {
        console.log('❌ [모바일] scheduleData.data.days가 배열이 아님:', scheduleData.data)
      }
      
      console.log('📅 [모바일] 최종 스케줄:', scheduleSlots)
      setSchedules(scheduleSlots)
    } catch (error) {
      console.error("스케줄 로드 실패:", error)
      setSchedules([])
    } finally {
      setLoading(false)
    }
  }

  // 사용자 인증 확인 후 스케줄 로드
  useEffect(() => {
    if (authenticatedUser) {
      console.log('🔍 [모바일] 인증된 사용자, 스케줄 로드 시작')
      loadSchedules(currentDate.getFullYear(), currentDate.getMonth())
    } else {
      console.log('⚠️ [모바일] 사용자 미인증, 스케줄 로드 건너뜀')
    }
  }, [currentDate, authenticatedUser])

  // userInfo가 로드되면 신청 내역 로드
  useEffect(() => {
    if (authenticatedUser && userInfo.employeeId) {
      loadMyRequests()
    }
  }, [authenticatedUser, userInfo.employeeId])

  // selectedDate가 변경될 때마다 가용성을 강제로 새로고침
  useEffect(() => {
    if (selectedDate && authenticatedUser) {
      console.log('🔄 [모바일 녹음] 모달 열림, 가용성 강제 새로고침:', selectedDate)
      checkAvailability(selectedDate)
    }
  }, [selectedDate, authenticatedUser])

  // 신청 기한 체크 함수 (2일 전 14:00 기준)
  const isApplicationDeadlinePassed = (date: string): boolean => {
    const scheduleDate = new Date(date)
    const twoDaysBefore = new Date(scheduleDate)
    twoDaysBefore.setDate(twoDaysBefore.getDate() - 2)
    twoDaysBefore.setHours(14, 0, 0, 0) // 오후 2시로 설정
    
    const now = new Date()
    return now > twoDaysBefore
  }

  // 신청 내역 로드 - 데스크톱과 동일한 로직
  const loadMyRequests = async () => {
    if (!authenticatedUser) return
    
    setMyRequestsLoading(true)
    try {
      const employeeId = userInfo.employeeId || 
                         authenticatedUser.email?.split('@')[0] || 
                         authenticatedUser.email?.split('@')[0] || 
                         'TEMP001'
      console.log('🔍 [모바일 녹음] 신청 내역 조회 - employeeId:', employeeId)
      
      // Database API 우선 시도
      const res = await fetch(`/api/requests/database?employeeId=${employeeId}`)
      const data = await res.json()
      console.log('📄 [모바일 녹음] 신청 내역 응답:', data)
      
      if (data.success && data.items) {
        // Database API 응답을 기존 형식으로 변환
        const convertedRequests = data.items.map((item: any) => ({
          id: item.id,
          type: item.type,
          date: item.date,
          slot: item.slot,
          details: item.details,
          applicationTime: item.appliedAt,
          status: item.status
        }))
        
        setMyRequests(convertedRequests)
        console.log('✅ [모바일 녹음] 신청 내역 로드 완료:', convertedRequests.length, '개')
      } else {
        // Database API 실패시 Dropbox API로 fallback
        console.log('🔄 [모바일 녹음] Database 실패, Dropbox API로 fallback')
        const fallbackRes = await fetch(`/api/requests/dropbox?employeeId=${employeeId}&email=${authenticatedUser.email}`)
        const fallbackData = await fallbackRes.json()
        
        if (fallbackData.requests) {
          setMyRequests(fallbackData.requests)
          console.log('✅ [모바일 녹음] Dropbox 신청 내역 로드 완료:', fallbackData.requests.length, '개')
        }
      }
    } catch (error) {
      console.error('모바일 녹음 신청 내역 조회 실패:', error)
      setMyRequests([])
    } finally {
      setMyRequestsLoading(false)
    }
  }

  // 데스크톱과 동일한 가용성 확인 로직
  const checkAvailability = async (date: string) => {
    if (!authenticatedUser) return null
    
    const cacheKey = date // 데스크톱과 동일한 키 사용
    if (availabilityCache[cacheKey]) {
      console.log(`📋 ${date} 가용성 캐시 사용`)
      return availabilityCache[cacheKey]
    }

    try {
      let currentMonth: string
      if (typeof date === 'string') {
        if (date.includes('-')) {
          currentMonth = date.slice(0, 7)
        } else {
          const dateObj = new Date(date)
          if (isNaN(dateObj.getTime())) {
            console.error('유효하지 않은 날짜 형식:', date)
            return null
          }
          currentMonth = dateObj.toISOString().slice(0, 7)
        }
      } else {
        console.error('날짜가 없거나 문자열이 아님:', date)
        return null
      }
      
      // userInfo에서 employeeId 우선 사용
      const employeeId = userInfo.employeeId || 
                         authenticatedUser.email?.split('@')[0] || 
                         authenticatedUser.email?.split('@')[0] || 
                         'TEMP001'
      
      // 간단한 가용성 API 사용 (교육 + 녹음 통합)
      // 녹음 가용성 API 호출 (기존 API 사용)
      const recordingResponse = await fetch(`/api/requests/recording-availability?date=${date}&employeeId=${employeeId}`)
      
      if (recordingResponse.ok) {
        const recordingData = await recordingResponse.json()
        console.log(`🔍 ${date} 녹음 가용성:`, recordingData)
        
        const combinedData = {
          success: true,
          date,
          recordingSlotAvailability: recordingData.slotAvailability,
          recordingHasExistingApplication: recordingData.hasExistingApplication,
          totalApplications: recordingData.totalApplications || 0
        }
        
        setAvailabilityCache(prev => ({
          ...prev,
          [cacheKey]: combinedData
        }))
        
        // 녹음 캘린더는 언어 제한이 없음
        
        return combinedData
      }
    } catch (error) {
      console.error('가용성 확인 실패:', error)
    }
    return null
  }

  // 녹음 슬롯 가용성 확인 - recording-availability API 응답 우선 활용
  const isRecordingSlotAvailable = (date: string, slot: number, language: string) => {
    // 신청 기한 체크 - 기한이 지나면 무조건 비활성화
    if (isApplicationDeadlinePassed(date)) {
      console.log('❌ [모바일 녹음] 신청 기한 경과로 비활성화:', { date, slot, language })
      return false
    }
    
    // recording-availability API 응답을 우선적으로 활용 (전체 신청 현황 기반)
    const availabilityData = availabilityCache[date]
    if (availabilityData?.recordingSlotAvailability) {
      const slotInfo = availabilityData.recordingSlotAvailability.find((s: any) => s.slot === slot)
      
      if (slotInfo) {
        console.log('🔍 [모바일 녹음] recording-availability API 기반 가용성:', { date, slot, available: slotInfo.available, currentCount: slotInfo.currentCount, maxCount: slotInfo.maxCount })
        
        // 사용자가 이미 해당 날짜에 녹음 신청했는지 확인
        if (availabilityData.recordingHasExistingApplication) {
          console.log('❌ [모바일 녹음] 사용자가 이미 해당 날짜에 녹음 신청함')
          return false
        }
        
        return slotInfo.available
      }
    }
    
    // API 데이터가 없으면 기본적으로 활성화 (fallback)
    console.log('⚠️ [모바일 녹음] API 데이터 없음, 기본 활성화:', { date, slot, language })
    return true
  }

  // 현재 신청자 수 확인 - recording-availability API 응답 우선 활용
  const getRecordingCurrentApplicants = (date: string, slot: number) => {
    // recording-availability API 응답을 우선적으로 활용 (전체 신청 현황 기반)
    const availabilityData = availabilityCache[date]
    if (availabilityData?.recordingSlotAvailability) {
      const slotInfo = availabilityData.recordingSlotAvailability.find((s: any) => s.slot === slot)
      
      if (slotInfo) {
        console.log('🔍 [모바일 녹음] recording-availability API 기반 신청자 수:', { date, slot, currentCount: slotInfo.currentCount })
        return slotInfo.currentCount
      }
    }
    
    // API 데이터가 없으면 0 반환 (fallback)
    console.log('⚠️ [모바일 녹음] API 데이터 없음, 신청자 수 0:', { date, slot })
    return 0
  }

  // 슬롯 시간 가져오기
  const getSlotTime = (slot: number) => {
    const times: Record<number, string> = {
      1: '08:30-09:20', 2: '09:30-10:20', 3: '10:30-11:20', 4: '11:30-12:20',
      5: '13:40-14:30', 6: '14:40-15:30', 7: '15:40-16:30', 8: '16:40-17:30'
    }
    return times[slot] || '시간 미정'
  }

  // 데스크톱과 동일한 함수
  const getRecordingSlotTime = (slot: number) => {
    return getSlotTime(slot)
  }

  // 녹음 신청 처리
  const handleRecordingApplication = async (date: string, slot: number, lang?: "korean-english"|"japanese"|"chinese" | "language-select") => {
    if (!authenticatedUser) {
      alert("로그인이 필요합니다.")
      return
    }

    // 언어 선택이 필요한 경우 (데스크톱과 동일)
    if (!lang || lang === 'language-select') {
      setSelectedRecordingSlot({ date, slot })
      setShowLanguageSelection(true)
      return
    }

    // 신청 기한 체크
    if (isApplicationDeadlinePassed(date)) {
      const scheduleDate = new Date(date).toLocaleDateString('ko-KR')
      const twoDaysBefore = new Date(date)
      twoDaysBefore.setDate(twoDaysBefore.getDate() - 2)
      twoDaysBefore.setHours(14, 0, 0, 0)
      const deadline = twoDaysBefore.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      
      alert(`신청 기간이 만료되었습니다.

📅 녹음 날짜: ${scheduleDate}
⏰ 신청 가능 기한: ${deadline}까지

신청은 녹음일 기준 2일 전 오후 2시까지만 가능합니다.`)
      return
    }
    
    console.log('👤 authenticatedUser 전체:', authenticatedUser)
    
    setIsBooking(true)
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
      
      console.log('📝 [Database] 녹음 신청 데이터:', requestData)
      
      const response = await fetch("/api/requests/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      })
      
      console.log('📝 [Database] 응답 상태:', response.status, response.statusText)
      
      // Database API 응답 처리 (데스크톱과 동일)
      const result = await response.json()
      console.log('📝 [Database] 서버 응답:', result)
      
      if (result.success) {
        const guidance = getRecordingGuidance()
        alert(`🎉 녹음 신청 완료!

녹음 신청이 성공적으로 완료되었습니다!

${guidance}`)
        
        // 상태 초기화 (데스크톱과 동일)
        setSelectedDate('')
        setSelectedDaySchedules([])
        setShowApplicationModal(false)
        setShowLanguageSelection(false)
        setSelectedRecordingSlot(null)
        
        // 신청 내역 즉시 새로고침하여 UI 업데이트
        loadMyRequests()
        
        // 가용성 캐시 전체 클리어 (다른 사용자들도 업데이트된 정보를 보도록)
        setAvailabilityCache({})
        
        // 스케줄 새로고침
        loadSchedules(currentDate.getFullYear(), currentDate.getMonth())
      } else {
        // 데스크톱과 동일한 오류 처리
        if (result.error === '신청기간만료') {
          const scheduleDate = new Date(result.scheduleDate || date).toLocaleDateString('ko-KR')
          const deadline = new Date(result.deadline || '').toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
          
          alert(`신청 기간이 만료되었습니다.

📅 녹음 날짜: ${scheduleDate}
⏰ 신청 가능 기한: ${deadline}까지

신청은 녹음일 기준 2일 전 오후 2시까지만 가능합니다.`)
        } else {
          alert(`신청 실패: ${result.error}`)
        }
        
        // 오류 시 언어 모달 닫기
        setShowLanguageSelection(false)
        setSelectedRecordingSlot(null)
      }
    } catch (error) {
      console.error('신청 실패:', error)
      alert('신청 중 오류가 발생했습니다.')
      
      // 오류 시 언어 모달 닫기
      setShowLanguageSelection(false)
      setSelectedRecordingSlot(null)
    } finally {
      setIsBooking(false)
    }
  }

  // 캘린더 생성 함수
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

  const handleDateClick = async (dateStr: string) => {
    const daySchedules = schedules.filter(s => s.date === dateStr)
    if (daySchedules.length > 0) {
      setSelectedDate(dateStr)
      setSelectedDaySchedules(daySchedules)
      
      // 가용성 확인
      await checkAvailability(dateStr)
      setShowApplicationModal(true)
    }
  }



  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + direction)
    setCurrentDate(newDate)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'long'
    })
  }

  const days = generateCalendar()
  const selectedSchedules = selectedDate ? schedules.filter(s => s.date === selectedDate) : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => window.history.back()}
            variant="ghost"
            size="sm"
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">녹음 신청</h1>
            <p className="text-sm text-gray-600">날짜를 선택하여 신청해주세요</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 월 네비게이션 */}
        <Card className="bg-white shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth(-1)}
                className="p-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-lg font-bold text-gray-900">
                {formatDate(currentDate)}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth(1)}
                className="p-2"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                <div key={day} className={`text-center text-sm font-medium py-2 ${
                  index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-600'
                }`}>
                  {day}
                </div>
              ))}
            </div>

            {/* 캘린더 그리드 */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => (
                <button
                  key={index}
                  onClick={() => handleDateClick(day.dateStr)}
                  disabled={!day.hasSchedule || !day.isCurrentMonth}
                  className={`
                    relative aspect-square p-1 text-sm rounded-lg transition-all duration-200 flex flex-col items-center justify-center
                    ${!day.isCurrentMonth 
                      ? 'text-gray-300 cursor-default' 
                      : day.hasSchedule 
                        ? 'bg-green-50 border border-green-200 text-green-800 hover:bg-green-100 cursor-pointer font-semibold' 
                        : 'text-gray-400 cursor-default'
                    }
                    ${day.isToday ? 'bg-blue-100 border-blue-300 font-bold' : ''}
                  `}
                >
                  <span className={`block ${
                    index % 7 === 0 ? 'text-red-500' : index % 7 === 6 ? 'text-blue-500' : ''
                  }`}>
                    {day.date.getDate()}
                  </span>
                  
                  {day.hasSchedule && day.isCurrentMonth && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
                      <div className={`w-2 h-2 rounded-full ${
                        day.availableCount > 0 ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* 범례 */}
            <div className="flex items-center gap-4 mt-4 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>예약 가능</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span>예약 마감</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading && (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-gray-600">스케줄을 불러오는 중...</p>
          </div>
        )}
      </div>

      {/* Bottom Sheet 스타일 녹음 신청 모달 */}
      {selectedDate && selectedDaySchedules.length > 0 && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          style={{ touchAction: 'none' }}
        >
          <div 
            className="fixed bottom-0 left-0 right-0 w-full bg-white rounded-t-3xl shadow-2xl transition-all duration-500 ease-out h-[90vh] flex flex-col overflow-hidden"
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
                    setSelectedDate('')
                    setSelectedDaySchedules([])
                    setShowApplicationModal(false)
                  }}
                  className="p-3 hover:bg-white/20 rounded-2xl transition-all duration-200 hover:scale-110 group"
                >
                  <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-200" />
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
                            {(getRecordingCurrentApplicants(selectedDate!, slot) >= 8 || userLanguageRestrictions.recording) && (
                              <div className="text-xs text-gray-500 mt-1">
                                신청 마감
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

      {/* 언어 선택 모달 (데스크톱과 동일) */}
      {showLanguageSelection && selectedRecordingSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4 text-center">평가 언어 선택</h3>
            <p className="text-gray-600 text-center mb-6">
              {selectedRecordingSlot.date} {selectedRecordingSlot.slot}차수 녹음 평가
            </p>
            
            <div className="space-y-3 mb-6">
              {["korean-english", "japanese", "chinese"].map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    handleRecordingApplication(selectedRecordingSlot.date, selectedRecordingSlot.slot, lang as any)
                  }}
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
    </div>
  )
}
