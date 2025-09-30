"use client"

import React, { useState, useRef, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { employeeDB } from "@/lib/employee-database"
import { PDFSyncService } from "@/lib/pdf-sync-service"
import { 
  Upload, 
  FileAudio, 
  User, 
  Mic, 
  CheckCircle, 
  AlertCircle,
  X,
  Play,
  Pause
} from "lucide-react"

interface UserInfo {
  name: string
  employeeId: string
  language: string
  category: string
  email?: string
  broadcastCode?: string
  teamNumber?: string
  role?: string
  broadcastGrade?: string
}

interface FileUploadEvaluationProps {
  onComplete: (evaluationData: any) => void
  onBack: () => void
  authenticatedUser?: any
  hideHeader?: boolean
}

interface UploadedFile {
  file: File
  key: string
  scriptNum: number
  language: string
  audioUrl?: string
  isPlaying?: boolean
}

export function FileUploadEvaluation({ onComplete, onBack, authenticatedUser, hideHeader = false }: FileUploadEvaluationProps) {
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: "",
    employeeId: "",
    language: "",
    category: "",
    email: authenticatedUser?.email,
    broadcastCode: authenticatedUser?.broadcastCode,
    teamNumber: authenticatedUser?.teamNumber,
    role: authenticatedUser?.role,
    broadcastGrade: authenticatedUser?.broadcastGrade,
  })

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPlaying, setCurrentPlaying] = useState<string | null>(null)
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showLanguageModal, setShowLanguageModal] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessingLanguage, setIsProcessingLanguage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pdfSyncService = useRef(new PDFSyncService())

  // 직원정보 스프레드시트에서 이름과 사번 가져오기
  useEffect(() => {
    const fetchEmployeeInfo = async () => {
      if (authenticatedUser?.email) {
        try {
          const employeeInfo = await employeeDB.findEmployeeByEmail(authenticatedUser.email)
          if (employeeInfo) {
            setUserInfo(prev => ({
              ...prev,
              name: employeeInfo.name,
              employeeId: employeeInfo.employeeId,
            }))
          }
        } catch (error) {
          console.error("직원정보 가져오기 실패:", error)
        }
      }
    }
    fetchEmployeeInfo()
  }, [authenticatedUser?.email])

  // 컴포넌트 언마운트 시 오디오 정리
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause()
        currentAudio.currentTime = 0
      }
    }
  }, [currentAudio])

  const getCategoryOptions = useMemo(() => {
    if (userInfo.language === "korean-english") {
      return [
        { value: "신규", label: "신규" },
        { value: "재자격", label: "재자격" },
      ]
    } else if (userInfo.language === "japanese" || userInfo.language === "chinese") {
      return [
        { value: "신규", label: "신규" },
        { value: "상위", label: "상위" },
      ]
    }
    return []
  }, [userInfo.language])

  const getLanguageDisplay = (language: string) => {
    const displays: { [key: string]: string } = {
      "korean-english": "한/영",
      "korean": "한국어",
      "english": "영어",
      japanese: "일본어",
      chinese: "중국어",
    }
    return displays[language] || language
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return
    processFiles(Array.from(files))
  }

  const processFiles = (files: File[]) => {
    const newFiles: UploadedFile[] = []
    
    Array.from(files).forEach((file) => {
      // 파일 확장자 추출
      const fileName = file.name.toLowerCase()
      const extension = fileName.split('.').pop()
      
      // 지원되는 오디오 형식 체크 (확장자 + MIME 타입)
      const supportedFormats = ['mp3', 'wav', 'webm', 'm4a', 'ogg', 'aac']
      const supportedMimeTypes = [
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 
        'audio/mp4', 'audio/m4a', 'audio/ogg', 'audio/aac',
        'audio/x-m4a', 'audio/x-wav' // iOS 추가 MIME 타입
      ]
      
      const isValidExtension = extension && supportedFormats.includes(extension)
      const isValidMimeType = supportedMimeTypes.includes(file.type)
      
      if (!isValidExtension && !isValidMimeType) {
        setError(`지원되지 않는 파일 형식입니다. 파일: ${file.name} (${file.type})\n지원 형식: ${supportedFormats.join(', ')}`)
        return
      }
      
      // 파일 크기 체크 (50MB)
      if (file.size > 50 * 1024 * 1024) {
        setError(`파일 크기가 너무 큽니다: ${(file.size / 1024 / 1024).toFixed(1)}MB. 최대 50MB까지 지원됩니다.`)
        return
      }
      
      // 한/영 언어의 경우 언어 선택 모달 표시
      if (userInfo.language === "korean-english") {
        setSelectedFile(file)
        setShowLanguageModal(true)
        return
      }
      
      // 다른 언어의 경우 바로 처리
      const language = userInfo.language
      const key = `1-${language}`
      
      // 중복 체크
      const existingLanguage = uploadedFiles.find(f => f.language === language)
      if (existingLanguage) {
        setError(`${getLanguageDisplay(language)} 파일이 이미 업로드되었습니다.`)
        return
      }
      
      const audioUrl = URL.createObjectURL(file)
      newFiles.push({
        file,
        key,
        scriptNum: 1,
        language,
        audioUrl,
        isPlaying: false
      })
    })

    setUploadedFiles(prev => [...prev, ...newFiles])
    setError(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    processFiles(files)
  }

  const removeFile = (key: string) => {
    setUploadedFiles(prev => {
      const file = prev.find(f => f.key === key)
      if (file?.audioUrl) {
        URL.revokeObjectURL(file.audioUrl)
      }
      return prev.filter(f => f.key !== key)
    })
  }

  const handleLanguageSelect = async (language: string) => {
    console.log("🔍 [FileUpload] 언어 선택:", language, "파일:", selectedFile?.name)
    
    if (!selectedFile) {
      console.error("❌ [FileUpload] 선택된 파일이 없습니다")
      return
    }

    setIsProcessingLanguage(true)
    
    try {
      const key = `1-${language}`
      console.log("🔍 [FileUpload] 생성된 키:", key)
      
      // 중복 체크
      const existingLanguage = uploadedFiles.find(f => f.language === language)
      if (existingLanguage) {
        console.log("❌ [FileUpload] 중복 언어 감지:", language)
        setError(`${getLanguageDisplay(language)} 파일이 이미 업로드되었습니다.`)
        setShowLanguageModal(false)
        setSelectedFile(null)
        return
      }
      
      // 파일 처리 지연 (UI 반응성 향상)
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const audioUrl = URL.createObjectURL(selectedFile)
      console.log("🔍 [FileUpload] 오디오 URL 생성:", audioUrl.substring(0, 50) + "...")
      
      const newFile: UploadedFile = {
        file: selectedFile,
        key,
        scriptNum: 1,
        language,
        audioUrl,
        isPlaying: false
      }
      
      console.log("🔍 [FileUpload] 새 파일 객체 생성:", {
        key: newFile.key,
        language: newFile.language,
        fileName: newFile.file.name,
        fileSize: newFile.file.size
      })
      
      setUploadedFiles(prev => {
        const updated = [...prev, newFile]
        console.log("🔍 [FileUpload] 업로드된 파일 목록 업데이트:", updated.map(f => ({ key: f.key, language: f.language })))
        return updated
      })
      
      setShowLanguageModal(false)
      setSelectedFile(null)
      setError(null)
      
      console.log("✅ [FileUpload] 언어 선택 처리 완료")
    } catch (error) {
      console.error("❌ [FileUpload] 언어 선택 처리 중 오류:", error)
      setError("파일 처리 중 오류가 발생했습니다.")
      setShowLanguageModal(false)
      setSelectedFile(null)
    } finally {
      setIsProcessingLanguage(false)
    }
  }

  const playAudio = (key: string) => {
    const file = uploadedFiles.find(f => f.key === key)
    if (!file?.audioUrl) return

    if (currentPlaying === key) {
      // 일시정지
      if (currentAudio) {
        currentAudio.pause()
        setCurrentAudio(null)
      }
      setCurrentPlaying(null)
      setUploadedFiles(prev => prev.map(f => ({ ...f, isPlaying: false })))
    } else {
      // 다른 오디오가 재생 중이면 정지
      if (currentAudio) {
        currentAudio.pause()
        currentAudio.currentTime = 0
      }
      
      // 재생
      setCurrentPlaying(key)
      setUploadedFiles(prev => prev.map(f => ({ ...f, isPlaying: f.key === key })))
      
      const audio = new Audio(file.audioUrl)
      audio.onended = () => {
        setCurrentPlaying(null)
        setCurrentAudio(null)
        setUploadedFiles(prev => prev.map(f => ({ ...f, isPlaying: false })))
      }
      audio.onpause = () => {
        setCurrentPlaying(null)
        setCurrentAudio(null)
        setUploadedFiles(prev => prev.map(f => ({ ...f, isPlaying: false })))
      }
      setCurrentAudio(audio)
      audio.play()
    }
  }

  // 파일을 Base64로 변환하는 헬퍼 함수
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })

  const handleSubmit = async () => {
    if (!userInfo.name || !userInfo.employeeId || !userInfo.language || !userInfo.category) {
      setError("모든 필수 정보를 입력해주세요.")
      return
    }

    if (uploadedFiles.length === 0) {
      setError("최소 하나의 녹음 파일을 업로드해주세요.")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // 파일들을 Base64로 변환하고 5개 스크립트로 복제
      const recordings: { [key: string]: string } = {}
      const originalFiles: { [key: string]: string } = {}

      for (const uploadedFile of uploadedFiles) {
        // 파일을 Base64로 변환
        const base64Data = await fileToBase64(uploadedFile.file)
        
        // 🔥 수정: 중복 생성 방지 - 하나의 파일당 하나의 키만 생성
        recordings[uploadedFile.key] = base64Data
        
        // 디버깅: 파일 크기 및 DataURL 길이 확인
        console.log(`파일 크기: ${uploadedFile.file.name} - ${(uploadedFile.file.size / 1024 / 1024).toFixed(2)}MB`)
        console.log(`Base64 길이: ${base64Data.length} characters`)
        
        // original file list for reference
        originalFiles[uploadedFile.key] = uploadedFile.file.name
      }

      // 원본 파일 확장자 정보 추출
      const fileExtensions: { [key: string]: string } = {}
      for (const uploadedFile of uploadedFiles) {
        const fileName = uploadedFile.file.name.toLowerCase()
        const extension = fileName.split('.').pop() || 'webm'
        fileExtensions[uploadedFile.key] = extension
      }

      // 평가 데이터 생성 (필수 정보만 포함)
      const evaluationData = {
        name: userInfo.name,
        employeeId: userInfo.employeeId,
        language: userInfo.language,
        category: userInfo.category,
        submittedAt: new Date().toISOString(),
        recordingCount: uploadedFiles.length,
        scriptNumbers: uploadedFiles.map((_, index) => index + 1),
        recordings: recordings,
        fileExtensions: fileExtensions, // 원본 파일 확장자 정보 추가
        status: "pending",
        comment: "",
        isFileUpload: true,
      }

      // API를 통해 서버에 저장
      const uploadData = {
        name: userInfo.name,
        employeeId: userInfo.employeeId,
        language: userInfo.language,
        category: userInfo.category,
        submittedAt: new Date().toISOString(),
        recordingCount: uploadedFiles.length,
        scriptNumbers: uploadedFiles.map((_, index) => index + 1),
        recordings: recordings,
        comment: "",
      }

      const response = await fetch("/api/recordings/submit-database", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(uploadData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "파일 업로드에 실패했습니다.")
      }

      const result = await response.json()
      console.log("파일 업로드 성공:", result)

      // 제출 완료 팝업창 표시
      alert(`✅ 녹음 파일 제출이 완료되었습니다!\n\n${userInfo.name} (${userInfo.employeeId}) 님의 녹음 파일이 성공적으로 제출되었습니다.\n\n결과는 월말 공지를 통해 확인해 주세요.`)

      // 성공 시 간단한 데이터만 전달
      onComplete({
        success: true,
        evaluationId: result.evaluationId,
        message: result.message
      })
    } catch (error) {
      console.error("파일 처리 중 오류:", error)
      setError("파일 처리 중 오류가 발생했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const requiredFiles = useMemo(() => {
    if (userInfo.language === "korean-english") {
      return ["한국어 파일", "영어 파일"]
    } else {
      return [`${getLanguageDisplay(userInfo.language)} 파일`]
    }
  }, [userInfo.language])


  
  const missingFiles = useMemo(() => {
    const currentUploadedLanguages = uploadedFiles.map(f => f.language)
    console.log("🔍 [FileUpload] 현재 업로드된 언어:", currentUploadedLanguages)
    console.log("🔍 [FileUpload] 필요한 파일:", requiredFiles)
    console.log("🔍 [FileUpload] 선택된 언어:", userInfo.language)
    
    return requiredFiles.filter((_: string, index: number) => {
      if (userInfo.language === "korean-english") {
        const isMissing = index === 0 ? !currentUploadedLanguages.includes("korean") : !currentUploadedLanguages.includes("english")
        console.log(`🔍 [FileUpload] ${index === 0 ? '한국어' : '영어'} 파일 ${isMissing ? '누락' : '있음'}`)
        return isMissing
      } else {
        const isMissing = !currentUploadedLanguages.includes(userInfo.language)
        console.log(`🔍 [FileUpload] ${userInfo.language} 파일 ${isMissing ? '누락' : '있음'}`)
        return isMissing
      }
    })
  }, [requiredFiles, uploadedFiles, userInfo.language])

  return (
    <div className={hideHeader ? "p-4" : "bg-white p-4"}>
      <div className="max-w-4xl mx-auto">
        {!hideHeader && (
          <div className="mb-6 relative" style={{ marginTop: '15px' }}>
            <div className="flex justify-between items-start">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">📤 녹음 파일 제출(PUS)</h1>
              <Button 
                onClick={onBack} 
                variant="ghost" 
                size="sm"
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* 사용자 정보 입력 */}
          <Card className="bg-white shadow-lg rounded-2xl border hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-gray-50/80 rounded-t-2xl">
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-purple-600" />
                응시자 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  value={userInfo.name}
                  onChange={(e) => setUserInfo(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="성명을 입력하세요"
                  disabled={authenticatedUser ? true : false}
                  className={authenticatedUser ? "bg-gray-50" : ""}
                />
              </div>

              <div>
                <Label htmlFor="employeeId">사번</Label>
                <Input
                  id="employeeId"
                  value={userInfo.employeeId}
                  onChange={(e) => setUserInfo(prev => ({ ...prev, employeeId: e.target.value }))}
                  placeholder="직원번호를 입력하세요"
                  disabled={authenticatedUser ? true : false}
                  className={authenticatedUser ? "bg-gray-50" : ""}
                />
              </div>

              <div>
                <Label htmlFor="language">언어 선택</Label>
                <Select
                  value={userInfo.language}
                  onValueChange={(value) => {
                    // 언어 변경 시 스크립트 캐시 초기화
                    pdfSyncService.current.clearScriptCache()
                    setUserInfo(prev => ({ ...prev, language: value, category: "" }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="평가 언어를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="korean-english">🇰🇷🇺🇸 한국어/영어</SelectItem>
                    <SelectItem value="japanese">🇯🇵 일본어</SelectItem>
                    <SelectItem value="chinese">🇨🇳 중국어</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {userInfo.language && (
                <div>
                  <Label htmlFor="category">평가 구분</Label>
                  <Select
                    value={userInfo.category}
                    onValueChange={(value) => setUserInfo(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="평가 유형을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {getCategoryOptions.map((option: { value: string; label: string }) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 파일 업로드 */}
          <Card className="bg-white shadow-lg rounded-2xl border hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-gray-50/80 rounded-t-2xl">
              <CardTitle className="flex items-center gap-2">
                <FileAudio className="w-5 h-5 text-purple-600" />
                녹음 파일 업로드
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
                  !userInfo.language 
                    ? 'border-gray-200 bg-gray-50' 
                    : isDragOver 
                      ? 'border-blue-400 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={userInfo.language ? handleDragOver : undefined}
                onDragLeave={userInfo.language ? handleDragLeave : undefined}
                onDrop={userInfo.language ? handleDrop : undefined}
              >
                <Upload className={`w-8 h-8 mx-auto mb-2 transition-colors duration-200 ${
                  !userInfo.language 
                    ? 'text-gray-300' 
                    : isDragOver 
                      ? 'text-blue-500' 
                      : 'text-gray-400'
                }`} />
                {!userInfo.language ? (
                  <>
                    <p className="text-sm text-gray-500 mb-2">
                      먼저 언어를 선택해주세요
                    </p>
                    <p className="text-xs text-gray-400 mb-4">
                      언어 선택 후 파일 업로드가 가능합니다
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 mb-2">
                      녹음 파일을 선택하거나 여기로 드래그하세요
                    </p>
                    <p className="text-xs text-gray-500 mb-2">
                      <span className="text-red-600 font-bold">언어별로 1개 파일씩 업로드</span>
                    </p>
                    <div className="text-xs text-gray-600 mb-4 text-left bg-gray-50 p-3 rounded border">
                      <p className="font-medium mb-1">파일명 규칙:</p>
                      <p className="text-gray-700">123456K 홍길동(한국어)</p>
                      <p className="text-gray-700">123456K 홍길동(영어)</p>
                      <p className="text-gray-700">123456K 홍길동(일본어)</p>
                      <p className="text-gray-700">123456K 홍길동(중국어)</p>
                    </div>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      className="w-full"
                    >
                      파일 선택
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="audio/*,.mp3,.wav,.webm,.m4a,.ogg,.aac"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </>
                )}
              </div>

              {/* 업로드된 파일 목록 */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">업로드된 파일 ({uploadedFiles.length}개)</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {uploadedFiles.map((file) => (
                      <div key={file.key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <FileAudio className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium">{file.key}</span>
                          <Badge variant="outline" className="text-xs">
                            {file.file.name}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => playAudio(file.key)}
                          >
                            {file.isPlaying ? (
                              <Pause className="w-3 h-3" />
                            ) : (
                              <Play className="w-3 h-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeFile(file.key)}
                            className="text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 필요한 파일 안내 */}
              {userInfo.language && (
                <div className="space-y-2">
                  <h4 className="font-medium">필요한 파일</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {requiredFiles.map((fileType: string, index: number) => {
                      const currentUploadedLanguages = uploadedFiles.map(f => f.language)
                      const isUploaded = userInfo.language === "korean-english" 
                        ? (index === 0 ? currentUploadedLanguages.includes("korean") : currentUploadedLanguages.includes("english"))
                        : currentUploadedLanguages.includes(userInfo.language)
                      
                      console.log(`🔍 [FileUpload] 파일 상태 확인: ${fileType} - ${isUploaded ? '업로드됨' : '누락'}`)
                      
                      return (
                        <div
                          key={fileType}
                          className={`flex items-center gap-2 p-2 rounded ${
                            isUploaded
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : "bg-gray-50 text-gray-500 border border-gray-200"
                          }`}
                        >
                          {isUploaded ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <AlertCircle className="w-4 h-4" />
                          )}
                          {fileType}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <Alert className="mt-4 border-red-200 bg-red-50">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* 제출 버튼 */}
        <div className="mt-6 text-center">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || missingFiles.length > 0}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-200 border-t-blue-600 bg-transparent mr-2"></div>
                업로드 중...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                제출하기
              </>
            )}
          </Button>
          
          {userInfo.language && missingFiles.length > 0 && (
            <p className="text-sm text-orange-600 mt-2">
              {missingFiles.length}개의 파일이 더 필요합니다: {missingFiles.join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* 언어 선택 모달 */}
      {showLanguageModal && selectedFile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">언어 선택</h2>
                <button 
                  onClick={() => {
                    if (!isProcessingLanguage) {
                      setShowLanguageModal(false)
                      setSelectedFile(null)
                    }
                  }} 
                  className={`p-2 rounded-lg ${isProcessingLanguage ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                  disabled={isProcessingLanguage}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">파일: {selectedFile.name}</p>
                <p className="text-sm text-gray-600">이 파일이 어떤 언어로 녹음되었는지 선택해주세요.</p>
              </div>
              
              {isProcessingLanguage && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-200 border-t-blue-600"></div>
                    <div>
                      <p className="text-sm font-medium text-blue-800">문안을 불러오는 중입니다...</p>
                      <p className="text-xs text-blue-600">잠시만 기다려주세요</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                <Button
                  onClick={() => handleLanguageSelect("korean")}
                  className="w-full h-12 text-left justify-start"
                  variant="outline"
                  disabled={isProcessingLanguage}
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-red-500 text-white px-2 py-1 rounded text-sm font-bold">KR</div>
                    <div>
                      <div className="font-medium">한국어</div>
                      <div className="text-xs text-gray-500">Korean</div>
                    </div>
                  </div>
                </Button>
                
                <Button
                  onClick={() => handleLanguageSelect("english")}
                  className="w-full h-12 text-left justify-start"
                  variant="outline"
                  disabled={isProcessingLanguage}
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-600 text-white px-2 py-1 rounded text-sm font-bold">GB</div>
                    <div>
                      <div className="font-medium">영어</div>
                      <div className="text-xs text-gray-500">English</div>
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 