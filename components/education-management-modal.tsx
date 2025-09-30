"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BottomSheet } from "@/components/ui/bottom-sheet"
import { CustomDialog } from "@/components/ui/custom-dialog"
import { useCustomDialog } from "@/hooks/use-custom-dialog"
import { 
  Monitor,
  Users,
  FileText,
  RefreshCw,
  Clock,
  User,
  MapPin,
  CheckCircle,
  X,
  Loader2,
  Calendar,
  Video,
  AlertCircle,
  GraduationCap
} from "lucide-react"
import { EducationJournalTab } from "./education-journal-tab"

interface UserInfo {
  name: string
  employeeId: string
  email?: string
  department?: string
  isInstructor?: boolean
  isAdmin?: boolean
}

interface EducationAttendee {
  id: string
  name: string
  employeeId: string
  department?: string
  date: string
  slot: number
  educationType: '1:1' | 'small-group'
  language: string
  category?: string
  isCheckedIn: boolean
  checkinTime?: string
  googleMeetLink?: string
  location?: string
}

interface EducationManagementModalProps {
  isOpen: boolean
  onClose: () => void
  userInfo: UserInfo
}

export function EducationManagementModal({ isOpen, onClose, userInfo }: EducationManagementModalProps) {
  const [activeTab, setActiveTab] = useState<'attendance' | 'journal'>('attendance')
  const [attendanceData, setAttendanceData] = useState<EducationAttendee[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all')
  
  const dialogHook = useCustomDialog()
  const { isOpen: dialogOpen, config: dialogConfig, close: dialogClose, showAlert } = dialogHook

  // 교육 출석 현황 데이터 로드
  const loadAttendanceData = async (forceRefresh = false) => {
    if (!userInfo.employeeId || (!userInfo.isInstructor && !userInfo.isAdmin)) {
      setError('교관 또는 관리자 권한이 필요합니다.')
      return
    }

    try {
      if (forceRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      console.log('📊 [Education Management] 출석 현황 로드 시작:', {
        date: selectedDate,
        instructor: userInfo.employeeId
      })

      // 선택된 날짜의 교육 신청자 목록 조회
      const response = await fetch(`/api/education-applicants?date=${selectedDate}&includeCheckins=true`)
      
      if (!response.ok) {
        throw new Error('출석 현황을 불러올 수 없습니다.')
      }

      const data = await response.json()
      console.log('📊 [Education Management] 출석 현황 응답:', data)

      if (data.success && data.applicants) {
        // 교육 신청자 데이터를 EducationAttendee 형태로 변환
        const attendees: EducationAttendee[] = data.applicants.map((applicant: any) => ({
          id: applicant.id || `${applicant.employeeId}_${applicant.date}_${applicant.slot}`,
          name: applicant.name,
          employeeId: applicant.employeeId,
          department: applicant.department,
          date: applicant.date,
          slot: applicant.slot,
          educationType: applicant.details?.mode === 'small-group' || applicant.details?.mode === 'small' ? 'small-group' : '1:1',
          language: applicant.details?.language || 'korean-english',
          category: applicant.details?.category,
          isCheckedIn: applicant.isCheckedIn || false,
          checkinTime: applicant.checkinTime,
          googleMeetLink: applicant.googleMeetLink,
          location: applicant.location || applicant.classroomInfo
        }))

        setAttendanceData(attendees)
        console.log('✅ [Education Management] 출석 현황 로드 완료:', attendees.length, '명')
      } else {
        setAttendanceData([])
      }
    } catch (error) {
      console.error('교육 출석 현황 로드 실패:', error)
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // 모달이 열릴 때 데이터 로드
  useEffect(() => {
    if (isOpen && userInfo.employeeId) {
      loadAttendanceData()
    }
  }, [isOpen, userInfo.employeeId, selectedDate])

  // 새로고침 버튼 핸들러
  const handleRefresh = () => {
    loadAttendanceData(true)
  }

  // Google Meet 링크 생성 (1:1 교육용)
  const handleCreateMeetLink = async (attendeeId: string) => {
    try {
      const response = await fetch('/api/requests/generate-meet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: attendeeId,
          instructorId: userInfo.employeeId
        })
      })

      if (response.ok) {
        const data = await response.json()
        showAlert({
          title: 'Google Meet 링크 생성 완료',
          message: `Google Meet 링크가 생성되었습니다.\n교육생이 체크인 시 자동으로 표시됩니다.`,
          type: 'success'
        })
        // 데이터 새로고침
        loadAttendanceData(true)
      } else {
        throw new Error('Google Meet 링크 생성에 실패했습니다.')
      }
    } catch (error) {
      console.error('Google Meet 링크 생성 실패:', error)
      showAlert({
        title: 'Google Meet 링크 생성 실패',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        type: 'error'
      })
    }
  }

  // 시간 포맷팅
  const formatSlotTime = (slot: number, educationType: string) => {
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

  // 시간 기준 정렬을 위한 시작 시간 추출 함수
  const getStartTime = (slot: number, educationType: string): number => {
    if (educationType === '1:1') {
      const timeMap: Record<number, number> = {
        1: 830, 2: 900, 3: 930, 4: 1000,
        5: 1030, 6: 1100, 7: 1130, 8: 1200,
        9: 1335, 10: 1405, 11: 1435, 12: 1505,
        13: 1535, 14: 1605, 15: 1635, 16: 1705
      }
      return timeMap[slot] || 9999 // 시간미정인 경우 맨 뒤로
    } else if (educationType === 'small-group') {
      const timeMap: Record<number, number> = {
        1: 830, 2: 1030, 3: 1340, 4: 1540
      }
      return timeMap[slot] || 9999 // 시간미정인 경우 맨 뒤로
    }
    return 9999 // 시간미정인 경우 맨 뒤로
  }

  // 언어 라벨
  const getLanguageLabel = (language: string) => {
    switch (language) {
      case 'korean-english': return '한/영'
      case 'japanese': return '일본어'
      case 'chinese': return '중국어'
      default: return language
    }
  }

  // 언어 필터링 및 교육 타입별 그룹화
  const filteredAttendees = attendanceData.filter(attendee => {
    if (selectedLanguage === 'all') return true
    return attendee.language === selectedLanguage
  })

  const groupedAttendees = filteredAttendees.reduce((groups, attendee) => {
    const key = `${attendee.educationType}_${attendee.language}_${attendee.slot}_${attendee.category || 'default'}`
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(attendee)
    return groups
  }, {} as Record<string, EducationAttendee[]>)

  // 날짜 포맷팅 (요일 포함)
  const formatDateWithDay = (dateString: string) => {
    const date = new Date(dateString)
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short'
    }
    return date.toLocaleDateString('ko-KR', options)
  }

  return (
    <>
      <BottomSheet 
        isOpen={isOpen} 
        onClose={onClose}
        height="85vh"
        className="overflow-hidden"
      >
        <div className="px-6 pb-6 pt-4">
          {/* 탭 네비게이션 */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
            <button
              onClick={() => setActiveTab('attendance')}
              className={`flex-1 text-center px-4 py-3 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTab === 'attendance'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-white hover:shadow-md'
              }`}
            >
              <Users className="w-4 h-4" />
              교육 출석 현황
            </button>
            <button
              onClick={() => setActiveTab('journal')}
              className={`flex-1 text-center px-4 py-3 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTab === 'journal'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-white hover:shadow-md'
              }`}
            >
              <FileText className="w-4 h-4" />
              교육 일지
            </button>
          </div>

          {/* 공통 필터 영역 - 날짜, 언어, 새로고침 */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-40 px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  />
                  <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
                    ({new Date(selectedDate).toLocaleDateString('ko-KR', { weekday: 'short' })})
                  </span>
                </div>
              </div>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-sm"
              >
                <option value="all">전체</option>
                <option value="korean-english">한/영</option>
                <option value="japanese">일본어</option>
                <option value="chinese">중국어</option>
              </select>
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
                size="sm"
                className="flex items-center gap-1 px-3 py-2 text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                새로고침
              </Button>
            </div>
          </div>

          {/* 교육 출석 현황 탭 */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">

              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-red-600" />
                  <p className="text-gray-600">교육 출석 현황을 확인하는 중...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
                  <p className="text-red-600 mb-2">오류 발생</p>
                  <p className="text-sm text-gray-600">{error}</p>
                  <Button 
                    onClick={() => loadAttendanceData()}
                    variant="outline" 
                    className="mt-4"
                  >
                    다시 시도
                  </Button>
                </div>
              ) : Object.keys(groupedAttendees).length === 0 ? (
                <div className="text-center py-8">
                  <GraduationCap className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-600 mb-2">선택한 날짜에 교육 신청자가 없습니다</p>
                  <p className="text-sm text-gray-500">
                    다른 날짜를 선택해보세요
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedAttendees)
                    .sort(([, attendeesA], [, attendeesB]) => {
                      const timeA = getStartTime(attendeesA[0].slot, attendeesA[0].educationType)
                      const timeB = getStartTime(attendeesB[0].slot, attendeesB[0].educationType)
                      return timeA - timeB
                    })
                    .map(([groupKey, attendees]) => {
                    const firstAttendee = attendees[0]
                    const slotTime = formatSlotTime(firstAttendee.slot, firstAttendee.educationType)
                    const languageLabel = getLanguageLabel(firstAttendee.language)
                    const educationTypeLabel = firstAttendee.educationType === '1:1' ? '1:1 교육' : '소규모 교육'
                    
                    return (
                      <Card key={groupKey} className="border">
                        <CardContent className="p-4">
                          {/* 교육 정보 헤더 */}
                          <div className="flex items-center justify-between mb-4 pb-3 border-b">
                            <div>
                              <h3 className="font-bold text-lg text-gray-900">
                                {languageLabel} {educationTypeLabel}
                                {firstAttendee.category && ` - ${firstAttendee.category}`}
                              </h3>
                              <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {firstAttendee.slot}차수 ({slotTime})
                                </div>
                                {firstAttendee.educationType === 'small-group' && firstAttendee.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {firstAttendee.location}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Badge 
                              className={`${
                                firstAttendee.educationType === '1:1' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {attendees.length}명 신청
                            </Badge>
                          </div>

                          {/* 신청자 목록 */}
                          <div className="space-y-3">
                            {attendees.map((attendee) => (
                              <div key={attendee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className={`w-3 h-3 rounded-full ${
                                    attendee.isCheckedIn ? 'bg-green-500' : 'bg-gray-300'
                                  }`} />
                                  <div>
                                    <div className="font-medium text-gray-900">{attendee.name}</div>
                                    <div className="text-sm text-gray-600">
                                      {attendee.employeeId} • {attendee.department}
                                    </div>
                                    {attendee.isCheckedIn && attendee.checkinTime && (
                                      <div className="text-xs text-green-600 mt-1">
                                        체크인: {new Date(attendee.checkinTime).toLocaleTimeString('ko-KR')}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {attendee.isCheckedIn ? (
                                    <Badge className="bg-green-100 text-green-800">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      출석
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-gray-600">
                                      미출석
                                    </Badge>
                                  )}

                                  {/* 1:1 교육인 경우 Google Meet 버튼 */}
                                  {attendee.educationType === '1:1' && (
                                    <>
                                      {attendee.googleMeetLink ? (
                                        <Button
                                          onClick={() => window.open(attendee.googleMeetLink, '_blank')}
                                          size="sm"
                                          variant="outline"
                                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                        >
                                          <Video className="w-4 h-4 mr-1" />
                                          입장
                                        </Button>
                                      ) : (
                                        <Button
                                          onClick={() => handleCreateMeetLink(attendee.id)}
                                          size="sm"
                                          variant="outline"
                                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                        >
                                          <Video className="w-4 h-4 mr-1" />
                                          생성
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* 교육 일지 탭 */}
          {activeTab === 'journal' && (
            <EducationJournalTab
              selectedDate={selectedDate}
              selectedLanguage={selectedLanguage}
              attendanceData={attendanceData}
              userInfo={userInfo}
              onRefresh={handleRefresh}
            />
          )}
        </div>
      </BottomSheet>

      {/* 커스텀 다이얼로그 */}
      {dialogOpen && (
        <CustomDialog
          isOpen={dialogOpen}
          onClose={dialogClose}
          title={dialogConfig.title}
          message={dialogConfig.message}
          type={dialogConfig.type}
          showCancel={dialogConfig.showCancel}
          confirmText={dialogConfig.confirmText}
          cancelText={dialogConfig.cancelText}
          onConfirm={dialogConfig.onConfirm}
          onCancel={dialogConfig.onCancel}
        />
      )}
    </>
  )
}
