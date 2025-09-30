"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CustomDialog } from "@/components/ui/custom-dialog"
import { useCustomDialog } from "@/hooks/use-custom-dialog"
import { employeeDB } from "@/lib/employee-database"
import { EvaluationSummary } from "@/components/evaluation-summary"
import { 
  FileText,
  User,
  Clock,
  MapPin,
  Plus,
  History,
  Star,
  Edit3,
  Loader2,
  AlertCircle,
  GraduationCap,
  Award,
  X,
  RefreshCw
} from "lucide-react"

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
  location?: string
}

interface EducationJournal {
  id: string
  educationSessionId?: string
  traineeEmployeeId: string
  traineeName: string
  instructorEmployeeId: string
  instructorName: string
  educationDate: string
  educationType: string
  educationLanguage: string
  educationSlot: number
  contentCategories: string[]
  detailedContent: string
  feedback?: string
  rating?: number
  createdAt: string
  updatedAt: string
}

interface TraineeWithQualifications extends EducationAttendee {
  koreanEnglishGrade?: string
  koreanEnglishExpiry?: string
  japaneseGrade?: string
  chineseGrade?: string
  journalCount?: number
  lastJournalDate?: string
}

interface EducationJournalTabProps {
  selectedDate: string
  selectedLanguage: string
  attendanceData: EducationAttendee[]
  userInfo: UserInfo
  onRefresh: () => void
}

