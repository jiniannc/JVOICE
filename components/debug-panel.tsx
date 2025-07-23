"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Eye, EyeOff, Copy, ExternalLink } from "lucide-react"

interface DebugInfo {
  googleAPI: boolean
  auth2: boolean
  clientId: string
  employeeSheetId: string
  authInstance: any
  isSignedIn: boolean
  currentUser: string | null
  networkStatus: "online" | "offline"
  lastError: string | null
}

export function DebugPanel() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    googleAPI: false,
    auth2: false,
    clientId: "",
    employeeSheetId: "",
    authInstance: null,
    isSignedIn: false,
    currentUser: null,
    networkStatus: "online",
    lastError: null,
  })
  const [showSensitive, setShowSensitive] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refreshDebugInfo = async () => {
    setIsRefreshing(true)

    try {
      const info: DebugInfo = {
        googleAPI: !!(window as any).gapi,
        auth2: !!(window as any).gapi?.auth2,
        clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
        employeeSheetId: process.env.NEXT_PUBLIC_EMPLOYEE_SPREADSHEET_ID || "",
        authInstance: null,
        isSignedIn: false,
        currentUser: null,
        networkStatus: navigator.onLine ? "online" : "offline",
        lastError: null,
      }

      // Google Auth 상태 확인
      if ((window as any).gapi?.auth2) {
        try {
          const authInstance = (window as any).gapi.auth2.getAuthInstance()
          if (authInstance) {
            info.authInstance = authInstance
            info.isSignedIn = authInstance.isSignedIn.get()

            if (info.isSignedIn) {
              const profile = authInstance.currentUser.get().getBasicProfile()
              info.currentUser = profile.getEmail()
            }
          }
        } catch (error) {
          info.lastError = `Auth2 오류: ${error}`
        }
      }

      setDebugInfo(info)
    } catch (error) {
      setDebugInfo((prev) => ({
        ...prev,
        lastError: `디버그 정보 수집 실패: ${error}`,
      }))
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    refreshDebugInfo()

    // 5초마다 자동 새로고침
    const interval = setInterval(refreshDebugInfo, 5000)
    return () => clearInterval(interval)
  }, [])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert("클립보드에 복사되었습니다!")
  }

  const maskSensitiveData = (data: string) => {
    if (!showSensitive && data.length > 10) {
      return data.substring(0, 8) + "..." + data.substring(data.length - 4)
    }
    return data
  }

  const getStatusIcon = (status: boolean) => {
    return status ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />
  }

  const getStatusColor = (status: boolean) => {
    return status ? "text-green-600" : "text-red-600"
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">🔧 시스템 디버그 패널</h2>
        <div className="flex gap-2">
          <Button onClick={() => setShowSensitive(!showSensitive)} variant="outline" size="sm">
            {showSensitive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showSensitive ? "민감정보 숨김" : "민감정보 표시"}
          </Button>
          <Button onClick={refreshDebugInfo} disabled={isRefreshing} variant="outline" size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            새로고침
          </Button>
        </div>
      </div>

      {/* 전체 상태 요약 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">📊 시스템 상태 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                {getStatusIcon(debugInfo.googleAPI)}
                <span className="font-medium">Google API</span>
              </div>
              <Badge variant={debugInfo.googleAPI ? "default" : "destructive"}>
                {debugInfo.googleAPI ? "로드됨" : "로드 실패"}
              </Badge>
            </div>

            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                {getStatusIcon(debugInfo.auth2)}
                <span className="font-medium">Auth2</span>
              </div>
              <Badge variant={debugInfo.auth2 ? "default" : "destructive"}>
                {debugInfo.auth2 ? "준비됨" : "준비 안됨"}
              </Badge>
            </div>

            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                {getStatusIcon(debugInfo.isSignedIn)}
                <span className="font-medium">로그인</span>
              </div>
              <Badge variant={debugInfo.isSignedIn ? "default" : "secondary"}>
                {debugInfo.isSignedIn ? "로그인됨" : "로그아웃"}
              </Badge>
            </div>

            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                {getStatusIcon(debugInfo.networkStatus === "online")}
                <span className="font-medium">네트워크</span>
              </div>
              <Badge variant={debugInfo.networkStatus === "online" ? "default" : "destructive"}>
                {debugInfo.networkStatus === "online" ? "온라인" : "오프라인"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 환경변수 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>⚙️ 환경변수 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="font-medium">Google Client ID</span>
                <p className="text-sm text-gray-600 font-mono">
                  {debugInfo.clientId ? maskSensitiveData(debugInfo.clientId) : "❌ 설정되지 않음"}
                </p>
              </div>
              <div className="flex gap-2">
                {debugInfo.clientId && (
                  <Button onClick={() => copyToClipboard(debugInfo.clientId)} size="sm" variant="outline">
                    <Copy className="w-3 h-3" />
                  </Button>
                )}
                {getStatusIcon(!!debugInfo.clientId)}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="font-medium">직원 스프레드시트 ID</span>
                <p className="text-sm text-gray-600 font-mono">
                  {debugInfo.employeeSheetId ? maskSensitiveData(debugInfo.employeeSheetId) : "❌ 설정되지 않음"}
                </p>
              </div>
              <div className="flex gap-2">
                {debugInfo.employeeSheetId && (
                  <>
                    <Button onClick={() => copyToClipboard(debugInfo.employeeSheetId)} size="sm" variant="outline">
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      onClick={() =>
                        window.open(
                          `https://docs.google.com/spreadsheets/d/${debugInfo.employeeSheetId}/edit`,
                          "_blank",
                        )
                      }
                      size="sm"
                      variant="outline"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </>
                )}
                {getStatusIcon(!!debugInfo.employeeSheetId)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 인증 상태 */}
      <Card>
        <CardHeader>
          <CardTitle>🔐 인증 상태</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon(debugInfo.isSignedIn)}
                <span className="font-medium">로그인 상태</span>
              </div>
              <p className={`text-sm ${getStatusColor(debugInfo.isSignedIn)}`}>
                {debugInfo.isSignedIn ? "로그인됨" : "로그아웃 상태"}
              </p>
            </div>

            {debugInfo.currentUser && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">현재 사용자</span>
                </div>
                <p className="text-sm text-blue-800 font-mono">
                  {showSensitive ? debugInfo.currentUser : maskSensitiveData(debugInfo.currentUser)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 오류 정보 */}
      {debugInfo.lastError && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription>
            <div className="space-y-2">
              <h3 className="font-bold text-red-800">최근 오류</h3>
              <p className="text-red-700 text-sm font-mono">{debugInfo.lastError}</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 테스트 도구 */}
      <Card>
        <CardHeader>
          <CardTitle>🧪 테스트 도구</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => {
                console.log("=== 디버그 정보 ===")
                console.log("Google API:", debugInfo.googleAPI)
                console.log("Auth2:", debugInfo.auth2)
                console.log("로그인 상태:", debugInfo.isSignedIn)
                console.log("현재 사용자:", debugInfo.currentUser)
                console.log("환경변수:", {
                  clientId: debugInfo.clientId,
                  employeeSheetId: debugInfo.employeeSheetId,
                })
                alert("콘솔에 디버그 정보가 출력되었습니다!")
              }}
              variant="outline"
            >
              콘솔에 디버그 정보 출력
            </Button>

            <Button
              onClick={() => {
                const debugData = JSON.stringify(debugInfo, null, 2)
                copyToClipboard(debugData)
              }}
              variant="outline"
            >
              디버그 정보 복사
            </Button>

            <Button
              onClick={() => {
                if (debugInfo.employeeSheetId) {
                  window.open(`https://docs.google.com/spreadsheets/d/${debugInfo.employeeSheetId}/edit`, "_blank")
                } else {
                  alert("직원 스프레드시트 ID가 설정되지 않았습니다.")
                }
              }}
              variant="outline"
            >
              직원 스프레드시트 열기
            </Button>

            <Button
              onClick={() => {
                window.open("https://console.cloud.google.com/", "_blank")
              }}
              variant="outline"
            >
              Google Cloud Console 열기
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 도움말 링크 */}
      <Card>
        <CardHeader>
          <CardTitle>📚 도움말 및 문서</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 border rounded-lg">
              <h4 className="font-medium mb-2">설정 가이드</h4>
              <p className="text-sm text-gray-600 mb-2">Google OAuth 설정 단계별 가이드</p>
              <Button size="sm" variant="outline">
                가이드 보기
              </Button>
            </div>

            <div className="p-3 border rounded-lg">
              <h4 className="font-medium mb-2">문제 해결</h4>
              <p className="text-sm text-gray-600 mb-2">자주 발생하는 오류 해결 방법</p>
              <Button size="sm" variant="outline">
                문제 해결 가이드
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
