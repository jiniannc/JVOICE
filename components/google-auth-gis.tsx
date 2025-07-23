"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, CheckCircle, AlertTriangle, User, RefreshCw } from "lucide-react"
import { employeeServiceFixed, type EmployeeInfo } from "@/lib/employee-service-fixed"

interface GoogleUser {
  email: string
  name: string
  picture: string
  employee?: EmployeeInfo
  verified: boolean
}

interface GoogleAuthProps {
  onAuthSuccess: (user: GoogleUser) => void
  onAuthError?: (error: string) => void
}

// Google Identity Services 타입 정의
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void
          prompt: () => void
          renderButton: (element: HTMLElement, config: any) => void
          disableAutoSelect: () => void
        }
      }
    }
  }
}

export function GoogleAuthGIS({ onAuthSuccess, onAuthError }: GoogleAuthProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [isInitialized, setIsInitialized] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  const addDebugLog = (message: string) => {
    console.log(`🔍 [Google Auth GIS] ${message}`)
    setDebugInfo((prev) => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    loadGoogleIdentityServices()
  }, [])

  const loadGoogleIdentityServices = async () => {
    try {
      addDebugLog("Google Identity Services 로드 시작...")

      // 환경변수 확인
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
      if (!clientId) {
        throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID가 설정되지 않았습니다.")
      }
      addDebugLog(`Client ID 확인: ${clientId.substring(0, 20)}...`)

      // 기존 스크립트 제거 (중복 로드 방지)
      const existingScript = document.querySelector('script[src*="accounts.google.com"]')
      if (existingScript) {
        addDebugLog("기존 Google Identity Services 스크립트 발견, 제거 중...")
        existingScript.remove()
      }

      // Google Identity Services 스크립트 로드
      if (!window.google?.accounts?.id) {
        addDebugLog("Google Identity Services 스크립트 로드 중...")
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script")
          script.src = "https://accounts.google.com/gsi/client"
          script.async = true
          script.defer = true

          script.onload = () => {
            addDebugLog("Google Identity Services 스크립트 로드 완료")
            resolve()
          }

          script.onerror = (error) => {
            addDebugLog(`Google Identity Services 스크립트 로드 실패: ${error}`)
            reject(new Error("Google Identity Services 스크립트를 로드할 수 없습니다."))
          }

          document.head.appendChild(script)
        })
      } else {
        addDebugLog("Google Identity Services 이미 로드됨")
      }

      // Google Identity Services 초기화
      addDebugLog("Google Identity Services 초기화 중...")
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      })

      setIsInitialized(true)
      addDebugLog("✅ Google Identity Services 초기화 완료!")
      setError("") // 성공 시 에러 메시지 클리어
    } catch (error: any) {
      const errorMessage = error.message || "Google 인증 시스템을 로드할 수 없습니다."
      addDebugLog(`❌ 초기화 실패: ${errorMessage}`)
      setError(errorMessage)
      onAuthError?.(errorMessage)
    }
  }

  const handleCredentialResponse = async (response: any) => {
    setIsLoading(true)
    addDebugLog("Google 인증 응답 처리 중...")

    try {
      // JWT 토큰 디코딩
      const credential = response.credential
      const payload = JSON.parse(atob(credential.split(".")[1]))

      const email = payload.email
      const name = payload.name
      const picture = payload.picture

      addDebugLog(`로그인 성공: ${email}`)

      // @jinair.com 도메인 확인
      if (!email.endsWith("@jinair.com")) {
        addDebugLog(`도메인 검증 실패: ${email}`)
        setError("@jinair.com 계정만 로그인할 수 있습니다.")
        return
      }

      // 직원 정보 조회
      addDebugLog("직원 정보 조회 중...")
      const employeeInfo = await employeeServiceFixed.getEmployeeByEmail(email)

      if (!employeeInfo) {
        addDebugLog("직원 정보 없음")
        setError("등록되지 않은 직원입니다. 관리자에게 문의하세요.")
        return
      }

      if (!employeeInfo.isActive) {
        addDebugLog("비활성 계정")
        setError("비활성화된 계정입니다. 관리자에게 문의하세요.")
        return
      }

      const user: GoogleUser = {
        email,
        name,
        picture,
        employee: employeeInfo,
        verified: true,
      }

      addDebugLog(`✅ 로그인 완료: ${employeeInfo.name} (${employeeInfo.employeeId})`)
      onAuthSuccess(user)
    } catch (error: any) {
      const errorMessage = `로그인 처리 중 오류가 발생했습니다: ${error.message || error}`
      addDebugLog(`❌ 로그인 실패: ${errorMessage}`)
      setError(errorMessage)
      onAuthError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    if (!window.google?.accounts?.id || !isInitialized) {
      setError("Google 인증 시스템이 준비되지 않았습니다. 페이지를 새로고침해주세요.")
      return
    }

    setError("")
    addDebugLog("Google 로그인 팝업 표시 중...")

    // Google One Tap 또는 팝업 표시
    try {
      window.google.accounts.id.prompt()
    } catch (error) {
      addDebugLog("One Tap 실패, 수동 로그인 버튼 사용")
      // One Tap이 실패하면 수동으로 로그인 버튼 렌더링
      const buttonDiv = document.getElementById("google-signin-button")
      if (buttonDiv) {
        window.google.accounts.id.renderButton(buttonDiv, {
          theme: "outline",
          size: "large",
          width: "100%",
        })
      }
    }
  }

  const retryInitialization = () => {
    setError("")
    setIsInitialized(false)
    setDebugInfo([])
    loadGoogleIdentityServices()
  }

  return (
    <div className="space-y-4">
      <Card className="w-full max-w-md mx-auto shadow-xl">
        <CardHeader className="text-center pb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">JINAIR 로그인</CardTitle>
          <CardDescription>@jinair.com 계정으로 로그인하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <div className="space-y-2">
                  <p>{error}</p>
                  {!isInitialized && (
                    <Button onClick={retryInitialization} size="sm" variant="outline" className="mt-2 bg-transparent">
                      <RefreshCw className="w-3 h-3 mr-1" />
                      다시 시도
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Google 로그인 버튼 */}
          <div className="space-y-4">
            <Button
              onClick={handleGoogleLogin}
              disabled={isLoading || !isInitialized}
              className="w-full h-12 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 mr-3 animate-spin rounded-full border-2 border-gray-400 border-t-blue-600" />
                  로그인 중...
                </>
              ) : !isInitialized ? (
                <>
                  <div className="w-5 h-5 mr-3 animate-spin rounded-full border-2 border-gray-400 border-t-blue-600" />
                  초기화 중...
                </>
              ) : (
                <>
                  <img
                    src="https://developers.google.com/identity/images/g-logo.png"
                    alt="Google"
                    className="w-5 h-5 mr-3"
                  />
                  Google로 로그인
                </>
              )}
            </Button>

            {/* Google 자동 렌더링 버튼 영역 */}
            <div id="google-signin-button" className="w-full"></div>
          </div>

          <div className="text-center">
            <div className="flex items-center gap-2 justify-center text-sm text-gray-600 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>@jinair.com 계정만 허용</span>
            </div>
            <div className="flex items-center gap-2 justify-center text-sm text-gray-600 mb-2">
              <User className="w-4 h-4 text-blue-600" />
              <span>직원 정보 자동 연동</span>
            </div>
            <div className="flex items-center gap-2 justify-center text-sm text-gray-600">
              <Shield className="w-4 h-4 text-green-600" />
              <span>Google Identity Services 사용</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 디버그 정보 (개발 중에만 표시) */}
      {process.env.NODE_ENV === "development" && debugInfo.length > 0 && (
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-sm">🔍 디버그 로그</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-xs font-mono bg-gray-900 text-green-400 p-3 rounded max-h-32 overflow-y-auto">
              {debugInfo.map((log, index) => (
                <div key={index}>{log}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
