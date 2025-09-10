"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
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
  GraduationCap,
  Building,
  ClipboardCheck,
  Filter,
  ChevronDown
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

interface FilterOptions {
  language: string
  category: string
  subcategory?: string
}

interface MobileEducationCalendarProps {
  isOpen: boolean
  onClose: () => void
  authenticatedUser: AuthenticatedUser
  userInfo: UserInfo
}

export function MobileEducationCalendar({ isOpen, onClose, authenticatedUser, userInfo }: MobileEducationCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedDaySchedules, setSelectedDaySchedules] = useState<any[]>([])
  const [availabilityCache, setAvailabilityCache] = useState<Map<string, any>>(new Map())
  const [userLanguageRestrictions, setUserLanguageRestrictions] = useState({
    recording: false,
    education: false
  })
  const [myRequests, setMyRequests] = useState<any[]>([])

  // 필터 관련 상태
  const [filters, setFilters] = useState<FilterOptions>({
    language: 'all',
    category: 'all',
    subcategory: undefined
  })
  const [showFilters, setShowFilters] = useState(false)

  const educationDialogHook = useCustomDialog()
  const { isOpen: educationDialogOpen, config: educationDialogConfig, close: educationDialogClose, showAlert } = educationDialogHook

  // 모바일 최적화된 간결한 안내사항 생성 함수들
  const getEducationGuidance = (type: any): string => {
    if (type.mode === '1:1') {
      return `💻 온라인 교육 준비사항
• 장비: 태블릿/휴대폰/노트북 중 택 1
• 이어폰 (마이크 기능 포함) 필수
• Google Meet 앱 미리 설치

📝 참여 방법
• 교육 5분 전 '교육 체크인' 클릭
• 체크인 버튼 클릭 후 Google Meet 입장
• 교관에게 학습 희망 부분 요청

❓ 문의: 객실기내방송(selufst_annc@jinair.com)`
    } else if (type.mode === 'small') {
      return `🏫 소규모 교육 안내
• 교육 10분 전까지 지정 교실 입실
• 교관에게 학습 희망 부분 요청

❓ 문의: 객실기내방송(selufst_annc@jinair.com)`
    }
    return ''
  }

  const getRecordingGuidance = (): string => {
    return `⏰ 신청 취소
• 녹음일 기준 2일 전 14:00까지 가능

📍 녹음 당일
• ID 카드 지참하여 10분 전 Show Up
• JRF: 비행 준하는 용모 복장

📧 미참석 시 연락처: 객실기내방송(selufst_annc@jinair.com)`
  }

  // 스케줄에서 언어 정보 추출
  const getScheduleLanguage = useCallback((schedule: any) => {
    // schedule.education은 배열이므로 모든 교육 타입을 확인
    if (!schedule.education || !Array.isArray(schedule.education)) {
      return null
    }
    
    // 교육 배열에서 언어 정보 추출
    const languages = schedule.education.map((edu: any) => {
      const lang = edu.type?.lang || ''
      if (lang === 'korean-english' || lang === 'korean' || lang === 'english') {
        return 'korean-english'
      } else if (lang === 'japanese') {
        return 'japanese'
      } else if (lang === 'chinese') {
        return 'chinese'
      }
      return 'korean-english'
    })
    
    return languages
  }, [])

  // 스케줄에서 카테고리 정보 추출 (소규모/1:1)
  const getScheduleCategory = useCallback((schedule: any) => {
    if (!schedule.education || !Array.isArray(schedule.education)) {
      return null
    }
    
    // 교육 배열에서 모드 정보 추출
    const categories = schedule.education.map((edu: any) => {
      const mode = edu.type?.mode || ''
      if (mode === '1:1') {
        return 'one-on-one'
      } else if (mode === 'small' || mode === 'group') {
        return 'small-group'
      }
      return 'small-group'
    })
    
    return categories
  }, [])

  // 스케줄에서 세부 카테고리 정보 추출 (신규/재자격/공통/PUS)
  const getScheduleSubcategory = useCallback((schedule: any) => {
    if (!schedule.education || !Array.isArray(schedule.education)) {
      return null
    }
    
    // 교육 배열에서 카테고리 정보 추출
    const subcategories = schedule.education.map((edu: any) => {
      const category = edu.type?.category || ''
      console.log('🔍 [Filter Debug] 세부 카테고리 원본 데이터:', { 
        eduType: edu.type, 
        category 
      })
      
      if (category === 'new' || category === '신규') {
        return 'new'
      } else if (category === 'requalification' || category === '재자격') {
        return 'requalification'
      } else if (category === 'common' || category === '공통') {
        return 'common'
      } else if (category === 'PUS') {
        return 'pus'
      }
      // 기본값을 null로 설정하여 정확한 분류만 반환
      return null
    }).filter(Boolean) // null 값 제거
    
    return subcategories
  }, [])

  // 필터링된 스케줄 계산
  const filteredSchedules = useMemo(() => {
    console.log('🔍 [Filter Debug] 필터링 시작:', { filters, schedulesCount: schedules.length })
    
    return schedules.filter(schedule => {
      console.log('🔍 [Filter Debug] 스케줄 확인:', {
        date: schedule.date,
        education: schedule.education
      })
      
      // 교육이 없는 스케줄은 제외
      if (!schedule.education || !Array.isArray(schedule.education) || schedule.education.length === 0) {
        console.log('❌ [Filter Debug] 교육 데이터 없음')
        return false
      }

      // 언어 필터링
      if (filters.language !== 'all') {
        const scheduleLanguages = getScheduleLanguage(schedule)
        console.log('🔍 [Filter Debug] 언어 필터링:', { 
          filterLanguage: filters.language, 
          scheduleLanguages 
        })
        
        if (!scheduleLanguages || !scheduleLanguages.includes(filters.language)) {
          console.log('❌ [Filter Debug] 언어 필터링 실패')
          return false
        }
      }

      // 카테고리 필터링 (소규모/1:1)
      if (filters.category !== 'all') {
        const scheduleCategories = getScheduleCategory(schedule)
        console.log('🔍 [Filter Debug] 카테고리 필터링:', { 
          filterCategory: filters.category, 
          scheduleCategories 
        })
        
        if (!scheduleCategories || !scheduleCategories.includes(filters.category)) {
          console.log('❌ [Filter Debug] 카테고리 필터링 실패')
          return false
        }
      }

      // 세부 카테고리 필터링 (한/영 소규모의 경우: 신규/재자격/공통)
      if (filters.subcategory && filters.language === 'korean-english' && filters.category === 'small-group') {
        const scheduleSubcategories = getScheduleSubcategory(schedule)
        console.log('🔍 [Filter Debug] 세부 카테고리 필터링:', { 
          filterSubcategory: filters.subcategory, 
          scheduleSubcategories 
        })
        
        if (!scheduleSubcategories || !scheduleSubcategories.includes(filters.subcategory)) {
          console.log('❌ [Filter Debug] 세부 카테고리 필터링 실패')
          return false
        }
      }

      console.log('✅ [Filter Debug] 필터링 통과')
      return true
    })
  }, [schedules, filters])

  // 필터 변경 핸들러
  const handleFilterChange = (filterType: keyof FilterOptions, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev, [filterType]: value }
      
      // 언어가 한/영이 아니거나 카테고리가 소규모가 아닌 경우 세부 카테고리 초기화
      if (filterType === 'language' && value !== 'korean-english') {
        newFilters.subcategory = undefined
      } else if (filterType === 'category' && value !== 'small-group') {
        newFilters.subcategory = undefined
      }
      
      return newFilters
    })
  }

  // 필터 초기화
  const resetFilters = () => {
    setFilters({
      language: 'all',
      category: 'all',
      subcategory: undefined
    })
  }

  // 필터 옵션 정의
  const filterOptions = {
    languages: [
      { value: 'all', label: '전체 언어' },
      { value: 'korean-english', label: '한/영' },
      { value: 'japanese', label: '일본어' },
      { value: 'chinese', label: '중국어' }
    ],
    categories: [
      { value: 'all', label: '전체 구분' },
      { value: 'small-group', label: '소규모' },
      { value: 'one-on-one', label: '1:1 온라인' }
    ],
    subcategories: {
      'korean-english': [
        { value: 'new', label: '신규' },
        { value: 'requalification', label: '재자격' },
        { value: 'common', label: '공통' },
        { value: 'pus', label: 'PUS' }
      ]
    }
  }

  // 스케줄 필터링 함수
  const filterSchedules = (scheduleList: any[]) => {
    return scheduleList.filter(schedule => {
      // 언어 필터링
      if (filters.language !== 'all') {
        const scheduleLanguage = getScheduleLanguage(schedule)
        if (scheduleLanguage !== filters.language) {
          return false
        }
      }

      // 카테고리 필터링 (소규모/1:1)
      if (filters.category !== 'all') {
        const scheduleCategory = getScheduleCategory(schedule)
        if (scheduleCategory !== filters.category) {
          return false
        }
      }

      // 세부 카테고리 필터링 (한/영의 경우: 신규/재자격/공통)
      if (filters.subcategory && filters.language === 'korean-english') {
        const scheduleSubcategory = getScheduleSubcategory(schedule)
        if (scheduleSubcategory !== filters.subcategory) {
          return false
        }
      }

      return true
    })
  }

  // 스케줄 로드 - 단독 페이지와 동일한 로직
  const loadSchedules = async () => {
    setLoading(true)
    try {
      const month = currentDate.getMonth() + 1
      const year = currentDate.getFullYear()
      const monthStr = `${year}-${month.toString().padStart(2, '0')}`
      
      console.log('📅 [Mobile Education Calendar] 스케줄 로드:', monthStr)
      
      const response = await fetch(`/api/schedules?month=${monthStr}`)
      if (response.ok) {
        const scheduleData = await response.json()
        console.log('📊 [Mobile Education Calendar] API 응답:', scheduleData)
        
        const scheduleSlots: any[] = []
        
        if (scheduleData.data && Array.isArray(scheduleData.data.days)) {
          scheduleData.data.days.forEach((day: any) => {
            const date = day.date
            
            if (day.education) {
              console.log('✅ [Mobile Education Calendar] 교육 데이터 추가:', date, 'education:', day.education)
              scheduleSlots.push({
                id: `${date}`,
                date: date,
                education: day.education,
                classroomInfo: day.classroomInfo,
                resultAnnouncement: day.resultAnnouncement
              })
            }
          })
        } else {
          console.log('❌ [Mobile Education Calendar] scheduleData.data.days가 배열이 아님:', scheduleData.data)
        }
        
        console.log('📅 [Mobile Education Calendar] 최종 스케줄:', scheduleSlots)
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

  // 교육 슬롯 가용성 확인 - availability-simple API 응답 우선 활용
  const isSlotAvailable = (date: string, slot: number, language: string, educationType: string) => {
    // 신청 기한 체크 - 기한이 지나면 무조건 비활성화
    const scheduleDate = new Date(date)
    const twoDaysBefore = new Date(scheduleDate)
    twoDaysBefore.setDate(twoDaysBefore.getDate() - 2)
    twoDaysBefore.setHours(14, 0, 0, 0)
    const now = new Date()
    
    if (now > twoDaysBefore) {
      console.log('❌ [Mobile Education] 신청 기한 경과로 비활성화:', { date, slot, language, educationType })
      return false
    }
    
    // availability-simple API 응답을 우선적으로 활용 (전체 신청 현황 기반)
    const availabilityData = availabilityCache.get(date)
    if (availabilityData?.slotAvailability) {
      const slotInfo = availabilityData.slotAvailability.find((s: any) => 
        s.slot === slot && s.language === language && s.educationType === educationType
      )
      
      if (slotInfo) {
        console.log('🔍 [Mobile Education] availability-simple API 기반 가용성:', { date, slot, language, educationType, available: slotInfo.available, currentCount: slotInfo.currentCount, maxCount: slotInfo.maxCount })
        return slotInfo.available
      }
    }
    
    // availability API 응답이 없으면 기존 로직 사용 (fallback)
    if (!myRequests || myRequests.length === 0) {
      console.log('🔍 [Mobile Education] isSlotAvailable: 신청 내역 없음, 모든 차수 활성화')
      return true // 신청 내역이 없으면 모든 차수 활성화
    }
    
    console.log('🔍 [Mobile Education] isSlotAvailable 호출 (fallback):', { date, slot, language, educationType })
    
    // 1:1 교육인 경우 - 한 명이라도 신청하면 비활성화
    if (educationType === '1:1') {
      const hasExistingApplication = myRequests.some((request: any) => {
        const matches = request.date === date && 
               request.slot === slot &&
               request.details?.language === language &&
               request.details?.educationType === educationType &&
               request.status === 'ACTIVE'
        
        if (matches) {
          console.log('❌ [Mobile Education] 1:1 신청된 차수 발견:', request)
        }
        
        return matches
      })
      
      console.log('🔍 [Mobile Education] 1:1 가용성 결과:', !hasExistingApplication)
      return !hasExistingApplication
    }
    
    // 소규모 교육인 경우 - 4명 미만일 때만 활성화
    if (educationType === 'small-group') {
      const currentApplicants = myRequests.filter((request: any) => {
        return request.date === date && 
               request.slot === slot &&
               request.details?.language === language &&
               request.details?.educationType === educationType &&
               request.status === 'ACTIVE'
      }).length
      
      console.log('🔍 [Mobile Education] 소규모 현재 신청 인원:', currentApplicants, '/ 4')
      return currentApplicants < 4
    }
    
    return true
  }

  // 현재 신청자 수 확인 - availability-simple API 응답 우선 활용
  const getCurrentApplicants = (date: string, slot: number, language: string, educationType: string) => {
    // availability-simple API 응답을 우선적으로 활용 (전체 신청 현황 기반)
    const availabilityData = availabilityCache.get(date)
    if (availabilityData?.slotAvailability) {
      const slotInfo = availabilityData.slotAvailability.find((s: any) => 
        s.slot === slot && s.language === language && s.educationType === educationType
      )
      
      if (slotInfo) {
        console.log('🔍 [Mobile Education] availability-simple API 기반 신청자 수:', { date, slot, language, educationType, currentCount: slotInfo.currentCount })
        return slotInfo.currentCount
      }
    }
    
    // availability API 응답이 없으면 기존 로직 사용 (fallback)
    if (!myRequests || myRequests.length === 0) {
      return 0
    }
    
    return myRequests.filter((request: any) => {
      return request.date === date && 
             request.slot === slot &&
             request.details?.language === language &&
             request.details?.educationType === educationType &&
             request.status === 'ACTIVE'
    }).length
  }

  // 1:1 교육 시간 - 기존 page와 완전히 동일
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
      9: "13:30-13:55",
      10: "14:00-14:25",
      11: "14:30-14:55",
      12: "15:00-15:25",
      13: "15:30-15:55",
      14: "16:00-16:25",
      15: "16:30-16:55",
      16: "17:00-17:25"
    }
    return times[slot as keyof typeof times] || "시간 미정"
  }

  // 소규모 교육 시간 - 기존 page와 완전히 동일
  const getSmallGroupSlotTime = (slot: number) => {
    const times = {
      1: "08:30-10:20",
      2: "10:30-12:20",
      3: "13:30-15:20",
      4: "15:30-17:20"
    }
    return times[slot as keyof typeof times] || "시간 미정"
  }

  // 교육 슬롯 시간 - 기존 page와 완전히 동일
  const getEducationSlotTime = (type: any, slot: number) => {
    if (type.mode === '1:1') {
      return getOneOnOneSlotTime(slot)
    } else if (type.mode === 'small') {
      return getSmallGroupSlotTime(slot)
    }
    return ""
  }

  // 녹음 차수를 교육 차수로 변환 - 기존 page와 완전히 동일
  const convertToEducationSlots = (recordingSlots: number[], educationType: any, date?: string, availabilityChecker?: (date: string, slot: number, language: string, educationType: string) => boolean) => {
    console.log(`🔄 변환 시작: 녹음슬롯=[${recordingSlots.join(',')}], 타입=${educationType.lang} ${educationType.mode}`)
    
    if (educationType.mode === '1:1') {
      // 1:1 교육: 총 16차수 존재, 녹음 1차수당 교육 4차수씩 매핑
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

  // 교육 신청 처리 - 기존 page와 완전히 동일
  const handleEducationApplication = async (date: string, slot: number, type: any) => {
    if (!authenticatedUser) {
      showAlert({
        title: '로그인 필요',
        message: '로그인이 필요합니다.',
        type: 'warning'
      })
      return
    }
    
    console.log('👤 [Mobile Education] 교육 신청:', { date, slot, type })
    
    try {
      const requestData = { 
        name: userInfo.name || authenticatedUser.name,
        employeeId: userInfo.employeeId || authenticatedUser.email?.split('@')[0] || 'TEMP001',
        department: userInfo.department || '승무원',
        date: date,
        slot: slot,
        type: 'education',
        details: {
          language: type.lang,
          educationType: type.mode === '1:1' ? '1:1' : 'small-group',
          category: (() => {
            // 일본어와 중국어는 분류가 없으므로 언어명만 사용
            if (type.lang === 'japanese') {
              return '일본어'
            } else if (type.lang === 'chinese') {
              return '중국어'
            }
            // 한/영만 신규/재자격/공통 분류 사용
            return type.category || '신규'
          })()
        }
      }

      console.log('📤 [Mobile Education] 신청 데이터:', requestData)

      // Database API 우선 시도
      const response = await fetch('/api/requests/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ [Mobile Education] Database 신청 성공:', result)
        
        const guidance = getEducationGuidance(type)
        showAlert({
          title: '🎉 교육 신청 완료!',
          message: `교육 신청이 성공적으로 완료되었습니다!

${guidance}`,
          type: 'success'
        })
        
        // 신청 내역 새로고침
        loadMyRequests()
        
        // 가용성 캐시 전체 클리어 (다른 사용자들도 업데이트된 정보를 보도록)
        setAvailabilityCache(new Map())
        
        // 모달 닫기
        setSelectedDate(null)
        setSelectedDaySchedules([])
      } else {
        const errorText = await response.text()
        console.error('❌ [Mobile Education] Database 신청 실패:', response.status, errorText)
        
        if (errorText.includes('신청기간만료')) {
          showAlert({
            title: '신청 기간 만료',
            message: '신청 기간이 만료되었습니다.',
            type: 'warning'
          })
        } else if (errorText.includes('이미 신청하셨습니다') || errorText.includes('이미 이번 달에 신청하셨습니다') || errorText.includes('언어별로 한 달에 한 번만 신청 가능')) {
          showAlert({
            title: '중복 신청',
            message: '이미 신청하셨습니다. 언어별로 한 달에 한 번만 신청 가능합니다.',
            type: 'warning'
          })
        } else if (errorText.includes('정원 마감')) {
          showAlert({
            title: '정원 마감',
            message: '정원이 마감되었습니다.',
            type: 'error'
          })
        } else {
          // Dropbox API 폴백
          console.log('🔄 [Mobile Education] Dropbox API 폴백 시도')
          const dropboxResponse = await fetch('/api/requests/dropbox', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
          })

          if (dropboxResponse.ok) {
            const dropboxResult = await dropboxResponse.json()
            console.log('✅ [Mobile Education] Dropbox 신청 성공:', dropboxResult)
            showAlert({
              title: '신청 완료',
              message: '교육 신청이 완료되었습니다!',
              type: 'success'
            })
            
            // 신청 내역 새로고침
            loadMyRequests()
            
            // 가용성 캐시 전체 클리어 (다른 사용자들도 업데이트된 정보를 보도록)
            setAvailabilityCache(new Map())
            
            // 모달 닫기
            setSelectedDate(null)
            setSelectedDaySchedules([])
          } else {
            const dropboxError = await dropboxResponse.text()
            console.error('❌ [Mobile Education] Dropbox 신청 실패:', dropboxError)
            showAlert({
              title: '신청 실패',
              message: '신청 처리 중 오류가 발생했습니다.',
              type: 'error'
            })
          }
        }
      }
    } catch (error) {
      console.error('❌ [Mobile Education] 신청 오류:', error)
      showAlert({
        title: '신청 실패',
        message: '신청 처리 중 오류가 발생했습니다.',
        type: 'error'
      })
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
      console.log('🔍 [Mobile Education Calendar] 신청 내역 조회 - employeeId:', employeeId)
      
      // Database API 우선 시도 (GET 방식)
      const res = await fetch(`/api/requests/database?employeeId=${employeeId}`)
      const data = await res.json()
      console.log('📄 [Mobile Education Calendar] 신청 내역 응답:', data)
      
      if (data.success && data.items) {
        const educationItems = data.items.filter((item: any) => item.type === 'education')
        setMyRequests(educationItems)
        console.log('✅ [Mobile Education Calendar] 신청 내역 로드 완료:', educationItems.length, '개')
      } else {
        console.log('⚠️ [Mobile Education Calendar] Database API 실패, Dropbox 시도')
        // Dropbox 폴백
        const dropboxRes = await fetch(`/api/requests/dropbox?employeeId=${employeeId}`)
        const dropboxData = await dropboxRes.json()
        
        if (dropboxData.success && dropboxData.items) {
          const educationItems = dropboxData.items.filter((item: any) => item.type === 'education')
          setMyRequests(educationItems)
          console.log('✅ [Mobile Education Calendar] Dropbox 신청 내역 로드 완료:', educationItems.length, '개')
        }
      }
    } catch (error) {
      console.error('❌ [Mobile Education Calendar] 신청 내역 로드 오류:', error)
    }
  }

  useEffect(() => {
    if (isOpen && authenticatedUser?.email) {
      console.log('🔄 [Mobile Education Calendar] 모달 열림, 스케줄 로드 시작')
      loadSchedules()
    }
  }, [isOpen, currentDate, authenticatedUser?.email])

  // userInfo가 로드되면 신청 내역 로드
  useEffect(() => {
    if (isOpen && authenticatedUser && userInfo.employeeId) {
      loadMyRequests()
    }
  }, [isOpen, authenticatedUser, userInfo.employeeId])

  // 캘린더 생성 (useMemo로 최적화)
  const calendarDays = useMemo(() => {
    console.log('📅 [Mobile Education Calendar] 캘린더 생성, 필터링된 스케줄 수:', filteredSchedules.length)
    
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
      const hasSchedule = filteredSchedules.some(schedule => {
        const scheduleHasEducation = schedule.date === dateStr && schedule.education && Object.keys(schedule.education).length > 0
        if (scheduleHasEducation) {
          console.log('📅 [Mobile Education Calendar] 스케줄 발견:', dateStr, schedule.education)
        }
        return scheduleHasEducation
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

    console.log('📅 [Mobile Education Calendar] 생성된 캘린더 일수:', days.length, '스케줄 있는 날:', days.filter(d => d.hasSchedule).length)
    return days
  }, [currentDate, filteredSchedules])

  // 날짜 선택
  const handleDateClick = (day: any) => {
    console.log('🖱️ [Mobile Education Calendar] 날짜 클릭:', {
      date: day.fullDate,
      hasSchedule: day.hasSchedule,
      isCurrentMonth: day.isCurrentMonth,
      schedulesCount: filteredSchedules.length
    })
    
    if (!day.hasSchedule || !day.isCurrentMonth) {
      console.log('❌ [Mobile Education Calendar] 클릭 차단:', { hasSchedule: day.hasSchedule, isCurrentMonth: day.isCurrentMonth })
      return
    }
    
    const daySchedules = filteredSchedules.filter(schedule => schedule.date === day.fullDate)
    console.log('📅 [Mobile Education Calendar] 해당 날짜 스케줄:', daySchedules)
    
    setSelectedDate(day.fullDate)
    setSelectedDaySchedules(daySchedules)
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
      const hasSchedule = filteredSchedules.some(s => s.date === dateStr)
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
        <div>
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 group"
            >
              <ChevronLeft className="w-6 h-6 text-gray-600 group-hover:text-gray-900" />
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">교육 신청</h1>
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md ${
                showFilters || filters.language !== 'all' || filters.category !== 'all' || filters.subcategory
                  ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-white'
              }`}
            >
              <Filter className="w-5 h-5" />
            </button>
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
      </div>

      {/* 컨텐츠 */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <span className="ml-3 text-gray-600">스케줄을 불러오는 중...</span>
          </div>
        ) : (
          <>
            {/* 필터 드롭다운 */}
            {showFilters && (
              <div className="mb-4 bg-white rounded-2xl shadow-lg border border-gray-100 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">필터</h3>
                  <button
                    onClick={resetFilters}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    초기화
                  </button>
                </div>
                
                {/* 언어 필터 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">언어</label>
                  <div className="relative">
                    <select
                      value={filters.language}
                      onChange={(e) => handleFilterChange('language', e.target.value)}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                    >
                      {filterOptions.languages.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                
                {/* 구분 필터 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">구분</label>
                  <div className="relative">
                    <select
                      value={filters.category}
                      onChange={(e) => handleFilterChange('category', e.target.value)}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                    >
                      {filterOptions.categories.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                
                {/* 한/영 세부 구분 필터 - 소규모일 때만 표시 */}
                {filters.language === 'korean-english' && filters.category === 'small-group' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">세부 구분</label>
                    <div className="relative">
                      <select
                        value={filters.subcategory || 'all'}
                        onChange={(e) => handleFilterChange('subcategory', e.target.value === 'all' ? '' : e.target.value)}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                      >
                        <option value="all">전체</option>
                        {filterOptions.subcategories['korean-english'].map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                )}
                
                {/* 활성 필터 표시 */}
                {(filters.language !== 'all' || filters.category !== 'all' || filters.subcategory) && (
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex flex-wrap gap-2">
                      {filters.language !== 'all' && (
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                          {filterOptions.languages.find(l => l.value === filters.language)?.label}
                        </Badge>
                      )}
                      {filters.category !== 'all' && (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-200">
                          {filterOptions.categories.find(c => c.value === filters.category)?.label}
                        </Badge>
                      )}
                      {filters.subcategory && (
                        <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200">
                          {filterOptions.subcategories['korean-english'].find(s => s.value === filters.subcategory)?.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* 캘린더 */}
            <div className="bg-gradient-to-br from-white to-purple-50/30 rounded-3xl shadow-xl p-6 mb-6 border border-purple-100/50">
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
                        day.isToday ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold shadow-lg scale-105' :
                        day.hasSchedule ? 'bg-gradient-to-br from-purple-400 to-indigo-500 text-white hover:shadow-lg hover:scale-105 cursor-pointer font-semibold' :
                        'text-gray-500 hover:bg-gray-50 cursor-not-allowed'}
                    `}
                    disabled={!day.hasSchedule || !day.isCurrentMonth}
                  >
                    <span className="relative z-10">{day.date}</span>
                    {day.hasSchedule && day.isCurrentMonth && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white shadow-sm animate-pulse"></div>
                    )}
                    {day.isToday && (
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-400/20 to-purple-500/20 animate-pulse"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 기존 page에서 복사한 완벽한 교육 모달 */}
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
                  
                  <div className="flex-1 overflow-hidden relative">
                  {/* 데스크톱과 동일한 보라색 헤더 */}
                  <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 rounded-t-3xl shadow-2xl overflow-hidden relative">
                    {/* 배경 패턴 */}
                    <div className="absolute inset-0">
                      <div className="absolute inset-0 opacity-30" style={{
                        backgroundImage: `radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
                                         radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.15) 0%, transparent 50%),
                                         radial-gradient(circle at 40% 80%, rgba(120, 119, 198, 0.2) 0%, transparent 50%)`
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
                          setSelectedDate(null)
                          setSelectedDaySchedules([])
                        }}
                        className="p-3 hover:bg-white/20 rounded-2xl transition-all duration-200 hover:scale-110 group m-6"
                      >
                        <svg className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
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
                            {selectedDaySchedules[0].education
                              .sort((a: any, b: any) => {
                                // 1. 언어별 우선순위: 한/영 → 일본어 → 중국어
                                const langPriority = {
                                  'korean-english': 1,
                                  'japanese': 2,
                                  'chinese': 3
                                };
                                const langA = langPriority[a.type.lang as keyof typeof langPriority] || 4;
                                const langB = langPriority[b.type.lang as keyof typeof langPriority] || 4;
                                
                                if (langA !== langB) {
                                  console.log(`📋 [모바일 정렬] 언어 우선순위: ${a.type.lang}(${langA}) vs ${b.type.lang}(${langB})`);
                                  return langA - langB;
                                }
                                
                                // 2. 같은 언어 내에서는 첫 번째 차수 기준으로 시간순 정렬
                                const firstSlotA = Math.min(...a.slots);
                                const firstSlotB = Math.min(...b.slots);
                                console.log(`⏰ [모바일 정렬] ${a.type.lang} 시간순: 차수${firstSlotA} vs 차수${firstSlotB}`);
                                return firstSlotA - firstSlotB;
                              })
                              .map((edu: any, idx: number) => {
                              // 기존 page와 완전히 동일한 로직
                              const convertedSlots = convertToEducationSlots(edu.slots, edu.type, selectedDate!, isSlotAvailable)
                              
                              return (
                                <div key={`modal-edu-${idx}`} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                                  <div className="mb-4">
                                    {/* 통일된 헤더 디자인 */}
                                    <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg p-3 border border-slate-200 mb-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          {/* 언어 배지 - 통일된 크기와 스타일 */}
                                          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                            edu.type.lang === 'korean-english' ? 'bg-blue-500 text-white' :
                                            edu.type.lang === 'japanese' ? 'bg-green-500 text-white' :
                                            edu.type.lang === 'chinese' ? 'bg-purple-500 text-white' :
                                            'bg-gray-500 text-white'
                                          }`}>
                                            {edu.type.lang === 'korean-english' ? '한/영' : 
                                             edu.type.lang === 'japanese' ? '일본어' : 
                                             edu.type.lang === 'chinese' ? '중국어' : '기타'}
                                          </div>
                                          
                                          {/* 모드 배지 - 통일된 크기와 스타일 */}
                                          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                            edu.type.mode === '1:1' ? 'bg-indigo-500 text-white' :
                                            'bg-orange-500 text-white'
                                          }`}>
                                            {edu.type.mode === '1:1' ? '💻 온라인' : '👥 소규모'}
                                          </div>
                                        </div>
                                        
                                        {/* 학과장 정보 - 통일된 스타일 */}
                                        {edu.type.mode === 'small' && ((edu as any).classroomInfo || (selectedDaySchedules.length > 0 && selectedDaySchedules[0]?.classroomInfo)) && (
                                          <div className="flex items-center gap-1 bg-amber-100 px-2 py-1 rounded-full border border-amber-300">
                                            <Building className="w-3 h-3 text-amber-700" />
                                            <span className="text-sm font-semibold text-amber-800">
                                              {(edu as any).classroomInfo || selectedDaySchedules[0].classroomInfo} 학과장
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* 소규모 교육 카테고리 - 별도 행으로 분리하여 깔끔하게 */}
                                      {edu.type.mode === 'small' && edu.type.lang === 'korean-english' && edu.type.category && (
                                        <div className="pt-2 border-t border-slate-200">
                                          <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                                            edu.type.category === '신규' ? 'bg-emerald-500 text-white' :
                                            edu.type.category === '재자격' ? 'bg-amber-500 text-white' :
                                            edu.type.category === '공통' ? 'bg-slate-500 text-white' :
                                            edu.type.category === 'PUS' ? 'bg-violet-500 text-white' :
                                            'bg-gray-500 text-white'
                                          }`}>
                                            {edu.type.category === '신규' ? '✨' :
                                             edu.type.category === '재자격' ? '🔄' :
                                             edu.type.category === '공통' ? '👥' :
                                             edu.type.category === 'PUS' ? '✈️' : '📚'}
                                            <span>{edu.type.category}</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    <div className="mt-2 text-sm text-gray-600">
                                      <p><strong>진행 시간:</strong> {edu.type.mode === '1:1' ? '25분' : '1시간 50분'} · 총 {convertedSlots.length}개 차수</p>
                                    </div>
                                    {edu.type.lang === 'korean-english' && edu.type.mode === 'small' && (
                                      <div className="mt-3 space-y-2">
                                        <div className="text-sm font-medium text-gray-700 mb-2">📋 교육 대상 안내</div>
                                        <div className={`p-2 rounded-md text-sm ${
                                          edu.type.category === '신규' ? 'bg-emerald-50 border border-emerald-200' :
                                          edu.type.category === '재자격' ? 'bg-amber-50 border border-amber-200' :
                                          (edu.type.category === '공통' || edu.type.category === 'PUS') ? 'bg-slate-50 border border-slate-200' :
                                          'bg-gray-50 border border-gray-200'
                                        }`}>
                                          {edu.type.category === '신규' && (
                                            <p className="font-semibold text-emerald-800">
                                              ✨ <strong>신규:</strong> 기내방송 자격이 없는 승무원 대상
                                            </p>
                                          )}
                                          {edu.type.category === '재자격' && (
                                            <p className="font-semibold text-amber-800">
                                              🔄 <strong>재자격:</strong> 자격 갱신 또는 상위 등급이 목표인 승무원 대상
                                            </p>
                                          )}
                                          {edu.type.category === '공통' && (
                                            <p className="font-semibold text-slate-800">
                                              👥 <strong>공통:</strong> 자격 무관 (누구나 신청 가능)
                                            </p>
                                          )}
                                          {edu.type.category === 'PUS' && (
                                            <div className="space-y-1">
                                              <p className="font-semibold text-violet-800">
                                                ✈️ <strong>PUS:</strong> PUS 승무원 전용
                                              </p>
                                              <p className="text-slate-700 text-xs">
                                                💡 PUS 승무원은 자격 무관하게 신청 가능합니다
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                        
                                        {/* 다른 카테고리들도 참고용으로 작게 표시 */}
                                        {edu.type.category !== '신규' && edu.type.category !== '재자격' && edu.type.category !== '공통' && edu.type.category !== 'PUS' && (
                                          <div className="text-xs text-gray-500 space-y-1">
                                            <p>참고: 신규(자격없음) · 재자격(갱신목적) · 공통(자격무관)</p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {convertedSlots.map((slot: number) => {
                                      // 가용성 확인 - 기존 page와 완전히 동일
                                      const educationType = edu.type.mode === '1:1' ? '1:1' : 'small-group'
                                      const isAvailable = isSlotAvailable(selectedDate!, slot, edu.type.lang, educationType)
                                      const currentApplicants = getCurrentApplicants(selectedDate!, slot, edu.type.lang, educationType)
                                      
                                      return (
                                        <button
                                          key={slot}
                                          onClick={() => {
                                            if (isAvailable) {
                                              // 기존 page와 완전히 동일 - edu.type 전체 전달
                                              handleEducationApplication(selectedDate!, slot, edu.type)
                                            }
                                          }}
                                          className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${
                                            isAvailable
                                              ? 'border-indigo-300 bg-gradient-to-br from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 text-indigo-800 hover:border-indigo-400 hover:shadow-md transform hover:scale-105'
                                              : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                                          }`}
                                          disabled={!isAvailable}
                                        >
                                          <div className="text-center">
                                            <div className="text-sm font-bold">{slot}차수</div>
                                            <div className="text-xs mt-1">
                                              {getEducationSlotTime(edu.type, slot)}
                                            </div>
                                            {edu.type.mode === 'small' && (
                                              <div className="text-xs text-gray-600 mt-1">
                                                {currentApplicants}/4명
                                              </div>
                                            )}
                                            {edu.type.mode === '1:1' && !isAvailable && (
                                              <div className="text-xs text-red-500 mt-1">
                                                예약됨
                                              </div>
                                            )}
                                          </div>
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
                          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>이 날짜에는 예정된 교육이 없습니다.</p>
                        </div>
                      )}
                    </div>
                  </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 커스텀 다이얼로그 */}
      {educationDialogOpen && (
        <CustomDialog
          isOpen={educationDialogOpen}
          onClose={educationDialogClose}
          title={educationDialogConfig.title}
          message={educationDialogConfig.message}
          type={educationDialogConfig.type}
          showCancel={educationDialogConfig.showCancel}
          confirmText={educationDialogConfig.confirmText}
          cancelText={educationDialogConfig.cancelText}
          onConfirm={educationDialogConfig.onConfirm}
          onCancel={educationDialogConfig.onCancel}
        />
      )}
    </BottomSheet>
  )
}