export function EducationJournalTab({ 
  selectedDate, 
  selectedLanguage, 
  attendanceData, 
  userInfo,
  onRefresh 
}: EducationJournalTabProps) {
  const [traineesWithQualifications, setTraineesWithQualifications] = useState<TraineeWithQualifications[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTrainee, setSelectedTrainee] = useState<TraineeWithQualifications | null>(null)
  const [showJournalHistory, setShowJournalHistory] = useState(false)
  const [showJournalEditor, setShowJournalEditor] = useState(false)
  const [journalHistory, setJournalHistory] = useState<EducationJournal[]>([])
  const [editingJournal, setEditingJournal] = useState<EducationJournal | null>(null)
  const [showEvaluationResult, setShowEvaluationResult] = useState(false)
  const [selectedEvaluationResult, setSelectedEvaluationResult] = useState<any>(null)
  const [evaluationLoading, setEvaluationLoading] = useState(false)

  const dialogHook = useCustomDialog()
  const { isOpen: dialogOpen, config: dialogConfig, close: dialogClose, showAlert } = dialogHook

  // 교육생별 자격 정보 및 일지 통계 로드
  useEffect(() => {
    const loadTraineeQualifications = async () => {
      // 언어 필터링된 출석 데이터
      const filteredAttendees = attendanceData.filter(attendee => {
        if (selectedLanguage === 'all') return true
        return attendee.language === selectedLanguage
      })

      if (filteredAttendees.length === 0) {
        setTraineesWithQualifications([])
        return
      }

      setLoading(true)
      try {
        const enrichedTrainees: TraineeWithQualifications[] = []

        for (const attendee of filteredAttendees) {
          try {
            // 직원 자격 정보 조회
            const employeeInfo = await employeeDB.findEmployeeByEmployeeId(attendee.employeeId)
            
            // 교육 일지 통계 조회
            const journalResponse = await fetch(`/api/education-journals?traineeEmployeeId=${attendee.employeeId}&limit=1`)
            const journalData = journalResponse.ok ? await journalResponse.json() : { journals: [] }

            const enrichedTrainee: TraineeWithQualifications = {
              ...attendee,
              koreanEnglishGrade: employeeInfo?.koreanEnglishGrade,
              koreanEnglishExpiry: employeeInfo?.koreanEnglishExpiry,
              japaneseGrade: employeeInfo?.japaneseGrade,
              chineseGrade: employeeInfo?.chineseGrade,
              journalCount: journalData.count || 0,
              lastJournalDate: journalData.journals?.[0]?.educationDate
            }

            enrichedTrainees.push(enrichedTrainee)
          } catch (error) {
            console.warn(`교육생 ${attendee.employeeId} 정보 로드 실패:`, error)
            // 자격 정보 없이도 기본 정보는 표시
            enrichedTrainees.push({
              ...attendee,
              journalCount: 0
            })
          }
        }

        setTraineesWithQualifications(enrichedTrainees)
      } catch (error) {
        console.error('교육생 자격 정보 로드 실패:', error)
        // 에러가 발생해도 기본 교육생 정보는 표시
        const basicTrainees = attendanceData.filter(attendee => {
          if (selectedLanguage === 'all') return true
          return attendee.language === selectedLanguage
        }).map(attendee => ({
          ...attendee,
          journalCount: 0
        }))
        setTraineesWithQualifications(basicTrainees)
      } finally {
        setLoading(false)
      }
    }

    loadTraineeQualifications()
  }, [attendanceData, selectedLanguage]) // 의존성을 명확하게 지정

  // 교육생별 일지 이력 조회
  const loadJournalHistory = async (traineeEmployeeId: string) => {
    try {
      const response = await fetch(`/api/education-journals?traineeEmployeeId=${traineeEmployeeId}`)
      if (response.ok) {
        const data = await response.json()
        setJournalHistory(data.journals || [])
      } else {
        setJournalHistory([])
      }
    } catch (error) {
      console.error('일지 이력 조회 실패:', error)
      setJournalHistory([])
    }
  }

  // 교육생 상세 보기
  const handleViewTrainee = async (trainee: TraineeWithQualifications) => {
    setSelectedTrainee(trainee)
    await loadJournalHistory(trainee.employeeId)
    setShowJournalHistory(true)
  }

  // 새 일지 작성
  const handleCreateJournal = (trainee: TraineeWithQualifications) => {
    setSelectedTrainee(trainee)
    setEditingJournal(null)
    setShowJournalEditor(true)
  }

  // 일지 편집
  const handleEditJournal = (journal: EducationJournal) => {
    setEditingJournal(journal)
    setShowJournalEditor(true)
  }

  // 평가 결과 확인
  const handleViewEvaluationResult = async (trainee: TraineeWithQualifications) => {
    setEvaluationLoading(true)
    try {
      console.log('🔍 [평가 결과 확인] 교육생:', trainee.name, trainee.employeeId, '교육 언어:', trainee.language)
      
      // Admin과 동일한 API 사용 - Database에서 모든 평가 데이터 조회
      const response = await fetch(`/api/evaluations/load-database?limit=50000`)
      if (!response.ok) {
        throw new Error('평가 결과를 불러오는데 실패했습니다.')
      }
      
      const data = await response.json()
      console.log('📊 [평가 결과] API 응답:', data)
      
      if (data.success && data.evaluations && data.evaluations.length > 0) {
        // 해당 교육생의 승인 완료된 평가 결과 중에서 교육 언어와 일치하는 것 필터링
        const approvedEvaluations = data.evaluations.filter((evaluation: any) => {
          const isApproved = evaluation.approved === true
          const employeeIdMatch = evaluation.candidateInfo?.employeeId === trainee.employeeId
          const languageMatch = evaluation.candidateInfo?.language === trainee.language
          
          console.log('🔍 [평가 필터링]', {
            evaluationId: evaluation.id,
            employeeId: evaluation.candidateInfo?.employeeId,
            traineeEmployeeId: trainee.employeeId,
            language: evaluation.candidateInfo?.language,
            traineeLanguage: trainee.language,
            approved: evaluation.approved,
            isApproved,
            employeeIdMatch,
            languageMatch
          })
          
          return isApproved && employeeIdMatch && languageMatch
        })
        
        if (approvedEvaluations.length === 0) {
          showAlert({
            title: '평가 결과 없음',
            message: `해당 교육생의 승인 완료된 ${trainee.language === 'korean-english' ? '한/영' : trainee.language === 'japanese' ? '일본어' : '중국어'} 평가 결과가 없습니다.`,
            type: 'info'
          })
          return
        }
        
        // 가장 최근 승인 완료된 평가 결과 선택
        const latestEvaluation = approvedEvaluations.sort((a: any, b: any) => 
          new Date(b.evaluatedAt || b.candidateInfo?.submittedAt).getTime() - new Date(a.evaluatedAt || a.candidateInfo?.submittedAt).getTime()
        )[0]
        
        console.log('📈 [최근 승인 완료 평가 결과]:', latestEvaluation)
        
        // Admin과 완전히 동일한 방식으로 데이터 변환 (Submission 인터페이스에 맞게)
        const infoSource = latestEvaluation.candidateInfo || latestEvaluation;
        const formattedResult = {
          // candidateInfo 내용물
          id: latestEvaluation.id,
          name: infoSource.name,
          employeeId: infoSource.employeeId,
          language: infoSource.language,
          category: infoSource.category,
          submittedAt: infoSource.submittedAt,
          recordingCount: infoSource.recordingCount,
          scriptNumbers: infoSource.scriptNumbers,
          comment: infoSource.comment,
          duration: infoSource.duration,
          // evaluation 상위 내용물
          status: latestEvaluation.status,
          scores: latestEvaluation.scores,
          categoryScores: latestEvaluation.categoryScores,
          koreanTotalScore: latestEvaluation.koreanTotalScore,
          englishTotalScore: latestEvaluation.englishTotalScore,
          totalScore: latestEvaluation.totalScore,
          grade: latestEvaluation.grade,
          comments: latestEvaluation.comments,
          evaluatedAt: latestEvaluation.evaluatedAt,
          evaluatedBy: latestEvaluation.evaluatedBy,
          reviewRequestedBy: latestEvaluation.reviewRequestedBy,
          approved: latestEvaluation.approved,
        };
        
        // Admin과 동일한 방식으로 한/영 평가일 경우 언어별 총점 계산
        if (formattedResult.language === "korean-english" && formattedResult.categoryScores) {
          const koreanTotalScore = formattedResult.categoryScores["korean"] || 0;
          const englishTotalScore = formattedResult.categoryScores["english"] || 0;
          
          const finalResult = {
            ...formattedResult,
            koreanTotalScore,
            englishTotalScore,
          };
          console.log("🔥 [교육일지] 한/영 최종 결과:", finalResult)
          setSelectedEvaluationResult(finalResult);
        } else {
          console.log("🔥 [교육일지] 일본어/중국어 최종 결과:", formattedResult)
          setSelectedEvaluationResult(formattedResult);
        }
        
        setShowEvaluationResult(true)
      } else {
        showAlert({
          title: '평가 결과 없음',
          message: '해당 교육생의 평가 결과를 찾을 수 없습니다.',
          type: 'info'
        })
      }
    } catch (error) {
      console.error('❌ [평가 결과 확인 실패]:', error)
      showAlert({
        title: '오류 발생',
        message: '평가 결과를 불러오는 중 오류가 발생했습니다.',
        type: 'error'
      })
    } finally {
      setEvaluationLoading(false)
    }
  }

  // 방송 자격 표시
  const getBroadcastQualification = (trainee: TraineeWithQualifications) => {
    const qualifications = []
    
    if (trainee.koreanEnglishGrade) {
      const expiry = trainee.koreanEnglishExpiry ? new Date(trainee.koreanEnglishExpiry) : null
      const isExpired = expiry && expiry < new Date()
      qualifications.push({
        type: '한/영',
        grade: trainee.koreanEnglishGrade,
        expired: isExpired
      })
    }
    
    if (trainee.japaneseGrade) {
      qualifications.push({
        type: '일본어',
        grade: trainee.japaneseGrade,
        expired: false
      })
    }
    
    if (trainee.chineseGrade) {
      qualifications.push({
        type: '중국어',
        grade: trainee.chineseGrade,
        expired: false
      })
    }

    return qualifications
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

  // 교육 타입별 그룹화
  const groupedTrainees = useMemo(() => {
    return traineesWithQualifications.reduce((groups, trainee) => {
      const key = `${trainee.educationType}_${trainee.language}_${trainee.slot}_${trainee.category || 'default'}`
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(trainee)
      return groups
    }, {} as Record<string, TraineeWithQualifications[]>)
  }, [traineesWithQualifications])

  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-red-600" />
        <p className="text-gray-600">교육생 정보를 불러오는 중...</p>
      </div>
    )
  }

  if (Object.keys(groupedTrainees).length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p className="text-gray-600 mb-2">선택한 날짜에 교육 신청자가 없습니다</p>
        <p className="text-sm text-gray-500">
          다른 날짜를 선택하거나 교육 출석 현황을 확인해보세요
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {Object.entries(groupedTrainees)
          .sort(([, traineesA], [, traineesB]) => {
            const timeA = getStartTime(traineesA[0].slot, traineesA[0].educationType)
            const timeB = getStartTime(traineesB[0].slot, traineesB[0].educationType)
            return timeA - timeB
          })
          .map(([groupKey, trainees]) => {
          const firstTrainee = trainees[0]
          const slotTime = formatSlotTime(firstTrainee.slot, firstTrainee.educationType)
          const languageLabel = getLanguageLabel(firstTrainee.language)
          const educationTypeLabel = firstTrainee.educationType === '1:1' ? '1:1 교육' : '소규모 교육'
          
          return (
            <Card key={groupKey} className="border">
              <CardContent className="p-4">
                {/* 교육 정보 헤더 */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">
                      {languageLabel} {educationTypeLabel}
                      {firstTrainee.category && ` - ${firstTrainee.category}`}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {firstTrainee.slot}차수 ({slotTime})
                      </div>
                      {firstTrainee.educationType === 'small-group' && firstTrainee.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {firstTrainee.location}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge 
                    className={`${
                      firstTrainee.educationType === '1:1' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {trainees.length}명
                  </Badge>
                </div>

                {/* 교육생 목록 */}
                <div className="space-y-3">
                  {trainees.map((trainee) => {
                    const qualifications = getBroadcastQualification(trainee)
                    
                    return (
                      <div key={trainee.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between gap-3">
                          {/* 왼쪽: 교육생 정보 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <div className="font-medium text-gray-900 truncate">{trainee.name}</div>
                              <div className="text-sm text-gray-500">({trainee.employeeId})</div>
                            </div>
                            
                            <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                              <span>{trainee.department}</span>
                              {trainee.journalCount !== undefined && (
                                <span className="flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  일지 {trainee.journalCount}회
                                </span>
                              )}
                            </div>

                            {/* 방송 자격 정보 */}
                            {qualifications.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap">
                                <Award className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                {qualifications.map((qual, index) => (
                                  <Badge 
                                    key={index}
                                    variant={qual.expired ? "destructive" : "secondary"}
                                    className="text-xs px-1.5 py-0.5"
                                  >
                                    {qual.type} {qual.grade}
                                    {qual.expired && ' (만료)'}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* 오른쪽: 액션 버튼 */}
                          <div className="flex flex-col gap-1.5">
                            <Button
                              onClick={() => handleViewTrainee(trainee)}
                              size="sm"
                              variant="outline"
                              className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs px-2 py-1 h-7"
                            >
                              <History className="w-3 h-3 mr-1" />
                              기록보기
                            </Button>
                            <Button
                              onClick={() => handleCreateJournal(trainee)}
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 h-7"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              일지작성
                            </Button>
                            <Button
                              onClick={() => handleViewEvaluationResult(trainee)}
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-200 hover:bg-green-50 text-xs px-2 py-1 h-7"
                            >
                              <Award className="w-3 h-3 mr-1" />
                              결과확인
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 교육생 일지 이력 모달 */}
      {showJournalHistory && selectedTrainee && (
        <TraineeJournalHistory
          isOpen={showJournalHistory}
          onClose={() => {
            setShowJournalHistory(false)
            setSelectedTrainee(null)
          }}
          trainee={selectedTrainee}
          journals={journalHistory}
          onEditJournal={handleEditJournal}
          onRefresh={() => loadJournalHistory(selectedTrainee.employeeId)}
        />
      )}

      {/* 일지 작성/편집 모달 */}
      {showJournalEditor && selectedTrainee && (
        <JournalEditor
          isOpen={showJournalEditor}
          onClose={() => {
            setShowJournalEditor(false)
            setSelectedTrainee(null)
            setEditingJournal(null)
          }}
          trainee={selectedTrainee}
          journal={editingJournal}
          userInfo={userInfo}
          onSave={() => {
            setShowJournalEditor(false)
            if (selectedTrainee) {
              loadJournalHistory(selectedTrainee.employeeId)
            }
            onRefresh()
          }}
        />
      )}

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

      {/* 평가 결과 확인 모달 */}
      {showEvaluationResult && selectedEvaluationResult && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">평가 결과 상세</h2>
              <button 
                onClick={() => {
                  setShowEvaluationResult(false)
                  setSelectedEvaluationResult(null)
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <EvaluationSummary
                isOpen={true}
                onClose={() => {
                  setShowEvaluationResult(false)
                  setSelectedEvaluationResult(null)
                }}
                evaluationResult={selectedEvaluationResult as any}
                authenticatedUser={{ name: userInfo.name }}
                showPdfButton={true}
                isReviewMode={false}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// 교육생 일지 이력 컴포넌트
function TraineeJournalHistory({ 
  isOpen, 
  onClose, 
  trainee, 
  journals, 
  onEditJournal, 
  onRefresh 
}: {
  isOpen: boolean
  onClose: () => void
  trainee: TraineeWithQualifications
  journals: EducationJournal[]
  onEditJournal: (journal: EducationJournal) => void
  onRefresh: () => void
}) {
  const [loading, setLoading] = useState(false)

  // 새로고침 핸들러
  const handleRefresh = async () => {
    setLoading(true)
    try {
      await onRefresh()
    } finally {
      setLoading(false)
    }
  }

  // 날짜 포맷팅
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    })
  }

  // 교육 타입 라벨
  const getEducationTypeLabel = (type: string) => {
    return type === '1:1' ? '1:1 교육' : '소규모 교육'
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


  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{trainee.name} 교육 이력</h2>
              <p className="text-sm text-gray-600 mt-1">
                {trainee.employeeId} • {trainee.department}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleRefresh}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                새로고침
              </Button>
              <Button onClick={onClose} variant="ghost" size="sm">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* 콘텐츠 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-blue-600" />
              <p className="text-gray-600">교육 이력을 불러오는 중...</p>
            </div>
          ) : journals.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">교육 일지가 없습니다</h3>
              <p className="text-gray-500">
                아직 작성된 교육 일지가 없습니다.<br />
                새로운 교육 후 일지를 작성해보세요.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  총 {journals.length}회 교육 기록
                </h3>
              </div>

              {journals.map((journal) => (
                <Card key={journal.id} className="border hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge 
                            className={`${
                              journal.educationType === '1:1' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {getLanguageLabel(journal.educationLanguage)} {getEducationTypeLabel(journal.educationType)}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {journal.educationSlot}차수
                          </span>
                        </div>
                        <h4 className="font-medium text-gray-900 mb-1">
                          {formatDate(journal.educationDate)}
                        </h4>
                        <p className="text-sm text-gray-600">
                          교관: {journal.instructorName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => onEditJournal(journal)}
                          size="sm"
                          variant="outline"
                        >
                          <Edit3 className="w-4 h-4 mr-1" />
                          편집
                        </Button>
                      </div>
                    </div>

                    {/* 교육 내용 카테고리 */}
                    {journal.contentCategories && journal.contentCategories.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">교육 내용:</p>
                        <div className="flex flex-wrap gap-1">
                          {journal.contentCategories.map((category, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {category}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 세부 내용 */}
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">세부 내용:</p>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {journal.detailedContent}
                      </p>
                    </div>

                    {/* 특이사항 */}
                    {journal.feedback && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">특이사항:</p>
                        <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                          {journal.feedback}
                        </p>
                      </div>
                    )}

                    {/* 작성 정보 */}
                    <div className="text-xs text-gray-400 pt-3 border-t">
                      작성: {new Date(journal.createdAt).toLocaleString('ko-KR')}
                      {journal.updatedAt !== journal.createdAt && (
                        <span> • 수정: {new Date(journal.updatedAt).toLocaleString('ko-KR')}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 일지 작성/편집 컴포넌트
function JournalEditor({ 
  isOpen, 
  onClose, 
  trainee, 
  journal, 
  userInfo, 
  onSave 
}: {
  isOpen: boolean
  onClose: () => void
  trainee: TraineeWithQualifications
  journal: EducationJournal | null
  userInfo: UserInfo
  onSave: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    contentCategories: [] as string[],
    detailedContent: '',
    specialNotes: '',
    rating: 0
  })

  const dialogHook = useCustomDialog()
  const { showAlert } = dialogHook

  // 언어별 교육 내용 카테고리
  const getPredefinedCategories = (language: string) => {
    const commonCategories = ['취득문안', '취득문안 외 방송', '사무장 방송', '기타']
    
    if (language === 'korean-english') {
      return ['한국어 방송', '영어 방송', ...commonCategories]
    } else {
      // 중국어, 일본어는 한국어/영어 방송 옵션 제외
      return commonCategories
    }
  }

  const predefinedCategories = getPredefinedCategories(trainee.language)

  // 폼 초기화
  useEffect(() => {
    if (journal) {
      // 편집 모드
      setFormData({
        contentCategories: journal.contentCategories || [],
        detailedContent: journal.detailedContent || '',
        specialNotes: journal.feedback || '', // 기존 feedback을 specialNotes로 매핑
        rating: journal.rating || 0
      })
    } else {
      // 새 작성 모드
      setFormData({
        contentCategories: [],
        detailedContent: '',
        specialNotes: '',
        rating: 0
      })
    }
  }, [journal, isOpen])

  // 카테고리 토글
  const toggleCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      contentCategories: prev.contentCategories.includes(category)
        ? prev.contentCategories.filter(c => c !== category)
        : [...prev.contentCategories, category]
    }))
  }


  // 저장 핸들러
  const handleSave = async () => {
    // 유효성 검사
    if (formData.contentCategories.length === 0) {
      showAlert({
        title: '입력 오류',
        message: '교육 내용을 최소 1개 이상 선택해주세요.',
        type: 'error'
      })
      return
    }

    if (!formData.detailedContent.trim()) {
      showAlert({
        title: '입력 오류',
        message: '세부 내용을 입력해주세요.',
        type: 'error'
      })
      return
    }

    setSaving(true)
    try {
      const requestData = {
        ...(journal && { id: journal.id }),
        educationSessionId: trainee.id,
        traineeEmployeeId: trainee.employeeId,
        traineeName: trainee.name,
        instructorEmployeeId: userInfo.employeeId,
        instructorName: userInfo.name,
        educationDate: trainee.date,
        educationType: trainee.educationType,
        educationLanguage: trainee.language,
        educationSlot: trainee.slot,
        contentCategories: formData.contentCategories,
        detailedContent: formData.detailedContent.trim(),
        feedback: formData.specialNotes.trim(), // specialNotes를 feedback 필드로 저장
        rating: null // 평점 제거
      }

      const url = journal ? '/api/education-journals' : '/api/education-journals'
      const method = journal ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      if (response.ok) {
        showAlert({
          title: '저장 완료',
          message: `교육 일지가 성공적으로 ${journal ? '수정' : '작성'}되었습니다.`,
          type: 'success'
        })
        onSave()
        onClose()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || '저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('일지 저장 실패:', error)
      showAlert({
        title: '저장 실패',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        type: 'error'
      })
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="p-6 border-b bg-gradient-to-r from-red-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {journal ? '일지 편집' : '새 일지 작성'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {trainee.name} ({trainee.employeeId}) • {trainee.department}
              </p>
            </div>
            <Button onClick={onClose} variant="ghost" size="sm">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 콘텐츠 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-6">
            {/* 교육 정보 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">교육 정보</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">날짜:</span>
                  <span className="ml-2 font-medium">
                    {new Date(trainee.date).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">차수:</span>
                  <span className="ml-2 font-medium">{trainee.slot}차수</span>
                </div>
                <div>
                  <span className="text-gray-600">언어:</span>
                  <span className="ml-2 font-medium">
                    {trainee.language === 'korean-english' ? '한/영' : 
                     trainee.language === 'japanese' ? '일본어' : 
                     trainee.language === 'chinese' ? '중국어' : trainee.language}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">타입:</span>
                  <span className="ml-2 font-medium">
                    {trainee.educationType === '1:1' ? '1:1 교육' : '소규모 교육'}
                  </span>
                </div>
              </div>
            </div>

            {/* 교육 내용 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                교육 내용 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {predefinedCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={`p-3 text-sm rounded-lg border transition-colors ${
                      formData.contentCategories.includes(category)
                        ? 'bg-red-100 border-red-300 text-red-800'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* 세부 내용 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                세부 내용 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.detailedContent}
                onChange={(e) => setFormData(prev => ({ ...prev, detailedContent: e.target.value }))}
                placeholder="예) R/L 발음 구분, 한국어식 음절 표현 교정을 집중적으로 학습..."
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>

            {/* 특이사항 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                특이사항
              </label>
              <textarea
                value={formData.specialNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, specialNotes: e.target.value }))}
                placeholder="예) 교육 시작 시간보다 5분 늦게 Show-up..."
                className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>

          </div>
        </div>

        {/* 푸터 */}
        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={saving}
          >
            취소
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-red-600 hover:bg-red-700"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                {journal ? '수정' : '저장'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
