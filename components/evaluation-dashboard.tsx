"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, FilterX, Play, Pause, ArrowLeft, Send, Volume2, Award, PlayCircle, StopCircle, RefreshCw, List, ClipboardList, Pencil, Activity, AlertCircle, User, CalendarPlus, History, X, Clock, TrendingUp, Loader2 } from "lucide-react"
import { evaluationCriteria, getEvaluationCriteria, getGradeInfo } from "@/lib/evaluation-criteria"
import { EvaluationSummary } from "@/components/evaluation-summary"
import React from "react"
import { Globe } from "lucide-react"


interface EvaluationCandidate {
  id: string
  name: string
  employeeId: string
  language: string
  category: string
  submittedAt: string
  recordings: { [key: string]: string }
  recordingBlobs?: { [key: string]: Blob }
  uploadedFiles?: { [key: string]: { url: string; fileName: string } }
  recordingCount?: number // 녹음 파일 개수
  driveFolder?: string
  status?: "pending" | "evaluating" | "reviewing" | "review_requested" | "submitted" | "re_evaluation" // 추가: 평가 상태
  reviewedBy?: string // 추가: 검토한 교관
  reviewRequestedBy?: string // 추가: 검토 요청한 교관
  reviewRequestedAt?: string // 추가: 검토 요청 시간
  evaluatedBy?: string // 추가: 평가 중인 교관 사번
  evaluatedAt?: string // 추가: 평가 시작 시간
  dropboxPath?: string // 추가: Dropbox 경로
  dropboxFileId?: string // 추가: Dropbox 파일 ID
  dropboxFileName?: string // 추가: Dropbox 파일 이름
  dropboxFiles?: {
    scriptKey: string;
    dropboxPath: string;
    fileId?: string;
    fileName?: string;
    url?: string;
    path?: string;
    originalFileName?: string;
    success?: boolean;
  }[]; // Dropbox 파일 목록
  approved?: boolean // 추가: 승인 여부
}

interface EvaluationDashboardProps {
  onBack: () => void
  authenticatedUser: any
  userInfo?: any
  refreshKey?: number
}

