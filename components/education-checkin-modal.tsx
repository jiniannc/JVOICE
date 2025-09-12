"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BottomSheet } from "@/components/ui/bottom-sheet"
import { CustomDialog } from "@/components/ui/custom-dialog"
import { useCustomDialog } from "@/hooks/use-custom-dialog"
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
  // 드래그 관련 상태는 BottomSheet 컴포넌트에서 처리
  
  const educationDialogHook = useCustomDialog()
  const { isOpen: educationDialogOpen, config: educationDialogConfig, close: educationDialogClose, showAlert } = educationDialogHook

  const loadEducationRequests = async () => {
    if (!userInfo.employeeId) return
    
    try {
      setLoading(true)
      setError(null)
      
      // 데스크톱과 동일한 Database API 우선 사용 (스케줄 정보 포함)
      let response = await fetch(`/api/requests/database?employeeId=${userInfo.employeeId}&type=education&includeSchedule=true`)
      let allRequests: any[] = []
      
      if (response.ok) {
        const data = await response.json()
        console.log('🎓 [Database] 교육 신청 내역 응답:', data)
        
        if (data.success && data.items) {
          // Database API 응답을 기존 형식으로 변환 (스케줄 정보 포함)
          allRequests = data.items.map((item: any) => ({
            id: item.id,
            type: item.type,
            date: item.date,
            slot: item.slot,
            details: item.details,
            applicationTime: item.appliedAt,
            requestedAt: item.appliedAt,
            status: item.status,
            schedule: item.schedule // 스케줄 정보 추가
          }))
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
              5: '10:30-10:55', 6: '11:00-11:25', 7: '11:30-11:55', 8: '12:00-12:25', 9: '13:00-13:25'
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
              // 이미 "학과장"이 포함되어 있으면 그대로 사용, 없으면 추가
              if (scheduleClassroom.includes('학과장')) {
                classroom = scheduleClassroom
              } else {
                classroom = `${scheduleClassroom} 학과장`
              }
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
      const response = await fetch('/api/education/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          educationId,
          employeeId: userInfo.employeeId,
          name: userInfo.name,
          checkinTime: new Date().toISOString()
        })
      })

      if (response.ok) {
        showAlert({
          title: '체크인 완료',
          message: '교육 체크인이 완료되었습니다!',
          type: 'success'
        })
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
    // 브라우저 로컬 시간 기준으로 비교
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
        return <Badge className="bg-green-600 text-white">체크인 가능</Badge>
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
            <div className="space-y-4">
              <div className="text-sm text-gray-600 text-center">
                📅 신청한 교육 목록
              </div>
              
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
