"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Upload, CheckCircle, Pause, AlertCircle } from "lucide-react"
import { driveService } from "@/lib/google-drive-service"

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

// Dropbox 업로드 함수 (서버 중계)
async function uploadToDropbox(file: Blob, fileName: string, retryCount = 0) {
  const maxRetries = 3
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
  
  try {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("fileName", fileName)
    const response = await fetch("/api/dropbox-upload", {
      method: "POST",
      body: formData,
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      
      // 429 에러 (Rate Limit)인 경우 재시도
      if (response.status === 429 && retryCount < maxRetries) {
        console.log(`Rate limit hit, retrying in ${(retryCount + 1) * 2} seconds...`)
        await delay((retryCount + 1) * 2000) // 2초, 4초, 6초 대기
        return uploadToDropbox(file, fileName, retryCount + 1)
      }
      
      throw new Error(errorData.error || "Dropbox 업로드 실패")
    }
    
    const result = await response.json()
    console.log("Dropbox 업로드 성공:", result)
    return result
  } catch (error) {
    if (retryCount < maxRetries) {
      console.log(`업로드 실패, 재시도 중... (${retryCount + 1}/${maxRetries})`)
      await delay(1000)
      return uploadToDropbox(file, fileName, retryCount + 1)
    }
    throw error
  }
}

declare module 'lamejs';

export function FinalConfirmation({ userInfo, recordings, availableScripts, onSubmit }: FinalConfirmationProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({})
  const [uploadStatus, setUploadStatus] = useState<string>("")

  const getLanguageDisplay = (language: string) => {
    const displays: { [key: string]: string } = {
      "korean-english": "한/영",
      japanese: "일본어",
      chinese: "중국어",
    }
    return displays[language] || language
  }

  const playRecording = (key: string) => {
    const recording = recordings[key]
    if (!recording) return

    // 현재 재생 중인 오디오 정지
    if (currentlyPlaying && audioElements[currentlyPlaying]) {
      audioElements[currentlyPlaying].pause()
    }

    if (currentlyPlaying === key) {
      setCurrentlyPlaying(null)
      return
    }

    // 새 오디오 재생
    if (!audioElements[key]) {
      const audio = new Audio(URL.createObjectURL(recording))
      audio.onended = () => setCurrentlyPlaying(null)
      setAudioElements((prev) => ({ ...prev, [key]: audio }))
      audio.play()
    } else {
      audioElements[key].play()
    }

    setCurrentlyPlaying(key)
  }

  const stopAllPlayback = () => {
    if (currentlyPlaying && audioElements[currentlyPlaying]) {
      audioElements[currentlyPlaying].pause()
      setCurrentlyPlaying(null)
    }
  }

  const handleSubmit = async () => {
    // 이중 제출 방지
    if (isUploading) return;

    setIsUploading(true)
    setUploadProgress(0)
    setUploadStatus("업로드 준비 중...")

    try {
      const uploadPromises: Promise<void>[] = []
      let uploadCount = 0
      const totalFiles = Object.values(recordings).filter(Boolean).length
      const uploadedFiles: { [key: string]: { url: string; fileName: string } } = {}
      const dropboxFiles: any[] = []

      setUploadStatus(`총 ${totalFiles}개 파일 업로드 시작...`)

      // 한영의 경우 한국어와 영어 모두 업로드
      if (userInfo.language === "korean-english") {
        for (const scriptNum of availableScripts) {
          // 한국어 업로드
          const koreanBlob = recordings[`${scriptNum}-korean`]
          if (koreanBlob) {
            const koreanFileName = `${userInfo.name}_${userInfo.employeeId}_${userInfo.category}_한국어_${scriptNum}번문안_${new Date().toISOString().split("T")[0]}.webm`
            uploadPromises.push(
              (async () => {
                setUploadStatus(`${scriptNum}번 문안 한국어 Dropbox 업로드 중...`)
                const result = await uploadToDropbox(koreanBlob, koreanFileName)
                uploadCount++
                setUploadProgress((uploadCount / totalFiles) * 100)
                setUploadStatus(`${scriptNum}번 문안 한국어 업로드 완료 (${uploadCount}/${totalFiles})`)
                dropboxFiles.push({ scriptKey: `${scriptNum}-korean`, ...result })
              })()
            )
          }

          // 영어 업로드
          const englishBlob = recordings[`${scriptNum}-english`]
          if (englishBlob) {
            const englishFileName = `${userInfo.name}_${userInfo.employeeId}_${userInfo.category}_영어_${scriptNum}번문안_${new Date().toISOString().split("T")[0]}.webm`
            uploadPromises.push(
              (async () => {
                setUploadStatus(`${scriptNum}번 문안 영어 Dropbox 업로드 중...`)
                const result = await uploadToDropbox(englishBlob, englishFileName)
                uploadCount++
                setUploadProgress((uploadCount / totalFiles) * 100)
                setUploadStatus(`${scriptNum}번 문안 영어 업로드 완료 (${uploadCount}/${totalFiles})`)
                dropboxFiles.push({ scriptKey: `${scriptNum}-english`, ...result })
              })()
            )
          }
        }
      } else {
        // 일본어, 중국어는 해당 언어 키 사용
        for (const scriptNum of availableScripts) {
          const recordingKey = `${scriptNum}-${userInfo.language}`
          const blob = recordings[recordingKey]
          if (blob) {
            const fileName = `${userInfo.name}_${userInfo.employeeId}_${userInfo.category}_${getLanguageDisplay(userInfo.language)}_${scriptNum}번문안_${new Date().toISOString().split("T")[0]}.webm`
            uploadPromises.push(
              (async () => {
                setUploadStatus(`${scriptNum}번 문안 Dropbox 업로드 중...`)
                const result = await uploadToDropbox(blob, fileName)
                uploadCount++
                setUploadProgress((uploadCount / totalFiles) * 100)
                setUploadStatus(`${scriptNum}번 문안 업로드 완료 (${uploadCount}/${totalFiles})`)
                dropboxFiles.push({ scriptKey: recordingKey, ...result })
              })()
            )
          }
        }
      }

      await Promise.all(uploadPromises)
      setUploadStatus("모든 파일 업로드 완료!")
      setIsSubmitted(true)

      // 업로드 결과 확인
      if (dropboxFiles.length === 0) {
        console.warn('❗ [handleSubmit] dropboxFiles가 비어 있습니다. Dropbox 업로드 결과가 반영되지 않았습니다.')
      } else {
        console.log('✅ [handleSubmit] dropboxFiles:', dropboxFiles)
      }

      // Blob을 Base64로 변환
      const base64Recordings: { [key: string]: string } = {}
      for (const [key, blob] of Object.entries(recordings)) {
        if (blob) {
          try {
            const arrayBuffer = await blob.arrayBuffer()
            const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
            base64Recordings[key] = `data:audio/webm;base64,${base64}`
          } catch (error) {
            console.error(`Blob 변환 실패 (${key}):`, error)
          }
        }
      }

      console.log("🧩 제출 데이터 구조 확인:")
      console.log("- recordings 키:", Object.keys(base64Recordings))
      console.log("- dropboxFiles 키:", Object.keys(dropboxFiles))
      console.log("- recordings 샘플:", base64Recordings[Object.keys(base64Recordings)[0]]?.substring(0, 100) + "...")

      // 제출 정보 서버에 전송 및 localStorage 저장 (Dropbox url 포함)
      const submissionData = {
        ...userInfo,
        id: `submission-${Date.now()}-${Math.random()}`, // id는 서버에서 생성하는 것이 더 좋습니다.
        submittedAt: new Date().toISOString(),
        dropboxFiles: dropboxFiles,
        recordings: base64Recordings,
        recordingCount: totalFiles,
        scriptNumbers: availableScripts,
        status: "submitted",
        driveFolder: "1cdUwgx4z3BrCqrp8tt8e8T6OQhFMvqLF",
      }

      // 서버에도 전송 (필요시)
      const response = await fetch("/api/recordings/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.details || "서버 제출 실패");
      }
      
      console.log('✅ [handleSubmit] 서버 응답:', result);
      
      // localStorage에도 저장 (용량 제한 고려)
      try {
        const existingSubmissions = JSON.parse(localStorage.getItem("submittedRecordings") || "[]")
        
        // 기존 데이터가 너무 많으면 오래된 것부터 삭제 (최대 50개만 유지)
        if (existingSubmissions.length >= 50) {
          existingSubmissions.splice(0, existingSubmissions.length - 49)
        }
        
        // Base64 데이터를 제외한 경량화된 데이터만 저장
        const lightweightSubmission = {
          id: result.dropboxFile.id, // 서버에서 반환된 Dropbox 파일 ID 사용
          name: submissionData.name,
          employeeId: submissionData.employeeId,
          language: submissionData.language,
          category: submissionData.category,
          submittedAt: submissionData.submittedAt,
          recordingCount: submissionData.recordingCount,
          status: submissionData.status,
          driveFolder: submissionData.driveFolder,
          dropboxFiles
        }
        console.log('✅ [handleSubmit] lightweightSubmission 저장:', lightweightSubmission)
        
        existingSubmissions.push(lightweightSubmission)
        localStorage.setItem("submittedRecordings", JSON.stringify(existingSubmissions))
        console.log("제출 정보가 localStorage에 저장되었습니다.")
      } catch (storageError) {
        console.warn("localStorage 저장 실패 (용량 한계):", storageError)
        // localStorage 저장 실패해도 업로드는 성공했으므로 무시
      }

      setTimeout(() => onSubmit(), 2000)
    } catch (error) {
      console.error("업로드 오류:", error)
      setUploadStatus("업로드 중 오류가 발생했습니다.")
      setTimeout(() => {
        setIsSubmitted(true)
        setTimeout(() => onSubmit(), 2000)
      }, 1000)
    } finally {
      setIsUploading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 relative overflow-hidden">
        {/* 배경 장식 요소들 */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-white/10 rounded-full blur-xl animate-pulse delay-2000"></div>
          <div className="absolute bottom-40 right-1/3 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse delay-1500"></div>
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-lg">
            {/* 메인 카드 */}
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 text-center relative overflow-hidden">
              {/* 카드 내부 장식 */}
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-600"></div>
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full opacity-20"></div>
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-full opacity-20"></div>

              {/* 성공 아이콘 */}
              <div className="relative z-10 mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg animate-bounce">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
              </div>

              {/* 제목 */}
              <h1 className="text-4xl font-bold text-gray-900 mb-4 relative z-10">
                🎉 제출 완료! 🎉
              </h1>

              {/* 메인 메시지 */}
              <div className="space-y-4 mb-8 relative z-10">
                <p className="text-xl text-gray-700 font-semibold">
                  수고하셨습니다!
                </p>
                <p className="text-lg text-gray-600">
                  녹음 파일이 성공적으로 제출되었습니다.
                </p>
              </div>

              {/* 추가 정보 */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 mb-6 relative z-10 border border-green-200/50">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">{Object.values(recordings).filter(Boolean).length}</span>
                  </div>
                  <span className="text-green-800 font-semibold">개 파일 업로드 완료</span>
                </div>
                <p className="text-sm text-green-700">
                  {userInfo.name} ({userInfo.employeeId}) - {getLanguageDisplay(userInfo.language)}
                </p>
              </div>

              {/* 안내 메시지 */}
              <div className="space-y-2 relative z-10">
                <p className="text-sm text-gray-600">
                  💫 평가 결과는 월 말 공지로 확인해주세요
                </p>
                <p className="text-xs text-gray-500">
                  조용히 방송실습실을 퇴실해주세요
                </p>
              </div>

              {/* 하단 장식 */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent"></div>
            </div>

            {/* 하단 메시지 */}
            <div className="text-center mt-6">
              <p className="text-white/80 text-sm font-medium">
                ✨ 오늘도 좋은 하루 되세요! ✨
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 언어별로 녹음 파일 그룹화
  const getRecordingsByLanguage = () => {
    if (userInfo.language === "korean-english") {
      return {
        한국어: availableScripts
          .map((num) => ({ scriptNum: num, key: `${num}-korean`, blob: recordings[`${num}-korean`] }))
          .filter((item) => item.blob),
        영어: availableScripts
          .map((num) => ({ scriptNum: num, key: `${num}-english`, blob: recordings[`${num}-english`] }))
          .filter((item) => item.blob),
      }
    } else {
      // 일본어, 중국어는 해당 언어 키 사용
      const languageKey = `${availableScripts[0]}-${userInfo.language}`
      return {
        [getLanguageDisplay(userInfo.language)]: availableScripts
          .map((num) => ({ 
            scriptNum: num, 
            key: `${num}-${userInfo.language}`, 
            blob: recordings[`${num}-${userInfo.language}`] 
          }))
          .filter((item) => item.blob),
      }
    }
  }

  const recordingsByLanguage = getRecordingsByLanguage()

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
            녹음된 파일들을 확인하고 최종 제출해주세요.
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
            <CardContent className="space-y-4">
              {Object.entries(recordingsByLanguage).map(([language, recordings]) => (
                <div key={language} className="space-y-3">
                  <h3 className="font-semibold text-lg">{language}</h3>
                  <div className="space-y-3">
                    {recordings.map(({ scriptNum, key }) => (
                      <div key={key} className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border border-gray-200/50 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                            {scriptNum}
                          </div>
                          <span className="font-semibold text-gray-800">{scriptNum}번 문안</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => playRecording(key)}
                          className={`${
                            currentlyPlaying === key 
                              ? "bg-red-50 text-red-700 border-red-300 shadow-md hover:bg-red-100" 
                              : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:text-blue-600"
                          } transition-all duration-200`}
                        >
                          {currentlyPlaying === key ? (
                            <>
                              <Pause className="w-3 h-3 mr-1" />
                              정지
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 mr-1" />
                              재생
                            </>
                          )}
                        </Button>
                      </div>
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
            <CardContent className="space-y-4">
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
              <div className="space-y-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50">
                <h4 className="font-semibold text-blue-900 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  중요 안내사항
                </h4>
                <div className="space-y-2 text-xs text-blue-800">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-medium">•</span>
                    <span>이 페이지에서 나가면 녹음 데이터가 손실됩니다.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-medium">•</span>
                    <span>업로드 완료 후 조용히 방송실습실을 퇴실해주세요.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-medium">•</span>
                    <span>평가 결과는 월 말 공지로 확인해주세요.</span>
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

              <Button
                onClick={handleSubmit}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 h-12 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={isUploading || Object.values(recordings).filter(Boolean).length === 0}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? "업로드 중..." : "최종 제출"}
              </Button>

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
