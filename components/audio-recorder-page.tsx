"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AudioRecorder } from "@/components/audio-recorder"
import { PDFViewer } from "@/components/pdf-viewer"
import { FinalConfirmation } from "@/components/final-confirmation"
import { pdfDatabaseService } from "@/lib/pdf-database-service"
import { ArrowLeft, ArrowRight, FileText, Mic, CheckCircle, AlertTriangle } from "lucide-react"

interface UserInfo {
  name: string
  employeeId: string
  language: string
  category: string
  email?: string
}

interface AudioRecorderPageProps {
  userInfo: UserInfo
  onBack: () => void
}

export function AudioRecorderPage({ userInfo, onBack }: AudioRecorderPageProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [currentScript, setCurrentScript] = useState(1)
  const [recordings, setRecordings] = useState<{ [key: string]: Blob }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentLanguage, setCurrentLanguage] = useState<string>("korean") // 현재 선택된 언어

  const [totalScripts, setTotalScripts] = useState(5) // 동적으로 변경될 예정
  const [selectedScripts, setSelectedScripts] = useState<number[]>([]) // 선택된 문안 번호들
  
  // 컴포넌트 마운트 시 해당 언어의 문안 수와 선택된 문안들 로드
  useEffect(() => {
    const loadScripts = async () => {
      try {
        console.log(`🔍 ${userInfo.language} 언어의 문안 로딩 시작`)
        
        // 해당 언어의 총 문안 수 조회
        const totalCount = await pdfDatabaseService.getTotalScriptCount(userInfo.language)
        console.log(`📊 ${userInfo.language} 언어 총 문안 수: ${totalCount}`)
        
        if (totalCount > 0) {
          // 녹음 시 사용할 문안 수는 항상 5개 고정
          const scriptCount = 5
          setTotalScripts(scriptCount)
          
          // 업로드된 문안들 중에서 5개 랜덤 선택 (1번/9번 우선순위 유지)
          const randomScripts = await pdfDatabaseService.getRandomScripts(userInfo.language, scriptCount)
          
          if (randomScripts.length > 0) {
            // 실제 선택된 문안 수로 totalScripts 조정 (최대 5개)
            setTotalScripts(randomScripts.length)
            setSelectedScripts(randomScripts)
            console.log(`🎯 선택된 문안들: ${randomScripts.join(', ')} (총 ${randomScripts.length}개)`)
          } else {
            console.warn(`⚠️ ${userInfo.language} 언어의 문안 선택 실패. 기본값 사용.`)
            setTotalScripts(5)
            setSelectedScripts([1, 2, 3, 4, 5])
          }
        } else {
          console.warn(`⚠️ ${userInfo.language} 언어의 문안이 없습니다. 기본값 사용.`)
          setTotalScripts(5)
          setSelectedScripts([1, 2, 3, 4, 5])
        }
      } catch (error) {
        console.error('문안 로딩 실패:', error)
        // 오류 시 기본값 사용
        setTotalScripts(5)
        setSelectedScripts([1, 2, 3, 4, 5])
      }
    }
    
    loadScripts()
  }, [userInfo.language])

  const steps = [
    { id: 1, title: "문안 확인", icon: FileText },
    { id: 2, title: "음성 녹음", icon: Mic },
    { id: 3, title: "최종 확인", icon: CheckCircle },
  ]

  const getLanguageDisplay = (language: string) => {
    const displays: { [key: string]: string } = {
      "korean-english": "한/영",
      japanese: "일본어",
      chinese: "중국어",
    }
    return displays[language] || language
  }

  const getScriptLanguages = () => {
    if (userInfo.language === "korean-english") {
      return ["korean", "english"]
    }
    return ["main"]
  }

  const handleRecordingComplete = (blob: Blob) => {
    const key = `${currentScript}-${currentLanguage}`

    setRecordings((prev) => ({
      ...prev,
      [key]: blob,
    }))
  }

  // 현재 언어의 녹음 상태 확인
  const getCurrentRecording = () => {
    return recordings[`${currentScript}-${currentLanguage}`]
  }

  // 언어별 완료 상태 확인
  const getLanguageCompletionStatus = (language: string) => {
    return recordings[`${currentScript}-${language}`] ? true : false
  }

  const handleNextScript = () => {
    if (currentScript < totalScripts) {
      setCurrentScript(currentScript + 1)
    } else {
      setCurrentStep(3) // 최종 확인 단계로
    }
  }

  const handlePrevScript = () => {
    if (currentScript > 1) {
      setCurrentScript(currentScript - 1)
    }
  }

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      setError(null)

      // 녹음 파일이 있는지 확인
      const validRecordings = Object.entries(recordings).filter(([_, blob]) => blob !== null)
      if (validRecordings.length === 0) {
        throw new Error("녹음 파일이 없습니다.")
      }

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

      // 제출 데이터 준비
      const submissionData = {
        ...userInfo,
        submittedAt: new Date().toISOString(),
        recordings: base64Recordings,
        recordingCount: validRecordings.length,
        scriptNumbers: Array.from({ length: totalScripts }, (_, i) => i + 1),
        status: "submitted",
      }

      const response = await fetch("/api/recordings/submit-database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || "제출 실패")
      }

      const result = await response.json()
      console.log('✅ [handleSubmit] 서버 응답:', result)

      // 성공 시 홈으로 이동
      alert("녹음이 성공적으로 제출되었습니다!")
      onBack()
    } catch (error) {
      console.error("Submit error:", error)
      setError("제출 중 오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const progress = ((currentScript - 1) / totalScripts) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              메인으로
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">기내 방송 녹음</h1>
              <p className="text-gray-600 mt-1">
                {userInfo.name} ({userInfo.employeeId}) - {getLanguageDisplay(userInfo.language)} {userInfo.category}
              </p>
            </div>
          </div>

          {/* 진행 상황 */}
          <div className="text-right">
            <div className="text-sm text-gray-600 mb-2">
              문안 {currentScript} / {totalScripts}
            </div>
            <div className="w-48">
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </div>

        {/* 단계 표시 */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-8">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    currentStep >= step.id ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  <step.icon className="w-5 h-5" />
                </div>
                <span
                  className={`ml-2 text-sm font-medium ${currentStep >= step.id ? "text-blue-600" : "text-gray-500"}`}
                >
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 ml-4 ${currentStep > step.id ? "bg-blue-600" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* 메인 컨텐츠 */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* PDF 뷰어 */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  문안 {currentScript}번 - {getLanguageDisplay(userInfo.language)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PDFViewer 
                  language={userInfo.language} 
                  scriptNumber={selectedScripts[currentScript - 1] || currentScript} 
                />
              </CardContent>
            </Card>
          </div>

          {/* 녹음 섹션 */}
          <div className="space-y-4">
            {/* 한/영 녹음일 때만 언어 선택 카드 표시 */}
            {userInfo.language === "korean-english" && currentStep < 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="w-5 h-5" />
                    언어 선택 및 진행 상태
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 언어 선택 버튼 */}
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setCurrentLanguage("korean")}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                        currentLanguage === "korean"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🇰🇷</span>
                          <span className="font-medium">한국어</span>
                        </div>
                        {getLanguageCompletionStatus("korean") && (
                          <span className="text-green-600 font-bold">✓</span>
                        )}
                      </div>
                      {getLanguageCompletionStatus("korean") && (
                        <div className="text-xs text-green-600 mt-1">(완료)</div>
                      )}
                    </button>

                    <button
                      onClick={() => setCurrentLanguage("english")}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                        currentLanguage === "english"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🇺🇸</span>
                          <span className="font-medium">English</span>
                        </div>
                        {getLanguageCompletionStatus("english") && (
                          <span className="text-green-600 font-bold">✓</span>
                        )}
                      </div>
                      {getLanguageCompletionStatus("english") && (
                        <div className="text-xs text-green-600 mt-1">(완료)</div>
                      )}
                    </button>
                  </div>

                  {/* 진행 상태 바 */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">문안 {currentScript}번 진행 상태</div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm w-16">🇰🇷 한국어</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              getLanguageCompletionStatus("korean") ? "bg-green-500 w-full" : "bg-gray-200 w-0"
                            }`}
                          />
                        </div>
                        <span className="text-xs text-gray-600 w-8">
                          {getLanguageCompletionStatus("korean") ? "✓" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm w-16">🇺🇸 English</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              getLanguageCompletionStatus("english") ? "bg-green-500 w-full" : "bg-gray-200 w-0"
                            }`}
                          />
                        </div>
                        <span className="text-xs text-gray-600 w-8">
                          {getLanguageCompletionStatus("english") ? "✓" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep < 3 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="w-5 h-5" />
                    음성 녹음 - {userInfo.language === "korean-english" ? (currentLanguage === "korean" ? "한국어" : "English") : getLanguageDisplay(userInfo.language)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <AudioRecorder
                    onRecordingComplete={handleRecordingComplete}
                    existingRecording={getCurrentRecording()}
                    hasExistingRecording={!!getCurrentRecording()}
                  />

                  {/* 녹음 완료 표시 */}
                  {getCurrentRecording() && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        문안 {currentScript}번 {userInfo.language === "korean-english" ? (currentLanguage === "korean" ? "한국어" : "영어") : ""} 녹음이 완료되었습니다.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* 한/영 녹음 안내 메시지 */}
                  {userInfo.language === "korean-english" && (
                    <Alert className="border-blue-200 bg-blue-50">
                      <AlertDescription className="text-blue-800">
                        💡 한/영 녹음은 한국어와 영어를 모두 녹음해야 합니다. 
                        {getLanguageCompletionStatus("korean") && getLanguageCompletionStatus("english") 
                          ? " 두 언어 모두 완료되었습니다!" 
                          : ` 현재 ${getLanguageCompletionStatus("korean") ? "한국어 완료" : "한국어 대기"}, ${getLanguageCompletionStatus("english") ? "영어 완료" : "영어 대기"}`
                        }
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* 네비게이션 버튼 */}
                  <div className="flex justify-between">
                    <Button onClick={handlePrevScript} disabled={currentScript === 1} variant="outline">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      이전 문안
                    </Button>

                    <Button
                      onClick={handleNextScript}
                      disabled={
                        userInfo.language === "korean-english" 
                          ? !(getLanguageCompletionStatus("korean") && getLanguageCompletionStatus("english"))
                          : !recordings[`${currentScript}-main`]
                      }
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {currentScript === totalScripts ? "최종 확인" : "다음 문안"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <FinalConfirmation
                userInfo={userInfo}
                recordings={recordings}
                onSubmit={handleSubmit}
                onBack={() => setCurrentStep(2)}
                isSubmitting={isSubmitting}
              />
            )}

            {/* 녹음 현황 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">녹음 현황</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: totalScripts }, (_, i) => i + 1).map((scriptNum) => {
                    const isKoreanEnglish = userInfo.language === "korean-english"
                    const koreanCompleted = isKoreanEnglish ? recordings[`${scriptNum}-korean`] : false
                    const englishCompleted = isKoreanEnglish ? recordings[`${scriptNum}-english`] : false
                    const mainCompleted = !isKoreanEnglish ? recordings[`${scriptNum}-main`] : false
                    const allCompleted = isKoreanEnglish ? (koreanCompleted && englishCompleted) : mainCompleted
                    const partialCompleted = isKoreanEnglish ? (koreanCompleted || englishCompleted) : false
                    
                    return (
                      <div key={scriptNum} className="text-center">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium relative ${
                            allCompleted
                              ? "bg-green-100 text-green-800 border-2 border-green-300"
                              : partialCompleted
                                ? "bg-yellow-100 text-yellow-800 border-2 border-yellow-300"
                                : scriptNum === currentScript
                                  ? "bg-blue-100 text-blue-800 border-2 border-blue-300"
                                  : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {allCompleted ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : partialCompleted ? (
                            <div className="text-xs">½</div>
                          ) : (
                            scriptNum
                          )}
                          
                          {/* 한/영 녹음 상태 표시 */}
                          {isKoreanEnglish && (
                            <div className="absolute -bottom-1 -right-1 flex gap-0.5">
                              {koreanCompleted && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
                              {englishCompleted && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                            </div>
                          )}
                        </div>
                        <div className="text-xs mt-1 text-gray-600">문안 {scriptNum}</div>
                        {isKoreanEnglish && (
                          <div className="text-xs text-gray-500 flex justify-center gap-1 mt-0.5">
                            <span className={koreanCompleted ? "text-green-600" : "text-gray-400"}>🇰🇷</span>
                            <span className={englishCompleted ? "text-blue-600" : "text-gray-400"}>🇺🇸</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                
                {/* 범례 */}
                {userInfo.language === "korean-english" && (
                  <div className="mt-4 text-xs text-gray-600 flex justify-center gap-4">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>한국어 완료</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>영어 완료</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
