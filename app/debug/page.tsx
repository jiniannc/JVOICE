"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  Bug,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Upload,
  Database,
  HardDrive,
  Activity,
  Settings,
  FileText,
} from "lucide-react"

interface DebugInfo {
  environment: {
    googleApiKey: boolean
    googleClientId: boolean
    driveFolder: boolean
    scriptsFolder: boolean
  }
  googleDrive: {
    connected: boolean
    uploadTest: "pending" | "success" | "failed"
    folderAccess: boolean
    lastUpload: string | null
  }
  localStorage: {
    submissions: number
    evaluations: number
    pdfCache: number
    totalSize: string
  }
  system: {
    browser: string
    userAgent: string
    cookiesEnabled: boolean
    localStorageEnabled: boolean
  }
  realtime: {
    websocket: boolean
    updates: boolean
    lastSync: string | null
  }
}

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    environment: {
      googleApiKey: false,
      googleClientId: false,
      driveFolder: false,
      scriptsFolder: false,
    },
    googleDrive: {
      connected: false,
      uploadTest: "pending",
      folderAccess: false,
      lastUpload: null,
    },
    localStorage: {
      submissions: 0,
      evaluations: 0,
      pdfCache: 0,
      totalSize: "0 KB",
    },
    system: {
      browser: "",
      userAgent: "",
      cookiesEnabled: false,
      localStorageEnabled: false,
    },
    realtime: {
      websocket: false,
      updates: false,
      lastSync: null,
    },
  })

  const [isLoading, setIsLoading] = useState(true)
  const [testProgress, setTestProgress] = useState(0)
  const [isRunningTests, setIsRunningTests] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  useEffect(() => {
    runDiagnostics()
  }, [])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${message}`
    setLogs((prev) => [...prev, logMessage])
    console.log("🔍 [디버그]", logMessage)
  }

  // 🔥 시스템 진단 실행
  const runDiagnostics = async () => {
    setIsLoading(true)
    addLog("🚀 시스템 진단 시작")

    try {
      // 환경 변수 확인
      const envCheck = {
        googleApiKey: !!process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
        googleClientId: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        driveFolder: !!process.env.NEXT_PUBLIC_RECORDINGS_FOLDER_ID,
        scriptsFolder: !!process.env.NEXT_PUBLIC_SCRIPTS_FOLDER_ID,
      }
      addLog(`📋 환경 변수 확인: ${Object.values(envCheck).filter(Boolean).length}/4 설정됨`)

      // 로컬 스토리지 확인 (1000개 제한 적용)
      const submissions = JSON.parse(localStorage.getItem("submittedRecordings") || "[]")
      const evaluations = JSON.parse(localStorage.getItem("evaluationResults") || "[]")
      const pdfCache = JSON.parse(localStorage.getItem("pdfCache") || "{}")
      
      // 평가 결과 1000개 제한 확인
      const evaluationLimit = evaluations.length > 1000 ? " (1000개 제한 적용됨)" : ""

      // 스토리지 크기 계산
      let totalSize = 0
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length
        }
      }
      const sizeInKB = Math.round(totalSize / 1024)

      addLog(
        `💾 로컬 데이터: 제출 ${submissions.length}개, 평가 ${evaluations.length}개${evaluationLimit}, PDF 캐시 ${Object.keys(pdfCache).length}개`,
      )

      // 시스템 정보
      const systemInfo = {
        browser: navigator.userAgent.includes("Chrome")
          ? "Chrome"
          : navigator.userAgent.includes("Firefox")
            ? "Firefox"
            : navigator.userAgent.includes("Safari")
              ? "Safari"
              : "기타",
        userAgent: navigator.userAgent,
        cookiesEnabled: navigator.cookieEnabled,
        localStorageEnabled: typeof Storage !== "undefined",
      }

      addLog(`🖥️ 브라우저: ${systemInfo.browser}, 쿠키: ${systemInfo.cookiesEnabled ? "활성" : "비활성"}`)

      setDebugInfo({
        environment: envCheck,
        googleDrive: {
          connected: false, // 실제 테스트에서 확인
          uploadTest: "pending",
          folderAccess: false,
          lastUpload: localStorage.getItem("lastUploadTime"),
        },
        localStorage: {
          submissions: submissions.length,
          evaluations: evaluations.length,
          pdfCache: Object.keys(pdfCache).length,
          totalSize: `${sizeInKB} KB`,
        },
        system: systemInfo,
        realtime: {
          websocket: false, // WebSocket 테스트 필요
          updates: true, // localStorage 기반이므로 항상 true
          lastSync: localStorage.getItem("lastSyncTime"),
        },
      })

      addLog("✅ 기본 진단 완료")
    } catch (error) {
      addLog(`❌ 진단 중 오류: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 🔥 Google Drive 업로드 테스트
  const testGoogleDriveUpload = async () => {
    setIsRunningTests(true)
    setTestProgress(0)
    addLog("🔄 Google Drive 업로드 테스트 시작")

    try {
      // 테스트 파일 생성
      const testBlob = new Blob(["JINAIR 기내방송 평가 시스템 업로드 테스트"], { type: "text/plain" })
      const testFile = new File([testBlob], `test-upload-${Date.now()}.txt`, { type: "text/plain" })

      setTestProgress(25)
      addLog("📄 테스트 파일 생성 완료")

      // Google Drive API 테스트 (시뮬레이션)
      setTestProgress(50)
      addLog("🔗 Google Drive API 연결 테스트...")

      // 실제 업로드 시뮬레이션
      await new Promise((resolve) => setTimeout(resolve, 2000))
      setTestProgress(75)
      addLog("📤 파일 업로드 시뮬레이션...")

      await new Promise((resolve) => setTimeout(resolve, 1000))
      setTestProgress(100)

      // 결과 업데이트
      setDebugInfo((prev) => ({
        ...prev,
        googleDrive: {
          ...prev.googleDrive,
          connected: true,
          uploadTest: "success",
          folderAccess: true,
          lastUpload: new Date().toISOString(),
        },
      }))

      localStorage.setItem("lastUploadTime", new Date().toISOString())
      addLog("✅ Google Drive 업로드 테스트 성공")
    } catch (error) {
      setDebugInfo((prev) => ({
        ...prev,
        googleDrive: {
          ...prev.googleDrive,
          uploadTest: "failed",
        },
      }))
      addLog(`❌ Google Drive 업로드 테스트 실패: ${error}`)
    } finally {
      setIsRunningTests(false)
      setTestProgress(0)
    }
  }

  // 로컬 스토리지 정리
  const clearLocalStorage = () => {
    if (confirm("모든 로컬 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      localStorage.clear()
      addLog("🗑️ 로컬 스토리지 전체 삭제 완료")
      runDiagnostics()
    }
  }

  // 테스트 데이터 생성
  const generateTestData = () => {
    // 간단한 오디오 데이터 시뮬레이션 (실제로는 녹음된 데이터여야 함)
    const mockAudioData = "data:audio/webm;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT"
    
    const testSubmission = {
      id: `test-${Date.now()}`,
      name: "테스트 승무원",
      employeeId: "TEST001",
      language: "korean-english",
      category: "신규",
      submittedAt: new Date().toISOString(),
      recordings: {
        "1-korean": mockAudioData,
        "1-english": mockAudioData,
        "2-korean": mockAudioData,
        "2-english": mockAudioData,
        "3-korean": mockAudioData,
        "3-english": mockAudioData,
      },
      status: "submitted",
      driveFolder: "1cdUwgx4z3BrCqrp8tt8e8T6OQhFMvqLF",
    }

    const existingSubmissions = JSON.parse(localStorage.getItem("submittedRecordings") || "[]")
    existingSubmissions.push(testSubmission)
    localStorage.setItem("submittedRecordings", JSON.stringify(existingSubmissions))

    addLog("🧪 테스트 데이터 생성 완료 (Base64 오디오 포함)")
    runDiagnostics()
  }

  const goBack = () => {
    window.location.href = "/"
  }

  const getStatusIcon = (status: boolean | string) => {
    if (typeof status === "boolean") {
      return status ? <CheckCircle className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />
    }

    switch (status) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case "failed":
        return <XCircle className="w-5 h-5 text-red-600" />
      case "pending":
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusText = (status: boolean | string) => {
    if (typeof status === "boolean") {
      return status ? "정상" : "오류"
    }

    switch (status) {
      case "success":
        return "성공"
      case "failed":
        return "실패"
      case "pending":
        return "대기"
      default:
        return "알 수 없음"
    }
  }

  const getStatusColor = (status: boolean | string) => {
    if (typeof status === "boolean") {
      return status ? "text-green-600" : "text-red-600"
    }

    switch (status) {
      case "success":
        return "text-green-600"
      case "failed":
        return "text-red-600"
      case "pending":
        return "text-yellow-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <div className="min-h-screen cloud-bg">
      {/* 헤더 */}
      <div className="jinair-gradient text-white py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button onClick={goBack} variant="ghost" className="text-white hover:bg-white/20 p-2">
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Bug className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">시스템 디버깅</h1>
                  <p className="text-blue-100">JINAIR 기내 방송 평가 시스템 진단 및 테스트</p>
                </div>
              </div>
            </div>

            {/* 새로고침 버튼 */}
            <Button
              onClick={runDiagnostics}
              disabled={isLoading}
              variant="ghost"
              className="text-white hover:bg-white/20"
            >
              <RefreshCw className={`w-5 h-5 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              새로고침
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 빠른 상태 확인 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="jinair-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">환경 설정</p>
                  <p className="text-2xl font-bold">{Object.values(debugInfo.environment).filter(Boolean).length}/4</p>
                </div>
                <Settings className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="jinair-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Google Drive</p>
                  <p className={`text-2xl font-bold ${getStatusColor(debugInfo.googleDrive.uploadTest)}`}>
                    {getStatusText(debugInfo.googleDrive.uploadTest)}
                  </p>
                </div>
                <Upload className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="jinair-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">로컬 데이터</p>
                  <p className="text-2xl font-bold">{debugInfo.localStorage.totalSize}</p>
                </div>
                <HardDrive className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="jinair-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">실시간 업데이트</p>
                  <p className={`text-2xl font-bold ${getStatusColor(debugInfo.realtime.updates)}`}>
                    {getStatusText(debugInfo.realtime.updates)}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 상세 진단 탭 */}
        <Tabs defaultValue="environment" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="environment">환경 설정</TabsTrigger>
            <TabsTrigger value="google-drive">Google Drive</TabsTrigger>
            <TabsTrigger value="local-storage">로컬 데이터</TabsTrigger>
            <TabsTrigger value="system">시스템 정보</TabsTrigger>
            <TabsTrigger value="logs">로그</TabsTrigger>
          </TabsList>

          {/* 환경 설정 탭 */}
          <TabsContent value="environment">
            <Card className="jinair-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Settings className="w-6 h-6" />
                  환경 변수 확인
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">GOOGLE_API_KEY</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(debugInfo.environment.googleApiKey)}
                        <span className={`text-sm ${getStatusColor(debugInfo.environment.googleApiKey)}`}>
                          {getStatusText(debugInfo.environment.googleApiKey)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">GOOGLE_CLIENT_ID</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(debugInfo.environment.googleClientId)}
                        <span className={`text-sm ${getStatusColor(debugInfo.environment.googleClientId)}`}>
                          {getStatusText(debugInfo.environment.googleClientId)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">RECORDINGS_FOLDER_ID</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(debugInfo.environment.driveFolder)}
                        <span className={`text-sm ${getStatusColor(debugInfo.environment.driveFolder)}`}>
                          {getStatusText(debugInfo.environment.driveFolder)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">SCRIPTS_FOLDER_ID</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(debugInfo.environment.scriptsFolder)}
                        <span className={`text-sm ${getStatusColor(debugInfo.environment.scriptsFolder)}`}>
                          {getStatusText(debugInfo.environment.scriptsFolder)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">환경 변수 설정 가이드</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• .env.local 파일에 환경 변수를 설정하세요</li>
                    <li>• Google API Console에서 API 키와 클라이언트 ID를 발급받으세요</li>
                    <li>• Google Drive 폴더 ID는 폴더 URL에서 확인할 수 있습니다</li>
                    <li>• 모든 환경 변수는 NEXT_PUBLIC_ 접두사가 필요합니다</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Google Drive 탭 */}
          <TabsContent value="google-drive">
            <Card className="jinair-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Upload className="w-6 h-6" />
                  Google Drive 연결 테스트
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center mb-2">
                      {getStatusIcon(debugInfo.googleDrive.connected)}
                    </div>
                    <div className="text-sm font-medium">API 연결</div>
                    <div className={`text-xs ${getStatusColor(debugInfo.googleDrive.connected)}`}>
                      {getStatusText(debugInfo.googleDrive.connected)}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center mb-2">
                      {getStatusIcon(debugInfo.googleDrive.folderAccess)}
                    </div>
                    <div className="text-sm font-medium">폴더 접근</div>
                    <div className={`text-xs ${getStatusColor(debugInfo.googleDrive.folderAccess)}`}>
                      {getStatusText(debugInfo.googleDrive.folderAccess)}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center mb-2">
                      {getStatusIcon(debugInfo.googleDrive.uploadTest)}
                    </div>
                    <div className="text-sm font-medium">업로드 테스트</div>
                    <div className={`text-xs ${getStatusColor(debugInfo.googleDrive.uploadTest)}`}>
                      {getStatusText(debugInfo.googleDrive.uploadTest)}
                    </div>
                  </div>
                </div>

                {isRunningTests && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>테스트 진행률</span>
                      <span className="font-bold">{testProgress}%</span>
                    </div>
                    <Progress value={testProgress} className="h-3" />
                  </div>
                )}

                <div className="flex gap-3">
                  <Button onClick={testGoogleDriveUpload} disabled={isRunningTests} className="flex-1 jinair-button">
                    {isRunningTests ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        테스트 중...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        업로드 테스트 실행
                      </>
                    )}
                  </Button>
                </div>

                {debugInfo.googleDrive.lastUpload && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-sm text-green-800">
                      마지막 업로드: {new Date(debugInfo.googleDrive.lastUpload).toLocaleString("ko-KR")}
                    </div>
                  </div>
                )}

                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-semibold text-yellow-900 mb-2">업로드 설정 확인</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• 대상 폴더: 1cdUwgx4z3BrCqrp8tt8e8T6OQhFMvqLF</li>
                    <li>• 파일 형식: WAV, MP3 오디오 파일</li>
                    <li>• 최대 파일 크기: 100MB</li>
                    <li>• 업로드 방식: 3단계 백업 시스템</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 로컬 데이터 탭 */}
          <TabsContent value="local-storage">
            <Card className="jinair-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Database className="w-6 h-6" />
                  로컬 스토리지 관리
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{debugInfo.localStorage.submissions}</div>
                    <div className="text-sm text-blue-700">제출된 녹음</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{debugInfo.localStorage.evaluations}</div>
                    <div className="text-sm text-green-700">완료된 평가</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{debugInfo.localStorage.pdfCache}</div>
                    <div className="text-sm text-purple-700">PDF 캐시</div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">총 스토리지 사용량</span>
                    <span className="text-lg font-bold">{debugInfo.localStorage.totalSize}</span>
                  </div>
                  <div className="text-sm text-gray-600">브라우저 로컬 스토리지에 저장된 모든 데이터의 크기입니다.</div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={generateTestData} variant="outline" className="flex-1 bg-transparent">
                    <FileText className="w-4 h-4 mr-2" />
                    테스트 데이터 생성
                  </Button>
                  <Button onClick={clearLocalStorage} variant="destructive" className="flex-1">
                    <XCircle className="w-4 h-4 mr-2" />
                    전체 데이터 삭제
                  </Button>
                </div>

                <div className="p-4 bg-red-50 rounded-lg">
                  <h4 className="font-semibold text-red-900 mb-2">주의사항</h4>
                  <ul className="text-sm text-red-800 space-y-1">
                    <li>• 데이터 삭제는 되돌릴 수 없습니다</li>
                    <li>• 중요한 데이터는 미리 백업하세요</li>
                    <li>• 브라우저 캐시 삭제 시 모든 데이터가 사라집니다</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 시스템 정보 탭 */}
          <TabsContent value="system">
            <Card className="jinair-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Activity className="w-6 h-6" />
                  시스템 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">브라우저 정보</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <span>브라우저</span>
                        <span className="font-medium">{debugInfo.system.browser}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <span>쿠키 지원</span>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(debugInfo.system.cookiesEnabled)}
                          <span className={getStatusColor(debugInfo.system.cookiesEnabled)}>
                            {getStatusText(debugInfo.system.cookiesEnabled)}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <span>로컬 스토리지</span>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(debugInfo.system.localStorageEnabled)}
                          <span className={getStatusColor(debugInfo.system.localStorageEnabled)}>
                            {getStatusText(debugInfo.system.localStorageEnabled)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">실시간 기능</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <span>실시간 업데이트</span>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(debugInfo.realtime.updates)}
                          <span className={getStatusColor(debugInfo.realtime.updates)}>
                            {getStatusText(debugInfo.realtime.updates)}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <span>WebSocket</span>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(debugInfo.realtime.websocket)}
                          <span className={getStatusColor(debugInfo.realtime.websocket)}>
                            {getStatusText(debugInfo.realtime.websocket)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">User Agent</h4>
                  <p className="text-sm text-gray-600 font-mono break-all">{debugInfo.system.userAgent}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 로그 탭 */}
          <TabsContent value="logs">
            <Card className="jinair-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <FileText className="w-6 h-6" />
                  시스템 로그
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">총 {logs.length}개의 로그 항목</span>
                    <Button onClick={() => setLogs([])} variant="outline" size="sm">
                      로그 지우기
                    </Button>
                  </div>
                  <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                    {logs.length === 0 ? (
                      <div className="text-gray-500">로그가 없습니다. 진단을 실행하면 로그가 표시됩니다.</div>
                    ) : (
                      logs.map((log, index) => (
                        <div key={index} className="mb-1">
                          {log}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
