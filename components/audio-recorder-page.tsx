"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AudioRecorder } from "@/components/audio-recorder"
import { PDFViewer } from "@/components/pdf-viewer"
import { FinalConfirmation } from "@/components/final-confirmation"
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

  const totalScripts = 5
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
    const languages = getScriptLanguages()
    const currentLanguage = languages[0] // 현재는 첫 번째 언어만 처리
    const key = `${currentScript}-${currentLanguage}`

    setRecordings((prev) => ({
      ...prev,
      [key]: blob,
    }))
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

      // 녹음 파일들을 FormData로 준비
      const formData = new FormData()
      formData.append("userInfo", JSON.stringify(userInfo))

      Object.entries(recordings).forEach(([key, blob]) => {
        formData.append(`recording_${key}`, blob, `${userInfo.name}_${userInfo.employeeId}_${key}.webm`)
      })

      const response = await fetch("/api/recordings/submit", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("제출 실패")
      }

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
                <PDFViewer language={userInfo.language} scriptNumber={currentScript} />
              </CardContent>
            </Card>
          </div>

          {/* 녹음 섹션 */}
          <div className="space-y-4">
            {currentStep < 3 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="w-5 h-5" />
                    음성 녹음
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <AudioRecorder
                    onRecordingComplete={handleRecordingComplete}
                    existingRecording={recordings[`${currentScript}-${getScriptLanguages()[0]}`]}
                  />

                  {/* 녹음 완료 표시 */}
                  {recordings[`${currentScript}-${getScriptLanguages()[0]}`] && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        문안 {currentScript}번 녹음이 완료되었습니다.
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
                      disabled={!recordings[`${currentScript}-${getScriptLanguages()[0]}`]}
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
                  {Array.from({ length: totalScripts }, (_, i) => i + 1).map((scriptNum) => (
                    <div key={scriptNum} className="text-center">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium ${
                          recordings[`${scriptNum}-${getScriptLanguages()[0]}`]
                            ? "bg-green-100 text-green-800 border-2 border-green-300"
                            : scriptNum === currentScript
                              ? "bg-blue-100 text-blue-800 border-2 border-blue-300"
                              : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {recordings[`${scriptNum}-${getScriptLanguages()[0]}`] ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          scriptNum
                        )}
                      </div>
                      <div className="text-xs mt-1 text-gray-600">문안 {scriptNum}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
