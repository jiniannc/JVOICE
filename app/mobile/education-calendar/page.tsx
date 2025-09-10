"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  GraduationCap,
  Users,
  X,
  ClipboardCheck,
  Building
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

export default function MobileEducationCalendarPage() {
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null)
  const [userInfo, setUserInfo] = useState<UserInfo>({ name: "", employeeId: "", language: "", category: "" })
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isBooking, setIsBooking] = useState(false)
  const [showApplicationModal, setShowApplicationModal] = useState(false)
  const [selectedDaySchedules, setSelectedDaySchedules] = useState<any[]>([])
  const [availabilityCache, setAvailabilityCache] = useState<Record<string, any>>({})
  const [userLanguageRestrictions, setUserLanguageRestrictions] = useState<Record<string, boolean>>({})
  const [myRequests, setMyRequests] = useState<any[]>([])
  const [myRequestsLoading, setMyRequestsLoading] = useState(false)

  // 인증 상태 확인
  useEffect(() => {
    const fetchUser = async () => {
      try {
        console.log('🔍 [모바일 교육] 사용자 인증 확인 시작')
        const res = await fetch("/api/auth/user")
        const data = await res.json()
        console.log('🔍 [모바일 교육] 인증 응답:', data)
        
        if (data.authenticated && data.user) {
          console.log('✅ [모바일 교육] 사용자 인증 성공:', data.user.email)
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

  // 데스크톱과 동일한 교육 스케줄 로딩 로직 사용
  const loadSchedules = async (year: number, month: number) => {
    setLoading(true)
    try {
      // month는 0부터 시작하므로 +1 필요
      const monthStr = `${year}-${(month + 1).toString().padStart(2, '0')}`
      console.log('🎓 [모바일] 교육 스케줄 로드:', monthStr)
      
      // 1. 데스크톱과 동일한 스케줄 API 사용
      const scheduleResponse = await fetch(`/api/schedules?month=${monthStr}`)
      if (!scheduleResponse.ok) {
        console.error(`❌ [모바일 교육] API 오류: ${scheduleResponse.status} ${scheduleResponse.statusText}`)
        
        // 500 에러인 경우 해당 월에 스케줄이 없는 것으로 처리
        if (scheduleResponse.status === 500) {
          console.log(`⚠️ [모바일 교육] ${monthStr} 스케줄 없음 (서버 오류)`)
          setSchedules([])
          return
        }
        
        throw new Error(`교육 스케줄 데이터를 가져올 수 없습니다. (${scheduleResponse.status})`)
      }
      
      const scheduleData = await scheduleResponse.json()
      console.log('🎓 [모바일] 교육 스케줄 응답:', scheduleData)
      
      // 스케줄이 없으면 빈 배열 설정
      if (!scheduleData.success || !scheduleData.data?.days) {
        console.log('🎓 [모바일] 교육 스케줄 없음')
        setSchedules([])
        return
      }
      
      // 2. 스케줄 데이터를 모바일용 형태로 변환 (녹음 캘린더와 동일)
      const educationSchedules: any[] = []
      
      console.log('🔍 [모바일 교육] 스케줄 데이터 구조 확인:', scheduleData.data)
      
      if (scheduleData.data?.days && Array.isArray(scheduleData.data.days)) {
        scheduleData.data.days.forEach((day: any) => {
          // 날짜 처리 - 타임존 문제 해결을 위해 수동 포맷팅
          const date = day.date
          
          console.log('🔍 [모바일 교육] 날짜 처리:', date, '원본 day:', day)
          
          // 교육 스케줄만 처리
          if (day.education && Array.isArray(day.education) && day.education.length > 0) {
            console.log('🎓 [모바일] 교육 스케줄 발견:', day.education)
            
            // 데스크톱과 동일하게 처리: 전체 day 데이터를 그대로 전달
            console.log('✅ [모바일] 교육 데이터 추가:', date, 'education:', day.education)
            educationSchedules.push({
              date: date,
              education: day.education, // 전체 education 데이터 그대로 전달
              classroomInfo: day.classroomInfo,
              resultAnnouncement: day.resultAnnouncement
            })
          } else if (day.education) {
            console.log('❌ [모바일 교육] 예상하지 못한 교육 데이터 형태:', typeof day.education, day.education)
          }
        })
      } else {
        console.log('❌ [모바일 교육] scheduleData.data.days가 배열이 아님:', scheduleData.data)
      }
      
      console.log('🎓 [모바일] 최종 교육 스케줄:', educationSchedules)
      setSchedules(educationSchedules)
    } catch (error) {
      console.error("교육 스케줄 로드 실패:", error)
      setSchedules([])
    } finally {
      setLoading(false)
    }
  }

  // 사용자 인증 확인 후 스케줄 로드
  useEffect(() => {
    if (authenticatedUser) {
      console.log('🔍 [모바일 교육] 인증된 사용자, 스케줄 로드 시작')
      loadSchedules(currentDate.getFullYear(), currentDate.getMonth())
    } else {
      console.log('⚠️ [모바일 교육] 사용자 미인증, 스케줄 로드 건너뜀')
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
      console.log('🔄 [모바일 교육] 모달 열림, 가용성 강제 새로고침:', selectedDate)
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
      console.log('🔍 [모바일 교육] 신청 내역 조회 - employeeId:', employeeId)
      
      // Database API 우선 시도
      const res = await fetch(`/api/requests/database?employeeId=${employeeId}`)
      const data = await res.json()
      console.log('📄 [모바일 교육] 신청 내역 응답:', data)
      
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
        console.log('✅ [모바일 교육] 신청 내역 로드 완료:', convertedRequests.length, '개')
      } else {
        // Database API 실패시 Dropbox API로 fallback
        console.log('🔄 [모바일 교육] Database 실패, Dropbox API로 fallback')
        const fallbackRes = await fetch(`/api/requests/dropbox?employeeId=${employeeId}&email=${authenticatedUser.email}`)
        const fallbackData = await fallbackRes.json()
        
        if (fallbackData.requests) {
          setMyRequests(fallbackData.requests)
          console.log('✅ [모바일 교육] Dropbox 신청 내역 로드 완료:', fallbackData.requests.length, '개')
        }
      }
    } catch (error) {
      console.error('모바일 교육 신청 내역 조회 실패:', error)
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
      // 교육 가용성 API 호출 (기존 API 사용)
      const educationResponse = await fetch(
        `/api/requests/availability?month=${currentMonth}&date=${date}&employeeId=${employeeId}&email=${authenticatedUser.email}`
      )
      
      if (educationResponse.ok) {
        const educationData = await educationResponse.json()
        console.log(`🔍 ${date} 교육 가용성:`, educationData)
        
        const combinedData = {
          success: true,
          date,
          slotAvailability: educationData.slotAvailability,
          languageRestrictions: educationData.languageRestrictions || [],
          totalApplications: educationData.totalApplications || 0
        }
        
        setAvailabilityCache(prev => ({
          ...prev,
          [cacheKey]: combinedData
        }))
        
        const restrictions: Record<string, boolean> = {}
        combinedData.languageRestrictions.forEach((restriction: any) => {
          restrictions[restriction.language] = restriction.hasExistingApplication
        })
        setUserLanguageRestrictions(restrictions)
        
        return combinedData
      }
    } catch (error) {
      console.error('가용성 확인 실패:', error)
    }
    return null
  }

  // 교육 슬롯 가용성 확인 - availability-simple API 응답 우선 활용
  const isSlotAvailable = (date: string, slot: number, language: string, educationType: string) => {
    // 신청 기한 체크 - 기한이 지나면 무조건 비활성화
    if (isApplicationDeadlinePassed(date)) {
      console.log('❌ [모바일 교육] 신청 기한 경과로 비활성화:', { date, slot, language, educationType })
      return false
    }
    
    // availability-simple API 응답을 우선적으로 활용 (전체 신청 현황 기반)
    const availabilityData = availabilityCache[date]
    if (availabilityData?.slotAvailability) {
      const slotInfo = availabilityData.slotAvailability.find((s: any) => 
        s.slot === slot && s.language === language && s.educationType === educationType
      )
      
      console.log('🔍 [모바일 교육] 슬롯 검색 결과:', { 
        slotInfo: slotInfo ? { slot: slotInfo.slot, language: slotInfo.language, educationType: slotInfo.educationType, available: slotInfo.available, currentCount: slotInfo.currentCount } : null,
        allSlots: availabilityData.slotAvailability.slice(0, 10).map((s: any) => ({ slot: s.slot, language: s.language, educationType: s.educationType, available: s.available, currentCount: s.currentCount }))
      })
      
      if (slotInfo) {
        console.log('✅ [모바일 교육] availability-simple API 기반 가용성:', { date, slot, language, educationType, available: slotInfo.available, currentCount: slotInfo.currentCount, maxCount: slotInfo.maxCount })
        // 🚨 중요: API에서 available이 false면 즉시 false 반환
        if (!slotInfo.available) {
          return false
        }
        return slotInfo.available
      }
    }
    
    // API 데이터가 없으면 기본적으로 활성화 (fallback)
    console.log('⚠️ [모바일 교육] API 데이터 없음, 기본 활성화:', { date, slot, language, educationType })
    return true
  }

  // 현재 신청자 수 확인 - availability API 응답 우선 활용
  const getCurrentApplicants = (date: string, slot: number, language: string, educationType: string) => {
    // availability-simple API 응답을 우선적으로 활용 (전체 신청 현황 기반)
    const availabilityData = availabilityCache[date]
    if (availabilityData?.slotAvailability) {
      const slotInfo = availabilityData.slotAvailability.find((s: any) => 
        s.slot === slot && s.language === language && s.educationType === educationType
      )
      
      if (slotInfo) {
        console.log('🔍 [모바일 교육] availability-simple API 기반 신청자 수:', { date, slot, language, educationType, currentCount: slotInfo.currentCount })
        return slotInfo.currentCount
      }
    }
    
    // API 데이터가 없으면 0 반환 (fallback)
    console.log('⚠️ [모바일 교육] API 데이터 없음, 신청자 수 0:', { date, slot, language, educationType })
    return 0
  }

  // 1:1 교육용 차수별 시간 정보 (25분 단위, 총 16차수) - 데스크톱과 동일
  const getOneOnOneSlotTime = (slot: number) => {
    const times = {
      1: "08:30-08:55",
      2: "09:00-09:25", 
      3: "09:30-09:55",
      4: "10:00-10:25",
      5: "10:30-10:55",
      6: "11:00-11:25",
      7: "11:30-11:55",
      8: "12:00-12:25",
      9: "13:35-14:00",
      10: "14:05-14:30",
      11: "14:35-15:00",
      12: "15:05-15:30",
      13: "15:35-16:00",
      14: "16:05-16:30",
      15: "16:35-17:00",
      16: "17:05-17:30"
    }
    return times[slot as keyof typeof times] || ""
  }

  // 소규모 교육용 차수별 시간 정보 (2시간 단위) - 데스크톱과 동일
  const getSmallGroupSlotTime = (slot: number) => {
    const times = {
      1: "08:30-10:20",
      2: "10:30-12:20",
      3: "13:40-15:30",
      4: "15:40-17:30"
    }
    return times[slot as keyof typeof times] || ""
  }

  // 교육 타입과 차수에 따른 시간 반환 - 데스크톱과 동일
  const getEducationSlotTime = (type: any, slot: number) => {
    if (type.mode === '1:1') {
      return getOneOnOneSlotTime(slot)
    } else if (type.mode === 'small') {
      return getSmallGroupSlotTime(slot)
    }
    return ""
  }

  // 스프레드시트 "녹음 단위" 차수를 "교육 단위" 차수로 변환 (데스크톱과 완전히 동일)
  const convertToEducationSlots = (recordingSlots: number[], educationType: any, date?: string, availabilityChecker?: (date: string, slot: number, language: string, educationType: string) => boolean) => {
    console.log(`🔄 변환 시작: 녹음슬롯=[${recordingSlots.join(',')}], 타입=${educationType.lang} ${educationType.mode}`)
    
    if (educationType.mode === '1:1') {
      // 1:1 교육: 총 16차수 존재, 녹음 1차수당 교육 4차수씩 매핑
      // 녹음 1,2차수 → 교육 1,2,3,4차수
      // 녹음 3,4차수 → 교육 5,6,7,8차수
      // 녹음 5,6차수 → 교육 9,10,11,12차수
      // 녹음 7,8차수 → 교육 13,14,15,16차수
      const educationSlots = []
      for (const recordingSlot of recordingSlots) {
        if (recordingSlot === 1) {
          educationSlots.push(1, 2, 3, 4)
        } else if (recordingSlot === 2) {
          educationSlots.push(1, 2, 3, 4)
        } else if (recordingSlot === 3) {
          educationSlots.push(5, 6, 7, 8)
        } else if (recordingSlot === 4) {
          educationSlots.push(5, 6, 7, 8)
        } else if (recordingSlot === 5) {
          educationSlots.push(9, 10, 11, 12)
        } else if (recordingSlot === 6) {
          educationSlots.push(9, 10, 11, 12)
        } else if (recordingSlot === 7) {
          educationSlots.push(13, 14, 15, 16)
        } else if (recordingSlot === 8) {
          educationSlots.push(13, 14, 15, 16)
        }
      }
      
      // 중복 제거
      const uniqueSlots = [...new Set(educationSlots)]
      console.log(`✅ 1:1 변환 완료: [${uniqueSlots.join(',')}]`)
      return uniqueSlots
    } else if (educationType.mode === 'small') {
      // 소규모 교육: 총 4차수 존재, 녹음 2차수당 교육 1차수씩 매핑
      // 녹음 1,2차수 → 교육 1차수
      // 녹음 3,4차수 → 교육 2차수
      // 녹음 5,6차수 → 교육 3차수
      // 녹음 7,8차수 → 교육 4차수
      const educationSlots = []
      for (const recordingSlot of recordingSlots) {
        if (recordingSlot === 1 || recordingSlot === 2) {
          educationSlots.push(1)
        } else if (recordingSlot === 3 || recordingSlot === 4) {
          educationSlots.push(2)
        } else if (recordingSlot === 5 || recordingSlot === 6) {
          educationSlots.push(3)
        } else if (recordingSlot === 7 || recordingSlot === 8) {
          educationSlots.push(4)
        }
      }
      
      // 중복 제거
      const uniqueSlots = [...new Set(educationSlots)]
      console.log(`✅ 소규모 변환 완료: [${uniqueSlots.join(',')}]`)
      return uniqueSlots
    }
    
    return []
  }

  // 교육 타입별 색상 (데스크톱과 완전히 동일)
  const getEducationColor = (type: any) => {
    if (type.lang === 'korean-english' && type.mode === '1:1') return 'bg-indigo-500 hover:bg-indigo-600'
    if (type.lang === 'korean-english' && type.mode === 'small') return 'bg-blue-500 hover:bg-blue-600'
    if (type.lang === 'japanese' && type.mode === '1:1') return 'bg-green-500 hover:bg-green-600'
    if (type.lang === 'japanese' && type.mode === 'small') return 'bg-emerald-500 hover:bg-emerald-600'
    if (type.lang === 'chinese' && type.mode === '1:1') return 'bg-purple-500 hover:bg-purple-600'
    if (type.lang === 'chinese' && type.mode === 'small') return 'bg-violet-500 hover:bg-violet-600'
    return 'bg-gray-500 hover:bg-gray-600'
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
      // 단순히 스케줄이 있으면 보라색, 없으면 회색으로 표시 (가용성은 클릭 후 확인)
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

  // 교육 신청 처리 - 데스크톱의 onApplyEducation과 동일한 로직
  const handleEducationApplication = async (date: string, slot: number, type: any) => {
    if (!authenticatedUser) {
      alert("로그인이 필요합니다.")
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

📅 교육 날짜: ${scheduleDate}
⏰ 신청 가능 기한: ${deadline}까지

신청은 교육일 기준 2일 전 오후 2시까지만 가능합니다.`)
      return
    }
    
    console.log('👤 [모바일] 교육 신청:', { date, slot, type })
    
    setIsBooking(true)
    try {
      const requestData = { 
        employeeId: userInfo.employeeId || 'TEMP001',
        email: authenticatedUser.email,
        name: userInfo.name || authenticatedUser.name,
        department: userInfo.department || '승무원',
        type: 'education',
        date: date, 
        slot: slot, 
        details: {
          language: type.lang,
          educationType: type.mode === '1:1' ? '1:1' : 'small-group',
          mode: type.mode,
          category: type.category || '신규'
        }
      }
      
      console.log('📝 [Database] 교육 신청 데이터:', requestData)
      
      const response = await fetch("/api/requests/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      })
      
      const result = await response.json()
      console.log('📝 [Database] 서버 응답:', result)
      
      if (result.success) {
        alert('신청이 완료되었습니다.')
        
        // 상태 초기화
        setSelectedDate('')
        setSelectedDaySchedules([])
        setShowApplicationModal(false)
        
        // 신청 내역 즉시 새로고침하여 UI 업데이트
        loadMyRequests()
        
        // 가용성 캐시 전체 클리어 (다른 사용자들도 업데이트된 정보를 보도록)
        setAvailabilityCache({})
        
        // 스케줄 새로고침
        loadSchedules(currentDate.getFullYear(), currentDate.getMonth())
        if (selectedDate) {
          checkAvailability(selectedDate)
        }
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

📅 교육 날짜: ${scheduleDate}
⏰ 신청 가능 기한: ${deadline}까지

신청은 교육일 기준 2일 전 오후 2시까지만 가능합니다.`)
        } else {
          alert(`신청 실패: ${result.error}`)
        }
      }
    } catch (error) {
      console.error('신청 실패:', error)
      alert('신청 중 오류가 발생했습니다.')
    } finally {
      setIsBooking(false)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50">
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
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-green-600" />
              교육 신청
            </h1>
            <p className="text-sm text-gray-600">날짜를 선택하여 교육을 신청해주세요</p>
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
                        ? 'bg-purple-50 border border-purple-200 text-purple-800 hover:bg-purple-100 cursor-pointer font-semibold' 
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
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-green-600" />
            <p className="text-gray-600">교육 일정을 불러오는 중...</p>
          </div>
        )}
      </div>

      {/* Bottom Sheet 스타일 교육 신청 모달 */}
      {showApplicationModal && selectedDate && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          style={{ touchAction: 'none' }}
        >
          <div 
            className="fixed bottom-0 left-0 right-0 w-full bg-white rounded-t-3xl shadow-2xl transition-all duration-500 ease-out h-[90vh] flex flex-col overflow-hidden"
            style={{
              transform: showApplicationModal ? 'translateY(0%)' : 'translateY(100%)',
              touchAction: 'pan-y',
            }}
          >
            {/* 드래그 핸들 */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
            </div>
            
            <div className="flex-1 overflow-hidden relative">
            {/* 데스크톱과 동일한 보라색 헤더 */}
            <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 rounded-t-3xl shadow-2xl overflow-hidden relative">
              {/* 배경 패턴 */}
              <div className="absolute inset-0">
                <div className="absolute inset-0 opacity-30" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}></div>
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
              </div>
              
              <div className="flex items-start justify-between relative z-10">
                <div className="flex-1 p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                        {new Date(selectedDate).toLocaleDateString("ko-KR", {
                          month: "long", 
                          day: "numeric"
                        })}
                      </h3>
                      <p className="text-white/80 text-sm md:text-base">
                        {new Date(selectedDate).toLocaleDateString("ko-KR", {
                          year: "numeric",
                          weekday: "long"
                        })}
                      </p>
                    </div>
                  </div>
                  <p className="text-white/70 text-sm font-medium">
                    교육 상세 일정 및 신청
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowApplicationModal(false)
                    setSelectedDate('')
                    setSelectedDaySchedules([])
                  }}
                  className="p-3 hover:bg-white/20 rounded-2xl transition-all duration-200 hover:scale-110 group m-6"
                >
                  <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-200" />
                </button>
              </div>
            </div>

            {/* 모달 내용 */}
            <div className="p-6 md:p-8 overflow-y-auto max-h-[60vh] space-y-6">
              

              <div className="space-y-4">
                {selectedDaySchedules.length > 0 && selectedDaySchedules[0]?.education ? (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                      교육 가능 과정
                    </h4>
                    <div className="space-y-4">
                      {selectedDaySchedules[0].education.map((edu: any, idx: number) => {
                        // 데스크톱과 완전히 동일한 로직
                        const convertedSlots = convertToEducationSlots(edu.slots, edu.type, selectedDate!, isSlotAvailable)
                        
                        return (
                          <div key={`modal-edu-${idx}`} className="border border-gray-200 rounded-lg p-4">
                            <div className="mb-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={`font-semibold ${
                                  edu.type.lang === 'korean-english' ? 'bg-indigo-100 text-indigo-800' :
                                  edu.type.lang === 'japanese' ? 'bg-green-100 text-green-800' :
                                  edu.type.lang === 'chinese' ? 'bg-purple-100 text-purple-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {edu.type.lang === 'korean-english' ? '한/영' : 
                                   edu.type.lang === 'japanese' ? '일본어' : 
                                   edu.type.lang === 'chinese' ? '중국어' : '기타'}
                                  {edu.type.mode === '1:1' ? ' (온라인)' : 
                                   edu.type.lang === 'korean-english' && edu.type.mode === 'small' ? ` (${edu.type.category || '신규'})` : ''}
                                </Badge>
                                {edu.type.mode === 'small' && selectedDaySchedules.length > 0 && selectedDaySchedules[0]?.classroomInfo && (
                                  <div className="flex items-center gap-1 text-sm text-amber-800 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                                    <Building className="w-3 h-3" />
                                    <span className="font-medium">{selectedDaySchedules[0].classroomInfo} 학과장</span>
                                  </div>
                                )}
                              </div>
                              <div className="mt-2 text-sm text-gray-600">
                                <p><strong>진행 시간:</strong> {edu.type.mode === '1:1' ? '25분' : '1시간 50분'} · 총 {convertedSlots.length}개 차수</p>
                              </div>
                              {edu.type.lang === 'korean-english' && edu.type.mode === 'small' && (
                                <div className="mt-2 text-sm text-gray-600">
                                  <p><strong>신규:</strong> 기내방송 자격이 없는 승무원 대상</p>
                                  <p><strong>재자격:</strong> 자격 갱신 또는 상위 등급이 목표인 승무원 대상</p>
                                  <p><strong>공통:</strong> 자격 무관</p>
                                </div>
                              )}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {convertedSlots.map((slot: number) => {
                                // 가용성 확인 - 데스크톱과 완전히 동일
                                const educationType = edu.type.mode === '1:1' ? '1:1' : 'small-group'
                                const isAvailable = isSlotAvailable(selectedDate!, slot, edu.type.lang, educationType)
                                const currentApplicants = getCurrentApplicants(selectedDate!, slot, edu.type.lang, educationType)
                                
                                return (
                                  <button
                                    key={slot}
                                    onClick={() => {
                                      if (isAvailable) {
                                        // 데스크톱과 완전히 동일 - edu.type 전체 전달
                                        handleEducationApplication(selectedDate!, slot, edu.type)
                                        setShowApplicationModal(false)
                                        setSelectedDate('')
                                        setSelectedDaySchedules([])
                                      }
                                    }}
                                    className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                                      isAvailable 
                                        ? `text-white ${getEducationColor(edu.type)}`
                                        : 'text-gray-400 bg-gray-200 cursor-not-allowed opacity-60'
                                    }`}
                                    disabled={!isAvailable || isBooking}
                                  >
                                    {slot}차수
                                    <div className={`text-xs ${isAvailable ? 'opacity-90' : 'opacity-50'}`}>
                                      {getEducationSlotTime(edu.type, slot)}
                                    </div>
                                    {edu.type.mode === 'small' && (
                                      <div className="text-xs text-gray-600 mt-1">
                                        {currentApplicants}/4명
                                      </div>
                                    )}
                                    {!isAvailable && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        신청 마감
                                      </div>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    선택한 날짜에 교육 일정이 없습니다.
                  </div>
                )}
              </div>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}