export function EvaluationDashboard({ onBack, authenticatedUser, userInfo, refreshKey = 0 }: EvaluationDashboardProps) {
  // 탭 상태
  const [activeTab, setActiveTab] = useState<string>("requests")
  
  const [candidates, setCandidates] = useState<EvaluationCandidate[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<EvaluationCandidate | null>(null)
  const [currentLanguage, setCurrentLanguage] = useState<"korean" | "english">("korean")
  const [evaluationData, setEvaluationData] = useState<{ [candidateId: string]: { scores: { [key: string]: number }, categoryScores?: { [key: string]: number }, comments: { korean: string; english: string } } }>({})
  const [currentCandidateId, setCurrentCandidateId] = useState<string | null>(null)

  // 정렬 상태
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  // 스크롤 ref (신청 관리 탭)
  const recordingSectionRef = useRef<HTMLDivElement>(null)
  const educationSectionRef = useRef<HTMLDivElement>(null)

  // 로그인 기록 상태
  const [loginLogs, setLoginLogs] = useState<any[]>([])
  const [showLoginLogs, setShowLoginLogs] = useState(false)
  const [loginLogsLoading, setLoginLogsLoading] = useState(false)
  const [loginLogsPagination, setLoginLogsPagination] = useState<any>({})

  // 녹음 응시 목록 상태
  const [applicants, setApplicants] = useState<{ name: string; employeeId: string; language: string; batch: string; time?: string; hasSubmitted?: boolean; submittedAt?: any }[]>([])
  const [applicantDates, setApplicantDates] = useState<string[]>([])
  const [selectedApplicantDate, setSelectedApplicantDate] = useState<string>("")
  const [loadingApplicants, setLoadingApplicants] = useState<boolean>(false)
  const [attendanceByEmployeeId, setAttendanceByEmployeeId] = useState<Record<string, boolean>>({})

  // 새로 출석 처리된 인원을 강조하기 위한 하이라이트 상태 및 이전 출석 상태 저장소
  const [highlightedAttendedIds, setHighlightedAttendedIds] = useState<Set<string>>(new Set())
  const prevAttendanceRef = useRef<Record<string, boolean>>({})

  // 교육 신청자 목록 상태
  const [educationSessions, setEducationSessions] = useState<any[]>([])
  const [educationDates, setEducationDates] = useState<string[]>([])
  const [selectedEducationDate, setSelectedEducationDate] = useState<string>("")
  const [loadingEducationApplicants, setLoadingEducationApplicants] = useState(false)
  
  // Google Meet 생성 상태
  const [generatingMeet, setGeneratingMeet] = useState<Record<string, boolean>>({})
  
  // 캘린더 초대 생성 상태
  const [generatingCalendarInvite, setGeneratingCalendarInvite] = useState<Record<string, boolean>>({})

  // 실시간 대시보드용 현재 시간 상태
  const [currentTime, setCurrentTime] = useState(new Date())

  // 평가 기록 사이드 모달 상태
  const [showEvaluationHistory, setShowEvaluationHistory] = useState(false)
  const [evaluationHistory, setEvaluationHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // 평가 기록 불러오기
  const loadEvaluationHistory = async () => {
    if (!selectedCandidate) return
    
    setLoadingHistory(true)
    try {
      const response = await fetch(`/api/evaluations/history?employeeId=${selectedCandidate.employeeId}&language=${selectedCandidate.language}`)
      const data = await response.json()
      
      if (data.success) {
        setEvaluationHistory(data.history || [])
        console.log(`📚 평가 기록 ${data.count}개 로드 완료`)
      }
    } catch (error) {
      console.error('평가 기록 로드 실패:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  // 현재 선택된 후보자의 점수 가져오기
  const getCurrentScores = useCallback(() => {
    if (!currentCandidateId || !evaluationData[currentCandidateId]) {
      return {}
    }
    return evaluationData[currentCandidateId].scores
  }, [currentCandidateId, evaluationData])

  // 현재 선택된 후보자의 코멘트 가져오기
  const getCurrentComments = useCallback(() => {
    if (!currentCandidateId || !evaluationData[currentCandidateId] || !evaluationData[currentCandidateId].comments) {
      return { korean: "", english: "" }
    }
    return evaluationData[currentCandidateId].comments
  }, [currentCandidateId, evaluationData])

  // 현재 선택된 후보자의 점수 설정하기
  const setCurrentScores = useCallback((scores: { [key: string]: number }) => {
    if (!currentCandidateId) return
    
    setEvaluationData(prev => ({
      ...prev,
      [currentCandidateId]: {
        scores,
        comments: prev[currentCandidateId]?.comments || { korean: "", english: "" }
      }
    }))
  }, [currentCandidateId])

  // 현재 선택된 후보자의 코멘트 설정하기
  const setCurrentComments = useCallback((comments: { korean: string; english: string }) => {
    if (!currentCandidateId) return
    
    setEvaluationData(prev => ({
      ...prev,
      [currentCandidateId]: {
        scores: prev[currentCandidateId]?.scores || {},
        comments
      }
    }))
  }, [currentCandidateId])

  // 오디오 재생 상태를 useRef로 안정화
  const audioElementsRef = useRef<{ [key: string]: HTMLAudioElement }>({})
  const currentlyPlayingRef = useRef<string | null>(null)
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const setCurrentlyPlayingStable = useCallback((value: string | null) => {
    setCurrentlyPlaying(value)
  }, [])

  // Blob URL 캐시 (리렌더 시 오디오 src가 바뀌어 재생이 초기화되는 문제 방지)
  const audioUrlCacheRef = useRef<{ [key: string]: string }>({})

  // updateScore 함수를 useCallback으로 최적화하여 불필요한 리렌더링 방지
  const updateScore = useCallback((key: string, value: number) => {
    const currentScores = getCurrentScores()
    const newScores = { ...currentScores, [key]: value }
    setCurrentScores(newScores)
  }, [getCurrentScores, setCurrentScores])

  // 오디오 재생 상태 동기화 함수
  const syncAudioState = useCallback((recordingKey: string | null) => {
    currentlyPlayingRef.current = recordingKey
    setCurrentlyPlayingStable(recordingKey)
  }, [setCurrentlyPlayingStable])

  const [showSummary, setShowSummary] = useState(false)
  const [isPlayingAll, setIsPlayingAll] = useState(false)
  const isPlayingAllRef = useRef(false) // 즉시 반영되는 재생 상태
  const [isLoading, setIsLoading] = useState(true)
  const [recordingsLoading, setRecordingsLoading] = useState<{ [candidateId: string]: boolean }>({})
  
  // 일시 중지 상태 관리
  const [playbackState, setPlaybackState] = useState<{
    isPaused: boolean;
    currentIndex: number;
    recordings: string[];
    targetLanguage?: "korean" | "english";
  } | null>(null)
  
  // 현재 재생 중인 인덱스와 녹음 목록을 ref로 관리 (pauseAllRecordings에서 접근하기 위해)
  const currentPlaybackRef = useRef<{
    currentIndex: number;
    recordings: string[];
    targetLanguage?: "korean" | "english";
  } | null>(null)

  // 출석 하이라이트용 CSS 키프레임을 주입 (컴포넌트 마운트 시 1회)
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @keyframes attendancePulse {
        0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.6); transform: scale(1); }
        60% { box-shadow: 0 0 0 12px rgba(34,197,94,0); transform: scale(1.02); }
        100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); transform: scale(1); }
      }
      @keyframes checkStroke {
        0% { stroke-dashoffset: 28; }
        100% { stroke-dashoffset: 0; }
      }
      .attendance-highlight { animation: attendancePulse 0.8s ease-out 0s 2; }
      .attendance-check-highlight { stroke-dasharray: 28; stroke-dashoffset: 28; animation: checkStroke 0.6s ease-out forwards; }
    `
    document.head.appendChild(style)
    return () => { try { document.head.removeChild(style) } catch {} }
  }, [])

  // 필터 및 검색 상태
  const [searchTerm, setSearchTerm] = useState("")
  const [languageFilter, setLanguageFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all") // 추가: 상태 필터

  useEffect(() => {
    (async () => {
      loadCandidates()
      const map = await loadAttendance(selectedApplicantDate || undefined)
      // 수정: loadApplicants 호출 시 날짜도 함께 전달하여 동기화
      await loadApplicants(selectedApplicantDate || undefined, map)
      
      // 교육 신청자 목록 초기 로드 - 먼저 날짜 목록을 가져온 후 적절한 날짜로 필터링
      await loadEducationApplicantsWithInitialDate()
    })()
  }, [refreshKey])

  // 실시간 타이머 (1초마다 업데이트)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    
    return () => clearInterval(timer)
  }, [])

  // Auto-refresh (1분마다)
  useEffect(() => {
    const refresher = setInterval(async () => {
      if (activeTab === 'requests') {
        const map = await loadAttendance(selectedApplicantDate || undefined)
        await loadApplicants(selectedApplicantDate || undefined, map)
        await loadEducationApplicants(selectedEducationDate || undefined)
      }
    }, 60000) // 60초
    
    return () => clearInterval(refresher)
  }, [activeTab, selectedApplicantDate, selectedEducationDate])

  const loadApplicants = async (date?: string, attendanceMap?: Record<string, boolean>) => {
    setLoadingApplicants(true)
    try {
      const url = date ? `/api/recording-applicants?date=${encodeURIComponent(date)}` : '/api/recording-applicants'
      const res = await fetch(url, { cache: 'no-store' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      
      if (data.source === 'database') {
        console.log('✅ [loadApplicants] Database에서 로드:', data.applicants?.length || 0, '명')
      } else {
        console.log('✅ [loadApplicants] Google Sheets에서 로드:', data.applicants?.length || 0, '명')
      }
      
      // 🔍 디버깅: hasSubmitted 데이터 확인
      const withSubmission = data.applicants?.filter((a: any) => a.hasSubmitted) || []
      console.log(`🔍 [loadApplicants] API 응답 데이터:`, data.applicants)
      console.log(`✅ [loadApplicants] 제출 완료한 응시자: ${withSubmission.length}명`)
      if (withSubmission.length > 0) {
        console.log(`🔍 [loadApplicants] 최종 데이터 샘플:`, withSubmission.slice(0, 3))
        withSubmission.forEach((a: any) => {
          if (a.hasSubmitted) {
            console.log(`🎯 [loadApplicants] ${a.name} (${a.employeeId}) ${a.language}: 제출 완료!`, a.submittedAt)
          }
        })
      }
      
      // 출석 체크와 결합: 서버에서 가져온 응시자에 출석 여부 주입
      const applicantsRaw = (data.applicants || []) as Array<any>
      const withAttendance = applicantsRaw.map(a => {
        // language 형식 변환: "한영" → "korean-english"
        let languageCode = a.language
        if (a.language?.includes('한')) languageCode = 'korean-english'
        else if (a.language?.includes('일')) languageCode = 'japanese'
        else if (a.language?.includes('중')) languageCode = 'chinese'
        
        // employeeId + language 조합으로 체크 (간단하고 정확)
        const key = `${a.employeeId}-${languageCode}`
        const attended = !!(attendanceMap || attendanceByEmployeeId)[key]
        
        if (attended) {
          console.log(`✅ [loadApplicants] ${a.name} (${a.employeeId}) ${a.language}: 출석`)
        }
        
        // time 필드 추출 (batch 또는 timeSlot에서)
        const timeMatch = (a.batch || a.timeSlot || '').match(/(\d{1,2}):(\d{2})/)
        const time = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : ''
        
        return {
        ...a,
          time,
          __attended: attended
        }
      })
      setApplicants(withAttendance)
      setApplicantDates(data.dates || [])
      
      // 초기 날짜 설정 로직 개선 - 교육 신청자 목록과 동일
      if (data.selectedDate) {
        setSelectedApplicantDate(data.selectedDate)
        console.log(`✅ [loadApplicants] 선택된 날짜 설정: ${data.selectedDate}`)
      } else if (!selectedApplicantDate && data.dates && data.dates.length > 0) {
        // API에서 selectedDate가 없으면 첫 번째 날짜로 설정
        setSelectedApplicantDate(data.dates[0])
        console.log(`✅ [loadApplicants] 첫 번째 날짜로 설정: ${data.dates[0]}`)
      }

      // 하이라이트 대상 계산: 이전에는 미출석(false) → 이번에 출석(true)으로 바뀐 경우만
      try {
        const newAttendanceMap: Record<string, boolean> = {}
        const newlyAttendedKeys: string[] = []
        withAttendance.forEach((a: any) => {
          const key = a.employeeId || a.email || `${a.name}`
          const now = !!a.__attended
          newAttendanceMap[key] = now
          if (now && !prevAttendanceRef.current[key]) {
            newlyAttendedKeys.push(key)
          }
        })

        if (newlyAttendedKeys.length > 0) {
          setHighlightedAttendedIds(prev => {
            const next = new Set(prev)
            newlyAttendedKeys.forEach(k => next.add(k))
            return next
          })
          // 일정 시간 후 하이라이트 제거
          setTimeout(() => {
            setHighlightedAttendedIds(prev => {
              const next = new Set(prev)
              newlyAttendedKeys.forEach(k => next.delete(k))
              return next
            })
          }, 1600)
        }
        prevAttendanceRef.current = newAttendanceMap
      } catch {}
    } catch (e) {
      console.error('응시 목록 로드 실패:', e)
      setApplicants([])
    } finally {
      setLoadingApplicants(false)
    }
  }

  // Google Calendar 권한 요청 함수
  const requestCalendarAuth = () => {
    const width = 500
    const height = 600
    const left = (window.screen.width / 2) - (width / 2)
    const top = (window.screen.height / 2) - (height / 2)
    
    const popup = window.open(
      '/api/auth/google-calendar',
      'google_calendar_auth',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    )
    
    // 팝업 닫힘 감지
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed)
        // 페이지 새로고침으로 권한 상태 업데이트
        window.location.reload()
      }
    }, 1000)
  }

  // Google Meet 링크 생성 함수
  const generateGoogleMeet = async (applicationId: string, applicantName: string) => {
    try {
      setGeneratingMeet(prev => ({ ...prev, [applicationId]: true }))
      
      console.log('🗓️ [Google Meet] 생성 시작:', { applicationId, applicantName })
      
      const response = await fetch('/api/requests/generate-meet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          instructorEmail: authenticatedUser?.email
        })
      })
      
      const result = await response.json()
      
      if (result.needsAuth) {
        // Calendar 권한이 필요한 경우
        const shouldAuth = confirm(`${result.error}\n\nGoogle Calendar 연동을 진행하시겠습니까?`)
        if (shouldAuth) {
          requestCalendarAuth()
        }
        return
      }
      
      if (result.success) {
        alert(`${applicantName}님의 Google Meet 링크가 생성되었습니다!\n\n링크: ${result.meetLink}`)
        
        // 교육 신청자 목록 새로고침 (버튼이 입장으로 변경됨)
        await loadEducationApplicants(selectedEducationDate || undefined)
      } else {
        alert(`Google Meet 생성 실패: ${result.error}`)
      }
    } catch (error) {
      console.error('❌ [Google Meet] 생성 오류:', error)
      alert('Google Meet 생성 중 오류가 발생했습니다.')
    } finally {
      setGeneratingMeet(prev => ({ ...prev, [applicationId]: false }))
    }
  }

  // 캘린더 초대 생성 함수 (소규모 교육용)
  const generateCalendarInvite = async (session: any) => {
    try {
      const sessionKey = `${session.date}-${session.language}-${session.classType}-${session.sessionNumber}`
      setGeneratingCalendarInvite(prev => ({ ...prev, [sessionKey]: true }))
      
      console.log('📅 [Calendar Invite] 생성 시작:', { session })
      
      const response = await fetch('/api/requests/generate-calendar-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionData: session,
          instructorEmail: authenticatedUser?.email
        })
      })
      
      const result = await response.json()
      
      if (result.needsAuth) {
        // Calendar 권한이 필요한 경우
        const shouldAuth = confirm(`${result.error}\n\nGoogle Calendar 연동을 진행하시겠습니까?`)
        if (shouldAuth) {
          requestCalendarAuth()
        }
        return
      }
      
      if (result.success) {
        // 서버에서 온 메시지 표시 (이메일 발송 실패 경고 포함)
        alert(result.message || `${session.classType} ${session.language} 교육 ${session.sessionNumber}차수 캘린더 초대가 생성되었습니다!`)
        
        // 교육 신청자 목록 새로고침
        await loadEducationApplicants(selectedEducationDate || undefined)
      } else {
        alert(`캘린더 초대 생성 실패: ${result.error}`)
      }
    } catch (error) {
      console.error('❌ [Calendar Invite] 생성 오류:', error)
      alert('캘린더 초대 생성 중 오류가 발생했습니다.')
    } finally {
      const sessionKey = `${session.date}-${session.language}-${session.classType}-${session.sessionNumber}`
      setGeneratingCalendarInvite(prev => ({ ...prev, [sessionKey]: false }))
    }
  }

  // 초기 로드용 함수 - 날짜 목록을 먼저 가져온 후 적절한 날짜로 필터링
  const loadEducationApplicantsWithInitialDate = async () => {
    console.log('[loadEducationApplicantsWithInitialDate] 초기 로드 시작')
    setLoadingEducationApplicants(true)
    
    try {
      // 1단계: 먼저 날짜 목록만 가져오기 (필터링 없이)
      const res = await fetch('/api/education-applicants', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      
      if (!res.ok) {
        console.error('❌ [loadEducationApplicantsWithInitialDate] HTTP 오류:', res.status, res.statusText)
        setEducationSessions([])
        setEducationDates([])
        return
      }
      
      const data = await res.json()
      console.log('✅ [loadEducationApplicantsWithInitialDate] 초기 API 응답:', data)
      
      if (data.error) {
        console.log('❌ [loadEducationApplicantsWithInitialDate] API 오류:', data.error)
        setEducationSessions([])
        setEducationDates([])
        return
      }

      // 2단계: 날짜 목록 설정
      if (data.dates && Array.isArray(data.dates)) {
        setEducationDates(data.dates)
        console.log(`✅ [loadEducationApplicantsWithInitialDate] 날짜 목록 로드 완료: ${data.dates.length}개 날짜`)
        
        // 3단계: 적절한 초기 날짜 선택 및 해당 날짜로 필터링된 데이터 로드
        let initialDate = data.selectedDate
        if (!initialDate && data.dates.length > 0) {
          initialDate = data.dates[0]
        }
        
        if (initialDate) {
          setSelectedEducationDate(initialDate)
          console.log(`✅ [loadEducationApplicantsWithInitialDate] 초기 날짜 설정: ${initialDate}`)
          
          // 4단계: 선택된 날짜로 다시 필터링해서 세션 데이터 로드 (재귀 방지)
          await loadEducationApplicantsFiltered(initialDate)
        } else {
          // 날짜가 없으면 빈 세션으로 설정
          setEducationSessions([])
        }
      } else {
        console.log('⚠️ [loadEducationApplicantsWithInitialDate] 날짜 목록 없음')
        setEducationDates([])
        setEducationSessions([])
      }
    } catch (error) {
      console.error('❌ [loadEducationApplicantsWithInitialDate] 초기 로드 실패:', error)
      setEducationSessions([])
      setEducationDates([])
    } finally {
      setLoadingEducationApplicants(false)
    }
  }

  // 날짜별 필터링 전용 함수 (재귀 호출 방지)
  const loadEducationApplicantsFiltered = async (date: string) => {
    console.log('[loadEducationApplicantsFiltered] 시작:', { date })
    
    try {
      // 신청 기록이 있는 세션만 조회 (날짜 필터링 포함)
      const url = `/api/education-applicants?date=${encodeURIComponent(date)}`
      console.log('📋 [loadEducationApplicantsFiltered] API 시도:', url)

      const res = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      
      if (!res.ok) {
        console.error('❌ [loadEducationApplicantsFiltered] HTTP 오류:', res.status, res.statusText)
        setEducationSessions([])
        return
      }
      
      const data = await res.json()
      console.log('✅ [loadEducationApplicantsFiltered] API 응답:', data)
      
      if (data.error) {
        console.log('❌ [loadEducationApplicantsFiltered] API 오류:', data.error)
        setEducationSessions([])
        return
      }

      if (data.educationSessions && Array.isArray(data.educationSessions)) {
        console.log(`✅ [loadEducationApplicantsFiltered] 교육 세션 목록 로드 완료: ${data.educationSessions.length}개 세션`)
        
        // 🔍 세션 데이터 상세 디버깅
        data.educationSessions.forEach((session: any, index: number) => {
          console.log(`🔍 [세션 ${index}] 데이터:`, {
            language: session.language,
            classType: session.classType,
            classTypeType: typeof session.classType,
            classTypeLength: session.classType?.length,
            classTypeCharCodes: session.classType?.split('').map((c: string) => c.charCodeAt(0)),
            sessionNumber: session.sessionNumber,
            applicantsCount: session.applicants?.length || 0,
            조건체크: {
              classTypeCheck: session.classType === '소규모',
              strictEqual: session.classType === '소규모',
              includes: session.classType?.includes('소규모'),
              rawComparison: `"${session.classType}" vs "소규모"`,
              applicantsCheck: (session.applicants?.length || 0) > 0,
              최종조건: session.classType === '소규모' && (session.applicants?.length || 0) > 0
            }
          })
        })
        
        // 시간순 정렬 (slotTime을 파싱하여 정렬)
        const sortedSessions = [...data.educationSessions].sort((a, b) => {
          const parseTime = (timeStr: string) => {
            // "13:40-14:30" 형식에서 시작 시간 추출
            const match = timeStr.match(/(\d{1,2}):(\d{2})/)
            if (!match) return 0
            return parseInt(match[1]) * 60 + parseInt(match[2])
          }
          
          const timeA = parseTime(a.slotTime || '')
          const timeB = parseTime(b.slotTime || '')
          
          return timeA - timeB
        })
        
        setEducationSessions(sortedSessions)
        
        // 🔍 모든 세션 렌더링 조건 체크
        console.log(`🔍 [전체 세션 렌더링 조건 체크] 총 ${sortedSessions.length}개 세션 (시간순 정렬):`)
        sortedSessions.forEach((session: any, index: number) => {
          const isSmallGroup = session.classType === '소규모' || session.classType === 'small' || session.classType === 'small-group'
          console.log(`  - 세션 ${index}: ${session.slotTime} ${session.language} ${session.classType} ${session.sessionNumber}차수 - 소규모조건: ${isSmallGroup}`)
          if (isSmallGroup) {
            console.log(`    ✅ 소규모 세션 발견! applicants:`, session.applicants)
          }
        })
      } else {
        console.log('⚠️ [loadEducationApplicantsFiltered] 올바르지 않은 응답 형식')
        setEducationSessions([])
      }
    } catch (error) {
      console.error('❌ [loadEducationApplicantsFiltered] 교육 세션 목록 로드 실패:', error)
      setEducationSessions([])
    }
  }

  const loadEducationApplicants = async (date?: string) => {
    console.log('[loadEducationApplicants] 시작:', { date })
    
    // 날짜가 없으면 초기 로드 함수 호출
    if (!date) {
      return await loadEducationApplicantsWithInitialDate()
    }
    
    // 날짜가 있으면 필터링 함수 호출
    setLoadingEducationApplicants(true)
    try {
      await loadEducationApplicantsFiltered(date)
    } finally {
      setLoadingEducationApplicants(false)
    }
  }

  // 폐강 알림 처리 함수
  const handleCancellationNotification = async (session: any) => {
    if (!session || session.applicants.length === 0) {
      alert('신청자가 없는 교육입니다.')
      return
    }

    const confirmed = confirm(
      `${session.language} ${session.classType} ${session.sessionNumber}차수 교육의 폐강 알림을 발송하시겠습니까?\n\n` +
      `신청자: ${session.applicants.length}명\n` +
      `사유: 신청 인원 미달\n\n` +
      `확인을 누르면 모든 신청자에게 이메일이 발송됩니다.`
    )

    if (!confirmed) return

    try {
      console.log('📧 [폐강 알림] 발송 시작:', session)

      const response = await fetch('/api/education/cancel-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicants: session.applicants.map((applicant: any) => ({
            name: applicant.name,
            email: applicant.email,
            employeeId: applicant.employeeId
          })),
          session: {
            language: session.language,
            classType: session.classType,
            sessionNumber: session.sessionNumber,
            slotTime: session.slotTime,
            date: selectedEducationDate || new Date().toISOString().slice(0, 10)
          },
          reason: '신청 인원 미달'
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        alert(
          `폐강 알림 발송이 완료되었습니다!\n\n` +
          `성공: ${result.summary.success}건\n` +
          `실패: ${result.summary.failed}건\n\n` +
          `${result.message}`
        )
        console.log('✅ [폐강 알림] 발송 완료:', result)
      } else {
        throw new Error(result.error || '폐강 알림 발송에 실패했습니다.')
      }

    } catch (error) {
      console.error('❌ [폐강 알림] 발송 오류:', error)
      alert(`폐강 알림 발송 중 오류가 발생했습니다:\n${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  // 녹음 체크인 기록을 불러와 당일(또는 선택 날짜)의 출석을 계산
  // 단순화: employeeId + language 조합으로 체크
  const loadAttendance = async (dateStr?: string): Promise<Record<string, boolean>> => {
    try {
      // 선택 날짜의 00:00~23:59 범위를 계산
      const selected = dateStr || selectedApplicantDate || new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
      // selected는 'YYYY년 M월 D일' 또는 'YYYY년M월D일' 형식 → ISO로 변환
      const m = selected.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/)
      let dateParam = ''
      if (m) {
        const y = parseInt(m[1], 10)
        const mo = parseInt(m[2], 10)
        const d = parseInt(m[3], 10)
        dateParam = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        console.log(`🔍 [loadAttendance] 날짜 변환: ${selected} → ${dateParam}`)
      }
      
      const qs = dateParam ? `?date=${encodeURIComponent(dateParam)}` : ''
      console.log(`🔍 [loadAttendance] API 호출: /api/recording/checkin${qs}`)
      const res = await fetch(`/api/recording/checkin${qs}`)
      const data = await res.json()
      const map: Record<string, boolean> = {}
      
      if (data.success && data.checkins) {
        console.log(`✅ [loadAttendance] 체크인 기록: ${data.checkins.length}건`)
        data.checkins.forEach((checkin: any) => {
          if (checkin.employeeId && checkin.language) {
            // employeeId + language 조합으로 키 생성 (간단하고 정확)
            const key = `${checkin.employeeId}-${checkin.language}`
            map[key] = true
            console.log(`  ✅ ${checkin.name} (${checkin.employeeId}) - ${checkin.language}`)
          }
        })
      } else {
        console.log(`⚠️ [loadAttendance] 체크인 기록 없음`)
      }
      
      setAttendanceByEmployeeId(map)
      console.log(`✅ [loadAttendance] 출석 맵 생성:`, Object.keys(map).length, '건')
      return map
    } catch (e) {
      console.warn('출석(녹음 체크인) 기록 로드 실패:', e)
      setAttendanceByEmployeeId({})
      return {}
    }
  }

  // 로그인 기록 불러오기
  const loadLoginLogs = async (page = 1) => {
    setLoginLogsLoading(true);
    try {
      const response = await fetch(`/api/auth/login-log?limit=20&page=${page}`);
      const data = await response.json();
      setLoginLogs(data.logs || []);
      setLoginLogsPagination(data.pagination || {});
    } catch (error) {
      console.error('로그인 기록 로딩 실패:', error);
      alert('로그인 기록을 불러오는데 실패했습니다.');
    } finally {
      setLoginLogsLoading(false);
    }
  };

  // 🔥 제출된 녹음 데이터 로드 - Dropbox에서 읽기 (실시간 업데이트)
  const loadCandidates = async () => {
    setIsLoading(true)
    try {
      // 데이터베이스에서 제출된 녹음 데이터 읽기
      let submittedRecordings = []
      try {
        const response = await fetch("/api/evaluations/load-database?limit=1000&page=1&includeRecordings=false") // 🔥 녹음 데이터 제외
        console.log('📡 [loadCandidates] API 응답 상태:', response.status, response.statusText)
        
        if (response.ok) {
          const result = await response.json()
          console.log('✅ [loadCandidates] API 응답:', result)
          
          // API 응답 구조에 맞게 수정: ev.candidateInfo와 ev.status를 함께 사용
          submittedRecordings = result.evaluations || []
          
          // Database API만 사용 - localStorage 사용 중단 (중복 방지)
          console.log('✅ [loadCandidates] Database API에서만 데이터 로드:', submittedRecordings.length, '개')
        } else {
          console.warn('⚠️ [loadCandidates] Database API 호출 실패, 빈 배열 반환')
          submittedRecordings = []
        }
      } catch (error) {
        console.error('❌ [loadCandidates] Database 로드 중 에러, 빈 배열 반환', error)
        submittedRecordings = []
      }

      console.log("📋 [평가 대시보드] 로드된 평가 데이터 개수:", submittedRecordings.length)
      console.log("🔍 상태별 분류:")
      const statusCounts = submittedRecordings.reduce((acc: any, ev: any) => {
        const status = ev.status || 'pending'
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {})
      console.log("상태별 개수:", statusCounts)

      // 디버깅: API에서 받아온 원본 데이터 요약만 출력 (성능 개선)
      console.log(`[디버깅] evaluation 개수: ${submittedRecordings.length}개`);

      const candidateList: EvaluationCandidate[] = submittedRecordings
        .map((evaluation: any, idx: number) => {
          // candidateInfo가 있으면 그걸 쓰고, 없으면 evaluation 자체를 쓴다!
          const submission = evaluation.candidateInfo && Object.keys(evaluation.candidateInfo).length > 0
            ? evaluation.candidateInfo
            : evaluation;
          // 성능 개선: 개별 submission 로그 제거
          return {
            id: evaluation.id || submission.id || `submission-${Date.now()}-${Math.random()}`,
            name: submission.name || "(이름없음)",
            employeeId: submission.employeeId || "(사번없음)",
            language: submission.language || "",
            category: submission.category || "",
            submittedAt: submission.submittedAt || "",
            recordings: submission.recordings || {},
            recordingBlobs: submission.recordingBlobs || {},
            uploadedFiles: submission.uploadedFiles || {},
            recordingCount: submission.recordingCount || 0, // 녹음 파일 개수 추가
            status: evaluation.status || "pending",
            approved: evaluation.approved || false,
            reviewedBy: evaluation.reviewedBy,
            reviewRequestedBy: evaluation.reviewRequestedBy,
            dropboxFiles: evaluation.dropboxFiles || submission.dropboxFiles || [],
            dropboxPath: evaluation.dropboxPath || submission.dropboxPath,
          }
        });
      setCandidates(candidateList)
    } catch (error) {
      console.warn("Dropbox에서 평가 데이터 복원 실패:", error)
      setCandidates([])
    } finally {
      setIsLoading(false)
    }
  }

  // 필터링된 후보자 목록 (최근 제출 순으로 정렬)
  const filteredCandidates = useMemo(() => {
    const arr = candidates
      .filter((candidate) => {
        // status가 없으면 'pending'으로 간주
        const status = candidate.status || 'pending';
        const matchesSearch =
          (candidate.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (candidate.employeeId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (candidate.language || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (candidate.category || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLanguage = languageFilter === "all" || candidate.language === languageFilter;
        // 평가 대기목록에는 pending, evaluating, reviewing, review_requested, re_evaluation 표시
        const matchesStatus = statusFilter === "all"
          ? (status === "pending" || status === "evaluating" || status === "reviewing" || status === "review_requested" || status === "re_evaluation")
          : status === statusFilter;
        return matchesSearch && matchesLanguage && matchesStatus;
      })
      .sort((a, b) => {
        const statusA = a.status || 'pending';
        const statusB = b.status || 'pending';
        // 우선순위: re_evaluation > review_requested > pending
        if (statusA === "re_evaluation" && statusB !== "re_evaluation") return -1;
        if (statusA !== "re_evaluation" && statusB === "re_evaluation") return 1;
        if (statusA === "review_requested" && statusB !== "review_requested") return -1;
        if (statusA !== "review_requested" && statusB === "review_requested") return 1;
        const dateA = new Date(a.submittedAt).getTime();
        const dateB = new Date(b.submittedAt).getTime();
        return dateB - dateA;
      });
    // 성능 개선: 필터링된 후보자 개수만 출력
    console.log("[디버깅] filteredCandidates 개수:", arr.length);
    return arr;
  }, [candidates, searchTerm, languageFilter, statusFilter]);

  const getLanguageDisplay = (language: string) => {
    const displays: { [key: string]: string } = {
      "korean-english": "한/영",
      japanese: "일본어",
      chinese: "중국어",
    }
    return displays[language] || language
  }

  // 날짜 형식을 "XXXX년 X월 X일" 형태로 변환
  const formatDisplayDate = (dateStr: string) => {
    // "2025년8월8일" → "2025년 8월 8일"
    const match = dateStr.match(/(\d{4})년(\d{1,2})월(\d{1,2})일/)
    if (match) {
      const [, year, month, day] = match
      return `${year}년 ${month}월 ${day}일`
    }

    // "2025-09-01" → "2025년 9월 1일"
    const dateMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/)
    if (dateMatch) {
      const [, year, month, day] = dateMatch
      return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`
    }

    return dateStr
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // 상태 표시 함수 추가
  const getStatusDisplay = (status?: string) => {
    const statusMap: { [key: string]: { text: string; color: string } } = {
      pending: { text: "평가 대기", color: "bg-blue-100 text-blue-800" },
      evaluating: { text: "평가 중", color: "bg-yellow-100 text-yellow-800" },
      reviewing: { text: "검토 중", color: "bg-amber-100 text-amber-800" },
      review_requested: { text: "검토 요청", color: "bg-orange-100 text-orange-800" },
      re_evaluation: { text: "재평가 대기", color: "bg-red-100 text-red-800" },
      completed: { text: "평가 완료", color: "bg-green-100 text-green-800" },
      approved: { text: "승인 완료", color: "bg-purple-100 text-purple-800" },
      submitted: { text: "평가 완료", color: "bg-green-100 text-green-800" },
    }
    return statusMap[status || "pending"] || statusMap.pending
  }

  // 언어별 색상 함수 추가
  const getLanguageColor = (language: string) => {
    const colorMap: { [key: string]: string } = {
      "korean-english": "border-blue-300 bg-blue-50 text-blue-700",
      "japanese": "border-purple-300 bg-purple-50 text-purple-700",
      "chinese": "border-red-300 bg-red-50 text-red-700",
    }
    return colorMap[language] || "border-gray-300 bg-gray-50 text-gray-700"
  }

  // 12시간 형식으로 변환 (예: "15:40" → "오후 3:40")
  const formatTo12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number)
    const period = hours >= 12 ? '오후' : '오전'
    const hours12 = hours % 12 || 12
    return `${period} ${hours12}:${minutes.toString().padStart(2, '0')}`
  }

  // 남은 시간 계산 (분 단위)
  const getTimeUntil = (targetTime: string): number => {
    const now = currentTime
    const [hours, minutes] = targetTime.split(':').map(Number)
    const target = new Date(now)
    target.setHours(hours, minutes, 0, 0)
    
    if (target < now) {
      target.setDate(target.getDate() + 1)
    }
    
    return Math.floor((target.getTime() - now.getTime()) / 60000) // 분 단위
  }

  // 긴급도 계산
  const getUrgencyLevel = (minutesUntil: number): 'urgent' | 'warning' | 'normal' | 'far' => {
    if (minutesUntil <= 5) return 'urgent'
    if (minutesUntil <= 15) return 'warning'
    if (minutesUntil <= 30) return 'normal'
    return 'far'
  }

  // 남은 시간 포맷팅
  const formatTimeUntil = (minutesUntil: number): string => {
    if (minutesUntil < 0) return '진행 중'
    if (minutesUntil === 0) return '곧 시작'
    if (minutesUntil < 60) return `${minutesUntil}분 후`
    const hours = Math.floor(minutesUntil / 60)
    const mins = minutesUntil % 60
    return mins > 0 ? `${hours}시간 ${mins}분 후` : `${hours}시간 후`
  }

  const playAudio = async (recordingKey: string) => {
    if (!selectedCandidate) return

    try {
      // 현재 재생 중인 오디오 정지
      if (currentlyPlaying && audioElementsRef.current[currentlyPlaying]) {
        audioElementsRef.current[currentlyPlaying].pause()
        audioElementsRef.current[currentlyPlaying].currentTime = 0
      }

      console.log("🎵 오디오 재생 시작:", recordingKey)
      console.log("🧩 재생할 때 key:", recordingKey)
      
      // 데이터 소스 확인
      const recordingsData = selectedCandidate.recordings?.[recordingKey]
      const recordingBlobsData = selectedCandidate.recordingBlobs?.[recordingKey]
      const uploadedFilesData = selectedCandidate.uploadedFiles?.[recordingKey]
      
      console.log("사용 가능한 데이터 소스:")
      console.log("- recordings:", typeof recordingsData, recordingsData ? "있음" : "없음")
      console.log("- recordingBlobs:", typeof recordingBlobsData, recordingBlobsData ? "있음" : "없음")
      console.log("- uploadedFiles:", typeof uploadedFilesData, uploadedFilesData ? "있음" : "없음")

      // 1. recordings에서 Base64 데이터 확인 및 Blob 변환 (우선순위 1)
      if (recordingsData) {
        console.log("📦 recordings 데이터 발견:", typeof recordingsData)
        

        
        // Base64 문자열인지 확인
        if (typeof recordingsData === 'string' && recordingsData.length > 100) {
          try {
            console.log("🔄 Base64를 Blob으로 변환 중...")
            
            let base64Data = recordingsData
            
            // data:audio/webm;base64, 형식인지 확인
            if (recordingsData.startsWith('data:audio/')) {
              base64Data = recordingsData.split(',')[1]
            }
            
            const binaryString = atob(base64Data)
            const bytes = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i)
            }
            const blob = new Blob([bytes], { type: 'audio/webm' })
            
            console.log("✅ Blob 변환 성공:", blob.size, "bytes")
            const audioUrl = URL.createObjectURL(blob)
            const audio = new Audio(audioUrl)

                        audio.onended = () => {
              console.log("🎵 재생 완료:", recordingKey)
              syncAudioState(null)
              URL.revokeObjectURL(audioUrl)
            }
            
            audio.onerror = (e) => {
              console.error("❌ 오디오 재생 실패 (Base64):", recordingKey, e)
              syncAudioState(null)
              URL.revokeObjectURL(audioUrl)
            }
            
            audioElementsRef.current[recordingKey] = audio
            syncAudioState(recordingKey)
            await audio.play()
            console.log("✅ 오디오 재생 시작됨:", recordingKey)
            return
          } catch (error) {
            console.error("❌ Base64 변환 실패:", error)
          }
        } else {
          console.log("❌ recordings 데이터가 유효한 Base64 문자열이 아님:", typeof recordingsData, recordingsData?.length)
        }
      }
      
      // 2. recordingBlobs에서 Blob 재생 (우선순위 2)
      if (selectedCandidate.recordingBlobs && selectedCandidate.recordingBlobs[recordingKey]) {
        const blob = selectedCandidate.recordingBlobs[recordingKey]
        
        // Blob 타입 체크 및 유효성 검사
        if (!(blob instanceof Blob) || blob.size === 0) {
          console.error("❌ 유효하지 않은 Blob:", blob)
        } else {
          console.log("📦 Blob 데이터 발견:", blob.size, "bytes")
          const audioUrl = URL.createObjectURL(blob)
          const audio = new Audio(audioUrl)

          audio.onended = () => {
            console.log("🎵 재생 완료:", recordingKey)
            syncAudioState(null)
            URL.revokeObjectURL(audioUrl)
          }

                      audio.onerror = (e) => {
              console.error("❌ 오디오 재생 실패 (Blob):", recordingKey, e)
              syncAudioState(null)
              URL.revokeObjectURL(audioUrl)
            }

          audioElementsRef.current[recordingKey] = audio
          syncAudioState(recordingKey)
          await audio.play()
          console.log("✅ 오디오 재생 시작됨:", recordingKey)
          return
        }
      }
      
      // 3. uploadedFiles에서 URL을 Blob으로 변환하여 재생 (CSP 문제 해결)
      if (selectedCandidate.uploadedFiles && selectedCandidate.uploadedFiles[recordingKey]) {
        const uploadedFile = selectedCandidate.uploadedFiles[recordingKey]
        let url: string | null = null
        
        console.log("📁 uploadedFiles 데이터:", typeof uploadedFile, uploadedFile)
        
        // 다양한 URL 속성 체크
        if (typeof uploadedFile === 'object' && uploadedFile !== null) {
          const fileObj = uploadedFile as any
          if (typeof fileObj.url === 'string') {
            url = fileObj.url
          } else if (typeof fileObj.fileUrl === 'string') {
            url = fileObj.fileUrl
          } else if (typeof fileObj.downloadUrl === 'string') {
            url = fileObj.downloadUrl
          } else {
            console.log("📁 uploadedFile 객체의 속성들:", Object.keys(fileObj))
          }
        } else if (typeof uploadedFile === 'string') {
          url = uploadedFile
        } else {
          console.log("❌ uploadedFile이 예상과 다른 타입:", typeof uploadedFile)
        }
        
        if (url) {
          console.log("🌐 URL을 Blob으로 변환 시도:", url)
          
          try {
            // URL에서 파일을 fetch하여 Blob으로 변환
            const response = await fetch(url)
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }
            
            const blob = await response.blob()
            console.log("✅ URL에서 Blob 변환 성공:", blob.size, "bytes")
            
            const audioUrl = URL.createObjectURL(blob)
            const audio = new Audio(audioUrl)
            
            audio.onended = () => {
              console.log("🎵 재생 완료:", recordingKey)
              syncAudioState(null)
              URL.revokeObjectURL(audioUrl)
            }
            
            audio.onerror = (e) => {
              console.error("❌ 오디오 재생 실패 (Blob):", recordingKey, e)
              syncAudioState(null)
              URL.revokeObjectURL(audioUrl)
            }
            
            audioElementsRef.current[recordingKey] = audio
            syncAudioState(recordingKey)
            await audio.play()
            console.log("✅ Blob 오디오 재생 시작됨:", recordingKey)
            return
          } catch (error) {
            console.error("❌ URL에서 Blob 변환 실패:", error)
            console.log("🔄 직접 URL 재생으로 폴백 시도...")
            
            // 폴백: 직접 URL 재생 시도
            const audio = new Audio(url)
            
            audio.onended = () => {
              console.log("🎵 재생 완료:", recordingKey)
              syncAudioState(null)
            }
            
            audio.onerror = (e) => {
              console.error("❌ 오디오 재생 실패 (URL, CSP 문제):", url, e)
              syncAudioState(null)
            }
            
            audioElementsRef.current[recordingKey] = audio
            syncAudioState(recordingKey)
            await audio.play()
            console.log("✅ URL 오디오 재생 시작됨:", recordingKey)
            return
          }
        } else {
          console.log("❌ uploadedFiles에서 유효한 URL을 찾을 수 없음")
        }
      }
      
      // 모든 방법 실패
      console.warn("❌ 녹음 파일을 찾을 수 없습니다:", recordingKey)
      console.log("사용 가능한 데이터:")
      console.log("- recordings 키:", Object.keys(selectedCandidate.recordings || {}))
      console.log("- recordingBlobs 키:", Object.keys(selectedCandidate.recordingBlobs || {}))
      console.log("- uploadedFiles 키:", Object.keys(selectedCandidate.uploadedFiles || {}))
      
    } catch (error) {
      console.error("❌ 오디오 재생 중 오류:", error)
      syncAudioState(null)
    }
  }

  // 문안별 재생용 토글 함수 (일시정지/재생 지원)
  const toggleAudio = async (recordingKey: string) => {
    if (!selectedCandidate) return;

    let audio = audioElementsRef.current[recordingKey];

    // 이미 Audio 객체가 있으면 일시정지/재생 토글
    if (audio) {
      if (audio.paused) {
        await audio.play();
        syncAudioState(recordingKey);
      } else {
        audio.pause();
        syncAudioState(null);
      }
      return;
    }

    // Audio 객체가 없으면 playAudio 로직 실행 (Audio 객체 생성 및 play)
    await playAudio(recordingKey);
  };

  const stopAudio = () => {
    if (currentlyPlaying && audioElementsRef.current[currentlyPlaying]) {
      audioElementsRef.current[currentlyPlaying].pause()
      audioElementsRef.current[currentlyPlaying].currentTime = 0
      syncAudioState(null)
    }
  }

  const playAllRecordings = async (targetLanguage?: "korean" | "english") => {
    console.log("🎵 playAllRecordings 함수 호출됨", { targetLanguage, playbackState })
    if (!selectedCandidate || isPlayingAllRef.current) {
      console.log("❌ 조건 불만족:", { selectedCandidate: !!selectedCandidate, isPlayingAll: isPlayingAllRef.current })
      return
    }

      setIsPlayingAll(true)
    isPlayingAllRef.current = true // ref도 동시에 설정
    
    // 언어별로 올바른 키 필터링 및 정렬
    const allRecordings = Object.keys(selectedCandidate.recordings || {})
    
    let recordings: string[]
    
    // 일시 중지 상태에서 재개하는 경우
    if (playbackState && playbackState.isPaused) {
      console.log("▶️ 일시 중지된 재생 재개:", playbackState.currentIndex)
      recordings = playbackState.recordings
    } else {
      // 새로운 재생 시작
    if (selectedCandidate.language === "korean-english") {
      if (targetLanguage === "english") {
        // 영어 전체 재생
        recordings = allRecordings.filter(key => key.endsWith("-english"))
      } else {
        // 한국어 전체 재생 (기본값)
        recordings = allRecordings.filter(key => key.endsWith("-korean"))
      }
    } else {
      // 일본어, 중국어는 해당 언어 키 사용
      const languageSuffix = selectedCandidate.language
      recordings = allRecordings.filter(key => key.endsWith(`-${languageSuffix}`))
    }
    
    // 번호 순서대로 정렬 (1번, 2번, 3번...)
    recordings.sort((a, b) => {
      const aMatch = a.match(/^(\d+)-/)
      const bMatch = b.match(/^(\d+)-/)
      
      if (aMatch && bMatch) {
        const aNum = parseInt(aMatch[1])
        const bNum = parseInt(bMatch[1])
        return aNum - bNum
      }
      
      return a.localeCompare(b)
    })
    }
    
    console.log("전체 재생 시작:", recordings)
    console.log("정렬된 순서:", recordings.map(key => {
      const match = key.match(/^(\d+)-/)
      return match ? `${match[1]}번` : key
    }))
    console.log("언어:", selectedCandidate.language, "타겟 언어:", targetLanguage, "필터링된 키:", recordings)

    console.log("🔍 for 루프 시작, recordings 길이:", recordings.length)
    
    // 시작 인덱스 결정
    const startIndex = (playbackState && playbackState.isPaused) ? playbackState.currentIndex : 0
    console.log("시작 인덱스:", startIndex)

    // 재생 상태 초기화
    setPlaybackState({
      isPaused: false,
      currentIndex: startIndex,
      recordings,
      targetLanguage
    })

    for (let i = startIndex; i < recordings.length; i++) {
      // 현재 재생 인덱스를 ref에 저장 (pauseAllRecordings에서 사용)
      currentPlaybackRef.current = {
        currentIndex: i,
        recordings,
        targetLanguage
      }
      
      // ref를 사용해서 즉시 재생 중지 확인
      if (!isPlayingAllRef.current) {
        console.log("⏸️ 재생 중단됨, 현재 인덱스:", i)
        setPlaybackState({
          isPaused: true,
          currentIndex: i,
          recordings,
          targetLanguage
        })
        return
      }
      
      const recordingKey = recordings[i]
      console.log("🔄 루프 반복:", recordingKey, "인덱스:", i)

      console.log("재생 중인 파일:", recordingKey)
      
      // 현재 재생 중인 오디오 정지
      if (currentlyPlaying && audioElementsRef.current[currentlyPlaying]) {
        audioElementsRef.current[currentlyPlaying].pause()
        audioElementsRef.current[currentlyPlaying].currentTime = 0
      }

      try {
        // recordings에서 Base64 데이터로 재생
        if (selectedCandidate && selectedCandidate.recordings && selectedCandidate.recordings[recordingKey]) {
          const recordingData = selectedCandidate.recordings[recordingKey]
           console.log("recordings에서 재생 시도:", recordingKey)
           
           // Base64 문자열인지 확인
           if (typeof recordingData === 'string' && recordingData.length > 100) {
            try {
              console.log("Base64 데이터를 Blob으로 변환 중...")
              
              let base64Data = recordingData
              
              // data:audio/webm;base64, 형식인지 확인
              if (recordingData.startsWith('data:audio/')) {
                base64Data = recordingData.split(',')[1]
              }
              
              const binaryString = atob(base64Data)
              const bytes = new Uint8Array(binaryString.length)
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i)
              }
              const blob = new Blob([bytes], { type: 'audio/webm' })
              
              console.log("Blob 변환 성공:", blob.size, "bytes")
              const audioUrl = URL.createObjectURL(blob)
              const audio = new Audio(audioUrl)

              // Promise를 사용해서 재생 완료를 기다림
              const playPromise = new Promise<void>((resolve, reject) => {
              audio.onended = () => {
                console.log("오디오 재생 완료:", recordingKey)
                syncAudioState(null)
                URL.revokeObjectURL(audioUrl)
                  resolve()
              }

              audio.onerror = (e) => {
                console.error("오디오 재생 실패:", recordingKey, e)
                syncAudioState(null)
                URL.revokeObjectURL(audioUrl)
                  reject(e)
              }
              
              // ⭐ 일시 정지 시에도 Promise를 완료시켜서 for 루프가 계속 진행되도록!
              audio.onpause = () => {
                console.log("⏸️ 오디오 일시 정지됨:", recordingKey)
                // pause 시에는 URL을 정리하지 않음 (이어서 재생 위해)
                resolve()
              }
              
              audio.onloadstart = () => {
                console.log("오디오 로딩 시작:", recordingKey)
              }
              
              audio.oncanplay = () => {
                console.log("오디오 재생 가능:", recordingKey)
              }
              })
              
              audioElementsRef.current[recordingKey] = audio
              syncAudioState(recordingKey)
              
              console.log("오디오 재생 시작:", recordingKey)
              await audio.play()
              console.log("오디오 재생 명령 완료:", recordingKey)
              
              // 재생 완료까지 대기
              await playPromise
              
              // 다음 파일 재생 전 잠시 대기
              await new Promise(resolve => setTimeout(resolve, 500))
            } catch (error) {
              console.error("Base64 변환 실패:", recordingKey, error)
            }
          } else {
            console.warn("유효하지 않은 오디오 데이터:", recordingKey, "타입:", typeof recordingData, "시작:", recordingData?.substring(0, 50))
          }
        } else {
          console.warn("recordings에서 데이터를 찾을 수 없습니다:", recordingKey)
        }
      } catch (error) {
        console.error("재생 중 오류:", recordingKey, error)
      }

      // 다음 녹음 전 1초 대기
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    setIsPlayingAll(false)
    isPlayingAllRef.current = false
    currentPlaybackRef.current = null // ref 초기화
    setPlaybackState(null)
  }

  // 일시 중지 기능 - 재생 위치 유지
  const pauseAllRecordings = () => {
    console.log("⏸️ 일시 중지 요청")
    setIsPlayingAll(false)
    isPlayingAllRef.current = false // ref도 동시에 설정
    
    // 현재 재생 중인 인덱스 정보를 즉시 playbackState에 저장
    if (currentPlaybackRef.current) {
      console.log("💾 현재 재생 위치 저장:", currentPlaybackRef.current.currentIndex)
      setPlaybackState({
        isPaused: true,
        currentIndex: currentPlaybackRef.current.currentIndex,
        recordings: currentPlaybackRef.current.recordings,
        targetLanguage: currentPlaybackRef.current.targetLanguage
      })
    }
    
    // 현재 재생 중인 오디오만 일시 정지 (currentTime 유지)
    if (currentlyPlaying && audioElementsRef.current[currentlyPlaying]) {
      audioElementsRef.current[currentlyPlaying].pause()
    }
  }

  const stopAllRecordings = () => {
    console.log("⏹️ 전체 재생 중지 (초기화)")
    setIsPlayingAll(false)
    isPlayingAllRef.current = false // ref도 동시에 설정
    currentPlaybackRef.current = null // ref 초기화
    setPlaybackState(null)
    
    // 현재 재생 중인 모든 오디오 정지 및 초기화
    if (currentlyPlaying && audioElementsRef.current[currentlyPlaying]) {
      audioElementsRef.current[currentlyPlaying].pause()
      audioElementsRef.current[currentlyPlaying].currentTime = 0
    }
    syncAudioState(null)
  }

  // 페이지 이탈 시 재생 중지
  useEffect(() => {
    return () => {
      if (isPlayingAll) {
        stopAllRecordings()
      }
    }
  }, [isPlayingAll])

  // 탭 전환 시 재생 중지
  const handleLanguageChange = (language: "korean" | "english") => {
    if (isPlayingAll) {
      stopAllRecordings()
    }
    setCurrentLanguage(language)
  }

  // 실시간 카테고리별 점수 계산
  const calculateCurrentCategoryScore = (category: string, criteria: any, langKey?: string) => {
    const currentScores = getCurrentScores()
    if (typeof criteria === "object") {
      return Object.keys(criteria).reduce((sum, subcat) => {
        const scoreKey = selectedCandidate?.language === "korean-english" && langKey 
          ? `${langKey}-${category}-${subcat}`
          : `${category}-${subcat}`
        const maxScore = criteria[subcat]
        const defaultValue = Math.round((Number(maxScore) * 0.8) * 2) / 2
        return sum + (currentScores[scoreKey] !== undefined ? currentScores[scoreKey] : defaultValue)
      }, 0)
    } else {
      const scoreKey = selectedCandidate?.language === "korean-english" && langKey 
        ? `${langKey}-${category}`
        : category
      const defaultValue = Math.round((Number(criteria) * 0.8) * 2) / 2
      return currentScores[scoreKey] !== undefined ? currentScores[scoreKey] : defaultValue
    }
  }

  // 실시간 총점 계산
  const getCurrentTotalScore = () => {
    const categoryScores = calculateCategoryScoresDetailed();
    console.log("🔍 [DEBUG] categoryScores keys:", Object.keys(categoryScores).slice(0, 10), "...", Object.keys(categoryScores).length)
    const sampleKeys = [
      "korean-발음-자음", "korean-발음-모음", "korean-전달력-부드러운 연결",
      "english-발음_자음-P / F", "english-전달력-자연스러운 연결"
    ]
    const sample = Object.fromEntries(sampleKeys.map(k => [k, (categoryScores as any)[k]]))
    console.log("🔍 [DEBUG] categoryScores sample:", sample)
    if (selectedCandidate?.language === "korean-english") {
      const koreanCategories = ["발음", "억양", "전달력", "음성", "속도"]; 
      const englishCategories = ["발음_자음", "발음_모음", "억양", "강세", "전달력"]; 
      const koreanScore = koreanCategories.reduce((sum, cat) => sum + (categoryScores[`korean-${cat}`] || 0), 0);
      const englishScore = englishCategories.reduce((sum, cat) => sum + (categoryScores[`english-${cat}`] || 0), 0);
      return koreanScore + englishScore;
    } else {
      return Object.values(categoryScores).reduce((sum, score) => sum + score, 0);
    }
  }

  // 카테고리 점수 계산
  const calculateCategoryScores = () => {
    const categoryScores: { [key: string]: number } = {}
    const currentScores = getCurrentScores()

    if (selectedCandidate?.language === "korean-english") {
      const koreanCategories = ["발음", "억양", "전달력", "음성", "속도"]
      for (const category of koreanCategories) {
        const categoryKey = `korean-${category}`
        const criteria = evaluationCriteria.korean[category as keyof typeof evaluationCriteria.korean]
        categoryScores[categoryKey] = calculateCurrentCategoryScore(category, criteria, "korean")
      }

      const englishCategories = ["발음_자음", "발음_모음", "억양", "강세", "전달력"]
      for (const category of englishCategories) {
        const categoryKey = `english-${category}`
        const criteria = evaluationCriteria.english[category as keyof typeof evaluationCriteria.english]
        categoryScores[categoryKey] = calculateCurrentCategoryScore(category, criteria, "english")
      }
    } else {
      const language = selectedCandidate?.language as keyof typeof evaluationCriteria
      const criteria = evaluationCriteria[language]

      if (criteria) {
        Object.entries(criteria).forEach(([category, maxScore]) => {
          categoryScores[category] = calculateCurrentCategoryScore(category, maxScore)
        })
      }
    }

    return categoryScores
  }

  // 상세 리포트용: 한/영 평가에서 소항목 점수까지 포함한 categoryScores 생성
  const calculateCategoryScoresDetailed = () => {
    const categoryScores: { [key: string]: number } = {}
    const currentScores = getCurrentScores()
    
    // 🔥 브라우저 콘솔 디버깅 시작
    console.log("🔥🔥🔥 [BROWSER DEBUG] calculateCategoryScoresDetailed 시작 🔥🔥🔥")
    console.log("🔥 [BROWSER] 언어:", selectedCandidate?.language)
    console.log("🔥 [BROWSER] currentCandidateId:", currentCandidateId)
    console.log("🔥 [BROWSER] currentScores:", currentScores)
    
    // 저장된 categoryScores가 있으면 우선 사용 (admin 모드에서 중요)
    const storedCategoryScores = currentCandidateId && evaluationData[currentCandidateId]?.categoryScores
    console.log("🔥 [BROWSER] storedCategoryScores:", storedCategoryScores)
    console.log("🔥 [BROWSER] storedCategoryScores keys:", storedCategoryScores ? Object.keys(storedCategoryScores) : 'NONE')
    console.log("🔥 [BROWSER] evaluationData 전체:", evaluationData[currentCandidateId || ''])
    if (storedCategoryScores && Object.keys(storedCategoryScores).length > 0) {
      console.log("✅ 저장된 categoryScores 사용:", storedCategoryScores)
      
      // 🔥 중요: 저장된 소항목 점수에서 대항목 합산 점수를 계산해서 추가
      const enhancedScores = { ...storedCategoryScores }
      
      if (selectedCandidate?.language === "korean-english") {
        // 한국어 대항목 합산
        const koreanCategories = ["발음", "억양", "전달력", "음성", "속도"]
        for (const category of koreanCategories) {
          const sum = Object.entries(storedCategoryScores)
            .filter(([key]) => key.startsWith(`korean-${category}-`))
            .reduce((acc, [, score]) => acc + (score || 0), 0)
          enhancedScores[`korean-${category}`] = sum
          console.log(`✅ 한국어 ${category} 합산: ${sum}`)
        }
        
        // 영어 대항목 합산
        const englishCategories = ["발음_자음", "발음_모음", "억양", "강세", "전달력"]
        for (const category of englishCategories) {
          const sum = Object.entries(storedCategoryScores)
            .filter(([key]) => key.startsWith(`english-${category}-`))
            .reduce((acc, [, score]) => acc + (score || 0), 0)
          enhancedScores[`english-${category}`] = sum
          console.log(`✅ 영어 ${category} 합산: ${sum}`)
        }
      } else {
        // 일본어/중국어 대항목 정규화 + 기본값(80%) 보정
        console.log("🔥 [BROWSER] 일본어/중국어 대항목 합산 시작")
        console.log("🔥 [BROWSER] evaluationData scores:", evaluationData[currentCandidateId || ""]?.scores)
        console.log("🔥 [BROWSER] storedCategoryScores:", storedCategoryScores)
        const baseScores = {
          ...(evaluationData[currentCandidateId || ""]?.scores || {}),
          ...storedCategoryScores,
        } as Record<string, number>
        console.log("🔥 [BROWSER] baseScores 합성 결과:", baseScores)

        const pickWithAliases = (aliases: string[]): number | undefined => {
          for (const a of aliases) {
            // 대/소문자 차이 및 공백 차이 최소화
            const direct = baseScores[a]
            if (typeof direct === "number") return direct
            const foundKey = Object.keys(baseScores).find(k => k.toLowerCase() === a.toLowerCase())
            if (foundKey && typeof baseScores[foundKey] === "number") return baseScores[foundKey]
          }
          return undefined
        }

        if (selectedCandidate?.language === "japanese") {
          const expected: Array<{ label: string; max: number; aliases: string[] }> = [
            { label: "발음",  max: 30, aliases: ["발음", "Pronunciation"] },
            { label: "억양",  max: 20, aliases: ["억양", "Intonation"] },
            { label: "Pause", max: 25, aliases: ["Pause", "PAUSE"] },
            { label: "Speed", max: 10, aliases: ["Speed", "속도"] },
            { label: "Tone",  max: 10, aliases: ["Tone"] },
            { label: "Volume",max: 5,  aliases: ["Volume"] },
          ]
          for (const item of expected) {
            const v = pickWithAliases(item.aliases)
            const value = typeof v === "number" ? v : Math.round(item.max * 0.8 * 2) / 2
            enhancedScores[item.label] = value
            console.log(`🔥 [BROWSER] 일본어 ${item.label}: ${value} (aliases: ${item.aliases.join(', ')}, found: ${v})`)
          }
        } else if (selectedCandidate?.language === "chinese") {
          const expected: Array<{ label: string; max: number; aliases: string[] }> = [
            { label: "한어병음",   max: 30, aliases: ["한어병음", "성조", "Tones", "Tone marks", "Pitch", "Pinyin"] },
            { label: "억양",   max: 20, aliases: ["억양", "Intonation"] },
            { label: "PAUSE", max: 20, aliases: ["PAUSE", "Pause"] },
            { label: "속도",   max: 10, aliases: ["속도", "Speed"] },
            { label: "Tone",  max: 10, aliases: ["Tone"] },
            { label: "Volume",max: 10, aliases: ["Volume"] },
          ]
          for (const item of expected) {
            const v = pickWithAliases(item.aliases)
            const value = typeof v === "number" ? v : Math.round(item.max * 0.8 * 2) / 2
            enhancedScores[item.label] = value
            console.log(`✅ 중국어 ${item.label}: ${value}`)
          }
        }
      }
      
      console.log("🔥 [BROWSER] 대항목 합산 완료 - enhancedScores:", enhancedScores)
      console.log("🔥 [BROWSER] enhancedScores 키 목록:", Object.keys(enhancedScores))
      return enhancedScores
    }

    if (selectedCandidate?.language === "korean-english") {
      // 한국어 카테고리: 합계 + 소항목 점수
      const koreanCategories = Object.keys(evaluationCriteria.korean)
      for (const category of koreanCategories) {
        const criteria = evaluationCriteria.korean[category as keyof typeof evaluationCriteria.korean]
        // 합계
        categoryScores[`korean-${category}`] = calculateCurrentCategoryScore(category, criteria, "korean")
        // 소항목
        Object.entries(criteria).forEach(([subCat, maxValue]) => {
          const key = `korean-${category}-${subCat}`
          const defaultValue = Math.round((Number(maxValue) * 0.8) * 2) / 2
          categoryScores[key] = currentScores[key] !== undefined ? currentScores[key] : defaultValue
        })
      }

      // 영어 카테고리: 합계 + 소항목 점수
      const englishCategories = Object.keys(evaluationCriteria.english)
      for (const category of englishCategories) {
        const criteria = evaluationCriteria.english[category as keyof typeof evaluationCriteria.english]
        // 합계
        categoryScores[`english-${category}`] = calculateCurrentCategoryScore(category, criteria, "english")
        // 소항목
        Object.entries(criteria).forEach(([subCat, maxValue]) => {
          const key = `english-${category}-${subCat}`
          const defaultValue = Math.round((Number(maxValue) * 0.8) * 2) / 2
          categoryScores[key] = currentScores[key] !== undefined ? currentScores[key] : defaultValue
        })
      }
    } else {
      // 일본어/중국어는 기존 합계 로직 유지
      const language = selectedCandidate?.language as keyof typeof evaluationCriteria
      const criteria = evaluationCriteria[language]
      if (criteria) {
        Object.entries(criteria).forEach(([category, maxScore]) => {
          categoryScores[category] = calculateCurrentCategoryScore(category, maxScore)
        })
      }
    }

    return categoryScores
  }

  const handleSubmitEvaluation = async (result: any) => {
    if (!currentCandidateId || !selectedCandidate) return

    console.log("최종 평가 결과:", result)

    try {
              // 직원 정보에서 이름 가져오기
        const employeeName = await getEmployeeName(authenticatedUser?.email || '');
        
        // 🔥 중요: 제출 시 0인 점수를 80% 기본값으로 보정
        const correctedScores = { ...result.scores };
        console.log("🔥 [BROWSER] 제출 전 점수 보정 시작 - 원본 점수:", result.scores);
        
        if (selectedCandidate.language === "korean-english") {
          const allCategories = [
            ...Object.keys(evaluationCriteria.korean),
            ...Object.keys(evaluationCriteria.english)
          ];
          
          for (const category of allCategories) {
            const koreanPrefix = Object.keys(evaluationCriteria.korean).includes(category) ? "korean-" : "english-";
            const isKorean = Object.keys(evaluationCriteria.korean).includes(category);
            const criteriaGroup = isKorean ? evaluationCriteria.korean : evaluationCriteria.english;
            const criteria = (criteriaGroup as any)[category];
            
            if (typeof criteria === 'object') {
              // 소항목이 있는 경우
              for (const [subKey, maxScore] of Object.entries(criteria)) {
                const scoreKey = `${koreanPrefix}${category}-${subKey}`;
                if (correctedScores[scoreKey] === undefined) {
                  correctedScores[scoreKey] = Math.round((Number(maxScore) * 0.8) * 2) / 2;
                  console.log(`🔥 [BROWSER] ${scoreKey}: undefined → ${correctedScores[scoreKey]} (80%)`);
                }
              }
            } else {
              // 직접 점수인 경우
              const scoreKey = `${koreanPrefix}${category}`;
              if (correctedScores[scoreKey] === undefined) {
                correctedScores[scoreKey] = Math.round((Number(criteria) * 0.8) * 2) / 2;
                console.log(`🔥 [BROWSER] ${scoreKey}: undefined → ${correctedScores[scoreKey]} (80%)`);
              }
            }
          }
        } else {
          // 일본어/중국어
          const criteria = evaluationCriteria[selectedCandidate.language as keyof typeof evaluationCriteria];
          for (const [category, maxScore] of Object.entries(criteria)) {
            if (correctedScores[category] === undefined) {
              correctedScores[category] = Math.round((Number(maxScore) * 0.8) * 2) / 2;
              console.log(`🔥 [BROWSER] ${category}: undefined → ${correctedScores[category]} (80%)`);
            }
          }
        }
        
        console.log("🔥 [BROWSER] 제출 후 보정된 점수:", correctedScores);
        
        // grade 계산 (result.grade가 없으면 totalScore 기반으로 계산)
        let calculatedGrade = result.grade;
        if (!calculatedGrade || calculatedGrade === 'N/A') {
          const gradeInfo = getGradeInfo(
            result.totalScore || 0,
            {}, // categoryScores - 빈 객체 전달
            selectedCandidate.language,
            selectedCandidate.category
          );
          calculatedGrade = gradeInfo.grade;
          console.log(`✅ [BROWSER] grade 계산됨: ${calculatedGrade} (totalScore: ${result.totalScore})`);
        }
        
        // 평가 완료 API 호출
        const completeData = {
          evaluationId: currentCandidateId,
          evaluatedBy: employeeName,
          scores: correctedScores,
        comments: result.comments || { korean: '', english: '' },
        totalScore: result.totalScore || 0,
        koreanTotalScore: result.koreanTotalScore || 0,
        englishTotalScore: result.englishTotalScore || 0,
        grade: calculatedGrade
      };

      const response = await fetch("/api/evaluations/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(completeData),
      })

      if (!response.ok) {
        throw new Error("평가 결과 저장 실패")
      }

      const apiResult = await response.json()
      console.log("평가 결과 저장 성공:", apiResult)

      // 성공적으로 제출되면 목록에서 해당 후보자 제거
      await loadCandidates(); // 목록 새로고침(상태 반영)
      
      // 평가 제출 완료 후 평가 화면 닫기 (대기목록으로 돌아가기)
      setShowSummary(false)
      setSelectedCandidate(null)

      // 제출 완료 팝업창 표시
      alert(`✅ 평가 제출이 완료되었습니다!\n\n${selectedCandidate?.name} (${selectedCandidate?.employeeId}) 님의 평가가 성공적으로 제출되었습니다.`)

    } catch (error) {
      console.error("평가 결과 저장 중 오류 발생:", error)
      // 사용자에게 오류 알림 (예: 토스트 메시지)
    }
  }

  // 평가 완료 후 대시보드로 돌아가기
  const handleEvaluationComplete = () => {
    setShowSummary(false)
    // selectedCandidate를 null로 설정하지 않고 summary만 닫기
    // 후보자 목록 새로고침
    loadCandidates()
  }

  // localStorage 캐시 관리 함수 추가
  const manageLocalStorageCache = (newData: any) => {
    // 캐시 완전 비활성화 (localStorage 쿼터 문제 해결)
    const DISABLE_CACHE = true; // 이 값을 true로 설정하면 캐시를 완전히 비활성화
    
    if (DISABLE_CACHE) {
      console.log("캐시 비활성화됨 - localStorage 사용 안함");
      return;
    }
    
    try {
      const maxCacheSize = 10; // 캐시 크기를 10개로 대폭 줄임
      
      // 오디오 데이터를 제외한 필수 정보만 저장 (용량 절약)
      const essentialData = {
        id: newData.id,
        name: newData.name,
        employeeId: newData.employeeId,
        language: newData.language,
        category: newData.category,
        submittedAt: newData.submittedAt,
        status: newData.status,
        dropboxPath: newData.dropboxPath,
        dropboxFileId: newData.dropboxFileId,
        dropboxFileName: newData.dropboxFileName,
        // recordings는 제외 (용량이 큼)
        // recordingBlobs는 제외 (용량이 큼)
        uploadedFiles: newData.uploadedFiles,
        driveFolder: newData.driveFolder,
        reviewedBy: newData.reviewedBy,
        reviewRequestedBy: newData.reviewRequestedBy,
        reviewRequestedAt: newData.reviewRequestedAt,
        approved: newData.approved,
        dropboxFiles: newData.dropboxFiles
      };
      
      const existingCache = JSON.parse(localStorage.getItem("cachedEvaluations") || "[]");
      
      // 새 데이터 추가
      const updatedCache = [...existingCache, essentialData];
      
      // 캐시 크기 제한
      if (updatedCache.length > maxCacheSize) {
        // 가장 오래된 항목들 제거 (앞쪽부터)
        updatedCache.splice(0, updatedCache.length - maxCacheSize);
      }
      
      localStorage.setItem("cachedEvaluations", JSON.stringify(updatedCache));
    } catch (error) {
      console.warn("캐시 저장 실패, 기존 캐시 정리:", error);
      
      // 더 적극적인 캐시 정리
      try {
        // 모든 관련 localStorage 항목 정리
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('cached') || key.includes('evaluation') || key.includes('recording'))) {
            keysToRemove.push(key);
          }
        }
        
        // 관련 항목들 삭제
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // 새 데이터만 저장 (오디오 데이터 제외)
        const essentialData = {
          id: newData.id,
          name: newData.name,
          employeeId: newData.employeeId,
          language: newData.language,
          category: newData.category,
          submittedAt: newData.submittedAt,
          status: newData.status,
          dropboxPath: newData.dropboxPath,
          dropboxFileId: newData.dropboxFileId,
          dropboxFileName: newData.dropboxFileName,
          uploadedFiles: newData.uploadedFiles,
          driveFolder: newData.driveFolder,
          reviewedBy: newData.reviewedBy,
          reviewRequestedBy: newData.reviewRequestedBy,
          reviewRequestedAt: newData.reviewRequestedAt,
          approved: newData.approved,
          dropboxFiles: newData.dropboxFiles
        };
        
        localStorage.setItem("cachedEvaluations", JSON.stringify([essentialData]));
      } catch (e) {
        console.error("캐시 정리 실패:", e);
        // 최후의 수단: 캐시 완전 비활성화
        try {
          localStorage.removeItem("cachedEvaluations");
        } catch (finalError) {
          console.error("캐시 완전 비활성화 실패:", finalError);
        }
      }
    }
  };

  // Base64를 Blob URL로 변환하는 함수 (CSP 호환 버전)
  const createAudioBlobUrl = (base64Data: string): string | null => {
    try {
      if (!base64Data || typeof base64Data !== 'string') {
        return null;
      }

      // 캐시에 있으면 재사용하여 불필요한 src 변경 방지
      if (audioUrlCacheRef.current[base64Data]) {
        return audioUrlCacheRef.current[base64Data]
      }

      // data: URL 형태인 경우 Blob URL로 변환 (CSP 호환)
      if (base64Data.startsWith('data:audio/')) {
        try {
          const base64String = base64Data.split(',')[1];
          if (!base64String) {
            console.warn("data: URL에서 Base64 데이터를 추출할 수 없습니다.");
            return null;
          }

          // Base64를 Blob으로 변환
          const binaryString = atob(base64String);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const blob = new Blob([bytes], { type: 'audio/webm' });
          const url = URL.createObjectURL(blob)
          audioUrlCacheRef.current[base64Data] = url
          return url;
        } catch (error) {
          console.error("data: URL을 Blob URL로 변환 실패:", error);
          return null;
        }
      }

      // 일반 URL인 경우 그대로 사용
      if (base64Data.startsWith('http') || base64Data.startsWith('/')) {
        // 외부/상대 경로는 그대로 사용 (캐싱 불필요)
        return base64Data;
      }

      // 순수 Base64 문자열인 경우에만 변환
      if (base64Data.length > 100) {
        try {
          // Base64 유효성 검사
          const isValidBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(base64Data);
          if (!isValidBase64) {
            console.warn("유효하지 않은 Base64 문자열:", base64Data.substring(0, 50) + "...");
            return null;
          }

          // Base64를 Blob으로 변환
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const blob = new Blob([bytes], { type: 'audio/webm' });
          const url = URL.createObjectURL(blob)
          audioUrlCacheRef.current[base64Data] = url
          return url;
        } catch (error) {
          console.error("Base64 디코딩 실패:", error);
          return null;
        }
      }

      return null;
    } catch (error) {
      console.error("Blob URL 생성 실패:", error);
      return null;
    }
  };

  // 오디오 URL 정리 함수
  const cleanupAudioUrls = () => {
    // 컴포넌트 언마운트 시 Blob URL 정리
    return () => {
      try {
        const cache = audioUrlCacheRef.current
        Object.keys(cache).forEach((key) => {
          try { URL.revokeObjectURL(cache[key]) } catch {}
        })
      } finally {
        audioUrlCacheRef.current = {}
      }
    };
  };

  // useEffect로 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return cleanupAudioUrls();
  }, []);

  // 평가 대상자별 데이터 로드
  const loadCandidateData = async (candidate: EvaluationCandidate) => {
    try {
      console.log("🔍 평가 데이터 찾는 중:", candidate.id, candidate.name)
      
      // 현재 후보자 ID 설정
      setCurrentCandidateId(candidate.id)
      
      // 이미 로드된 데이터가 있으면 사용
      if (evaluationData[candidate.id]) {
        console.log("✅ 캐시된 데이터 사용:", candidate.name)
        return true
      }
      
      // 데이터베이스에서 평가 결과 로드
      const loadFromDatabase = async () => {
        try {
          console.log("🔍 [DEBUG] 캐시를 무시하고 항상 최신 데이터베이스 데이터 사용")
          // 🔥 캐시 무시: admin 모드에서는 항상 최신 데이터 사용
          
          // 캐시에 없으면 데이터베이스에서 로드
          const response = await fetch("/api/evaluations/load-database?limit=1000")
          if (response.ok) {
            const result = await response.json()
            const evaluations = result.evaluations || []
            
            // 캐시에 저장 (크기 제한 적용)
            evaluations.forEach((evaluation: any) => {
              manageLocalStorageCache(evaluation);
            });
            
                      // 🔥 단순화: 평가 ID로만 매칭 (candidate.id = evaluation.id)
          const candidateEvaluation = evaluations.find((evaluation: any) => 
            evaluation.id === candidate.id
          )
          
          if (candidateEvaluation && (candidateEvaluation.scores || candidateEvaluation.categoryScores)) {
            console.log("🔍 [DEBUG] candidateEvaluation 전체:", candidateEvaluation);
            console.log("🔍 [DEBUG] candidateEvaluation.scores:", candidateEvaluation.scores);
            console.log("🔍 [DEBUG] candidateEvaluation.categoryScores:", candidateEvaluation.categoryScores);
            console.log("🔍 [DEBUG] API에서 받은 categoryScores에 대항목이 있는가?", {
              hasKoreanPronunciation: candidateEvaluation.categoryScores?.['korean-발음'] !== undefined,
              hasEnglishConsonant: candidateEvaluation.categoryScores?.['english-발음_자음'] !== undefined,
              categoryScoresKeys: Object.keys(candidateEvaluation.categoryScores || {})
            });
              
              // 🔥 개별 점수는 categoryScores에서 추출 (korean-발음-자음, english-발음_자음-P / F 등)
              let individualScores = candidateEvaluation.scores || {};
              
              // categoryScores에서 개별 점수 추출 (API가 잘못 구조화된 경우 대비)
              if (candidateEvaluation.categoryScores) {
                Object.entries(candidateEvaluation.categoryScores).forEach(([key, value]) => {
                  // korean, english 총합이 아닌 개별 항목만 추출
                  if (key !== 'korean' && key !== 'english' && 
                      (key.includes('-') || key.includes('_'))) {
                    individualScores[key] = value;
                  }
                });
              }
              
              console.log("✅ Database에서 평가 데이터 복원:", candidate.name, individualScores)
              console.log("🔍 [DEBUG] 최종 individualScores 개수:", Object.keys(individualScores).length)
              
              // 코멘트 복원
              let koreanComment = ""
              let englishComment = ""
              if (candidate.language === "korean-english") {
                if (typeof candidateEvaluation.comments === "string") {
                koreanComment = candidateEvaluation.comments?.split('\n').find((line: string) => line.startsWith('한국어:'))?.replace('한국어:', '').trim() || ""
                englishComment = candidateEvaluation.comments?.split('\n').find((line: string) => line.startsWith('영어:'))?.replace('영어:', '').trim() || ""
                } else if (typeof candidateEvaluation.comments === "object" && candidateEvaluation.comments !== null) {
                  koreanComment = candidateEvaluation.comments.korean || ""
                  englishComment = candidateEvaluation.comments.english || ""
                }
              } else {
                if (typeof candidateEvaluation.comments === "string") {
                koreanComment = candidateEvaluation.comments || ""
                } else if (typeof candidateEvaluation.comments === "object" && candidateEvaluation.comments !== null) {
                  koreanComment = candidateEvaluation.comments.korean || ""
              }
              }
              const candidateData = {
                scores: individualScores,
                categoryScores: candidateEvaluation.categoryScores || {},
                comments: { korean: koreanComment, english: englishComment }
              }
              setEvaluationData(prev => ({
                ...prev,
                [candidate.id]: candidateData
              }))
              return true
            }
          }
        } catch (error) {
          console.warn("Database에서 평가 데이터 로드 실패:", error)
        }
        return false
      }
      
      // localStorage에서도 확인 (동일한 매칭 로직 사용)
      const existingEvaluations = JSON.parse(localStorage.getItem("evaluationResults") || "[]")
      // 🔥 단순화: 평가 ID로만 매칭 (candidate.id = evaluation.id)
      const existingEvaluation = existingEvaluations.find((evaluation: any) => 
        evaluation.id === candidate.id
      )
      
      if (existingEvaluation && (existingEvaluation.scores || existingEvaluation.categoryScores)) {
        // 🔥 개별 점수는 categoryScores에서 추출
        let individualScores = existingEvaluation.scores || {};
        
        // categoryScores에서 개별 점수 추출
        if (existingEvaluation.categoryScores) {
          Object.entries(existingEvaluation.categoryScores).forEach(([key, value]) => {
            // korean, english 총합이 아닌 개별 항목만 추출
            if (key !== 'korean' && key !== 'english' && 
                (key.includes('-') || key.includes('_'))) {
              individualScores[key] = value;
            }
          });
        }
        
        console.log("✅ localStorage에서 평가 데이터 복원:", candidate.name, individualScores)
        
        // 코멘트 복원
        let koreanComment = ""
        let englishComment = ""
        if (candidate.language === "korean-english") {
          if (typeof existingEvaluation.comments === "string") {
          koreanComment = existingEvaluation.comments?.split('\n').find((line: string) => line.startsWith('한국어:'))?.replace('한국어:', '').trim() || ""
          englishComment = existingEvaluation.comments?.split('\n').find((line: string) => line.startsWith('영어:'))?.replace('영어:', '').trim() || ""
          } else if (typeof existingEvaluation.comments === "object" && existingEvaluation.comments !== null) {
            koreanComment = existingEvaluation.comments.korean || ""
            englishComment = existingEvaluation.comments.english || ""
          }
        } else {
          if (typeof existingEvaluation.comments === "string") {
          koreanComment = existingEvaluation.comments || ""
          } else if (typeof existingEvaluation.comments === "object" && existingEvaluation.comments !== null) {
            koreanComment = existingEvaluation.comments.korean || ""
        }
        }
        const candidateData = {
          scores: individualScores,
          comments: { korean: koreanComment, english: englishComment }
        }
        setEvaluationData(prev => ({
          ...prev,
          [candidate.id]: candidateData
        }))
        return true
      }
      
      // Dropbox에서도 확인 (비동기로 처리하여 UI 블로킹 방지)
              loadFromDatabase().then((evaluation: any) => {
        if (evaluation && evaluation.scores) {
          console.log("✅ 백그라운드에서 평가 데이터 복원 완료:", candidate.name)
          // 코멘트 복원
          let koreanComment = ""
          let englishComment = ""
          if (candidate.language === "korean-english") {
            if (typeof evaluation.comments === "string") {
            koreanComment = evaluation.comments?.split('\n').find((line: string) => line.startsWith('한국어:'))?.replace('한국어:', '').trim() || ""
            englishComment = evaluation.comments?.split('\n').find((line: string) => line.startsWith('영어:'))?.replace('영어:', '').trim() || ""
            } else if (typeof evaluation.comments === "object" && evaluation.comments !== null) {
              koreanComment = (evaluation.comments as any).korean || ""
              englishComment = (evaluation.comments as any).english || ""
            }
          } else {
            if (typeof evaluation.comments === "string") {
            koreanComment = evaluation.comments || ""
            } else if (typeof evaluation.comments === "object" && evaluation.comments !== null) {
              koreanComment = (evaluation.comments as any).korean || ""
          }
          }
          const candidateData = {
            scores: evaluation.scores,
            comments: { korean: koreanComment, english: englishComment }
          }
          setEvaluationData(prev => ({
            ...prev,
            [candidate.id]: candidateData
          }))
        }
      }).catch((error) => {
        console.warn("백그라운드 평가 데이터 로드 실패:", error)
      })
      
      return false // 즉시 false 반환하여 UI 블로킹 방지
      
    } catch (error) {
      console.warn("평가 데이터 복원 실패:", error)
    }
    return false
  }

    // 🔥 개선된 녹음 파일 로드 함수 (개별 API 사용으로 성능 최적화)
  const loadRecordingsFromDatabase = async (candidate: EvaluationCandidate) => {
    try {
      console.log(`🎵 [loadRecordingsFromDatabase] 녹음 데이터 로딩 시작:`, candidate.name, candidate.id)
      
      // 🔥 새로운 개별 녹음 데이터 로딩 API 사용
      const response = await fetch(`/api/evaluations/load-recordings?evaluationId=${candidate.id}`)
      
      if (!response.ok) {
        console.warn(`❌ [loadRecordingsFromDatabase] API 호출 실패:`, response.status)
        // 실패 시 사용자에게 알림
        throw new Error(`녹음 파일 로딩 실패 (${response.status}): ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        console.warn(`❌ [loadRecordingsFromDatabase] API 응답 실패:`, result.error)
        throw new Error(`녹음 파일 로딩 실패: ${result.error}`)
      }
      
      const recordingBlobs = result.recordings || {}
      const fileCount = Object.keys(recordingBlobs).length
      
      console.log(`✅ [loadRecordingsFromDatabase] 녹음 데이터 로딩 완료: ${fileCount}개 파일`)
      console.log(`📁 [loadRecordingsFromDatabase] 로딩된 파일 키:`, Object.keys(recordingBlobs))
      
      // 🔥 중요: 녹음 파일이 없으면 오류 발생
      if (fileCount === 0) {
        throw new Error("녹음 파일이 없습니다. 평가를 진행할 수 없습니다.")
      }
      
      return recordingBlobs
      
    } catch (error) {
      console.error("❌ [loadRecordingsFromDatabase] 녹음 파일 로드 중 오류:", error)
      // 🔥 중요: 녹음 파일 로딩 실패 시 사용자에게 명확한 알림
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류"
      alert(`⚠️ 녹음 파일 로딩 실패\n\n${errorMessage}\n\n평가를 진행할 수 없습니다.`)
      throw error // 상위로 오류 전파하여 평가 진입 중단
    }
  }

  // 검토 요청된 평가의 기존 데이터 복원 (데이터베이스에서 직접 로드)
  const loadReviewData = async (candidate: EvaluationCandidate) => {
    console.log("🔍 [loadReviewData] 검토 모드 데이터 로딩 시작:", candidate.name);
    console.log("🔍 [loadReviewData] 후보자 정보:", {
      id: candidate.id,
      employeeId: candidate.employeeId,
      status: candidate.status
    });
    
    try {
      // 데이터베이스에서 직접 평가 데이터 로드 (검토 모드에서는 녹음 데이터 불필요 - 별도 로딩)
      const response = await fetch("/api/evaluations/load-database?limit=1000&includeRecordings=false"); // 🔥 검토 모드에서도 메타데이터만
      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }
      
      const result = await response.json();
      const evaluations = result.evaluations || [];
      
      // 해당 후보자의 평가 찾기 (정확한 ID 매칭)
      const candidateEvaluation = evaluations.find((evaluation: any) => 
        evaluation.id === candidate.id
      );
      
      if (!candidateEvaluation) {
        console.error("❌ [loadReviewData] 평가 데이터를 찾을 수 없음:", candidate.id);
        console.log("🔍 [loadReviewData] 사용 가능한 평가 ID들:", evaluations.map((e: any) => e.id));
        return false;
      }
      
      if (!candidateEvaluation.scores || Object.keys(candidateEvaluation.scores).length === 0) {
        console.error("❌ [loadReviewData] 평가 데이터에 점수가 없음:", candidate.id);
        return false;
      }
      
      console.log("✅ [loadReviewData] 검토 데이터 로드 성공:", {
        id: candidateEvaluation.id,
        scoresCount: Object.keys(candidateEvaluation.scores).length,
        hasComments: !!candidateEvaluation.comments,
        status: candidateEvaluation.status,
        reviewRequestedBy: candidateEvaluation.reviewRequestedBy
      });
      
      // 평가 데이터 설정 (안전한 기본값 제공)
      const candidateData = {
        scores: candidateEvaluation.scores,
        categoryScores: candidateEvaluation.categoryScores || {},
        comments: candidateEvaluation.comments || { korean: "", english: "" }
      };
      
      setEvaluationData(prev => ({
        ...prev,
        [candidate.id]: candidateData
      }));
      
      console.log("✅ [loadReviewData] evaluationData 설정 완료");
      return true;
      
    } catch (error) {
      console.error("❌ [loadReviewData] 데이터베이스 로드 실패:", error);
      return false;
    }
  }

  // 직원 정보 가져오기 함수
  const getEmployeeName = async (email: string) => {
    try {
      const response = await fetch(`/api/auth/user?email=${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        return data.name || email;
      }
    } catch (error) {
      console.warn('직원 정보 가져오기 실패:', error);
    }
    return email;
  };

  // 검토 요청 함수 (데이터베이스 API 사용)
  const handleRequestReview = async (result: any) => {
    console.log("🔍 [handleRequestReview] 받은 데이터:", result)
    if (!selectedCandidate) {
      console.error("❌ [handleRequestReview] 필수 정보가 없습니다!")
      console.error("selectedCandidate:", selectedCandidate)
      return
    }

    // 확인 메시지 표시
    const confirmMessage = `🔍 검토 요청을 진행하시겠습니까?\n\n현재 입력하신 평가 내용 (점수 및 코멘트)이 데이터베이스에 저장되어\n다른 교관이 검토할 수 있게 됩니다.\n\n• 대상자: ${selectedCandidate.name} (${selectedCandidate.employeeId})\n• 언어: ${selectedCandidate.language}\n• 카테고리: ${selectedCandidate.category}`;
    
    if (!confirm(confirmMessage)) {
      return; // 사용자가 취소한 경우
    }

    try {
      // 직원 정보에서 이름 가져오기
      const employeeName = await getEmployeeName(authenticatedUser?.email || '');
      
      // 🔥 현재 evaluationData에서 최신 점수와 코멘트 가져오기 + 기본값 포함
      const currentEvalData = evaluationData[selectedCandidate.id] || { 
        scores: {}, 
        comments: { korean: "", english: "" },
        totalScore: 0,
        koreanTotalScore: 0,
        englishTotalScore: 0,
        grade: 'N/A'
      };
      
      // 📊 모든 평가 항목의 점수를 수집 (기본값 포함)
      const criteria = getEvaluationCriteria(selectedCandidate.language)
      const allScores: { [key: string]: number } = {}
      
      // 기본값(80%) 설정
      Object.entries(criteria).forEach(([langKey, langCriteria]) => {
        Object.entries(langCriteria as Record<string, any>).forEach(([category, subcriteria]) => {
          if (typeof subcriteria === "object" && subcriteria !== null) {
            // 세부 항목이 있는 경우
            Object.entries(subcriteria as Record<string, number>).forEach(([subcat, maxScore]) => {
              const scoreKey = selectedCandidate.language === "korean-english" 
                ? `${langKey}-${category}-${subcat}` 
                : `${category}-${subcat}`
              const defaultScore = Math.round((Number(maxScore) * 0.8) * 2) / 2
              allScores[scoreKey] = defaultScore
            })
          } else {
            // 세부 항목이 없는 경우
            const scoreKey = selectedCandidate.language === "korean-english" 
              ? `${langKey}-${category}` 
              : category
            const defaultScore = Math.round((Number(subcriteria) * 0.8) * 2) / 2
            allScores[scoreKey] = defaultScore
          }
        })
      })
      
      // 실제 조정된 점수로 덮어쓰기
      const currentScores = { ...allScores, ...(currentEvalData.scores || {}) }
      const currentComments = currentEvalData.comments || { korean: "", english: "" };
      
      console.log("📊 [handleRequestReview] 전체 점수 (기본값 + 조정값):", {
        totalItems: Object.keys(allScores).length,
        adjustedItems: Object.keys(currentEvalData.scores || {}).length,
        finalScores: currentScores
      });
      
      console.log("🔍 [handleRequestReview] 현재 평가 데이터:", {
        scores: currentScores,
        comments: currentComments
      });
      
      // 검토 요청 API 호출 (점수와 의견 포함)
      const reviewRequestData = {
        evaluationId: selectedCandidate.id,
        requestedBy: employeeName,
        scores: currentScores,
        comments: currentComments
      };
      
      console.log("🔍 [handleRequestReview] 검토 요청 데이터:", {
        evaluationId: reviewRequestData.evaluationId,
        requestedBy: reviewRequestData.requestedBy,
        scoresCount: Object.keys(reviewRequestData.scores).length,
        hasComments: !!(reviewRequestData.comments.korean || reviewRequestData.comments.english),
        scores: reviewRequestData.scores,
        comments: reviewRequestData.comments
      });
      
              const response = await fetch("/api/evaluations/request-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewRequestData),
      })

      console.log("📡 [handleRequestReview] API 응답 상태:", response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ [handleRequestReview] API 오류 응답:", errorText)
        throw new Error(`서버 저장 실패: ${response.status} - ${errorText}`)
      }

      const apiResult = await response.json()
      console.log("✅ [handleRequestReview] 검토 요청 성공:", apiResult)

      alert(`✅ 검토 요청이 성공적으로 처리되었습니다!\n\n• 평가 상태가 '검토 요청됨'으로 변경되었습니다.\n• 다른 교관이 검토할 수 있도록 평가 대시보드에 표시됩니다.\n• 검토자는 현재 입력하신 점수와 코멘트를 확인할 수 있습니다.`)
    } catch (error) {
      console.error("❌ [handleRequestReview] 검토 요청 저장 실패:", error)
      alert(`❌ 검토 요청 처리 중 오류가 발생했습니다:\n${error instanceof Error ? error.message : "알 수 없는 오류"}\n\n다시 시도해 주세요.`)
      return; // 오류 발생 시 함수 종료
    }

    // 목록 새로고침하여 상태 변경 반영
    console.log("🔄 검토 요청 후 목록 새로고침 시작...")
    await loadCandidates()
    console.log("✅ 목록 새로고침 완료")
    
    // 검토 요청 완료 후 평가 화면 닫기 (대기목록으로 돌아가기)
    setShowSummary(false)
    setSelectedCandidate(null)
  }

  // 평가 취소 및 뒤로가기 함수
  const handleCancelEvaluation = async () => {
    if (!selectedCandidate) return;

    // 재생 중인 경우 중지
    if (isPlayingAll) {
      stopAllRecordings();
    }

    // evaluating 또는 reviewing 상태인 경우에만 취소 API 호출
    if (selectedCandidate.status === 'pending' || selectedCandidate.status === 'evaluating' || 
        selectedCandidate.status === 're_evaluation' || selectedCandidate.status === 'reviewing' ||
        selectedCandidate.status === 'review_requested') {
      try {
        const cancelResponse = await fetch('/api/evaluations/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            evaluationId: selectedCandidate.id,
            instructorId: userInfo?.employeeId || authenticatedUser?.employeeId
          })
        });

        const cancelResult = await cancelResponse.json();

        if (cancelResult.success) {
          console.log('🔓 [평가/검토 취소] 잠금 해제 완료:', cancelResult);
        } else {
          console.warn('⚠️ [평가/검토 취소] 취소 실패:', cancelResult.error);
        }
      } catch (cancelError) {
        console.error('❌ [평가/검토 취소] API 호출 실패:', cancelError);
      }
    }

    // 평가 화면 닫기
    setSelectedCandidate(null);
    
    // 평가 목록 새로고침
    loadCandidates();
  }

  // 후보자 선택 시 평가 정보와 녹음파일을 병렬로 로드하고, 모두 준비된 후 병합하여 setSelectedCandidate
  const handleSelectCandidate = async (candidate: EvaluationCandidate, isReview: boolean = false) => {
    console.log('[handleSelectCandidate] 후보자 선택:', candidate)
    setRecordingsLoading(prev => ({ ...prev, [candidate.id]: true }))
    
    try {
    // 🔒 평가 중/검토 중 상태일 때 경고창 먼저 표시
    if (candidate.status === 'evaluating' || candidate.status === 'reviewing') {
      const mode = candidate.status === 'reviewing' ? '검토' : '평가';
      const currentUser = candidate.evaluatedBy || '다른 교관';
      
      const proceed = confirm(
        `⚠️ ${currentUser}님이 이미 ${mode} 중입니다.\n\n` +
        `그래도 ${mode}를 진행하시겠습니까?\n\n` +
        `※ 주의: 두 명이 동시에 ${mode}하면 나중에 저장한 사람의 내용만 최종 반영됩니다.`
      );
      
      if (!proceed) {
        console.log(`❌ [${mode} 진입] 사용자가 중복 진입을 취소함`);
        setRecordingsLoading(prev => ({ ...prev, [candidate.id]: false }));
        return;
      }
      
      console.log(`⚠️ [${mode} 진입] 중복 진입 경고에도 불구하고 진행`);
    }
    
    // 🔒 평가/검토 시작 API 호출
    // pending: 신규 평가, re_evaluation: 재평가, review_requested: 검토
    const shouldLock = ((candidate.status === 'pending' || candidate.status === 're_evaluation') && !isReview) || 
                       (candidate.status === 'review_requested' && isReview);
    
    if (shouldLock) {
      try {
        const startResponse = await fetch('/api/evaluations/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            evaluationId: candidate.id,
            instructorId: userInfo?.employeeId || authenticatedUser?.employeeId,
            instructorName: userInfo?.name || authenticatedUser?.name,
            isReview: isReview
          })
        });

        const startResult = await startResponse.json();

        if (!startResult.success) {
          throw new Error(startResult.error);
        }

        // ⚠️ 다른 교관이 평가/검토 중이면 경고 표시 (차단하지 않음)
        if (startResult.warning && startResult.warningMessage) {
          const mode = isReview ? '검토' : '평가';
          const proceed = confirm(
            `⚠️ ${startResult.warningMessage}\n\n` +
            `그래도 ${mode}를 진행하시겠습니까?\n\n` +
            `※ 주의: 두 명이 동시에 ${mode}하면 나중에 저장한 사람의 내용만 최종 반영됩니다.`
          );
          
          if (!proceed) {
            console.log(`❌ [${mode} 시작] 사용자가 중복 진입을 취소함`);
            setRecordingsLoading(prev => ({ ...prev, [candidate.id]: false }));
            return;
          }
          
          console.log(`⚠️ [${mode} 시작] 중복 진입 경고에도 불구하고 진행`);
        }

        const mode = isReview ? '검토' : '평가';
        console.log(`✅ [${mode} 시작] 진입 완료:`, startResult);
      } catch (startError) {
        console.error('❌ [평가/검토 시작] API 호출 실패:', startError);
        const mode = isReview ? '검토' : '평가';
        alert(`${mode}를 시작할 수 없습니다: ${startError instanceof Error ? startError.message : '알 수 없는 오류'}`);
        setRecordingsLoading(prev => ({ ...prev, [candidate.id]: false }));
        return;
      }
    }

    // 1. 평가 정보와 녹음파일 병렬 로드
    const [evaluationLoaded, recordingsLoaded] = await Promise.all([
      isReview ? loadReviewData(candidate) : loadCandidateData(candidate),
                loadRecordingsFromDatabase(candidate)
    ])
    console.log('[handleSelectCandidate] 평가 정보 로드 완료:', evaluationLoaded)
    console.log('[handleSelectCandidate] 녹음파일 로드 완료:', recordingsLoaded)
      
    // 2. 최신 평가 정보와 녹음파일을 모두 병합해서 setSelectedCandidate
    // (최신 데이터를 evaluationData, recordings에서 가져옴)
    const evalData = evaluationData[candidate.id] ?? {}

            // recordingsLoaded는 loadRecordingsFromDatabase가 반환한 객체 (key→base64)
    const recordingsFromDropbox = (recordingsLoaded && typeof recordingsLoaded === "object") ? recordingsLoaded as { [key:string]: string } : {}

    // 후보 JSON에 이미 포함된 recordings (share url 또는 base64)
    const baseRecordings = candidate.recordings || {}

    // 두 소스 병합 (Dropbox 다운로드 결과 우선)
    const recordings = { ...baseRecordings, ...recordingsFromDropbox }

    console.log('[handleSelectCandidate] 최종 recordings:', recordings)
    
    // 🔥 Clean Sheet 로직: 신규 평가(pending)만 기본값으로 초기화 (안전한 처리)
    try {
      const shouldInitializeAsCleanSheet = 
        !evaluationData[candidate.id] && // 기존 데이터가 없고
        candidate.status === "pending";  // 신규 평가(pending) 상태인 경우만 (re_evaluation은 기존 데이터 유지)
      
      if (shouldInitializeAsCleanSheet) {
        console.log("🆕 신규 평가 Clean Sheet - 기본값(80%) 초기화:", candidate.name);
        const criteria = getEvaluationCriteria(candidate.language)
      const scores: { [key: string]: number } = {}
      
        if (candidate.language === 'korean-english') {
        Object.entries(evaluationCriteria.korean).forEach(([category, subcriteria]) => {
          if (typeof subcriteria === 'object' && subcriteria !== null) {
            Object.entries(subcriteria as Record<string, any>).forEach(([subcat, maxScore]) => {
              const key = `korean-${category}-${subcat}`
              const score = Math.round((maxScore as number) * 0.8 * 2) / 2
              scores[key] = score
            })
          }
        })
        
        Object.entries(evaluationCriteria.english).forEach(([category, subcriteria]) => {
          if (typeof subcriteria === 'object' && subcriteria !== null) {
            Object.entries(subcriteria as Record<string, any>).forEach(([subcat, maxScore]) => {
              const key = `english-${category}-${subcat}`
              const score = Math.round((maxScore as number) * 0.8 * 2) / 2
              scores[key] = score
            })
          }
        })
      } else {
        Object.entries(criteria).forEach(([category, maxScore]) => {
          const score = Math.round((maxScore as number) * 0.8 * 2) / 2
          scores[category] = score
        })
      }
      
      setEvaluationData(prev => ({
        ...prev,
        [candidate.id]: {
          scores,
          categoryScores: {}, // 빈 객체로 초기화, 실시간 계산됨
          comments: { korean: '', english: '' }
        }
      }))
        console.log("✅ Clean Sheet 초기화 완료 - 기본 점수 설정됨");
      } else {
        console.log("🔍 기존 데이터 유지 또는 검토/완료 상태:", {
          hasExistingData: !!evaluationData[candidate.id],
          status: candidate.status,
          name: candidate.name
        });
      }
    } catch (initError) {
      console.error("❌ Clean Sheet 초기화 중 오류 발생:", initError);
      // 오류가 발생해도 평가 진입은 계속 진행
    }
    
      setSelectedCandidate({
        ...candidate,
        recordings
      })
      
    } catch (error) {
      console.error("❌ [handleSelectCandidate] 후보자 선택 중 오류 발생:", error);
      // 오류가 발생해도 사용자에게 알림
      alert(`평가 진입 중 오류가 발생했습니다: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
    } finally {
      // 항상 로딩 상태 해제
      setRecordingsLoading(prev => ({ ...prev, [candidate.id]: false }))
    }
  }

  // 후보자 선택 시 currentCandidateId 설정 및 초기 80% 점수 설정
  useEffect(() => {
    if (selectedCandidate && selectedCandidate.id) {
      setCurrentCandidateId(selectedCandidate.id);
      
      // 🔥 중요: 평가 진행 모드에서 초기 80% 점수 자동 설정 (pending 상태인 경우만)
      if (selectedCandidate.status === "pending") {
        console.log("🔥 [BROWSER] 초기 80% 점수 설정 시작 - 언어:", selectedCandidate.language);
        
        const initialScores: { [key: string]: number } = {};
        const currentScores = getCurrentScores();
        
        // 이미 점수가 설정된 항목은 유지, 없는 항목만 80% 기본값 설정
        if (selectedCandidate.language === "korean-english") {
          const allCategories = [
            ...Object.keys(evaluationCriteria.korean),
            ...Object.keys(evaluationCriteria.english)
          ];
          
          for (const category of allCategories) {
            const koreanPrefix = Object.keys(evaluationCriteria.korean).includes(category) ? "korean-" : "english-";
            const isKorean = Object.keys(evaluationCriteria.korean).includes(category);
            const criteriaGroup = isKorean ? evaluationCriteria.korean : evaluationCriteria.english;
            const criteria = (criteriaGroup as any)[category];
            
            if (typeof criteria === 'object') {
              // 소항목이 있는 경우
              for (const [subKey, maxScore] of Object.entries(criteria)) {
                const scoreKey = `${koreanPrefix}${category}-${subKey}`;
                if (currentScores[scoreKey] === undefined) {
                  initialScores[scoreKey] = Math.round((Number(maxScore) * 0.8) * 2) / 2;
                }
              }
            } else {
              // 직접 점수인 경우
              const scoreKey = `${koreanPrefix}${category}`;
              if (currentScores[scoreKey] === undefined) {
                initialScores[scoreKey] = Math.round((Number(criteria) * 0.8) * 2) / 2;
              }
            }
          }
        } else {
          // 일본어/중국어
          const criteria = evaluationCriteria[selectedCandidate.language as keyof typeof evaluationCriteria];
          for (const [category, maxScore] of Object.entries(criteria)) {
            if (currentScores[category] === undefined) {
              initialScores[category] = Math.round((Number(maxScore) * 0.8) * 2) / 2;
            }
          }
        }
        
        console.log("🔥 [BROWSER] 설정할 초기 점수:", initialScores);
        console.log("🔥 [BROWSER] 기존 점수:", currentScores);
        
        // 초기 점수와 기존 점수 병합
        if (Object.keys(initialScores).length > 0) {
          const mergedScores = { ...currentScores, ...initialScores };
          setCurrentScores(mergedScores);
          console.log("🔥 [BROWSER] 최종 병합된 점수:", mergedScores);
        }
      }
    }
  }, [selectedCandidate, getCurrentScores, setCurrentScores])

  // 슬라이더 값 변경을 부드럽게 반영하도록 최적화 (매우 짧은 딜레이)
  const debouncedUpdateScore = useCallback(
    (() => {
      let timeout: NodeJS.Timeout
      return (key: string, value: number) => {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
          updateScore(key, value)
        }, 16) // 약 60fps에 해당하는 16ms 딜레이
      }
    })(),
    [updateScore]
  )

  if (!selectedCandidate) {
    // 평가 대시보드(후보자 목록) 화면
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-[70vw] mx-auto">
          {/* Tab 네비게이션 */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-center gap-2 mb-6">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="requests">신청 관리</TabsTrigger>
                <TabsTrigger value="evaluation">평가 관리</TabsTrigger>
              </TabsList>
            </div>

            {/* Tab 1: 신청 관리 */}
            <TabsContent value="requests" className="space-y-6 mt-0">
              {/* 헤더 */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold flex items-center gap-3 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  <ClipboardList className="w-8 h-8 text-purple-600" />
                  신청 관리
                </h1>
                <p className="text-sm text-gray-500 mt-1">기내방송 녹음 응시자 및 교육 신청자의 출결 관리</p>
              </div>

              {/* 실시간 대시보드 */}
              <div className="mb-6">
                <div className="grid grid-cols-2 gap-4">
                  {/* 다음 녹음 응시 카드 */}
                  {(() => {
                    const now = currentTime
                    const todayApplicants = applicants.filter(a => a.time)
                    const upcomingRecordings = todayApplicants
                      .filter(a => {
                        if (!a.time) return false
                        const [hours, minutes] = a.time.split(':').map(Number)
                        const timeInMinutes = hours * 60 + minutes
                        const nowMinutes = now.getHours() * 60 + now.getMinutes()
                        return timeInMinutes >= nowMinutes
                      })
                      .sort((a, b) => {
                        const aTime = (a.time || '00:00').split(':').map(Number)
                        const bTime = (b.time || '00:00').split(':').map(Number)
                        return (aTime[0] * 60 + aTime[1]) - (bTime[0] * 60 + bTime[1])
                      })

                    const nextRecording = upcomingRecordings[0]
                    
                    if (!nextRecording || !nextRecording.time) {
                      return (
                        <Card className="bg-white border border-gray-200 shadow-sm">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                <PlayCircle className="w-5 h-5 text-gray-400" />
                              </div>
                              <span className="text-sm font-semibold text-gray-600">다음 녹음 응시</span>
                            </div>
                            <p className="text-sm text-gray-400 ml-10">오늘 예정된 녹음 없음</p>
                          </CardContent>
                        </Card>
                      )
                    }

                    const minutesUntil = getTimeUntil(nextRecording.time)
                    const urgency = getUrgencyLevel(minutesUntil)

                    const batchApplicants = todayApplicants.filter(a => a.batch === nextRecording.batch)
                    const languageCounts = batchApplicants.reduce((acc, a) => {
                      const lang = a.language.includes('한') ? '한/영' : 
                                   a.language.includes('일') ? '일본어' : 
                                   a.language.includes('중') ? '중국어' : a.language
                      acc[lang] = (acc[lang] || 0) + 1
                      return acc
                    }, {} as Record<string, number>)

                    return (
                      <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <PlayCircle className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-gray-600">다음 녹음 응시</div>
                              <div className="text-2xl font-bold text-gray-900 leading-tight">{formatTo12Hour(nextRecording.time)}</div>
                            </div>
                            <div className="text-right">
                              <Badge className={`${
                                urgency === 'urgent' ? 'bg-red-500' :
                                urgency === 'warning' ? 'bg-orange-500' :
                                urgency === 'normal' ? 'bg-blue-500' : 'bg-gray-400'
                              } text-white text-xs px-2 py-1`}>
                                {formatTimeUntil(minutesUntil)}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-gray-600 ml-11">
                            <span>{nextRecording.batch}</span>
                            <span className="text-gray-400">•</span>
                            <span className="font-semibold">{batchApplicants.length}명</span>
                            <div className="flex gap-1 ml-auto">
                              {Object.entries(languageCounts).map(([lang, count]) => (
                                <span key={lang} className="text-gray-500">
                                  {lang} {count}
                                </span>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })()}

                  {/* 다음 교육 세션 카드 */}
                  {(() => {
                    const now = currentTime
                    const todayEducationSessions = educationSessions.filter(s => s.slotTime)
                    const upcomingEducation = todayEducationSessions
                      .filter(s => {
                        if (!s.slotTime) return false
                        const startTime = s.slotTime.split('-')[0].trim()
                        const [hours, minutes] = startTime.split(':').map(Number)
                        const timeInMinutes = hours * 60 + minutes
                        const nowMinutes = now.getHours() * 60 + now.getMinutes()
                        return timeInMinutes >= nowMinutes
                      })
                      .sort((a, b) => {
                        const aStart = a.slotTime.split('-')[0].trim()
                        const bStart = b.slotTime.split('-')[0].trim()
                        const aTime = aStart.split(':').map(Number)
                        const bTime = bStart.split(':').map(Number)
                        return (aTime[0] * 60 + aTime[1]) - (bTime[0] * 60 + bTime[1])
                      })

                    const nextEducation = upcomingEducation[0]
                    
                    if (!nextEducation || !nextEducation.slotTime) {
                      return (
                        <Card className="bg-white border border-gray-200 shadow-sm">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                <Globe className="w-5 h-5 text-gray-400" />
                              </div>
                              <span className="text-sm font-semibold text-gray-600">다음 교육</span>
                            </div>
                            <p className="text-sm text-gray-400 ml-10">오늘 예정된 교육 없음</p>
                          </CardContent>
                        </Card>
                      )
                    }

                    const startTime = nextEducation.slotTime.split('-')[0].trim()
                    const minutesUntil = getTimeUntil(startTime)
                    const urgency = getUrgencyLevel(minutesUntil)

                    const langDisplay = nextEducation.language?.includes('한') ? '한/영' :
                                       nextEducation.language?.includes('일') ? '일본어' :
                                       nextEducation.language?.includes('중') ? '중국어' : nextEducation.language
                    const classTypeDisplay = nextEducation.classType === '소규모' || nextEducation.classType === 'small-group' ? '소규모' : '1:1'

                    return (
                      <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                              <Globe className="w-5 h-5 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-gray-600">다음 교육</div>
                              <div className="text-2xl font-bold text-gray-900 leading-tight">{formatTo12Hour(startTime)}</div>
                            </div>
                            <div className="text-right">
                              <Badge className={`${
                                urgency === 'urgent' ? 'bg-red-500' :
                                urgency === 'warning' ? 'bg-orange-500' :
                                urgency === 'normal' ? 'bg-green-500' : 'bg-gray-400'
                              } text-white text-xs px-2 py-1`}>
                                {formatTimeUntil(minutesUntil)}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-gray-600 ml-11">
                            <span>{langDisplay}</span>
                            <span className="text-gray-400">•</span>
                            <span>{classTypeDisplay} {nextEducation.sessionNumber}차수</span>
                            <div className="flex gap-2 ml-auto">
                              <span className="font-semibold">{nextEducation.applicants?.length || 0}명</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })()}
                </div>
              </div>

              {/* 녹음 응시 목록 카드 */}
          <Card className="mb-4 bg-white shadow-lg rounded-2xl hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-gray-50/80 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-purple-600" />
                    녹음 응시 목록
                  </CardTitle>
                  <Badge className="bg-purple-100 text-purple-700 text-base font-bold px-3 py-1 border border-purple-200">
                    {applicants.length}명
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedApplicantDate} onValueChange={async (v) => { setSelectedApplicantDate(v); const map = await loadAttendance(v); await loadApplicants(v, map); }}>
                    <SelectTrigger className="w-48 h-9 px-2">
                      <SelectValue placeholder="날짜 선택">
                        {selectedApplicantDate ? formatDisplayDate(selectedApplicantDate) : "날짜 선택"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {applicantDates.map((d) => (
                        <SelectItem key={`appl-${d}`} value={d}>{formatDisplayDate(d)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={async () => { const map = await loadAttendance(selectedApplicantDate || undefined); await loadApplicants(selectedApplicantDate || undefined, map); }}>
                    <RefreshCw className="w-3 h-3 mr-1" /> Update
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              {loadingApplicants ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3"></div>
                  <p className="text-gray-600">응시자 목록을 불러오는 중입니다...</p>
                </div>
              ) : applicants.length === 0 ? (
                <div className="text-center py-6 text-gray-500">표시할 응시자가 없습니다.</div>
              ) : (
                <div className="overflow-x-auto pr-2">{/* 전체 표시: 높이 제한 제거, 스크롤 없음 */}
                  {/* 차수별 그룹핑 */}
                  {Object.entries(applicants.reduce((acc: Record<string, typeof applicants>, cur) => {
                    const key = cur.batch || '미정';
                    (acc[key] = acc[key] || []).push(cur);
                    return acc;
                  }, {})).sort((a, b) => {
                    const order = (s: string) => { const m = s.match(/(\d+)/); return m ? parseInt(m[1], 10) : 9999 };
                    return order(a[0]) - order(b[0]);
                  }).map(([batch, list]) => (
                    <div key={batch} className="mb-3">
                      <div className="sticky top-0 bg-white/70 backdrop-blur text-xs font-semibold px-2 py-1 rounded-md inline-flex items-center gap-2 border"
                        style={{ borderColor: '#fde68a', backgroundColor: '#fffbeb', color: '#92400e' }}
                      >
                        {batch}
                        <span className="text-[10px] text-gray-500">({list.length}명)</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-1.5 mt-2">
                        {list.map((a: any, idx) => {
                          const isHighlighted = highlightedAttendedIds.has(a.employeeId) || highlightedAttendedIds.has(a.email) || highlightedAttendedIds.has(a.name)
                          return (
                          <div 
                            key={`${batch}-${a.employeeId}-${idx}`} 
                            className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border transition-all hover:shadow-md ${
                              a.hasSubmitted
                                ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300 shadow-sm'
                                : a.__attended
                                  ? `bg-green-50 border-green-200 ${isHighlighted ? 'ring-2 ring-green-400 attendance-highlight' : ''}`
                                  : 'bg-white border-gray-200 shadow-sm'
                            }`}
                          >
                            {/* 왼쪽: 이름 • 사번 • 언어 */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">{a.name}</span>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-600 font-mono text-xs whitespace-nowrap">{a.employeeId}</span>
                              <span className="text-gray-400">•</span>
                              <span className={`text-xs font-medium whitespace-nowrap ${
                                (a.language.includes('한') || a.language.toLowerCase().includes('korean')) ? 'text-blue-700' :
                                (a.language.includes('일') || a.language.toLowerCase().includes('japanese')) ? 'text-purple-700' :
                                (a.language.includes('중') || a.language.toLowerCase().includes('chinese')) ? 'text-red-700' :
                                'text-gray-700'
                              }`}>
                                {a.language || '-'}
                              </span>
                            </div>

                            {/* 오른쪽: 출석/제출 상태 배지 */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {/* 출석 배지 */}
                              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap min-w-[60px] justify-center ${
                                a.__attended
                                  ? 'bg-green-500 text-white shadow-sm'
                                  : 'bg-gray-200 text-gray-500'
                              }`} title={a.__attended ? '출석 완료' : '미출석'}>
                                {a.__attended ? (
                                  <>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M20 6L9 17l-5-5" />
                                    </svg>
                                    <span>출석</span>
                                  </>
                                ) : (
                                  <span>출석</span>
                                )}
                              </div>

                              {/* 제출 배지 */}
                              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap min-w-[60px] justify-center ${
                                a.hasSubmitted
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'bg-gray-200 text-gray-500'
                              }`} title={a.hasSubmitted ? `제출 완료: ${a.submittedAt ? new Date(a.submittedAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}` : '미제출'}>
                                {a.hasSubmitted ? (
                                  <>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M20 6L9 17l-5-5" />
                                    </svg>
                                    <span>제출</span>
                                  </>
                                ) : (
                                  <span>제출</span>
                                )}
                              </div>
                            </div>
                          </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 교육 신청자 목록 카드 */}
          <Card className="mb-4 bg-white shadow-lg rounded-2xl hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-gray-50/80 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <User className="w-5 h-5 text-indigo-600" />
                    교육 신청자 목록
                  </CardTitle>
                  <Badge className="bg-indigo-100 text-indigo-700 text-base font-bold px-3 py-1 border border-indigo-200">
                    {educationSessions.length}개 세션
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedEducationDate} onValueChange={async (v) => { setSelectedEducationDate(v); await loadEducationApplicants(v); }}>
                    <SelectTrigger className="w-48 h-9 px-2">
                      <SelectValue placeholder={loadingEducationApplicants ? "로딩 중..." : "날짜 선택"}>
                        {selectedEducationDate ? formatDisplayDate(selectedEducationDate) : (loadingEducationApplicants ? "로딩 중..." : "날짜 선택")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {educationDates.length === 0 && loadingEducationApplicants ? (
                        <div className="p-2 text-sm text-gray-500">날짜 로딩 중...</div>
                      ) : educationDates.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">신청 기록이 없습니다</div>
                      ) : (
                        educationDates.map((d) => (
                          <SelectItem key={`edu-${d}`} value={d}>{formatDisplayDate(d)}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={async () => { await loadEducationApplicants(selectedEducationDate || undefined); }}>
                    <RefreshCw className="w-3 h-3 mr-1" /> Update
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              {loadingEducationApplicants ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
                  <p className="text-gray-600">교육 신청자 목록을 불러오는 중입니다...</p>
                </div>
              ) : educationSessions.length === 0 ? (
                <div className="text-center py-6 text-gray-500">교육 세션이 없습니다.</div>
              ) : (
                <div className="space-y-6">
                  {/* 1:1 교육 섹션 */}
                  {(() => {
                    const oneOnOneSessions = educationSessions.filter(s => s.classType === '1:1')
                    const getLanguageColor = (lang: string) => {
                      if (lang.includes('한') || lang.toLowerCase().includes('korean') || lang.includes('영')) {
                        return 'border-blue-400 bg-blue-50'
                      } else if (lang.includes('일') || lang.toLowerCase().includes('japanese')) {
                        return 'border-purple-400 bg-purple-50'
                      } else if (lang.includes('중') || lang.toLowerCase().includes('chinese')) {
                        return 'border-red-400 bg-red-50'
                      }
                      return 'border-gray-400 bg-gray-50'
                    }
                    
                    const getLanguageBadgeColor = (lang: string) => {
                      if (lang.includes('한') || lang.toLowerCase().includes('korean') || lang.includes('영')) {
                        return 'border-blue-300 bg-blue-50 text-blue-700'
                      } else if (lang.includes('일') || lang.toLowerCase().includes('japanese')) {
                        return 'border-purple-300 bg-purple-50 text-purple-700'
                      } else if (lang.includes('중') || lang.toLowerCase().includes('chinese')) {
                        return 'border-red-300 bg-red-50 text-red-700'
                      }
                      return 'border-gray-300 bg-gray-50 text-gray-700'
                    }
                    
                    return oneOnOneSessions.length > 0 && (
                      <div className="rounded-lg overflow-hidden shadow-sm border border-gray-200">
                        {/* 헤더 영역 */}
                        <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
                          <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <h3 className="text-lg font-bold text-gray-700">1:1 온라인 교정교육</h3>
                            <span className="px-2 py-0.5 bg-gray-100 rounded-full text-sm text-gray-700 font-medium">{oneOnOneSessions.length}개 세션</span>
                          </div>
                        </div>
                        
                        {/* 콘텐츠 영역 */}
                        <div className="bg-white p-3 space-y-2">
                          {oneOnOneSessions.map((session) => {
                            const applicant = session.applicants[0]
                            return (
                              <div key={`${session.language}-${session.classType}-${session.sessionNumber}`} 
                                   className={`border-l-4 ${getLanguageColor(session.language)} rounded-lg p-3 shadow-sm hover:shadow-md transition-all bg-white`}>
                                <div className="flex items-center justify-between gap-3">
                                  {/* 왼쪽: 세션 정보 */}
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className={`px-2 py-1 ${getLanguageBadgeColor(session.language)} rounded-md border`}>
                                      <div className="text-sm font-medium">{session.language}</div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className="font-semibold text-gray-700">{session.sessionNumber}차</span>
                                      <span className="text-gray-400">•</span>
                                      <span className="font-mono text-gray-600">⏰ {session.slotTime}</span>
                                      {session.classroom && (
                                        <>
                                          <span className="text-gray-400">•</span>
                                          <span className="text-gray-500 text-xs">{session.classroom}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* 중앙: 신청자 정보 */}
                                  {applicant ? (
                                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                        applicant.isCheckedIn ? 'bg-green-500' : 'bg-gray-300'
                                      }`}>
                                        {applicant.isCheckedIn && (
                                          <span className="text-[8px] text-white font-bold">✓</span>
                                        )}
                                      </div>
                                      <div className="text-sm">
                                        <span className="font-semibold text-gray-900">{applicant.name}</span>
                                        <span className="text-gray-400 mx-1">•</span>
                                        <span className="text-gray-600 font-mono text-xs">{applicant.employeeId}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-sm text-gray-400 italic">신청자 없음</div>
                                  )}
                                  
                                  {/* 오른쪽: Google Meet 버튼 */}
                                  {applicant && (
                                    <div>
                                      {applicant.googleMeetLink ? (
                                        <button
                                          onClick={() => window.open(applicant.googleMeetLink, '_blank')}
                                          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2"
                                        >
                                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M15 12h2c0-1.1.9-2 2-2V8c0-1.1-.9-2-2-2h-2v6zM9 12V6H7c-1.1 0-2 .9-2 2v2c1.1 0 2 .9 2 2z"/>
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                                          </svg>
                                          Meet 입장
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => generateGoogleMeet(applicant.applicationId, applicant.name)}
                                          disabled={generatingMeet[applicant.applicationId]}
                                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2"
                                        >
                                          {generatingMeet[applicant.applicationId] ? (
                                            <>
                                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                              생성 중...
                                            </>
                                          ) : (
                                            <>
                                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                                              </svg>
                                              Meet 생성
                                            </>
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}
                  
                  {/* 소규모 교육 섹션 */}
                  {(() => {
                    const smallGroupSessions = educationSessions.filter(s => s.classType === '소규모')
                    const getLanguageColor = (lang: string) => {
                      if (lang.includes('한') || lang.toLowerCase().includes('korean') || lang.includes('영')) {
                        return 'border-blue-300 bg-blue-50 text-blue-700'
                      } else if (lang.includes('일') || lang.toLowerCase().includes('japanese')) {
                        return 'border-purple-300 bg-purple-50 text-purple-700'
                      } else if (lang.includes('중') || lang.toLowerCase().includes('chinese')) {
                        return 'border-red-300 bg-red-50 text-red-700'
                      }
                      return 'border-gray-300 bg-gray-50 text-gray-700'
                    }
                    
                    return smallGroupSessions.length > 0 && (
                      <div className="rounded-lg overflow-hidden shadow-sm border border-gray-200">
                        {/* 헤더 영역 */}
                        <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
                          <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <h3 className="text-lg font-bold text-gray-700">소규모 교정교육</h3>
                            <span className="px-2 py-0.5 bg-gray-100 rounded-full text-sm text-gray-700 font-medium">{smallGroupSessions.length}개 세션</span>
                          </div>
                        </div>
                        
                        {/* 콘텐츠 영역 */}
                        <div className="bg-white p-3">
                          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                            {smallGroupSessions.map((session) => (
                              <div key={`${session.language}-${session.classType}-${session.sessionNumber}`} 
                                   className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-md transition-all">
                                {/* 헤더 */}
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className={`px-2 py-1 ${getLanguageColor(session.language)} rounded-md border`}>
                                      <span className="text-sm font-medium">{session.language}</span>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-700">{session.sessionNumber}차</span>
                                  </div>
                                  <div className="text-sm">
                                    <span className={`font-bold ${session.applicants.length === session.capacity ? 'text-red-600' : 'text-indigo-600'}`}>
                                      {session.applicants.length}
                                    </span>
                                    <span className="text-gray-400">/{session.capacity}</span>
                                  </div>
                                </div>
                                
                                {/* 시간 및 카테고리 */}
                                <div className="text-xs text-gray-600 mb-2">
                                  <div className="font-mono">⏰ {session.slotTime}</div>
                                  {session.classroom && (
                                    <div className="text-gray-500 mt-0.5">{session.classroom}</div>
                                  )}
                                  {session.category && (
                                    <span className="inline-block mt-1 px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
                                      {session.category}
                                    </span>
                                  )}
                                </div>
                                
                                {/* 액션 버튼 */}
                                <div className="flex gap-1.5 mb-2">
                                  <button
                                    onClick={() => generateCalendarInvite(session)}
                                    disabled={generatingCalendarInvite[`${session.date}-${session.language}-${session.classType}-${session.sessionNumber}`]}
                                    className="flex-1 px-2 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors disabled:bg-gray-100 disabled:text-gray-400 flex items-center justify-center gap-1"
                                  >
                                    {generatingCalendarInvite[`${session.date}-${session.language}-${session.classType}-${session.sessionNumber}`] ? (
                                      <>
                                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        생성중
                                      </>
                                    ) : (
                                      <>📅 초대</>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleCancellationNotification(session)}
                                    className="flex-1 px-2 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition-colors"
                                  >
                                    폐강 알림
                                  </button>
                                </div>
                                
                                {/* 신청자 목록 */}
                                {session.applicants.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {session.applicants.map((applicant: any, appIndex: number) => (
                                      <div 
                                        key={`${applicant.employeeId}-${appIndex}`} 
                                        className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors"
                                      >
                                        <div className={`w-3 h-3 rounded-full flex items-center justify-center ${
                                          applicant.isCheckedIn ? 'bg-green-500' : 'bg-gray-300'
                                        }`}>
                                          {applicant.isCheckedIn && (
                                            <span className="text-[7px] text-white font-bold">✓</span>
                                          )}
                                        </div>
                                        <span className="text-xs font-semibold text-gray-900">{applicant.name}</span>
                                        <span className="text-xs text-gray-500 font-mono">{applicant.employeeId}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-2 text-xs text-gray-400 bg-gray-50 rounded border border-dashed border-gray-200">
                                    신청자 없음
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 로그인 기록 카드 */}
          <Card className="mt-6 bg-white shadow-lg rounded-2xl hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="pb-4 bg-gray-50/80 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <Activity className="w-6 h-6 text-purple-600" />
                  <span className="text-xl font-bold text-gray-800">로그인 기록</span>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => {
                      setShowLoginLogs(!showLoginLogs);
                      if (!showLoginLogs) {
                        loadLoginLogs();
                      }
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Activity className="w-4 h-4 mr-1" />
                    {showLoginLogs ? '숨기기' : '보기'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            {showLoginLogs && (
              <CardContent className="pt-0">
                {loginLogsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p>로그인 기록 로딩 중...</p>
                  </div>
                ) : loginLogs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>로그인 기록이 없습니다.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="h-10">
                          <TableHead className="w-32 text-center">로그인 시간</TableHead>
                          <TableHead className="w-24 text-center">이름</TableHead>
                          <TableHead className="w-32 text-center">이메일</TableHead>
                          <TableHead className="w-20 text-center">사번</TableHead>
                          <TableHead className="w-20 text-center">부서</TableHead>
                          <TableHead className="w-16 text-center">방법</TableHead>
                          <TableHead className="w-16 text-center">결과</TableHead>
                          <TableHead className="w-24 text-center">IP 주소</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loginLogs.map((log, index) => (
                          <TableRow key={log.id || index} className="h-12">
                            <TableCell className="text-xs py-2 text-center">
                              {formatDate(log.loginTime)}
                            </TableCell>
                            <TableCell className="py-2 text-center font-medium">
                              {log.name}
                            </TableCell>
                            <TableCell className="py-2 text-center text-sm">
                              {log.email}
                            </TableCell>
                            <TableCell className="py-2 text-center">
                              {log.employeeId || '-'}
                            </TableCell>
                            <TableCell className="py-2 text-center text-sm">
                              {log.department || '-'}
                            </TableCell>
                            <TableCell className="py-2 text-center">
                              <Badge variant="outline" className="text-xs">
                                {log.loginMethod === 'google' ? 'Google' : 
                                 log.loginMethod === 'workspace' ? 'Workspace' : 
                                 log.loginMethod === 'test' ? '테스트' : log.loginMethod}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2 text-center">
                              <Badge 
                                variant={log.success ? "default" : "destructive"}
                                className="text-xs"
                              >
                                {log.success ? '성공' : '실패'}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2 text-center text-xs">
                              {log.ipAddress || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    <div className="mt-3 text-sm text-gray-600 text-center">
                      최근 {loginLogs.length}개의 로그인 기록 (총 {loginLogsPagination.totalRecords || 0}개)
                    </div>
                    
                    {/* 페이지네이션 */}
                    {loginLogsPagination.totalPages > 1 && (
                      <div className="mt-4 flex justify-center items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadLoginLogs(loginLogsPagination.page - 1)}
                          disabled={!loginLogsPagination.hasPrevPage}
                        >
                          이전
                        </Button>
                        
                        <span className="text-sm text-gray-600">
                          {loginLogsPagination.page} / {loginLogsPagination.totalPages}
                        </span>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadLoginLogs(loginLogsPagination.page + 1)}
                          disabled={!loginLogsPagination.hasNextPage}
                        >
                          다음
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
            </TabsContent>

            {/* Tab 2: 평가 관리 */}
            <TabsContent value="evaluation" className="space-y-6 mt-0">
              {/* 헤더 */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  <Award className="w-8 h-8 text-blue-600" />
                  평가 관리
                </h1>
                <p className="text-sm text-gray-500 mt-1">제출된 녹음 파일을 확인하여 평가를 진행</p>
              </div>

              {/* 언어별 통계 카드 */}
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                {["korean-english", "japanese", "chinese"].map((lang) => {
                  const langCandidates = candidates.filter(c => c.language === lang)
                  const pending = langCandidates.filter(c => c.status === 'pending').length
                  const evaluating = langCandidates.filter(c => c.status === 'evaluating').length
                  const reviewing = langCandidates.filter(c => c.status === 'reviewing' || c.status === 'review_requested').length
                  const reEvaluation = langCandidates.filter(c => c.status === 're_evaluation').length
                  
                  // 평가 진행 중 = evaluating + reviewing + reEvaluation
                  const inProgress = evaluating + reviewing + reEvaluation
                  
                  const bgColor = lang === "korean-english" 
                    ? "bg-blue-50" 
                    : lang === "japanese" 
                    ? "bg-purple-50" 
                    : "bg-red-50"
                  const headerColor = lang === "korean-english" 
                    ? "text-blue-800" 
                    : lang === "japanese" 
                    ? "text-purple-800" 
                    : "text-red-800"
                  const numColor = lang === "korean-english" 
                    ? "text-blue-900" 
                    : lang === "japanese" 
                    ? "text-purple-900" 
                    : "text-red-900"
                  const borderColor = lang === "korean-english" 
                    ? "border-blue-200" 
                    : lang === "japanese" 
                    ? "border-purple-200" 
                    : "border-red-200"
                  
                  const langDisplay = lang === "korean-english" ? "한/영" : lang === "japanese" ? "일본어" : "중국어"
                  
                  return (
                    <Card 
                      key={lang} 
                      className={`${bgColor} border ${borderColor} shadow-sm hover:shadow-lg transition-all cursor-pointer`}
                      onClick={() => setLanguageFilter(lang)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className={`text-base font-bold ${headerColor}`}>
                            {langDisplay}
                          </CardTitle>
                          <Badge variant="outline" className={`text-xs ${borderColor} ${bgColor}`}>
                            {langCandidates.length}건
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <div className={`text-4xl font-bold ${numColor} mb-4`}>
                          {langCandidates.length}<span className="text-xl ml-1">건</span>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between py-1.5 px-2 bg-white/60 rounded">
                            <span className="text-gray-700 font-medium">대기</span>
                            <span className="font-bold text-orange-600">{pending}</span>
                          </div>
                          <div className="flex items-center justify-between py-1.5 px-2 bg-white/60 rounded">
                            <span className="text-gray-700 font-medium">진행중</span>
                            <span className="font-bold text-blue-600">{inProgress}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* 평가 대기 목록 카드 */}
              <Card className="bg-white shadow-lg rounded-2xl overflow-hidden">
                <CardHeader className="bg-gray-50/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <List className="w-6 h-6 text-purple-600" />
                      <CardTitle className="text-xl font-bold text-gray-800">평가 대기 목록</CardTitle>
                      <Badge className="bg-purple-100 text-purple-700 text-base font-bold px-3 py-1 border border-purple-200">
                        {filteredCandidates.length}명
                      </Badge>
                    </div>
                    <Button onClick={loadCandidates} variant="outline" size="sm">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Update
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {/* 평가 대기 목록 검색/필터 (카드 내부) */}
                  <div className="px-4 pt-4 pb-2">
                    <div className="flex flex-wrap gap-3">
                      <div className="relative flex-1 min-w-[220px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="이름 또는 사번 검색..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 h-9"
                        />
                      </div>
                      <Select value={languageFilter} onValueChange={setLanguageFilter}>
                        <SelectTrigger className="w-40 h-9">
                          <SelectValue placeholder="언어 필터" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">모든 언어</SelectItem>
                          <SelectItem value="korean-english">한/영</SelectItem>
                          <SelectItem value="japanese">일본어</SelectItem>
                          <SelectItem value="chinese">중국어</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-40 h-9">
                          <SelectValue placeholder="상태 필터" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">모든 상태</SelectItem>
                          <SelectItem value="pending">평가 대기</SelectItem>
                          <SelectItem value="review_requested">검토 요청</SelectItem>
                          <SelectItem value="re_evaluation">재평가 대기</SelectItem>
                        </SelectContent>
                      </Select>
                      {(languageFilter !== "all" || statusFilter !== "all" || searchTerm) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 bg-transparent"
                          onClick={() => {
                            setLanguageFilter("all")
                            setStatusFilter("all")
                            setSearchTerm("")
                          }}
                        >
                          <FilterX className="w-3 h-3 mr-1" />
                          초기화
                        </Button>
                      )}
                    </div>
                  </div>
                  {isLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3"></div>
                      <p className="text-gray-600">평가 대상자를 불러오는 중입니다...</p>
                    </div>
                  ) : filteredCandidates.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">표시할 후보자가 없습니다.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full table-fixed">
                        <colgroup>
                          <col className="w-1/7" />
                          <col className="w-1/7" />
                          <col className="w-1/7" />
                          <col className="w-1/7" />
                          <col className="w-1/7" />
                          <col className="w-1/7" />
                          <col className="w-1/7" />
                        </colgroup>
                        <thead>
                          <tr className="border-b border-gray-200 text-sm">
                            <th className="py-4 px-5 font-semibold text-gray-700 text-center align-middle">이름 (사번)</th>
                            <th className="py-4 px-5 font-semibold text-gray-700 text-center align-middle">언어</th>
                            <th className="py-4 px-5 font-semibold text-gray-700 text-center align-middle">구분</th>
                            <th className="py-4 px-5 font-semibold text-gray-700 text-center align-middle">제출시간</th>
                            <th className="py-4 px-5 font-semibold text-gray-700 text-center align-middle">녹음파일</th>
                            <th className="py-4 px-5 font-semibold text-gray-700 text-center align-middle">상태</th>
                            <th className="py-4 px-5 font-semibold text-gray-700 text-center align-middle">작업</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCandidates.map((candidate) => (
                            <tr key={candidate.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-4 px-5 text-center align-middle">
                                <div>
                                  <div className="font-semibold text-gray-900">{candidate.name}</div>
                                  <div className="text-sm text-gray-500">{candidate.employeeId}</div>
                                </div>
                              </td>
                              <td className="py-4 px-5 text-center align-middle">
                                <Badge variant="outline" className={`text-xs ${getLanguageColor(candidate.language)}`}>{getLanguageDisplay(candidate.language)}</Badge>
                              </td>
                              <td className="py-4 px-5 text-sm text-gray-700 text-center align-middle">{candidate.category}</td>
                              <td className="py-4 px-5 text-sm text-gray-600 text-center align-middle">{formatDate(candidate.submittedAt)}</td>
                              <td className="py-4 px-5 text-sm text-blue-600 text-center align-middle">
                                {candidate.recordingCount !== undefined ? candidate.recordingCount : Object.keys(candidate.recordings || {}).length}개
                              </td>
                              <td className="py-4 px-5 text-center align-middle">
                                <div className="flex flex-col gap-1 items-center">
                                  <Badge className={`text-xs ${getStatusDisplay(candidate.status).color}`}>{getStatusDisplay(candidate.status).text}</Badge>
                                  {candidate.status === "review_requested" && candidate.reviewRequestedBy && (
                                    <span className="text-xs text-orange-600">검토 요청: {candidate.reviewRequestedBy}</span>
                                  )}
                                  {candidate.status === "evaluating" && candidate.evaluatedBy && (
                                    <span className="text-xs text-yellow-700 flex items-center gap-1">
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      {candidate.evaluatedBy}
                                    </span>
                                  )}
                                  {candidate.status === "reviewing" && candidate.evaluatedBy && (
                                    <span className="text-xs text-amber-700 flex items-center gap-1">
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      {candidate.evaluatedBy}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-5 text-center align-middle">
                                {candidate.status === "submitted" && !candidate.approved ? (
                                  <Button size="sm" variant="outline" className="border-green-300 text-green-700" onClick={async ()=>{
                                    await fetch("/api/evaluations/approve",{
                                      method:"POST",
                                      headers:{"Content-Type":"application/json"},
                                      body:JSON.stringify({dropboxPath:candidate.dropboxPath,approvedBy:authenticatedUser?.name})
                                    });
                                    loadCandidates();
                                  }}>
                                    승인
                                  </Button>
                                ) : candidate.approved ? (
                                  <Badge className="bg-green-100 text-green-700">승인됨</Badge>
                                ) : candidate.status === "evaluating" ? (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="w-28 border-yellow-300 text-yellow-700 hover:bg-yellow-50" 
                                    onClick={() => handleSelectCandidate(candidate, false)}
                                    disabled={recordingsLoading[candidate.id]}
                                  >
                                    {recordingsLoading[candidate.id] ? (
                                      <>
                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                        로딩중
                                      </>
                                    ) : (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        평가 중
                                      </>
                                    )}
                                  </Button>
                                ) : candidate.status === "reviewing" ? (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="w-28 border-amber-300 text-amber-700 hover:bg-amber-50" 
                                    onClick={() => handleSelectCandidate(candidate, true)}
                                    disabled={recordingsLoading[candidate.id]}
                                  >
                                    {recordingsLoading[candidate.id] ? (
                                      <>
                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                        로딩중
                                      </>
                                    ) : (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        검토 중
                                      </>
                                    )}
                                  </Button>
                                ) : candidate.status === "review_requested" ? (
                                  <Button onClick={() => handleSelectCandidate(candidate, true)} variant="outline" size="sm" className="border-orange-300 text-orange-700 hover:bg-orange-50 w-28" disabled={recordingsLoading[candidate.id]}>
                                    {recordingsLoading[candidate.id] ? (<><RefreshCw className="w-4 h-4 mr-2 animate-spin" />로딩중</>) : ("검토")}
                                  </Button>
                                ) : (
                                  <Button onClick={() => handleSelectCandidate(candidate, false)} size="sm" className="w-28" disabled={recordingsLoading[candidate.id]}>
                                    {recordingsLoading[candidate.id] ? (<><RefreshCw className="w-4 h-4 mr-2 animate-spin" />로딩중</>) : ("평가 시작")}
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    )
  }

  // selectedCandidate가 null일 경우 안전하게 처리
  if (!selectedCandidate) return null;

  // 평가 진행(상세 평가) 화면
  // 상세 평가 관련 함수 선언
  const getEvaluationCriteria = (language: string) => {
    if (language === "korean-english") {
      return {
        korean: evaluationCriteria.korean,
        english: evaluationCriteria.english,
      }
    }
    return { main: evaluationCriteria[language as keyof typeof evaluationCriteria] || {} }
  }
  const getRecordingsByScript = () => {
    const scripts: { [key: string]: { korean?: string; english?: string; japanese?: string; chinese?: string } } = {}
    const recs = selectedCandidate && selectedCandidate.recordings ? selectedCandidate.recordings : {}
    if (!recs || typeof recs !== 'object') return {};
    Object.keys(recs).forEach((key) => {
      const parts = key.split("-")
      if (parts.length >= 2) {
        const scriptNum = parts[0]
        const language = parts[1]
        if (!scripts[scriptNum]) scripts[scriptNum] = {}
        scripts[scriptNum][language as "korean" | "english" | "japanese" | "chinese"] = recs[key]
      }
    })
    return scripts
  }
  const criteriaByLanguage = getEvaluationCriteria(selectedCandidate.language)
  const currentTotalScore = getCurrentTotalScore()
  const recordingsByScript = getRecordingsByScript();

  function safeObjectEntries(obj: unknown): [string, any][] {
    return (typeof obj === 'object' && obj !== null) ? Object.entries(obj as Record<string, any>) : [];
  }

  // CardHeader에서 사용할 언어별 총점 계산 함수 추가
  function getLanguageTotalScore(lang: "korean" | "english") {
    // 대분류 합계만 계산 (소항목 제외)
    const categoryScores = calculateCategoryScoresDetailed();
    if (lang === "korean") {
      return ["발음", "억양", "전달력", "음성", "속도"].reduce((sum, cat) => sum + (categoryScores[`korean-${cat}`] || 0), 0);
    } else {
      return ["발음_자음", "발음_모음", "억양", "강세", "전달력"].reduce((sum, cat) => sum + (categoryScores[`english-${cat}`] || 0), 0);
    }
  }

  // CardHeader에서 사용할 총점 변수 선언 (return 바로 위에서!)
  let displayScore = currentTotalScore;
  if (selectedCandidate && selectedCandidate.language === "korean-english") {
    displayScore = currentLanguage === "korean"
      ? getLanguageTotalScore("korean")
      : getLanguageTotalScore("english");
  }

  // 실시간 등급 계산 함수
  const getCurrentGrade = () => {
    if (!selectedCandidate || selectedCandidate.language !== "korean-english") {
      return null;
    }

    const categoryScores = calculateCategoryScoresDetailed();
    const totalScore = getCurrentTotalScore();
    
    console.log("🔍 등급 계산 디버깅:", { categoryScores, totalScore });
    
    // 한/영 평가 등급 판정 로직
    const koreanCategories = ["korean-발음", "korean-억양", "korean-전달력", "korean-음성", "korean-속도"];
    const englishCategories = ["english-발음_자음", "english-발음_모음", "english-억양", "english-강세", "english-전달력"];

    // FAIL 조건 확인 - 하나라도 16점 미만이면 FAIL
    for (const cat of [...koreanCategories, ...englishCategories]) {
      const score = categoryScores[cat] || 0;
      if (score < 16) {
        console.log("❌ FAIL: 항목 점수 부족", { cat, score });
        return { grade: "FAIL", color: "text-red-600", bgColor: "bg-red-50" };
      }
    }

    // 총점 160점 미만이면 FAIL
    if (totalScore < 160) {
      console.log("❌ FAIL: 총점 부족", { totalScore });
      return { grade: "FAIL", color: "text-red-600", bgColor: "bg-red-50" };
    }

    // S/A/B 등급 결정
    let hasBelow17 = false;
    let hasBelow18 = false;

    for (const cat of [...koreanCategories, ...englishCategories]) {
      const score = categoryScores[cat] || 0;
      if (score < 17) {
        hasBelow17 = true;
        break;
      }
      if (score < 18) {
        hasBelow18 = true;
      }
    }

    if (hasBelow17) {
      console.log("🟡 B등급");
      return { grade: "B등급", color: "text-yellow-600", bgColor: "bg-yellow-50" };
    } else if (hasBelow18) {
      console.log("🔵 A등급");
      return { grade: "A등급", color: "text-blue-600", bgColor: "bg-blue-50" };
    } else {
      console.log("🟢 S등급");
      return { grade: "S등급", color: "text-green-600", bgColor: "bg-green-50" };
    }
  };

  const currentGrade = getCurrentGrade();
  console.log("📊 현재 등급:", currentGrade);



  // showSummary가 true면 EvaluationSummary를 최상단에서 렌더링
  if (showSummary && selectedCandidate) {
    console.log("🔍 EvaluationSummary 렌더링 조건 만족:", { showSummary, selectedCandidate })
    
    const categoryScores = calculateCategoryScoresDetailed();
    // 언어별 총점은 대분류 합계만 사용 (소항목 제외)
    // categoryScores의 대분류 값들은 이미 소항목들의 합계이므로 그대로 사용
    const koreanTotalScore = selectedCandidate?.language === "korean-english" 
      ? ["발음", "억양", "전달력", "음성", "속도"].reduce((sum, cat) => sum + (categoryScores[`korean-${cat}`] || 0), 0)
      : getCurrentTotalScore();
    const englishTotalScore = selectedCandidate?.language === "korean-english"
      ? ["발음_자음", "발음_모음", "억양", "강세", "전달력"].reduce((sum, cat) => sum + (categoryScores[`english-${cat}`] || 0), 0)
      : 0;
    
    console.log("🔍 [DEBUG] categoryScores 전체 내용:", categoryScores);
    console.log("🔍 [DEBUG] categoryScores 키 목록:", Object.keys(categoryScores));
    console.log("🔍 [DEBUG] 언어별 총점 계산:", {
      koreanCategories: ["발음", "억양", "전달력", "음성", "속도"],
      koreanScores: ["발음", "억양", "전달력", "음성", "속도"].map(cat => ({ cat, score: categoryScores[`korean-${cat}`] || 0 })),
      koreanTotalScore,
      englishCategories: ["발음_자음", "발음_모음", "억양", "강세", "전달력"],
      englishScores: ["발음_자음", "발음_모음", "억양", "강세", "전달력"].map(cat => ({ cat, score: categoryScores[`english-${cat}`] || 0 })),
      englishTotalScore,
      totalScore: getCurrentTotalScore(),
      expectedKoreanTotal: 15 + 17 + 16 + 16 + 16, // 스크린샷 기준 예상값
      expectedEnglishTotal: 15 + 16 + 16 + 16 + 16  // 스크린샷 기준 예상값
    });
    
    // 더 자세한 디버깅을 위해 개별 값들도 출력
    console.log("🔍 [DEBUG] 개별 대분류 점수:");
    ["발음", "억양", "전달력", "음성", "속도"].forEach(cat => {
      console.log(`  korean-${cat}: ${categoryScores[`korean-${cat}`] || 0}`);
    });
    ["발음_자음", "발음_모음", "억양", "강세", "전달력"].forEach(cat => {
      console.log(`  english-${cat}: ${categoryScores[`english-${cat}`] || 0}`);
    });
    console.log(`🔍 [DEBUG] 계산된 총점: koreanTotalScore=${koreanTotalScore}, englishTotalScore=${englishTotalScore}`);
    
    const evaluationResult = {
      ...selectedCandidate,
      status: selectedCandidate.status || "pending",
      scores: getCurrentScores(),
      categoryScores: categoryScores,
      totalScore: getCurrentTotalScore(),
      koreanTotalScore,
      englishTotalScore,
      comments: selectedCandidate.language === "korean-english"
          ? { korean: getCurrentComments().korean, english: getCurrentComments().english }
        : getCurrentComments().korean,
      evaluatedAt: new Date().toISOString(),
      evaluatedBy: userInfo?.name || authenticatedUser?.name || '교관',
    }

    console.log("📊 evaluationResult 생성 완료:", {
      id: (evaluationResult as any).id,
      language: (evaluationResult as any).language,
      totalScore: (evaluationResult as any).totalScore,
      koreanTotalScore: (evaluationResult as any).koreanTotalScore,
      englishTotalScore: (evaluationResult as any).englishTotalScore,
      scoresCount: Object.keys((evaluationResult as any).scores || {}).length,
      categoryScoresCount: Object.keys((evaluationResult as any).categoryScores || {}).length
    })

    return (
      <div className="p-6">
        <div className="max-w-[70vw] mx-auto">
        <EvaluationSummary
          isOpen={showSummary}
          onClose={handleEvaluationComplete}
          evaluationResult={evaluationResult as any}
          onSubmit={handleSubmitEvaluation}
          onRequestReview={handleRequestReview}
          authenticatedUser={authenticatedUser}
          dropboxPath={selectedCandidate?.dropboxPath}
          showPdfButton={false}
          isReviewMode={false}
        />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-[70vw] mx-auto relative">
        {/* 녹음 응시 목록 카드 (평가자용) - 대시보드 전용 */}
        {!selectedCandidate && (
        <Card className="mb-4 bg-white shadow-lg rounded-2xl hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="pb-2 bg-gray-50/80 rounded-t-2xl">
            <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-600" />
              녹음 응시 목록
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Select value={selectedApplicantDate || ""} onValueChange={async (v) => { setSelectedApplicantDate(v); const map = await loadAttendance(v); await loadApplicants(v, map); }}>
                  <SelectTrigger className="w-48 h-8">
                    <SelectValue placeholder="날짜 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {applicantDates.map((d) => (
                      <SelectItem key={`appl-${d}`} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={async () => { const map = await loadAttendance(selectedApplicantDate || undefined); await loadApplicants(selectedApplicantDate || undefined, map); }}>
                  <RefreshCw className="w-3 h-3 mr-1" /> 업데이트
                </Button>
              </div>
            </div>
            {loadingApplicants ? (
              <div className="text-center py-6">불러오는 중...</div>
            ) : applicants.length === 0 ? (
              <div className="text-center py-6 text-gray-500">표시할 응시자가 없습니다.</div>
            ) : (
              <div className="overflow-x-auto max-h-56 overflow-y-auto pr-2">{/* 축소 높이 */}
                {/* 차수별 그룹핑 */}
                {Object.entries(applicants.reduce((acc: Record<string, typeof applicants>, cur) => {
                  const key = cur.batch || '미정';
                  (acc[key] = acc[key] || []).push(cur);
                  return acc;
                }, {})).sort((a, b) => {
                  const order = (s: string) => { const m = s.match(/(\d+)/); return m ? parseInt(m[1], 10) : 9999 };
                  return order(a[0]) - order(b[0]);
                }).map(([batch, list]) => (
                  <div key={batch} className="mb-3">
                    <div className="sticky top-0 bg-white/70 backdrop-blur text-xs font-semibold px-2 py-1 rounded-md inline-flex items-center gap-2 border"
                      style={{
                        borderColor: '#fde68a', backgroundColor: '#fffbeb', color: '#92400e'
                      }}
                    >
                      {batch}
                      <span className="text-[10px] text-gray-500">({list.length}명)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                      {list.map((a, idx) => (
                        <div key={`${batch}-${a.employeeId}-${idx}`} className="flex items-center justify-between px-3 py-2 rounded-lg border bg-white shadow-sm">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs text-gray-700 w-20">{a.employeeId}</span>
                            <span className="text-sm text-gray-900">{a.name}</span>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                            (a.language.includes('한') || a.language.toLowerCase().includes('korean')) ? 'border-blue-300 bg-blue-50 text-blue-700' :
                            (a.language.includes('일') || a.language.toLowerCase().includes('japanese')) ? 'border-purple-300 bg-purple-50 text-purple-700' :
                            (a.language.includes('중') || a.language.toLowerCase().includes('chinese')) ? 'border-red-300 bg-red-50 text-red-700' :
                            'border-gray-300 bg-gray-50 text-gray-700'
                          }`}>
                            {a.language || '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* 교육 신청자 목록 카드 */}
        {!selectedCandidate && (
        <Card className="mb-4 bg-white shadow-lg rounded-2xl hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="pb-2 bg-gray-50/80 rounded-t-2xl">
            <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600" />
              교육 신청자 목록
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {/* 🔍 디버깅 정보 - 최상단에 크게 표시 */}
            {educationSessions.length > 0 && (
              <div className="mb-3 p-3 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                <div className="font-bold text-sm text-yellow-900 mb-2">🔍 디버깅 정보:</div>
                {educationSessions.slice(0, 5).map((session, idx) => (
                  <div key={idx} className="text-xs text-yellow-800 mb-1">
                    [{idx}] {session.language} {session.classType} {session.sessionNumber}차 
                    → <strong className="text-red-600">category: "{session.category || 'NULL'}"</strong>
                    , classroom: "{session.classroom || 'NULL'}"
                  </div>
                ))}
                {educationSessions.length > 5 && (
                  <div className="text-xs text-yellow-700 italic">...외 {educationSessions.length - 5}개 세션</div>
                )}
              </div>
            )}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Select value={selectedEducationDate || ""} onValueChange={async (v) => { setSelectedEducationDate(v); await loadEducationApplicants(v); }}>
                  <SelectTrigger className="w-48 h-8">
                    <SelectValue placeholder="날짜 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {educationDates.map((d) => (
                      <SelectItem key={`edu-${d}`} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={async () => { await loadEducationApplicants(selectedEducationDate || undefined); }}>
                  <RefreshCw className="w-3 h-3 mr-1" /> 업데이트
                </Button>
              </div>
            </div>
            {loadingEducationApplicants ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                <span className="text-gray-600">교육 신청자 목록을 불러오는 중...</span>
              </div>
            ) : educationSessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">교육 세션이 없습니다</div>
            ) : (
              <div className="space-y-6">
                {(() => {
                  console.log(`🔍 [전체 세션 확인] 총 ${educationSessions.length}개 세션`);
                  
                  // 1:1 교육 섹션
                  const oneOnOneSessions = educationSessions.filter(s => s.classType === '1:1')
                  const getLanguageColor = (lang: string) => {
                    if (lang.includes('한') || lang.toLowerCase().includes('korean') || lang.includes('영')) {
                      return 'border-blue-400 bg-blue-50'
                    } else if (lang.includes('일') || lang.toLowerCase().includes('japanese')) {
                      return 'border-purple-400 bg-purple-50'
                    } else if (lang.includes('중') || lang.toLowerCase().includes('chinese')) {
                      return 'border-red-400 bg-red-50'
                    }
                    return 'border-gray-400 bg-gray-50'
                  }
                  
                  const getLanguageBadgeColor = (lang: string) => {
                    if (lang.includes('한') || lang.toLowerCase().includes('korean') || lang.includes('영')) {
                      return 'border-blue-300 bg-blue-50 text-blue-700'
                    } else if (lang.includes('일') || lang.toLowerCase().includes('japanese')) {
                      return 'border-purple-300 bg-purple-50 text-purple-700'
                    } else if (lang.includes('중') || lang.toLowerCase().includes('chinese')) {
                      return 'border-red-300 bg-red-50 text-red-700'
                    }
                    return 'border-gray-300 bg-gray-50 text-gray-700'
                  }
                  
                  return (
                    <>
                      {/* 1:1 교육 섹션 */}
                      {oneOnOneSessions.length > 0 && (
                        <div className="rounded-lg overflow-hidden shadow-sm border border-gray-200">
                          {/* 헤더 영역 */}
                          <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
                            <div className="flex items-center gap-3">
                              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <h3 className="text-lg font-bold text-gray-700">1:1 온라인 교정교육</h3>
                              <span className="px-2 py-0.5 bg-gray-100 rounded-full text-sm text-gray-700 font-medium">{oneOnOneSessions.length}개 세션</span>
                            </div>
                          </div>
                          
                          {/* 콘텐츠 영역 */}
                          <div className="bg-white p-3 space-y-2">
                            {oneOnOneSessions.map((session) => {
                              const applicant = session.applicants[0]
                              return (
                                <div key={`${session.language}-${session.classType}-${session.sessionNumber}`} 
                                     className={`border-l-4 ${getLanguageColor(session.language)} rounded-lg p-3 shadow-sm hover:shadow-md transition-all bg-white`}>
                                  <div className="flex items-center justify-between gap-3">
                                    {/* 왼쪽: 세션 정보 */}
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <div className={`px-2 py-1 ${getLanguageBadgeColor(session.language)} rounded-md border`}>
                                        <div className="text-sm font-medium">{session.language}</div>
                                      </div>
                                      
                                      <div className="flex items-center gap-2 text-sm">
                                        <span className="font-semibold text-gray-700">{session.sessionNumber}차</span>
                                        <span className="text-gray-400">•</span>
                                        <span className="font-mono text-gray-600">⏰ {session.slotTime}</span>
                                        {session.classroom && (
                                          <>
                                            <span className="text-gray-400">•</span>
                                            <span className="text-gray-500 text-xs">{session.classroom}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* 중앙: 신청자 정보 */}
                                    {applicant ? (
                                      <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                          applicant.isCheckedIn ? 'bg-green-500' : 'bg-gray-300'
                                        }`}>
                                          {applicant.isCheckedIn && (
                                            <span className="text-[8px] text-white font-bold">✓</span>
                                          )}
                                        </div>
                                        <div className="text-sm">
                                          <span className="font-semibold text-gray-900">{applicant.name}</span>
                                          <span className="text-gray-400 mx-1">•</span>
                                          <span className="text-gray-600 font-mono text-xs">{applicant.employeeId}</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-400 italic">신청자 없음</div>
                                    )}
                                    
                                    {/* 오른쪽: Google Meet 버튼 */}
                                    {applicant && (
                                      <div>
                                        {applicant.googleMeetLink ? (
                                          <button
                                            onClick={() => window.open(applicant.googleMeetLink, '_blank')}
                                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2"
                                          >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                              <path d="M15 12h2c0-1.1.9-2 2-2V8c0-1.1-.9-2-2-2h-2v6zM9 12V6H7c-1.1 0-2 .9-2 2v2c1.1 0 2 .9 2 2z"/>
                                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                                            </svg>
                                            Meet 입장
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => generateGoogleMeet(applicant.applicationId, applicant.name)}
                                            disabled={generatingMeet[applicant.applicationId]}
                                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2"
                                          >
                                            {generatingMeet[applicant.applicationId] ? (
                                              <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                생성 중...
                                              </>
                                            ) : (
                                              <>
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                                                </svg>
                                                Meet 생성
                                              </>
                                            )}
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* 소규모 교육 섹션 */}
                      {(() => {
                        const smallGroupSessions = educationSessions.filter(s => s.classType === '소규모')
                        const getLanguageColorSmall = (lang: string) => {
                          if (lang.includes('한') || lang.toLowerCase().includes('korean') || lang.includes('영')) {
                            return 'border-blue-300 bg-blue-50 text-blue-700'
                          } else if (lang.includes('일') || lang.toLowerCase().includes('japanese')) {
                            return 'border-purple-300 bg-purple-50 text-purple-700'
                          } else if (lang.includes('중') || lang.toLowerCase().includes('chinese')) {
                            return 'border-red-300 bg-red-50 text-red-700'
                          }
                          return 'border-gray-300 bg-gray-50 text-gray-700'
                        }
                        
                        return smallGroupSessions.length > 0 && (
                          <div className="rounded-lg overflow-hidden shadow-sm border border-gray-200">
                            {/* 헤더 영역 */}
                            <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
                              <div className="flex items-center gap-3">
                                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <h3 className="text-lg font-bold text-gray-700">소규모 교정교육</h3>
                                <span className="px-2 py-0.5 bg-gray-100 rounded-full text-sm text-gray-700 font-medium">{smallGroupSessions.length}개 세션</span>
                              </div>
                            </div>
                            
                            {/* 콘텐츠 영역 */}
                            <div className="bg-white p-3">
                              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                              {smallGroupSessions.map((session) => (
                                <div key={`${session.language}-${session.classType}-${session.sessionNumber}`} 
                                     className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-md transition-all">
                                  {/* 헤더 */}
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <div className={`px-2 py-1 ${getLanguageColorSmall(session.language)} rounded-md border`}>
                                        <span className="text-sm font-medium">{session.language}</span>
                                      </div>
                                      <span className="text-sm font-semibold text-gray-700">{session.sessionNumber}차</span>
                                    </div>
                                    <div className="text-sm">
                                      <span className={`font-bold ${session.applicants.length === session.capacity ? 'text-red-600' : 'text-indigo-600'}`}>
                                        {session.applicants.length}
                                      </span>
                                      <span className="text-gray-400">/{session.capacity}</span>
                                    </div>
                                  </div>
                                  
                                  {/* 시간 및 카테고리 */}
                                  <div className="text-xs text-gray-600 mb-2">
                                    <div className="font-mono">⏰ {session.slotTime}</div>
                                    {session.classroom && (
                                      <div className="text-gray-500 mt-0.5">{session.classroom}</div>
                                    )}
                                    {session.category && (
                                      <span className="inline-block mt-1 px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
                                        {session.category}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* 액션 버튼 */}
                                  <div className="flex gap-1.5 mb-2">
                                    <button
                                      onClick={() => generateCalendarInvite(session)}
                                      disabled={generatingCalendarInvite[`${session.date}-${session.language}-${session.classType}-${session.sessionNumber}`]}
                                      className="flex-1 px-2 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors disabled:bg-gray-100 disabled:text-gray-400 flex items-center justify-center gap-1"
                                    >
                                      {generatingCalendarInvite[`${session.date}-${session.language}-${session.classType}-${session.sessionNumber}`] ? (
                                        <>
                                          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                          </svg>
                                          생성중
                                        </>
                                      ) : (
                                        <>📅 초대</>
                                      )}
                                    </button>
                                    <button
                                      onClick={() => handleCancellationNotification(session)}
                                      className="flex-1 px-2 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition-colors"
                                    >
                                      폐강 알림
                                    </button>
                                  </div>
                                  
                                  {/* 신청자 목록 */}
                                  {session.applicants.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {session.applicants.map((applicant: any, appIndex: number) => (
                                        <div 
                                          key={`${applicant.employeeId}-${appIndex}`} 
                                          className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors"
                                        >
                                          <div className={`w-3 h-3 rounded-full flex items-center justify-center ${
                                            applicant.isCheckedIn ? 'bg-green-500' : 'bg-gray-300'
                                          }`}>
                                            {applicant.isCheckedIn && (
                                              <span className="text-[7px] text-white font-bold">✓</span>
                                            )}
                                          </div>
                                          <span className="text-xs font-semibold text-gray-900">{applicant.name}</span>
                                          <span className="text-xs text-gray-500 font-mono">{applicant.employeeId}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-center py-2 text-xs text-gray-400 bg-gray-50 rounded border border-dashed border-gray-200">
                                      신청자 없음
                                    </div>
                                  )}
                                </div>
                              ))}
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                    </>
                  )
                })()}
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* 평가 기록 사이드 모달 */}
        {showEvaluationHistory && (
          <>
            {/* 반투명 배경 (클릭해도 닫히지 않음) */}
            <div className="fixed inset-0 bg-black/20 z-40" style={{ pointerEvents: 'none' }} />
            
            {/* 사이드 모달 - 왼쪽 40% */}
            <div className="fixed left-0 top-0 bottom-0 w-[40%] bg-white shadow-2xl z-50 flex flex-col border-r border-gray-200">
              {/* 헤더 */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
                <div className="flex items-center gap-3">
                  <History className="w-5 h-5 text-purple-600" />
            <div>
                    <h3 className="text-lg font-bold text-gray-900">평가 기록</h3>
                    <p className="text-xs text-gray-600">
                      {selectedCandidate?.name} ({selectedCandidate?.employeeId}) · {getLanguageDisplay(selectedCandidate?.language ?? '')}
            </p>
            </div>
          </div>
                <Button
                  onClick={() => setShowEvaluationHistory(false)}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* 내용 */}
              <div className="flex-1 overflow-y-auto p-6">
                {loadingHistory ? (
                  <div className="flex items-center justify-center h-full">
                    <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
                  </div>
                ) : evaluationHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <AlertCircle className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">평가 기록이 없습니다</p>
                    <p className="text-xs text-gray-400 mt-1">완료된 평가가 있으면 여기에 표시됩니다</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {evaluationHistory.map((record, index) => (
                      <Card key={record.id} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-semibold text-gray-700">
                                  {new Date(record.evaluatedAt).toLocaleDateString('ko-KR', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>평가자: {record.evaluatedBy || '알 수 없음'}</span>
                                <span>•</span>
                                <Badge variant="outline" className="text-xs">
                                  {record.category}
                                </Badge>
                                {record.approved && (
                                  <>
                                    <span>•</span>
                                    <Badge className="text-xs bg-green-100 text-green-700 border-green-300">
                                      승인됨
                                    </Badge>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {record.language === 'korean-english' ? (
                                <>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-gray-500">한국어:</span>
                                    <span className={`text-lg font-bold ${record.koreanTotalScore < 80 ? 'text-red-600' : 'text-blue-600'}`}>
                                      {record.koreanTotalScore?.toFixed(1) || '0'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-gray-500">영어:</span>
                                    <span className={`text-lg font-bold ${record.englishTotalScore < 80 ? 'text-red-600' : 'text-green-600'}`}>
                                      {record.englishTotalScore?.toFixed(1) || '0'}
                                    </span>
                                  </div>
                                  {record.grade && record.grade !== 'N/A' && (
                                    <Badge className="text-xs px-2 py-0.5">
                                      {record.grade}등급
                                    </Badge>
                                  )}
                                </>
                              ) : (
                                <>
                                  <span className={`text-2xl font-bold ${record.totalScore < 80 ? 'text-red-600' : 'text-purple-600'}`}>
                                    {record.totalScore?.toFixed(1) || '0'}
                                  </span>
                                  <span className="text-xs text-gray-500">/ 100점</span>
                                </>
                              )}
                            </div>
                          </div>
                        </CardHeader>

                        {/* 세부 점수 - 카테고리별 상세 */}
                        {record.language === 'korean-english' ? (
                          <CardContent className="pt-0">
                            {(() => {
                              // 평가 기준 가져오기
                              const koreanCriteria = {
                                발음: { 자음: 3, 모음: 3, 이중모음: 3, ㅎ음가: 3, 받침발음: 3, 장음: 3, "발음기호 준수": 2 },
                                억양: { "자연스러운 억양": 5, "상승, 하강, 평어조의 적절한 사용": 5, "꾸밈없는 조사와 어미": 5, "표준 억양 사용": 5 },
                                전달력: { "의미상 주요단어의 강세": 5, "의미 단위의 끊어읽기": 5, "부드러운 연결": 5, "문안의 숙련도": 5 },
                                음성: { "친절한 분위기": 5, "전문적이고 정성스러운 방송": 5, "방송문 성격에 맞는 적절한 연출": 5, "자신감있고 안정적인 발성": 5 },
                                속도: { "전체적인 속도": 10, "일관된 속도 유지": 5, "Pause의 적절한 길이 조절": 5 }
                              };
                              const englishCriteria = {
                                발음_자음: { "P / F": 4, "B / V": 4, "R / L": 4, "기타 자음": 4, 변이음: 4 },
                                발음_모음: { 모음: 10, "장모음 / 단모음": 5, "음절의 이해": 5 },
                                억양: { "언어적 유창성": 5, "음 높낮이의 효과적인 사용": 5, "문맥 / 문장 유형에 맞는 적절한 억양 표현": 5, 연음: 5 },
                                강세: { "단어 고유의 강세": 10, "의미상 주요단어의 강세": 5, "강세의 이해": 5 },
                                전달력: { "자연스러운 연결": 4, "자신감있고 안정적인 발성": 4, "Pause의 활용": 4, "전체적인 속도": 4, "일관된 속도 유지": 4 }
                              };

                              // 모든 점수를 배열로 변환 (만점과 함께) - 소항목만!
                              const allScores: Array<{key: string, value: number, maxScore: number, percent: number, display: string}> = [];
                              
                              Object.entries(record.scores).forEach(([key, value]) => {
                                let maxScore = 0;
                                let display = key;
                                let isSubItem = false; // 소항목인지 확인
                                
                                if (key.startsWith('korean-')) {
                                  const parts = key.replace('korean-', '').split('-');
                                  // 소항목만 포함: parts.length >= 2 (예: ['발음', '자음'])
                                  if (parts.length >= 2) {
                                    isSubItem = true;
                                    const category = parts[0] as keyof typeof koreanCriteria;
                                    const subItem = parts.slice(1).join('-');
                                    if (koreanCriteria[category] && typeof koreanCriteria[category] === 'object') {
                                      maxScore = (koreanCriteria[category] as any)[subItem] || 0;
                                    }
                                    display = subItem;
                                  }
                                } else if (key.startsWith('english-')) {
                                  const withoutPrefix = key.replace('english-', '');
                                  let category: keyof typeof englishCriteria | '' = '';
                                  if (withoutPrefix.startsWith('발음_자음')) category = '발음_자음';
                                  else if (withoutPrefix.startsWith('발음_모음')) category = '발음_모음';
                                  else if (withoutPrefix.startsWith('억양')) category = '억양';
                                  else if (withoutPrefix.startsWith('강세')) category = '강세';
                                  else if (withoutPrefix.startsWith('전달력')) category = '전달력';
                                  
                                  if (category) {
                                    const parts = withoutPrefix.split('-');
                                    // 소항목만 포함: parts.length >= 2 (예: ['발음_자음', 'P / F'])
                                    if (parts.length >= 2) {
                                      isSubItem = true;
                                      const subItem = withoutPrefix.replace(`${category}-`, '');
                                      if (englishCriteria[category] && typeof englishCriteria[category] === 'object') {
                                        maxScore = (englishCriteria[category] as any)[subItem] || 0;
                                      }
                                      display = subItem;
                                    }
                                  }
                                }
                                
                                // 소항목만 추가
                                if (isSubItem && maxScore > 0) {
                                  allScores.push({
                                    key,
                                    value: Number(value),
                                    maxScore,
                                    percent: maxScore > 0 ? (Number(value) / maxScore) * 100 : 0,
                                    display
                                  });
                                }
                              });

                              // 만점 대비 70% 이하인 항목 찾기
                              const lowPercentKeys = new Set(
                                allScores.filter(s => s.percent <= 70).map(s => s.key)
                              );

                              // 카테고리별 그룹화
                              const koreanCategories: Record<string, Array<typeof allScores[0]>> = {
                                '발음': [], '억양': [], '전달력': [], '음성': [], '속도': []
                              };
                              const englishCategories: Record<string, Array<typeof allScores[0]>> = {
                                '발음_자음': [], '발음_모음': [], '억양': [], '강세': [], '전달력': []
                              };

                              allScores.forEach(score => {
                                if (score.key.startsWith('korean-')) {
                                  const parts = score.key.replace('korean-', '').split('-');
                                  const category = parts[0];
                                  if (koreanCategories[category]) {
                                    koreanCategories[category].push(score);
                                  }
                                } else if (score.key.startsWith('english-')) {
                                  const withoutPrefix = score.key.replace('english-', '');
                                  let category = '';
                                  if (withoutPrefix.startsWith('발음_자음')) category = '발음_자음';
                                  else if (withoutPrefix.startsWith('발음_모음')) category = '발음_모음';
                                  else if (withoutPrefix.startsWith('억양')) category = '억양';
                                  else if (withoutPrefix.startsWith('강세')) category = '강세';
                                  else if (withoutPrefix.startsWith('전달력')) category = '전달력';
                                  
                                  if (category && englishCategories[category]) {
                                    englishCategories[category].push(score);
                                  }
                                }
                              });

                              const categoryDisplayNames: Record<string, string> = {
                                '발음': '발음', '억양': '억양', '전달력': '전달력', '음성': '음성', '속도': '속도',
                                '발음_자음': '발음_자음', '발음_모음': '발음_모음', '강세': '강세'
                              };

                              return (
                                <div className="grid grid-cols-2 gap-3">
                                  {/* 한국어 */}
                                  <div className="space-y-2">
                                    <div className="text-xs font-bold text-blue-700 mb-2">🇰🇷 한국어</div>
                                    {Object.entries(koreanCategories).map(([category, items]) => {
                                      if (items.length === 0) return null;
                                      // categoryScores에서 가져오기 (DB 저장값)
                                      const categoryKey = `korean-${category}`;
                                      const categoryTotal = record.categoryScores?.[categoryKey] || items.reduce((sum, item) => sum + item.value, 0);
                                      const isFail = categoryTotal < 16; // 16점 미만 fail
                                      return (
                                        <div key={category} className={`rounded-lg p-2 border ${isFail ? 'bg-red-50/40 border-red-200' : 'bg-blue-50/40 border-blue-100'}`}>
                                          <div className="flex justify-between items-center mb-1">
                                            <span className={`text-xs font-semibold ${isFail ? 'text-red-900' : 'text-blue-900'}`}>
                                              {categoryDisplayNames[category] || category}
                                            </span>
                                            <span className={`text-xs font-bold ${isFail ? 'text-red-600' : 'text-blue-700'}`}>
                                              {categoryTotal.toFixed(1)}
                                              <span className="text-[10px] ml-0.5">/20</span>
                                            </span>
                                          </div>
                                          <div className="space-y-0.5 pl-2">
                                            {items.map(item => {
                                              const isLow = lowPercentKeys.has(item.key);
                                              return (
                                                <div key={item.key} className="flex justify-between text-[11px]">
                                                  <span className={isLow ? "text-red-600 font-bold" : "text-gray-600"}>
                                                    {item.display}
                                                  </span>
                                                  <span className={isLow ? "text-red-600 font-bold" : "text-gray-700"}>
                                                    {item.value.toFixed(1)}
                                                  </span>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* 영어 */}
                                  <div className="space-y-2">
                                    <div className="text-xs font-bold text-green-700 mb-2">🇺🇸 영어</div>
                                    {Object.entries(englishCategories).map(([category, items]) => {
                                      if (items.length === 0) return null;
                                      // categoryScores에서 가져오기 (DB 저장값)
                                      const categoryKey = `english-${category}`;
                                      const categoryTotal = record.categoryScores?.[categoryKey] || items.reduce((sum, item) => sum + item.value, 0);
                                      const isFail = categoryTotal < 16; // 16점 미만 fail
                                      return (
                                        <div key={category} className={`rounded-lg p-2 border ${isFail ? 'bg-red-50/40 border-red-200' : 'bg-green-50/40 border-green-100'}`}>
                                          <div className="flex justify-between items-center mb-1">
                                            <span className={`text-xs font-semibold ${isFail ? 'text-red-900' : 'text-green-900'}`}>
                                              {categoryDisplayNames[category] || category}
                                            </span>
                                            <span className={`text-xs font-bold ${isFail ? 'text-red-600' : 'text-green-700'}`}>
                                              {categoryTotal.toFixed(1)}
                                              <span className="text-[10px] ml-0.5">/20</span>
                                            </span>
                                          </div>
                                          <div className="space-y-0.5 pl-2">
                                            {items.map(item => {
                                              const isLow = lowPercentKeys.has(item.key);
                                              return (
                                                <div key={item.key} className="flex justify-between text-[11px]">
                                                  <span className={isLow ? "text-red-600 font-bold" : "text-gray-600"}>
                                                    {item.display}
                                                  </span>
                                                  <span className={isLow ? "text-red-600 font-bold" : "text-gray-700"}>
                                                    {item.value.toFixed(1)}
                                                  </span>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* 코멘트 */}
                            {(record.comments?.korean || record.comments?.english) && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="text-xs font-medium text-gray-700 mb-2">평가 코멘트</div>
                                {record.comments.korean && (
                                  <div className="bg-blue-50/30 rounded p-2 mb-1.5">
                                    <span className="text-xs text-blue-700 font-medium">🇰🇷</span>
                                    <p className="text-xs text-gray-700 mt-0.5">{record.comments.korean}</p>
                                  </div>
                                )}
                                {record.comments.english && (
                                  <div className="bg-green-50/30 rounded p-2">
                                    <span className="text-xs text-green-700 font-medium">🇺🇸</span>
                                    <p className="text-xs text-gray-700 mt-0.5">{record.comments.english}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        ) : (
                          <CardContent className="pt-0">
                            {(() => {
                              // 일본어/중국어: 만점 대비 퍼센트로 낮은 점수 찾기
                              const criteria = record.language === 'japanese' 
                                ? { 발음: 30, 억양: 20, Pause: 25, Speed: 10, Tone: 10, Volume: 5 }
                                : { 한어병음: 30, 억양: 20, PAUSE: 20, 속도: 10, Tone: 10, Volume: 10 };
                              
                              const allScores = Object.entries(record.scores).map(([key, value]) => {
                                const maxScore = (criteria as any)[key] || 0;
                                const percent = maxScore > 0 ? (Number(value) / maxScore) * 100 : 0;
                                
                                // Fail 기준 판단
                                let isFail = false;
                                if (record.language === 'japanese') {
                                  // 일본어 특수 기준
                                  if (key === 'Pause') {
                                    isFail = Number(value) < 23; // 23점 미만 fail
                                  } else if (key === 'Volume') {
                                    isFail = Number(value) < 4; // 4점 미만 fail
                                  } else {
                                    isFail = percent < 80; // 나머지는 80% 미만 fail
                                  }
                                } else {
                                  // 중국어는 모두 80% 미만 fail
                                  isFail = percent < 80;
                                }
                                
                                return {
                                  key,
                                  value: Number(value),
                                  maxScore,
                                  percent,
                                  isFail,
                                  display: key
                                };
                              });
                              
                              // 만점 대비 70% 이하인 항목 찾기
                              const lowPercentKeys = new Set(
                                allScores.filter(s => s.percent <= 70).map(s => s.key)
                              );

                              return (
                                <div className="bg-purple-50/40 rounded-lg p-3 border border-purple-100">
                                  <div className="space-y-1">
                                    {allScores.map(item => {
                                      const isLow = lowPercentKeys.has(item.key);
                                      return (
                                        <div key={item.key} className="flex justify-between text-xs">
                                          <span className={item.isFail ? "text-red-600 font-bold" : isLow ? "text-red-600 font-bold" : "text-gray-700 font-medium"}>
                                            {item.display}
                                          </span>
                                          <div className="flex items-center gap-1">
                                            <span className={item.isFail ? "text-red-600 font-bold" : isLow ? "text-red-600 font-bold" : "text-gray-800 font-semibold"}>
                                              {item.value.toFixed(1)}
                                            </span>
                                            <span className="text-[10px] text-gray-500">
                                              /{item.maxScore}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}
                            {record.comments && typeof record.comments === 'string' && record.comments.trim() && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="text-xs font-medium text-gray-700 mb-1">평가 코멘트</div>
                                <p className="text-xs text-gray-600">{record.comments}</p>
                              </div>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* 통계 요약 (하단) */}
              {!loadingHistory && evaluationHistory.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                      <span className="font-medium text-gray-700">총 {evaluationHistory.length}개의 평가 기록</span>
                    </div>
                    {evaluationHistory.length > 0 && (
                      <div className="text-xs text-gray-500">
                        최근: {new Date(evaluationHistory[0].evaluatedAt).toLocaleDateString('ko-KR')}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* 돌아가기 버튼 - 왼쪽 네비게이션 사이드바와 메인 컨텐츠 사이 */}
        {selectedCandidate && (
          <Button 
            onClick={handleCancelEvaluation} 
            variant="ghost" 
            size="sm" 
            className="absolute left-[calc(8vw-1rem-200px)] top-[-6px] h-10 w-10 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full shrink-0 z-10 shadow-sm bg-white transition-all duration-150 active:scale-90 active:bg-gray-200"
            title="돌아가기"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}

        {/* 헤더: 정보 카드들 (평가 진행 중일 때만) */}
        {selectedCandidate && (
        <div className="flex items-center justify-between mt-8 mb-6">
          {/* 왼쪽: 응시자 정보 + 언어 선택 */}
          <div className="flex items-center gap-4">
            {/* 응시자 정보 카드 */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-purple-50 to-blue-50 px-5 py-3 rounded-xl border border-purple-200/50 shadow-sm">
              <User className="w-6 h-6 text-purple-600" />
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-lg text-gray-900">{selectedCandidate?.name ?? ''}</span>
                <span className="text-sm text-gray-500">({selectedCandidate?.employeeId ?? ''})</span>
                <div className="w-px h-5 bg-gray-300"></div>
                <Badge variant="outline" className="text-xs px-2 py-0.5 bg-white/70 border-purple-300 text-purple-700 font-medium">
                  {selectedCandidate?.category ?? ''}
                </Badge>
                <Badge variant="outline" className="text-xs px-2 py-0.5 bg-white/70 border-blue-300 text-blue-700 font-medium">
                  <Globe className="w-3 h-3 mr-0.5" />
                  {getLanguageDisplay(selectedCandidate?.language ?? '')}
                </Badge>
                <div className="w-px h-4 bg-gray-300"></div>
                <Button
                  onClick={() => {
                    setShowEvaluationHistory(true)
                    loadEvaluationHistory()
                  }}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-purple-700 hover:text-purple-900 hover:bg-purple-100/50"
                >
                  <History className="w-3.5 h-3.5 mr-1" />
                  이전 기록
                </Button>
              </div>
            </div>

            {/* 언어 선택 스위치 (한영인 경우) */}
            {selectedCandidate?.language === "korean-english" && (
                <div className="grid grid-cols-2 gap-2 p-1 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <Button
                    variant={currentLanguage === "korean" ? "default" : "ghost"}
                    onClick={() => handleLanguageChange("korean")}
                    size="sm"
                    className={
                      currentLanguage === "korean"
                        ? "bg-blue-600 text-white shadow-md hover:bg-blue-700 h-8 text-xs px-3"
                        : "text-gray-700 hover:bg-gray-100 h-8 text-xs px-3"
                    }
                  >
                    🇰🇷 한국어
                  </Button>
                  <Button
                    variant={currentLanguage === "english" ? "default" : "ghost"}
                    onClick={() => handleLanguageChange("english")}
                    size="sm"
                    className={
                      currentLanguage === "english"
                        ? "bg-green-600 text-white shadow-md hover:bg-green-700 h-8 text-xs px-3"
                        : "text-gray-700 hover:bg-gray-100 h-8 text-xs px-3"
                    }
                  >
                    🇺🇸 영어
                  </Button>
                </div>
            )}
          </div>

          {/* 오른쪽: 총점 카드 */}
            {selectedCandidate?.language === 'korean-english' ? (
            <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-xl border shadow-sm">
                    <Award className={`w-5 h-5 ${
                      displayScore < 80
                        ? 'text-red-600'
                        : currentLanguage === 'korean' 
                          ? 'text-blue-600' 
                          : 'text-green-600'
                    }`} />
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium text-gray-600">
                  {currentLanguage === 'korean' ? '한국어' : '영어'}
                </span>
                <div className={`text-2xl font-bold ${
                    displayScore < 80
                      ? 'text-red-600'
                      : currentLanguage === 'korean' 
                        ? 'text-blue-600' 
                        : 'text-green-600'
                }`}>
                  {typeof displayScore === 'number' ? displayScore.toFixed(1).replace(/\.0$/, '') : displayScore}
                    </div>
                <span className="text-xs text-gray-500">/ 100</span>
                {selectedCandidate?.language === "korean-english" && currentGrade && (
                  <Badge className={`ml-2 text-xs px-2.5 py-0.5 ${currentGrade.color} ${currentGrade.bgColor} border`}>
                    {currentGrade.grade}
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-xl border shadow-sm">
                    <Award className={`w-5 h-5 ${
                      currentTotalScore < 80 ? 'text-red-600' : 'text-purple-600'
                    }`} />
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium text-gray-600">총점</span>
                <div className={`text-2xl font-bold ${
                    currentTotalScore < 80 ? 'text-red-600' : 'text-purple-600'
                }`}>
                  {currentTotalScore}
          </div>
                <span className="text-xs text-gray-500">/ 100</span>
        </div>
            </div>
          )}
        </div>
        )}

        {/* 상세 평가 UI (녹음, 평가 항목 등) 기존 코드 유지 */}
        {selectedCandidate && (
        <div className="grid lg:grid-cols-4 gap-6">
          {/* 녹음 파일 재생 - 개선된 버전 */}
          <Card className="lg:col-span-1 bg-white shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="bg-gray-50/80">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-800">
                <Volume2 className="w-6 h-6 text-purple-600" />
                녹음 파일
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {/* 언어별 연속 재생 버튼 */}
              {selectedCandidate.language === "korean-english" ? (
                // 한/영 평가: 현재 탭에 맞는 버튼만 표시
                <div className="space-y-2">
                  {currentLanguage === "korean" && (
                    <Button
                      onClick={() => {
                        console.log("🔘 한국어 전체 재생 버튼 클릭됨", { isPlayingAll })
                        if (isPlayingAll) {
                          pauseAllRecordings()
                        } else {
                          playAllRecordings("korean")
                        }
                      }}
                      variant="outline"
                      className={`w-full h-12 ${
                        isPlayingAll 
                          ? "bg-orange-500 hover:bg-orange-600 border-orange-600 text-white" 
                          : "bg-blue-500 hover:bg-blue-600 border-blue-600 text-white"
                      }`}
                    >
                      {isPlayingAll ? (
                        <>
                          <StopCircle className="w-5 h-5 mr-2" />
                          한국어 일시 중지
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-5 h-5 mr-2" />
                          한국어 {playbackState?.isPaused && playbackState.targetLanguage !== "english" ? "이어서" : "전체"} 재생
                        </>
                      )}
                    </Button>
                  )}
                  {currentLanguage === "english" && (
                    <Button
                      onClick={() => {
                        console.log("🔘 영어 전체 재생 버튼 클릭됨", { isPlayingAll })
                        if (isPlayingAll) {
                          pauseAllRecordings()
                        } else {
                          playAllRecordings("english")
                        }
                      }}
                      variant="outline"
                      className={`w-full h-12 ${
                        isPlayingAll 
                          ? "bg-orange-500 hover:bg-orange-600 border-orange-600 text-white" 
                          : "bg-green-500 hover:bg-green-600 border-green-600 text-white"
                      }`}
                    >
                      {isPlayingAll ? (
                        <>
                          <StopCircle className="w-5 h-5 mr-2" />
                          영어 일시 중지
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-5 h-5 mr-2" />
                          영어 {playbackState?.isPaused && playbackState.targetLanguage === "english" ? "이어서" : "전체"} 재생
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ) : (
                // 일본어/중국어: 기존과 동일하게 모든 버튼 표시
                <div className="space-y-2">
                  <Button
                    onClick={() => {
                      console.log("🔘 전체 재생 버튼 클릭됨", { isPlayingAll })
                      if (isPlayingAll) {
                        pauseAllRecordings()
                      } else {
                        playAllRecordings()
                      }
                    }}
                    variant="outline"
                    className={`w-full h-12 ${
                      isPlayingAll 
                        ? "bg-orange-500 hover:bg-orange-600 border-orange-600 text-white" 
                        : "bg-purple-500 hover:bg-purple-600 border-purple-600 text-white"
                    }`}
                  >
                    {isPlayingAll ? (
                      <>
                        <StopCircle className="w-5 h-5 mr-2" />
                        일시 중지
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-5 h-5 mr-2" />
                        {playbackState?.isPaused ? "이어서" : "전체"} 재생
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* 문안별 재생 */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-gray-700">문안별 재생</h4>
                {recordingsLoading[selectedCandidate.id] ? (
                  <div className="text-center py-4">
                    <div className="inline-flex items-center gap-2 text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm">녹음 파일 로딩 중...</span>
                    </div>
                  </div>
                ) : (!selectedCandidate.recordings || Object.keys(selectedCandidate.recordings).length === 0) && !recordingsLoading[selectedCandidate.id] ? (
                  <div className="text-center py-4 text-gray-500">
                    <p>녹음 파일이 없습니다.</p>
                  </div>
                ) : (
                  Object.entries(recordingsByScript as Record<string, unknown>).map((entry) => {
                    const [scriptNum, recordings] = entry as [string, any];
                    const rec = recordings;
                    
                    // 언어별로 표시할 녹음 파일 결정
                    let shouldShowKorean = false;
                    let shouldShowEnglish = false;
                    
                    if (selectedCandidate.language === "korean-english") {
                      // 한/영 평가: 현재 탭에 따라 표시
                      if (currentLanguage === "korean") {
                        shouldShowKorean = !!(rec.korean);
                      } else if (currentLanguage === "english") {
                        shouldShowEnglish = !!(rec.english);
                      }
                    } else {
                      // 일본어/중국어: 기존과 동일하게 모든 언어 표시
                      shouldShowKorean = !!(rec.korean || rec.japanese || rec.chinese);
                      shouldShowEnglish = !!(rec.english);
                    }
                    
                    // 표시할 내용이 없으면 건너뛰기
                    if (!shouldShowKorean && !shouldShowEnglish) {
                      return null;
                    }
                    
                    return (
                      <div key={scriptNum} className="border rounded-lg p-3 bg-gray-50">
                        <div className="font-medium text-sm mb-2">{scriptNum}번 문안</div>
                        <div className="space-y-3">
                          {shouldShowKorean && (() => {
                            const recordingKey = rec.korean || rec.japanese || rec.chinese;
                            const audioUrl = createAudioBlobUrl(recordingKey);
                            
                            return (
                              <div className="space-y-2">
                                {audioUrl ? (
                                  <audio
                                    key={`${scriptNum}-korean`}
                                    controls
                                    className="w-full h-10"
                                    onPlay={() => {
                                      // 다른 오디오 정지
                                      const allAudios = document.querySelectorAll('audio');
                                      allAudios.forEach(audio => {
                                        if (audio !== event?.target) {
                                          (audio as HTMLAudioElement).pause();
                                        }
                                      });
                                    }}
                                    onError={(e) => {
                                      console.error("오디오 재생 오류:", e);
                                    }}
                                  >
                                    <source src={audioUrl} type="audio/webm" />
                                    브라우저가 오디오를 지원하지 않습니다.
                                  </audio>
                                ) : (
                                  <div className="text-center py-2 text-red-500 text-sm">
                                    오디오 파일을 로드할 수 없습니다.
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                          {shouldShowEnglish && (() => {
                            const audioUrl = createAudioBlobUrl(rec.english);
                            
                            return (
                              <div className="space-y-2">
                                {audioUrl ? (
                                  <audio
                                    key={`${scriptNum}-english`}
                                    controls
                                    className="w-full h-10"
                                    onPlay={() => {
                                      // 다른 오디오 정지
                                      const allAudios = document.querySelectorAll('audio');
                                      allAudios.forEach(audio => {
                                        if (audio !== event?.target) {
                                          (audio as HTMLAudioElement).pause();
                                        }
                                      });
                                    }}
                                    onError={(e) => {
                                      console.error("오디오 재생 오류:", e);
                                    }}
                                  >
                                    <source src={audioUrl} type="audio/webm" />
                                    브라우저가 오디오를 지원하지 않습니다.
                                  </audio>
                                ) : (
                                  <div className="text-center py-2 text-red-500 text-sm">
                                    오디오 파일을 로드할 수 없습니다.
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* 평가 항목 카드들 - 하나의 카드, 가로 5등분 레이아웃 */}
          <div className="lg:col-span-3 w-full">
            <Card className="bg-white shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between bg-gray-50/80 rounded-t-2xl">
                <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-800">
                  <ClipboardList className="w-6 h-6 text-purple-600" />
                  {selectedCandidate.language === "korean-english"
                    ? (currentLanguage === "korean" ? "한국어 평가 항목" : "영어 평가 항목")
                    : selectedCandidate.language === "japanese"
                      ? "일본어 평가 항목"
                      : selectedCandidate.language === "chinese"
                        ? "중국어 평가 항목"
                        : "한국어 평가 항목"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className={`grid gap-4 ${
                  selectedCandidate.language === "korean-english" 
                    ? "grid-cols-5" 
                    : "grid-cols-3"
                }`}>
                  {Object.entries(criteriaByLanguage || {}).map(([langKey, criteria]) => {
                    if (selectedCandidate.language === "korean-english" && langKey !== currentLanguage) {
                      return null;
                    }
                    if (!criteria || typeof criteria !== "object") return null;
                    return (
                      <React.Fragment key={langKey}>
                        {Object.entries(criteria as Record<string, any>).map(([category, subcriteria]) => {
                          const score = Number(calculateCurrentCategoryScore(category, subcriteria, langKey));
                          const maxScore = typeof subcriteria === 'object'
                            ? Object.values(subcriteria).reduce((a, b) => (a as number) + (b as number), 0)
                            : subcriteria;
                          
                          // 🔥 일본어 Pause/Volume 항목에 대한 특수 기준 적용
                          let isLow = false;
                          if (selectedCandidate.language === "japanese" && category === "Pause") {
                            isLow = score < 21; // 21점 미만이면 FAIL
                          } else if (selectedCandidate.language === "japanese" && category === "Volume") {
                            isLow = score < 3; // 3점 미만이면 FAIL
                          } else {
                            isLow = score / maxScore < 0.8; // 나머지는 80% 기준
                          }
                          
                          return (
                            <div
                              key={category}
                              className={`flex flex-col gap-3 border rounded-lg transition-colors duration-200 shadow-sm p-3 relative cursor-pointer ${
                                selectedCandidate.language === "korean-english" 
                                  ? "mb-4" 
                                  : "mb-0"
                              } ${
                                isLow 
                                  ? 'border-red-200 bg-red-50 hover:bg-red-100' 
                                  : 'border-purple-100 bg-white hover:bg-purple-50'
                              }`}
                            >
                              {/* 상단 컬러 바 */}
                              <div className={`absolute top-0 left-0 w-full h-1 rounded-t ${
                                isLow ? 'bg-red-400' : 'bg-purple-300'
                              }`} />
                              {/* 대항목 제목 + 아이콘 */}
                              <div className="flex flex-col items-center mb-1 mt-2">
                                <span className={`flex items-center gap-1 text-lg font-extrabold tracking-wide text-center ${
                                  isLow ? 'text-red-800' : 'text-purple-800'
                                }`}>
                                  <span role="img" aria-label="카테고리">🏷️</span>
                                  {category}
                                </span>
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 mt-1 scale-90 border ${isLow ? 'bg-[#FFCDD2] border-[#E57373]' : 'bg-[#E1BEE7] border-[#BA68C8]'}`}
                                >
                                  <span className={`font-bold text-base ${isLow ? 'text-red-700' : 'text-purple-900'}`}>{score.toFixed(1)}</span>
                                  <span className="mx-1 text-xs font-semibold text-purple-400">/ {maxScore}</span>
                                </span>
                              </div>
                              {/* 세부 항목 */}
                              {typeof subcriteria === "object" && subcriteria !== null ? (
                                <div className="flex flex-col gap-3">
                                  {Object.entries(subcriteria as Record<string, any>).map(([subcat, maxScore]) => (
                                    <div key={subcat} className="space-y-1 group">
                                      <div className={`flex justify-between items-center text-xs transition-all duration-150 rounded px-2 py-1 cursor-pointer ${
                                        isLow 
                                          ? 'bg-red-100 group-hover:bg-red-200 group-hover:shadow-md group-hover:scale-[1.03]' 
                                          : 'bg-white group-hover:bg-purple-50 group-hover:shadow-md group-hover:scale-[1.03]'
                                      }`}>
                                        {(() => {
                                          let labelText = subcat;
                                          if (subcat === '상승, 하강, 평어조의 적절한 사용') labelText = '상/하/평어조의 적절한 사용';
                                          if (subcat === '방송문 성격에 맞는 적절하 연출') labelText = '성격에 맞는 적절한 연출';
                                          if (subcat === '방송문 성격에 맞는 적절한 연출') labelText = '성격에 맞는 적절한 연출';
                                          return <Label className="font-medium text-xs">{labelText}</Label>;
                                        })()}
                                        <span className="font-bold text-blue-600 text-xs transition-all duration-200 ease-out">
                                          {getCurrentScores()[`${selectedCandidate.language === "korean-english" ? (langKey === "korean" ? "korean-" : "english-") : ""}${category}-${subcat}`] !== undefined ? getCurrentScores()[`${selectedCandidate.language === "korean-english" ? (langKey === "korean" ? "korean-" : "english-") : ""}${category}-${subcat}`] : Math.round((Number(maxScore) * 0.8) * 2) / 2}/{maxScore as number}
                                        </span>
                                      </div>
                                      <Slider
                                        className="w-full slider-thumb-small pastel-slider transition-all duration-200 ease-out"
                                        value={[
                                          getCurrentScores()[`${selectedCandidate.language === "korean-english" ? (langKey === "korean" ? "korean-" : "english-") : ""}${category}-${subcat}`] !== undefined ? getCurrentScores()[`${selectedCandidate.language === "korean-english" ? (langKey === "korean" ? "korean-" : "english-") : ""}${category}-${subcat}`] : Math.round((Number(maxScore) * 0.8) * 2) / 2
                                        ]}
                                        onValueChange={(value) => debouncedUpdateScore(`${selectedCandidate.language === "korean-english" ? (langKey === "korean" ? "korean-" : "english-") : ""}${category}-${subcat}`, value[0])}
                                        max={maxScore as number}
                                        step={0.5}
                                      />
                                      <div className="flex justify-between text-[10px] text-gray-400">
                                        <span>0</span>
                                        <span>{maxScore as number}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center text-xs">
                                    <Label className="font-medium">점수</Label>
                                    <span className="font-bold text-blue-600 transition-all duration-200 ease-out">
                                      {getCurrentScores()[category] !== undefined ? getCurrentScores()[category] : Math.round((Number(subcriteria) * 0.8) * 2) / 2}/{subcriteria as number}
                                    </span>
                                  </div>
                                  <Slider
                                    className="w-full slider-thumb-small pastel-slider transition-all duration-200 ease-out"
                                    value={[
                                      getCurrentScores()[category] !== undefined ? getCurrentScores()[category] : Math.round((Number(subcriteria) * 0.8) * 2) / 2
                                    ]}
                                    onValueChange={(value) => debouncedUpdateScore(category, value[0])}
                                    max={subcriteria as number}
                                    step={0.5}
                                  />
                                  <div className="flex justify-between text-[10px] text-gray-400">
                                    <span>0</span>
                                    <span>{subcriteria as number}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 평가 의견 카드 - 평가 항목 카드 아래에 배치 */}
            <Card className="mt-6 bg-white shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="bg-gray-50/80">
                <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-800">
                  <Pencil className="w-6 h-6 text-purple-600" />
                  평가 의견
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {selectedCandidate.language === "korean-english" ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="korean-comment">한국어 평가 의견</Label>
                      <Textarea
                        id="korean-comment"
                        value={getCurrentComments().korean}
                        onChange={(e) => {
                          const currentComments = getCurrentComments()
                          const newComments = { ...currentComments, korean: e.target.value }
                          setCurrentComments(newComments)
                        }}
                        placeholder="한국어 평가에 대한 의견을 입력하세요..."
                        className="mt-1 min-h-[115px]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="english-comment">영어 평가 의견</Label>
                      <Textarea
                        id="english-comment"
                        value={getCurrentComments().english}
                        onChange={(e) => {
                          const currentComments = getCurrentComments()
                          const newComments = { ...currentComments, english: e.target.value }
                          setCurrentComments(newComments)
                        }}
                        placeholder="영어 평가에 대한 의견을 입력하세요..."
                        className="mt-1 min-h-[115px]"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="comment">평가 의견</Label>
                    <Textarea
                      id="comment"
                      value={getCurrentComments().korean}
                      onChange={(e) => {
                        const currentComments = getCurrentComments()
                        const newComments = { ...currentComments, korean: e.target.value }
                        setCurrentComments(newComments)
                      }}
                      placeholder="평가에 대한 의견을 입력하세요..."
                      className="mt-1 min-h-[110px]"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        )}

        {/* 제출 버튼 */}
        {selectedCandidate && (
        <div className="mt-6 text-center">
          <Button onClick={() => {
            // 재생 중인 경우 중지
            if (isPlayingAll) {
              stopAllRecordings();
            }
            setShowSummary(true);
          }} size="lg" className="px-8">
            <Send className="w-4 h-4 mr-2" />
            다음
          </Button>
        </div>
        )}
      </div>
    </div>
  )
}