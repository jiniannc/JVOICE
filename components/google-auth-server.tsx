"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, AlertTriangle, Shield, LogOut, Home } from "lucide-react"

interface AuthUser {
  id: string
  email: string
  name: string
  picture: string
  employeeId?: string
  department?: string
  role?: string
  isTestAccount?: boolean
}

interface AuthState {
  authenticated: boolean
  user: AuthUser | null
  loading: boolean
  error: string | null
}

interface GoogleAuthServerProps {
  onAuthSuccess: (user: AuthUser & { employee?: any; verified: boolean }) => void
  onAuthError: (error: string) => void
}

export function GoogleAuthServer({ onAuthSuccess, onAuthError }: GoogleAuthServerProps) {
  const [authState, setAuthState] = useState<AuthState>({
    authenticated: false,
    user: null,
    loading: true,
    error: null,
  })
  const [showTestLogin, setShowTestLogin] = useState(false)
  const [selectedTestAccount, setSelectedTestAccount] = useState("")
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isTestLoggingIn, setIsTestLoggingIn] = useState(false)

  // 테스트 계정 목록
  const testAccounts = [
    { email: "test@jinair.com", name: "테스트 승무원", role: "승무원" },
    { email: "admin@jinair.com", name: "관리자", role: "관리자" },
    { email: "instructor@jinair.com", name: "평가 교관", role: "교관" },
  ]

  // 인증 상태 확인
  const checkAuthStatus = async () => {
    try {
      console.log("🔍 [GoogleAuthServer] 인증 상태 확인 시작...")
      setAuthState((prev) => ({ ...prev, loading: true, error: null }))

      const response = await fetch("/api/auth/user", {
        method: "GET",
        credentials: "include",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      const data = await response.json()
      console.log("📊 [GoogleAuthServer] 인증 상태 응답:", data)

      setAuthState({
        authenticated: data.authenticated,
        user: data.user,
        loading: false,
        error: data.expired ? "세션이 만료되었습니다" : null,
      })

      if (data.authenticated && data.user) {
        console.log("✅ [GoogleAuthServer] 인증된 사용자:", data.user.email)
        // 부모 컴포넌트에 인증 성공 알림
        onAuthSuccess({
          ...data.user,
          employee: data.user.employeeId
            ? {
                name: data.user.name,
                employeeId: data.user.employeeId,
                department: data.user.department || "미지정",
              }
            : null,
          verified: true,
        })
      } else {
        console.log("❌ [GoogleAuthServer] 인증되지 않은 상태")
      }
    } catch (error) {
      console.error("❌ [GoogleAuthServer] 인증 상태 확인 실패:", error)
      setAuthState({
        authenticated: false,
        user: null,
        loading: false,
        error: "인증 상태 확인 실패",
      })
      onAuthError("인증 상태 확인 실패")
    }
  }

  // Google OAuth 로그인
  const handleGoogleLogin = () => {
    console.log("🔍 [GoogleAuthServer] Google OAuth 로그인 시작...")
    window.location.href = "/api/auth/google"
  }

  // 테스트 계정 로그인
  const handleTestLogin = async () => {
    if (!selectedTestAccount) return

    setIsTestLoggingIn(true)
    try {
      console.log("🔍 [GoogleAuthServer] 테스트 계정 로그인:", selectedTestAccount)

      const response = await fetch("/api/auth/test-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email: selectedTestAccount }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("✅ [GoogleAuthServer] 테스트 로그인 성공:", data.user.email)

        // 인증 상태 다시 확인
        setTimeout(checkAuthStatus, 500)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Test login failed")
      }
    } catch (error) {
      console.error("❌ [GoogleAuthServer] 테스트 로그인 실패:", error)
      setAuthState((prev) => ({ ...prev, error: "테스트 로그인 실패" }))
      onAuthError("테스트 로그인 실패")
    } finally {
      setIsTestLoggingIn(false)
    }
  }

  // 로그아웃 핸들러
  const handleLogout = async () => {
    console.log("🚨 [GoogleAuthServer] 로그아웃 버튼 클릭됨!")

    if (isLoggingOut) {
      console.log("⚠️ [GoogleAuthServer] 이미 로그아웃 진행 중...")
      return
    }

    setIsLoggingOut(true)

    try {
      console.log("🔍 [GoogleAuthServer] 로그아웃 API 호출 시작...")

      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      })

      console.log("📊 [GoogleAuthServer] 로그아웃 응답 상태:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("✅ [GoogleAuthServer] 로그아웃 API 성공:", data)

        // 상태 즉시 초기화
        setAuthState({
          authenticated: false,
          user: null,
          loading: false,
          error: null,
        })

        console.log("🔄 [GoogleAuthServer] 페이지 새로고침 시작...")

        // 강제 페이지 새로고침으로 완전 초기화
        window.location.href = "/"
      } else {
        const errorData = await response.json()
        console.error("❌ [GoogleAuthServer] 로그아웃 API 실패:", errorData)
        throw new Error(errorData.error || "Logout failed")
      }
    } catch (error) {
      console.error("❌ [GoogleAuthServer] 로그아웃 실패:", error)
      alert("로그아웃 중 오류가 발생했습니다. 페이지를 새로고침합니다.")
      window.location.href = "/"
    } finally {
      setIsLoggingOut(false)
    }
  }

  // 홈으로 돌아가기 핸들러
  const handleGoHome = () => {
    console.log("🏠 [GoogleAuthServer] 홈 버튼 클릭됨!")
    window.location.href = "/"
  }

  // 컴포넌트 마운트 시 인증 상태 확인
  useEffect(() => {
    console.log("🚀 [GoogleAuthServer] 컴포넌트 마운트됨")
    checkAuthStatus()

    // URL 파라미터에서 로그인 결과 확인
    const urlParams = new URLSearchParams(window.location.search)
    const loginResult = urlParams.get("login")
    const error = urlParams.get("error")
    const details = urlParams.get("details")

    if (loginResult === "success") {
      console.log("✅ [GoogleAuthServer] OAuth 로그인 성공!")
      // URL 파라미터 제거
      window.history.replaceState({}, document.title, window.location.pathname)
      // 인증 상태 다시 확인
      setTimeout(checkAuthStatus, 500)
    }

    if (error) {
      console.error("❌ [GoogleAuthServer] OAuth 오류:", error, details)
      let errorMessage = "로그인 오류가 발생했습니다"

      if (error === "redirect_uri_mismatch") {
        errorMessage = "리다이렉트 URI 불일치 오류입니다. Google Cloud Console에서 리다이렉트 URI를 확인해주세요."
      } else if (error === "domain_not_allowed") {
        errorMessage = "@jinair.com 계정만 로그인 가능합니다."
      } else if (error === "missing_client_id") {
        errorMessage = "Google Client ID가 설정되지 않았습니다."
      }

      setAuthState((prev) => ({ ...prev, error: errorMessage }))
      onAuthError(errorMessage)
      // URL 파라미터 제거
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  if (authState.loading) {
    return (
      <Card className="w-full max-w-md mx-auto jinair-card">
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-800"></div>
          <span className="ml-3 text-gray-600">인증 상태 확인 중...</span>
        </CardContent>
      </Card>
    )
  }

  // 이미 인증된 경우 사용자 정보 표시
  if (authState.authenticated && authState.user) {
    return (
      <Card className="w-full max-w-md mx-auto jinair-card">
        <CardHeader className="text-center">
          <div className="w-16 h-16 jinair-gradient rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-xl jinair-text-gradient">인증 완료</CardTitle>
          <CardDescription>
            {authState.user.isTestAccount ? "테스트 계정으로 로그인됨" : "JINAIR 계정으로 로그인됨"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 사용자 정보 */}
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-green-300">
              <img
                src={authState.user.picture || "/placeholder.svg?height=48&width=48&text=User"}
                alt={authState.user.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-green-900">{authState.user.name}</p>
              <p className="text-sm text-green-700">{authState.user.email}</p>
              <div className="flex gap-1 mt-1">
                {authState.user.employeeId && (
                  <Badge className="bg-green-100 text-green-800 text-xs">{authState.user.employeeId}</Badge>
                )}
                {authState.user.department && (
                  <Badge className="bg-green-100 text-green-800 text-xs">{authState.user.department}</Badge>
                )}
                {authState.user.isTestAccount && <Badge className="bg-blue-100 text-blue-800 text-xs">테스트</Badge>}
              </div>
            </div>
          </div>

          {/* 버튼들 */}
          <div className="flex gap-2">
            <Button
              onClick={handleGoHome}
              variant="outline"
              className="flex-1 bg-transparent hover:bg-gray-50"
              type="button"
            >
              <Home className="w-4 h-4 mr-2" />
              홈으로
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex-1 bg-transparent hover:bg-red-50"
              disabled={isLoggingOut}
              type="button"
            >
              {isLoggingOut ? (
                <>
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-gray-400 border-t-gray-600" />
                  로그아웃 중...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4 mr-2" />
                  로그아웃
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 로그인 화면
  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* 오류 메시지 */}
      {authState.error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{authState.error}</AlertDescription>
        </Alert>
      )}

      {/* 메인 로그인 카드 */}
      <Card className="jinair-card">
        <CardHeader className="text-center">
          <div className="w-16 h-16 jinair-gradient rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-xl jinair-text-gradient">JINAIR 계정 로그인</CardTitle>
          <CardDescription>Google 계정으로 안전하게 로그인하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google 로그인 버튼 */}
          <Button onClick={handleGoogleLogin} className="w-full jinair-button h-12 text-lg font-semibold">
            <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" className="w-5 h-5 mr-3" />
            Google 계정으로 로그인
          </Button>

          {/* 개발 모드에서만 테스트 로그인 표시 */}
          {process.env.NODE_ENV === "development" && (
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">개발/테스트 모드</span>
                <Button
                  onClick={() => setShowTestLogin(!showTestLogin)}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  {showTestLogin ? "숨기기" : "테스트 계정"}
                </Button>
              </div>

              {showTestLogin && (
                <div className="space-y-3">
                  <Select value={selectedTestAccount} onValueChange={setSelectedTestAccount}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="테스트 계정 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {testAccounts.map((account) => (
                        <SelectItem key={account.email} value={account.email}>
                          {account.name} ({account.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={handleTestLogin}
                    disabled={!selectedTestAccount || isTestLoggingIn}
                    variant="outline"
                    className="w-full h-10 bg-transparent"
                  >
                    {isTestLoggingIn ? (
                      <>
                        <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-gray-400 border-t-gray-600" />
                        로그인 중...
                      </>
                    ) : (
                      "테스트 로그인"
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 보안 정보 */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-semibold text-green-900 text-sm">서버사이드 OAuth 2.0</h4>
              <div className="text-green-800 text-xs space-y-1">
                <p>• @jinair.com 계정만 로그인 가능</p>
                <p>• 안전한 서버사이드 토큰 관리</p>
                <p>• CSP 보안 정책 준수</p>
                <p>• 자동 세션 관리</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
