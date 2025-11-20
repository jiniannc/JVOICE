"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BottomSheet } from "@/components/ui/bottom-sheet"
import { CustomDialog } from "@/components/ui/custom-dialog"
import { useCustomDialog } from "@/hooks/use-custom-dialog"
import { checkTimeRestrictionsDisabled, getEducationCheckinStatus } from "@/lib/time-restrictions"
import { 
  GraduationCap,
  Clock,
  User,
  MapPin,
  CheckCircle,
  X,
  Loader2,
  Calendar,
  Video,
  AlertCircle
} from "lucide-react"

interface UserInfo {
  name: string
  employeeId: string
  email?: string
  department?: string
}

interface EducationRequest {
  id: string
  date: string
  startTime: string
  endTime: string
  instructor?: string
  location: string
  language: string
  mode: '1:1' | 'small-group'
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  description?: string
  requestedAt: string
  googleMeetLink?: string
  slot: number
  category?: string
  isCheckedIn?: boolean
  details?: {
    language?: string
    mode?: string
    educationType?: string
    category?: string
  }
}

interface EducationCheckinModalProps {
  isOpen: boolean
  onClose: () => void
  userInfo: UserInfo
}

export function EducationCheckinModal({ isOpen, onClose, userInfo }: EducationCheckinModalProps) {
  const [educationRequests, setEducationRequests] = useState<EducationRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkinLoading, setCheckinLoading] = useState<string | null>(null)
  const [meetLinkLoading, setMeetLinkLoading] = useState<string | null>(null)
  const [checkedInEducations, setCheckedInEducations] = useState<Set<string>>(new Set())
  const [timeRestrictionsDisabled, setTimeRestrictionsDisabled] = useState(false)
  // 드래그 관련 상태는 BottomSheet 컴포넌트에서 처리
  
  const educationDialogHook = useCustomDialog()
  const { isOpen: educationDialogOpen, config: educationDialogConfig, close: educationDialogClose, showAlert } = educationDialogHook

  const loadEducationRequests = async () => {
    if (!userInfo.employeeId) return
    
    try {
      setLoading(true)
      setError(null)
      
      // 시간 제한 상태 확인
      const restrictionsDisabled = await checkTimeRestrictionsDisabled()
      setTimeRestrictionsDisabled(restrictionsDisabled)
      console.log('🎓 [Education Checkin] 시간 제한 상태:', restrictionsDisabled ? '비활성화' : '활성화')
      
      // 데스크톱과 동일한 Database API 우선 사용 (스케줄 정보 포함)
      let response = await fetch(`/api/requests/database?employeeId=${userInfo.employeeId}&type=education&includeSchedule=true`)
      let allRequests: any[] = []
      
      if (response.ok) {
        const data = await response.json()
        console.log('🎓 [Database] 교육 신청 내역 응답:', data)
        
        if (data.success && data.items) {
          // 교실 정보 로드를 위한 스케줄 데이터 수집
          const uniqueDates = new Set<string>()
          data.items.forEach((item: any) => {
            if (item.type === 'education') {
              uniqueDates.add(item.date)
            }
          })
          
          // 교실 정보 맵 생성
          const educationClassroomMap = new Map<string, string>()
          
          if (uniqueDates.size > 0) {
            const months = Array.from(uniqueDates).map(date => date.slice(0, 7))
            const uniqueMonths = [...new Set(months)]
            
            for (const month of uniqueMonths) {
              try {
                console.log(`🔍 [Education Checkin] ${month} 월 스케줄 로드 중...`)
                const scheduleRes = await fetch(`/api/schedules?month=${month}`)
                if (scheduleRes.ok) {
                  const scheduleData = await scheduleRes.json()
                  console.log(`📅 [Education Checkin] ${month} 스케줄 응답:`, scheduleData)
                  
                  if (scheduleData.data?.days) {
                    scheduleData.data.days.forEach((day: any) => {
                      console.log(`🔍 [Education Checkin] 날짜 ${day.date} 교육 데이터:`, day.education)
                      if (day.education && Array.isArray(day.education)) {
                        day.education.forEach((edu: any) => {
                          console.log(`🔍 [Education Checkin] 교육 객체:`, edu)
                          if (edu.classroomInfo && edu.type && edu.slots) {
                            edu.slots.forEach((slot: number) => {
                              // 카테고리가 있는 경우와 없는 경우 모두 처리 (모바일과 완전히 동일)
                              if (edu.type.category) {
                                // 카테고리별 키 (한/영 소규모)
                                const categoryKey = `${day.date}_${slot}_${edu.type.lang}_${edu.type.mode}_${edu.type.category}`
                                educationClassroomMap.set(categoryKey, edu.classroomInfo)
                                console.log(`✅ [Education Checkin] 카테고리별 교실 정보: ${categoryKey} → ${edu.classroomInfo}`)
                              } else {
                                // 기본 키 (카테고리 없는 교육: 일본어/중국어, 1:1)
                                const baseKey = `${day.date}_${slot}_${edu.type.lang}_${edu.type.mode}`
                                educationClassroomMap.set(baseKey, edu.classroomInfo)
                                console.log(`✅ [Education Checkin] 기본 교실 정보: ${baseKey} → ${edu.classroomInfo}`)
                              }
                            })
                          }
                        })
                      }
                    })
                  }
                }
              } catch (error) {
                console.warn(`교육 체크인 클래스룸 정보 로드 실패 (${month}):`, error)
              }
            }
          }
          
          console.log('🏫 [Education Checkin] 교실 정보 맵:', Object.fromEntries(educationClassroomMap))
          
          // 교육 항목에 클래스룸 정보 추가 (모바일 MyPage와 완전히 동일한 로직)
          const enrichedItems = data.items.map((item: any) => {
            const language = item.details?.language || 'korean-english';
            const mode = item.details?.mode || item.details?.educationType || '1:1';
            const category = item.details?.category;
            const normalizedMode = mode === 'small-group' ? 'small' : mode;
            
            console.log(`🔍 [Education Checkin] 원본 신청 데이터:`, {
              date: item.date,
              slot: item.slot,
              details: item.details,
              schedule: item.schedule,
              language,
              mode,
              category,
              normalizedMode,
              expectedCategoryKey: `${item.date}_${item.slot}_${language}_${normalizedMode}_${category}`,
              expectedBaseKey: `${item.date}_${item.slot}_${language}_${normalizedMode}`
            });
            
            // 클래스룸 정보 매칭 (스케줄 API 우선)
            let classroomInfo = null;
            
            // 1. Database API에서 제공하는 클래스룸 정보 확인
            if (item.schedule?.classroom) {
              console.log(`🚨 [Education Checkin] Database API 클래스룸 발견: ${item.schedule.classroom} (카테고리: ${category})`);
              // 카테고리별 매칭을 우선 시도하고, 실패하면 Database API 사용
            }
            
            // 2. 스케줄 API 매칭 우선 시도
            {
              // 소규모 교육의 경우 차수를 녹음 슬롯으로 변환
              let actualSlots = [item.slot];
              if (normalizedMode === 'small') {
                // 소규모 교육: 차수 → 녹음 슬롯 변환
                const slotMapping = {
                  1: [1, 2], 2: [3, 4], 3: [5, 6], 4: [7, 8]
                };
                actualSlots = slotMapping[item.slot as keyof typeof slotMapping] || [item.slot];
                console.log(`🔄 [Education Checkin] 소규모 차수 변환: ${item.slot}차 → 녹음슬롯 [${actualSlots}]`);
              }
              
              // 각 녹음 슬롯에 대해 카테고리별 키 시도
              if (category && language === 'korean-english' && normalizedMode === 'small') {
                for (const slot of actualSlots) {
                  const categoryKey = `${item.date}_${slot}_${language}_${normalizedMode}_${category}`;
                  classroomInfo = educationClassroomMap.get(categoryKey);
                  console.log(`🔍 [Education Checkin] 카테고리 키 시도: ${categoryKey} → ${classroomInfo}`);
                  if (classroomInfo) break;
                }
              }
              
              // 기본 키 시도 (카테고리 없는 교육이거나 카테고리별 매칭 실패)
              if (!classroomInfo) {
                for (const slot of actualSlots) {
                  const baseKey = `${item.date}_${slot}_${language}_${normalizedMode}`;
                  classroomInfo = educationClassroomMap.get(baseKey);
                  console.log(`🔍 [Education Checkin] 기본 키 시도: ${baseKey} → ${classroomInfo}`);
                  if (classroomInfo) break;
                }
              }
              
              // 스케줄 API 매칭 실패 시 Database API 폴백
              if (!classroomInfo && item.schedule?.classroom) {
                classroomInfo = item.schedule.classroom;
                console.log(`🔄 [Education Checkin] Database API 폴백: ${classroomInfo}`);
              }
            }
            
            // 클래스룸 정보 포맷팅
            const formattedClassroom = classroomInfo || '';
            console.log(`✅ [Education Checkin] 최종 교실 정보: ${item.date}_${item.slot} → ${classroomInfo} → ${formattedClassroom}`);
            classroomInfo = formattedClassroom;
            
            return {
            id: item.id,
            type: item.type,
            date: item.date,
            slot: item.slot,
            details: item.details,
            applicationTime: item.appliedAt,
            requestedAt: item.appliedAt,
            status: item.status,
              schedule: item.schedule, // 스케줄 정보 추가
              classroomInfo: classroomInfo // 클래스룸 정보 추가
            }
          })
          
          allRequests = enrichedItems
          
          console.log('📊 [Education Checkin] 교육 신청 내역 (클래스룸 정보 포함):', allRequests)
        }
      } else {
        // Database API 실패시 Dropbox API로 fallback
        console.log('🔄 [Database] 실패, Dropbox API로 fallback')
        response = await fetch(`/api/requests/dropbox?employeeId=${userInfo.employeeId}`)
        if (response.ok) {
          const data = await response.json()
          console.log('🎓 [Dropbox] 교육 신청 내역 응답:', data)
          allRequests = data.requests || []
        } else {
          throw new Error('교육 신청 내역을 불러올 수 없습니다.')
        }
      }

      // 체크인 상태 확인
      const checkinResponse = await fetch(`/api/education/checkin?employeeId=${userInfo.employeeId}`, {
        method: 'GET'
      })
      
      const checkinData = checkinResponse.ok ? await checkinResponse.json() : { checkins: [] }
      const checkinMap = new Map()
      if (checkinData.checkins) {
        checkinData.checkins.forEach((checkin: any) => {
          checkinMap.set(checkin.requestId, true)
        })
      }
      
      console.log('🎓 체크인 상태 확인:', checkinMap)
      
      // 교육 타입만 필터링하고 신청된 모든 활성 교육을 체크인 가능하게 변경
      const educationRequests = allRequests.filter((req: any) => req.type === 'education')
      
      // 모든 활성 교육 (신청 즉시 체크인 가능)
      const activeEducations = educationRequests.filter((req: any) => {
        return req.status === 'ACTIVE'
      }).map((req: any) => {
        // 차수별 시간 정보 계산
        const getSlotTime = (slot: number, educationType: string) => {
          if (educationType === '1:1') {
            const timeMap: Record<number, string> = {
              1: '08:30-08:55', 2: '09:00-09:25', 3: '09:30-09:55', 4: '10:00-10:25',
              5: '10:30-10:55', 6: '11:00-11:25', 7: '11:30-11:55', 8: '12:00-12:25',
              9: '13:35-14:00', 10: '14:05-14:30', 11: '14:35-15:00', 12: '15:05-15:30',
              13: '15:35-16:00', 14: '16:05-16:30', 15: '16:35-17:00', 16: '17:05-17:30'
            }
            return timeMap[slot] || '시간미정'
          } else if (educationType === 'small-group') {
            const timeMap: Record<number, string> = {
              1: '08:30-10:20', 2: '10:30-12:20', 3: '13:40-15:30', 4: '15:40-17:30'
            }
            return timeMap[slot] || '시간미정'
          }
          return '시간미정'
        }

        const educationType = (() => {
          const classType = req.schedule?.classType
          if (classType === 'small') return 'small-group'
          if (classType === '1:1') return '1:1'
          const detailType = req.details?.educationType
          if (detailType) return detailType
          const mode = req.details?.mode
          if (mode === '1:1') return '1:1'
          if (mode === 'small-group' || mode === 'small') return 'small-group'
          return 'small-group'
        })()
        const slotTime = getSlotTime(req.slot, educationType)
        const [startTime, endTime] = slotTime.split('-')
        
        // 장소 정보 (소규모만 표시) - req.classroomInfo를 우선 사용
        const getLocation = () => {
          if (educationType === 'small-group') {
            // 1순위: req.classroomInfo 사용 (MyPage와 동일한 로직)
            let classroom = req.classroomInfo?.trim()
            
            if (classroom) {
              console.log('✅ [Education Checkin] classroomInfo 사용:', classroom)
              return classroom
            }
            
            // 2순위: fallback으로 스케줄 정보에서 교실 정보 사용
            const scheduleClassroom = req.schedule?.classroom?.trim()
            if (scheduleClassroom) {
              classroom = scheduleClassroom
              console.log('🔄 [Education Checkin] 스케줄 fallback 사용:', classroom)
              return classroom
            }
            
            // 교실 정보가 없으면 빈 문자열 반환
            console.warn('⚠️ [Education Checkin] 교실 정보 없음:', { 
              date: req.date, 
              language: req.details?.language,
              classroomInfo: req.classroomInfo,
              schedule: req.schedule 
            })
            return ''
          }
          return '' // 1:1은 장소 표시 안함
        }

        const requestId = req.id || `${req.employeeId}_${req.date}_${req.slot}`
        const isAlreadyCheckedIn = checkinMap.has(requestId)

        return {
          id: requestId,
          date: req.date,
          slot: req.slot,
          startTime: startTime || '09:00',
          endTime: endTime || '10:00',
          location: getLocation(),
          language: req.details?.language || '미정',
          mode: educationType,
          status: req.status,
          category: (() => {
            const language = req.details?.language
            // 일본어와 중국어는 분류가 없으므로 빈 문자열 또는 언어명 반환
            if (language === 'japanese') {
              return '일본어'
            } else if (language === 'chinese') {
              return '중국어'
            }
            // 한/영만 신규/재자격/공통 분류 사용
            return req.details?.category || '신규'
          })(),
          requestedAt: req.requestedAt || req.applicationTime,
          googleMeetLink: req.details?.googleMeetLink,
          isCheckedIn: isAlreadyCheckedIn // 서버에서 확인한 체크인 상태
        }
      })
      
      console.log('🎓 신청된 모든 활성 교육:', activeEducations)
      // 정렬: 미체크인 우선, 체크인 완료 항목은 최신 날짜가 위로
      const unchecked = activeEducations.filter((e: any) => !e.isCheckedIn)
      const checkedSorted = activeEducations
        .filter((e: any) => e.isCheckedIn)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setEducationRequests([...unchecked, ...checkedSorted])
    } catch (error) {
      console.error('교육 신청 내역 로드 실패:', error)
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && userInfo.employeeId) {
      loadEducationRequests()
    }
  }, [isOpen, userInfo.employeeId])

  const handleCheckin = async (educationId: string) => {
    setCheckinLoading(educationId)
    try {
      // 체크인하려는 교육의 정보 찾기
      const education = educationRequests.find(req => req.id === educationId)
      const isKoreanEnglishSmall = education?.details?.language === 'korean-english' && 
                                   (education?.details?.mode === 'small' || education?.details?.mode === 'small-group')
      
      console.log('🔍 [Education Checkin] 체크인 교육 정보:', {
        educationId,
        language: education?.details?.language,
        mode: education?.details?.mode,
        isKoreanEnglishSmall
      })

      const response = await fetch('/api/education/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          educationId,
          employeeId: userInfo.employeeId,
          name: userInfo.name,
          checkinTime: new Date().toISOString(),
          isKoreanEnglishSmall // 한영 소규모 여부 전달
        })
      })

      if (response.ok) {
        // 한영 소규모 교육 체크인 시 특별한 메시지와 함께 상세 평가 권한 부여
        if (isKoreanEnglishSmall) {
          showAlert({
            title: '체크인 완료 🎉',
            message: '한영 소규모 교육 체크인이 완료되었습니다!\n이제 Review 모드에서 상세 평가 결과를 확인할 수 있습니다.',
            type: 'success'
          })
          
          // 로컬 스토리지에 한영 소규모 체크인 기록 저장
          const normalizedEmployeeId = String(userInfo.employeeId || '').trim()
          const checkinRecord = {
            employeeId: normalizedEmployeeId,
            name: userInfo.name,
            educationId,
            educationLanguage: education?.details?.language,
            educationMode: education?.details?.mode,
            checkinTime: new Date().toISOString(),
            hasDetailedReviewAccess: true
          }
          
          const existingRecords = JSON.parse(localStorage.getItem('koreanEnglishSmallCheckins') || '[]')
          
          // 중복 체크인 방지 (같은 사번의 기록은 업데이트)
          const filteredRecords = existingRecords.filter((r: any) => 
            String(r.employeeId || '').trim() !== normalizedEmployeeId
          )
          filteredRecords.push(checkinRecord)
          
          localStorage.setItem('koreanEnglishSmallCheckins', JSON.stringify(filteredRecords))
          
          console.log('✅ [Education Checkin] 한영 소규모 체크인 기록 저장:', checkinRecord)
          console.log('📋 [Education Checkin] 전체 체크인 기록:', filteredRecords)
        } else {
        showAlert({
          title: '체크인 완료',
          message: '교육 체크인이 완료되었습니다!',
          type: 'success'
        })
        }
        
        // 체크인 완료된 교육 ID를 상태에 추가
        setCheckedInEducations(prev => new Set(prev).add(educationId))
        // 체크인 후 목록 새로고침
        loadEducationRequests()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || '체크인에 실패했습니다.')
      }
    } catch (error) {
      console.error('체크인 실패:', error)
      showAlert({
        title: '체크인 실패',
        message: error instanceof Error ? error.message : '체크인 중 오류가 발생했습니다.',
        type: 'error'
      })
    } finally {
      setCheckinLoading(null)
    }
  }

  // 구글 미트 생성 기능 제거 - 교관만 생성 가능

  // 터치 이벤트는 BottomSheet 컴포넌트에서 처리

  const formatTime = (timeStr: string) => {
    if (!timeStr || timeStr === '00:00') return '시간 미정'
    return timeStr
  }

  const getTimeStatus = (dateStr: string, startTime: string, endTime: string) => {
    if (!dateStr || !startTime) return 'early'
    
    // 시간 제한이 비활성화된 경우 항상 체크인 가능
    if (timeRestrictionsDisabled) {
      console.log('🎓 [Education Checkin] 시간 제한 비활성화로 체크인 가능')
      return 'available'
    }
    
    // 기존 로직: 브라우저 로컬 시간 기준으로 비교
    const start = new Date(`${dateStr}T${startTime}:00`)
    const end = endTime ? new Date(`${dateStr}T${endTime}:00`) : null
    const now = new Date()
    const startMinus30 = new Date(start.getTime() - 30 * 60 * 1000)

    if (now < startMinus30) return 'early'
    if (end && now > end) return 'late'
    return 'available'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'early':
        return <Badge variant="secondary">체크인 준비중</Badge>
      case 'available':
        return (
          <Badge className={`${timeRestrictionsDisabled ? 'bg-orange-600' : 'bg-green-600'} text-white`}>
            {timeRestrictionsDisabled ? '체크인 가능 (테스트모드)' : '체크인 가능'}
          </Badge>
        )
      case 'late':
        return <Badge variant="destructive">체크인 마감</Badge>
      default:
        return <Badge variant="outline">시간 미정</Badge>
    }
  }

  return (
    <>
    <BottomSheet 
      isOpen={isOpen} 
      onClose={onClose}
      height="80vh"
      title="교육 체크인"
      className="overflow-hidden"
    >
      <div className="px-6 pb-6">
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-green-600" />
              <p className="text-gray-600">오늘의 교육 일정을 확인하는 중...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
              <p className="text-red-600 mb-2">오류 발생</p>
              <p className="text-sm text-gray-600">{error}</p>
              <Button 
                onClick={loadEducationRequests}
                variant="outline" 
                className="mt-4"
              >
                다시 시도
              </Button>
            </div>
          ) : educationRequests.length === 0 ? (
            <div className="text-center py-8">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-600 mb-2">신청한 교육이 없습니다</p>
              <p className="text-sm text-gray-500">
                교육 신청을 먼저 해주세요
              </p>
            </div>
          ) : (
            <div className="space-y-4 pt-4">
              
              {educationRequests.map((education) => {
                const timeStatus = getTimeStatus(education.date, education.startTime, education.endTime)
                const canCheckin = timeStatus === 'available'
                const isCheckedIn = education.isCheckedIn || checkedInEducations.has(education.id) // 서버 상태 우선
                
                return (
                  <Card key={education.id} className="border">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* 날짜 정보 추가 */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium text-blue-600">
                              {new Date(education.date).toLocaleDateString('ko-KR', {
                                month: 'long',
                                day: 'numeric',
                                weekday: 'short'
                              })}
                            </span>
                          </div>
                          {getStatusBadge(timeStatus)}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">
                              {education.slot}차수 {formatTime(education.startTime)} - {formatTime(education.endTime)}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600">
                          {/* 소규모 교육인 경우에만 장소 표시 */}
                          {education.mode === 'small-group' && education.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>장소: {education.location}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4" />
                            <span>
                              {education.language === 'korean-english' ? '한/영' : 
                               education.language === 'japanese' ? '일본어' : 
                               education.language === 'chinese' ? '중국어' : education.language}
                              {education.mode === '1:1' ? ' (1:1 교육)' : ` (소규모 교육 - ${education.category})`}
                            </span>
                          </div>
                        </div>

                        {/* 체크인 버튼 */}
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleCheckin(education.id)}
                            disabled={!canCheckin || checkinLoading === education.id || isCheckedIn}
                            className={`flex-1 ${
                              isCheckedIn 
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : canCheckin 
                                  ? 'bg-green-600 hover:bg-green-700' 
                                  : ''
                            }`}
                            variant={canCheckin && !isCheckedIn ? "default" : "outline"}
                          >
                            {checkinLoading === education.id ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                체크인 중...
                              </>
                            ) : isCheckedIn ? (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                체크인 완료
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                {canCheckin ? "체크인" : "체크인 불가"}
                              </>
                            )}
                          </Button>

                          {/* 1:1 교육인 경우 Google Meet 버튼 (교관이 생성한 링크만 표시) */}
                          {education.mode === '1:1' && canCheckin && education.googleMeetLink && (
                            <Button
                              onClick={() => window.open(education.googleMeetLink, '_blank')}
                              variant="outline"
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              <Video className="w-4 h-4 mr-2" />
                              교육 입장
                            </Button>
                          )}
                        </div>

                        {/* 테스트용: 시간 제한 메시지 제거 */}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
      </div>
    </BottomSheet>

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

  </>
  )
}
