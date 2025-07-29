"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, FilterX, Play, Pause, ArrowLeft, Send, Volume2, Award, PlayCircle, StopCircle, RefreshCw, List, ClipboardList, Pencil, Activity, AlertCircle } from "lucide-react"
import { evaluationCriteria, getGradeInfo } from "@/lib/evaluation-criteria"
import { EvaluationSummary } from "@/components/evaluation-summary"
import React from "react"

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
  driveFolder?: string
  status?: "pending" | "review_requested" | "submitted" // 추가: 평가 상태
  reviewedBy?: string // 추가: 검토한 교관
  reviewRequestedBy?: string // 추가: 검토 요청한 교관
  reviewRequestedAt?: string // 추가: 검토 요청 시간
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
}

export function EvaluationDashboard({ onBack, authenticatedUser, userInfo }: EvaluationDashboardProps) {
  const [candidates, setCandidates] = useState<EvaluationCandidate[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<EvaluationCandidate | null>(null)
  const [currentLanguage, setCurrentLanguage] = useState<"korean" | "english">("korean")
  const [evaluationData, setEvaluationData] = useState<{ [candidateId: string]: { scores: { [key: string]: number }, comments: { korean: string; english: string } } }>({})
  const [currentCandidateId, setCurrentCandidateId] = useState<string | null>(null)

  // 로그인 기록 상태
  const [loginLogs, setLoginLogs] = useState<any[]>([])
  const [showLoginLogs, setShowLoginLogs] = useState(false)
  const [loginLogsLoading, setLoginLogsLoading] = useState(false)

  // 현재 선택된 후보자의 점수 가져오기
  const getCurrentScores = () => {
    if (!currentCandidateId || !evaluationData[currentCandidateId]) {
      return {}
    }
    return evaluationData[currentCandidateId].scores
  }

  // 현재 선택된 후보자의 코멘트 가져오기
  const getCurrentComments = () => {
    if (!currentCandidateId || !evaluationData[currentCandidateId] || !evaluationData[currentCandidateId].comments) {
      return { korean: "", english: "" }
    }
    return evaluationData[currentCandidateId].comments
  }

  // 현재 선택된 후보자의 점수 설정하기
  const setCurrentScores = (scores: { [key: string]: number }) => {
    if (!currentCandidateId) return
    
    setEvaluationData(prev => ({
      ...prev,
      [currentCandidateId]: {
        scores,
        comments: prev[currentCandidateId]?.comments || { korean: "", english: "" }
      }
    }))
  }

  // 현재 선택된 후보자의 코멘트 설정하기
  const setCurrentComments = (comments: { korean: string; english: string }) => {
    if (!currentCandidateId) return
    
    setEvaluationData(prev => ({
      ...prev,
      [currentCandidateId]: {
        scores: prev[currentCandidateId]?.scores || {},
        comments
      }
    }))
  }
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({})
  const [isPlayingAll, setIsPlayingAll] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [recordingsLoading, setRecordingsLoading] = useState<{ [candidateId: string]: boolean }>({})

  // 필터 및 검색 상태
  const [searchTerm, setSearchTerm] = useState("")
  const [languageFilter, setLanguageFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all") // 추가: 상태 필터

  useEffect(() => {
    loadCandidates()
  }, [])

  // 로그인 기록 불러오기
  const loadLoginLogs = async () => {
    setLoginLogsLoading(true);
    try {
      const response = await fetch('/api/auth/login-log?limit=100');
      const data = await response.json();
      setLoginLogs(data.logs || []);
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
      // Dropbox에서 제출된 녹음 데이터 읽기
      let submittedRecordings = []
      try {
        const response = await fetch("/api/evaluations/load-dropbox?limit=1000&page=1")
        console.log('📡 [loadCandidates] API 응답 상태:', response.status, response.statusText)
        
        if (response.ok) {
          const result = await response.json()
          console.log('✅ [loadCandidates] API 응답:', result)
          
          // API 응답 구조에 맞게 수정: ev.candidateInfo와 ev.status를 함께 사용
          submittedRecordings = result.evaluations || []
          
          // API에서 데이터가 없으면 localStorage에서 시도
          if (submittedRecordings.length === 0) {
            console.warn('⚠️ [loadCandidates] API에서 데이터가 없음, localStorage 확인')
            const localData = JSON.parse(localStorage.getItem("submittedRecordings") || "[]")
            if (localData.length > 0) {
              submittedRecordings = localData.map((s: any) => ({ candidateInfo: s, status: s.status || 'pending' }))
              console.log('✅ [loadCandidates] localStorage에서 데이터 복원:', submittedRecordings.length, '개')
            }
          }
        } else {
          console.warn('⚠️ [loadCandidates] Dropbox API 호출 실패, localStorage 사용')
          const localData = JSON.parse(localStorage.getItem("submittedRecordings") || "[]")
          submittedRecordings = localData.map((s: any) => ({ candidateInfo: s, status: s.status || 'pending' }))
        }
      } catch (error) {
        console.error('❌ [loadCandidates] Dropbox 로드 중 에러, localStorage 사용', error)
        const localData = JSON.parse(localStorage.getItem("submittedRecordings") || "[]")
        submittedRecordings = localData.map((s: any) => ({ candidateInfo: s, status: s.status || 'pending' }))
      }

      console.log("📋 [평가 대시보드] 로드된 평가 데이터:", submittedRecordings)
      console.log("🔍 상태별 분류:")
      const statusCounts = submittedRecordings.reduce((acc: any, ev: any) => {
        const status = ev.status || 'pending'
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {})
      console.log("상태별 개수:", statusCounts)

      // 디버깅: API에서 받아온 원본 데이터 전체 출력
      submittedRecordings.forEach((evaluation: any, idx: number) => {
        console.log(`[디버깅] evaluation[${idx}]:`, evaluation);
      });

      const candidateList: EvaluationCandidate[] = submittedRecordings
        .map((evaluation: any, idx: number) => {
          // candidateInfo가 있으면 그걸 쓰고, 없으면 evaluation 자체를 쓴다!
          const submission = evaluation.candidateInfo && Object.keys(evaluation.candidateInfo).length > 0
            ? evaluation.candidateInfo
            : evaluation;
          console.log(`[디버깅] submission[${idx}]:`, submission);
          return {
            id: submission.id || `submission-${Date.now()}-${Math.random()}`,
            name: submission.name || "(이름없음)",
            employeeId: submission.employeeId || "(사번없음)",
            language: submission.language || "",
            category: submission.category || "",
            submittedAt: submission.submittedAt || "",
            recordings: submission.recordings || {},
            recordingBlobs: submission.recordingBlobs || {},
            uploadedFiles: submission.uploadedFiles || {},
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
        // 'submitted'만 제외하고 모두 보여줌
        const matchesStatus = statusFilter === "all"
          ? status !== "submitted"
          : status === statusFilter;
        return matchesSearch && matchesLanguage && matchesStatus;
      })
      .sort((a, b) => {
        const statusA = a.status || 'pending';
        const statusB = b.status || 'pending';
        if (statusA === "review_requested" && statusB !== "review_requested") return -1;
        if (statusA !== "review_requested" && statusB === "review_requested") return 1;
        const dateA = new Date(a.submittedAt).getTime();
        const dateB = new Date(b.submittedAt).getTime();
        return dateB - dateA;
      });
    // 디버깅: 실제로 렌더링될 후보자와 각 status를 콘솔에 출력
    console.log("[디버깅] filteredCandidates 개수:", arr.length, arr.map(c => c.status));
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
      review_requested: { text: "검토 요청", color: "bg-orange-100 text-orange-800" },
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

  const playAudio = async (recordingKey: string) => {
    if (!selectedCandidate) return

    try {
      // 현재 재생 중인 오디오 정지
      if (currentlyPlaying && audioElements[currentlyPlaying]) {
        audioElements[currentlyPlaying].pause()
        audioElements[currentlyPlaying].currentTime = 0
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
              setCurrentlyPlaying(null)
              URL.revokeObjectURL(audioUrl)
            }

            audio.onerror = (e) => {
              console.error("❌ 오디오 재생 실패 (Base64):", recordingKey, e)
              setCurrentlyPlaying(null)
              URL.revokeObjectURL(audioUrl)
            }

            setAudioElements((prev) => ({ ...prev, [recordingKey]: audio }))
            setCurrentlyPlaying(recordingKey)
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
            setCurrentlyPlaying(null)
            URL.revokeObjectURL(audioUrl)
          }

          audio.onerror = (e) => {
            console.error("❌ 오디오 재생 실패 (Blob):", recordingKey, e)
            setCurrentlyPlaying(null)
            URL.revokeObjectURL(audioUrl)
          }

          setAudioElements((prev) => ({ ...prev, [recordingKey]: audio }))
          setCurrentlyPlaying(recordingKey)
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
              setCurrentlyPlaying(null)
              URL.revokeObjectURL(audioUrl)
            }
            
            audio.onerror = (e) => {
              console.error("❌ 오디오 재생 실패 (Blob):", recordingKey, e)
              setCurrentlyPlaying(null)
              URL.revokeObjectURL(audioUrl)
            }
            
            setAudioElements((prev) => ({ ...prev, [recordingKey]: audio }))
            setCurrentlyPlaying(recordingKey)
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
              setCurrentlyPlaying(null)
            }
            
            audio.onerror = (e) => {
              console.error("❌ 오디오 재생 실패 (URL, CSP 문제):", url, e)
              setCurrentlyPlaying(null)
            }
            
            setAudioElements((prev) => ({ ...prev, [recordingKey]: audio }))
            setCurrentlyPlaying(recordingKey)
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
      setCurrentlyPlaying(null)
    }
  }

  const stopAudio = () => {
    if (currentlyPlaying && audioElements[currentlyPlaying]) {
      audioElements[currentlyPlaying].pause()
      audioElements[currentlyPlaying].currentTime = 0
      setCurrentlyPlaying(null)
    }
  }

  const playAllRecordings = async (targetLanguage?: "korean" | "english") => {
    console.log("🎵 playAllRecordings 함수 호출됨", { targetLanguage })
    if (!selectedCandidate || isPlayingAll) {
      console.log("❌ 조건 불만족:", { selectedCandidate: !!selectedCandidate, isPlayingAll })
      return
    }

    setIsPlayingAll(true)
    
    // 언어별로 올바른 키 필터링 및 정렬
    const allRecordings = Object.keys(selectedCandidate.recordings || {})
    
    let recordings: string[]
    
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
    
    console.log("전체 재생 시작:", recordings)
    console.log("정렬된 순서:", recordings.map(key => {
      const match = key.match(/^(\d+)-/)
      return match ? `${match[1]}번` : key
    }))
    console.log("언어:", selectedCandidate.language, "타겟 언어:", targetLanguage, "필터링된 키:", recordings)

    console.log("🔍 for 루프 시작, recordings 길이:", recordings.length)
    
    // 로컬 변수로 재생 상태 관리
    let shouldContinuePlaying = true
    
    for (const recordingKey of recordings) {
      console.log("🔄 루프 반복:", recordingKey)
      if (!shouldContinuePlaying) {
        console.log("⏹️ 재생 중단됨")
        break // 중단된 경우
      }

      console.log("재생 중인 파일:", recordingKey)
      
      // 현재 재생 중인 오디오 정지
      if (currentlyPlaying && audioElements[currentlyPlaying]) {
        audioElements[currentlyPlaying].pause()
        audioElements[currentlyPlaying].currentTime = 0
      }

      try {
        // recordings에서 Base64 데이터로 재생
        if (selectedCandidate.recordings && selectedCandidate.recordings[recordingKey]) {
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
                setCurrentlyPlaying(null)
                URL.revokeObjectURL(audioUrl)
                  resolve()
              }

              audio.onerror = (e) => {
                console.error("오디오 재생 실패:", recordingKey, e)
                setCurrentlyPlaying(null)
                URL.revokeObjectURL(audioUrl)
                  reject(e)
              }
              
              audio.onloadstart = () => {
                console.log("오디오 로딩 시작:", recordingKey)
              }
              
              audio.oncanplay = () => {
                console.log("오디오 재생 가능:", recordingKey)
              }
              })
              
              setAudioElements((prev) => ({ ...prev, [recordingKey]: audio }))
              setCurrentlyPlaying(recordingKey)
              
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
  }

  const stopAllRecordings = () => {
    setIsPlayingAll(false)
    // 현재 재생 중인 모든 오디오 정지
    if (currentlyPlaying && audioElements[currentlyPlaying]) {
      audioElements[currentlyPlaying].pause()
      audioElements[currentlyPlaying].currentTime = 0
    }
    setCurrentlyPlaying(null)
    console.log("전체 재생 중지됨")
  }

  const updateScore = (key: string, value: number) => {
    const currentScores = getCurrentScores()
    const newScores = { ...currentScores, [key]: value }
    setCurrentScores(newScores)
  }

  // 실시간 카테고리별 점수 계산
  const calculateCurrentCategoryScore = (category: string, criteria: any, langKey?: string) => {
    const currentScores = getCurrentScores()
    if (typeof criteria === "object") {
      return Object.keys(criteria).reduce((sum, subcat) => {
        const scoreKey = selectedCandidate?.language === "korean-english" && langKey 
          ? `${langKey === "korean" ? "korean-" : "english-"}${category}-${subcat}`
          : `${category}-${subcat}`
        return sum + (currentScores[scoreKey] || 0)
      }, 0)
    } else {
      const scoreKey = selectedCandidate?.language === "korean-english" && langKey 
        ? `${langKey === "korean" ? "korean-" : "english-"}${category}`
        : category
      return currentScores[scoreKey] || 0
    }
  }

  // 실시간 총점 계산
  const getCurrentTotalScore = () => {
    const categoryScores = calculateCategoryScores();
    if (selectedCandidate?.language === "korean-english") {
      const koreanScore = Object.entries(categoryScores)
        .filter(([key]) => key.startsWith("korean-"))
        .reduce((sum, [, score]) => sum + score, 0);
      const englishScore = Object.entries(categoryScores)
        .filter(([key]) => key.startsWith("english-"))
        .reduce((sum, [, score]) => sum + score, 0);
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
          categoryScores[category] = getCurrentScores()[category] || 0
        })
      }
    }

    return categoryScores
  }

  const handleSubmitEvaluation = async (result: any) => {
    if (!currentCandidateId || !selectedCandidate) return

    console.log("최종 평가 결과:", result)

    try {
      const response = await fetch("/api/evaluations/save-dropbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result), // result에 dropboxPath가 포함되어 있음
      })

      if (!response.ok) {
        throw new Error("평가 결과 저장 실패")
      }

      const apiResult = await response.json()
      console.log("평가 결과 저장 성공:", apiResult)

      // 성공적으로 제출되면 목록에서 해당 후보자 제거
      await loadCandidates(); // 목록 새로고침(상태 반영)
      handleEvaluationComplete(); // 요약 화면 닫기 및 상태 초기화

    } catch (error) {
      console.error("평가 결과 저장 중 오류 발생:", error)
      // 사용자에게 오류 알림 (예: 토스트 메시지)
    }
  }

  // 평가 완료 후 대시보드로 돌아가기
  const handleEvaluationComplete = () => {
    setShowSummary(false)
    setSelectedCandidate(null)
    // 후보자 목록 새로고침
    loadCandidates()
  }

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
      
      // Dropbox에서 평가 결과 로드 (캐시 최적화)
      const loadFromDropbox = async () => {
        try {
          // 캐시된 평가 데이터가 있으면 우선 사용
          const cachedEvaluations = JSON.parse(localStorage.getItem("cachedEvaluations") || "[]")
          const cachedEvaluation = cachedEvaluations.find((evaluation: any) => 
            evaluation.candidateId === candidate.id
          )
          
          if (cachedEvaluation && cachedEvaluation.scores) {
            console.log("✅ 캐시된 평가 데이터 사용:", candidate.name)
            return cachedEvaluation
          }
          
          // 캐시에 없으면 Dropbox에서 로드
          const response = await fetch("/api/evaluations/load-dropbox?limit=1000")
          if (response.ok) {
            const result = await response.json()
            const evaluations = result.evaluations || []
            
            // 캐시에 저장 (다음 로딩 시 빠르게)
            localStorage.setItem("cachedEvaluations", JSON.stringify(evaluations))
            
            // 해당 후보자의 평가 찾기 (검토 요청 상태 우선)
            const candidateEvaluation = evaluations.find((evaluation: any) => 
              evaluation.candidateId === candidate.id
            )
            
            if (candidateEvaluation && candidateEvaluation.scores) {
              console.log("✅ Dropbox에서 평가 데이터 복원:", candidate.name, candidateEvaluation.scores)
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
                scores: candidateEvaluation.scores,
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
          console.warn("Dropbox에서 평가 데이터 로드 실패:", error)
        }
        return false
      }
      
      // localStorage에서도 확인
      const existingEvaluations = JSON.parse(localStorage.getItem("evaluationResults") || "[]")
      const existingEvaluation = existingEvaluations.find((evaluation: any) => 
        evaluation.candidateId === candidate.id
      )
      
      if (existingEvaluation && existingEvaluation.scores) {
        console.log("✅ localStorage에서 평가 데이터 복원:", candidate.name, existingEvaluation.scores)
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
          scores: existingEvaluation.scores,
          comments: { korean: koreanComment, english: englishComment }
        }
        setEvaluationData(prev => ({
          ...prev,
          [candidate.id]: candidateData
        }))
        return true
      }
      
      // Dropbox에서도 확인 (비동기로 처리하여 UI 블로킹 방지)
      loadFromDropbox().then((evaluation) => {
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
              koreanComment = evaluation.comments.korean || ""
              englishComment = evaluation.comments.english || ""
            }
          } else {
            if (typeof evaluation.comments === "string") {
            koreanComment = evaluation.comments || ""
            } else if (typeof evaluation.comments === "object" && evaluation.comments !== null) {
              koreanComment = evaluation.comments.korean || ""
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

    // 녹음 파일 로드 함수 추가
  const loadRecordingsFromDropbox = async (candidate: EvaluationCandidate) => {
    try {
      setRecordingsLoading(prev => ({ ...prev, [candidate.id]: true }))
      console.log(`[loadRecordingsFromDropbox] 진입:`, candidate.name, candidate.employeeId)
      
      // candidate 객체에서 dropboxFiles를 직접 사용
      const dropboxFiles = candidate.dropboxFiles
      
      // 파일 정보가 있는지 확인
      if (!dropboxFiles || dropboxFiles.length === 0) {
        console.warn(`[loadRecordingsFromDropbox] dropboxFiles가 비어있거나 없습니다.`)
        return {}
      }
      
      console.log("📁 로드할 Dropbox 파일 정보:", dropboxFiles)
        
      // 각 파일 다운로드
      const downloadPromises = dropboxFiles.map(async (fileInfo: any) => {
          try {
            const downloadResponse = await fetch("/api/dropbox-download", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
              filePath: fileInfo.fileId || fileInfo.path // 파일 ID 우선, 없으면 경로
              })
            })
            
            if (downloadResponse.ok) {
              const downloadResult = await downloadResponse.json()
            return { key: fileInfo.scriptKey, base64Data: downloadResult.base64Data, success: true }
            } else {
            console.warn('[loadRecordingsFromDropbox] 녹음 파일 다운로드 실패:', fileInfo.fileName || fileInfo.scriptKey, downloadResponse.status)
            return { key: fileInfo.scriptKey, success: false }
            }
          } catch (error) {
          console.warn('[loadRecordingsFromDropbox] 녹음 파일 다운로드 실패:', fileInfo.fileName || fileInfo.scriptKey, error)
          return { key: fileInfo.scriptKey, success: false }
          }
        })
        
      const downloadedRecordings = await Promise.all(downloadPromises)
        
      // Blob URL을 가진 객체 생성
      const recordingBlobs = downloadedRecordings.reduce((acc, current) => {
        if (current && current.key && current.base64Data) {
          acc[current.key] = current.base64Data;
        }
        return acc
      }, {} as { [key: string]: string })
      
      console.log("✅ 녹음 파일 다운로드 및 Blob 생성 완료")
      return recordingBlobs
      
    } catch (error) {
      console.error("Dropbox에서 녹음 파일 로드 중 에러:", error)
      return {}
    } finally {
      setRecordingsLoading(prev => ({ ...prev, [candidate.id]: false }))
    }
  }

  // 검토 요청된 평가의 기존 데이터 복원 (기존 함수 유지)
  const loadReviewData = async (candidate: EvaluationCandidate) => {
    // 새로운 통합 함수 사용
    return await loadCandidateData(candidate)
  }

  // 검토 요청 함수 추가
  const handleRequestReview = async (result: any) => {
    console.log("🔍 [handleRequestReview] 받은 데이터:", result)
    if (!currentCandidateId || !selectedCandidate || !result.dropboxPath) {
      console.error("❌ [handleRequestReview] dropboxPath가 없습니다!")
      console.error("currentCandidateId:", currentCandidateId)
      console.error("selectedCandidate:", selectedCandidate)
      console.error("result.dropboxPath:", result.dropboxPath)
      return
    }

    try {
      // 기존 save-dropbox API를 사용하여 검토 요청 상태로 저장
      console.log("🔍 [handleRequestReview] 전송할 데이터:", {
        dropboxPath: result.dropboxPath,
        status: "review_requested",
        reviewRequestedBy: authenticatedUser?.name || authenticatedUser?.email || "교관",
        reviewRequestedAt: new Date().toISOString(),
      });
      
      const response = await fetch("/api/evaluations/save-dropbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...result,
          status: "review_requested",
          reviewRequestedBy: authenticatedUser?.name || authenticatedUser?.email || "교관",
          reviewRequestedAt: new Date().toISOString(),
        }),
      })

      console.log("📡 [handleRequestReview] API 응답 상태:", response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ [handleRequestReview] API 오류 응답:", errorText)
        throw new Error(`서버 저장 실패: ${response.status} - ${errorText}`)
      }

      const apiResult = await response.json()
      console.log("검토 요청 성공:", apiResult)

      alert(`✅ 검토 요청이 성공적으로 처리되었습니다!\n\n다른 교관이 검토할 수 있도록 평가 대시보드에 표시됩니다.`)
    } catch (error) {
      console.error("검토 요청 저장 실패:", error)
      alert(`❌ 검토 요청 처리 중 오류가 발생했습니다: ${error instanceof Error ? error.message : "알 수 없는 오류"}`)
    }

    // 목록 새로고침하여 상태 변경 반영
    console.log("🔄 검토 요청 후 목록 새로고침 시작...")
    await loadCandidates()
    console.log("✅ 목록 새로고침 완료")
    
    // 검토 요청 완료 후 평가 화면 닫기 (대기목록으로 돌아가기)
    setShowSummary(false)
    setSelectedCandidate(null)
  }

  // 후보자 선택 시 평가 정보와 녹음파일을 병렬로 로드하고, 모두 준비된 후 병합하여 setSelectedCandidate
  const handleSelectCandidate = async (candidate: EvaluationCandidate, isReview: boolean = false) => {
    console.log('[handleSelectCandidate] 후보자 선택:', candidate)
    setRecordingsLoading(prev => ({ ...prev, [candidate.id]: true }))
    // 1. 평가 정보와 녹음파일 병렬 로드
    const [evaluationLoaded, recordingsLoaded] = await Promise.all([
      isReview ? loadReviewData(candidate) : loadCandidateData(candidate),
      loadRecordingsFromDropbox(candidate)
    ])
    console.log('[handleSelectCandidate] 평가 정보 로드 완료:', evaluationLoaded)
    console.log('[handleSelectCandidate] 녹음파일 로드 완료:', recordingsLoaded)
    // 2. 최신 평가 정보와 녹음파일을 모두 병합해서 setSelectedCandidate
    // (최신 데이터를 evaluationData, recordings에서 가져옴)
    const evalData = evaluationData[candidate.id] ?? {}

    // recordingsLoaded는 loadRecordingsFromDropbox가 반환한 객체 (key→base64)
    const recordingsFromDropbox = (recordingsLoaded && typeof recordingsLoaded === "object") ? recordingsLoaded as { [key:string]: string } : {}

    // 후보 JSON에 이미 포함된 recordings (share url 또는 base64)
    const baseRecordings = candidate.recordings || {}

    // 두 소스 병합 (Dropbox 다운로드 결과 우선)
    const recordings = { ...baseRecordings, ...recordingsFromDropbox }

    console.log('[handleSelectCandidate] 최종 recordings:', recordings)
    setSelectedCandidate({
      ...candidate,
      recordings
    })
    setRecordingsLoading(prev => ({ ...prev, [candidate.id]: false }))
  }

  // 후보자 선택 시 슬라이더 기본값 80%로 초기화
  useEffect(() => {
    if (selectedCandidate && selectedCandidate.id && !evaluationData[selectedCandidate.id]) {
      // 평가 기준을 가져와서 각 항목의 최대값의 80%로 초기화
      const criteria = getEvaluationCriteria(selectedCandidate.language)
      const scores: { [key: string]: number } = {}
      Object.entries(criteria).forEach(([langKey, catObj]) => {
        if (!catObj || typeof catObj !== 'object') return;
        Object.entries(catObj as Record<string, any>).forEach(([category, subcriteria]) => {
          if (typeof subcriteria === 'object' && subcriteria !== null) {
            Object.entries(subcriteria as Record<string, any>).forEach(([subcat, maxScore]) => {
              const key = `${selectedCandidate.language === 'korean-english' ? (langKey === 'korean' ? 'korean-' : 'english-') : ''}${category}-${subcat}`
              scores[key] = Math.round((maxScore as number) * 0.8 * 2) / 2
            })
          } else {
            scores[category] = Math.round((subcriteria as number) * 0.8 * 2) / 2
          }
        })
      })
      setEvaluationData(prev => ({
        ...prev,
        [selectedCandidate.id]: {
          scores,
          comments: { korean: '', english: '' }
        }
      }))
      setCurrentCandidateId(selectedCandidate.id)
    }
  }, [selectedCandidate])

  if (!selectedCandidate) {
    // 평가 대시보드(후보자 목록) 화면
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-[70vw] mx-auto">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold text-gray-900">평가 대시보드</h1>
            </div>
            {/* 상단 오른쪽 Update 버튼 */}
            <Button onClick={loadCandidates} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Update
            </Button>
          </div>

          <div className="flex flex-wrap gap-3 mb-4">
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

          <Card className="bg-white shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="bg-gray-50/80">
              <div className="flex items-center gap-3">
                 <List className="w-6 h-6 text-purple-600" />
                <CardTitle className="text-xl font-bold text-gray-800">평가 대기 목록</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
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
                          <td className="py-4 px-5 text-sm text-blue-600 text-center align-middle">{Object.keys(candidate.recordings || {}).length}개</td>
                          <td className="py-4 px-5 text-center align-middle">
                            <div className="flex flex-col gap-1 items-center">
                              <Badge className={`text-xs ${getStatusDisplay(candidate.status).color}`}>{getStatusDisplay(candidate.status).text}</Badge>
                              {candidate.status === "review_requested" && candidate.reviewRequestedBy && (
                                <span className="text-xs text-orange-600">검토 요청: {candidate.reviewRequestedBy}</span>
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

          <p className="mt-4 text-center text-sm text-gray-600">총 {filteredCandidates.length}명 | 실시간 업데이트</p>

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
                      최근 {loginLogs.length}개의 로그인 기록
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
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
        scripts[scriptNum][language as "korean" | "english" | "japanese" | "chinese"] = key
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
    let total = 0;
    if (!criteriaByLanguage[lang]) return 0;
    Object.entries(criteriaByLanguage[lang]).forEach(([category, subcriteria]) => {
      if (typeof subcriteria === "object" && subcriteria !== null) {
        Object.entries(subcriteria).forEach(([subcat, maxScore]) => {
          total += getCurrentScores()[`${lang}-${category}-${subcat}`] || 0;
        });
      } else {
        total += getCurrentScores()[`${lang}-${category}`] || 0;
      }
    });
    return total;
  }

  // CardHeader에서 사용할 총점 변수 선언 (return 바로 위에서!)
  let displayScore = currentTotalScore;
  if (selectedCandidate && selectedCandidate.language === "korean-english") {
    displayScore = currentLanguage === "korean"
      ? getLanguageTotalScore("korean")
      : getLanguageTotalScore("english");
  }



  // showSummary가 true면 EvaluationSummary를 최상단에서 렌더링
  if (showSummary && selectedCandidate) {
    console.log("🔍 EvaluationSummary 렌더링 조건 만족:", { showSummary, selectedCandidate })
    
    const categoryScores = calculateCategoryScores();
    const koreanTotalScore = Object.entries(categoryScores)
      .filter(([key]) => key.startsWith("korean-"))
      .reduce((sum, [, score]) => sum + score, 0);
    const englishTotalScore = Object.entries(categoryScores)
      .filter(([key]) => key.startsWith("english-"))
      .reduce((sum, [, score]) => sum + score, 0);
    
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

    console.log("📊 evaluationResult 생성 완료:", evaluationResult)

    return (
      <div className="p-6">
        <div className="max-w-[70vw] mx-auto">
        <EvaluationSummary
          isOpen={showSummary}
          onClose={handleEvaluationComplete}
          evaluationResult={evaluationResult}
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
      <div className="max-w-[70vw] mx-auto">
        {/* 헤더: 좌우 분할, 오른쪽 하단에 총점 카드 */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <Button onClick={() => setSelectedCandidate(null)} variant="outline" size="sm">
               돌아가기
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">평가 진행</h1>
              <p className="text-gray-600">
              {selectedCandidate?.name ?? ''} ({selectedCandidate?.employeeId ?? ''}) - {selectedCandidate?.category ?? ''} - {getLanguageDisplay(selectedCandidate?.language ?? '')}
            </p>
            </div>
          </div>
          {/* 언어 선택 스위치와 총점 카드 한 줄에 배치 */}
          <div className="flex items-end justify-between mb-4 mt-[-60px]">
            {selectedCandidate?.language === "korean-english" ? (
                <div className="grid grid-cols-2 gap-2 p-1 bg-white rounded-lg max-w-md border-2 border-gray-200">
                  <Button
                    variant={currentLanguage === "korean" ? "default" : "ghost"}
                    onClick={() => setCurrentLanguage("korean")}
                    className={
                      currentLanguage === "korean"
                        ? "bg-blue-600 text-white shadow-md hover:bg-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }
                  >
                    🇰🇷 한국어 평가
                  </Button>
                  <Button
                    variant={currentLanguage === "english" ? "default" : "ghost"}
                    onClick={() => setCurrentLanguage("english")}
                    className={
                      currentLanguage === "english"
                        ? "bg-green-600 text-white shadow-md hover:bg-green-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }
                  >
                    🇺🇸 영어 평가
                  </Button>
                </div>
            ) : <div />}
            {selectedCandidate?.language === 'korean-english' ? (
              <Card className={`w-40 h-32 bg-white shadow-lg rounded-2xl ${
                currentLanguage === 'korean' 
                  ? 'border-blue-200' 
                  : 'border-green-200'
              }`}>
                <CardHeader className={`p-3 rounded-t-2xl ${
                  currentLanguage === 'korean' 
                    ? 'bg-blue-50/80' 
                    : 'bg-green-50/80'
                }`}>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Award className={`w-5 h-5 ${
                      currentLanguage === 'korean' 
                        ? 'text-blue-600' 
                        : 'text-green-600'
                    }`} />
                    <span className="font-semibold text-gray-800">{currentLanguage === 'korean' ? '한국어 점수' : '영어 점수'}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-2">
                  <div className={`text-4xl font-bold ${
                    currentLanguage === 'korean' 
                      ? 'text-blue-600' 
                      : 'text-green-600'
                  }`}>{typeof displayScore === 'number' ? displayScore.toFixed(1).replace(/\.0$/, '') : displayScore}</div>
                  <div className="text-sm text-gray-500">/ 100점</div>
              </CardContent>
            </Card>
            ) : (
              <Card className="w-40 h-32 bg-white shadow-lg rounded-2xl">
                <CardHeader className="p-3 bg-gray-50/80 rounded-t-2xl">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Award className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold text-gray-800">현재 총점</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-2">
                  <div className="text-4xl font-bold text-purple-600">{currentTotalScore}</div>
                  <div className="text-sm text-gray-500">/ 100점</div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* 상세 평가 UI (녹음, 평가 항목 등) 기존 코드 유지 */}
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
                <div className="space-y-2">
                  <Button
                    onClick={() => {
                      console.log("🔘 한국어 전체 재생 버튼 클릭됨", { isPlayingAll })
                      isPlayingAll ? stopAllRecordings() : playAllRecordings("korean")
                    }}
                    variant="outline"
                    className="w-full bg-blue-50 hover:bg-blue-100 border-blue-200"
                  >
                    {isPlayingAll ? (
                      <>
                        <StopCircle className="w-4 h-4 mr-2" />
                        한국어 재생 중지
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4 mr-2" />
                        한국어 전체 재생
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      console.log("🔘 영어 전체 재생 버튼 클릭됨", { isPlayingAll })
                      isPlayingAll ? stopAllRecordings() : playAllRecordings("english")
                    }}
                    variant="outline"
                    className="w-full bg-green-50 hover:bg-green-100 border-green-200"
                  >
                    {isPlayingAll ? (
                      <>
                        <StopCircle className="w-4 h-4 mr-2" />
                        영어 재생 중지
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4 mr-2" />
                        영어 전체 재생
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button
                    onClick={() => {
                      console.log("🔘 전체 재생 버튼 클릭됨", { isPlayingAll })
                      isPlayingAll ? stopAllRecordings() : playAllRecordings()
                    }}
                    variant="outline"
                    className="w-full bg-purple-50 hover:bg-purple-100 border-purple-200"
                  >
                    {isPlayingAll ? (
                      <>
                        <StopCircle className="w-4 h-4 mr-2" />
                        전체 재생 중지
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4 mr-2" />
                        전체 재생
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
                    return (
                      <div key={scriptNum} className="border rounded-lg p-3 bg-gray-50">
                        <div className="font-medium text-sm mb-2">{scriptNum}번 문안</div>
                        <div className="space-y-2">
                          {(rec.korean || rec.japanese || rec.chinese) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => playAudio(rec.korean || rec.japanese || rec.chinese!)}
                              className={`w-full text-xs ${
                                currentlyPlaying === (rec.korean || rec.japanese || rec.chinese)
                                  ? "bg-blue-100 border-blue-300 text-blue-700"
                                  : "bg-white"
                              }`}
                            >
                              {currentlyPlaying === (rec.korean || rec.japanese || rec.chinese) ? (
                                <>
                                  <Pause className="w-3 h-3 mr-1" />
                                  {selectedCandidate.language === "japanese" ? "🇯🇵 재생중" : 
                                   selectedCandidate.language === "chinese" ? "🇨�� 재생중" : "🇰🇷 재생중"}
                                </>
                              ) : (
                                <>
                                  <Play className="w-3 h-3 mr-1" />
                                  {selectedCandidate.language === "japanese" ? "🇯🇵 일본어" : 
                                   selectedCandidate.language === "chinese" ? "🇨🇳 중국어" : "🇰🇷 한국어"}
                                </>
                              )}
                            </Button>
                          )}
                          {rec.english && selectedCandidate.language === "korean-english" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => playAudio(rec.english!)}
                              className={`w-full text-xs ${
                                currentlyPlaying === rec.english
                                  ? "bg-green-100 border-green-300 text-green-700"
                                  : "bg-white"
                              }`}
                            >
                              {currentlyPlaying === rec.english ? (
                                <>
                                  <Pause className="w-3 h-3 mr-1" />
                                  🇺🇸 재생중
                                </>
                              ) : (
                                <>
                                  <Play className="w-3 h-3 mr-1" />
                                  🇺🇸 영어
                                </>
                              )}
                            </Button>
                          )}
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
                <div className="grid grid-cols-5 gap-4">
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
                          const isLow = score / maxScore < 0.8;
                          return (
                            <div
                              key={category}
                              className="flex flex-col gap-3 border border-purple-100 rounded-lg bg-white hover:bg-purple-50 transition-colors duration-200 shadow-sm p-3 mb-4 relative cursor-pointer"
                            >
                              {/* 상단 컬러 바 */}
                              <div className="absolute top-0 left-0 w-full h-1 bg-purple-300 rounded-t" />
                              {/* 대항목 제목 + 아이콘 */}
                              <div className="flex flex-col items-center mb-1 mt-2">
                                <span className="flex items-center gap-1 text-lg font-extrabold text-purple-800 tracking-wide text-center">
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
                                      <div className="flex justify-between items-center text-xs transition-all duration-150 bg-white group-hover:bg-purple-50 group-hover:shadow-md group-hover:scale-[1.03] rounded px-2 py-1 cursor-pointer">
                                        {(() => {
                                          let labelText = subcat;
                                          if (subcat === '상승, 하강, 평어조의 적절한 사용') labelText = '상/하/평어조의 적절한 사용';
                                          if (subcat === '방송문 성격에 맞는 적절하 연출') labelText = '성격에 맞는 적절한 연출';
                                          if (subcat === '방송문 성격에 맞는 적절한 연출') labelText = '성격에 맞는 적절한 연출';
                                          return <Label className="font-medium text-xs">{labelText}</Label>;
                                        })()}
                                        <span className="font-bold text-blue-600 text-xs">
                                          {getCurrentScores()[`${selectedCandidate.language === "korean-english" ? (langKey === "korean" ? "korean-" : "english-") : ""}${category}-${subcat}`] || 0}/{maxScore as number}
                                        </span>
                                      </div>
                                      <Slider
                                        className="w-full slider-thumb-small pastel-slider"
                                        value={[
                                          getCurrentScores()[`${selectedCandidate.language === "korean-english" ? (langKey === "korean" ? "korean-" : "english-") : ""}${category}-${subcat}`] !== undefined
                                            ? getCurrentScores()[`${selectedCandidate.language === "korean-english" ? (langKey === "korean" ? "korean-" : "english-") : ""}${category}-${subcat}`]
                                            : Math.round((Number(maxScore) * 0.8) * 2) / 2
                                        ]}
                                        onValueChange={(value) => updateScore(`${selectedCandidate.language === "korean-english" ? (langKey === "korean" ? "korean-" : "english-") : ""}${category}-${subcat}`, value[0])}
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
                                    <span className="font-bold text-blue-600">
                                      {getCurrentScores()[category] || 0}/{subcriteria as number}
                                    </span>
                                  </div>
                                  <Slider
                                    className="w-full slider-thumb-small pastel-slider"
                                    value={[
                                      getCurrentScores()[category] !== undefined
                                        ? getCurrentScores()[category]
                                        : Math.round((Number(subcriteria) * 0.8) * 2) / 2
                                    ]}
                                    onValueChange={(value) => updateScore(category, value[0])}
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
                        className="mt-1"
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
                        className="mt-1"
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
                      className="mt-1"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>



        {/* 제출 버튼 */}
        <div className="mt-6 text-center">
          <Button onClick={() => setShowSummary(true)} size="lg" className="px-8">
            <Send className="w-4 h-4 mr-2" />
            다음
          </Button>
        </div>
      </div>
    </div>
  )
}
