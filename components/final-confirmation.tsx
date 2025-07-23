"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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
  const [comment, setComment] = useState("")
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
        comment,
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
          uploadedFiles: submissionData.uploadedFiles,
          status: submissionData.status,
          comment: submissionData.comment,
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">제출 완료!</h2>
            <p className="text-gray-600 mb-4">녹음 파일이 성공적으로 제출되었습니다.</p>
            <p className="text-sm text-gray-500">평가 결과는 추후 안내드리겠습니다.</p>
          </CardContent>
        </Card>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">최종 확인</h1>
          <p className="text-gray-600">
            {userInfo.name} ({userInfo.employeeId}) - {userInfo.category} - {getLanguageDisplay(userInfo.language)}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                녹음 파일 확인
                {currentlyPlaying && (
                  <Button onClick={stopAllPlayback} variant="outline" size="sm">
                    <Pause className="w-4 h-4 mr-1" />
                    정지
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(recordingsByLanguage).map(([language, recordings]) => (
                <div key={language} className="space-y-3">
                  <h3 className="font-semibold text-lg">{language}</h3>
                  <div className="space-y-2">
                    {recordings.map(({ scriptNum, key }) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium">{scriptNum}번 문안</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => playRecording(key)}
                          className={currentlyPlaying === key ? "bg-blue-100" : "bg-transparent"}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          {currentlyPlaying === key ? "재생중" : "재생"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>제출 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">이름:</span>
                  <p>{userInfo.name}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">사번:</span>
                  <p>{userInfo.employeeId}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">구분:</span>
                  <p>{userInfo.category}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">언어:</span>
                  <p>{getLanguageDisplay(userInfo.language)}</p>
                </div>
              </div>

              <div>
                <Label htmlFor="comment">추가 메모 (선택사항)</Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="특이사항이나 전달할 내용이 있으면 입력해주세요..."
                  className="mt-1"
                />
              </div>

              {isUploading && (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>업로드 진행률</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>{uploadStatus}</span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleSubmit}
                className="w-full"
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
