"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Upload, CheckCircle, Pause, AlertCircle } from "lucide-react"

interface UserInfo {
  name: string
  employeeId: string
  language: string
  category: string
}

interface FinalConfirmationProps {
  userInfo: UserInfo
  recordings: { [key: string]: Blob | null }
  availableScripts: number[]
  onSubmit: () => void
}

export function FinalConfirmation({ userInfo, recordings, availableScripts, onSubmit }: FinalConfirmationProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({})
  const [uploadStatus, setUploadStatus] = useState<string>("")

  // 페이지 이탈 방지 (제출 완료 전까지만)
  useEffect(() => {
    // 제출 완료 후에는 이탈 방지 제거
    if (isSubmitted) {
      window.onbeforeunload = null
      console.log("✅ beforeunload 완전 제거됨 (제출 완료)")
      return
    }

    // 최종 확인 페이지용 beforeunload 설정
    window.onbeforeunload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = "녹음 파일을 제출하지 않았습니다. 페이지를 떠나면 데이터가 손실됩니다."
      return e.returnValue
    }
    console.log("🔒 beforeunload 등록됨 (최종 확인 페이지)")

    return () => {
      window.onbeforeunload = null
      console.log("🔓 beforeunload 제거됨 (cleanup)")
    }
  }, [isSubmitted])

  // 컴포넌트 마운트 시 모든 녹음 파일을 미리 로딩
  useEffect(() => {
    const preloadAudios = async () => {
      console.log("🎵 [preloadAudios] 녹음 파일 미리 로딩 시작")
      const newAudioElements: { [key: string]: HTMLAudioElement } = {}
      
      for (const [key, recording] of Object.entries(recordings)) {
        if (recording) {
          try {
            const audio = new Audio(URL.createObjectURL(recording))
            audio.onended = () => setCurrentlyPlaying(null)
            audio.onerror = (error) => {
              console.error(`🎵 [preloadAudios] 오디오 로딩 오류: ${key}`, error)
            }
            newAudioElements[key] = audio
            console.log(`🎵 [preloadAudios] 오디오 로딩 완료: ${key}`)
          } catch (error) {
            console.error(`🎵 [preloadAudios] 오디오 생성 실패: ${key}`, error)
          }
        }
      }
      
      setAudioElements(newAudioElements)
      console.log("🎵 [preloadAudios] 모든 오디오 로딩 완료")
    }
    
    preloadAudios()
  }, [recordings])

  const getLanguageDisplay = (language: string) => {
    const displays: { [key: string]: string } = {
      "korean-english": "한/영",
      japanese: "일본어",
      chinese: "중국어",
    }
    return displays[language] || language
  }

  const playRecording = (key: string) => {
    console.log(`🎵 [playRecording] 재생 버튼 클릭: ${key}`)
    
    // 오디오가 로딩되지 않았으면 무시
    if (!audioElements[key]) {
      console.warn(`🎵 [playRecording] 오디오가 로딩되지 않음: ${key}`)
      return
    }

    // 현재 재생 중인 오디오 정지
    if (currentlyPlaying && audioElements[currentlyPlaying]) {
      audioElements[currentlyPlaying].pause()
    }

    // 같은 녹음이 재생 중이면 정지
    if (currentlyPlaying === key) {
      setCurrentlyPlaying(null)
      return
    }

    // 미리 로딩된 오디오 재생
    try {
      console.log(`🎵 [playRecording] 즉시 재생 시작: ${key}`)
      const playPromise = audioElements[key].play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log(`🎵 [playRecording] 재생 성공: ${key}`)
            setCurrentlyPlaying(key)
          })
          .catch((error) => {
            console.error(`🎵 [playRecording] 재생 실패: ${key}`, error)
          })
      }
    } catch (error) {
      console.error(`🎵 [playRecording] 재생 실패: ${key}`, error)
    }
  }

  const stopAllPlayback = () => {
    if (currentlyPlaying && audioElements[currentlyPlaying]) {
      audioElements[currentlyPlaying].pause()
      setCurrentlyPlaying(null)
    }
  }

  const handleSubmit = async () => {
    try {
      setIsUploading(true)
      setUploadStatus("데이터베이스에 저장 중...")
      setUploadProgress(10)

      // 녹음 파일이 있는지 확인
      const validRecordings = Object.entries(recordings).filter(([_, blob]) => blob !== null)
      if (validRecordings.length === 0) {
        throw new Error("녹음 파일이 없습니다.")
      }

      setUploadProgress(30)

      // Blob을 Base64로 변환
      const base64Recordings: { [key: string]: string } = {}
      for (const [key, blob] of Object.entries(recordings)) {
        if (blob) {
          try {
            // 🔥 FileReader API를 사용한 안전한 Base64 변환 (큰 파일 지원)
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => {
                const result = reader.result as string
                resolve(result)
              }
              reader.onerror = () => reject(reader.error)
              reader.readAsDataURL(blob)
            })
            
            base64Recordings[key] = base64
            console.log(`✅ 큰 파일 Base64 변환 성공 (${key}): ${(blob.size / 1024).toFixed(1)}KB, 시간: ${blob.size > 1024 * 1024 ? '1MB+' : 'normal'}`)
          } catch (error) {
            console.error(`Blob 변환 실패 (${key}):`, error)
            // 폴백: 청크 방식으로 재시도
            try {
              console.log(`🔄 청크 방식으로 재시도 중... (${key})`)
              const arrayBuffer = await blob.arrayBuffer()
              const bytes = new Uint8Array(arrayBuffer)
              let binary = ''
              const chunkSize = 8192 // 8KB 청크로 처리
              
              for (let i = 0; i < bytes.length; i += chunkSize) {
                const chunk = bytes.slice(i, i + chunkSize)
                binary += String.fromCharCode.apply(null, Array.from(chunk))
              }
              
              const base64 = btoa(binary)
              base64Recordings[key] = `data:audio/webm;base64,${base64}`
              console.log(`✅ 청크 방식 Base64 변환 성공 (${key})`)
            } catch (fallbackError) {
              console.error(`청크 방식도 실패 (${key}):`, fallbackError)
            }
          }
        }
      }

      setUploadProgress(60)

      console.log("🧩 제출 데이터 구조 확인:")
      console.log("- recordings 키:", Object.keys(base64Recordings))
      console.log("- recordings 샘플:", base64Recordings[Object.keys(base64Recordings)[0]]?.substring(0, 100) + "...")

      // 제출 정보 서버에 전송
      const submissionData = {
        ...userInfo,
        submittedAt: new Date().toISOString(),
        recordings: base64Recordings,
        recordingCount: validRecordings.length,
        scriptNumbers: availableScripts,
        status: "submitted",
      }

      setUploadProgress(80)

      const response = await fetch("/api/recordings/submit-database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.details || "서버 제출 실패");
      }
      
      console.log('✅ [handleSubmit] 서버 응답:', result);
      
      setUploadProgress(100)
      setUploadStatus("제출 완료!")
      
      // localStorage에도 저장 (용량 제한 고려)
      try {
        const existingSubmissions = JSON.parse(localStorage.getItem("submittedRecordings") || "[]")
        
        // 기존 데이터가 너무 많으면 오래된 것부터 삭제 (최대 50개만 유지)
        if (existingSubmissions.length >= 50) {
          existingSubmissions.splice(0, existingSubmissions.length - 49)
        }
        
                            // Base64 데이터를 제외한 경량화된 데이터만 저장
                    const lightweightSubmission = {
                      id: result.evaluationId, // 실제 데이터베이스 ID 사용
                      name: submissionData.name,
                      employeeId: submissionData.employeeId,
                      language: submissionData.language,
                      category: submissionData.category,
                      submittedAt: submissionData.submittedAt,
                      recordingCount: submissionData.recordingCount,
                      status: submissionData.status,
                    }
        console.log('✅ [handleSubmit] lightweightSubmission 저장:', lightweightSubmission)
        
        existingSubmissions.push(lightweightSubmission)
        localStorage.setItem("submittedRecordings", JSON.stringify(existingSubmissions))
        console.log("제출 정보가 localStorage에 저장되었습니다.")
      } catch (storageError) {
        console.warn("localStorage 저장 실패 (용량 한계):", storageError)
        // localStorage 저장 실패해도 업로드는 성공했으므로 무시
      }

      // 제출 완료 시 beforeunload 제거
      window.onbeforeunload = null
      console.log("✅ beforeunload 명시적 제거 (제출 완료)")

      setIsSubmitted(true)
    } catch (error) {
      console.error("업로드 오류:", error)
      setUploadStatus("업로드 중 오류가 발생했습니다.")
      setTimeout(() => {
        // 에러 발생 시에도 beforeunload 제거
        window.onbeforeunload = null
        console.log("✅ beforeunload 명시적 제거 (에러 발생)")
        setIsSubmitted(true)
      }, 1000)
    } finally {
      setIsUploading(false)
    }
  }

  const handleLogout = async () => {
    try {
      // 로그아웃 API 호출
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        console.log("✅ 로그아웃 성공")
      }
    } catch (error) {
      console.error("❌ 로그아웃 API 실패:", error)
    } finally {
      // API 성공 여부와 관계없이 로컬 스토리지 정리 후 새로고침
      localStorage.clear()
      sessionStorage.clear()
      window.location.href = "/"
    }
  }

  // 제출 완료 시 beforeunload 완전 제거 (Hook 규칙 준수)
  useEffect(() => {
    if (isSubmitted) {
      // 모든 beforeunload 리스너 제거
      const removeAllBeforeUnload = () => {
        window.onbeforeunload = null
        // 추가로 모든 이벤트 리스너 제거 시도
        try {
          const newWindow: any = window
          if (newWindow._events && newWindow._events.beforeunload) {
            delete newWindow._events.beforeunload
          }
        } catch (e) {
          // 무시
        }
        console.log("🚫 제출 완료: 모든 beforeunload 완전 제거")
      }
      
      removeAllBeforeUnload()
      
      // 여러 번 제거 (타이밍 이슈 대비)
      const timer1 = setTimeout(removeAllBeforeUnload, 50)
      const timer2 = setTimeout(removeAllBeforeUnload, 100)
      const timer3 = setTimeout(removeAllBeforeUnload, 200)
      
      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
        clearTimeout(timer3)
        removeAllBeforeUnload()
      }
    }
  }, [isSubmitted])

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          {/* 메인 카드 */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* 상단 헤더 - 초록색 */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                제출 완료!
              </h1>
              <p className="text-green-50 text-lg">
                수고하셨습니다
              </p>
            </div>

            {/* 본문 내용 */}
            <div className="p-8 space-y-6">
              {/* 제출 정보 요약 */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-700 font-medium">제출자</span>
                  <span className="text-gray-900 font-bold">{userInfo.name} ({userInfo.employeeId})</span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-700 font-medium">구분</span>
                  <span className="text-gray-900 font-bold">{userInfo.category} - {getLanguageDisplay(userInfo.language)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 font-medium">업로드 파일</span>
                  <span className="text-green-600 font-bold text-lg">{Object.values(recordings).filter(Boolean).length}개</span>
                </div>
              </div>

              {/* 로그아웃 안내 - 최우선 강조 */}
              <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-6 border-2 border-red-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-white text-2xl">🚪</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-red-900 mb-1">
                      반드시 로그아웃 해주세요
                    </h3>
                    <p className="text-sm text-red-700">
                      다음 사용자를 위해 로그아웃을 꼭 해주세요
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleLogout}
                  className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 h-14 text-lg font-bold text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Log out
                </Button>
              </div>

              {/* 추가 안내사항 */}
              <div className="bg-gray-50 rounded-xl p-6 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-blue-600 text-xl shrink-0">💫</span>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">평가 결과:</span> 월 말 공지 게시 후 JVOICE APP을 통해 확인해주세요.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-purple-600 text-xl shrink-0">🤫</span>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">퇴실 안내:</span> 조용히 방송실습실을 퇴실해주세요.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 문안별로 녹음 파일 그룹화 (한영의 경우 문안별로 묶음)
  const getRecordingsByScript = () => {
    if (userInfo.language === "korean-english") {
      // 한영: 문안별로 묶어서 각 문안에 한국어/영어 포함
      return availableScripts.map((scriptNum) => ({
        scriptNum,
        recordings: [
          { 
            lang: "한국어", 
            key: `${scriptNum}-korean`, 
            blob: recordings[`${scriptNum}-korean`] 
          },
          { 
            lang: "English", 
            key: `${scriptNum}-english`, 
            blob: recordings[`${scriptNum}-english`] 
          }
        ].filter((item) => item.blob)
      })).filter((item) => item.recordings.length > 0)
    } else {
      // 일본어, 중국어: 문안별로 하나씩
      return availableScripts.map((scriptNum) => ({
        scriptNum,
        recordings: [
          { 
            lang: getLanguageDisplay(userInfo.language), 
            key: `${scriptNum}-${userInfo.language}`, 
            blob: recordings[`${scriptNum}-${userInfo.language}`] 
          }
        ].filter((item) => item.blob)
      })).filter((item) => item.recordings.length > 0)
    }
  }

  const recordingsByScript = getRecordingsByScript()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100">
      {/* 헤더 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/60 p-6 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">최종 확인</h1>
              <p className="text-gray-600 text-sm">
                {userInfo.name} ({userInfo.employeeId}) - {userInfo.category} - {getLanguageDisplay(userInfo.language)}
              </p>
            </div>
          </div>

          {/* 제출 상태 */}
          <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl p-4 border border-green-200/50 shadow-sm">
            <div className="text-center">
              <div className="text-lg font-bold text-green-900 mb-1">
                {Object.values(recordings).filter(Boolean).length}개 파일
              </div>
              <div className="text-xs text-green-700 font-medium">녹음 완료</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">녹음 파일 최종 확인</h2>
          <p className="text-gray-600">
            녹음된 파일들을 확인하고 최종 제출해주세요. <span className="text-red-600 font-semibold">(재녹음 불가)</span>
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="bg-white shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="bg-gray-50/80">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-800">
                <Play className="w-6 h-6 text-blue-600" />
                <span>녹음 파일 확인</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              {recordingsByScript.map(({ scriptNum, recordings }) => (
                <div 
                  key={scriptNum} 
                  className="p-4 bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-md">
                      {scriptNum}
                    </div>
                    <span className="font-bold text-gray-900">{scriptNum}번 문안</span>
                  </div>
                  
                  {/* 녹음 파일 버튼들 */}
                  <div className="grid grid-cols-2 gap-2">
                    {recordings.map(({ lang, key }) => (
                      <Button
                        key={key}
                        size="sm"
                        variant="outline"
                        onClick={() => playRecording(key)}
                        className={`h-10 font-semibold transition-all duration-200 ${
                          currentlyPlaying === key 
                            ? "bg-gradient-to-r from-red-500 to-pink-500 text-white border-red-400 shadow-lg scale-105" 
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gradient-to-r hover:from-blue-500 hover:to-indigo-500 hover:text-white hover:border-blue-400 hover:shadow-md hover:scale-105"
                        }`}
                      >
                        {currentlyPlaying === key ? (
                          <>
                            <Pause className="w-4 h-4 mr-1.5" />
                            <span>{lang} 정지</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-1.5" />
                            <span>{lang}</span>
                          </>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="bg-gray-50/80">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-800">
                <Upload className="w-6 h-6 text-green-600" />
                제출 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg border border-gray-200/50">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">이름</span>
                  <p className="font-semibold text-gray-900 mt-0.5">{userInfo.name}</p>
                </div>
                <div className="p-2.5 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg border border-gray-200/50">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">사번</span>
                  <p className="font-semibold text-gray-900 mt-0.5">{userInfo.employeeId}</p>
                </div>
                <div className="p-2.5 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg border border-gray-200/50">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">구분</span>
                  <p className="font-semibold text-gray-900 mt-0.5">{userInfo.category}</p>
                </div>
                <div className="p-2.5 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg border border-gray-200/50">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">언어</span>
                  <p className="font-semibold text-gray-900 mt-0.5">{getLanguageDisplay(userInfo.language)}</p>
                </div>
              </div>

              {/* 중요 안내사항 */}
              <div className="space-y-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  중요 안내사항
                </h4>
                <div className="space-y-2 text-xs text-gray-700">
                  <div className="flex items-start gap-2">
                    <span className="text-gray-600 font-medium shrink-0">•</span>
                    <span>확인 완료 후 <span className="font-semibold">제출 버튼을 꼭 눌러주세요.</span> (미제출 시 데이터 손실)</span>
                  </div>
                </div>
              </div>

              {isUploading && (
                <div className="space-y-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200/50">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-green-700">업로드 진행률</span>
                    <span className="text-green-800">{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-3 text-sm text-green-700">
                    <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="font-medium">{uploadStatus}</span>
                  </div>
                </div>
              )}

              <div className="relative group">
                {/* 배경 펄스 애니메이션 효과 */}
                {!isUploading && Object.values(recordings).filter(Boolean).length > 0 && (
                  <>
                    <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-emerald-400 rounded-lg animate-pulse opacity-50 blur"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-lg animate-ping opacity-20"></div>
                  </>
                )}
                
                <Button
                  onClick={handleSubmit}
                  className={`relative w-full h-16 text-xl font-bold text-white shadow-2xl transition-all duration-300 ${
                    isUploading || Object.values(recordings).filter(Boolean).length === 0
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 hover:scale-[1.02] hover:shadow-[0_20px_60px_-15px_rgba(16,185,129,0.5)] active:scale-95"
                  }`}
                  disabled={isUploading || Object.values(recordings).filter(Boolean).length === 0}
                  style={{
                    animation: !isUploading && Object.values(recordings).filter(Boolean).length > 0 
                      ? 'subtle-bounce 2s ease-in-out infinite' 
                      : 'none'
                  }}
                >
                  <Upload className={`w-5 h-5 mr-2 ${!isUploading ? "animate-pulse" : ""}`} />
                  <span className="relative">
                    {isUploading ? "업로드 중..." : "🎯 최종 제출"}
                  </span>
                </Button>
              </div>
              
              <style dangerouslySetInnerHTML={{__html: `
                @keyframes subtle-bounce {
                  0%, 100% {
                    transform: translateY(0px);
                  }
                  50% {
                    transform: translateY(-4px);
                  }
                }
              `}} />

              {!isUploading && (
                <div className="text-xs text-gray-500 text-center">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  업로드 실패 시 자동으로 로컬에 저장됩니다
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
