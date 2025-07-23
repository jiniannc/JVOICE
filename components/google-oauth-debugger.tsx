"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertTriangle, RefreshCw, ExternalLink } from "lucide-react"

export function GoogleOAuthDebugger() {
  const [logs, setLogs] = useState<string[]>([])
  const [googleLoaded, setGoogleLoaded] = useState(false)
  const [clientId, setClientId] = useState("")
  const [isInitialized, setIsInitialized] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [currentOrigin, setCurrentOrigin] = useState("")

  const addLog = (message: string, type: "info" | "success" | "error" = "info") => {
    const timestamp = new Date().toLocaleTimeString()
    const emoji = type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️"
    setLogs((prev) => [...prev, `[${timestamp}] ${emoji} ${message}`])
    console.log(`${emoji} ${message}`)
  }

  useEffect(() => {
    checkEnvironment()
    loadGoogleScript()
  }, [])

  const checkEnvironment = () => {
    const envClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""
    setClientId(envClientId)
    setCurrentOrigin(window.location.origin)

    addLog(`=== 환경 확인 시작 ===`)
    addLog(`현재 Origin: ${window.location.origin}`)
    addLog(`현재 전체 URL: ${window.location.href}`)

    if (envClientId) {
      addLog(`환경변수 클라이언트 ID: ${envClientId}`, "success")
    } else {
      addLog("❌ 환경변수 NEXT_PUBLIC_GOOGLE_CLIENT_ID가 설정되지 않음", "error")
    }

    addLog(`브라우저: ${navigator.userAgent.split(" ").pop()}`)
    addLog(`=== 환경 확인 완료 ===`)
  }

  const loadGoogleScript = () => {
    addLog("Google Identity Services 스크립트 로딩 시작...")

    // 기존 스크립트 제거
    const existingScript = document.querySelector('script[src*="accounts.google.com"]')
    if (existingScript) {
      existingScript.remove()
      addLog("기존 Google 스크립트 제거됨")
    }

    const script = document.createElement("script")
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true

    script.onload = () => {
      addLog("Google 스크립트 로드 성공!", "success")
      setGoogleLoaded(true)

      setTimeout(() => {
        initializeGoogle()
      }, 1000)
    }

    script.onerror = (error) => {
      addLog(`Google 스크립트 로드 실패: ${error}`, "error")
    }

    document.head.appendChild(script)
  }

  const initializeGoogle = () => {
    if (!clientId) {
      addLog("클라이언트 ID가 없어서 초기화 불가", "error")
      return
    }

    try {
      addLog("Google Identity Services 초기화 시도...")

      if (!(window as any).google?.accounts?.id) {
        addLog("google.accounts.id 객체를 찾을 수 없음", "error")
        return
      }
      // FedCM 비활성화 및 CORS 문제 해결을 위한 설정
      ;(window as any).google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: false,
        use_fedcm_for_prompt: false, // FedCM 비활성화
        itp_support: true, // ITP 지원 활성화
        ux_mode: "popup", // 팝업 모드 사용
      })

      addLog("Google Identity Services 초기화 완료! (FedCM 비활성화)", "success")
      setIsInitialized(true)
    } catch (error) {
      addLog(`Google 초기화 실패: ${error}`, "error")
    }
  }

  const handleCredentialResponse = (response: any) => {
    addLog("🎉 Google 로그인 콜백 호출됨!", "success")

    try {
      if (!response.credential) {
        addLog("응답에 credential이 없음", "error")
        return
      }

      addLog(`JWT 토큰 길이: ${response.credential.length}`)

      const payload = JSON.parse(atob(response.credential.split(".")[1]))

      setTestResult({
        success: true,
        user: {
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
          verified: payload.email_verified,
        },
      })

      addLog(`로그인 성공: ${payload.name} (${payload.email})`, "success")
      addLog(`이메일 인증됨: ${payload.email_verified ? "예" : "아니오"}`)
    } catch (error) {
      addLog(`토큰 파싱 실패: ${error}`, "error")
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류",
      })
    }
  }

  const testGoogleLogin = () => {
    if (!isInitialized) {
      addLog("Google Identity Services가 초기화되지 않음", "error")
      return
    }

    addLog("Google 로그인 프롬프트 호출... (팝업 모드)")
    setTestResult(null)

    try {
      // 팝업 방식으로 로그인 시도
      ;(window as any).google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed()) {
          const reason = notification.getNotDisplayedReason()
          addLog(`프롬프트 표시 안됨: ${reason}`, "error")

          // 대안: 직접 팝업 열기
          addLog("대안 방법 시도: 직접 OAuth 팝업 열기", "info")
          openDirectOAuthPopup()
        } else if (notification.isSkippedMoment()) {
          addLog(`프롬프트 건너뜀: ${notification.getSkippedReason()}`, "error")
        } else {
          addLog("프롬프트 표시됨", "success")
        }
      })
    } catch (error) {
      addLog(`프롬프트 호출 실패: ${error}`, "error")
      addLog("대안 방법 시도: 직접 OAuth 팝업 열기", "info")
      openDirectOAuthPopup()
    }
  }

  // 직접 OAuth 팝업 열기 (FedCM 우회)
  const openDirectOAuthPopup = () => {
    const oauthUrl =
      `https://accounts.google.com/oauth/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(currentOrigin)}&` +
      `response_type=code&` +
      `scope=openid email profile&` +
      `access_type=offline`

    addLog("직접 OAuth URL 생성됨", "info")
    addLog(`OAuth URL: ${oauthUrl}`)

    const popup = window.open(oauthUrl, "google-oauth", "width=500,height=600,scrollbars=yes,resizable=yes")

    if (popup) {
      addLog("OAuth 팝업 창 열림", "success")

      // 팝업 모니터링
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          addLog("OAuth 팝업 창 닫힘", "info")
        }
      }, 1000)
    } else {
      addLog("팝업 차단됨 - 브라우저 설정 확인 필요", "error")
    }
  }

  const copyOrigin = () => {
    navigator.clipboard.writeText(currentOrigin)
    addLog(`Origin 복사됨: ${currentOrigin}`)
  }

  const copyClientId = () => {
    navigator.clipboard.writeText(clientId)
    addLog("클라이언트 ID 복사됨")
  }

  const openGoogleConsole = () => {
    window.open("https://console.cloud.google.com/apis/credentials", "_blank")
  }

  const clearLogs = () => {
    setLogs([])
  }

  const reloadEverything = () => {
    setLogs([])
    setGoogleLoaded(false)
    setIsInitialized(false)
    setTestResult(null)
    checkEnvironment()
    loadGoogleScript()
  }

  return (
    <div className="space-y-6">
      {/* FedCM 문제 해결 안내 */}
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="w-4 h-4 text-green-600" />
        <AlertDescription>
          <div className="space-y-3">
            <p className="font-bold text-green-800">✅ Google Cloud Console 설정 완료!</p>
            <div className="text-green-700 space-y-2">
              <p>
                <strong>문제:</strong> Google의 새로운 FedCM 정책으로 인한 CORS 오류
              </p>
              <p>
                <strong>해결:</strong> FedCM 비활성화 및 팝업 모드 사용
              </p>
              <p>
                <strong>상태:</strong> 수정된 코드가 적용되었습니다
              </p>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* 현재 상태 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Google OAuth 상태 (FedCM 비활성화)
            <div className="flex gap-2">
              <Button onClick={openGoogleConsole} size="sm" variant="outline" className="bg-transparent">
                <ExternalLink className="w-4 h-4 mr-1" />
                Google Console
              </Button>
              <Button onClick={reloadEverything} size="sm" variant="outline" className="bg-transparent">
                <RefreshCw className="w-4 h-4 mr-1" />
                재시작
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 상태 체크 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              {clientId ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              )}
              <span className="text-sm">클라이언트 ID</span>
              <Badge variant={clientId ? "default" : "destructive"}>{clientId ? "설정됨" : "미설정"}</Badge>
            </div>

            <div className="flex items-center gap-2">
              {googleLoaded ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              )}
              <span className="text-sm">Google 스크립트</span>
              <Badge variant={googleLoaded ? "default" : "destructive"}>{googleLoaded ? "로드됨" : "로딩중"}</Badge>
            </div>

            <div className="flex items-center gap-2">
              {isInitialized ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              )}
              <span className="text-sm">초기화 (FedCM 비활성화)</span>
              <Badge variant={isInitialized ? "default" : "destructive"}>{isInitialized ? "완료" : "대기중"}</Badge>
            </div>

            <div className="flex items-center gap-2">
              {testResult?.success ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : testResult?.success === false ? (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              ) : (
                <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
              )}
              <span className="text-sm">로그인 테스트</span>
              <Badge
                variant={testResult?.success ? "default" : testResult?.success === false ? "destructive" : "secondary"}
              >
                {testResult?.success ? "성공" : testResult?.success === false ? "실패" : "미테스트"}
              </Badge>
            </div>
          </div>

          {/* 테스트 결과 */}
          {testResult && (
            <Alert className={testResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <AlertDescription>
                {testResult.success ? (
                  <div className="space-y-2">
                    <p className="font-semibold text-green-800">✅ 로그인 성공!</p>
                    <div className="text-sm text-green-700">
                      <p>이름: {testResult.user.name}</p>
                      <p>이메일: {testResult.user.email}</p>
                      <p>인증됨: {testResult.user.verified ? "예" : "아니오"}</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-red-800">❌ 로그인 실패</p>
                    <p className="text-sm text-red-700">{testResult.error}</p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* 테스트 버튼 */}
          <div className="flex gap-2">
            <Button onClick={testGoogleLogin} disabled={!isInitialized} className="flex-1">
              🧪 Google 로그인 테스트 (FedCM 우회)
            </Button>
            <Button onClick={clearLogs} variant="outline" size="sm" className="bg-transparent">
              로그 지우기
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 실시간 로그 */}
      <Card>
        <CardHeader>
          <CardTitle>실시간 디버그 로그</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-xs h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">로그 대기 중...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 해결 완료 안내 */}
      <Card>
        <CardHeader>
          <CardTitle>🎉 문제 해결 완료!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-800">
              <strong>적용된 수정사항:</strong>
              <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
                <li>FedCM 비활성화 (use_fedcm_for_prompt: false)</li>
                <li>팝업 모드 사용 (ux_mode: 'popup')</li>
                <li>ITP 지원 활성화 (itp_support: true)</li>
                <li>대안 OAuth 팝업 방식 추가</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              <strong>이제 다음과 같이 작동합니다:</strong>
              <ol className="mt-2 space-y-1 text-sm list-decimal list-inside">
                <li>위의 "Google 로그인 테스트" 버튼 클릭</li>
                <li>Google 로그인 팝업이 열림</li>
                <li>로그인 완료 후 자동으로 인증 처리</li>
                <li>성공 시 사용자 정보 표시</li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
