"use client"

import React, { useState, useRef, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
}

interface UploadedFile {
  file: File
  key: string
  scriptNum: number
  language: string
  audioUrl?: string
  isPlaying?: boolean
}

export function FileUploadEvaluation({ onComplete, onBack, authenticatedUser }: FileUploadEvaluationProps) {
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: authenticatedUser?.name || "",
    employeeId: authenticatedUser?.broadcastCode || "",
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showLanguageModal, setShowLanguageModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      japanese: "일본어",
      chinese: "중국어",
    }
    return displays[language] || language
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const newFiles: UploadedFile[] = []
    
    Array.from(files).forEach((file) => {
      // 파일 확장자 추출
      const fileName = file.name.toLowerCase()
      const extension = fileName.split('.').pop()
      
      // 지원되는 오디오 형식 체크
      const supportedFormats = ['mp3', 'wav', 'webm', 'm4a', 'ogg', 'aac']
      if (!extension || !supportedFormats.includes(extension)) {
        setError(`지원되지 않는 파일 형식입니다: ${extension}. 지원 형식: ${supportedFormats.join(', ')}`)
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

  const removeFile = (key: string) => {
    setUploadedFiles(prev => {
      const file = prev.find(f => f.key === key)
      if (file?.audioUrl) {
        URL.revokeObjectURL(file.audioUrl)
      }
      return prev.filter(f => f.key !== key)
    })
  }

  const handleLanguageSelect = (language: string) => {
    if (!selectedFile) return

    const key = `1-${language}`
    
    // 중복 체크
    const existingLanguage = uploadedFiles.find(f => f.language === language)
    if (existingLanguage) {
      setError(`${getLanguageDisplay(language)} 파일이 이미 업로드되었습니다.`)
      setShowLanguageModal(false)
      setSelectedFile(null)
      return
    }
    
    const audioUrl = URL.createObjectURL(selectedFile)
    const newFile: UploadedFile = {
      file: selectedFile,
      key,
      scriptNum: 1,
      language,
      audioUrl,
      isPlaying: false
    }
    
    setUploadedFiles(prev => [...prev, newFile])
    setShowLanguageModal(false)
    setSelectedFile(null)
    setError(null)
  }

  const playAudio = (key: string) => {
    const file = uploadedFiles.find(f => f.key === key)
    if (!file?.audioUrl) return

    if (currentPlaying === key) {
      // 정지
      setCurrentPlaying(null)
      setUploadedFiles(prev => prev.map(f => ({ ...f, isPlaying: false })))
    } else {
      // 재생
      setCurrentPlaying(key)
      setUploadedFiles(prev => prev.map(f => ({ ...f, isPlaying: f.key === key })))
      
      const audio = new Audio(file.audioUrl)
      audio.onended = () => {
        setCurrentPlaying(null)
        setUploadedFiles(prev => prev.map(f => ({ ...f, isPlaying: false })))
      }
      audio.play()
    }
  }

  // 안전한 File → DataURL(Base64) 변환 헬퍼 (대용량도 스택 오버플로우 없음)
  const fileToDataURL = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })

  // 클라이언트 Dropbox 업로드 헬퍼 (사용자 인증 필요 없음, 서버 중계 API 사용)
  const uploadToDropboxClient = async (file: File, fileName: string) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("fileName", fileName)
    const res = await fetch("/api/dropbox-upload", {
      method: "POST",
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || "Dropbox 업로드 실패")
    }
    return res.json() // {url, fileName, path, fileId}
  }

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
      const dropboxFiles: any[] = []
      const originalFiles: { [key: string]: string } = {}

      for (const uploadedFile of uploadedFiles) {
        // Dropbox에 실제 파일 업로드
        const safeFileName = `${userInfo.employeeId}_${uploadedFile.language}_${Date.now()}_${uploadedFile.file.name}`
        const uploadInfo = await uploadToDropboxClient(uploadedFile.file, safeFileName)
        // uploadInfo: {url, fileName, path, fileId}
        // dropboxFiles에 저장 (scriptKey 기준)
        dropboxFiles.push({
          scriptKey: `1-${uploadedFile.language}`,
          ...uploadInfo,
        })

        const audioData = uploadInfo.url // 공유 링크 URL을 recordings 값으로 사용 (dashboard에서 fetch)
        
        // 1개 파일을 5개 스크립트로 복제 (기존 시스템 호환성)
        for (let i = 1; i <= 5; i++) {
          const scriptKey = `${i}-${uploadedFile.language}`
          recordings[scriptKey] = audioData
        }
        // 디버깅: 파일 크기 및 DataURL 길이 확인
        console.log(`파일 크기: ${uploadedFile.file.name} - ${(uploadedFile.file.size / 1024 / 1024).toFixed(2)}MB`)
        console.log(`DataURL 길이: ${audioData.length} characters`)
        
        // original file list for reference
        originalFiles[uploadedFile.key] = uploadedFile.file.name
      }

      // 평가 데이터 생성 (필수 정보만 포함)
      const evaluationData = {
        name: userInfo.name,
        employeeId: userInfo.employeeId,
        language: userInfo.language,
        category: userInfo.category,
        submittedAt: new Date().toISOString(),
        recordingCount: 5,
        scriptNumbers: [1, 2, 3, 4, 5],
        recordings: recordings,
        dropboxFiles: dropboxFiles,
        status: "pending",
        comment: "",
        driveFolder: "1cdUwgx4z3BrCqrp8tt8e8T6OQhFMvqLF",
        isFileUpload: true,
      }

      // API를 통해 서버에 저장 (간단한 데이터만 전송)
      const uploadData = {
        name: userInfo.name,
        employeeId: userInfo.employeeId,
        language: userInfo.language,
        category: userInfo.category,
        submittedAt: new Date().toISOString(),
        recordingCount: 5,
        scriptNumbers: [1, 2, 3, 4, 5],
        recordings: recordings,
        dropboxFiles: dropboxFiles,
        comment: "",
      }

      const response = await fetch("/api/evaluations/upload", {
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
    return requiredFiles.filter((_: string, index: number) => {
      if (userInfo.language === "korean-english") {
        return index === 0 ? !currentUploadedLanguages.includes("korean") : !currentUploadedLanguages.includes("english")
      } else {
        return !currentUploadedLanguages.includes(userInfo.language)
      }
    })
  }, [requiredFiles, uploadedFiles, userInfo.language])

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button onClick={onBack} variant="outline" className="mb-4">
            ← 돌아가기
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">PUS 녹음파일 업로드</h1>
          <p className="text-gray-600">
            기존 녹음 파일을 업로드하여 평가를 진행할 수 있습니다.
          </p>
        </div>

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
                  disabled={!!authenticatedUser?.name}
                />
              </div>

              <div>
                <Label htmlFor="employeeId">사번</Label>
                <Input
                  id="employeeId"
                  value={userInfo.employeeId}
                  onChange={(e) => setUserInfo(prev => ({ ...prev, employeeId: e.target.value }))}
                  placeholder="직원번호를 입력하세요"
                  disabled={!!authenticatedUser?.broadcastCode}
                />
              </div>

              <div>
                <Label htmlFor="language">언어 선택</Label>
                <Select
                  value={userInfo.language}
                  onValueChange={(value) => setUserInfo(prev => ({ ...prev, language: value, category: "" }))}
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
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  녹음 파일을 선택하거나 여기로 드래그하세요
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  언어별로 1개 파일씩 업로드 (파일명 자유)
                </p>
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
                  accept="audio/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
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
                업로드 시작
              </>
            )}
          </Button>
          
          {missingFiles.length > 0 && (
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
                    setShowLanguageModal(false)
                    setSelectedFile(null)
                  }} 
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">파일: {selectedFile.name}</p>
                <p className="text-sm text-gray-600">이 파일이 어떤 언어로 녹음되었는지 선택해주세요.</p>
              </div>
              
              <div className="space-y-3">
                <Button
                  onClick={() => handleLanguageSelect("korean")}
                  className="w-full h-12 text-left justify-start"
                  variant="outline"
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